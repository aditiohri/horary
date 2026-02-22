import type { OllamaSettings, OllamaModel, ConnectionTestResult } from '../types/ollama';

const STORAGE_KEY = 'ollama_settings';

export const DEFAULT_SETTINGS: OllamaSettings = {
  baseUrl: 'http://localhost:11434/v1/',
  model: 'llama3.2:latest',
  timeout: 30000, // 30 seconds
};

/**
 * Load Ollama settings from localStorage
 */
export function loadSettings(): OllamaSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
      };
    }
  } catch (error) {
    console.error('Error loading Ollama settings:', error);
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * Save Ollama settings to localStorage
 */
export function saveSettings(settings: OllamaSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving Ollama settings:', error);
    throw new Error('Failed to save settings');
  }
}

/**
 * Test connection to Ollama server
 */
export async function testOllamaConnection(baseUrl: string, timeout: number = 5000): Promise<ConnectionTestResult> {
  try {
    // Normalize base URL (remove /v1/ suffix for tags endpoint)
    const normalizedUrl = baseUrl.replace(/\/v1\/?$/, '');
    const tagsUrl = `${normalizedUrl}/api/tags`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

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
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return {
        status: 'error',
        error: 'Connection timeout - server did not respond in time',
      };
    }

    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('Failed to fetch')) {
      return {
        status: 'error',
        error: 'Ollama server not running - please start Ollama',
      };
    }

    return {
      status: 'error',
      error: error.message || 'Unknown error occurred',
    };
  }
}

/**
 * Fetch available models from Ollama server
 */
export async function fetchOllamaModels(baseUrl: string, timeout: number = 5000): Promise<OllamaModel[]> {
  try {
    // Normalize base URL (remove /v1/ suffix for tags endpoint)
    const normalizedUrl = baseUrl.replace(/\/v1\/?$/, '');
    const tagsUrl = `${normalizedUrl}/api/tags`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(tagsUrl, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();
    return data.models || [];
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Connection timeout');
    }

    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('Failed to fetch')) {
      throw new Error('Ollama server not running');
    }

    throw error;
  }
}
