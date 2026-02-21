import { describe, it, expect } from 'vitest';
import {
  calculateEssentialDignities,
  getSignFromDegrees,
  getSignRuler,
  isDayChart
} from '../dignities';

describe('Essential Dignities Calculator', () => {
  describe('getSignFromDegrees', () => {
    it('should convert 0° to Aries 0°', () => {
      const result = getSignFromDegrees(0);
      expect(result.sign).toBe('aries');
      expect(result.degreeInSign).toBe(0);
    });

    it('should convert 45° to Taurus 15°', () => {
      const result = getSignFromDegrees(45);
      expect(result.sign).toBe('taurus');
      expect(result.degreeInSign).toBe(15);
    });

    it('should convert 180° to Libra 0°', () => {
      const result = getSignFromDegrees(180);
      expect(result.sign).toBe('libra');
      expect(result.degreeInSign).toBe(0);
    });

    it('should handle 360° wraparound', () => {
      const result = getSignFromDegrees(360);
      expect(result.sign).toBe('aries');
      expect(result.degreeInSign).toBe(0);
    });
  });

  describe('calculateEssentialDignities', () => {
    it('should recognize Sun in Leo as ruler (domicile)', () => {
      const dignity = calculateEssentialDignities('sun', 120, true); // 120° = Leo 0°, day chart
      expect(dignity.isRuler).toBe(true);
      expect(dignity.description).toContain('Ruler');
      // Sun in Leo gets +5 (ruler) +3 (triplicity day ruler) = 8 points = Very Strong
      expect(dignity.score).toBe(8);
      expect(dignity.strength).toBe('Very Strong');
    });

    it('should recognize Sun at 19° Aries as exalted', () => {
      const dignity = calculateEssentialDignities('sun', 19); // 19° = Aries 19°
      expect(dignity.isExalted).toBe(true);
      expect(dignity.description).toContain('Exalted');
      expect(dignity.score).toBeGreaterThanOrEqual(4);
    });

    it('should recognize Moon in Capricorn as detriment', () => {
      const dignity = calculateEssentialDignities('moon', 270); // 270° = Capricorn 0°
      expect(dignity.isDetriment).toBe(true);
      expect(dignity.description).toContain('Detriment');
      expect(dignity.score).toBeLessThan(0);
      expect(dignity.strength).toBe('Weak');
    });

    it('should recognize Mars at 28° Cancer as fall', () => {
      const dignity = calculateEssentialDignities('mars', 118); // 90° + 28° = Cancer 28°
      expect(dignity.isFall).toBe(true);
      expect(dignity.description).toContain('Fall');
      // Mars in Cancer gets -5 (fall) +3 (triplicity participating) = -2 = Weak
      expect(dignity.score).toBe(-2);
      expect(dignity.strength).toBe('Weak');
    });

    it('should recognize triplicity ruler (Sun in fire sign)', () => {
      const dignity = calculateEssentialDignities('sun', 0, true); // Aries, day chart
      expect(dignity.triplicityRuler).toBe('day');
      expect(dignity.description).toContain('Triplicity');
    });

    it('should recognize peregrine planet (no dignity)', () => {
      const dignity = calculateEssentialDignities('venus', 60); // Venus in Gemini (no dignity)
      expect(dignity.isRuler).toBe(false);
      expect(dignity.isExalted).toBe(false);
      expect(dignity.isDetriment).toBe(false);
      expect(dignity.isFall).toBe(false);
      expect(dignity.triplicityRuler).toBe(null);
      expect(dignity.score).toBe(0);
      expect(dignity.description).toContain('Peregrine');
    });

    it('should handle multiple dignities (Venus in Pisces)', () => {
      const dignity = calculateEssentialDignities('venus', 357); // Venus at 27° Pisces (exaltation)
      expect(dignity.isExalted).toBe(true);
      expect(dignity.score).toBeGreaterThan(0);
    });
  });

  describe('getSignRuler', () => {
    it('should return Mars for Aries', () => {
      expect(getSignRuler('aries')).toBe('mars');
    });

    it('should return Venus for Taurus', () => {
      expect(getSignRuler('taurus')).toBe('venus');
    });

    it('should return Sun for Leo', () => {
      expect(getSignRuler('leo')).toBe('sun');
    });

    it('should return Saturn for Capricorn', () => {
      expect(getSignRuler('capricorn')).toBe('saturn');
    });
  });

  describe('isDayChart', () => {
    it('should return true for Sun in 7th house (just above horizon)', () => {
      expect(isDayChart(7)).toBe(true);
    });

    it('should return true for Sun in 10th house (midheaven)', () => {
      expect(isDayChart(10)).toBe(true);
    });

    it('should return false for Sun in 1st house (just below horizon)', () => {
      expect(isDayChart(1)).toBe(false);
    });

    it('should return false for Sun in 4th house (IC)', () => {
      expect(isDayChart(4)).toBe(false);
    });
  });
});
