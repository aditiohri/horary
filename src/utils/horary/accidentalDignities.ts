/**
 * Accidental Dignities Calculator for Horary Astrology
 * Based on William Lilly's traditional system
 *
 * Calculates:
 * - House placement strength (Angular/Succedent/Cadent)
 * - Planetary speed (Swift/Average/Slow/Retrograde)
 * - Cazimi/Combust/Under Beams/In Chariot (relationship to Sun)
 */

import { getSignFromDegrees } from './dignities';

type Planet = 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn';
type Sign = 'aries' | 'taurus' | 'gemini' | 'cancer' | 'leo' | 'virgo' |
            'libra' | 'scorpio' | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';

// Rulerships for "In Chariot" detection
const RULERSHIPS: Record<Planet, Sign[]> = {
  sun: ['leo'],
  moon: ['cancer'],
  mercury: ['gemini', 'virgo'],
  venus: ['taurus', 'libra'],
  mars: ['aries', 'scorpio'],
  jupiter: ['sagittarius', 'pisces'],
  saturn: ['capricorn', 'aquarius']
};

// Exaltation signs for "In Chariot" detection
const EXALTATION_SIGNS: Record<Planet, Sign> = {
  sun: 'aries',
  moon: 'taurus',
  mercury: 'virgo',
  venus: 'pisces',
  mars: 'capricorn',
  jupiter: 'cancer',
  saturn: 'libra'
};

// Average daily motion for planets (degrees per day)
const AVERAGE_DAILY_MOTION: { [key: string]: number } = {
  sun: 0.9856,
  moon: 13.1764,
  mercury: 1.3833,
  venus: 1.2,
  mars: 0.524,
  jupiter: 0.0831,
  saturn: 0.0335,
};

export interface AccidentalDignity {
  // House placement
  houseType: 'Angular' | 'Succedent' | 'Cadent';
  housePlacementScore: number;

  // Planetary speed
  speedStatus: 'Swift' | 'Average' | 'Slow' | 'Retrograde';
  speedScore: number;
  actualSpeed?: number; // degrees per day
  averageSpeed?: number; // degrees per day

  // Relationship to Sun (light of the Sun)
  lightCondition: 'Cazimi' | 'In Chariot' | 'Combust' | 'Under Beams' | 'Free' | 'N/A';
  lightScore: number;
  distanceFromSun?: number; // degrees

  // Total score
  totalScore: number;

  // Description for humans
  description: string;
  strength: 'Very Strong' | 'Strong' | 'Moderate' | 'Weak' | 'Very Weak' | 'Neutral';
}

/**
 * Determine house type (Angular/Succedent/Cadent) from house number
 */
export function getHouseType(house: number): 'Angular' | 'Succedent' | 'Cadent' {
  const angularHouses = [1, 4, 7, 10];
  const succedentHouses = [2, 5, 8, 11];
  const cadentHouses = [3, 6, 9, 12];

  if (angularHouses.includes(house)) return 'Angular';
  if (succedentHouses.includes(house)) return 'Succedent';
  if (cadentHouses.includes(house)) return 'Cadent';

  // Fallback (shouldn't happen)
  return 'Cadent';
}

/**
 * Calculate house placement score
 */
export function calculateHousePlacementScore(house: number): number {
  const houseType = getHouseType(house);

  switch (houseType) {
    case 'Angular':
      return 5;
    case 'Succedent':
      return 3;
    case 'Cadent':
      return 1;
    default:
      return 0;
  }
}

/**
 * Determine planetary speed status
 * @param planet - Planet name
 * @param actualSpeed - Actual speed from ephemeris (degrees per day)
 * @param isRetrograde - Whether planet is retrograde
 */
export function getPlanetarySpeedStatus(
  planet: Planet,
  actualSpeed: number | undefined,
  isRetrograde: boolean
): {
  status: 'Swift' | 'Average' | 'Slow' | 'Retrograde';
  score: number;
  actualSpeed?: number;
  averageSpeed: number;
} {
  // If retrograde, always return Retrograde status
  if (isRetrograde) {
    return {
      status: 'Retrograde',
      score: -5,
      actualSpeed,
      averageSpeed: AVERAGE_DAILY_MOTION[planet] || 0
    };
  }

  const averageSpeed = AVERAGE_DAILY_MOTION[planet] || 0;

  // If no actual speed provided, assume average
  if (actualSpeed === undefined) {
    return {
      status: 'Average',
      score: 0,
      averageSpeed
    };
  }

  // Use absolute value to compare speeds
  const absActualSpeed = Math.abs(actualSpeed);
  const absAverageSpeed = Math.abs(averageSpeed);

  // Swift: faster than average by at least 10%
  if (absActualSpeed > absAverageSpeed * 1.1) {
    return {
      status: 'Swift',
      score: 2,
      actualSpeed,
      averageSpeed
    };
  }

  // Slow: slower than average by at least 10%
  if (absActualSpeed < absAverageSpeed * 0.9) {
    return {
      status: 'Slow',
      score: -2,
      actualSpeed,
      averageSpeed
    };
  }

  // Average: within 10% of average speed
  return {
    status: 'Average',
    score: 0,
    actualSpeed,
    averageSpeed
  };
}

