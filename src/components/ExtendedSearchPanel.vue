/** * ExtendedSearchPanel Component (Vue 3 SFC) * * Provides an advanced search interface for
finding components * by description, functionality, and various filters. * * TASK 52: Extended
Component Search (Phase 8 - AI + Metadata) * TASK 66: Migrated from React to Vue 3.0 SFC (Phase 10 -
Vue.js 3.0 Migration) * * Features: * - Semantic search with autocomplete * - Functionality-based
search * - Filter by phase, status, tags * - Relevance ranking display * - Search result
highlighting */

<script setup lang="ts">
// === Imports ===
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useIsDevModeEnabled } from '../lib/devmode'
import type { QueryLanguage } from '../types/ai-query'
import { detectQueryLanguage } from '../types/ai-query'
import type { ComponentMeta } from '../types/component-meta'
import {
  ExtendedSearchEngine,
  type ExtendedSearchResult,
  type AutocompleteSuggestion,
  type SearchFilters,
  type SearchOptions,
  DEFAULT_SEARCH_OPTIONS,
} from '../lib/extended-search'

// === Types ===

/**
 * Panel settings that can be persisted
 */
export interface SearchPanelSettings {
  /** Whether to show autocomplete suggestions */
  showAutocomplete: boolean
  /** Whether to show relevance scores */
  showScores: boolean
  /** Whether to show highlights */
  showHighlights: boolean
  /** Maximum results to display */
  maxDisplayResults: number
  /** Preferred language */
  preferredLanguage: QueryLanguage
}

// === Module-level constants ===

/**
 * Default panel settings
 */
const DEFAULT_PANEL_SETTINGS: SearchPanelSettings = {
  showAutocomplete: true,
  showScores: true,
  showHighlights: true,
  maxDisplayResults: 10,
  preferredLanguage: 'ru',
}

/**
 * LocalStorage key for panel settings
 */
const SETTINGS_STORAGE_KEY = 'isocubic_extended_search_settings'

/**
 * Position styles for the panel
 */
const positionStyles: Record<string, Record<string, string>> = {
  'top-left': { top: '80px', left: '20px' },
  'top-right': { top: '80px', right: '20px' },
  'bottom-left': { bottom: '20px', left: '20px' },
  'bottom-right': { bottom: '20px', right: '20px' },
}

/**
 * Status colors for badges
 */
const STATUS_COLORS: Record<ComponentMeta['status'], string> = {
  stable: '#22c55e',
  beta: '#f59e0b',
  experimental: '#8b5cf6',
  deprecated: '#ef4444',
}

// === Module-level helper functions ===

/**
 * Get score color based on value
 */
function getScoreColor(score: number): string {
  if (score >= 0.8) return '#22c55e'
  if (score >= 0.5) return '#f59e0b'
  return '#ef4444'
}

/**
 * Highlight matched terms in text
 */
function highlightMatches(text: string, matches: string[]): string {
  if (matches.length === 0) return text

  let result = text
  for (const match of matches) {
    const regex = new RegExp(`(${match})`, 'gi')
    result = result.replace(regex, '<mark>$1</mark>')
  }
  return result
}

/**
 * Loads panel settings from localStorage
 */
function loadSettings(): SearchPanelSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (stored) {
      return { ...DEFAULT_PANEL_SETTINGS, ...JSON.parse(stored) }
    }
  } catch (e) {
    console.warn('Failed to load search panel settings:', e)
  }
  return DEFAULT_PANEL_SETTINGS
}

/**
 * Saves panel settings to localStorage
 */
function saveSettings(settings: SearchPanelSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch (e) {
    console.warn('Failed to save search panel settings:', e)
  }
}

// === Styles ===

