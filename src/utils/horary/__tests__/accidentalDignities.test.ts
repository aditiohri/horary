/**
 * Tests for Accidental Dignities Calculator
 */

import { describe, it, expect } from 'vitest';
import {
  getHouseType,
  calculateHousePlacementScore,
  getPlanetarySpeedStatus,
  calculateAngularDistance,
  getRelationshipToSun,
  getPlanetHouse,
  calculateAccidentalDignities,
  calculateChartAccidentalDignities
} from '../accidentalDignities';

describe('House Type Classification', () => {
  it('should correctly identify Angular houses', () => {
    expect(getHouseType(1)).toBe('Angular');
    expect(getHouseType(4)).toBe('Angular');
    expect(getHouseType(7)).toBe('Angular');
    expect(getHouseType(10)).toBe('Angular');
  });

  it('should correctly identify Succedent houses', () => {
    expect(getHouseType(2)).toBe('Succedent');
    expect(getHouseType(5)).toBe('Succedent');
    expect(getHouseType(8)).toBe('Succedent');
    expect(getHouseType(11)).toBe('Succedent');
  });

  it('should correctly identify Cadent houses', () => {
    expect(getHouseType(3)).toBe('Cadent');
    expect(getHouseType(6)).toBe('Cadent');
    expect(getHouseType(9)).toBe('Cadent');
    expect(getHouseType(12)).toBe('Cadent');
  });
});

describe('House Placement Score', () => {
  it('should assign +5 for Angular houses', () => {
    expect(calculateHousePlacementScore(1)).toBe(5);
    expect(calculateHousePlacementScore(7)).toBe(5);
  });

  it('should assign +3 for Succedent houses', () => {
    expect(calculateHousePlacementScore(2)).toBe(3);
    expect(calculateHousePlacementScore(11)).toBe(3);
  });

  it('should assign +1 for Cadent houses', () => {
    expect(calculateHousePlacementScore(3)).toBe(1);
    expect(calculateHousePlacementScore(12)).toBe(1);
  });
});

describe('Planetary Speed Status', () => {
  it('should identify Retrograde motion', () => {
    const result = getPlanetarySpeedStatus('mars', -0.5, true);
    expect(result.status).toBe('Retrograde');
    expect(result.score).toBe(-5);
  });

  it('should identify Swift motion (>10% faster than average)', () => {
    // Mars average: 0.524°/day, swift would be > 0.576°/day
    const result = getPlanetarySpeedStatus('mars', 0.6, false);
    expect(result.status).toBe('Swift');
    expect(result.score).toBe(2);
  });

  it('should identify Slow motion (<10% slower than average)', () => {
    // Mars average: 0.524°/day, slow would be < 0.471°/day
    const result = getPlanetarySpeedStatus('mars', 0.4, false);
    expect(result.status).toBe('Slow');
    expect(result.score).toBe(-2);
  });

  it('should identify Average motion (within 10% of average)', () => {
    // Mars average: 0.524°/day
    const result = getPlanetarySpeedStatus('mars', 0.524, false);
    expect(result.status).toBe('Average');
    expect(result.score).toBe(0);
  });

  it('should default to Average when no speed provided', () => {
    const result = getPlanetarySpeedStatus('mars', undefined, false);
    expect(result.status).toBe('Average');
    expect(result.score).toBe(0);
  });

  it('should handle Moon speed correctly', () => {
    // Moon average: 13.1764°/day, swift would be > 14.49°/day
    const swiftResult = getPlanetarySpeedStatus('moon', 14.5, false);
    expect(swiftResult.status).toBe('Swift');
    expect(swiftResult.score).toBe(2);

    // Slow would be < 11.858°/day
    const slowResult = getPlanetarySpeedStatus('moon', 11.5, false);
    expect(slowResult.status).toBe('Slow');
    expect(slowResult.score).toBe(-2);
  });
});

describe('Angular Distance Calculation', () => {
  it('should calculate distance between close positions', () => {
    expect(calculateAngularDistance(10, 20)).toBeCloseTo(10, 2);
    expect(calculateAngularDistance(20, 10)).toBeCloseTo(10, 2);
  });

  it('should handle distances across 0/360 boundary', () => {
    expect(calculateAngularDistance(350, 10)).toBeCloseTo(20, 2);
    expect(calculateAngularDistance(10, 350)).toBeCloseTo(20, 2);
  });

  it('should return shortest distance (never > 180)', () => {
    expect(calculateAngularDistance(0, 180)).toBeCloseTo(180, 2);
    expect(calculateAngularDistance(0, 181)).toBeCloseTo(179, 2);
    expect(calculateAngularDistance(0, 270)).toBeCloseTo(90, 2);
  });

  it('should handle same positions', () => {
    expect(calculateAngularDistance(45, 45)).toBeCloseTo(0, 2);
  });

  it('should handle positions over 360 degrees', () => {
    expect(calculateAngularDistance(370, 10)).toBeCloseTo(0, 2);
    expect(calculateAngularDistance(720, 0)).toBeCloseTo(0, 2);
  });
});

