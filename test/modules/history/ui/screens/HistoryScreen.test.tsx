import {useTVEventHandler} from '@amazon-devices/react-native-kepler';
import {act, fireEvent, render, screen} from '@testing-library/react-native';
import React from 'react';

import {
  HistoryProvider,
  HistoryScreen,
  type HistoryEntry,
  type HistoryStore,
} from '~/modules/history';
import {colors} from '~/shared/ui';

import {pressBack} from '../../../../support/fakeBackHandler';
import {
  createTestHistoryStore,
  historyEntry,
} from '../../../../support/history';
import {flatStyle} from '../../../../support/style';

const now = new Date(2026, 9, 16, 21, 5).getTime();
const today = new Date(2026, 9, 16, 19, 58).getTime();
const older = new Date(2026, 9, 14, 8, 30).getTime();

const mockedHook = useTVEventHandler as unknown as jest.Mock;

async function setup(entries: HistoryEntry[] = [], enabled = true) {
  const store = await createTestHistoryStore(entries, enabled);
  render(
    <HistoryProvider store={store}>
      <HistoryScreen now={now} />
    </HistoryProvider>,
  );
  return store;
}

const clearButton = () => screen.getByRole('button', {name: 'Clear history'});

describe('HistoryScreen', () => {
  it('shows the heading, the limit and the count', async () => {
    await setup([historyEntry(today), historyEntry(older)]);
    expect(screen.getByText('Your past tests.')).toBeTruthy();
    expect(
      screen.getByText('Only the 50 latest results are stored.'),
    ).toBeTruthy();
    expect(screen.getByText('2 of 50 saved')).toBeTruthy();
  });

  it('shows one row per saved test with its values', async () => {
    await setup([
      historyEntry(today, {vpn: 'on', grade: 'D', loadedLatencyMs: 420}),
      historyEntry(older),
    ]);
    expect(screen.getByText('Today, 7:58 PM')).toBeTruthy();
    expect(screen.getByText('Oct 14, 8:30 AM')).toBeTruthy();
    expect(screen.getAllByText('186')).toHaveLength(2);
    expect(screen.getAllByText('23.8')).toHaveLength(2);
    expect(screen.getByText('420')).toBeTruthy();
    expect(screen.getAllByText('203.0.113.7')).toHaveLength(2);
    expect(screen.getAllByText('Germany')).toHaveLength(2);
    expect(screen.getByText('On')).toBeTruthy();
    expect(screen.getByText('Off')).toBeTruthy();
    expect(flatStyle(screen.getByText('On')).color).toBe(colors.amber);
  });

  test.each([
    ['A', colors.lime],
    ['C', colors.amber],
    ['F', colors.coral],
  ] as const)('grade %s uses its tone', async (grade, color) => {
    await setup([historyEntry(today, {grade})]);
    expect(screen.getByText(grade)).toBeTruthy();
    expect(flatStyle(screen.getByTestId('history-grade')).backgroundColor).toBe(
      color,
    );
  });

  it('shows placeholders for a test without insights or VPN state', async () => {
    await setup([
      historyEntry(today, {
        ip: undefined,
        countryCode: undefined,
        country: undefined,
        vpn: 'unknown',
      }),
    ]);
    expect(screen.getByText('Unknown')).toBeTruthy();
    // IP, country code and VPN.
    expect(screen.getAllByText('—')).toHaveLength(3);
  });

  it('empty: explains how results appear and greys out Clear', async () => {
    await setup();
    expect(screen.getByText('No results yet.')).toBeTruthy();
    expect(
      screen.getByText('Run a speed test and your results will show up here.'),
    ).toBeTruthy();
    expect(clearButton()).toBeDisabled();
    fireEvent.press(clearButton());
    expect(screen.queryByText('Clear history?')).toBeNull();
  });

  it('the switch turns saving off and on', async () => {
    const store = await setup();
    const toggle = () => screen.getByRole('switch', {name: 'Save history'});
    expect(toggle()).toBeChecked();
    expect(
      screen.queryByText("History is off · new results aren't saved"),
    ).toBeNull();

    fireEvent.press(toggle());
    expect(store.getState().enabled).toBe(false);
    expect(toggle()).not.toBeChecked();
    expect(
      screen.getByText("History is off · new results aren't saved"),
    ).toBeTruthy();
    expect(
      screen.getByText('History is off. Turn it on to keep your results.'),
    ).toBeTruthy();

    fireEvent.press(toggle());
    expect(store.getState().enabled).toBe(true);
  });

  it('turning it off keeps saved results', async () => {
    await setup([historyEntry(today)], false);
    expect(screen.getByText('Today, 7:58 PM')).toBeTruthy();
    expect(clearButton()).not.toBeDisabled();
  });

  describe('clear', () => {
    let store: HistoryStore;

    beforeEach(async () => {
      store = await setup([historyEntry(today), historyEntry(older)]);
      fireEvent.press(clearButton());
    });

    it('asks first', () => {
      expect(screen.getByText('Clear history?')).toBeTruthy();
      expect(
        screen.getByText(
          "All 2 saved results will be deleted from this TV. This can't be undone.",
        ),
      ).toBeTruthy();
    });

    it('Keep history closes the dialog and keeps everything', () => {
      fireEvent.press(screen.getByRole('button', {name: 'Keep history'}));
      expect(screen.queryByText('Clear history?')).toBeNull();
      expect(store.getState().entries).toHaveLength(2);
    });

    it('Back closes the dialog and keeps everything', () => {
      let handled = false;
      act(() => {
        handled = pressBack();
      });
      expect(handled).toBe(true);
      expect(screen.queryByText('Clear history?')).toBeNull();
      expect(store.getState().entries).toHaveLength(2);
    });

    it('Clear history deletes every result', () => {
      // The dialog's button is the last one with this name.
      const buttons = screen.getAllByRole('button', {name: 'Clear history'});
      fireEvent.press(buttons[buttons.length - 1] as (typeof buttons)[number]);
      expect(screen.queryByText('Clear history?')).toBeNull();
      expect(store.getState().entries).toEqual([]);
      expect(screen.getByText('No results yet.')).toBeTruthy();
      expect(screen.getByText('0 of 50 saved')).toBeTruthy();
    });
  });

  it('leaves Back to the stack without the dialog', async () => {
    await setup([historyEntry(today)]);
    let handled = true;
    act(() => {
      handled = pressBack();
    });
    expect(handled).toBe(false);
  });

  it('▲/▼ stop scrolling the list while the dialog is open', async () => {
    await setup([historyEntry(today)]);
    const scroller = screen.getByTestId('history-scroller');
    fireEvent(scroller, 'layout', {nativeEvent: {layout: {height: 100}}});
    fireEvent(scroller, 'contentSizeChange', 0, 2000);
    let node: typeof scroller | null = scroller;
    while (node && typeof node.instance?.scrollTo !== 'function') {
      node = node.parent;
    }
    const scrollTo = jest.spyOn(
      node?.instance as {scrollTo: () => void},
      'scrollTo',
    );
    scrollTo.mockClear();
    const press = () =>
      act(() => {
        mockedHook.mock.calls.at(-1)?.[0]({
          eventType: 'down',
          eventKeyAction: 0,
        });
      });

    press();
    expect(scrollTo).toHaveBeenCalledTimes(1);
    fireEvent.press(clearButton());
    press();
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });
});
