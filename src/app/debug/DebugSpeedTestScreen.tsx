import React, {useCallback, useEffect, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {
  isSpeedTestError,
  type DownloadMode,
  type ServerInfo,
  type SpeedTestEngine,
  type SpeedTestResult,
} from '~/modules/speedtest';
import {formatMbps, formatMs} from '~/shared/lib/format';
import {FocusButton, scale, ScreenLayout, Text} from '~/shared/ui';

import {debugContent as copy} from './content';
import {DebugRow} from './DebugRow';
import {applyEngineEvent, type DebugSnapshot} from './debugSnapshot';

export interface DebugSpeedTestScreenProps {
  createEngine: (mode: DownloadMode) => SpeedTestEngine;
}

type RunStatus = 'idle' | 'running' | 'done' | 'failed';

/** Matches the planned ~4 Hz store throttle so the stick sees realistic render load. */
const FLUSH_INTERVAL_MS = 250;

const mbps = (bps?: number) => copy.mbps(formatMbps(bps ?? Number.NaN));
const ms = (value?: number) => copy.ms(formatMs(value ?? Number.NaN));

function describeServer(server?: ServerInfo): string {
  if (!server) {
    return copy.empty;
  }
  const place = [server.city, server.country].filter(Boolean).join(', ');
  return place ? `${server.machine} · ${place}` : server.machine;
}

// Temporary: removed when the real Test UI lands.
export const DebugSpeedTestScreen = ({
  createEngine,
}: DebugSpeedTestScreenProps) => {
  const [mode, setMode] = useState<DownloadMode>('arraybuffer');
  const [status, setStatus] = useState<RunStatus>('idle');
  const [snapshot, setSnapshot] = useState<DebugSnapshot>({});
  const [elapsedMs, setElapsedMs] = useState(0);
  const [result, setResult] = useState<SpeedTestResult>();
  const [errorCode, setErrorCode] = useState<string>();
  const controllerRef = useRef<AbortController | null>(null);
  const latestRef = useRef<DebugSnapshot>({});
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const start = useCallback(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    latestRef.current = {};
    const startedAt = Date.now();
    setSnapshot({});
    setResult(undefined);
    setErrorCode(undefined);
    setElapsedMs(0);
    setStatus('running');

    const flush = () => {
      if (mountedRef.current) {
        setSnapshot(latestRef.current);
        setElapsedMs(Date.now() - startedAt);
      }
    };
    const timer = setInterval(flush, FLUSH_INTERVAL_MS);

    createEngine(mode)
      .run({
        signal: controller.signal,
        onEvent: (event) => {
          latestRef.current = applyEngineEvent(latestRef.current, event);
        },
      })
      .then(
        (value) => {
          if (mountedRef.current) {
            setResult(value);
            setStatus('done');
          }
        },
        (error: unknown) => {
          if (mountedRef.current) {
            setErrorCode(isSpeedTestError(error) ? error.code : 'unknown');
            setStatus('failed');
          }
        },
      )
      .finally(() => {
        clearInterval(timer);
        flush();
      });
  }, [createEngine, mode]);

  const stop = useCallback(() => controllerRef.current?.abort(), []);
  const toggleMode = useCallback(
    () => setMode((m) => (m === 'arraybuffer' ? 'blob' : 'arraybuffer')),
    [],
  );

  const running = status === 'running';

  return (
    <ScreenLayout>
      <View style={styles.content}>
        <Text weight="semibold" style={styles.title}>
          {copy.title}
        </Text>
        <View style={styles.actions}>
          <FocusButton
            label={copy.start}
            variant="primary"
            onPress={start}
            disabled={running}
            hasTVPreferredFocus
          />
          <FocusButton label={copy.stop} onPress={stop} disabled={!running} />
          <FocusButton
            label={copy.mode(mode)}
            onPress={toggleMode}
            disabled={running}
          />
        </View>
        <View style={styles.rows}>
          <DebugRow label={copy.rows.status} value={status} />
          <DebugRow
            label={copy.rows.phase}
            value={snapshot.phase ?? copy.empty}
          />
          <DebugRow
            label={copy.rows.server}
            value={describeServer(result?.server ?? snapshot.server)}
          />
          <DebugRow
            label={copy.rows.download}
            value={mbps(result?.downloadBps ?? snapshot.downloadBps)}
          />
          <DebugRow
            label={copy.rows.upload}
            value={mbps(result?.uploadBps ?? snapshot.uploadBps)}
          />
          <DebugRow
            label={copy.rows.idle}
            value={ms(result?.idleLatencyMs ?? snapshot.idleMs)}
          />
          <DebugRow
            label={copy.rows.loaded}
            value={ms(result?.loadedLatencyMs ?? snapshot.loadedMs)}
          />
          <DebugRow
            label={copy.rows.elapsed}
            value={copy.seconds((elapsedMs / 1000).toFixed(1))}
          />
          <DebugRow label={copy.rows.error} value={errorCode ?? copy.empty} />
        </View>
      </View>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: {flex: 1, gap: scale(40)},
  title: {fontSize: scale(56)},
  actions: {flexDirection: 'row', gap: scale(24)},
  rows: {gap: scale(16)},
});
