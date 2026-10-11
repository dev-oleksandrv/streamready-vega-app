import {render, screen} from '@testing-library/react-native';
import React from 'react';

import {DownloadCard} from '~/modules/speedtest/ui/components/DownloadCard';

describe('DownloadCard', () => {
  it('shows value, unit and the note', () => {
    render(
      <DownloadCard label="Download" value="186" unit="Mbps" note="Near it" />,
    );
    expect(screen.getByText('186')).toBeTruthy();
    expect(screen.getByText('Mbps')).toBeTruthy();
    expect(screen.getByText('Near it')).toBeTruthy();
  });

  it('omits the note when absent', () => {
    render(<DownloadCard label="Download" value="17.4" unit="Mbps" />);
    expect(screen.queryByText('Near it')).toBeNull();
  });
});
