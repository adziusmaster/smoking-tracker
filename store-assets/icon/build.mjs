// Renders every app icon and the splash mark from one geometry, with the system Chrome in
// headless mode (the same approach PurePrep and CoreChoice use), then checks each PNG is
// 32-bit RGBA at the expected size — Play rejects 24-bit icons.
//
//   node store-assets/icon/build.mjs
//
// No npm dependencies; the only requirement is Google Chrome at CHROME below.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { deflateSync, inflateSync } from 'node:zlib';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');

// Clear Air palette (src/content/palette.ts).
const LAGOON = '#0E7C86';
const LAGOON_DEEP = '#0E5F69';
const MIST = '#F2F6F7';
const DAWN = '#F0A55A';

/** Four tally strokes struck through, centred on a 1024 canvas, scaled about the centre. */
function marks({ scale = 1, stroke = MIST, strike = DAWN }) {
  const t = `translate(512 512) scale(${scale}) translate(-512 -512)`;
  const bars = [352, 464, 576, 688]
    .map((x) => `<line x1="${x}" y1="320" x2="${x}" y2="704" stroke="${stroke}" stroke-width="56" stroke-linecap="round"/>`)
    .join('');
  return `<g transform="${t}">${bars}<line x1="272" y1="624" x2="752" y2="400" stroke="${strike}" stroke-width="64" stroke-linecap="round"/></g>`;
}

const gradient = `<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${LAGOON}"/><stop offset="1" stop-color="${LAGOON_DEEP}"/></linearGradient></defs>`;
const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">${gradient}${body}</svg>`;

const VARIANTS = {
  /** Full-bleed square: legacy icon and the Play Store icon (Play applies its own mask). */
  full: svg(`<rect width="1024" height="1024" fill="url(#bg)"/>${marks({})}`),
  /** Adaptive foreground: marks only, shrunk well inside the 66% safe zone. */
  foreground: svg(marks({ scale: 0.8 })),
  /** Adaptive background: the gradient alone. */
  background: svg(`<rect width="1024" height="1024" fill="url(#bg)"/>`),
  /** Android 13 themed icon: one colour on transparent; the launcher tints it. */
  monochrome: svg(marks({ scale: 0.8, stroke: '#FFFFFF', strike: '#FFFFFF' })),
  /** Splash: a rounded tile, so the mist marks stay visible on the light splash background. */
  splash: svg(`<rect x="112" y="112" width="800" height="800" rx="184" fill="url(#bg)"/>${marks({ scale: 0.72 })}`),
};

const OUTPUTS = [
  { variant: 'full', size: 1024, out: 'assets/icon.png' },
  { variant: 'foreground', size: 1024, out: 'assets/android-icon-foreground.png' },
  { variant: 'background', size: 1024, out: 'assets/android-icon-background.png' },
  { variant: 'monochrome', size: 1024, out: 'assets/android-icon-monochrome.png' },
  { variant: 'splash', size: 1024, out: 'assets/splash-icon.png' },
  { variant: 'full', size: 512, out: 'store-assets/play-icon-512.png' },
];

writeFileSync(join(HERE, 'icon.svg'), VARIANTS.full + '\n');

// ——— PNG: Chrome writes opaque screenshots as 24-bit RGB (colour type 2). Play wants RGBA. ———
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}
/** Re-encodes an 8-bit RGB, non-interlaced PNG as RGBA with full opacity. */
function rgbToRgba(png) {
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (png[24] !== 8 || png[25] !== 2 || png[28] !== 0) throw new Error('expected 8-bit RGB, non-interlaced');
  const idat = [];
  for (let at = 8; at < png.length; ) {
    const length = png.readUInt32BE(at);
    const type = png.toString('ascii', at + 4, at + 8);
    if (type === 'IDAT') idat.push(png.subarray(at + 8, at + 8 + length));
    at += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * 3;
  const out = Buffer.alloc(height * (width * 4 + 1));
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i += 1) {
      const a = i >= 3 ? line[i - 3] : 0;
      const b = prev[i];
      const c = i >= 3 ? prev[i - 3] : 0;
      const add = filter === 1 ? a : filter === 2 ? b : filter === 3 ? (a + b) >> 1 : filter === 4 ? paeth(a, b, c) : 0;
      line[i] = (line[i] + add) & 0xff;
    }
    const row = y * (width * 4 + 1);
    out[row] = 0;
    for (let x = 0; x < width; x += 1) {
      out[row + 1 + x * 4] = line[x * 3];
      out[row + 2 + x * 4] = line[x * 3 + 1];
      out[row + 3 + x * 4] = line[x * 3 + 2];
      out[row + 4 + x * 4] = 0xff;
    }
    prev = line;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([png.subarray(0, 8), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(out)), chunk('IEND', Buffer.alloc(0))]);
}

const work = mkdtempSync(join(tmpdir(), 'icon-'));
let failed = false;

for (const { variant, size, out } of OUTPUTS) {
  const html = join(work, `${variant}-${size}.html`);
  const inner = VARIANTS[variant].replace('width="1024" height="1024"', `width="${size}" height="${size}"`);
  writeFileSync(html, `<!doctype html><html><body style="margin:0;background:transparent">${inner}</body></html>`);
  const target = join(ROOT, out);
  execFileSync(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--default-background-color=00000000',
    `--window-size=${size},${size}`,
    `--screenshot=${target}`,
    `file://${html}`,
  ], { stdio: 'ignore' });

  let png = readFileSync(target);
  if (png[25] === 2) {
    png = rgbToRgba(png);
    writeFileSync(target, png);
  }
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  const bitDepth = png[24];
  const colourType = png[25];
  const ok = width === size && height === size && bitDepth === 8 && colourType === 6;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${out} ${width}x${height} depth ${bitDepth} colour type ${colourType}${ok ? '' : ' (need 8-bit RGBA, type 6)'}`);
  if (!ok) failed = true;
}

if (failed) process.exit(1);
