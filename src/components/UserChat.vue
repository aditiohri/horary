<script setup lang="ts">
import { ref, nextTick, watch, onMounted } from "vue";
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
  chartData: any;
}

const props = defineProps<{
  selectedReading?: StoredReading | null;
}>();

const emit = defineEmits<{
  'new-reading': [];
}>();

const { saveReading, updateReading } = useReadingStorage();

const chartData = ref<QuestionData | null>(null);
const showConversation = ref(false);
const currentReadingId = ref<string | null>(null);
const activeTab = ref<'wheel' | 'data'>('wheel');

const handleChartCalculated = async (data: QuestionData) => {
  chartData.value = data;

  showConversation.value = true;
  activeTab.value = 'wheel'; // Start with chart wheel view

  // Save the new reading to storage
  try {
    const readingId = saveReading({
      question: data.question,
      timestamp: data.timestamp,
      location: data.location,
      chartData: data.chartData,
      conversation: [],
    });
    currentReadingId.value = readingId;
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

    // Calculate responsive chart size
    const containerWidth = paper.parentElement?.clientWidth || 600;
    console.log('Chart container width:', containerWidth);
    // Larger on desktop (up to 800px), responsive on mobile
    const chartSize = Math.min(containerWidth - 40, 800);
    console.log('Calculated chart size:', chartSize);

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

      // Handle Mercury's extra path (it has 2 paths when retrograde)
      if (planetKey === 'mercury' && planetGroup.children.length > 1) {
        if (!planetData.isRetrograde) {
          // Remove the second path (the retrograde indicator)
          planetGroup.children[1]?.remove();
        } else {
          // Make the retrograde path red
          const rxPath = planetGroup.children[1] as SVGPathElement;
          if (rxPath) {
            rxPath.setAttribute('stroke', '#dc2626');
            rxPath.setAttribute('fill', '#dc2626');
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
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
  }>
) => {
  if (currentReadingId.value) {
    try {
      const conversationData = messages.map((msg) => ({
        role: msg.role,
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
        chartData: newReading.chartData,
      };
      showConversation.value = true;
      currentReadingId.value = newReading.id;

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

// Load selected reading on mount if provided
onMounted(async () => {
  if (props.selectedReading) {
    chartData.value = {
      question: props.selectedReading.question,
      timestamp: props.selectedReading.timestamp,
      location: props.selectedReading.location,
      chartData: props.selectedReading.chartData,
    };
    showConversation.value = true;
    currentReadingId.value = props.selectedReading.id;

    await nextTick();
    await renderChart(chartData.value);
  }
});

// Re-render chart when switching to wheel tab
watch(activeTab, async (newTab) => {
  if (newTab === 'wheel' && chartData.value) {
    await nextTick();
    await renderChart(chartData.value);
  }
});
</script>

<template>
  <div class="user-chat">
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
        <div class="welcome-features">
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
              <p>All your readings are saved for future reference</p>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="reading-layout">
        <!-- Chart display -->
        <div class="chart-section">
          <!-- Tab Navigation -->
          <div class="tab-navigation">
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

          <!-- Tab Content -->
          <div class="tab-content">
            <HoraryChart v-if="activeTab === 'wheel'" :chart-data="chartData" />
            <ChartDataView v-if="activeTab === 'data'" :chart-data="chartData" />
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

        <!-- Conversation interface -->
        <div v-if="showConversation" class="conversation-section">
          <Chat
            :reading="chartData"
            :existing-conversation="selectedReading?.conversation || []"
            @conversation-update="handleConversationUpdate" />
        </div>
      </div>
    </div>

    <div v-if="!chartData" class="input-area">
      <QuestionForm @chart-calculated="handleChartCalculated" />
    </div>
  </div>
</template>

<style scoped>
.user-chat {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  background: var(--color-bg-secondary);
  border-radius: 1rem;
  box-shadow: var(--shadow-md);
  min-height: 300px;
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
  background: var(--color-bg-tertiary);
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

.reading-layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;
  height: 100%;
}

.chart-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0; /* Prevent overflow */
}

.chart-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.conversation-section {
  display: flex;
  flex-direction: column;
  min-height: 0;
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

/* Tab Navigation Styles */
.tab-navigation {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  border-bottom: 2px solid var(--color-border);
  padding-bottom: 0;
}

.tab-button {
  background: transparent;
  border: none;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-text-tertiary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.2s ease;
}

.tab-button:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-tertiary);
}

.tab-button.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

.tab-content {
  min-height: 400px;
}

.input-area {
  position: sticky;
  bottom: 0;
  background: var(--color-bg-primary);
  padding: 1rem 0;
  margin-top: auto;
  width: 100%;
  transition: background-color 0.3s ease;
}

/* Tablet layout */
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

/* Mobile layout */
@media (max-width: 768px) {
  .reading-layout {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .content-area {
    padding: 0.75rem;
  }

  .welcome-message {
    padding: 1.5rem 0.75rem;
  }

  .welcome-features {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .chart-section {
    order: 2; /* Chart comes after conversation on mobile */
  }

  .conversation-section {
    order: 1;
  }
}

@media (max-width: 640px) {
  .content-area {
    padding: 0.5rem;
    border-radius: 0.5rem;
  }

  .reading-layout {
    gap: 0.5rem;
  }

  .chart-section {
    gap: 0.5rem;
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
</style>
