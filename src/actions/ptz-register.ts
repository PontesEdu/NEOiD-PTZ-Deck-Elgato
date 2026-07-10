import streamDeck, { action, KeyDownEvent, PropertyInspectorDidDisappearEvent, SingletonAction, WillAppearEvent, type DidReceiveSettingsEvent } from "@elgato/streamdeck";
import { PTZTracking } from './ptz-tracking';
import { checkCameraConnection } from "../utils/checkCameraConnection";
import type { GlobalSettings } from "../types";
import { LoginTelycam } from "../utils/login-telycam";
import { ActionRegistry } from "../utils/action-registry";
const TALLY_DISPLAY_DURATION = 2000;
const PGM_BLINK_INTERVAL_MS = 400;

type PtzRegisterSettings = {
  cameraIP?: string | boolean;
  camera?: string;
  isTelycam?: boolean;
  telycamUser?: string;
  telycamPassword?: string;
  isDefault?: boolean;
  showTally?: boolean;
};

type TallyEntry = {
  timer: ReturnType<typeof setTimeout> | null;
  blinkInterval: ReturnType<typeof setInterval> | null;
  action: KeyDownEvent<PtzRegisterSettings>['action'];
  restoreImage: string;
};

@action({ UUID: "com.neoid.ptzneoid.ptz-register" })
export class PTZRegister extends SingletonAction<PtzRegisterSettings> {
  private timeCheck: number = 500
  private ptzTracking: PTZTracking
  private tallyInfoMap = new Map<string, TallyEntry>();

  constructor(ptzTracking: PTZTracking) {
    super();
    this.ptzTracking = ptzTracking;
  }

  override async onPropertyInspectorDidDisappear(ev: PropertyInspectorDidDisappearEvent) {
    const settings = await ev.action.getSettings();
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

    //verificação se e undefined
    let cameraIP = settings.cameraIP === undefined ? false : settings.cameraIP

    if(!cameraIP){
      await ev.action.setSettings({...settings, cameraIP: globals.cameraIP});
      cameraIP = globals.cameraIP as string
    }

    const isTelycam = settings.isTelycam === undefined ? false : settings.isTelycam
    let titleName;

    if(isTelycam){
      let telycamUser = settings.telycamUser === undefined ? false : settings.telycamUser as string
      let telycamPassword = settings.telycamPassword === undefined ? false : settings.telycamPassword as string

      if(!telycamUser || !telycamPassword){
        titleName = `No camera`
        await ev.action.setTitle(`${titleName}`)
        return;
      }

      const key = await LoginTelycam({ip: String(cameraIP), user: telycamUser, password: telycamPassword})

      if(!key){
        await ev.action.setTitle(`No camera`)
        return;
      }

      titleName = settings.camera === undefined ? "" : settings.camera as string
      await ev.action.setTitle(`${titleName}`)

    } else {
      const checkCamera = await checkCameraConnection(`${cameraIP}`, this.timeCheck)

      if(!checkCamera) {
        ev.action.setTitle('No camera')

      } else {
        titleName = settings.camera === undefined ? "" : settings.camera as string
        await ev.action.setTitle(`${titleName}`)
      }

    }
  }


