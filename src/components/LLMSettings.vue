<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import { useLLMSettings } from '../composables/useLLMSettings';
import type { LLMProvider } from '../types/llm';
import { PROVIDER_CONFIGS } from '../types/llm';
import { getProviderConfig } from '../utils/llmProviders';
import { canUseOllama } from '../utils/environment';
import { getUsageStats } from '../utils/llm/freeTier';

const props = defineProps<{
  modelValue: boolean;
  isDark: boolean;
  readingsCount: number;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'toggleDark': [];
  'feedback': [];
  'viewHistory': [];
  'deleteAll': [];
}>();

const showDeleteAllConfirm = ref(false);

const {
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
} = useLLMSettings();

const currentYear = computed(() => new Date().getFullYear());

// Local form state
const localProvider = ref<LLMProvider>(settings.provider);
const localBaseUrl = ref(settings.provider === 'ollama' ? settings.baseUrl : 'http://localhost:11434/v1/');
const localApiKey = ref(settings.provider === 'groq' ? settings.apiKey : '');
const localModel = ref(settings.model);
const localTimeout = ref(settings.timeout);
const hasUnsavedChanges = ref(false);
const showApiKey = ref(false);
const apiKeyError = ref('');
// Reactive trigger for usage stats updates
const usageStatsVersion = ref(0);

// Environment detection
const canOllama = canUseOllama();

// Current provider config
const currentProviderConfig = computed(() => getProviderConfig(localProvider.value));

// Free tier usage stats
const usageStats = computed(() => {
  // Depend on usageStatsVersion to trigger re-computation
  usageStatsVersion.value; // eslint-disable-line no-unused-expressions

  if (localProvider.value === 'groq-free') {
    return getUsageStats();
  }
  return null;
});

// Watch for changes to detect unsaved state
watch([localProvider, localBaseUrl, localApiKey, localModel, localTimeout], () => {
  const savedBaseUrl = settings.provider === 'ollama' ? settings.baseUrl : '';
  const savedApiKey = settings.provider === 'groq' ? settings.apiKey : '';

  hasUnsavedChanges.value =
    localProvider.value !== settings.provider ||
    localBaseUrl.value !== savedBaseUrl ||
    localApiKey.value !== savedApiKey ||
    localModel.value !== settings.model ||
    localTimeout.value !== settings.timeout;

  // Clear API key error when user edits the key
  if (apiKeyError.value) {
    apiKeyError.value = '';
  }
});

// Reset fields when provider changes
watch(localProvider, (newProvider) => {
  const config = getProviderConfig(newProvider);
  localModel.value = config.defaultModel;
  apiKeyError.value = '';

  if (newProvider === 'ollama') {
    localBaseUrl.value = 'http://localhost:11434/v1/';
    localApiKey.value = '';
  } else if (newProvider === 'groq-free') {
    localApiKey.value = '';
    localBaseUrl.value = '';
  } else if (newProvider === 'groq') {
    // Pre-fill saved key if switching back to groq
    localApiKey.value = settings.provider === 'groq' ? settings.apiKey : '';
    localBaseUrl.value = '';
  } else {
    localApiKey.value = '';
  }

  resetConnectionStatus();
});

