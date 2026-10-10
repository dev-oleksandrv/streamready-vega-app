import {NavigationContainer} from '@amazon-devices/react-navigation__native';
import {createNativeStackNavigator} from '@amazon-devices/react-navigation__native-stack';
import React from 'react';
import {StyleSheet, View} from 'react-native';

import {useConsent, useConsentHydrated} from '~/modules/privacy';
import {colors} from '~/shared/ui';

import {AppHeader} from '../layout/AppHeader';
import {SplashScreen} from '../screens/SplashScreen';
import {DebugSpeedTestRoute} from './DebugSpeedTestRoute';
import {HomeRoute} from './HomeRoute';
import {PrivacyRoute} from './PrivacyRoute';
import type {RootStackParamList} from './routes';

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOptions = {
  headerShown: false,
  animation: 'none',
  contentStyle: {backgroundColor: colors.background},
} as const;

export const RootNavigator = () => {
  const hydrated = useConsentHydrated();
  const status = useConsent((s) => s.status);

  if (!hydrated) {
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
          {__DEV__ ? (
            <Stack.Screen
              name="DebugSpeedTest"
              component={DebugSpeedTestRoute}
            />
          ) : null}
        </Stack.Navigator>
      </NavigationContainer>
      <AppHeader />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
});
