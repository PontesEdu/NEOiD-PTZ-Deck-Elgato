import streamDeck, { action, DidReceiveSettingsEvent, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import type { GlobalSettings } from "../types";
import { noCameraGuard } from "../utils/no-camera-guard";
import { resolveCamera } from "../utils/camera-api";

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

  private async updateTitle(action: any, state?: boolean) {
    const globals = await this.getGlobals();
    if (await noCameraGuard(action, globals)) return;
    if (state !== undefined) {
      await action.setTitle(state ? "ON" : "OFF");
    }
  }

  private async refreshState(ev: { action: any }) {
    const globals = await this.getGlobals();
    this.isBacklight = this.parseBacklight(globals.isBacklight);
    await this.updateTitle(ev.action, this.isBacklight);
  }

  override async onWillAppear(ev: WillAppearEvent) {
    await this.refreshState(ev);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent) {
    await this.refreshState(ev);
  }

  override async onKeyDown(ev: KeyDownEvent) {
    const globals = await this.getGlobals();

    if (await noCameraGuard(ev.action, globals)) return;
    const ctx = resolveCamera(globals);
    if (!ctx) return;

    this.isBacklight = !this.isBacklight;
    await ctx.api.toggleBacklight(this.isBacklight);

    await this.updateTitle(ev.action, this.isBacklight);

    await streamDeck.settings.setGlobalSettings({
      ...globals,
      isBacklight: this.isBacklight,
    });

    this.actions.forEach(async (action) => {
      action.getSettings()
    }) 
  }
}



