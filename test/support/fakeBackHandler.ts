/* eslint-env jest */
type Handler = () => boolean | null | undefined;

const handlers = new Set<Handler>();

/**
 * Keeps real subscription semantics (handlers are removed on unmount)
 * and lets tests press Back.
 */
export const fakeBackHandler = {
  addEventListener: (_event: 'hardwareBackPress', handler: Handler) => {
    handlers.add(handler);
    return {remove: () => handlers.delete(handler)};
  },
  exitApp: jest.fn(),
};

/** Fires Back like the platform: newest handler first, until one returns true. */
export function pressBack(): boolean {
  return [...handlers].reverse().some(handler => handler() === true);
}