// Test connection handler
async function handleTestConnection() {
  // Update settings temporarily for test
  updateSettings({
    provider: localProvider.value,
    baseUrl: localBaseUrl.value,
    apiKey: localApiKey.value,
    model: localModel.value,
    timeout: localTimeout.value,
  } as any);

  const success = await testConnection();

  if (success && localProvider.value === 'ollama') {
    // Also try to load models on successful Ollama connection
    try {
      await loadModels();
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  }
}

// Refresh models handler (Ollama only)
async function handleRefreshModels() {
  try {
    await loadModels();
  } catch (error: any) {
    alert(error.message || 'Failed to load models');
  }
}

// Save settings handler
function handleSave() {
  // Validate API key for groq provider
  if (localProvider.value === 'groq') {
    if (!localApiKey.value.trim()) {
      apiKeyError.value = 'Please enter your Groq API key before saving.';
      return;
    }
    if (!localApiKey.value.startsWith('gsk_')) {
      apiKeyError.value = 'Groq keys start with gsk_ — please check your key.';
      return;
    }
  }

  updateSettings({
    provider: localProvider.value,
    baseUrl: localBaseUrl.value,
    apiKey: localApiKey.value,
    model: localModel.value,
    timeout: localTimeout.value,
  } as any);
  hasUnsavedChanges.value = false;
  apiKeyError.value = '';
  emit('update:modelValue', false);
}

// Cancel handler
function handleCancel() {
  // Reset local form to saved settings
  localProvider.value = settings.provider;
  localBaseUrl.value = settings.provider === 'ollama' ? settings.baseUrl : 'http://localhost:11434/v1/';
  localApiKey.value = settings.provider === 'groq' ? settings.apiKey : '';
  localModel.value = settings.model;
  localTimeout.value = settings.timeout;
  hasUnsavedChanges.value = false;
  apiKeyError.value = '';
  resetConnectionStatus();
  emit('update:modelValue', false);
}

// Load models when modal opens (Ollama only)
watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen && localProvider.value === 'ollama' && availableModels.value.length === 0) {
      try {
        await loadModels();
      } catch (error) {
        // Silently fail - user can manually refresh
        console.error('Failed to load models on open:', error);
      }
    }
  }
);

// Listen for usage updates from API calls
function handleUsageUpdate() {
  usageStatsVersion.value++;
}

onMounted(() => {
  window.addEventListener('free-tier-usage-updated', handleUsageUpdate);
});

onUnmounted(() => {
  window.removeEventListener('free-tier-usage-updated', handleUsageUpdate);
});
</script>

