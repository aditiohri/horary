<script setup lang="ts">
import { ref, onMounted } from 'vue';
import UserChat from "./components/UserChat.vue";
import ReadingHistory from "./components/ReadingHistory.vue";
import LLMSettings from "./components/LLMSettings.vue";
import HoraryInfoModal from "./components/HoraryInfoModal.vue";
import FeedbackModal from "./components/FeedbackModal.vue";
import { readingStorage, decodeReadingFromUrl, type StoredReading } from './utils/storage';
import { useDarkMode } from './composables/useDarkMode';

type AppView = 'chat' | 'history';

const currentView = ref<AppView>('chat');
const selectedHistoryReading = ref<StoredReading | null>(null);
const chatResetKey = ref(0); // Used to force UserChat component to reset
const { isDark, toggleDarkMode } = useDarkMode();
const showSettings = ref(false);
const showHoraryInfo = ref(false);
const showFeedback = ref(false);

const showHistory = () => {
  currentView.value = 'history';
};

const showChat = () => {
  currentView.value = 'chat';
  selectedHistoryReading.value = null;
  // Increment key to force UserChat to reset, clearing any existing chart data
  chatResetKey.value++;
};

const handleSelectReading = (reading: StoredReading) => {
  selectedHistoryReading.value = reading;
  currentView.value = 'chat';
};

const storageStats = readingStorage.getStorageStats();

onMounted(async () => {
  const sharedReading = await decodeReadingFromUrl();
  if (sharedReading) {
    readingStorage.importReading(sharedReading);
    selectedHistoryReading.value = sharedReading;
    // Remove the ?share= param from the URL without a page reload
    const url = new URL(window.location.href);
    url.searchParams.delete("share");
    window.history.replaceState({}, "", url.toString());
  }
});
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-content">
        <div class="title-group">
          <h1>Horary Astrology</h1>
          <button
            class="info-tag"
            @click="showHoraryInfo = true"
            aria-label="Learn more about horary astrology"
          >Learn more</button>
        </div>
        <div class="header-actions">
          <nav class="header-nav">
            <button
              @click="showChat"
              :class="['nav-button', { active: currentView === 'chat' }]"
            >
              New Reading
            </button>
            <button
              @click="showHistory"
              :class="['nav-button', { active: currentView === 'history' }]"
            >
              History
              <span v-if="storageStats.totalReadings > 0" class="history-count">
                {{ storageStats.totalReadings }}
              </span>
            </button>
          </nav>
          <button
            @click="showFeedback = true"
            class="feedback-button"
            aria-label="Send feedback"
            title="Send feedback"
          >Feedback</button>
          <button
            @click="showSettings = true"
            class="settings-button"
            aria-label="Settings"
            title="Ollama Settings"
          >
            ⚙️
          </button>
          <button
            @click="toggleDarkMode"
            class="dark-mode-toggle"
            :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            <span v-if="isDark">☀️</span>
            <span v-else>🌙</span>
          </button>
        </div>
      </div>
    </header>

    <main class="app-main">
      <UserChat
        v-if="currentView === 'chat'"
        :key="chatResetKey"
        :selected-reading="selectedHistoryReading"
        @new-reading="selectedHistoryReading = null"
      />
      <ReadingHistory
        v-else-if="currentView === 'history'"
        @select-reading="handleSelectReading"
        @close="showChat"
      />
    </main>

    <!-- Settings Modal -->
    <LLMSettings v-model="showSettings" />

    <!-- Horary Info Modal -->
    <HoraryInfoModal v-model="showHoraryInfo" />

    <!-- Feedback Modal -->
    <FeedbackModal v-model="showFeedback" />
  </div>
</template>

<style>
/* Reset and base styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

/* CSS Custom Properties for Theming */
:root {
  /* Light mode — warm parchment, aged ink, gold highlights */

  /* Main page background — old vellum parchment */
  --color-bg: #fdf6e8;
  /* Card / panel background — slightly deeper manuscript page */
  --color-surface: #faf0d8;
  /* Elevated surfaces — dropdowns, modals, raised panels */
  --color-surface-raised: #f4e4be;

  /* Main body text — dark brown ink */
  --color-text-primary: #2d1f0e;
  /* Supporting / secondary text — medium brown */
  --color-text-secondary: #6b4c2a;
  /* Placeholders, disabled states, timestamps — light brown */
  --color-text-muted: #9a7148;

  /* Dividers and input borders — warm tan */
  --color-border: #ddc896;

  /* Primary action color — rich amber-gold */
  --color-accent: #b8690a;
  /* Accent on hover / active state */
  --color-accent-hover: #96550a;
  /* Text and icons placed on top of the accent color */
  --color-accent-foreground: #fffcf5;

  /* Internal-use tokens (not in the public token spec) */
  --color-bg-hover: #ecddb0;           /* hover state for interactive surfaces */
  --color-bg-active: #b8690a;          /* active nav / selected state bg */
  --color-text-inverse: #fffcf5;       /* light text on dark/accent backgrounds */
  --color-border-focus: #c09030;       /* focus ring — warm gold */
  --color-success: #4a8c12;
  --color-warning: #d97706;
  --color-error: #c52020;

  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 2px 4px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 4px 6px rgba(0, 0, 0, 0.12);
}

