export type SpeedType = "slowest" | "slow" | "normal" | "fast" | "fastest";

export type GlobalSettings = {
  cameraIP: string | false;
  camera: string;
  isTelycam: boolean;
  keyTelycam: number;
  panMode: SpeedType;
  zoomMode: SpeedType;
  focusMode: SpeedType;
  isBacklight: boolean;
  isOsd: boolean;
  isFrozen: boolean;
  cameraIPControls: string | null;
  // index signature compatível com JsonObject do SDK (sem unknown)
  [key: string]: string | number | boolean | null;
};
