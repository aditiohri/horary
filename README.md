# Horary Astrology App

A modern web application for horary astrology readings, combining traditional astrological calculations with AI-powered interpretations.

## Live Demo

Coming soon - deployment in progress.

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
- House cusps (Placidus system)
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
- Integration with local Ollama LLM (free, private, runs on your machine)
- Traditional horary interpretation following William Lilly's principles
- Follow-up conversation support
- Context-aware responses using complete chart data

### User Interface
- Dark mode with theme toggle
- Responsive design (mobile, tablet, desktop)
- Reading history with localStorage
- Search and manage past readings
- Geolocation support for chart casting

## Getting Started with Ollama (Local, Free, Private)

Run a powerful AI locally on your machine - no API keys, no cloud services, completely private:

```bash
# Install Ollama
curl https://ollama.ai/install.sh | sh

# Pull the recommended model
ollama pull llama3.2:latest

# Install and run the app
npm install
npm run dev
```

The app will automatically connect to your local Ollama instance at `http://localhost:11434`.

## Tech Stack

- **Frontend**: Vue 3 + TypeScript + Vite
- **Chart Library**: circular-natal-horoscope-js, @astrodraw/astrochart
- **LLM**: OpenAI SDK (for Ollama compatibility)
- **Testing**: Vitest (173 passing tests)
- **Storage**: localStorage (no backend yet)

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
- Ollama (for local AI)

### Local Setup

```bash
# Clone the repository
git clone <repository-url>
cd horary

# Install dependencies
npm install

# Start development server
npm run dev
```

### Running Tests

```bash
# Run test suite (173 tests)
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
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
- 🚧 Ollama integration improvements (IN PROGRESS)
- ⏳ Deployment (Netlify)

### v1.1 - Enhanced Features
- Multi-provider LLM support (OpenAI, Claude, Groq)
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
- Backend + database (Supabase)
- Cloud storage for readings
- Cross-device sync
- Share readings

## Contributing

This is a personal project currently in active development. Contributions, suggestions, and bug reports are welcome.

## License

MIT