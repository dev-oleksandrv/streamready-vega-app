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

// Infinite loops (Spinner) would tick on real timers and update outside act().
// Animations are not under test, so loops start and stop as no-ops.
jest.mock(
  '@amazon-devices/react-native-kepler/Libraries/Animated/Animated',
  () => {
    const actual = jest.requireActual(
      '@amazon-devices/react-native-kepler/Libraries/Animated/Animated',
    );
    const Animated = actual.default ?? actual;
    const noopLoop = () => ({start: () => {}, stop: () => {}, reset: () => {}});
    return {
      __esModule: true,
      ...actual,
      default: {...Animated, loop: noopLoop},
    };
  },
);