const styles = {
  container: {
    position: 'fixed',
    zIndex: 10001,
    backgroundColor: 'rgba(25, 25, 35, 0.98)',
    border: '1px solid rgba(100, 200, 150, 0.3)',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '13px',
    color: '#e5e7eb',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
    maxWidth: '500px',
    minWidth: '380px',
  },
  containerCollapsed: {
    maxHeight: '48px',
    overflow: 'hidden',
  },
  containerExpanded: {
    maxHeight: '85vh',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: 'rgba(50, 100, 80, 0.3)',
    borderBottom: '1px solid rgba(100, 200, 150, 0.2)',
    cursor: 'pointer',
    userSelect: 'none' as const,
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#86efac',
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
    maxHeight: 'calc(85vh - 48px)',
    overflowY: 'auto' as const,
  },
  searchContainer: {
    position: 'relative' as const,
    marginBottom: '12px',
  },
  inputWrapper: {
    display: 'flex',
    gap: '8px',
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    backgroundColor: 'rgba(40, 40, 60, 0.8)',
    border: '1px solid rgba(100, 200, 150, 0.3)',
    borderRadius: '8px',
    color: '#e5e7eb',
    fontSize: '13px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  inputFocused: {
    borderColor: 'rgba(100, 200, 150, 0.6)',
    boxShadow: '0 0 0 3px rgba(100, 200, 150, 0.1)',
  },
  searchButton: {
    padding: '10px 16px',
    backgroundColor: '#22c55e',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    whiteSpace: 'nowrap' as const,
  },
  searchButtonDisabled: {
    backgroundColor: '#4b5563',
    cursor: 'not-allowed',
  },
  autocompleteContainer: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '4px',
    backgroundColor: 'rgba(35, 35, 50, 0.98)',
    border: '1px solid rgba(100, 200, 150, 0.3)',
    borderRadius: '8px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
    maxHeight: '250px',
    overflowY: 'auto' as const,
    zIndex: 10002,
  },
  autocompleteItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
    borderBottom: '1px solid rgba(100, 200, 150, 0.1)',
  },
  autocompleteItemSelected: {
    backgroundColor: 'rgba(100, 200, 150, 0.2)',
  },
  autocompleteIcon: {
    fontSize: '14px',
    opacity: 0.7,
  },
  autocompleteText: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  autocompleteType: {
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: 'rgba(100, 200, 150, 0.2)',
    color: '#86efac',
  },
  filtersContainer: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
    marginBottom: '12px',
  },
  filterChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    backgroundColor: 'rgba(60, 60, 100, 0.5)',
    border: '1px solid rgba(100, 200, 150, 0.2)',
    borderRadius: '12px',
    fontSize: '11px',
    color: '#86efac',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  filterChipActive: {
    backgroundColor: 'rgba(100, 200, 150, 0.3)',
    borderColor: 'rgba(100, 200, 150, 0.5)',
  },
  resultsContainer: {
    marginTop: '12px',
  },
  resultsHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  resultsLabel: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    color: '#6b7280',
    letterSpacing: '0.5px',
  },
  resultCount: {
    fontSize: '11px',
    color: '#9ca3af',
  },
  resultCard: {
    padding: '12px',
    backgroundColor: 'rgba(40, 40, 60, 0.5)',
    borderRadius: '8px',
    marginBottom: '8px',
    border: '1px solid rgba(100, 200, 150, 0.15)',
    cursor: 'pointer',
    transition: 'background-color 0.2s, border-color 0.2s',
  },
  resultCardHover: {
    backgroundColor: 'rgba(50, 50, 80, 0.6)',
    borderColor: 'rgba(100, 200, 150, 0.3)',
  },
  resultHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '6px',
  },
  resultName: {
    fontWeight: 600,
    color: '#86efac',
    fontSize: '14px',
  },
  resultScore: {
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: 500,
  },
  resultSummary: {
    fontSize: '12px',
    color: '#9ca3af',
    marginBottom: '6px',
    lineHeight: 1.4,
  },
  resultMeta: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px',
    fontSize: '10px',
  },
  resultTag: {
    padding: '2px 6px',
    backgroundColor: 'rgba(100, 200, 150, 0.15)',
    borderRadius: '4px',
    color: '#86efac',
  },
  resultPhase: {
    padding: '2px 6px',
    backgroundColor: 'rgba(100, 100, 255, 0.15)',
    borderRadius: '4px',
    color: '#a5b4fc',
  },
  resultStatus: {
    padding: '2px 6px',
    borderRadius: '4px',
  },
  highlightContainer: {
    marginTop: '8px',
    padding: '8px',
    backgroundColor: 'rgba(30, 30, 45, 0.5)',
    borderRadius: '6px',
    fontSize: '11px',
    color: '#9ca3af',
  },
  highlightField: {
    fontSize: '10px',
    fontWeight: 600,
    color: '#6b7280',
    marginBottom: '4px',
    textTransform: 'uppercase' as const,
  },
  highlightText: {
    lineHeight: 1.4,
  },
  highlightMatch: {
    backgroundColor: 'rgba(100, 200, 150, 0.3)',
    color: '#86efac',
    padding: '0 2px',
    borderRadius: '2px',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '24px',
    color: '#6b7280',
  },
  shortcutHint: {
    fontSize: '10px',
    color: '#6b7280',
    marginTop: '12px',
    textAlign: 'center' as const,
  },
  kbd: {
    padding: '2px 6px',
    backgroundColor: 'rgba(100, 200, 150, 0.2)',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '10px',
  },
  functionalityHint: {
    fontSize: '11px',
    color: '#6b7280',
    marginTop: '8px',
    padding: '8px',
    backgroundColor: 'rgba(40, 40, 60, 0.3)',
    borderRadius: '6px',
    fontStyle: 'italic',
  },
} as const

