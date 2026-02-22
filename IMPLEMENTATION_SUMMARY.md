# LLM Provider System - Current State

## Overview

The horary astrology app uses a streamlined multi-provider LLM system with two options:
1. **Ollama (Local)** - For local development only, completely free and private
2. **Free Tier (Groq)** - For deployed sites, using owner's API key via Netlify function

**Recent Changes:**
- ✅ Removed OpenRouter and Anthropic providers (preserved in `feature/anthropic-integration` branch)
- ✅ Optimized HORARY_SYSTEM_PROMPT (reduced from ~4000 to ~2000-2500 tokens)
- ✅ Set free tier limit to 10 requests/hour for fair usage

## Architecture

### Provider Types

**1. Ollama (Local Development Only)**
- Runs on `http://localhost:11434`
- Only available when `import.meta.env.DEV === true`
- Users pull and run models locally
- No API key required
- Completely private and offline-capable

**2. Free Tier (Groq via Netlify Function)**
- Uses Groq's API for deployed sites
- Owner's API key stored in Netlify environment variable
- Proxied through `/netlify/functions/llm-proxy.ts`
- Client-side usage tracking (localStorage-based)
- **Limits:** 10 requests/hour, 10M tokens/day

### Security Model

**API Key Protection:**
- Owner's Groq API key stored in `GROQ_FREE_TIER_KEY` environment variable
- Never exposed to client-side code
- Serverless function proxies requests
- CORS protection limits access to approved domains

**Usage Tracking:**
- Client-side tracking via localStorage (`free_tier_usage` key)
- Quotas checked before each request
- Usage recorded after successful completion
- Resets: daily (midnight) for tokens, hourly for requests

**Known Limitation:** Client-side tracking can be bypassed by clearing localStorage. This is acceptable for a demo/trial tier. For production with authentication, move tracking server-side.

## File Structure

### Core LLM Files

**`/src/types/llm.ts`**
- Type definitions for providers and settings
- Only `'ollama'` and `'openrouter-free'` providers
- Provider configurations and defaults

**`/src/utils/llm/client.ts`**
- Client factory: `createLLMClient()`
- Creates OpenAI-compatible clients based on provider
- `createOllamaClient()` - Local Ollama connection
- `createFreeTierClient()` - Netlify function proxy

**`/src/utils/llm/storage.ts`**
- Settings persistence to localStorage
- Defaults: Ollama for local dev, Groq free tier for deployed sites
- Migration from legacy Ollama-only settings

**`/src/utils/llm/freeTier.ts`**
- Usage tracking and quota management
- `checkQuota()` - Validates before requests
- `recordUsage()` - Tracks tokens after requests
- `getUsageStats()` - Returns stats for UI display
- Limits: 10 requests/hour, 10M tokens/day

**`/src/utils/llm.ts`**
- Main LLM generation functions
- `generateHoraryReading()` - Initial chart reading
- `continueHoraryConversation()` - Follow-up questions
- Integrates quota checking for free tier
- Contains optimized `HORARY_SYSTEM_PROMPT` (~2000-2500 tokens)

### UI Components

**`/src/components/LLMSettings.vue`**
- Settings modal for LLM configuration
- Provider selection (Ollama or Free Tier)
- Usage stats display for free tier
- Connection testing
- Model selection

**`/src/components/Chat.vue`**
- Chat interface with markdown rendering
- Uses `marked` library for formatting
- DOMPurify for sanitization

### Serverless Function

**`/netlify/functions/llm-proxy.ts`**
- Proxies requests to Groq API
- Uses `GROQ_FREE_TIER_KEY` from environment
- CORS validation
- Error handling
- Endpoint: `/.netlify/functions/llm-proxy`

### Environment & Configuration

**`.env.example`**
```bash
GROQ_FREE_TIER_KEY=gsk_your_key_here
```

**`netlify.toml`**
- Function directory configuration
- Build settings
- Dev server configuration

**`package.json`**
- `npm run dev` - Runs Netlify dev server (includes functions)
- `npm run dev:vite` - Runs Vite only (no functions)

## Deployment Checklist

### 1. Set Environment Variable in Netlify

1. Get free Groq API key from https://console.groq.com/keys
2. Go to Netlify: Site settings → Environment variables
3. Add: `GROQ_FREE_TIER_KEY` = your API key
4. Save and redeploy

### 2. Verify Allowed Origins

In `/netlify/functions/llm-proxy.ts`, ensure your production domain is listed:

```typescript
const allowedOrigins = [
  'http://localhost:5173',
  'https://your-actual-domain.netlify.app',  // Update this!
];
```

### 3. Test Locally

```bash
# Create .env file
cp .env.example .env
# Add your Groq API key to .env

# Start dev server (includes Netlify functions)
npm run dev

# Test at http://localhost:5173
```

### 4. Deploy

```bash
git push
# Netlify auto-deploys
```

## How It Works

### New User Flow (Deployed Site)

1. User visits site
2. App detects no saved settings → defaults to `openrouter-free`
3. User generates reading:
   - App checks quota in localStorage
   - If under limits, sends request to `/.netlify/functions/llm-proxy`
   - Function forwards to Groq API with owner's key
   - Response returned, usage recorded
4. User sees usage stats in Settings
5. After hitting limits, prompted to add own API key

### Local Development Flow

1. User runs `npm run dev`
2. App detects `import.meta.env.DEV === true`
3. Defaults to Ollama provider
4. User must have Ollama running locally
5. No usage tracking, unlimited requests

## Free Tier Models (Groq)

- `llama-3.3-70b-versatile` (default) - High-quality, 70B parameters
- `llama-3.1-8b-instant` - Faster, smaller model
- `mixtral-8x7b-32768` - Large context window

**Response time:** Typically <1 second (Groq infrastructure is very fast)

## Prompt Optimization

The `HORARY_SYSTEM_PROMPT` in `/src/utils/llm.ts` has been optimized:

**Before:** ~366 lines, ~4000 tokens
**After:** ~170 lines, ~2000-2500 tokens

**Changes:**
- Condensed verbose examples (3 dispositor examples → 1)
- Shortened reception section
- Combined timing techniques
- Made section headers more concise
- Preserved all critical horary astrology concepts

## Troubleshooting

### "Server configuration error - API key not set"
- Add `GROQ_FREE_TIER_KEY` in Netlify dashboard
- For local: add to `.env` file

### "Free tier limit reached"
- User hit 10 requests/hour or 10M tokens/day
- Prompt them to add own API key
- For testing: clear localStorage

### Netlify function 404
- Verify `netlify.toml` has `functions = "netlify/functions"`
- Check function exists at `/netlify/functions/llm-proxy.ts`
- Review Netlify build logs for errors

### "Forbidden" error
- Update allowed origins in `/netlify/functions/llm-proxy.ts`
- Add your production domain to the list

## Future Enhancements

**Anthropic Integration:**
- Preserved in `feature/anthropic-integration` git branch
- Can be merged back if needed in future
- Provides access to Claude models

**Server-Side Tracking:**
- Move usage tracking from localStorage to database
- Track per authenticated user
- More robust quota enforcement

**Additional Providers:**
- Easy to add new providers via the multi-provider system
- Add to `LLMProvider` type
- Implement client factory function
- Update UI and storage

## Questions?

- **Adjust free tier limits:** Edit `/src/utils/llm/freeTier.ts` (lines 11-17)
- **Add more models:** Update `/src/types/llm.ts` provider configs
- **Change quota logic:** Modify `/src/utils/llm/freeTier.ts` functions
