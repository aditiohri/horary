<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import UserChat from "./components/UserChat.vue";
import ReadingHistory from "./components/ReadingHistory.vue";
import LLMSettings from "./components/LLMSettings.vue";
import HoraryInfoModal from "./components/HoraryInfoModal.vue";
import FeedbackModal from "./components/FeedbackModal.vue";
import { readingStorage, decodeReadingFromUrl, type StoredReading } from './utils/storage';
import { useDarkMode } from './composables/useDarkMode';
import { useRegisterSW } from 'virtual:pwa-register/vue';

type AppView = 'home' | 'reading';

const currentView = ref<AppView>('reading');
const selectedHistoryReading = ref<StoredReading | null>(null);
const chatResetKey = ref(0);
const { isDark, toggleDarkMode } = useDarkMode();

const { needRefresh, updateServiceWorker } = useRegisterSW();
watch(needRefresh, (val) => { if (val) updateServiceWorker(); });
const showSettings = ref(false);
const showHoraryInfo = ref(false);
const showFeedback = ref(false);

const savedReadingsCount = ref(readingStorage.getStorageStats().totalReadings);
const historyRefreshKey = ref(0);
const refreshReadingsCount = () => {
  savedReadingsCount.value = readingStorage.getStorageStats().totalReadings;
};
watch(currentView, refreshReadingsCount);

const handleReadingSaved = () => {
  historyRefreshKey.value++;
  refreshReadingsCount();
};

const startNewReading = () => {
  selectedHistoryReading.value = null;
  chatResetKey.value++;
  currentView.value = 'reading';
};

const goHome = () => {
  if (currentView.value === 'home') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  currentView.value = 'home';
};

const handleSelectReading = (reading: StoredReading) => {
  selectedHistoryReading.value = reading;
  currentView.value = 'reading';
};

