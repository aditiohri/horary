<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

type FeedbackType = 'bug' | 'feature' | 'feedback';
type ModalState = 'idle' | 'submitting' | 'success' | 'error';

const feedbackType = ref<FeedbackType>('feedback');
const title = ref('');
const details = ref('');
const state = ref<ModalState>('idle');
const errorMessage = ref('');
const issueUrl = ref('');

function close() {
  emit('update:modelValue', false);
}

// Reset form after modal closes
watch(() => props.modelValue, (open) => {
  if (!open) {
    setTimeout(() => {
      feedbackType.value = 'feedback';
      title.value = '';
      details.value = '';
      state.value = 'idle';
      errorMessage.value = '';
      issueUrl.value = '';
    }, 300);
  }
});

async function submit() {
  if (title.value.trim().length < 5) {
    errorMessage.value = 'Title must be at least 5 characters.';
    return;
  }
  state.value = 'submitting';
  errorMessage.value = '';

  try {
    const response = await fetch('/.netlify/functions/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: feedbackType.value,
        title: title.value.trim(),
        body: details.value.trim(),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      errorMessage.value = data.error || 'Failed to submit feedback.';
      state.value = 'error';
      return;
    }
    issueUrl.value = data.issueUrl;
    state.value = 'success';
  } catch {
    errorMessage.value = 'Network error — please check your connection and try again.';
    state.value = 'error';
  }
}
</script>

<template>
  <div v-if="modelValue" class="modal-overlay" @click="close">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <h2>Send Feedback</h2>
        <button class="modal-close" @click="close" aria-label="Close">✕</button>
      </div>

      <div class="modal-content">
        <!-- Success state -->
        <div v-if="state === 'success'" class="success-state">
          <div class="success-icon">✓</div>
          <p class="success-message">Thanks for your feedback!</p>
          <p class="success-sub">
            Your submission was recorded as a GitHub issue.
            <a v-if="issueUrl" :href="issueUrl" target="_blank" rel="noopener noreferrer">View it here →</a>
          </p>
          <button class="btn-primary" @click="close">Close</button>
        </div>

        <!-- Form state -->
        <form v-else @submit.prevent="submit">
          <div class="form-group">
            <label for="feedback-type">Type</label>
            <select id="feedback-type" v-model="feedbackType" class="form-select" :disabled="state === 'submitting'">
              <option value="bug">Bug report</option>
              <option value="feature">Feature request</option>
              <option value="feedback">General feedback</option>
            </select>
          </div>

          <div class="form-group">
            <label for="feedback-title">
              Title <span class="required">*</span>
              <span class="char-count">{{ title.length }}/100</span>
            </label>
            <input
              id="feedback-title"
              v-model="title"
              type="text"
              class="form-input"
              placeholder="Brief summary…"
              maxlength="100"
              :disabled="state === 'submitting'"
              required
            />
          </div>

          <div class="form-group">
            <label for="feedback-details">
              Details
              <span class="char-count">{{ details.length }}/2000</span>
            </label>
            <textarea
              id="feedback-details"
              v-model="details"
              class="form-textarea"
              placeholder="Describe the bug, idea, or feedback…"
              maxlength="2000"
              rows="5"
              :disabled="state === 'submitting'"
            />
          </div>

          <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>

          <div class="form-actions">
            <button type="button" class="btn-secondary" @click="close" :disabled="state === 'submitting'">Cancel</button>
            <button type="submit" class="btn-primary" :disabled="state === 'submitting' || title.trim().length < 5">
              <span v-if="state === 'submitting'">Submitting…</span>
              <span v-else>Submit</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  width: 100%;
  max-width: 28rem;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.modal-header h2 {
  font-size: 1.125rem;
  color: var(--color-text-primary);
}

.modal-close {
  background: none;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  transition: color 0.2s;
}

.modal-close:hover {
  color: var(--color-text-primary);
}

.modal-content {
  padding: 1.25rem;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 0.375rem;
}

.required {
  color: var(--color-error);
}

.char-count {
  margin-left: auto;
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--color-text-tertiary);
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 0.875rem;
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--color-border-focus);
}

.form-input:disabled,
.form-select:disabled,
.form-textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-textarea {
  resize: vertical;
  min-height: 7rem;
}

.form-error {
  color: var(--color-error);
  font-size: 0.8125rem;
  margin-bottom: 0.75rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.btn-primary {
  background: var(--color-accent);
  color: var(--color-text-inverse);
  border: none;
  border-radius: 0.5rem;
  padding: 0.5rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  padding: 0.5rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-bg-hover);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Success state */
.success-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 1rem 0;
  gap: 0.75rem;
}

.success-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: var(--color-success);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: bold;
}

.success-message {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.success-sub {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.success-sub a {
  color: var(--color-accent);
  text-decoration: none;
}

.success-sub a:hover {
  text-decoration: underline;
}
</style>
