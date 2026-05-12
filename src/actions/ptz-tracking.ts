import streamDeck, { action, DidReceiveSettingsEvent, KeyDownEvent, KeyUpEvent, SingletonAction, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";
import { APITelycam } from "../api/api-telycam";
import { APINeoid } from "../api/api-neoid";
import type { GlobalSettings } from "../types";
import { noCameraGuard } from "../utils/no-camera-guard";
import { globalKeys } from "../utils/global-keys";

const trackingModes = [
  { value: "tracking", name: "Presenter" },
  { value: "region", name: "Zona" },
  { value: "autoframe", name: "Auto\nFrame" },
];

const trackingModesTelycam = [
  { value: "0", name: "Tracking" },
  { value: "1", name: "Head\nFraming" },
  { value: "2", name: "Body\nFraming" },
];

@action({ UUID: "com.neoid.ptzneoid.ptz-tracking" })
export class PTZTracking extends SingletonAction {
  private pressTimer: ReturnType<typeof setTimeout> | null = null;
  private longPress = false;

  private async updateVisual(ev: WillAppearEvent | DidReceiveSettingsEvent): Promise<void> {
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

    if (await noCameraGuard(ev.action, globals)) {
      ev.action.setImage("imgs/actions/tracking/tracking-off");
      return;
    }
    const cameraIP = globals.cameraIP as string;
    const isTelycam = globals.isTelycam;
    const trackingActive = Boolean(globals[globalKeys.trackingActive(cameraIP)]);

    let modeInfo;
    if (isTelycam) {
      const lastMode = String(globals[globalKeys.trackingModeTelycam(cameraIP)] || trackingModesTelycam[0].value);
      modeInfo = trackingModesTelycam.find(m => m.value === lastMode) || trackingModesTelycam[0];
    } else {
      const lastMode = String(globals[globalKeys.trackingMode(cameraIP)] || trackingModes[0].value);
      modeInfo = trackingModes.find(m => m.value === lastMode) || trackingModes[0];
    }

    ev.action.setTitle(modeInfo.name);
    ev.action.setImage(trackingActive ? "imgs/actions/tracking/tracking-on" : "imgs/actions/tracking/tracking-off");
  }

  override async onWillAppear(ev: WillAppearEvent) {
    await this.updateVisual(ev);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent) {
    await this.updateVisual(ev);
  }

  override async onKeyDown(ev: KeyDownEvent) {
    this.longPress = false;
    if (this.pressTimer) clearTimeout(this.pressTimer);

    this.pressTimer = setTimeout(async () => {
      this.longPress = true;
      this.pressTimer = null;
      await this.toggleTracking(ev);
    }, 900);
  }

  override async onKeyUp(ev: KeyUpEvent) {
    if (this.pressTimer) {
      clearTimeout(this.pressTimer);
      this.pressTimer = null;
    }

    if (!this.longPress) {
      await this.cycleMode(ev);
    }
  }

  private async cycleMode(ev: KeyUpEvent) {
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    if (await noCameraGuard(ev.action, globals)) return;
    const cameraIP = globals.cameraIP as string;
    const isTelycam = globals.isTelycam;

    if (isTelycam) {
      const lastMode = String(globals[globalKeys.trackingModeTelycam(cameraIP)] || trackingModesTelycam[0].value);
      const trackingActive = Boolean(globals[globalKeys.trackingActive(cameraIP)]);
      const currentIndex = trackingModesTelycam.findIndex(m => m.value === lastMode);
      const nextMode = trackingModesTelycam[(currentIndex + 1) % trackingModesTelycam.length];

      ev.action.setTitle(nextMode.name);
      ev.action.setImage("imgs/actions/tracking/tracking-off");

      const api = new APITelycam({ IP: cameraIP, key: globals.keyTelycam });
      if (trackingActive) {
        await api.SetTrackingActive(false);
      }
      await streamDeck.settings.setGlobalSettings({
        ...globals,
        [globalKeys.trackingModeTelycam(cameraIP)]: nextMode.value,
        [globalKeys.trackingActive(cameraIP)]: false,
      });
      await api.TrackingMode(nextMode.value);

    } else {
      const lastMode = String(globals[globalKeys.trackingMode(cameraIP)] || trackingModes[0].value);
      const trackingActive = Boolean(globals[globalKeys.trackingActive(cameraIP)]);
      const currentIndex = trackingModes.findIndex(m => m.value === lastMode);
      const nextMode = trackingModes[(currentIndex + 1) % trackingModes.length];

      ev.action.setTitle(nextMode.name);
      ev.action.setImage("imgs/actions/tracking/tracking-off");

      const apiNEOiD = new APINeoid({ IP: cameraIP });
      if (trackingActive) {
        await apiNEOiD.SendTrackingActive(cameraIP, false);
      }
      await streamDeck.settings.setGlobalSettings({
        ...globals,
        [globalKeys.trackingMode(cameraIP)]: nextMode.value,
        [globalKeys.trackingActive(cameraIP)]: false,
      });
      await apiNEOiD.SendTrackingMode(nextMode.value);
    }
  }

  private async toggleTracking(ev: KeyDownEvent) {
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    if (await noCameraGuard(ev.action, globals)) return;

    const cameraIP = globals.cameraIP as string;
    const isTelycam = globals.isTelycam;
    const trackingActive = Boolean(globals[globalKeys.trackingActive(cameraIP)]);
    const newActive = !trackingActive;

    let modeInfo;
    if (isTelycam) {
      const lastMode = String(globals[globalKeys.trackingModeTelycam(cameraIP)] || trackingModesTelycam[0].value);
      modeInfo = trackingModesTelycam.find(m => m.value === lastMode) || trackingModesTelycam[0];
    } else {
      const lastMode = String(globals[globalKeys.trackingMode(cameraIP)] || trackingModes[0].value);
      modeInfo = trackingModes.find(m => m.value === lastMode) || trackingModes[0];
    }

    await streamDeck.settings.setGlobalSettings({
      ...globals,
      [globalKeys.trackingActive(cameraIP)]: newActive,
    });

    ev.action.setTitle(modeInfo.name);
    ev.action.setImage(newActive ? "imgs/actions/tracking/tracking-on" : "imgs/actions/tracking/tracking-off");

    if (isTelycam) {
      const api = new APITelycam({ IP: cameraIP, key: globals.keyTelycam });
      await api.SetTrackingActive(newActive);
    } else {
      const apiNEOiD = new APINeoid({ IP: cameraIP });
      await apiNEOiD.SendTrackingActive(cameraIP, newActive);
    }
  }

  override onWillDisappear(_ev: WillDisappearEvent): void {
    if (this.pressTimer) {
      clearTimeout(this.pressTimer);
      this.pressTimer = null;
    }
  }

  async fetchCameraTracking(cameraIP: string) {
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    const isTelycam = globals.isTelycam;

    if (isTelycam) {
      await streamDeck.settings.setGlobalSettings({
        ...globals,
        [globalKeys.trackingModeTelycam(cameraIP)]: "0",
        [globalKeys.trackingActive(cameraIP)]: false,
      });
    } else {
      const parseConfig = (conf: string) => {
        const confLines = conf.split(/\r?\n/);
        let trackActive = false;
        let trackMode = trackingModes[0].value;

        confLines.forEach((line) => {
          const temp = line.split(/"([^"]*)"/g);
          if (temp[0].startsWith("common.track=")) {
            trackActive = temp[1] === "1";
          }
          if (temp[0].startsWith("common.track_mode=")) {
            trackMode = temp[1];
          }
        });
        const modeInfo = trackingModes.find(m => m.value === trackMode) || trackingModes[0];
        return { trackMode: modeInfo.value, trackActive };
      };

      const resGet = await fetch(`http://${cameraIP}/cgi-bin/param.cgi?getfulltrack`);
      if (resGet.ok) {
        const conf = await resGet.text();
        const parsed = parseConfig(conf);

        await streamDeck.settings.setGlobalSettings({
          ...globals,
          [globalKeys.trackingMode(cameraIP)]: parsed.trackMode,
          [globalKeys.trackingActive(cameraIP)]: parsed.trackActive,
        });

        return parsed;
      }

      const resPost = await fetch(`http://${cameraIP}/cgi-bin/param.cgi?get_path`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "path=/data/track.conf",
      });

      if (resPost.ok) {
        const conf = await resPost.text();
        const parsed = parseConfig(conf);

        await streamDeck.settings.setGlobalSettings({
          ...globals,
          [globalKeys.trackingMode(cameraIP)]: parsed.trackMode,
          [globalKeys.trackingActive(cameraIP)]: parsed.trackActive,
        });

        return parsed;
      }

      return null;
    }
  }
}
