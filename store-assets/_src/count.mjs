// Checks the listing copy in PLAY-LISTING.md against Play's limits (counted in code points).
//   node store-assets/_src/count.mjs
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const md = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'PLAY-LISTING.md'), 'utf8');
const block = (heading) => {
  const at = md.indexOf(`## ${heading}`);
  const match = /```\n([\s\S]*?)\n```/.exec(md.slice(at));
  if (at < 0 || !match?.[1]) throw new Error(`No code block under "## ${heading}"`);
  return match[1];
};

const checks = [
  ['App name (max 30)', 30],
  ['Short description (max 80)', 80],
  ['Full description (max 4000)', 4000],
];

let failed = false;
const measure = (text, heading, limit) => {
  const length = [...text].length;
  const ok = length <= limit;
  if (!ok) failed = true;
  console.log(`${ok ? 'ok  ' : 'OVER'} ${heading}: ${length}/${limit}`);
};

// Release notes: every store-assets/release-notes-*.md carries a "## For Play" block (max 500).
for (const file of readdirSync(join(dirname(fileURLToPath(import.meta.url)), '..'))) {
  if (!/^release-notes-.*\.md$/.test(file)) continue;
  const notes = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', file), 'utf8');
  const match = /## For Play[\s\S]*?```\n([\s\S]*?)\n```/.exec(notes);
  if (!match?.[1]) throw new Error(`${file}: no code block under "## For Play"`);
  measure(match[1], `${file} (max 500)`, 500);
}

for (const [heading, limit] of checks) {
  const length = [...block(heading)].length;
  const ok = length <= limit;
  if (!ok) failed = true;
  console.log(`${ok ? 'ok  ' : 'OVER'} ${heading}: ${length}/${limit}`);
}
if (failed) process.exit(1);
