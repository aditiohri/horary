// src/utils/horary/timing.ts
// Traditional horary timing analysis based on sign types, house types, and aspect orbs

export type SignType = 'cardinal' | 'fixed' | 'mutable';
export type HouseType = 'angular' | 'succedent' | 'cadent';
export type TimeUnit = 'days' | 'weeks' | 'months' | 'years';

export interface TimingEstimate {
  signType: SignType;
  housePlacement: HouseType;
  orbInDegrees: number;
  suggestedTimeframes: {
    fastest: { value: number; unit: TimeUnit };
    mostLikely: { value: number; unit: TimeUnit };
    slowest: { value: number; unit: TimeUnit };
  };
  interpretation: string;
  conflictingSignals: boolean;
}

// Sign type classifications based on traditional astrology
const SIGN_TYPES: Record<string, SignType> = {
  // Cardinal signs - fast action
  aries: 'cardinal',
  cancer: 'cardinal',
  libra: 'cardinal',
  capricorn: 'cardinal',

  // Fixed signs - slow, stable
  taurus: 'fixed',
  leo: 'fixed',
  scorpio: 'fixed',
  aquarius: 'fixed',

  // Mutable signs - medium speed
  gemini: 'mutable',
  virgo: 'mutable',
  sagittarius: 'mutable',
  pisces: 'mutable',
};

/**
 * Get the sign type (cardinal, fixed, mutable) from a zodiac sign name
 */
export function getSignType(sign: string): SignType {
  const normalizedSign = sign.toLowerCase();
  const signType = SIGN_TYPES[normalizedSign];

  if (!signType) {
    throw new Error(`Unknown sign: ${sign}`);
  }

  return signType;
}

/**
 * Get house type based on house number (1-12)
 */
export function getHouseType(houseNumber: number): HouseType {
  if (houseNumber < 1 || houseNumber > 12) {
    throw new Error(`Invalid house number: ${houseNumber}. Must be between 1 and 12.`);
  }

  // Angular houses (1, 4, 7, 10) - quick action
  if ([1, 4, 7, 10].includes(houseNumber)) {
    return 'angular';
  }

  // Succedent houses (2, 5, 8, 11) - moderate timing
  if ([2, 5, 8, 11].includes(houseNumber)) {
    return 'succedent';
  }

  // Cadent houses (3, 6, 9, 12) - slow action
  return 'cadent';
}

/**
 * Convert orb in degrees to time units based on sign type
 * This is a traditional technique where degrees approximate time units
 */
function convertOrbToTimeUnits(orbDegrees: number, signType: SignType): {
  fastest: { value: number; unit: TimeUnit };
  mostLikely: { value: number; unit: TimeUnit };
  slowest: { value: number; unit: TimeUnit };
} {
  // Round orb to nearest 0.5 for cleaner estimates
  const roundedOrb = Math.round(orbDegrees * 2) / 2;

  switch (signType) {
    case 'cardinal':
      // Cardinal: days to weeks
      // 1 degree ≈ 1 day (fastest) to 1 week (slowest)
      return {
        fastest: { value: Math.max(1, roundedOrb), unit: 'days' },
        mostLikely: { value: Math.max(1, Math.round(roundedOrb * 3)), unit: 'days' },
        slowest: { value: Math.max(1, roundedOrb), unit: 'weeks' },
      };

    case 'fixed':
      // Fixed: months to years
      // 1 degree ≈ 1 week (fastest) to 1 month (slowest)
      return {
        fastest: { value: Math.max(1, roundedOrb), unit: 'weeks' },
        mostLikely: { value: Math.max(1, roundedOrb), unit: 'months' },
        slowest: { value: Math.max(1, Math.round(roundedOrb / 2)), unit: 'years' },
      };

    case 'mutable':
      // Mutable: weeks to months
      // 1 degree ≈ 1 week (fastest) to 1 month (slowest)
      return {
        fastest: { value: Math.max(1, Math.round(roundedOrb / 2)), unit: 'weeks' },
        mostLikely: { value: Math.max(1, roundedOrb), unit: 'weeks' },
        slowest: { value: Math.max(1, roundedOrb), unit: 'months' },
      };
  }
}

/**
 * Adjust timing estimate based on house placement
 */
function adjustForHousePlacement(
  baseEstimate: { value: number; unit: TimeUnit },
  houseType: HouseType,
  estimateType: 'fastest' | 'mostLikely' | 'slowest'
): { value: number; unit: TimeUnit } {
  // Angular houses speed things up
  if (houseType === 'angular') {
    // Reduce time for angular houses (more immediate)
    if (estimateType === 'fastest') {
      return { value: Math.max(1, Math.round(baseEstimate.value * 0.5)), unit: baseEstimate.unit };
    }
    return { value: Math.max(1, Math.round(baseEstimate.value * 0.75)), unit: baseEstimate.unit };
  }

  // Cadent houses slow things down
  if (houseType === 'cadent') {
    // Increase time for cadent houses (slower)
    if (estimateType === 'slowest') {
      return { value: Math.round(baseEstimate.value * 1.5), unit: baseEstimate.unit };
    }
    return { value: Math.round(baseEstimate.value * 1.25), unit: baseEstimate.unit };
  }

  // Succedent houses are neutral (no adjustment)
  return baseEstimate;
}

