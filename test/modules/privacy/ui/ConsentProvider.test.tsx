import {act, render, screen} from '@testing-library/react-native';
import React, {Component, type ReactNode} from 'react';
import {Text} from 'react-native';

import {
  ConsentProvider,
  createConsentStore,
  useConsent,
  useConsentHydrated,
  useOnConsentAccepted,
} from '~/modules/privacy';
import {createMemoryStorage, type KeyValueStorage} from '~/shared/lib/storage';

const Probe = () => {
  const hydrated = useConsentHydrated();
  const status = useConsent((s) => s.status);
  return <Text>{`${hydrated ? 'hydrated' : 'loading'}:${status}`}</Text>;
};

describe('ConsentProvider', () => {
  beforeEach(() => {
    // Failure paths log by design; keep the output clean.
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('hydrates the store and reports it', async () => {
    const storage = createMemoryStorage({
      'streamready.consent': JSON.stringify({
        state: {status: 'accepted'},
        version: 1,
      }),
    });
    render(
      <ConsentProvider
        store={createConsentStore(storage)}
        onConsentAccepted={jest.fn()}>
        <Probe />
      </ConsentProvider>,
    );
    expect(screen.getByText('loading:pending')).toBeTruthy();
    expect(await screen.findByText('hydrated:accepted')).toBeTruthy();
  });

  it('reports hydrated even when storage fails', async () => {
    const storage: KeyValueStorage = {
      getItem: jest.fn().mockRejectedValue(new Error('disk')),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };
    render(
      <ConsentProvider
        store={createConsentStore(storage)}
        onConsentAccepted={jest.fn()}>
        <Probe />
      </ConsentProvider>,
    );
    expect(await screen.findByText('hydrated:pending')).toBeTruthy();
  });

  it('gives up waiting after the hydration timeout', async () => {
    jest.useFakeTimers();
    const storage: KeyValueStorage = {
      getItem: () => new Promise(() => {}),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };
    render(
      <ConsentProvider
        store={createConsentStore(storage)}
        onConsentAccepted={jest.fn()}>
        <Probe />
      </ConsentProvider>,
    );
    expect(screen.getByText('loading:pending')).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(screen.getByText('hydrated:pending')).toBeTruthy();
    jest.useRealTimers();
  });

  it('re-renders on store changes and exposes onConsentAccepted', async () => {
    const store = createConsentStore(createMemoryStorage());
    const task = jest.fn().mockResolvedValue(undefined);
    let exposed: (() => Promise<void>) | undefined;
    const Grab = () => {
      exposed = useOnConsentAccepted();
      return null;
    };
    render(
      <ConsentProvider store={store} onConsentAccepted={task}>
        <Probe />
        <Grab />
      </ConsentProvider>,
    );
    await screen.findByText('hydrated:pending');
    act(() => store.getState().accept());
    expect(screen.getByText('hydrated:accepted')).toBeTruthy();
    expect(exposed).toBe(task);
  });

  it('throws a clear error outside the provider', () => {
    // React 19 reports render errors instead of rethrowing; catch it like an app would.
    class Boundary extends Component<{children: ReactNode}, {error?: Error}> {
      override state: {error?: Error} = {};
      static getDerivedStateFromError(error: Error) {
        return {error};
      }
      override render() {
        return this.state.error ? (
          <Text>{this.state.error.message}</Text>
        ) : (
          this.props.children
        );
      }
    }
    jest.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <Boundary>
        <Probe />
      </Boundary>,
    );
    expect(screen.getByText('ConsentProvider is missing')).toBeTruthy();
    jest.restoreAllMocks();
  });
});
