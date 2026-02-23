# Horary Astrology App - Roadmap

**Last Updated:** February 22, 2025

This document tracks the development roadmap for the horary astrology app.

---

## ✅ Completed (v0.1 - v0.3)

### Core Functionality
- ✅ Chart calculation with accurate planetary positions
- ✅ Essential dignities (ruler, exaltation, detriment, fall, triplicities)
- ✅ Accidental dignities (house placement, speed, combustion, retrograde)
- ✅ Aspect detection with applying/separating motion
- ✅ Moon aspects analysis (last separating, next applying)
- ✅ Void of Course Moon detection with exceptions
- ✅ Part of Fortune calculation
- ✅ Reception analysis (mutual reception, dispositorship)
- ✅ House rulers and significator identification
- ✅ Timing estimates based on orb, sign type, house type

### LLM Integration
- ✅ Groq free tier integration (Llama 3.3 70B)
- ✅ Ollama local model support
- ✅ Comprehensive system prompt with traditional horary methodology
- ✅ Two-part response structure (plain English + technical analysis)
- ✅ Venus in Pisces dignity fix (prompt clarity improvements)
- ✅ Free tier quota management (100k tokens/day, 3 requests/hour)

### UI/UX
- ✅ Basic question input and chart generation
- ✅ Reading display with markdown formatting
- ✅ Settings page for LLM provider configuration
- ✅ Usage statistics tracking
- ✅ PWA support (installable app)

### Bug Fixes
- ✅ Model validation for stale localStorage
- ✅ Provider reference bugs fixed
- ✅ Automatic free tier fallback when quota exceeded

---

## 🚧 In Progress / Near-Term Priorities

### 1. UI/UX Improvements

**Priority:** High
**Goal:** Make the app more polished, intuitive, and visually appealing

#### Specific Tasks:
- [ ] **Reading Display Enhancements**
  - [ ] Better typography and spacing for readability
  - [ ] Collapsible sections (Overall Judgment always visible, Detailed Analysis collapsible)
  - [ ] Syntax highlighting for astrological terms
  - [ ] Visual indicators for strength/weakness (colored badges/icons)

- [ ] **Chart Visualization**
  - [ ] Display the actual chart wheel/diagram
  - [ ] Highlight significators in the chart
  - [ ] Show aspects visually with colored lines

- [ ] **Question History**
  - [ ] Save previous questions locally
  - [ ] Revisit old readings
  - [ ] Export readings to PDF/text

- [ ] **Mobile Optimization**
  - [ ] Improve touch targets
  - [ ] Better responsive layout
  - [ ] Swipe gestures for navigation

- [ ] **Loading States**
  - [ ] Better loading indicators during chart calculation
  - [ ] Progress indicator for LLM generation (streaming?)

- [ ] **Error Handling**
  - [ ] User-friendly error messages
  - [ ] Retry mechanisms for failed requests
  - [ ] Offline mode messaging

### 2. Copy/Paste Prompt Feature

**Priority:** High
**Goal:** Allow users to take the generated prompt and use it in other LLM interfaces (ChatGPT, Claude, etc.)

#### Specific Tasks:
- [ ] **Export Button/Section**
  - [ ] Add "Copy Prompt" button after chart is generated
  - [ ] Include both system prompt + formatted chart data
  - [ ] Option to copy with or without the LLM response

- [ ] **Prompt Preview Modal**
  - [ ] Show what will be copied before copying
  - [ ] Allow editing before copying
  - [ ] Include instructions for pasting into other LLMs

- [ ] **Format Options**
  - [ ] Plain markdown (for ChatGPT, Claude)
  - [ ] JSON format (for API usage)
  - [ ] Shortened version (remove verbose sections)

- [ ] **Share Links**
  - [ ] Generate shareable links with chart data encoded
  - [ ] Allow others to generate readings from same chart

#### Technical Implementation:
```typescript
// Component structure
<ReadingDisplay>
  <ReadingText />
  <ExportPromptButton onClick={showExportModal} />
</ReadingDisplay>

<ExportPromptModal>
  <PromptPreview content={systemPrompt + chartData} />
  <FormatSelector options={['markdown', 'json', 'minimal']} />
  <CopyButton />
  <InstructionsText />
</ExportPromptModal>
```

### 3. Expanded LLM Support

**Priority:** Medium
**Goal:** Support more LLM providers for flexibility and reliability

#### Providers to Add:
- [ ] **OpenAI (ChatGPT)**
  - [ ] GPT-4o, GPT-4 Turbo support
  - [ ] User-provided API key
  - [ ] Cost tracking

- [ ] **Anthropic (Claude)**
  - [ ] Claude 3.5 Sonnet, Opus support
  - [ ] User-provided API key
  - [ ] Extended thinking mode option

- [ ] **Google Gemini**
  - [ ] Gemini 1.5 Pro/Flash support
  - [ ] Free tier integration
  - [ ] User-provided API key option

- [ ] **OpenRouter (Paid Tier)**
  - [ ] User-provided API key
  - [ ] Access to 200+ models
  - [ ] Model comparison feature

