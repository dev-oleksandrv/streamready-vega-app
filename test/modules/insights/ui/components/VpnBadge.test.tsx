import {render, screen} from '@testing-library/react-native';
import React from 'react';

import {VpnBadge} from '~/modules/insights';
import {colors} from '~/shared/ui';
import {flatStyle} from '../../../../support/style';

describe('VpnBadge', () => {
  it('shows the label in amber with the shield', () => {
    render(<VpnBadge />);
    expect(flatStyle(screen.getByText('VPN on')).color).toBe(colors.amber);
    expect(screen.getByTestId('vpn-shield')).toBeTruthy();
  });
});