  override async onWillAppear(ev: WillAppearEvent) {
    const settings = ev.payload.settings
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

    //verificação se e undefined
    let cameraIP = settings.cameraIP === undefined ? false : settings.cameraIP as string

    if(!settings.cameraIP){
      await ev.action.setSettings({...settings, cameraIP: globals.cameraIP});
      cameraIP = globals.cameraIP as string
    }

    const isTelycam  = settings.isTelycam === undefined ? false : settings.isTelycam
    let titleName;

    if(isTelycam){

      let telycamUser = settings.telycamUser === undefined ? false : settings.telycamUser as string
      let telycamPassword = settings.telycamPassword === undefined ? false : settings.telycamPassword as string

      ev.action.setImage(`imgs/actions/camera-select/cameraSelectTelycam`)


      if(!telycamUser || !telycamPassword){
        titleName = `No camera`
        await ev.action.setTitle(`${titleName}`)
        return;
      }

      const key = await LoginTelycam({ip: String(cameraIP), user: telycamUser, password: telycamPassword})

      if(!key){
        await ev.action.setTitle(`No camera`)
        return;
      }

      titleName = settings.camera === undefined ? "" : settings.camera as string
      await ev.action.setTitle(`${titleName}`)

    } else {
      ev.action.setImage("")
      const checkCamera = await checkCameraConnection(`${cameraIP}`, this.timeCheck)

      if(!checkCamera) {
        ev.action.setTitle('No camera')

      } else {
        titleName = settings.camera === undefined ? "" : settings.camera as string
        await ev.action.setTitle(`${titleName}`)
      }
    }
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent){
    const settings = ev.payload.settings
    const isTelycam = settings.isTelycam === undefined ? false : settings.isTelycam

    // Skip title/image update while a tally display is active for this specific action
    if (!this.tallyInfoMap.has(ev.action.id)) {
      const titleName = settings.camera === undefined ? "" : settings.camera
      await ev.action.setTitle(`${titleName}`)

      if (isTelycam) {
        ev.action.setImage(`imgs/actions/camera-select/cameraSelectTelycam`)
      } else {
        ev.action.setImage("")
      }
    }
  }


  override async onKeyDown(ev: KeyDownEvent): Promise<void> {
    const settings = ev.payload.settings;
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

    const cameraIP = settings.cameraIP === undefined ? false : settings.cameraIP as string;
    if (!cameraIP) {
      await ev.action.setSettings({ ...settings, cameraIP: globals.cameraIP });
      return;
    }

    const isTelycam = settings.isTelycam === undefined ? false : settings.isTelycam;

    // Cancel any active tally displays before processing a new camera selection
    this.clearAllTallyDisplays();

    if (isTelycam) {
      const shouldBroadcast = await this.activateTelycam(cameraIP, settings, globals, ev);
      if (!shouldBroadcast) return;
    } else {
      const connected = await this.activateNEOiD(cameraIP, settings, globals, ev);
      if (connected && settings.showTally) {
        this.scheduleTallyFeedback(ev.action, ev.action.id, cameraIP);
      }
    }

    this.broadcastCameraChange();
  }

  // Valida credenciais e conecta câmera Telycam.
  // Retorna false apenas quando as credenciais estão ausentes (config incompleta).
  // Retorna true nos demais casos (sucesso ou falha de login) para acionar o broadcast.
  private async activateTelycam(
    cameraIP: string,
    settings: PtzRegisterSettings,
    globals: GlobalSettings,
    ev: KeyDownEvent
  ): Promise<boolean> {
    const telycamUser = settings.telycamUser as string | undefined;
    const telycamPassword = settings.telycamPassword as string | undefined;

    if (!telycamUser || !telycamPassword) {
      await ev.action.setTitle(`No camera`);
      await streamDeck.settings.setGlobalSettings({
        ...globals,
        cameraIP: false,
        camera: "No camera",
        isTelycam: false,
      });
      return false;
    }

    const key = await LoginTelycam({ ip: cameraIP, user: telycamUser, password: telycamPassword });

    if (!key) {
      await ev.action.setTitle(`No camera`);
      await streamDeck.settings.setGlobalSettings({
        ...globals,
        cameraIP: false,
        camera: "No camera",
        isTelycam: false,
      });
      return true;
    }

    const titleName = settings.camera ?? "";
    await ev.action.setTitle(titleName);
    await streamDeck.settings.setGlobalSettings({
      ...globals,
      cameraIP,
      camera: titleName,
      keyTelycam: key,
      isTelycam: true,
    });
    return true;
  }

