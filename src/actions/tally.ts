import streamDeck, { action, DidReceiveSettingsEvent, KeyDownEvent, KeyUpEvent, SingletonAction, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";
import type { GlobalSettings } from "../types";
import { noCameraGuard } from "../utils/no-camera-guard";
import { resolveCamera } from "../utils/camera-api";
import { globalKeys } from "../utils/global-keys";
import { APINeoid } from "../api/api-neoid";
import { APITelycam } from "../api/api-telycam";

type TallySettings = {
  isDefault?: boolean;
  cameraIPControls?: string;
  cameraType?: "neoid" | "telycam";
};

// tally=Off → "off" | tally=Preview → "green" | tally=Program → "red"
function parseTallyResponse(text: string): "off" | "red" | "green" | null {
  const match = text.match(/tally=["']?([A-Za-z]+)/i);
  if (!match) return null;
  const val = match[1].toLowerCase();
  if (val === "program") return "red";
  if (val === "preview") return "green";
  if (val === "off") return "off";
  return null;
}

@action({ UUID: "com.neoid.ptzneoid.tally" })
export class Tally extends SingletonAction<TallySettings> {
  private pressTimer: ReturnType<typeof setTimeout> | null = null;
  private longPress = false;

  private async getGlobals() {
    return await streamDeck.settings.getGlobalSettings<GlobalSettings>();
  }

  private async refreshState(ev: WillAppearEvent<TallySettings> | DidReceiveSettingsEvent<TallySettings>) {
    const settings = ev.payload.settings;
    const isDefault = settings.isDefault ?? false;

    if (isDefault) {
      await ev.action.setTitle("");
    } else {
      const globals = await this.getGlobals();
      if (await noCameraGuard(ev.action, globals)) return;
      await ev.action.setTitle(globals.camera ?? "");
    }
  }

  private async fetchTallyStatus(ip: string): Promise<void> {
    try {
      const res = await fetch(`http://${ip}/cgi-bin/param.cgi?get_tally_status`);
      if (!res.ok) return;
      const text = await res.text();
      const fetched = parseTallyResponse(text);
      if (fetched === null) return;

      const globals = await this.getGlobals();
      const current = (globals[globalKeys.tallyState(ip)] as string) || "off";
      if (current === fetched) return;

      await streamDeck.settings.setGlobalSettings({
        ...globals,
        [globalKeys.tallyState(ip)]: fetched,
      });

      // Cada botão relê seu próprio IP de settings — correto para múltiplos botões Default
      this.actions.forEach(a => a.getSettings());
    } catch {
      // câmera inacessível — mantém estado salvo
    }
  }

  override async onWillAppear(ev: WillAppearEvent<TallySettings>) {
    await this.refreshState(ev);

    const settings = ev.payload.settings;
    const isDefault = settings.isDefault ?? false;

    if (isDefault) {
      const ip = settings.cameraIPControls ?? "";
      if (!ip || settings.cameraType === "telycam") return; // Telycam não tem endpoint de leitura
      await this.fetchTallyStatus(ip);
    } else {
      const globals = await this.getGlobals();
      if (!globals.cameraIP || globals.isTelycam) return;
      await this.fetchTallyStatus(globals.cameraIP as string);
    }
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<TallySettings>) {
    await this.refreshState(ev);
  }

  override async onKeyDown(ev: KeyDownEvent<TallySettings>) {
    this.longPress = false;
    if (this.pressTimer) clearTimeout(this.pressTimer);

    this.pressTimer = setTimeout(async () => {
      this.longPress = true;
      this.pressTimer = null;
      await this.applyTally(ev, "green");
    }, 900);
  }

  override async onKeyUp(ev: KeyUpEvent<TallySettings>) {
    if (this.pressTimer) {
      clearTimeout(this.pressTimer);
      this.pressTimer = null;
    }
    if (!this.longPress) {
      await this.applyTally(ev, "red");
    }
  }

  override onWillDisappear(_ev: WillDisappearEvent): void {
    if (this.pressTimer) {
      clearTimeout(this.pressTimer);
      this.pressTimer = null;
    }
  }

  private async applyTally(ev: KeyDownEvent<TallySettings> | KeyUpEvent<TallySettings>, requested: "red" | "green") {
    const settings = ev.payload.settings;
    const globals = await this.getGlobals();
    const isDefault = settings.isDefault ?? false;

    let ip: string;
    let sendFn: (state: "red" | "green" | "off") => Promise<void>;

    if (isDefault) {
      ip = settings.cameraIPControls ?? "";
      if (!ip) return;
      if (settings.cameraType === "telycam") {
        // key não é usado em sendTally — Telycam tally é VISCA UDP puro
        const api = new APITelycam({ IP: ip, key: 0 });
        sendFn = (state) => api.sendTally(state);
      } else {
        const api = new APINeoid({ IP: ip });
        sendFn = (state) => api.sendTally(state);
      }
    } else {
      if (await noCameraGuard(ev.action, globals)) return;
      const ctx = resolveCamera(globals);
      if (!ctx) return;
      ip = ctx.cameraIP;
      sendFn = (state) => ctx.api.sendTally(state);
    }

    const current = (globals[globalKeys.tallyState(ip)] as string) || "off";
    const next: "red" | "green" | "off" = current === requested ? "off" : requested;

    await sendFn(next);

    await streamDeck.settings.setGlobalSettings({
      ...globals,
      [globalKeys.tallyState(ip)]: next,
    });

    this.actions.forEach(a => a.getSettings());
  }
}
