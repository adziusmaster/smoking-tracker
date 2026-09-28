import { describe, expect, it } from 'vitest';
import { breathAt } from './breathing';

describe('breathAt', () => {
  it('breathAt_start_isBreatheInWithFourSecondsLeft', () => {
    // Arrange & Act & Assert
    expect(breathAt(0)).toEqual({ phase: 'in', secondsLeft: 4, phaseProgress: 0 });
  });

  it('breathAt_justBeforeFourSeconds_isStillInWithOneSecondLeft', () => {
    // Arrange & Act
    const at = breathAt(3999);

    // Assert
    expect(at.phase).toBe('in');
    expect(at.secondsLeft).toBe(1);
  });

  it('breathAt_fourSeconds_switchesToHold', () => {
    // Arrange & Act & Assert
    expect(breathAt(4000)).toEqual({ phase: 'hold', secondsLeft: 4, phaseProgress: 0 });
  });

  it('breathAt_eightSeconds_switchesToOutWithSixSecondsLeft', () => {
    // Arrange & Act & Assert
    expect(breathAt(8000)).toEqual({ phase: 'out', secondsLeft: 6, phaseProgress: 0 });
  });

  it('breathAt_fourteenSeconds_wrapsToANewBreath', () => {
    // Arrange & Act & Assert
    expect(breathAt(14000).phase).toBe('in');
    expect(breathAt(15000).phaseProgress).toBeCloseTo(0.25);
  });
});
