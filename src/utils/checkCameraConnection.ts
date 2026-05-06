export async function checkCameraConnection(cameraIP: string, timeout = 5000): Promise<boolean> {
  const fetchPromise = (async () => {
    try {
      const res = await fetch(`http://${cameraIP}/cgi-bin/param.cgi?get_device_conf`, { mode: 'no-cors' });
      return res.ok;
    } catch {
      return false;
    }
  })();

  const timeoutPromise = new Promise<boolean>(resolve =>
    setTimeout(() => resolve(false), timeout)
  );

  return Promise.race([fetchPromise, timeoutPromise]);
}

