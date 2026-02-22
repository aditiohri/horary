import { ref, reactive } from 'vue';
import type { LLMSettings, LLMProvider, ConnectionStatus } from '../types/llm';
import { getProviderConfig, validateApiKey } from '../utils/llmProviders';
import { fetchOllamaModels } from '../utils/ollama';
import { loadSettings, saveSettings } from '../utils/llm/storage';

/**
 * Test connection based on provider
 */
async function testProviderConnection(
  provider: LLMProvider,
  settings: LLMSettings
): Promise<{ status: ConnectionStatus; message?: string; error?: string }> {
  try {
    if (provider === 'ollama') {
      // Test Ollama connection
      if (settings.provider !== 'ollama') {
        return { status: 'error', error: 'Invalid settings for Ollama provider' };
      }
      const baseUrl = settings.baseUrl;
      const normalizedUrl = baseUrl.replace(/\/v1\/?$/, '');
      const tagsUrl = `${normalizedUrl}/api/tags`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), settings.timeout);

      const response = await fetch(tagsUrl, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return {
          status: 'success',
          message: 'Successfully connected to Ollama server',
        };
      } else {
        return {
          status: 'error',
          error: `Server responded with status ${response.status}`,
        };
      }
    } else if (provider === 'openrouter-free') {
      // Test free tier by checking if Netlify function is available
      const baseURL = import.meta.env.DEV
        ? 'http://localhost:8888/.netlify/functions'
        : '/.netlify/functions';

      const testUrl = `${baseURL}/llm-proxy`;

      try {
        // Make a simple test request (will fail but proves function is reachable)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), settings.timeout);

        const response = await fetch(testUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 5,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Even if the request fails, if we get a response from the function, it's working
        // 200 = success, 400 = bad request (function works), 429 = rate limit (function works!), 500 = server error (function exists)
        if (response.status === 200 || response.status === 400 || response.status === 429 || response.status === 500) {
          const message = response.status === 429
            ? 'Free tier is working (rate limit hit, wait a moment before making requests)'
            : 'Free tier is available and ready to use';
          return {
            status: 'success',
            message,
          };
        } else if (response.status === 403) {
          return {
            status: 'error',
            error: 'Access forbidden - check allowed origins',
          };
        } else if (response.status === 404) {
          return {
            status: 'error',
            error: 'Netlify function not deployed. Make sure to run "npm run dev" for local testing.',
          };
        } else {
          return {
            status: 'error',
            error: `Unexpected response: ${response.status}`,
          };
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          return {
            status: 'error',
            error: 'Connection timeout',
          };
        }
        // Function not available
        return {
          status: 'error',
          error: 'Cannot reach Netlify function. Run "npm run dev" to start the local server.',
        };
      }
    } else if (provider === 'openrouter' || provider === 'anthropic') {
      // Type guard for cloud providers
      if (settings.provider === 'ollama') {
        return { status: 'error', error: 'Invalid settings for cloud provider' };
      }

      // Validate API key format
      const validation = validateApiKey(provider, settings.apiKey || '');
      if (!validation.valid) {
        return {
          status: 'error',
          error: validation.error,
        };
      }

      // Test API key by making a lightweight request
      const config = getProviderConfig(provider);
      let testUrl = '';
      let headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (provider === 'openrouter') {
        testUrl = 'https://openrouter.ai/api/v1/models';
        headers['Authorization'] = `Bearer ${settings.apiKey}`;
      } else if (provider === 'anthropic') {
        // For Anthropic, we'll just validate the format since testing requires a full API call
        return {
          status: 'success',
          message: 'API key format is valid',
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), settings.timeout);

      const response = await fetch(testUrl, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return {
          status: 'success',
          message: `Successfully authenticated with ${config.name}`,
        };
      } else if (response.status === 401) {
        return {
          status: 'error',
          error: 'Invalid API key',
        };
      } else {
        return {
          status: 'error',
          error: `Server responded with status ${response.status}`,
        };
      }
    }

    return {
      status: 'error',
      error: 'Unknown provider',
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return {
        status: 'error',
        error: 'Connection timeout - server did not respond in time',
      };
    }

    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('Failed to fetch')) {
      if (provider === 'ollama') {
        return {
          status: 'error',
          error: 'Ollama server not running - please start Ollama',
        };
      } else {
        return {
          status: 'error',
          error: 'Network error - check your connection',
        };
      }
    }

    return {
      status: 'error',
      error: error.message || 'Unknown error occurred',
    };
  }
}

export function useLLMSettings() {
  const settings = reactive<LLMSettings>(loadSettings());
  const connectionStatus = ref<ConnectionStatus>('idle');
  const connectionMessage = ref<string>('');
  const availableModels = ref<string[]>([]);
  const isTestingConnection = ref(false);
  const isLoadingModels = ref(false);

  /**
   * Test connection to the current provider
   */
  async function testConnection(): Promise<boolean> {
    isTestingConnection.value = true;
    connectionStatus.value = 'testing';
    connectionMessage.value = 'Testing connection...';

    try {
      const result = await testProviderConnection(settings.provider, settings);
      connectionStatus.value = result.status;

      if (result.status === 'success') {
        connectionMessage.value = result.message || 'Connection successful';
        return true;
      } else {
        connectionMessage.value = result.error || 'Connection failed';
        return false;
      }
    } catch (error: any) {
      connectionStatus.value = 'error';
      connectionMessage.value = error.message || 'Connection failed';
      return false;
    } finally {
      isTestingConnection.value = false;
    }
  }

  /**
   * Load available models (Ollama only)
   */
  async function loadModels(): Promise<void> {
    if (settings.provider !== 'ollama') {
      availableModels.value = [];
      return;
    }

    isLoadingModels.value = true;

    try {
      const baseUrl = settings.baseUrl;
      const models = await fetchOllamaModels(baseUrl, settings.timeout);
      availableModels.value = models.map(m => m.name);
    } catch (error: any) {
      console.error('Error loading models:', error);
      availableModels.value = [];
      throw error;
    } finally {
      isLoadingModels.value = false;
    }
  }

  /**
   * Update settings and save to localStorage
   */
  function updateSettings(newSettings: Partial<LLMSettings>): void {
    Object.assign(settings, newSettings);
    saveSettings(settings);
  }

  /**
   * Reset connection status
   */
  function resetConnectionStatus(): void {
    connectionStatus.value = 'idle';
    connectionMessage.value = '';
  }

  return {
    settings,
    connectionStatus,
    connectionMessage,
    availableModels,
    isTestingConnection,
    isLoadingModels,
    testConnection,
    loadModels,
    updateSettings,
    resetConnectionStatus,
  };
}
