import {render, screen} from '@testing-library/react-native';
import React from 'react';

import {App} from '~/App';

jest.mock('~/shared/lib/storage', () => {
  const actual = jest.requireActual('~/shared/lib/storage');
  return {...actual, createAsyncStorage: () => actual.createMemoryStorage()};
});

describe('App', () => {
  it('boots into the privacy gate on first launch', async () => {
    render(<App />);
    expect(await screen.findByText('Before you start.')).toBeTruthy();
    expect(screen.getByText('StreamReady')).toBeTruthy();
  });
});
