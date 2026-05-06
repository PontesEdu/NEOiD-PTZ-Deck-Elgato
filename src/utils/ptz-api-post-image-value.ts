

export function apiBasePtzPostImageValue(cameraIP: any) {

  const apiBase = `http://${cameraIP}/cgi-bin/ptzctrl.cgi?post_image_value`;

  return apiBase
}