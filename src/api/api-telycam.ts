import { sendViscaUDP } from "../utils/send-visca-udp";
import type { SpeedType } from "../types";
import { PTZ_DIRECTIONS, zoomFocusSpeed } from "../constants";
import type { PTZDirection } from "../constants";

export type { SpeedType, PTZDirection };
export { PTZ_DIRECTIONS, zoomFocusSpeed };

export const panTiltSpeed = {
  slowest: 6,
  slow: 9,
  normal: 12,
  fast: 16,
  fastest: 23,
} as const;


// Method to MOVE
const HTTP_FALLBACK: Partial<Record<PTZDirection, number>> = {
  up: 1,
  down: 2,
  left: 3,
  right: 4,
  home: 5,
}



type APIConfig = {
  IP: string
  key: number
}

export class APITelycam {
  private baseUrlTelycam: string
  private key: number
  private IP: string


  constructor({
    IP,
    key
  }: APIConfig) {
    this.baseUrlTelycam =  `http://${IP}/cgi-bin/web.fcgi?func=set`
    this.key = key
    this.IP = IP
  }


  //CONTROLS
  async MoveTelycam(direction: PTZDirection, speed: SpeedType) {

    const speedValue = panTiltSpeed[speed]

    if(direction === "leftup") {
      sendViscaUDP(this.IP, `81 01 06 01 ${Number(speedValue)} ${Number(speedValue)} 01 01 FF`)

    }else if(direction === "leftdown") {
      sendViscaUDP(this.IP, `81 01 06 01 ${Number(speedValue)} ${Number(speedValue)} 01 02 FF`)

    } else if(direction === "rightdown") {
      sendViscaUDP(this.IP, `81 01 06 01 ${Number(speedValue)} ${Number(speedValue)} 02 02 FF`)
    } else if(direction === "rightup") {
      sendViscaUDP(this.IP, `81 01 06 01 ${Number(speedValue)} ${Number(speedValue)} 02 01 FF`)

    }
    
    const fallbackDir = HTTP_FALLBACK[direction]
    if (!fallbackDir) return

    await fetch(this.baseUrlTelycam, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: { ptz: [fallbackDir, Number(speedValue)] },
        key: this.key,
      }),
    })
  }

  async StopTelycamControls() {   
    await fetch(this.baseUrlTelycam, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: { ptz: [0 , 10] },
        key: this.key,
      }),
    })
  }


 
  // Focus Telycam
  async MoveFocusTelycam(direction: "focusout" | "focusin" | "afocus", speed: SpeedType) {
    const speedValue = zoomFocusSpeed[speed]

    if(direction === "focusin"){
      await fetch(this.baseUrlTelycam, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: { focus: [ 1, Number(speedValue)] },
          key: this.key,
        }),
      })

    } else if(direction === "focusout") {
      await fetch(this.baseUrlTelycam, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: { focus: [ 2, Number(speedValue)] },
          key: this.key,
        }),
      })

    } else {
      await fetch(this.baseUrlTelycam, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },  
        body: JSON.stringify({
          image: { focus_mode: "auto" },
          key: this.key,
        }),
      })
    }
  }

  async StopFocusTelycam() {
    await fetch(this.baseUrlTelycam, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: { focus: [ 0, 2] },
        key: this.key,
      }),
    })
  }

  // Zoom Telycam
  async MoveZoomTelycam(direction: "zoomout" | "zoomin" , speed: SpeedType) {
    const speedValue = zoomFocusSpeed[speed]

    if(direction === "zoomin"){
      await fetch(this.baseUrlTelycam, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: { zoom: [1, Number(speedValue)] },
          key: this.key,
        }),
      })

    } else {
      await fetch(this.baseUrlTelycam, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: { zoom: [2, Number(speedValue)] },
          key: this.key,
        }),
      })

    } 
  }

  async StopZoomTelycam() {
    await fetch(this.baseUrlTelycam, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: { zoom: [ 0, 2] },
        key: this.key,
      }),
    })
  }



  //Preset
  async AddSetPreset(numberPreset: number){
    await fetch(this.baseUrlTelycam, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: { preset: {add: numberPreset} },
        key: this.key,
      }),
    })
  }

  async CallPreset(numberPreset: number){
    await fetch(this.baseUrlTelycam, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: { preset: {call: numberPreset} },
        key: this.key,
      }),
    })
  }


  // Tracking
  async SetTrackingActive(active: boolean) {
    await fetch(this.baseUrlTelycam, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: this.key,
        ai: { enable: active ? 1 : 0 },
      }),
    });
  }
  

  async TrackingMode (mode: string) {
    await fetch(this.baseUrlTelycam, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ai: { mode: Number(mode)},
        key: this.key,
      }),
    })
  }

  // Backlight
  async toggleBacklight(enable: boolean) {
   if(enable){
      sendViscaUDP(this.IP, "81 01 04 33 02 FF")
    } else {
      sendViscaUDP(this.IP, "81 01 04 33 03 FF")
    }
  }

  // Freeze
  async sendFreeze(enable: boolean) {
    if (enable) {
      sendViscaUDP(this.IP, "81 01 04 62 02 FF")
    } else {
      sendViscaUDP(this.IP, "81 01 04 62 03 FF")
    }
  }

}
