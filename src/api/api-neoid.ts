import type { SpeedType } from "../types";
import { PTZ_DIRECTIONS, zoomFocusSpeed } from "../constants";
import type { PTZDirection } from "../constants";
import { sendViscaUDP } from "../utils/send-visca-udp";
import { sendViscaTCP } from "../utils/send-visca-tcp";

export type { SpeedType, PTZDirection };
export { PTZ_DIRECTIONS, zoomFocusSpeed };

export const panTiltSpeed = {
  slowest: '06',
  slow: '09',
  normal: 12,
  fast: 16,
  fastest: 23,
} as const;


// Method to MOVE
const VISCA_COMMANDS: Record<PTZDirection, string> = {
  up: "0301FF",
  down: "0302FF",
  left: "0103FF",
  right: "0203FF",
  leftup: "0101FF",
  leftdown: "0102FF",
  rightup: "0201FF",
  rightdown: "0202FF",
  home: "81010604FF", // ajuste se necessário
}

type APIConfig = {
  IP: string
}

export class APINeoid {
  private baseUrl: string
  private baseUrlVisca: string
  private IP: string

  constructor({
    IP,
  }: APIConfig) {
    this.baseUrl = `http://${IP}/cgi-bin/ptzctrl.cgi?ptzcmd`
    this.baseUrlVisca =  `http://${IP}/cgi-bin/apineoid.cgi?subsystem=visca&cmd`
    this.IP = IP
  }

  //CONTROLS
  async Move(direction: PTZDirection, speed: SpeedType) {
    const speedValue = panTiltSpeed[speed]  

    //API dos CHINA
    const url = `${this.baseUrl}&${direction}&${speedValue}&${speedValue}`; 
    const response = await fetch(url)

    const data: any = await response.json();

    const result = data?.Response?.Result;

    if (result === "Success") {
      return;
    }

    const viscaCmd = VISCA_COMMANDS[direction]

    const urlCmdNeoid = `${this.baseUrlVisca}=${direction === "home" ? viscaCmd : `81010601${speedValue}${speedValue}${viscaCmd}`}`
    await fetch(urlCmdNeoid)
  }

  async StopMove() {
    // API CHINA
    const url = `${this.baseUrl}&ptzstop&0&0`; 
    const response = await fetch(url);
    const data: any = await response.json();

    const result = data?.Response?.Result;

    if (result === "Success") {
      return;
    }

    // API NEOID VISCA (fallback)
    const urlCmd = `${this.baseUrlVisca}=8101060100000201FF`;
    await fetch(urlCmd);
  }


  // ZOOM And Focus  
  async MoveZoomAndFocus(direction: "zoomout" | "zoomin" | "focusout" | "focusin" | "afocus", speed: SpeedType) {
    // API CHINA
    const speedValue = zoomFocusSpeed[speed] ?? zoomFocusSpeed.normal;

    // Nessa api dos Chines em algumas cameras precisa dexair no modo manual para depois usar in e o out
    if (direction === 'focusin' || direction === 'focusout') {
      const urlClassicFocusModeManual = `${this.baseUrl}&mfocus`;
      await fetch(urlClassicFocusModeManual);
    }

    const urlClassic = `${this.baseUrl}&${direction}&${speedValue}`;
    const response = await fetch(urlClassic);

    const data: any = await response.json();

    const result = data?.Response?.Result;

    const result2 = data?.Response?.msg;

    if (result === "Success" || result2 === "success") {
      return;
    }

    // API NEOID VISCA (fallback)
    if (direction === "zoomin"){
      const urlNEOID = `${this.baseUrlVisca}=8101040702FF`;
      await fetch(urlNEOID);
      
    } else if(direction === "zoomout")  {

      const urlNEOID = `${this.baseUrlVisca}=8101040703FF`;
      await fetch(urlNEOID);
      
    } else if(direction === "afocus")  {

      const urlNEOID = `${this.baseUrlVisca}=8101043802FF`;
      await fetch(urlNEOID);
      
    } else if(direction === "focusin")  {

      const urlNEOIDManual = `${this.baseUrlVisca}=8101043803FF`;
      await fetch(urlNEOIDManual);

      const urlNEOID = `${this.baseUrlVisca}=810104083${speedValue}FF`;
      await fetch(urlNEOID);
      
    } else if(direction === "focusout")  {

      const urlNEOIDManual = `${this.baseUrlVisca}=8101043803FF`;
      await fetch(urlNEOIDManual);

      const urlNEOID = `${this.baseUrlVisca}=810104082${speedValue}FF`;
      await fetch(urlNEOID);
    }

  }

  async StopZoomAndFocus(type: "zoom" | "focus") {
    const url = `${this.baseUrl}&${type}stop&0`;
    await fetch(url)
  }


  // Preset
  async AddSetPreset(numberPreset: number) {
    const response = await fetch(`${this.baseUrl}&posset&${numberPreset}`);

    const data: any = await response.json();

    const result = data?.Response?.Result;

    if (result === "Success") {
      return;
    }

    // garante 2 dígitos (01, 02 ... 09, 10, 11 ...)
    const presetFormatted = numberPreset.toString().padStart(2, '0');

    const urlNEOID = `${this.baseUrlVisca}=8101043F01${presetFormatted}FF`;
    await fetch(urlNEOID);
  }

