/** * ConversationPanel Component * * Chat-like interface for AI conversation in GOD MODE. * Allows
users to discuss improvements, report bugs, and formulate tasks * through natural language
conversation with the AI assistant. * * TASK 55: AI Conversation Agent (Phase 9 - GOD MODE) * *
Features: * - Chat-like message history interface * - Context-aware AI responses * - Quick
suggestion buttons * - Message streaming indicator * - Conversation history persistence * -
Multi-language support (Russian/English) */
<script setup lang="ts">
import { ref, computed, watch, nextTick, shallowRef, type CSSProperties } from 'vue'
import {
  type ConversationMessage,
  type ConversationSession,
  type ConversationPanelSettings,
  type ConversationMessageContext,
  DEFAULT_CONVERSATION_SETTINGS,
  CONVERSATION_SUGGESTIONS,
} from '../types/god-mode'
import {
  createConversationAgent,
  type AgentResponse,
  type ConversationAgent,
} from '../lib/conversation-agent'

// Types
/**
 * Props for ConversationPanel
 */
interface ConversationPanelProps {
  /** Custom styles for the panel container */
  style?: CSSProperties
  /** Custom class name */
  className?: string
  /** Currently selected component ID for context */
  selectedComponentId?: string | null
  /** Settings overrides */
  settings?: Partial<ConversationPanelSettings>
}

// Props & Emits
const props = withDefaults(defineProps<ConversationPanelProps>(), {
  style: undefined,
  className: '',
  selectedComponentId: null,
  settings: undefined,
})

const emit = defineEmits<{
  messageSent: [message: string]
  responseReceived: [response: AgentResponse]
  componentSelect: [componentId: string]
}>()

// State
const agentRef = shallowRef<ConversationAgent>(
  createConversationAgent({ language: DEFAULT_CONVERSATION_SETTINGS.preferredLanguage })
)

const session = ref<ConversationSession>(agentRef.value.getSession())
const inputValue = ref('')
const isProcessing = ref(false)
const inputFocused = ref(false)
const hoveredSuggestion = ref<string | null>(null)
const hoveredClear = ref(false)
const hoveredSend = ref(false)
const lastSuggestions = ref<string[]>([])

// Template refs
const messagesEndRef = ref<HTMLDivElement | null>(null)
const inputRef = ref<HTMLTextAreaElement | null>(null)

// Merged settings
const mergedSettings = computed<ConversationPanelSettings>(() => ({
  ...DEFAULT_CONVERSATION_SETTINGS,
  ...props.settings,
}))

// Language
const language = computed(() => mergedSettings.value.preferredLanguage)

// Re-create agent when language setting changes
watch(
  () => props.settings,
  (newSettings) => {
    if (newSettings) {
      const newLang =
        newSettings.preferredLanguage ?? DEFAULT_CONVERSATION_SETTINGS.preferredLanguage
      agentRef.value = createConversationAgent({ language: newLang })
      session.value = agentRef.value.getSession()
    }
  }
)

// Auto-scroll to bottom when messages change
watch(
  () => session.value.messages,
  () => {
    if (mergedSettings.value.autoScroll) {
      nextTick(() => {
        messagesEndRef.value?.scrollIntoView({ behavior: 'smooth' })
      })
    }
  },
  { deep: true }
)

// Get suggestions to display
const displaySuggestions = computed(() => {
  if (session.value.messages.length === 0) {
    return CONVERSATION_SUGGESTIONS.map((s) => (language.value === 'ru' ? s.textRu : s.textEn))
  }
  return lastSuggestions.value
})

// Methods

/**
 * Formats a timestamp for display
 */
function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * Handle sending a message
 */
async function handleSend() {
  const content = inputValue.value.trim()
  if (!content || isProcessing.value) return

  inputValue.value = ''
  isProcessing.value = true
  emit('messageSent', content)

  // Build context
  const context: ConversationMessageContext = {}
  if (props.selectedComponentId) {
    context.componentId = props.selectedComponentId
  }

  try {
    const response = await agentRef.value.processMessage(content, context)
    session.value = agentRef.value.getSession()
    emit('responseReceived', response)

    if (response.suggestions) {
      lastSuggestions.value = response.suggestions
    }
  } catch (error) {
    console.error('Error processing message:', error)
  } finally {
    isProcessing.value = false
  }
}

/**
 * Handle form submission
 */
function handleSubmit(e: Event) {
  e.preventDefault()
  handleSend()
}

/**
 * Handle key down (Enter to send, Shift+Enter for new line)
 */
function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

/**
 * Handle suggestion click
 */
function handleSuggestionClick(text: string) {
  inputValue.value = text
  inputRef.value?.focus()
}

/**
 * Handle clear conversation
 */
function handleClear() {
  const newSession = agentRef.value.clearSession()
  session.value = newSession
  lastSuggestions.value = []
}

