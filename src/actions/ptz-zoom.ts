import streamDeck, { action, DidReceiveSettingsEvent, KeyDownEvent, KeyUpEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import type { GlobalSettings } from "../types";
import { noCameraGuard } from "../utils/no-camera-guard";
import { resolveCamera } from "../utils/camera-api";

export type PtzZoom = {
  direction: "zoomin" | "zoomout";
};

type ZoomDirection = PtzZoom["direction"];

const zoomDirections = ["zoomin", "zoomout"] as const satisfies readonly ZoomDirection[];

function isZoomDirection(s: string): s is ZoomDirection {
  return (zoomDirections as readonly string[]).includes(s);
}

@action({ UUID: "com.neoid.ptzneoid.ptz-zoom" })
export class PTZZoom extends SingletonAction<PtzZoom> {

  private async updateVisual(
    ev: WillAppearEvent<PtzZoom> | DidReceiveSettingsEvent<PtzZoom> | KeyDownEvent<PtzZoom>
  ): Promise<void> {
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    if (await noCameraGuard(ev.action, globals)) return;

    const { direction } = ev.payload.settings;
    if (!isZoomDirection(direction)) {
      await ev.action.setTitle("Select");
      return;
    }

    ev.action.setTitle("");
    ev.action.setImage(`imgs/actions/zoom/${direction}.png`);
  }

  override async onWillAppear(ev: WillAppearEvent<PtzZoom>) {
    await this.updateVisual(ev);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<PtzZoom>) {
    await this.updateVisual(ev);
  }

  override async onKeyDown(ev: KeyDownEvent<PtzZoom>): Promise<void> {
    const { direction } = ev.payload.settings;

    if (!isZoomDirection(direction)) {
      await ev.action.setTitle("Select");
      return;
    }

    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    if (await noCameraGuard(ev.action, globals)) return;
    const ctx = resolveCamera(globals);
    if (!ctx) return;

    await this.updateVisual(ev);
    ctx.api.moveZoom(direction, globals.zoomMode ?? "normal");
  }

  override async onKeyUp(_ev: KeyUpEvent<PtzZoom>): Promise<void> {
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    const ctx = resolveCamera(globals);
    if (!ctx) return;
    ctx.api.stopZoom();
  }
}
