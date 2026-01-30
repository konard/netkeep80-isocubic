/**
 * AI Query Types for DevMode
 *
 * Types for the AI query interface in Developer Mode.
 * Supports natural language queries about components and metadata.
 *
 * TASK 49: AI Query Interface (Phase 8 - AI + Metadata)
 *
 * Features:
 * - Natural language query requests
 * - Structured responses with metadata
 * - Query intent classification
 * - Multi-language support (Russian/English)
 */

import type { ComponentMeta } from './component-meta'

/**
 * Supported query languages
 */
export type QueryLanguage = 'ru' | 'en'

/**
 * Query intent types for classification
 */
export type QueryIntent =
  | 'describe' // Describe a component
  | 'find' // Find components by criteria
  | 'dependencies' // Show dependencies
  | 'history' // Show change history
  | 'usage' // How to use a component
  | 'related' // Related components
  | 'features' // Component features
  | 'status' // Component status
  | 'unknown' // Cannot determine intent

/**
 * AI query request interface
 */
export interface AIQueryRequest {
  /** The natural language query text */
  query: string
  /** Optional context - ID of the currently selected component */
  context?: string
  /** Query language (auto-detected if not specified) */
  language?: QueryLanguage
  /** Pre-classified intent (optional, for optimization) */
  intent?: QueryIntent
  /** Maximum number of results to return */
  maxResults?: number
}

/**
 * AI query response interface
 */
export interface AIQueryResponse {
  /** Whether the query was processed successfully */
  success: boolean
  /** The generated answer text */
  answer: string
  /** Components found/referenced in the response */
  components?: ComponentMeta[]
  /** Suggestions for refining the query */
  suggestions?: string[]
  /** Related queries the user might want to ask */
  relatedQueries?: string[]
  /** Confidence score (0-1) for the response */
  confidence: number
  /** Detected query intent */
  intent: QueryIntent
  /** Detected query language */
  language: QueryLanguage
  /** Processing time in milliseconds */
  processingTime?: number
  /** Error message if success is false */
  error?: string
}

/**
 * Query history entry for session persistence
 */
export interface QueryHistoryEntry {
  /** Unique entry ID */
  id: string
  /** Original query text */
  query: string
  /** Response summary */
  answer: string
  /** Number of components found */
  componentCount: number
  /** Detected intent */
  intent: QueryIntent
  /** Timestamp when query was made */
  timestamp: string
  /** Whether this was a successful query */
  success: boolean
}

/**
 * Query panel settings
 */
export interface QueryPanelSettings {
  /** Maximum history entries to keep */
  maxHistoryEntries: number
  /** Whether to show suggestions */
  showSuggestions: boolean
  /** Whether to show related queries */
  showRelatedQueries: boolean
  /** Whether to auto-focus input when panel opens */
  autoFocus: boolean
  /** Preferred language for responses */
  preferredLanguage: QueryLanguage
  /** Whether to persist history across sessions */
  persistHistory: boolean
}

/**
 * Default query panel settings
 */
export const DEFAULT_QUERY_PANEL_SETTINGS: QueryPanelSettings = {
  maxHistoryEntries: 50,
  showSuggestions: true,
  showRelatedQueries: true,
  autoFocus: true,
  preferredLanguage: 'ru',
  persistHistory: true,
}

/**
 * Query processing status for UI feedback
 */
export type QueryProcessingStatus = 'idle' | 'processing' | 'success' | 'error'

/**
 * Intent patterns for basic classification
 */
export interface IntentPattern {
  /** Intent type */
  intent: QueryIntent
  /** Patterns to match (regex patterns as strings) */
  patterns: string[]
  /** Keywords to look for */
  keywords: string[]
}

/**
 * Predefined intent patterns for Russian and English
 */
