import streamDeck, { action, DidReceiveSettingsEvent, KeyDownEvent, KeyUpEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { APINeoid, SpeedType } from "../api/api-neoid";
import { APITelycam } from "../api/api-telycam";

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
    return await streamDeck.settings.getGlobalSettings();
  }

  private isValidDirection(direction: string): direction is "zoomin" | "zoomout" {
    return this.validDirections.includes(direction as any);
  }

  private async updateButton(ev: any, direction?: "zoomin" | "zoomout", camera?: string) {
    const globals = await streamDeck.settings.getGlobalSettings();

    if (!camera) {
      const titleName = globals.camera === undefined ? "No camera" : globals.camera
      await ev.action.setTitle(`${titleName}`)
      return;
    }

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
    const cameraIP = globals.cameraIP as string;

    await this.updateButton(ev, this.isValidDirection(settings.direction) ? settings.direction : undefined, cameraIP);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<PtzZoom>) {
    const settings = ev.payload.settings;
    const globals = await this.getGlobals();
    const cameraIP = globals.cameraIP as string;

    await this.updateButton(ev, this.isValidDirection(settings.direction) ? settings.direction : undefined, cameraIP);
  }

  override async onKeyDown(ev: KeyDownEvent<PtzZoom>): Promise<void> {
    const settings = ev.payload.settings;
    const direction = this.isValidDirection(settings.direction) ? settings.direction : undefined;

    const globals = await this.getGlobals();
    const cameraIP = globals.cameraIP as string;

    await this.updateButton(ev, direction, cameraIP);

    if (!cameraIP || !direction) return;

    //  API 
    const speed = globals.zoomMode as SpeedType ?? "normal";

    if(globals.isTelycam){
      const keyTelycam = globals.keyTelycam as number
      const api = new APITelycam({IP: cameraIP, key: keyTelycam});
      api.MoveZoomTelycam(direction, speed)
    } else {
      const api = new APINeoid({IP: cameraIP});
      api.MoveZoomAndFocus(direction, speed)
    }
  }

  override async onKeyUp(ev: KeyUpEvent<PtzZoom>): Promise<void> {
    const globals = await this.getGlobals();
    const cameraIP = globals.cameraIP as string;
    if (!cameraIP) return;

    if(globals.isTelycam){
      const keyTelycam = globals.keyTelycam as number
      const api = new APITelycam({IP: cameraIP, key: keyTelycam});
      api.StopZoomTelycam()
    } else {
      const api = new APINeoid({IP: cameraIP});
      api.StopZoomAndFocus("zoom")
    }
  }
}


