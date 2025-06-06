<script setup lang="ts">
import { ref, onMounted } from "vue";

interface QuestionData {
  question: string;
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

const question = ref("");
const error = ref("");
const location = ref<{ latitude: number; longitude: number } | null>(null);
const locationError = ref("");

// Validate question length
const validateQuestion = () => {
  if (question.value.length < 1) {
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

  const questionData: QuestionData = {
    question: question.value,
    timestamp: new Date().toISOString(),
    ...(location.value && { location: location.value }),
  };

  console.log("Question data:", questionData);
  // TODO: Handle the question data (e.g., send to backend)
};

onMounted(() => {
  getLocation();
});
</script>

<template>
  <form @submit.prevent="handleSubmit" class="question-form">
    <div class="form-group">
      <label for="question">Ask your horary question:</label>
      <textarea
        id="question"
        v-model="question"
        :class="{ error: error }"
        placeholder="Type your question here..."
        rows="4"
        @input="validateQuestion"></textarea>
      <span v-if="error" class="error-message">{{ error }}</span>
    </div>

    <div v-if="locationError" class="location-error">
      {{ locationError }}
    </div>

    <div v-if="location" class="location">
      {{ location }}
    </div>

    <button type="submit" :disabled="!!error">Submit Question</button>
  </form>
</template>

<style scoped>
.question-form {
  max-width: 600px;
  margin: 2rem auto;
  padding: 1rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #2c3e50;
}

textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 0.5rem;
  font-size: 1rem;
  resize: vertical;
  transition: border-color 0.2s ease;
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
  margin-top: 0.5rem;
  display: block;
}

.location-error {
  color: #e53e3e;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

button {
  background-color: #4a90e2;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

button:hover:not(:disabled) {
  background-color: #357abd;
}

button:disabled {
  background-color: #cbd5e0;
  cursor: not-allowed;
}

.location {
  color: #2c3e50;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

/* Mobile optimizations */
@media (max-width: 640px) {
  .question-form {
    padding: 0.5rem;
    margin: 1rem auto;
  }

  textarea {
    font-size: 16px; /* Prevents zoom on iOS */
  }

  button {
    width: 100%;
  }
}
</style>
