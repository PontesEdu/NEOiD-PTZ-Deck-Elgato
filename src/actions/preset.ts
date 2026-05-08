import streamDeck, { action, DidReceiveSettingsEvent, KeyDownEvent, KeyUpEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import type { GlobalSettings } from "../types";
import { imageSnapShot } from "../utils/snapshot";
import { APITelycam } from "../api/api-telycam";
import { APINeoid } from "../api/api-neoid";

type PtzPresetProps = {
  numberPreset: number | "undefined";
  image: boolean
};

@action({ UUID: "com.neoid.ptzneoid.ptz-preset" })
export class PTZPreset extends SingletonAction<PtzPresetProps> {
  private pressTimer?: ReturnType<typeof setTimeout>;
  private longPress = false;

  override async onWillAppear(ev: WillAppearEvent<PtzPresetProps>) {
    const settings = ev.payload.settings;
    const presetNumber = settings.numberPreset === undefined ? 1 : Number(settings.numberPreset);
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

    const cameraIP = globals.cameraIP;

    if(!cameraIP){
      await ev.action.setTitle(`${globals.camera}`)
      return
    }

    if (!isNaN(presetNumber)) {
      if(globals.isTelycam){
        await ev.action.setImage("");
        await ev.action.setTitle(`${presetNumber}`);
      } else {
        if(settings.image){
          const image = globals[`presetImage${presetNumber}${cameraIP}`]
          await ev.action.setImage(`${image}`);
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

  override async onKeyDown(ev: KeyDownEvent<PtzPresetProps>) {
    const settings = ev.payload.settings;
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    const cameraIP = globals.cameraIP;
    const presetNumber = settings.numberPreset === undefined ? 1 : Number(settings.numberPreset);

    if (!cameraIP || isNaN(presetNumber)) {
      await ev.action.setTitle(`${globals.camera}`)
      return
    }

    // Começa a contar o tempo do pressionamento
    this.longPress = false;
    this.pressTimer = setTimeout(() => {
      this.longPress = true;
      this.savePreset(ev, cameraIP, presetNumber); // salva após 1s
    }, 1100);
  }

  override async onKeyUp(ev: KeyUpEvent<PtzPresetProps>) {
    clearTimeout(this.pressTimer);

    const settings = ev.payload.settings;
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    const cameraIP = globals.cameraIP;
    const presetNumber = settings.numberPreset === undefined ? 1 : Number(settings.numberPreset);

    if (!cameraIP || isNaN(presetNumber)) return;

    // Se não foi um clique longo, chama o preset
    if (!this.longPress) {

      if(globals.isTelycam){
        const api = new APITelycam({IP: cameraIP, key: globals.keyTelycam});
        api.CallPreset(presetNumber)
      } else {
        const api = new APINeoid({IP: cameraIP});
        api.CallPreset(presetNumber)
        
        if(settings.image){
          const image = globals[`presetImage${presetNumber}${cameraIP}`]
          await ev.action.setImage(`${image}`);
        } else {
          await ev.action.setImage("");
        }
      }


      await ev.action.setTitle(`${presetNumber}`);
    }
  }

  private async savePreset(ev: KeyDownEvent<PtzPresetProps>, cameraIP: string, presetNumber: number) {
    // salva preset na câmera
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

    if(globals.isTelycam){
      const api = new APITelycam({IP: cameraIP, key: globals.keyTelycam});
      api.AddSetPreset(presetNumber)
    } else {
      const api = new APINeoid({IP: cameraIP});
      api.AddSetPreset(presetNumber)
    }

    await ev.action.setTitle(`set`);
    await ev.action.setImage(`imgs/actions/set/saved.png`);
    const settings = ev.payload.settings;

    await new Promise(resolve => setTimeout(resolve, 800));

    if(globals.isTelycam){
      await ev.action.setImage("");
      await ev.action.setTitle(`${presetNumber}`);
    } else {
      const snapshot = await imageSnapShot(cameraIP);
      await ev.action.setTitle(`${presetNumber}`);

      if(settings.image){

        await streamDeck.settings.setGlobalSettings({
          ...globals,
          [`presetImage${presetNumber}${cameraIP}`]: snapshot
        });

        await ev.action.setImage(snapshot);
      } else {
        await ev.action.setImage("");
      }
    }
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent) {
    const settings = ev.payload.settings;
    const presetNumber = settings.numberPreset === undefined ? 1 : Number(settings.numberPreset);
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

    const cameraIP = globals.cameraIP;

    if(!cameraIP){
      await ev.action.setTitle(`${globals.camera}`)
      return
    }

    if (!isNaN(presetNumber)) {
      if(settings.image){
        const image = globals[`presetImage${presetNumber}${cameraIP}`]
        await ev.action.setImage(`${image}`);
      } else {
        await ev.action.setImage("");
      }

      await ev.action.setTitle(`${presetNumber}`);
    } else {
      await ev.action.setImage("imgs/actions/preset/preset.png");
      await ev.action.setTitle("Select");
    }
  }
}


