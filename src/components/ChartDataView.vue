<script setup lang="ts">
import { computed, ref } from 'vue';
import { extractAspectsWithMotion, analyzeMoonAspects } from '../utils/aspectMotion';
import { formatChartForLLMWithMotion } from '../utils/llm';
import { calculateChartDignities, isDayChart } from '../utils/horary/dignities';
import { calculateVoidOfCourseMoon } from '../utils/horary/voidOfCourseMoon';
import { calculatePartOfFortune } from '../utils/horary/arabicParts';
import { calculateChartAccidentalDignities } from '../utils/horary/accidentalDignities';

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

// Calculate Void of Course Moon using the same applying aspect as the Moon section
const vocMoon = computed(() => {
  if (!props.chartData) return null;
  return calculateVoidOfCourseMoon(
    props.chartData.chartData.planets,
    moonAnalysis.value?.nextApplyingAspect ?? null
  );
});

// Calculate Part of Fortune
const partOfFortune = computed(() => {
  if (!props.chartData) return null;

  const ascendant = props.chartData.chartData.planets.ascendant?.position;
  const sun = props.chartData.chartData.planets.sun?.position;
  const moon = props.chartData.chartData.planets.moon?.position;
  const planets = props.chartData.chartData.planets;
  const cusps = props.chartData.chartData.cusps;

  if (!ascendant || !sun || !moon || !cusps) return null;

  return calculatePartOfFortune(ascendant, sun, moon, planets, cusps);
});

// Determine if it's a day or night chart (reused by multiple computed properties)
const isDayChartValue = computed(() => {
  if (!props.chartData) return undefined;

  const sunPosition = props.chartData.chartData.planets.sun?.position;
  const cusps = props.chartData.chartData.cusps;

  if (!sunPosition || !cusps) return undefined;

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

  return isDayChart(sunHouse);
});

// Calculate essential dignities
const planetDignities = computed(() => {
  if (!props.chartData || isDayChartValue.value === undefined) return {};
  return calculateChartDignities(props.chartData.chartData.planets, isDayChartValue.value);
});

