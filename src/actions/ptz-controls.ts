import streamDeck, { action, DialDownEvent, DialRotateEvent, DidReceiveSettingsEvent, KeyDownEvent, KeyUpEvent, PropertyInspectorDidAppearEvent, PropertyInspectorDidDisappearEvent, SingletonAction, TitleParametersDidChangeEvent, WillAppearEvent } from "@elgato/streamdeck";
import { checkCameraConnection } from "../utils/checkCameraConnection";
import { PTZ_DIRECTIONS, PTZDirection, SpeedType } from "../api/api-neoid";
import { APINeoid } from "../api/api-neoid";
import { APITelycam } from "../api/api-telycam";

export type PtzSettings = {
  speed?: number;
  tilt?: number;
  direction: string;
  cameraIP: any;
  camera: any;
  cameraIPControls: string
  isTelycam: boolean
  isDefault: boolean
};


// Ações
@action({ UUID: "com.neoid.ptzneoid.ptz-controls" })
export class PTZControls extends SingletonAction<PtzSettings> {

  override async onDialRotate(ev: DialRotateEvent): Promise<void> {
    const globals = await streamDeck.settings.getGlobalSettings();
    const cameraIP = globals.cameraIP as string;
    if (!cameraIP) {
      await ev.action.setTitle("No camera IP");
      return;
    }

    // ticks > 0 = girou pra frente | ticks < 0 = girou pra trás
    const direction =  "focusin";
    await ev.action.setTitle(`Focus ${direction}`);

    const speed = globals.focusMode as SpeedType ?? "normal";

    if (globals.isTelycam) {
      const api = new APITelycam({ IP: cameraIP, key: globals.keyTelycam as number });
      api.MoveFocusTelycam(direction, speed);
    } else {
      const api = new APINeoid({ IP: cameraIP });
      api.MoveZoomAndFocus(direction, speed);
    }
  }

  override async onWillAppear(ev: WillAppearEvent<PtzSettings>) {
    const settings = ev.payload.settings
    const globals = await streamDeck.settings.getGlobalSettings();

    const direction = settings.direction as PTZDirection;

    // Verificando a direção
    if (!PTZ_DIRECTIONS.includes(direction)) {
      await ev.action.setTitle('Select')
      return
    }

    ev.action.setImage(`imgs/actions/controls/${settings.direction}.png`)

    let cameraIP = ""
    
    const isDefault = settings.isDefault === undefined ? false : settings.isDefault

    if(isDefault) {
      const cameraIPControls = settings.cameraIPControls === undefined ? "" : settings.cameraIPControls ?? ""

      const checkCamera = await checkCameraConnection(`${cameraIPControls}`, 1000)

      if(checkCamera){
        cameraIP = cameraIPControls as string
        
        await ev.action.setTitle("default")
      } else{
        ev.action.setTitle("default\nNot Connect")
        return
      }

    } else {
      const titleName = globals.camera === undefined ? "" : globals.camera as string
      await ev.action.setTitle(`${titleName ?? ""}`)
    }
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent){
    // SETTINGS
    const settings = ev.payload.settings
    const globals = await streamDeck.settings.getGlobalSettings();

    ev.action.setImage(`imgs/actions/controls/${settings.direction}.png`)
    
    const direction = settings.direction as PTZDirection;

    if (!PTZ_DIRECTIONS.includes(direction)) {
      await ev.action.setTitle('Select')
      return
    }

    const isDefault = settings.isDefault === undefined ? false : settings.isDefault

    const cameraIPControls = settings.cameraIPControls === undefined ? false : settings.cameraIPControls
    if(!cameraIPControls || cameraIPControls === ""){
      ev.action.setSettings({...settings, cameraIPControls: globals.cameraIPControls ?? "192.168.100.88"});
    }

    if(isDefault) {
      await ev.action.setTitle("default")
    } else {
      const titleName = globals.camera === undefined ? "" : globals.camera as string
      await ev.action.setTitle(`${titleName ?? ""}`)
    }

  }


  override async onPropertyInspectorDidAppear(ev: PropertyInspectorDidAppearEvent) {
    // Esse método é chamado quando o user abre o inspector de propriedades/config (abre o botão)
    const globals = await streamDeck.settings.getGlobalSettings();
    const settings = await ev.action.getSettings()

    const cameraIPControls = settings.cameraIPControls === undefined ? "" : settings.cameraIPControls
    if(!cameraIPControls){
      ev.action.setSettings({...settings, cameraIPControls: globals.cameraIPControls ?? "192.168.100.88"});
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
    const globals = await streamDeck.settings.getGlobalSettings();

    const direction = settings.direction as PTZDirection;

    if (!PTZ_DIRECTIONS.includes(direction)) {
      await ev.action.setTitle('Select')
      return
    }

    const speed = globals.panMode as SpeedType ?? "normal";

    let cameraIP = ""
    
    const isDefault = settings.isDefault === undefined ? false : settings.isDefault
    if(isDefault) {
      const cameraIPControls = settings.cameraIPControls === undefined ? false : settings.cameraIPControls

      const checkCamera = await checkCameraConnection(`${cameraIPControls}`, 1000)

      if(checkCamera) {
        cameraIP = cameraIPControls as string
        
        const api = new APINeoid({IP: cameraIP});
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
      cameraIP = globals.cameraIP as string

      const titleName = globals.camera === undefined ? "" : globals.camera as string
      await ev.action.setTitle(titleName ?? "")
      
      const isTelycam = globals.isTelycam as boolean
      
      if(isTelycam) {
        const keyTelycam = globals.keyTelycam as number
        const api = new APITelycam({IP: cameraIP, key: keyTelycam});
        await api.MoveTelycam(direction, speed)
      } else {
        const api = new APINeoid({IP: cameraIP});
        await api.Move(direction, speed)
      }
    }
  }
  

  override async onKeyUp(ev: KeyUpEvent): Promise<void> {
    // configuraçoes globais que estao vindo de outro
    const globals = await streamDeck.settings.getGlobalSettings();
    const settings = ev.payload.settings

    let cameraIP = "";
    const isDefault = settings.isDefault === undefined ? false : settings.isDefault as boolean

    if(isDefault) {
      const cameraIPControls = settings.cameraIPControls === undefined ? false : settings.cameraIPControls

      cameraIP = cameraIPControls as string
      const api = new APINeoid({IP: cameraIP});
      api.StopMove()
    } else {
      cameraIP = globals.cameraIP as string

      if(globals.isTelycam){
        const keyTelycam = globals.keyTelycam as number
        const api = new APITelycam({IP: cameraIP, key: keyTelycam});
        api.StopTelycamControls()
      } else {
        const api = new APINeoid({IP: cameraIP});
        api.StopMove()
      }
    }
  }
}
