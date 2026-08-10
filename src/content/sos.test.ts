import { describe, expect, it } from 'vitest';
import { SOS_STEPS, SOS_TOTAL_SECONDS } from './sos';

describe('SOS_STEPS', () => {
  it('SOS_STEPS_wholeScript_lastsFiveMinutes', () => {
    // Arrange & Act & Assert — a craving peaks and passes in 3–5 minutes
    expect(SOS_TOTAL_SECONDS).toBe(300);
  });

  it('SOS_STEPS_everyStep_hasPositiveDurationAndCopy', () => {
    // Arrange & Act
    const broken = SOS_STEPS.filter((step) => step.seconds <= 0 || step.instruction.trim() === '');

    // Assert
    expect(broken.map((step) => step.id)).toEqual([]);
  });

  it('SOS_STEPS_everyStep_hasUniqueId', () => {
    // Arrange
    const ids = SOS_STEPS.map((step) => step.id);

    // Act & Assert
    expect(new Set(ids).size).toBe(ids.length);
  });
});
