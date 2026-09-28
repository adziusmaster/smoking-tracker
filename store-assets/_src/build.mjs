// Generates the Play Store screenshots and feature graphic from HTML via headless Chrome.
//   node store-assets/_src/build.mjs
// Screens are real captures from the phone (shots/); see README.md for how they were taken.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deviceShot, heading, tallyTile } from './parts.mjs';
import { doc, T } from './theme.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const HTML = join(HERE, 'html');
mkdirSync(HTML, { recursive: true });
mkdirSync(join(ROOT, 'phone'), { recursive: true });
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const PW = 1080;
const PH = 1920; // 9:16 — inside Play's rules (sides 320–3840 px, long side ≤ 2× short side)

const shot = (name) => `data:image/png;base64,${readFileSync(join(HERE, 'shots', `${name}.png`)).toString('base64')}`;
const phone = (head, name, opts = {}) =>
  doc(PW, PH, `<div style="position:absolute;inset:0;padding-top:110px;">${head}</div>${deviceShot(shot(name), opts)}`);

// Order: what it shows you, why you can trust it, what it does in a craving and after a slip,
// then privacy. Every sentence here must be true of the shipped build.
const SCREENS = [
  ['1-progress', heading('Every hour off nicotine,', 'counted.', 'Money saved, sticks not used and cravings beaten — from your own numbers.'), 'home'],
  ['2-why', heading('Why you feel', 'the way you feel.', 'What your body is doing now, what is behind the cravings, and what helps.'), 'timeline'],
  ['3-sources', heading('Every claim', 'has a source.', 'Studies and health guidance, listed in the app. Tap one to read it.'), 'sources-dark', { dark: true }],
  ['4-craving', heading('A craving passes', 'in minutes.', 'Pick something to do until it has: breathe, play, or ground yourself.'), 'sos-pick'],
  ['5-game', heading('A game studied', 'for cravings.', 'In a small real-world study, three minutes of Tetris weakened cravings — nicotine included.'), 'sos-blocks'],
  ['6-products', heading('Cigarettes, heated tobacco,', 'vapes or pouches.', 'Milestones match what you quit. Nothing measured in smokers is stretched to fit.'), 'products'],
  ['7-slip', heading('A slip is', 'not a reset.', 'Log what you used and get 19 days of extra support. No invented setbacks.'), 'slip'],
  ['8-private', heading('Nothing leaves', 'your phone.', 'No account, no ads, no tracking. It cannot go online — by design.'), 'privacy'],
];

const feature = doc(1024, 500, `
<div style="position:absolute;inset:0;background:radial-gradient(90% 140% at 82% 30%, #E3EFF1 0%, ${T.bg} 62%);"></div>
<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:space-between;padding:0 72px;">
  <div style="max-width:600px;">
    <div style="font-size:18px;letter-spacing:.16em;text-transform:uppercase;color:${T.faint};font-weight:700;">Cleared</div>
    <div class="serif" style="font-size:64px;line-height:1.06;letter-spacing:-.025em;margin:16px 0 20px;color:${T.ink};">
      Quit nicotine.<br><span style="color:${T.accent};">Every claim sourced.</span>
    </div>
    <div style="color:${T.muted};font-size:22px;line-height:1.5;max-width:520px;">
      Cigarettes, heated tobacco, vapes and pouches. Private, offline, and honest about slips.
    </div>
  </div>
  ${tallyTile(230)}
</div>`);

const jobs = [
  ...SCREENS.map(([name, head, capture, opts]) => [name, phone(head, capture, opts), PW, PH, `phone/phone-${name}.png`]),
  ['feature', feature, 1024, 500, 'feature-1024x500.png'],
];

for (const [name, html, w, h, out] of jobs) {
  const file = join(HTML, `${name}.html`);
  writeFileSync(file, html);
  const r = spawnSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    `--screenshot=${join(ROOT, out)}`, `--window-size=${w},${h}`, '--virtual-time-budget=6000', `file://${file}`,
  ], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error(`FAILED ${out}`, r.stderr?.slice(0, 300));
    process.exitCode = 1;
  } else console.log(`wrote ${out} (${w}x${h})`);
}
