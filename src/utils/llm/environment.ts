import type { LLMProvider } from '../../types/llm';

/**
 * Detect if the app is running in a local development environment
 */
export function isLocalEnvironment(): boolean {
  return window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1' ||
         window.location.hostname === '';
}

/**
 * Detect if the app is deployed (running on a remote server)
 */
export function isDeployedEnvironment(): boolean {
  return !isLocalEnvironment();
}

/**
 * Get the default provider based on the environment
 */
export function getDefaultProvider(): LLMProvider {
  // In local development, default to Ollama (free, private)
  if (isLocalEnvironment()) {
    return 'ollama';
  }

  // In deployed environment, default to Groq free tier
  return 'groq-free';
}

/**
 * Check if a provider is available in the current environment
 */
export function isProviderAvailable(provider: LLMProvider): boolean {
  if (provider === 'ollama') {
    // Ollama only works locally (can't connect to localhost from deployed site)
    return isLocalEnvironment();
  }

  // Groq providers work everywhere
  return true;
}

/**
 * Get environment-specific guidance message
 */
export function getEnvironmentGuidance(): string {
  if (isLocalEnvironment()) {
    return 'You are running locally. Ollama (free, private) is recommended.';
  }

  return 'You are on a deployed site. Please use the Groq free tier or your own API key.';
}
