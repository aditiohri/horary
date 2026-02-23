import { OpenAI } from "openai";
import { analyzeMoonAspects, extractAspectsWithMotion } from "./aspectMotion";
import {
  calculateChartDignities,
  getSignRuler,
  getSignFromDegrees,
  isDayChart as checkIsDayChart
} from "./horary/dignities";
import { calculateVoidOfCourseMoon } from "./horary/voidOfCourseMoon";
import { analyzeReception, formatReceptionForDisplay } from "./horary/reception";
import { formatTimingForLLM } from "./horary/timing";
import { calculateChartAccidentalDignities } from "./horary/accidentalDignities";
import { calculatePartOfFortune, formatPartOfFortuneForDisplay } from "./horary/arabicParts";

// Enhanced format chart for LLM with aspect motion
function formatChartForLLMWithMotion(reading: HoraryReading): string {
  const chartData = reading.chartData;
  let formattedData = `## Chart Data for Question: "${reading.question}"\n`;
  formattedData += `**Time**: ${new Date(
    reading.timestamp
  ).toLocaleString()}\n`;

  if (reading.location) {
    formattedData += `**Location**: ${reading.location.latitude.toFixed(
      2
    )}°N, ${reading.location.longitude.toFixed(2)}°W\n\n`;
  }

  // Calculate essential dignities for all planets
  const sunHouse = getPlanetHouse(chartData.planets.sun.position, chartData.cusps);
  const isDayChartValue = checkIsDayChart(sunHouse);
  const dignities = calculateChartDignities(chartData.planets, isDayChartValue);

  // Calculate accidental dignities for all planets
  const accidentalDignities = calculateChartAccidentalDignities(chartData.planets, chartData.cusps, isDayChartValue);

  // Get ascendant for use in house rulers and significator analysis
  const ascendant = chartData.planets.ascendant;

  // Calculate aspects with motion (will be used in multiple sections)
  const aspectsWithMotion = chartData.aspects && chartData.aspects.length > 0
    ? extractAspectsWithMotion(chartData, chartData.aspects)
    : [];

  // Format planetary positions with dignities
  formattedData += `### Planetary Positions & Essential Dignities:\n`;
  formattedData += `**Chart Type**: ${isDayChartValue ? 'Day Chart' : 'Night Chart'} (Sun in House ${sunHouse})\n\n`;

  Object.entries(chartData.planets).forEach(([planet, planetData]) => {
    // Skip angles for dignity calculation
    if (planet === 'ascendant' || planet === 'midheaven') {
      const { sign, degree } = degreesToSignAndDegree(planetData.position);
      formattedData += `- **${
        planet.charAt(0).toUpperCase() + planet.slice(1)
      }**: ${degree.toFixed(2)}° ${sign}\n`;
      return;
    }

    const { sign, degree } = degreesToSignAndDegree(planetData.position);
    const house = getPlanetHouse(planetData.position, chartData.cusps);
    const rxSymbol = planetData.isRetrograde ? " ℞" : "";

    // Get dignity info
    const dignity = dignities[planet];
    const dignityInfo = dignity
      ? ` | ${dignity.description} (${dignity.strength}, Score: ${dignity.score})`
      : '';

    // Get accidental dignity info
    const accDignity = accidentalDignities[planet];
    const accDignityInfo = accDignity
      ? ` | Accidental: ${accDignity.houseType} house, ${accDignity.speedStatus} speed, ${accDignity.lightCondition} (${accDignity.strength}, Score: ${accDignity.totalScore})`
      : '';

    formattedData += `- **${
      planet.charAt(0).toUpperCase() + planet.slice(1)
    }${rxSymbol}**: ${degree.toFixed(2)}° ${sign} (House ${house})${dignityInfo}${accDignityInfo}\n`;
  });

  // Format house rulers (using whole sign houses)
  formattedData += `\n### House Rulers (Whole Sign System):\n`;
  if (ascendant) {
    const ascSign = getSignFromDegrees(ascendant.position);
    const signs = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
    const ascSignIndex = signs.indexOf(ascSign.sign.toLowerCase());

    for (let i = 0; i < 12; i++) {
      const houseSign = signs[(ascSignIndex + i) % 12];
      const ruler = getSignRuler(houseSign as any);
      const rulerPlanet = chartData.planets[ruler];

      if (rulerPlanet) {
        const rulerSign = getSignFromDegrees(rulerPlanet.position);
        const rulerHouse = getPlanetHouse(rulerPlanet.position, chartData.cusps);
        const rulerDignity = dignities[ruler];
        const rulerStrength = rulerDignity ? rulerDignity.strength : 'Unknown';

        formattedData += `- **House ${i + 1}** (${houseSign.charAt(0).toUpperCase() + houseSign.slice(1)}): `;
        formattedData += `Ruled by ${ruler.charAt(0).toUpperCase() + ruler.slice(1)} `;
        formattedData += `at ${rulerSign.degreeInSign.toFixed(1)}° ${rulerSign.sign.charAt(0).toUpperCase() + rulerSign.sign.slice(1)}, `;
        formattedData += `House ${rulerHouse}, ${rulerStrength}\n`;
      }
    }
  }

  // Enhanced aspects with motion data
  if (aspectsWithMotion.length > 0) {
    formattedData += `\n### Major Aspects:\n`;

    aspectsWithMotion.forEach((aspect) => {
      const status = aspect.isApplying
        ? "→ Applying"
        : aspect.isSeparating
        ? "← Separating"
        : "⚮ Stable";

      formattedData += `- **${aspect.point1Label} ${aspect.aspectLabel} ${aspect.point2Label}** `;
      formattedData += `${status} (orb: ${aspect.currentOrb.toFixed(2)}°)`;

      if (aspect.timeToExact && aspect.timeToExact < 30) {
        formattedData += ` [Exact in ${aspect.timeToExact.toFixed(1)} days]`;
      } else if (aspect.timeSinceExact && aspect.timeSinceExact < 30) {
        formattedData += ` [Was exact ${aspect.timeSinceExact.toFixed(
          1
        )} days ago]`;
      }

      if (aspect.isPerfect) {
        formattedData += " **✱ PERFECT**";
      }

      // Add timing analysis for applying aspects
      if (aspect.isApplying && aspect.timingEstimate) {
        const timing = aspect.timingEstimate;
        formattedData += `\n  **⏱ Timing:** ${timing.signType.charAt(0).toUpperCase() + timing.signType.slice(1)} sign + ${timing.housePlacement.charAt(0).toUpperCase() + timing.housePlacement.slice(1)} house`;
        formattedData += ` → Expect: ${timing.suggestedTimeframes.fastest.value} ${timing.suggestedTimeframes.fastest.unit}`;
        formattedData += ` to ${timing.suggestedTimeframes.slowest.value} ${timing.suggestedTimeframes.slowest.unit}`;
        formattedData += ` (most likely: ${timing.suggestedTimeframes.mostLikely.value} ${timing.suggestedTimeframes.mostLikely.unit})`;
        if (timing.conflictingSignals) {
          formattedData += ` ⚠️ (conflicting timing signals)`;
        }
      }

      formattedData += "\n";
    });

    // Special Moon analysis for horary
    const moonAnalysis = analyzeMoonAspects(aspectsWithMotion);

    if (moonAnalysis.lastSeparatingAspect || moonAnalysis.nextApplyingAspect) {
      formattedData += `\n### Moon's Recent & Next Aspects (Crucial for Horary):\n`;

      if (moonAnalysis.lastSeparatingAspect) {
        const asp = moonAnalysis.lastSeparatingAspect;
        formattedData += `- **Most Recent**: Moon ${asp.aspectLabel} ${
          asp.point1Key === "moon" ? asp.point2Label : asp.point1Label
        } `;
        formattedData += `(separating, orb: ${asp.currentOrb.toFixed(2)}°)\n`;
      }

      if (moonAnalysis.nextApplyingAspect) {
        const asp = moonAnalysis.nextApplyingAspect;
        formattedData += `- **Next**: Moon ${asp.aspectLabel} ${
          asp.point1Key === "moon" ? asp.point2Label : asp.point1Label
        } `;
        formattedData += `(applying, orb: ${asp.currentOrb.toFixed(2)}°`;
        if (asp.timeToExact) {
          formattedData += `, exact in ${asp.timeToExact.toFixed(1)} days`;
        }
        formattedData += ")\n";

        // Add timing estimate for Moon's next aspect if available
        if (asp.timingEstimate) {
          const timing = asp.timingEstimate;
          formattedData += `  **Timing Guidance:** This aspect will perfect in approximately ${timing.suggestedTimeframes.mostLikely.value} ${timing.suggestedTimeframes.mostLikely.unit}`;
          formattedData += ` (range: ${timing.suggestedTimeframes.fastest.value} ${timing.suggestedTimeframes.fastest.unit}`;
          formattedData += ` to ${timing.suggestedTimeframes.slowest.value} ${timing.suggestedTimeframes.slowest.unit}).\n`;
          formattedData += `  ${timing.interpretation}\n`;
        }
      }
    }
  }

  // Add Void of Course Moon status (CRITICAL for radicality)
  const vocMoon = calculateVoidOfCourseMoon(chartData.planets);
  formattedData += `\n### Void of Course Moon (Critical for Radicality):\n`;
  formattedData += `- **Status**: ${vocMoon.isVoid ? '⚠️ VOID OF COURSE' : '✓ NOT VOID OF COURSE'}\n`;
  formattedData += `- **Current Sign**: ${vocMoon.currentSign} (${vocMoon.degreesUntilNextSign.toFixed(1)}° until ${vocMoon.nextSign})\n`;
  formattedData += `- **Time Until Sign Change**: ${vocMoon.hoursUntilNextSign.toFixed(1)} hours\n`;

  if (!vocMoon.isVoid && vocMoon.lastAspect) {
    formattedData += `- **Next Aspect Before Sign Change**: Moon will ${vocMoon.lastAspectType} ${vocMoon.lastAspectPlanet?.toUpperCase()} before leaving ${vocMoon.currentSign}\n`;
  }

  if (vocMoon.isVoid && vocMoon.effectiveInCurrentSign) {
    formattedData += `- **Exception**: Moon is in ${vocMoon.currentSign}, an exception sign where VOC Moon is still effective\n`;
  }

  formattedData += `- **Interpretation**: ${vocMoon.interpretation}\n`;

  // Add Part of Fortune
  if (ascendant) {
    const pof = calculatePartOfFortune(
      ascendant.position,
      chartData.planets.sun.position,
      chartData.planets.moon.position,
      chartData.planets,
      chartData.cusps
    );

    formattedData += `\n### Part of Fortune (Pars Fortunae):\n`;
    formattedData += formatPartOfFortuneForDisplay(pof);
  }

  // Add significator analysis (which house rulers are involved)
  formattedData += `\n### Significator Analysis:\n`;

  // Reuse ascendant from house rulers section
  if (ascendant) {
    const ascSign = getSignFromDegrees(ascendant.position);
    const firstHouseRuler = getSignRuler(ascSign.sign.toLowerCase() as any);
    const querentPlanet = chartData.planets[firstHouseRuler];

    if (querentPlanet) {
      const querentSign = getSignFromDegrees(querentPlanet.position);
      const querentDignity = dignities[firstHouseRuler];
      formattedData += `- **Querent (1st House Ruler)**: ${firstHouseRuler.charAt(0).toUpperCase() + firstHouseRuler.slice(1)} `;
      formattedData += `at ${querentSign.degreeInSign.toFixed(1)}° ${querentSign.sign.charAt(0).toUpperCase() + querentSign.sign.slice(1)} `;
      formattedData += `(${querentDignity?.strength || 'Unknown'}, Score: ${querentDignity?.score || 0})`;
      if (querentPlanet.isRetrograde) {
        formattedData += ` ℞ RETROGRADE - May indicate delays or reversal`;
      }
      formattedData += `\n`;

      // Find 7th house ruler (descendant = other person/quesited for relationship questions)
      const signs = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
      const ascSignIndex = signs.indexOf(ascSign.sign.toLowerCase());
      const seventhHouseSign = signs[(ascSignIndex + 6) % 12];
      const seventhHouseRuler = getSignRuler(seventhHouseSign as any);
      const quesitedPlanet = chartData.planets[seventhHouseRuler];

      if (quesitedPlanet && seventhHouseRuler !== firstHouseRuler) {
        const quesitedSign = getSignFromDegrees(quesitedPlanet.position);
        const quesitedDignity = dignities[seventhHouseRuler];
        formattedData += `- **Quesited/Other (7th House Ruler)**: ${seventhHouseRuler.charAt(0).toUpperCase() + seventhHouseRuler.slice(1)} `;
        formattedData += `at ${quesitedSign.degreeInSign.toFixed(1)}° ${quesitedSign.sign.charAt(0).toUpperCase() + quesitedSign.sign.slice(1)} `;
        formattedData += `(${quesitedDignity?.strength || 'Unknown'}, Score: ${quesitedDignity?.score || 0})`;
        if (quesitedPlanet.isRetrograde) {
          formattedData += ` ℞ RETROGRADE - May indicate delays or reversal`;
        }
        formattedData += `\n`;

        // Check if significators aspect each other
        const significatorAspects = aspectsWithMotion.filter(asp =>
          (asp.point1Key === firstHouseRuler && asp.point2Key === seventhHouseRuler) ||
          (asp.point2Key === firstHouseRuler && asp.point1Key === seventhHouseRuler)
        );

        if (significatorAspects.length > 0) {
          formattedData += `\n**Aspects Between Significators:**\n`;
          significatorAspects.forEach(asp => {
            const status = asp.isApplying ? "APPLYING ➜ Will perfect" : asp.isSeparating ? "SEPARATING ➜ Already happened" : "STABLE";
            formattedData += `  - ${asp.point1Label} ${asp.aspectLabel} ${asp.point2Label} (${status}, orb: ${asp.currentOrb.toFixed(2)}°)\n`;

            // Check for potential prohibitions
            if (asp.isApplying && asp.timeToExact) {
              formattedData += `    ⏱ Will be exact in ${asp.timeToExact.toFixed(1)} days\n`;

              // Warning about retrograde planets that might frustrate
              if (querentPlanet.isRetrograde || quesitedPlanet.isRetrograde) {
                formattedData += `    ⚠️ WARNING: One significator is retrograde - check for FRUSTRATION (aspect may not perfect)\n`;
              }
            }
          });
        } else {
          formattedData += `\n**No Direct Aspect Between Significators** - Look for translation of light or collection of light\n`;
        }

        // Analyze reception between significators
        formattedData += `\n**Reception Between Significators:**\n`;
        const reception = analyzeReception(
          firstHouseRuler as any,
          querentPlanet.position,
          seventhHouseRuler as any,
          quesitedPlanet.position
        );
        formattedData += formatReceptionForDisplay(
          firstHouseRuler,
          seventhHouseRuler,
          reception
        );
        formattedData += `\n`;
      }
    }
  }

  return formattedData;
}

