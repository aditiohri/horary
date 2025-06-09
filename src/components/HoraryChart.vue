<script setup lang="ts">
import { defineProps, onMounted, watch, nextTick } from "vue";
import { Chart } from "@astrodraw/astrochart";

interface ChartProps {
  chartData: {
    question: string;
    timestamp: string;
    location?: {
      latitude: number;
      longitude: number;
    };
    chart: any;
  } | null;
}

const props = defineProps<ChartProps>();

// Watch for changes in chartData and re-render the chart
// watch(
//   () => props.chartData,
//   (newData) => {
//     if (newData?.chart) {
//       // Wait for the next tick to ensure the paper div exists
//       nextTick(() => {
//         const paper = document.getElementById("paper");
//         if (paper) {
//           // Clear any existing chart
//           paper.innerHTML = "";
//           // Create new chart within our container
//           const radix = new Chart("paper", 600, 600).radix(newData.chart);
//           radix.addPointsOfInterest({
//             As: props.chartData?.chart.cusps[0],
//           });
//           radix.aspects();
//         }
//       });
//     }
//   },
//   { immediate: true }
// );
</script>

<template>
  <div class="chart-container" v-if="props.chartData">
    <div class="chart-header">
      <h2>Horary Chart</h2>
      <div class="chart-meta">
        <p class="question">{{ props.chartData.question }}</p>
        <p class="timestamp">
          {{ new Date(props.chartData.timestamp).toLocaleString() }}
        </p>
      </div>
    </div>
    <div class="chart-content">
      <div id="paper" class="chart-paper"></div>
    </div>
  </div>
</template>

<style scoped>
.chart-container {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  width: 100%;
  overflow: hidden;
}

.chart-header {
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 1rem;
}

.chart-header h2 {
  color: #2c3e50;
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
}

.chart-meta {
  color: #4a5568;
}

.question {
  font-size: 1.1rem;
  margin: 0.5rem 0;
  font-style: italic;
}

.timestamp {
  color: #718096;
  font-size: 0.9rem;
  margin: 0.5rem 0;
}

.chart-content {
  min-height: 300px;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  width: 100%;
  overflow: hidden;
}

.chart-paper {
  width: 600px;
  height: 600px;
  display: flex;
  justify-content: center;
  align-items: center;
  /* Optionally, for responsiveness: */
  max-width: 100%;
  aspect-ratio: 1/1;
}

/* Ensure the chart SVG is contained */
.chart-paper :deep(svg) {
  max-width: 100%;
  max-height: 100%;
  height: auto;
  width: auto;
  /* Remove absolute positioning */
}

@media (max-width: 640px) {
  .chart-container {
    padding: 1rem;
  }

  .chart-header h2 {
    font-size: 1.25rem;
  }

  .question {
    font-size: 1rem;
  }

  .chart-content {
    min-height: 250px;
    padding: 0.5rem;
  }

  .chart-paper {
    width: 100vw;
    height: 100vw;
    min-width: 0;
    min-height: 0;
    max-width: 100%;
    max-height: 100vw;
  }
}
</style>
