import type { GlobalSettings } from "../types";

type ActionWithTitle = { setTitle(title: string): Promise<void> };

/**
 * Exibe o nome da câmera no botão e retorna true quando não há cameraIP.
 * Uso: if (await noCameraGuard(ev.action, globals)) return;
 */
export async function noCameraGuard(
  action: ActionWithTitle,
  globals: GlobalSettings
): Promise<boolean> {
  if (!globals.cameraIP) {
    await action.setTitle(globals.camera ?? "No camera");
    return true;
  }
  return false;
}
