import type {NativeStackScreenProps} from '@amazon-devices/react-navigation__native-stack';
import React, {useCallback} from 'react';

import {DeviceScreen, useInsights} from '~/modules/insights';

import {APP_VERSION} from '../config/app';
import {useVisibleConnection} from '../selectors';
import type {RootStackParamList} from './routes';

export const DeviceRoute = ({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Device'>) => {
  const device = useInsights((s) => s.device);
  const network = useInsights((s) => s.network);
  const connection = useVisibleConnection();
  const goBack = useCallback(() => navigation.goBack(), [navigation]);
  return (
    <DeviceScreen
      device={device}
      network={network}
      connection={connection}
      appVersion={APP_VERSION}
      onBack={goBack}
    />
  );
};
