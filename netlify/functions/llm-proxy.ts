const GROQ_API_KEY = process.env.GROQ_FREE_TIER_KEY;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:8888',
  'https://horary-chat.netlify.app',
];

function getCorsHeaders(origin: string): Record<string, string> {
  const isAllowed = allowedOrigins.some(o => origin.startsWith(o));
  return {
    'Access-Control-Allow-Origin': (isAllowed || !origin) ? (origin || '*') : '',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get('origin') ?? '';
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const isAllowedOrigin = allowedOrigins.some(o => origin.startsWith(o));
  if (!isAllowedOrigin && origin) {
    console.warn(`Blocked request from unauthorized origin: ${origin}`);
    return new Response(JSON.stringify({ error: 'Forbidden - unauthorized origin' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!GROQ_API_KEY) {
    console.error('GROQ_FREE_TIER_KEY environment variable is not set');
    return new Response(JSON.stringify({ error: 'Server configuration error - API key not set' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  let requestBody: any;
  try {
    requestBody = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  if (!requestBody.model || !requestBody.messages) {
    return new Response(JSON.stringify({ error: 'Invalid request - missing model or messages' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!groqResponse.ok) {
      const errData = await groqResponse.json();
      console.error('Groq API error:', errData);
      return new Response(JSON.stringify({
        error: errData.error?.message || 'Groq API error',
        details: errData,
      }), {
        status: groqResponse.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (requestBody.stream) {
      return new Response(groqResponse.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          ...corsHeaders,
        },
      });
    }

    const data = await groqResponse.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: any) {
    console.error('Proxy error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}