/* Dark mode — candlelight in a dark overgrown stairwell */
/* Palette drawn from deep forest foliage, dark wood, and candleflame amber */
:root.dark {
  /* Main page background — near-black deep forest, like the darkest foliage */
  --color-bg: #0e1a10;
  /* Card / panel background — dark mid-foliage, shadowed wood */
  --color-surface: #182b1a;
  /* Elevated surfaces — slightly lighter canopy layer */
  --color-surface-raised: #223424;

  /* Main body text — soft candle-wax cream */
  --color-text-primary: #f2e8d0;
  /* Supporting text — warmer cream with a hint of amber */
  --color-text-secondary: #c8b896;
  /* Placeholders, disabled, timestamps — warm muted tan */
  --color-text-muted: #8a7a5c;

  /* Dividers and input borders — shadowed greenery */
  --color-border: #2d4430;

  /* Primary action color — candleflame amber */
  --color-accent: #d4820a;
  /* Accent on hover / active state — deeper ember */
  --color-accent-hover: #b86d08;
  /* Text and icons placed on top of the accent color */
  --color-accent-foreground: #1a0d02;

  /* Internal-use tokens */
  --color-bg-hover: #243826;           /* hover state — slightly brighter foliage */
  --color-bg-active: #d4820a;          /* active nav — candleflame */
  --color-text-inverse: #0e1a10;       /* dark text on light/accent backgrounds */
  --color-border-focus: #a06820;       /* focus ring — warm amber-gold */
  --color-success: #2a6a3a;
  --color-warning: #d4820a;
  --color-error: #e06060;

  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.45);
  --shadow-md: 0 2px 6px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 4px 12px rgba(0, 0, 0, 0.55);
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  line-height: 1.6;
  color: var(--color-text-primary);
  background-color: var(--color-bg);
  overflow-x: hidden;
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* App container */
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  width: 100%;
  overflow: hidden;
}

/* Header */
.app-header {
  background-color: var(--color-surface);
  padding: 1rem;
  box-shadow: var(--shadow-sm);
  position: sticky;
  top: 0;
  z-index: 10;
  width: 100%;
  border-bottom: 1px solid var(--color-border);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.title-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.app-header h1 {
  font-size: 1.5rem;
  color: var(--color-text-primary);
  white-space: nowrap;
}

.info-tag {
  background: rgba(217, 119, 6, 0.08);
  color: var(--color-text-muted);
  border: 1px solid rgba(217, 119, 6, 0.2);
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 0.15rem 0.55rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  letter-spacing: 0.01em;
  align-self: center;
}

.info-tag:hover {
  background: rgba(217, 119, 6, 0.15);
  color: var(--color-accent);
  border-color: rgba(217, 119, 6, 0.35);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-nav {
  display: flex;
  gap: 0.5rem;
}

.nav-button {
  background: var(--color-surface-raised);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
}

.nav-button:hover {
  background: var(--color-bg-hover);
}

.nav-button.active {
  background: var(--color-bg-active);
  color: var(--color-text-inverse);
  border-color: var(--color-bg-active);
}

.history-count {
  background: rgba(255, 255, 255, 0.2);
  color: currentColor;
  padding: 0.125rem 0.375rem;
  border-radius: 0.75rem;
  font-size: 0.75rem;
  min-width: 1.25rem;
  text-align: center;
}

.nav-button.active .history-count {
  background: rgba(255, 255, 255, 0.3);
}

/* Settings Button */
.settings-button {
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  padding: 0.5rem;
  cursor: pointer;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  width: 2.5rem;
  height: 2.5rem;
}

.settings-button:hover {
  background: var(--color-bg-hover);
  transform: scale(1.05);
}

.settings-button:active {
  transform: scale(0.95);
}

/* Feedback Button */
.feedback-button {
  background: rgba(217, 119, 6, 0.08);
  color: var(--color-text-muted);
  border: 1px solid rgba(217, 119, 6, 0.2);
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 0.15rem 0.6rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  letter-spacing: 0.01em;
  align-self: center;
}

.feedback-button:hover {
  background: rgba(217, 119, 6, 0.15);
  color: var(--color-accent);
  border-color: rgba(217, 119, 6, 0.35);
}

/* Dark Mode Toggle */
.dark-mode-toggle {
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  padding: 0.5rem;
  cursor: pointer;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  width: 2.5rem;
  height: 2.5rem;
}

.dark-mode-toggle:hover {
  background: var(--color-bg-hover);
  transform: scale(1.05);
}

.dark-mode-toggle:active {
  transform: scale(0.95);
}

/* Main content */
.app-main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  padding: 1rem;
  gap: 1rem;
  overflow: hidden;
}

/* Tablet optimizations */
@media (max-width: 768px) {
  .app-header h1 {
    font-size: 1.25rem;
  }

  .nav-button {
    padding: 0.5rem 0.75rem;
    font-size: 0.8125rem;
  }

  .settings-button,
  .dark-mode-toggle {
    width: 2.25rem;
    height: 2.25rem;
    font-size: 1.125rem;
  }
}

/* Mobile optimizations */
@media (max-width: 640px) {
  .app-header {
    padding: 0.75rem;
  }

  .header-content {
    flex-wrap: wrap;
  }

  .title-group {
    flex: 1 1 auto;
  }

  .app-header h1 {
    font-size: 1.125rem;
  }

  .header-actions {
    flex: 1 1 100%;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .header-nav {
    flex: 1;
    gap: 0.5rem;
  }

  .nav-button {
    flex: 1;
    justify-content: center;
    padding: 0.625rem 0.5rem;
    font-size: 0.8125rem;
  }

  .settings-button,
  .dark-mode-toggle {
    width: 2.5rem;
    height: 2.5rem;
    flex-shrink: 0;
  }

  .app-main {
    padding: 0.5rem;
  }
}

/* Very small screens */
@media (max-width: 380px) {
  .app-header h1 {
    font-size: 1rem;
  }

  .nav-button {
    font-size: 0.75rem;
    padding: 0.5rem 0.375rem;
  }

  .history-count {
    font-size: 0.625rem;
  }
}
</style>