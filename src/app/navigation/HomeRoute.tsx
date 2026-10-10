import type {NativeStackScreenProps} from '@amazon-devices/react-navigation__native-stack';
import React, {useCallback} from 'react';

import {HomeScreen} from '~/modules/home';
import {deviceProfile, deviceSubtitle, useInsights} from '~/modules/insights';
import {useConsent} from '~/modules/privacy';
import {useSession} from '~/modules/speedtest';

import {cooldownSeconds, useCooldownClock} from '../hooks/useCooldownClock';
import {selectStartCheck} from '../selectors';
import type {RootStackParamList} from './routes';

export const HomeRoute = ({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Home'>) => {
  const consent = useConsent((s) => s.status);
  const network = useInsights((s) => s.network);
  const model = useInsights((s) => s.device?.model);
  const cooldownUntil = useSession((s) => s.cooldownUntil);
  const now = useCooldownClock(cooldownUntil);

  // Until the Test module lands, Start opens the debug test in dev and does nothing in release.
  const start = useCallback(() => {
    if (__DEV__) {
      navigation.navigate('DebugSpeedTest');
    }
  }, [navigation]);
  const openDevice = useCallback(
    () => navigation.navigate('Device'),
    [navigation],
  );
  const openPrivacy = useCallback(
    () => navigation.navigate('Privacy', {mode: 'view'}),
    [navigation],
  );

  return (
    <HomeScreen
      start={selectStartCheck({consent, network, cooldownUntil, now})}
      cooldownSeconds={cooldownSeconds(cooldownUntil, now)}
      deviceSubtitle={deviceSubtitle(network, deviceProfile(model))}
      onStart={start}
      onOpenDevice={openDevice}
      onOpenPrivacy={openPrivacy}
    />
  );
};
