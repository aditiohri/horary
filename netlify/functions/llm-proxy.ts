import type { Handler, HandlerEvent } from '@netlify/functions';

const GROQ_API_KEY = process.env.GROQ_FREE_TIER_KEY;

// Simple in-memory rate limiter (best-effort; resets on cold starts)
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;

function humanizeGroqError(status: number, isUserKey: boolean, error?: { type?: string; code?: string; message?: string }): { message: string; code: string | null } {
  const errorType = error?.type || '';
  const code = error?.code ?? null;

  if (status === 401) {
    if (isUserKey) {
      return { message: 'Your Groq API key was rejected. Please double-check it in Settings and try again.', code };
    }
    return { message: 'The AI service credentials are misconfigured. Please contact the developer.', code };
  }
  if (status === 403) {
    if (isUserKey) {
      return { message: 'Your Groq API key doesn\'t have permission to use this model. Try a different model or check your Groq account.', code };
    }
    return { message: 'Access to this AI model is restricted. Please contact the developer.', code };
  }
  if (status === 404) {
    return { message: 'The requested AI model is unavailable right now. Please try again shortly.', code };
  }
  if (status === 413) {
    if (errorType === 'tokens' || errorType.includes('token') || error?.code === 'rate_limit_exceeded') {
      // Groq uses 413 (not 429) for token-per-minute rate limits
      if (isUserKey) {
        return { message: "You've hit your personal Groq token rate limit. Please wait a moment and try again.", code };
      }
      return { message: 'This shared AI service has used a lot of capacity recently — you\'re not the only one using it! Please wait a moment and try again, or add your own free Groq API key in Settings → LLM Provider.', code };
    }
    return { message: 'Your question is too long for the AI to process. Please shorten it and try again.', code };
  }
  if (status === 422) {
    return { message: 'Something about your question couldn\'t be processed. Try rephrasing it, and if it keeps happening, contact the developer.', code };
  }
  if (status === 429) {
    if (isUserKey) {
      return { message: 'You\'ve hit your personal Groq rate limit. Please wait a moment and try again.', code };
    }
    if (errorType === 'tokens' || errorType.includes('token')) {
      return { message: 'This shared AI service has used a lot of capacity recently — you\'re not the only one using it! Please wait a moment and try again, or add your own free Groq API key in Settings → LLM Provider.', code };
    }
    return { message: 'This shared AI service is currently at capacity — you\'re not the only one using it! Please wait a moment and try again, or add your own free Groq API key in Settings → LLM Provider.', code };
  }
  if (status === 400) {
    return { message: 'The request was invalid — it may be too long or contain an unsupported parameter. Try a shorter question, or contact the developer if this persists.', code };
  }
  if (status >= 500) {
    return { message: 'The AI service is temporarily unavailable. Please try again in a few minutes.', code };
  }
  return { message: 'The AI service encountered an unexpected problem. Please try again shortly.', code };
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

export const handler: Handler = async (event: HandlerEvent) => {
  // Get the origin for CORS
  const origin = event.headers.origin || '';

  // List of allowed origins — exact match to prevent startsWith bypass
  const allowedOrigins = [
    'http://localhost:5173',        // Vite dev server
    'http://localhost:8888',        // Netlify dev
    'https://horary-chat.netlify.app',
  ];

  const isAllowedOrigin = allowedOrigins.includes(origin);
  const corsOrigin = isAllowedOrigin ? origin : '';

  // Handle CORS preflight before any other checks
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Groq-API-Key',
      },
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  if (!isAllowedOrigin && origin) {
    console.warn(`Blocked request from unauthorized origin: ${origin}`);
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Forbidden - unauthorized origin' }),
    };
  }

  // Check for user-provided API key in header
  const userProvidedKey = event.headers['x-groq-api-key'] || '';
  const isUserKey = userProvidedKey.length > 0;

  if (isUserKey) {
    if (!userProvidedKey.startsWith('gsk_')) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': corsOrigin,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Invalid API key format. Groq keys should start with gsk_.' }),
      };
    }
  }

  // Determine which API key to use
  const apiKeyToUse = isUserKey ? userProvidedKey : GROQ_API_KEY;

  // Check if API key is available
  if (!apiKeyToUse) {
    console.error('GROQ_FREE_TIER_KEY environment variable is not set');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'The service is not properly configured. Please contact the developer.' }),
    };
  }

  // Rate limiting by client IP
  const clientIp =
    event.headers['x-forwarded-for']?.split(',')[0].trim() ||
    event.headers['x-nf-client-connection-ip'] ||
    'unknown';
  if (isRateLimited(clientIp)) {
    return {
      statusCode: 429,
      headers: {
        'Access-Control-Allow-Origin': corsOrigin,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'You\'ve made too many requests in a short time. Please wait a minute and try again.' }),
    };
  }

  try {
    // Parse request body
    const requestBody = JSON.parse(event.body || '{}');

    // Validate request has required fields
    if (!requestBody.model || !Array.isArray(requestBody.messages)) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': corsOrigin,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Invalid request - missing model or messages',
        }),
      };
    }

    // Forward request to Groq (key is never logged)
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKeyToUse}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    // Check if Groq returned an error
    if (!response.ok) {
      if (isUserKey) {
        console.error('Groq API error (user key):', response.status, data?.error?.type);
      } else {
        console.error('Groq API error:', data);
      }
      return {
        statusCode: response.status,
        headers: {
          'Access-Control-Allow-Origin': corsOrigin,
          'Access-Control-Allow-Headers': 'Content-Type',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: humanizeGroqError(response.status, isUserKey, data?.error) }),
      };
    }

    // Return successful response
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    };
  } catch (error: any) {
    console.error('Proxy error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: { message: 'Something went wrong on our end. Please try again shortly.', code: null } }),
    };
  }
};
