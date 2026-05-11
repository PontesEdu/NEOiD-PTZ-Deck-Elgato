import streamDeck, { action, DidReceiveSettingsEvent, KeyDownEvent, KeyUpEvent, PropertyInspectorDidAppearEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import type { GlobalSettings } from "../types";
import { checkCameraConnection } from "../utils/checkCameraConnection";
import { PTZ_DIRECTIONS, PTZDirection } from "../api/api-neoid";
import { APINeoid } from "../api/api-neoid";
import { APITelycam } from "../api/api-telycam";

export type PtzSettings = {
  speed?: number;
  tilt?: number;
  direction: string;
  cameraIP: string;
  camera: string;
  cameraIPControls: string
  isTelycam: boolean
  isDefault: boolean
};


// Ações
@action({ UUID: "com.neoid.ptzneoid.ptz-controls" })
export class PTZControls extends SingletonAction<PtzSettings> {


  override async onWillAppear(ev: WillAppearEvent<PtzSettings>) {
    const settings = ev.payload.settings
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

    const direction = settings.direction as PTZDirection;

    // Verificando a direção
    if (!PTZ_DIRECTIONS.includes(direction)) {
      await ev.action.setTitle('Select')
      return
    }

    ev.action.setImage(`imgs/actions/controls/${settings.direction}.png`)

    const isDefault = settings.isDefault === undefined ? false : settings.isDefault

    if(isDefault) {
      const cameraIPControls = settings.cameraIPControls === undefined ? "" : settings.cameraIPControls ?? ""

      const checkCamera = await checkCameraConnection(`${cameraIPControls}`, 1000)

      if(checkCamera){
        await ev.action.setTitle("default")
      } else{
        ev.action.setTitle("default\nNot Connect")
        return
      }

    } else {
      const titleName = globals.camera === undefined ? "" : globals.camera
      await ev.action.setTitle(`${titleName ?? ""}`)
    }
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent){
    // SETTINGS
    const settings = ev.payload.settings
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

    ev.action.setImage(`imgs/actions/controls/${settings.direction}.png`)

    const direction = settings.direction as PTZDirection;

    if (!PTZ_DIRECTIONS.includes(direction)) {
      await ev.action.setTitle('Select')
      return
    }

    const isDefault = settings.isDefault === undefined ? false : settings.isDefault

    const cameraIPControls = settings.cameraIPControls === undefined ? false : settings.cameraIPControls
    if(!cameraIPControls || cameraIPControls === ""){
      ev.action.setSettings({...settings, cameraIPControls: (globals.cameraIPControls as string) ?? "192.168.100.88"});
    }

    if(isDefault) {
      await ev.action.setTitle("default")
    } else {
      const titleName = globals.camera === undefined ? "" : globals.camera
      await ev.action.setTitle(`${titleName ?? ""}`)
    }

  }


  override async onPropertyInspectorDidAppear(ev: PropertyInspectorDidAppearEvent) {
    // Esse método é chamado quando o user abre o inspector de propriedades/config (abre o botão)
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    const settings = await ev.action.getSettings()

    const cameraIPControls = settings.cameraIPControls === undefined ? "" : settings.cameraIPControls
    if(!cameraIPControls){
      ev.action.setSettings({...settings, cameraIPControls: (globals.cameraIPControls as string) ?? "192.168.100.88"});
    }
    
  }



  //Retirei essa função por que não quero que toda hora que o user fecha a ação pelo software ele salve o ip como global
  // override async onPropertyInspectorDidDisappear(ev: PropertyInspectorDidDisappearEvent) {
  //   // Esse método é chamado quando o user abre o inspector de propriedades/config (abre o botão)
  //   const globals = await streamDeck.settings.getGlobalSettings();
  //   const settings = await ev.action.getSettings();

  //   const cameraIPControls = settings.cameraIPControls === undefined ? false : settings.cameraIPControls

  //   await streamDeck.settings.setGlobalSettings({
  //     ...globals,
  //     cameraIPControls: cameraIPControls,
  //   })
  // }



  override async onKeyDown(ev: KeyDownEvent<PtzSettings>): Promise<void> {
    const settings = ev.payload.settings
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

    const direction = settings.direction as PTZDirection;

    if (!PTZ_DIRECTIONS.includes(direction)) {
      await ev.action.setTitle('Select')
      return
    }

    const speed = globals.panMode ?? "normal";

    const isDefault = settings.isDefault === undefined ? false : settings.isDefault
    if(isDefault) {
      const cameraIPControls = settings.cameraIPControls === undefined ? false : settings.cameraIPControls

      const checkCamera = await checkCameraConnection(`${cameraIPControls}`, 1000)

      if(checkCamera) {
        const api = new APINeoid({IP: cameraIPControls as string});
        await api.Move(direction, speed)

        // para quando adicionar um camera select novo ele ja mostar com o cameraIP Default
        await streamDeck.settings.setGlobalSettings({
          ...globals,
          cameraIPControls: cameraIPControls,
        });

        await ev.action.setTitle("default")

        // Eu não Não salvei por que ele deixa os moviemntos de todos os defaults iguais
          //  this.actions.forEach(async (action) => {
          //     const settingsAction = await action.getSettings()
          //     action.setSettings({...settingsAction, cameraIPControls: globals.cameraIPControls});
          //  })
        return; // Final
      } else {
        ev.action.setTitle("default\nNot Connect")

        return
      }

    } else {
      const cameraIP = globals.cameraIP
      if (!cameraIP) return;

      const titleName = globals.camera === undefined ? "" : globals.camera
      await ev.action.setTitle(titleName ?? "")

      if(globals.isTelycam) {
        const api = new APITelycam({IP: cameraIP, key: globals.keyTelycam});
        await api.MoveTelycam(direction, speed)
      } else {
        const api = new APINeoid({IP: cameraIP});
        await api.Move(direction, speed)
      }
    }
  }


  override async onKeyUp(ev: KeyUpEvent): Promise<void> {
    // configuraçoes globais que estao vindo de outro
    const globals = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    const settings = ev.payload.settings

    const isDefault = settings.isDefault === undefined ? false : settings.isDefault

    if(isDefault) {
      const cameraIPControls = settings.cameraIPControls === undefined ? false : settings.cameraIPControls
      const api = new APINeoid({IP: cameraIPControls as string});
      api.StopMove()
    } else {
      const cameraIP = globals.cameraIP
      if (!cameraIP) return;

      if(globals.isTelycam){
        const api = new APITelycam({IP: cameraIP, key: globals.keyTelycam});
        api.StopTelycamControls()
      } else {
        const api = new APINeoid({IP: cameraIP});
        api.StopMove()
      }
    }
  }
}
