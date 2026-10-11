import type {NativeStackScreenProps} from '@amazon-devices/react-navigation__native-stack';
import React, {useCallback, useEffect} from 'react';

import {LatencyScreen, useSession} from '~/modules/speedtest';

import {useResultVerdict} from '../selectors';
import type {RootStackParamList} from './routes';

export const LatencyRoute = ({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Latency'>) => {
  const result = useSession((s) => s.result);
  const verdict = useResultVerdict(result);

  const missing = !result || !verdict;
  // Nothing to show (state lost); Home is always the stack root here.
  useEffect(() => {
    if (missing) {
      navigation.popToTop();
    }
  }, [missing, navigation]);

  const back = useCallback(() => navigation.goBack(), [navigation]);

  if (!result || !verdict) {
    return null;
  }
  return <LatencyScreen result={result} verdict={verdict} onBack={back} />;
};
