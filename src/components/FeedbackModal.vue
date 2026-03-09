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

const imageFile = ref<File | null>(null);
const imagePreviewUrl = ref<string>('');
const imageError = ref<string>('');
const fileInputRef = ref<HTMLInputElement | null>(null);

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_BYTES = 1 * 1024 * 1024; // 1 MB

function close() {
  emit('update:modelValue', false);
}

function onFileChange(event: Event) {
  imageError.value = '';
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    imageError.value = 'Only JPEG, PNG, GIF, and WebP images are allowed.';
    input.value = '';
    return;
  }
  if (file.size > MAX_BYTES) {
    imageError.value = 'Image must be 1 MB or smaller.';
    input.value = '';
    return;
  }
  imageFile.value = file;
  imagePreviewUrl.value = URL.createObjectURL(file);
}

function removeImage() {
  imageFile.value = null;
  if (imagePreviewUrl.value) URL.revokeObjectURL(imagePreviewUrl.value);
  imagePreviewUrl.value = '';
  imageError.value = '';
  if (fileInputRef.value) fileInputRef.value.value = '';
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
      removeImage();
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

  let imagePayload: { base64: string; mimeType: string } | undefined;
  if (imageFile.value) {
    try {
      const base64 = await fileToBase64(imageFile.value);
      imagePayload = { base64, mimeType: imageFile.value.type };
    } catch {
      errorMessage.value = 'Failed to read the image file. Please try again.';
      state.value = 'error';
      return;
    }
  }

  try {
    const response = await fetch('/.netlify/functions/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: feedbackType.value,
        title: title.value.trim(),
        body: details.value.trim(),
        ...(imagePayload && { image: imagePayload }),
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

          <div class="form-group">
            <label>
              Screenshot
              <span class="char-count">optional</span>
            </label>
            <div v-if="!imageFile" class="file-drop-zone">
              <input
                ref="fileInputRef"
                id="feedback-image"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                class="file-input-hidden"
                :disabled="state === 'submitting'"
                @change="onFileChange"
              />
              <label for="feedback-image" class="file-drop-label" :class="{ disabled: state === 'submitting' }">
                Attach a screenshot (JPEG, PNG, GIF, WebP · max 1 MB)
              </label>
            </div>
            <div v-else class="image-preview">
              <img :src="imagePreviewUrl" alt="Screenshot preview" class="preview-img" />
              <button
                type="button"
                class="remove-image"
                :disabled="state === 'submitting'"
                @click="removeImage"
                aria-label="Remove image"
              >✕</button>
            </div>
            <p v-if="imageError" class="form-error image-error">{{ imageError }}</p>
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
  background: var(--color-surface);
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
  color: var(--color-text-muted);
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
  color: var(--color-text-muted);
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  background: var(--color-bg);
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
  background: var(--color-surface-raised);
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

.file-drop-zone {
  position: relative;
}

.file-input-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.file-drop-label {
  display: block;
  padding: 0.625rem 0.75rem;
  border: 1px dashed var(--color-border);
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  cursor: pointer;
  text-align: center;
  transition: border-color 0.2s, color 0.2s;
}

.file-drop-label:not(.disabled):hover {
  border-color: var(--color-border-focus);
  color: var(--color-text-secondary);
}

.file-drop-label.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.image-preview {
  position: relative;
  display: inline-flex;
}

.preview-img {
  max-width: 100%;
  max-height: 10rem;
  border-radius: 0.375rem;
  border: 1px solid var(--color-border);
  object-fit: contain;
  display: block;
}

.remove-image {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  background: rgba(0, 0, 0, 0.55);
  color: white;
  border: none;
  border-radius: 50%;
  width: 1.375rem;
  height: 1.375rem;
  font-size: 0.6875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.remove-image:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.image-error {
  margin-top: 0.375rem;
  margin-bottom: 0;
}
</style>
