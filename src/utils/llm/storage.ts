import type { LLMSettings, LLMProvider } from '../../types/llm';
import { PROVIDER_CONFIGS, DEFAULT_TIMEOUT } from '../../types/llm';
import { getDefaultProvider, canUseOllama } from '../environment';

const STORAGE_KEY = 'llm_settings';
const LEGACY_STORAGE_KEY = 'ollama_settings';

/**
 * Get default settings for a provider
 */
export function getDefaultSettings(provider: LLMProvider): LLMSettings {
  const config = PROVIDER_CONFIGS[provider];

  switch (provider) {
    case 'ollama':
      return {
        provider: 'ollama',
        baseUrl: 'http://localhost:11434/v1/',
        model: config.defaultModel,
        timeout: DEFAULT_TIMEOUT,
      };

    case 'openrouter':
      return {
        provider: 'openrouter',
        apiKey: '',
        model: config.defaultModel,
        timeout: DEFAULT_TIMEOUT,
      };

    case 'anthropic':
      return {
        provider: 'anthropic',
        apiKey: '',
        model: config.defaultModel,
        timeout: DEFAULT_TIMEOUT,
      };
  }
}

/**
 * Migrate legacy Ollama settings to new format
 */
function migrateLegacySettings(): LLMSettings | null {
  try {
    const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacyData) return null;

    const legacy = JSON.parse(legacyData);

    // Convert old Ollama settings to new format
    const migrated: LLMSettings = {
      provider: 'ollama',
      baseUrl: legacy.baseUrl || 'http://localhost:11434/v1/',
      model: legacy.model || 'llama3.2:latest',
      timeout: legacy.timeout || DEFAULT_TIMEOUT,
    };

    // Save migrated settings in new format
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));

    // Remove legacy key
    localStorage.removeItem(LEGACY_STORAGE_KEY);

    console.log('Migrated legacy Ollama settings to new LLM settings format');

    return migrated;
  } catch (error) {
    console.error('Error migrating legacy settings:', error);
    return null;
  }
}

/**
 * Load LLM settings from localStorage
 */
export function loadSettings(): LLMSettings {
  try {
    // Try to load new format settings
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
      const parsed = JSON.parse(stored) as LLMSettings;

      // Validate: Ollama can only be used in local development
      if (parsed.provider === 'ollama' && !canUseOllama()) {
        console.warn('Ollama cannot be used on deployed sites. Switching to OpenRouter.');
        // Switch to OpenRouter and save the change
        const openrouterSettings = getDefaultSettings('openrouter');
        saveSettings(openrouterSettings);
        return openrouterSettings;
      }

      // Ensure settings have all required fields
      const defaults = getDefaultSettings(parsed.provider);
      return { ...defaults, ...parsed };
    }

    // Try to migrate legacy settings
    const migrated = migrateLegacySettings();
    if (migrated) {
      // Also validate migrated settings
      if (migrated.provider === 'ollama' && !canUseOllama()) {
        console.warn('Ollama cannot be used on deployed sites. Switching to OpenRouter.');
        const openrouterSettings = getDefaultSettings('openrouter');
        saveSettings(openrouterSettings);
        return openrouterSettings;
      }
      return migrated;
    }

    // No settings found - return defaults for current environment
    const defaultProvider = getDefaultProvider();
    return getDefaultSettings(defaultProvider);

  } catch (error) {
    console.error('Error loading LLM settings:', error);
    const defaultProvider = getDefaultProvider();
    return getDefaultSettings(defaultProvider);
  }
}

/**
 * Save LLM settings to localStorage
 */
export function saveSettings(settings: LLMSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving LLM settings:', error);
    throw new Error('Failed to save settings');
  }
}

/**
 * Clear LLM settings from localStorage
 */
export function clearSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing LLM settings:', error);
  }
}
