/**
 * ConversationPanel Component
 *
 * Chat-like interface for AI conversation in GOD MODE.
 * Allows users to discuss improvements, report bugs, and formulate tasks
 * through natural language conversation with the AI assistant.
 *
 * TASK 55: AI Conversation Agent (Phase 9 - GOD MODE)
 *
 * Features:
 * - Chat-like message history interface
 * - Context-aware AI responses
 * - Quick suggestion buttons
 * - Message streaming indicator
 * - Conversation history persistence
 * - Multi-language support (Russian/English)
 */

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import {
  type ConversationMessage,
  type ConversationPanelSettings,
  type ConversationMessageContext,
  DEFAULT_CONVERSATION_SETTINGS,
  CONVERSATION_SUGGESTIONS,
} from '../types/god-mode'
import { createConversationAgent, type AgentResponse } from '../lib/conversation-agent'

/**
 * Props for ConversationPanel
 */
export interface ConversationPanelProps {
  /** Custom styles for the panel container */
  style?: CSSProperties
  /** Custom class name */
  className?: string
  /** Currently selected component ID for context */
  selectedComponentId?: string | null
  /** Settings overrides */
  settings?: Partial<ConversationPanelSettings>
  /** Callback when a message is sent */
  onMessageSent?: (message: string) => void
  /** Callback when a response is received */
  onResponseReceived?: (response: AgentResponse) => void
  /** Callback when a related component is selected */
  onComponentSelect?: (componentId: string) => void
  /** Child components to render */
  children?: ReactNode
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

/**
 * Formats a timestamp for display
 */
function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * ConversationPanel Component
 */
export function ConversationPanel({
  style,
  className,
  selectedComponentId,
  settings: customSettings,
  onMessageSent,
  onResponseReceived,
  onComponentSelect,
  children,
}: ConversationPanelProps) {
  // Merged settings
  const settings: ConversationPanelSettings = useMemo(
    () => ({
      ...DEFAULT_CONVERSATION_SETTINGS,
      ...customSettings,
    }),
    [customSettings]
  )

  // Agent instance
  const agentRef = useRef<ConversationAgent | null>(null)
  if (!agentRef.current) {
    agentRef.current = createConversationAgent({ language: settings.preferredLanguage })
  }

  // State
  const [session, setSession] = useState<ConversationSession>(() => agentRef.current!.getSession())
  const [inputValue, setInputValue] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const [hoveredSuggestion, setHoveredSuggestion] = useState<string | null>(null)
  const [hoveredClear, setHoveredClear] = useState(false)
  const [hoveredSend, setHoveredSend] = useState(false)
  const [lastSuggestions, setLastSuggestions] = useState<string[]>([])

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Language
  const language = settings.preferredLanguage

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (settings.autoScroll && messagesEndRef.current?.scrollIntoView) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [session.messages, settings.autoScroll])

