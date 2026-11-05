import {isUsableMediaFile, pickMediaFile, type MediaFile} from '~/modules/ads';

const file = (
  height: number,
  bitrateKbps: number | undefined,
  overrides: Partial<MediaFile> = {},
): MediaFile => ({
  uri: `https://cdn.ads.example/${height}-${bitrateKbps ?? 'x'}.mp4`,
  type: 'video/mp4',
  delivery: 'progressive',
  width: Math.round((height * 16) / 9),
  height,
  bitrateKbps,
  ...overrides,
});

const screen1080 = {maxWidth: 1920, maxHeight: 1080};
const mbps = (n: number) => n * 1_000_000;

describe('pickMediaFile', () => {
  it('picks the smallest file of at least 720p within half the measured speed', () => {
    const files = [file(1080, 4500), file(720, 2500), file(540, 1200)];
    expect(pickMediaFile(files, {...screen1080, downloadBps: mbps(50)})).toBe(
      files[1],
    );
  });

  it('takes 1080p when 720p is missing and the speed allows it', () => {
    const files = [file(1080, 4500), file(360, 600)];
    expect(pickMediaFile(files, {...screen1080, downloadBps: mbps(9)})).toBe(
      files[0],
    );
  });

  it.each([
    // 2500 kbps needs 5 Mbps measured; at exactly 5 Mbps it fits.
    [mbps(5), '720-2500'],
    [mbps(5) - 1, '540-1200'],
  ])('respects the bitrate budget at %i bps', (downloadBps, expected) => {
    const files = [file(720, 2500), file(540, 1200)];
    expect(pickMediaFile(files, {...screen1080, downloadBps})?.uri).toContain(
      expected,
    );
  });

  it('falls back to the lowest bitrate that fits the screen', () => {
    const files = [file(1080, 4500), file(720, 2500), file(540, 1200)];
    expect(pickMediaFile(files, {...screen1080, downloadBps: mbps(1)})).toBe(
      files[2],
    );
  });

  it('never picks a file larger than the screen', () => {
    const files = [file(2160, 12000), file(1080, 4500)];
    expect(
      pickMediaFile(files, {
        maxWidth: 1280,
        maxHeight: 720,
        downloadBps: mbps(100),
      }),
    ).toBeUndefined();
    expect(pickMediaFile(files, {...screen1080, downloadBps: mbps(100)})).toBe(
      files[1],
    );
  });

  it('prefers files with a known bitrate', () => {
    const files = [file(720, undefined), file(1080, 4000)];
    expect(pickMediaFile(files, {...screen1080, downloadBps: mbps(100)})).toBe(
      files[1],
    );
    expect(
      pickMediaFile([files[0] as MediaFile], {
        ...screen1080,
        downloadBps: mbps(100),
      }),
    ).toBe(files[0]);
  });

  it('ignores non-mp4 and streaming files', () => {
    const files = [
      file(720, 2000, {type: 'video/webm'}),
      file(720, 2000, {delivery: 'streaming'}),
      file(720, 2000, {type: 'application/x-mpegURL'}),
    ];
    expect(
      pickMediaFile(files, {...screen1080, downloadBps: mbps(100)}),
    ).toBeUndefined();
  });

  it('returns undefined for no files', () => {
    expect(
      pickMediaFile([], {...screen1080, downloadBps: mbps(100)}),
    ).toBeUndefined();
  });
});

describe('isUsableMediaFile', () => {
  it.each([
    [file(720, 2000), true],
    [file(720, 2000, {type: 'VIDEO/MP4'}), true],
    [file(720, 2000, {type: 'video/webm'}), false],
    [file(720, 2000, {delivery: 'streaming'}), false],
    [file(720, 2000, {width: 0}), false],
    [file(720, 2000, {uri: 'http://cdn.ads.example/a.mp4'}), true],
    [file(720, 2000, {uri: 'ftp://cdn.ads.example/a.mp4'}), false],
  ])('%o → %s', (f, usable) => {
    expect(isUsableMediaFile(f)).toBe(usable);
  });
});
