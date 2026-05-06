
export async function imageSnapShot (cameraIP: any) {
  const response = await fetch(`http://${cameraIP}/snapshot.jpg`);
  
  if (!response.ok) throw new Error('Falha ao buscar a imagem');

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString('base64');
  const dataUrl = `data:image/jpeg;base64,${base64}`;

  return dataUrl

}