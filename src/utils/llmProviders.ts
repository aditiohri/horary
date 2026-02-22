import type { ProviderConfig, LLMProvider } from '../types/llm';
import { PROVIDER_CONFIGS } from '../types/llm';

// Re-export for convenience
export const PROVIDERS = PROVIDER_CONFIGS;

export function getProviderConfig(provider: LLMProvider): ProviderConfig {
  return PROVIDER_CONFIGS[provider];
}

export function validateApiKey(provider: LLMProvider, apiKey: string): { valid: boolean; error?: string } {
  const config = getProviderConfig(provider);

  if (!config.requiresApiKey) {
    return { valid: true };
  }

  if (!apiKey || apiKey.trim().length === 0) {
    return { valid: false, error: 'API key is required' };
  }

  if (config.apiKeyPattern && !config.apiKeyPattern.test(apiKey)) {
    return { valid: false, error: `API key should start with "${config.apiKeyPlaceholder}"` };
  }

  return { valid: true };
}
