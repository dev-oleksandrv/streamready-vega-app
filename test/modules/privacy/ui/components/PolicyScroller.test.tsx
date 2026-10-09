import {useTVEventHandler} from '@amazon-devices/react-native-kepler';
import {act, fireEvent, render, screen} from '@testing-library/react-native';
import React from 'react';

import {POLICY_SECTIONS} from '~/modules/privacy/content';
import {PolicyScroller} from '~/modules/privacy/ui/components/PolicyScroller';
import {scale} from '~/shared/ui';

const mockedHook = useTVEventHandler as unknown as jest.Mock;

/** The handler PolicyScroller registered on its latest render. */
const press = (eventType: string, eventKeyAction = 0) =>
  act(() => {
    const handler = mockedHook.mock.calls.at(-1)?.[0];
    handler?.({eventType, eventKeyAction});
  });

function renderScroller(scrollable = scale(300)) {
  render(<PolicyScroller sections={POLICY_SECTIONS} />);
  const scroller = screen.getByTestId('policy-scroller');
  fireEvent(scroller, 'layout', {nativeEvent: {layout: {height: 500}}});
  fireEvent(scroller, 'contentSizeChange', 0, 500 + scrollable);
  // The host view has no instance; the ScrollView class mock above it does.
  let node: typeof scroller | null = scroller;
  while (node && typeof node.instance?.scrollTo !== 'function') {
    node = node.parent;
  }
  if (!node) {
    throw new Error('ScrollView instance not found');
  }
  const scrollTo = jest.spyOn(
    node.instance as {scrollTo: () => void},
    'scrollTo',
  );
  // The mock's scrollTo lives on the prototype and keeps calls across tests.
  scrollTo.mockClear();
  return {scrollTo, scroller};
}

beforeEach(() => mockedHook.mockClear());

it('renders every section', () => {
  render(<PolicyScroller sections={POLICY_SECTIONS} />);
  POLICY_SECTIONS.forEach(({title}) =>
    expect(screen.getByText(title)).toBeTruthy(),
  );
});

it('scrolls one step per ▼ press and clamps at the bottom', () => {
  const {scrollTo} = renderScroller();
  press('down');
  expect(scrollTo).toHaveBeenLastCalledWith({y: scale(220), animated: true});
  press('down');
  expect(scrollTo).toHaveBeenLastCalledWith({y: scale(300), animated: true});
  press('down');
  expect(scrollTo).toHaveBeenCalledTimes(2);
});

it('ignores key-up events and scrolls back with ▲', () => {
  const {scrollTo} = renderScroller();
  press('down', 1);
  expect(scrollTo).not.toHaveBeenCalled();
  press('down');
  press('up');
  expect(scrollTo).toHaveBeenLastCalledWith({y: 0, animated: true});
});

it('keeps full steps while a scroll animation reports in-between offsets', () => {
  const {scrollTo, scroller} = renderScroller(scale(1000));
  press('down');
  fireEvent.scroll(scroller, {nativeEvent: {contentOffset: {y: scale(40)}}});
  press('down');
  expect(scrollTo).toHaveBeenLastCalledWith({y: scale(440), animated: true});
});
