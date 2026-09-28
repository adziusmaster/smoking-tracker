import { describe, expect, it } from 'vitest';
import { bubbleTop, hitBubble, type RisingBubble } from './bubbles';

const FIELD = 460;
const RISE_MS = 6000;
const bubble = (id: number, x: number, size: number, startedAt: number): RisingBubble => ({ id, x, size, startedAt, riseMs: RISE_MS });

describe('bubbles', () => {
  it('bubbleTop_atStart_isJustBelowTheField', () => {
    // Arrange & Act & Assert
    expect(bubbleTop(bubble(1, 0, 60, 0), 0, FIELD)).toBe(FIELD);
  });

  it('bubbleTop_atTheEnd_isJustAboveTheField', () => {
    // Arrange & Act & Assert
    expect(bubbleTop(bubble(1, 0, 60, 0), RISE_MS, FIELD)).toBe(-60);
  });

  it('hitBubble_tapInsideARisingBubble_returnsItsId', () => {
    // Arrange — halfway up: top = 460 - 520 * 0.5 = 200, centre (130, 230)
    const bubbles = [bubble(7, 100, 60, 0)];

    // Act
    const hit = hitBubble(bubbles, 130, 230, RISE_MS / 2, FIELD);

    // Assert
    expect(hit).toBe(7);
  });

  it('hitBubble_tapWhereTheBubbleWasLaidOutButIsNotDrawn_missesIt', () => {
    // Arrange — the bug: touch targets stayed at the top while bubbles were drawn lower down
    const bubbles = [bubble(7, 100, 60, 0)];

    // Act
    const hit = hitBubble(bubbles, 130, 20, RISE_MS / 2, FIELD);

    // Assert
    expect(hit).toBeNull();
  });

  it('hitBubble_twoOverlapping_popsTheOneWhoseCentreIsNearest', () => {
    // Arrange
    const bubbles = [bubble(1, 100, 60, 0), bubble(2, 120, 60, 0)];

    // Act
    const hit = hitBubble(bubbles, 155, 230, RISE_MS / 2, FIELD);

    // Assert
    expect(hit).toBe(2);
  });
});