// === Props ===

interface ExtendedSearchPanelProps {
  /** Whether the panel is initially expanded */
  initialExpanded?: boolean
  /** Custom styles for the panel container */
  style?: Record<string, string | number>
  /** Custom class name */
  className?: string
  /** Position of the panel */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  /** Search options overrides */
  searchOptions?: SearchOptions
  /** Callback when a component is selected */
  onComponentSelect?: (component: ComponentMeta) => void
  /** Callback when search is performed */
  onSearch?: (query: string, results: ExtendedSearchResult[]) => void
}

const props = withDefaults(defineProps<ExtendedSearchPanelProps>(), {
  initialExpanded: true,
  style: undefined,
  className: undefined,
  position: 'top-right',
  searchOptions: undefined,
  onComponentSelect: undefined,
  onSearch: undefined,
})

// === Emits ===

const emit = defineEmits<{
  (e: 'component-select', component: ComponentMeta): void
  (e: 'search', query: string, results: ExtendedSearchResult[]): void
}>()

// === DevMode ===

const isDevModeEnabled = useIsDevModeEnabled()

// === State ===

const isExpanded = ref(props.initialExpanded)
const query = ref('')
const results = ref<ExtendedSearchResult[]>([])
const suggestions = ref<AutocompleteSuggestion[]>([])
const showAutocomplete = ref(false)
const selectedSuggestionIndex = ref(-1)
const isSearching = ref(false)
const isInputFocused = ref(false)
const hoveredResultIndex = ref(-1)
const settings = ref<SearchPanelSettings>(loadSettings())
const activeFilters = ref<SearchFilters>({})

// === Template refs ===

const inputRef = ref<HTMLInputElement | null>(null)
const panelRef = ref<HTMLDivElement | null>(null)
const autocompleteRef = ref<HTMLDivElement | null>(null)

// === Computed ===

const searchEngine = computed(
  () => new ExtendedSearchEngine(props.searchOptions || DEFAULT_SEARCH_OPTIONS)
)

const detectedLanguage = computed<QueryLanguage>(() =>
  query.value ? detectQueryLanguage(query.value) : settings.value.preferredLanguage
)

const hasActiveFilters = computed(
  () =>
    (activeFilters.value.phases && activeFilters.value.phases.length > 0) ||
    (activeFilters.value.status && activeFilters.value.status.length > 0)
)

const containerStyle = computed(() => ({
  ...styles.container,
  ...(isExpanded.value ? styles.containerExpanded : styles.containerCollapsed),
  ...positionStyles[props.position],
  ...(props.style || {}),
}))

const inputStyle = computed(() => ({
  ...styles.input,
  ...(isInputFocused.value ? styles.inputFocused : {}),
}))

