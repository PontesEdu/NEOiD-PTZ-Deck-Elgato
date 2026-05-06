import streamDeck, { action, KeyDownEvent, PropertyInspectorDidAppearEvent, PropertyInspectorDidDisappearEvent, SendToPluginEvent, SingletonAction, Target, TitleParametersDidChangeEvent, WillAppearEvent, type DidReceiveSettingsEvent } from "@elgato/streamdeck";
import { PTZControls } from "./ptz-controls";
import { PTZTracking } from './ptz-tracking';
import { PTZPreset } from "./preset";
import { PTZFocus } from "./ptz-focus";
import { PTZZoom } from "./ptz-zoom";
import { Backlight } from "./backlight";
import { Osd } from "./osd";
import { checkCameraConnection } from "../utils/checkCameraConnection";
import { LoginTelycam } from "../utils/login-telycam";
import { FocusDial } from "./dials/focus-dials";
import { ZoomDial } from './dials/zoom-dials';




@action({ UUID: "com.neoid.ptzneoid.ptz-register" })
export class PTZRegister extends SingletonAction<any> {
  private timeCheck: number = 500
  ptzControls: PTZControls
  ptzTracking: PTZTracking
  ptzPreset: PTZPreset
  ptzFocus: PTZFocus
  ptzZoom: PTZZoom
  ptzBacklight: Backlight
  ptzOSD: Osd
  focusDial: FocusDial
  zoomDial: ZoomDial


  constructor(ptzControls: PTZControls, ptzTracking: PTZTracking, preset: PTZPreset, ptzFocus: PTZFocus, ptzZoom: PTZZoom, backlight: Backlight, osd: Osd, focusDial: FocusDial, zoomDial: ZoomDial) {
		super();
		this.ptzControls = ptzControls;
		this.ptzTracking = ptzTracking;
    this.ptzPreset = preset;
    this.ptzFocus = ptzFocus;
    this.ptzZoom = ptzZoom;
    this.ptzBacklight = backlight;
    this.ptzOSD = osd;
    this.focusDial = focusDial;
    this.zoomDial = zoomDial;
	}

  override async onPropertyInspectorDidDisappear(ev: PropertyInspectorDidDisappearEvent) {
    const settings = await ev.action.getSettings();
    const globals = await streamDeck.settings.getGlobalSettings();

    //verificação se e undefined
    let cameraIP = settings.cameraIP === undefined ? false : settings.cameraIP
  
    if(!cameraIP){
      await ev.action.setSettings({...settings, cameraIP: globals.cameraIP});
      cameraIP = globals.cameraIP as string
    } 
      
    const isTelycam = settings.isTelycam === undefined ? false : settings.isTelycam
    let titleName;

    if(isTelycam){
      let telycamUser = settings.telycamUser === undefined ? false : settings.telycamUser as string
      let telycamPassword = settings.telycamPassword === undefined ? false : settings.telycamPassword as string

      if(!telycamUser || !telycamPassword){
        titleName = `Not\nConnect\nTelycam`
        await ev.action.setTitle(`${titleName}`)
        return;
      }
      
      const key = await LoginTelycam({ip: String(cameraIP), user: telycamUser, password: telycamPassword})

      if(!key){
        await ev.action.setTitle(`Not\nConnect\nTelycam`)
        return;
      }
      
      titleName = settings.camera === undefined ? "" : settings.camera as string
      await ev.action.setTitle(`${titleName}`)

    } else {
      const checkCamera = await checkCameraConnection(`${cameraIP}`, this.timeCheck)

      if(!checkCamera) {
        ev.action.setTitle('Not\nConnect')
        
      } else {
        titleName = settings.camera === undefined ? "" : settings.camera as string
        await ev.action.setTitle(`${titleName}`)
      }

    }
  }


  override async onWillAppear(ev: WillAppearEvent) {
    const settings = ev.payload.settings
    const globals = await streamDeck.settings.getGlobalSettings();

    //verificação se e undefined
    let cameraIP = settings.cameraIP === undefined ? false : settings.cameraIP as string
  
    if(!settings.cameraIP){
      await ev.action.setSettings({...settings, cameraIP: globals.cameraIP});
      cameraIP = globals.cameraIP as string
    } 
    
    // const checkCamera = await checkCameraConnection(`${cameraIP}`, this.timeCheck)
  
    // if(!checkCamera) {
    //   ev.action.setTitle('Not\nConnect')
    // } else {
    //   const titleName = settings.camera === undefined ? "" : settings.camera
    //   await ev.action.setTitle(`${titleName}`)
    // }

    const isTelycam  = settings.isTelycam === undefined ? false : settings.isTelycam
    let titleName;

    if(isTelycam){

      let telycamUser = settings.telycamUser === undefined ? false : settings.telycamUser as string
      let telycamPassword = settings.telycamPassword === undefined ? false : settings.telycamPassword as string

      ev.action.setImage(`imgs/actions/cameraSelectTelycam`)

      
      if(!telycamUser || !telycamPassword){
        titleName = `Not\nConnect\nTelycam`
        await ev.action.setTitle(`${titleName}`)
        return;
      }
      
      const key = await LoginTelycam({ip: String(cameraIP), user: telycamUser, password: telycamPassword})

      if(!key){
        await ev.action.setTitle(`Not\nConnect\nTelycam`)
        return;
      }
      
      titleName = settings.camera === undefined ? "" : settings.camera as string
      await ev.action.setTitle(`${titleName}`)

    } else {
      ev.action.setImage("")
      const checkCamera = await checkCameraConnection(`${cameraIP}`, this.timeCheck)

      if(!checkCamera) {
        ev.action.setTitle('Not\nConnect')
        
      } else {
        titleName = settings.camera === undefined ? "" : settings.camera as string
        await ev.action.setTitle(`${titleName}`)
      }
    }
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent){
    const settings = ev.payload.settings
    
    const titleName = settings.camera === undefined ? "" : settings.camera
    await ev.action.setTitle(`${titleName}`)

    const isTelycam  = settings.isTelycam === undefined ? false : settings.isTelycam

    if(isTelycam) {
      ev.action.setImage(`imgs/actions/cameraSelectTelycam`)
    } else{
      ev.action.setImage("")
    }
  }