/**
 * Handle component selection from related components (for future use)
 */
function handleComponentClick(componentId: string) {
  emit('componentSelect', componentId)
}
void handleComponentClick // Marked as intentionally unused for future feature

/**
 * Get the style for a message based on its role
 */
function getMessageStyle(message: ConversationMessage): CSSProperties {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'
  return {
    ...styles.message,
    ...(isUser ? styles.userMessage : isSystem ? styles.systemMessage : styles.assistantMessage),
  }
}

/**
 * Styles for the component
 */
const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: 'transparent',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '13px',
    color: '#e5e7eb',
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  message: {
    maxWidth: '85%',
    padding: '10px 14px',
    borderRadius: '12px',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
    border: '1px solid rgba(99, 102, 241, 0.4)',
    borderBottomRightRadius: '4px',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(55, 65, 81, 0.6)',
    border: '1px solid rgba(75, 85, 99, 0.4)',
    borderBottomLeftRadius: '4px',
  },
  systemMessage: {
    alignSelf: 'center',
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    border: '1px solid rgba(234, 179, 8, 0.3)',
    color: '#fcd34d',
    fontSize: '12px',
    textAlign: 'center',
  },
  messageTime: {
    fontSize: '10px',
    color: '#9ca3af',
    marginTop: '4px',
    textAlign: 'right',
  },
  typingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    backgroundColor: 'rgba(55, 65, 81, 0.6)',
    border: '1px solid rgba(75, 85, 99, 0.4)',
    borderRadius: '12px',
    borderBottomLeftRadius: '4px',
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  typingDots: {
    display: 'flex',
    gap: '4px',
  },
  typingDot: {
    width: '6px',
    height: '6px',
    backgroundColor: '#9ca3af',
    borderRadius: '50%',
    animation: 'bounce 1.4s infinite ease-in-out both',
  },
  suggestionsContainer: {
    padding: '8px 16px',
    borderTop: '1px solid rgba(75, 85, 99, 0.3)',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  suggestion: {
    padding: '6px 12px',
    backgroundColor: 'rgba(75, 85, 99, 0.3)',
    border: '1px solid rgba(75, 85, 99, 0.4)',
    borderRadius: '16px',
    color: '#d1d5db',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  suggestionHover: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: 'rgba(99, 102, 241, 0.4)',
    color: '#c4b5fd',
  },
  inputContainer: {
    padding: '12px 16px',
    borderTop: '1px solid rgba(75, 85, 99, 0.3)',
    backgroundColor: 'rgba(30, 30, 45, 0.5)',
  },
  inputWrapper: {
    display: 'flex',
    gap: '8px',
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    backgroundColor: 'rgba(40, 40, 60, 0.8)',
    border: '1px solid rgba(100, 100, 255, 0.3)',
    borderRadius: '20px',
    color: '#e5e7eb',
    fontSize: '13px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    resize: 'none',
    minHeight: '40px',
    maxHeight: '120px',
    lineHeight: '1.4',
  },
  inputFocused: {
    borderColor: 'rgba(99, 102, 241, 0.6)',
    boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.1)',
  },
  sendButton: {
    padding: '10px 16px',
    backgroundColor: '#6366f1',
    border: 'none',
    borderRadius: '20px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '80px',
  },
  sendButtonDisabled: {
    backgroundColor: '#4b5563',
    cursor: 'not-allowed',
  },
  sendButtonHover: {
    backgroundColor: '#4f46e5',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: '24px',
    textAlign: 'center',
    color: '#9ca3af',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#e5e7eb',
    marginBottom: '8px',
  },
  emptyDescription: {
    fontSize: '13px',
    lineHeight: '1.5',
    marginBottom: '24px',
    maxWidth: '300px',
  },
  headerBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px',
    borderBottom: '1px solid rgba(75, 85, 99, 0.3)',
    backgroundColor: 'rgba(30, 30, 45, 0.5)',
  },
  headerTitle: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  clearButton: {
    padding: '4px 8px',
    backgroundColor: 'transparent',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '4px',
    color: '#ef4444',
    fontSize: '11px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  clearButtonHover: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  relatedComponents: {
    padding: '8px 12px',
    backgroundColor: 'rgba(30, 30, 45, 0.5)',
    borderRadius: '8px',
    marginTop: '8px',
  },
  relatedTitle: {
    fontSize: '11px',
    color: '#9ca3af',
    marginBottom: '6px',
  },
  relatedList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
  },
  relatedItem: {
    padding: '2px 8px',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#c4b5fd',
    cursor: 'pointer',
  },
}
</script>

