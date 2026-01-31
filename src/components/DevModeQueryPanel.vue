/** * DevModeQueryPanel Component * * Provides an AI-powered query interface for Developer Mode. *
Users can ask natural language questions about components and metadata. * * TASK 49: AI Query
Interface for DevMode (Phase 8 - AI + Metadata) * TASK 66: Migrated from React TSX to Vue 3 SFC
(Phase 10 - Vue.js 3.0 Migration) * * Features: * - Natural language input field for queries * -
Formatted response display area * - Query history with re-use capability * - Collapsible/expandable
panel * - Keyboard shortcut for quick access (Ctrl+Shift+Q) * - Multi-language support
(Russian/English) */

<script setup lang="ts">
// === Types ===
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { CSSProperties } from 'vue'
import { useIsDevModeEnabled } from '../lib/devmode'
import {
  type AIQueryRequest,
  type AIQueryResponse,
  type QueryHistoryEntry,
  type QueryProcessingStatus,
  type QueryPanelSettings,
  type QueryLanguage,
  createQueryRequest,
  createSuccessResponse,
  createHistoryEntry,
  detectQueryLanguage,
  classifyQueryIntent,
  DEFAULT_QUERY_PANEL_SETTINGS,
  EXAMPLE_QUERIES,
} from '../types/ai-query'
import type { ComponentMeta } from '../types/component-meta'
import {
  getAllComponentMeta,
  searchComponentMeta,
  getComponentsByStatus,
} from '../types/component-meta'

// === Props & Emits ===
const props = withDefaults(
  defineProps<{
    /** Whether the panel is initially expanded */
    initialExpanded?: boolean
    /** Custom styles for the panel container */
    style?: CSSProperties
    /** Custom class name */
    className?: string
    /** Position of the panel */
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
    /** Settings overrides */
    settings?: Partial<QueryPanelSettings>
  }>(),
  {
    initialExpanded: true,
    style: undefined,
    className: undefined,
    position: 'bottom-right',
    settings: undefined,
  }
)

const emit = defineEmits<{
  queryProcessed: [query: string, response: AIQueryResponse]
}>()

// === Module-level constants and helpers ===

/**
 * LocalStorage key for query history
 */
const HISTORY_STORAGE_KEY = 'isocubic_query_history'

/**
 * Loads query history from localStorage
 */
function loadHistory(): QueryHistoryEntry[] {
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.warn('Failed to load query history:', e)
  }
  return []
}

/**
 * Saves query history to localStorage
 */
function saveHistory(history: QueryHistoryEntry[]): void {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history))
  } catch (e) {
    console.warn('Failed to save query history:', e)
  }
}

/**
 * Styles for the component
 */
