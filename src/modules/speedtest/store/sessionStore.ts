import {createStore} from 'zustand/vanilla';

/** Minimal for now: the Test module extends this store with phases, samples and results. */
export interface SessionState {
  cooldownUntil?: number;
  startCooldown: (now: number, durationMs: number) => void;
}

export function createSessionStore() {
  return createStore<SessionState>()((set) => ({
    cooldownUntil: undefined,
    startCooldown: (now, durationMs) => {
      set({cooldownUntil: now + durationMs});
    },
  }));
}

export type SessionStore = ReturnType<typeof createSessionStore>;
