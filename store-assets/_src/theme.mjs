// Store-asset tokens: the same Clear Air light palette the app ships (src/content/palette.ts).
export const T = {
  bg: '#F2F6F7',
  surface: '#FFFFFF',
  line: '#DBE5E8',
  ink: '#0F2830',
  muted: '#4A6570',
  faint: '#6A838B',
  accent: '#0E7C86',
  accentDeep: '#0E5F69',
  dawn: '#F0A55A',
  mist: '#F2F6F7',
};

const FONTS = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Manrope:wght@400;500;600;700&display=swap';

/** A full HTML document at an exact pixel size, ready for a headless screenshot. */
export const doc = (w, h, body) => `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="stylesheet" href="${FONTS}">
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  html,body{width:${w}px;height:${h}px;overflow:hidden;}
  body{background:${T.bg};color:${T.ink};font-family:Manrope,system-ui,sans-serif;-webkit-font-smoothing:antialiased;position:relative;}
  .serif{font-family:Fraunces,Georgia,serif;font-weight:600;}
</style></head><body>${body}</body></html>`;
