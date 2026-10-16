import {NavigationContainer} from '@amazon-devices/react-navigation__native';
import {createNativeStackNavigator} from '@amazon-devices/react-navigation__native-stack';
import React from 'react';
import {StyleSheet, View} from 'react-native';

import {useConsent, useConsentHydrated} from '~/modules/privacy';
import {colors} from '~/shared/ui';

import {useColdStartInsights} from '../hooks/useColdStartInsights';
import {useNativeSplash} from '../hooks/useNativeSplash';
import {useVpnRefresh} from '../hooks/useVpnRefresh';
import {AppHeader} from '../layout/AppHeader';
import {SplashScreen} from '../screens/SplashScreen';
import {DeviceRoute} from './DeviceRoute';
import {HomeRoute} from './HomeRoute';
import {LatencyRoute} from './LatencyRoute';
import {PrivacyRoute} from './PrivacyRoute';
import {ResultRoute} from './ResultRoute';
import type {RootStackParamList} from './routes';
import {TestRoute} from './TestRoute';

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOptions = {
  headerShown: false,
  animation: 'none',
  contentStyle: {backgroundColor: colors.background},
} as const;

export const RootNavigator = () => {
  const hydrated = useConsentHydrated();
  const status = useConsent((s) => s.status);
  const insightsSettled = useColdStartInsights(hydrated, status);
  useVpnRefresh();
  const ready = hydrated && insightsSettled;
  useNativeSplash(ready);

  if (!ready) {
    return <SplashScreen />;
  }

  // Read once when the stack mounts; later consent changes don't move the root.
  const initialRouteName = status === 'accepted' ? 'Home' : 'Privacy';

  return (
    <View style={styles.root}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={initialRouteName}
          screenOptions={screenOptions}>
          <Stack.Screen name="Home" component={HomeRoute} />
          <Stack.Screen
            name="Privacy"
            component={PrivacyRoute}
            initialParams={{mode: 'gate'}}
          />
          <Stack.Screen name="Device" component={DeviceRoute} />
          <Stack.Screen name="Test" component={TestRoute} />
          <Stack.Screen name="Result" component={ResultRoute} />
          <Stack.Screen name="Latency" component={LatencyRoute} />
        </Stack.Navigator>
      </NavigationContainer>
      <AppHeader />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
});
