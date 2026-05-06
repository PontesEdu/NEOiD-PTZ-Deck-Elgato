import streamDeck, { action, DialDownEvent, DialRotateEvent, DidReceiveSettingsEvent, KeyDownEvent, KeyUpEvent, PropertyInspectorDidAppearEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { APITelycam } from "../../api/api-telycam";
import { APINeoid, SpeedType } from "../../api/api-neoid";



@action({ UUID: "com.neoid.ptzneoid.zoom-dial" })
export class ZoomDial extends SingletonAction {
  private stopzoomTimer: NodeJS.Timeout | null = null;

   override async onDialRotate(ev: DialRotateEvent): Promise<void> {
    const globals = await streamDeck.settings.getGlobalSettings();
    const cameraIP = globals.cameraIP as string;

    if (!cameraIP) {
      const titleName = globals.camera === undefined ? "No camera" : globals.camera
      await ev.action.setTitle(`${titleName ?? ""}`)
      return
    }

    // Cancelar timer existente
    if (this.stopzoomTimer) {
      clearTimeout(this.stopzoomTimer);
    }

    // Direção do giro
    const direction = ev.payload.ticks > 0 ? "zoomin" : "zoomout";

    if(direction === "zoomin") {
      ev.action.setTitle(`Zoom in`)
    } else if(direction === "zoomout") {
      ev.action.setTitle(`Zoom out`)
    }

    const speed = globals.zoomMode as SpeedType ?? "normal";

    // Chamar API de movimento
    if (globals.isTelycam) {
      const keyTelycam = globals.keyTelycam as number;
      const api = new APITelycam({ IP: cameraIP, key: keyTelycam });
      api.MoveZoomTelycam(direction, speed);
    } else {
      const api = new APINeoid({ IP: cameraIP });
      api.MoveZoomAndFocus(direction, speed);
    }

    // Setup do timer de stop (ex: 200 ms após a última rotação)
    this.stopzoomTimer = setTimeout(() => {
      if (globals.isTelycam) {
        const keyTelycam = globals.keyTelycam as number;
        const api = new APITelycam({ IP: cameraIP, key: keyTelycam });
        api.StopZoomTelycam();
      } else {
        const api = new APINeoid({ IP: cameraIP });
        api.StopZoomAndFocus("zoom");
      }
      ev.action.setTitle(`Zoom`)
      this.stopzoomTimer = null;
    }, 200); // 200 ms sem girar = parar
  }

  override async onDialDown(ev: DialDownEvent): Promise<void> {
    
  }

  override async onWillAppear(ev: WillAppearEvent) {
    const globals = await streamDeck.settings.getGlobalSettings();
    const cameraIP = globals.cameraIP
    
    if(!cameraIP){
      const titleName = globals.camera === undefined ? "No camera" : globals.camera
      await ev.action.setTitle(`${titleName}`)
      return
    }

    ev.action.setTitle(`Zoom`)
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent) {
    const globals = await streamDeck.settings.getGlobalSettings();
    const cameraIP = globals.cameraIP
    
    if(!cameraIP){
      const titleName = globals.camera === undefined ? "No camera" : globals.camera
      await ev.action.setTitle(`${titleName}`)
      return
    }

    ev.action.setTitle(`Zoom`)
  }
}