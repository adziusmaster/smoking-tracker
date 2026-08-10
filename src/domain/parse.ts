/**
 * Parsing of what a human typed into a text input. Pure, so it lives here rather than
 * being re-implemented in each screen: onboarding and settings ask for the same numbers
 * and must accept and reject exactly the same strings.
 *
 * Every function returns `null` for input it cannot read, never a silent fallback — the
 * caller decides whether that is an error message or a default.
 */

/** A whole number above zero: cigarettes per day, cigarettes per pack. */
export function parsePositiveInt(input: string): number | null {
  const value = parseNonNegativeInt(input);
  if (value === null) return null;
  return value > 0 ? value : null;
}

/** A whole number of zero or more: days since quitting, lifetime baseline. */
export function parseNonNegativeInt(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number(trimmed);
}

/**
 * A money amount as integer minor units. Accepts at most two decimal places and a comma
 * as the decimal separator, because a Dutch keyboard produces one. Zero is valid: money
 * is not required to be positive the way a cigarette count is.
 */
export function parseMinorUnits(input: string): number | null {
  const normalised = input.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalised)) return null;
  return Math.round(Number(normalised) * 100);
}
