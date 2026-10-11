import {render, screen} from '@testing-library/react-native';
import React from 'react';

import {Wordmark} from '~/app/layout/Wordmark';
import {colors} from '~/shared/ui';
import {flatStyle} from '../../support/style';

describe('Wordmark', () => {
  it('reads as one word with "Ready" in the lime accent', () => {
    render(<Wordmark />);

    expect(screen.getByText('StreamReady')).toBeTruthy();
    expect(flatStyle(screen.getByTestId('wordmark-accent')).color).toBe(
      colors.lime,
    );
  });
});
