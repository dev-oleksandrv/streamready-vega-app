// The Vega CLI reads in-app Turbo Module autolinking from here; it rejects an
// `autolink` block in package.json. linkDynamic must stay true: in-app modules
// loaded at launch crash the app (Vega Turbo Module known limitations).
module.exports = {
  dependency: {
    platforms: {
      kepler: {
        autolink: {
          StreamReadyNdt7: {
            libraryName: 'libStreamReadyNdt7.so',
            linkDynamic: true,
            provider: 'application',
            components: [],
            turbomodules: ['Ndt7Native'],
          },
        },
      },
    },
  },
};
