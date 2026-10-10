import type {NativeStackScreenProps} from '@amazon-devices/react-navigation__native-stack';
import React, {useCallback} from 'react';

import {HomeScreen} from '~/modules/home';

import type {RootStackParamList} from './routes';

export const HomeRoute = ({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Home'>) => {
  const openPrivacy = useCallback(
    () => navigation.navigate('Privacy', {mode: 'view'}),
    [navigation],
  );
  const openDebug = useCallback(
    () => navigation.navigate('DebugSpeedTest'),
    [navigation],
  );
  return (
    <HomeScreen
      onOpenPrivacy={openPrivacy}
      onOpenDebug={__DEV__ ? openDebug : undefined}
    />
  );
};
