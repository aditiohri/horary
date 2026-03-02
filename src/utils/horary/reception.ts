/**
 * Reception Analysis for Horary Astrology
 *
 * Reception describes how planets "receive" each other based on essential dignities.
 * It reveals the disposition between significators (how they feel about each other).
 *
 * Types of Reception:
 * - Mutual Reception by Rulership: Both planets in each other's ruled signs
 * - Mutual Reception by Exaltation: Both planets in each other's exaltation signs
 * - Mixed Mutual Reception: One by rulership, one by exaltation
 * - One-way Reception: Only one planet receives the other
 * - Reception in Detriment/Fall: Negative reception (dislike, resistance)
 * - No Reception: Indifference
 */

import { getSignFromDegrees } from './dignities';

type Planet = 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn';
type Sign = 'aries' | 'taurus' | 'gemini' | 'cancer' | 'leo' | 'virgo' |
            'libra' | 'scorpio' | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';

// Import dignity tables from dignities.ts
const RULERSHIPS: Record<Planet, Sign[]> = {
  sun: ['leo'],
  moon: ['cancer'],
  mercury: ['gemini', 'virgo'],
  venus: ['taurus', 'libra'],
  mars: ['aries', 'scorpio'],
  jupiter: ['sagittarius', 'pisces'],
  saturn: ['capricorn', 'aquarius']
};

const EXALTATIONS: Record<Planet, { sign: Sign; degree: number }> = {
  sun: { sign: 'aries', degree: 19 },
  moon: { sign: 'taurus', degree: 3 },
  mercury: { sign: 'virgo', degree: 15 },
  venus: { sign: 'pisces', degree: 27 },
  mars: { sign: 'capricorn', degree: 28 },
  jupiter: { sign: 'cancer', degree: 15 },
  saturn: { sign: 'libra', degree: 21 }
};

const DETRIMENTS: Record<Planet, Sign[]> = {
  sun: ['aquarius'],
  moon: ['capricorn'],
  mercury: ['sagittarius', 'pisces'],
  venus: ['aries', 'scorpio'],
  mars: ['libra', 'taurus'],
  jupiter: ['gemini', 'virgo'],
  saturn: ['cancer', 'leo']
};

const FALLS: Record<Planet, { sign: Sign; degree: number }> = {
  sun: { sign: 'libra', degree: 19 },
  moon: { sign: 'scorpio', degree: 3 },
  mercury: { sign: 'pisces', degree: 15 },
  venus: { sign: 'virgo', degree: 27 },
  mars: { sign: 'cancer', degree: 28 },
  jupiter: { sign: 'capricorn', degree: 15 },
  saturn: { sign: 'aries', degree: 21 }
};

export type ReceptionType =
  | 'mutual_reception_rulership'
  | 'mutual_reception_exaltation'
  | 'mutual_reception_mixed'
  | 'one_way_rulership'
  | 'one_way_exaltation'
  | 'reception_in_detriment'
  | 'reception_in_fall'
  | 'no_reception';

export type ReceptionQuality = 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';

export interface ReceptionAnalysis {
  type: ReceptionType;
  quality: ReceptionQuality;
  score: number; // -10 to +10
  interpretation: string;
  details: {
    planet1ReceivesPlanet2: boolean;
    planet2ReceivesPlanet1: boolean;
    planet1ReceptionType?: 'rulership' | 'exaltation' | 'detriment' | 'fall';
    planet2ReceptionType?: 'rulership' | 'exaltation' | 'detriment' | 'fall';
  };
}

/**
 * Check if a planet receives another planet by rulership
 * Planet A receives Planet B if Planet B is in a sign ruled by Planet A
 */
function receivesByRulership(receivingPlanet: Planet, planetInSign: Sign): boolean {
  return RULERSHIPS[receivingPlanet].includes(planetInSign);
}

/**
 * Check if a planet receives another planet by exaltation
 * Planet A receives Planet B if Planet B is in Planet A's exaltation sign
 */
