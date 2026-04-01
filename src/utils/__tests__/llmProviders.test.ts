import { describe, it, expect } from 'vitest';
import { getProviderConfig, validateApiKey } from '../llmProviders';

describe('getProviderConfig', () => {
  it('returns ollama config with requiresApiKey: false', () => {
    const config = getProviderConfig('ollama');
    expect(config.id).toBe('ollama');
    expect(config.name).toContain('Ollama');
    expect(config.requiresApiKey).toBe(false);
  });

  it('returns groq-free config with requiresApiKey: false', () => {
    const config = getProviderConfig('groq-free');
    expect(config.id).toBe('groq-free');
    expect(config.requiresApiKey).toBe(false);
  });

  it('returns groq config with requiresApiKey: true and a key pattern', () => {
    const config = getProviderConfig('groq');
    expect(config.id).toBe('groq');
    expect(config.requiresApiKey).toBe(true);
    expect(config.apiKeyPattern).toBeDefined();
  });
});

describe('validateApiKey', () => {
  it('returns valid for ollama regardless of key value (no key required)', () => {
    expect(validateApiKey('ollama', '')).toEqual({ valid: true });
    expect(validateApiKey('ollama', 'anything')).toEqual({ valid: true });
  });

  it('returns valid for groq-free regardless of key value (no key required)', () => {
    expect(validateApiKey('groq-free', '')).toEqual({ valid: true });
  });

  it('returns invalid when groq API key is empty', () => {
    const result = validateApiKey('groq', '');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('API key is required');
  });

  it('returns invalid when groq API key does not start with gsk_', () => {
    const result = validateApiKey('groq', 'sk_notvalid');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('gsk_');
  });

  it('returns valid for a correctly formatted groq API key', () => {
    expect(validateApiKey('groq', 'gsk_abc123XYZ')).toEqual({ valid: true });
  });
});
