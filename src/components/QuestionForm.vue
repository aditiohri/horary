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
const locationError = ref("");
const isCalculating = ref(false);

// Validate question length
const validateQuestion = () => {
  if (question.value.length < 10) {
    error.value = "Question must be at least 10 characters long";
    return false;
  }
  error.value = "";
  return true;
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

    const chartData = await calculateHoraryChart(
      new Date(),
      location.value.latitude,
      location.value.longitude
    );

    const horaryData = {
      question: question.value,
      timestamp: new Date().toISOString(),
      location: location.value,
      chartData,
    };

    emit("chart-calculated", horaryData);
    question.value = ""; // Clear the question after successful submission
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

      <div v-if="locationError" class="location-error">
        {{ locationError }}
      </div>

      <button
        type="submit"
        :disabled="!!error || isCalculating"
        class="submit-button">
        {{ isCalculating ? "Calculating..." : "Ask" }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.question-form-container {
  width: 100%;
  background: white;
  border-radius: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.question-form {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem;
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

/* Mobile optimizations */
@media (max-width: 640px) {
  .question-form {
    padding: 0.5rem;
  }

  textarea {
    font-size: 16px; /* Prevents zoom on iOS */
  }

  .submit-button {
    padding: 0.75rem 1rem;
  }
}
</style>
