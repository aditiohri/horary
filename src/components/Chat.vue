<script setup lang="ts">
import { ref, nextTick, computed, watch } from "vue";
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
      await scrollToBottom();
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
    // Get conversation history (excluding the chart data message)
    const history = messages.value.slice(1).map((msg) => ({
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
    await scrollToBottom();
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
    location: props.reading.location
      ? `${props.reading.location.latitude.toFixed(
          2
        )}°, ${props.reading.location.longitude.toFixed(2)}°`
      : "Location not provided",
  };
});

// Helper function to format message content (convert line breaks to HTML)
function formatMessageContent(content: string): string {
  return content
    .replace(/\n/g, "<br>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>");
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
      <h3>Horary Reading</h3>
      <div class="question-info">
        <p class="question">{{ questionInfo.question }}</p>
        <p class="meta">
          {{ questionInfo.time }} • {{ questionInfo.location }}
        </p>
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
    </div>
  </div>
</template>

<style scoped>
.horary-conversation {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 80vh;
  background: white;
  border-radius: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.conversation-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.conversation-header h3 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
  font-size: 1.25rem;
}

.question-info .question {
  font-style: italic;
  color: #4a5568;
  margin: 0.5rem 0;
  font-size: 1rem;
}

.question-info .meta {
  color: #718096;
  font-size: 0.875rem;
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

.message-text {
  padding: 0.75rem 1rem;
  border-radius: 1rem;
  line-height: 1.5;
  word-wrap: break-word;
}

.message.user .message-text {
  background: #4a90e2;
  color: white;
  border-bottom-right-radius: 0.25rem;
}

.message.assistant .message-text {
  background: #f1f5f9;
  color: #2c3e50;
  border: 1px solid #e2e8f0;
  border-bottom-left-radius: 0.25rem;
}

.message.error-message .message-text {
  background: #fef2f2;
  border-color: #fecaca;
  color: #991b1b;
}

.message-time {
  font-size: 0.75rem;
  color: #718096;
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
  padding: 0.75rem 1rem;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 1rem;
  border-bottom-left-radius: 0.25rem;
}

.loading-dots {
  display: flex;
  gap: 0.25rem;
}

.loading-dots span {
  width: 6px;
  height: 6px;
  background: #4a90e2;
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
  color: #4a5568;
  font-size: 0.875rem;
}

.conversation-input {
  padding: 1rem;
  border-top: 1px solid #e2e8f0;
  background: white;
}

.input-container {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
}

.message-input {
  flex: 1;
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 0.5rem;
  font-size: 1rem;
  resize: none;
  min-height: 44px;
  max-height: 120px;
  overflow-y: auto;
  transition: border-color 0.2s ease;
}

.message-input:focus {
  outline: none;
  border-color: #4a90e2;
}

.message-input:disabled {
  background: #f7fafc;
  color: #a0aec0;
}

.send-button {
  background: #4a90e2;
  color: white;
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
  background: #357abd;
}

.send-button:disabled {
  background: #cbd5e0;
  cursor: not-allowed;
}

/* Mobile optimizations */
@media (max-width: 640px) {
  .conversation-header {
    padding: 1rem;
  }

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
}
</style>
