/**
 * @isocubic/god-mode
 *
 * GOD MODE — Unified floating DevMode window with AI conversation,
 * GitHub issue generation, screen capture & annotations for Vue.js 3.0 apps.
 *
 * ## Quick Start
 *
 * ```vue
 * <script setup lang="ts">
 * import { provideGodMode, useGodMode } from '@isocubic/god-mode'
 *
 * // In root component (App.vue)
 * provideGodMode({
 *   github: { owner: 'my-org', repo: 'my-repo' },
 *   preferredLanguage: 'en',
 *   storageKeyPrefix: 'my_app_god_mode',
 * })
 *
 * // In any child component
 * const { toggleWindow, isVisible } = useGodMode()
 * </script>
 * ```
 */

// =============================================================================
// Types — Common
// =============================================================================
export type { QueryLanguage, ComponentMeta, ComponentRegistry } from './types/common'
export { detectLanguage, DEFAULT_COMPONENT_REGISTRY } from './types/common'

// =============================================================================
// Types — GOD MODE window, tabs, conversation
// =============================================================================
export type {
  GodModeTab,
  GodModeTabInfo,
  WindowAnchor,
  WindowPosition,
  WindowSize,
  WindowState,
  KeyboardShortcuts,
  GodModeConfig,
  GodModeWindowState,
  DragState,
  ResizeState,
  GodModeContextValue,
  ConversationRole,
  ConversationMessageContext,
  ConversationMessage,
  ConversationSession,
  ConversationPanelSettings,
  ConversationSuggestion,
} from './types/god-mode'

export {
  GOD_MODE_TABS,
  DEFAULT_WINDOW_SIZE,
  DEFAULT_WINDOW_POSITION,
  DEFAULT_KEYBOARD_SHORTCUTS,
  DEFAULT_GOD_MODE_CONFIG,
  DEFAULT_WINDOW_STATE,
  DEFAULT_CONVERSATION_SETTINGS,
  CONVERSATION_SUGGESTIONS,
  getStorageKey,
  loadGodModeState,
  saveGodModeState,
  isValidTab,
  getTabInfo,
  getAvailableTabs,
  clamp,
  constrainPosition,
  constrainSize,
  parseShortcut,
  matchesShortcut,
  getConversationStorageKey,
  generateMessageId,
  generateSessionId,
  createMessage,
  createSession,
  loadConversationSession,
  saveConversationSession,
  clearConversationSession,
} from './types/god-mode'

// =============================================================================
// Types — Issue Generator
// =============================================================================
export type {
  IssueType,
  IssuePriority,
  IssueAnnotationType,
  IssueAnnotation,
  IssueScreenshot,
  IssueDraft,
  IssueTemplate,
  IssueTemplatePlaceholder,
  IssueDraftSettings,
} from './types/issue-generator'

export {
  DEFAULT_ISSUE_DRAFT_SETTINGS,
  BUILTIN_ISSUE_TEMPLATES,
  LABEL_COLORS,
  PRIORITY_LABELS,
  TYPE_LABELS,
  getDefaultLabels,
  validateIssueDraft,
  generateDraftId,
  createIssueDraft,
  getIssueDraftStorageKey,
  MAX_DRAFTS_COUNT,
  DRAFT_AUTO_SAVE_INTERVAL,
} from './types/issue-generator'

// =============================================================================
// Components — GodModeProvider (Vue provide/inject)
// =============================================================================
export { provideGodMode, useGodMode, GOD_MODE_KEY } from './components/GodModeProvider'
export type { GodModeProviderProps } from './components/GodModeProvider'
