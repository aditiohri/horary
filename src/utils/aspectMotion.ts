// src/utils/aspect-motion.ts - Simplified version with proper exports

import { calculateTimingEstimate, type TimingEstimate } from './horary/timing';

export interface PlanetData {
  position: number;
  isRetrograde: boolean;
  speed?: number; // Optional: actual speed from Swiss Ephemeris
}

export interface PlanetMotion {
  position: number;
  speed: number;
  isRetrograde: boolean;
}

export interface AspectMotion {
  aspectKey: string;
  point1Key: string;
  point2Key: string;
  currentOrb: number;
  isApplying: boolean;
  isSeparating: boolean;
  isPerfect: boolean;
  isFaded?: boolean; // Aspect exists but is outside standard orb (>12°)
  timeToExact?: number;
  timeSinceExact?: number;
  timingEstimate?: TimingEstimate; // Timing analysis for applying aspects
}

const AVERAGE_DAILY_MOTION: { [key: string]: number } = {
  sun: 0.9856,
  moon: 13.1764,
  mercury: 1.3833,
  venus: 1.2,
  mars: 0.524,
  jupiter: 0.0831,
  saturn: 0.0335,
};

// Updated to work with Swiss Ephemeris data (includes actual speed)
export function getPlanetMotion(
  chartData: { planets: { [key: string]: PlanetData } },
  planetKey: string
): PlanetMotion {
  try {
    const planetData = chartData.planets[planetKey];

    if (planetData) {
      // Use actual speed from Swiss Ephemeris if available
      let speed: number;
      if (planetData.speed !== undefined) {
        // Swiss Ephemeris provides actual speed (already negative if retrograde)
        speed = planetData.speed;
      } else {
        // Fallback to average daily motion (for backwards compatibility)
        const baseSpeed = AVERAGE_DAILY_MOTION[planetKey] || 0;
        speed = planetData.isRetrograde ? -baseSpeed : baseSpeed;
      }

      return {
        position: planetData.position,
        speed,
        isRetrograde: planetData.isRetrograde,
      };
    }

    // Fallback if planet data is not found
    return {
      position: 0,
      speed: AVERAGE_DAILY_MOTION[planetKey] || 0,
      isRetrograde: false,
    };
  } catch (error) {
    console.error(`Error getting motion for ${planetKey}:`, error);
    return {
      position: 0,
      speed: AVERAGE_DAILY_MOTION[planetKey] || 0,
      isRetrograde: false,
    };
  }
}

export function calculateAspectMotion(
  chartData: { planets: { [key: string]: PlanetData }; cusps?: number[] },
  aspect: string
): AspectMotion {
  const planet1Motion = getPlanetMotion(chartData, aspect.split(" ")[0]);
  const planet2Motion = getPlanetMotion(chartData, aspect.split(" ")[2]);

  const aspectAngles: { [key: string]: number } = {
    conjunction: 0,
    sextile: 60,
    square: 90,
    trine: 120,
    opposition: 180,
  };

  const targetAngle = aspectAngles[aspect.split(" ")[1]] || 0;

  let separation = Math.abs(planet1Motion.position - planet2Motion.position);
  if (separation > 180) separation = 360 - separation;

  const relativeSpeed = Math.abs(planet1Motion.speed - planet2Motion.speed);

  // Determine applying/separating analytically (no timestep needed).
  //
  // signed_sep = p1 - p2 wrapped to (-180, +180].
  // d(sep)/dt = sign(signed_sep) × (s1 − s2)
  //
  // orbSigned = sep − targetAngle: negative means not yet exact, positive means past exact.
  // The orb is closing toward 0 (applying) when orbSigned × d(sep)/dt < 0.
  // At orb = 0 exactly the aspect is perfect and about to separate.
  //
  // This approach is immune to the overshoot problem that plagued the old
  // fixed-timestep method: a 0.1-day step moves the Moon ~1.3°, which is
  // larger than many real orbs and caused tight applying aspects to appear
  // separating (the Moon would jump past the exact point in the simulation).
  let signedSep = planet1Motion.position - planet2Motion.position;
  signedSep = ((signedSep + 180) % 360 + 360) % 360 - 180; // wrap to (-180, +180]

  const dSepDt = Math.sign(signedSep) * (planet1Motion.speed - planet2Motion.speed);
  const currentOrb = Math.abs(separation - targetAngle);
  const orbSigned = separation - targetAngle; // negative = before exact, positive = after

  const product = orbSigned * dSepDt;
  const isApplying = product < 0;
  const isSeparating = product > 0 || (orbSigned === 0 && dSepDt !== 0);

  const isPerfect = currentOrb <= 1;

  let timeToExact: number | undefined;
  let timeSinceExact: number | undefined;

  if (relativeSpeed > 0) {
    if (isApplying) {
      timeToExact = currentOrb / relativeSpeed;
    } else if (isSeparating) {
      timeSinceExact = currentOrb / relativeSpeed;
    }
  }

  // Calculate timing estimate for applying aspects (if cusps provided)
  let timingEstimate: TimingEstimate | undefined;
  if (isApplying && chartData.cusps) {
    // Use the faster-moving planet's position for timing calculation
    const fasterPlanet = Math.abs(planet1Motion.speed) > Math.abs(planet2Motion.speed)
      ? planet1Motion
      : planet2Motion;

    // Determine which house the faster planet is in
    const houseNumber = getPlanetHouse(fasterPlanet.position, chartData.cusps);

    try {
      timingEstimate = calculateTimingEstimate(
        fasterPlanet.position,
        houseNumber,
        currentOrb
      );
    } catch (error) {
      // If timing calculation fails, continue without it
      console.warn('Failed to calculate timing estimate:', error);
    }
  }

  return {
    aspectKey: aspect.split(" ")[1],
    point1Key: aspect.split(" ")[0],
    point2Key: aspect.split(" ")[2],
    currentOrb: currentOrb,
    isApplying,
    isSeparating,
    isPerfect,
    timeToExact,
    timeSinceExact,
    timingEstimate,
  };
}

