import { OpenAI } from 'openai';
import type { LLMSettings } from '../../types/llm';
import { loadSettings } from './storage';

/**
 * Create OpenAI-compatible client for Ollama
 */
function createOllamaClient(settings: LLMSettings): OpenAI {
  if (settings.provider !== 'ollama') {
    throw new Error('Invalid provider for Ollama client');
  }

  return new OpenAI({
    apiKey: 'ollama', // Dummy key for Ollama
    dangerouslyAllowBrowser: true,
    baseURL: settings.baseUrl,
  });
}

/**
 * Create free tier client that uses Netlify function as proxy
 * The Netlify function keeps the API key server-side for security
 */
function createFreeTierClient(): OpenAI {
  // Determine base URL based on environment
  // In dev: use netlify dev's function server on port 8888
  // In production: use relative path to Netlify functions
  const baseURL = import.meta.env.DEV
    ? 'http://localhost:8888/.netlify/functions'
    : '/.netlify/functions';

  return new OpenAI({
    apiKey: 'free-tier-placeholder', // Dummy key - real one is in Netlify function
    dangerouslyAllowBrowser: true,
    baseURL: `${baseURL}/llm-proxy`,
    defaultHeaders: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Unified client factory - creates the appropriate client based on settings
 */
export function createLLMClient(settings?: LLMSettings): OpenAI {
  const activeSettings = settings || loadSettings();

  switch (activeSettings.provider) {
    case 'ollama':
      return createOllamaClient(activeSettings);

    case 'openrouter-free':
      return createFreeTierClient();

    default:
      throw new Error(`Unknown provider: ${(activeSettings as any).provider}`);
  }
}

/**
 * Get current model from settings
 */
export function getCurrentModel(settings?: LLMSettings): string {
  const activeSettings = settings || loadSettings();
  return activeSettings.model;
}

/**
 * Format error messages based on provider and error type
 */
export function formatLLMError(error: any, provider?: string): string {
  const errorMessage = error?.message || String(error);
  const activeProvider = provider || loadSettings().provider;

  // Connection errors
  if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Failed to fetch')) {
    if (activeProvider === 'ollama') {
      return 'Cannot connect to Ollama server. Please ensure Ollama is running on your machine.';
    }
    return 'Network connection failed. Please check your internet connection.';
  }

  // API key errors
  if (errorMessage.includes('API key') || errorMessage.includes('apiKey') || errorMessage.includes('401')) {
    return `Invalid or missing API key. Please check your ${activeProvider.toUpperCase()} API key in Settings.`;
  }

  // Model not found
  if (errorMessage.includes('404') || errorMessage.includes('not found')) {
    if (activeProvider === 'ollama') {
      return 'Model not found. Please pull the model using: ollama pull <model-name>';
    }
    return 'Model not found. Please check your model name in Settings.';
  }

  // Timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
    return 'Request timeout. The server took too long to respond. Try increasing timeout in Settings.';
  }

  // Rate limit errors
  if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
    return 'Rate limit exceeded. Please wait a moment before trying again.';
  }

  // Generic error with provider context
  return `Error from ${activeProvider.toUpperCase()}: ${errorMessage}`;
}
