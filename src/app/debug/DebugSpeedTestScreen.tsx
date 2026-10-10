import React, {useCallback, useEffect, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {
  isSpeedTestError,
  type ServerInfo,
  type SpeedTestEngine,
  type SpeedTestResult,
} from '~/modules/speedtest';
import {formatMbps, formatMs} from '~/shared/lib/format';
import {FocusButton, scale, ScreenLayout, Text} from '~/shared/ui';

import {debugContent as copy} from './content';
import {DebugRow} from './DebugRow';
import {applyEngineEvent, type DebugSnapshot} from './debugSnapshot';
import {
  emptyStall,
  recordStall,
  STALL_PROBE_INTERVAL_MS,
  summarizeStall,
  type StallStats,
} from './stallMeter';

interface PhaseStalls {
  /** No test running, same 4 Hz re-render: the screen's own baseline. */
  idle: StallStats;
  download: StallStats;
  upload: StallStats;
}

const noStalls: PhaseStalls = {
  idle: emptyStall,
  download: emptyStall,
  upload: emptyStall,
};

export interface DebugSpeedTestScreenProps {
  createEngine: () => SpeedTestEngine;
  /** Whether the Ndt7Native Turbo Module loaded on this build. */
  nativeAvailable: boolean;
}

type RunStatus = 'idle' | 'running' | 'done' | 'failed';

/** Matches the planned ~4 Hz store throttle so the stick sees realistic render load. */
const FLUSH_INTERVAL_MS = 250;

function stallText(stats: StallStats): string {
  const summary = summarizeStall(stats);
  return summary ? copy.stall(summary.maxMs, summary.avgMs) : copy.empty;
}

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
  nativeAvailable,
}: DebugSpeedTestScreenProps) => {
  const [status, setStatus] = useState<RunStatus>('idle');
  const [snapshot, setSnapshot] = useState<DebugSnapshot>({});
  const [elapsedMs, setElapsedMs] = useState(0);
  const [result, setResult] = useState<SpeedTestResult>();
  const [errorCode, setErrorCode] = useState<string>();
  const [stalls, setStalls] = useState<PhaseStalls>(noStalls);
  const stallsRef = useRef<PhaseStalls>(noStalls);
  const controllerRef = useRef<AbortController | null>(null);
  const latestRef = useRef<DebugSnapshot>({});
  const mountedRef = useRef(true);
  const runningRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  // The probe runs for the screen's lifetime so the idle row gives a baseline
  // to compare the download/upload stalls against.
  useEffect(() => {
    let lastProbe = Date.now();
    const probe = setInterval(() => {
      const probedAt = Date.now();
      const late = probedAt - lastProbe - STALL_PROBE_INTERVAL_MS;
      lastProbe = probedAt;
      const phase = runningRef.current ? latestRef.current.phase : 'idle';
      if (phase === 'idle' || phase === 'download' || phase === 'upload') {
        stallsRef.current = {
          ...stallsRef.current,
          [phase]: recordStall(stallsRef.current[phase], late),
        };
      }
    }, STALL_PROBE_INTERVAL_MS);
    // While a test runs, start()'s flush renders at the same rate.
    const idleFlush = setInterval(() => {
      if (!runningRef.current) {
        setStalls(stallsRef.current);
      }
    }, FLUSH_INTERVAL_MS);
    return () => {
      clearInterval(probe);
      clearInterval(idleFlush);
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
    runningRef.current = true;
    stallsRef.current = {...noStalls, idle: stallsRef.current.idle};
    setStalls(stallsRef.current);

    const flush = () => {
      if (mountedRef.current) {
        setSnapshot(latestRef.current);
        setElapsedMs(Date.now() - startedAt);
        setStalls(stallsRef.current);
      }
    };
    const timer = setInterval(flush, FLUSH_INTERVAL_MS);

    createEngine()
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
        runningRef.current = false;
        clearInterval(timer);
        flush();
      });
  }, [createEngine]);

  const stop = useCallback(() => controllerRef.current?.abort(), []);

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
        </View>
        {/* Two columns: one column of all rows does not fit 1080p. */}
        <View style={styles.rows}>
          <View style={styles.column}>
            <DebugRow label={copy.rows.status} value={status} />
            <DebugRow label={copy.rows.error} value={errorCode ?? copy.empty} />
            <DebugRow
              label={copy.rows.phase}
              value={snapshot.phase ?? copy.empty}
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
          </View>
          <View style={styles.column}>
            <DebugRow
              label={copy.rows.server}
              value={describeServer(result?.server ?? snapshot.server)}
            />
            <DebugRow
              label={copy.rows.nativeModule}
              value={nativeAvailable ? copy.present : copy.missing}
            />
            <DebugRow
              label={copy.rows.stallIdle}
              value={stallText(stalls.idle)}
            />
            <DebugRow
              label={copy.rows.stallDownload}
              value={stallText(stalls.download)}
            />
            <DebugRow
              label={copy.rows.stallUpload}
              value={stallText(stalls.upload)}
            />
          </View>
        </View>
      </View>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: {flex: 1, gap: scale(40)},
  title: {fontSize: scale(56)},
  actions: {flexDirection: 'row', gap: scale(24)},
  rows: {flexDirection: 'row', gap: scale(64)},
  column: {flex: 1, gap: scale(16)},
});