const componentStyles: Record<string, CSSProperties> = {
  container: {
    position: 'fixed',
    zIndex: 10000,
    backgroundColor: 'rgba(25, 25, 35, 0.98)',
    border: '1px solid rgba(100, 100, 255, 0.3)',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '13px',
    color: '#e5e7eb',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
    maxWidth: '450px',
    minWidth: '350px',
  },
  containerCollapsed: {
    maxHeight: '48px',
    overflow: 'hidden',
  },
  containerExpanded: {
    maxHeight: '80vh',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: 'rgba(60, 60, 100, 0.3)',
    borderBottom: '1px solid rgba(100, 100, 255, 0.2)',
    cursor: 'pointer',
    userSelect: 'none',
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#a5b4fc',
  },
  headerIcon: {
    fontSize: '16px',
  },
  headerToggle: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s',
  },
  content: {
    padding: '16px',
    maxHeight: 'calc(80vh - 48px)',
    overflowY: 'auto',
  },
  inputContainer: {
    marginBottom: '16px',
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
    borderRadius: '8px',
    color: '#e5e7eb',
    fontSize: '13px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  inputFocused: {
    borderColor: 'rgba(100, 100, 255, 0.6)',
    boxShadow: '0 0 0 3px rgba(100, 100, 255, 0.1)',
  },
  submitButton: {
    padding: '10px 16px',
    backgroundColor: '#6366f1',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    whiteSpace: 'nowrap',
  },
  submitButtonDisabled: {
    backgroundColor: '#4b5563',
    cursor: 'not-allowed',
  },
  submitButtonHover: {
    backgroundColor: '#4f46e5',
  },
  responseContainer: {
    marginBottom: '16px',
  },
  responseHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  responseLabel: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    color: '#6b7280',
    letterSpacing: '0.5px',
  },
  confidenceBadge: {
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: 500,
  },
  responseContent: {
    padding: '12px',
    backgroundColor: 'rgba(40, 40, 60, 0.5)',
    borderRadius: '8px',
    lineHeight: 1.6,
  },
  responseError: {
    color: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  responseProcessing: {
    color: '#a5b4fc',
    fontStyle: 'italic',
  },
  componentsContainer: {
    marginTop: '12px',
  },
  componentsLabel: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    color: '#6b7280',
    marginBottom: '8px',
  },
  componentCard: {
    padding: '8px 12px',
    backgroundColor: 'rgba(50, 50, 80, 0.5)',
    borderRadius: '6px',
    marginBottom: '6px',
    border: '1px solid rgba(100, 100, 255, 0.15)',
  },
  componentName: {
    fontWeight: 600,
    color: '#a5b4fc',
    marginBottom: '2px',
  },
  componentSummary: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  suggestionsContainer: {
    marginTop: '12px',
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px',
  },
  suggestionChip: {
    padding: '4px 10px',
    backgroundColor: 'rgba(60, 60, 100, 0.5)',
    border: '1px solid rgba(100, 100, 255, 0.2)',
    borderRadius: '12px',
    fontSize: '11px',
    color: '#a5b4fc',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  historyContainer: {
    borderTop: '1px solid rgba(100, 100, 255, 0.2)',
    paddingTop: '12px',
  },
  historyHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  historyLabel: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    color: '#6b7280',
    letterSpacing: '0.5px',
  },
  clearButton: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    fontSize: '11px',
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: '4px',
    transition: 'color 0.2s',
  },
  historyItem: {
    padding: '8px 12px',
    backgroundColor: 'rgba(40, 40, 60, 0.3)',
    borderRadius: '6px',
    marginBottom: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  historyQuery: {
    fontSize: '12px',
    color: '#e5e7eb',
    marginBottom: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  historyMeta: {
    display: 'flex',
    gap: '8px',
    fontSize: '10px',
    color: '#6b7280',
  },
  examplesContainer: {
    marginBottom: '16px',
  },
  examplesLabel: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    color: '#6b7280',
    marginBottom: '8px',
  },
  shortcutHint: {
    fontSize: '10px',
    color: '#6b7280',
    marginTop: '8px',
    textAlign: 'center' as const,
  },
  kbd: {
    padding: '2px 6px',
    backgroundColor: 'rgba(100, 100, 255, 0.2)',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '10px',
  },
}

/**
 * Position styles for the panel
 */
const positionStyles: Record<string, CSSProperties> = {
  'top-left': { top: '80px', left: '20px' },
  'top-right': { top: '80px', right: '20px' },
  'bottom-left': { bottom: '20px', left: '20px' },
  'bottom-right': { bottom: '20px', right: '20px' },
}

/**
 * Processes a query and returns a response
 * This is a rule-based implementation that will be enhanced in TASK 50
 */
