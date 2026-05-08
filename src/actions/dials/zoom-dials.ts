import streamDeck, { action, DialDownEvent, DialRotateEvent, DidReceiveSettingsEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { APITelycam } from "../../api/api-telycam";
import { APINeoid } from "../../api/api-neoid";
import type { GlobalSettings } from "../../types";
import { noCameraGuard } from "../../utils/no-camera-guard";



@action({ UUID: "com.neoid.ptzneoid.zoom-dial" })
export class ZoomDial extends SingletonAction {
  private stopzoomTimer: NodeJS.Timeout | null = null;

  override async onDialRotate(ev: DialRotateEvent): Promise<void> {
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

    if (await noCameraGuard(ev.action, globals)) return;
    const cameraIP = globals.cameraIP as string;

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

    const speed = globals.zoomMode ?? "normal";

    // Chamar API de movimento
    if (globals.isTelycam) {
      const api = new APITelycam({ IP: cameraIP, key: globals.keyTelycam });
      api.MoveZoomTelycam(direction, speed);
    } else {
      const api = new APINeoid({ IP: cameraIP });
      api.MoveZoomAndFocus(direction, speed);
    }

    // Setup do timer de stop (ex: 200 ms após a última rotação)
    this.stopzoomTimer = setTimeout(() => {
      if (globals.isTelycam) {
        const api = new APITelycam({ IP: cameraIP, key: globals.keyTelycam });
        api.StopZoomTelycam();
      } else {
        const api = new APINeoid({ IP: cameraIP });
        api.StopZoomAndFocus("zoom");
      }
      ev.action.setTitle(`Zoom`)
      this.stopzoomTimer = null;
    }, 200); // 200 ms sem girar = parar
  }

  override async onDialDown(_ev: DialDownEvent): Promise<void> {

  }

  override async onWillAppear(ev: WillAppearEvent) {
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

    if (await noCameraGuard(ev.action, globals)) return;

    ev.action.setTitle(`Zoom`)
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent) {
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

    if (await noCameraGuard(ev.action, globals)) return;

    ev.action.setTitle(`Zoom`)
  }
}