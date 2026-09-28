import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { GAME_COLOURS, PALETTES, type Palette } from '@/content/palette';

export type Scheme = 'light' | 'dark';

const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
const RADIUS = { sm: 8, md: 12, lg: 20, pill: 999 } as const;
const FONT = { display: 34, title: 22, heading: 17, body: 15, small: 13, tiny: 11, micro: 9 } as const;
/** Font family names are the TTF basenames embedded by the expo-font config plugin (app.json). */
const FAMILY = {
  display: 'Fraunces_600SemiBold',
  body: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semi: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
} as const;

export interface Theme {
  scheme: Scheme;
  color: Palette;
  /** Seven colours for game pieces and glyphs. */
  game: readonly string[];
  space: typeof SPACE;
  radius: typeof RADIUS;
  font: typeof FONT;
  family: typeof FAMILY;
}

const THEMES: Record<Scheme, Theme> = {
  light: { scheme: 'light', color: PALETTES.light, game: GAME_COLOURS.light, space: SPACE, radius: RADIUS, font: FONT, family: FAMILY },
  dark: { scheme: 'dark', color: PALETTES.dark, game: GAME_COLOURS.dark, space: SPACE, radius: RADIUS, font: FONT, family: FAMILY },
};

export function themeFor(scheme: Scheme): Theme {
  return THEMES[scheme];
}

/** Follows the phone's light/dark setting. An unknown setting reads as light, the default look. */
export function useTheme(): Theme {
  const system = useColorScheme();
  return themeFor(system === 'dark' ? 'dark' : 'light');
}

/**
 * Builds one StyleSheet per scheme, lazily, and returns a hook that picks the current one.
 * Module-level StyleSheets would capture a single palette and ignore a scheme change.
 */
export function makeStyles<T>(factory: (t: Theme) => T): () => T {
  const cache: Partial<Record<Scheme, T>> = {};
  return function useStyles(): T {
    const { scheme } = useTheme();
    return useMemo(() => {
      const cached = cache[scheme];
      if (cached !== undefined) return cached;
      const built = factory(themeFor(scheme));
      cache[scheme] = built;
      return built;
    }, [scheme]);
  };
}