// Helper function to determine planet's house
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

// Standard orbs per aspect type — mirrors astrology.ts customOrbs.
// Used as the lower bound so extended detection only adds aspects the
// standard detector misses (i.e. orb > standard orb for that aspect type).
const STANDARD_ORB: { [key: string]: number } = {
  conjunction: 12,
  opposition: 12,
  trine: 12,
  square: 10,
  sextile: 8,
};

export function extractAspectsWithMotion(
  chartData: { planets: { [key: string]: PlanetData }; cusps?: number[] },
  basicAspects: any[]
): Array<
  AspectMotion & {
    point1Label: string;
    point2Label: string;
    aspectLabel: string;
  }
> {
  const aspectsWithMotion = basicAspects.map((aspect) => {
    const motionData = calculateAspectMotion(chartData, aspect);
    return {
      ...motionData,
      point1Label: aspect.split(" ")[0],
      point2Label: aspect.split(" ")[2],
      aspectLabel: aspect.split(" ")[1],
    };
  });

  // Add extended Moon aspects not caught by standard detection.
  // Cap the search at the degrees remaining in the Moon's current sign so we
  // only consider aspects that can actually perfect before the sign changes.
  const moonPos = chartData.planets['moon']?.position ?? 0;
  const degreesUntilSignChange = 30 - (moonPos % 30);
  const extendedMoonAspects = findExtendedMoonAspects(chartData, degreesUntilSignChange);
  return [...aspectsWithMotion, ...extendedMoonAspects];
}

// Find Moon aspects outside standard orbs but within the Moon's remaining sign arc.
// `maxOrb` should be the degrees the Moon has left in its current sign so that
// only aspects that can actually perfect before the sign changes are returned.
function findExtendedMoonAspects(
  chartData: { planets: { [key: string]: PlanetData }; cusps?: number[] },
  maxOrb: number
): Array<
  AspectMotion & {
    point1Label: string;
    point2Label: string;
    aspectLabel: string;
    isFaded: boolean;
  }
