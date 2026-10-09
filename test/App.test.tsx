import {render, screen} from '@testing-library/react-native';
import React from 'react';

import {App} from '~/App';

describe('App', () => {
  it('renders the app name', () => {
    render(<App />);
    expect(screen.getByText('StreamReady')).toBeTruthy();
  });
});