// Calculate accidental dignities
const planetAccidentalDignities = computed(() => {
  if (!props.chartData) return {};

  const planets = props.chartData.chartData.planets;
  const cusps = props.chartData.chartData.cusps;

  if (!planets || !cusps) return {};

  return calculateChartAccidentalDignities(planets, cusps, isDayChartValue.value);
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

// Section detail toggles (mobile: collapsed by default, expanded on demand)
const showEssentialDetails = ref(false);
const showAccidentalDetails = ref(false);
const showAspectsDetails = ref(false);

// Copy chart data to clipboard
const copied = ref(false);
const copyChartData = async () => {
  if (!props.chartData) return;
  const text = formatChartForLLMWithMotion(props.chartData as any);
  await navigator.clipboard.writeText(text);
  copied.value = true;
  setTimeout(() => { copied.value = false; }, 2000);
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
      <div class="header-row">
        <h2>Chart Data</h2>
        <button class="copy-btn" @click="copyChartData" :class="{ copied }">
          {{ copied ? 'Copied!' : 'Copy chart details' }}
        </button>
      </div>
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
      <div class="section-header">
        <h3>Essential Dignities <span class="chart-type-badge">{{ chartType }}</span></h3>
        <button class="details-toggle" @click="showEssentialDetails = !showEssentialDetails">
          {{ showEssentialDetails ? '▲ Less' : '▼ Details' }}
        </button>
      </div>
      <table class="data-table dignities-table" :class="{ 'show-details': showEssentialDetails }">
        <thead>
          <tr>
            <th>Planet</th>
            <th class="detail-col">Dignity</th>
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
            <td class="dignity-type detail-col">
              {{ (dignity as any).strength === 'Peregrine' ? '—' : (dignity as any).description }}
            </td>
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

    <!-- Accidental Dignities Section -->
    <div class="data-section">
      <div class="section-header">
        <h3>Accidental Dignities</h3>
        <button class="details-toggle" @click="showAccidentalDetails = !showAccidentalDetails">
          {{ showAccidentalDetails ? '▲ Less' : '▼ Details' }}
        </button>
      </div>
      <table class="data-table dignities-table" :class="{ 'show-details': showAccidentalDetails }">
        <thead>
          <tr>
            <th>Planet</th>
            <th class="detail-col">House</th>
            <th class="detail-col">Speed</th>
            <th class="detail-col">Light</th>
            <th>Strength</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="[planet, dignity] in Object.entries(planetAccidentalDignities)"
            :key="planet"
            :class="{
              'very-strong': (dignity as any).strength === 'Very Strong',
              'strong': (dignity as any).strength === 'Strong',
              'moderate': (dignity as any).strength === 'Moderate',
              'neutral': (dignity as any).strength === 'Neutral',
              'weak': (dignity as any).strength === 'Weak',
              'very-weak': (dignity as any).strength === 'Very Weak'
            }"
          >
            <td class="planet-name">
              <span class="planet-symbol">{{ planet }}</span>
            </td>
            <td class="house-type detail-col">
              <span class="house-badge" :class="{
                'angular': (dignity as any).houseType === 'Angular',
                'succedent': (dignity as any).houseType === 'Succedent',
                'cadent': (dignity as any).houseType === 'Cadent'
              }">
                {{ (dignity as any).houseType }}
              </span>
            </td>
            <td class="speed-status detail-col">
              <span class="speed-badge" :class="{
                'swift': (dignity as any).speedStatus === 'Swift',
                'average': (dignity as any).speedStatus === 'Average',
                'slow': (dignity as any).speedStatus === 'Slow',
                'retrograde': (dignity as any).speedStatus === 'Retrograde'
              }">
                {{ (dignity as any).speedStatus }}
              </span>
            </td>
            <td class="light-condition detail-col">
              <span class="light-badge" :class="{
                'cazimi': (dignity as any).lightCondition === 'Cazimi',
                'in-chariot': (dignity as any).lightCondition === 'In Chariot',
                'combust': (dignity as any).lightCondition === 'Combust',
                'under-beams': (dignity as any).lightCondition === 'Under Beams',
                'free': (dignity as any).lightCondition === 'Free',
                'na': (dignity as any).lightCondition === 'N/A'
              }">
                {{ (dignity as any).lightCondition }}
              </span>
            </td>
            <td class="dignity-strength">
              <span class="strength-badge">{{ (dignity as any).strength }}</span>
            </td>
            <td class="dignity-score" :class="{
              positive: (dignity as any).totalScore > 0,
              negative: (dignity as any).totalScore < 0,
              neutral: (dignity as any).totalScore === 0
            }">
              {{ (dignity as any).totalScore > 0 ? '+' : '' }}{{ (dignity as any).totalScore }}
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

    <!-- Part of Fortune Section -->
    <div class="data-section pof-section" v-if="partOfFortune">
      <h3>Part of Fortune (Pars Fortunae)</h3>
      <div class="pof-container">
        <div class="pof-main-info">
          <div class="pof-position">
            <span class="pof-icon">☽⊕</span>
            <div class="pof-details">
              <p class="pof-location">
                <strong>{{ partOfFortune.formattedPosition }}</strong>
                in House {{ partOfFortune.house }}
              </p>
              <p class="pof-chart-type">
                {{ partOfFortune.isDayChart ? 'Day Chart' : 'Night Chart' }} Formula:
                {{ partOfFortune.isDayChart ? 'Asc + Moon - Sun' : 'Asc + Sun - Moon' }}
              </p>
            </div>
          </div>
        </div>

        <div class="pof-dispositor">
          <h4>Dispositor Analysis</h4>
          <p class="dispositor-info">
            <strong>Ruler:</strong>
            <span class="planet-name">{{ partOfFortune.dispositor.charAt(0).toUpperCase() + partOfFortune.dispositor.slice(1) }}</span>
            at {{ partOfFortune.dispositorSign.charAt(0).toUpperCase() + partOfFortune.dispositorSign.slice(1) }},
            House {{ partOfFortune.dispositorHouse }}
          </p>
          <div class="dispositor-dignity">
            <span class="strength-badge" :class="{
              'very-strong': partOfFortune.dispositorDignity.strength === 'Very Strong',
              'strong': partOfFortune.dispositorDignity.strength === 'Strong',
              'moderate': partOfFortune.dispositorDignity.strength === 'Moderate',
              'peregrine': partOfFortune.dispositorDignity.strength === 'Peregrine',
              'weak': partOfFortune.dispositorDignity.strength === 'Weak',
              'very-weak': partOfFortune.dispositorDignity.strength === 'Very Weak'
            }">
              {{ partOfFortune.dispositorDignity.strength }}
            </span>
            <span class="dignity-score" :class="{
              'positive': partOfFortune.dispositorDignity.score > 0,
              'negative': partOfFortune.dispositorDignity.score < 0,
              'neutral': partOfFortune.dispositorDignity.score === 0
            }">
              Score: {{ partOfFortune.dispositorDignity.score > 0 ? '+' : '' }}{{ partOfFortune.dispositorDignity.score }}
            </span>
          </div>
          <p class="dispositor-description">{{ partOfFortune.dispositorDignity.description }}</p>
        </div>

        <div class="pof-interpretation">
          <p><em>The Part of Fortune represents the body, health, material fortune, and worldly success.
          Its condition by house, sign, and especially the strength of its dispositor
          indicates the querent's resources and capacity for achieving the desired outcome.</em></p>
        </div>
      </div>
    </div>

    <!-- All Aspects Section -->
    <div class="data-section">
      <div class="section-header">
        <h3>All Aspects with Motion</h3>
        <button class="details-toggle" @click="showAspectsDetails = !showAspectsDetails">
          {{ showAspectsDetails ? '▲ Less' : '▼ Details' }}
        </button>
      </div>
      <table class="data-table aspects-table" :class="{ 'show-details': showAspectsDetails }">
        <thead>
          <tr>
            <th>Aspect</th>
            <th class="detail-col">Orb</th>
            <th>Motion</th>
            <th class="detail-col">Time</th>
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
            <td class="aspect-orb detail-col">{{ aspect.currentOrb.toFixed(2) }}°</td>
            <td class="aspect-motion">
              <span v-if="aspect.isApplying" class="badge applying-badge">Applying</span>
              <span v-else-if="aspect.isSeparating" class="badge separating-badge">Separating</span>
              <span v-else class="badge stable-badge">Stable</span>
              <span v-if="aspect.isPerfect" class="perfect-indicator">★</span>
            </td>
            <td class="aspect-time detail-col">
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

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.data-header h2 {
  color: var(--color-text-primary);
  margin: 0;
  font-size: 1.5rem;
}

