import { describe, it, expect } from 'vitest';
import {
  getSignType,
  getHouseType,
  calculateTimingEstimate,
  formatTimingForLLM,
} from '../timing';

describe('Timing Calculation System', () => {
  describe('getSignType - Sign Classification', () => {
    it('should classify Aries as cardinal', () => {
      expect(getSignType('aries')).toBe('cardinal');
      expect(getSignType('Aries')).toBe('cardinal');
    });

    it('should classify Cancer as cardinal', () => {
      expect(getSignType('cancer')).toBe('cardinal');
    });

    it('should classify Libra as cardinal', () => {
      expect(getSignType('libra')).toBe('cardinal');
    });

    it('should classify Capricorn as cardinal', () => {
      expect(getSignType('capricorn')).toBe('cardinal');
    });

    it('should classify Taurus as fixed', () => {
      expect(getSignType('taurus')).toBe('fixed');
    });

    it('should classify Leo as fixed', () => {
      expect(getSignType('leo')).toBe('fixed');
    });

    it('should classify Scorpio as fixed', () => {
      expect(getSignType('scorpio')).toBe('fixed');
    });

    it('should classify Aquarius as fixed', () => {
      expect(getSignType('aquarius')).toBe('fixed');
    });

    it('should classify Gemini as mutable', () => {
      expect(getSignType('gemini')).toBe('mutable');
    });

    it('should classify Virgo as mutable', () => {
      expect(getSignType('virgo')).toBe('mutable');
    });

    it('should classify Sagittarius as mutable', () => {
      expect(getSignType('sagittarius')).toBe('mutable');
    });

    it('should classify Pisces as mutable', () => {
      expect(getSignType('pisces')).toBe('mutable');
    });

    it('should throw error for invalid sign', () => {
      expect(() => getSignType('invalid')).toThrow('Unknown sign');
    });
  });

  describe('getHouseType - House Classification', () => {
    it('should classify house 1 as angular', () => {
      expect(getHouseType(1)).toBe('angular');
    });

    it('should classify house 4 as angular', () => {
      expect(getHouseType(4)).toBe('angular');
    });

    it('should classify house 7 as angular', () => {
      expect(getHouseType(7)).toBe('angular');
    });

    it('should classify house 10 as angular', () => {
      expect(getHouseType(10)).toBe('angular');
    });

    it('should classify house 2 as succedent', () => {
      expect(getHouseType(2)).toBe('succedent');
    });

    it('should classify house 5 as succedent', () => {
      expect(getHouseType(5)).toBe('succedent');
    });

    it('should classify house 8 as succedent', () => {
      expect(getHouseType(8)).toBe('succedent');
    });

    it('should classify house 11 as succedent', () => {
      expect(getHouseType(11)).toBe('succedent');
    });

    it('should classify house 3 as cadent', () => {
      expect(getHouseType(3)).toBe('cadent');
    });

    it('should classify house 6 as cadent', () => {
      expect(getHouseType(6)).toBe('cadent');
    });

    it('should classify house 9 as cadent', () => {
      expect(getHouseType(9)).toBe('cadent');
    });

    it('should classify house 12 as cadent', () => {
      expect(getHouseType(12)).toBe('cadent');
    });

    it('should throw error for invalid house number (too low)', () => {
      expect(() => getHouseType(0)).toThrow('Invalid house number');
    });

    it('should throw error for invalid house number (too high)', () => {
      expect(() => getHouseType(13)).toThrow('Invalid house number');
    });
  });

  describe('calculateTimingEstimate - Cardinal Sign in Angular House (FAST)', () => {
    it('should provide fast timing for Aries (cardinal) in house 1 (angular)', () => {
      // Planet at 5° Aries (5°), house 1, orb 3°
      const timing = calculateTimingEstimate(5, 1, 3);

      expect(timing.signType).toBe('cardinal');
      expect(timing.housePlacement).toBe('angular');
      expect(timing.orbInDegrees).toBe(3);
      expect(timing.conflictingSignals).toBe(false);

      // Cardinal sign suggests days/weeks
      // Angular house accelerates
      // Fastest should be in days
      expect(timing.suggestedTimeframes.fastest.unit).toBe('days');
      expect(timing.suggestedTimeframes.fastest.value).toBeLessThanOrEqual(3);
    });

    it('should provide aligned interpretation for cardinal + angular (no conflict)', () => {
      const timing = calculateTimingEstimate(5, 1, 3);

      expect(timing.interpretation).toContain('Cardinal signs indicate swift action');
      expect(timing.interpretation).toContain('angular house placement accelerates');
      expect(timing.interpretation).toContain('sign and house types align');
      expect(timing.interpretation).not.toContain('conflicting');
    });
  });

  describe('calculateTimingEstimate - Fixed Sign in Cadent House (SLOW)', () => {
    it('should provide slow timing for Taurus (fixed) in house 12 (cadent)', () => {
      // Planet at 45° (Taurus 15°), house 12, orb 5°
      const timing = calculateTimingEstimate(45, 12, 5);

      expect(timing.signType).toBe('fixed');
      expect(timing.housePlacement).toBe('cadent');
      expect(timing.orbInDegrees).toBe(5);
      expect(timing.conflictingSignals).toBe(false);

      // Fixed sign suggests months/years
      // Cadent house slows further
      // Slowest should be in years
      expect(timing.suggestedTimeframes.slowest.unit).toBe('years');
    });

    it('should provide aligned interpretation for fixed + cadent (no conflict)', () => {
      const timing = calculateTimingEstimate(45, 12, 5);

      expect(timing.interpretation).toContain('Fixed signs indicate slow, steady development');
      expect(timing.interpretation).toContain('cadent house placement slows events');
      expect(timing.interpretation).toContain('sign and house types align');
    });
  });

  describe('calculateTimingEstimate - Mutable Sign in Succedent House (MODERATE)', () => {
    it('should provide moderate timing for Gemini (mutable) in house 2 (succedent)', () => {
      // Planet at 70° (Gemini 10°), house 2, orb 4°
      const timing = calculateTimingEstimate(70, 2, 4);

      expect(timing.signType).toBe('mutable');
      expect(timing.housePlacement).toBe('succedent');
      expect(timing.orbInDegrees).toBe(4);
      expect(timing.conflictingSignals).toBe(false);

      // Mutable sign suggests weeks/months
      // Succedent house is moderate (neutral)
      // Most likely should be in weeks
      expect(timing.suggestedTimeframes.mostLikely.unit).toBe('weeks');
    });
  });

  describe('calculateTimingEstimate - Conflicting Signals', () => {
    it('should detect conflict: Cardinal sign (fast) + Cadent house (slow)', () => {
      // Planet at 0° (Aries), house 3 (cadent), orb 2°
      const timing = calculateTimingEstimate(0, 3, 2);

      expect(timing.signType).toBe('cardinal');
      expect(timing.housePlacement).toBe('cadent');
      expect(timing.conflictingSignals).toBe(true);

      expect(timing.interpretation).toContain('conflicting timing signals');
      expect(timing.interpretation).toContain('Cardinal signs indicate swift action');
      expect(timing.interpretation).toContain('cadent house placement slows');
    });

    it('should detect conflict: Fixed sign (slow) + Angular house (fast)', () => {
      // Planet at 120° (Leo 0°), house 10 (angular), orb 3°
      const timing = calculateTimingEstimate(120, 10, 3);

      expect(timing.signType).toBe('fixed');
      expect(timing.housePlacement).toBe('angular');
      expect(timing.conflictingSignals).toBe(true);

      expect(timing.interpretation).toContain('conflicting timing signals');
    });

    it('should NOT detect conflict: Mutable + Angular (mild conflict, not flagged)', () => {
      // Mutable + Angular is not considered a major conflict
      const timing = calculateTimingEstimate(60, 1, 2);

      expect(timing.signType).toBe('mutable');
      expect(timing.housePlacement).toBe('angular');
      expect(timing.conflictingSignals).toBe(false);
    });
  });

  describe('calculateTimingEstimate - Orb Conversion to Time Units', () => {
    it('should scale timing based on orb for cardinal sign', () => {
      // Small orb should give shorter timeframes
      const timing1 = calculateTimingEstimate(0, 1, 1);
      const timing2 = calculateTimingEstimate(0, 1, 5);

      expect(timing1.suggestedTimeframes.fastest.value).toBeLessThan(
        timing2.suggestedTimeframes.fastest.value
      );
    });

    it('should handle large orbs appropriately', () => {
      // 10° orb in cardinal sign
      const timing = calculateTimingEstimate(0, 1, 10);

      expect(timing.orbInDegrees).toBe(10);
      // Should still provide reasonable timeframes
      expect(timing.suggestedTimeframes.fastest.value).toBeGreaterThan(0);
      expect(timing.suggestedTimeframes.slowest.value).toBeGreaterThan(0);
    });

    it('should handle fractional orbs correctly', () => {
      // 2.5° orb
      const timing = calculateTimingEstimate(0, 1, 2.5);

      expect(timing.orbInDegrees).toBe(2.5);
      // Should round to reasonable values
      expect(timing.suggestedTimeframes.fastest.value).toBeGreaterThan(0);
    });
  });

  describe('calculateTimingEstimate - Position Normalization', () => {
    it('should handle positions > 360°', () => {
      // 375° = 15° Aries
      const timing = calculateTimingEstimate(375, 1, 3);

      expect(timing.signType).toBe('cardinal');
    });

    it('should handle negative positions', () => {
      // -30° = 330° = 0° Pisces
      const timing = calculateTimingEstimate(-30, 1, 3);

      expect(timing.signType).toBe('mutable'); // Pisces is mutable
    });

    it('should handle exactly 0°', () => {
      // 0° = 0° Aries
      const timing = calculateTimingEstimate(0, 1, 3);

      expect(timing.signType).toBe('cardinal');
    });

    it('should handle exactly 360°', () => {
      // 360° = 0° Aries
      const timing = calculateTimingEstimate(360, 1, 3);

      expect(timing.signType).toBe('cardinal');
    });
  });

  describe('calculateTimingEstimate - All Sign Types with Different Houses', () => {
    it('should calculate timing for each cardinal sign', () => {
      // Aries (0°), Cancer (90°), Libra (180°), Capricorn (270°)
      const ariesTiming = calculateTimingEstimate(0, 1, 2);
      const cancerTiming = calculateTimingEstimate(90, 4, 2);
      const libraTiming = calculateTimingEstimate(180, 7, 2);
      const capricornTiming = calculateTimingEstimate(270, 10, 2);

      expect(ariesTiming.signType).toBe('cardinal');
      expect(cancerTiming.signType).toBe('cardinal');
      expect(libraTiming.signType).toBe('cardinal');
      expect(capricornTiming.signType).toBe('cardinal');
    });

    it('should calculate timing for each fixed sign', () => {
      // Taurus (30°), Leo (120°), Scorpio (210°), Aquarius (300°)
      const taurusTiming = calculateTimingEstimate(30, 2, 3);
      const leoTiming = calculateTimingEstimate(120, 5, 3);
      const scorpioTiming = calculateTimingEstimate(210, 8, 3);
      const aquariusTiming = calculateTimingEstimate(300, 11, 3);

      expect(taurusTiming.signType).toBe('fixed');
      expect(leoTiming.signType).toBe('fixed');
      expect(scorpioTiming.signType).toBe('fixed');
      expect(aquariusTiming.signType).toBe('fixed');
    });

    it('should calculate timing for each mutable sign', () => {
      // Gemini (60°), Virgo (150°), Sagittarius (240°), Pisces (330°)
      const geminiTiming = calculateTimingEstimate(60, 3, 2);
      const virgoTiming = calculateTimingEstimate(150, 6, 2);
      const sagittariusTiming = calculateTimingEstimate(240, 9, 2);
      const piscesTiming = calculateTimingEstimate(330, 12, 2);

      expect(geminiTiming.signType).toBe('mutable');
      expect(virgoTiming.signType).toBe('mutable');
      expect(sagittariusTiming.signType).toBe('mutable');
      expect(piscesTiming.signType).toBe('mutable');
    });
  });

  describe('formatTimingForLLM - Formatting Output', () => {
    it('should format timing estimate with planet name', () => {
      const timing = calculateTimingEstimate(0, 1, 3);
      const formatted = formatTimingForLLM(timing, 'Moon');

      expect(formatted).toContain('Moon: Timing Analysis');
      expect(formatted).toContain('Sign Type: Cardinal');
      expect(formatted).toContain('House Placement: Angular');
      expect(formatted).toContain('Orb to Exact: 3.00°');
      expect(formatted).toContain('Suggested Timeframes:');
      expect(formatted).toContain('Fastest:');
      expect(formatted).toContain('Most Likely:');
      expect(formatted).toContain('Slowest:');
      expect(formatted).toContain('Interpretation:');
    });

    it('should format timing estimate without planet name', () => {
      const timing = calculateTimingEstimate(0, 1, 3);
      const formatted = formatTimingForLLM(timing);

      expect(formatted).toContain('Timing Analysis');
      expect(formatted).not.toContain('Moon:');
    });

    it('should include warning for conflicting signals', () => {
      const timing = calculateTimingEstimate(0, 3, 3); // Cardinal + Cadent = conflict
      const formatted = formatTimingForLLM(timing);

      expect(formatted).toContain('⚠️ Conflicting Signals: Yes');
    });

    it('should not include conflict warning when signals align', () => {
      const timing = calculateTimingEstimate(0, 1, 3); // Cardinal + Angular = aligned
      const formatted = formatTimingForLLM(timing);

      expect(formatted).not.toContain('Conflicting Signals');
    });
  });

  describe('calculateTimingEstimate - Real World Scenarios', () => {
    it('should provide fast timing for urgent matter (cardinal + angular)', () => {
      // Moon at 5° Aries, house 1, applying to aspect with 2° orb
      const timing = calculateTimingEstimate(5, 1, 2);

      // Should suggest days as fastest
      expect(timing.suggestedTimeframes.fastest.unit).toBe('days');
      expect(timing.suggestedTimeframes.fastest.value).toBeLessThanOrEqual(2);
    });

    it('should provide slow timing for long-term matter (fixed + cadent)', () => {
      // Saturn at 225° (Scorpio 15°), house 12, applying with 6° orb
      const timing = calculateTimingEstimate(225, 12, 6);

      // Should suggest years in slowest estimate
      expect(timing.suggestedTimeframes.slowest.unit).toBe('years');
    });

    it('should provide moderate timing for typical question (mutable + succedent)', () => {
      // Mercury at 75° (Gemini 15°), house 5, applying with 4° orb
      const timing = calculateTimingEstimate(75, 5, 4);

      // Should suggest weeks as most likely
      expect(timing.suggestedTimeframes.mostLikely.unit).toBe('weeks');
    });

    it('should handle near-exact aspect (very small orb)', () => {
      // 0.5° orb (partile aspect forming soon)
      const timing = calculateTimingEstimate(0, 1, 0.5);

      expect(timing.orbInDegrees).toBe(0.5);
      // Should still give at least 1 unit in all timeframes
      expect(timing.suggestedTimeframes.fastest.value).toBeGreaterThanOrEqual(1);
      expect(timing.suggestedTimeframes.mostLikely.value).toBeGreaterThanOrEqual(1);
      expect(timing.suggestedTimeframes.slowest.value).toBeGreaterThanOrEqual(1);
    });
  });
});