import { createLLMClient, getCurrentModel, formatLLMError } from './llm/client';
import { loadSettings } from './llm/storage';
import { checkQuota, recordUsage } from './llm/freeTier';

// Enhanced system prompt with comprehensive traditional horary principles
const HORARY_SYSTEM_PROMPT = `You are an expert horary astrologer following William Lilly's traditional methodology. Provide accurate, compassionate readings based on the chart for the moment a sincere question is asked.

## Analysis Process:

### 1. Chart Radicality (Is Chart Valid?)
**Check before judging:**
- **0-3° Rising**: Too early (insufficient info) - UNLESS ruler in that sign
- **27-30° Rising**: Too late (matter decided) - UNLESS ruler in that sign
- **Moon Void of Course**: Nothing comes of the matter (EXCEPT in Taurus, Cancer, Sagittarius, Pisces)
- **Saturn in 1st/7th**: Judgment may be impaired
- **Sincerity**: Is this urgent and sincere?

### 2. Significators = House Rulers
**Identify:**
- **Querent**: 1st house ruler (always) + Moon (co-significator)
- **Quesited**: Ruler of house representing what's asked about

**Question Types:**
Relationship: 1st=querent, 7th=partner, 5th=romance | Job: 1st=querent, 10th=employer, 2nd=income | Lost Object: 2nd=object | Property: 4th=property, 10th=seller

**House Meanings (Identify correct house for the question):**
- **1st**: Querent (self), physical body, vitality, personal desires
- **2nd**: Money, possessions, valuables, income, resources, what you own
- **3rd**: SIBLINGS (brothers/sisters), neighbors, short trips, local travel, communication, early education, vehicles
- **4th**: Home, real estate, parents (especially father in day charts), land, foundations, endings of matters
- **5th**: Romance, love affairs, children, pregnancy, pleasure, gambling, creativity, speculation
- **6th**: Illness, health concerns, employees, daily work, servants, small animals, service, colleagues
- **7th**: Partners (marriage/business), opponents, open enemies, "the other person", contracts
- **8th**: Death, inheritance, partner's money, shared resources, taxes, fear, transformation
- **9th**: Long journeys, foreign lands, law, courts, higher education, religion, philosophy, in-laws
- **10th**: Career, reputation, employer, authority figures, mother, honors, public standing
- **11th**: Friends, hopes, wishes, groups, organizations, benefactors, step-children
- **12th**: Hidden enemies, self-undoing, isolation, hospitals, prisons, secret affairs, large animals, mysticism

### 3. Essential Dignities (Planet's Condition in Sign)
**Dignity scores provided:**
- **Ruler/Domicile** (+5): Very strong, acts freely
- **Exaltation** (+4): Honored, elevated
- **Triplicity** (+3): Comfortable, supported
- **Detriment** (-4): Weakened, uncomfortable
- **Fall** (-5): Debilitated, ineffective
- **Peregrine** (0): Neutral, self-interested

**Strength:**
8+: Excellent | 4-7: Good | 1-3: Limited | 0: Neutral | -1 to -4: Compromised | -5+: Debilitated

**Rule**: Strong significators = success likely. Weak = lacks resources.

**CRITICAL PRINCIPLE:** A planet's essential dignity (rulership, exaltation, detriment, fall) is determined ONLY by which sign it occupies. This dignity is the planet's PRIMARY strength and does NOT change based on its dispositor or other factors.

- If Venus is in Pisces → Venus is EXALTED (+4) = Strong
- If Mars is in Capricorn → Mars is EXALTED (+4) = Strong
- This is true regardless of what the dispositor is doing

### 4. Accidental Dignities (Position Strength)
**House:** Angular (1,4,7,10) +5 | Succedent (2,5,8,11) +3 | Cadent (3,6,9,12) +1
**Speed:** Swift +2 | Retrograde -5
**Sun:** Cazimi (within 17') +5 | In Chariot (combust BUT in own dignity) +2-3 | Combust (within 8°) -5 | Under Beams (within 17°) -4

### 5. Dispositor Relationships - "Landlord" Principle

**Key:** A planet's dispositor = planet ruling the sign it's in. This is a SECONDARY consideration that shows available support.

**How It Works:**
- Moon in Virgo (peregrine) with Mercury in Gemini (ruler, strong):
  - Mercury rules Virgo = Moon's dispositor
  - Moon has no essential dignity (0), but strong dispositor helps
  - Interpretation: "Moon neutral, but well-supported by capable Mercury"

**Example with Venus in Pisces (Common Confusion):**
- Venus in Pisces = EXALTED (+4) = Strong planet
- Jupiter rules Pisces = Jupiter is Venus's dispositor
- Venus's exaltation does NOT depend on Jupiter's condition
- If Jupiter is also strong → Venus has strong support too
- If Jupiter is weak → Venus is still exalted, just less supported

**Key Rule:** Essential dignity (the planet's own strength) comes FIRST. Dispositor support is a bonus or limitation on top of that baseline.

**For Part of Fortune:** Strong PoF dispositor = querent HAS capacity to succeed. Weak = LACKS resources.

### 6. Aspects - Will It Happen?
**Application (CRITICAL):**
- **Applying**: Faster planet moving TOWARD exact → WILL happen
- **Separating**: Moving AWAY → already happened or WON'T happen
- **Partile**: Within 1° (most powerful)

**Traditional:** Conjunction (0°), Sextile (60°), Square (90°), Trine (120°), Opposition (180°)

**Obstacles:**
- **Prohibition**: Third planet aspects significator BEFORE main aspect perfects → blocked
- **Frustration**: Planet retrogrades or changes sign before perfection → won't happen
- **Translation**: Faster planet separating from one, applying to other → intermediary brings together
- **Collection**: Slower planet receives both aspects → mutual connection

### 7. Reception - How Significators View Each Other
**CRITICAL: ALWAYS state:**
1. **Which houses** planets rule
2. **What they represent** in the question
3. The **relationship dynamic**

**CORRECT Example:**
"Sun rules 1st (you) and Saturn rules 7th (them). Sun in Leo (own sign), Saturn in Aquarius (own sign). No mutual reception = both operate independently, not disposed to help each other."

**WRONG Example:**
"Sun in Leo, Saturn in Aquarius. No mutual reception." ❌ (Doesn't say WHO they represent!)

**Reception Types:**
- **Mutual**: In each other's signs → favorably disposed
- **Exaltation**: In other's exaltation → honors the other
- **Detriment/Fall**: In other's detriment → dislike, resistance
- **No Reception**: Neutral

### 8. The Moon (Co-Significator)
- **Void of Course**: Nothing comes of matter (except Taurus, Cancer, Sag, Pisces)
- **Last Aspect**: What querent experienced (context)
- **Next Aspect**: What happens next (outcome)
- **Dignity**: Strong = has resources. Weak = lacks power

### 9. Part of Fortune
**Represents:** Material fortune, capacity to achieve outcome, resources, luck

**Calculation:** Day Chart: Asc + Moon - Sun | Night Chart: Asc + Sun - Moon

**Interpret:**
1. **House**: WHERE fortune manifests (1st=personal, 2nd=financial, 10th=career, etc.)
2. **Sign**: QUALITY (cardinal=quick, fixed=stable, mutable=changeable)
3. **Dispositor Strength** (MOST IMPORTANT): Strong = querent has capacity. Weak = lacks resources
4. **Aspects**: Benefics (Jupiter/Venus) help. Malefics (Mars/Saturn) challenge

**Judgment:** Well-placed PoF (strong dispositor) = querent has resources. Poorly placed = lacks capacity despite desire.

### 10. Timing
**Sign Type:** Cardinal: days-weeks (fast) | Fixed: months-years (slow) | Mutable: weeks-months (medium)
**House Type:** Angular: quick | Succedent: moderate | Cadent: slow
**Orb:** Smaller orb = sooner. Larger = later.

Use provided timing estimates as context, NOT exact dates.

### 11. Judgment Sequence
1. Check radicality
2. Identify significators
3. Assess dignity (are significators strong or weak?)
   - Check the dignity SCORE first (4-7 = strong, -4 to -5 = weak)
   - Venus in Pisces? Score +4 = EXALTED = Strong
   - Mars in Capricorn? Score +4 = EXALTED = Strong
4. Check Part of Fortune (dispositor strong?)
5. Check aspects (applying/separating?)
6. Check prohibitions/frustrations
7. Check reception
8. Consider Moon's role
9. Determine timing
10. Synthesize all factors

## Response Structure:

**ALWAYS structure readings this way:**

### 1. Overall Judgment (FIRST) - Plain English Only
- Begin with "## Overall Judgment"
- Write in plain, accessible English - NO astrological jargon
- Avoid terms like: "significator", "applying", "separating", "dignity", "exalted", "dispositor", "reception", "partile", etc.
- DO use everyday language: "you", "they", "strong position", "favorable connection", "obstacles", "support", "timing suggests"
- Give clear, direct answer (2-3 paragraphs)
- State success/failure/uncertain with reasoning anyone can understand
- Include timing if applicable (e.g., "within 2-3 weeks" not "when Moon applies to Saturn")
- Should be completely standalone - someone with zero astrology knowledge should understand this section

### 2. Detailed Astrological Analysis (SECOND) - Technical Details
- Begin with "## Detailed Astrological Analysis"
- NOW use proper astrological terminology
- **ALWAYS include house placements and rulerships** - this is critical context
- Chart radicality (is chart valid for judgment?)
- Significator identification (which houses represent querent/quesited, and their rulers)
- Essential & accidental dignities with scores
- House placement for key planets (e.g., "Mars in the 10th house of career")
- House rulerships (e.g., "Mars rules your 1st house and is placed in the 10th")
- Aspect analysis (applying/separating status)
- Reception between significators
- Part of Fortune analysis with dispositor strength
- Timing calculations
- Reference specific technical factors (e.g., "Mars in Capricorn (exalted, +4) in 10th house (angular, +5) = Very Strong")

## Tone:
Compassionate, clear, acknowledge uncertainty when appropriate. Emphasize free will and personal responsibility.

## Chart Data Provided:
Planetary positions, house cusps, aspects with orbs/motion, essential/accidental dignities, VOC Moon status, Part of Fortune with dispositor.

## Ethics:
Only read sincere questions. Avoid death/harm predictions. Focus on guidance, not absolute outcomes. Respect the sacred tradition.`;

