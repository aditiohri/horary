<script setup lang="ts">
import { ref, nextTick, watch, onMounted, onUnmounted } from "vue";
import { Chart } from "@astrodraw/astrochart";
import QuestionForm from "./QuestionForm.vue";
import HoraryChart from "./HoraryChart.vue";
import ChartDataView from "./ChartDataView.vue";
import Chat from "./Chat.vue";
import { useReadingStorage, type StoredReading } from "../utils/storage";

interface QuestionData {
  question: string;
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  locationName?: string;
  chartData: any;
}

const props = defineProps<{
  selectedReading?: StoredReading | null;
}>();

const emit = defineEmits<{
  'new-reading': [];
  'reading-started': [];
  'view-history': [];
  'reading-saved': [];
}>();

const { saveReading, updateReading } = useReadingStorage();

const chartData = ref<QuestionData | null>(null);
const showConversation = ref(false);
const currentReadingId = ref<string | null>(null);
const activeTab = ref<'chat' | 'wheel' | 'data'>('chat');
const activeChartTab = ref<'wheel' | 'data'>('wheel');
const showAbout = ref(false);
const isMobile = ref(window.innerWidth <= 768);

const handleResize = () => {
  isMobile.value = window.innerWidth <= 768;
};

const handleChartCalculated = async (data: QuestionData) => {
  chartData.value = data;

  showConversation.value = true;
  activeTab.value = 'chat'; // Start with chat tab on mobile
  activeChartTab.value = 'wheel'; // Default chart panel to Chart Wheel

  emit('reading-started');

  // Save the new reading to storage
  try {
    const readingId = saveReading({
      question: data.question,
      timestamp: data.timestamp,
      location: data.location,
      locationName: data.locationName,
      chartData: data.chartData,
      conversation: [],
    });
    currentReadingId.value = readingId;
    emit('reading-saved');
  } catch (error) {
    console.error("Error saving reading:", error);
  }

  // Wait for the next tick to ensure the paper div exists
  await nextTick();
  await renderChart(data);
};

const renderChart = async (data: QuestionData) => {
  const paper = document.getElementById("paper");
  if (paper) {
    // Clear any existing chart
    paper.innerHTML = "";

    // Transform planet data to array format for the chart library
    // The library expects { moon: [degrees], ... } but we store { moon: { position, isRetrograde }, ... }
    const chartLibraryData = {
      ...data.chartData,
      planets: Object.fromEntries(
        Object.entries(data.chartData.planets).map(([key, value]) => [
          key,
          typeof value === "object" &&
          value !== null &&
          "position" in (value as Record<string, unknown>)
            ? [(value as { position: number }).position]
            : value,
        ])
      ),
    };

    // Render at a fixed resolution; CSS scales the SVG to fill the container.
    const chartSize = 800;

    // Create new chart within our container
    const radix = new Chart("paper", chartSize, chartSize, {
      DEBUG: false,
      SYMBOL_SUN: "sun",
      SYMBOL_MOON: "moon",
      SYMBOL_MERCURY: "mercury",
      SYMBOL_VENUS: "venus",
      SYMBOL_MARS: "mars",
      SYMBOL_JUPITER: "jupiter",
      SYMBOL_SATURN: "saturn",
      SYMBOL_AS: "ascendant",
      SYMBOL_MC: "midheaven",
    }).radix(chartLibraryData);
    document.getElementById("paper-astrology-radix-axis")?.remove();
    radix.aspects();

    // Fix retrograde symbols - remove incorrect ones
    // The chart library calculates retrograde incorrectly, so we fix it based on our accurate data
    await nextTick();
    fixRetrogradeSymbols(data.chartData.planets);
  }
};