/**
 * Calculate angular distance between two positions
 * Returns the shortest angular distance (0-180 degrees)
 */
export function calculateAngularDistance(pos1: number, pos2: number): number {
  const normalized1 = ((pos1 % 360) + 360) % 360;
  const normalized2 = ((pos2 % 360) + 360) % 360;

  let distance = Math.abs(normalized1 - normalized2);
  if (distance > 180) {
    distance = 360 - distance;
  }

  return distance;
}

/**
 * Determine relationship to Sun (Cazimi/Combust/Under Beams/In Chariot)
 * @param planet - Planet name
 * @param planetPosition - Planet's position in degrees
 * @param sunPosition - Sun's position in degrees
 */
export function getRelationshipToSun(
  planet: Planet,
  planetPosition: number,
  sunPosition: number
): {
  condition: 'Cazimi' | 'In Chariot' | 'Combust' | 'Under Beams' | 'Free' | 'N/A';
  score: number;
  distance: number;
} {
  // Sun doesn't have a relationship with itself
  if (planet === 'sun') {
    return {
      condition: 'N/A',
      score: 0,
      distance: 0
    };
  }

  const distance = calculateAngularDistance(planetPosition, sunPosition);

  // Cazimi: within 17 minutes (0.283 degrees) of exact conjunction
  // This is always positive, even overrides "In Chariot"
  if (distance <= 0.283) {
    return {
      condition: 'Cazimi',
      score: 5,
      distance
    };
  }

  // Check if planet is in its own rulership or exaltation SIGN (for In Chariot protection)
  // A planet anywhere in its own sign is protected, not just at exact degree
  const { sign } = getSignFromDegrees(planetPosition);
  const isInRulership = RULERSHIPS[planet].includes(sign);
  const isInExaltation = EXALTATION_SIGNS[planet] === sign;
  const isInOwnDignity = isInRulership || isInExaltation;

  // Combust: within 8 degrees of Sun
  if (distance <= 8) {
    if (isInOwnDignity) {
      // "In Chariot" - planet is protected by its own dignity
      return {
        condition: 'In Chariot',
        score: 3, // Positive! Protected from combustion
        distance
      };
    }
    return {
      condition: 'Combust',
      score: -5,
      distance
    };
  }

  // Under Sun's Beams: within 17 degrees of Sun
  if (distance <= 17) {
    if (isInOwnDignity) {
      // "In Chariot" - planet is protected by its own dignity
      return {
        condition: 'In Chariot',
        score: 2, // Positive! Protected from beams
        distance
      };
    }
    return {
      condition: 'Under Beams',
      score: -4,
      distance
    };
  }

  // Free: more than 17 degrees from Sun
  return {
    condition: 'Free',
    score: 0,
    distance
  };
}

/**
 * Calculate planet's house from position and cusps
 */
export function getPlanetHouse(planetPosition: number, cusps: number[]): number {
  const normalizedPlanet = ((planetPosition % 360) + 360) % 360;

  for (let i = 0; i < cusps.length; i++) {
    const currentCusp = ((cusps[i] % 360) + 360) % 360;
    const nextCusp = ((cusps[(i + 1) % cusps.length] % 360) + 360) % 360;

    if (nextCusp > currentCusp) {
      if (normalizedPlanet >= currentCusp && normalizedPlanet < nextCusp) {
        return i + 1;
      }
    } else {
      if (normalizedPlanet >= currentCusp || normalizedPlanet < nextCusp) {
        return i + 1;
      }
    }
  }

  return 1; // fallback
}

/**
 * Calculate accidental dignities for a planet
 * @param planet - Planet name
 * @param planetPosition - Planet's position in degrees
 * @param planetSpeed - Planet's actual speed (degrees per day) - optional
 * @param isRetrograde - Whether planet is retrograde
 * @param house - House number (1-12)
 * @param sunPosition - Sun's position in degrees
 * @param isDayChart - Whether this is a day chart (for essential dignity calculation)
 */
