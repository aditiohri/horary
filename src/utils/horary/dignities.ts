/**
 * Essential Dignities Calculator for Horary Astrology
 * Based on William Lilly's traditional system
 *
 * Calculates:
 * - Domicile (Rulership)
 * - Exaltation
 * - Detriment
 * - Fall
 * - Triplicity (Lilly system)
 */

// Planet type for TypeScript
type Planet = 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn';
type Sign = 'aries' | 'taurus' | 'gemini' | 'cancer' | 'leo' | 'virgo' |
            'libra' | 'scorpio' | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';

// Convert degrees (0-360) to sign name and degree within sign
export function getSignFromDegrees(degrees: number): { sign: Sign; degreeInSign: number } {
  const normalizedDegrees = ((degrees % 360) + 360) % 360;
  const signIndex = Math.floor(normalizedDegrees / 30);
  const degreeInSign = normalizedDegrees % 30;

  const signs: Sign[] = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
  ];

  return {
    sign: signs[signIndex],
    degreeInSign
  };
}

// Domicile (Rulership) - What signs each planet rules
const RULERSHIPS: Record<Planet, Sign[]> = {
  sun: ['leo'],
  moon: ['cancer'],
  mercury: ['gemini', 'virgo'],
  venus: ['taurus', 'libra'],
  mars: ['aries', 'scorpio'],
  jupiter: ['sagittarius', 'pisces'],
  saturn: ['capricorn', 'aquarius']
};

// Exaltations - Sign and exact degree of exaltation
const EXALTATIONS: Record<Planet, { sign: Sign; degree: number }> = {
  sun: { sign: 'aries', degree: 19 },
  moon: { sign: 'taurus', degree: 3 },
  mercury: { sign: 'virgo', degree: 15 },
  venus: { sign: 'pisces', degree: 27 },
  mars: { sign: 'capricorn', degree: 28 },
  jupiter: { sign: 'cancer', degree: 15 },
  saturn: { sign: 'libra', degree: 21 }
};

// Detriment - Opposite of rulership
const DETRIMENTS: Record<Planet, Sign[]> = {
  sun: ['aquarius'],
  moon: ['capricorn'],
  mercury: ['sagittarius', 'pisces'],
  venus: ['aries', 'scorpio'],
  mars: ['libra', 'taurus'],
  jupiter: ['gemini', 'virgo'],
  saturn: ['cancer', 'leo']
};

// Fall - Opposite of exaltation
const FALLS: Record<Planet, { sign: Sign; degree: number }> = {
  sun: { sign: 'libra', degree: 19 },
  moon: { sign: 'scorpio', degree: 3 },
  mercury: { sign: 'pisces', degree: 15 },
  venus: { sign: 'virgo', degree: 27 },
  mars: { sign: 'cancer', degree: 28 },
  jupiter: { sign: 'capricorn', degree: 15 },
  saturn: { sign: 'aries', degree: 21 }
};

// Triplicities - Lilly system (Day ruler, Night ruler, Participating ruler)
type TriplicityRuler = {
  day: Planet;
  night: Planet;
  participating: Planet;
};

const TRIPLICITIES: Record<string, TriplicityRuler> = {
  fire: { day: 'sun', night: 'jupiter', participating: 'saturn' },      // Aries, Leo, Sagittarius
  earth: { day: 'venus', night: 'moon', participating: 'mars' },        // Taurus, Virgo, Capricorn
  air: { day: 'saturn', night: 'mercury', participating: 'jupiter' },   // Gemini, Libra, Aquarius
  water: { day: 'venus', night: 'mars', participating: 'moon' }         // Cancer, Scorpio, Pisces
};

// Map signs to their elements
const SIGN_ELEMENTS: Record<Sign, 'fire' | 'earth' | 'air' | 'water'> = {
  aries: 'fire',
  leo: 'fire',
  sagittarius: 'fire',
  taurus: 'earth',
  virgo: 'earth',
  capricorn: 'earth',
  gemini: 'air',
  libra: 'air',
  aquarius: 'air',
  cancer: 'water',
  scorpio: 'water',
  pisces: 'water'
};

// Dignity scoring system
const DIGNITY_SCORES = {
  ruler: 5,
  exaltation: 4,
  triplicity: 3,
  detriment: -4,
  fall: -5,
  peregrine: 0  // No dignity
};

export interface EssentialDignity {
  // Flags for each dignity type
  isRuler: boolean;
  isExalted: boolean;
  isDetriment: boolean;
  isFall: boolean;
  triplicityRuler: 'day' | 'night' | 'participating' | null;

  // Scoring
  score: number;

  // Description for humans
  description: string;
  strength: 'Very Strong' | 'Strong' | 'Moderate' | 'Weak' | 'Very Weak' | 'Peregrine';
}