<template>
  <div v-if="modelValue" class="modal-overlay" @click="handleCancel">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <h2>LLM Settings</h2>
        <button @click="handleCancel" class="close-button" aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 6L6 18M6 6L18 18"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>

      <div class="modal-content">
        <!-- Reading History -->
        <div class="readings-history-section">
          <div class="readings-history-info">
            <span class="readings-history-label">Reading History</span>
            <span class="readings-history-count">{{ props.readingsCount }} {{ props.readingsCount === 1 ? 'reading' : 'readings' }}</span>
          </div>
          <button
            class="view-history-button"
            @click="() => { emit('viewHistory'); emit('update:modelValue', false); }"
          >
            View All Readings →
          </button>
        </div>

        <!-- Appearance -->
        <div class="form-group">
          <label>Appearance</label>
          <button @click="emit('toggleDark')" class="theme-toggle-button">
            <span>{{ props.isDark ? '☀️' : '🌙' }}</span>
            <span>{{ props.isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode' }}</span>
          </button>
        </div>

        <!-- Feedback -->
        <div class="feedback-row">
          <button
            class="feedback-link-button"
            @click="() => { emit('feedback'); emit('update:modelValue', false); }"
          >
            ✉ Send Feedback
          </button>
        </div>

        <!-- LLM Settings -->
        <div class="llm-settings-section">
          <h3 class="section-title">LLM Settings</h3>
          <div class="llm-settings-content">
            <!-- Provider Selection -->
            <div class="form-group">
              <label for="provider">LLM Provider</label>
              <select
                id="provider"
                v-model="localProvider"
                class="form-select"
              >
                <option
                  v-for="(config, key) in PROVIDER_CONFIGS"
                  :key="key"
                  :value="key"
                  :disabled="config.id === 'ollama' && !canOllama"
                >
                  {{ config.name }}
                  <span v-if="config.id === 'ollama' && !canOllama"> (Not available on deployed sites)</span>
                </option>
              </select>
              <p class="form-help">
                {{ currentProviderConfig.description }}
              </p>
            </div>

            <!-- Ollama-specific: Base URL -->
            <div v-if="localProvider === 'ollama'" class="form-group">
              <label for="base-url">Base URL</label>
              <input
                id="base-url"
                v-model="localBaseUrl"
                type="text"
                class="form-input"
                placeholder="http://localhost:11434/v1/"
              />
              <p class="form-help">
                URL of your Ollama server (include /v1/ suffix for OpenAI compatibility)
              </p>
            </div>

            <!-- Free Tier Usage Stats -->
            <div v-if="localProvider === 'groq-free' && usageStats" class="usage-stats">
              <h3>Usage This Period</h3>
              <div class="usage-stat">
                <span class="stat-label">Hourly Requests:</span>
                <span class="stat-value">
                  {{ usageStats.hourlyRequestsUsed }} / 10
                </span>
              </div>
              <div class="usage-stat">
                <span class="stat-label">Daily Tokens:</span>
                <span class="stat-value">
                  {{ usageStats.dailyTokensUsed.toLocaleString() }} / 10,000,000
                  ({{ usageStats.dailyTokensPercentUsed.toFixed(1) }}%)
                </span>
              </div>
              <div class="usage-stat">
                <span class="stat-label">Total Requests:</span>
                <span class="stat-value">{{ usageStats.totalRequests }}</span>
              </div>
              <div class="usage-stat">
                <span class="stat-label">Total Tokens Used:</span>
                <span class="stat-value">{{ usageStats.totalTokensUsed.toLocaleString() }}</span>
              </div>
              <div v-if="usageStats.dailyTokensPercentUsed >= 80" class="usage-warning">
                ⚠️ You've used {{ usageStats.dailyTokensPercentUsed.toFixed(0) }}% of your daily quota. Switch to <strong>Groq (Your API Key)</strong> in the provider dropdown above, or sign up for a free key at <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" class="help-link">console.groq.com/keys</a>.
              </div>
            </div>

            <!-- API Key field (for providers that require it, e.g. groq) -->
            <div v-if="currentProviderConfig.requiresApiKey" class="form-group">
              <label for="api-key">API Key</label>
              <div class="api-key-input-group">
                <input
                  id="api-key"
                  v-model="localApiKey"
                  :type="showApiKey ? 'text' : 'password'"
                  class="form-input"
                  :class="{ 'input-error': apiKeyError }"
                  :placeholder="currentProviderConfig.apiKeyPlaceholder"
                  autocomplete="off"
                />
                <button
                  @click="showApiKey = !showApiKey"
                  class="toggle-visibility-button"
                  type="button"
                  :aria-label="showApiKey ? 'Hide API key' : 'Show API key'"
                >
                  <span v-if="showApiKey">👁️</span>
                  <span v-else>🔒</span>
                </button>
              </div>
              <p v-if="apiKeyError" class="form-error">{{ apiKeyError }}</p>
              <p class="form-help">
                Get your free API key from
                <a
                  :href="currentProviderConfig.getApiKeyUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="help-link"
                >
                  console.groq.com/keys
                </a>
              </p>
              <p class="form-help security-notice">
                Your key is stored in your browser only and sent directly to Groq via our proxy. It is never logged or shared.
              </p>
            </div>

            <!-- Model Selection -->
            <div class="form-group">
              <label for="model">Model</label>
              <div class="model-input-group">
                <select
                  v-if="localProvider === 'ollama' && availableModels.length > 0"
                  id="model"
                  v-model="localModel"
                  class="form-select"
                >
                  <option v-for="model in availableModels" :key="model" :value="model">
                    {{ model }}
                  </option>
                </select>
                <select
                  v-else-if="localProvider !== 'ollama'"
                  id="model"
                  v-model="localModel"
                  class="form-select"
                >
                  <option
                    v-for="model in currentProviderConfig.suggestedModels"
                    :key="model"
                    :value="model"
                  >
                    {{ model }}
                  </option>
                </select>
                <input
                  v-else
                  id="model"
                  v-model="localModel"
                  type="text"
                  class="form-input"
                  :placeholder="currentProviderConfig.defaultModel"
                />
                <button
                  v-if="localProvider === 'ollama'"
                  @click="handleRefreshModels"
                  :disabled="isLoadingModels"
                  class="refresh-button"
                  title="Refresh models"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    :class="{ spinning: isLoadingModels }"
                  >
                    <path
                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                    />
                  </svg>
                </button>
              </div>
              <p class="form-help">
                {{ localProvider === 'ollama' ? 'Select or enter the Ollama model to use' : 'Select a model from the suggested options' }}
              </p>
            </div>

            <!-- Timeout -->
            <div class="form-group">
              <label for="timeout">Timeout (ms)</label>
              <input
                id="timeout"
                v-model.number="localTimeout"
                type="number"
                min="5000"
                max="120000"
                step="1000"
                class="form-input"
              />
              <p class="form-help">
                Request timeout in milliseconds (5000-120000)
              </p>
            </div>

            <!-- Connection Test -->
            <div class="connection-test">
              <button
                @click="handleTestConnection"
                :disabled="isTestingConnection"
                class="test-button"
              >
                {{ isTestingConnection ? 'Testing...' : 'Test Connection' }}
              </button>
              <div v-if="connectionStatus !== 'idle'" class="connection-status">
                <span
                  :class="[
                    'status-badge',
                    connectionStatus === 'success' ? 'success' :
                    connectionStatus === 'error' ? 'error' :
                    'testing'
                  ]"
                >
                  {{ connectionStatus === 'success' ? 'Connected' :
                     connectionStatus === 'error' ? 'Failed' :
                     'Testing...' }}
                </span>
                <span class="status-message">{{ connectionMessage }}</span>
              </div>
            </div>

            <!-- Provider-specific help -->
            <div v-if="localProvider === 'ollama'" class="help-section">
              <p>
                Don't have Ollama installed?
                <a
                  href="https://ollama.com/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="help-link"
                >
                  Download Ollama
                </a>
              </p>
              <p class="form-help">
                After installing, run <code>ollama pull {{ localModel }}</code> to download the model.
              </p>
            </div>

            <div v-else-if="localProvider === 'groq-free'" class="help-section">
              <h4 style="margin-top: 0; color: var(--color-text-primary);">Shared (Groq)</h4>
              <p class="form-help">
                Try the app with Groq's lightning-fast free tier using our shared API key:
              </p>
              <ul style="margin: 0.5rem 0; padding-left: 1.5rem; color: var(--color-text-secondary); font-size: 0.875rem;">
                <li><strong>10 requests per hour</strong> (fair usage for everyone)</li>
                <li><strong>10M tokens per day</strong> (very generous)</li>
                <li><strong>Extremely fast responses</strong> (typically &lt;1 second)</li>
                <li>Default: Qwen 3 32B — Llama 3.3 70B and others also available</li>
              </ul>
              <p class="form-help" style="margin-top: 0.75rem;">
                Want even more? Get your own free
                <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" class="help-link">Groq API key</a>
                for the same great performance without sharing limits.
              </p>
            </div>

            <div v-else-if="localProvider === 'groq'" class="help-section">
              <h4 style="margin-top: 0; color: var(--color-text-primary);">Personal (Groq)</h4>
              <p class="form-help">
                Use your own Groq API key for personal limits — no sharing with other app users:
              </p>
              <ul style="margin: 0.5rem 0; padding-left: 1.5rem; color: var(--color-text-secondary); font-size: 0.875rem;">
                <li><strong>Your own personal rate limits</strong> — independent from other users</li>
                <li><strong>Access to all Groq models</strong> including the latest releases</li>
                <li><strong>Free Groq accounts</strong> include generous personal quotas</li>
              </ul>
              <p class="form-help" style="margin-top: 0.75rem;">
                Get a free API key at
                <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" class="help-link">console.groq.com/keys</a>
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Danger zone -->
      <div class="danger-zone">
        <div class="danger-divider"></div>
        <button
          class="delete-all-readings-button"
          @click="showDeleteAllConfirm = true"
        >
          🗑 Delete all readings
        </button>
      </div>

      <!-- Colophon: copyright + GitHub link -->
      <div class="settings-colophon">
        <span>© {{ currentYear }} aditiohri</span>
        <a
          href="https://github.com/aditiohri/horary"
          target="_blank"
          rel="noopener"
          class="settings-github-link"
          aria-label="View on GitHub"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836a9.59 9.59 0 012.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.741 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
          </svg>
          GitHub
        </a>
      </div>

      <div class="modal-footer">
        <div class="action-buttons">
          <button @click="handleCancel" class="cancel-button">
            Cancel
          </button>
          <button
            @click="handleSave"
            :disabled="!hasUnsavedChanges"
            class="save-button"
          >
            Save
          </button>
        </div>
      </div>
    </div>

    <!-- Delete all confirmation dialog -->
    <div
      v-if="showDeleteAllConfirm"
      class="confirm-overlay"
      @click.self="showDeleteAllConfirm = false"
    >
      <div class="confirm-dialog" @click.stop>
        <h3 class="confirm-title">Delete all readings?</h3>
        <p class="confirm-body">
          This will permanently delete all {{ props.readingsCount }}
          {{ props.readingsCount === 1 ? 'reading' : 'readings' }}.
          This cannot be undone.
        </p>
        <div class="confirm-actions">
          <button
            class="confirm-cancel-button"
            @click="showDeleteAllConfirm = false"
          >
            Cancel
          </button>
          <button
            class="confirm-delete-button"
            @click="() => { emit('deleteAll'); showDeleteAllConfirm = false; emit('update:modelValue', false); }"
          >
            Delete all
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal {
  position: relative;
  background: var(--color-surface);
  border-radius: 0.75rem;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h2 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 1.5rem;
}

.close-button {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  color: var(--color-text-secondary);
  border-radius: 0.5rem;
  transition: background-color 0.2s;
}

.close-button:hover {
  background: var(--color-bg-hover);
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: var(--color-text-primary);
  font-size: 0.875rem;
}

.form-input,
.form-select {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid var(--color-border);
  border-radius: 0.5rem;
  font-size: 1rem;
  background: var(--color-bg);
  color: var(--color-text-primary);
  transition: border-color 0.2s;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--color-accent);
}

