import { describe, it, expect } from 'vitest';
import { calculateAspectMotion, getPlanetMotion } from '../aspectMotion';

describe('Aspect Motion - Retrograde Handling', () => {
  it('should correctly determine applying aspect when one planet is retrograde', () => {
    // Simulating a scenario where Moon (direct) is applying to a square with Mercury (retrograde)
    // This was the bug case from README: July 18, 10:34 PM Toronto
    const chartData = {
      planets: {
        moon: {
          position: 100, // Moon at 100°
          isRetrograde: false,
        },
        mercury: {
          position: 5, // Mercury at 5° (85° behind Moon, approaching 90° square)
          isRetrograde: true,
        },
      },
    };

    const result = calculateAspectMotion(chartData, 'moon square mercury');

    // Moon is moving forward (~13°/day), Mercury is moving backward (~1°/day)
    // They should be approaching the 90° square aspect
    expect(result.isApplying).toBe(true);
    expect(result.isSeparating).toBe(false);
  });

  it('should correctly handle future positions crossing 0°/360° boundary', () => {
    // Test case where Moon crosses 360° → 0° boundary
    const chartData = {
      planets: {
        moon: {
          position: 355, // Moon at 355°, will move to ~8° (crossing boundary)
          isRetrograde: false,
        },
        sun: {
          position: 10, // Sun at 10°
          isRetrograde: false,
        },
      },
    };

    const result = calculateAspectMotion(chartData, 'moon conjunction sun');

    // They should be applying (Moon catching up to Sun)
    // Future Moon ~8°, Sun ~11°, getting closer to conjunction
    expect(result.isApplying).toBe(true);
  });

  it('should correctly handle retrograde planet crossing 360° → 0° backward', () => {
    // Test case where retrograde planet crosses boundary backward
    const chartData = {
      planets: {
        mercury: {
          position: 1, // Mercury at 1°, moving backward
          isRetrograde: true,
        },
        venus: {
          position: 355, // Venus at 355°
          isRetrograde: false,
        },
      },
    };

    const result = calculateAspectMotion(chartData, 'mercury conjunction venus');

    // Mercury moving backward from 1° → ~359.6°, approaching Venus at 355°
    // They should be applying to conjunction
    expect(result.isApplying).toBe(true);
  });

  it('should correctly calculate separation for direct and retrograde motion', () => {
    // Test Moon separating from sextile with Jupiter
    const chartData = {
      planets: {
        moon: {
          position: 120,
          isRetrograde: false,
        },
        jupiter: {
          position: 60, // Perfect sextile (60° aspect)
          isRetrograde: false,
        },
      },
    };

    const result = calculateAspectMotion(chartData, 'moon sextile jupiter');

    // Moon moving away from Jupiter, should be separating
    expect(result.isSeparating).toBe(true);
    expect(result.isApplying).toBe(false);
    expect(result.isPerfect).toBe(true); // Orb should be 0
  });
});
