<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useReadingStorage, encodeReadingToUrl, type StoredReading } from "../utils/storage";

const props = withDefaults(defineProps<{ compact?: boolean; refreshKey?: number; searchResetKey?: number }>(), { compact: false, refreshKey: 0, searchResetKey: 0 });

const emit = defineEmits<{
  (e: "select-reading", reading: StoredReading): void;
  (e: "close"): void;
}>();

const { getAllReadings, deleteReading, deleteAllReadings, searchReadings, getStorageStats } =
  useReadingStorage();

const PAGE_SIZE = 10;

const readings = ref<StoredReading[]>([]);
const searchQuery = ref("");
const debouncedQuery = ref("");
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const isLoading = ref(false);
const showConfirmDelete = ref(false);
const readingToDelete = ref<StoredReading | null>(null);
const showConfirmDeleteAll = ref(false);
const copiedReadingId = ref<string | null>(null);
const currentPage = ref(1);

// Computed filtered readings
const filteredReadings = computed(() => {
  if (!debouncedQuery.value.trim()) {
    return readings.value;
  }
  return searchReadings(debouncedQuery.value);
});

const resultCountText = computed(() => {
  if (!debouncedQuery.value.trim()) return "";
  return `${filteredReadings.value.length} of ${readings.value.length} readings`;
});

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredReadings.value.length / PAGE_SIZE))
);

const paginatedReadings = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return filteredReadings.value.slice(start, start + PAGE_SIZE);
});

const prevPage = () => { if (currentPage.value > 1) currentPage.value--; };
const nextPage = () => { if (currentPage.value < totalPages.value) currentPage.value++; };

// Group readings by date
const groupedReadings = computed(() => {
  const groups: { [key: string]: StoredReading[] } = {};

  paginatedReadings.value.forEach((reading) => {
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
    if (currentPage.value > totalPages.value) currentPage.value = totalPages.value;
    showConfirmDelete.value = false;
    readingToDelete.value = null;
  } catch (error) {
    console.error("Error deleting reading:", error);
  }
};

// Delete all readings
const handleDeleteAll = async () => {
  deleteAllReadings();
  await loadReadings();
  showConfirmDeleteAll.value = false;
  currentPage.value = 1;
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

watch(() => props.refreshKey, loadReadings);
watch(searchQuery, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debouncedQuery.value = val;
    currentPage.value = 1;
  }, 300);
});
watch(() => props.searchResetKey, () => {
  searchQuery.value = "";
  debouncedQuery.value = "";
  currentPage.value = 1;
});
</script>

<template>
  <div class="reading-history" :class="{ compact: props.compact }">
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
        <span class="search-icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <path d="m21 21-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search readings…"
          class="search-input"
          @keydown.enter.prevent />
        <button
          v-if="searchQuery"
          class="search-clear-button"
          @click="searchQuery = ''"
          title="Clear search"
          aria-label="Clear search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>
      <div v-if="resultCountText" class="search-result-count">{{ resultCountText }}</div>

      <div class="stats">
        <span class="stat">{{ storageStats.totalReadings }} readings</span>
        <span class="stat"
          >{{ (storageStats.storageSize / 1024).toFixed(1) }}KB used</span
        >
        <button
          v-if="readings.length > 0"
          @click="showConfirmDeleteAll = true"
          class="delete-all-button">
          Delete all
        </button>
      </div>
    </div>

    <div class="history-content">
      <div v-if="isLoading" class="loading">Loading readings...</div>

      <div v-else-if="filteredReadings.length === 0" class="empty-state">
        <div class="empty-icon">📜</div>
        <h3>{{ debouncedQuery ? "No matching readings" : "No readings yet" }}</h3>
        <p>
          {{
            debouncedQuery
              ? "Try a different search term"
              : "Your horary readings will appear here"
          }}
        </p>
      </div>

      <div v-else class="readings-list">
        <div v-if="totalPages > 1" class="pagination pagination-top">
          <button
            class="pagination-button"
            :disabled="currentPage === 1"
            @click="prevPage">
            Previous
          </button>
          <span class="pagination-info">Page {{ currentPage }} of {{ totalPages }}</span>
          <button
            class="pagination-button"
            :disabled="currentPage === totalPages"
            @click="nextPage">
            Next
          </button>
        </div>

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

      <div v-if="totalPages > 1" class="pagination">
        <button
          class="pagination-button"
          :disabled="currentPage === 1"
          @click="prevPage">
          Previous
        </button>
        <span class="pagination-info">Page {{ currentPage }} of {{ totalPages }}</span>
        <button
          class="pagination-button"
          :disabled="currentPage === totalPages"
          @click="nextPage">
          Next
        </button>
      </div>
    </div>

    <!-- Delete all confirmation modal -->
    <div
      v-if="showConfirmDeleteAll"
      class="modal-overlay"
      @click="showConfirmDeleteAll = false">
      <div class="modal" @click.stop>
        <h3>Delete All Readings</h3>
        <p>
          Are you sure you want to delete all {{ readings.length }} readings?
          This action cannot be undone.
        </p>
        <div class="modal-actions">
          <button @click="showConfirmDeleteAll = false" class="cancel-button">
            Cancel
          </button>
          <button @click="handleDeleteAll" class="confirm-delete-button">
            Delete all
          </button>
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
  background: var(--color-surface);
  border-radius: 1rem;
  overflow: hidden;
}

.history-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-raised);
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
  position: relative;
  margin-bottom: 0.5rem;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
  pointer-events: none;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.75rem 2.75rem 0.75rem 2.5rem;
  border: 2px solid var(--color-border);
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
  background: var(--color-bg);
  color: var(--color-text-primary);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(184, 105, 10, 0.2);
}

.search-clear-button {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-muted);
  transition: color 0.15s ease;
  border-radius: 0 0.5rem 0.5rem 0;
}

.search-clear-button:hover {
  color: var(--color-text-primary);
}

.search-result-count {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  margin-bottom: 0.75rem;
  padding-left: 0.125rem;
}

.stats {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  align-items: center;
}

.delete-all-button {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--color-error);
  font-size: 0.875rem;
  margin-left: auto;
  transition: opacity 0.2s;
}

.delete-all-button:hover {
  opacity: 0.75;
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
  background: var(--color-surface-raised);
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
  color: var(--color-text-muted);
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
  color: var(--color-text-muted);
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
  background: var(--color-surface);
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
  background: var(--color-surface-raised);
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

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1rem 0 0.5rem;
}

.pagination-top {
  padding: 0 0 1rem;
}

.pagination-button {
  background: var(--color-surface-raised);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.2s, color 0.2s;
}

.pagination-button:hover:not(:disabled) {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.pagination-button:disabled {
  opacity: 0.4;
  cursor: default;
}

.pagination-info {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  min-width: 80px;
  text-align: center;
}

/* Compact mode — used when embedded in sidebar */
.reading-history.compact {
  border-radius: 0;
}

.reading-history.compact .header-top {
  display: none;
}

.reading-history.compact .history-header {
  padding: 0.75rem;
}

.reading-history.compact .history-content {
  padding: 0.5rem 0.75rem;
}

.reading-history.compact .readings-grid {
  grid-template-columns: 1fr;
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