.form-input.input-error {
  border-color: var(--color-error);
}

.form-help {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin: 0;
}

.form-help code {
  background: var(--color-surface-raised);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-family: monospace;
  font-size: 0.875em;
}

.form-error {
  font-size: 0.75rem;
  color: var(--color-error);
  margin: 0;
}

.security-notice {
  margin-top: 0.25rem;
}

.api-key-input-group {
  display: flex;
  gap: 0.5rem;
}

.api-key-input-group .form-input {
  flex: 1;
}

.toggle-visibility-button {
  background: var(--color-surface-raised);
  border: 2px solid var(--color-border);
  padding: 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 1.25rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 3rem;
}

.toggle-visibility-button:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-accent);
}

.model-input-group {
  display: flex;
  gap: 0.5rem;
}

.model-input-group .form-input,
.model-input-group .form-select {
  flex: 1;
}

.refresh-button {
  background: var(--color-surface-raised);
  border: 2px solid var(--color-border);
  padding: 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  color: var(--color-text-primary);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.refresh-button:hover:not(:disabled) {
  background: var(--color-bg-hover);
  border-color: var(--color-accent);
}

.refresh-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.refresh-button svg.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.connection-test {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--color-surface-raised);
  border-radius: 0.5rem;
}

.test-button {
  background: var(--color-accent);
  color: var(--color-text-inverse);
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.test-button:hover:not(:disabled) {
  filter: brightness(0.9);
}

.test-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-badge.success {
  background: var(--color-success);
  color: white;
}

.status-badge.error {
  background: var(--color-error);
  color: white;
}

.status-badge.testing {
  background: var(--color-warning);
  color: white;
}

.status-message {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.help-section {
  padding: 1rem;
  background: var(--color-surface-raised);
  border-radius: 0.5rem;
  border: 1px solid var(--color-border);
}

.help-section p {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.help-section p:last-child {
  margin-bottom: 0;
}

.help-link {
  color: var(--color-accent);
  text-decoration: none;
  font-weight: 500;
}

.help-link:hover {
  text-decoration: underline;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 1.5rem;
  border-top: 1px solid var(--color-border);
}

.action-buttons {
  display: flex;
  gap: 0.75rem;
}

.cancel-button {
  background: var(--color-surface-raised);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-button:hover {
  background: var(--color-bg-hover);
}

.save-button {
  background: var(--color-success);
  color: var(--color-text-inverse);
  border: none;
  padding: 0.5rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.save-button:hover:not(:disabled) {
  filter: brightness(0.9);
}

.save-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Free tier usage stats */
.usage-stats {
  padding: 1rem;
  background: var(--color-surface-raised);
  border-radius: 0.5rem;
  border: 1px solid var(--color-border);
}

.usage-stats h3 {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.usage-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border);
}

.usage-stat:last-of-type {
  border-bottom: none;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.stat-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.usage-warning {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-warning);
  line-height: 1.5;
}

/* Reading History section at top of settings */
.readings-history-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.875rem 1rem;
  background: var(--color-surface-raised);
  border-radius: 0.5rem;
  border: 1px solid var(--color-border);
}

.readings-history-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.readings-history-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.readings-history-count {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.view-history-button {
  background: none;
  border: none;
  padding: 0;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--color-accent);
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: color 0.2s ease;
}

.view-history-button:hover {
  color: var(--color-accent-hover);
  text-decoration: underline;
}

/* Theme toggle button */
.theme-toggle-button {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  padding: 0.625rem 0.875rem;
  font-size: 0.9375rem;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  width: 100%;
}

.theme-toggle-button:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-accent);
}

/* Collapsible section */
.llm-settings-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  border-top: 1px solid var(--color-border);
  padding-top: 0.5rem;
}

