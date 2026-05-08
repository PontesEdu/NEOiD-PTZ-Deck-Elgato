import streamDeck, { action, DialDownEvent, DialRotateEvent, DidReceiveSettingsEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { APITelycam } from "../../api/api-telycam";
import { APINeoid } from "../../api/api-neoid";
import type { GlobalSettings } from "../../types";



@action({ UUID: "com.neoid.ptzneoid.focus-dial" })
export class FocusDial extends SingletonAction {
  private stopFocusTimer: NodeJS.Timeout | null = null;

  override async onDialRotate(ev: DialRotateEvent): Promise<void> {
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    const cameraIP = globals.cameraIP;

    if (!cameraIP) {
      const titleName = globals.camera === undefined ? "No camera" : globals.camera
      await ev.action.setTitle(`${titleName ?? ""}`)
      return
    }

    // Cancelar timer existente
    if (this.stopFocusTimer) {
      clearTimeout(this.stopFocusTimer);
    }

    // Direção do giro
    const direction = ev.payload.ticks > 0 ? "focusin" : "focusout";

    if(direction === "focusin") {
      ev.action.setTitle(`Focus in`)
    } else if(direction === "focusout") {
      ev.action.setTitle(`Focus out`)
    }

    const speed = globals.focusMode ?? "normal";

    // Chamar API de movimento
    if (globals.isTelycam) {
      const api = new APITelycam({ IP: cameraIP, key: globals.keyTelycam });
      api.MoveFocusTelycam(direction, speed);
    } else {
      const api = new APINeoid({ IP: cameraIP });
      api.MoveZoomAndFocus(direction, speed);
    }

    // Setup do timer de stop (ex: 200 ms após a última rotação)
    this.stopFocusTimer = setTimeout(() => {
      if (globals.isTelycam) {
        const api = new APITelycam({ IP: cameraIP, key: globals.keyTelycam });
        api.StopFocusTelycam();
      } else {
        const api = new APINeoid({ IP: cameraIP });
        api.StopZoomAndFocus("focus");
      }
      ev.action.setTitle(`Focus`)
      this.stopFocusTimer = null;
    }, 200); // 200 ms sem girar = parar
  }

  override async onDialDown(ev: DialDownEvent): Promise<void> {
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    const cameraIP = globals.cameraIP;
    if (!cameraIP) {
      return;
    }

    await ev.action.setTitle("Auto Focus");

    const speed = globals.focusMode ?? "normal";

    if (globals.isTelycam) {
      const api = new APITelycam({ IP: cameraIP, key: globals.keyTelycam });
      api.MoveFocusTelycam("afocus", speed);
    } else {
      const api = new APINeoid({ IP: cameraIP });
      api.MoveZoomAndFocus("afocus", speed);
    }
  }

  override async onWillAppear(ev: WillAppearEvent) {
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    const cameraIP = globals.cameraIP

    if(!cameraIP){
      const titleName = globals.camera === undefined ? "No camera" : globals.camera
      await ev.action.setTitle(`${titleName ?? ""}`)
      return
    }

    ev.action.setTitle(`Focus`)
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent){
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    const cameraIP = globals.cameraIP

    if(!cameraIP){
      const titleName = globals.camera === undefined ? "No camera" : globals.camera
      await ev.action.setTitle(`${titleName ?? ""}`)
      return
    }

    ev.action.setTitle(`Focus`)
  }
}