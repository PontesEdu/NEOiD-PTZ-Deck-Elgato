import type { SingletonAction } from "@elgato/streamdeck";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAction = SingletonAction<any>;

const instances: AnyAction[] = [];

export const ActionRegistry = {
  register(action: AnyAction): void {
    instances.push(action);
  },

  broadcastGetSettings(): void {
    for (const action of instances) {
      action.actions.forEach(a => a.getSettings());
    }
  },
};
