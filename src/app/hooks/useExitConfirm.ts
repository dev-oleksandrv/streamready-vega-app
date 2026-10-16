import {useCallback, useEffect, useRef, useState} from 'react';
import {BackHandler} from 'react-native';

export interface ExitConfirm {
  visible: boolean;
  stay: () => void;
  exit: () => void;
}

/**
 * Asks before Back leaves the app. Subscribed once, before the navigator
 * mounts: Back handlers run newest first, so this one only sees a press that
 * no screen and no route could take (nothing left to go back to).
 */
export function useExitConfirm(ready: boolean): ExitConfirm {
  const [visible, setVisible] = useState(false);
  // Read inside the Back handler, which is subscribed once.
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        // During the splash Back keeps the system default.
        if (!readyRef.current) {
          return false;
        }
        setVisible(!visibleRef.current);
        return true;
      },
    );
    return () => subscription.remove();
  }, []);

  const stay = useCallback(() => setVisible(false), []);
  // Closed first, so the app doesn't come back from the background on it.
  const exit = useCallback(() => {
    setVisible(false);
    BackHandler.exitApp();
  }, []);

  return {visible, stay, exit};
}
