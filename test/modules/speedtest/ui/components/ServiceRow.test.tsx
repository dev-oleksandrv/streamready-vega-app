import {render, screen} from '@testing-library/react-native';
import React from 'react';

import {ServiceRow} from '~/modules/speedtest/ui/components/ServiceRow';
import {SERVICES, serviceVerdicts} from '~/modules/verdict';

const rowFor = (mbps: number, index: number) =>
  serviceVerdicts(mbps * 1e6)[index];
const NETFLIX = 0;
const YOUTUBE = 2;

describe('ServiceRow', () => {
  it('shows the best tier and the next one', () => {
    render(<ServiceRow row={rowFor(16, YOUTUBE)} />);
    expect(screen.getByText('YouTube')).toBeTruthy();
    expect(screen.getByText('Full HD 1080p')).toBeTruthy();
    expect(screen.getByText('4K Ultra HD · Needs 20 Mbps')).toBeTruthy();
  });

  it('has no next line at the top tier', () => {
    render(<ServiceRow row={rowFor(16, NETFLIX)} />);
    expect(screen.getByText('4K Ultra HD')).toBeTruthy();
    expect(screen.queryByText(/·/)).toBeNull();
  });

  it('shows the none text and the lowest tier below HD', () => {
    render(<ServiceRow row={rowFor(1, YOUTUBE)} />);
    expect(screen.getByText('Not enough for HD')).toBeTruthy();
    expect(screen.getByText('HD 720p · Needs 2.5 Mbps')).toBeTruthy();
  });

  it('is not focusable', () => {
    render(<ServiceRow row={rowFor(16, NETFLIX)} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(SERVICES[NETFLIX].id).toBe('netflix');
  });
});
