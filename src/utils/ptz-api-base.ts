
export function apiBaseCMD(cameraIP: any) {

  const apiBase = `http://${cameraIP}/cgi-bin/ptzctrl.cgi?ptzcmd`;
  
  return apiBase
}



