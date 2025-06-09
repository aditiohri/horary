<script setup lang="ts">
import { ref, nextTick } from "vue";
import { Chart } from "@astrodraw/astrochart";
import QuestionForm from "./QuestionForm.vue";
import HoraryChart from "./HoraryChart.vue";

interface QuestionData {
  question: string;
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  chartData: any;
}

const chartData = ref<QuestionData | null>(null);

const handleChartCalculated = async (data: QuestionData) => {
  chartData.value = data;
  // Wait for the next tick to ensure the paper div exists
  await nextTick();
  const paper = document.getElementById("paper");
  if (paper) {
    // Clear any existing chart
    paper.innerHTML = "";
    // Create new chart within our container
    const radix = new Chart("paper", 600, 600).radix(data.chartData);
    radix.aspects();
  }
};
</script>

<template>
  <div class="user-chat">
    <div class="content-area">
      <div v-if="!chartData" class="welcome-message">
        <h2>Welcome to Horary Astrology</h2>
        <p>Ask a yes/no question below to receive an astrological reading.</p>
        <p>
          Your question will be analyzed based on the current planetary
          positions.
        </p>
      </div>
      <HoraryChart v-else :chart-data="chartData" />
    </div>

    <div class="input-area">
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

.welcome-message p {
  margin-bottom: 0.5rem;
}

.input-area {
  position: sticky;
  bottom: 0;
  background: #f7fafc;
  padding: 1rem 0;
  margin-top: auto;
  width: 100%;
}

@media (max-width: 640px) {
  .content-area {
    padding: 0.75rem;
  }

  .welcome-message {
    padding: 1.5rem 0.75rem;
  }
}
</style>
