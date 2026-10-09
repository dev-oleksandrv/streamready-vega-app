import {nextScrollOffset} from '~/modules/privacy/ui/components/scrollStep';

const base = {offset: 300, step: 100, max: 500};

describe('nextScrollOffset', () => {
  test.each([
    ['down press', {eventType: 'down', eventKeyAction: 0}, 400],
    ['up press', {eventType: 'up', eventKeyAction: 0}, 200],
    ['down without action', {eventType: 'down'}, 400],
    ['down release', {eventType: 'down', eventKeyAction: 1}, null],
    ['left press', {eventType: 'left', eventKeyAction: 0}, null],
    ['select', {eventType: 'select', eventKeyAction: 0}, null],
  ])('%s', (_name, event, expected) => {
    expect(nextScrollOffset({...base, event})).toBe(expected);
  });

  it('clamps at the bottom', () => {
    expect(
      nextScrollOffset({
        event: {eventType: 'down'},
        offset: 450,
        step: 100,
        max: 500,
      }),
    ).toBe(500);
  });

  it('clamps at the top', () => {
    expect(
      nextScrollOffset({
        event: {eventType: 'up'},
        offset: 50,
        step: 100,
        max: 500,
      }),
    ).toBe(0);
  });

  it('returns null when already at an edge', () => {
    expect(
      nextScrollOffset({
        event: {eventType: 'down'},
        offset: 500,
        step: 100,
        max: 500,
      }),
    ).toBeNull();
    expect(
      nextScrollOffset({
        event: {eventType: 'up'},
        offset: 0,
        step: 100,
        max: 500,
      }),
    ).toBeNull();
  });

  it('never scrolls when content fits', () => {
    expect(
      nextScrollOffset({
        event: {eventType: 'down'},
        offset: 0,
        step: 100,
        max: 0,
      }),
    ).toBeNull();
  });
});
