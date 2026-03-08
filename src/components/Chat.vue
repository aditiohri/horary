<script setup lang="ts">
import { ref, nextTick, computed, watch } from "vue";
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import {
  generateHoraryReading,
  continueHoraryConversation,
  type HoraryReading,
} from "../utils/llm";

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isError?: boolean;
}

const props = defineProps<{
  reading: HoraryReading;
  existingConversation?: Array<{role: string; content: string; timestamp?: string}>;
}>();

const emit = defineEmits<{
  conversationUpdate: [conversation: Array<{role: string; content: string; timestamp: Date}>];
}>();

const messages = ref<ConversationMessage[]>([]);
const currentMessage = ref("");
const isLoading = ref(false);
const hasInitialReading = ref(false);
const conversationContainer = ref<HTMLElement>();
const questionCollapsed = ref(false);

// Format error message with actionable guidance
function formatErrorMessage(error: any): string {
  const errorMessage = error?.message || String(error);

  if (errorMessage.includes('Ollama server not running')) {
    return `Unable to connect to Ollama server. Please ensure Ollama is running on your system. You can check your connection settings by clicking the settings button (⚙️) in the header.`;
  }

  if (errorMessage.includes('Model not found')) {
    return `The selected model was not found. Please check your model settings by clicking the settings button (⚙️) in the header, or pull the model using the Ollama CLI.`;
  }

  if (errorMessage.includes('timeout')) {
    return `Connection timeout. The Ollama server is not responding. Please check your settings (⚙️) or try increasing the timeout value.`;
  }

  return `Error: ${errorMessage}. Please check your Ollama settings (⚙️) and ensure the server is running.`;
}

// Generate initial reading
const generateInitialReading = async () => {
  if (hasInitialReading.value) return;

  isLoading.value = true;
  try {
    const reading = await generateHoraryReading(props.reading);
    if (reading) {
      messages.value.push({
        role: "assistant",
        content: reading,
        timestamp: new Date(),
      });
      hasInitialReading.value = true;
      emit('conversationUpdate', messages.value);
      isLoading.value = false;
      await scrollToLatestMessageTop();
    }
  } catch (error: any) {
    console.error("Error generating initial reading:", error);
    messages.value.push({
      role: "assistant",
      content: formatErrorMessage(error),
      timestamp: new Date(),
      isError: true,
    });
    emit('conversationUpdate', messages.value);
  } finally {
    isLoading.value = false;
  }
};

// Send a message in the conversation
const sendMessage = async () => {
  if (!currentMessage.value.trim() || isLoading.value) return;

  const userMessage = currentMessage.value.trim();
  currentMessage.value = "";

  // Add user message
  messages.value.push({
    role: "user",
    content: userMessage,
    timestamp: new Date(),
  });
  emit('conversationUpdate', messages.value);

  await scrollToBottom();
  isLoading.value = true;

  try {
    // Get conversation history (excluding the pending new message)
    const history = messages.value.slice(0, -1).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const response = await continueHoraryConversation(
      props.reading,
      history,
      userMessage
    );

    if (response) {
      messages.value.push({
        role: "assistant",
        content: response,
        timestamp: new Date(),
      });
      emit('conversationUpdate', messages.value);
    }
  } catch (error: any) {
    console.error("Error in conversation:", error);
    messages.value.push({
      role: "assistant",
      content: formatErrorMessage(error),
      timestamp: new Date(),
      isError: true,
    });
    emit('conversationUpdate', messages.value);
  } finally {
    isLoading.value = false;
    await scrollToLatestMessageTop();
  }
};

// Scroll to bottom of conversation
const scrollToBottom = async () => {
  await nextTick();
  if (conversationContainer.value) {
    conversationContainer.value.scrollTop =
      conversationContainer.value.scrollHeight;
  }
};

