import { describe, it, expect } from 'vitest';
import { analyzeReception, formatReceptionForDisplay } from '../reception';

describe('Reception Analysis', () => {
  describe('Mutual Reception by Rulership', () => {
    it('should detect Mars in Cancer and Moon in Aries (mutual reception by rulership)', () => {
      // Mars at 100° = Cancer 10°
      // Moon at 10° = Aries 10°
      // Mars rules Aries, Moon rules Cancer
      const reception = analyzeReception('mars', 100, 'moon', 10);

      expect(reception.type).toBe('mutual_reception_rulership');
      expect(reception.quality).toBe('very_positive');
      expect(reception.score).toBe(10);
      expect(reception.details.planet1ReceivesPlanet2).toBe(true);
      expect(reception.details.planet2ReceivesPlanet1).toBe(true);
      expect(reception.details.planet1ReceptionType).toBe('rulership');
      expect(reception.details.planet2ReceptionType).toBe('rulership');
      expect(reception.interpretation).toContain('mutual reception by rulership');
    });

    it('should detect Mercury in Sagittarius and Jupiter in Gemini (mutual reception by rulership)', () => {
      // Mercury at 240° = Sagittarius 0°
      // Jupiter at 60° = Gemini 0°
      // Mercury rules Gemini, Jupiter rules Sagittarius
      const reception = analyzeReception('mercury', 240, 'jupiter', 60);

      expect(reception.type).toBe('mutual_reception_rulership');
      expect(reception.quality).toBe('very_positive');
      expect(reception.score).toBe(10);
      expect(reception.details.planet1ReceivesPlanet2).toBe(true);
      expect(reception.details.planet2ReceivesPlanet1).toBe(true);
    });

    it('should detect Venus in Aries and Mars in Libra (mutual reception by rulership)', () => {
      // Venus at 5° = Aries 5°
      // Mars at 185° = Libra 5°
      // Venus rules Libra, Mars rules Aries
      const reception = analyzeReception('venus', 5, 'mars', 185);

      expect(reception.type).toBe('mutual_reception_rulership');
      expect(reception.quality).toBe('very_positive');
      expect(reception.score).toBe(10);
    });
  });

  describe('Mutual Reception by Exaltation', () => {
    it('should detect Sun in Libra and Saturn in Aries (mutual reception by exaltation)', () => {
      // Sun at 200° = Libra 20°
      // Saturn at 20° = Aries 20°
      // Sun exalted in Aries, Saturn exalted in Libra
      const reception = analyzeReception('sun', 200, 'saturn', 20);

      expect(reception.type).toBe('mutual_reception_exaltation');
      expect(reception.quality).toBe('very_positive');
      expect(reception.score).toBe(8);
      expect(reception.details.planet1ReceivesPlanet2).toBe(true);
      expect(reception.details.planet2ReceivesPlanet1).toBe(true);
      expect(reception.details.planet1ReceptionType).toBe('exaltation');
      expect(reception.details.planet2ReceptionType).toBe('exaltation');
      expect(reception.interpretation).toContain('mutual reception by exaltation');
    });

    it('should detect Moon in Capricorn and Mars in Taurus (mutual reception by exaltation)', () => {
      // Moon at 280° = Capricorn 10°
      // Mars at 40° = Taurus 10°
      // Moon exalted in Taurus, Mars exalted in Capricorn
      const reception = analyzeReception('moon', 280, 'mars', 40);

      expect(reception.type).toBe('mutual_reception_exaltation');
      expect(reception.quality).toBe('very_positive');
      expect(reception.score).toBe(8);
    });
  });

  describe('Mixed Mutual Reception', () => {
    it('should detect mixed mutual reception (one by rulership, one by exaltation)', () => {
      // Venus at 0° = Aries 0° (Mars' rulership sign)
      // Mars at 357° = Pisces 27° (Venus' exaltation sign)
      // Mars receives Venus by rulership (Venus in Aries), Venus receives Mars by exaltation (Mars in Pisces)
      const reception = analyzeReception('venus', 0, 'mars', 357);

      expect(reception.type).toBe('mutual_reception_mixed');
      expect(reception.quality).toBe('very_positive');
      expect(reception.score).toBe(9);
      expect(reception.details.planet1ReceivesPlanet2).toBe(true);
      expect(reception.details.planet2ReceivesPlanet1).toBe(true);
      expect(reception.interpretation).toContain('mixed mutual reception');
    });

    it('should detect mixed mutual reception (reversed)', () => {
      // Moon at 120° = Leo 0° (Sun's rulership)
      // Sun at 35° = Taurus 5° (Moon's exaltation)
      // Moon receives Sun by rulership, Sun receives Moon by exaltation
      const reception = analyzeReception('moon', 120, 'sun', 35);

      expect(reception.type).toBe('mutual_reception_mixed');
      expect(reception.quality).toBe('very_positive');
      expect(reception.score).toBe(9);
    });
  });

  describe('One-way Reception by Rulership', () => {
    it('should detect one-way reception by rulership (Mars receives Sun)', () => {
      // Sun at 5° = Aries 5° (Mars rules Aries)
      // Mars at 60° = Gemini 0° (Sun does not rule Gemini)
      const reception = analyzeReception('sun', 5, 'mars', 60);

      expect(reception.type).toBe('one_way_rulership');
      expect(reception.quality).toBe('positive');
      expect(reception.score).toBe(5);
      expect(reception.details.planet1ReceivesPlanet2).toBe(false);
      expect(reception.details.planet2ReceivesPlanet1).toBe(true);
      // Note: interpretation says "not mutual" not "one-way"
      expect(reception.interpretation).toContain('not mutual');
    });

    it('should detect one-way reception by rulership (Moon receives Venus)', () => {
      // Venus at 90° = Cancer 0° (Moon rules Cancer, BUT also Venus' fall sign!)
      // Moon at 35° = Taurus 5° (Venus rules Taurus)
      // This is actually MUTUAL reception (Moon by rulership, Venus by rulership)
      // Let me use a different example: Venus in Leo, Moon in Libra
      // Venus at 130° = Leo 10° (Sun rules Leo, no Moon reception)
      // Moon at 200° = Libra 20° (Venus rules Libra)
      const reception = analyzeReception('venus', 130, 'moon', 200);

      expect(reception.type).toBe('one_way_rulership');
      expect(reception.quality).toBe('positive');
      expect(reception.score).toBe(5);
      expect(reception.details.planet1ReceivesPlanet2).toBe(true); // Venus receives Moon
      expect(reception.details.planet2ReceivesPlanet1).toBe(false);
    });
  });

  describe('One-way Reception by Exaltation', () => {
    it('should detect one-way reception by exaltation', () => {
      // Sun at 35° = Taurus 5° (Moon's exaltation sign)
      // Moon at 150° = Virgo 0° (Sun not exalted in Virgo)
      const reception = analyzeReception('sun', 35, 'moon', 150);

      expect(reception.type).toBe('one_way_exaltation');
      expect(reception.quality).toBe('positive');
      expect(reception.score).toBe(4);
      expect(reception.details.planet1ReceivesPlanet2).toBe(false);
      expect(reception.details.planet2ReceivesPlanet1).toBe(true);
    });

    it('should detect one-way reception by exaltation (reversed)', () => {
      // Sun at 95° = Cancer 5° (Jupiter's exaltation sign)
      // Jupiter at 60° = Gemini 0° (Sun not exalted in Gemini, Jupiter doesn't receive Sun)
      // Jupiter receives Sun by exaltation (Sun in Cancer, Jupiter's exaltation)
      const reception = analyzeReception('sun', 95, 'jupiter', 60);

      expect(reception.type).toBe('one_way_exaltation');
      expect(reception.quality).toBe('positive');
      expect(reception.score).toBe(4);
      expect(reception.details.planet1ReceivesPlanet2).toBe(false);
      expect(reception.details.planet2ReceivesPlanet1).toBe(true); // Jupiter receives Sun
      expect(reception.details.planet2ReceptionType).toBe('exaltation');
    });
  });

  describe('Reception in Detriment', () => {
    it('should detect reception in detriment (Sun in Aquarius, received by Saturn)', () => {
      // Sun at 300° = Aquarius 0° (Sun's detriment, Saturn's rulership)
      // Saturn at 60° = Gemini 0° (Saturn receives Sun, but Sun is in detriment)
      const reception = analyzeReception('sun', 300, 'saturn', 60);

      expect(reception.type).toBe('reception_in_detriment');
      expect(reception.quality).toBe('negative');
      expect(reception.score).toBe(-8);
      expect(reception.interpretation).toContain('detriment');
    });

    it('should detect reception in detriment (Moon in Capricorn, received by Saturn)', () => {
      // Moon at 275° = Capricorn 5° (Moon's detriment, Saturn's rulership)
      // Saturn at 60° = Gemini 0° (Saturn receives Moon, but Moon is in detriment)
      const reception = analyzeReception('moon', 275, 'saturn', 60);

      expect(reception.type).toBe('reception_in_detriment');
      expect(reception.quality).toBe('negative');
      expect(reception.score).toBe(-8);
    });

    it('should detect reception in detriment (Mars in Libra, received by Venus)', () => {
      // Mars at 185° = Libra 5° (Mars' detriment, Venus's rulership)
      // Venus at 120° = Leo 0° (Venus receives Mars, but Mars is in detriment)
      const reception = analyzeReception('mars', 185, 'venus', 120);

      expect(reception.type).toBe('reception_in_detriment');
      expect(reception.quality).toBe('negative');
      expect(reception.score).toBe(-8);
    });
  });

  describe('Reception in Fall', () => {
    it('should detect reception in fall (Sun in Libra, received by Saturn)', () => {
      // Sun at 199° = Libra 19° (Sun's fall, Saturn's exaltation)
      // Saturn at 60° = Gemini 0° (Saturn receives Sun by exaltation, but Sun is in fall)
      const reception = analyzeReception('sun', 199, 'saturn', 60);

      expect(reception.type).toBe('reception_in_fall');
      expect(reception.quality).toBe('very_negative');
      expect(reception.score).toBe(-10);
      expect(reception.interpretation).toContain('fall');
    });

    it('should detect reception in fall (Mars in Cancer, received by Jupiter)', () => {
      // Mars at 118° = Cancer 28° (Mars' fall, Jupiter's exaltation)
      // Jupiter at 240° = Sagittarius 0° (Jupiter receives Mars by exaltation, but Mars is in fall)
      const reception = analyzeReception('mars', 118, 'jupiter', 240);

      expect(reception.type).toBe('reception_in_fall');
      expect(reception.quality).toBe('very_negative');
      expect(reception.score).toBe(-10);
    });

    it('should detect reception in fall (Moon in Scorpio, received by Mars)', () => {
      // Moon at 213° = Scorpio 3° (Moon's fall, Mars' rulership)
      // Mars at 120° = Leo 0° (Mars receives Moon by rulership, but Moon is in fall)
      const reception = analyzeReception('moon', 213, 'mars', 120);

      expect(reception.type).toBe('reception_in_fall');
      expect(reception.quality).toBe('very_negative');
      expect(reception.score).toBe(-10);
    });
  });

  describe('No Reception', () => {
    it('should detect no reception (indifference)', () => {
      // Sun at 60° = Gemini 0° (Mercury's sign)
      // Moon at 150° = Virgo 0° (Mercury's sign)
      // No reception between Sun and Moon
      const reception = analyzeReception('sun', 60, 'moon', 150);

      expect(reception.type).toBe('no_reception');
      expect(reception.quality).toBe('neutral');
      expect(reception.score).toBe(0);
      expect(reception.details.planet1ReceivesPlanet2).toBe(false);
      expect(reception.details.planet2ReceivesPlanet1).toBe(false);
      expect(reception.interpretation).toContain('no reception');
    });

    it('should detect no reception (another case)', () => {
      // Venus at 120° = Leo 0° (Sun's sign)
      // Jupiter at 240° = Sagittarius 0° (Jupiter's own sign)
      const reception = analyzeReception('venus', 120, 'jupiter', 240);

      expect(reception.type).toBe('no_reception');
      expect(reception.quality).toBe('neutral');
      expect(reception.score).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle self-reception gracefully', () => {
      // Mars receiving Mars (should not happen in practice)
      const reception = analyzeReception('mars', 100, 'mars', 100);

      expect(reception.type).toBe('no_reception');
      expect(reception.quality).toBe('neutral');
      expect(reception.score).toBe(0);
      expect(reception.interpretation).toContain('cannot be in reception with itself');
    });

    it('should handle planets in same sign', () => {
      // Both in Aries, but different planets
      // Mars at 5° = Aries 5° (Mars rules Aries)
      // Venus at 10° = Aries 10° (Mars rules Aries, Venus in detriment)
      const reception = analyzeReception('mars', 5, 'venus', 10);

      // Mars receives Venus (Venus in Mars' sign), but Venus doesn't receive Mars
      // Also Venus is in detriment (Aries is opposite to Libra, Venus' sign)
      expect(reception.type).toBe('reception_in_detriment');
      expect(reception.score).toBe(-8);
    });
  });

  describe('Reception Priority (Most Significant Takes Precedence)', () => {
    it('should prioritize mutual reception over negative receptions', () => {
      // If there's mutual reception, it should be detected first
      // Mars in Cancer (Mars' fall, Moon's rulership)
      // Moon in Aries (Mars' rulership)
      // This is mutual reception by rulership, which overrides the fall
      const reception = analyzeReception('mars', 100, 'moon', 10);

      expect(reception.type).toBe('mutual_reception_rulership');
      expect(reception.quality).toBe('very_positive');
      expect(reception.score).toBe(10);
    });
  });

  describe('Format Reception for Display', () => {
    it('should format very positive reception correctly', () => {
      const reception = analyzeReception('mars', 100, 'moon', 10);
      const formatted = formatReceptionForDisplay('mars', 'moon', reception);

      expect(formatted).toContain('MARS');
      expect(formatted).toContain('MOON');
      expect(formatted).toContain('✓✓');
      expect(formatted).toContain('10/10');
    });

    it('should format negative reception correctly', () => {
      const reception = analyzeReception('sun', 300, 'saturn', 60);
      const formatted = formatReceptionForDisplay('sun', 'saturn', reception);

      expect(formatted).toContain('SUN');
      expect(formatted).toContain('SATURN');
      expect(formatted).toContain('✗');
      expect(formatted).toContain('-8/10');
    });

    it('should format neutral reception correctly', () => {
      const reception = analyzeReception('sun', 60, 'moon', 150);
      const formatted = formatReceptionForDisplay('sun', 'moon', reception);

      expect(formatted).toContain('•');
      expect(formatted).toContain('0/10');
    });
  });
});
