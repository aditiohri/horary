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

@media (max-width: 768px) {
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
