export const globalKeys = {
  trackingMode:        (ip: string) => `trackingMode_${ip}`,
  trackingModeTelycam: (ip: string) => `trackingModeTelycam_${ip}`,
  trackingActive:      (ip: string) => `trackingActive_${ip}`,
  presetImage:         (n: number, ip: string) => `presetImage${n}${ip}`,
  tallyState:          (ip: string) => `tallyState_${ip}`,
} as const;
