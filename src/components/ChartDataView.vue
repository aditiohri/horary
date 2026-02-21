<script setup lang="ts">
import { computed } from 'vue';
import { extractAspectsWithMotion, analyzeMoonAspects } from '../utils/aspectMotion';
import { calculateChartDignities, isDayChart } from '../utils/horary/dignities';
import { calculateVoidOfCourseMoon } from '../utils/horary/voidOfCourseMoon';

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

// Calculate Void of Course Moon
const vocMoon = computed(() => {
  if (!props.chartData) return null;
  return calculateVoidOfCourseMoon(props.chartData.chartData.planets);
});

// Calculate essential dignities
const planetDignities = computed(() => {
  if (!props.chartData) return {};

  // Determine if it's a day or night chart
  const sunPosition = props.chartData.chartData.planets.sun?.position;
  const cusps = props.chartData.chartData.cusps;

  if (!sunPosition || !cusps) return {};

  // Find which house the Sun is in
  const normalizedSun = ((sunPosition % 360) + 360) % 360;
  let sunHouse = 1;

  for (let i = 0; i < cusps.length; i++) {
    const currentCusp = ((cusps[i] % 360) + 360) % 360;
    const nextCusp = ((cusps[(i + 1) % cusps.length] % 360) + 360) % 360;

    if (nextCusp > currentCusp) {
      if (normalizedSun >= currentCusp && normalizedSun < nextCusp) {
        sunHouse = i + 1;
        break;
      }
    } else {
      if (normalizedSun >= currentCusp || normalizedSun < nextCusp) {
        sunHouse = i + 1;
        break;
      }
    }
  }

  const isDayChartValue = isDayChart(sunHouse);
  return calculateChartDignities(props.chartData.chartData.planets, isDayChartValue);
});

// Determine day/night chart
const chartType = computed(() => {
  if (!props.chartData) return 'Unknown';

  const sunPosition = props.chartData.chartData.planets.sun?.position;
  const cusps = props.chartData.chartData.cusps;

  if (!sunPosition || !cusps) return 'Unknown';

  const normalizedSun = ((sunPosition % 360) + 360) % 360;
  let sunHouse = 1;

  for (let i = 0; i < cusps.length; i++) {
    const currentCusp = ((cusps[i] % 360) + 360) % 360;
    const nextCusp = ((cusps[(i + 1) % cusps.length] % 360) + 360) % 360;

    if (nextCusp > currentCusp) {
      if (normalizedSun >= currentCusp && normalizedSun < nextCusp) {
        sunHouse = i + 1;
        break;
      }
    } else {
      if (normalizedSun >= currentCusp || normalizedSun < nextCusp) {
        sunHouse = i + 1;
        break;
      }
    }
  }

  return isDayChart(sunHouse) ? 'Day Chart' : 'Night Chart';
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

    <!-- Essential Dignities Section -->
    <div class="data-section">
      <h3>Essential Dignities <span class="chart-type-badge">{{ chartType }}</span></h3>
      <table class="data-table dignities-table">
        <thead>
          <tr>
            <th>Planet</th>
            <th>Dignity</th>
            <th>Strength</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="[planet, dignity] in Object.entries(planetDignities)"
            :key="planet"
            :class="{
              'very-strong': (dignity as any).strength === 'Very Strong',
              'strong': (dignity as any).strength === 'Strong',
              'moderate': (dignity as any).strength === 'Moderate',
              'peregrine': (dignity as any).strength === 'Peregrine',
              'weak': (dignity as any).strength === 'Weak',
              'very-weak': (dignity as any).strength === 'Very Weak'
            }"
          >
            <td class="planet-name">
              <span class="planet-symbol">{{ planet }}</span>
            </td>
            <td class="dignity-type">{{ (dignity as any).description }}</td>
            <td class="dignity-strength">
              <span class="strength-badge">{{ (dignity as any).strength }}</span>
            </td>
            <td class="dignity-score" :class="{
              positive: (dignity as any).score > 0,
              negative: (dignity as any).score < 0,
              neutral: (dignity as any).score === 0
            }">
              {{ (dignity as any).score > 0 ? '+' : '' }}{{ (dignity as any).score }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Void of Course Moon Section -->
    <div class="data-section voc-section" v-if="vocMoon">
      <h3>Void of Course Moon</h3>
      <div class="voc-status" :class="{
        'voc-warning': vocMoon.isVoid && !vocMoon.effectiveInCurrentSign,
        'voc-ok': !vocMoon.isVoid,
        'voc-exception': vocMoon.isVoid && vocMoon.effectiveInCurrentSign
      }">
        <div class="voc-header">
          <span class="voc-icon">{{ vocMoon.isVoid ? '⚠️' : '✓' }}</span>
          <strong>{{ vocMoon.isVoid ? 'VOID OF COURSE' : 'NOT VOID OF COURSE' }}</strong>
        </div>
        <div class="voc-details">
          <p><strong>Current Sign:</strong> {{ vocMoon.currentSign }} ({{ vocMoon.degreesUntilNextSign.toFixed(1) }}° until {{ vocMoon.nextSign }})</p>
          <p><strong>Time Until Sign Change:</strong> {{ vocMoon.hoursUntilNextSign.toFixed(1) }} hours</p>
          <p v-if="!vocMoon.isVoid && vocMoon.lastAspect">
            <strong>Next Aspect:</strong> Moon will {{ vocMoon.lastAspectType }} {{ vocMoon.lastAspectPlanet?.toUpperCase() }} before leaving {{ vocMoon.currentSign }}
          </p>
          <p v-if="vocMoon.isVoid && vocMoon.effectiveInCurrentSign" class="exception-note">
            Moon is in {{ vocMoon.currentSign }}, an exception sign where VOC Moon is still effective.
          </p>
        </div>
        <div class="voc-interpretation">
          {{ vocMoon.interpretation }}
        </div>
      </div>
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

