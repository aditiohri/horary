<script setup lang="ts">
import { defineProps } from "vue";

interface ChartProps {
  chartData: {
    question: string;
    timestamp: string;
    location?: {
      latitude: number;
      longitude: number;
    };
    chartData: any;
  } | null;
}

const props = defineProps<ChartProps>();
</script>

<template>
  <div class="chart-container" v-if="props.chartData">
    <div class="chart-header hide-mobile">
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
  background: var(--color-bg-secondary);
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: var(--shadow-md);
  width: 100%;
  overflow: hidden;
  transition: background-color 0.3s ease;
}

.chart-header {
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 1rem;
}

.chart-header h2 {
  color: var(--color-text-primary);
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
}

.chart-meta {
  color: var(--color-text-secondary);
}

.question {
  font-size: 1.1rem;
  margin: 0.5rem 0;
  font-style: italic;
  color: var(--color-text-primary);
}

.timestamp {
  color: var(--color-text-tertiary);
  font-size: 0.9rem;
  margin: 0.5rem 0;
}

.chart-content {
  min-height: 300px;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  padding: 0.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  width: 100%;
  overflow: hidden;
  background: var(--color-bg-secondary);
}

.chart-paper {
  width: 100%;
  height: auto;
  max-width: 800px;
  aspect-ratio: 1/1;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

/* Ensure the chart SVG is contained and responsive */
.chart-paper :deep(svg) {
  max-width: 100%;
  max-height: 100%;
}

/* Hide header on mobile */
.hide-mobile {
  display: block;
}

@media (max-width: 768px) {
  .hide-mobile {
    display: none;
  }

  .chart-container {
    padding: 0.5rem;
  }

  .chart-content {
    min-height: auto;
    padding: 0.25rem;
    border: none;
  }

  .chart-paper {
    max-width: 100%;
    width: 100%;
  }
}

@media (max-width: 640px) {
  .chart-container {
    padding: 0;
    background: transparent;
    box-shadow: none;
  }

  .chart-content {
    padding: 0;
  }
}
</style>
