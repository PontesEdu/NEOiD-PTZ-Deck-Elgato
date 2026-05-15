import streamDeck, { action, DidReceiveSettingsEvent, KeyDownEvent, KeyUpEvent, PropertyInspectorDidAppearEvent, PropertyInspectorDidDisappearEvent, SingletonAction, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";
import type { GlobalSettings } from "../types";
import { imageSnapShot } from "../utils/snapshot";
import { noCameraGuard } from "../utils/no-camera-guard";
import { resolveCamera } from "../utils/camera-api";
import { globalKeys } from "../utils/global-keys";
import { APINeoid } from "../api/api-neoid";
import { checkCameraConnection } from "../utils/checkCameraConnection";

type PtzPresetProps = {
  numberPreset: number | "undefined";
  image: boolean;
  isDefault: boolean;
  cameraIPControls: string;
};

function resolvePresetNumber(settings: PtzPresetProps): number {
  return settings.numberPreset === undefined ? 1 : Number(settings.numberPreset);
}

@action({ UUID: "com.neoid.ptzneoid.ptz-preset" })
export class PTZPreset extends SingletonAction<PtzPresetProps> {
  private pressTimer: ReturnType<typeof setTimeout> | null = null;
  private longPress = false;
  private settingsDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  private async updateVisual(ev: WillAppearEvent<PtzPresetProps> | DidReceiveSettingsEvent, checkConnectivity = false): Promise<void> {
    const settings = ev.payload.settings as PtzPresetProps;
    const presetNumber = resolvePresetNumber(settings);
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    const isDefault = settings.isDefault ?? false;

    let cameraIP: string;

    if (isDefault) {
      cameraIP = settings.cameraIPControls || "";
      if (!cameraIP) {
        await ev.action.setImage("imgs/actions/preset/preset.png");
        await ev.action.setTitle("Select");
        return;
      }
      if (checkConnectivity) {
        const connected = await checkCameraConnection(cameraIP, 1000);
        if (!connected) {
          await ev.action.setImage("");
          await ev.action.setTitle("Not connect");
          return;
        }
      }
    } else {
      if (await noCameraGuard(ev.action, globals)) {
        await ev.action.setImage("");
        return;
      }
      cameraIP = globals.cameraIP as string;
    }

    if (!isNaN(presetNumber)) {
      const isTelycam = isDefault ? false : globals.isTelycam;
      if (isTelycam) {
        await ev.action.setImage("");
        await ev.action.setTitle(`${presetNumber}`);
      } else {
        if (settings.image) {
          const image = globals[globalKeys.presetImage(presetNumber, cameraIP)];
          await ev.action.setImage(image ? String(image) : "");
        } else {
          await ev.action.setImage("");
        }
        await ev.action.setTitle(`${presetNumber}`);
      }
    } else {
      await ev.action.setImage("imgs/actions/preset/preset.png");
      await ev.action.setTitle("Select");
    }
  }

  override async onWillAppear(ev: WillAppearEvent<PtzPresetProps>) {
    await this.updateVisual(ev, true);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent) {
    const settings = ev.payload.settings as PtzPresetProps;
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

    if ((settings.isDefault ?? false) && !settings.cameraIPControls) {
      ev.action.setSettings({ ...settings, cameraIPControls: globals.cameraIPControls ?? "192.168.100.88" });
    }

    if (settings.isDefault ?? false) {
      if (this.settingsDebounceTimer) clearTimeout(this.settingsDebounceTimer);
      this.settingsDebounceTimer = setTimeout(async () => {
        this.settingsDebounceTimer = null;
        await this.updateVisual(ev, true);
      }, 1500);
      return;
    }

    await this.updateVisual(ev);
  }

  override async onPropertyInspectorDidAppear(ev: PropertyInspectorDidAppearEvent) {
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    const settings = await ev.action.getSettings<PtzPresetProps>();

    if ((settings.isDefault ?? false) && !settings.cameraIPControls) {
      ev.action.setSettings({ ...settings, cameraIPControls: globals.cameraIPControls ?? "192.168.100.88" });
    }

    const isDefault = settings.isDefault ?? false;
    if (!isDefault) return;

    const cameraIP = settings.cameraIPControls || globals.cameraIPControls || "";
    if (!cameraIP) return;

    const connected = await checkCameraConnection(cameraIP, 1000);
    if (!connected) {
      await ev.action.setImage("");
      await ev.action.setTitle("Not connect");
    }
  }

  override async onPropertyInspectorDidDisappear(ev: PropertyInspectorDidDisappearEvent) {
    if (this.settingsDebounceTimer) {
      clearTimeout(this.settingsDebounceTimer);
      this.settingsDebounceTimer = null;
    }

    const settings = await ev.action.getSettings<PtzPresetProps>();
    const isDefault = settings.isDefault ?? false;

    if (!isDefault) return;

    const cameraIP = settings.cameraIPControls || "";
    if (!cameraIP) return;

    const connected = await checkCameraConnection(cameraIP, 1000);
    if (!connected) {
      await ev.action.setImage("");
      await ev.action.setTitle("Not connect");
      return;
    }

    const presetNumber = resolvePresetNumber(settings);
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    if (settings.image) {
      const image = globals[globalKeys.presetImage(presetNumber, cameraIP)];
      await ev.action.setImage(image ? String(image) : "");
    } else {
      await ev.action.setImage("");
    }
    await ev.action.setTitle(`${presetNumber}`);
  }

  override async onKeyDown(ev: KeyDownEvent<PtzPresetProps>) {
    const settings = ev.payload.settings;
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    const presetNumber = resolvePresetNumber(settings);
    const isDefault = settings.isDefault ?? false;

    const cameraIP = isDefault
      ? settings.cameraIPControls || ""
      : (globals.cameraIP || "");

    if (!cameraIP || isNaN(presetNumber)) {
      await ev.action.setTitle(isDefault ? "No IP" : `${globals.camera}`);
      return;
    }

    // Timer setado antes do check async: garante que onKeyUp sempre encontre o timer para cancelar.
    // Se o check falhar, cancelamos o timer aqui mesmo.
    this.longPress = false;
    if (this.pressTimer) clearTimeout(this.pressTimer);
    this.pressTimer = setTimeout(() => {
      this.longPress = true;
      this.savePreset(ev, cameraIP as string, presetNumber);
    }, 1100);

    if (isDefault) {
      const connected = await checkCameraConnection(cameraIP, 1000);
      if (!connected) {
        if (this.pressTimer) {
          clearTimeout(this.pressTimer);
          this.pressTimer = null;
        }
        this.longPress = true;
        await ev.action.setImage("");
        await ev.action.setTitle("Not connect");
      }
    }
  }

  override async onKeyUp(ev: KeyUpEvent<PtzPresetProps>) {
    if (this.pressTimer) {
      clearTimeout(this.pressTimer);
      this.pressTimer = null;
    }

    const settings = ev.payload.settings;
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    const presetNumber = resolvePresetNumber(settings);
    const isDefault = settings.isDefault ?? false;

    const cameraIP = isDefault
      ? settings.cameraIPControls || ""
      : (globals.cameraIP || "");

    if (!cameraIP || isNaN(presetNumber)) return;

    if (!this.longPress) {
      if (isDefault) {
        const api = new APINeoid({ IP: cameraIP as string });
        api.CallPreset(presetNumber);
      } else {
        const ctx = resolveCamera(globals);
        if (!ctx) return;
        ctx.api.callPreset(presetNumber);
      }

      const isTelycam = isDefault ? false : globals.isTelycam;
      if (!isTelycam) {
        if (settings.image) {
          const image = globals[globalKeys.presetImage(presetNumber, cameraIP as string)];
          await ev.action.setImage(image ? String(image) : "");
        } else {
          await ev.action.setImage("");
        }
      }

      await ev.action.setTitle(`${presetNumber}`);
    }
  }

  private async savePreset(ev: KeyDownEvent<PtzPresetProps>, cameraIP: string, presetNumber: number) {
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    const settings = ev.payload.settings;
    const isDefault = settings.isDefault ?? false;

    if (isDefault) {
      const api = new APINeoid({ IP: cameraIP });
      api.AddSetPreset(presetNumber);
    } else {
      const ctx = resolveCamera(globals);
      if (!ctx) return;
      ctx.api.addSetPreset(presetNumber);
    }

    await ev.action.setTitle(`set`);
    await ev.action.setImage(`imgs/actions/set/saved.png`);

    await new Promise(resolve => setTimeout(resolve, 800));

    const isTelycam = isDefault ? false : globals.isTelycam;

    if (isTelycam) {
      await ev.action.setImage("");
      await ev.action.setTitle(`${presetNumber}`);
    } else {
      try {
        const snapshot = await imageSnapShot(cameraIP);
        await ev.action.setTitle(`${presetNumber}`);
        if (settings.image) {
          const freshGlobals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
          await streamDeck.settings.setGlobalSettings({
            ...freshGlobals,
            [globalKeys.presetImage(presetNumber, cameraIP)]: snapshot
          });
          await ev.action.setImage(snapshot);
        } else {
          await ev.action.setImage("");
        }
      } catch {
        // câmera inacessível — preset salvo na câmera, snapshot não capturado
        await ev.action.setTitle(`${presetNumber}`);
        await ev.action.setImage("");
      }
    }
  }

  override onWillDisappear(_ev: WillDisappearEvent): void {
    if (this.pressTimer) {
      clearTimeout(this.pressTimer);
      this.pressTimer = null;
    }
    if (this.settingsDebounceTimer) {
      clearTimeout(this.settingsDebounceTimer);
      this.settingsDebounceTimer = null;
    }
  }
}
