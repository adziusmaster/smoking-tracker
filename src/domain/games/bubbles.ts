/**
 * Bubble pop geometry. Bubbles are animated with the native driver, which Android's touch
 * hit-testing does not see (touch targets stayed where the bubble was laid out, at the top).
 * So the field handles every touch and asks this module which bubble is under the finger.
 */
export interface RisingBubble {
  id: number;
  x: number;
  size: number;
  startedAt: number;
  riseMs: number;
}

/** Top edge of a bubble at `now`: from just below the field to just above it, linearly. */
export function bubbleTop(b: RisingBubble, now: number, fieldHeight: number): number {
  const progress = Math.min(1, Math.max(0, (now - b.startedAt) / b.riseMs));
  return fieldHeight - progress * (fieldHeight + b.size);
}

/** The bubble under a tap at (x, y), nearest centre first, with a small forgiveness margin. */
export function hitBubble(bubbles: readonly RisingBubble[], x: number, y: number, now: number, fieldHeight: number, slop = 10): number | null {
  let best: { id: number; distance: number } | null = null;
  for (const b of bubbles) {
    const radius = b.size / 2;
    const cx = b.x + radius;
    const cy = bubbleTop(b, now, fieldHeight) + radius;
    const distance = Math.hypot(x - cx, y - cy);
    if (distance <= radius + slop && (best === null || distance < best.distance)) best = { id: b.id, distance };
  }
  return best?.id ?? null;
}
