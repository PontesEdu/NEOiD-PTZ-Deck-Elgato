import streamDeck, { action, DidReceiveSettingsEvent, KeyDownEvent, KeyUpEvent, PropertyInspectorDidAppearEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import type { GlobalSettings } from "../types";
import { checkCameraConnection } from "../utils/checkCameraConnection";
import { PTZ_DIRECTIONS } from "../constants";
import type { PTZDirection } from "../constants";
import { APINeoid } from "../api/api-neoid";
import { resolveCamera } from "../utils/camera-api";

export type PtzSettings = {
  direction: string;
  cameraIPControls: string;
  isDefault: boolean;
};

@action({ UUID: "com.neoid.ptzneoid.ptz-controls" })
export class PTZControls extends SingletonAction<PtzSettings> {

  // Nota: ev.payload.settings pode conter cameraIPControls desatualizado se chamado logo após
  // setSettings em onDidReceiveSettings. Seguro porque checkConnectivity=false não usa o campo.
  private async updateVisual(
    ev: WillAppearEvent<PtzSettings> | DidReceiveSettingsEvent<PtzSettings>,
    checkConnectivity = false,
    cachedGlobals?: GlobalSettings
  ): Promise<void> {
    const settings = ev.payload.settings;
    const globals = cachedGlobals ?? await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    const direction = settings.direction as PTZDirection;

    if (!PTZ_DIRECTIONS.includes(direction)) {
      await ev.action.setTitle('Select');
      return;
    }

    ev.action.setImage(`imgs/actions/controls/${direction}.png`);

    const isDefault = settings.isDefault ?? false;

    if (isDefault) {
      if (checkConnectivity) {
        const ip = settings.cameraIPControls ?? "";
        const connected = await checkCameraConnection(ip, 1000);
        await ev.action.setTitle(connected ? "" : "Not connect");
      } else {
        await ev.action.setTitle("");
      }
    } else {
      await ev.action.setTitle(globals.camera ?? "");
    }
  }

  override async onWillAppear(ev: WillAppearEvent<PtzSettings>) {
    await this.updateVisual(ev, true);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<PtzSettings>) {
    const settings = ev.payload.settings;
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

    const cameraIPControls = settings.cameraIPControls ?? "";
    if (!cameraIPControls) {
      ev.action.setSettings({ ...settings, cameraIPControls: globals.cameraIPControls ?? "192.168.100.88" });
    }

    await this.updateVisual(ev, false, globals);
  }

  override async onPropertyInspectorDidAppear(ev: PropertyInspectorDidAppearEvent) {
    // Esse método é chamado quando o user abre o inspector de propriedades/config (abre o botão)
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    const settings = await ev.action.getSettings();

    const cameraIPControls = settings.cameraIPControls ?? "";
    if (!cameraIPControls) {
      ev.action.setSettings({ ...settings, cameraIPControls: globals.cameraIPControls ?? "192.168.100.88" });
    }
  }

  override async onKeyDown(ev: KeyDownEvent<PtzSettings>): Promise<void> {
    const settings = ev.payload.settings;
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    const direction = settings.direction as PTZDirection;

    if (!PTZ_DIRECTIONS.includes(direction)) {
      await ev.action.setTitle('Select');
      return;
    }

    const speed = globals.panMode ?? "normal";
    const isDefault = settings.isDefault ?? false;

    if (isDefault) {
      const cameraIPControls = settings.cameraIPControls ?? "";
      const checkCamera = await checkCameraConnection(cameraIPControls, 1000);

      if (checkCamera) {
        const api = new APINeoid({ IP: cameraIPControls });
        await api.Move(direction, speed);

        // sincroniza cameraIPControls nos globals para que botões "camera select" adicionados
        // depois já apareçam com o IP correto
        await streamDeck.settings.setGlobalSettings({ ...globals, cameraIPControls });

        await ev.action.setTitle("");
        return;
      } else {
        ev.action.setTitle("Not connect");
        return;
      }
    } else {
      const ctx = resolveCamera(globals);
      if (!ctx) return;
      await ev.action.setTitle(globals.camera ?? "");
      await ctx.api.move(direction, speed);
    }
  }

  override async onKeyUp(ev: KeyUpEvent<PtzSettings>): Promise<void> {
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    const settings = ev.payload.settings;
    const isDefault = settings.isDefault ?? false;

    if (isDefault) {
      const cameraIPControls = settings.cameraIPControls ?? "";
      const api = new APINeoid({ IP: cameraIPControls });
      api.StopMove();
    } else {
      const ctx = resolveCamera(globals);
      if (!ctx) return;
      ctx.api.stopMove();
    }
  }
}
