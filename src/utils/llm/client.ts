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
 * Create OpenAI-compatible client for OpenRouter
 */
function createOpenRouterClient(settings: LLMSettings): OpenAI {
  if (settings.provider !== 'openrouter') {
    throw new Error('Invalid provider for OpenRouter client');
  }

  if (!settings.apiKey) {
    throw new Error('OpenRouter API key is required. Please add your API key in Settings.');
  }

  return new OpenAI({
    apiKey: settings.apiKey,
    dangerouslyAllowBrowser: true,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Horary Astrology App',
    },
  });
}

/**
 * Create Anthropic client via OpenRouter
 * Since Anthropic doesn't have an OpenAI-compatible endpoint,
 * we route Anthropic requests through OpenRouter for simplicity
 */
function createAnthropicClient(settings: LLMSettings): never {
  if (settings.provider !== 'anthropic') {
    throw new Error('Invalid provider for Anthropic client');
  }

  if (!settings.apiKey) {
    throw new Error('Anthropic API key is required. Please add your API key in Settings.');
  }

  // For now, recommend using Anthropic models via OpenRouter
  // Users can get Claude models on OpenRouter with: anthropic/claude-3-5-sonnet
  console.warn('Direct Anthropic API support requires @anthropic-ai/sdk. Consider using Anthropic models via OpenRouter instead.');

  // Fallback: create a client that will fail gracefully with a helpful message
  throw new Error('Direct Anthropic API not yet supported. Please use OpenRouter provider with model "anthropic/claude-3-5-sonnet" to access Claude models.');
}

/**
 * Unified client factory - creates the appropriate client based on settings
 */
export function createLLMClient(settings?: LLMSettings): OpenAI {
  const activeSettings = settings || loadSettings();

  switch (activeSettings.provider) {
    case 'ollama':
      return createOllamaClient(activeSettings);

    case 'openrouter':
      return createOpenRouterClient(activeSettings);

    case 'anthropic':
      return createAnthropicClient(activeSettings);

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
