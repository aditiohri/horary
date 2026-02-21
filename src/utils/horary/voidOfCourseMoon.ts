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

type Planet = 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn';
type Sign = 'aries' | 'taurus' | 'gemini' | 'cancer' | 'leo' | 'virgo' |
            'libra' | 'scorpio' | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';

// Traditional aspects for VOC calculation
const TRADITIONAL_ASPECTS = [
  { name: 'conjunction', angle: 0 },
  { name: 'sextile', angle: 60 },
  { name: 'square', angle: 90 },
  { name: 'trine', angle: 120 },
  { name: 'opposition', angle: 180 }
];

// Traditional orbs for Moon aspects
const MOON_ORB = 12; // degrees

// Signs where VOC Moon is still effective
const VOC_EXCEPTION_SIGNS: Sign[] = ['taurus', 'cancer', 'sagittarius', 'pisces'];

// Average daily motion for planets (degrees per day)
const DAILY_MOTION = {
  sun: 1.0,
  moon: 13.176, // Fastest
  mercury: 1.5, // Varies widely
  venus: 1.2,
  mars: 0.5,
  jupiter: 0.1,
  saturn: 0.05
};

interface PlanetPosition {
  position: number;
  isRetrograde: boolean;
}

interface VoidOfCourseMoon {
  isVoid: boolean;
  lastAspect: string | null; // e.g., "trine Jupiter"
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
  const hoursUntilNextSign = (degreesUntilNextSign / DAILY_MOTION.moon) * 24;

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
 * Check if Moon will make an aspect to a planet before leaving its current sign
 */
function willMoonMakeAspect(
  moonPos: number,
  planetPos: number,
  planetSpeed: number,
  degreesUntilSignChange: number
): { willPerfect: boolean; aspectType: string | null; timeToExact: number | null } {
  const moonSpeed = DAILY_MOTION.moon;

  // Calculate future positions when Moon leaves sign
  const timeToSignChange = degreesUntilSignChange / moonSpeed; // in days
  const futureMoonPos = ((moonPos + (moonSpeed * timeToSignChange)) % 360 + 360) % 360;
  const futurePlanetPos = ((planetPos + (planetSpeed * timeToSignChange)) % 360 + 360) % 360;

  // Normalize current positions
  const normalizedMoon = ((moonPos % 360) + 360) % 360;
  const normalizedPlanet = ((planetPos % 360) + 360) % 360;

  // Check each traditional aspect
  for (const aspect of TRADITIONAL_ASPECTS) {
    const currentSep = Math.abs(normalizedMoon - normalizedPlanet);
    const currentSepNormalized = Math.min(currentSep, 360 - currentSep);

    // Calculate orb from exact aspect
    const currentOrb = Math.abs(currentSepNormalized - aspect.angle);

    if (currentOrb > MOON_ORB) continue; // Not within orb, skip

    // Check if applying (getting closer to exact)
    const futureSep = Math.abs(futureMoonPos - futurePlanetPos);
    const futureSepNormalized = Math.min(futureSep, 360 - futureSep);
    const futureOrb = Math.abs(futureSepNormalized - aspect.angle);

    // If future orb is smaller, aspect is applying
    if (futureOrb < currentOrb) {
      // Calculate when it will be exact
      const orbDecrease = currentOrb - futureOrb;
      const timeToExact = timeToSignChange * (currentOrb / orbDecrease);

      return {
        willPerfect: true,
        aspectType: aspect.name,
        timeToExact: timeToExact * 24 // convert to hours
      };
    }
  }

  return { willPerfect: false, aspectType: null, timeToExact: null };
}

/**
 * Determine if Moon is Void of Course
 */
export function calculateVoidOfCourseMoon(
  planets: Record<string, PlanetPosition>
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

  // Check if Moon will make any aspect before changing signs
  const traditionalPlanets: Planet[] = ['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];

  let willMakeAspect = false;
  let nextAspectPlanet: string | null = null;
  let nextAspectType: string | null = null;

  for (const planetKey of traditionalPlanets) {
    const planet = planets[planetKey];
    if (!planet) continue;

    const speed = planet.isRetrograde ? -DAILY_MOTION[planetKey] : DAILY_MOTION[planetKey];
    const aspectInfo = willMoonMakeAspect(
      moon.position,
      planet.position,
      speed,
      signChange.degreesUntilNextSign
    );

    if (aspectInfo.willPerfect) {
      willMakeAspect = true;
      nextAspectPlanet = planetKey;
      nextAspectType = aspectInfo.aspectType;
      break; // Found an applying aspect
    }
  }

  const isVoid = !willMakeAspect;
  const effectiveInCurrentSign = VOC_EXCEPTION_SIGNS.includes(signChange.currentSign);

  // Determine interpretation
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
    output += `**Next Aspect**: Moon will ${voc.lastAspectType} ${voc.lastAspectPlanet?.toUpperCase()} before leaving ${voc.currentSign}\n`;
  }

  output += `\n${voc.interpretation}\n`;

  return output;
}
