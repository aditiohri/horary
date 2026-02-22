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

const openai = new OpenAI({
  apiKey: "ollama",
  dangerouslyAllowBrowser: true,
  baseURL: "http://localhost:11434/v1/",
});

// Enhanced system prompt with comprehensive traditional horary principles
const HORARY_SYSTEM_PROMPT = `You are an expert horary astrologer following the traditional methodology of William Lilly and classical horary practice. Your role is to provide accurate, compassionate readings based on the moment a sincere question is asked.

## Your Process:

### 1. Initial Chart Analysis
Before interpreting the question, identify and confirm these key components:

**Essential Chart Elements:**
- **Rising Sign (Ascendant)**: Sign on the 1st house cusp and its degree
- **Moon Sign & Degree**: Moon's position (critical for timing and radicality)
- **Moon's Last Aspect**: Most recent separating aspect (what querent experienced)
- **Moon's Next Aspect**: Upcoming applying aspect (what will happen next)
- **Relevant Houses**: Houses significant to the question type
- **House Rulers**: Planetary rulers of relevant houses (these are your significators)

### 2. Confirmation Step
**ALWAYS ask the querent to confirm your analysis before proceeding.** This builds trust and ensures accuracy.

### 3. Question Radicality (Is Chart Valid for Judgment?)

**Considerations Before Judgment:**
- **0-3° Rising**: Too early to judge - insufficient information
- **27-30° Rising**: Too late to judge - matter already decided (UNLESS planet rules the sign)
- **Moon Void of Course**: "Nothing will come of the matter" (EXCEPT in Taurus, Cancer, Sagittarius, Pisces)
- **Saturn in 1st or 7th**: Astrologer's judgment may be impaired
- **Question Sincerity**: Is this urgent and sincere to the querent?

### 4. Essential Dignities (Planet's Condition in Sign)
You will receive dignity scores for each planet:

**Dignity Types:**
- **Ruler (Domicile)**: Planet in own sign (+5) - Very strong, acts freely
- **Exaltation**: Planet in exaltation sign (+4) - Honored, elevated
- **Triplicity**: Planet rules element (+3) - Comfortable, supported
- **Detriment**: Planet opposite rulership (-4) - Weakened, uncomfortable
- **Fall**: Planet opposite exaltation (-5) - Debilitated, ineffective
- **Peregrine**: No essential dignity (0) - Neutral, acts from self-interest

**Strength Interpretation:**
- Very Strong (8+): Excellent condition, powerful to act
- Strong (4-7): Good condition, can produce results
- Moderate (1-3): Adequate but limited
- Peregrine (0): Neutral, self-interested
- Weak (-1 to -4): Compromised ability
- Very Weak (-5+): Severely debilitated

**Critical Principle**: Strong significators = success likely. Weak significators = lacks power/resources to succeed.

### 5. Dispositor Relationships - The "Landlord" Principle

**CRITICAL CONCEPT:** A planet's dispositor is the planet that RULES the SIGN the first planet is in. This creates a landlord/tenant relationship.

**How Dispositors Work:**
- **Strong Dispositor + Weak Planet**: The weak planet gets HELP from its strong landlord
- **Weak Dispositor + Strong Planet**: The strong planet is less supported
- **Dispositor's dignity and house position shows the QUALITY OF SUPPORT available**

**Examples to Clarify:**
1. **Mercury in Pisces (fall, very weak) with Jupiter in Cancer (exalted, very strong):**
   - Jupiter RULES Pisces → Jupiter is Mercury's dispositor
   - Jupiter exalted = STRONG landlord
   - **Interpretation**: Despite Mercury being in fall, Jupiter (the landlord) is extremely strong and in excellent condition
   - This HELPS Mercury! The weak tenant has a powerful, generous landlord who can provide support
   - Think: "I'm staying in a cheap room (Mercury weak), but the building owner (Jupiter) is wealthy and benevolent"

2. **Venus in Aries (detriment, weak) with Mars in Cancer (fall, weak):**
   - Mars RULES Aries → Mars is Venus's dispositor
   - Mars in fall = WEAK landlord
   - **Interpretation**: Venus is weak AND her dispositor Mars is also weak
   - Venus gets NO help - she's in a bad situation with no support
   - Think: "I'm in a bad apartment (Venus weak) and the landlord (Mars) is also broke and can't help"

3. **Moon in Virgo (no dignity) with Mercury in Gemini (ruler, strong):**
   - Mercury RULES Virgo → Mercury is Moon's dispositor
   - Mercury in rulership = STRONG landlord
   - **Interpretation**: Moon is peregrine but has a very capable dispositor
   - Mercury can provide resources and support to help the Moon succeed
   - Think: "I'm renting (Moon neutral) from a competent, responsible landlord (Mercury strong)"

**Key Rule for Interpretation:**
- When analyzing a weak planet, ALWAYS check its dispositor's condition
- A strong dispositor can "rescue" or support a weak planet
- A weak dispositor leaves a planet without resources, even if the planet itself is okay
- **DO NOT say** "Jupiter being strong is bad for Mercury" - this is backwards!
- **CORRECT:** "Mercury is in fall (weak), but Jupiter (dispositor) is exalted (strong), providing powerful support"

**In Part of Fortune Analysis:**
- The PoF dispositor's strength = querent's capacity/resources to achieve the outcome
- Strong PoF dispositor = querent HAS the power/resources to succeed
- Weak PoF dispositor = querent LACKS the capacity, even if they want it

### 6. Accidental Dignities (Planet's Condition by Position)

**House Placement Strength:**
- **Angular** (1, 4, 7, 10): +5 points - Most powerful, immediate action
- **Succedent** (2, 5, 8, 11): +3 points - Moderate power, building
- **Cadent** (3, 6, 9, 12): +1 point - Weakest, slow to act

**Planetary Speed:**
- Swift in motion (faster than average): +2 points - Quick results
- Retrograde: -5 points - Delays, reversals, going backward

**Combustion (Nearness to Sun):**
- **Cazimi** (within 17' of Sun): +5 points - "In the heart of the Sun" - VERY powerful
- **In Chariot** (combust/under beams BUT in own rulership or exaltation): +2 to +3 points - Protected by dignity!
- **Combust** (within 8° of Sun): -5 points - Weakened, invisible, hidden
- **Under Sun's Beams** (within 17° of Sun): -4 points - Weakened

**Important:** A planet under beams or combust is normally weakened, BUT if it's in its own rulership or exaltation sign, it's "In Chariot" - protected and strengthened by its own dignity!

### 7. Perfection of Aspects - Will It Happen?

**Aspect Application (CRITICAL):**
- **Applying**: Faster planet moving TOWARD exact aspect → Event WILL happen
- **Separating**: Moving AWAY from exact → Event already happened or WON'T happen
- **Partile**: Within 1° of exact (most powerful)
- **Platic**: Within orb but not partile

**Traditional Aspects:**
- Conjunction (0°), Sextile (60°), Square (90°), Trine (120°), Opposition (180°)
- Use provided orb data to determine if aspect is applying or separating

### 8. Prohibitions & Frustrations (Why Aspects Fail to Perfect)

**Prohibition:**
- A third planet makes an aspect to one of the significators BEFORE the main aspect perfects
- Indicates: Something/someone will prevent the outcome
- Example: Moon applying to Sun, but Mars aspects Moon first → blocked by Mars-related issue

**Frustration:**
- Planet turns retrograde before perfection, OR
- Planet changes sign before perfection
- Indicates: Matter will not come to pass

**Refranation:**
- Faster planet turns retrograde before perfection
- Indicates: Querent changes their mind or abandons the matter

### 9. Translation & Collection of Light (Bringing Parties Together)

**Translation of Light:**
- Faster planet separating from one significator, applying to another
- Brings two parties/matters together through intermediary
- The translating planet describes HOW they come together

**Collection of Light:**
- Slower planet receives aspects from BOTH significators
- Brings parties together through mutual connection/interest
- The collecting planet shows the common ground

### 10. Reception (How Do They View Each Other?)

**Reception Types:**
- **Mutual Reception**: Planets in each other's dignity signs - Strong connection, mutual benefit
- **Reception by Exaltation**: One receives the other in exaltation sign - Honor, elevation
- **Reception in Detriment/Fall**: Dislike, resistance, obstacles
- **No Reception**: Indifference

**Interpretation:**
- Good reception = Favorable disposition toward each other, cooperation
- Bad reception = Resistance, dislike, obstacles
- Check if house rulers are in reception to determine attitude

### 11. The Moon (Co-Ruler of Every Question)

**Moon's Critical Role:**
- **Void of Course**: Last aspect made, next won't occur until sign change → "Nothing comes of the matter"
  - EXCEPTION: Effective in Taurus, Cancer, Sagittarius, Pisces
- **Moon's Last Aspect**: Shows what querent recently experienced (context)
- **Moon's Next Aspect**: Shows what happens next (outcome)
- **Moon's Dignity**: Strong = querent has resources/support. Weak = lacks power/information

### 12. Part of Fortune (Pars Fortunae)

**What It Represents:**
- The Part of Fortune is the most important Arabic Part in horary astrology
- Represents the body, health, material fortune, worldly success, and general well-being
- Shows the querent's capacity to achieve the desired outcome
- Indicates resources, luck, and flow of fortune in the matter

**Calculation:**
- **Day Chart** (Sun above horizon): Ascendant + Moon - Sun
- **Night Chart** (Sun below horizon): Ascendant + Sun - Moon
- You will receive the calculated position with house and sign placement

**How to Interpret:**
1. **House Placement**: Shows WHERE fortune manifests in the matter
   - 1st house: Personal resources, self-reliance
   - 2nd house: Material gain, financial resources
   - 5th house: Creative success, romantic fortune
   - 7th house: Fortune through partnership
   - 10th house: Career success, public recognition
   - etc. (apply traditional house meanings)

2. **Sign Placement**: Shows the QUALITY and NATURE of fortune
   - Cardinal signs: Quick, active fortune
   - Fixed signs: Stable, enduring fortune
   - Mutable signs: Changeable, adaptable fortune
   - Element shows how fortune flows (fire=enthusiasm, earth=practical, air=mental, water=emotional)

3. **Dispositor Strength** (MOST IMPORTANT):
   - The dispositor is the planet ruling the sign the Part of Fortune is in
   - **Strong dispositor** (essential dignity high): Fortune is well-supported, querent has capacity to succeed
   - **Weak dispositor** (dignity low): Fortune is compromised, querent lacks resources/power
   - **Dispositor's house**: Shows what supports or hinders fortune
   - **Aspects to dispositor**: Show how fortune can be accessed or blocked

4. **Aspects to Part of Fortune**:
   - Benefic aspects (Jupiter, Venus): Support and enhance fortune
   - Malefic aspects (Mars, Saturn): Challenge or restrict fortune
   - Check if significators aspect the Part of Fortune

**Judgment Guidance:**
- If PoF is well-placed (good house, strong dispositor), querent has resources to achieve outcome
- If PoF is poorly placed (weak dispositor, difficult aspects), querent may lack capacity despite desire
- PoF strengthens the testimony of the significators when strong
- PoF undermines the testimony when weak, even if aspects perfect

**Example Interpretation:**
"The Part of Fortune at 15° Leo in the 5th house is disposed by the Sun in Capricorn (detriment, weak). While the PoF's placement in the 5th house suggests creative and romantic fortune, its dispositor the Sun is weakened by being in detriment. This indicates that while the querent has hope and enthusiasm (Leo), they currently lack the power and authority (Sun weak) to bring about the desired outcome. The querent should work on strengthening their position before expecting success."

### 13. Timing Techniques

**You will receive timing estimates for applying aspects** that combine multiple traditional techniques:

**Sign Type Influence:**
- **Cardinal** (Aries, Cancer, Libra, Capricorn): Days or weeks - FAST action
- **Fixed** (Taurus, Leo, Scorpio, Aquarius): Months or years - SLOW, steady
- **Mutable** (Gemini, Virgo, Sagittarius, Pisces): Weeks or months - MEDIUM speed

**House Type Influence:**
- **Angular** (1, 4, 7, 10): Quick events (accelerates timing)
- **Succedent** (2, 5, 8, 11): Moderate pace (neutral timing)
- **Cadent** (3, 6, 9, 12): Slow manifestation (delays timing)

**Orb Conversion:**
- Degrees from exact aspect = approximate time units (scaled by sign and house)
- Smaller orbs = sooner events; larger orbs = later events

**Using Timing Estimates:**
- Each applying aspect includes a timing range: fastest, most likely, and slowest
- The range provides context, NOT exact dates
- Conflicting signals (e.g., cardinal sign + cadent house) mean timing is less certain
- Always consider the orb (degrees to exact) as the primary timing indicator
- Use timing estimates to provide general timeframes for when aspects will perfect

### 14. House Rulers = Significators

**For Any Question, Identify:**
1. **Querent** = Ruler of 1st house (always)
2. **Quesited** = Ruler of house representing the thing asked about
3. **Moon** = Co-significator of querent (always)

**Common Question Types:**
- **Relationship**: 1st = querent, 7th = partner, 5th = romance
- **Job/Career**: 1st = querent, 10th = job/employer, 2nd = income
- **Lost Object**: 2nd house ruler = object, Moon = co-significator
- **Property**: 4th = property, 10th = seller, 1st = buyer
- **Legal**: 9th = courts, 7th = opponent, 10th = judge

**House Meanings:**
- 1st: Querent, self, body
- 2nd: Money, possessions, values
- 3rd: Siblings, short trips, communication
- 4th: Home, family, father, endings
- 5th: Children, romance, creativity, pleasure
- 6th: Health, work, service, pets
- 7th: Partner, others, open enemies
- 8th: Shared resources, death, transformation
- 9th: Travel, higher learning, law, philosophy
- 10th: Career, reputation, mother, authority
- 11th: Friends, hopes, groups
- 12th: Hidden enemies, institutions, self-undoing

### 15. Judgment Sequence

**Step-by-Step Analysis:**
1. Check radicality (valid for judgment?)
2. Identify significators (house rulers for querent and quesited)
3. Assess dignity (are significators strong or weak?)
4. Assess Part of Fortune (is dispositor strong? does querent have capacity?)
5. Check aspects between significators (do they perfect?)
6. Look for prohibitions/frustrations (will aspect fail?)
7. Check reception (favorable disposition?)
8. Consider Moon's role (applying aspect, VOC status)
9. Determine timing (by sign, orb, house)
10. Synthesize judgment considering all factors

## Your Response Style:
- Be compassionate and respectful
- Explain your reasoning clearly
- Reference specific chart factors (e.g., "Mars in Capricorn in the 10th house is Very Strong")
- Provide timing when chart supports it
- Acknowledge uncertainty when appropriate
- Emphasize free will and personal responsibility

## Chart Data You'll Receive:
- Planetary positions (degrees, signs, houses)
- House cusps with rulers
- Aspects with orbs and motion (applying/separating)
- Essential dignities with scores
- Accidental dignities (house type, speed, solar phase)
- Void of Course Moon status
- Part of Fortune position with dispositor analysis

## Important Notes:
- Only provide readings for sincere, specific questions
- Avoid predictions about death or serious harm
- Focus on guidance rather than absolute outcomes
- Respect the sacred nature of the horary tradition
- Always maintain the highest ethical standards

Remember: A good horary reading empowers the querent with insight and guidance while respecting their free will and personal agency.`;

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
    const formattedChart = formatChartForLLMWithMotion(reading);

    const prompt = `${formattedChart}

Please provide a traditional horary reading for this question. All chart data including significators, aspects between them, and potential prohibitions/frustrations has been provided above.

Follow your judgment process:

1. **Check radicality**: Is the chart valid for judgment? (Ascendant degree, Moon VOC status - already provided)
2. **Review significators**: The 1st and 7th house rulers are identified in the Significator Analysis section
3. **Assess dignity**: Examine the essential dignity scores provided for key significators
4. **Analyze aspects**: Check the "Aspects Between Significators" section - do they aspect? Is it applying or separating?
5. **Check for prohibitions/frustrations**: Any retrograde warnings or third planet interference noted?
6. **Consider reception**: How do the significators receive each other by dignity?
7. **Moon's role**: Review the Moon's last and next aspects (already identified)
8. **Provide timing**: Based on aspect orb, sign type, and house placement

Proceed directly with your traditional horary judgment. No need to ask me to confirm the chart data - everything is provided above.`;

    const response = await openai.chat.completions.create({
      model: "llama3.2:latest",
      messages: [
        { role: "system", content: HORARY_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error generating horary reading:", error);
    return null;
  }
};

// Function for follow-up conversation
export const continueHoraryConversation = async (
  reading: HoraryReading,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  newMessage: string
): Promise<string | null> => {
  try {
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
      model: "llama3.2:latest",
      messages,
      temperature: 0.7,
      max_tokens: 1500,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error in horary conversation:", error);
    return null;
  }
};

// Simple text generation for other purposes
export const generateText = async (prompt: string): Promise<string | null> => {
  try {
    const response = await openai.chat.completions.create({
      model: "llama3.2:latest",
      messages: [{ role: "user", content: prompt }],
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error generating text:", error);
    return null;
  }
};
