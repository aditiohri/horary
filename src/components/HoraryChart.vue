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
/* No card wrapper — the chart wheel is self-contained visually. */
.chart-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* Container-query context so chart-paper can fill the shorter side. */
.chart-content {
  flex: 1;
  min-height: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  container-type: size;
}

/* Square that fills whichever dimension is smaller. */
.chart-paper {
  width: min(100cqw, 100cqh);
  height: min(100cqw, 100cqh);
}

/* SVG fills the paper square; viewBox handles internal scaling. */
.chart-paper :deep(svg) {
  width: 100% !important;
  height: 100% !important;
  display: block;
}

/* Invert the chart SVG in dark mode so it's readable on dark backgrounds */
:global(.dark) .chart-paper :deep(svg) {
  filter: invert(1) hue-rotate(180deg);
}
</style>
