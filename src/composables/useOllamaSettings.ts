import { ref, reactive } from 'vue';
import { loadSettings, saveSettings, testOllamaConnection, fetchOllamaModels } from '../utils/ollama';
import type { OllamaSettings, OllamaModel, ConnectionStatus } from '../types/ollama';

export function useOllamaSettings() {
  const settings = reactive<OllamaSettings>(loadSettings());
  const connectionStatus = ref<ConnectionStatus>('idle');
  const connectionMessage = ref<string>('');
  const availableModels = ref<OllamaModel[]>([]);
  const isTestingConnection = ref(false);
  const isLoadingModels = ref(false);

  /**
   * Test connection to Ollama server
   */
  async function testConnection(): Promise<boolean> {
    isTestingConnection.value = true;
    connectionStatus.value = 'testing';
    connectionMessage.value = 'Testing connection...';

    try {
      const result = await testOllamaConnection(settings.baseUrl, settings.timeout);
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
   * Load available models from Ollama server
   */
  async function loadModels(): Promise<void> {
    isLoadingModels.value = true;

    try {
      const models = await fetchOllamaModels(settings.baseUrl, settings.timeout);
      availableModels.value = models;
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
  function updateSettings(newSettings: Partial<OllamaSettings>): void {
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
