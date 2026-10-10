import {MMKV} from '@amazon-devices/react-native-mmkv';

import {createLogger} from './logger';

/**
 * Implementations must never reject: zustand persist fires writes without
 * awaiting them, and a failed read must fall back to defaults.
 */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** The slice of the MMKV instance API the adapter uses. */
export interface MmkvLike {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
}

const log = createLogger('storage');

const MMKV_ID = 'streamready';

export function createMemoryStorage(
  initial: Record<string, string> = {},
): KeyValueStorage {
  const data = new Map(Object.entries(initial));
  return {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      data.set(key, value);
    },
    removeItem: async (key) => {
      data.delete(key);
    },
  };
}

/**
 * Persistent storage over MMKV (ADR 0008). Reads are synchronous underneath, so
 * consent hydrates at once on cold start. Failures are logged and swallowed;
 * if the native module can't open, the app runs on memory storage (consent is
 * asked again next launch) instead of crashing.
 */
export function createMmkvStorage(
  open: () => MmkvLike = () => new MMKV({id: MMKV_ID}),
): KeyValueStorage {
  let backend: MmkvLike;
  try {
    backend = open();
  } catch (error) {
    log.warn('mmkv unavailable', error);
    return createMemoryStorage();
  }
  return {
    getItem: async (key) => {
      try {
        return backend.getString(key) ?? null;
      } catch (error) {
        log.warn('read failed', key, error);
        return null;
      }
    },
    setItem: async (key, value) => {
      try {
        backend.set(key, value);
      } catch (error) {
        log.warn('write failed', key, error);
      }
    },
    removeItem: async (key) => {
      try {
        backend.delete(key);
      } catch (error) {
        log.warn('remove failed', key, error);
      }
    },
  };
}
