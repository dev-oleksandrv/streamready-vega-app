import {useIsFocused} from '@amazon-devices/react-navigation__native';
import type {NativeStackScreenProps} from '@amazon-devices/react-navigation__native-stack';
import React, {useCallback} from 'react';

import {HomeScreen} from '~/modules/home';
import {deviceProfile, deviceSubtitle, useInsights} from '~/modules/insights';
import {useConsent} from '~/modules/privacy';
import {useSession} from '~/modules/speedtest';

import {
  boundedCooldown,
  cooldownSeconds,
  useCooldownClock,
} from '../hooks/useCooldownClock';
import {selectStartCheck} from '../selectors';
import type {RootStackParamList} from './routes';

export const HomeRoute = ({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Home'>) => {
  const consent = useConsent((s) => s.status);
  const network = useInsights((s) => s.network);
  const model = useInsights((s) => s.device?.model);
  const storedCooldown = useSession((s) => s.cooldownUntil);
  // The stack keeps Home mounted under Device and the test; no ticking while hidden.
  const now = useCooldownClock(storedCooldown, useIsFocused());
  const cooldownUntil = boundedCooldown(storedCooldown, now);

  const start = useCallback(() => navigation.navigate('Test'), [navigation]);
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
