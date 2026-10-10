import {fireEvent, render, screen} from '@testing-library/react-native';
import React from 'react';

import {TestErrorDialog} from '~/modules/speedtest/ui/components/TestErrorDialog';

const handlers = () => ({onRetry: jest.fn(), onHome: jest.fn()});

describe('TestErrorDialog', () => {
  it('renders nothing without a variant', () => {
    render(<TestErrorDialog offline={false} {...handlers()} />);
    expect(screen.queryByRole('button', {name: 'Try again'})).toBeNull();
  });

  it.each([
    ['connectionLost', 'Connection lost.'],
    ['serversUnavailable', 'Test servers are busy.'],
    ['interrupted', "The test didn't finish."],
  ] as const)('%s shows its title and both actions', (variant, title) => {
    const h = handlers();
    render(<TestErrorDialog variant={variant} offline={false} {...h} />);
    expect(screen.getByText(title)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', {name: 'Try again'}));
    fireEvent.press(screen.getByRole('button', {name: 'Back to home'}));
    expect(h.onRetry).toHaveBeenCalledTimes(1);
    expect(h.onHome).toHaveBeenCalledTimes(1);
  });

  it('connection lost while offline: retry disabled with a hint', () => {
    const h = handlers();
    render(<TestErrorDialog variant="connectionLost" offline {...h} />);
    expect(screen.getByText('Waiting for connection…')).toBeTruthy();
    const retry = screen.getByRole('button', {name: 'Try again'});
    expect(retry.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(retry);
    expect(h.onRetry).not.toHaveBeenCalled();
  });

  it('other variants ignore offline', () => {
    render(<TestErrorDialog variant="interrupted" offline {...handlers()} />);
    expect(screen.queryByText('Waiting for connection…')).toBeNull();
  });
});