export const INTENT_PATTERNS: Record<QueryLanguage, IntentPattern[]> = {
  ru: [
    {
      intent: 'describe',
      patterns: ['^(что|какой|опиши|расскажи о|что такое)'],
      keywords: ['описание', 'компонент', 'делает', 'для чего'],
    },
    {
      intent: 'find',
      patterns: ['^(найди|покажи|где|какой|поиск)'],
      keywords: ['найти', 'искать', 'поиск', 'компоненты'],
    },
    {
      intent: 'dependencies',
      patterns: ['^(зависимости|от чего зависит|использует)'],
      keywords: ['зависимости', 'использует', 'требует', 'импорт'],
    },
    {
      intent: 'history',
      patterns: ['^(история|изменения|когда|версия)'],
      keywords: ['история', 'изменения', 'обновления', 'версия'],
    },
    {
      intent: 'usage',
      patterns: ['^(как|использовать|применить|пример)'],
      keywords: ['использовать', 'применять', 'пример', 'синтаксис'],
    },
    {
      intent: 'related',
      patterns: ['^(связанные|похожие|аналогичные)'],
      keywords: ['связанные', 'похожие', 'аналоги', 'альтернативы'],
    },
    {
      intent: 'features',
      patterns: ['^(функции|возможности|умеет|может)'],
      keywords: ['функции', 'возможности', 'фичи', 'умеет'],
    },
    {
      intent: 'status',
      patterns: ['^(статус|состояние|готов)'],
      keywords: ['статус', 'состояние', 'стабильность', 'фаза'],
    },
  ],
  en: [
    {
      intent: 'describe',
      patterns: ['^(what|describe|tell me about|explain)'],
      keywords: ['description', 'component', 'does', 'purpose'],
    },
    {
      intent: 'find',
      patterns: ['^(find|show|where|which|search)'],
      keywords: ['find', 'search', 'locate', 'components'],
    },
    {
      intent: 'dependencies',
      patterns: ['^(dependencies|depends on|uses|requires)'],
      keywords: ['dependencies', 'uses', 'requires', 'imports'],
    },
    {
      intent: 'history',
      patterns: ['^(history|changes|when|version)'],
      keywords: ['history', 'changes', 'updates', 'version'],
    },
    {
      intent: 'usage',
      patterns: ['^(how|use|apply|example)'],
      keywords: ['use', 'apply', 'example', 'syntax', 'how to'],
    },
    {
      intent: 'related',
      patterns: ['^(related|similar|analogous)'],
      keywords: ['related', 'similar', 'alternatives', 'analogous'],
    },
    {
      intent: 'features',
      patterns: ['^(features|capabilities|can|able)'],
      keywords: ['features', 'capabilities', 'functions', 'can do'],
    },
    {
      intent: 'status',
      patterns: ['^(status|state|ready|stability)'],
      keywords: ['status', 'state', 'stability', 'phase', 'ready'],
    },
  ],
}

/**
 * Example queries for user onboarding
 */
export const EXAMPLE_QUERIES: Record<QueryLanguage, string[]> = {
  ru: [
    'Что делает компонент Gallery?',
    'Найди компонент для экспорта',
    'Какие зависимости у UnifiedEditor?',
    'Как использовать CubePreview?',
    'Покажи историю изменений PromptGenerator',
  ],
  en: [
    'What does the Gallery component do?',
    'Find a component for export',
    'What are the dependencies of UnifiedEditor?',
    'How to use CubePreview?',
    'Show the change history of PromptGenerator',
  ],
}

/**
 * Detects the language of a query string
 * Uses simple heuristic based on character sets and common words
 */
export function detectQueryLanguage(query: string): QueryLanguage {
  const cyrillicPattern = /[\u0400-\u04FF]/
  if (cyrillicPattern.test(query)) {
    return 'ru'
  }
  return 'en'
}

/**
 * Classifies the intent of a query
 */
export function classifyQueryIntent(query: string, language?: QueryLanguage): QueryIntent {
  const detectedLanguage = language || detectQueryLanguage(query)
  const patterns = INTENT_PATTERNS[detectedLanguage]
  const lowerQuery = query.toLowerCase()

  for (const pattern of patterns) {
    // Check regex patterns
    for (const regexPattern of pattern.patterns) {
      const regex = new RegExp(regexPattern, 'i')
      if (regex.test(lowerQuery)) {
        return pattern.intent
      }
    }

    // Check keywords
    for (const keyword of pattern.keywords) {
      if (lowerQuery.includes(keyword.toLowerCase())) {
        return pattern.intent
      }
    }
  }

  return 'unknown'
}

/**
 * Creates a default AI query request
 */
export function createQueryRequest(
  query: string,
  context?: string,
  options?: Partial<AIQueryRequest>
): AIQueryRequest {
  const language = detectQueryLanguage(query)
  const intent = classifyQueryIntent(query, language)

  return {
    query,
    context,
    language,
    intent,
    maxResults: 10,
    ...options,
  }
}

/**
 * Creates an error response
 */
export function createErrorResponse(error: string, query: string): AIQueryResponse {
  return {
    success: false,
    answer: '',
    confidence: 0,
    intent: 'unknown',
    language: detectQueryLanguage(query),
    error,
  }
}

/**
 * Creates a successful response
 */
export function createSuccessResponse(
  answer: string,
  components: ComponentMeta[],
  intent: QueryIntent,
  language: QueryLanguage,
  confidence: number,
  options?: Partial<AIQueryResponse>
): AIQueryResponse {
  return {
    success: true,
    answer,
    components,
    confidence,
    intent,
    language,
    ...options,
  }
}

/**
 * Generates a unique ID for a history entry
 */
export function generateHistoryId(): string {
  return `query_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Creates a history entry from a query and response
 */
export function createHistoryEntry(query: string, response: AIQueryResponse): QueryHistoryEntry {
  return {
    id: generateHistoryId(),
    query,
    answer: response.answer,
    componentCount: response.components?.length || 0,
    intent: response.intent,
    timestamp: new Date().toISOString(),
    success: response.success,
  }
}

/**
 * Validates an AI query request
 */
export function validateQueryRequest(request: Partial<AIQueryRequest>): request is AIQueryRequest {
  return Boolean(
    request.query && typeof request.query === 'string' && request.query.trim().length > 0
  )
}
