import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent, type DidReceiveSettingsEvent } from "@elgato/streamdeck";
import type { GlobalSettings, SpeedType } from "../types";

export type PTZSpeedProps = {
  speed: "pan" | "zoom" | "focus";
};

type SpeedChannel = PTZSpeedProps["speed"];

const speedChannels = ["pan", "zoom", "focus"] as const satisfies readonly SpeedChannel[];
const speedModes = ["slowest", "slow", "normal", "fast", "fastest"] as const satisfies readonly SpeedType[];

function isSpeedChannel(s: string): s is SpeedChannel {
  return (speedChannels as readonly string[]).includes(s);
}

@action({ UUID: "com.neoid.ptzneoid.ptz-speed" })
export class PTZSpeed extends SingletonAction<PTZSpeedProps> {

  private async updateVisual(
    ev: WillAppearEvent<PTZSpeedProps> | DidReceiveSettingsEvent<PTZSpeedProps> | KeyDownEvent<PTZSpeedProps>
  ): Promise<void> {
    const { speed } = ev.payload.settings;

    if (!isSpeedChannel(speed)) {
      await ev.action.setTitle("Select");
      return;
    }

    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    const modeKey = `${speed}Mode` as "panMode" | "zoomMode" | "focusMode";
    const currentMode = globals[modeKey] ?? "normal";
    await ev.action.setTitle(`${speed === "pan" ? "P/T" : speed}:\n${currentMode}`);
  }

  override async onWillAppear(ev: WillAppearEvent<PTZSpeedProps>) {
    await this.updateVisual(ev);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<PTZSpeedProps>) {
    await this.updateVisual(ev);
  }

  override async onKeyDown(ev: KeyDownEvent<PTZSpeedProps>): Promise<void> {
    const { speed } = ev.payload.settings;

    if (!isSpeedChannel(speed)) {
      await ev.action.setTitle("Select");
      return;
    }

    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    const modeKey = `${speed}Mode` as "panMode" | "zoomMode" | "focusMode";
    const currentMode = globals[modeKey] ?? "normal";
    const nextIndex = (speedModes.indexOf(currentMode) + 1) % speedModes.length;
    const nextMode = speedModes[nextIndex];

    await streamDeck.settings.setGlobalSettings({ ...globals, [`${speed}Mode`]: nextMode });
    await this.updateVisual(ev);
  }
}