// Scroll to the top of the most recently added message
const scrollToLatestMessageTop = async () => {
  await nextTick();
  if (!conversationContainer.value) return;
  const messageEls = conversationContainer.value.querySelectorAll('.message');
  if (messageEls.length > 0) {
    const lastMessage = messageEls[messageEls.length - 1] as HTMLElement;
    const containerRect = conversationContainer.value.getBoundingClientRect();
    const msgRect = lastMessage.getBoundingClientRect();
    conversationContainer.value.scrollTop += (msgRect.top - containerRect.top);
  }
};

// Handle enter key
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
};

// Format timestamp
const formatTime = (date: Date) => {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

// Computed property for showing question info
const questionInfo = computed(() => {
  return {
    question: props.reading.question,
    time: new Date(props.reading.timestamp).toLocaleString(),
    location: props.reading.locationName
      || (props.reading.location
        ? `${props.reading.location.latitude.toFixed(2)}°, ${props.reading.location.longitude.toFixed(2)}°`
        : "Location not provided"),
  };
});

// Configure marked for better rendering
marked.setOptions({
  breaks: true, // Convert \n to <br>
  gfm: true, // GitHub flavored markdown
});

// Helper function to format message content with proper markdown rendering
function formatMessageContent(content: string): string {
  // Convert markdown to HTML
  const html = marked.parse(content) as string;

  // Sanitize HTML to prevent XSS attacks
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre'],
    ALLOWED_ATTR: []
  });
}

// Auto-generate initial reading when reading prop is available
watch(() => props.reading, (newReading) => {
  if (newReading && !hasInitialReading.value) {
    // If we have an existing conversation, restore it instead of generating new
    if (props.existingConversation && props.existingConversation.length > 0) {
      messages.value = props.existingConversation.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
      }));
      hasInitialReading.value = true;
      isLoading.value = false;
      nextTick(() => scrollToBottom());
    } else {
      // Generate new reading
      generateInitialReading();
    }
  }
}, { immediate: true });
</script>

<template>
  <div class="horary-conversation">
    <div class="conversation-header">
      <button
        @click="questionCollapsed = !questionCollapsed"
        class="question-toggle"
        :title="questionCollapsed ? 'Show question details' : 'Collapse question details'"
      >
        <span class="question-preview">{{ questionInfo.question }}</span>
        <span class="question-chevron">{{ questionCollapsed ? '▼' : '▲' }}</span>
      </button>
      <div v-show="!questionCollapsed" class="question-meta">
        <p class="meta">{{ questionInfo.time }} • {{ questionInfo.location }}</p>
      </div>
    </div>

    <div class="conversation-container" ref="conversationContainer">
      <div class="messages">
        <div
          v-for="(message, index) in messages"
          :key="index"
          :class="['message', message.role, { 'error-message': message.isError }]">
          <div class="message-content">
            <div
              class="message-text"
              v-html="formatMessageContent(message.content)"></div>
            <div class="message-time">{{ formatTime(message.timestamp) }}</div>
          </div>
        </div>

        <div v-if="isLoading" class="message assistant">
          <div class="message-content">
            <div class="loading-indicator">
              <div class="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span class="loading-text">Analyzing chart...</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="conversation-input">
      <div class="input-container">
        <textarea
          v-model="currentMessage"
          @keydown="handleKeydown"
          placeholder="Ask a follow-up question about your reading..."
          :disabled="isLoading"
          rows="1"
          class="message-input"></textarea>
        <button
          @click="sendMessage"
          :disabled="!currentMessage.trim() || isLoading"
          class="send-button">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg">
            <path d="M2 21L23 12L2 3V10L17 12L2 14V21Z" fill="currentColor" />
          </svg>
        </button>
      </div>
      <details class="followup-guide">
        <summary class="followup-guide-toggle">How do follow-ups work?</summary>
        <div class="followup-guide-content">
          <p><strong>Same chart</strong> — this reading can answer:</p>
          <ul>
            <li><strong>Timing</strong> — "When might this happen?" uses the same significators already in the chart.</li>
            <li><strong>Related people or things</strong> — Anyone or anything connected to the original matter. The chart uses derivative houses: your boss (10th), the other party in a deal (7th), a friend's finances (11th's 2nd = 12th), and so on.</li>
            <li><strong>Clarification</strong> — "What did you mean about Saturn?" or "Can you explain the Moon's role?"</li>
            <li><strong>Unexplored factors</strong> — Planets, aspects, or house rulers from this chart not yet discussed.</li>
          </ul>
          <p><strong>Ask Another Question</strong> — start fresh when:</p>
          <ul>
            <li>Your question is about a genuinely different topic or area of life.</li>
            <li>The situation has materially changed since you asked (a new development occurred).</li>
          </ul>
          <p class="followup-guide-note">In horary tradition, one chart belongs to one sincere question and all its branches. Re-casting the same question to get a different answer isn't considered valid practice — the original chart stands.</p>
        </div>
      </details>
    </div>
  </div>
