import type {PrivacyMode} from '~/modules/privacy';

export type RootStackParamList = {
  Home: undefined;
  Privacy: {mode: PrivacyMode};
  Device: undefined;
  Test: undefined;
  Result: undefined;
  Latency: undefined;
  History: undefined;
};