function processQuery(request: AIQueryRequest): AIQueryResponse {
  const startTime = Date.now()
  const { query, intent, language } = request
  const lang = language || detectQueryLanguage(query)
  const queryIntent = intent || classifyQueryIntent(query, lang)

  // Get all components for searching
  const allComponents = getAllComponentMeta()

  // Extract component name from query
  const componentNameMatch = query.match(
    /(?:компонент[аеуы]?\s+|component\s+)?([A-Z][a-zA-Z]*(?:Editor|Panel|Preview|Gallery|Generator)?)/i
  )
  const componentName = componentNameMatch ? componentNameMatch[1] : null

  let answer = ''
  let components: ComponentMeta[] = []
  let confidence = 0.7
  let suggestions: string[] = []
  let relatedQueries: string[] = []

  switch (queryIntent) {
    case 'describe': {
      if (componentName) {
        components = searchComponentMeta(componentName)
        if (components.length > 0) {
          const comp = components[0]
          answer =
            lang === 'ru'
              ? `**${comp.name}** (v${comp.version}) — ${comp.summary}\n\n${comp.description}`
              : `**${comp.name}** (v${comp.version}) — ${comp.summary}\n\n${comp.description}`
          confidence = 0.9
          relatedQueries =
            lang === 'ru'
              ? [
                  `Какие зависимости у ${comp.name}?`,
                  `Как использовать ${comp.name}?`,
                  `История изменений ${comp.name}`,
                ]
              : [
                  `What are the dependencies of ${comp.name}?`,
                  `How to use ${comp.name}?`,
                  `Change history of ${comp.name}`,
                ]
        } else {
          answer =
            lang === 'ru'
              ? `Компонент "${componentName}" не найден. Попробуйте уточнить название.`
              : `Component "${componentName}" not found. Try specifying the name more precisely.`
          confidence = 0.5
          suggestions = allComponents.slice(0, 5).map((c) => c.name)
        }
      } else {
        components = allComponents.slice(0, 5)
        answer =
          lang === 'ru'
            ? `В проекте зарегистрировано ${allComponents.length} компонентов. Укажите название конкретного компонента для получения подробной информации.`
            : `There are ${allComponents.length} components registered in the project. Specify a component name for detailed information.`
        confidence = 0.6
      }
      break
    }

    case 'find': {
      // Search by keywords in query
      const searchTerms = query
        .toLowerCase()
        .replace(/[^a-zа-яё\s]/gi, '')
        .split(/\s+/)
        .filter((t) => t.length > 2)
      components = allComponents.filter((c) =>
        searchTerms.some(
          (term) =>
            c.name.toLowerCase().includes(term) ||
            c.summary.toLowerCase().includes(term) ||
            c.tags.some((t) => t.toLowerCase().includes(term))
        )
      )

      if (components.length > 0) {
        const names = components.map((c) => c.name).join(', ')
        answer =
          lang === 'ru'
            ? `Найдено ${components.length} компонент(ов): ${names}`
            : `Found ${components.length} component(s): ${names}`
        confidence = 0.85
      } else {
        answer =
          lang === 'ru'
            ? 'Не найдено подходящих компонентов. Попробуйте другие ключевые слова.'
            : 'No matching components found. Try different keywords.'
        confidence = 0.4
        suggestions = ['Gallery', 'Editor', 'Preview', 'Export']
      }
      break
    }

    case 'dependencies': {
      if (componentName) {
        components = searchComponentMeta(componentName)
        if (components.length > 0) {
          const comp = components[0]
          if (comp.dependencies.length > 0) {
            const deps = comp.dependencies
              .map((d) => `• ${d.name} (${d.type}): ${d.purpose}`)
              .join('\n')
            answer =
              lang === 'ru'
                ? `**Зависимости ${comp.name}:**\n\n${deps}`
                : `**Dependencies of ${comp.name}:**\n\n${deps}`
            confidence = 0.95
          } else {
            answer =
              lang === 'ru'
                ? `Компонент ${comp.name} не имеет зарегистрированных зависимостей.`
                : `Component ${comp.name} has no registered dependencies.`
            confidence = 0.7
          }
        }
      } else {
        answer =
          lang === 'ru'
            ? 'Укажите название компонента для просмотра зависимостей.'
            : 'Specify a component name to view dependencies.'
        confidence = 0.5
      }
      break
    }

    case 'history': {
      if (componentName) {
        components = searchComponentMeta(componentName)
        if (components.length > 0) {
          const comp = components[0]
          if (comp.history.length > 0) {
            const hist = comp.history
              .slice(0, 5)
              .map((h) => `• v${h.version} (${h.date.split('T')[0]}): ${h.description}`)
              .join('\n')
            answer =
              lang === 'ru'
                ? `**История изменений ${comp.name}:**\n\n${hist}`
                : `**Change history of ${comp.name}:**\n\n${hist}`
            confidence = 0.95
          } else {
            answer =
              lang === 'ru'
                ? `История изменений ${comp.name} недоступна.`
                : `Change history for ${comp.name} is not available.`
            confidence = 0.6
          }
        }
      } else {
        answer =
          lang === 'ru'
            ? 'Укажите название компонента для просмотра истории.'
            : 'Specify a component name to view history.'
        confidence = 0.5
      }
      break
    }

    case 'usage': {
      if (componentName) {
        components = searchComponentMeta(componentName)
        if (components.length > 0) {
          const comp = components[0]
          const tips = comp.tips?.length
            ? comp.tips.map((t) => `• ${t}`).join('\n')
            : lang === 'ru'
              ? 'Нет доступных подсказок.'
              : 'No tips available.'
          answer =
            lang === 'ru'
              ? `**Использование ${comp.name}:**\n\n${tips}\n\nФайл: \`${comp.filePath}\``
              : `**Usage of ${comp.name}:**\n\n${tips}\n\nFile: \`${comp.filePath}\``
          confidence = 0.8
        }
      } else {
        answer =
          lang === 'ru'
            ? 'Укажите название компонента для получения информации об использовании.'
            : 'Specify a component name to get usage information.'
        confidence = 0.5
      }
      break
    }

    case 'related': {
      if (componentName) {
        components = searchComponentMeta(componentName)
        if (components.length > 0) {
          const comp = components[0]
          const related = allComponents
            .filter(
              (c) =>
                c.id !== comp.id &&
                (c.phase === comp.phase || c.tags.some((t) => comp.tags.includes(t)))
            )
            .slice(0, 5)
          if (related.length > 0) {
            const names = related.map((c) => c.name).join(', ')
            answer =
              lang === 'ru'
                ? `**Связанные с ${comp.name}:**\n\n${names}`
                : `**Related to ${comp.name}:**\n\n${names}`
            components = related
            confidence = 0.75
          } else {
            answer =
              lang === 'ru'
                ? `Связанные компоненты для ${comp.name} не найдены.`
                : `No related components found for ${comp.name}.`
            confidence = 0.5
          }
        }
      }
      break
    }

    case 'features': {
      if (componentName) {
        components = searchComponentMeta(componentName)
        if (components.length > 0) {
          const comp = components[0]
          if (comp.features.length > 0) {
            const feats = comp.features
              .map((f) => `• ${f.enabled ? '[+]' : '[-]'} ${f.name}: ${f.description}`)
              .join('\n')
            answer =
              lang === 'ru'
                ? `**Функции ${comp.name}:**\n\n${feats}`
                : `**Features of ${comp.name}:**\n\n${feats}`
            confidence = 0.9
          } else {
            answer =
              lang === 'ru'
                ? `Список функций ${comp.name} не определён.`
                : `Feature list for ${comp.name} is not defined.`
            confidence = 0.6
          }
        }
      } else {
        answer =
          lang === 'ru'
            ? 'Укажите название компонента для просмотра функций.'
            : 'Specify a component name to view features.'
        confidence = 0.5
      }
      break
    }

    case 'status': {
      if (componentName) {
        components = searchComponentMeta(componentName)
        if (components.length > 0) {
          const comp = components[0]
          const statusLabels = {
            stable: lang === 'ru' ? 'Стабильный' : 'Stable',
            beta: 'Beta',
            experimental: lang === 'ru' ? 'Экспериментальный' : 'Experimental',
            deprecated: lang === 'ru' ? 'Устаревший' : 'Deprecated',
          }
          answer =
            lang === 'ru'
              ? `**${comp.name}**: ${statusLabels[comp.status]} (v${comp.version}, Фаза ${comp.phase})`
              : `**${comp.name}**: ${statusLabels[comp.status]} (v${comp.version}, Phase ${comp.phase})`
          confidence = 0.95

          const knownIssues = comp.knownIssues?.length
            ? `\n\n${lang === 'ru' ? 'Известные проблемы' : 'Known issues'}:\n${comp.knownIssues.map((i) => `• ${i}`).join('\n')}`
            : ''
          answer += knownIssues
        }
      } else {
        // Show status summary
        const stable = getComponentsByStatus('stable').length
        const beta = getComponentsByStatus('beta').length
        const experimental = getComponentsByStatus('experimental').length
        const deprecated = getComponentsByStatus('deprecated').length

        answer =
          lang === 'ru'
            ? `**Статус компонентов:**\n\n• Стабильные: ${stable}\n• Beta: ${beta}\n• Экспериментальные: ${experimental}\n• Устаревшие: ${deprecated}`
            : `**Component status:**\n\n• Stable: ${stable}\n• Beta: ${beta}\n• Experimental: ${experimental}\n• Deprecated: ${deprecated}`
        confidence = 0.85
      }
      break
    }

    default: {
      answer =
        lang === 'ru'
          ? 'Не удалось понять запрос. Попробуйте переформулировать или используйте один из примеров.'
          : 'Could not understand the query. Try rephrasing or use one of the examples.'
      confidence = 0.3
      suggestions = EXAMPLE_QUERIES[lang].slice(0, 3)
    }
  }

  return createSuccessResponse(answer, components, queryIntent, lang, confidence, {
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    relatedQueries: relatedQueries.length > 0 ? relatedQueries : undefined,
    processingTime: Date.now() - startTime,
  })
}