const searchButtonStyle = computed(() => ({
  ...styles.searchButton,
  ...(!query.value.trim() || isSearching.value ? styles.searchButtonDisabled : {}),
}))

const phases = [1, 2, 3, 4, 5, 6, 7, 8]
const statuses = ['stable', 'beta', 'experimental'] as const

// === Functions ===

function handleInputChange(newQuery: string) {
  query.value = newQuery
  if (settings.value.showAutocomplete && newQuery.trim().length > 0) {
    const newSuggestions = searchEngine.value.getAutocompleteSuggestions(newQuery, 8)
    suggestions.value = newSuggestions
    showAutocomplete.value = newSuggestions.length > 0
    selectedSuggestionIndex.value = -1
  } else {
    suggestions.value = []
    showAutocomplete.value = false
  }
}

function handleSearch(searchQuery: string = query.value) {
  if (!searchQuery.trim()) {
    results.value = []
    return
  }

  isSearching.value = true
  showAutocomplete.value = false

  const isFunctionalitySearch =
    searchQuery.toLowerCase().includes('\u0434\u043b\u044f') ||
    searchQuery.toLowerCase().includes('for') ||
    searchQuery.toLowerCase().includes('\u043d\u0430\u0439\u0434\u0438') ||
    searchQuery.toLowerCase().includes('find')

  setTimeout(() => {
    let searchResults: ExtendedSearchResult[]

    if (isFunctionalitySearch) {
      searchResults = searchEngine.value.searchByFunctionality(searchQuery, activeFilters.value, {
        maxResults: settings.value.maxDisplayResults,
      })
    } else {
      searchResults = searchEngine.value.search(searchQuery, activeFilters.value, {
        maxResults: settings.value.maxDisplayResults,
      })
    }

    results.value = searchResults
    isSearching.value = false
    props.onSearch?.(searchQuery, searchResults)
    emit('search', searchQuery, searchResults)
  }, 50)
}

function handleSubmit(e?: Event) {
  e?.preventDefault()
  handleSearch()
}

function handleSuggestionSelect(suggestion: AutocompleteSuggestion) {
  if (suggestion.type === 'component' && suggestion.component) {
    query.value = suggestion.component.name
    handleSearch(suggestion.component.name)
    props.onComponentSelect?.(suggestion.component)
    emit('component-select', suggestion.component)
  } else if (suggestion.type === 'filter' && suggestion.filter) {
    activeFilters.value = { ...activeFilters.value, ...suggestion.filter }
  } else {
    const newQuery = suggestion.text.startsWith('#')
      ? query.value.trim() + ' ' + suggestion.text
      : suggestion.text
    query.value = newQuery
    handleSearch(newQuery)
  }
  showAutocomplete.value = false
}

function handleKeyDown(e: KeyboardEvent) {
  if (!showAutocomplete.value || suggestions.value.length === 0) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
    return
  }

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      selectedSuggestionIndex.value =
        selectedSuggestionIndex.value < suggestions.value.length - 1
          ? selectedSuggestionIndex.value + 1
          : 0
      break
    case 'ArrowUp':
      e.preventDefault()
      selectedSuggestionIndex.value =
        selectedSuggestionIndex.value > 0
          ? selectedSuggestionIndex.value - 1
          : suggestions.value.length - 1
      break
    case 'Enter':
      e.preventDefault()
      if (selectedSuggestionIndex.value >= 0) {
        handleSuggestionSelect(suggestions.value[selectedSuggestionIndex.value])
      } else {
        handleSearch()
      }
      break
    case 'Escape':
      showAutocomplete.value = false
      break
  }
}

function handleResultClick(result: ExtendedSearchResult) {
  props.onComponentSelect?.(result.component)
  emit('component-select', result.component)
}

function toggleFilter(filterType: 'phase' | 'status', value: number | string) {
  const prev = activeFilters.value
  if (filterType === 'phase') {
    const currentPhases = prev.phases || []
    const newPhases = currentPhases.includes(value as number)
      ? currentPhases.filter((p) => p !== value)
      : [...currentPhases, value as number]
    activeFilters.value = { ...prev, phases: newPhases.length > 0 ? newPhases : undefined }
  } else {
    const currentStatuses = prev.status || []
    const statusValue = value as ComponentMeta['status']
    const newStatuses = currentStatuses.includes(statusValue)
      ? currentStatuses.filter((s) => s !== statusValue)
      : [...currentStatuses, statusValue]
    activeFilters.value = { ...prev, status: newStatuses.length > 0 ? newStatuses : undefined }
  }
}