export function calculateAccidentalDignities(
  planet: Planet,
  planetPosition: number,
  planetSpeed: number | undefined,
  isRetrograde: boolean,
  house: number,
  sunPosition: number,
  _isDayChart?: boolean
): AccidentalDignity {
  // Calculate house placement
  const houseType = getHouseType(house);
  const housePlacementScore = calculateHousePlacementScore(house);

  // Calculate planetary speed
  const speedInfo = getPlanetarySpeedStatus(planet, planetSpeed, isRetrograde);

  // Calculate relationship to Sun (In Chariot is detected automatically)
  const sunInfo = getRelationshipToSun(planet, planetPosition, sunPosition);

  // Calculate total score
  const totalScore = housePlacementScore + speedInfo.score + sunInfo.score;

  // Build description
  const descriptions: string[] = [];
  descriptions.push(`${houseType} house (+${housePlacementScore})`);

  if (speedInfo.status === 'Retrograde') {
    descriptions.push(`Retrograde (${speedInfo.score})`);
  } else if (speedInfo.status === 'Swift') {
    descriptions.push(`Swift motion (+${speedInfo.score})`);
  } else if (speedInfo.status === 'Slow') {
    descriptions.push(`Slow motion (${speedInfo.score})`);
  } else {
    descriptions.push(`Average speed (${speedInfo.score})`);
  }

  if (sunInfo.condition === 'Cazimi') {
    descriptions.push(`Cazimi (+${sunInfo.score})`);
  } else if (sunInfo.condition === 'In Chariot') {
    descriptions.push(`In Chariot (+${sunInfo.score})`);
  } else if (sunInfo.condition === 'Combust') {
    descriptions.push(`Combust (${sunInfo.score})`);
  } else if (sunInfo.condition === 'Under Beams') {
    descriptions.push(`Under Sun's Beams (${sunInfo.score})`);
  } else if (sunInfo.condition === 'Free') {
    descriptions.push(`Free from Sun (${sunInfo.score})`);
  }

  const description = descriptions.join(', ');

  // Determine strength
  let strength: AccidentalDignity['strength'];
  if (totalScore >= 10) {
    strength = 'Very Strong';
  } else if (totalScore >= 5) {
    strength = 'Strong';
  } else if (totalScore > 0) {
    strength = 'Moderate';
  } else if (totalScore === 0) {
    strength = 'Neutral';
  } else if (totalScore >= -5) {
    strength = 'Weak';
  } else {
    strength = 'Very Weak';
  }

  return {
    houseType,
    housePlacementScore,
    speedStatus: speedInfo.status,
    speedScore: speedInfo.score,
    actualSpeed: speedInfo.actualSpeed,
    averageSpeed: speedInfo.averageSpeed,
    lightCondition: sunInfo.condition,
    lightScore: sunInfo.score,
    distanceFromSun: sunInfo.distance,
    totalScore,
    description,
    strength
  };
}

/**
 * Calculate accidental dignities for all planets in a chart
 */
export function calculateChartAccidentalDignities(
  planets: Record<string, { position: number; speed?: number; isRetrograde: boolean }>,
  cusps: number[],
  isDayChart?: boolean
): Record<string, AccidentalDignity> {
  const accidentalDignities: Record<string, AccidentalDignity> = {};

  const planetKeys: Planet[] = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
  const sunPosition = planets.sun?.position || 0;

  for (const planet of planetKeys) {
    if (planets[planet]) {
      const planetData = planets[planet];
      const house = getPlanetHouse(planetData.position, cusps);

      accidentalDignities[planet] = calculateAccidentalDignities(
        planet,
        planetData.position,
        planetData.speed,
        planetData.isRetrograde,
        house,
        sunPosition,
        isDayChart
      );
    }
  }

  return accidentalDignities;
}

/**
 * Format accidental dignity information for display
 */
export function formatAccidentalDignityForDisplay(
  planet: string,
  dignity: AccidentalDignity
): string {
  let output = `**${planet.charAt(0).toUpperCase() + planet.slice(1)}**\n`;
  output += `  Accidental Dignity: ${dignity.description}\n`;
  output += `  Strength: ${dignity.strength} (Score: ${dignity.totalScore})\n`;

  if (dignity.actualSpeed !== undefined) {
    output += `  Speed: ${dignity.actualSpeed.toFixed(4)}°/day (avg: ${dignity.averageSpeed?.toFixed(4)}°/day)\n`;
  }

  if (dignity.distanceFromSun !== undefined && dignity.lightCondition !== 'N/A') {
    output += `  Distance from Sun: ${dignity.distanceFromSun.toFixed(2)}°\n`;
  }

  return output;
}
