import streamDeck, { action, DidReceiveSettingsEvent, KeyDownEvent, KeyUpEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import type { GlobalSettings } from "../types";
import { noCameraGuard } from "../utils/no-camera-guard";
import { resolveCamera } from "../utils/camera-api";

export type PtzFocus = {
  mode: "focusin" | "focusout" | "afocus";
};

type FocusMode = PtzFocus["mode"];

const focusModes = ["focusin", "focusout", "afocus"] as const satisfies readonly FocusMode[];

function isFocusMode(s: string): s is FocusMode {
  return (focusModes as readonly string[]).includes(s);
}

@action({ UUID: "com.neoid.ptzneoid.ptz-focus" })
export class PTZFocus extends SingletonAction<PtzFocus> {

  private async updateVisual(
    ev: WillAppearEvent<PtzFocus> | DidReceiveSettingsEvent<PtzFocus> | KeyDownEvent<PtzFocus>
  ): Promise<void> {
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    if (await noCameraGuard(ev.action, globals)) return;

    const { mode } = ev.payload.settings;
    if (!isFocusMode(mode)) {
      await ev.action.setTitle("Select");
      return;
    }

    if (mode === "focusin") {
      ev.action.setTitle("");
      ev.action.setImage("imgs/actions/focus/focusin.png");
    } else if (mode === "focusout") {
      ev.action.setTitle("");
      ev.action.setImage("imgs/actions/focus/focusout.png");
    } else {
      ev.action.setTitle("");
      ev.action.setImage("imgs/actions/focus/auto.png");
    }
  }

  override async onWillAppear(ev: WillAppearEvent<PtzFocus>) {
    await this.updateVisual(ev);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<PtzFocus>) {
    await this.updateVisual(ev);
  }

  override async onKeyDown(ev: KeyDownEvent<PtzFocus>): Promise<void> {
    const { mode } = ev.payload.settings;

    if (!isFocusMode(mode)) {
      await ev.action.setTitle("Select");
      return;
    }

    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    if (await noCameraGuard(ev.action, globals)) return;
    const ctx = resolveCamera(globals);
    if (!ctx) return;

    await this.updateVisual(ev);
    ctx.api.moveFocus(mode, globals.focusMode ?? "normal");
  }

  override async onKeyUp(_ev: KeyUpEvent<PtzFocus>): Promise<void> {
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    const ctx = resolveCamera(globals);
    if (!ctx) return;
    ctx.api.stopFocus();
  }
}
