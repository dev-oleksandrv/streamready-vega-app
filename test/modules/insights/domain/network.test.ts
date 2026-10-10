import {
  bandFromFrequency,
  INITIAL_NETWORK,
  sameNetwork,
} from '~/modules/insights/domain/network';

describe('bandFromFrequency', () => {
  it.each([
    [null, undefined],
    [undefined, undefined],
    [Number.NaN, undefined],
    [2399, undefined],
    [2400, '2.4'],
    [2437, '2.4'],
    [2500, '2.4'],
    [4899, undefined],
    [4900, '5'],
    [5180, '5'],
    [5900, '5'],
    [5901, undefined],
    [5925, '6'],
    [7125, '6'],
    [7126, undefined],
  ])('%p MHz → %p', (mhz, band) => {
    expect(bandFromFrequency(mhz)).toBe(band);
  });
});

describe('sameNetwork', () => {
  it('compares online, transport and band', () => {
    expect(
      sameNetwork(INITIAL_NETWORK, {online: true, transport: 'other'}),
    ).toBe(true);
    expect(
      sameNetwork(
        {online: true, transport: 'wifi', band: '5'},
        {online: true, transport: 'wifi', band: '5'},
      ),
    ).toBe(true);
    expect(
      sameNetwork(
        {online: true, transport: 'wifi', band: '5'},
        {online: true, transport: 'wifi'},
      ),
    ).toBe(false);
    expect(
      sameNetwork(INITIAL_NETWORK, {online: false, transport: 'none'}),
    ).toBe(false);
  });
});
