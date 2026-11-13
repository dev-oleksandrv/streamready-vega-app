import {fireEvent, render, screen} from '@testing-library/react-native';
import React from 'react';

import {ServicesScreen} from '~/modules/speedtest';
import {serviceVerdicts} from '~/modules/verdict';

function setup(mbps: number, laggy = false) {
  const onBack = jest.fn();
  render(
    <ServicesScreen
      rows={serviceVerdicts(mbps * 1e6)}
      laggy={laggy}
      onBack={onBack}
    />,
  );
  return onBack;
}

describe('ServicesScreen', () => {
  it('lists the six services in the fixed order', () => {
    setup(16);
    expect(screen.getByText('BY SERVICE')).toBeTruthy();
    expect(screen.getByText('What each app can play.')).toBeTruthy();
    const names = [
      'Netflix',
      'Prime Video',
      'YouTube',
      'Disney+',
      'Apple TV',
      'HBO Max',
    ];
    const order = screen
      .getAllByText(new RegExp(`^(${names.join('|').replace('+', '\\+')})$`))
      .map((n) => n.props.children);
    expect(order).toEqual(names);
  });

  it('16 Mbps: Netflix top tier, YouTube and Prime Video one short of 4K', () => {
    setup(16);
    expect(screen.getAllByText('4K Ultra HD')).toHaveLength(1);
    expect(screen.getByText('4K Ultra HD · Needs 20 Mbps')).toBeTruthy();
    // Prime Video and Disney+ share the typical 4K figure.
    expect(
      screen.getAllByText('4K Ultra HD · Typically needs 25 Mbps'),
    ).toHaveLength(2);
    expect(screen.getAllByText('Full HD 1080p').length).toBeGreaterThan(0);
  });

  it('1 Mbps: every row shows the none text and its HD need', () => {
    setup(1);
    expect(screen.getAllByText('Not enough for HD')).toHaveLength(6);
    expect(screen.getByText('HD 720p · Needs 3 Mbps')).toBeTruthy();
    expect(screen.getByText('HD 720p · Needs 2.5 Mbps')).toBeTruthy();
    expect(
      screen.getAllByText('HD 720p · Typically needs 3 Mbps'),
    ).toHaveLength(4);
  });

  it('shows the disclaimer', () => {
    setup(16);
    expect(screen.getByText(/not affiliated with these services/)).toBeTruthy();
  });

  it('shows the lag note only when laggy', () => {
    setup(16, true);
    expect(
      screen.getByText('Speed is enough, but lag can still cause stalls.'),
    ).toBeTruthy();
  });

  it('hides the lag note otherwise', () => {
    setup(16);
    expect(screen.queryByText(/lag can still cause stalls/)).toBeNull();
  });

  it('has one button, Back to result, that calls onBack', () => {
    const onBack = setup(16);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    fireEvent.press(screen.getByRole('button', {name: 'Back to result'}));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
