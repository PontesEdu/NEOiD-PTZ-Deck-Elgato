import dgram from "dgram";

export function sendViscaUDP(
  cameraIP: string,
  viscaHex: string,
  port = 52381
) {
  const data = Uint8Array.from(
    viscaHex.split(" ").map(b => parseInt(b, 16))
  );

  const socket = dgram.createSocket("udp4");

  socket.send(data, port, cameraIP, (err) => {
    if (err) {
      console.error("Erro ao enviar VISCA UDP:", err);
    }
    socket.close();
  });
}