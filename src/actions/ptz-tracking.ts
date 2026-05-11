import streamDeck, { action, DidReceiveSettingsEvent, KeyDownEvent, KeyUpEvent, SingletonAction, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";
import { APITelycam } from "../api/api-telycam";
import { APINeoid } from "../api/api-neoid";
import type { GlobalSettings } from "../types";
import { noCameraGuard } from "../utils/no-camera-guard";


@action({ UUID: "com.neoid.ptzneoid.ptz-tracking" })
export class PTZTracking extends SingletonAction {
  private pressTimer: ReturnType<typeof setTimeout> | null = null;
  private longPress = false;

  public trackingModes = [
    { value: "tracking", name: "Presenter" },
    { value: "region", name: "Zona" },
    { value: "autoframe", name: "Auto\nFrame" },
  ];

  public trackingModesTelycam = [
    { value: "0", name: "Tracking" },
    { value: "1", name: "Head\nFraming" },
    { value: "2", name: "Body\nFraming" },
  ];






  private async updateVisual(ev: WillAppearEvent | DidReceiveSettingsEvent): Promise<void> {
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

    if (await noCameraGuard(ev.action, globals)) {
      ev.action.setImage("imgs/actions/tracking/tracking-off");
      return;
    }
    const cameraIP = globals.cameraIP as string;
    const isTelycam = globals.isTelycam;
    const trackingActive = Boolean(globals[`trackingActive_${cameraIP}`]);

    let modeInfo;
    if (isTelycam) {
      const lastMode = String(globals[`trackingModeTelycam_${cameraIP}`] || this.trackingModesTelycam[0].value);
      modeInfo = this.trackingModesTelycam.find(m => m.value === lastMode) || this.trackingModesTelycam[0];
    } else {
      const lastMode = String(globals[`trackingMode_${cameraIP}`] || this.trackingModes[0].value);
      modeInfo = this.trackingModes.find(m => m.value === lastMode) || this.trackingModes[0];
    }

    ev.action.setTitle(modeInfo.name);
    ev.action.setImage(trackingActive ? "imgs/actions/tracking/tracking-on" : "imgs/actions/tracking/tracking-off");
  }

  override async onWillAppear(ev: WillAppearEvent) {
    await this.updateVisual(ev);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent) {
    await this.updateVisual(ev);
  }




  override async onKeyDown(ev: KeyDownEvent) {
    this.longPress = false;
    if (this.pressTimer) clearTimeout(this.pressTimer);

    this.pressTimer = setTimeout(async () => {
      this.longPress = true;
      this.pressTimer = null;
      await this.toggleTracking(ev);
    }, 900);
  }

  override async onKeyUp(ev: KeyUpEvent) {
    if (this.pressTimer) {
      clearTimeout(this.pressTimer);
      this.pressTimer = null;
    }

    if (!this.longPress) {
      await this.cycleMode(ev);
    }
    // se foi longPress, toggleTracking já foi chamado no timer
  }

  // ----------------------------
  // lógica de cycle (clique curto)
  private async cycleMode(ev: KeyUpEvent) {
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    if (await noCameraGuard(ev.action, globals)) return;
    const cameraIP = globals.cameraIP as string;

    const isTelycam = globals.isTelycam

    let nextMode
    if(isTelycam) {
      const lastMode = String(globals[`trackingModeTelycam_${cameraIP}`] || this.trackingModesTelycam[0].value);
      const trackingActive = Boolean(globals[`trackingActive_${cameraIP}`]);

      const currentIndex = this.trackingModesTelycam.findIndex(m => m.value === lastMode);
      const nextIndex = (currentIndex + 1) % this.trackingModesTelycam.length;
      nextMode = this.trackingModesTelycam[nextIndex];

      const api = new APITelycam({IP: cameraIP, key: globals.keyTelycam});

      // se o modo anterior estava ativo, desativa o tracking (apenas uma vez)
      if (trackingActive) {
        await api.SetTrackingActive(false)
      }

      // salva próximo modo como DESATIVADO
      await streamDeck.settings.setGlobalSettings({
        ...globals,
        [`trackingModeTelycam_${cameraIP}`]: nextMode.value,
        [`trackingActive_${cameraIP}`]: false,
      });

      // envia comando para alterar o modo na câmera
      await api.TrackingMode(nextMode.value)

    } else{

      const lastMode = String(globals[`trackingMode_${cameraIP}`] || this.trackingModes[0].value);
      const trackingActive = Boolean(globals[`trackingActive_${cameraIP}`]);

      const currentIndex = this.trackingModes.findIndex(m => m.value === lastMode);
      const nextIndex = (currentIndex + 1) % this.trackingModes.length;
      nextMode = this.trackingModes[nextIndex];

      // se o modo anterior estava ativo, desativa o tracking (apenas uma vez)
      const apiNEOiD = new APINeoid({IP: cameraIP });
      if (trackingActive) {
        await apiNEOiD.SendTrackingActive(cameraIP, false);
      }

      await streamDeck.settings.setGlobalSettings({
        ...globals,
        [`trackingMode_${cameraIP}`]: nextMode.value,
        [`trackingActive_${cameraIP}`]: false,
      });

      // Envia comando para alterar o modo na câmera
      await apiNEOiD.SendTrackingMode(nextMode.value);
    }

    // visual (sempre off após trocar de modo)
    ev.action.setTitle(nextMode.name);
    ev.action.setImage("imgs/actions/tracking/tracking-off");
  }











  // ----------------------------
  // lógica de toggle (longpress)
  async toggleTracking(ev: KeyDownEvent) {
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

    if (await noCameraGuard(ev.action, globals)) return;
    const cameraIP = globals.cameraIP as string;

    const isTelycam = globals.isTelycam

    const trackingActive = Boolean(globals[`trackingActive_${cameraIP}`]);
    const newActive = !trackingActive;

    let modeInfo
    if(isTelycam) {
      const lastMode = String(globals[`trackingModeTelycam_${cameraIP}`] || this.trackingModesTelycam[0].value);
      modeInfo = this.trackingModesTelycam.find(m => m.value === lastMode) || this.trackingModesTelycam[0];

      // Salva o estado
      await streamDeck.settings.setGlobalSettings({
        ...globals,
        [`trackingModeTelycam_${cameraIP}`]: lastMode,
        [`trackingActive_${cameraIP}`]: newActive,
      });
      
    } else {

      const lastMode = String(globals[`trackingMode_${cameraIP}`] || this.trackingModes[0].value);
      modeInfo = this.trackingModes.find(m => m.value === lastMode) || this.trackingModes[0];
    
      // Salva o estado
      await streamDeck.settings.setGlobalSettings({
        ...globals,
        [`trackingMode_${cameraIP}`]: lastMode,
        [`trackingActive_${cameraIP}`]: newActive,
      });
    }
    
    // atualiza visual imediatamente para dar feedback ao usuário
    ev.action.setTitle(modeInfo.name);
    ev.action.setImage(newActive ? "imgs/actions/tracking/tracking-on" : "imgs/actions/tracking/tracking-off");
    
    // envia comando de ativar/desativar
    if(isTelycam){
      const api = new APITelycam({IP: cameraIP, key: globals.keyTelycam});
      await api.SetTrackingActive(newActive)
    } else {
      const apiNEOiD = new APINeoid({IP: cameraIP });
      await apiNEOiD.SendTrackingActive(cameraIP, newActive);
    }
  }






  override onWillDisappear(_ev: WillDisappearEvent): void {
    if (this.pressTimer) {
      clearTimeout(this.pressTimer);
      this.pressTimer = null;
    }
  }

  // para pegar info da camera
  async fetchCameraTracking(cameraIP: string) {
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

    const isTelycam = globals.isTelycam

    if(isTelycam) {

      await streamDeck.settings.setGlobalSettings({
        ...globals,
        [`trackingModeTelycam_${cameraIP}`]: "0",
        [`trackingActive_${cameraIP}`]: false,
      });

    } else {
      const parseConfig = (conf: string) => {
        const confLines = conf.split(/\r?\n/);

        let trackActive = false;
        let trackMode = this.trackingModes[0].value;

        confLines.forEach((line) => {
          const temp = line.split(/"([^"]*)"/g);
          if (temp[0].startsWith("common.track=")) {
            trackActive = temp[1] === "1";
          }
          if (temp[0].startsWith("common.track_mode=")) {
            trackMode = temp[1];
          }
        });
        const modeInfo = this.trackingModes.find(m => m.value === trackMode) || this.trackingModes[0];
        return { trackMode: modeInfo.value, trackActive };
      };

      
      const resGet = await fetch(`http://${cameraIP}/cgi-bin/param.cgi?getfulltrack`);
      if (resGet.ok) {
        const conf = await resGet.text();
        const parsed = parseConfig(conf);

        await streamDeck.settings.setGlobalSettings({
          ...globals,
          [`trackingMode_${cameraIP}`]: parsed.trackMode,
          [`trackingActive_${cameraIP}`]: parsed.trackActive,
        });

        return parsed;
      }

      const resPost = await fetch(`http://${cameraIP}/cgi-bin/param.cgi?get_path`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "path=/data/track.conf",
      });

      if (resPost.ok) {
        const conf = await resPost.text();
        const parsed = parseConfig(conf);

        await streamDeck.settings.setGlobalSettings({
          ...globals,
          [`trackingMode_${cameraIP}`]: parsed.trackMode,
          [`trackingActive_${cameraIP}`]: parsed.trackActive,
        });

        return parsed;
      }

      return null;
    }

  }
}

