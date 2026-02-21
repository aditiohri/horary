<script setup lang="ts">
import { ref, onMounted } from "vue";
import { calculateHoraryChart } from "../utils/astrology";

interface QuestionData {
  question: string;
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  chartData: any;
}

const emit = defineEmits<{
  (e: "chart-calculated", data: QuestionData): void;
}>();

const question = ref("");
const error = ref("");
const location = ref<{ latitude: number; longitude: number } | null>(null);
const locationName = ref<string>("");
const locationError = ref("");
const isCalculating = ref(false);
const showAdvanced = ref(false);
const customDateTime = ref("");

// Format current date/time for datetime-local input
const formatDateTimeLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Validate question length
const validateQuestion = () => {
  if (question.value.length < 10) {
    error.value = "Question must be at least 10 characters long";
    return false;
  }
  error.value = "";
  return true;
};

// Get location name from coordinates using reverse geocoding
const getLocationName = async (lat: number, lon: number) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
    );
    const data = await response.json();

    // Build human-readable location name
    const city = data.address.city || data.address.town || data.address.village || data.address.county;
    const state = data.address.state;
    const country = data.address.country;

    if (city && state && country) {
      locationName.value = `${city}, ${state}, ${country}`;
    } else if (city && country) {
      locationName.value = `${city}, ${country}`;
    } else if (state && country) {
      locationName.value = `${state}, ${country}`;
    } else if (country) {
      locationName.value = country;
    } else {
      locationName.value = `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
    }
  } catch (err) {
    // Fallback to coordinates if geocoding fails
    locationName.value = `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
  }
};

// Get user's location
const getLocation = async () => {
  try {
    const position = await new Promise<GeolocationPosition>(
      (resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      }
    );

    location.value = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };

    // Get human-readable location name
    await getLocationName(position.coords.latitude, position.coords.longitude);
  } catch (err) {
    locationError.value = "Location access denied or unavailable";
    console.error("Error getting location:", err);
  }
};

// Handle form submission
const handleSubmit = async () => {
  if (!validateQuestion()) return;

  try {
    isCalculating.value = true;
    if (!location.value) {
      throw new Error("Location is required for horary calculations");
    }

    // Use custom date/time if provided, otherwise use current time
    const questionTime = customDateTime.value
      ? new Date(customDateTime.value)
      : new Date();

    console.log('=== CHART CALCULATION DEBUG ===');
    console.log('Custom DateTime Input:', customDateTime.value);
    console.log('Question Time (Date object):', questionTime);
    console.log('Question Time (ISO):', questionTime.toISOString());
    console.log('Question Time (Local):', questionTime.toLocaleString());
    console.log('Location:', location.value);
    console.log('===============================');

    const chartData = await calculateHoraryChart(
      questionTime,
      location.value.latitude,
      location.value.longitude
    );

    const horaryData = {
      question: question.value,
      timestamp: questionTime.toISOString(),
      location: location.value,
      chartData,
    };

    emit("chart-calculated", horaryData);
    question.value = ""; // Clear the question after successful submission
    customDateTime.value = ""; // Clear custom time
  } catch (err) {
    console.error("Error calculating chart:", err);
    error.value =
      err instanceof Error ? err.message : "Failed to calculate chart";
  } finally {
    isCalculating.value = false;
  }
};

onMounted(() => {
  getLocation();
});
</script>

