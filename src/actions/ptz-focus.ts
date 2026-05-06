import streamDeck, { action, DialDownEvent, DialRotateEvent, DidReceiveSettingsEvent, KeyDownEvent, KeyUpEvent, PropertyInspectorDidAppearEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { apiBaseCMD } from "../utils/ptz-api-base";
import { APITelycam } from "../api/api-telycam";
import { APINeoid, SpeedType } from "../api/api-neoid";

export type PtzFocus = {
  speed?: number;
  mode: "focusout" | "focusin" | "afocus";
  cameraIP: any;
  camera: string;
};


// Ações
@action({ UUID: "com.neoid.ptzneoid.ptz-focus" })
export class PTZFocus extends SingletonAction<PtzFocus> {

  override async onWillAppear(ev: WillAppearEvent) {

    const settings = ev.payload.settings

    const globals = await streamDeck.settings.getGlobalSettings();
    const cameraIP = globals.cameraIP
    
    if(!cameraIP){
      const titleName = globals.camera === undefined ? "No camera" : globals.camera
      await ev.action.setTitle(`${titleName}`)
      return
    }

    const direction = settings.mode as string;
    if (!["focusout", "focusin", "afocus" ].includes(direction)) {
      await ev.action.setTitle("Select");
      return;
    } 

    if(settings.mode === "focusin"){
      ev.action.setTitle(`Focus in`)
      ev.action.setImage(`imgs/actions/focus/${settings.mode}.png`)
      
    } else if(settings.mode === "focusout"){
      ev.action.setTitle(`Focus out`)
      ev.action.setImage(`imgs/actions/focus/${settings.mode}.png`)

    } else if(settings.mode === "afocus") {
      ev.action.setTitle(`auto`)
      ev.action.setImage(`imgs/actions/focus/auto.png`)
    }
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<PtzFocus>){
    const settings = ev.payload.settings

    const globals = await streamDeck.settings.getGlobalSettings();
    const cameraIP = globals.cameraIP

    if(!cameraIP){
      const titleName = globals.camera === undefined ? "No camera" : globals.camera
      await ev.action.setTitle(`${titleName}`)
      return;
    }

    const direction = settings.mode as string;
    if (!["focusout", "focusin", "afocus" ].includes(direction)) {
      await ev.action.setTitle("Select");
      return;
    }

    if(settings.mode === "focusin"){
      ev.action.setTitle(`Focus in`)
      ev.action.setImage(`imgs/actions/focus/${settings.mode}.png`)
      
    } else if(settings.mode === "focusout"){
      ev.action.setTitle(`Focus out`)
      ev.action.setImage(`imgs/actions/focus/${settings.mode}.png`)

    } else if(settings.mode === "afocus") {
      ev.action.setTitle(`auto`)
      ev.action.setImage(`imgs/actions/focus/auto.png`)
    }
    
  }

  override async onKeyDown(ev: KeyDownEvent<PtzFocus>): Promise<void> {
    const settings = ev.payload.settings

    const globals = await streamDeck.settings.getGlobalSettings();
    const cameraIP = globals.cameraIP as string

    if(!cameraIP){
      const titleName = globals.camera === undefined ? "No camera" : globals.camera
      await ev.action.setTitle(`${titleName}`)
      return;
    }

    const direction = settings.mode as "focusout" | "focusin" | "afocus" ;

    if (!["focusout", "focusin", "afocus" ].includes(direction)) {
      await ev.action.setTitle("Select");
      return;
    }
    
    if(direction === "focusin"){
      ev.action.setTitle(`Focus in`)
      ev.action.setImage(`imgs/actions/focus/${settings.mode}.png`)
      
    } else if(direction === "focusout"){
      ev.action.setTitle(`Focus out`)
      ev.action.setImage(`imgs/actions/focus/${settings.mode}.png`)

    } else if(direction === "afocus") {
      ev.action.setTitle(`auto`)
      ev.action.setImage(`imgs/actions/focus/auto.png`)
    }

    const speed = globals.focusMode as SpeedType ?? "normal"; 

    if (globals.isTelycam) {
      const keyTelycam = globals.keyTelycam as number
      const api = new APITelycam({IP: cameraIP, key: keyTelycam});
      api.MoveFocusTelycam(direction, speed)
    } else {
      const api = new APINeoid({IP: cameraIP});
      api.MoveZoomAndFocus(direction, speed)
    }

  }

  override async onKeyUp(ev: KeyUpEvent<PtzFocus>): Promise<void> {
    const globals = await streamDeck.settings.getGlobalSettings();
    const cameraIP = globals.cameraIP as string

    if(globals.isTelycam){
      const keyTelycam = globals.keyTelycam as number
      const api = new APITelycam({IP: cameraIP, key: keyTelycam});
      api.StopFocusTelycam()
    } else {
      const api = new APINeoid({IP: cameraIP});
      api.StopZoomAndFocus("focus")
    }

  }
}
