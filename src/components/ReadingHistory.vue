<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useReadingStorage, encodeReadingToUrl, type StoredReading } from "../utils/storage";

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
const copiedReadingId = ref<string | null>(null);

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

// Copy share link for a reading
const copyShareLink = async (reading: StoredReading) => {
  const url = await encodeReadingToUrl(reading);
  try {
    await navigator.clipboard.writeText(url);
    copiedReadingId.value = reading.id;
    setTimeout(() => {
      copiedReadingId.value = null;
    }, 2000);
  } catch {
    // Fallback: select from a temporary input
    const input = document.createElement("input");
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
    copiedReadingId.value = reading.id;
    setTimeout(() => {
      copiedReadingId.value = null;
    }, 2000);
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
                <div class="reading-actions">
                  <button
                    @click.stop="copyShareLink(reading)"
                    class="share-button"
                    :title="copiedReadingId === reading.id ? 'Link copied!' : 'Copy share link'">
                    <svg v-if="copiedReadingId !== reading.id" width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round" />
                    </svg>
                    <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5 13l4 4L19 7"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round" />
                    </svg>
                  </button>
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
  background: var(--color-bg-secondary);
  border-radius: 1rem;
  overflow: hidden;
}

.history-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-tertiary);
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.header-top h2 {
  margin: 0;
  color: var(--color-text-primary);
}

.close-button {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  color: var(--color-text-secondary);
  border-radius: 0.5rem;
  transition: background-color 0.2s;
  min-width: 44px;
  min-height: 44px;
}

.close-button:hover {
  background: var(--color-bg-hover);
}

.search-bar {
  margin-bottom: 1rem;
}

.search-input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid var(--color-border);
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: border-color 0.2s;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.stats {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.history-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-secondary);
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--color-text-secondary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin: 0 0 0.5rem 0;
  color: var(--color-text-primary);
}

.date-group {
  margin-bottom: 2rem;
}

.date-header {
  color: var(--color-text-secondary);
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.readings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.reading-card {
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.reading-card:hover {
  border-color: var(--color-accent);
  box-shadow: 0 2px 8px rgba(217, 119, 6, 0.12);
}

.reading-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.reading-time {
  font-size: 0.875rem;
  color: var(--color-text-tertiary);
  font-weight: 500;
}

.reading-actions {
  display: flex;
  gap: 0.25rem;
}

.share-button {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  color: var(--color-text-secondary);
  border-radius: 0.25rem;
  transition: color 0.2s;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.share-button:hover {
  color: var(--color-accent);
}

.delete-button {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  color: var(--color-text-secondary);
  border-radius: 0.25rem;
  transition: color 0.2s;
  min-width: 44px;
  min-height: 44px;
}

.delete-button:hover {
  color: var(--color-error);
}

.reading-question {
  font-size: 1rem;
  color: var(--color-text-primary);
  line-height: 1.4;
  margin-bottom: 0.75rem;
}

.reading-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
}

.conversation-count {
  background: rgba(217, 119, 6, 0.15);
  color: var(--color-accent);
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
  background: var(--color-bg-secondary);
  border-radius: 0.75rem;
  padding: 1.5rem;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal h3 {
  margin: 0 0 0.75rem 0;
  color: var(--color-text-primary);
}

.modal p {
  margin: 0 0 1.5rem 0;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.cancel-button {
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cancel-button:hover {
  background: var(--color-bg-hover);
}

.confirm-delete-button {
  background: var(--color-error);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.confirm-delete-button:hover {
  background: var(--color-error);
  filter: brightness(0.85);
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
