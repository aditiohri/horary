# Context: Groq Token Rate Limit — Follow-up Work

## What was diagnosed and fixed

The app (horary-chat.netlify.app) was consistently showing
"The AI service encountered an unexpected problem [no error code provided]"
on every first response from Groq. Root cause confirmed via Netlify function logs:

**Groq returns HTTP 413 with `error.type = "tokens"` and
`error.code = "rate_limit_exceeded"` for token-per-minute (TPM) rate limits**
(non-standard — most APIs use 429 for rate limits).

The proxy (`netlify/functions/llm-proxy.ts`) was mapping ALL 413s to
"Your question is too long" (wrong). The client (`src/utils/llm/client.ts`)
had no pattern for that message, so it fell through to a generic error handler.

**PR already merged**: Fixed the proxy to detect `error.type === "tokens"` and
return a proper "token rate limit" message. Fixed the client to handle genuine
"content too large" 413s too.

## Why the error happens

The initial horary reading (`generateHoraryReading` in `src/utils/llm.ts:453`)
sends very token-heavy requests:

| Component | Approx tokens |
|-----------|--------------|
| `horaryBasePrompt` system prompt (`src/prompts/horary-base.md`, 13,035 bytes) | ~3,250 |
| `formatChartForLLMWithMotion` chart data | ~500–750 |
| 4-part instruction in user message (llm.ts:474–501) | ~275 |
| `max_tokens` response budget | 2,600 |
| **Total per initial reading** | **~6,600–7,000** |

A follow-up ("again") uses `continueHoraryConversation` with `horaryFollowupPrompt`
(3,551 bytes) + simpler chart + `max_tokens: 1500` → only ~2,700–2,900 tokens.
That's why retrying always works — it's half the token cost.

On Groq free tier, the TPM window for llama-3.3-70b-versatile is limited.
One or two initial readings in a session can exhaust the window, causing the
next initial reading to 413 immediately.

## What still needs doing

### 1. Reduce input tokens on initial reading (highest impact)

- `src/prompts/horary-base.md` is 13,035 bytes (~3,250 tokens) — the dominant cost.
  Review for verbose or redundant instructions. A 30% trim saves ~1,000 tokens per request.
- The 4-part instruction text in `src/utils/llm.ts:474–501` (~275 tokens) may overlap
  with what's already in the system prompt.

### 2. Add automatic retry with backoff on 413 token rate limit

When the proxy receives a 413 with `error.type === "tokens"`, instead of surfacing the
error to the client, wait and retry the Groq request once. The TPM window resets quickly,
so the retry succeeds silently — the user never sees the error.

Implementation point: `netlify/functions/llm-proxy.ts` after line 183 (where Groq errors
are handled). Note: Netlify free-tier function timeout is 10 seconds — a retry delay of
any meaningful length requires either upgrading to background functions or moving the
retry to the client side with a loading state.

### 3. (Optional) Log token usage per request

Add `console.log('tokens used:', data?.usage?.total_tokens)` in `llm-proxy.ts` after
a successful Groq response (around line 200). This gives visibility into actual TPM
consumption and helps tune limits.

## Key files

- `netlify/functions/llm-proxy.ts` — proxy, error handling, retry would go here
- `src/prompts/horary-base.md` — system prompt to review for verbosity
- `src/utils/llm.ts:453–525` — `generateHoraryReading`, instruction text at lines 474–501
- `src/utils/llm/client.ts` — client-side error formatting (already fixed)
- `src/utils/llm/freeTier.ts` — client-side quota tracking (separate from Groq TPM)

## Stack

Vue 3 + TypeScript + Vite, Netlify serverless functions, Groq API (openai-compatible),
openai SDK v5 (`openai@^5.3.0`). Tests: `npm run test:run`. Build: `npm run build`.
