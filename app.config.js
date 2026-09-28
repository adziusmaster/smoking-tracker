// Local test builds install next to the Play build instead of over it. The Play build is signed
// by Google and holds the owner's real data; a local build can neither update it nor be allowed
// to wipe it. So `APP_VARIANT=dev` switches the package and name; release builds use app.json
// unchanged.
//
//   APP_VARIANT=dev npx expo prebuild --platform android --clean
module.exports = ({ config }) => {
  if (process.env.APP_VARIANT !== 'dev') return config;
  return {
    ...config,
    name: `${config.name} (dev)`,
    android: { ...config.android, package: `${config.android.package}.dev` },
  };
};
