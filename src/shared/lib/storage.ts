// Not in the upstream react-native typings; kepler still ships it.
import {AsyncStorage} from '@amazon-devices/react-native-kepler';

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

type AsyncStorageLike = Pick<
  KeyValueStorage,
  'getItem' | 'setItem' | 'removeItem'
>;

const log = createLogger('storage');

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
 * Wraps the kepler AsyncStorage. Failures are logged and swallowed: callers
 * (zustand persist) fire writes without awaiting, so a rejection would surface
 * as an unhandled promise, and a failed read must fall back to defaults.
 */
export function createAsyncStorage(
  backend: AsyncStorageLike = AsyncStorage,
): KeyValueStorage {
  return {
    getItem: async (key) => {
      try {
        return await backend.getItem(key);
      } catch (error) {
        log.warn('read failed', key, error);
        return null;
      }
    },
    setItem: async (key, value) => {
      try {
        await backend.setItem(key, value);
      } catch (error) {
        log.warn('write failed', key, error);
      }
    },
    removeItem: async (key) => {
      try {
        await backend.removeItem(key);
      } catch (error) {
        log.warn('remove failed', key, error);
      }
    },
  };
}
