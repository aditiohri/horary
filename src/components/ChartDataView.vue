<script setup lang="ts">
import { computed } from 'vue';
import { extractAspectsWithMotion, analyzeMoonAspects } from '../utils/aspectMotion';

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

// Calculate aspects with motion
const aspectsWithMotion = computed(() => {
  if (!props.chartData) return [];
  return extractAspectsWithMotion(
    props.chartData.chartData,
    props.chartData.chartData.aspects
  );
});

// Analyze Moon aspects specifically
const moonAnalysis = computed(() => {
  if (aspectsWithMotion.value.length === 0) return null;
  return analyzeMoonAspects(aspectsWithMotion.value);
});

// Helper to get zodiac sign from degrees
const getZodiacSign = (degrees: number) => {
  const signs = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];
  const signIndex = Math.floor(degrees / 30);
  const degreesInSign = degrees % 30;
  return `${degreesInSign.toFixed(2)}° ${signs[signIndex]}`;
};

// Helper to format time to exact
const formatTimeToExact = (days: number | undefined) => {
  if (days === undefined) return '';
  if (days < 1) {
    const hours = days * 24;
    return `${hours.toFixed(1)} hours`;
  }
  return `${days.toFixed(1)} days`;
};
</script>

<template>
  <div class="chart-data-view" v-if="props.chartData">
    <div class="data-header">
      <h2>Chart Data</h2>
      <div class="chart-meta">
        <p class="question">{{ props.chartData.question }}</p>
        <p class="timestamp">
          {{ new Date(props.chartData.timestamp).toLocaleString() }}
        </p>
        <p class="location" v-if="props.chartData.location">
          {{ props.chartData.location.latitude.toFixed(4) }}°N,
          {{ Math.abs(props.chartData.location.longitude).toFixed(4) }}°W
        </p>
      </div>
    </div>

    <!-- Planets Section -->
    <div class="data-section">
      <h3>Planetary Positions</h3>
      <table class="data-table planets-table">
        <thead>
          <tr>
            <th>Planet</th>
            <th>Position</th>
            <th>Zodiac</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="[planet, data] in Object.entries(props.chartData.chartData.planets)"
            :key="planet"
            :class="{ retrograde: (data as any).isRetrograde }"
          >
            <td class="planet-name">
              <span class="planet-symbol">{{ planet }}</span>
            </td>
            <td class="planet-position">{{ (data as any).position.toFixed(2) }}°</td>
            <td class="zodiac-sign">{{ getZodiacSign((data as any).position) }}</td>
            <td class="retrograde-status">
              <span v-if="(data as any).isRetrograde" class="rx-badge">℞ Retrograde</span>
              <span v-else class="direct-badge">→ Direct</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Moon Aspects - Separating -->
    <div class="data-section moon-section" v-if="moonAnalysis">
      <h3>Moon's Last Aspect (Separating)</h3>
      <div v-if="moonAnalysis.lastSeparatingAspect" class="aspect-highlight">
        <div class="aspect-description">
          <strong>{{ moonAnalysis.lastSeparatingAspect.point1Label }}</strong>
          {{ moonAnalysis.lastSeparatingAspect.aspectLabel }}
          <strong>{{ moonAnalysis.lastSeparatingAspect.point2Label }}</strong>
        </div>
        <div class="aspect-details">
          <span class="orb">Orb: {{ moonAnalysis.lastSeparatingAspect.currentOrb.toFixed(2) }}°</span>
          <span class="motion separating">SEPARATING</span>
          <span v-if="(moonAnalysis.lastSeparatingAspect as any).isFaded" class="faded-badge">
            Influence faded
          </span>
          <span v-if="moonAnalysis.lastSeparatingAspect.timeSinceExact" class="time-info">
            Was exact {{ formatTimeToExact(moonAnalysis.lastSeparatingAspect.timeSinceExact) }} ago
          </span>
        </div>
      </div>
      <p v-else class="no-aspect">No separating aspect found</p>
    </div>

    <!-- Moon Aspects - Applying -->
    <div class="data-section moon-section" v-if="moonAnalysis">
      <h3>Moon's Next Aspect (Applying)</h3>
      <div v-if="moonAnalysis.nextApplyingAspect" class="aspect-highlight">
        <div class="aspect-description">
          <strong>{{ moonAnalysis.nextApplyingAspect.point1Label }}</strong>
          {{ moonAnalysis.nextApplyingAspect.aspectLabel }}
          <strong>{{ moonAnalysis.nextApplyingAspect.point2Label }}</strong>
        </div>
        <div class="aspect-details">
          <span class="orb">Orb: {{ moonAnalysis.nextApplyingAspect.currentOrb.toFixed(2) }}°</span>
          <span class="motion applying">APPLYING</span>
          <span v-if="moonAnalysis.nextApplyingAspect.timeToExact" class="time-info">
            Will be exact in {{ formatTimeToExact(moonAnalysis.nextApplyingAspect.timeToExact) }}
          </span>
        </div>
      </div>
      <p v-else class="no-aspect">No applying aspect found</p>
    </div>

    <!-- All Aspects Section -->
    <div class="data-section">
      <h3>All Aspects with Motion</h3>
      <table class="data-table aspects-table">
        <thead>
          <tr>
            <th>Aspect</th>
            <th>Orb</th>
            <th>Motion</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(aspect, idx) in aspectsWithMotion"
            :key="idx"
            :class="{
              'moon-aspect': aspect.point1Key === 'moon' || aspect.point2Key === 'moon',
              'applying': aspect.isApplying,
              'separating': aspect.isSeparating
            }"
          >
            <td class="aspect-name">
              <strong>{{ aspect.point1Key }}</strong>
              <span class="aspect-symbol">{{ aspect.aspectKey }}</span>
              <strong>{{ aspect.point2Key }}</strong>
            </td>
            <td class="aspect-orb">{{ aspect.currentOrb.toFixed(2) }}°</td>
            <td class="aspect-motion">
              <span v-if="aspect.isApplying" class="badge applying-badge">Applying</span>
              <span v-else-if="aspect.isSeparating" class="badge separating-badge">Separating</span>
              <span v-else class="badge stable-badge">Stable</span>
              <span v-if="aspect.isPerfect" class="perfect-indicator">★</span>
            </td>
            <td class="aspect-time">
              <span v-if="aspect.timeToExact">
                {{ formatTimeToExact(aspect.timeToExact) }}
              </span>
              <span v-else-if="aspect.timeSinceExact" class="past-time">
                {{ formatTimeToExact(aspect.timeSinceExact) }} ago
              </span>
              <span v-else>—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Houses Section -->
    <div class="data-section">
      <h3>House Cusps</h3>
      <div class="houses-grid">
        <div
          v-for="(cusp, idx) in props.chartData.chartData.cusps"
          :key="idx"
          class="house-item"
        >
          <span class="house-number">{{ idx + 1 }}</span>
          <span class="house-position">{{ cusp.toFixed(2) }}°</span>
          <span class="house-sign">{{ getZodiacSign(cusp) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chart-data-view {
  background: var(--color-bg-secondary);
  border-radius: 1rem;
  padding: 1.5rem;
  overflow-y: auto;
  max-height: 100%;
  transition: background-color 0.3s ease;
}

.data-header {
  margin-bottom: 1.5rem;
  border-bottom: 2px solid var(--color-border);
  padding-bottom: 1rem;
}

.data-header h2 {
  color: var(--color-text-primary);
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
}

.chart-meta {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.question {
  font-size: 1.1rem;
  margin: 0.5rem 0;
  font-style: italic;
  color: var(--color-text-primary);
}

.timestamp, .location {
  color: var(--color-text-tertiary);
  font-size: 0.85rem;
  margin: 0.25rem 0;
}

.data-section {
  margin-bottom: 2rem;
}

.data-section h3 {
  color: var(--color-text-primary);
  font-size: 1.1rem;
  margin: 0 0 1rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border-focus);
}

/* Tables */
.data-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  overflow: hidden;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.data-table thead {
  background: var(--color-bg-tertiary);
}

.data-table th {
  text-align: left;
  padding: 0.75rem;
  font-weight: 600;
  color: var(--color-text-primary);
  border-bottom: 2px solid var(--color-border-focus);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.data-table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-secondary);
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

.data-table tbody tr:hover {
  background: var(--color-bg-tertiary);
}

/* Planet Table */
.planet-name {
  font-weight: 600;
  text-transform: capitalize;
  color: var(--color-text-primary);
}

.planet-position {
  font-family: monospace;
  font-size: 0.95rem;
}

.zodiac-sign {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.retrograde-status {
  font-size: 0.85rem;
}

.rx-badge {
  background: #fee2e2;
  color: #dc2626;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-weight: 600;
  font-size: 0.75rem;
}

.direct-badge {
  color: #059669;
  font-weight: 500;
  font-size: 0.75rem;
}

.retrograde {
  background: #fef2f2;
}

/* Moon Aspects */
.moon-section {
  background: #fffbeb;
  border: 2px solid #fbbf24;
  border-radius: 0.5rem;
  padding: 1rem;
}

.aspect-highlight {
  background: var(--color-bg-secondary);
  border-radius: 0.5rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
}

.aspect-description {
  font-size: 1.1rem;
  margin-bottom: 0.75rem;
  color: var(--color-text-primary);
}

.aspect-description strong {
  text-transform: capitalize;
  color: #1f2937;
}

.aspect-details {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
  font-size: 0.9rem;
}

.orb {
  font-family: monospace;
  background: var(--color-bg-tertiary);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

.motion {
  padding: 0.25rem 0.75rem;
  border-radius: 0.25rem;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.motion.applying {
  background: #d1fae5;
  color: #065f46;
}

.motion.separating {
  background: #dbeafe;
  color: #1e40af;
}

.time-info {
  color: var(--color-text-secondary);
  font-style: italic;
}

.faded-badge {
  background: #fef3c7;
  color: #92400e;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.no-aspect {
  color: #9ca3af;
  font-style: italic;
  margin: 0;
}

/* Aspects Table */
.aspect-name {
  font-weight: 500;
}

.aspect-name strong {
  text-transform: capitalize;
}

.aspect-symbol {
  margin: 0 0.5rem;
  color: var(--color-text-secondary);
}

.aspect-orb {
  font-family: monospace;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.applying-badge {
  background: #d1fae5;
  color: #065f46;
}

.separating-badge {
  background: #dbeafe;
  color: #1e40af;
}

.stable-badge {
  background: #e5e7eb;
  color: var(--color-text-secondary);
}

.perfect-indicator {
  color: #fbbf24;
  margin-left: 0.25rem;
}

.moon-aspect {
  background: #fffbeb;
  font-weight: 500;
}

.past-time {
  color: #9ca3af;
}

/* Houses Grid */
.houses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.75rem;
}

.house-item {
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.house-number {
  font-weight: 700;
  color: var(--color-text-primary);
  font-size: 1rem;
}

.house-number::before {
  content: 'House ';
  font-weight: 400;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.house-position {
  font-family: monospace;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.house-sign {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

/* Responsive */
@media (max-width: 640px) {
  .chart-data-view {
    padding: 1rem;
  }

  .data-table th,
  .data-table td {
    padding: 0.5rem;
    font-size: 0.85rem;
  }

  .aspect-details {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .houses-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
