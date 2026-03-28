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
  // In production: use full URL with current origin
  const baseURL = import.meta.env.DEV
    ? 'http://localhost:8888/.netlify/functions'
    : `${window.location.origin}/.netlify/functions`;

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
 * Create client for user-provided Groq API key
 * Key is sent via X-Groq-API-Key header to the proxy, which forwards it to Groq
 */
function createGroqClient(settings: LLMSettings): OpenAI {
  if (settings.provider !== 'groq') {
    throw new Error('Invalid provider for Groq client');
  }

  const baseURL = import.meta.env.DEV
    ? 'http://localhost:8888/.netlify/functions'
    : `${window.location.origin}/.netlify/functions`;

  return new OpenAI({
    apiKey: 'user-key-via-proxy', // Dummy - real key is sent in X-Groq-API-Key header
    dangerouslyAllowBrowser: true,
    baseURL: `${baseURL}/llm-proxy`,
    defaultHeaders: {
      'Content-Type': 'application/json',
      'X-Groq-API-Key': settings.apiKey,
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

    case 'groq-free':
      return createFreeTierClient();

    case 'groq':
      return createGroqClient(activeSettings);

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
  const statusCode: number | undefined = typeof error?.status === 'number' ? error.status : undefined;
  const withStatus = (msg: string) => statusCode !== undefined ? `${msg} (HTTP ${statusCode})` : msg;
  const activeProvider = provider || loadSettings().provider;

  // Quota limit messages are already user-friendly — pass through as-is
  // (these come from plain Error objects with no .status)
  if (errorMessage.includes('shared AI service has')) {
    return errorMessage;
  }

  const isFreeTier = activeProvider === 'groq-free';
  const isGroq = activeProvider === 'groq';

  // Connection errors
  if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Failed to fetch')) {
    if (activeProvider === 'ollama') {
      return withStatus('Cannot connect to Ollama server. Please ensure Ollama is running on your machine.');
    }
    return withStatus('Couldn\'t reach the AI service. Please check your internet connection and try again.');
  }

  // API key errors
  if (errorMessage.includes('API key') || errorMessage.includes('apiKey') || errorMessage.includes('401')) {
    if (isGroq) {
      return withStatus('Your Groq API key was rejected. Please check it in Settings and try again.');
    }
    if (isFreeTier) {
      return withStatus('The AI service credentials are misconfigured. Please contact the developer.');
    }
    return withStatus(`Invalid or missing API key. Please check your ${activeProvider.toUpperCase()} API key in Settings.`);
  }

  // Model not found
  if (errorMessage.includes('404') || errorMessage.includes('not found')) {
    if (activeProvider === 'ollama') {
      return withStatus('Model not found. Please pull the model using: ollama pull <model-name>');
    }
    if (isFreeTier || isGroq) {
      return withStatus('The requested AI model is unavailable right now. Please try again shortly.');
    }
    return withStatus('Model not found. Please check your model name in Settings.');
  }

  // Timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
    if (isFreeTier || isGroq) {
      return withStatus('The AI service took too long to respond. Please try again in a moment.');
    }
    return withStatus('Request timeout. The server took too long to respond. Try increasing timeout in Settings.');
  }

  // Rate limit errors
  if (errorMessage.includes('429') || errorMessage.includes('rate limit') || errorMessage.includes('at capacity')) {
    if (isGroq) {
      return withStatus('You\'ve hit your personal Groq rate limit. Please wait a moment and try again.');
    }
    if (isFreeTier) {
      return withStatus('This shared AI service is currently at capacity — you\'re not the only one using it! Please wait a moment and try again, or add your own free Groq API key in Settings → LLM Provider.');
    }
    return withStatus('Rate limit exceeded. Please wait a moment before trying again.');
  }

  // Server errors
  if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503') || errorMessage.includes('unavailable')) {
    if (isFreeTier || isGroq) {
      return withStatus('The AI service is temporarily unavailable. Please try again in a few minutes.');
    }
  }

  // Generic error — keep Ollama messages technical for developers, soften others
  if (isFreeTier || isGroq) {
    return withStatus('The AI service encountered an unexpected problem. Please try again shortly.');
  }
  return `Error from ${activeProvider.toUpperCase()}: ${errorMessage}`;
}
