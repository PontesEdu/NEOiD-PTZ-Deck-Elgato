import streamDeck, { action, KeyDownEvent, PropertyInspectorDidDisappearEvent, SingletonAction, WillAppearEvent, type DidReceiveSettingsEvent } from "@elgato/streamdeck";
import { PTZTracking } from './ptz-tracking';
import { checkCameraConnection } from "../utils/checkCameraConnection";
import type { GlobalSettings } from "../types";
import { LoginTelycam } from "../utils/login-telycam";
import { ActionRegistry } from "../utils/action-registry";




type PtzRegisterSettings = {
  cameraIP?: string | boolean;
  camera?: string;
  isTelycam?: boolean;
  telycamUser?: string;
  telycamPassword?: string;
  isDefault?: boolean;
};

@action({ UUID: "com.neoid.ptzneoid.ptz-register" })
export class PTZRegister extends SingletonAction<PtzRegisterSettings> {
  private timeCheck: number = 500
  private ptzTracking: PTZTracking

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
        titleName = `Not\nConnect\nTelycam`
        await ev.action.setTitle(`${titleName}`)
        return;
      }
      
      const key = await LoginTelycam({ip: String(cameraIP), user: telycamUser, password: telycamPassword})

      if(!key){
        await ev.action.setTitle(`Not\nConnect\nTelycam`)
        return;
      }
      
      titleName = settings.camera === undefined ? "" : settings.camera as string
      await ev.action.setTitle(`${titleName}`)

    } else {
      const checkCamera = await checkCameraConnection(`${cameraIP}`, this.timeCheck)

      if(!checkCamera) {
        ev.action.setTitle('Not\nConnect')
        
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

      ev.action.setImage(`imgs/actions/cameraSelectTelycam`)

      
      if(!telycamUser || !telycamPassword){
        titleName = `Not\nConnect\nTelycam`
        await ev.action.setTitle(`${titleName}`)
        return;
      }
      
      const key = await LoginTelycam({ip: String(cameraIP), user: telycamUser, password: telycamPassword})

      if(!key){
        await ev.action.setTitle(`Not\nConnect\nTelycam`)
        return;
      }
      
      titleName = settings.camera === undefined ? "" : settings.camera as string
      await ev.action.setTitle(`${titleName}`)

    } else {
      ev.action.setImage("")
      const checkCamera = await checkCameraConnection(`${cameraIP}`, this.timeCheck)

      if(!checkCamera) {
        ev.action.setTitle('Not\nConnect')
        
      } else {
        titleName = settings.camera === undefined ? "" : settings.camera as string
        await ev.action.setTitle(`${titleName}`)
      }
    }
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent){
    const settings = ev.payload.settings
    
    const titleName = settings.camera === undefined ? "" : settings.camera
    await ev.action.setTitle(`${titleName}`)

    const isTelycam  = settings.isTelycam === undefined ? false : settings.isTelycam

    if(isTelycam) {
      ev.action.setImage(`imgs/actions/cameraSelectTelycam`)
    } else{
      ev.action.setImage("")
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

    if (isTelycam) {
      const shouldBroadcast = await this.activateTelycam(cameraIP, settings, globals, ev);
      if (!shouldBroadcast) return;
    } else {
      await this.activateNEOiD(cameraIP, settings, globals, ev);
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
      await ev.action.setTitle(`Not\nConnect\nTelycam`);
      await streamDeck.settings.setGlobalSettings({
        ...globals,
        cameraIP: false,
        camera: "Not\nConnect\nTelycam",
        isTelycam: false,
      });
      return false;
    }

    const key = await LoginTelycam({ ip: cameraIP, user: telycamUser, password: telycamPassword });

    if (!key) {
      await ev.action.setTitle(`Not\nConnect\nTelycam`);
      await streamDeck.settings.setGlobalSettings({
        ...globals,
        cameraIP: false,
        camera: "Not\nConnect\nTelycam",
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
      isFrozen: false,
    });
    return true;
  }

  // Valida conectividade NEOiD, atualiza globals e busca estado de tracking da câmera.
  private async activateNEOiD(
    cameraIP: string,
    settings: PtzRegisterSettings,
    globals: GlobalSettings,
    ev: KeyDownEvent
  ): Promise<void> {
    const checkCamera = await checkCameraConnection(cameraIP, this.timeCheck);

    if (!checkCamera) {
      ev.action.setTitle('Not\nConnect');
      await streamDeck.settings.setGlobalSettings({
        ...globals,
        cameraIP: false,
        camera: "No camera",
        isTelycam: false,
      });
      return;
    }

    const titleName = settings.camera ?? "";
    await ev.action.setTitle(titleName);
    await streamDeck.settings.setGlobalSettings({
      ...globals,
      cameraIP,
      camera: titleName,
      isTelycam: false,
      isFrozen: false,
    });

    // Lê estado de tracking da câmera e persiste nos globals antes do broadcast.
    await this.ptzTracking.fetchCameraTracking(cameraIP);
  }

  // Dispara getSettings() em todos os botões registrados para que releiam os globals atualizados.
  private broadcastCameraChange(): void {
    ActionRegistry.broadcastGetSettings();
  }
}