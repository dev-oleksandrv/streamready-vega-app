import {createLogger} from '~/shared/lib/logger';

// Sanitized: .example hosts, documentation IPs, fake UUIDs, no real tokens.
export function locateEntry(n: number) {
  return {
    machine: `mlab${n}-tst0${n}.mlab-sandbox.measurement-lab.example`,
    location: {city: `Testville ${n}`, country: 'ZZ'},
    urls: {
      'ws:///ndt/v7/download': `ws://ndt-${n}.example/ndt/v7/download?access_token=REDACTED`,
      'ws:///ndt/v7/upload': `ws://ndt-${n}.example/ndt/v7/upload?access_token=REDACTED`,
    },
  };
}

export const locateResponse = {
  results: [locateEntry(1), locateEntry(2), locateEntry(3), locateEntry(4)],
};

export interface TcpInfoFixture {
  MinRTT?: number;
  RTT?: number;
  BytesReceived?: number;
  ElapsedTime?: number;
}

/** Server Measurement JSON; RTTs and ElapsedTime are microseconds, like ndt7. */
export function measurement(tcp: TcpInfoFixture): string {
  return JSON.stringify({
    ConnectionInfo: {
      Client: '203.0.113.7:54321',
      Server: '203.0.113.10:443',
      UUID: '00000000-0000-4000-8000-000000000000',
    },
    Origin: 'server',
    TCPInfo: tcp,
  });
}

export const jsonResponse = (body: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response);

export const silentLogger = createLogger('test', {enabled: false});