onMounted(async () => {
  refreshReadingsCount();
  const sharedReading = await decodeReadingFromUrl();
  if (sharedReading) {
    readingStorage.importReading(sharedReading);
    selectedHistoryReading.value = sharedReading;
    currentView.value = 'reading';
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
          <button
            class="app-title"
            @click="goHome"
            aria-label="Horary Astrology — return to home"
          >
            Horary Astrology
          </button>
          <button
            class="info-tag"
            @click="showHoraryInfo = true"
            aria-label="Learn more about horary astrology"
          >
            Learn more
          </button>
        </div>
        <div class="header-right">
          <button
            class="header-new-reading"
            @click="startNewReading"
            aria-label="Start a new reading"
          >
            ✦ New Reading
          </button>
          <button
            class="settings-button"
            @click="showSettings = true"
            aria-label="Settings"
            title="Settings"
          >
            ⚙
          </button>
        </div>
      </div>
    </header>

    <div class="app-body">
      <!-- Sidebar: home screen on mobile, permanent panel on desktop -->
      <aside
        class="app-sidebar"
        :class="{ 'mobile-hidden': currentView === 'reading' }"
      >
        <div class="sidebar-top">
          <button class="sidebar-new-reading" @click="startNewReading">
            ✦ New Reading
          </button>
        </div>

        <div class="sidebar-history">
          <ReadingHistory
            :compact="true"
            :refresh-key="historyRefreshKey"
            @select-reading="handleSelectReading"
            @close="goHome"
          />
        </div>

        <div class="sidebar-footer">
          <button class="sidebar-footer-button" @click="toggleDarkMode">
            <span>{{ isDark ? '☀️' : '🌙' }}</span>
            <span>{{ isDark ? 'Light Mode' : 'Dark Mode' }}</span>
          </button>
          <button class="sidebar-footer-button" @click="showSettings = true">
            <span>⚙</span>
            <span>API Settings</span>
          </button>
          <button class="sidebar-footer-button" @click="showFeedback = true">
            <span>✉</span>
            <span>Feedback</span>
          </button>
        </div>
      </aside>

      <!-- Main reading area: always visible on desktop, reading-view on mobile -->
      <main
        class="app-main"
        :class="{ 'mobile-hidden': currentView === 'home' }"
      >
        <UserChat
          :key="chatResetKey"
          :selected-reading="selectedHistoryReading"
          @new-reading="selectedHistoryReading = null"
          @reading-saved="handleReadingSaved"
        />
      </main>
    </div>

    <!-- Bottom bar: mobile only -->
    <div class="bottom-bar">
      <button
        v-if="currentView === 'home'"
        class="bottom-new-reading"
        @click="startNewReading"
      >
        ✦ New Reading
      </button>
      <button
        v-else
        class="bottom-saved-readings"
        @click="goHome"
      >
        📜 Saved Readings ({{ savedReadingsCount }})
      </button>
    </div>

    <!-- Settings Modal / bottom sheet -->
    <LLMSettings
      v-model="showSettings"
      :is-dark="isDark"
      :readings-count="savedReadingsCount"
      @toggle-dark="toggleDarkMode"
      @feedback="showFeedback = true"
      @view-history="() => { showSettings = false; goHome(); }"
    />

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
  color-scheme: light;
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

/* Dark mode — candlelight in a dark garden */
/* Near-black green-tinted backgrounds with warm amber accents */
:root.dark {
  color-scheme: dark;
  /* Main page background — near-black green-tinted */
  --color-bg: #161a12;
  /* Card / panel background — dark surface */
  --color-surface: #1e2418;
  /* Elevated surfaces — slightly lifted, still very dark */
  --color-surface-raised: #242c1d;

  /* Main body text — warm off-white */
  --color-text-primary: #f0ead8;
  /* Supporting text — warm mid-tone */
  --color-text-secondary: #c8b896;
  /* Placeholders, disabled, timestamps */
  --color-text-muted: #a89e85;

  /* Dividers and input borders */
  --color-border: #2a3522;

  /* Primary action color — warm amber */
  --color-accent: #c4854a;
  /* Accent on hover / active state — brighter ember */
  --color-accent-hover: #e8a96b;
  /* Text and icons placed on top of the accent color */
  --color-accent-foreground: #1a1008;

  /* Internal-use tokens */
  --color-bg-hover: #242e1c;           /* hover state — slightly lifted dark surface */
  --color-bg-active: #c4854a;          /* active nav — amber */
  --color-text-inverse: #161a12;       /* dark text on light/accent backgrounds */
  --color-border-focus: #c4854a;       /* focus ring — amber */
  --color-success: #2a6a3a;
  --color-warning: #c4854a;
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

/* ─── App container ───────────────────────────────────────── */
.app-container {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  width: 100%;
  overflow: hidden;
}

/* ─── Header ──────────────────────────────────────────────── */
.app-header {
  background-color: var(--color-surface);
  padding: 0.625rem 1rem;
  box-shadow: var(--shadow-sm);
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1px solid var(--color-border);
  transition: background-color 0.3s ease, border-color 0.3s ease;
  flex-shrink: 0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.title-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

/* Tappable title — acts as home link */
.app-title {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary);
  font-family: inherit;
  white-space: nowrap;
  transition: color 0.2s ease;
}

.app-title:hover {
  color: var(--color-accent);
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
  font-family: inherit;
}

.info-tag:hover {
  background: rgba(217, 119, 6, 0.15);
  color: var(--color-accent);
  border-color: rgba(217, 119, 6, 0.35);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

/* "New Reading" in header — visible on mobile, hidden on desktop (sidebar has it) */
.header-new-reading {
  background: var(--color-accent);
  color: var(--color-accent-foreground);
  border: none;
  padding: 0.5rem 0.875rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  font-family: inherit;
}

.header-new-reading:hover {
  background: var(--color-accent-hover);
}

.header-new-reading:active {
  transform: scale(0.96);
}

/* Settings gear button */
.settings-button {
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  padding: 0.5rem;
  cursor: pointer;
  font-size: 1.125rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  width: 2.25rem;
  height: 2.25rem;
  color: var(--color-text-secondary);
  font-family: inherit;
}

.settings-button:hover {
  background: var(--color-bg-hover);
  color: var(--color-accent);
}

/* ─── App body: sidebar + main ────────────────────────────── */
.app-body {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

/* ─── Sidebar ─────────────────────────────────────────────── */
.app-sidebar {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  overflow: hidden;
  /* Mobile: full width — it IS the home screen */
  width: 100%;
  flex-shrink: 0;
  transition: background-color 0.3s ease;
}

.sidebar-top {
  padding: 0.75rem;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  /* Hidden on mobile — bottom bar handles New Reading there */
  display: none;
}

.sidebar-new-reading {
  width: 100%;
  background: var(--color-accent);
  color: var(--color-accent-foreground);
  border: none;
  padding: 0.625rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.sidebar-new-reading:hover {
  background: var(--color-accent-hover);
}

.sidebar-history {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Sidebar footer: theme, settings, feedback — desktop only */
.sidebar-footer {
  display: none;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.5rem;
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

.sidebar-footer-button {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 100%;
  background: none;
  border: none;
  padding: 0.5rem 0.625rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  text-align: left;
  transition: all 0.2s ease;
  font-family: inherit;
}

.sidebar-footer-button:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

/* ─── Main content ────────────────────────────────────────── */
.app-main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-bg);
}

/* ─── Mobile: conditional visibility (max 1023px) ─────────── */
@media (max-width: 1023px) {
  .app-sidebar.mobile-hidden {
    display: none;
  }

  .app-main.mobile-hidden {
    display: none;
  }
}

/* ─── Bottom bar: mobile only ─────────────────────────────── */
.bottom-bar {
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  padding: 0.625rem 1rem;
  padding-bottom: calc(0.625rem + env(safe-area-inset-bottom));
  display: flex;
  flex-shrink: 0;
}

.bottom-new-reading {
  flex: 1;
  background: var(--color-accent);
  color: var(--color-accent-foreground);
  border: none;
  padding: 0.75rem 1rem;
  border-radius: 9999px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.bottom-new-reading:hover {
  background: var(--color-accent-hover);
}

.bottom-new-reading:active {
  transform: scale(0.98);
}

.bottom-saved-readings {
  flex: 1;
  background: var(--color-surface-raised);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  padding: 0.75rem 1rem;
  border-radius: 9999px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.bottom-saved-readings:hover {
  background: var(--color-bg-hover);
}

.bottom-saved-readings:active {
  transform: scale(0.98);
}

/* ─── Desktop 1024px+ ─────────────────────────────────────── */
@media (min-width: 1024px) {
  /* Fixed-width sidebar */
  .app-sidebar {
    width: 280px;
    flex-shrink: 0;
  }

  /* Always show both panels on desktop, regardless of mobile-hidden class */
  .app-sidebar.mobile-hidden {
    display: flex;
  }

  .app-main.mobile-hidden {
    display: flex;
  }

  /* Hide mobile-only elements */
  .bottom-bar {
    display: none;
  }

  .header-new-reading {
    display: none;
  }

  /* Show desktop sidebar internals */
  .sidebar-top {
    display: block;
  }

  .sidebar-footer {
    display: flex;
  }

  /* Allow main to scroll on desktop */
  .app-main {
    overflow-y: auto;
  }
}
</style>