.copy-btn {
  padding: 0.4rem 0.9rem;
  border-radius: 0.375rem;
  border: 1px solid var(--color-border-focus);
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.copy-btn:hover {
  background: var(--color-border-focus);
  color: var(--color-text-primary);
}

.copy-btn.copied {
  background: #d1fae5;
  color: #065f46;
  border-color: #10b981;
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

/* Section header row: title + optional toggle button */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border-focus);
}

.section-header h3 {
  margin: 0;
  padding: 0;
  border: none;
}

.details-toggle {
  display: none; /* hidden on desktop — all columns always visible */
  font-size: 0.75rem;
  padding: 0.2rem 0.6rem;
  border: 1px solid var(--color-border-focus);
  border-radius: 0.25rem;
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
}

.details-toggle:hover {
  background: var(--color-border-focus);
  color: var(--color-text-primary);
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
  border: 1px solid var(--color-border);
}

.aspect-description {
  font-size: 1.1rem;
  margin-bottom: 0.75rem;
  color: var(--color-text-primary);
}

.aspect-description strong {
  text-transform: capitalize;
  color: var(--color-text-primary);
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
  color: var(--color-text-tertiary);
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
  word-break: break-word;
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
  color: var(--color-text-tertiary);
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
  word-break: break-word;
}

.dignity-score {
  font-family: monospace;
  font-weight: 700;
  font-size: 1.1rem;
}

.dignity-score.positive {
  color: var(--color-success);
}

.dignity-score.negative {
  color: var(--color-error);
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

.dignities-table tr.neutral {
  background: transparent;
}

.dignities-table tr.neutral .strength-badge {
  background: #9ca3af;
  color: white;
}

/* Accidental Dignities Styles */
.house-type, .speed-status, .light-condition {
  font-size: 0.85rem;
}

.house-badge, .speed-badge, .light-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  word-break: break-word;
}

/* House type badges */
.house-badge.angular {
  background: #dcfce7;
  color: #166534;
}

.house-badge.succedent {
  background: #dbeafe;
  color: #1e40af;
}

.house-badge.cadent {
  background: #fef3c7;
  color: #92400e;
}

/* Speed badges */
.speed-badge.swift {
  background: #d1fae5;
  color: #065f46;
}

.speed-badge.average {
  background: #e5e7eb;
  color: #374151;
}

.speed-badge.slow {
  background: #fed7aa;
  color: #9a3412;
}

