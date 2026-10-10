import {render, screen} from '@testing-library/react-native';
import React from 'react';

import {ServerPill} from '~/modules/speedtest';

describe('ServerPill', () => {
  it('shows the search state until a server is known', () => {
    render(<ServerPill blinking />);
    expect(screen.getByText('Finding nearest server…')).toBeTruthy();
  });

  it('shows the server name', () => {
    render(
      <ServerPill
        blinking
        server={{machine: 'm', city: 'Frankfurt', country: 'DE'}}
      />,
    );
    expect(screen.getByText('Server')).toBeTruthy();
    expect(screen.getByText('Frankfurt, DE · M‑Lab')).toBeTruthy();
  });
});