describe('Relationship to Sun (Cazimi/Combust/Under Beams)', () => {
  const sunPosition = 100; // Sun at 100°

  it('should identify Cazimi (within 0.283°)', () => {
    const result = getRelationshipToSun('mars', 100.2, sunPosition);
    expect(result.condition).toBe('Cazimi');
    expect(result.score).toBe(5);
    expect(result.distance).toBeLessThanOrEqual(0.283);
  });

  it('should identify Combust (within 8° but not Cazimi)', () => {
    const result = getRelationshipToSun('mars', 105, sunPosition);
    expect(result.condition).toBe('Combust');
    expect(result.score).toBe(-5);
    expect(result.distance).toBeGreaterThan(0.283);
    expect(result.distance).toBeLessThanOrEqual(8);
  });

  it('should identify Under Sun\'s Beams (within 17° but not Combust)', () => {
    const result = getRelationshipToSun('mars', 110, sunPosition);
    expect(result.condition).toBe('Under Beams');
    expect(result.score).toBe(-4);
    expect(result.distance).toBeGreaterThan(8);
    expect(result.distance).toBeLessThanOrEqual(17);
  });

  it('should identify Free (more than 17° from Sun)', () => {
    const result = getRelationshipToSun('mars', 120, sunPosition);
    expect(result.condition).toBe('Free');
    expect(result.score).toBe(0);
    expect(result.distance).toBeGreaterThan(17);
  });

  it('should handle Sun itself (N/A)', () => {
    const result = getRelationshipToSun('sun', 100, sunPosition);
    expect(result.condition).toBe('N/A');
    expect(result.score).toBe(0);
    expect(result.distance).toBe(0);
  });

  it('should handle planets on opposite side of zodiac', () => {
    const result = getRelationshipToSun('venus', 280, sunPosition); // 180° away
    expect(result.condition).toBe('Free');
    expect(result.score).toBe(0);
  });

  it('should handle exact conjunction (0°)', () => {
    const result = getRelationshipToSun('mercury', 100, sunPosition);
    expect(result.condition).toBe('Cazimi');
    expect(result.score).toBe(5);
  });
});

describe('Get Planet House', () => {
  // Sample cusps: Aries rising (0°)
  const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

  it('should correctly assign planets to houses', () => {
    expect(getPlanetHouse(15, cusps)).toBe(1); // 15° in 1st house
    expect(getPlanetHouse(45, cusps)).toBe(2); // 45° in 2nd house
    expect(getPlanetHouse(95, cusps)).toBe(4); // 95° in 4th house
  });

  it('should handle planets at exact cusp', () => {
    expect(getPlanetHouse(30, cusps)).toBe(2); // Exactly on 2nd cusp
  });

  it('should handle planets across 0/360 boundary', () => {
    expect(getPlanetHouse(355, cusps)).toBe(12); // 355° in 12th house
  });

  it('should handle positions over 360', () => {
    expect(getPlanetHouse(375, cusps)).toBe(1); // 375° = 15° in 1st house
  });
});