.section-title {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.llm-settings-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Feedback row */
.feedback-row {
  display: flex;
}

.feedback-link-button {
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  padding: 0.5rem 0.875rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.feedback-link-button:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
  border-color: var(--color-accent);
}

/* Mobile: render as bottom sheet */
@media (max-width: 1023px) {
  .modal-overlay {
    align-items: flex-end;
    padding: 0;
  }

  .modal {
    border-radius: 1rem 1rem 0 0;
    max-width: 100%;
    width: 100%;
    max-height: 90vh;
  }

  .modal-header,
  .modal-content,
  .modal-footer {
    padding: 1rem;
  }

  .modal-header h2 {
    font-size: 1.25rem;
  }

  .modal-footer {
    padding-bottom: calc(1rem + env(safe-area-inset-bottom));
  }

  .action-buttons {
    width: 100%;
    flex-direction: column;
  }

  .cancel-button,
  .save-button {
    width: 100%;
  }
}

/* ─── Colophon ────────────────────────────────────────────── */
.settings-colophon {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem 0.25rem;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  letter-spacing: 0.02em;
}

.settings-github-link {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--color-text-muted);
  text-decoration: none;
  transition: color 0.2s ease;
}

.settings-github-link:hover {
  color: var(--color-accent);
}

/* ─── Danger zone ─────────────────────────────────────────── */
.danger-zone {
  padding: 0 1rem 0.25rem;
}