/**
 * Generate interpretation explaining the timing reasoning
 */
function generateInterpretation(
  signType: SignType,
  houseType: HouseType,
  conflictingSignals: boolean
): string {
  const signSpeed =
    signType === 'cardinal' ? 'Cardinal signs indicate swift action and quick results' :
    signType === 'fixed' ? 'Fixed signs indicate slow, steady development over time' :
    'Mutable signs indicate moderate timing with potential for changes';

  const houseSpeed =
    houseType === 'angular' ? 'The angular house placement accelerates events' :
    houseType === 'succedent' ? 'The succedent house placement suggests moderate, building momentum' :
    'The cadent house placement slows events and may cause delays';

  let interpretation = `${signSpeed}. ${houseSpeed}.`;

  if (conflictingSignals) {
    interpretation += ' Note: The sign and house give conflicting timing signals - the actual timing may vary. Consider the orb (degrees to exactness) as the primary indicator.';
  } else {
    interpretation += ' The sign and house types align, making timing more predictable.';
  }

  return interpretation;
}

/**
 * Calculate timing estimate for an applying aspect
 *
 * @param signPosition - Position of the faster planet in degrees (0-360)
 * @param houseNumber - House number (1-12) where the aspect perfects
 * @param orbInDegrees - Current orb (degrees until exact)
 * @returns TimingEstimate with suggested timeframes and interpretation
 */
export function calculateTimingEstimate(
  signPosition: number,
  houseNumber: number,
  orbInDegrees: number
): TimingEstimate {
  // Normalize position to 0-360
  const normalizedPosition = ((signPosition % 360) + 360) % 360;

  // Convert position to sign
  const signs = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
                 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
  const signIndex = Math.floor(normalizedPosition / 30);
  const sign = signs[signIndex];

  // Get sign type and house type
  const signType = getSignType(sign);
  const housePlacement = getHouseType(houseNumber);

  // Check for conflicting signals
  // Cardinal sign + cadent house = conflict (fast vs slow)
  // Fixed sign + angular house = conflict (slow vs fast)
  const conflictingSignals =
    (signType === 'cardinal' && housePlacement === 'cadent') ||
    (signType === 'fixed' && housePlacement === 'angular');

  // Calculate base timing from orb and sign type
  const baseTimeframes = convertOrbToTimeUnits(orbInDegrees, signType);

  // Adjust for house placement
  const suggestedTimeframes = {
    fastest: adjustForHousePlacement(baseTimeframes.fastest, housePlacement, 'fastest'),
    mostLikely: adjustForHousePlacement(baseTimeframes.mostLikely, housePlacement, 'mostLikely'),
    slowest: adjustForHousePlacement(baseTimeframes.slowest, housePlacement, 'slowest'),
  };

  // Generate interpretation
  const interpretation = generateInterpretation(signType, housePlacement, conflictingSignals);

  return {
    signType,
    housePlacement,
    orbInDegrees,
    suggestedTimeframes,
    interpretation,
    conflictingSignals,
  };
}

/**
 * Format timing estimate for display in LLM context
 */
export function formatTimingForLLM(timing: TimingEstimate, planetName?: string): string {
  const planetPrefix = planetName ? `${planetName}: ` : '';

  let formatted = `**${planetPrefix}Timing Analysis**\n`;
  formatted += `- Sign Type: ${timing.signType.charAt(0).toUpperCase() + timing.signType.slice(1)}\n`;
  formatted += `- House Placement: ${timing.housePlacement.charAt(0).toUpperCase() + timing.housePlacement.slice(1)}\n`;
  formatted += `- Orb to Exact: ${timing.orbInDegrees.toFixed(2)}°\n`;

  if (timing.conflictingSignals) {
    formatted += `- ⚠️ Conflicting Signals: Yes\n`;
  }

  formatted += `\n**Suggested Timeframes:**\n`;
  formatted += `- Fastest: ${timing.suggestedTimeframes.fastest.value} ${timing.suggestedTimeframes.fastest.unit}\n`;
  formatted += `- Most Likely: ${timing.suggestedTimeframes.mostLikely.value} ${timing.suggestedTimeframes.mostLikely.unit}\n`;
  formatted += `- Slowest: ${timing.suggestedTimeframes.slowest.value} ${timing.suggestedTimeframes.slowest.unit}\n`;

  formatted += `\n**Interpretation:** ${timing.interpretation}\n`;

  return formatted;
}