<template>
  <div
    :class="className"
    :style="{ ...styles.container, ...props.style }"
    data-testid="conversation-panel"
  >
    <!-- CSS for typing animation -->
    <component :is="'style'">
      @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
    </component>

    <!-- Header -->
    <div v-if="session.messages.length > 0" :style="styles.headerBar">
      <span :style="styles.headerTitle">
        {{
          language === 'ru'
            ? `${session.messages.length} сообщений`
            : `${session.messages.length} messages`
        }}
      </span>
      <button
        type="button"
        :style="{
          ...styles.clearButton,
          ...(hoveredClear ? styles.clearButtonHover : {}),
        }"
        data-testid="clear-button"
        @click="handleClear"
        @mouseenter="hoveredClear = true"
        @mouseleave="hoveredClear = false"
      >
        {{ language === 'ru' ? 'Очистить' : 'Clear' }}
      </button>
    </div>

    <!-- Messages -->
    <div :style="styles.messagesContainer" data-testid="messages-container">
      <!-- Empty state -->
      <template v-if="session.messages.length === 0">
        <div :style="styles.emptyState">
          <div :style="styles.emptyIcon">💬</div>
          <div :style="styles.emptyTitle">
            {{ language === 'ru' ? 'Начните диалог' : 'Start a conversation' }}
          </div>
          <div :style="styles.emptyDescription">
            {{
              language === 'ru'
                ? 'Расскажите о проблеме, предложите улучшение или задайте вопрос о компоненте. Я помогу сформулировать задачу.'
                : 'Describe a problem, suggest an improvement, or ask a question about a component. I will help formulate a task.'
            }}
          </div>
        </div>
      </template>

      <!-- Messages list -->
      <template v-else>
        <div
          v-for="(message, index) in session.messages"
          :key="message.id || index"
          :style="getMessageStyle(message)"
          :data-testid="`message-${message.role}`"
        >
          <div>{{ message.content }}</div>
          <div
            v-if="mergedSettings.showTimestamps && message.timestamp"
            :style="styles.messageTime"
          >
            {{ formatTime(message.timestamp) }}
          </div>
        </div>

        <!-- Typing indicator -->
        <div
          v-if="isProcessing && mergedSettings.showTypingIndicator"
          :style="styles.typingIndicator"
          data-testid="typing-indicator"
        >
          <div :style="styles.typingDots">
            <span :style="{ ...styles.typingDot, animationDelay: '-0.32s' }" />
            <span :style="{ ...styles.typingDot, animationDelay: '-0.16s' }" />
            <span :style="styles.typingDot" />
          </div>
          <span :style="{ color: '#9ca3af', fontSize: '12px' }">
            {{ language === 'ru' ? 'Думаю...' : 'Thinking...' }}
          </span>
        </div>

        <!-- Scroll anchor -->
        <div ref="messagesEndRef" />
      </template>
    </div>

    <!-- Suggestions -->
    <div
      v-if="mergedSettings.showSuggestions && displaySuggestions.length > 0"
      :style="styles.suggestionsContainer"
      data-testid="suggestions"
    >
      <button
        v-for="(suggestion, index) in displaySuggestions"
        :key="index"
        type="button"
        :style="{
          ...styles.suggestion,
          ...(hoveredSuggestion === suggestion ? styles.suggestionHover : {}),
        }"
        :data-testid="`suggestion-${index}`"
        @click="handleSuggestionClick(suggestion)"
        @mouseenter="hoveredSuggestion = suggestion"
        @mouseleave="hoveredSuggestion = null"
      >
        <span>{{ CONVERSATION_SUGGESTIONS[index]?.icon || '💡' }}</span>
        <span>{{ suggestion }}</span>
      </button>
    </div>

    <!-- Input -->
    <div :style="styles.inputContainer">
      <form :style="styles.inputWrapper" @submit="handleSubmit">
        <textarea
          ref="inputRef"
          v-model="inputValue"
          :placeholder="
            language === 'ru' ? 'Опишите проблему или идею...' : 'Describe a problem or idea...'
          "
          :style="{
            ...styles.input,
            ...(inputFocused ? styles.inputFocused : {}),
          }"
          :rows="1"
          :disabled="isProcessing"
          data-testid="message-input"
          @keydown="handleKeyDown"
          @focus="inputFocused = true"
          @blur="inputFocused = false"
        />
        <button
          type="submit"
          :disabled="!inputValue.trim() || isProcessing"
          :style="{
            ...styles.sendButton,
            ...(!inputValue.trim() || isProcessing ? styles.sendButtonDisabled : {}),
            ...(hoveredSend && inputValue.trim() && !isProcessing ? styles.sendButtonHover : {}),
          }"
          data-testid="send-button"
          @mouseenter="hoveredSend = true"
          @mouseleave="hoveredSend = false"
        >
          {{ isProcessing ? '...' : language === 'ru' ? 'Отправить' : 'Send' }}
        </button>
      </form>
    </div>

    <!-- Slot for child components -->
    <slot />
  </div>
</template>
