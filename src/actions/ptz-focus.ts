import streamDeck, { action, DidReceiveSettingsEvent, KeyDownEvent, KeyUpEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import type { GlobalSettings } from "../types";
import { noCameraGuard } from "../utils/no-camera-guard";
import { resolveCamera } from "../utils/camera-api";

export type PtzFocus = {
  speed?: number;
  mode: "focusout" | "focusin" | "afocus";
  cameraIP: string;
  camera: string;
};


// Ações
@action({ UUID: "com.neoid.ptzneoid.ptz-focus" })
export class PTZFocus extends SingletonAction<PtzFocus> {

  private async updateVisual(ev: WillAppearEvent<PtzFocus> | DidReceiveSettingsEvent<PtzFocus>): Promise<void> {
    const settings = ev.payload.settings;
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

    if (await noCameraGuard(ev.action, globals)) return;

    const direction = settings.mode as string;
    if (!["focusout", "focusin", "afocus"].includes(direction)) {
      await ev.action.setTitle("Select");
      return;
    }

    if (settings.mode === "focusin") {
      ev.action.setTitle(`Focus in`);
      ev.action.setImage(`imgs/actions/focus/${settings.mode}.png`);
    } else if (settings.mode === "focusout") {
      ev.action.setTitle(`Focus out`);
      ev.action.setImage(`imgs/actions/focus/${settings.mode}.png`);
    } else if (settings.mode === "afocus") {
      ev.action.setTitle(`auto`);
      ev.action.setImage(`imgs/actions/focus/auto.png`);
    }
  }

  override async onWillAppear(ev: WillAppearEvent<PtzFocus>) {
    await this.updateVisual(ev);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<PtzFocus>) {
    await this.updateVisual(ev);
  }

  override async onKeyDown(ev: KeyDownEvent<PtzFocus>): Promise<void> {
    const settings = ev.payload.settings

    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

    if (await noCameraGuard(ev.action, globals)) return;
    const ctx = resolveCamera(globals);
    if (!ctx) return;

    const direction = settings.mode as "focusout" | "focusin" | "afocus";

    if (!["focusout", "focusin", "afocus"].includes(direction)) {
      await ev.action.setTitle("Select");
      return;
    }

    if (direction === "focusin") {
      ev.action.setTitle(`Focus in`)
      ev.action.setImage(`imgs/actions/focus/${settings.mode}.png`)
    } else if (direction === "focusout") {
      ev.action.setTitle(`Focus out`)
      ev.action.setImage(`imgs/actions/focus/${settings.mode}.png`)
    } else if (direction === "afocus") {
      ev.action.setTitle(`auto`)
      ev.action.setImage(`imgs/actions/focus/auto.png`)
    }

    ctx.api.moveFocus(direction, globals.focusMode ?? "normal");
  }

  override async onKeyUp(_ev: KeyUpEvent<PtzFocus>): Promise<void> {
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    const ctx = resolveCamera(globals);
    if (!ctx) return;
    ctx.api.stopFocus();
  }
}
