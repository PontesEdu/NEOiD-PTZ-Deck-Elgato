import streamDeck, { action, DidReceiveSettingsEvent, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { sendViscaUDP } from "../utils/send-visca-udp";
import type { GlobalSettings } from "../types";
import { noCameraGuard } from "../utils/no-camera-guard";

  type PtzOsdProps = {
    mode: "OSD" | "back" | "enter";
  };

  // Ações
@action({ UUID: "com.neoid.ptzneoid.osd" })
export class Osd extends SingletonAction<PtzOsdProps> {
  private isOsd: boolean = false;

  override async onWillAppear(ev: WillAppearEvent<PtzOsdProps>) {
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    const mode = ev.payload.settings.mode;

    if (await noCameraGuard(ev.action, globals)) return;

    if(mode === "back"){
      await ev.action.setTitle("Back OSD");
      await ev.action.setImage(`imgs/actions/back`);

    } else if(mode === "enter") {
      await ev.action.setImage(`imgs/actions/enter-osd.png`);
      await ev.action.setTitle("");

    } else {
      await ev.action.setTitle("");
      await ev.action.setImage(`imgs/actions/osd`);
    }
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<PtzOsdProps>){
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    const mode = ev.payload.settings.mode;

    if (await noCameraGuard(ev.action, globals)) return;

    // Converte para booleano corretamente
    if(mode === "back"){
      await ev.action.setTitle("Back OSD");
      await ev.action.setImage(`imgs/actions/back`);
    }  else if(mode === "enter") {

      await ev.action.setImage(`imgs/actions/enter-osd.png`);
      await ev.action.setTitle("");
    } else {

      // cast intencional: SDK pode serializar boolean como string em alguns contextos
      const rawOsd = globals.isOsd as boolean | string;
      this.isOsd = rawOsd === true || rawOsd === "true";
      await ev.action.setTitle("");
      await ev.action.setImage(`imgs/actions/osd`);
    }
  }

  override async onKeyDown(ev: KeyDownEvent<PtzOsdProps>): Promise<void> {
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    const mode = ev.payload.settings.mode;

    if (await noCameraGuard(ev.action, globals)) return;
    const cameraIP = globals.cameraIP as string;

    if(globals.isTelycam){
      if(mode === "back"){
        sendViscaUDP(cameraIP, "81 01 06 06 10 FF")

        await ev.action.setTitle("Back OSD");
        await ev.action.setImage(`imgs/actions/back`);

      } else if(mode === "enter") {
        sendViscaUDP(cameraIP, "81 01 7E 01 02 00 01 FF")

        await ev.action.setImage(`imgs/actions/enter-osd.png`);
        await ev.action.setTitle("");

      } else {
        await ev.action.setImage(`imgs/actions/osd`);
        this.isOsd = !this.isOsd;

        if (this.isOsd) {
          sendViscaUDP(cameraIP, "81 01 06 06 02 FF")
  
        } else {
          sendViscaUDP(cameraIP, "81 01 06 06 03 FF")
        }
      }

    } else {
      if(mode === "back"){
        await fetch(`http://${cameraIP}/cgi-bin/param.cgi?navigate_mode&OSD_BACK`)

        await ev.action.setTitle("Back OSD");
        await ev.action.setImage(`imgs/actions/back`);

      } else if(mode === "enter") {

        await fetch(`http://${cameraIP}/cgi-bin/param.cgi?navigate_mode&CONFIRM`)

        await ev.action.setImage(`imgs/actions/enter-osd.png`);
        await ev.action.setTitle("");

      } else {

        await ev.action.setImage(`imgs/actions/osd`);

        this.isOsd = !this.isOsd;
        if (this.isOsd) {
          await fetch(`http://${cameraIP}/cgi-bin/param.cgi?navigate_mode&OSD`)

        } else {
          await fetch(`http://${cameraIP}/cgi-bin/param.cgi?navigate_mode&PTZ`)
        }
      }
    }  

    await streamDeck.settings.setGlobalSettings({
      ...globals,
      isOsd: this.isOsd,
    });

    this.actions.forEach(async (action) => {
      action.getSettings()
    }) 
  }

}