// Interface for chart data structure
export interface HoraryChartData {
  planets: {
    [key: string]: {
      position: number;
      isRetrograde: boolean;
    };
  };
  cusps: number[]; // house cusps in degrees
  aspects?: string[];
}

export interface HoraryReading {
  question: string;
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  chartData: HoraryChartData;
}

// Helper function to convert degrees to sign and degree
function degreesToSignAndDegree(degrees: number): {
  sign: string;
  degree: number;
} {
  const signs = [
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
    "Aquarius",
    "Pisces",
  ];

  const normalizedDegrees = ((degrees % 360) + 360) % 360;
  const signIndex = Math.floor(normalizedDegrees / 30);
  const degree = normalizedDegrees % 30;

  return {
    sign: signs[signIndex],
    degree: Math.round(degree * 100) / 100,
  };
}

// Helper function to determine house for a planet
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

// Format chart data for the LLM
function formatChartForLLM(reading: HoraryReading): string {
  const { chartData } = reading;

  let formattedData = `## Chart Data for Question: "${reading.question}"\n`;
  formattedData += `**Time**: ${new Date(
    reading.timestamp
  ).toLocaleString()}\n`;

  if (reading.location) {
    formattedData += `**Location**: ${reading.location.latitude.toFixed(
      2
    )}°N, ${reading.location.longitude.toFixed(2)}°W\n\n`;
  }

  // Format planetary positions
  formattedData += `### Planetary Positions:\n`;
  Object.entries(chartData.planets).forEach(([planet, planetData]) => {
    const { sign, degree } = degreesToSignAndDegree(planetData.position);
    const house = getPlanetHouse(planetData.position, chartData.cusps);
    const rxSymbol = planetData.isRetrograde ? " ℞" : "";
    formattedData += `- **${
      planet.charAt(0).toUpperCase() + planet.slice(1)
    }${rxSymbol}**: ${degree.toFixed(2)}° ${sign} (House ${house})\n`;
  });

  // Format house cusps
  formattedData += `\n### House Cusps:\n`;
  chartData.cusps.forEach((cusp, index) => {
    const { sign, degree } = degreesToSignAndDegree(cusp);
    formattedData += `- **House ${index + 1}**: ${degree.toFixed(
      2
    )}° ${sign}\n`;
  });

  // Add aspects if available
  if (chartData.aspects && chartData.aspects.length > 0) {
    formattedData += `\n### Major Aspects:\n`;
    chartData.aspects.forEach((aspect) => {
      formattedData += `- ${aspect}\n`;
    });
  }

  return formattedData;
}

