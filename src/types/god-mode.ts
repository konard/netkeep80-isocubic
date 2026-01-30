/**
 * GOD MODE Types
 *
 * TypeScript types for the unified GOD MODE development window.
 * Provides types for window state, tabs, configuration, and component integration.
 *
 * TASK 54: Unified DevMode Window (Phase 9 - GOD MODE)
 *
 * Features:
 * - Window position and size management
 * - Tab system for DevMode panels
 * - Persistent settings
 * - Keyboard shortcuts
 */

import type { QueryLanguage } from './ai-query'

/**
 * Available tabs in GOD MODE window
 */
export type GodModeTab = 'query' | 'context' | 'search' | 'conversation' | 'issues'

/**
 * Tab information for display
 */
export interface GodModeTabInfo {
  /** Tab identifier */
  id: GodModeTab
  /** Display label in Russian */
  labelRu: string
  /** Display label in English */
  labelEn: string
  /** Tab icon (emoji or character) */
  icon: string
  /** Whether the tab is available (some tabs may be pending implementation) */
  available: boolean
  /** Brief description in Russian */
  descriptionRu: string
  /** Brief description in English */
  descriptionEn: string
}

/**
 * All available tabs configuration
 */
export const GOD_MODE_TABS: GodModeTabInfo[] = [
  {
    id: 'query',
    labelRu: 'Запрос',
    labelEn: 'Query',
    icon: '🤖',
    available: true,
    descriptionRu: 'AI-запросы к метаданным компонентов',
    descriptionEn: 'AI queries for component metadata',
  },
  {
    id: 'context',
    labelRu: 'Контекст',
    labelEn: 'Context',
    icon: '🎯',
    available: true,
    descriptionRu: 'Контекстная информация о выбранном компоненте',
    descriptionEn: 'Context information for selected component',
  },
  {
    id: 'search',
    labelRu: 'Поиск',
    labelEn: 'Search',
    icon: '🔍',
    available: true,
    descriptionRu: 'Расширенный поиск компонентов',
    descriptionEn: 'Extended component search',
  },
  {
    id: 'conversation',
    labelRu: 'Диалог',
    labelEn: 'Chat',
    icon: '💬',
    available: true,
    descriptionRu: 'AI-диалог для обсуждения улучшений',
    descriptionEn: 'AI conversation for discussing improvements',
  },
  {
    id: 'issues',
    labelRu: 'Задачи',
    labelEn: 'Issues',
    icon: '📝',
    available: false,
    descriptionRu: 'Черновики GitHub Issues (TASK 56)',
    descriptionEn: 'GitHub Issue drafts (TASK 56)',
  },
]

/**
 * Window anchor positions
 */
export type WindowAnchor = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

/**
 * Window position on screen
 */
export interface WindowPosition {
  /** X coordinate (left offset) */
  x: number
  /** Y coordinate (top offset) */
  y: number
  /** Anchor point for positioning */
  anchor?: WindowAnchor
}

/**
 * Window size constraints and current dimensions
 */
export interface WindowSize {
  /** Current width in pixels */
  width: number
  /** Current height in pixels */
  height: number
  /** Minimum width in pixels */
  minWidth: number
  /** Minimum height in pixels */
  minHeight: number
  /** Maximum width in pixels */
  maxWidth: number
  /** Maximum height in pixels */
  maxHeight: number
}

/**
 * Default window size configuration
 */
export const DEFAULT_WINDOW_SIZE: WindowSize = {
  width: 500,
  height: 600,
  minWidth: 380,
  minHeight: 400,
  maxWidth: 900,
  maxHeight: 900,
}

/**
 * Default window position
 */
export const DEFAULT_WINDOW_POSITION: WindowPosition = {
  x: 20,
  y: 80,
  anchor: 'top-right',
}

/**
 * Window state (open, minimized, pinned)
 */
export type WindowState = 'open' | 'minimized' | 'closed'

/**
 * Keyboard shortcuts configuration
 */
export interface KeyboardShortcuts {
  /** Shortcut to toggle GOD MODE window (default: Ctrl+Shift+G) */
  toggleWindow: string
  /** Shortcut to minimize window */
  minimizeWindow?: string
  /** Shortcut to switch to next tab */
  nextTab?: string
  /** Shortcut to switch to previous tab */
  prevTab?: string
}

