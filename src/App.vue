<script setup lang="ts">
import { ref } from 'vue';
import UserChat from "./components/UserChat.vue";
import ReadingHistory from "./components/ReadingHistory.vue";
import LLMSettings from "./components/LLMSettings.vue";
import HoraryInfoModal from "./components/HoraryInfoModal.vue";
import { useReadingStorage, type StoredReading } from './utils/storage';
import { useDarkMode } from './composables/useDarkMode';

type AppView = 'chat' | 'history';

const currentView = ref<AppView>('chat');
const selectedHistoryReading = ref<StoredReading | null>(null);
const chatResetKey = ref(0); // Used to force UserChat component to reset
const { getStorageStats } = useReadingStorage();
const { isDark, toggleDarkMode } = useDarkMode();
const showSettings = ref(false);
const showHoraryInfo = ref(false);

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

const storageStats = getStorageStats();
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
  </div>
</template>

<style>
/* Reset and base styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* CSS Custom Properties for Theming */
:root {
  /* Light mode — warm parchment with gold/amber highlights */
  --color-bg-primary: #fdf8f0;
  --color-bg-secondary: #fffcf5;
  --color-bg-tertiary: #fdf1dc;
  --color-bg-hover: #f5e6c0;
  --color-bg-active: #d97706;

  --color-text-primary: #2d1f0e;
  --color-text-secondary: #6b4c2a;
  --color-text-tertiary: #9a7148;
  --color-text-inverse: #fffcf5;

  --color-border: #e8d5a8;
  --color-border-focus: #c9a84c;

  --color-accent: #d97706;
  --color-accent-hover: #b45309;
  --color-success: #65a30d;
  --color-warning: #f59e0b;
  --color-error: #dc2626;

  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 2px 4px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 4px 6px rgba(0, 0, 0, 0.1);
}

/* Dark mode — brownish black with cream text, gold and forest green */
:root.dark {
  --color-bg-primary: #1a0e05;
  --color-bg-secondary: #261507;
  --color-bg-tertiary: #3d2010;
  --color-bg-hover: #522b14;
  --color-bg-active: #b45309;

  --color-text-primary: #fdf4dc;
  --color-text-secondary: #e8d5b0;
  --color-text-tertiary: #c4a882;
  --color-text-inverse: #1a0e05;

  --color-border: #6b3d0f;
  --color-border-focus: #a0591c;

  --color-accent: #f59e0b;
  --color-accent-hover: #d97706;
  --color-success: #2d6a4f;
  --color-warning: #d97706;
  --color-error: #f87171;

  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 2px 4px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 4px 6px rgba(0, 0, 0, 0.4);
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  line-height: 1.6;
  color: var(--color-text-primary);
  background-color: var(--color-bg-primary);
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
  background-color: var(--color-bg-secondary);
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
  color: var(--color-text-tertiary);
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
  background: var(--color-bg-tertiary);
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
  background: var(--color-bg-tertiary);
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

/* Dark Mode Toggle */
.dark-mode-toggle {
  background: var(--color-bg-tertiary);
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