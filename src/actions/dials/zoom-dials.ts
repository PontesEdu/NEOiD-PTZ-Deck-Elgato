import streamDeck, { action, DialDownEvent, DialRotateEvent, DidReceiveSettingsEvent, SingletonAction, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";
import type { GlobalSettings } from "../../types";
import { noCameraGuard } from "../../utils/no-camera-guard";
import { resolveCamera } from "../../utils/camera-api";



@action({ UUID: "com.neoid.ptzneoid.zoom-dial" })
export class ZoomDial extends SingletonAction {
  private stopzoomTimer: NodeJS.Timeout | null = null;

  override async onDialRotate(ev: DialRotateEvent): Promise<void> {
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

    if (await noCameraGuard(ev.action, globals)) return;

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
    const ctx = resolveCamera(globals);
    if (!ctx) return;
    ctx.api.moveZoom(direction, speed);

    // Setup do timer de stop (ex: 200 ms após a última rotação)
    this.stopzoomTimer = setTimeout(() => {
      resolveCamera(globals)?.api.stopZoom();
      ev.action.setTitle(`Zoom`);
      this.stopzoomTimer = null;
    }, 200); // 200 ms sem girar = parar
  }

  override async onDialDown(_ev: DialDownEvent): Promise<void> {

  }

  private async updateButton(ev: WillAppearEvent | DidReceiveSettingsEvent): Promise<void> {
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    if (await noCameraGuard(ev.action, globals)) return;
    ev.action.setTitle(`Zoom`);
  }

  override async onWillAppear(ev: WillAppearEvent) {
    await this.updateButton(ev);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent) {
    await this.updateButton(ev);
  }

  override async onWillDisappear(_ev: WillDisappearEvent): Promise<void> {
    if (!this.stopzoomTimer) return;
    clearTimeout(this.stopzoomTimer);
    this.stopzoomTimer = null;
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    resolveCamera(globals)?.api.stopZoom();
  }
}