// === State ===
const isDevModeEnabled = useIsDevModeEnabled()

const isExpanded = ref(props.initialExpanded)
const query = ref('')
const response = ref<AIQueryResponse | null>(null)
const status = ref<QueryProcessingStatus>('idle')
const history = ref<QueryHistoryEntry[]>(loadHistory())
const isInputFocused = ref(false)
const isSubmitHovered = ref(false)

// Template refs
const inputRef = ref<HTMLInputElement | null>(null)
const panelRef = ref<HTMLDivElement | null>(null)

// === Computed ===
const mergedSettings = computed<QueryPanelSettings>(() => ({
  ...DEFAULT_QUERY_PANEL_SETTINGS,
  ...props.settings,
}))

const detectedLanguage = computed<QueryLanguage>(() =>
  query.value ? detectQueryLanguage(query.value) : mergedSettings.value.preferredLanguage
)

const examples = computed(() => EXAMPLE_QUERIES[detectedLanguage.value])

const containerStyle = computed<CSSProperties>(() => ({
  ...componentStyles.container,
  ...(isExpanded.value ? componentStyles.containerExpanded : componentStyles.containerCollapsed),
  ...positionStyles[props.position],
  ...props.style,
}))

const inputStyle = computed<CSSProperties>(() => ({
  ...componentStyles.input,
  ...(isInputFocused.value ? componentStyles.inputFocused : {}),
}))

