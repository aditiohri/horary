// src/utils/aspect-motion.ts - Simplified version with proper exports

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
  chartData: { planets: { [key: string]: PlanetData } },
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

  // Normalize future positions to 0-360 range
  const normalizeDegrees = (deg: number): number => {
    let normalized = deg % 360;
    if (normalized < 0) normalized += 360;
    return normalized;
  };

  const futurePos1 = normalizeDegrees(planet1Motion.position + planet1Motion.speed);
  const futurePos2 = normalizeDegrees(planet2Motion.position + planet2Motion.speed);

  let futureSeparation = Math.abs(futurePos1 - futurePos2);
  if (futureSeparation > 180) futureSeparation = 360 - futureSeparation;

  const futureOrb = Math.abs(futureSeparation - targetAngle);
  const currentOrb = Math.abs(separation - targetAngle);

  // Check if aspect becomes perfect during the 24-hour period
  // This happens when the orb crosses through 0
  // Calculate time to exact aspect
  const relativeApproachSpeed = planet1Motion.speed - planet2Motion.speed;

  // Determine if planets are moving toward or away from the aspect angle
  // We need to check if the separation is moving toward the target angle
  const currentDiff = separation - targetAngle;
  const futureDiff = futureSeparation - targetAngle;

  // If the signs are different, we crossed through the exact aspect
  const crossedExact = (currentDiff * futureDiff) < 0;

  // If we cross exact, it's applying (even if future orb > current orb)
  // Otherwise, use the standard comparison
  let isApplying: boolean;
  let isSeparating: boolean;

  if (crossedExact) {
    // Aspect becomes exact during the period - it's applying
    isApplying = true;
    isSeparating = false;
  } else {
    // Standard calculation
    isApplying = futureOrb < currentOrb;
    isSeparating = futureOrb > currentOrb;
  }

  const isPerfect = currentOrb <= 1;

  // DEBUG: Log Moon aspects to diagnose issues
  if (aspect.includes('moon')) {
    console.log('\n=== MOON ASPECT DEBUG ===');
    console.log('Aspect:', aspect);
    console.log('Planet 1 (position, speed, retrograde):', planet1Motion.position.toFixed(2), planet1Motion.speed.toFixed(4), planet1Motion.isRetrograde);
    console.log('Planet 2 (position, speed, retrograde):', planet2Motion.position.toFixed(2), planet2Motion.speed.toFixed(4), planet2Motion.isRetrograde);
    console.log('Target angle:', targetAngle);
    console.log('Current separation:', separation.toFixed(2));
    console.log('Future separation:', futureSeparation.toFixed(2));
    console.log('Current diff from target:', (separation - targetAngle).toFixed(2));
    console.log('Future diff from target:', (futureSeparation - targetAngle).toFixed(2));
    console.log('Crossed exact?', crossedExact);
    console.log('Current orb:', currentOrb.toFixed(2), '°');
    console.log('Future orb:', futureOrb.toFixed(2), '°');
    console.log('Result: APPLYING?', isApplying, 'SEPARATING?', isSeparating);
    console.log('========================\n');
  }

  let timeToExact: number | undefined;
  let timeSinceExact: number | undefined;

  if (relativeSpeed > 0) {
    if (isApplying) {
      timeToExact = currentOrb / relativeSpeed;
    } else if (isSeparating) {
      timeSinceExact = currentOrb / relativeSpeed;
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
  };
}

// Extended orb for tracking Moon's last aspect (even if faded)
const MOON_EXTENDED_ORB = 20;
const MOON_ACTIVE_ORB = 12;

export function extractAspectsWithMotion(
  chartData: { planets: { [key: string]: PlanetData } },
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

  // Add extended Moon aspects (outside standard orbs but within 20°)
  // This helps track the Moon's last aspect even if influence has faded
  const extendedMoonAspects = findExtendedMoonAspects(chartData);
  return [...aspectsWithMotion, ...extendedMoonAspects];
}

// Find Moon aspects outside standard orbs (for tracking last separation)
function findExtendedMoonAspects(
  chartData: { planets: { [key: string]: PlanetData } }
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

      // Only add if orb is between MOON_ACTIVE_ORB and MOON_EXTENDED_ORB
      // (aspects within active orb are already detected)
      if (orb > MOON_ACTIVE_ORB && orb <= MOON_EXTENDED_ORB) {
        const aspectString = `moon ${aspect.name} ${planet}`;
        const motionData = calculateAspectMotion(chartData, aspectString);

        extendedAspects.push({
          ...motionData,
          point1Label: 'moon',
          point2Label: planet,
          aspectLabel: aspect.name,
          isFaded: true, // Mark as faded (outside active orb)
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

  console.log('\n=== ANALYZING MOON ASPECTS ===');
  console.log('Total Moon aspects found:', moonAspects.length);
  moonAspects.forEach(aspect => {
    console.log(`  ${aspect.point1Key} ${aspect.aspectKey} ${aspect.point2Key}:`,
      aspect.isApplying ? 'APPLYING' : aspect.isSeparating ? 'SEPARATING' : 'STABLE',
      `(orb: ${aspect.currentOrb.toFixed(2)}°)`,
      aspect.isFaded ? '[FADED]' : ''
    );
  });

  // Separate applying and separating aspects
  const separatingAspects = moonAspects.filter((a) => a.isSeparating);
  const applyingAspects = moonAspects.filter((a) => a.isApplying);

  console.log('Separating aspects:', separatingAspects.length);
  console.log('Applying aspects:', applyingAspects.length);
  console.log('==============================\n');

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

    formatted += "\n";
  });

  return formatted;
}
