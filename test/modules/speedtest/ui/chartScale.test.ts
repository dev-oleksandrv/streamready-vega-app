import {barFraction, chartTopBps} from '~/modules/speedtest/ui/chartScale';

describe('chartTopBps', () => {
  it.each([
    [0, 1e6],
    [500_000, 1e6],
    [1e6, 1.5e6],
    [8e6, 10e6],
    [9e6, 15e6],
    [17e6, 20e6],
    [26e6, 30e6],
    [40e6, 50e6],
    [60e6, 75e6],
    [86.9e6, 100e6],
    [87e6, 150e6],
    [186.4e6, 300e6],
    [900e6, 1.5e9],
  ])('peak %d bps → top %d bps', (peak, top) => {
    expect(chartTopBps(peak)).toBe(top);
  });

  it('keeps the same top while the peak grows within a step', () => {
    expect(chartTopBps(50e6)).toBe(chartTopBps(60e6));
  });
});

describe('barFraction', () => {
  it('is the share of the top, with a visible minimum and capped at 1', () => {
    expect(barFraction(50e6, 100e6)).toBe(0.5);
    expect(barFraction(0, 100e6)).toBe(0.02);
    expect(barFraction(150e6, 100e6)).toBe(1);
  });
});