function receivesByExaltation(receivingPlanet: Planet, planetInSign: Sign): boolean {
  return EXALTATIONS[receivingPlanet].sign === planetInSign;
}

/**
 * Check if a planet is in a sign of detriment for another planet
 */
function inDetriment(receivingPlanet: Planet, planetInSign: Sign): boolean {
  return DETRIMENTS[receivingPlanet].includes(planetInSign);
}

/**
 * Check if a planet is in a sign of fall for another planet
 */
function inFall(receivingPlanet: Planet, planetInSign: Sign): boolean {
  return FALLS[receivingPlanet].sign === planetInSign;
}

/**
 * Check if a planet is in its OWN detriment sign
 */
function isInOwnDetriment(planet: Planet, sign: Sign): boolean {
  return DETRIMENTS[planet].includes(sign);
}

/**
 * Check if a planet is in its OWN fall sign
 */
function isInOwnFall(planet: Planet, sign: Sign): boolean {
  return FALLS[planet].sign === sign;
}

/**
 * Analyze reception between two planets
 * @param planet1 - First planet name
 * @param planet1Position - First planet's position in degrees (0-360)
 * @param planet2 - Second planet name
 * @param planet2Position - Second planet's position in degrees (0-360)
 * @returns Reception analysis with type, quality, score, and interpretation
 */