/**
 * Default keyboard shortcuts
 */
export const DEFAULT_KEYBOARD_SHORTCUTS: KeyboardShortcuts = {
  toggleWindow: 'Ctrl+Shift+G',
  minimizeWindow: 'Escape',
  nextTab: 'Ctrl+Tab',
  prevTab: 'Ctrl+Shift+Tab',
}

/**
 * GOD MODE window configuration
 */
export interface GodModeConfig {
  /** GitHub repository owner for issue creation (TASK 57) */
  github?: {
    owner: string
    repo: string
    defaultLabels?: string[]
  }
  /** Initial window position */
  position?: WindowPosition
  /** Initial window size */
  size?: Partial<WindowSize>
  /** Visible tabs (default: all available) */
  tabs?: GodModeTab[]
  /** Keyboard shortcuts configuration */
  shortcuts?: Partial<KeyboardShortcuts>
  /** Preferred language for UI */
  preferredLanguage?: QueryLanguage
  /** Whether to remember window state between sessions */
  persistState?: boolean
}

/**
 * Default GOD MODE configuration
 */
export const DEFAULT_GOD_MODE_CONFIG: GodModeConfig = {
  position: DEFAULT_WINDOW_POSITION,
  size: DEFAULT_WINDOW_SIZE,
  tabs: ['query', 'context', 'search'],
  shortcuts: DEFAULT_KEYBOARD_SHORTCUTS,
  preferredLanguage: 'ru',
  persistState: true,
}

/**
 * GOD MODE window state (for persistence)
 */
export interface GodModeWindowState {
  /** Current window state */
  state: WindowState
  /** Current position */
  position: WindowPosition
  /** Current size */
  size: WindowSize
  /** Currently active tab */
  activeTab: GodModeTab
  /** Whether window is pinned (stays on top) */
  isPinned: boolean
  /** Last opened timestamp */
  lastOpened?: string
}

/**
 * Default window state
 */
export const DEFAULT_WINDOW_STATE: GodModeWindowState = {
  state: 'closed',
  position: DEFAULT_WINDOW_POSITION,
  size: DEFAULT_WINDOW_SIZE,
  activeTab: 'query',
  isPinned: false,
}

/**
 * LocalStorage key for GOD MODE state
 */
export const GOD_MODE_STORAGE_KEY = 'isocubic_god_mode_state'

/**
 * Loads GOD MODE state from localStorage
 */
export function loadGodModeState(): GodModeWindowState {
  try {
    const stored = localStorage.getItem(GOD_MODE_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        ...DEFAULT_WINDOW_STATE,
        ...parsed,
        position: { ...DEFAULT_WINDOW_POSITION, ...parsed.position },
        size: { ...DEFAULT_WINDOW_SIZE, ...parsed.size },
      }
    }
  } catch (e) {
    console.warn('Failed to load GOD MODE state:', e)
  }
  return DEFAULT_WINDOW_STATE
}

/**
 * Saves GOD MODE state to localStorage
 */