// Remove incorrect retrograde symbols from the chart SVG
const fixRetrogradeSymbols = (planets: any) => {
  const paper = document.getElementById("paper");
  if (!paper) return;

  // Find the planets container group
  const planetsGroup = paper.querySelector('#paper-astrology-radix-planets');
  if (!planetsGroup) {
    return;
  }

  // Process each planet to remove incorrect retrograde symbols
  Object.entries(planets).forEach(([planetKey, planetData]: [string, any]) => {
    const planetGroup = paper.querySelector(`#paper-astrology-radix-planets-${planetKey}`);

    if (planetGroup && planetKey !== 'ascendant' && planetKey !== 'midheaven') {
      // Find the next 3 sibling text elements after this planet group
      let sibling: Element | null = planetGroup.nextElementSibling;
      const textElements: Element[] = [];

      while (sibling && textElements.length < 3) {
        if (sibling.tagName === 'text') {
          textElements.push(sibling);
        }
        sibling = sibling.nextElementSibling;
      }

      // The 3rd text element (index 2) contains the retrograde symbol (if any)
      if (textElements.length >= 3) {
        const symbolElement = textElements[2] as SVGTextElement;
        const symbolText = symbolElement.textContent?.trim();

        // If there's a symbol (e, f, or other non-empty text)
        if (symbolText && symbolText.length > 0) {
          if (!planetData.isRetrograde) {
            // Remove the symbol if planet is NOT retrograde
            symbolElement.remove();
          } else {
            // Replace the glyph with "℞" (retrograde symbol) or "Rx"
            symbolElement.textContent = '℞'; // Unicode retrograde symbol
            // Style the retrograde symbol to be red and more prominent
            symbolElement.setAttribute('fill', '#dc2626'); // Red color
            symbolElement.setAttribute('font-weight', 'bold');
            // Make it slightly larger
            const currentSize = parseFloat(symbolElement.getAttribute('font-size') || '14');
            symbolElement.setAttribute('font-size', String(currentSize * 1.4));
          }
        }
      }

    }
  });
};

const startNewReading = () => {
  // Emit event to parent to clear selected reading
  emit('new-reading');

  // Reset local state
  chartData.value = null;
  showConversation.value = false;
  currentReadingId.value = null;
};

// Handle conversation updates for storage
const handleConversationUpdate = (
  messages: Array<{
    role: string;
    content: string;
    timestamp: Date;
  }>
) => {
  if (currentReadingId.value) {
    try {
      const conversationData = messages.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
      }));

      updateReading(currentReadingId.value, {
        conversation: conversationData,
      });
    } catch (error) {
      console.error("Error updating reading:", error);
    }
  }
};

// Watch for selected reading from history
watch(
  () => props.selectedReading,
  async (newReading) => {
    if (newReading) {
      // Load the selected reading
      chartData.value = {
        question: newReading.question,
        timestamp: newReading.timestamp,
        location: newReading.location,
        locationName: newReading.locationName,
        chartData: newReading.chartData,
      };
      showConversation.value = true;
      currentReadingId.value = newReading.id;
      activeChartTab.value = 'wheel';

      // Wait for next tick and render chart
      await nextTick();
      await renderChart(chartData.value);
    } else {
      // Reset to new reading state when selectedReading becomes null
      startNewReading();
    }
  },
  { immediate: true }
);

