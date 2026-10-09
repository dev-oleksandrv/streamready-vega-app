import {
  Ndt7Engine,
  type DownloadMode,
  type Ndt7Socket,
  type SpeedTestEngine,
} from '~/modules/speedtest';

import {APP_VERSION} from '../config/app';

export function createSpeedTestEngine(
  downloadMode: DownloadMode = 'arraybuffer',
): SpeedTestEngine {
  return new Ndt7Engine({
    // The platform WebSocket implements Ndt7Socket at runtime; its typings omit
    // binaryType and bufferedAmount and use DOM event types, hence the cast.
    createSocket: (url, protocol) =>
      new WebSocket(url, protocol) as unknown as Ndt7Socket,
    fetch,
    now: Date.now,
    clientVersion: APP_VERSION,
    downloadMode,
  });
}
