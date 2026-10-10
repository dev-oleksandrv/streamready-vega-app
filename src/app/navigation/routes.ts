import type {PrivacyMode} from '~/modules/privacy';

export type RootStackParamList = {
  Home: undefined;
  Privacy: {mode: PrivacyMode};
  /** Temporary, __DEV__ only. */
  DebugSpeedTest: undefined;
};