onMounted(() => {
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

// Load selected reading on mount if provided
onMounted(async () => {
  if (props.selectedReading) {
    chartData.value = {
      question: props.selectedReading.question,
      timestamp: props.selectedReading.timestamp,
      location: props.selectedReading.location,
      locationName: props.selectedReading.locationName,
      chartData: props.selectedReading.chartData,
    };
    showConversation.value = true;
    currentReadingId.value = props.selectedReading.id;
    activeChartTab.value = 'wheel';

    await nextTick();
    await renderChart(chartData.value);
  }
});

// Re-render chart when switching to wheel tab (mobile)
watch(activeTab, async (newTab) => {
  if (newTab === 'wheel' && chartData.value) {
    await nextTick();
    await renderChart(chartData.value);
  }
});

// Re-render chart when switching to wheel tab (desktop chart panel)
watch(activeChartTab, async (newTab) => {
  if (newTab === 'wheel' && chartData.value) {
    await nextTick();
    await renderChart(chartData.value);
  }
});
</script>

<template>
  <div :class="['user-chat', { 'welcome-state': !chartData }]">
    <div class="content-area">
      <div v-if="!chartData" class="welcome-message">
        <h2>Welcome to Horary Astrology</h2>
        <p>
          Ask a sincere, specific question below to receive an astrological
          reading.
        </p>
        <p>
          Your question will be analyzed based on the current planetary
          positions and traditional horary principles.
        </p>
      </div>

      <div v-else class="reading-layout">
        <!-- LEFT: Conversation / chat column -->
        <!-- On desktop: 60% width, scrollable, always shows chat -->
        <!-- On mobile: full width, tab-controlled content -->
        <div v-if="showConversation" class="conversation-section">
          <!-- Question heading: desktop only -->
          <h2 v-if="!isMobile" class="reading-question">{{ chartData?.question }}</h2>

          <!-- Mobile tab navigation: Chat / Chart Wheel / Chart Data -->
          <div v-if="isMobile" class="tab-navigation">
            <button
              @click="activeTab = 'chat'"
              :class="['tab-button', { active: activeTab === 'chat' }]"
            >
              Chat
            </button>
            <button
              @click="activeTab = 'wheel'"
              :class="['tab-button', { active: activeTab === 'wheel' }]"
            >
              Chart Wheel
            </button>
            <button
              @click="activeTab = 'data'"
              :class="['tab-button', { active: activeTab === 'data' }]"
            >
              Chart Data
            </button>
          </div>

          <!-- Mobile-only chart views (rendered here since chart-section is unmounted) -->
          <template v-if="isMobile">
            <HoraryChart v-if="activeTab === 'wheel'" :chart-data="chartData" />
            <ChartDataView v-if="activeTab === 'data'" :chart-data="chartData" />
            <div v-if="activeTab !== 'chat'" class="mobile-chart-actions">
              <button @click="startNewReading" class="new-reading-button">
                Ask Another Question
              </button>
              <span v-if="currentReadingId" class="reading-saved"> ✓ Reading saved </span>
            </div>
          </template>

          <!-- Chat (always on desktop; only when chat tab active on mobile) -->
          <Chat
            v-show="!isMobile || activeTab === 'chat'"
            :reading="chartData"
            :reading-id="currentReadingId ?? undefined"
            :existing-conversation="selectedReading?.conversation || []"
            @conversation-update="handleConversationUpdate" />

          <!-- Mobile chat tab: Ask New Question button -->
          <div v-if="isMobile && activeTab === 'chat'" class="mobile-chat-actions">
            <button @click="startNewReading" class="new-reading-button">
              Ask New Question
            </button>
          </div>
        </div>

        <!-- RIGHT: Chart panel — desktop only (unmounted on mobile to avoid #paper conflict) -->
        <div v-if="!isMobile" class="chart-section">
          <!-- Desktop chart tab navigation: Chart Wheel / Chart Data -->
          <div class="chart-tab-navigation">
            <button
              @click="activeChartTab = 'wheel'"
              :class="['chart-tab-button', { active: activeChartTab === 'wheel' }]"
            >
              Chart Wheel
            </button>
            <button
              @click="activeChartTab = 'data'"
              :class="['chart-tab-button', { active: activeChartTab === 'data' }]"
            >
              Chart Data
            </button>
          </div>

          <div class="tab-content">
            <HoraryChart v-show="activeChartTab !== 'data'" :chart-data="chartData" />
            <ChartDataView v-show="activeChartTab === 'data'" :chart-data="chartData" />
          </div>

          <div class="chart-actions">
            <button @click="startNewReading" class="new-reading-button">
              Ask Another Question
            </button>
            <div v-if="currentReadingId" class="reading-info">
              <span class="reading-saved"> ✓ Reading saved </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!chartData" class="input-area">
      <QuestionForm @chart-calculated="handleChartCalculated" />
    </div>

    <div v-if="!chartData" class="about-section">
      <button @click="showAbout = !showAbout" class="about-toggle">
        About this app <span class="about-chevron">{{ showAbout ? '▲' : '▼' }}</span>
      </button>

      <div v-if="showAbout" class="about-content">
        <div class="about-features">
          <div class="feature">
            <span class="feature-icon">🌟</span>
            <div>
              <h3>Traditional Methods</h3>
              <p>Using classical horary techniques and planetary dignities</p>
            </div>
          </div>
          <div class="feature">
            <span class="feature-icon">💫</span>
            <div>
              <h3>Interactive Analysis</h3>
              <p>Ask follow-up questions about your reading</p>
            </div>
          </div>
          <div class="feature">
            <span class="feature-icon">📚</span>
            <div>
              <h3>Reading History</h3>
              <p>All your readings are saved locally for future reference</p>
            </div>
          </div>
        </div>

        <div class="about-card">
          <h3>🗄️ Local Storage</h3>
          <p>All readings are stored entirely in your browser's local storage — no reading data is ever sent to or stored on a server. Data persists across sessions until you clear your browser storage. You can export all readings as JSON or delete them individually from the History tab.</p>
        </div>

        <div class="about-card">
          <h3>🤖 AI Model &amp; API</h3>
          <p>Interpretations are powered by <strong>Llama 3.3 70B</strong> by default (with Qwen 3 32B and others also available), served via <strong>Groq's inference API</strong>. Requests are routed through a secure server-side proxy — your browser never communicates with Groq directly, and the API key is never exposed to the client. You can bring your own free Groq API key in Settings for a dedicated rate limit.</p>
        </div>

        <div class="about-card">
          <h3>🔒 Privacy &amp; Data Control</h3>
          <p>No account or personal information is required to use this app. Your horary question text is sent to Groq's API for AI interpretation — <a href="https://groq.com/privacy-policy/" target="_blank" rel="noopener">Groq's privacy policy</a> applies to these requests. Location data used for chart calculation is requested by your browser at reading time and is not stored beyond the chart itself. You can delete any or all readings from the History tab at any time.</p>
        </div>
      </div>
    </div>

    <!-- "Past readings" link: desktop only, shown in welcome/home state -->
    <div v-if="!chartData" class="past-readings-link-container">
      <button class="past-readings-link" @click="emit('view-history')">
        ✦ — or revisit a past reading — ✦
      </button>
    </div>
  </div>
</template>

<style scoped>
.user-chat {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow-y: auto;
}

.content-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 1rem;
  background: var(--color-surface);
  border-radius: 1rem;
  box-shadow: var(--shadow-md);
  width: 100%;
  overflow-x: hidden;
  transition: background-color 0.3s ease;
}

.welcome-message {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--color-text-secondary);
}

.welcome-message h2 {
  color: var(--color-text-primary);
  margin-bottom: 1rem;
}

.welcome-message > p {
  margin-bottom: 0.5rem;
}

.welcome-features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
  text-align: left;
}

