import { APINeoid } from "../api/api-neoid";
import { APITelycam } from "../api/api-telycam";
import type { PTZDirection } from "../constants";
import type { SpeedType, GlobalSettings } from "../types";

export interface CameraAPI {
  move(direction: PTZDirection, speed: SpeedType): Promise<void>;
  stopMove(): Promise<void>;
  moveZoom(direction: "zoomin" | "zoomout", speed: SpeedType): Promise<void>;
  stopZoom(): Promise<void>;
  moveFocus(direction: "focusin" | "focusout" | "afocus", speed: SpeedType): Promise<void>;
  stopFocus(): Promise<void>;
  callPreset(n: number): Promise<void>;
  addSetPreset(n: number): Promise<void>;
  toggleBacklight(enable: boolean): Promise<void>;
  sendTally(state: "red" | "green" | "off"): Promise<void>;
}

class NeoidAdapter implements CameraAPI {
  private api: APINeoid;
  constructor(ip: string) { this.api = new APINeoid({ IP: ip }); }

  move(direction: PTZDirection, speed: SpeedType)                       { return this.api.Move(direction, speed); }
  stopMove()                                                             { return this.api.StopMove(); }
  moveZoom(direction: "zoomin" | "zoomout", speed: SpeedType)           { return this.api.MoveZoomAndFocus(direction, speed); }
  stopZoom()                                                             { return this.api.StopZoomAndFocus("zoom"); }
  moveFocus(direction: "focusin" | "focusout" | "afocus", speed: SpeedType) { return this.api.MoveZoomAndFocus(direction, speed); }
  stopFocus()                                                            { return this.api.StopZoomAndFocus("focus"); }
  callPreset(n: number)                                                  { return this.api.CallPreset(n); }
  addSetPreset(n: number)                                                { return this.api.AddSetPreset(n); }
  toggleBacklight(enable: boolean)                                       { return this.api.toggleBacklight(enable); }
  sendTally(state: "red" | "green" | "off")                             { return this.api.sendTally(state); }
}

class TelycamAdapter implements CameraAPI {
  private api: APITelycam;
  constructor(ip: string, key: number) { this.api = new APITelycam({ IP: ip, key }); }

  move(direction: PTZDirection, speed: SpeedType)                       { return this.api.MoveTelycam(direction, speed); }
  stopMove()                                                             { return this.api.StopTelycamControls(); }
  moveZoom(direction: "zoomin" | "zoomout", speed: SpeedType)           { return this.api.MoveZoomTelycam(direction, speed); }
  stopZoom()                                                             { return this.api.StopZoomTelycam(); }
  moveFocus(direction: "focusin" | "focusout" | "afocus", speed: SpeedType) { return this.api.MoveFocusTelycam(direction, speed); }
  stopFocus()                                                            { return this.api.StopFocusTelycam(); }
  callPreset(n: number)                                                  { return this.api.CallPreset(n); }
  addSetPreset(n: number)                                                { return this.api.AddSetPreset(n); }
  toggleBacklight(enable: boolean)                                       { return this.api.toggleBacklight(enable); }
  sendTally(state: "red" | "green" | "off")                             { return this.api.sendTally(state); }
}

export type CameraContext = { cameraIP: string; api: CameraAPI };

export function resolveCamera(globals: GlobalSettings): CameraContext | null {
  if (!globals.cameraIP) return null;
  const ip = globals.cameraIP as string;
  const api = globals.isTelycam
    ? new TelycamAdapter(ip, globals.keyTelycam)
    : new NeoidAdapter(ip);
  return { cameraIP: ip, api };
}
