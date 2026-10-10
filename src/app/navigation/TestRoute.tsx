import type {NativeStackScreenProps} from '@amazon-devices/react-navigation__native-stack';
import React, {useCallback} from 'react';

import {useInsights} from '~/modules/insights';
import {TestScreen} from '~/modules/speedtest';

import type {RootStackParamList} from './routes';

export const TestRoute = ({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Test'>) => {
  const online = useInsights((s) => s.network.online);
  // Home is always the stack root once the test can start.
  const exit = useCallback(() => navigation.popToTop(), [navigation]);
  return <TestScreen online={online} onExit={exit} />;
};