.feature {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: var(--color-surface-raised);
  border-radius: 0.75rem;
  border: 1px solid var(--color-border);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.feature-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.feature h3 {
  margin: 0 0 0.25rem 0;
  color: var(--color-text-primary);
  font-size: 1rem;
}

.feature p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  line-height: 1.4;
}

.about-section {
  margin-top: 0.75rem;
  width: 100%;
}

.about-toggle {
  width: 100%;
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  padding: 0.6rem 1rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.about-toggle:hover {
  background: var(--color-surface-raised);
  color: var(--color-text-primary);
}

.about-chevron {
  font-size: 0.7rem;
}

.about-content {
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.about-features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.about-card {
  padding: 1rem;
  background: var(--color-surface-raised);
  border-radius: 0.75rem;
  border: 1px solid var(--color-border);
}

.about-card h3 {
  margin: 0 0 0.5rem 0;
  font-size: 0.95rem;
  color: var(--color-text-primary);
}

.about-card p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.about-card a {
  color: var(--color-accent, #4a90e2);
  text-decoration: underline;
}

/* ─── Past readings link (desktop only) ───────────────────── */
.past-readings-link-container {
  display: none;
  text-align: center;
  padding: 1.75rem 0 1.25rem;
  width: 100%;
}

.past-readings-link {
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--font-serif);
  font-size: 1.0625rem;
  color: var(--color-text-muted);
  letter-spacing: 0.04em;
  transition: color 0.25s ease;
  padding: 0.25rem 0.5rem;
  font-style: italic;
}

.past-readings-link:hover {
  color: var(--color-accent);
}

/* ─── Reading layout ──────────────────────────────────────── */
.reading-layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;
  min-height: 100%;
}

/* Conversation section: LEFT on desktop (via DOM order), full-width mobile */
.conversation-section {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}

/* Desktop chart panel: RIGHT column */
.chart-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
  min-height: 0;
}

