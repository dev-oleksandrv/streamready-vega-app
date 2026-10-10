import {createSessionStore} from '~/modules/speedtest';

describe('sessionStore', () => {
  it('has no cooldown at first', () => {
    expect(createSessionStore().getState().cooldownUntil).toBeUndefined();
  });

  it('startCooldown sets cooldownUntil = now + duration', () => {
    const store = createSessionStore();
    store.getState().startCooldown(1_000, 30_000);
    expect(store.getState().cooldownUntil).toBe(31_000);
  });
});
