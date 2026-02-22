import type { Handler, HandlerEvent } from '@netlify/functions';

const GROQ_API_KEY = process.env.GROQ_FREE_TIER_KEY;

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

  // List of allowed origins
  const allowedOrigins = [
    'http://localhost:5173',        // Vite dev server
    'http://localhost:8888',        // Netlify dev
    'https://horary-chat.netlify.app',   // Production (update with actual domain)
    // Add more domains as needed
  ];

  // Check if origin is allowed
  const isAllowedOrigin = allowedOrigins.some(allowed => origin.startsWith(allowed));

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
      body: JSON.stringify({
        error: 'Server configuration error - API key not set',
      }),
    };
  }

  try {
    // Parse request body
    const requestBody = JSON.parse(event.body || '{}');

    // Validate request has required fields
    if (!requestBody.model || !requestBody.messages) {
      return {
        statusCode: 400,
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
          'Access-Control-Allow-Origin': origin || '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: data.error?.message || 'Groq API error',
          details: data,
        }),
      };
    }

    // Return successful response
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': origin || '*',
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
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};