const submitButtonStyle = computed<CSSProperties>(() => ({
  ...componentStyles.submitButton,
  ...(!query.value.trim() || status.value === 'processing'
    ? componentStyles.submitButtonDisabled
    : {}),
  ...(isSubmitHovered.value && query.value.trim() && status.value !== 'processing'
    ? componentStyles.submitButtonHover
    : {}),
}))

// === Methods ===

/**
 * Confidence color helper
 */
function getConfidenceColor(conf: number): string {
  if (conf >= 0.8) return '#22c55e'
  if (conf >= 0.5) return '#f59e0b'
  return '#ef4444'
}

/**
 * Handle query submission
 */
function handleSubmit() {
  if (!query.value.trim() || status.value === 'processing') {
    return
  }

  status.value = 'processing'

  // Simulate async processing for better UX
  setTimeout(() => {
    try {
      const request = createQueryRequest(query.value.trim())
      const result = processQuery(request)

      response.value = result
      status.value = result.success ? 'success' : 'error'

      // Add to history
      const historyEntry = createHistoryEntry(query.value.trim(), result)
      history.value = [
        historyEntry,
        ...history.value.slice(0, mergedSettings.value.maxHistoryEntries - 1),
      ]

      // Callback
      emit('queryProcessed', query.value.trim(), result)
    } catch (error) {
      response.value = {
        success: false,
        answer: '',
        error: String(error),
        confidence: 0,
        intent: 'unknown',
        language: detectQueryLanguage(query.value),
      }
      status.value = 'error'
    }
  }, 100)
}

