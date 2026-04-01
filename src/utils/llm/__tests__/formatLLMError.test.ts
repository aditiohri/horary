import { describe, it, expect } from 'vitest';
import { formatLLMError } from '../client';

/** Build a minimal error object with optional status and code */
function makeError(message: string, opts: { status?: number; code?: string | null } = {}): any {
  return { message, status: opts.status, code: opts.code };
}

describe('formatLLMError — error code display (withCode)', () => {
  it('appends the Groq error code when error.code is a non-empty string', () => {
    const error = makeError('rate limit hit', { status: 429, code: 'rate_limit_exceeded' });
    const result = formatLLMError(error, 'groq');
    expect(result).toContain('[rate_limit_exceeded]');
    expect(result).not.toContain('[HTTP');
  });

  it('falls back to HTTP status when error.code is null', () => {
    const error = makeError('429 You hit your rate limit', { status: 429, code: null });
    const result = formatLLMError(error, 'groq');
    expect(result).toContain('[HTTP 429]');
    expect(result).not.toContain('[no error code provided]');
  });

  it('appends [no error code provided] when neither code nor status is present', () => {
    const error = makeError('Something weird happened with no HTTP context');
    const result = formatLLMError(error, 'groq-free');
    expect(result).toContain('[no error code provided]');
  });

  it('uses the error code rather than the HTTP status when both are present', () => {
    const error = makeError('some error', { status: 500, code: 'internal_server_error' });
    const result = formatLLMError(error, 'groq-free');
    expect(result).toContain('[internal_server_error]');
    expect(result).not.toContain('[HTTP 500]');
  });
});

describe('formatLLMError — quota pass-through', () => {
  it('passes through the daily quota message and appends [no error code provided]', () => {
    const msg = 'The shared AI service has hit its daily limit. Please try again tomorrow, or add your own free Groq API key in Settings → LLM Provider.';
    const result = formatLLMError(new Error(msg), 'groq-free');
    expect(result).toContain('shared AI service has hit its daily limit');
    expect(result).toContain('[no error code provided]');
  });

  it('passes through the hourly quota message and appends [no error code provided]', () => {
    const msg = 'The shared AI service has reached its hourly limit. Please try again in 5 minutes, or add your own free Groq API key in Settings → LLM Provider.';
    const result = formatLLMError(new Error(msg), 'groq-free');
    expect(result).toContain('hourly limit');
    expect(result).toContain('[no error code provided]');
  });
});

describe('formatLLMError — connection errors', () => {
  it('returns Ollama-specific message on ECONNREFUSED', () => {
    const error = makeError('connect ECONNREFUSED 127.0.0.1:11434');
    const result = formatLLMError(error, 'ollama');
    expect(result).toContain('Ollama');
    expect(result).toContain('running');
  });

  it('returns generic connectivity message on Failed to fetch for groq-free', () => {
    const error = makeError('Failed to fetch');
    const result = formatLLMError(error, 'groq-free');
    expect(result).toContain('internet connection');
  });

  it('returns generic connectivity message on Failed to fetch for groq', () => {
    const error = makeError('Failed to fetch');
    const result = formatLLMError(error, 'groq');
    expect(result).toContain('internet connection');
    expect(result).toContain('[no error code provided]');
  });
});

describe('formatLLMError — API key errors', () => {
  it('returns key-rejected message for groq provider on 401', () => {
    const error = makeError('401 Unauthorized', { status: 401 });
    const result = formatLLMError(error, 'groq');
    expect(result).toContain('API key was rejected');
    expect(result).toContain('[HTTP 401]');
  });

  it('returns misconfigured message for groq-free on 401', () => {
    const error = makeError('401 Unauthorized', { status: 401 });
    const result = formatLLMError(error, 'groq-free');
    expect(result).toContain('misconfigured');
  });

  it('returns provider-prefixed message for unknown provider on API key error', () => {
    const error = makeError('API key missing');
    const result = formatLLMError(error, 'ollama');
    // ollama API key error → generic provider message
    expect(result).toContain('OLLAMA');
    expect(result).toContain('API key');
  });
});

describe('formatLLMError — model not found', () => {
  it('returns ollama pull instruction for Ollama on model not found', () => {
    const error = makeError('model not found');
    const result = formatLLMError(error, 'ollama');
    expect(result).toContain('ollama pull');
  });

  it('returns unavailable message for groq on 404', () => {
    const error = makeError('404 Not Found', { status: 404 });
    const result = formatLLMError(error, 'groq');
    expect(result).toContain('unavailable');
  });

  it('returns unavailable message for groq-free on 404', () => {
    const error = makeError('404 Not Found', { status: 404 });
    const result = formatLLMError(error, 'groq-free');
    expect(result).toContain('unavailable');
  });
});

describe('formatLLMError — timeout errors', () => {
  it('returns timeout message for groq-free on "timeout" in message', () => {
    const error = makeError('Request timeout after 30000ms', { status: 408 });
    const result = formatLLMError(error, 'groq-free');
    expect(result).toContain('too long');
  });

  it('returns timeout message for groq on aborted request', () => {
    const error = makeError('The user aborted a request.');
    const result = formatLLMError(error, 'groq');
    expect(result).toContain('too long');
  });

  it('returns generic timeout message for ollama', () => {
    const error = makeError('Request timeout after 30000ms');
    const result = formatLLMError(error, 'ollama');
    expect(result).toContain('timeout');
    expect(result).toContain('Settings');
  });
});

describe('formatLLMError — rate limit errors', () => {
  it('returns personal rate limit message for groq on 429', () => {
    const error = makeError('429 rate limit exceeded', { status: 429 });
    const result = formatLLMError(error, 'groq');
    expect(result).toContain('personal Groq rate limit');
  });

  it('returns shared capacity message for groq-free on "at capacity"', () => {
    const error = makeError('This service is at capacity', { status: 429 });
    const result = formatLLMError(error, 'groq-free');
    expect(result).toContain('shared AI service');
    expect(result).toContain('capacity');
  });
});

describe('formatLLMError — server errors', () => {
  it('returns temporarily unavailable message on 500 for groq-free', () => {
    const error = makeError('500 Internal Server Error', { status: 500 });
    const result = formatLLMError(error, 'groq-free');
    expect(result).toContain('temporarily unavailable');
  });

  it('returns temporarily unavailable message on 503 for groq', () => {
    const error = makeError('503 Service Unavailable', { status: 503 });
    const result = formatLLMError(error, 'groq');
    expect(result).toContain('temporarily unavailable');
  });
});

describe('formatLLMError — generic fallback', () => {
  it('returns unexpected-problem message with code for groq-free on unmatched error', () => {
    const error = makeError('An unusual glitch occurred');
    const result = formatLLMError(error, 'groq-free');
    expect(result).toContain('unexpected problem');
    expect(result).toContain('[no error code provided]');
  });

  it('returns raw provider prefix for Ollama on unmatched error (developer-facing)', () => {
    const error = makeError('some low-level model error');
    const result = formatLLMError(error, 'ollama');
    expect(result).toContain('Error from OLLAMA:');
    expect(result).toContain('some low-level model error');
  });
});