  // Valida conectividade NEOiD, atualiza globals e busca estado de tracking da câmera.
  // Retorna true se a câmera conectou com sucesso, false caso contrário.
  private async activateNEOiD(
    cameraIP: string,
    settings: PtzRegisterSettings,
    globals: GlobalSettings,
    ev: KeyDownEvent
  ): Promise<boolean> {
    const checkCamera = await checkCameraConnection(cameraIP, this.timeCheck);

    if (!checkCamera) {
      ev.action.setTitle('No camera');
      await streamDeck.settings.setGlobalSettings({
        ...globals,
        cameraIP: false,
        camera: "No camera",
        isTelycam: false,
      });
      return false;
    }

    const titleName = settings.camera ?? "";
    await ev.action.setTitle(titleName);
    await streamDeck.settings.setGlobalSettings({
      ...globals,
      cameraIP,
      camera: titleName,
      isTelycam: false,
    });

    // Lê estado de tracking da câmera e persiste nos globals antes do broadcast.
    await this.ptzTracking.fetchCameraTracking(cameraIP);
    return true;
  }

  // Cancela todos os feedbacks de tally ativos e restaura a imagem original.
  private clearAllTallyDisplays(): void {
    for (const [, entry] of this.tallyInfoMap) {
      if (entry.timer) clearTimeout(entry.timer);
      if (entry.blinkInterval) clearInterval(entry.blinkInterval);
      entry.action.setImage(entry.restoreImage);
    }
    this.tallyInfoMap.clear();
  }

  // Inicia o feedback temporário de PGM/PVW após seleção bem-sucedida de câmera NEOiD.
  // Apenas a imagem é alterada — o texto do botão não é tocado.
  // O guard em onDidReceiveSettings impede que o broadcast sobrescreva a imagem de tally.
  private scheduleTallyFeedback(
    act: KeyDownEvent<PtzRegisterSettings>['action'],
    actionId: string,
    cameraIP: string
  ): void {
    const restoreImage = "";
    const entry: TallyEntry = { timer: null, blinkInterval: null, action: act, restoreImage };
    this.tallyInfoMap.set(actionId, entry);

    (async () => {
      const status = await this.fetchTallyStatus(cameraIP);

      // Abort if clearAllTallyDisplays() was called while fetch was in flight
      if (!this.tallyInfoMap.has(actionId)) return;

      if (!status) {
        this.tallyInfoMap.delete(actionId);
        return;
      }

      const tallyImg = status === "PGM"
        ? "imgs/actions/camera-select/Camera-Select-vermelho"
        : "imgs/actions/camera-select/Camera-Select-verde";

      let blinkOn = true;
      await act.setImage(tallyImg);
      entry.blinkInterval = setInterval(() => {
        blinkOn = !blinkOn;
        act.setImage(blinkOn ? tallyImg : "");
      }, PGM_BLINK_INTERVAL_MS);

      entry.timer = setTimeout(async () => {
        if (entry.blinkInterval) clearInterval(entry.blinkInterval);
        this.tallyInfoMap.delete(actionId);
        await act.setImage(restoreImage);
      }, TALLY_DISPLAY_DURATION);
    })();
  }

  // Consulta o estado atual de tally da câmera NEOiD.
  // Telycam não tem endpoint de leitura — este método é chamado apenas para NEOiD.
  private async fetchTallyStatus(ip: string): Promise<"PGM" | "PVW" | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`http://${ip}/cgi-bin/param.cgi?get_tally_status`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) return null;
      const text = await res.text();
      const match = text.match(/\btally=["']?([A-Za-z]+)/i);
      if (!match) return null;
      const val = match[1].toLowerCase();
      if (val === "program") return "PGM";
      if (val === "preview") return "PVW";
      return null;
    } catch {
      return null;
    }
  }

  // Dispara getSettings() em todos os botões registrados para que releiam os globals atualizados.
  private broadcastCameraChange(): void {
    ActionRegistry.broadcastGetSettings();
  }
}