describe('Calculate Accidental Dignities', () => {
  const sunPosition = 100;

  it('should calculate dignities for planet in Angular house, Swift, Free from Sun', () => {
    const result = calculateAccidentalDignities(
      'mars',
      45,  // Position
      0.6, // Swift speed
      false,
      1,   // Angular house
      sunPosition
    );

    expect(result.houseType).toBe('Angular');
    expect(result.housePlacementScore).toBe(5);
    expect(result.speedStatus).toBe('Swift');
    expect(result.speedScore).toBe(2);
    expect(result.lightCondition).toBe('Free');
    expect(result.lightScore).toBe(0);
    expect(result.totalScore).toBe(7); // 5 + 2 + 0
    expect(result.strength).toBe('Strong');
  });

  it('should calculate dignities for retrograde planet in Cadent house', () => {
    const result = calculateAccidentalDignities(
      'saturn',
      200, // Position
      -0.03, // Retrograde
      true,
      6,   // Cadent house
      sunPosition
    );

    expect(result.houseType).toBe('Cadent');
    expect(result.housePlacementScore).toBe(1);
    expect(result.speedStatus).toBe('Retrograde');
    expect(result.speedScore).toBe(-5);
    expect(result.lightCondition).toBe('Free');
    expect(result.totalScore).toBe(-4); // 1 + (-5) + 0
    expect(result.strength).toBe('Weak');
  });

  it('should calculate dignities for Combust planet', () => {
    const result = calculateAccidentalDignities(
      'venus',
      105, // Close to Sun
      1.2,
      false,
      7,   // Angular house
      sunPosition
    );

    expect(result.houseType).toBe('Angular');
    expect(result.lightCondition).toBe('Combust');
    expect(result.lightScore).toBe(-5);
    expect(result.totalScore).toBe(0); // 5 + 0 + (-5)
    expect(result.strength).toBe('Neutral');
  });

  it('should calculate dignities for Cazimi planet', () => {
    const result = calculateAccidentalDignities(
      'mercury',
      100.1, // Very close to Sun (Cazimi)
      1.4,
      false,
      10,  // Angular house
      sunPosition
    );

    expect(result.lightCondition).toBe('Cazimi');
    expect(result.lightScore).toBe(5);
    expect(result.totalScore).toBe(10); // 5 + 0 + 5
    expect(result.strength).toBe('Very Strong');
  });

  it('should handle Sun itself (no light score)', () => {
    const result = calculateAccidentalDignities(
      'sun',
      sunPosition,
      0.9856,
      false,
      4,
      sunPosition
    );

    expect(result.lightCondition).toBe('N/A');
    expect(result.lightScore).toBe(0);
    expect(result.houseType).toBe('Angular');
    expect(result.totalScore).toBe(5); // 5 + 0 + 0
  });

  it('should calculate for Slow planet In Chariot in Succedent house', () => {
    // Jupiter at 110° is in Cancer (exalted), 10° from Sun (under beams range)
    // But Jupiter is protected by exaltation = "In Chariot"
    const result = calculateAccidentalDignities(
      'jupiter',
      110, // Cancer - Jupiter's exaltation
      0.07, // Slow (avg is ~0.0831)
      false,
      2,   // Succedent house
      sunPosition,
      true // Day chart
    );

    expect(result.houseType).toBe('Succedent');
    expect(result.housePlacementScore).toBe(3);
    expect(result.speedStatus).toBe('Slow');
    expect(result.speedScore).toBe(-2);
    expect(result.lightCondition).toBe('In Chariot');
    expect(result.lightScore).toBe(2); // Protected by exaltation!
    expect(result.totalScore).toBe(3); // 3 + (-2) + 2
    expect(result.strength).toBe('Moderate');
  });

  it('should identify Venus In Chariot (exalted in Pisces, under beams)', () => {
    const result = calculateAccidentalDignities(
      'venus',
      357, // 27° Pisces - Venus exact exaltation
      1.2,
      false,
      1,
      343, // Sun at 13° Pisces - 14° separation (under beams range)
      true
    );

    expect(result.lightCondition).toBe('In Chariot');
    expect(result.lightScore).toBe(2); // Under beams but protected by exaltation
  });

  it('should identify Mars In Chariot (ruler in Aries, combust)', () => {
    const result = calculateAccidentalDignities(
      'mars',
      5, // 5° Aries - Mars rules Aries
      0.524,
      false,
      1,
      3, // Sun at 3° Aries - 2° separation (combust!)
      true
    );

    expect(result.lightCondition).toBe('In Chariot');
    expect(result.lightScore).toBe(3); // Combust but protected by rulership
  });

  it('should NOT be In Chariot if planet lacks dignity (regular Under Beams)', () => {
    const result = calculateAccidentalDignities(
      'saturn',
      110, // 20° Cancer - Saturn NOT dignified here
      0.0335,
      false,
      2,
      sunPosition, // 10° separation
      true
    );

    expect(result.lightCondition).toBe('Under Beams');
    expect(result.lightScore).toBe(-4); // Regular penalty
  });

  it('should NOT be In Chariot if planet lacks dignity (regular Combust)', () => {
    const result = calculateAccidentalDignities(
      'mercury',
      103, // 13° Cancer - Mercury NOT dignified here
      1.3833,
      false,
      7,
      sunPosition, // 3° separation (combust)
      true
    );

    expect(result.lightCondition).toBe('Combust');
    expect(result.lightScore).toBe(-5); // Regular combustion penalty
  });
});

