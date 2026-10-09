import type {NativeStackScreenProps} from '@amazon-devices/react-navigation__native-stack';
import React, {useCallback} from 'react';

import {PrivacyScreen} from '~/modules/privacy';

import type {RootStackParamList} from './routes';

export const PrivacyRoute = ({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'Privacy'>) => {
  // Reset, not navigate: the gate must not stay in history behind Home.
  const goHome = useCallback(
    () => navigation.reset({index: 0, routes: [{name: 'Home'}]}),
    [navigation],
  );
  const goBack = useCallback(() => navigation.goBack(), [navigation]);
  return (
    <PrivacyScreen
      mode={route.params.mode}
      onAccepted={goHome}
      onBack={goBack}
    />
  );
};
