// Vega resolves a Turbo Module name to its library from react-native.config.js.
// A module registered in C++ but missing there reads as null from
// TurboModuleRegistry, unless another module happened to load the library first.
// Node typings are not in tsconfig (the app runs on Vega, not Node); jest provides both.
declare const __dirname: string;
const {readFileSync} = require('fs') as {
  readFileSync: (path: string, encoding: 'utf8') => string;
};

interface AutolinkConfig {
  dependency: {
    platforms: {kepler: {autolink: Record<string, {turbomodules: string[]}>}};
  };
}

describe('react-native.config.js', () => {
  it('lists every Turbo Module registered in AutoLinkInit.cpp', () => {
    const source = readFileSync(
      `${__dirname}/../kepler/AutoLinkInit.cpp`,
      'utf8',
    );
    const registered = [
      ...source.matchAll(
        /KEPLER_REGISTER_TURBO_MODULE\(\s*\w+\s*,\s*(\w+)\s*\)/g,
      ),
    ].map((m) => m[1]);
    const config =
      require(`${__dirname}/../react-native.config.js`) as AutolinkConfig;
    const listed = Object.values(
      config.dependency.platforms.kepler.autolink,
    ).flatMap((lib) => lib.turbomodules);
    expect(registered.length).toBeGreaterThan(0);
    expect([...listed].sort()).toEqual([...registered].sort());
  });
});
