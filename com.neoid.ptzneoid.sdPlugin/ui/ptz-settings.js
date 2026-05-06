const { streamDeckClient } = SDPIComponents;


streamDeckClient.on('connected', (jsn) => {
  console.log('Property Inspector conectado', jsn);
  // settings ja são carregadas nos componentes automaticamente
});
