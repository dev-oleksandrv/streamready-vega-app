/* eslint-env jest */
// Stand-in for the Vega native splash manager (wired in jestSetup).

/** Called when the app dismisses the native splash. */
export const hideNativeSplash = jest.fn();

export const fakeSplashScreenManager = {
  __esModule: true,
  usePreventHideSplashScreen: () => {},
  useHideSplashScreenCallback: () => hideNativeSplash,
};
