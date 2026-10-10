import {render, screen} from '@testing-library/react-native';
import React from 'react';

import {App} from '~/App';

jest.mock('~/shared/lib/storage', () => {
  const actual = jest.requireActual('~/shared/lib/storage');
  return {...actual, createAsyncStorage: () => actual.createMemoryStorage()};
});

jest.mock('~/app/providers/geoProvider', () => ({
  createGeoProvider: () => ({id: 'none', lookup: () => new Promise(() => {})}),
}));

describe('App', () => {
  // The production device source logs the codename once in dev builds.
  beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it('boots into the privacy gate on first launch', async () => {
    render(<App />);
    expect(await screen.findByText('Before you start.')).toBeTruthy();
    expect(screen.getByText('StreamReady')).toBeTruthy();
  });
});
