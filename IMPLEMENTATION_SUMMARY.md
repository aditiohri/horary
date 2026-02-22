# Open Router Integration Fix & Free Tier Implementation

## Summary

Successfully implemented both Phase 1 (fixing Open Router) and Phase 2 (adding free tier with usage limits). The app now:

1. **Works with Open Router on deployed sites** - Fixed the legacy code that was preventing Open Router from working
2. **Provides a free tier for new users** - No API key required initially, with fair usage limits
3. **Keeps API keys secure** - Uses Netlify serverless functions to keep the owner's API key server-side

## What Was Changed

### Phase 1: Fixed Open Router Integration

**Files Modified:**
- `/src/utils/llm.ts` - Migrated from legacy Ollama-only client to new multi-provider system
  - Removed `createOpenAIClient()` and local `getCurrentModel()` functions
  - Updated imports to use `/src/utils/llm/client.ts`
  - Updated all three generation functions: `generateHoraryReading()`, `continueHoraryConversation()`, `generateText()`

**Impact:** Open Router now works properly in production. Users can select it in Settings and use their own API keys.

### Phase 2: Free Tier Implementation

**New Files Created:**
- `/src/utils/llm/freeTier.ts` - Usage tracking module (localStorage-based)
  - `checkQuota()` - Validates user is within limits
  - `recordUsage()` - Records token usage after API calls
  - `getUsageStats()` - Returns usage stats for UI display
  - Daily limit: 100,000 tokens
  - Hourly limit: 3 requests

- `/netlify/functions/llm-proxy.ts` - Serverless function that proxies requests
  - Keeps owner's API key secure on server-side
  - CORS protection (only allows requests from approved domains)
  - Error handling and validation

- `.env.example` - Template for environment variables

**Files Modified:**
- `/src/types/llm.ts` - Added free tier types
  - `FreeTierUsage`, `FreeTierLimits`, `FreeTierProviderSettings`
  - Added 'openrouter-free' to provider configs

- `/src/utils/llm/client.ts` - Added free tier client creation
  - `createFreeTierClient()` - Uses Netlify function endpoint
  - Routes to `http://localhost:8888/.netlify/functions/llm-proxy` in dev
  - Routes to `/.netlify/functions/llm-proxy` in production

- `/src/utils/llm.ts` - Added quota checking
  - Checks quotas before API calls when using free tier
  - Records usage after successful API calls
  - Shows user-friendly error messages when limits are reached

- `/src/components/LLMSettings.vue` - Added free tier UI
  - Usage stats display (daily tokens, hourly requests)
  - Warning banner when approaching limits
  - Help section explaining free tier limits
  - Hides API key field for free tier

- `/src/utils/llm/storage.ts` - Updated defaults
  - Added `openrouter-free` case to `getDefaultSettings()`

- `/src/utils/environment.ts` - Updated default provider
  - Deployed sites now default to `openrouter-free` instead of `openrouter`
  - Local dev still defaults to `ollama`

**Build Configuration:**
- `package.json` - Updated scripts and dependencies
  - Added `netlify-cli` and `@netlify/functions` as dev dependencies
  - Updated `dev` script to use `netlify dev`
  - Added `dev:vite` for direct Vite usage

- `netlify.toml` - Added function configuration
  - Added `functions` directory configuration
  - Added `[dev]` section for local development
  - Added `[functions]` section for esbuild bundling

- `.gitignore` - Added `.env` and `.env.local`

## Next Steps for Deployment

### 1. Set Up Environment Variable in Netlify

