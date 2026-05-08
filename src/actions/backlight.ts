import streamDeck, { action, DidReceiveSettingsEvent, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { APINeoid } from "../api/api-neoid";
import { APITelycam } from "../api/api-telycam";
import type { GlobalSettings } from "../types";

@action({ UUID: "com.neoid.ptzneoid.backlight" })
export class Backlight extends SingletonAction {
  private isBacklight = false;

  // FN -> config Settings Globals 
  private async getGlobals() {
    return await streamDeck.settings.getGlobalSettings<GlobalSettings>();
  }

  private parseBacklight(value: boolean | string) {
    return value === true || value === "true";
  }

  private async updateTitle(action: any, cameraIP: string | false, state?: boolean) {
    const globals = await this.getGlobals();
    if(!cameraIP){
      const titleName = globals.camera === undefined ? "No camera" : globals.camera
      await action.setTitle(`${titleName}`)
      return;
    }

    if (state !== undefined) {
      await action.setTitle(state ? "Backlight\nON" : "Backlight\nOFF");
    }
  }

  private async refreshState(ev: { action: any }) {
    const globals = await this.getGlobals();
    this.isBacklight = this.parseBacklight(globals.isBacklight);
    await this.updateTitle(ev.action, globals.cameraIP, this.isBacklight);
  }

  override async onWillAppear(ev: WillAppearEvent) {
    await this.refreshState(ev);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent) {
    await this.refreshState(ev);
  }

  override async onKeyDown(ev: KeyDownEvent) {
    const globals = await this.getGlobals();
    const cameraIP = globals.cameraIP;

    if(!cameraIP){
      await ev.action.setTitle(`No camera`)
      return
    }

    this.isBacklight = !this.isBacklight;


    if(globals.isTelycam){
      const api = new APITelycam({IP: cameraIP, key: globals.keyTelycam});
      await api.toggleBacklight(this.isBacklight);

    } else{
      const api = new APINeoid({IP: cameraIP});
      await api.toggleBacklight(this.isBacklight);
    }

    await this.updateTitle(ev.action, cameraIP, this.isBacklight);

    await streamDeck.settings.setGlobalSettings({
      ...globals,
      isBacklight: this.isBacklight,
    });

    this.actions.forEach(async (action) => {
      action.getSettings()
    }) 
  }
}



