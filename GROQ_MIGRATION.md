# Groq Free Tier - Setup Guide

## Current State

The app now uses **Groq** for the free tier on deployed sites. This provides:

✅ **Fast responses** (<1 second typical)
✅ **Reliable** (no spending limits or upstream issues)
✅ **Fair usage limits** (10 requests/hour, 10M tokens/day)
✅ **Quality models** (Llama 3.3 70B)

**Providers available:**
- **Ollama** - Local development only, unlimited and private
- **Free Tier (Groq)** - Deployed sites, shared API key with usage limits

**Removed:** OpenRouter and Anthropic (preserved in `feature/anthropic-integration` branch)

## Setup Instructions

### 1. Get a Groq API Key (Free, No Credit Card Required)

1. Visit https://console.groq.com/keys
2. Sign up for a free account (no credit card needed)
3. Click "Create API Key"
4. Copy the key (starts with `gsk_...`)

### 2. Configure Local Environment

**Create/update `.env` file:**

```bash
# Add your Groq API key
GROQ_FREE_TIER_KEY=gsk_your-actual-key-here
```

### 3. Start Development Server

```bash
# Make sure to use 'npm run dev' (not 'npm run dev:vite')
# This starts both Vite AND Netlify functions
npm run dev
```

This starts:
- Vite dev server on http://localhost:5173
- Netlify functions server on http://localhost:8888
- Proxies `/.netlify/functions/*` requests properly

### 4. Test Free Tier

1. Open http://localhost:5173
2. Go to Settings → LLM Settings
3. Select "Free Tier (Groq)" as provider
4. Click "Test Connection" - should be instant!
5. Generate a reading - response in <1 second!
6. Check usage stats in Settings

## Production Deployment

### 1. Set Environment Variable in Netlify

**In Netlify Dashboard:**
1. Go to: Site settings → Environment variables
2. Add new variable:
   - **Key:** `GROQ_FREE_TIER_KEY`
   - **Value:** Your Groq API key (from step 1 above)
3. Click "Save"

### 2. Update Allowed Origins (Important!)

**Edit `/netlify/functions/llm-proxy.ts`:**

```typescript
const allowedOrigins = [
  'http://localhost:5173',
  'https://your-actual-domain.netlify.app',  // ← Update this!
];
```

Replace `your-actual-domain.netlify.app` with your actual Netlify URL.

### 3. Deploy

```bash
git push
# Netlify will auto-deploy
```

### 4. Verify Production

After deployment:
1. Visit your production URL
2. Open browser DevTools → Network tab
3. Generate a chart reading
4. Verify request goes to `/.netlify/functions/llm-proxy`
5. Check response is successful
6. Verify usage stats appear in Settings

## Free Tier Limits

Users get:
- **10 requests per hour** (fair usage for shared API key)
- **10M tokens per day** (very generous)
- **Fast responses** (<1 second typical)
- **High-quality model** (Llama 3.3 70B)

When limits are reached, users are prompted to add their own API key.

## Available Models

- `llama-3.3-70b-versatile` (default) - Best quality, 70B parameters
- `llama-3.1-8b-instant` - Fastest responses
- `mixtral-8x7b-32768` - Long context window (32k tokens)

All models run on Groq's optimized infrastructure for extremely fast inference.

## How It Works

### Security Architecture

1. **API Key Protection:**
   - Your Groq API key is stored in Netlify environment variable
   - NEVER exposed to client-side code
   - Serverless function proxies all requests

2. **CORS Protection:**
   - Function only accepts requests from allowed domains
   - Prevents unauthorized usage
   - Configure in `/netlify/functions/llm-proxy.ts`

3. **Usage Tracking:**
   - Client-side tracking via localStorage
   - Resets: hourly for requests, daily for tokens
   - Can be bypassed by clearing localStorage (acceptable for demo tier)

### Request Flow

```
User Request
  ↓
Frontend checks quota (localStorage)
  ↓
If under limits: POST to /.netlify/functions/llm-proxy
  ↓
Netlify Function validates CORS
  ↓
Function forwards to Groq API with owner's key
  ↓
Response returned to user
  ↓
Usage recorded in localStorage
```

## Troubleshooting

### "Server configuration error - API key not set"

**Local development:**
- Ensure `GROQ_FREE_TIER_KEY` is in your `.env` file
- Restart dev server with `npm run dev`

**Production:**
- Add `GROQ_FREE_TIER_KEY` in Netlify dashboard
- Redeploy site

### Connection test fails

- Verify API key is correct (starts with `gsk_`)
- Make sure you're using `npm run dev` (not `npm run dev:vite`)
- Check `.env` file exists and has the key
- Ensure no typos in environment variable name

### "Free tier limit reached"

- User has hit 10 requests/hour or 10M tokens/day
- For testing: clear localStorage with `localStorage.clear()` in browser console
- In production: prompt user to add their own API key

### Netlify function not found (404)

- Verify `netlify.toml` has correct function configuration
- Check function file exists at `/netlify/functions/llm-proxy.ts`
- Review Netlify build logs for compilation errors
- Ensure you deployed after creating the function

### "Forbidden" error in production

- Update allowed origins in `/netlify/functions/llm-proxy.ts`
- Add your actual production domain to the array
- Redeploy

### Still seeing old provider errors

- Clear browser localStorage: `localStorage.clear()`
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Select "Free Tier (Groq)" in Settings again

## Why Groq?

**Advantages:**
- ✅ No spending limits (unlike OpenRouter's $5 cap)
- ✅ No rate limit errors from upstream providers
- ✅ Extremely fast inference (<1s typical)
- ✅ Generous free tier (14,400 requests/day on their end)
- ✅ High-quality models (Llama 3.3 70B)
- ✅ No credit card required

**Our Limits:**
- We set 10 requests/hour on our end for fair usage
- This ensures the shared API key isn't abused
- Users can easily add their own key for unlimited access

## Adjusting Limits

**To change free tier quotas:**

Edit `/src/utils/llm/freeTier.ts`:

```typescript
export function getFreeTierLimits(): FreeTierLimits {
  return {
    maxTokensPerDay: 10000000,     // 10M tokens/day
    maxRequestsPerHour: 10,         // 10 requests/hour ← Change this
    freeModels: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
    ],
  };
}
```

Then commit and redeploy.

## Next Steps

Your app is now configured with:
- ✅ Fast, reliable free tier via Groq
- ✅ Secure API key management
- ✅ Fair usage limits
- ✅ Optimized LLM prompt (~2000-2500 tokens)
- ✅ Clean codebase (only Ollama + Groq)

Ready to generate horary readings! 🎉
