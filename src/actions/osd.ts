import streamDeck, { action, DidReceiveSettingsEvent, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { sendViscaUDP } from "../utils/send-visca-udp";

  type PtzOsdProps = {
    mode: "OSD" | "back" | "enter";
  };

  // Ações
@action({ UUID: "com.neoid.ptzneoid.osd" })
export class Osd extends SingletonAction<PtzOsdProps> {
  private isOsd: boolean = false;

  override async onWillAppear(ev: WillAppearEvent<PtzOsdProps>) {
    const globals = await streamDeck.settings.getGlobalSettings();
    const cameraIP = globals.cameraIP;
    const mode = ev.payload.settings.mode;

    if (!cameraIP) {
      const titleName = globals.camera === undefined ? "No camera" : globals.camera
      await ev.action.setTitle(`${titleName}`)
      return;
    }
    

    if(mode === "back"){
      await ev.action.setTitle("Back OSB");
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
    const globals = await streamDeck.settings.getGlobalSettings();
    const cameraIP = globals.cameraIP;
    const mode = ev.payload.settings.mode;

    if(!cameraIP){
      const titleName = globals.camera === undefined ? "No camera" : globals.camera
      await ev.action.setTitle(`${titleName}`)
      return;
    }

    // Converte para booleano corretamente
    if(mode === "back"){
      await ev.action.setTitle("Back OSB");
      await ev.action.setImage(`imgs/actions/back`);
    }  else if(mode === "enter") {

      await ev.action.setImage(`imgs/actions/enter-osd.png`);
      await ev.action.setTitle("");
    } else {

      this.isOsd = globals.isOsd === true || globals.isOsd === "true";
      await ev.action.setTitle("");
      await ev.action.setImage(`imgs/actions/osd`);
    }
  }

  override async onKeyDown(ev: KeyDownEvent<PtzOsdProps>): Promise<void> {
    const globals = await streamDeck.settings.getGlobalSettings();
    const cameraIP = globals.cameraIP as string;

    const mode = ev.payload.settings.mode;

    if(!cameraIP){
      const titleName = globals.camera === undefined ? "No camera" : globals.camera
      await ev.action.setTitle(`${titleName}`)
      return;
    }

    if(globals.isTelycam){
      if(mode === "back"){
        sendViscaUDP(cameraIP, "81 01 06 06 10 FF")

        await ev.action.setTitle("Back OSB");
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

        await ev.action.setTitle("Back OSB");
        await ev.action.setImage(`imgs/actions/back`);

      } else if(mode === "enter") {

        await fetch(`http://${cameraIP}/cgi-bin/param.cgi?navigate_mode&CONFIRM`)

        await ev.action.setImage(`imgs/actions/enter-osd.png`);
        await ev.action.setTitle("");

      } else {

        await ev.action.setImage(`imgs/actions/osd`);

        this.isOsd = globals.isOsd as boolean;

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