.danger-divider {
  height: 1px;
  background: var(--color-border);
  margin-bottom: 0.875rem;
}

.delete-all-readings-button {
  background: none;
  border: none;
  padding: 0.375rem 0;
  cursor: pointer;
  color: var(--color-error);
  font-size: 0.875rem;
  font-family: inherit;
  transition: opacity 0.2s;
}

.delete-all-readings-button:hover {
  opacity: 0.75;
}

/* ─── Delete-all confirmation dialog ─────────────────────── */
.confirm-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  z-index: 10;
  padding: 1.5rem;
}

.confirm-dialog {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  padding: 1.5rem;
  width: 100%;
  max-width: 22rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}

.confirm-title {
  margin: 0 0 0.625rem 0;
  font-size: 1.1rem;
  color: var(--color-text-primary);
}

.confirm-body {
  margin: 0 0 1.5rem 0;
  color: var(--color-text-secondary);
  font-size: 0.9375rem;
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* Cancel is the dominant / easy-to-tap option */
.confirm-cancel-button {
  flex: 1;
  background: var(--color-surface-raised);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  padding: 0.625rem 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.9375rem;
  font-family: inherit;
  font-weight: 500;
  transition: background-color 0.2s;
}

.confirm-cancel-button:hover {
  background: var(--color-bg-hover);
}

/* Delete is smaller / visually subordinate for friction */
.confirm-delete-button {
  background: none;
  color: var(--color-error);
  border: 1px solid var(--color-error);
  padding: 0.5rem 0.875rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.8125rem;
  font-family: inherit;
  transition: background-color 0.2s, opacity 0.2s;
  white-space: nowrap;
}

.confirm-delete-button:hover {
  background: rgba(197, 32, 32, 0.08);
}
</style>