/**
 * Handle keyboard in input
 */
function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSubmit()
  }
}

/**
 * Handle example/suggestion click
 */
function handleExampleClick(example: string) {
  query.value = example
  inputRef.value?.focus()
}

/**
 * Handle history item click
 */
function handleHistoryClick(entry: QueryHistoryEntry) {
  query.value = entry.query
  inputRef.value?.focus()
}

/**
 * Clear history
 */
function handleClearHistory() {
  history.value = []
  localStorage.removeItem(HISTORY_STORAGE_KEY)
}

/**
 * Toggle panel
 */
function handleToggle() {
  isExpanded.value = !isExpanded.value
}

// === Keyboard shortcut: Ctrl+Shift+Q to toggle panel ===
function handleGlobalKeyDown(e: globalThis.KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'q') {
    e.preventDefault()
    isExpanded.value = !isExpanded.value
    if (isExpanded.value && mergedSettings.value.autoFocus) {
      setTimeout(() => inputRef.value?.focus(), 100)
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeyDown)
})

// Auto-focus when expanded
watch(isExpanded, (newVal) => {
  if (newVal && mergedSettings.value.autoFocus) {
    setTimeout(() => inputRef.value?.focus(), 0)
  }
})

// Persist history
watch(
  history,
  (newHistory) => {
    if (mergedSettings.value.persistHistory) {
      saveHistory(newHistory.slice(0, mergedSettings.value.maxHistoryEntries))
    }
  },
  { deep: true }
)
</script>

