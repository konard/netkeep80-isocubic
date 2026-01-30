/**
 * ExtendedSearchPanel Component
 *
 * Provides an advanced search interface for finding components
 * by description, functionality, and various filters.
 *
 * TASK 52: Extended Component Search (Phase 8 - AI + Metadata)
 *
 * Features:
 * - Semantic search with autocomplete
 * - Functionality-based search
 * - Filter by phase, status, tags
 * - Relevance ranking display
 * - Search result highlighting
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

/**
 * Props for ExtendedSearchPanel
 */
export interface ExtendedSearchPanelProps {
  /** Whether the panel is initially expanded */
  initialExpanded?: boolean
  /** Custom styles for the panel container */
  style?: CSSProperties
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
  /** Child components to render inside the panel */
  children?: ReactNode
}

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

/**
 * Default panel settings
 */
export const DEFAULT_PANEL_SETTINGS: SearchPanelSettings = {
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

/**
 * Styles for the component
 */
const styles: Record<string, CSSProperties> = {
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
    userSelect: 'none',
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
    overflowY: 'auto',
  },
  searchContainer: {
    position: 'relative',
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
    whiteSpace: 'nowrap',
  },
  searchButtonDisabled: {
    backgroundColor: '#4b5563',
    cursor: 'not-allowed',
  },
  autocompleteContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '4px',
    backgroundColor: 'rgba(35, 35, 50, 0.98)',
    border: '1px solid rgba(100, 200, 150, 0.3)',
    borderRadius: '8px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
    maxHeight: '250px',
    overflowY: 'auto',
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
    whiteSpace: 'nowrap',
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
    flexWrap: 'wrap',
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
    flexWrap: 'wrap',
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
 * Status colors for badges
 */
const STATUS_COLORS: Record<ComponentMeta['status'], string> = {
  stable: '#22c55e',
  beta: '#f59e0b',
  experimental: '#8b5cf6',
  deprecated: '#ef4444',
}

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
 * ExtendedSearchPanel Component
 */
export function ExtendedSearchPanel({
  initialExpanded = true,
  style,
  className,
  position = 'top-right',
  searchOptions,
  onComponentSelect,
  onSearch,
  children,
}: ExtendedSearchPanelProps) {
  const isDevModeEnabled = useIsDevModeEnabled()

  // State
  const [isExpanded, setIsExpanded] = useState(initialExpanded)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ExtendedSearchResult[]>([])
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([])
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const [isSearching, setIsSearching] = useState(false)
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [hoveredResultIndex, setHoveredResultIndex] = useState(-1)
  const [settings] = useState<SearchPanelSettings>(() => loadSettings())
  const [activeFilters, setActiveFilters] = useState<SearchFilters>({})

  // Refs
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const autocompleteRef = useRef<HTMLDivElement>(null)

  // Search engine instance
  const searchEngine = useMemo(
    () => new ExtendedSearchEngine(searchOptions || DEFAULT_SEARCH_OPTIONS),
    [searchOptions]
  )

  // Detected language
  const detectedLanguage: QueryLanguage = query
    ? detectQueryLanguage(query)
    : settings.preferredLanguage

  // Keyboard shortcut: Ctrl+Shift+F to toggle panel
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setIsExpanded((prev) => !prev)
        if (!isExpanded) {
          setTimeout(() => inputRef.current?.focus(), 100)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isExpanded])

  // Auto-focus when expanded
  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus()
    }
  }, [isExpanded])

  // Save settings when they change
  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  // Handle input change with autocomplete update
  const handleInputChange = useCallback(
    (newQuery: string) => {
      setQuery(newQuery)
      if (settings.showAutocomplete && newQuery.trim().length > 0) {
        const newSuggestions = searchEngine.getAutocompleteSuggestions(newQuery, 8)
        setSuggestions(newSuggestions)
        setShowAutocomplete(newSuggestions.length > 0)
        setSelectedSuggestionIndex(-1)
      } else {
        setSuggestions([])
        setShowAutocomplete(false)
      }
    },
    [settings.showAutocomplete, searchEngine]
  )

  // Close autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowAutocomplete(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Perform search
  const handleSearch = useCallback(
    (searchQuery: string = query) => {
      if (!searchQuery.trim()) {
        setResults([])
        return
      }

      setIsSearching(true)
      setShowAutocomplete(false)

      // Check if it's a functionality search
      const isFunctionalitySearch =
        searchQuery.toLowerCase().includes('для') ||
        searchQuery.toLowerCase().includes('for') ||
        searchQuery.toLowerCase().includes('найди') ||
        searchQuery.toLowerCase().includes('find')

      setTimeout(() => {
        let searchResults: ExtendedSearchResult[]

        if (isFunctionalitySearch) {
          searchResults = searchEngine.searchByFunctionality(searchQuery, activeFilters, {
            maxResults: settings.maxDisplayResults,
          })
        } else {
          searchResults = searchEngine.search(searchQuery, activeFilters, {
            maxResults: settings.maxDisplayResults,
          })
        }

        setResults(searchResults)
        setIsSearching(false)
        onSearch?.(searchQuery, searchResults)
      }, 50)
    },
    [query, activeFilters, settings.maxDisplayResults, searchEngine, onSearch]
  )

  // Handle form submit
  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault()
      handleSearch()
    },
    [handleSearch]
  )

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback(
    (suggestion: AutocompleteSuggestion) => {
      if (suggestion.type === 'component' && suggestion.component) {
        setQuery(suggestion.component.name)
        handleSearch(suggestion.component.name)
        onComponentSelect?.(suggestion.component)
      } else if (suggestion.type === 'filter' && suggestion.filter) {
        setActiveFilters((prev) => ({ ...prev, ...suggestion.filter }))
      } else {
        const newQuery = suggestion.text.startsWith('#')
          ? query.trim() + ' ' + suggestion.text
          : suggestion.text
        setQuery(newQuery)
        handleSearch(newQuery)
      }
      setShowAutocomplete(false)
    },
    [query, handleSearch, onComponentSelect]
  )

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!showAutocomplete || suggestions.length === 0) {
        if (e.key === 'Enter') {
          e.preventDefault()
          handleSearch()
        }
        return
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedSuggestionIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
          break
        case 'Enter':
          e.preventDefault()
          if (selectedSuggestionIndex >= 0) {
            handleSuggestionSelect(suggestions[selectedSuggestionIndex])
          } else {
            handleSearch()
          }
          break
        case 'Escape':
          setShowAutocomplete(false)
          break
      }
    },
    [showAutocomplete, suggestions, selectedSuggestionIndex, handleSearch, handleSuggestionSelect]
  )

  // Handle result click
  const handleResultClick = useCallback(
    (result: ExtendedSearchResult) => {
      onComponentSelect?.(result.component)
    },
    [onComponentSelect]
  )

  // Toggle filter
  const toggleFilter = useCallback((filterType: 'phase' | 'status', value: number | string) => {
    setActiveFilters((prev) => {
      if (filterType === 'phase') {
        const phases = prev.phases || []
        const newPhases = phases.includes(value as number)
          ? phases.filter((p) => p !== value)
          : [...phases, value as number]
        return { ...prev, phases: newPhases.length > 0 ? newPhases : undefined }
      } else {
        const statuses = prev.status || []
        const statusValue = value as ComponentMeta['status']
        const newStatuses = statuses.includes(statusValue)
          ? statuses.filter((s) => s !== statusValue)
          : [...statuses, statusValue]
        return { ...prev, status: newStatuses.length > 0 ? newStatuses : undefined }
      }
    })
  }, [])

  // Clear filters
  const clearFilters = useCallback(() => {
    setActiveFilters({})
  }, [])

  // Toggle panel
  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev)
  }, [])

  // Don't render if DevMode is not enabled
  if (!isDevModeEnabled) {
    return null
  }

  const hasActiveFilters =
    (activeFilters.phases && activeFilters.phases.length > 0) ||
    (activeFilters.status && activeFilters.status.length > 0)

  return (
    <div
      ref={panelRef}
      className={className}
      style={{
        ...styles.container,
        ...(isExpanded ? styles.containerExpanded : styles.containerCollapsed),
        ...positionStyles[position],
        ...style,
      }}
      data-testid="extended-search-panel"
    >
      {/* Header */}
      <div style={styles.header} onClick={handleToggle} role="button" tabIndex={0}>
        <div style={styles.headerTitle}>
          <span style={styles.headerIcon}>&#x1F50D;</span>
          <span>{detectedLanguage === 'ru' ? 'Расширенный поиск' : 'Extended Search'}</span>
        </div>
        <button
          type="button"
          style={styles.headerToggle}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? '-' : '+'}
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div style={styles.content}>
          {/* Search input with autocomplete */}
          <form onSubmit={handleSubmit} style={styles.searchContainer}>
            <div style={styles.inputWrapper}>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setTimeout(() => setIsInputFocused(false), 150)}
                placeholder={
                  detectedLanguage === 'ru' ? 'Поиск компонентов...' : 'Search components...'
                }
                style={{
                  ...styles.input,
                  ...(isInputFocused ? styles.inputFocused : {}),
                }}
                data-testid="search-input"
              />
              <button
                type="submit"
                disabled={!query.trim() || isSearching}
                style={{
                  ...styles.searchButton,
                  ...(!query.trim() || isSearching ? styles.searchButtonDisabled : {}),
                }}
                data-testid="search-button"
              >
                {isSearching
                  ? detectedLanguage === 'ru'
                    ? 'Поиск...'
                    : 'Searching...'
                  : detectedLanguage === 'ru'
                    ? 'Найти'
                    : 'Search'}
              </button>
            </div>

            {/* Autocomplete dropdown */}
            {showAutocomplete && suggestions.length > 0 && (
              <div ref={autocompleteRef} style={styles.autocompleteContainer}>
                {suggestions.map((suggestion, index) => (
                  <div
                    key={`${suggestion.type}-${suggestion.text}`}
                    style={{
                      ...styles.autocompleteItem,
                      ...(index === selectedSuggestionIndex ? styles.autocompleteItemSelected : {}),
                    }}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    onMouseEnter={() => setSelectedSuggestionIndex(index)}
                  >
                    <span style={styles.autocompleteIcon}>
                      {suggestion.type === 'component' && '&#x1F4E6;'}
                      {suggestion.type === 'tag' && '#'}
                      {suggestion.type === 'feature' && '&#x2699;'}
                      {suggestion.type === 'phrase' && '&#x1F4AC;'}
                      {suggestion.type === 'filter' && '&#x1F50D;'}
                    </span>
                    <span style={styles.autocompleteText}>
                      {suggestion.text}
                      {suggestion.description && (
                        <span style={{ color: '#6b7280', marginLeft: '8px' }}>
                          {suggestion.description.substring(0, 40)}...
                        </span>
                      )}
                    </span>
                    <span style={styles.autocompleteType}>{suggestion.type}</span>
                  </div>
                ))}
              </div>
            )}
          </form>

          {/* Filters */}
          <div style={styles.filtersContainer}>
            {/* Phase filters */}
            {[1, 2, 3, 4, 5, 6, 7, 8].map((phase) => (
              <button
                key={`phase-${phase}`}
                type="button"
                style={{
                  ...styles.filterChip,
                  ...(activeFilters.phases?.includes(phase) ? styles.filterChipActive : {}),
                }}
                onClick={() => toggleFilter('phase', phase)}
              >
                {detectedLanguage === 'ru' ? `Фаза ${phase}` : `Phase ${phase}`}
              </button>
            ))}
            {/* Status filters */}
            {(['stable', 'beta', 'experimental'] as const).map((status) => (
              <button
                key={`status-${status}`}
                type="button"
                style={{
                  ...styles.filterChip,
                  ...(activeFilters.status?.includes(status) ? styles.filterChipActive : {}),
                }}
                onClick={() => toggleFilter('status', status)}
              >
                {status}
              </button>
            ))}
            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                type="button"
                style={{
                  ...styles.filterChip,
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                }}
                onClick={clearFilters}
              >
                {detectedLanguage === 'ru' ? 'Сбросить' : 'Clear'}
              </button>
            )}
          </div>

          {/* Functionality hint */}
          {!results.length && !isSearching && (
            <div style={styles.functionalityHint}>
              {detectedLanguage === 'ru'
                ? 'Совет: используйте фразы типа "найди компонент для экспорта" или "компонент для 3D просмотра"'
                : 'Tip: use phrases like "find component for export" or "component for 3D preview"'}
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div style={styles.resultsContainer} data-testid="search-results">
              <div style={styles.resultsHeader}>
                <span style={styles.resultsLabel}>
                  {detectedLanguage === 'ru' ? 'Результаты' : 'Results'}
                </span>
                <span style={styles.resultCount}>
                  {results.length} {detectedLanguage === 'ru' ? 'компонент(ов)' : 'component(s)'}
                </span>
              </div>

              {results.map((result, index) => (
                <div
                  key={result.component.id}
                  style={{
                    ...styles.resultCard,
                    ...(hoveredResultIndex === index ? styles.resultCardHover : {}),
                  }}
                  onClick={() => handleResultClick(result)}
                  onMouseEnter={() => setHoveredResultIndex(index)}
                  onMouseLeave={() => setHoveredResultIndex(-1)}
                  data-testid={`search-result-${result.component.id}`}
                >
                  <div style={styles.resultHeader}>
                    <span style={styles.resultName}>{result.component.name}</span>
                    {settings.showScores && (
                      <span
                        style={{
                          ...styles.resultScore,
                          backgroundColor: `${getScoreColor(result.score)}20`,
                          color: getScoreColor(result.score),
                        }}
                      >
                        {Math.round(result.score * 100)}%
                      </span>
                    )}
                  </div>

                  <div style={styles.resultSummary}>{result.component.summary}</div>

                  <div style={styles.resultMeta}>
                    <span style={styles.resultPhase}>
                      {detectedLanguage === 'ru' ? 'Фаза' : 'Phase'} {result.component.phase}
                    </span>
                    <span
                      style={{
                        ...styles.resultStatus,
                        backgroundColor: `${STATUS_COLORS[result.component.status]}20`,
                        color: STATUS_COLORS[result.component.status],
                      }}
                    >
                      {result.component.status}
                    </span>
                    {result.component.tags.slice(0, 3).map((tag) => (
                      <span key={tag} style={styles.resultTag}>
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Highlights */}
                  {settings.showHighlights &&
                    result.highlights.length > 0 &&
                    result.highlights.slice(0, 2).map((highlight, hIndex) => (
                      <div key={hIndex} style={styles.highlightContainer}>
                        <div style={styles.highlightField}>{highlight.field}</div>
                        <div
                          style={styles.highlightText}
                          dangerouslySetInnerHTML={{
                            __html: highlightMatches(highlight.snippet, highlight.matches)
                              .replace(
                                /<mark>/g,
                                '<span style="background:rgba(100,200,150,0.3);color:#86efac;padding:0 2px;border-radius:2px">'
                              )
                              .replace(/<\/mark>/g, '</span>'),
                          }}
                        />
                      </div>
                    ))}

                  {/* Explanation */}
                  {result.explanation && (
                    <div
                      style={{
                        ...styles.functionalityHint,
                        marginTop: '8px',
                        padding: '6px 8px',
                      }}
                    >
                      {result.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {query.trim() && !isSearching && results.length === 0 && (
            <div style={styles.emptyState}>
              {detectedLanguage === 'ru'
                ? 'Компоненты не найдены. Попробуйте другие ключевые слова.'
                : 'No components found. Try different keywords.'}
            </div>
          )}

          {/* Keyboard shortcut hint */}
          <div style={styles.shortcutHint}>
            <span style={styles.kbd}>Ctrl+Shift+F</span>{' '}
            {detectedLanguage === 'ru' ? 'открыть/закрыть панель' : 'toggle panel'}
          </div>

          {/* Custom children */}
          {children}
        </div>
      )}
    </div>
  )
}

export default ExtendedSearchPanel
