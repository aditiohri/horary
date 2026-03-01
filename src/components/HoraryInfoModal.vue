<script setup lang="ts">
defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const close = () => emit('update:modelValue', false);
</script>

<template>
  <div v-if="modelValue" class="modal-overlay" @click="close">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <h2>What is Horary Astrology?</h2>
        <button @click="close" class="close-button" aria-label="Close">✕</button>
      </div>

      <div class="modal-content">
        <p>
          Horary astrology answers specific questions by casting a chart for the exact moment you ask.
          The positions of the planets and Moon at that moment are interpreted as a direct response.
        </p>

        <p>
          It works best with focused, present-tense questions where the outcome is still uncertain —
          <em>"Will this job offer come through?"</em>, <em>"Is now the right time to move?"</em> —
          rather than broad life-direction questions.
        </p>

        <p>
          Think of it as a reflective tool: a structured way to examine a situation from a fresh
          angle, not a prediction machine.
        </p>

        <p class="tradition-note">
          <strong>Rooted in tradition.</strong> Horary has parallels across astrological traditions —
          known as <em>Prashna</em> in Vedic astrology, it also developed through Babylonian, Islamic,
          and Medieval European practice. William Lilly's <em>Christian Astrology</em> (1647) remains
          a widely studied Western text.
        </p>
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
  max-width: 520px;
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
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h2 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 1.25rem;
}

.close-button {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  color: var(--color-text-secondary);
  border-radius: 0.5rem;
  transition: background-color 0.2s;
  font-size: 1rem;
  line-height: 1;
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
  gap: 1rem;
}

.modal-content p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.9375rem;
  line-height: 1.65;
}

.tradition-note {
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
  color: var(--color-text-tertiary) !important;
  font-size: 0.875rem !important;
}
</style>