#### Technical Implementation:
- [ ] Refactor LLM client to use provider pattern
- [ ] Abstract API key storage/management
- [ ] Add provider-specific configuration
- [ ] Implement streaming responses (if supported)
- [ ] Add model selection dropdown per provider
- [ ] Cost estimation/tracking for paid tiers

#### Settings UI Improvements:
```
Settings Page:
┌─────────────────────────────────────┐
│ LLM Provider                        │
│ ○ Free Tier (Groq Llama 3.3)       │
│ ○ Ollama (Local)                    │
│ ○ OpenAI (Your API Key)             │
│ ○ Anthropic Claude (Your API Key)  │
│ ○ Google Gemini (Your API Key)     │
│ ○ OpenRouter (Your API Key)        │
│                                      │
│ [API Key Input if needed]           │
│ [Model Selection Dropdown]          │
│ [Test Connection Button]            │
└─────────────────────────────────────┘
```

---

## 🔮 Future Enhancements (v0.4+)

### Advanced Horary Features
- [ ] Question type auto-detection (relationship, career, lost object, etc.)
- [ ] Significator suggestions based on question type
- [ ] Translation of Light detection
- [ ] Collection of Light detection
- [ ] Prohibition and Frustration detection
- [ ] Fixed stars integration (major stars only)
- [ ] Complete radicality verification checklist
- [ ] Terms and Faces dignities
- [ ] Arabic parts beyond Part of Fortune

### Chart Features
- [ ] Multiple house systems (Placidus, Regiomontanus, Whole Sign)
- [ ] Declination aspects
- [ ] Antiscia and contra-antiscia
- [ ] Chart comparison (electional vs horary)
- [ ] Electional astrology support

### Educational Features
- [ ] Horary tutorial/guide
- [ ] Glossary of astrological terms (clickable tooltips)
- [ ] Example readings library
- [ ] Traditional technique explanations
- [ ] William Lilly methodology guide

### Data & Analytics
- [ ] Reading accuracy tracking (user feedback)
- [ ] Most common question types
- [ ] Anonymized chart database for research
- [ ] LLM performance comparison

### Community & Sharing
- [ ] Public readings gallery (opt-in)
- [ ] Comments/discussion on readings
- [ ] Astrologer profiles (verified users)
- [ ] Collaborative readings (multiple astrologers)

### Technical Improvements
- [ ] Backend database for reading storage
- [ ] User authentication
- [ ] API for programmatic access
- [ ] Webhook support for integrations
- [ ] Swiss Ephemeris integration for precision
- [ ] Build open-source horary API (astrology-api.io alternative)

---

## 📋 Backlog / Ideas

### Low Priority / Nice-to-Have
- [ ] Voice input for questions
- [ ] Chart image generation (social media sharing)
- [ ] Email notifications when reading is ready
- [ ] Scheduled questions (for future dates)
- [ ] Bulk chart generation (research purposes)
- [ ] Chart rectification tools
- [ ] Progressions and directions
- [ ] Synastry and composite charts
- [ ] Dark mode
- [ ] Internationalization (multiple languages)
- [ ] Accessibility improvements (screen reader support)
- [ ] Keyboard shortcuts
- [ ] Browser extension

---

## 🎯 Current Sprint (Next 2 Weeks)

**Focus:** UI Polish + Copy/Paste Prompt Feature

### Week 1: UI Improvements
1. Reading display enhancements (typography, spacing)
2. Collapsible sections for Detailed Analysis
3. Chart wheel visualization (basic version)
4. Mobile layout improvements

### Week 2: Prompt Export Feature
1. Export button UI
2. Prompt preview modal
3. Copy to clipboard functionality
4. Format options (markdown, JSON)
5. Share link generation (stretch goal)

---

## 📝 Notes

### Design Principles
- **Accessibility First:** Traditional horary should be accessible to everyone
- **Free & Open:** Keep core features free, explore premium options later
- **Privacy:** No user tracking, local-first data storage
- **Traditional Methodology:** Stay true to William Lilly's techniques
- **Modern UX:** Make traditional astrology approachable for new users

### Tech Stack
- **Frontend:** React, TypeScript, Vite
- **Styling:** Tailwind CSS
- **Astrology:** circular-natal-horoscope-js (ephemeris)
- **LLM:** Groq (free tier), Ollama (local), expandable to others
- **Deployment:** Netlify (static site + serverless functions)
- **State:** LocalStorage (readings, settings)

### Open Questions
- Should we add user accounts? (Pro: cloud sync, Con: complexity)
- Monetization strategy? (Donations, premium features, API access?)
- How to verify astrologer credibility if we add profiles?
- Should we build a mobile app (React Native) or keep PWA?

---

## 🤝 Contributing

This is currently a solo project, but contributions may be welcome in the future. If you're interested in contributing, priorities are:

1. Testing with real horary questions
2. UI/UX feedback and design improvements
3. Traditional astrology accuracy verification
4. Bug reports and fixes
5. Documentation improvements

---

**Questions or suggestions?** Open an issue or discussion on the repository.