**In Netlify Dashboard:**
1. Go to: Site settings → Environment variables
2. Add a new variable:
   - **Key:** `GROQ_FREE_TIER_KEY`
   - **Value:** Your Groq API key (get one from https://console.groq.com/keys)
3. Click "Save"

**Note:** Groq's free tier is extremely generous (14,400 requests/day) and requires no credit card. Perfect for a free tier!

### 2. Update Allowed Origins in Serverless Function

**File:** `/netlify/functions/llm-proxy.ts`

Update line ~19 with your actual production domain:

```typescript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:8888',
  'https://your-actual-domain.netlify.app',  // ← Update this
];
```

### 3. Test Locally

**Create `.env` file:**
```bash
cp .env.example .env
# Edit .env and add your actual API key
```

**Start development server:**
```bash
npm run dev
```

This will:
- Start Vite dev server on http://localhost:5173
- Start Netlify functions server on http://localhost:8888
- Proxy requests to `/.netlify/functions/llm-proxy`

**Test the free tier:**
1. Clear your localStorage to simulate a new user
2. Open the app (should default to free tier)
3. Generate a chart reading
4. Check Settings → LLM Settings to see usage stats
5. Make 3+ requests quickly to test hourly limit

### 4. Deploy to Netlify

```bash
git add .
git commit -m "Implement free tier and fix Open Router integration"
git push
```

Netlify will automatically:
- Build the app
- Deploy the serverless function
- Use the environment variable you set

### 5. Verify Production Deployment

After deployment:
1. Visit your production URL
2. Open browser DevTools → Network tab
3. Generate a chart reading
4. Verify the request goes to `/.netlify/functions/llm-proxy`
5. Check that it completes successfully
6. Verify usage stats are tracked in Settings

## How It Works

### For New Users (No API Key)

1. User visits app on deployed site
2. App detects no saved settings
3. Defaults to `openrouter-free` provider
4. User generates a reading:
   - App checks quota (localStorage)
   - If within limits, makes request to `/.netlify/functions/llm-proxy`
   - Serverless function uses **your** API key (from environment variable)
   - Response returned to user
   - Usage recorded in localStorage
5. User sees usage stats in Settings
6. After hitting limits, user is prompted to add their own API key

### For Users With API Keys

1. User adds their own OpenRouter API key in Settings
2. Switches to `openrouter` provider (not `openrouter-free`)
3. Requests go directly to OpenRouter API with their key
4. No quota limits
5. No usage tracking

### Security

- ✅ Owner's API key is **never** exposed to client-side code
- ✅ CORS protection prevents unauthorized domains from using the function
- ✅ Quota limits prevent abuse
- ⚠️ Client-side quota tracking can be bypassed by clearing localStorage (acceptable for demo/trial mode)

**For production with authentication:** Consider moving quota tracking to server-side per authenticated user.

## Free Models Available (via Groq)

The free tier provides access to Groq's lightning-fast models:
- `llama-3.3-70b-versatile` (default) - High-quality 70B parameter model
- `llama-3.1-8b-instant` - Faster, smaller model
- `mixtral-8x7b-32768` - Long context window

These are served through Groq's infrastructure with extremely fast response times (typically <1 second).

## Troubleshooting

### "Server configuration error - API key not set"

- The `GROQ_FREE_TIER_KEY` environment variable is not set in Netlify
- Go to Netlify dashboard → Environment variables and add it
- Get a free API key from https://console.groq.com/keys

### "Forbidden - unauthorized origin"

- The request is coming from a domain not in the allowed origins list
- Update `/netlify/functions/llm-proxy.ts` line ~19 with your production domain

### "Free tier limit reached"

- User has hit daily token limit (100k) or hourly request limit (3)
- They should add their own API key to continue
- For testing: clear localStorage to reset quotas

### Netlify function not found (404)

- Make sure `netlify.toml` has `functions = "netlify/functions"` in `[build]` section
- Verify the function file exists at `/netlify/functions/llm-proxy.ts`
- Check Netlify build logs for function compilation errors

## Migration Notes

### Existing Users

Users with existing Ollama settings will continue to use Ollama (if on local dev). Users with existing OpenRouter settings will keep their settings. Only **new users without saved settings** will default to free tier.

### Rollback

If you need to rollback the free tier:
1. Change `/src/utils/environment.ts` line 27 back to `'openrouter'`
2. Remove or disable the Netlify function
3. Redeploy

## Questions?

- Free tier limits too low? Adjust in `/src/utils/llm/freeTier.ts` (line 11-13)
- Want to add more free models? Update `/src/types/llm.ts` (line 95)
- Need different quota reset periods? Modify logic in `/src/utils/llm/freeTier.ts`
