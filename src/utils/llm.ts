import { OpenAI } from "openai";

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

### 4. Traditional Horary Principles
Apply classical horary techniques:
- Use traditional planetary rulerships
- Consider essential and accidental dignities
- Examine perfection of aspects (conjunction, sextile, square, trine, opposition)
- Look for prohibition, refranation, or translation of light
- Consider fixed stars if within 1° orb
- Evaluate the condition of significators

### 5. House Meanings for Common Questions
- **1st House**: The querent (person asking)
- **7th House**: Others, partners, open enemies, business partnerships
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
    [key: string]: [number]; // degrees
  };
  cusps: number[]; // house cusps in degrees
  aspects?: Array<{
    planet1: string;
    planet2: string;
    aspect: string;
    orb: number;
  }>;
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
  Object.entries(chartData.planets).forEach(([planet, [degrees]]) => {
    const { sign, degree } = degreesToSignAndDegree(degrees);
    const house = getPlanetHouse(degrees, chartData.cusps);
    formattedData += `- **${
      planet.charAt(0).toUpperCase() + planet.slice(1)
    }**: ${degree.toFixed(2)}° ${sign} (House ${house})\n`;
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
      formattedData += `- ${aspect.planet1} ${aspect.aspect} ${
        aspect.planet2
      } (orb: ${aspect.orb.toFixed(2)}°)\n`;
    });
  }

  return formattedData;
}

export const generateHoraryReading = async (
  reading: HoraryReading
): Promise<string | null> => {
  try {
    const formattedChart = formatChartForLLM(reading);

    const prompt = `${formattedChart}

Please analyze this horary chart following the traditional methodology. Begin by identifying the key chart components as outlined in your instructions, then ask me to confirm your analysis before proceeding with the interpretation.`;

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