// Updated LLM generation function
export const generateHoraryReading = async (
  reading: HoraryReading
): Promise<string | null> => {
  try {
    const settings = loadSettings();

    // Check quota if using free tier
    if (settings.provider === 'openrouter-free') {
      const quotaCheck = checkQuota();
      if (!quotaCheck.allowed) {
        throw new Error(`Free tier limit reached: ${quotaCheck.reason}. Please add your own API key in Settings to continue.`);
      }
    }

    const openai = createLLMClient();
    const model = getCurrentModel();
    const formattedChart = formatChartForLLMWithMotion(reading);

    const prompt = `${formattedChart}

Please provide a traditional horary reading for this question. All chart data including significators, aspects between them, house rulers, and potential prohibitions/frustrations has been provided above.

**CRITICAL: Follow the two-part response structure:**

**Part 1 - Overall Judgment (Plain English):**
Start with your judgment in clear, accessible language that anyone can understand. NO astrological jargon. Give the answer, explain why, include timing. This should make sense to someone who knows nothing about astrology.

**Part 2 - Detailed Astrological Analysis (Technical):**
Then provide the technical analysis using proper astrological terminology. ALWAYS reference house placements and rulerships throughout this section.

**Judgment process to follow internally:**
1. Check radicality (chart validity - Ascendant degree, Moon VOC status)
2. Review significators (1st and 7th house rulers in Significator Analysis section)
3. Assess dignity (examine essential dignity scores - Venus in Pisces = +4 exalted, etc.)
4. Analyze house placements (which houses do key planets occupy and rule?)
5. Check aspects (applying or separating? Check "Aspects Between Significators")
6. Check prohibitions/frustrations (retrograde warnings, third planet interference)
7. Consider reception (how do significators receive each other by dignity?)
8. Moon's role (review Moon's last and next aspects)
9. Provide timing (based on aspect orb, sign type, house placement)

Proceed directly with your traditional horary judgment.`;

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: HORARY_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    // Record usage for free tier
    if (settings.provider === 'openrouter-free') {
      const tokensUsed = response.usage?.total_tokens || 0;
      recordUsage(tokensUsed);
    }

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error generating horary reading:", error);
    throw new Error(formatLLMError(error));
  }
};

