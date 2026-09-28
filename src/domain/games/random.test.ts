import { describe, expect, it } from 'vitest';
import { nextRandom } from './random';

describe('nextRandom', () => {
  it('nextRandom_sameSeed_givesSameSequence', () => {
    // Arrange
    const a = nextRandom(42);
    const b = nextRandom(42);

    // Act
    const a2 = nextRandom(a.seed);
    const b2 = nextRandom(b.seed);

    // Assert
    expect([a.value, a2.value]).toEqual([b.value, b2.value]);
  });

  it('nextRandom_manyDraws_stayInUnitInterval', () => {
    // Arrange
    let seed = 7;
    const values: number[] = [];

    // Act
    for (let i = 0; i < 1000; i += 1) {
      const r = nextRandom(seed);
      values.push(r.value);
      seed = r.seed;
    }

    // Assert
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
    expect(new Set(values).size).toBeGreaterThan(990);
  });
});
