import streamDeck, { action, DidReceiveSettingsEvent, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import type { GlobalSettings } from "../types";
import { noCameraGuard } from "../utils/no-camera-guard";
import { resolveCamera } from "../utils/camera-api";

@action({ UUID: "com.neoid.ptzneoid.freeze" })
export class Freeze extends SingletonAction {
  private isFrozen = false;

  private async getGlobals() {
    return await streamDeck.settings.getGlobalSettings<GlobalSettings>();
  }

  private parseFrozen(value: boolean | string) {
    return value === true || value === "true";
  }

  private async updateTitle(action: any, state?: boolean) {
    const globals = await this.getGlobals();
    if (await noCameraGuard(action, globals)) return;
    if (state !== undefined) {
      await action.setTitle(state ? "FREEZE" : "LIVE");
    }
  }

  private async refreshState(ev: { action: any }) {
    const globals = await this.getGlobals();
    this.isFrozen = this.parseFrozen(globals.isFrozen);
    await this.updateTitle(ev.action, this.isFrozen);
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

    this.isFrozen = !this.isFrozen;
    await ctx.api.sendFreeze(this.isFrozen);

    await this.updateTitle(ev.action, this.isFrozen);

    await streamDeck.settings.setGlobalSettings({
      ...globals,
      isFrozen: this.isFrozen,
    });

    this.actions.forEach(async (action) => {
      action.getSettings()
    });
  }
}
