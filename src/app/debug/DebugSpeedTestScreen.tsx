import React, {useCallback, useEffect, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {
  DEFAULT_UPLOAD_WINDOW_BYTES,
  isSpeedTestError,
  UPLOAD_WINDOW_OPTIONS,
  type DownloadMode,
  type ServerInfo,
  type SpeedTestEngine,
  type SpeedTestResult,
} from '~/modules/speedtest';
import {formatMbps, formatMs} from '~/shared/lib/format';
import {FocusButton, scale, ScreenLayout, Text} from '~/shared/ui';

import {
  ENGINE_CHOICES,
  type EngineChoice,
  type SpeedTestEngineConfig,
} from '../providers/speedTestEngine';
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
  download: StallStats;
  upload: StallStats;
}

const noStalls: PhaseStalls = {download: emptyStall, upload: emptyStall};

export interface DebugSpeedTestScreenProps {
  createEngine: (config: SpeedTestEngineConfig) => SpeedTestEngine;
  /** Whether the Ndt7Native Turbo Module loaded on this build. */
  nativeAvailable: boolean;
}

type RunStatus = 'idle' | 'running' | 'done' | 'failed';

/** Matches the planned ~4 Hz store throttle so the stick sees realistic render load. */
const FLUSH_INTERVAL_MS = 250;

function nextUploadWindow(current: number): number {
  const index = UPLOAD_WINDOW_OPTIONS.findIndex((w) => w === current);
  return UPLOAD_WINDOW_OPTIONS[(index + 1) % UPLOAD_WINDOW_OPTIONS.length];
}

function nextEngine(current: EngineChoice): EngineChoice {
  const index = ENGINE_CHOICES.indexOf(current);
  return ENGINE_CHOICES[(index + 1) % ENGINE_CHOICES.length];
}

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
  const [engine, setEngine] = useState<EngineChoice>('auto');
  const [mode, setMode] = useState<DownloadMode>('arraybuffer');
  const [uploadWindow, setUploadWindow] = useState<number>(
    DEFAULT_UPLOAD_WINDOW_BYTES,
  );
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
    stallsRef.current = noStalls;
    setStalls(noStalls);

    let lastProbe = Date.now();
    const probe = setInterval(() => {
      const probedAt = Date.now();
      const late = probedAt - lastProbe - STALL_PROBE_INTERVAL_MS;
      lastProbe = probedAt;
      const phase = latestRef.current.phase;
      if (phase === 'download' || phase === 'upload') {
        stallsRef.current = {
          ...stallsRef.current,
          [phase]: recordStall(stallsRef.current[phase], late),
        };
      }
    }, STALL_PROBE_INTERVAL_MS);

    const flush = () => {
      if (mountedRef.current) {
        setSnapshot(latestRef.current);
        setElapsedMs(Date.now() - startedAt);
        setStalls(stallsRef.current);
      }
    };
    const timer = setInterval(flush, FLUSH_INTERVAL_MS);

    createEngine({engine, downloadMode: mode, uploadWindowBytes: uploadWindow})
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
        clearInterval(probe);
        flush();
      });
  }, [createEngine, engine, mode, uploadWindow]);

  const stop = useCallback(() => controllerRef.current?.abort(), []);
  const toggleMode = useCallback(
    () => setMode((m) => (m === 'arraybuffer' ? 'blob' : 'arraybuffer')),
    [],
  );

  const toggleEngine = useCallback(() => setEngine(nextEngine), []);

  const toggleUploadWindow = useCallback(
    () => setUploadWindow(nextUploadWindow),
    [],
  );

  const running = status === 'running';
  const jsOnlyDisabled = running || engine !== 'js';

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
            label={copy.engine(engine, engine === 'native' && !nativeAvailable)}
            onPress={toggleEngine}
            disabled={running}
          />
          <FocusButton
            label={copy.mode(mode)}
            onPress={toggleMode}
            disabled={jsOnlyDisabled}
          />
          <FocusButton
            label={copy.window(
              copy.kib(uploadWindow),
              uploadWindow > DEFAULT_UPLOAD_WINDOW_BYTES,
            )}
            onPress={toggleUploadWindow}
            disabled={jsOnlyDisabled}
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
          <DebugRow
            label={copy.rows.window}
            value={
              result?.uploadWindowBytes === undefined
                ? copy.empty
                : copy.kib(result.uploadWindowBytes)
            }
          />
          <DebugRow
            label={copy.rows.engineUsed}
            value={result?.engineId ?? copy.empty}
          />
          <DebugRow
            label={copy.rows.nativeModule}
            value={nativeAvailable ? copy.present : copy.missing}
          />
          <DebugRow
            label={copy.rows.stallDownload}
            value={stallText(stalls.download)}
          />
          <DebugRow
            label={copy.rows.stallUpload}
            value={stallText(stalls.upload)}
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