describe('Calculate Chart Accidental Dignities', () => {
  const mockPlanets = {
    sun: { position: 100, isRetrograde: false, speed: 0.9856 },
    moon: { position: 45, isRetrograde: false, speed: 14.0 },
    mercury: { position: 100.2, isRetrograde: false, speed: 1.4 },
    venus: { position: 120, isRetrograde: false, speed: 1.2 },
    mars: { position: 200, isRetrograde: true, speed: -0.5 },
    jupiter: { position: 280, isRetrograde: false, speed: 0.083 },
    saturn: { position: 350, isRetrograde: false, speed: 0.033 }
  };

  const mockCusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

  it('should calculate accidental dignities for all planets', () => {
    const result = calculateChartAccidentalDignities(mockPlanets, mockCusps);

    expect(result).toHaveProperty('sun');
    expect(result).toHaveProperty('moon');
    expect(result).toHaveProperty('mercury');
    expect(result).toHaveProperty('venus');
    expect(result).toHaveProperty('mars');
    expect(result).toHaveProperty('jupiter');
    expect(result).toHaveProperty('saturn');
  });

  it('should correctly identify Mercury as Cazimi', () => {
    const result = calculateChartAccidentalDignities(mockPlanets, mockCusps);
    expect(result.mercury.lightCondition).toBe('Cazimi');
    expect(result.mercury.lightScore).toBe(5);
  });

  it('should correctly identify Mars as Retrograde', () => {
    const result = calculateChartAccidentalDignities(mockPlanets, mockCusps);
    expect(result.mars.speedStatus).toBe('Retrograde');
    expect(result.mars.speedScore).toBe(-5);
  });

  it('should correctly calculate house types', () => {
    const result = calculateChartAccidentalDignities(mockPlanets, mockCusps);

    // Sun at 100° = House 4 (Angular)
    expect(result.sun.houseType).toBe('Angular');

    // Moon at 45° = House 2 (Succedent)
    expect(result.moon.houseType).toBe('Succedent');

    // Saturn at 350° = House 12 (Cadent)
    expect(result.saturn.houseType).toBe('Cadent');
  });

  it('should handle planets without speed data', () => {
    const planetsWithoutSpeed = {
      sun: { position: 100, isRetrograde: false },
      mars: { position: 200, isRetrograde: true }
    };

    const result = calculateChartAccidentalDignities(planetsWithoutSpeed, mockCusps);

    expect(result.sun.speedStatus).toBe('Average');
    expect(result.mars.speedStatus).toBe('Retrograde');
  });

  it('should calculate total scores correctly', () => {
    const result = calculateChartAccidentalDignities(mockPlanets, mockCusps);

    // Each planet should have a total score
    expect(result.sun.totalScore).toBe(5); // Angular (5) + Average (0) + N/A (0)
    expect(result.mercury.totalScore).toBe(10); // Angular (5) + Average (0) + Cazimi (5)
    // Mars: House 7 (Angular, +5) + Retrograde (-5) + Free from Sun (0) = 0
    expect(result.mars.totalScore).toBe(0);
    expect(result.mars.speedStatus).toBe('Retrograde'); // Verify it's retrograde
  });
});

describe('Strength Classification', () => {
  const sunPosition = 100;

  it('should classify Very Strong (10+)', () => {
    const result = calculateAccidentalDignities('mercury', 100.1, 1.5, false, 1, sunPosition);
    expect(result.strength).toBe('Very Strong');
    expect(result.totalScore).toBeGreaterThanOrEqual(10);
  });

  it('should classify Strong (5-9)', () => {
    const result = calculateAccidentalDignities('mars', 200, 0.6, false, 1, sunPosition);
    expect(result.strength).toBe('Strong');
    expect(result.totalScore).toBeGreaterThanOrEqual(5);
    expect(result.totalScore).toBeLessThan(10);
  });

  it('should classify Moderate (1-4)', () => {
    const result = calculateAccidentalDignities('jupiter', 200, 0.083, false, 3, sunPosition);
    expect(result.strength).toBe('Moderate');
    expect(result.totalScore).toBeGreaterThan(0);
    expect(result.totalScore).toBeLessThan(5);
  });

  it('should classify Neutral (0)', () => {
    const result = calculateAccidentalDignities('venus', 105, 1.2, false, 7, sunPosition);
    expect(result.strength).toBe('Neutral');
    expect(result.totalScore).toBe(0);
  });

  it('should classify Weak (-1 to -5)', () => {
    const result = calculateAccidentalDignities('saturn', 200, 0.03, false, 6, sunPosition);
    expect(result.strength).toBe('Weak');
    expect(result.totalScore).toBeGreaterThanOrEqual(-5);
    expect(result.totalScore).toBeLessThan(0);
  });

  it('should classify Very Weak (<-5)', () => {
    const result = calculateAccidentalDignities('mars', 105, -0.5, true, 6, sunPosition);
    expect(result.strength).toBe('Very Weak');
    expect(result.totalScore).toBeLessThan(-5);
  });
});
