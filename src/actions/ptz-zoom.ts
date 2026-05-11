import streamDeck, { action, DidReceiveSettingsEvent, KeyDownEvent, KeyUpEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { APINeoid } from "../api/api-neoid";
import { APITelycam } from "../api/api-telycam";
import type { GlobalSettings } from "../types";
import { noCameraGuard } from "../utils/no-camera-guard";

export type PtzZoom = {
  speed?: number;
  direction: "zoomout" | "zoomin";
  cameraIP: string;
};

// Ações
@action({ UUID: "com.neoid.ptzneoid.ptz-zoom" })
export class PTZZoom extends SingletonAction<PtzZoom> {

  private validDirections = ["zoomin", "zoomout"] as const;

  //Fn -> config settings Globals
  private async getGlobals() {
    return await streamDeck.settings.getGlobalSettings<GlobalSettings>();
  }

  private isValidDirection(direction: string): direction is "zoomin" | "zoomout" {
    return (this.validDirections as readonly string[]).includes(direction);
  }

  private async updateButton(
    ev: WillAppearEvent<PtzZoom> | DidReceiveSettingsEvent<PtzZoom> | KeyDownEvent<PtzZoom>,
    direction?: "zoomin" | "zoomout",
  ) {
    if (!direction) {
      await ev.action.setTitle("Select");
      return;
    }
    await ev.action.setTitle(direction === "zoomin" ? "Zoom in" : "Zoom out");
    await ev.action.setImage(`imgs/actions/zoom/${direction}.png`);
  }

  override async onWillAppear(ev: WillAppearEvent<PtzZoom>) {
    const settings = ev.payload.settings;
    const globals = await this.getGlobals();
    if (await noCameraGuard(ev.action, globals)) return;
    await this.updateButton(ev, this.isValidDirection(settings.direction) ? settings.direction : undefined);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<PtzZoom>) {
    const settings = ev.payload.settings;
    const globals = await this.getGlobals();
    if (await noCameraGuard(ev.action, globals)) return;
    await this.updateButton(ev, this.isValidDirection(settings.direction) ? settings.direction : undefined);
  }

  override async onKeyDown(ev: KeyDownEvent<PtzZoom>): Promise<void> {
    const settings = ev.payload.settings;
    const direction = this.isValidDirection(settings.direction) ? settings.direction : undefined;

    const globals = await this.getGlobals();
    if (await noCameraGuard(ev.action, globals)) return;

    await this.updateButton(ev, direction);

    if (!direction) return;

    const cameraIP = globals.cameraIP as string;
    const speed = globals.zoomMode ?? "normal";

    if(globals.isTelycam){
      const api = new APITelycam({IP: cameraIP, key: globals.keyTelycam});
      api.MoveZoomTelycam(direction, speed)
    } else {
      const api = new APINeoid({IP: cameraIP});
      api.MoveZoomAndFocus(direction, speed)
    }
  }

  override async onKeyUp(_ev: KeyUpEvent<PtzZoom>): Promise<void> {
    const globals = await this.getGlobals();
    const cameraIP = globals.cameraIP;
    if (!cameraIP) return;

    if(globals.isTelycam){
      const api = new APITelycam({IP: cameraIP, key: globals.keyTelycam});
      api.StopZoomTelycam()
    } else {
      const api = new APINeoid({IP: cameraIP});
      api.StopZoomAndFocus("zoom")
    }
  }
}