// Function for follow-up conversation
export const continueHoraryConversation = async (
  reading: HoraryReading,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  newMessage: string
): Promise<string | null> => {
  try {
    const settings = loadSettings();

    // Check quota if using free tier
    if (settings.provider === 'openrouter-free') {
      const quotaCheck = checkQuota();
      if (!quotaCheck.allowed) {
        throw new Error(`Free tier limit reached: ${quotaCheck.reason}. Please add your own API key in Settings to continue.`);
      }
    }

    const openai = createLLMClient();
    const model = getCurrentModel();
    const formattedChart = formatChartForLLM(reading);

    // Build the conversation with context
    const messages = [
      { role: "system" as const, content: HORARY_SYSTEM_PROMPT },
      {
        role: "user" as const,
        content: `${formattedChart}\n\nPlease analyze this horary chart.`,
      },
      ...conversationHistory,
      { role: "user" as const, content: newMessage },
    ];

    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1500,
    });

    // Record usage for free tier
    if (settings.provider === 'openrouter-free') {
      const tokensUsed = response.usage?.total_tokens || 0;
      recordUsage(tokensUsed);
    }

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error in horary conversation:", error);
    throw new Error(formatLLMError(error));
  }
};

// Simple text generation for other purposes
export const generateText = async (prompt: string): Promise<string | null> => {
  try {
    const settings = loadSettings();

    // Check quota if using free tier
    if (settings.provider === 'openrouter-free') {
      const quotaCheck = checkQuota();
      if (!quotaCheck.allowed) {
        throw new Error(`Free tier limit reached: ${quotaCheck.reason}. Please add your own API key in Settings to continue.`);
      }
    }

    const openai = createLLMClient();
    const model = getCurrentModel();

    const response = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
    });

    // Record usage for free tier
    if (settings.provider === 'openrouter-free') {
      const tokensUsed = response.usage?.total_tokens || 0;
      recordUsage(tokensUsed);
    }

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error generating text:", error);
    throw new Error(formatLLMError(error));
  }
};
