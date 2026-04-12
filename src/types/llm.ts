export type LLMProvider = 'ollama' | 'groq-free' | 'groq';

export interface BaseLLMSettings {
  provider: LLMProvider;
}

export interface OllamaProviderSettings {
  provider: 'ollama';
  baseUrl: string;
  model: string;
  timeout: number;
}

export interface FreeTierProviderSettings {
  provider: 'groq-free';
  mode: 'free-tier';
  model: string;
  timeout: number;
}

export interface GroqProviderSettings {
  provider: 'groq';
  apiKey: string;
  model: string;
  timeout: number;
}

export interface FreeTierUsage {
  tokensUsed: number;        // Total tokens consumed
  requestCount: number;      // Total requests made
  lastRequestTime: number;   // Timestamp of last request
  dailyTokensUsed: number;   // Tokens used today
  hourlyRequestCount: number;// Requests in last hour
  lastResetDate: string;     // Date of last daily reset (YYYY-MM-DD)
  lastHourReset: number;     // Timestamp of last hourly reset
}

export interface FreeTierLimits {
  maxTokensPerDay: number;    // e.g., 100,000
  maxRequestsPerHour: number; // e.g., 3
  freeModels: string[];       // List of allowed free models
}

export type LLMSettings =
  | OllamaProviderSettings
  | FreeTierProviderSettings
  | GroqProviderSettings;

export interface ProviderConfig {
  id: LLMProvider;
  name: string;
  description: string;
  requiresApiKey: boolean;
  supportsLocal: boolean;
  defaultModel: string;
  suggestedModels: string[];
  apiKeyPlaceholder?: string;
  apiKeyPattern?: RegExp;
  getApiKeyUrl?: string;
}

export type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error';

export const DEFAULT_TIMEOUT = 30000; // 30 seconds

export const PROVIDER_CONFIGS: Record<LLMProvider, ProviderConfig> = {
  ollama: {
    id: 'ollama',
    name: 'Ollama (Local)',
    description: 'Run models locally on your computer. Free, private, and works offline.',
    requiresApiKey: false,
    supportsLocal: true,
    defaultModel: 'llama3.2:latest',
    suggestedModels: ['llama3.2:latest', 'qwen2.5:14b', 'mistral:latest'],
  },
  'groq-free': {
    id: 'groq-free',
    name: 'Shared (Groq)',
    description: 'Try the app with Groq\'s free tier. Fast responses with generous limits.',
    requiresApiKey: false,
    supportsLocal: false,
    defaultModel: 'llama-3.3-70b-versatile',
    suggestedModels: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'qwen/qwen3-32b',
      'qwen-2.5-32b',
    ],
  },
  groq: {
    id: 'groq',
    name: 'Personal (Groq)',
    description: 'Use your own Groq API key for personal limits — no sharing with other users.',
    requiresApiKey: true,
    supportsLocal: false,
    defaultModel: 'llama-3.3-70b-versatile',
    suggestedModels: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'qwen/qwen3-32b',
      'qwen-2.5-32b',
    ],
    apiKeyPlaceholder: 'gsk_...',
    apiKeyPattern: /^gsk_/,
    getApiKeyUrl: 'https://console.groq.com/keys',
  },
};
