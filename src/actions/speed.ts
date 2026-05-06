import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent, type DidReceiveSettingsEvent } from "@elgato/streamdeck";


export type PTZSpeedProps = {
  speed: "pan" | "zoom" | "focus";
};

@action({ UUID: "com.neoid.ptzneoid.ptz-speed" })
export class PTZSpeed extends SingletonAction {
  private static readonly speedModes = ["slowest", "slow", "normal", "fast", "fastest"] as const;


  override async onWillAppear(ev: WillAppearEvent<PTZSpeedProps>) {
    const settings = ev.payload.settings;
    const globals = await streamDeck.settings.getGlobalSettings();

    const tipo = settings.speed as "pan" | "zoom" | "focus";

    if (!["pan", "zoom", "focus"].includes(tipo)) {
      await ev.action.setTitle("Select");
      return;
    }

    const currentMode = globals[`${tipo}Mode`] ?? "normal";
    await ev.action.setTitle(`${tipo === "pan" ? "P/T" : tipo}:\n${currentMode}`);
  }
  

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<PTZSpeedProps>) {
    const settings = ev.payload.settings;
    const tipo = settings.speed as "pan" | "zoom" | "focus";

    if (!["pan", "zoom", "focus"].includes(tipo)) {
      await ev.action.setTitle("Select");
      return;
    }

    const globals = await streamDeck.settings.getGlobalSettings();
    const currentMode = globals[`${tipo}Mode`] ?? "normal";

    await ev.action.setTitle(`${tipo === "pan" ? "P/T" : tipo}:\n${currentMode}`);
  }


  // KEYDOWN
  override async onKeyDown(ev: KeyDownEvent<PTZSpeedProps>): Promise<void> {
    const settings = ev.payload.settings;
    const tipo = settings.speed as "pan" | "zoom" | "focus";

    if (!["pan", "zoom", "focus"].includes(tipo)) {
      await ev.action.setTitle("Select");
      return;
    }

    const globals = await streamDeck.settings.getGlobalSettings();

    // pega o modo atual
    const currentMode = globals[`${tipo}Mode`] ?? "normal";
    const indexAtual = PTZSpeed.speedModes.indexOf(currentMode as typeof PTZSpeed.speedModes[number]);
    const nextIndex = (indexAtual + 1) % PTZSpeed.speedModes.length;
    const nextMode = PTZSpeed.speedModes[nextIndex];


    // atualiza o título
    await ev.action.setTitle(`${tipo === "pan" ? "P/T" : tipo}:\n${nextMode}`);

    // salva no global
    await streamDeck.settings.setGlobalSettings({
      ...globals,
      [`${tipo}Mode`]: nextMode,
    });
  }
}

  
