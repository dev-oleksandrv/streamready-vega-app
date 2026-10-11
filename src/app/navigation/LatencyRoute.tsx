import type {NativeStackScreenProps} from '@amazon-devices/react-navigation__native-stack';
import React, {useCallback} from 'react';

import {LatencyScreen, useSession} from '~/modules/speedtest';

import {useResultVerdict} from '../selectors';
import type {RootStackParamList} from './routes';

export const LatencyRoute = ({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Latency'>) => {
  const result = useSession((s) => s.result);
  const verdict = useResultVerdict(result);
  const back = useCallback(() => navigation.goBack(), [navigation]);

  // Latency only opens on top of Result, whose route leaves for Home when the
  // result is gone; until then there is nothing to draw.
  if (!result || !verdict) {
    return null;
  }
  return <LatencyScreen result={result} verdict={verdict} onBack={back} />;
};