export function saveGodModeState(state: GodModeWindowState): void {
  try {
    localStorage.setItem(GOD_MODE_STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.warn('Failed to save GOD MODE state:', e)
  }
}

/**
 * Drag operation state
 */
export interface DragState {
  /** Whether dragging is active */
  isDragging: boolean
  /** Starting mouse X position */
  startX: number
  /** Starting mouse Y position */
  startY: number
  /** Starting window X position */
  startWindowX: number
  /** Starting window Y position */
  startWindowY: number
}

/**
 * Resize operation state
 */
export interface ResizeState {
  /** Whether resizing is active */
  isResizing: boolean
  /** Resize edge being dragged */
  edge: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null
  /** Starting mouse X position */
  startX: number
  /** Starting mouse Y position */
  startY: number
  /** Starting window width */
  startWidth: number
  /** Starting window height */
  startHeight: number
  /** Starting window X position */
  startWindowX: number
  /** Starting window Y position */
  startWindowY: number
}

/**
 * GOD MODE context value interface
 */
export interface GodModeContextValue {
  /** Current window state */
  windowState: GodModeWindowState
  /** Configuration */
  config: GodModeConfig
  /** Open the GOD MODE window */
  openWindow: () => void
  /** Close the GOD MODE window */
  closeWindow: () => void
  /** Minimize the GOD MODE window */
  minimizeWindow: () => void
  /** Toggle window state (open/closed) */
  toggleWindow: () => void
  /** Switch to a specific tab */
  setActiveTab: (tab: GodModeTab) => void
  /** Update window position */
  setPosition: (position: WindowPosition) => void
  /** Update window size */
  setSize: (size: Partial<WindowSize>) => void
  /** Toggle pin state */
  togglePin: () => void
  /** Reset to default state */
  resetState: () => void
  /** Whether window is currently visible */
  isVisible: boolean
}

/**
 * Validates a GOD MODE tab ID
 */
export function isValidTab(tab: string): tab is GodModeTab {
  return ['query', 'context', 'search', 'conversation', 'issues'].includes(tab)
}

/**
 * Gets tab info by ID
 */
export function getTabInfo(tabId: GodModeTab): GodModeTabInfo | undefined {
  return GOD_MODE_TABS.find((tab) => tab.id === tabId)
}

/**
 * Gets available tabs based on config
 */
export function getAvailableTabs(config?: GodModeConfig): GodModeTabInfo[] {
  const configTabs = config?.tabs || DEFAULT_GOD_MODE_CONFIG.tabs
  return GOD_MODE_TABS.filter(
    (tab) => tab.available && (!configTabs || configTabs.includes(tab.id))
  )
}

/**
 * Clamps a number between min and max values
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Ensures window position is within viewport bounds
 */
export function constrainPosition(
  position: WindowPosition,
  size: WindowSize,
  viewportWidth: number,
  viewportHeight: number
): WindowPosition {
  const padding = 20
  return {
    ...position,
    x: clamp(position.x, padding, viewportWidth - size.width - padding),
    y: clamp(position.y, padding, viewportHeight - size.height - padding),
  }
}

/**
 * Ensures window size is within constraints
 */
export function constrainSize(size: Partial<WindowSize>): WindowSize {
  const base = { ...DEFAULT_WINDOW_SIZE, ...size }
  return {
    ...base,
    width: clamp(base.width, base.minWidth, base.maxWidth),
    height: clamp(base.height, base.minHeight, base.maxHeight),
  }
}

/**
 * Parses keyboard shortcut string into key components
 */
export function parseShortcut(shortcut: string): {
  ctrl: boolean
  shift: boolean
  alt: boolean
  meta: boolean
  key: string
} {
  const parts = shortcut.toLowerCase().split('+')
  const key = parts[parts.length - 1]

  return {
    ctrl: parts.includes('ctrl'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    meta: parts.includes('meta') || parts.includes('cmd'),
    key,
  }
}

/**
 * Checks if a keyboard event matches a shortcut
 */
export function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const parsed = parseShortcut(shortcut)
  return (
    (parsed.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey) &&
    parsed.shift === event.shiftKey &&
    parsed.alt === event.altKey &&
    event.key.toLowerCase() === parsed.key
  )
}

// =============================================================================
// TASK 55: AI Conversation Agent Types
// =============================================================================

/**
 * Role of the message sender in a conversation
 */
export type ConversationRole = 'user' | 'assistant' | 'system'

/**
 * Context information attached to a conversation message
 */
export interface ConversationMessageContext {
  /** ID of the component being discussed */
  componentId?: string
  /** Screenshot data (base64) */
  screenshot?: string
  /** Screen position where the user was looking */
  screenPosition?: { x: number; y: number }
  /** Current application state/view */
  currentView?: string
  /** Any selected text or code */
  selectedText?: string
}

/**
 * A single message in the conversation
 */
export interface ConversationMessage {
  /** Unique message ID */
  id: string
  /** Who sent the message */
  role: ConversationRole
  /** Message content */
  content: string
  /** Timestamp when the message was created */
  timestamp: string
  /** Optional context information */
  context?: ConversationMessageContext
  /** Whether the message is still being generated */
  isStreaming?: boolean
  /** Error information if message generation failed */
  error?: string
}

/**
 * Conversation session state
 */
export interface ConversationSession {
  /** Unique session ID */
  id: string
  /** Session title (auto-generated or user-set) */
  title: string
  /** All messages in the session */
  messages: ConversationMessage[]
  /** When the session was created */
  createdAt: string
  /** When the session was last updated */
  updatedAt: string
  /** Current processing status */
  status: 'idle' | 'processing' | 'error'
  /** Language used in the conversation */
  language: QueryLanguage
}

/**
 * Conversation panel settings
 */
export interface ConversationPanelSettings {
  /** Maximum number of messages to keep in history */
  maxHistoryMessages: number
  /** Whether to auto-scroll to new messages */
  autoScroll: boolean
  /** Whether to show typing indicators */
  showTypingIndicator: boolean
  /** Whether to show message timestamps */
  showTimestamps: boolean
  /** Preferred language for AI responses */
  preferredLanguage: QueryLanguage
  /** Whether to persist conversation across sessions */
  persistConversation: boolean
  /** Prompt suggestions to show */
  showSuggestions: boolean
}

/**
 * Default conversation panel settings
 */
export const DEFAULT_CONVERSATION_SETTINGS: ConversationPanelSettings = {
  maxHistoryMessages: 100,
  autoScroll: true,
  showTypingIndicator: true,
  showTimestamps: true,
  preferredLanguage: 'ru',
  persistConversation: true,
  showSuggestions: true,
}

/**
 * Suggestion for conversation prompts
 */
export interface ConversationSuggestion {
  /** Suggestion text (Russian) */
  textRu: string
  /** Suggestion text (English) */
  textEn: string
  /** Category of the suggestion */
  category: 'improvement' | 'bug' | 'feature' | 'question' | 'general'
  /** Icon for the suggestion */
  icon: string
}

/**
 * Default conversation suggestions
 */
export const CONVERSATION_SUGGESTIONS: ConversationSuggestion[] = [
  {
    textRu: 'Что можно улучшить в этом компоненте?',
    textEn: 'What can be improved in this component?',
    category: 'improvement',
    icon: '✨',
  },
  {
    textRu: 'Я вижу проблему с...',
    textEn: 'I see a problem with...',
    category: 'bug',
    icon: '🐛',
  },
  {
    textRu: 'Хочу добавить новую функцию...',
    textEn: 'I want to add a new feature...',
    category: 'feature',
    icon: '🚀',
  },
  {
    textRu: 'Как работает этот компонент?',
    textEn: 'How does this component work?',
    category: 'question',
    icon: '❓',
  },
  {
    textRu: 'Помоги сформулировать задачу',
    textEn: 'Help me formulate a task',
    category: 'general',
    icon: '📝',
  },
]

/**
 * LocalStorage key for conversation history
 */
export const CONVERSATION_STORAGE_KEY = 'isocubic_god_mode_conversation'

/**
 * Generates a unique message ID
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Generates a unique session ID
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Creates a new conversation message
 */
export function createMessage(
  role: ConversationRole,
  content: string,
  context?: ConversationMessageContext
): ConversationMessage {
  return {
    id: generateMessageId(),
    role,
    content,
    timestamp: new Date().toISOString(),
    context,
    isStreaming: false,
  }
}

/**
 * Creates a new conversation session
 */
export function createSession(language: QueryLanguage = 'ru'): ConversationSession {
  return {
    id: generateSessionId(),
    title: language === 'ru' ? 'Новый диалог' : 'New conversation',
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'idle',
    language,
  }
}

/**
 * Loads conversation session from localStorage
 */
export function loadConversationSession(): ConversationSession | null {
  try {
    const stored = localStorage.getItem(CONVERSATION_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.warn('Failed to load conversation session:', e)
  }
  return null
}

/**
 * Saves conversation session to localStorage
 */
export function saveConversationSession(session: ConversationSession): void {
  try {
    localStorage.setItem(CONVERSATION_STORAGE_KEY, JSON.stringify(session))
  } catch (e) {
    console.warn('Failed to save conversation session:', e)
  }
}

/**
 * Clears the conversation session from localStorage
 */
export function clearConversationSession(): void {
  try {
    localStorage.removeItem(CONVERSATION_STORAGE_KEY)
  } catch (e) {
    console.warn('Failed to clear conversation session:', e)
  }
}