/* Reading question heading: desktop only */
.reading-question {
  display: none;
}

/* Desktop chart tab navigation */
.chart-tab-navigation {
  display: flex;
  gap: 0;
  border-bottom: 2px solid var(--color-border);
  flex-shrink: 0;
}

.chart-tab-button {
  background: transparent;
  border: none;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.2s ease;
  font-family: var(--font-sans);
}

.chart-tab-button:hover {
  color: var(--color-text-primary);
  background: var(--color-surface-raised);
}

.chart-tab-button.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

.chart-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.new-reading-button {
  background: var(--color-success);
  color: var(--color-text-inverse);
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.new-reading-button:hover {
  filter: brightness(0.9);
  transform: translateY(-1px);
}

.new-reading-button:active {
  transform: translateY(0);
}

.reading-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.reading-saved {
  color: var(--color-success);
  font-size: 0.875rem;
  font-weight: 500;
}

/* Mobile tab Navigation Styles */
.tab-navigation {
  display: flex;
  gap: 0.5rem;
  border-bottom: 2px solid var(--color-border);
  padding-bottom: 0;
}

.mobile-chat-actions {
  padding: 0.75rem 1rem;
}

.mobile-chat-actions .new-reading-button {
  width: 100%;
}

.mobile-chart-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  flex-wrap: wrap;
}

.tab-button {
  background: transparent;
  border: none;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-text-muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.2s ease;
}

.tab-button:hover {
  color: var(--color-text-primary);
  background: var(--color-surface-raised);
}

.tab-button.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

.tab-content {
  flex: 1;
  min-height: 300px;
  overflow: hidden;
}

.input-area {
  position: sticky;
  bottom: 0;
  background: var(--color-bg);
  padding: 1rem 0;
  margin-top: auto;
  width: 100%;
  transition: background-color 0.3s ease;
}