<template>
  <div
    v-if="isDevModeEnabled"
    ref="panelRef"
    :class="className"
    :style="containerStyle"
    data-testid="devmode-query-panel"
  >
    <!-- Header -->
    <div :style="componentStyles.header" role="button" tabindex="0" @click="handleToggle">
      <div :style="componentStyles.headerTitle">
        <span :style="componentStyles.headerIcon">🤖</span>
        <span>AI Query</span>
      </div>
      <button
        type="button"
        :style="componentStyles.headerToggle"
        :aria-label="isExpanded ? 'Collapse' : 'Expand'"
      >
        {{ isExpanded ? '−' : '+' }}
      </button>
    </div>

    <!-- Content -->
    <div v-if="isExpanded" :style="componentStyles.content">
      <!-- Input -->
      <form :style="componentStyles.inputContainer" @submit.prevent="handleSubmit">
        <div :style="componentStyles.inputWrapper">
          <input
            ref="inputRef"
            v-model="query"
            type="text"
            :placeholder="
              detectedLanguage === 'ru'
                ? 'Задайте вопрос о компонентах...'
                : 'Ask about components...'
            "
            :style="inputStyle"
            data-testid="query-input"
            @keydown="handleKeyDown"
            @focus="isInputFocused = true"
            @blur="isInputFocused = false"
          />
          <button
            type="submit"
            :disabled="!query.trim() || status === 'processing'"
            :style="submitButtonStyle"
            data-testid="query-submit"
            @mouseenter="isSubmitHovered = true"
            @mouseleave="isSubmitHovered = false"
          >
            {{
              status === 'processing'
                ? detectedLanguage === 'ru'
                  ? 'Обработка...'
                  : 'Processing...'
                : detectedLanguage === 'ru'
                  ? 'Спросить'
                  : 'Ask'
            }}
          </button>
        </div>
      </form>

      <!-- Response -->
      <div v-if="response" :style="componentStyles.responseContainer" data-testid="query-response">
        <div :style="componentStyles.responseHeader">
          <span :style="componentStyles.responseLabel">
            {{ detectedLanguage === 'ru' ? 'Ответ' : 'Response' }}
          </span>
          <span
            :style="{
              ...componentStyles.confidenceBadge,
              backgroundColor: `${getConfidenceColor(response.confidence)}20`,
              color: getConfidenceColor(response.confidence),
            }"
          >
            {{ Math.round(response.confidence * 100) }}%
          </span>
        </div>
        <div
          :style="{
            ...componentStyles.responseContent,
            ...(response.error ? componentStyles.responseError : {}),
          }"
        >
          {{
            response.error ||
            response.answer ||
            (detectedLanguage === 'ru' ? 'Нет ответа' : 'No answer')
          }}
        </div>

        <!-- Components -->
        <div
          v-if="response.components && response.components.length > 0"
          :style="componentStyles.componentsContainer"
        >
          <div :style="componentStyles.componentsLabel">
            {{ detectedLanguage === 'ru' ? 'Найденные компоненты' : 'Found components' }}
          </div>
          <div
            v-for="comp in response.components.slice(0, 3)"
            :key="comp.id"
            :style="componentStyles.componentCard"
          >
            <div :style="componentStyles.componentName">{{ comp.name }}</div>
            <div :style="componentStyles.componentSummary">{{ comp.summary }}</div>
          </div>
        </div>

        <!-- Suggestions -->
        <div
          v-if="
            mergedSettings.showSuggestions &&
            response.suggestions &&
            response.suggestions.length > 0
          "
          :style="componentStyles.suggestionsContainer"
        >
          <button
            v-for="(sugg, i) in response.suggestions"
            :key="i"
            type="button"
            :style="componentStyles.suggestionChip"
            @click="handleExampleClick(sugg)"
          >
            {{ sugg }}
          </button>
        </div>

        <!-- Related queries -->
        <div
          v-if="
            mergedSettings.showRelatedQueries &&
            response.relatedQueries &&
            response.relatedQueries.length > 0
          "
          :style="componentStyles.suggestionsContainer"
        >
          <button
            v-for="(rq, i) in response.relatedQueries"
            :key="i"
            type="button"
            :style="componentStyles.suggestionChip"
            @click="handleExampleClick(rq)"
          >
            {{ rq }}
          </button>
        </div>
      </div>

      <!-- Examples (shown when no response) -->
      <div v-if="!response" :style="componentStyles.examplesContainer">
        <div :style="componentStyles.examplesLabel">
          {{ detectedLanguage === 'ru' ? 'Примеры запросов' : 'Example queries' }}
        </div>
        <div :style="componentStyles.suggestionsContainer">
          <button
            v-for="(ex, i) in examples.slice(0, 4)"
            :key="i"
            type="button"
            :style="componentStyles.suggestionChip"
            @click="handleExampleClick(ex)"
          >
            {{ ex }}
          </button>
        </div>
      </div>

      <!-- History -->
      <div v-if="history.length > 0" :style="componentStyles.historyContainer">
        <div :style="componentStyles.historyHeader">
          <span :style="componentStyles.historyLabel">
            {{ detectedLanguage === 'ru' ? 'История' : 'History' }}
          </span>
          <button type="button" :style="componentStyles.clearButton" @click="handleClearHistory">
            {{ detectedLanguage === 'ru' ? 'Очистить' : 'Clear' }}
          </button>
        </div>
        <div
          v-for="entry in history.slice(0, 5)"
          :key="entry.id"
          :style="componentStyles.historyItem"
          role="button"
          tabindex="0"
          @click="handleHistoryClick(entry)"
        >
          <div :style="componentStyles.historyQuery">{{ entry.query }}</div>
          <div :style="componentStyles.historyMeta">
            <span>{{ entry.intent }}</span>
            <span>&bull;</span>
            <span>{{ entry.componentCount }} components</span>
          </div>
        </div>
      </div>

      <!-- Keyboard shortcut hint -->
      <div :style="componentStyles.shortcutHint">
        <span :style="componentStyles.kbd">Ctrl+Shift+Q</span>
        {{ ' ' }}
        {{ detectedLanguage === 'ru' ? 'открыть/закрыть панель' : 'toggle panel' }}
      </div>

      <!-- Custom children (slot replaces ReactNode children) -->
      <slot />
    </div>
  </div>
</template>
