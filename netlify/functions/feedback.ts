import type { Handler, HandlerEvent } from '@netlify/functions';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'aditiohri/horary';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpeg',
  'image/png':  'png',
  'image/gif':  'gif',
  'image/webp': 'webp',
};

// 1 MB pre-encoding cap; base64 inflates by ~33%, so cap base64 string at ceil(1MB * 4/3)
const MAX_BASE64_LENGTH = Math.ceil(1024 * 1024 * (4 / 3)) + 4;

function validateImageMagicBytes(buf: Buffer, mimeType: string): boolean {
  if (mimeType === 'image/jpeg') {
    return buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
  }
  if (mimeType === 'image/png') {
    return (
      buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47 &&
      buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A
    );
  }
  if (mimeType === 'image/gif') {
    return (
      buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 &&
      buf[3] === 0x38 && (buf[4] === 0x37 || buf[4] === 0x39) && buf[5] === 0x61
    );
  }
  if (mimeType === 'image/webp') {
    return (
      buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
    );
  }
  return false;
}

async function uploadImageToGitHub(
  owner: string,
  repo: string,
  base64: string,
  extension: string,
  timestamp: string,
): Promise<string | null> {
  // Build path entirely from server-controlled values — never from user-supplied filename
  const hash = Buffer.from(base64.slice(0, 64)).toString('hex').slice(0, 8);
  const path = `feedback-images/${timestamp}-${hash}.${extension}`;

  const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'horary-feedback-bot',
    },
    body: JSON.stringify({
      message: `Add feedback screenshot ${timestamp}`,
      content: base64,
      branch: GITHUB_BRANCH,
    }),
  });

  if (!ghRes.ok) {
    const err = await ghRes.json().catch(() => ({}));
    console.error('GitHub Contents API error:', ghRes.status, err);
    return null;
  }

  return `https://raw.githubusercontent.com/${owner}/${repo}/${GITHUB_BRANCH}/${path}`;
}

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

  interface ImagePayload { base64: string; mimeType: string; }
  let body: { type?: string; title?: string; body?: string; image?: ImagePayload };
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

  const [owner, repo] = GITHUB_REPO.split('/');

  // Optional image validation and upload
  let imageMarkdown = '';
  if (body.image) {
    const { base64, mimeType } = body.image;

    if (!ALLOWED_IMAGE_TYPES[mimeType]) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid image type.' }) };
    }
    if (typeof base64 !== 'string' || base64.length > MAX_BASE64_LENGTH) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Image exceeds 1 MB limit.' }) };
    }
    // Validate base64 charset before decoding
    if (!/^[A-Za-z0-9+/]+=*$/.test(base64)) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid image data.' }) };
    }

    let buf: Buffer;
    try {
      buf = Buffer.from(base64, 'base64');
    } catch {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid image data.' }) };
    }

    if (!validateImageMagicBytes(buf, mimeType)) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Image content does not match declared type.' }) };
    }

    const extension = ALLOWED_IMAGE_TYPES[mimeType];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rawUrl = await uploadImageToGitHub(owner, repo, base64, extension, timestamp);
    if (rawUrl) {
      imageMarkdown = `\n\n## Screenshot\n\n![Screenshot](${rawUrl})`;
    } else {
      console.error('Image upload failed; submitting issue without screenshot');
    }
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
  ].join('\n') + imageMarkdown;
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