  async CallPreset(numberPreset: number){
    const response = await fetch(`${this.baseUrl}&poscall&${numberPreset}`);

    const data: any = await response.json();

    const result = data?.Response?.Result;

    if (result === "Success") {
      return;
    }

    // garante 2 dígitos (01, 02 ... 09, 10, 11 ...)
    const presetFormatted = numberPreset.toString().padStart(2, '0');

    const urlNEOID = `${this.baseUrlVisca}=8101043F02${presetFormatted}FF`;
    await fetch(urlNEOID);
  }


  // Tracking
  // ----------------------------
  // envia o comando para trocar o modo (postfulltrack -> fallback write_path)
  async SendTrackingMode(mode: string) {
    const params = new URLSearchParams();
    params.append("cururl", "http://");
    params.append("path", "/data/track.conf");
    params.append("common.track_mode", mode);

    await fetch(`http://${this.IP}/cgi-bin/param.cgi?write_path`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    await fetch(`http://${this.IP}/cgi-bin/param.cgi?postfulltrack`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
  }

  // ----------------------------
  // comandos TCP caso precise 
    // if (active) {
      //   sendViscaTCP(cameraIP, "81 0a 11 54 02 ff"); // LIGA
      // } else { 
      //   sendViscaTCP(cameraIP, "81 0a 11 54 03 ff"); // DESLIGA (ajuste se for diferente)
      // }

  // ----------------------------
  // comandos cgi, obs: não funciona para cameras 20x, 30x G2 
    // if (active) {
    //   await fetch(`http://${cameraIP}/cgi-bin/param.cgi?set_overlay&autotracking&on`)
    // } else { 
    //   await fetch(`http://${cameraIP}/cgi-bin/param.cgi?set_overlay&autotracking&off`)
    // }
  // ----------------------------
  //Fn de enviar o comando para ativar/desativar tracking (write_path | fallback postfulltrack)
  async SendTrackingActive(cameraIP: string, active: boolean) {

    // Tracking
    // API dos Chines
    const viscaParams = new URLSearchParams();
    viscaParams.append("cururl", "http://");
    viscaParams.append("path", "/data/track.conf");
    viscaParams.append("common.track", active ? "1" : "0");
    
    await fetch(`http://${cameraIP}/cgi-bin/param.cgi?write_path`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: viscaParams.toString(),
    });

    const response = await fetch(`http://${cameraIP}/cgi-bin/param.cgi?postfulltrack`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: viscaParams.toString(),
    });
    
    // API NEOiD 
    if (active) {
      await fetch(`http://${cameraIP}/cgi-bin/apineoid.cgi?subsystem=visca&cmd=810a115402ff`)
    } else {
      await fetch(`http://${cameraIP}/cgi-bin/apineoid.cgi?subsystem=visca&cmd=810a115403ff`)
    }
  }


  // Tally — envia dois conjuntos de VISCA para cobertura de firmware
  async sendTally(state: "red" | "green" | "off") {
    if (state === "red") {
      await fetch(`${this.baseUrlVisca}=810a02020201FF`)
      await fetch(`${this.baseUrlVisca}=81017e010a0002FF`)
      sendViscaTCP(this.IP, "81 0a 02 02 02 01 FF")
      sendViscaTCP(this.IP, "81 01 7e 01 0a 00 02 FF")
    } else if (state === "green") {
      await fetch(`${this.baseUrlVisca}=810a02020200FF`)
      await fetch(`${this.baseUrlVisca}=81017e010a0001FF`)
      sendViscaTCP(this.IP, "81 0a 02 02 02 00 FF")
      sendViscaTCP(this.IP, "81 01 7e 01 0a 00 01 FF")
    } else {
      await fetch(`${this.baseUrlVisca}=810a02020301FF`)
      await fetch(`${this.baseUrlVisca}=810a02020300FF`)
      await fetch(`${this.baseUrlVisca}=81017e010a0003FF`)
      sendViscaTCP(this.IP, "81 0a 02 02 03 01 FF")
      sendViscaTCP(this.IP, "81 0a 02 02 03 00 FF")
      sendViscaTCP(this.IP, "81 01 7e 01 0a 00 03 FF")
    }
  }

  // Backlight
  async toggleBacklight(enable: boolean) {
    const urlClassic = `http://${this.IP}/cgi-bin/ptzctrl.cgi?post_image_value&backlight&${enable ? 2 : 3}`;
    
    const urlClassicSecudary = `http://${this.IP}/cgi-bin/ptzctrl.cgi?post_image_value&backlight&${enable ? 0 : 1 }`;

    const response = await fetch(urlClassic);
    await fetch(urlClassicSecudary);

    const data: any = await response.json();

    const result = data?.Response?.Result;

    if (result === "Success") {
      return;
    }

    if(enable){
      await fetch(`http://${this.IP}/cgi-bin/apineoid.cgi?subsystem=visca&cmd=8101043302FF`)
    } else {
      await fetch(`http://${this.IP}/cgi-bin/apineoid.cgi?subsystem=visca&cmd=8101043303FF`)
    }
  }
}