</template>

<style scoped>
.horary-conversation {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-secondary);
  border-radius: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.conversation-header {
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-tertiary);
}

.question-toggle {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  font-style: italic;
  transition: background-color 0.15s ease;
}

.question-toggle:hover {
  background: var(--color-bg-hover);
}

.question-preview {
  flex: 1;
  color: var(--color-text-secondary);
}

.question-chevron {
  font-size: 0.65rem;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.question-meta {
  padding: 0 1rem 0.75rem;
}

.question-meta .meta {
  color: var(--color-text-tertiary);
  font-size: 0.8rem;
  margin: 0;
}

.conversation-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  scroll-behavior: smooth;
}

.messages {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.message {
  display: flex;
  margin-bottom: 1rem;
}

.message.user {
  justify-content: flex-end;
}

.message.assistant {
  justify-content: flex-start;
}

.message-content {
  max-width: 85%;
  display: flex;
  flex-direction: column;
}

.message.assistant .message-content {
  max-width: 100%;
}

.message-text {
  padding: 0.75rem 1rem;
  border-radius: 1rem;
  line-height: 1.6;
  word-wrap: break-word;
}

/* Markdown formatting within messages */
.message-text :deep(h1),
.message-text :deep(h2),
.message-text :deep(h3),
.message-text :deep(h4),
.message-text :deep(h5),
.message-text :deep(h6) {
  margin-top: 1em;
  margin-bottom: 0.5em;
  font-weight: 600;
}

.message-text :deep(h1) { font-size: 1.5em; }
.message-text :deep(h2) { font-size: 1.3em; }
.message-text :deep(h3) { font-size: 1.1em; }
.message-text :deep(h4),
.message-text :deep(h5),
.message-text :deep(h6) { font-size: 1em; }

.message-text :deep(p) {
  margin: 0.5em 0;
}

.message-text :deep(p:first-child) {
  margin-top: 0;
}

.message-text :deep(p:last-child) {
  margin-bottom: 0;
}

.message-text :deep(ul),
.message-text :deep(ol) {
  margin: 0.5em 0;
  padding-left: 1.5em;
}

.message-text :deep(li) {
  margin: 0.25em 0;
}

.message-text :deep(blockquote) {
  margin: 0.5em 0;
  padding-left: 1em;
  border-left: 3px solid rgba(0, 0, 0, 0.1);
  font-style: italic;
}

.message.assistant .message-text :deep(blockquote) {
  border-left-color: var(--color-border);
}

.message.user .message-text :deep(blockquote) {
  border-left-color: rgba(255, 255, 255, 0.3);
}

.message-text :deep(code) {
  padding: 0.2em 0.4em;
  border-radius: 0.25em;
  font-size: 0.9em;
  font-family: 'Courier New', Courier, monospace;
}

.message.assistant .message-text :deep(code) {
  background: rgba(128, 128, 128, 0.15);
}

.message.user .message-text :deep(code) {
  background: rgba(255, 255, 255, 0.2);
}

.message-text :deep(pre) {
  margin: 0.5em 0;
  padding: 0.75em;
  border-radius: 0.5em;
  overflow-x: auto;
}

.message.assistant .message-text :deep(pre) {
  background: rgba(128, 128, 128, 0.15);
}

.message.user .message-text :deep(pre) {
  background: rgba(255, 255, 255, 0.2);
}

.message-text :deep(pre code) {
  background: transparent;
  padding: 0;
}

.message-text :deep(strong) {
  font-weight: 600;
}

.message-text :deep(em) {
  font-style: italic;
}

.message.user .message-text {
  background: var(--color-accent);
  color: var(--color-text-inverse);
  border-bottom-right-radius: 0.25rem;
}

.message.assistant .message-text {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border-radius: 0;
  padding-left: 0;
  padding-right: 0;
}

.message.error-message .message-text {
  background: rgba(220, 38, 38, 0.15);
  border-color: rgba(220, 38, 38, 0.3);
  color: var(--color-error);
}

.message-time {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  margin-top: 0.25rem;
  align-self: flex-end;
}

.message.assistant .message-time {
  align-self: flex-start;
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 0;
  background: var(--color-bg-secondary);
  border: none;
  border-radius: 0;
}

.loading-dots {
  display: flex;
  gap: 0.25rem;
}

.loading-dots span {
  width: 6px;
  height: 6px;
  background: var(--color-accent);
  border-radius: 50%;
  animation: loading-bounce 1.4s ease-in-out infinite both;
}

.loading-dots span:nth-child(1) {
  animation-delay: -0.32s;
}
.loading-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes loading-bounce {
  0%,
  80%,
  100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

.loading-text {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.conversation-input {
  padding: 1rem;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}

.input-container {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
}

.message-input {
  flex: 1;
  padding: 0.75rem;
  border: 2px solid var(--color-border);
  border-radius: 0.5rem;
  font-size: 1rem;
  resize: none;
  min-height: 44px;
  max-height: 120px;
  overflow-y: auto;
  transition: border-color 0.2s ease;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
}

.message-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.message-input:disabled {
  background: var(--color-bg-tertiary);
  color: var(--color-text-tertiary);
}

.send-button {
  background: var(--color-accent);
  color: var(--color-text-inverse);
  border: none;
  border-radius: 0.5rem;
  padding: 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  height: 44px;
  width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.send-button:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

.send-button:disabled {
  background: var(--color-bg-hover);
  cursor: not-allowed;
}

/* Mobile optimizations */
@media (max-width: 640px) {
  .conversation-container {
    padding: 0.75rem;
  }

  .message-content {
    max-width: 95%;
  }

  .conversation-input {
    padding: 0.75rem;
  }

  .message-input {
    font-size: 16px; /* Prevents zoom on iOS */
  }

  .followup-guide-content {
    max-height: 40vh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
}

.followup-guide {
  margin-top: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  background: var(--color-bg-tertiary);
  font-size: 0.875rem;
}

.followup-guide-toggle {
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  color: var(--color-text-secondary);
  list-style: none;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  user-select: none;
}

.followup-guide-toggle::-webkit-details-marker {
  display: none;
}

.followup-guide-toggle::before {
  content: '▸';
  font-size: 0.75rem;
  transition: transform 0.15s ease;
  display: inline-block;
}

details[open] .followup-guide-toggle::before {
  transform: rotate(90deg);
}

.followup-guide-content {
  padding: 0 0.75rem 0.75rem;
  color: var(--color-text-secondary);
}

.followup-guide-content p {
  margin: 0.5rem 0 0.25rem;
}

.followup-guide-content ul {
  margin: 0 0 0.5rem;
  padding-left: 1.25rem;
}

.followup-guide-content li {
  margin: 0.2rem 0;
}

.followup-guide-note {
  margin-top: 0.5rem !important;
  font-style: italic;
  font-size: 0.8rem;
  color: var(--color-text-tertiary) !important;
  border-top: 1px solid var(--color-border);
  padding-top: 0.5rem;
}
</style>