/**
 * Calculate essential dignities for a planet at a given position
 * @param planet - The planet name
 * @param absoluteDegrees - Position in zodiac (0-360)
 * @param isDayChart - True if Sun is above horizon (optional, for triplicity)
 * @returns Essential dignity information
 */
export function calculateEssentialDignities(
  planet: Planet,
  absoluteDegrees: number,
  isDayChart?: boolean
): EssentialDignity {
  const { sign, degreeInSign } = getSignFromDegrees(absoluteDegrees);

  // Check rulership
  const isRuler = RULERSHIPS[planet].includes(sign);

  // Check exaltation (within 5° of exact degree for scoring purposes)
  const exaltation = EXALTATIONS[planet];
  const isExalted = exaltation.sign === sign;
  const isExactExaltation = isExalted && Math.abs(degreeInSign - exaltation.degree) <= 5;

  // Check detriment
  const isDetriment = DETRIMENTS[planet].includes(sign);

  // Check fall (within 5° of exact degree for scoring purposes)
  const fall = FALLS[planet];
  const isFall = fall.sign === sign;
  const isExactFall = isFall && Math.abs(degreeInSign - fall.degree) <= 5;

  // Check triplicity
  const element = SIGN_ELEMENTS[sign];
  const triplicityRulers = TRIPLICITIES[element];
  let triplicityRuler: 'day' | 'night' | 'participating' | null = null;

  if (triplicityRulers.day === planet) {
    triplicityRuler = 'day';
  } else if (triplicityRulers.night === planet) {
    triplicityRuler = 'night';
  } else if (triplicityRulers.participating === planet) {
    triplicityRuler = 'participating';
  }

  // Calculate score
  let score = 0;
  const dignities: string[] = [];

  if (isRuler) {
    score += DIGNITY_SCORES.ruler;
    dignities.push('Ruler');
  }

  if (isExactExaltation) {
    score += DIGNITY_SCORES.exaltation;
    dignities.push('Exalted');
  }

  if (triplicityRuler) {
    score += DIGNITY_SCORES.triplicity;
    // Only count triplicity if it matches day/night chart (if known)
    if (isDayChart === undefined ||
        (isDayChart && triplicityRuler === 'day') ||
        (!isDayChart && triplicityRuler === 'night') ||
        triplicityRuler === 'participating') {
      dignities.push(`Triplicity (${triplicityRuler})`);
    }
  }

  if (isDetriment && !isRuler) {
    score += DIGNITY_SCORES.detriment;
    dignities.push('Detriment');
  }

  if (isExactFall && !isExactExaltation) {
    score += DIGNITY_SCORES.fall;
    dignities.push('Fall');
  }

  // Determine description
  const description = dignities.length > 0 ? dignities.join(', ') : 'Peregrine (no essential dignity)';

  // Determine strength
  let strength: EssentialDignity['strength'];
  if (score >= 8) {
    strength = 'Very Strong';
  } else if (score >= 4) {
    strength = 'Strong';
  } else if (score > 0) {
    strength = 'Moderate';
  } else if (score === 0) {
    strength = 'Peregrine';
  } else if (score >= -4) {
    strength = 'Weak';
  } else {
    strength = 'Very Weak';
  }

  return {
    isRuler,
    isExalted: isExactExaltation,
    isDetriment,
    isFall: isExactFall,
    triplicityRuler,
    score,
    description,
    strength
  };
}

/**
 * Get the planetary ruler of a sign
 */
export function getSignRuler(sign: Sign): Planet {
  for (const [planet, signs] of Object.entries(RULERSHIPS)) {
    if (signs.includes(sign)) {
      return planet as Planet;
    }
  }
  throw new Error(`No ruler found for sign: ${sign}`);
}

/**
 * Calculate dignities for all planets in a chart
 */
export function calculateChartDignities(
  planets: Record<string, { position: number; isRetrograde: boolean }>,
  isDayChart?: boolean
): Record<string, EssentialDignity> {
  const dignities: Record<string, EssentialDignity> = {};

  const planetKeys: Planet[] = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];

  for (const planet of planetKeys) {
    if (planets[planet]) {
      dignities[planet] = calculateEssentialDignities(
        planet,
        planets[planet].position,
        isDayChart
      );
    }
  }

  return dignities;
}

/**
 * Determine if chart is day or night (Sun above or below horizon)
 * Day chart: Sun is in houses 7-12 (above horizon)
 * Night chart: Sun is in houses 1-6 (below horizon)
 */
export function isDayChart(sunHouse: number): boolean {
  return sunHouse >= 7 && sunHouse <= 12;
}

/**
 * Format dignity information for display
 */
export function formatDignityForDisplay(
  planet: string,
  dignity: EssentialDignity,
  position: string
): string {
  let output = `**${planet.charAt(0).toUpperCase() + planet.slice(1)}** at ${position}\n`;
  output += `  Essential Dignity: ${dignity.description}\n`;
  output += `  Strength: ${dignity.strength} (Score: ${dignity.score})\n`;
  return output;
}