/* Essential Dignities Styles */
.chart-type-badge {
  font-size: 0.8rem;
  font-weight: normal;
  color: var(--color-text-secondary);
  margin-left: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: var(--color-bg-tertiary);
  border-radius: 0.25rem;
}

.dignities-table .planet-symbol {
  text-transform: capitalize;
  font-weight: 600;
}

.dignity-type {
  font-size: 0.9rem;
}

.strength-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.dignity-score {
  font-family: monospace;
  font-weight: 700;
  font-size: 1.1rem;
}

.dignity-score.positive {
  color: #059669;
}

.dignity-score.negative {
  color: #dc2626;
}

.dignity-score.neutral {
  color: var(--color-text-tertiary);
}

/* Row coloring by strength */
.dignities-table tr.very-strong {
  background: rgba(16, 185, 129, 0.1);
}

.dignities-table tr.very-strong .strength-badge {
  background: #10b981;
  color: white;
}

.dignities-table tr.strong {
  background: rgba(34, 197, 94, 0.08);
}

.dignities-table tr.strong .strength-badge {
  background: #22c55e;
  color: white;
}

.dignities-table tr.moderate {
  background: rgba(59, 130, 246, 0.05);
}

.dignities-table tr.moderate .strength-badge {
  background: #3b82f6;
  color: white;
}

.dignities-table tr.peregrine {
  background: transparent;
}

.dignities-table tr.peregrine .strength-badge {
  background: #6b7280;
  color: white;
}

.dignities-table tr.weak {
  background: rgba(251, 146, 60, 0.08);
}

.dignities-table tr.weak .strength-badge {
  background: #fb923c;
  color: white;
}

.dignities-table tr.very-weak {
  background: rgba(239, 68, 68, 0.1);
}

.dignities-table tr.very-weak .strength-badge {
  background: #ef4444;
  color: white;
}

/* Void of Course Moon Styles */
.voc-section {
  margin-bottom: 2rem;
}

.voc-status {
  padding: 1.5rem;
  border-radius: 0.5rem;
  border: 2px solid;
  background: var(--color-bg-secondary);
}

.voc-status.voc-warning {
  border-color: #dc2626;
  background: rgba(220, 38, 38, 0.05);
}

.voc-status.voc-ok {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.05);
}

.voc-status.voc-exception {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.05);
}

.voc-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.voc-icon {
  font-size: 1.5rem;
}

.voc-details {
  margin: 1rem 0;
  font-size: 0.95rem;
}

.voc-details p {
  margin: 0.5rem 0;
  color: var(--color-text-secondary);
}

.voc-details strong {
  color: var(--color-text-primary);
}

.exception-note {
  color: #f59e0b !important;
  font-style: italic;
}

.voc-interpretation {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
  font-style: italic;
  color: var(--color-text-primary);
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
