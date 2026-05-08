
export function apiBaseCMD(cameraIP: string) {

  const apiBase = `http://${cameraIP}/cgi-bin/ptzctrl.cgi?ptzcmd`;
  
  return apiBase
}



