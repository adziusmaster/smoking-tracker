// Android draws a translucent "contrast" scrim behind the navigation bar unless the theme opts
// out. Expo's splash theme opts out; the app theme it generates does not, which left a white
// strip over the bottom of every screen. The app pads its own content with the safe-area inset,
// so the scrim is not needed. Applied at prebuild, so it survives regenerating android/.
const { withAndroidStyles } = require('expo/config-plugins');

module.exports = function withTransparentNavigationBar(config) {
  return withAndroidStyles(config, (mod) => {
    const appTheme = mod.modResults.resources.style?.find((style) => style.$.name === 'AppTheme');
    if (appTheme) {
      appTheme.item = (appTheme.item ?? []).filter((item) => item.$.name !== 'android:enforceNavigationBarContrast');
      appTheme.item.push({ $: { name: 'android:enforceNavigationBarContrast' }, _: 'false' });
    }
    return mod;
  });
};
