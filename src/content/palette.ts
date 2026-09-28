/**
 * "Clear Air" — the app's two palettes. Static data, so the contrast test in palette.test.ts
 * can check every text/background pair in Node. The runtime theme lives in src/ui/theme.ts.
 * Chosen from the directions page in docs/superpowers/specs/2026-09-28-design-system-design.md.
 */
export interface Palette {
  bg: string;
  surface: string;
  surfaceSunken: string;
  line: string;
  ink: string;
  muted: string;
  faint: string;
  /** Lagoon: primary actions, reached marks. */
  accent: string;
  /** Accent as text on bg; meets 4.5:1. */
  accentText: string;
  onAccent: string;
  /** Dawn: "happening now" and achievements. */
  achieve: string;
  achieveWash: string;
  heroFrom: string;
  heroTo: string;
  onHero: string;
  /** Solid tile fill on the hero card (solid so its text contrast is testable). */
  heroTile: string;
  sos: string;
  onSos: string;
  danger: string;
  dangerWash: string;
  dangerLine: string;
  doneWash: string;
  doneLine: string;
}

export const PALETTES: { light: Palette; dark: Palette } = {
  light: {
    bg: '#F2F6F7',
    surface: '#FFFFFF',
    surfaceSunken: '#E8EEF0',
    line: '#DBE5E8',
    ink: '#0F2830',
    muted: '#4A6570',
    faint: '#6A838B',
    accent: '#0E7C86',
    accentText: '#0B6770',
    onAccent: '#FFFFFF',
    achieve: '#A0561A',
    achieveWash: '#FFF4E8',
    heroFrom: '#0E5F69',
    heroTo: '#0E7C86',
    onHero: '#FFFFFF',
    heroTile: '#0B6770',
    sos: '#0F2830',
    onSos: '#FFFFFF',
    danger: '#B42318',
    dangerWash: '#FEF3F2',
    dangerLine: '#FECDCA',
    doneWash: '#EAF5F5',
    doneLine: '#C4E3E4',
  },
  dark: {
    bg: '#0A1418',
    surface: '#112027',
    surfaceSunken: '#0E1B21',
    line: '#1D3139',
    ink: '#E3EEF0',
    muted: '#9BB3B9',
    faint: '#7A949C',
    accent: '#5CC8C2',
    accentText: '#7FD8D2',
    onAccent: '#06282A',
    achieve: '#F0A55A',
    achieveWash: '#1E1B14',
    heroFrom: '#0F2F38',
    heroTo: '#1F6A6F',
    onHero: '#EAF7F6',
    heroTile: '#184F55',
    sos: '#F0A55A',
    onSos: '#2A1606',
    danger: '#FF9C8F',
    dangerWash: '#2A1512',
    dangerLine: '#5A2A24',
    doneWash: '#10262A',
    doneLine: '#1F4348',
  },
};
