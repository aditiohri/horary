<script setup lang="ts">
import { ref, watch } from 'vue';
import { useOllamaSettings } from '../composables/useOllamaSettings';
import { DEFAULT_SETTINGS } from '../utils/ollama';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

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
} = useOllamaSettings();

// Local form state
const localBaseUrl = ref(settings.baseUrl);
const localModel = ref(settings.model);
const localTimeout = ref(settings.timeout);
const hasUnsavedChanges = ref(false);

// Watch for changes to detect unsaved state
watch([localBaseUrl, localModel, localTimeout], () => {
  hasUnsavedChanges.value =
    localBaseUrl.value !== settings.baseUrl ||
    localModel.value !== settings.model ||
    localTimeout.value !== settings.timeout;
});

// Test connection handler
async function handleTestConnection() {
  // Update settings temporarily for test
  updateSettings({
    baseUrl: localBaseUrl.value,
    model: localModel.value,
    timeout: localTimeout.value,
  });

  const success = await testConnection();

  if (success) {
    // Also try to load models on successful connection
    try {
      await loadModels();
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  }
}

// Refresh models handler
async function handleRefreshModels() {
  try {
    await loadModels();
  } catch (error: any) {
    alert(error.message || 'Failed to load models');
  }
}

// Save settings handler
function handleSave() {
  updateSettings({
    baseUrl: localBaseUrl.value,
    model: localModel.value,
    timeout: localTimeout.value,
  });
  hasUnsavedChanges.value = false;
  emit('update:modelValue', false);
}

// Cancel handler
function handleCancel() {
  // Reset local form to saved settings
  localBaseUrl.value = settings.baseUrl;
  localModel.value = settings.model;
  localTimeout.value = settings.timeout;
  hasUnsavedChanges.value = false;
  resetConnectionStatus();
  emit('update:modelValue', false);
}

// Reset to defaults
function handleResetToDefaults() {
  localBaseUrl.value = DEFAULT_SETTINGS.baseUrl;
  localModel.value = DEFAULT_SETTINGS.model;
  localTimeout.value = DEFAULT_SETTINGS.timeout;
  hasUnsavedChanges.value = true;
}

// Load models when modal opens
watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen && availableModels.value.length === 0) {
      try {
        await loadModels();
      } catch (error) {
        // Silently fail - user can manually refresh
        console.error('Failed to load models on open:', error);
      }
    }
  }
);
</script>

<template>
  <div v-if="modelValue" class="modal-overlay" @click="handleCancel">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <h2>Ollama Settings</h2>
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
        <!-- Base URL -->
        <div class="form-group">
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

        <!-- Model -->
        <div class="form-group">
          <label for="model">Model</label>
          <div class="model-input-group">
            <select
              v-if="availableModels.length > 0"
              id="model"
              v-model="localModel"
              class="form-select"
            >
              <option v-for="model in availableModels" :key="model.name" :value="model.name">
                {{ model.name }}
              </option>
            </select>
            <input
              v-else
              id="model"
              v-model="localModel"
              type="text"
              class="form-input"
              placeholder="llama3.2:latest"
            />
            <button
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
            Select or enter the Ollama model to use
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

        <!-- Installation Guide Link -->
        <div class="help-section">
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
      </div>

      <div class="modal-footer">
        <button @click="handleResetToDefaults" class="reset-button">
          Reset to Defaults
        </button>
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
  background: var(--color-bg-secondary);
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
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  transition: border-color 0.2s;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--color-accent);
}

.form-help {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  margin: 0;
}

.form-help code {
  background: var(--color-bg-tertiary);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-family: monospace;
  font-size: 0.875em;
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
  background: var(--color-bg-tertiary);
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
  background: var(--color-bg-tertiary);
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
  background: var(--color-bg-tertiary);
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
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-top: 1px solid var(--color-border);
}

.action-buttons {
  display: flex;
  gap: 0.75rem;
}

.reset-button {
  background: transparent;
  color: var(--color-text-tertiary);
  border: 1px solid var(--color-border);
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.reset-button:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.cancel-button {
  background: var(--color-bg-tertiary);
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

/* Mobile optimizations */
@media (max-width: 640px) {
  .modal {
    max-height: 95vh;
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
    flex-direction: column;
    gap: 0.75rem;
  }

  .action-buttons {
    width: 100%;
  }

  .reset-button,
  .cancel-button,
  .save-button {
    width: 100%;
  }
}
</style>
