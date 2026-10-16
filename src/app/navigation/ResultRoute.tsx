import {useIsFocused} from '@amazon-devices/react-navigation__native';
import type {NativeStackScreenProps} from '@amazon-devices/react-navigation__native-stack';
import React, {useCallback, useEffect} from 'react';

import {useInsights} from '~/modules/insights';
import {useConsent} from '~/modules/privacy';
import {ResultScreen, useSession} from '~/modules/speedtest';

import {
  boundedCooldown,
  cooldownSeconds,
  useCooldownClock,
} from '../hooks/useCooldownClock';
import {selectStartCheck, useResultVerdict} from '../selectors';
import type {RootStackParamList} from './routes';

export const ResultRoute = ({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Result'>) => {
  const result = useSession((s) => s.result);
  const storedCooldown = useSession((s) => s.cooldownUntil);
  const consent = useConsent((s) => s.status);
  const network = useInsights((s) => s.network);
  const view = useResultVerdict(result);
  // Latency stacks on top of Result; no ticking while hidden.
  const now = useCooldownClock(storedCooldown, useIsFocused());
  const cooldownUntil = boundedCooldown(storedCooldown, now);

  const missing = !result || !view;
  // Nothing to show (state lost); Home is always the stack root here.
  useEffect(() => {
    if (missing) {
      navigation.popToTop();
    }
  }, [missing, navigation]);

  const testAgain = useCallback(() => navigation.replace('Test'), [navigation]);
  const back = useCallback(() => navigation.popToTop(), [navigation]);
  const openLatency = useCallback(
    () => navigation.navigate('Latency'),
    [navigation],
  );
  const openHistory = useCallback(
    () => navigation.navigate('History'),
    [navigation],
  );

  if (!result || !view) {
    return null;
  }
  return (
    <ResultScreen
      result={result}
      verdict={view.verdict}
      deviceLimitMbps={view.deviceLimitMbps}
      now={now}
      startCheck={selectStartCheck({consent, network, cooldownUntil, now})}
      cooldownSeconds={cooldownSeconds(cooldownUntil, now)}
      onTestAgain={testAgain}
      onBack={back}
      onOpenLatency={openLatency}
      onOpenHistory={openHistory}
    />
  );
};