> {
  const extendedAspects: Array<any> = [];
  const moonData = chartData.planets['moon'];
  if (!moonData) return extendedAspects;

  const planets = ['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
  const aspectTypes = [
    { name: 'conjunction', angle: 0 },
    { name: 'sextile', angle: 60 },
    { name: 'square', angle: 90 },
    { name: 'trine', angle: 120 },
    { name: 'opposition', angle: 180 },
  ];

  for (const planet of planets) {
    const planetData = chartData.planets[planet];
    if (!planetData) continue;

    let separation = Math.abs(moonData.position - planetData.position);
    if (separation > 180) separation = 360 - separation;

    for (const aspect of aspectTypes) {
      const orb = Math.abs(separation - aspect.angle);

      // Lower bound: the standard orb for this aspect type (anything within
      // that orb is already included by the standard detector).
      // Upper bound: degrees remaining in the Moon's current sign (only aspects
      // that can perfect before the sign change matter for void-of-course).
      const standardOrb = STANDARD_ORB[aspect.name] ?? 12;
      if (orb > standardOrb && orb <= maxOrb) {
        const aspectString = `moon ${aspect.name} ${planet}`;
        const motionData = calculateAspectMotion(chartData, aspectString);

        extendedAspects.push({
          ...motionData,
          point1Label: 'moon',
          point2Label: planet,
          aspectLabel: aspect.name,
          isFaded: true, // Mark as faded (outside standard active orb)
        });
      }
    }
  }

  return extendedAspects;
}

export function analyzeMoonAspects(
  aspectsWithMotion: Array<
    AspectMotion & {
      point1Label: string;
      point2Label: string;
      aspectLabel: string;
    }
  >
): {
  separatingAspects: Array<
    AspectMotion & {
      point1Label: string;
      point2Label: string;
      aspectLabel: string;
    }
  >;
  applyingAspects: Array<
    AspectMotion & {
      point1Label: string;
      point2Label: string;
      aspectLabel: string;
    }
  >;
  nextApplyingAspect?: AspectMotion & {
    point1Label: string;
    point2Label: string;
    aspectLabel: string;
  };
  lastSeparatingAspect?: AspectMotion & {
    point1Label: string;
    point2Label: string;
    aspectLabel: string;
  };
} {
  // Filter for aspects involving the Moon
  const moonAspects = aspectsWithMotion.filter(
    (aspect) => aspect.point1Key === "moon" || aspect.point2Key === "moon"
  );

  // Separate applying and separating aspects
  const separatingAspects = moonAspects.filter((a) => a.isSeparating);
  const applyingAspects = moonAspects.filter((a) => a.isApplying);

  // Find the closest separating aspect (smallest orb = most recent)
  // Include faded aspects to show what just influenced the question
  const lastSeparatingAspect =
    separatingAspects.length > 0
      ? separatingAspects.reduce((closest, current) =>
          current.currentOrb < closest.currentOrb ? current : closest
        )
      : undefined;

  // Find the closest applying aspect (smallest orb = next to perfect)
  const nextApplyingAspect =
    applyingAspects.length > 0
      ? applyingAspects.reduce((closest, current) =>
          current.currentOrb < closest.currentOrb ? current : closest
        )
      : undefined;

  return {
    separatingAspects,
    applyingAspects,
    nextApplyingAspect,
    lastSeparatingAspect,
  };
}

export function formatAspectMotionForLLM(aspectMotion: AspectMotion[]): string {
  let formatted = "\n### Aspect Motion Analysis:\n\n";

  aspectMotion.forEach((aspect) => {
    const status = aspect.isApplying
      ? "Applying"
      : aspect.isSeparating
      ? "Separating"
      : "Stable";

    formatted += `- **${aspect.point1Key} ${aspect.aspectKey} ${aspect.point2Key}**: `;
    formatted += `${status} (orb: ${aspect.currentOrb.toFixed(2)}°)`;

    if (aspect.timeToExact) {
      formatted += ` - exact in ${aspect.timeToExact.toFixed(1)} days`;
    } else if (aspect.timeSinceExact) {
      formatted += ` - was exact ${aspect.timeSinceExact.toFixed(1)} days ago`;
    }

    if (aspect.isPerfect) {
      formatted += " **[PERFECT ASPECT]**";
    }

    // Add timing estimate for applying aspects
    if (aspect.isApplying && aspect.timingEstimate) {
      const timing = aspect.timingEstimate;
      formatted += `\n  → Timing: ${timing.signType} sign + ${timing.housePlacement} house`;
      formatted += ` → ${timing.suggestedTimeframes.mostLikely.value} ${timing.suggestedTimeframes.mostLikely.unit}`;
      if (timing.conflictingSignals) {
        formatted += ` (conflicting signals)`;
      }
    }

    formatted += "\n";
  });

  return formatted;
}
