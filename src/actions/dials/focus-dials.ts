import streamDeck, { action, DialDownEvent, DialRotateEvent, DidReceiveSettingsEvent, SingletonAction, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";
import type { GlobalSettings } from "../../types";
import { noCameraGuard } from "../../utils/no-camera-guard";
import { resolveCamera } from "../../utils/camera-api";



@action({ UUID: "com.neoid.ptzneoid.focus-dial" })
export class FocusDial extends SingletonAction {
  private stopFocusTimer: NodeJS.Timeout | null = null;

  override async onDialRotate(ev: DialRotateEvent): Promise<void> {
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

    if (await noCameraGuard(ev.action, globals)) return;

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
    const ctx = resolveCamera(globals);
    if (!ctx) return;
    ctx.api.moveFocus(direction, speed);

    // Setup do timer de stop (ex: 200 ms após a última rotação)
    this.stopFocusTimer = setTimeout(() => {
      resolveCamera(globals)?.api.stopFocus();
      ev.action.setTitle(`Focus`);
      this.stopFocusTimer = null;
    }, 200); // 200 ms sem girar = parar
  }

  override async onDialDown(ev: DialDownEvent): Promise<void> {
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    const ctx = resolveCamera(globals);
    if (!ctx) return;

    await ev.action.setTitle("Auto Focus");
    ctx.api.moveFocus("afocus", globals.focusMode ?? "normal");
  }

  private async updateButton(ev: WillAppearEvent | DidReceiveSettingsEvent): Promise<void> {
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    if (await noCameraGuard(ev.action, globals)) return;
    ev.action.setTitle(`Focus`);
  }

  override async onWillAppear(ev: WillAppearEvent) {
    await this.updateButton(ev);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent) {
    await this.updateButton(ev);
  }

  override async onWillDisappear(_ev: WillDisappearEvent): Promise<void> {
    if (!this.stopFocusTimer) return;
    clearTimeout(this.stopFocusTimer);
    this.stopFocusTimer = null;
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    resolveCamera(globals)?.api.stopFocus();
  }
}