<template>
  <div class="question-form-container">
    <form @submit.prevent="handleSubmit" class="question-form">
      <!-- Question input and submit button row -->
      <div class="input-row">
        <div class="form-group">
          <textarea
            id="question"
            v-model="question"
            :class="{ error: error }"
            placeholder="Ask your horary question..."
            rows="1"
            @input="validateQuestion"
            @keydown.enter.prevent="handleSubmit"></textarea>
          <span v-if="error" class="error-message">{{ error }}</span>
        </div>

        <button
          type="submit"
          :disabled="!!error || isCalculating"
          class="submit-button">
          {{ isCalculating ? "Calculating..." : "Ask" }}
        </button>
      </div>

      <div v-if="locationError" class="location-error">
        {{ locationError }}
      </div>

      <!-- Advanced Options Toggle -->
      <button
        type="button"
        @click="showAdvanced = !showAdvanced"
        class="advanced-toggle">
        {{ showAdvanced ? '▼' : '▶' }} Advanced Options
      </button>

      <!-- Advanced Options Panel -->
      <div v-if="showAdvanced" class="advanced-options">
        <div class="advanced-field">
          <label for="datetime">Question Asked At:</label>
          <input
            id="datetime"
            type="datetime-local"
            v-model="customDateTime"
            :placeholder="formatDateTimeLocal(new Date())"
            class="datetime-input"
          />
          <span class="field-hint">Leave empty to use current time</span>
        </div>

        <div class="advanced-field">
          <label>Location:</label>
          <div class="location-info" v-if="location">
            <div class="location-details">
              <span class="location-name">{{ locationName || 'Loading...' }}</span>
              <span class="location-coords">{{ location.latitude.toFixed(4) }}°N, {{ Math.abs(location.longitude).toFixed(4) }}°W</span>
            </div>
            <button type="button" @click="getLocation" class="refresh-location">Refresh</button>
          </div>
          <button v-else type="button" @click="getLocation" class="get-location-btn">
            Get Current Location
          </button>
        </div>
      </div>
    </form>
  </div>
</template>

<style scoped>
.question-form-container {
  width: 100%;
  background: white;
  border-radius: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: background-color 0.3s ease;
}

.question-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
}

.input-row {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
}

.form-group {
  flex: 1;
  margin: 0;
}

textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 0.5rem;
  font-size: 1rem;
  resize: none;
  transition: border-color 0.2s ease;
  min-height: 44px;
  max-height: 120px;
  overflow-y: auto;
}

textarea:focus {
  outline: none;
  border-color: #4a90e2;
}

textarea.error {
  border-color: #e53e3e;
}

.error-message {
  color: #e53e3e;
  font-size: 0.875rem;
  margin-top: 0.25rem;
  display: block;
}

.location-error {
  color: #e53e3e;
  font-size: 0.875rem;
  margin: 0.25rem 0;
}

.submit-button {
  background-color: #4a90e2;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
  height: 44px;
  white-space: nowrap;
}

.submit-button:hover:not(:disabled) {
  background-color: #357abd;
}

.submit-button:disabled {
  background-color: #cbd5e0;
  cursor: not-allowed;
}

.advanced-toggle {
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  padding: 0.5rem;
  text-align: left;
  transition: color 0.2s ease;
  align-self: flex-start;
}

.advanced-toggle:hover {
  color: var(--color-text-primary);
}

.advanced-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background: var(--color-bg-tertiary);
  border-radius: 0.5rem;
  border: 1px solid var(--color-border);
}

.advanced-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.advanced-field label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

.datetime-input {
  padding: 0.75rem;
  border: 2px solid var(--color-border);
  border-radius: 0.5rem;
  font-size: 1rem;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  transition: border-color 0.2s ease;
}

.datetime-input:focus {
  outline: none;
  border-color: #4a90e2;
}

.field-hint {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  font-style: italic;
}

.location-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--color-bg-primary);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.location-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.location-name {
  font-weight: 500;
  color: var(--color-text-primary);
  font-size: 0.9rem;
}

.location-coords {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  font-family: monospace;
}

.refresh-location,
.get-location-btn {
  padding: 0.5rem 1rem;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.refresh-location:hover,
.get-location-btn:hover {
  background: #357abd;
}

/* Mobile optimizations */
@media (max-width: 640px) {
  .question-form {
    padding: 0.5rem;
  }

  .input-row {
    flex-direction: column;
    align-items: stretch;
  }

  textarea {
    font-size: 16px; /* Prevents zoom on iOS */
  }

  .submit-button {
    padding: 0.75rem 1rem;
    width: 100%;
  }

  .advanced-options {
    padding: 0.75rem;
  }

  .datetime-input {
    font-size: 16px; /* Prevents zoom on iOS */
  }
}
</style>
