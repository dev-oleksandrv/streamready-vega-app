import {render, screen} from '@testing-library/react-native';
import React from 'react';

import {StreamCheck} from '~/modules/speedtest/ui/components/StreamCheck';
import {colors} from '~/shared/ui';
import {flatStyle} from '../../../../support/style';

describe('StreamCheck', () => {
  it('passed: lime badge with a check', () => {
    render(<StreamCheck label="4K Ultra HD" need="Needs 25 Mbps" passed />);
    expect(screen.getByText('4K Ultra HD')).toBeTruthy();
    expect(screen.getByText('Needs 25 Mbps')).toBeTruthy();
    expect(screen.getByTestId('check-passed')).toBeTruthy();
    expect(flatStyle(screen.getByTestId('check-badge')).backgroundColor).toBe(
      colors.lime,
    );
  });

  it('failed: dark badge with a cross', () => {
    render(
      <StreamCheck
        label="Two 4K TVs at once"
        need="Needs 50 Mbps"
        passed={false}
      />,
    );
    expect(screen.getByTestId('check-failed')).toBeTruthy();
    expect(flatStyle(screen.getByTestId('check-badge')).backgroundColor).toBe(
      colors.failSurface,
    );
  });
});
