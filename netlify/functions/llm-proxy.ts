import type { Handler, HandlerEvent } from '@netlify/functions';

const GROQ_API_KEY = process.env.GROQ_FREE_TIER_KEY;

// Simple in-memory rate limiter (best-effort; resets on cold starts)
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;

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
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

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

  if (!isAllowedOrigin && origin) {
    console.warn(`Blocked request from unauthorized origin: ${origin}`);
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Forbidden - unauthorized origin' }),
    };
  }

  // Check if API key is configured
  if (!GROQ_API_KEY) {
    console.error('GROQ_FREE_TIER_KEY environment variable is not set');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server configuration error' }),
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
      body: JSON.stringify({ error: 'Too many requests - please try again later' }),
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

    // Forward request to Groq
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    // Check if Groq returned an error
    if (!response.ok) {
      console.error('Groq API error:', data);
      return {
        statusCode: response.status,
        headers: {
          'Access-Control-Allow-Origin': corsOrigin,
          'Access-Control-Allow-Headers': 'Content-Type',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'LLM provider error' }),
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
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