function clearFilters() {
  activeFilters.value = {}
}

function handleToggle() {
  isExpanded.value = !isExpanded.value
}

function getAutocompleteItemStyle(index: number) {
  return {
    ...styles.autocompleteItem,
    ...(index === selectedSuggestionIndex.value ? styles.autocompleteItemSelected : {}),
  }
}

function getResultCardStyle(index: number) {
  return {
    ...styles.resultCard,
    ...(hoveredResultIndex.value === index ? styles.resultCardHover : {}),
  }
}

function getScoreStyle(score: number) {
  return {
    ...styles.resultScore,
    backgroundColor: `${getScoreColor(score)}20`,
    color: getScoreColor(score),
  }
}

function getStatusStyle(status: ComponentMeta['status']) {
  return {
    ...styles.resultStatus,
    backgroundColor: `${STATUS_COLORS[status]}20`,
    color: STATUS_COLORS[status],
  }
}

function getFilterChipStyle(filterType: 'phase' | 'status', value: number | string) {
  const isActive =
    filterType === 'phase'
      ? activeFilters.value.phases?.includes(value as number)
      : activeFilters.value.status?.includes(value as ComponentMeta['status'])
  return {
    ...styles.filterChip,
    ...(isActive ? styles.filterChipActive : {}),
  }
}

function formatHighlightHtml(snippet: string, matches: string[]): string {
  return highlightMatches(snippet, matches)
    .replace(
      /<mark>/g,
      '<span style="background:rgba(100,200,150,0.3);color:#86efac;padding:0 2px;border-radius:2px">'
    )
    .replace(/<\/mark>/g, '</span>')
}

function getSuggestionIcon(type: string): string {
  if (type === 'component') return '\u{1F4E6}'
  if (type === 'tag') return '#'
  if (type === 'feature') return '\u2699'
  if (type === 'phrase') return '\u{1F4AC}'
  if (type === 'filter') return '\u{1F50D}'
  return ''
}

// === Lifecycle & Watchers ===

// Keyboard shortcut: Ctrl+Shift+F to toggle panel
function handleGlobalKeyDown(e: globalThis.KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
    e.preventDefault()
    isExpanded.value = !isExpanded.value
    if (isExpanded.value) {
      setTimeout(() => inputRef.value?.focus(), 100)
    }
  }
}

// Click outside handler for autocomplete
function handleClickOutside(e: MouseEvent) {
  if (
    autocompleteRef.value &&
    !autocompleteRef.value.contains(e.target as Node) &&
    inputRef.value &&
    !inputRef.value.contains(e.target as Node)
  ) {
    showAutocomplete.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeyDown)
  document.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeyDown)
  document.removeEventListener('mousedown', handleClickOutside)
})

// Auto-focus when expanded
watch(isExpanded, (newVal) => {
  if (newVal) {
    nextTick(() => inputRef.value?.focus())
  }
})

// Save settings when they change
watch(
  settings,
  (newSettings) => {
    saveSettings(newSettings)
  },
  { deep: true }
)
</script>

