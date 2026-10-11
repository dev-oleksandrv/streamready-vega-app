/* eslint-env jest */
// Fills gaps in the kepler jest preset's mocks; see each factory for why.

// The preset mocks BackHandler without a default export, so react-navigation crashes on
// mount. The kepler index resolves the platform file, hence the explicit `.kepler` path.
jest.mock(
  '@amazon-devices/react-native-kepler/Libraries/Utilities/BackHandler.kepler',
  () => ({
    __esModule: true,
    default: require('./fakeBackHandler').fakeBackHandler,
  }),
);

// The preset's AppState mock never calls listeners; background abort needs them.
jest.mock(
  '@amazon-devices/react-native-kepler/Libraries/AppState/AppState',
  () => ({
    __esModule: true,
    default: require('./fakeAppState').fakeAppState,
  }),
);

// The preset's addEventListener returns undefined; useWindowDimensions needs a subscription.
jest.mock(
  '@amazon-devices/react-native-kepler/Libraries/Utilities/Dimensions',
  () => {
    const window = {fontScale: 2, height: 1334, scale: 2, width: 750};
    return {
      __esModule: true,
      default: {
        get: () => window,
        set: jest.fn(),
        addEventListener: () => ({remove: () => {}}),
      },
    };
  },
);

// The native splash manager is a TurboModule the preset does not mock.
// Hide is a shared spy so tests can assert when the native splash goes away.
jest.mock(
  '@amazon-devices/react-native-kepler/Libraries/SplashScreenManager/SplashScreenManager',
  () => require('./fakeSplashScreen').fakeSplashScreenManager,
);

// Infinite loops (Spinner) would tick on real timers and update outside act().
// Animations are not under test, so loops start and stop as no-ops. Patched in
// place: mocking the Animated module creates a require cycle with ScrollView.
const {Animated} = require('react-native');
Animated.loop = () => ({start: () => {}, stop: () => {}, reset: () => {}});

// Native Vega packages: production adapters import them at module load. Tests
// inject fakes into the adapters; these stubs only keep imports from touching
// native code. fetch never settles, so a default monitor causes no store update.
jest.mock('@amazon-devices/keplerscript-netmgr-lib', () => ({
  configure: () => {},
  fetch: () => new Promise(() => {}),
  addEventListener: () => () => {},
}));

jest.mock('@amazon-devices/react-native-device-info', () => ({
  __esModule: true,
  default: {getModel: () => 'unknown', getSystemVersion: () => 'unknown'},
}));

// MMKV is a native module; an in-memory stand-in keeps storage imports working.
// Each instance gets its own map, so tests never share persisted state.
jest.mock('@amazon-devices/react-native-mmkv', () => ({
  MMKV: class {
    private data = new Map<string, string>();
    getString(key: string) {
      return this.data.get(key);
    }
    set(key: string, value: string) {
      this.data.set(key, value);
    }
    delete(key: string) {
      this.data.delete(key);
    }
  },
}));

// The Vega SVG port logs every native component it registers at import, in
// every test that touches shared/ui. Host elements keep the props under test.
jest.mock('@amazon-devices/react-native-svg', () => {
  const React = require('react');
  const host =
    (name: string) =>
    ({children, ...props}: {children?: unknown}) =>
      React.createElement(name, props, children);
  return {__esModule: true, Svg: host('Svg'), Path: host('Path')};
});