.speed-badge.retrograde {
  background: #fee2e2;
  color: #dc2626;
}

/* Light condition badges */
.light-badge.cazimi {
  background: #fef3c7;
  color: #92400e;
  border: 2px solid #f59e0b;
}

.light-badge.in-chariot {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #78350f;
  border: 2px solid #d97706;
  font-weight: 600;
}

.light-badge.combust {
  background: #fee2e2;
  color: #dc2626;
}

.light-badge.under-beams {
  background: #fed7aa;
  color: #9a3412;
}

.light-badge.free {
  background: #d1fae5;
  color: #065f46;
}

.light-badge.na {
  background: #e5e7eb;
  color: #6b7280;
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

/* Part of Fortune Styles */
.pof-section {
  margin-bottom: 2rem;
}

.pof-container {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(168, 85, 247, 0.05));
  border: 2px solid #a855f7;
  border-radius: 0.75rem;
  padding: 1.5rem;
  transition: all 0.3s ease;
}

.pof-container:hover {
  box-shadow: 0 4px 12px rgba(168, 85, 247, 0.15);
}

.pof-main-info {
  margin-bottom: 1.5rem;
}

.pof-position {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.pof-icon {
  font-size: 2.5rem;
  color: #a855f7;
}

.pof-details {
  flex: 1;
}

.pof-location {
  font-size: 1.2rem;
  margin: 0 0 0.5rem 0;
  color: var(--color-text-primary);
}

.pof-location strong {
  color: #a855f7;
  font-size: 1.3rem;
}

.pof-chart-type {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin: 0;
  font-style: italic;
}

.pof-dispositor {
  background: var(--color-bg-secondary);
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 1rem;
}

.pof-dispositor h4 {
  color: var(--color-text-primary);
  font-size: 1rem;
  margin: 0 0 0.75rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.dispositor-info {
  font-size: 0.95rem;
  margin: 0.75rem 0;
  color: var(--color-text-secondary);
}

.dispositor-info .planet-name {
  text-transform: capitalize;
  font-weight: 600;
  color: var(--color-text-primary);
}

.dispositor-dignity {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin: 0.75rem 0;
  flex-wrap: wrap;
}

.dispositor-dignity .strength-badge {
  display: inline-block;
  padding: 0.35rem 0.75rem;
  border-radius: 0.25rem;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dispositor-dignity .strength-badge.very-strong {
  background: #10b981;
  color: white;
}

.dispositor-dignity .strength-badge.strong {
  background: #22c55e;
  color: white;
}

.dispositor-dignity .strength-badge.moderate {
  background: #3b82f6;
  color: white;
}

.dispositor-dignity .strength-badge.peregrine {
  background: #6b7280;
  color: white;
}

.dispositor-dignity .strength-badge.weak {
  background: #fb923c;
  color: white;
}

.dispositor-dignity .strength-badge.very-weak {
  background: #ef4444;
  color: white;
}

.dispositor-dignity .dignity-score {
  font-family: monospace;
  font-weight: 700;
  font-size: 1rem;
}

.dispositor-dignity .dignity-score.positive {
  color: var(--color-success);
}

.dispositor-dignity .dignity-score.negative {
  color: var(--color-error);
}

.dispositor-dignity .dignity-score.neutral {
  color: var(--color-text-tertiary);
}

.dispositor-description {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin: 0.5rem 0 0 0;
  font-style: italic;
}

.pof-interpretation {
  padding: 1rem;
  background: rgba(168, 85, 247, 0.08);
  border-radius: 0.5rem;
  border-left: 3px solid #a855f7;
}

.pof-interpretation p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--color-text-secondary);
}

/* Responsive */
@media (max-width: 640px) {
  .chart-data-view {
    padding: 0.75rem;
  }

  .data-section {
    padding: 1rem;
    margin-bottom: 1rem;
  }

  /* Tables: no forced horizontal scroll; let column hiding do the work */
  .data-table {
    width: 100%;
    overflow-x: auto; /* fallback safety net */
  }

  .data-table th,
  .data-table td {
    padding: 0.4rem 0.5rem;
    font-size: 0.82rem;
  }

  /* Show the per-section toggle button on mobile */
  .details-toggle {
    display: inline-block;
  }

  /* Hide detail columns by default on mobile */
  .data-table .detail-col {
    display: none;
  }

  /* Reveal them when the user taps "Details" */
  .data-table.show-details .detail-col {
    display: table-cell;
  }

  /* Smaller badges on mobile */
  .strength-badge,
  .house-badge,
  .speed-badge,
  .light-badge {
    font-size: 0.7rem;
    padding: 0.2rem 0.4rem;
  }

  /* Part of Fortune mobile adjustments */
  .pof-icon {
    font-size: 1.5rem;
  }

  .pof-info p {
    font-size: 0.85rem;
    margin-bottom: 0.5rem;
  }

  .pof-dispositor {
    padding: 0.75rem;
  }

  .dispositor-details {
    gap: 0.5rem;
  }

  .dispositor-item {
    font-size: 0.8rem;
  }

  /* VOC Moon mobile */
  .voc-details p {
    font-size: 0.85rem;
    margin-bottom: 0.4rem;
  }

  /* Aspect highlight details */
  .aspect-details {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  /* Headers */
  .data-section h3,
  .section-header h3 {
    font-size: 1rem;
  }

  .chart-type-badge {
    font-size: 0.7rem;
    padding: 0.2rem 0.5rem;
  }
}

</style>

<style>
/* Dark mode overrides for ChartDataView status badges.
   These selectors use 3-class specificity (0-3-0) which beats the Vue-scoped
   rules that compile to class + attribute (0-2-0), so these always win. */

.dark .chart-data-view .retrograde {
  background: rgba(239, 68, 68, 0.18);
}

.dark .chart-data-view .rx-badge {
  background: rgba(220, 38, 38, 0.25);
  color: #fca5a5;
}

.dark .chart-data-view .direct-badge {
  color: #6ee7b7;
}

.dark .chart-data-view .moon-section {
  background: rgba(180, 83, 9, 0.2);
  border-color: #b45309;
}

.dark .chart-data-view .moon-aspect {
  background: rgba(180, 83, 9, 0.12);
}

.dark .chart-data-view .motion.applying {
  background: rgba(16, 185, 129, 0.2);
  color: #6ee7b7;
}

.dark .chart-data-view .motion.separating {
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
}

.dark .chart-data-view .applying-badge {
  background: rgba(16, 185, 129, 0.2);
  color: #6ee7b7;
}

.dark .chart-data-view .separating-badge {
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
}

.dark .chart-data-view .stable-badge {
  background: rgba(107, 114, 128, 0.3);
  color: var(--color-text-secondary);
}

.dark .chart-data-view .faded-badge {
  background: rgba(245, 158, 11, 0.2);
  color: #fcd34d;
}

.dark .chart-data-view .copy-btn.copied {
  background: rgba(16, 185, 129, 0.2);
  color: #6ee7b7;
}

.dark .chart-data-view .house-badge.angular {
  background: rgba(34, 197, 94, 0.2);
  color: #86efac;
}

.dark .chart-data-view .house-badge.succedent {
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
}

.dark .chart-data-view .house-badge.cadent {
  background: rgba(245, 158, 11, 0.2);
  color: #fcd34d;
}

.dark .chart-data-view .speed-badge.swift {
  background: rgba(16, 185, 129, 0.2);
  color: #6ee7b7;
}

.dark .chart-data-view .speed-badge.average {
  background: rgba(107, 114, 128, 0.2);
  color: #d1d5db;
}

.dark .chart-data-view .speed-badge.slow {
  background: rgba(249, 115, 22, 0.2);
  color: #fdba74;
}

.dark .chart-data-view .speed-badge.retrograde {
  background: rgba(220, 38, 38, 0.2);
  color: #fca5a5;
}

.dark .chart-data-view .light-badge.cazimi {
  background: rgba(245, 158, 11, 0.2);
  color: #fcd34d;
  border-color: #b45309;
}

.dark .chart-data-view .light-badge.in-chariot {
  background: rgba(245, 158, 11, 0.15);
  color: #fde68a;
  border-color: #d97706;
}

.dark .chart-data-view .light-badge.combust {
  background: rgba(220, 38, 38, 0.2);
  color: #fca5a5;
}

.dark .chart-data-view .light-badge.under-beams {
  background: rgba(249, 115, 22, 0.2);
  color: #fdba74;
}

.dark .chart-data-view .light-badge.free {
  background: rgba(16, 185, 129, 0.2);
  color: #6ee7b7;
}

.dark .chart-data-view .light-badge.na {
  background: rgba(107, 114, 128, 0.2);
  color: #9ca3af;
}
</style>
