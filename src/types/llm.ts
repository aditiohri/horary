export type LLMProvider = 'ollama' | 'openrouter' | 'anthropic';

export interface BaseLLMSettings {
  provider: LLMProvider;
}

export interface OllamaProviderSettings {
  provider: 'ollama';
  baseUrl: string;
  model: string;
  timeout: number;
}

export interface OpenRouterProviderSettings {
  provider: 'openrouter';
  apiKey: string;
  model: string;
  timeout: number;
}

export interface AnthropicProviderSettings {
  provider: 'anthropic';
  apiKey: string;
  model: string;
  timeout: number;
}

export type LLMSettings = OllamaProviderSettings | OpenRouterProviderSettings | AnthropicProviderSettings;

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
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Access 290+ models including Claude, GPT-4, and many free options. One API key for all.',
    requiresApiKey: true,
    supportsLocal: false,
    defaultModel: 'anthropic/claude-3.5-sonnet',
    suggestedModels: [
      'anthropic/claude-3.5-sonnet',
      'anthropic/claude-3-opus',
      'openai/gpt-4-turbo',
      'google/gemini-pro-1.5',
      'meta-llama/llama-3.3-70b-instruct',
      'qwen/qwen-2.5-72b-instruct',
    ],
    apiKeyPlaceholder: 'sk-or-v1-...',
    apiKeyPattern: /^sk-or-/,
    getApiKeyUrl: 'https://openrouter.ai/keys',
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    description: 'Direct access to Claude models. Best for users who want Claude specifically.',
    requiresApiKey: true,
    supportsLocal: false,
    defaultModel: 'claude-3-5-sonnet-20241022',
    suggestedModels: [
      'claude-3-5-sonnet-20241022',
      'claude-3-opus-20240229',
      'claude-3-haiku-20240307',
    ],
    apiKeyPlaceholder: 'sk-ant-...',
    apiKeyPattern: /^sk-ant-/,
    getApiKeyUrl: 'https://console.anthropic.com/settings/keys',
  },
};