/* ─── Tablet layout ───────────────────────────────────────── */
@media (max-width: 1024px) and (min-width: 769px) {
  .reading-layout {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .content-area {
    padding: 1rem;
  }

  .welcome-message {
    padding: 2rem 1rem;
  }

  .welcome-features {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
  }
}

/* ─── Mobile layout ───────────────────────────────────────── */
@media (max-width: 768px) {
  .reading-layout {
    grid-template-columns: 1fr;
    gap: 0;
  }

  /* Remove the card container on mobile so chat fills the viewport edge-to-edge */
  .content-area {
    padding: 0;
    border-radius: 0;
    box-shadow: none;
    background: transparent;
  }

  .tab-navigation {
    position: sticky;
    top: 0;
    z-index: 5;
    background: var(--color-bg);
    transition: background-color 0.3s ease;
  }

  .welcome-message {
    padding: 1.5rem 0.75rem;
  }

  .welcome-features {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}

@media (max-width: 640px) {
  .reading-layout {
    gap: 0;
  }

  .chart-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }

  .new-reading-button {
    width: 100%;
  }

  .welcome-message {
    padding: 1rem 0.5rem;
  }

  .welcome-features {
    margin-top: 1rem;
    gap: 0.75rem;
  }

  .feature {
    padding: 0.75rem;
  }

  .tab-button {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }
}

/* ─── Desktop 1024px+: journal layout ────────────────────── */
@media (min-width: 1024px) {
  /* Welcome / home state: centered journal form */
  .user-chat.welcome-state {
    align-items: center;
    overflow-y: auto;
    padding: 0 2rem;
  }

  .user-chat.welcome-state .content-area {
    max-width: 560px;
    width: 100%;
    background: transparent;
    box-shadow: none;
    border-radius: 0;
    text-align: center;
    overflow-y: visible;
    flex: none;
    height: auto;
  }

  .user-chat.welcome-state .welcome-message {
    padding: max(3rem, 10vh) 1rem 1.5rem;
  }

  .user-chat.welcome-state .welcome-message h2 {
    font-family: var(--font-serif);
    font-size: 2.25rem;
    font-weight: 400;
    letter-spacing: 0.02em;
    line-height: 1.2;
    margin-bottom: 0.75rem;
  }

  .user-chat.welcome-state .welcome-message p {
    font-size: 1rem;
    color: var(--color-text-secondary);
    line-height: 1.7;
  }

  .user-chat.welcome-state .input-area {
    max-width: 560px;
    width: 100%;
    position: relative;
    bottom: auto;
    margin-top: 0;
    padding: 0.5rem 0 0.75rem;
  }

  .user-chat.welcome-state .about-section {
    max-width: 560px;
    width: 100%;
  }

  /* Past readings link: show on desktop */
  .past-readings-link-container {
    display: block;
    max-width: 560px;
    width: 100%;
  }

  /* Reading layout: 60% chat left, 40% chart right */
  .reading-layout {
    grid-template-columns: 3fr 2fr;
    gap: 0;
    min-height: 100%;
    padding: 0;
    align-items: stretch;
  }

  /* content-area is transparent in reading state on desktop */
  .user-chat:not(.welcome-state) .content-area {
    background: transparent;
    box-shadow: none;
    border-radius: 0;
    padding: 0;
    overflow: visible;
    flex: 1;
  }

  /* Conversation section (LEFT): independently scrollable */
  .conversation-section {
    overflow-y: auto;
    border-right: 1px solid var(--color-border);
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* Reading question heading: show on desktop */
  .reading-question {
    display: block;
    font-family: var(--font-serif);
    font-size: 1.5rem;
    font-weight: 400;
    font-style: italic;
    color: var(--color-text-primary);
    line-height: 1.4;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 0.25rem;
    flex-shrink: 0;
  }

  /* Chart section (RIGHT): sticky with its own scroll */
  .chart-section {
    padding: 1rem 1rem 1rem 1.25rem;
    overflow-y: auto;
    position: sticky;
    top: 0;
    align-self: start;
    height: calc(100vh - 100px);
    max-height: calc(100vh - 100px);
  }
}

/* Desktop: compact welcome state — adjustments beyond 769px baseline */
@media (min-width: 769px) {
  .user-chat.welcome-state {
    overflow-y: auto;
  }

  .user-chat.welcome-state .content-area {
    flex: none;
    height: auto;
    overflow-y: visible;
  }

  .user-chat.welcome-state .welcome-message {
    padding: 1.5rem 1rem 1rem;
  }

  .user-chat.welcome-state .input-area {
    position: relative;
    bottom: auto;
    margin-top: 0;
    padding: 0.5rem 0 0.75rem;
  }
}
</style>