  // Handle sending a message
  const handleSend = useCallback(async () => {
    const content = inputValue.trim()
    if (!content || isProcessing) return

    setInputValue('')
    setIsProcessing(true)
    onMessageSent?.(content)

    // Build context
    const context: ConversationMessageContext = {}
    if (selectedComponentId) {
      context.componentId = selectedComponentId
    }

    try {
      const response = await agentRef.current!.processMessage(content, context)
      setSession(agentRef.current!.getSession())
      onResponseReceived?.(response)

      if (response.suggestions) {
        setLastSuggestions(response.suggestions)
      }
    } catch (error) {
      console.error('Error processing message:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [inputValue, isProcessing, selectedComponentId, onMessageSent, onResponseReceived])

  // Handle form submission
  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      handleSend()
    },
    [handleSend]
  )

  // Handle key down (Enter to send, Shift+Enter for new line)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  // Handle suggestion click
  const handleSuggestionClick = useCallback((text: string) => {
    setInputValue(text)
    inputRef.current?.focus()
  }, [])

  // Handle clear conversation
  const handleClear = useCallback(() => {
    const newSession = agentRef.current!.clearSession()
    setSession(newSession)
    setLastSuggestions([])
  }, [])

  // Handle component selection from related components (for future use)
  const _handleComponentClick = useCallback(
    (componentId: string) => {
      onComponentSelect?.(componentId)
    },
    [onComponentSelect]
  )
  void _handleComponentClick // Marked as intentionally unused for future feature

  // Get suggestions to display
  const displaySuggestions = useMemo(() => {
    if (session.messages.length === 0) {
      return CONVERSATION_SUGGESTIONS.map((s) => (language === 'ru' ? s.textRu : s.textEn))
    }
    return lastSuggestions
  }, [session.messages.length, lastSuggestions, language])

  // Render empty state
  const renderEmptyState = () => (
    <div style={styles.emptyState}>
      <div style={styles.emptyIcon}>💬</div>
      <div style={styles.emptyTitle}>
        {language === 'ru' ? 'Начните диалог' : 'Start a conversation'}
      </div>
      <div style={styles.emptyDescription}>
        {language === 'ru'
          ? 'Расскажите о проблеме, предложите улучшение или задайте вопрос о компоненте. Я помогу сформулировать задачу.'
          : 'Describe a problem, suggest an improvement, or ask a question about a component. I will help formulate a task.'}
      </div>
    </div>
  )

  // Render a single message
  const renderMessage = (message: ConversationMessage, index: number) => {
    const isUser = message.role === 'user'
    const isSystem = message.role === 'system'

    const messageStyle: CSSProperties = {
      ...styles.message,
      ...(isUser ? styles.userMessage : isSystem ? styles.systemMessage : styles.assistantMessage),
    }

    return (
      <div key={message.id || index} style={messageStyle} data-testid={`message-${message.role}`}>
        <div>{message.content}</div>
        {settings.showTimestamps && message.timestamp && (
          <div style={styles.messageTime}>{formatTime(message.timestamp)}</div>
        )}
      </div>
    )
  }

  // Render typing indicator
  const renderTypingIndicator = () => {
    if (!isProcessing || !settings.showTypingIndicator) return null

    return (
      <div style={styles.typingIndicator} data-testid="typing-indicator">
        <div style={styles.typingDots}>
          <span style={{ ...styles.typingDot, animationDelay: '-0.32s' }} />
          <span style={{ ...styles.typingDot, animationDelay: '-0.16s' }} />
          <span style={styles.typingDot} />
        </div>
        <span style={{ color: '#9ca3af', fontSize: '12px' }}>
          {language === 'ru' ? 'Думаю...' : 'Thinking...'}
        </span>
      </div>
    )
  }

  // Render suggestions
  const renderSuggestions = () => {
    if (!settings.showSuggestions || displaySuggestions.length === 0) return null

    return (
      <div style={styles.suggestionsContainer} data-testid="suggestions">
        {displaySuggestions.map((suggestion, index) => {
          const suggestionObj = CONVERSATION_SUGGESTIONS[index]
          const icon = suggestionObj?.icon || '💡'
          const isHovered = hoveredSuggestion === suggestion

          return (
            <button
              key={index}
              type="button"
              style={{
                ...styles.suggestion,
                ...(isHovered ? styles.suggestionHover : {}),
              }}
              onClick={() => handleSuggestionClick(suggestion)}
              onMouseEnter={() => setHoveredSuggestion(suggestion)}
              onMouseLeave={() => setHoveredSuggestion(null)}
              data-testid={`suggestion-${index}`}
            >
              <span>{icon}</span>
              <span>{suggestion}</span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div
      className={className}
      style={{ ...styles.container, ...style }}
      data-testid="conversation-panel"
    >
      {/* CSS for typing animation */}
      <style>
        {`
          @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
          }
        `}
      </style>

      {/* Header */}
      {session.messages.length > 0 && (
        <div style={styles.headerBar}>
          <span style={styles.headerTitle}>
            {language === 'ru'
              ? `${session.messages.length} сообщений`
              : `${session.messages.length} messages`}
          </span>
          <button
            type="button"
            style={{
              ...styles.clearButton,
              ...(hoveredClear ? styles.clearButtonHover : {}),
            }}
            onClick={handleClear}
            onMouseEnter={() => setHoveredClear(true)}
            onMouseLeave={() => setHoveredClear(false)}
            data-testid="clear-button"
          >
            {language === 'ru' ? 'Очистить' : 'Clear'}
          </button>
        </div>
      )}

      {/* Messages */}
      <div style={styles.messagesContainer} data-testid="messages-container">
        {session.messages.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            {session.messages.map(renderMessage)}
            {renderTypingIndicator()}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Suggestions */}
      {renderSuggestions()}

      {/* Input */}
      <div style={styles.inputContainer}>
        <form onSubmit={handleSubmit} style={styles.inputWrapper}>
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder={
              language === 'ru' ? 'Опишите проблему или идею...' : 'Describe a problem or idea...'
            }
            style={{
              ...styles.input,
              ...(inputFocused ? styles.inputFocused : {}),
            }}
            rows={1}
            disabled={isProcessing}
            data-testid="message-input"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isProcessing}
            style={{
              ...styles.sendButton,
              ...(!inputValue.trim() || isProcessing ? styles.sendButtonDisabled : {}),
              ...(hoveredSend && inputValue.trim() && !isProcessing ? styles.sendButtonHover : {}),
            }}
            onMouseEnter={() => setHoveredSend(true)}
            onMouseLeave={() => setHoveredSend(false)}
            data-testid="send-button"
          >
            {isProcessing
              ? language === 'ru'
                ? '...'
                : '...'
              : language === 'ru'
                ? 'Отправить'
                : 'Send'}
          </button>
        </form>
      </div>

      {children}
    </div>
  )
}

export default ConversationPanel
