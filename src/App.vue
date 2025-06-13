<script setup lang="ts">
import { ref } from 'vue';
import UserChat from "./components/UserChat.vue";
import ReadingHistory from "./components/ReadingHistory.vue";
import { useReadingStorage, type StoredReading } from './utils/storage';

type AppView = 'chat' | 'history';

const currentView = ref<AppView>('chat');
const selectedHistoryReading = ref<StoredReading | null>(null);
const { getStorageStats } = useReadingStorage();

const showHistory = () => {
  currentView.value = 'history';
};

const showChat = () => {
  currentView.value = 'chat';
  selectedHistoryReading.value = null;
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
      </div>
    </header>

    <main class="app-main">
      <UserChat 
        v-if="currentView === 'chat'" 
        :selected-reading="selectedHistoryReading"
      />
      <ReadingHistory 
        v-else-if="currentView === 'history'"
        @select-reading="handleSelectReading"
        @close="showChat"
      />
    </main>
  </div>
</template>

<style>
/* Reset and base styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  line-height: 1.6;
  color: #2c3e50;
  background-color: #f7fafc;
  overflow-x: hidden;
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
  background-color: white;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 10;
  width: 100%;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.app-header h1 {
  font-size: 1.5rem;
  color: #2c3e50;
}

.header-nav {
  display: flex;
  gap: 0.5rem;
}

.nav-button {
  background: #f7fafc;
  color: #4a5568;
  border: 1px solid #e2e8f0;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-button:hover {
  background: #e2e8f0;
}

.nav-button.active {
  background: #4a90e2;
  color: white;
  border-color: #4a90e2;
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

/* Mobile optimizations */
@media (max-width: 640px) {
  .app-header {
    padding: 0.75rem;
  }

  .header-content {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .app-header h1 {
    font-size: 1.25rem;
    text-align: center;
  }

  .header-nav {
    justify-content: center;
  }

  .nav-button {
    flex: 1;
    justify-content: center;
  }

  .app-main {
    padding: 0.5rem;
  }
}
</style>