export function analyzeReception(
  planet1: Planet,
  planet1Position: number,
  planet2: Planet,
  planet2Position: number
): ReceptionAnalysis {
  // Edge case: self-reception (should not happen in practice, but handle gracefully)
  if (planet1 === planet2) {
    return {
      type: 'no_reception',
      quality: 'neutral',
      score: 0,
      interpretation: 'A planet cannot be in reception with itself.',
      details: {
        planet1ReceivesPlanet2: false,
        planet2ReceivesPlanet1: false
      }
    };
  }

  // Get signs for both planets
  const planet1Sign = getSignFromDegrees(planet1Position).sign;
  const planet2Sign = getSignFromDegrees(planet2Position).sign;

  // Check all reception types
  const p1ReceivesP2ByRulership = receivesByRulership(planet1, planet2Sign);
  const p2ReceivesP1ByRulership = receivesByRulership(planet2, planet1Sign);
  const p1ReceivesP2ByExaltation = receivesByExaltation(planet1, planet2Sign);
  const p2ReceivesP1ByExaltation = receivesByExaltation(planet2, planet1Sign);
  // Check if planets are in their OWN detriment/fall
  const planet1InOwnDetriment = isInOwnDetriment(planet1, planet1Sign);
  const planet2InOwnDetriment = isInOwnDetriment(planet2, planet2Sign);
  const planet1InOwnFall = isInOwnFall(planet1, planet1Sign);
  const planet2InOwnFall = isInOwnFall(planet2, planet2Sign);

  // Priority order (based on traditional horary astrology):
  // 1. Mutual receptions (ALWAYS override negative situations - these are STRONG bonds)
  // 2. One-way positive receptions (if one receives the other favorably)
  // 3. Negative receptions (if one is in other's detriment/fall AND being received)
  // 4. No reception

  // Check for mutual receptions first (these ALWAYS override negative receptions)
  // Mutual reception creates a strong bond even if planets are in their own detriment/fall
  const hasMutualRulership = p1ReceivesP2ByRulership && p2ReceivesP1ByRulership;
  const hasMutualExaltation = p1ReceivesP2ByExaltation && p2ReceivesP1ByExaltation;
  const hasMixedMutual = (p1ReceivesP2ByRulership && p2ReceivesP1ByExaltation) ||
                         (p1ReceivesP2ByExaltation && p2ReceivesP1ByRulership);

  // Mutual reception by rulership (strongest positive)
  if (hasMutualRulership) {
    return {
      type: 'mutual_reception_rulership',
      quality: 'very_positive',
      score: 10,
      interpretation: `${planet1.toUpperCase()} and ${planet2.toUpperCase()} are in mutual reception by rulership. They are in each other's ruled signs, indicating strong mutual benefit, cooperation, and the ability to help each other achieve their goals. This is extremely favorable.`,
      details: {
        planet1ReceivesPlanet2: true,
        planet2ReceivesPlanet1: true,
        planet1ReceptionType: 'rulership',
        planet2ReceptionType: 'rulership'
      }
    };
  }

  // Mutual reception by exaltation
  if (hasMutualExaltation) {
    return {
      type: 'mutual_reception_exaltation',
      quality: 'very_positive',
      score: 8,
      interpretation: `${planet1.toUpperCase()} and ${planet2.toUpperCase()} are in mutual reception by exaltation. They honor and elevate each other, indicating respect, admiration, and mutual support. This is very favorable.`,
      details: {
        planet1ReceivesPlanet2: true,
        planet2ReceivesPlanet1: true,
        planet1ReceptionType: 'exaltation',
        planet2ReceptionType: 'exaltation'
      }
    };
  }

  // Mixed mutual reception (one by rulership, one by exaltation)
  if (hasMixedMutual) {
    const p1Type = p1ReceivesP2ByRulership ? 'rulership' : 'exaltation';
    const p2Type = p2ReceivesP1ByRulership ? 'rulership' : 'exaltation';

    return {
      type: 'mutual_reception_mixed',
      quality: 'very_positive',
      score: 9,
      interpretation: `${planet1.toUpperCase()} and ${planet2.toUpperCase()} are in mixed mutual reception (one by rulership, one by exaltation). This indicates strong mutual regard and the ability to work together harmoniously, with each supporting the other in different ways.`,
      details: {
        planet1ReceivesPlanet2: true,
        planet2ReceivesPlanet1: true,
        planet1ReceptionType: p1Type,
        planet2ReceptionType: p2Type
      }
    };
  }

  // One-way negative reception: one planet receives another, but the received planet is in detriment/fall
  // Check fall first (more severe)
  if ((p1ReceivesP2ByRulership || p1ReceivesP2ByExaltation) && planet2InOwnFall) {
    // Planet1 receives Planet2, but Planet2 is in its own fall
    return {
      type: 'reception_in_fall',
      quality: 'very_negative',
      score: -10,
      interpretation: `${planet1.toUpperCase()} receives ${planet2.toUpperCase()} in ${planet2Sign.toUpperCase()}, which is ${planet2.toUpperCase()}'s fall sign. This indicates strong aversion and severe debilitation. The reception is deeply unfavorable.`,
      details: {
        planet1ReceivesPlanet2: true,
        planet2ReceivesPlanet1: false,
        planet1ReceptionType: 'fall',
        planet2ReceptionType: undefined
      }
    };
  }

  if ((p2ReceivesP1ByRulership || p2ReceivesP1ByExaltation) && planet1InOwnFall) {
    // Planet2 receives Planet1, but Planet1 is in its own fall
    return {
      type: 'reception_in_fall',
      quality: 'very_negative',
      score: -10,
      interpretation: `${planet2.toUpperCase()} receives ${planet1.toUpperCase()} in ${planet1Sign.toUpperCase()}, which is ${planet1.toUpperCase()}'s fall sign. This indicates strong aversion and severe debilitation. The reception is deeply unfavorable.`,
      details: {
        planet1ReceivesPlanet2: false,
        planet2ReceivesPlanet1: true,
        planet1ReceptionType: undefined,
        planet2ReceptionType: 'fall'
      }
    };
  }

  // Check detriment
  if ((p1ReceivesP2ByRulership || p1ReceivesP2ByExaltation) && planet2InOwnDetriment) {
    // Planet1 receives Planet2, but Planet2 is in its own detriment
    return {
      type: 'reception_in_detriment',
      quality: 'negative',
      score: -8,
      interpretation: `${planet1.toUpperCase()} receives ${planet2.toUpperCase()} in ${planet2Sign.toUpperCase()}, which is ${planet2.toUpperCase()}'s detriment sign. This indicates resistance and discomfort. The reception is unfavorable.`,
      details: {
        planet1ReceivesPlanet2: true,
        planet2ReceivesPlanet1: false,
        planet1ReceptionType: 'detriment',
        planet2ReceptionType: undefined
      }
    };
  }

  if ((p2ReceivesP1ByRulership || p2ReceivesP1ByExaltation) && planet1InOwnDetriment) {
    // Planet2 receives Planet1, but Planet1 is in its own detriment
    return {
      type: 'reception_in_detriment',
      quality: 'negative',
      score: -8,
      interpretation: `${planet2.toUpperCase()} receives ${planet1.toUpperCase()} in ${planet1Sign.toUpperCase()}, which is ${planet1.toUpperCase()}'s detriment sign. This indicates resistance and discomfort. The reception is unfavorable.`,
      details: {
        planet1ReceivesPlanet2: false,
        planet2ReceivesPlanet1: true,
        planet1ReceptionType: undefined,
        planet2ReceptionType: 'detriment'
      }
    };
  }

  // One-way positive receptions (only if no negative reception)
  // One-way reception by rulership
  if (p1ReceivesP2ByRulership || p2ReceivesP1ByRulership) {
    const receiver = p1ReceivesP2ByRulership ? planet1 : planet2;
    const received = p1ReceivesP2ByRulership ? planet2 : planet1;

    return {
      type: 'one_way_rulership',
      quality: 'positive',
      score: 5,
      interpretation: `${receiver.toUpperCase()} receives ${received.toUpperCase()} by rulership. ${receiver.toUpperCase()} is favorably disposed toward ${received.toUpperCase()} and can help, but the favor is not mutual. This is moderately favorable.`,
      details: {
        planet1ReceivesPlanet2: p1ReceivesP2ByRulership,
        planet2ReceivesPlanet1: p2ReceivesP1ByRulership,
        planet1ReceptionType: p1ReceivesP2ByRulership ? 'rulership' : undefined,
        planet2ReceptionType: p2ReceivesP1ByRulership ? 'rulership' : undefined
      }
    };
  }

  // One-way reception by exaltation
  if (p1ReceivesP2ByExaltation || p2ReceivesP1ByExaltation) {
    const receiver = p1ReceivesP2ByExaltation ? planet1 : planet2;
    const received = p1ReceivesP2ByExaltation ? planet2 : planet1;

    return {
      type: 'one_way_exaltation',
      quality: 'positive',
      score: 4,
      interpretation: `${receiver.toUpperCase()} receives ${received.toUpperCase()} by exaltation. ${receiver.toUpperCase()} honors and respects ${received.toUpperCase()}, but the favor is not mutual. This is somewhat favorable.`,
      details: {
        planet1ReceivesPlanet2: p1ReceivesP2ByExaltation,
        planet2ReceivesPlanet1: p2ReceivesP1ByExaltation,
        planet1ReceptionType: p1ReceivesP2ByExaltation ? 'exaltation' : undefined,
        planet2ReceptionType: p2ReceivesP1ByExaltation ? 'exaltation' : undefined
      }
    };
  }

  // No reception (neutral)
  return {
    type: 'no_reception',
    quality: 'neutral',
    score: 0,
    interpretation: `${planet1.toUpperCase()} and ${planet2.toUpperCase()} have no reception. They are indifferent to each other - neither favorably nor unfavorably disposed. The relationship is neutral.`,
    details: {
      planet1ReceivesPlanet2: false,
      planet2ReceivesPlanet1: false
    }
  };
}

/**
 * Format reception analysis for display in the chart
 */
export function formatReceptionForDisplay(
  planet1: string,
  planet2: string,
  reception: ReceptionAnalysis
): string {
  const qualitySymbol = {
    'very_positive': '✓✓',
    'positive': '✓',
    'neutral': '•',
    'negative': '✗',
    'very_negative': '✗✗'
  }[reception.quality];

  let output = `**Reception between ${planet1.toUpperCase()} and ${planet2.toUpperCase()}** ${qualitySymbol}\n`;
  output += `  Score: ${reception.score}/10\n`;
  output += `  ${reception.interpretation}\n`;

  return output;
}
