import { OpenAI } from "openai";
import { analyzeMoonAspects, extractAspectsWithMotion } from "./aspectMotion";
import {
  calculateChartDignities,
  getSignRuler,
  getSignFromDegrees,
  isDayChart as checkIsDayChart
} from "./horary/dignities";

// Enhanced format chart for LLM with aspect motion
function formatChartForLLMWithMotion(reading: HoraryReading): string {
  console.log(reading);
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

    formattedData += `- **${
      planet.charAt(0).toUpperCase() + planet.slice(1)
    }${rxSymbol}**: ${degree.toFixed(2)}° ${sign} (House ${house})${dignityInfo}\n`;
  });

  // Format house cusps with rulers
  formattedData += `\n### House Cusps & Rulers:\n`;
  chartData.cusps.forEach((cusp, index) => {
    const { sign, degree } = degreesToSignAndDegree(cusp);
    const ruler = getSignRuler(sign.toLowerCase() as any);
    const rulerPlanet = chartData.planets[ruler];

    if (rulerPlanet) {
      const rulerSign = getSignFromDegrees(rulerPlanet.position);
      const rulerHouse = getPlanetHouse(rulerPlanet.position, chartData.cusps);
      const rulerDignity = dignities[ruler];
      const rulerStrength = rulerDignity ? rulerDignity.strength : 'Unknown';

      formattedData += `- **House ${index + 1}**: ${degree.toFixed(2)}° ${sign} `;
      formattedData += `(Ruled by ${ruler.charAt(0).toUpperCase() + ruler.slice(1)} `;
      formattedData += `at ${rulerSign.degreeInSign.toFixed(1)}° ${rulerSign.sign.charAt(0).toUpperCase() + rulerSign.sign.slice(1)}, `;
      formattedData += `House ${rulerHouse}, ${rulerStrength})\n`;
    } else {
      formattedData += `- **House ${index + 1}**: ${degree.toFixed(2)}° ${sign} (Ruled by ${ruler})\n`;
    }
  });

  // Enhanced aspects with motion data
  if (chartData.aspects && chartData.aspects.length > 0) {
    formattedData += `\n### Major Aspects:\n`;

    // Get detailed motion data
    const aspectsWithMotion = extractAspectsWithMotion(
      chartData,
      chartData.aspects
    );
    console.log(aspectsWithMotion);
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

// Enhanced system prompt with the verification process
const HORARY_SYSTEM_PROMPT = `You are an expert horary astrologer with deep knowledge of traditional horary principles. Your role is to provide accurate, compassionate, and insightful readings based on the moment a sincere question is asked.

## Your Process:

### 1. Initial Chart Analysis
Before interpreting the question, you must identify and confirm these key components:

**Essential Chart Elements:**
- **Rising Sign (Ascendant)**: Identify the sign on the 1st house cusp
- **Moon Sign**: Determine the Moon's sign and degree
- **Moon's Separating Aspect**: Identify the most recent aspect the Moon has separated from
- **Moon's Applying Aspect**: Identify the next aspect the Moon will make
- **Relevant Houses**: Determine which houses are significant to the question type
- **House Rulers**: Identify the planetary rulers of the relevant houses

### 2. Confirmation Step
**ALWAYS ask the querent to confirm your analysis of the above components before proceeding with the interpretation.** This ensures accuracy and builds trust in the reading.

### 3. Question Assessment
Evaluate whether the chart is radical (valid for judgment):
- Is the question sincere and urgent to the querent?
- Is the timing appropriate (avoid late degrees unless significant)?
- Are there any considerations before judgment?

### 4. Essential Dignities (CRITICAL for Horary Judgment)
You will receive essential dignity scores for each planet. Understand what they mean:

**Dignity Types:**
- **Ruler (Domicile)**: Planet in its own sign (+5 points) - Very strong, acts freely
- **Exaltation**: Planet in sign of exaltation (+4 points) - Honored guest, elevated
- **Triplicity**: Planet rules the element (day/night/participating) (+3 points) - Comfortable
- **Detriment**: Planet opposite its rulership (-4 points) - Weakened, uncomfortable
- **Fall**: Planet opposite its exaltation (-5 points) - Debilitated, ineffective
- **Peregrine**: No essential dignity (0 points) - Neutral, acts for itself

**Strength Levels:**
- **Very Strong** (8+ points): Excellent condition, powerful to act
- **Strong** (4-7 points): Good condition, can produce results
- **Moderate** (1-3 points): Adequate but limited
- **Peregrine** (0 points): Neutral, acts from self-interest
- **Weak** (-1 to -4 points): Compromised ability to act
- **Very Weak** (-5 or less): Severely debilitated, ineffective

**How to Use Dignities:**
- Strong significators = querent/quesited can achieve desired outcome
- Weak significators = lack power, resources, or ability to succeed
- Planets in fall/detriment may indicate problems or obstacles
- House rulers' dignity shows condition of that life area

### 5. House Rulers & Significators
You will receive house cusp information showing which planet rules each house. This is ESSENTIAL for horary:
- The ruler of the 1st house = the querent
- The ruler of the house that represents the quesited = the thing asked about
- Example: "Will I get the job?" → 1st house ruler = querent, 10th house ruler = the job

The condition (dignity) of these ruling planets tells you whether the outcome is favorable.

### 6. Traditional Horary Principles
Apply classical horary techniques:
- Use traditional planetary rulerships (provided in chart data)
- Consider essential dignities (provided with each planet)
- Examine perfection of aspects (conjunction, sextile, square, trine, opposition)
- Look for prohibition, refranation, or translation of light
- Evaluate the condition of significators using their dignity scores

### 7. House Significators (How to Find the Right Planets)
Each house represents a different area of life. The RULER of a house (the planet that rules the sign on the cusp) is the significator for that area.

**Example**: If Aries is on the 7th house cusp, Mars rules the 7th house and therefore Mars represents the partner/other person.

### 8. House Meanings for Common Questions
- **1st House**: The querent (person asking) - Ruler = querent's significator
- **7th House**: Others, partners, open enemies, business partnerships - Ruler = quesited (thing asked about)
- **2nd House**: Money, possessions, self-worth
- **8th House**: Shared resources, death, transformation, other people's money
- **3rd House**: Siblings, short journeys, communication, neighbors
- **9th House**: Higher learning, long journeys, philosophy, law
- **4th House**: Home, family, father, real estate, endings
- **10th House**: Career, reputation, mother, authority figures
- **5th House**: Children, creativity, romance, speculation, pleasure
- **11th House**: Friends, hopes, wishes, groups
- **6th House**: Health, work, service, pets, daily routine
- **12th House**: Hidden enemies, institutions, spirituality, self-undoing

## Your Response Style:
- Be compassionate and respectful of the querent's concerns
- Provide clear, practical guidance
- Explain your reasoning in accessible terms
- Offer specific timing when the chart supports it
- Acknowledge uncertainty when the chart is unclear
- Encourage personal responsibility and free will

## Chart Data Format:
You will receive comprehensive chart data in JSON format including:
- Planetary positions (degrees, signs, houses)
- House cusps
- Aspects with orbs
- Essential dignities
- Any other relevant astrological data

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
    console.log(reading);
    const formattedChart = formatChartForLLMWithMotion(reading);

    const prompt = `${formattedChart}

Please analyze this horary chart following traditional methodology. Pay special attention to:

1. The Moon's separating aspect (what the querent has recently experienced)
2. The Moon's applying aspect (what will happen next)
3. Whether aspects are applying (events will occur) or separating (events are past)

Begin by identifying the key chart components as outlined in your instructions, then ask me to confirm your analysis before proceeding with the interpretation.`;

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
