/**
 * Void of Course Moon Calculator for Horary Astrology
 *
 * The Moon is Void of Course when it makes no more major aspects
 * before leaving its current sign.
 *
 * Traditional interpretation: "Nothing will come of the matter"
 * Exception: Moon is still effective in Taurus, Cancer, Sagittarius, Pisces
 */

import { getSignFromDegrees } from './dignities';

type Sign = 'aries' | 'taurus' | 'gemini' | 'cancer' | 'leo' | 'virgo' |
            'libra' | 'scorpio' | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';

// Signs where VOC Moon is still effective
const VOC_EXCEPTION_SIGNS: Sign[] = ['taurus', 'cancer', 'sagittarius', 'pisces'];

// Moon's average daily motion (used only for sign-change timing)
const MOON_DAILY_MOTION = 13.176;

interface PlanetPosition {
  position: number;
  isRetrograde: boolean;
}

// Minimal shape of the next applying aspect from aspectMotion
interface NextApplyingAspect {
  aspectKey: string;   // e.g. 'opposition', 'sextile'
  point1Key: string;   // e.g. 'moon'
  point2Key: string;   // e.g. 'sun'
  timeToExact?: number; // days until exact
}

export interface VoidOfCourseMoon {
  isVoid: boolean;
  lastAspect: string | null; // e.g. "opposition sun" (the upcoming aspect, if any)
  lastAspectPlanet: string | null;
  lastAspectType: string | null;
  currentSign: string;
  nextSign: string;
  degreesUntilNextSign: number;
  hoursUntilNextSign: number;
  effectiveInCurrentSign: boolean; // True if in exception sign
  interpretation: string;
}

/**
 * Calculate when Moon changes signs
 */
function calculateMoonSignChange(moonPosition: number): {
  currentSign: Sign;
  degreeInSign: number;
  degreesUntilNextSign: number;
  hoursUntilNextSign: number;
  nextSign: Sign;
} {
  const { sign, degreeInSign } = getSignFromDegrees(moonPosition);
  const degreesUntilNextSign = 30 - degreeInSign;
  const hoursUntilNextSign = (degreesUntilNextSign / MOON_DAILY_MOTION) * 24;

  const signs: Sign[] = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
  ];

  const currentSignIndex = signs.indexOf(sign);
  const nextSign = signs[(currentSignIndex + 1) % 12];

  return {
    currentSign: sign,
    degreeInSign,
    degreesUntilNextSign,
    hoursUntilNextSign,
    nextSign
  };
}

/**
 * Determine if Moon is Void of Course.
 *
 * @param planets       Planet positions from the chart
 * @param nextApplying  The Moon's next applying aspect (from analyzeMoonAspects).
 *                      Passing this ensures VOC and the Moon aspect sections always
 *                      use the same calculation.
 */
export function calculateVoidOfCourseMoon(
  planets: Record<string, PlanetPosition>,
  nextApplying?: NextApplyingAspect | null
): VoidOfCourseMoon {
  const moon = planets.moon;
  if (!moon) {
    return {
      isVoid: false,
      lastAspect: null,
      lastAspectPlanet: null,
      lastAspectType: null,
      currentSign: 'Unknown',
      nextSign: 'Unknown',
      degreesUntilNextSign: 0,
      hoursUntilNextSign: 0,
      effectiveInCurrentSign: false,
      interpretation: 'Moon data not available'
    };
  }

  const signChange = calculateMoonSignChange(moon.position);
  const daysUntilSignChange = signChange.degreesUntilNextSign / MOON_DAILY_MOTION;

  // Determine whether the next applying aspect perfects before the Moon changes sign
  let willMakeAspect = false;
  let nextAspectPlanet: string | null = null;
  let nextAspectType: string | null = null;

  if (nextApplying && nextApplying.timeToExact !== undefined) {
    if (nextApplying.timeToExact < daysUntilSignChange) {
      willMakeAspect = true;
      nextAspectPlanet = nextApplying.point2Key === 'moon'
        ? nextApplying.point1Key
        : nextApplying.point2Key;
      nextAspectType = nextApplying.aspectKey;
    }
  }

  const isVoid = !willMakeAspect;
  const effectiveInCurrentSign = VOC_EXCEPTION_SIGNS.includes(signChange.currentSign);

  let interpretation = '';
  if (isVoid && !effectiveInCurrentSign) {
    interpretation = '⚠️ Void of Course - "Nothing will come of the matter." Consider waiting or asking a different question.';
  } else if (isVoid && effectiveInCurrentSign) {
    interpretation = `✓ Void of Course but in ${signChange.currentSign.charAt(0).toUpperCase() + signChange.currentSign.slice(1)} (effective sign) - Moon can still bring results.`;
  } else {
    interpretation = `Moon will make ${nextAspectType} with ${nextAspectPlanet} before leaving ${signChange.currentSign} - Chart is valid.`;
  }

  return {
    isVoid,
    lastAspect: willMakeAspect ? `${nextAspectType} ${nextAspectPlanet}` : null,
    lastAspectPlanet: nextAspectPlanet,
    lastAspectType: nextAspectType,
    currentSign: signChange.currentSign.charAt(0).toUpperCase() + signChange.currentSign.slice(1),
    nextSign: signChange.nextSign.charAt(0).toUpperCase() + signChange.nextSign.slice(1),
    degreesUntilNextSign: signChange.degreesUntilNextSign,
    hoursUntilNextSign: signChange.hoursUntilNextSign,
    effectiveInCurrentSign,
    interpretation
  };
}

/**
 * Format VOC Moon information for display
 */
export function formatVOCMoonForDisplay(voc: VoidOfCourseMoon): string {
  let output = `### Void of Course Moon Status\n\n`;
  output += `**Current Sign**: ${voc.currentSign} (${voc.degreesUntilNextSign.toFixed(1)}° until ${voc.nextSign})\n`;
  output += `**Time Until Sign Change**: ${voc.hoursUntilNextSign.toFixed(1)} hours\n\n`;

  if (voc.isVoid) {
    output += `**Status**: ⚠️ VOID OF COURSE\n`;
    if (voc.effectiveInCurrentSign) {
      output += `**Note**: Moon is in ${voc.currentSign}, an exception sign where VOC Moon is still effective.\n`;
    } else {
      output += `**Meaning**: The Moon will make no more major aspects before leaving ${voc.currentSign}.\n`;
      output += `**Traditional Interpretation**: "Nothing will come of the matter."\n`;
    }
  } else {
    output += `**Status**: ✓ NOT VOID OF COURSE\n`;
  }

  output += `\n${voc.interpretation}\n`;

  return output;
}
