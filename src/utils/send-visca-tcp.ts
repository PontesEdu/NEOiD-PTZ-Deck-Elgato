import net from 'net';

export function sendViscaTCP(cameraIP: string, viscaHex: string) {
  const bytes = Uint8Array.from(
    viscaHex.split(" ").map(b => parseInt(b, 16))
  );

  const client = net.createConnection({ host: cameraIP, port: 5678 }, () => {
    client.write(bytes);
    client.end();
  });
}


