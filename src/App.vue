<script setup lang="ts">
import { ref } from 'vue';
import UserChat from "./components/UserChat.vue";
import ReadingHistory from "./components/ReadingHistory.vue";
import OllamaSettings from "./components/OllamaSettings.vue";
import { useReadingStorage, type StoredReading } from './utils/storage';
import { useDarkMode } from './composables/useDarkMode';

type AppView = 'chat' | 'history';

const currentView = ref<AppView>('chat');
const selectedHistoryReading = ref<StoredReading | null>(null);
const chatResetKey = ref(0); // Used to force UserChat component to reset
const { getStorageStats } = useReadingStorage();
const { isDark, toggleDarkMode } = useDarkMode();
const showSettings = ref(false);

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
        <h1>Horary Astrology</h1>
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
    <OllamaSettings v-model="showSettings" />
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
  /* Light mode colors */
  --color-bg-primary: #f7fafc;
  --color-bg-secondary: #ffffff;
  --color-bg-tertiary: #f7fafc;
  --color-bg-hover: #e2e8f0;
  --color-bg-active: #4a90e2;

  --color-text-primary: #2c3e50;
  --color-text-secondary: #4a5568;
  --color-text-tertiary: #718096;
  --color-text-inverse: #ffffff;

  --color-border: #e2e8f0;
  --color-border-focus: #cbd5e0;

  --color-accent: #4a90e2;
  --color-success: #10b981;
  --color-warning: #fbbf24;
  --color-error: #dc2626;

  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 2px 4px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 4px 6px rgba(0, 0, 0, 0.1);
}

/* Dark mode colors */
:root.dark {
  --color-bg-primary: #1a202c;
  --color-bg-secondary: #2d3748;
  --color-bg-tertiary: #374151;
  --color-bg-hover: #4a5568;
  --color-bg-active: #4a90e2;

  --color-text-primary: #f7fafc;
  --color-text-secondary: #e2e8f0;
  --color-text-tertiary: #cbd5e0;
  --color-text-inverse: #1a202c;

  --color-border: #4a5568;
  --color-border-focus: #718096;

  --color-accent: #63b3ed;
  --color-success: #34d399;
  --color-warning: #fbbf24;
  --color-error: #f87171;

  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 2px 4px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 4px 6px rgba(0, 0, 0, 0.3);
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
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
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

.app-header h1 {
  font-size: 1.5rem;
  color: var(--color-text-primary);
  white-space: nowrap;
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
  display: flex;
  flex-direction: column;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  padding: 1rem;
  gap: 1rem;
  overflow-x: hidden;
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

  .app-header h1 {
    font-size: 1.125rem;
    flex: 1 1 auto;
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