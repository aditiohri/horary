# Groq Free Tier Migration Guide

## What Changed

The free tier now uses **Groq** instead of OpenRouter. This provides:

✅ **Much faster responses** (<1 second vs 30+ seconds)
✅ **More reliable** (no spending limits or upstream rate limiting)
✅ **Higher limits** (1,800 requests/hour vs 3 requests/hour)
✅ **Better models** (Llama 3.3 70B)

## Setup Instructions

### 1. Get a Groq API Key (Free, No Credit Card Required)

1. Go to https://console.groq.com/keys
2. Sign up for a free account (no credit card needed)
3. Click "Create API Key"
4. Copy the key (starts with `gsk_...`)

### 2. Update Your Local Environment

**Update your `.env` file:**

```bash
# Remove old variable
# OPENROUTER_FREE_TIER_KEY=sk-or-v1-...

# Add new variable
GROQ_FREE_TIER_KEY=gsk_your-actual-key-here
```

### 3. Restart Your Dev Server

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

### 4. Test It Out

1. Open http://localhost:8888
2. Go to Settings → LLM Settings
3. Select "Free Tier (Groq)" as provider
4. Click "Test Connection" - should be instant!
5. Generate a reading - response in <1 second!

## For Production Deployment

**In Netlify Dashboard:**

1. Go to: Site settings → Environment variables
2. Remove: `OPENROUTER_FREE_TIER_KEY` (if exists)
3. Add new variable:
   - **Key:** `GROQ_FREE_TIER_KEY`
   - **Value:** Your Groq API key
4. Redeploy your site

## New Free Tier Limits

With Groq, users get:

- **1,800 requests per hour** (30/minute)
- **10M tokens per day**
- **Extremely fast responses** (<1 second typical)
- **High-quality model** (Llama 3.3 70B)

This is **600x more requests** than the old OpenRouter setup!

## Models Available

- `llama-3.3-70b-versatile` (default) - Best quality
- `llama-3.1-8b-instant` - Fastest
- `mixtral-8x7b-32768` - Long context

## Troubleshooting

### "Server configuration error - API key not set"

- Make sure `GROQ_FREE_TIER_KEY` is set in your `.env` file locally
- Or in Netlify environment variables for production

### Connection test fails

- Verify your API key is correct
- Make sure you're running `npm run dev` (not `npm run dev:vite`)
- Check that the key starts with `gsk_`

### Still seeing OpenRouter errors

- Clear browser localStorage: `localStorage.clear()` in console
- Refresh the page
- Select "Free Tier (Groq)" again in settings

## Why This is Better

**Before (OpenRouter):**
- ❌ 402 errors (spending limit exceeded)
- ❌ 429 errors (rate limited by upstream providers)
- ❌ 30+ second timeouts
- ❌ Only 3 requests/hour
- ❌ Unreliable free models

**After (Groq):**
- ✅ No spending limits
- ✅ Reliable infrastructure
- ✅ <1 second responses
- ✅ 1,800 requests/hour
- ✅ High-quality Llama 3.3 70B model

This makes the free tier actually usable! 🎉