  override async onKeyDown(ev: KeyDownEvent): Promise<void> {
    const settings = ev.payload.settings
    const globals = await streamDeck.settings.getGlobalSettings();
    
    //verificação se e undefined
    let cameraIP = settings.cameraIP === undefined ? false : settings.cameraIP as string
    
    if(!cameraIP) {
      await ev.action.setSettings({...settings, cameraIP: globals.cameraIP});
      cameraIP = globals.cameraIP as string
      return
    } 

    let titleName: string;

    const isTelycam  = settings.isTelycam === undefined ? false : settings.isTelycam
    
    if(isTelycam){
      let sessionKeyTelycam: number | null = null;

      let telycamUser = settings.telycamUser === undefined ? false : settings.telycamUser as string
      let telycamPassword = settings.telycamPassword === undefined ? false : settings.telycamPassword as string
      
      if(!telycamUser || !telycamPassword){
        titleName = `Not\nConnect\nTelycam`
        await ev.action.setTitle(`${titleName}`)
        await streamDeck.settings.setGlobalSettings({
        ...globals,
          cameraIP: false,
          camera: "Not\nConnect\nTelycam",
          isTelycam: false,
        });
        return;
      }
      
      const key = await LoginTelycam({ip: cameraIP, user: telycamUser, password: telycamPassword})

      // aqui não tem return por que precisamos atualizar as outras ações
      if(!key){
        titleName = `Not\nConnect\nTelycam`
        await ev.action.setTitle(`${titleName}`)
        await streamDeck.settings.setGlobalSettings({
        ...globals,
          cameraIP: false,
          camera: "Not\nConnect\nTelycam",
          isTelycam: false,
        });

        this.ptzTracking.actions.forEach(async (actionInstance) => {
          actionInstance.getSettings()
        });
      } else {
        sessionKeyTelycam = key;

        titleName = settings.camera === undefined ? "" : settings.camera as string
        await ev.action.setTitle(`${titleName}`)
        
        await streamDeck.settings.setGlobalSettings({
          ...globals,
          cameraIP: cameraIP,
          camera: titleName,
          keyTelycam: sessionKeyTelycam,
          isTelycam: true,
        });
        
      
        this.ptzTracking.actions.forEach(async (ev) => {
          const lastMode = String(globals[`trackingModeTelycam_${cameraIP}`] || this.ptzTracking.trackingModesTelycam[0].value);
          const trackingActive = Boolean(globals[`trackingActive_${cameraIP}`]);
        
          const modeInfo = this.ptzTracking.trackingModesTelycam.find(m => m.value === lastMode) || this.ptzTracking.trackingModesTelycam[0];

          ev.setTitle(modeInfo.name);
          ev.setImage(trackingActive ? "imgs/actions/tracking/tracking-on" : "imgs/actions/tracking/tracking-off");
        }); 
      }
          
    } else {
      const checkCamera = await checkCameraConnection(cameraIP, this.timeCheck)

      if(!checkCamera) {
        ev.action.setTitle('Not\nConnect')

        titleName = "No camera"
        
        await streamDeck.settings.setGlobalSettings({
          ...globals,
          cameraIP: false,
          camera: titleName,
          isTelycam: false,
        });

        this.ptzTracking.actions.forEach(async (actionInstance) => {
          actionInstance.getSettings()
        });

      } else {
        titleName = settings.camera === undefined ? "" : settings.camera as string

        await ev.action.setTitle(`${titleName}`)
        
        await streamDeck.settings.setGlobalSettings({
          ...globals,
          cameraIP: cameraIP,
          camera: titleName,
          isTelycam: false,
        });

        /** 
        * Para atualizar comandos e o visual do botão de outras ações
        *  
        */
        const tracking = await this.ptzTracking.fetchCameraTracking(`${cameraIP}`);
        // atualiza o visual de todos os botões de tracking
        if (tracking) {
          this.ptzTracking.actions.forEach(async (ev) => {
  
            const modeInfo = this.ptzTracking.trackingModes.find(m => m.value === tracking.trackMode)!;
            ev.setTitle(modeInfo.name);
            ev.setImage(tracking.trackActive ? "imgs/actions/tracking/tracking-on" : "imgs/actions/tracking/tracking-off");
          });
          
        } 
      }
    }
    
    
    this.ptzControls.actions.forEach( async (actionInstance) => {
      actionInstance.getSettings()

      if(settings.isDefault){
        actionInstance.setTitle("default");
      } else {
        actionInstance.setTitle(`${titleName}`);
      }
    });


    this.ptzPreset.actions.forEach(actionInstance => {
      actionInstance.getSettings()
    });

    this.ptzFocus.actions.forEach(actionInstance => {
      actionInstance.getSettings()
    });

    this.ptzZoom.actions.forEach(actionInstance => {
      actionInstance.getSettings()
    });

    this.ptzBacklight.actions.forEach(actionInstance => {
      actionInstance.getSettings()
    });

    this.ptzOSD.actions.forEach(async (actionInstance) => {
      actionInstance.getSettings()
    });

    this.focusDial.actions.forEach(async (actionInstance) => {
      actionInstance.getSettings()
    });

    this.zoomDial.actions.forEach(async (actionInstance) => {
      actionInstance.getSettings()
    });
  
  }
}