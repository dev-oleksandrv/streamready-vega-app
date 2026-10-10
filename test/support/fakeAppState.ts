/* eslint-env jest */
type Listener = (state: string) => void;

const listeners = new Set<Listener>();

/** The preset's AppState mock drops listeners; this one lets tests fire changes. */
export const fakeAppState = {
  currentState: 'active',
  addEventListener: (_event: string, listener: Listener) => {
    listeners.add(listener);
    return {remove: () => listeners.delete(listener)};
  },
};

export function emitAppState(state: string) {
  fakeAppState.currentState = state;
  listeners.forEach((listener) => listener(state));
}
