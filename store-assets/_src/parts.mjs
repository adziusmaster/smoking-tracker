import { T } from './theme.mjs';

/** Headline (second line in the accent) plus one supporting line — every phone screenshot. */
export const heading = (line1, line2, sub = '') => `
<div style="padding:0 78px;">
  <div class="serif" style="font-size:66px;line-height:1.12;letter-spacing:-.02em;color:${T.ink};">
    ${line1}<br><span style="color:${T.accent};">${line2}</span>
  </div>
  ${sub ? `<div style="margin-top:24px;font-size:29px;line-height:1.5;color:${T.muted};">${sub}</div>` : ''}
</div>`;

/**
 * A real capture from the phone in a device frame, bled off the bottom of the canvas. The
 * capture is 1080×2424; Android's status bar (top 140 px) is cropped away by the negative
 * margin, and the navigation bar falls below the canvas.
 */
export const deviceShot = (dataUri, { width = 860, top = 470, dark = false } = {}) => {
  const scale = width / 1080;
  return `
<div style="position:absolute;left:50%;transform:translateX(-50%);top:${top}px;width:${width}px;height:${Math.round(2150 * scale)}px;
     border-radius:52px;border:10px solid ${dark ? '#1D3139' : '#0F2830'};overflow:hidden;background:${dark ? '#0A1418' : T.bg};
     box-shadow:0 36px 80px rgba(15,40,48,.22);">
  <img src="${dataUri}" style="display:block;width:100%;margin-top:-${Math.round(140 * scale)}px;">
</div>`;
};

/** The tally mark from the app icon (store-assets/icon/build.mjs), on its lagoon tile. */
export const tallyTile = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 1024 1024">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${T.accent}"/><stop offset="1" stop-color="${T.accentDeep}"/></linearGradient></defs>
  <rect x="0" y="0" width="1024" height="1024" rx="232" fill="url(#bg)"/>
  ${[352, 464, 576, 688].map((x) => `<line x1="${x}" y1="320" x2="${x}" y2="704" stroke="${T.mist}" stroke-width="56" stroke-linecap="round"/>`).join('')}
  <line x1="272" y1="624" x2="752" y2="400" stroke="${T.dawn}" stroke-width="64" stroke-linecap="round"/>
</svg>`;
