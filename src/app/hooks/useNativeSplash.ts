// Imported from the module file, not the package index: the index getters
// read `Platform`, which that file only imports as a type, so they throw.
import {
  useHideSplashScreenCallback,
  usePreventHideSplashScreen,
} from '@amazon-devices/react-native-kepler/Libraries/SplashScreenManager/SplashScreenManager';
import {useEffect} from 'react';

/**
 * Keeps the native splash (assets/raw/SplashScreenImages.zip) up until the
 * app is ready, so launch goes straight from the splash to the first screen.
 * Call it in the first component that mounts: prevent must run before the
 * system hides the splash on its own.
 */
export function useNativeSplash(ready: boolean): void {
  usePreventHideSplashScreen();
  const hide = useHideSplashScreenCallback();

  useEffect(() => {
    if (ready) {
      hide();
    }
  }, [ready, hide]);
}
