import { describe, it, expect } from 'vitest';
import { calculateArabicPart, calculatePartOfFortune } from '../arabicParts';

describe('Arabic Parts Calculator', () => {
  describe('calculateArabicPart', () => {
    it('should calculate basic Arabic part formula', () => {
      // Simple case: 100 + 50 - 30 = 120
      const result = calculateArabicPart(100, 50, 30);
      expect(result).toBe(120);
    });

    it('should handle 360° wraparound for values over 360', () => {
      // 300 + 100 - 10 = 390, should wrap to 30
      const result = calculateArabicPart(300, 100, 10);
      expect(result).toBe(30);
    });

    it('should handle negative values by normalizing to positive', () => {
      // 50 + 30 - 100 = -20, should normalize to 340
      const result = calculateArabicPart(50, 30, 100);
      expect(result).toBe(340);
    });

    it('should handle multiple wraparounds', () => {
      // 350 + 350 - 10 = 690, should wrap to 330
      const result = calculateArabicPart(350, 350, 10);
      expect(result).toBe(330);
    });

    it('should return 0 when result is exactly 360', () => {
      // 180 + 180 - 0 = 360, should normalize to 0
      const result = calculateArabicPart(180, 180, 0);
      expect(result).toBe(0);
    });

    it('should handle very large negative values', () => {
      // 10 + 20 - 500 = -470, should normalize correctly
      const result = calculateArabicPart(10, 20, 500);
      // -470 % 360 = -110, (-110 + 360) % 360 = 250
      expect(result).toBe(250);
    });
  });

  describe('calculatePartOfFortune - Day Chart', () => {
    // Mock data for a day chart (Sun in house 10)
    const mockPlanets = {
      sun: { position: 270, isRetrograde: false },      // 0° Capricorn, house 10
      moon: { position: 45, isRetrograde: false },      // 15° Taurus
      mercury: { position: 260, isRetrograde: false },
      venus: { position: 300, isRetrograde: false },
      mars: { position: 0, isRetrograde: false },       // 0° Aries
      jupiter: { position: 120, isRetrograde: false },
      saturn: { position: 200, isRetrograde: false }
    };

    // Mock cusps starting with Aries rising
    const mockCusps = [
      0,    // House 1: 0° Aries
      30,   // House 2: 0° Taurus
      60,   // House 3: 0° Gemini
      90,   // House 4: 0° Cancer
      120,  // House 5: 0° Leo
      150,  // House 6: 0° Virgo
      180,  // House 7: 0° Libra
      210,  // House 8: 0° Scorpio
      240,  // House 9: 0° Sagittarius
      270,  // House 10: 0° Capricorn
      300,  // House 11: 0° Aquarius
      330   // House 12: 0° Pisces
    ];

    it('should calculate Part of Fortune for day chart correctly', () => {
      // Day Chart Formula: Ascendant + Moon - Sun
      // Ascendant = 0° (Aries), Moon = 45° (Taurus 15°), Sun = 270° (Capricorn 0°)
      // PoF = 0 + 45 - 270 = -225, normalize to 135° (15° Leo)
      const ascendant = 0;
      const result = calculatePartOfFortune(
        ascendant,
        mockPlanets.sun.position,
        mockPlanets.moon.position,
        mockPlanets,
        mockCusps
      );

      expect(result.position).toBe(135);
      expect(result.sign).toBe('leo');
      expect(result.degreeInSign).toBe(15);
      expect(result.isDayChart).toBe(true);
    });

    it('should determine house placement correctly', () => {
      const ascendant = 0;
      const result = calculatePartOfFortune(
        ascendant,
        mockPlanets.sun.position,
        mockPlanets.moon.position,
        mockPlanets,
        mockCusps
      );

      // 135° falls in house 5 (120-150°)
      expect(result.house).toBe(5);
    });

    it('should identify correct dispositor (ruler of sign PoF is in)', () => {
      const ascendant = 0;
      const result = calculatePartOfFortune(
        ascendant,
        mockPlanets.sun.position,
        mockPlanets.moon.position,
        mockPlanets,
        mockCusps
      );

      // PoF in Leo, ruled by Sun
      expect(result.dispositor).toBe('sun');
      expect(result.dispositorPosition).toBe(270);
      expect(result.dispositorSign).toBe('capricorn');
    });

    it('should calculate dispositor dignity', () => {
      const ascendant = 0;
      const result = calculatePartOfFortune(
        ascendant,
        mockPlanets.sun.position,
        mockPlanets.moon.position,
        mockPlanets,
        mockCusps
      );

      // Sun at 0° Capricorn is in detriment (opposite of Leo)
      expect(result.dispositorDignity).toBeDefined();
      expect(result.dispositorDignity.strength).toBeDefined();
      expect(result.dispositorDignity.description).toBeDefined();
      expect(result.dispositorDignity.score).toBeDefined();
    });

    it('should format position correctly', () => {
      const ascendant = 0;
      const result = calculatePartOfFortune(
        ascendant,
        mockPlanets.sun.position,
        mockPlanets.moon.position,
        mockPlanets,
        mockCusps
      );

      expect(result.formattedPosition).toBe('15.00° Leo');
    });
  });

  describe('calculatePartOfFortune - Night Chart', () => {
    // Mock data for a night chart (Sun in house 4)
    const mockPlanets = {
      sun: { position: 90, isRetrograde: false },       // 0° Cancer, house 4
      moon: { position: 180, isRetrograde: false },     // 0° Libra
      mercury: { position: 100, isRetrograde: false },
      venus: { position: 200, isRetrograde: false },
      mars: { position: 0, isRetrograde: false },
      jupiter: { position: 120, isRetrograde: false },
      saturn: { position: 300, isRetrograde: false }
    };

    const mockCusps = [
      0,    // House 1: 0° Aries
      30,   // House 2: 0° Taurus
      60,   // House 3: 0° Gemini
      90,   // House 4: 0° Cancer
      120,  // House 5: 0° Leo
      150,  // House 6: 0° Virgo
      180,  // House 7: 0° Libra
      210,  // House 8: 0° Scorpio
      240,  // House 9: 0° Sagittarius
      270,  // House 10: 0° Capricorn
      300,  // House 11: 0° Aquarius
      330   // House 12: 0° Pisces
    ];

    it('should calculate Part of Fortune for night chart correctly', () => {
      // Night Chart Formula: Ascendant + Sun - Moon
      // Ascendant = 0° (Aries), Sun = 90° (Cancer), Moon = 180° (Libra)
      // PoF = 0 + 90 - 180 = -90, normalize to 270° (0° Capricorn)
      const ascendant = 0;
      const result = calculatePartOfFortune(
        ascendant,
        mockPlanets.sun.position,
        mockPlanets.moon.position,
        mockPlanets,
        mockCusps
      );

      expect(result.position).toBe(270);
      expect(result.sign).toBe('capricorn');
      expect(result.degreeInSign).toBe(0);
      expect(result.isDayChart).toBe(false);
    });

    it('should identify correct dispositor for night chart', () => {
      const ascendant = 0;
      const result = calculatePartOfFortune(
        ascendant,
        mockPlanets.sun.position,
        mockPlanets.moon.position,
        mockPlanets,
        mockCusps
      );

      // PoF in Capricorn, ruled by Saturn
      expect(result.dispositor).toBe('saturn');
      expect(result.dispositorPosition).toBe(300);
    });
  });

  describe('calculatePartOfFortune - Sign Boundaries', () => {
    const mockPlanets = {
      sun: { position: 270, isRetrograde: false },
      moon: { position: 45, isRetrograde: false },
      mercury: { position: 0, isRetrograde: false },
      venus: { position: 30, isRetrograde: false },     // 0° Taurus
      mars: { position: 0, isRetrograde: false },
      jupiter: { position: 120, isRetrograde: false },
      saturn: { position: 200, isRetrograde: false }
    };

    const mockCusps = [
      0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330
    ];

    it('should handle PoF at exact sign boundary (0°)', () => {
      // Set up to get PoF at exactly 30° (0° Taurus)
      const ascendant = 255;  // 255 + 45 - 270 = 30
      const result = calculatePartOfFortune(
        ascendant,
        mockPlanets.sun.position,
        mockPlanets.moon.position,
        mockPlanets,
        mockCusps
      );

      expect(result.position).toBe(30);
      expect(result.sign).toBe('taurus');
      expect(result.degreeInSign).toBe(0);
      expect(result.dispositor).toBe('venus');
    });

    it('should handle PoF at end of sign (29.99°)', () => {
      // Set up to get PoF at 59.99° (29.99° Taurus)
      const ascendant = 284.99;  // 284.99 + 45 - 270 = 59.99
      const result = calculatePartOfFortune(
        ascendant,
        mockPlanets.sun.position,
        mockPlanets.moon.position,
        mockPlanets,
        mockCusps
      );

      expect(result.position).toBeCloseTo(59.99);
      expect(result.sign).toBe('taurus');
      expect(result.degreeInSign).toBeCloseTo(29.99);
    });
  });

  describe('calculatePartOfFortune - House Boundaries', () => {
    const mockPlanets = {
      sun: { position: 270, isRetrograde: false },
      moon: { position: 45, isRetrograde: false },
      mercury: { position: 0, isRetrograde: false },
      venus: { position: 30, isRetrograde: false },
      mars: { position: 0, isRetrograde: false },
      jupiter: { position: 120, isRetrograde: false },
      saturn: { position: 200, isRetrograde: false }
    };

    const mockCusps = [
      0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330
    ];

    it('should determine house at exact cusp boundary', () => {
      // PoF at exactly 120° (cusp of house 5)
      const ascendant = 345;  // 345 + 45 - 270 = 120
      const result = calculatePartOfFortune(
        ascendant,
        mockPlanets.sun.position,
        mockPlanets.moon.position,
        mockPlanets,
        mockCusps
      );

      expect(result.position).toBe(120);
      expect(result.house).toBe(5);
    });

    it('should handle house determination across 360° boundary', () => {
      // Test PoF in house 12 (330-360/0)
      // Let's adjust: we want 350°
      const ascendantAdjusted = 575;  // 575 + 45 - 270 = 350
      const result = calculatePartOfFortune(
        ascendantAdjusted,
        mockPlanets.sun.position,
        mockPlanets.moon.position,
        mockPlanets,
        mockCusps
      );

      expect(result.position).toBe(350);
      expect(result.house).toBe(12);
    });
  });

  describe('calculatePartOfFortune - Real-world Example', () => {
    // Based on a realistic horary chart
    const realisticPlanets = {
      sun: { position: 285.5, isRetrograde: false },    // 15.5° Capricorn
      moon: { position: 123.7, isRetrograde: false },   // 3.7° Leo
      mercury: { position: 275.2, isRetrograde: true },
      venus: { position: 310.8, isRetrograde: false },
      mars: { position: 45.3, isRetrograde: false },
      jupiter: { position: 180.5, isRetrograde: false },
      saturn: { position: 330.2, isRetrograde: false }
    };

    const realisticCusps = [
      15.5,   // House 1
      45.2,
      75.8,
      105.3,
      135.7,
      165.1,
      195.5,  // House 7 (opposite of house 1)
      225.2,
      255.8,
      285.3,  // House 10
      315.7,
      345.1
    ];

    it('should calculate realistic horary chart Part of Fortune', () => {
      const result = calculatePartOfFortune(
        15.5,
        realisticPlanets.sun.position,
        realisticPlanets.moon.position,
        realisticPlanets,
        realisticCusps
      );

      // Day chart (Sun in house 10): Asc + Moon - Sun
      // 15.5 + 123.7 - 285.5 = -146.3, normalize to 213.7° (3.7° Scorpio)
      expect(result.position).toBeCloseTo(213.7, 1);
      expect(result.sign).toBe('scorpio');
      expect(result.degreeInSign).toBeCloseTo(3.7, 1);
      expect(result.isDayChart).toBe(true);

      // Scorpio is ruled by Mars
      expect(result.dispositor).toBe('mars');

      // Verify dispositor information
      expect(result.dispositorPosition).toBe(45.3);
      expect(result.dispositorSign).toBe('taurus');
    });
  });
});
