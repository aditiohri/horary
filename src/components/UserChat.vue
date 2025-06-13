<script setup lang="ts">
import { ref, nextTick, watch, onMounted } from "vue";
import { Chart } from "@astrodraw/astrochart";
import QuestionForm from "./QuestionForm.vue";
import HoraryChart from "./HoraryChart.vue";
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

const { saveReading, updateReading } = useReadingStorage();

const chartData = ref<QuestionData | null>(null);
const showConversation = ref(false);
const currentReadingId = ref<string | null>(null);

const handleChartCalculated = async (data: QuestionData) => {
  chartData.value = data;
  showConversation.value = true;

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
    // Create new chart within our container
    const radix = new Chart("paper", 600, 600, {
      DEBUG: true,
      SYMBOL_SUN: "sun",
      SYMBOL_MOON: "moon",
      SYMBOL_MERCURY: "mercury",
      SYMBOL_VENUS: "venus",
      SYMBOL_MARS: "mars",
      SYMBOL_JUPITER: "jupiter",
      SYMBOL_SATURN: "saturn",
      SYMBOL_AS: "ascendant",
      SYMBOL_MC: "midheaven",
    }).radix(data.chartData);
    document.getElementById("paper-astrology-radix-axis")?.remove();
    radix.aspects();
  }
};

const startNewReading = () => {
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
          <HoraryChart :chart-data="chartData" />
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
  background: white;
  border-radius: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  min-height: 300px;
  width: 100%;
  overflow-x: hidden;
}

.welcome-message {
  text-align: center;
  padding: 2rem 1rem;
  color: #4a5568;
}

.welcome-message h2 {
  color: #2c3e50;
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
  background: #f8fafc;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
}

.feature-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.feature h3 {
  margin: 0 0 0.25rem 0;
  color: #2c3e50;
  font-size: 1rem;
}

.feature p {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.4;
}

.reading-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  height: 100%;
}

.chart-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
  background: #10b981;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.new-reading-button:hover {
  background: #059669;
}

.reading-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.reading-saved {
  color: #10b981;
  font-size: 0.875rem;
  font-weight: 500;
}

.input-area {
  position: sticky;
  bottom: 0;
  background: #f7fafc;
  padding: 1rem 0;
  margin-top: auto;
  width: 100%;
}

/* Mobile layout */
@media (max-width: 1024px) {
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
}

@media (max-width: 640px) {
  .content-area {
    padding: 0.5rem;
  }

  .reading-layout {
    gap: 0.75rem;
  }

  .chart-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .welcome-features {
    margin-top: 1.5rem;
  }

  .feature {
    padding: 0.75rem;
  }
}
</style>
