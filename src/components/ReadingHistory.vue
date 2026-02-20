<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useReadingStorage, type StoredReading } from "../utils/storage";

const emit = defineEmits<{
  (e: "select-reading", reading: StoredReading): void;
  (e: "close"): void;
}>();

const { getAllReadings, deleteReading, searchReadings, getStorageStats } =
  useReadingStorage();

const readings = ref<StoredReading[]>([]);
const searchQuery = ref("");
const isLoading = ref(false);
const showConfirmDelete = ref(false);
const readingToDelete = ref<StoredReading | null>(null);

// Computed filtered readings
const filteredReadings = computed(() => {
  if (!searchQuery.value.trim()) {
    return readings.value;
  }
  return searchReadings(searchQuery.value);
});

// Group readings by date
const groupedReadings = computed(() => {
  const groups: { [key: string]: StoredReading[] } = {};

  filteredReadings.value.forEach((reading) => {
    const date = new Date(reading.timestamp).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(reading);
  });

  // Sort by date (newest first)
  const sortedGroups = Object.entries(groups).sort(
    ([a], [b]) => new Date(b).getTime() - new Date(a).getTime()
  );

  return sortedGroups;
});

// Storage stats
const storageStats = ref(getStorageStats());

// Load readings
const loadReadings = async () => {
  isLoading.value = true;
  try {
    readings.value = getAllReadings().sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    storageStats.value = getStorageStats();
  } catch (error) {
    console.error("Error loading readings:", error);
  } finally {
    isLoading.value = false;
  }
};

// Select a reading
const selectReading = (reading: StoredReading) => {
  emit("select-reading", reading);
};

// Confirm delete
const confirmDelete = (reading: StoredReading) => {
  readingToDelete.value = reading;
  showConfirmDelete.value = true;
};

// Delete reading
const handleDelete = async () => {
  if (!readingToDelete.value) return;

  try {
    deleteReading(readingToDelete.value.id);
    await loadReadings();
    showConfirmDelete.value = false;
    readingToDelete.value = null;
  } catch (error) {
    console.error("Error deleting reading:", error);
  }
};

// Truncate question
const truncateQuestion = (question: string, maxLength: number = 100) => {
  return question.length > maxLength
    ? question.substring(0, maxLength) + "..."
    : question;
};

onMounted(loadReadings);
</script>

<template>
  <div class="reading-history">
    <div class="history-header">
      <div class="header-top">
        <h2>Reading History</h2>
        <button @click="emit('close')" class="close-button">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 6L6 18M6 6L18 18"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <div class="search-bar">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search readings..."
          class="search-input" />
      </div>

      <div class="stats">
        <span class="stat">{{ storageStats.totalReadings }} readings</span>
        <span class="stat"
          >{{ (storageStats.storageSize / 1024).toFixed(1) }}KB used</span
        >
      </div>
    </div>

    <div class="history-content">
      <div v-if="isLoading" class="loading">Loading readings...</div>

      <div v-else-if="filteredReadings.length === 0" class="empty-state">
        <div class="empty-icon">📜</div>
        <h3>{{ searchQuery ? "No matching readings" : "No readings yet" }}</h3>
        <p>
          {{
            searchQuery
              ? "Try a different search term"
              : "Your horary readings will appear here"
          }}
        </p>
      </div>

      <div v-else class="readings-list">
        <div
          v-for="[date, dateReadings] in groupedReadings"
          :key="date"
          class="date-group">
          <h3 class="date-header">{{ date }}</h3>
          <div class="readings-grid">
            <div
              v-for="reading in dateReadings"
              :key="reading.id"
              class="reading-card"
              @click="selectReading(reading)">
              <div class="reading-header">
                <span class="reading-time">
                  {{
                    new Date(reading.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  }}
                </span>
                <button
                  @click.stop="confirmDelete(reading)"
                  class="delete-button"
                  title="Delete reading">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round" />
                  </svg>
                </button>
              </div>

              <div class="reading-question">
                {{ truncateQuestion(reading.question) }}
              </div>

              <div class="reading-meta">
                <span
                  v-if="reading.conversation.length > 0"
                  class="conversation-count">
                  {{ reading.conversation.length }} messages
                </span>
                <span v-if="reading.tags?.length" class="tags">
                  {{ reading.tags.join(", ") }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete confirmation modal -->
    <div
      v-if="showConfirmDelete"
      class="modal-overlay"
      @click="showConfirmDelete = false">
      <div class="modal" @click.stop>
        <h3>Delete Reading</h3>
        <p>
          Are you sure you want to delete this reading? This action cannot be
          undone.
        </p>
        <div class="modal-actions">
          <button @click="showConfirmDelete = false" class="cancel-button">
            Cancel
          </button>
          <button @click="handleDelete" class="confirm-delete-button">
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reading-history {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
  border-radius: 1rem;
  overflow: hidden;
}

.history-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.header-top h2 {
  margin: 0;
  color: #2c3e50;
}

.close-button {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  color: #6b7280;
  border-radius: 0.5rem;
  transition: background-color 0.2s;
}

.close-button:hover {
  background: #e5e7eb;
}

.search-bar {
  margin-bottom: 1rem;
}

.search-input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #4a90e2;
}

.stats {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.history-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin: 0 0 0.5rem 0;
  color: #374151;
}

.date-group {
  margin-bottom: 2rem;
}

.date-header {
  color: #4a5568;
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.readings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.reading-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.reading-card:hover {
  border-color: #4a90e2;
  box-shadow: 0 2px 8px rgba(74, 144, 226, 0.1);
}

.reading-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.reading-time {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.delete-button {
  background: none;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  color: #6b7280;
  border-radius: 0.25rem;
  transition: color 0.2s;
}

.delete-button:hover {
  color: #ef4444;
}

.reading-question {
  font-size: 1rem;
  color: #2c3e50;
  line-height: 1.4;
  margin-bottom: 0.75rem;
}

.reading-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.conversation-count {
  background: #ddd6fe;
  color: #5b21b6;
  padding: 0.125rem 0.5rem;
  border-radius: 0.75rem;
}

.tags {
  font-style: italic;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal h3 {
  margin: 0 0 0.75rem 0;
  color: #2c3e50;
}

.modal p {
  margin: 0 0 1.5rem 0;
  color: #4a5568;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.cancel-button {
  background: #f7fafc;
  color: #4a5568;
  border: 1px solid #e2e8f0;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cancel-button:hover {
  background: #e2e8f0;
}

.confirm-delete-button {
  background: #ef4444;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.confirm-delete-button:hover {
  background: #dc2626;
}

/* Mobile optimizations */
@media (max-width: 640px) {
  .history-header {
    padding: 1rem;
  }

  .history-content {
    padding: 0.75rem;
  }

  .readings-grid {
    grid-template-columns: 1fr;
  }

  .stats {
    flex-direction: column;
    gap: 0.25rem;
  }

  .modal {
    margin: 1rem;
    width: calc(100% - 2rem);
  }
}
</style>
