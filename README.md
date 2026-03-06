# Horary Astrology App

A modern web application for horary astrology readings, combining traditional astrological calculations with AI-powered interpretations.

## Live Demo

**[horary-chat.netlify.app](https://horary-chat.netlify.app)**

Uses a shared Groq API key — if you hit rate limits, try again later or run the app locally.

## About

This app allows users to ask specific questions and receive horary astrology readings based on the exact moment and location of their question. It calculates planetary positions, aspects, houses, and provides AI-assisted interpretations following traditional horary principles established by William Lilly in the 17th century.

## Features

This application implements comprehensive horary astrology features based on traditional methodology, with 173 passing tests ensuring accuracy:

### Traditional Horary Calculations
- **Essential Dignities** - Rulership, exaltation, triplicity, term, and face
- **Accidental Dignities** - Angular houses, direct motion, swift motion, oriental/occidental
- **Part of Fortune** - Calculated with dispositor analysis and dignity assessment
- **Void of Course Moon** - Accurate detection based on applying aspects before sign change
- **Reception Analysis** - Mutual reception and dispositorship chains
- **Aspect Motion** - Precise applying/separating detection with retrograde handling
- **Timing Estimates** - Based on aspect perfection and house positions
- **"In Chariot" Condition** - Detection of planets in both essential and accidental dignity

### Chart Calculations
- 7 classical planets (Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn)
- House cusps (whole sign house system)
- Major aspects (conjunction, sextile, square, trine, opposition) with accurate orbs
- Retrograde motion detection
- Extended Moon aspect tracking (12-20° with "faded" status)

### Chart Visualization
- Interactive chart wheel
- Tabbed interface (Chart Wheel / Chart Data / Dignities)
- Detailed planetary positions table
- Aspect table with motion indicators (applying/separating)
- Essential and accidental dignities display
- Retrograde symbols (℞) for retrograde planets
- House cusps display

### AI-Powered Readings
- Groq cloud AI on the deployed site (no setup required)
- Local Ollama support for developers running the app locally
- Traditional horary interpretation following William Lilly's principles
- Follow-up conversation support
- Context-aware responses using complete chart data

### User Interface
- Dark mode with theme toggle
- Responsive design (mobile, tablet, desktop)
- Reading history with localStorage
- Search and manage past readings
- Geolocation support for chart casting

## LLM Configuration

### Option 1: Groq Free Tier (Built-in — no setup needed)

The deployed app at horary-chat.netlify.app uses Groq automatically. No API key or account required from you.

Readings are routed through a serverless Netlify function that holds the Groq key server-side. The default model is `qwen/qwen3-32b`, with `llama-3.3-70b-versatile` and others also available.

**If you're self-hosting**, you'll need your own Groq key:
1. Get a free API key at [console.groq.com/keys](https://console.groq.com/keys) (no credit card required)
2. Copy `.env.example` to `.env` and add your key:
   ```
   GROQ_FREE_TIER_KEY=gsk_your-key-here
   ```
3. Run with `npm run dev` (uses Netlify dev to load env vars and serverless functions)

### Option 2: Ollama (Local) — for developers

Run a model locally on your own machine. Fully private and free, but requires decent hardware (8GB+ RAM) and only works when running the app locally — not on the deployed site.

**Setup:**
```bash
# Install Ollama
curl https://ollama.ai/install.sh | sh

# Pull a model
ollama pull llama3.2:latest

# Start Ollama (usually auto-starts)
ollama serve

# Install and run the app
npm install
npm run dev
```

After the app starts:
1. Open Settings (⚙️) in the header
2. Select "Ollama (Local)"
3. Test connection
4. Start asking questions

## Privacy & Security

**Groq (deployed site):**
- Readings are sent through a Netlify serverless function to Groq's API for processing
- The Groq API key lives only in Netlify's environment — never in client code or browser storage
- We don't log, store, or see your readings or questions
- Groq's [privacy policy](https://groq.com/privacy-policy/) applies to data processed by their API

**Ollama (local):**
- 100% private — everything runs on your machine, nothing leaves your computer

## Deployment

**Local (`npm run dev`):**
- Default: Groq (via Netlify dev + serverless function)
- Ollama also available — switch in Settings (⚙️)

**Deployed (Netlify):**
- Groq is pre-configured — users just open the site and start asking questions
- Ollama is unavailable (can't connect to localhost from a deployed site)

## Tech Stack

- **Frontend**: Vue 3 + TypeScript + Vite
- **Chart Library**: circular-natal-horoscope-js, @astrodraw/astrochart
- **LLM**: OpenAI SDK (compatible interface for Ollama and Groq)
- **Testing**: Vitest (173 passing tests)
- **Hosting**: Netlify (frontend + serverless functions)
- **Storage**: localStorage (no backend database)

## Traditional Horary Methodology

This app follows the traditional horary astrology system established by William Lilly in "Christian Astrology" (1647). Key principles:

- **Moment of the Question**: The chart is cast for the exact time and place the astrologer understands the question
- **Significators**: Planets are assigned to represent the querent (questioner) and quesited (what is asked about) based on house rulerships
- **Essential Dignities**: Measure a planet's strength by sign position (rulership, exaltation, triplicity, term, face)
- **Accidental Dignities**: Measure a planet's strength by house position, motion, and aspects
- **Applying Aspects**: Future-oriented aspects show what will happen
- **Reception**: When planets are in each other's dignities, showing cooperation or exchange
- **Void of Course Moon**: When the Moon makes no applying aspects before changing signs, often indicating "nothing will come of the matter"

The AI assistant uses these traditional rules to interpret your chart and answer your question.

## For Developers

### Prerequisites
- Node.js 20+
- Netlify CLI (`npm install -g netlify-cli`) — needed to run serverless functions locally
- A Groq API key (free at [console.groq.com/keys](https://console.groq.com/keys)), or Ollama for fully local dev

### Local Setup

```bash
# Clone the repository
git clone <repository-url>
cd horary

# Install dependencies
npm install

# Copy env file and add your Groq key
cp .env.example .env
# Edit .env and set GROQ_FREE_TIER_KEY

# Start development server (Netlify dev handles functions + env vars)
npm run dev
```

### Running Tests

```bash
# Single run
npm run test:run

# Watch mode
npm test

# Browser UI
npm run test:ui
```

### Project Structure

```
src/
├── components/
│   ├── Chat.vue              # LLM conversation interface
│   ├── UserChat.vue          # Main user interface with chart
│   ├── HoraryChart.vue       # Chart wheel display
│   ├── ChartDataView.vue     # Detailed chart data tables
│   ├── QuestionForm.vue      # Question input form
│   └── ReadingHistory.vue    # Reading history management
├── utils/
│   ├── astrology.ts          # Chart calculation logic
│   ├── aspectMotion.ts       # Aspect motion analysis
│   ├── horary/               # Horary-specific calculations
│   │   ├── dignities.ts      # Essential & accidental dignities
│   │   ├── partOfFortune.ts  # Part of Fortune calculation
│   │   ├── voidOfCourseMoon.ts # Void of course detection
│   │   └── reception.ts      # Reception analysis
│   ├── llm.ts                # LLM integration
│   └── storage.ts            # localStorage management
├── composables/
│   └── useDarkMode.ts        # Dark mode state management
└── types/                    # TypeScript definitions

netlify/
└── functions/
    └── llm-proxy.ts          # Groq API proxy (serverless)
```

## Roadmap

### v1.0 - Current Release
- ✅ Essential and accidental dignities
- ✅ Part of Fortune with dispositor analysis
- ✅ Void of Course Moon detection
- ✅ Reception analysis
- ✅ Aspect motion (applying/separating)
- ✅ Timing estimates
- ✅ Comprehensive test coverage (173 tests)
- ✅ LLM support (Ollama local + Groq cloud)
- ✅ Environment-aware provider selection
- ✅ Deployment (Netlify)

### v1.1 - Enhanced Features
- Improved chart sizing and UI polish
- Better mobile experience
- Enhanced horary prompts with dignity awareness

### v1.2 - Astrological Enhancements
- Outer planets (Uranus, Neptune, Pluto)
- Lunar phases
- Fixed stars
- Aspect lines visualization
- Arabic parts beyond Part of Fortune

### v2.0 - Platform Features
- User authentication
- Usage limits for the hosted version
- Backend + database (Supabase)
- Cloud storage for readings
- Cross-device sync
- Share readings

## Contributing

Bug reports and feature requests are welcome — please open a [GitHub Issue](../../issues).

## License

MIT — see [LICENSE](./LICENSE)
