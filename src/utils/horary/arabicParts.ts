/**
 * Arabic Parts Calculator for Horary Astrology
 *
 * Currently implements:
 * - Part of Fortune (Pars Fortunae)
 *
 * Future expansion can include other Arabic Parts:
 * - Part of Spirit
 * - Part of Love
 * - etc.
 */

import { getSignFromDegrees, getSignRuler, calculateEssentialDignities, isDayChart as checkIsDayChart } from './dignities';

type Planet = 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn';
type Sign = 'aries' | 'taurus' | 'gemini' | 'cancer' | 'leo' | 'virgo' |
            'libra' | 'scorpio' | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';

/**
 * Generic Arabic Part calculator
 * Formula: Point A + Point B - Point C
 * @param pointA - First point in degrees (e.g., Ascendant)
 * @param pointB - Second point in degrees (e.g., Moon for day chart)
 * @param pointC - Third point in degrees (e.g., Sun for day chart)
 * @returns Position in degrees (0-360)
 */
export function calculateArabicPart(pointA: number, pointB: number, pointC: number): number {
  const result = pointA + pointB - pointC;
  // Normalize to 0-360 range (handles both negative and >360 values)
  return ((result % 360) + 360) % 360;
}

/**
 * Result of Part of Fortune calculation
 */
export interface PartOfFortuneResult {
  // Basic position
  position: number;           // Absolute degrees 0-360
  sign: Sign;                 // Zodiac sign
  degreeInSign: number;       // Degree within the sign (0-30)

  // House placement
  house: number;              // House number (1-12)

  // Dispositor analysis (planet ruling the sign PoF is in)
  dispositor: Planet;         // Planet ruling the sign
  dispositorPosition: number; // Dispositor's position in degrees
  dispositorSign: Sign;       // Sign the dispositor is in
  dispositorHouse: number;    // House the dispositor is in
  dispositorDignity: {
    description: string;
    strength: 'Very Strong' | 'Strong' | 'Moderate' | 'Weak' | 'Very Weak' | 'Peregrine';
    score: number;
  };

  // Chart type used for calculation
  isDayChart: boolean;

  // Formatted display string
  formattedPosition: string;  // e.g., "15.23° Gemini"
}

/**
 * Calculate Part of Fortune for a horary chart
 *
 * Traditional formula:
 * - Day Chart (Sun above horizon): Ascendant + Moon - Sun
 * - Night Chart (Sun below horizon): Ascendant + Sun - Moon
 *
 * @param ascendantDegrees - Ascendant position in degrees (0-360)
 * @param sunDegrees - Sun position in degrees (0-360)
 * @param moonDegrees - Moon position in degrees (0-360)
 * @param planets - All planet data with positions and retrograde status
 * @param cusps - House cusps array (12 elements)
 * @returns Part of Fortune calculation result
 */
export function calculatePartOfFortune(
  ascendantDegrees: number,
  sunDegrees: number,
  moonDegrees: number,
  planets: Record<string, { position: number; isRetrograde: boolean }>,
  cusps: number[]
): PartOfFortuneResult {
  // Determine if this is a day or night chart
  const sunHouse = getPlanetHouse(sunDegrees, cusps);
  const isDayChartValue = checkIsDayChart(sunHouse);

  // Calculate Part of Fortune using appropriate formula
  let pofPosition: number;
  if (isDayChartValue) {
    // Day Chart: Ascendant + Moon - Sun
    pofPosition = calculateArabicPart(ascendantDegrees, moonDegrees, sunDegrees);
  } else {
    // Night Chart: Ascendant + Sun - Moon
    pofPosition = calculateArabicPart(ascendantDegrees, sunDegrees, moonDegrees);
  }

  // Get sign and degree within sign
  const { sign, degreeInSign } = getSignFromDegrees(pofPosition);

  // Determine house placement
  const house = getPlanetHouse(pofPosition, cusps);

  // Find dispositor (planet ruling the sign PoF is in)
  const dispositor = getSignRuler(sign);
  const dispositorData = planets[dispositor];

  if (!dispositorData) {
    throw new Error(`Dispositor planet ${dispositor} not found in planets data`);
  }

  const dispositorPosition = dispositorData.position;
  const dispositorSignInfo = getSignFromDegrees(dispositorPosition);
  const dispositorHouse = getPlanetHouse(dispositorPosition, cusps);

  // Calculate dispositor's essential dignity
  const dispositorDignityFull = calculateEssentialDignities(
    dispositor,
    dispositorPosition,
    isDayChartValue
  );

  const dispositorDignity = {
    description: dispositorDignityFull.description,
    strength: dispositorDignityFull.strength,
    score: dispositorDignityFull.score
  };

  // Format position for display
  const formattedPosition = `${degreeInSign.toFixed(2)}° ${sign.charAt(0).toUpperCase() + sign.slice(1)}`;

  return {
    position: pofPosition,
    sign,
    degreeInSign,
    house,
    dispositor,
    dispositorPosition,
    dispositorSign: dispositorSignInfo.sign,
    dispositorHouse,
    dispositorDignity,
    isDayChart: isDayChartValue,
    formattedPosition
  };
}

/**
 * Helper function to determine house for a planet position
 * Reused from llm.ts pattern
 */
function getPlanetHouse(planetDegrees: number, cusps: number[]): number {
  const normalizedPlanet = ((planetDegrees % 360) + 360) % 360;

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
 * Format Part of Fortune for display in UI or LLM
 */
export function formatPartOfFortuneForDisplay(pof: PartOfFortuneResult): string {
  const chartType = pof.isDayChart ? 'Day Chart' : 'Night Chart';
  const dispositorName = pof.dispositor.charAt(0).toUpperCase() + pof.dispositor.slice(1);
  const dispositorSignFormatted = pof.dispositorSign.charAt(0).toUpperCase() + pof.dispositorSign.slice(1);

  let output = `**Part of Fortune** (${chartType})\n`;
  output += `- **Position**: ${pof.formattedPosition} (${pof.position.toFixed(2)}° absolute) in House ${pof.house}\n`;
  output += `- **Dispositor**: ${dispositorName} at ${dispositorSignFormatted} (House ${pof.dispositorHouse})\n`;
  output += `- **Dispositor Essential Dignity**: ${pof.dispositorDignity.strength} - ${pof.dispositorDignity.description} (Score: ${pof.dispositorDignity.score})\n`;
  output += `- **Interpretation**: The Part of Fortune's dispositor (${dispositorName}) is ${pof.dispositorDignity.strength.toLowerCase()}. `;

  if (pof.dispositorDignity.score >= 4) {
    output += `This is POSITIVE - the querent has strong resources and capacity to achieve the outcome.\n`;
  } else if (pof.dispositorDignity.score > 0) {
    output += `This is moderately supportive - the querent has some resources available.\n`;
  } else if (pof.dispositorDignity.score === 0) {
    output += `The dispositor is peregrine (neutral) - fortune depends on other factors.\n`;
  } else if (pof.dispositorDignity.score >= -4) {
    output += `This is CONCERNING - the dispositor is weak, limiting the querent's capacity.\n`;
  } else {
    output += `This is VERY NEGATIVE - the dispositor is severely debilitated, the querent lacks resources/power to succeed.\n`;
  }

  return output;
}
