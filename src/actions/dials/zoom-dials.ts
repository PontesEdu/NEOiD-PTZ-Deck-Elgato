import streamDeck, { action, DialRotateEvent, DidReceiveSettingsEvent, SingletonAction, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";
import type { GlobalSettings } from "../../types";
import { noCameraGuard } from "../../utils/no-camera-guard";
import { resolveCamera } from "../../utils/camera-api";



@action({ UUID: "com.neoid.ptzneoid.zoom-dial" })
export class ZoomDial extends SingletonAction {
  private stopZoomTimer: NodeJS.Timeout | null = null;

  override async onDialRotate(ev: DialRotateEvent): Promise<void> {
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

    if (await noCameraGuard(ev.action, globals)) return;

    // Cancelar timer existente
    if (this.stopZoomTimer) {
      clearTimeout(this.stopZoomTimer);
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
    this.stopZoomTimer = setTimeout(() => {
      resolveCamera(globals)?.api.stopZoom();
      ev.action.setTitle(`Zoom`);
      this.stopZoomTimer = null;
    }, 200); // 200 ms sem girar = parar
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
    if (!this.stopZoomTimer) return;
    clearTimeout(this.stopZoomTimer);
    this.stopZoomTimer = null;
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    resolveCamera(globals)?.api.stopZoom();
  }
}