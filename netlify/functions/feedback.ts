import type { Handler, HandlerEvent } from '@netlify/functions';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'aditiohri/horary';

// Rate limiter: 5 submissions per IP per hour
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

const ALLOWED_TYPES = ['bug', 'feature', 'feedback'] as const;
type FeedbackType = typeof ALLOWED_TYPES[number];

const LABEL_MAP: Record<FeedbackType, string> = {
  bug: 'bug',
  feature: 'enhancement',
  feedback: 'feedback',
};

const TYPE_LABEL_MAP: Record<FeedbackType, string> = {
  bug: 'Bug report',
  feature: 'Feature request',
  feedback: 'General feedback',
};

export const handler: Handler = async (event: HandlerEvent) => {
  const origin = event.headers.origin || '';
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:8888',
    'https://horary-chat.netlify.app',
  ];
  const isAllowedOrigin = allowedOrigins.includes(origin);
  const corsOrigin = isAllowedOrigin ? origin : '';

  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!isAllowedOrigin && origin) {
    return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  if (!GITHUB_TOKEN) {
    console.error('GITHUB_TOKEN is not set');
    return {
      statusCode: 503,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Feedback is not configured on this deployment.' }),
    };
  }

  const clientIp =
    event.headers['x-forwarded-for']?.split(',')[0].trim() ||
    event.headers['x-nf-client-connection-ip'] ||
    'unknown';
  if (isRateLimited(clientIp)) {
    return {
      statusCode: 429,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Too many feedback submissions. Please wait a while before trying again.' }),
    };
  }

  let body: { type?: string; title?: string; body?: string };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { type, title, body: details } = body;

  if (!type || !ALLOWED_TYPES.includes(type as FeedbackType)) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid feedback type.' }) };
  }
  if (!title || title.trim().length < 5 || title.trim().length > 100) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Title must be between 5 and 100 characters.' }) };
  }
  if (details && details.length > 2000) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Details must be 2000 characters or fewer.' }) };
  }

  const feedbackType = type as FeedbackType;
  const issueBody = [
    `## Feedback submitted via horary-chat.netlify.app`,
    ``,
    `**Type:** ${TYPE_LABEL_MAP[feedbackType]}`,
    ``,
    details?.trim() ? details.trim() : '*(No details provided)*',
    ``,
    `---`,
    `*Submitted: ${new Date().toISOString()}*`,
  ].join('\n');

  const [owner, repo] = GITHUB_REPO.split('/');
  const ghResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'horary-feedback-bot',
    },
    body: JSON.stringify({
      title: title.trim(),
      body: issueBody,
      labels: [LABEL_MAP[feedbackType]],
    }),
  });

  if (!ghResponse.ok) {
    const err = await ghResponse.json().catch(() => ({}));
    console.error('GitHub API error:', ghResponse.status, err);
    return {
      statusCode: 502,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to submit feedback. Please try again later.' }),
    };
  }

  const issue = await ghResponse.json();
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ issueUrl: issue.html_url }),
  };
};