<template>
  <div
    v-if="isDevModeEnabled"
    ref="panelRef"
    :class="props.className"
    :style="containerStyle"
    data-testid="extended-search-panel"
  >
    <!-- Header -->
    <div :style="styles.header" role="button" tabindex="0" @click="handleToggle">
      <div :style="styles.headerTitle">
        <span :style="styles.headerIcon">&#x1F50D;</span>
        <span>{{
          detectedLanguage === 'ru'
            ? '\u0420\u0430\u0441\u0448\u0438\u0440\u0435\u043d\u043d\u044b\u0439 \u043f\u043e\u0438\u0441\u043a'
            : 'Extended Search'
        }}</span>
      </div>
      <button
        type="button"
        :style="styles.headerToggle"
        :aria-label="isExpanded ? 'Collapse' : 'Expand'"
      >
        {{ isExpanded ? '-' : '+' }}
      </button>
    </div>

    <!-- Content -->
    <div v-if="isExpanded" :style="styles.content">
      <!-- Search input with autocomplete -->
      <form :style="styles.searchContainer" @submit.prevent="handleSubmit">
        <div :style="styles.inputWrapper">
          <input
            ref="inputRef"
            type="text"
            :value="query"
            :placeholder="
              detectedLanguage === 'ru'
                ? '\u041f\u043e\u0438\u0441\u043a \u043a\u043e\u043c\u043f\u043e\u043d\u0435\u043d\u0442\u043e\u0432...'
                : 'Search components...'
            "
            :style="inputStyle"
            data-testid="search-input"
            @input="handleInputChange(($event.target as HTMLInputElement).value)"
            @keydown="handleKeyDown"
            @focus="isInputFocused = true"
            @blur="setTimeout(() => (isInputFocused = false), 150)"
          />
          <button
            type="submit"
            :disabled="!query.trim() || isSearching"
            :style="searchButtonStyle"
            data-testid="search-button"
          >
            {{
              isSearching
                ? detectedLanguage === 'ru'
                  ? '\u041f\u043e\u0438\u0441\u043a...'
                  : 'Searching...'
                : detectedLanguage === 'ru'
                  ? '\u041d\u0430\u0439\u0442\u0438'
                  : 'Search'
            }}
          </button>
        </div>

        <!-- Autocomplete dropdown -->
        <div
          v-if="showAutocomplete && suggestions.length > 0"
          ref="autocompleteRef"
          :style="styles.autocompleteContainer"
        >
          <div
            v-for="(suggestion, index) in suggestions"
            :key="`${suggestion.type}-${suggestion.text}`"
            :style="getAutocompleteItemStyle(index)"
            @click="handleSuggestionSelect(suggestion)"
            @mouseenter="selectedSuggestionIndex = index"
          >
            <span :style="styles.autocompleteIcon">{{ getSuggestionIcon(suggestion.type) }}</span>
            <span :style="styles.autocompleteText">
              {{ suggestion.text }}
              <span v-if="suggestion.description" :style="{ color: '#6b7280', marginLeft: '8px' }">
                {{ suggestion.description.substring(0, 40) }}...
              </span>
            </span>
            <span :style="styles.autocompleteType">{{ suggestion.type }}</span>
          </div>
        </div>
      </form>

      <!-- Filters -->
      <div :style="styles.filtersContainer">
        <!-- Phase filters -->
        <button
          v-for="phase in phases"
          :key="`phase-${phase}`"
          type="button"
          :style="getFilterChipStyle('phase', phase)"
          @click="toggleFilter('phase', phase)"
        >
          {{ detectedLanguage === 'ru' ? `\u0424\u0430\u0437\u0430 ${phase}` : `Phase ${phase}` }}
        </button>
        <!-- Status filters -->
        <button
          v-for="status in statuses"
          :key="`status-${status}`"
          type="button"
          :style="getFilterChipStyle('status', status)"
          @click="toggleFilter('status', status)"
        >
          {{ status }}
        </button>
        <!-- Clear filters -->
        <button
          v-if="hasActiveFilters"
          type="button"
          :style="{
            ...styles.filterChip,
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            borderColor: 'rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
          }"
          @click="clearFilters"
        >
          {{
            detectedLanguage === 'ru' ? '\u0421\u0431\u0440\u043e\u0441\u0438\u0442\u044c' : 'Clear'
          }}
        </button>
      </div>

      <!-- Functionality hint -->
      <div v-if="!results.length && !isSearching" :style="styles.functionalityHint">
        {{
          detectedLanguage === 'ru'
            ? '\u0421\u043e\u0432\u0435\u0442: \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0439\u0442\u0435 \u0444\u0440\u0430\u0437\u044b \u0442\u0438\u043f\u0430 "\u043d\u0430\u0439\u0434\u0438 \u043a\u043e\u043c\u043f\u043e\u043d\u0435\u043d\u0442 \u0434\u043b\u044f \u044d\u043a\u0441\u043f\u043e\u0440\u0442\u0430" \u0438\u043b\u0438 "\u043a\u043e\u043c\u043f\u043e\u043d\u0435\u043d\u0442 \u0434\u043b\u044f 3D \u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440\u0430"'
            : 'Tip: use phrases like "find component for export" or "component for 3D preview"'
        }}
      </div>

      <!-- Results -->
      <div v-if="results.length > 0" :style="styles.resultsContainer" data-testid="search-results">
        <div :style="styles.resultsHeader">
          <span :style="styles.resultsLabel">
            {{
              detectedLanguage === 'ru'
                ? '\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u044b'
                : 'Results'
            }}
          </span>
          <span :style="styles.resultCount">
            {{ results.length }}
            {{
              detectedLanguage === 'ru'
                ? '\u043a\u043e\u043c\u043f\u043e\u043d\u0435\u043d\u0442(\u043e\u0432)'
                : 'component(s)'
            }}
          </span>
        </div>

        <div
          v-for="(result, index) in results"
          :key="result.component.id"
          :style="getResultCardStyle(index)"
          :data-testid="`search-result-${result.component.id}`"
          @click="handleResultClick(result)"
          @mouseenter="hoveredResultIndex = index"
          @mouseleave="hoveredResultIndex = -1"
        >
          <div :style="styles.resultHeader">
            <span :style="styles.resultName">{{ result.component.name }}</span>
            <span v-if="settings.showScores" :style="getScoreStyle(result.score)">
              {{ Math.round(result.score * 100) }}%
            </span>
          </div>

          <div :style="styles.resultSummary">{{ result.component.summary }}</div>

          <div :style="styles.resultMeta">
            <span :style="styles.resultPhase">
              {{ detectedLanguage === 'ru' ? '\u0424\u0430\u0437\u0430' : 'Phase' }}
              {{ result.component.phase }}
            </span>
            <span :style="getStatusStyle(result.component.status)">
              {{ result.component.status }}
            </span>
            <span
              v-for="tag in result.component.tags.slice(0, 3)"
              :key="tag"
              :style="styles.resultTag"
            >
              #{{ tag }}
            </span>
          </div>

          <!-- Highlights -->
          <template v-if="settings.showHighlights && result.highlights.length > 0">
            <div
              v-for="(highlight, hIndex) in result.highlights.slice(0, 2)"
              :key="hIndex"
              :style="styles.highlightContainer"
            >
              <div :style="styles.highlightField">{{ highlight.field }}</div>
              <div
                :style="styles.highlightText"
                v-html="formatHighlightHtml(highlight.snippet, highlight.matches)"
              />
            </div>
          </template>

          <!-- Explanation -->
          <div
            v-if="result.explanation"
            :style="{
              ...styles.functionalityHint,
              marginTop: '8px',
              padding: '6px 8px',
            }"
          >
            {{ result.explanation }}
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="query.trim() && !isSearching && results.length === 0" :style="styles.emptyState">
        {{
          detectedLanguage === 'ru'
            ? '\u041a\u043e\u043c\u043f\u043e\u043d\u0435\u043d\u0442\u044b \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0434\u0440\u0443\u0433\u0438\u0435 \u043a\u043b\u044e\u0447\u0435\u0432\u044b\u0435 \u0441\u043b\u043e\u0432\u0430.'
            : 'No components found. Try different keywords.'
        }}
      </div>

      <!-- Keyboard shortcut hint -->
      <div :style="styles.shortcutHint">
        <span :style="styles.kbd">Ctrl+Shift+F</span>
        {{ ' ' }}
        {{
          detectedLanguage === 'ru'
            ? '\u043e\u0442\u043a\u0440\u044b\u0442\u044c/\u0437\u0430\u043a\u0440\u044b\u0442\u044c \u043f\u0430\u043d\u0435\u043b\u044c'
            : 'toggle panel'
        }}
      </div>

      <!-- Custom children (slot replaces ReactNode children) -->
      <slot />
    </div>
  </div>
</template>
