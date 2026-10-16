import React, {useCallback, useEffect, useLayoutEffect, useState} from 'react';
import {AppState, BackHandler, StyleSheet, View} from 'react-native';

import {scale, ScreenLayout} from '~/shared/ui';

import {testContent as copy} from '../../content';
import {LatencyCard} from '../components/LatencyCard';
import {LiveReading} from '../components/LiveReading';
import {PhaseSteps} from '../components/PhaseSteps';
import {ServerPill} from '../components/ServerPill';
import {StopDialog} from '../components/StopDialog';
import {TestErrorDialog} from '../components/TestErrorDialog';
import {ThroughputBars} from '../components/ThroughputBars';
import {latencyText, liveLabel, liveUnit, liveValue} from '../liveText';
import {useSession, useSessionStore} from '../SessionProvider';

export interface TestScreenProps {
  online: boolean;
  /** Leaves the screen (Home). */
  onExit: () => void;
  /** The run this screen started finished: show the result. */
  onDone: () => void;
}

export const TestScreen = ({online, onExit, onDone}: TestScreenProps) => {
  const store = useSessionStore();
  const status = useSession((s) => s.status);
  const phase = useSession((s) => s.phase);
  const server = useSession((s) => s.server);
  const liveBps = useSession((s) => s.liveBps);
  const idleMs = useSession((s) => s.idleMs);
  const loadedMs = useSession((s) => s.loadedMs);
  const progress = useSession((s) => s.progress);
  const bars = useSession((s) => s.bars);
  const peakBps = useSession((s) => s.peakBps);
  const error = useSession((s) => s.error);
  const [confirming, setConfirming] = useState(false);

  // A layout effect: its update lands before paint, so the first frame shows
  // this run, not the previous one. Also runs before the effects below, so a
  // mount while offline starts, then fails as connection lost.
  useLayoutEffect(() => {
    store.getState().start();
    return () => store.getState().stop();
  }, [store]);

  // Reads the live state: on mount the render still sees 'done' from the
  // previous run, but the start effect above has already moved it to running.
  useEffect(() => {
    if (status === 'done' && store.getState().status === 'done') {
      onDone();
    }
  }, [status, store, onDone]);

  // Also re-checked on every status change, so a retry while offline fails at once.
  useEffect(() => {
    if (!online && status === 'running') {
      store.getState().fail('network_lost');
    }
  }, [online, status, store]);

  // Only a full background aborts; 'inactive' is a system overlay (e.g. Alexa).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'background' && store.getState().status === 'running') {
        store.getState().stop();
        onExit();
      }
    });
    return () => subscription.remove();
  }, [store, onExit]);

  const failed = status === 'failed';
  const showStop = confirming && !failed;

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (showStop) {
          setConfirming(false);
        } else if (store.getState().status === 'running') {
          setConfirming(true);
        } else {
          onExit();
        }
        return true;
      },
    );
    return () => subscription.remove();
  }, [showStop, store, onExit]);

  const keepTesting = useCallback(() => setConfirming(false), []);
  const stopTest = useCallback(() => {
    store.getState().stop();
    onExit();
  }, [store, onExit]);
  const retry = useCallback(() => {
    setConfirming(false);
    store.getState().start();
  }, [store]);

  const running = status === 'running';

  return (
    <ScreenLayout>
      <PhaseSteps progress={progress} />
      <View style={styles.middle}>
        <View style={styles.live}>
          <LiveReading
            label={liveLabel({status, phase, uploadProgress: progress.upload})}
            value={liveValue(phase, liveBps)}
            unit={liveUnit(phase)}
            blinking={running}
          />
        </View>
        <View style={styles.cards}>
          <LatencyCard
            label={copy.cards.loaded}
            value={latencyText(loadedMs)}
          />
          <LatencyCard label={copy.cards.idle} value={latencyText(idleMs)} />
        </View>
      </View>
      <ThroughputBars bars={bars} peakBps={peakBps} />
      <View style={styles.footer}>
        <ServerPill server={server} blinking={running} />
      </View>
      <StopDialog visible={showStop} onKeep={keepTesting} onStop={stopTest} />
      <TestErrorDialog
        variant={failed ? error : undefined}
        offline={!online}
        onRetry={retry}
        onHome={onExit}
      />
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  middle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(80),
  },
  live: {flex: 1},
  cards: {width: scale(520), gap: scale(20)},
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: scale(32),
  },
});
