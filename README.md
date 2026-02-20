# Horary Astrology App

A modern web application for horary astrology readings, combining traditional astrological calculations with AI-powered interpretations.

## About

This app allows users to ask specific questions and receive horary astrology readings based on the exact moment and location of their question. It calculates planetary positions, aspects, houses, and provides AI-assisted interpretations following traditional horary principles.

## Current Features

### ✅ Completed (v0.1)
- **Chart Calculations**
  - 7 classical planets (Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn)
  - House cusps (Placidus system)
  - Major aspects with accurate orbs
  - Retrograde motion detection

- **Aspect Motion Analysis**
  - Applying vs separating aspects
  - Special handling for fast-moving Moon
  - Extended Moon aspect tracking (12-20° with "faded" status)
  - Accurate retrograde aspect calculation

- **Chart Visualization**
  - Interactive chart wheel
  - Tabbed interface (Chart Wheel / Chart Data)
  - Detailed planetary positions table
  - Aspect table with motion indicators
  - Retrograde symbols (℞) for retrograde planets
  - House cusps display

- **AI-Powered Readings**
  - Integration with local Ollama LLM
  - Traditional horary interpretation
  - Follow-up conversation support

- **User Interface**
  - Dark mode with theme toggle
  - Responsive design (mobile, tablet, desktop)
  - Reading history with localStorage
  - Search and manage past readings
  - Geolocation support for chart casting

## Tech Stack

- **Frontend**: Vue 3 + TypeScript + Vite
- **Chart Library**: circular-natal-horoscope-js, @astrodraw/astrochart
- **LLM**: OpenAI SDK (for Ollama compatibility)
- **Storage**: localStorage (no backend yet)

## Development Plan

Full development roadmap and implementation plan: [`.claude/plans/buzzing-greeting-donut.md`](.claude/plans/buzzing-greeting-donut.md)

**Current Sprint**: Phase 2 - Improve Local LLM (Ollama) Setup
- Connection testing
- Better error handling
- Settings UI
- Enhanced prompts

**Next Sprint**: Phase 3 - Multi-Provider LLM Support (OpenAI, Claude, Groq)

## Getting Started

### Prerequisites
- Node.js 20+
- Ollama (for local AI)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Setting Up Ollama (Local AI)

1. Install Ollama: https://ollama.ai
2. Pull a model:
```bash
ollama pull llama3.2:latest
```
3. Ensure Ollama is running (it should start automatically)
4. Open the app and ask your horary question!

## Project Structure

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
│   ├── llm.ts                # LLM integration
│   └── storage.ts            # localStorage management
├── composables/
│   └── useDarkMode.ts        # Dark mode state management
└── types/                    # TypeScript definitions
```

## Roadmap

### v1.0 - MVP
- ✅ Phase 1: Retrograde bug fixes (COMPLETED)
- 🚧 Phase 2: Improve Ollama setup (IN PROGRESS)
- ⏳ Phase 4: Deployment (Netlify)
- ⏳ Phase 5: Documentation

### v1.1 - Enhanced Features
- Multi-provider LLM support (OpenAI, Claude, Groq)
- Improved chart sizing and UI polish
- Better mobile experience
- Enhanced horary prompts

### v1.2 - Astrological Enhancements
- Outer planets (Uranus, Neptune, Pluto)
- Lunar phase and Void of Course Moon
- Fixed stars
- Aspect lines visualization
- Traditional dignity tables
- Reception analysis

### v2.0 - Platform Features
- User authentication
- Backend + database (Supabase)
- Cloud storage for readings
- Cross-device sync
- Share readings

## Contributing

This is a personal project currently in active development. Phase 2 work is tracked in the [development plan](.claude/plans/buzzing-greeting-donut.md).

## License

MIT