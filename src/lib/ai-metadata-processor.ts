/**
 * AI Metadata Processor Module
 *
 * This module processes component metadata and generates responses to natural
 * language queries in Developer Mode. It provides semantic search capabilities
 * and structured response generation.
 *
 * TASK 50: AI Metadata Processor (Phase 8 - AI + Metadata)
 *
 * Features:
 * - Indexing of all registered component metadata
 * - Natural language query parsing with intent extraction
 * - Semantic search across component metadata
 * - Structured response generation with confidence scoring
 * - Multi-language support (Russian/English)
 * - Caching for improved performance
 */

import type { AIQueryRequest, AIQueryResponse, QueryIntent, QueryLanguage } from '../types/ai-query'
import {
  detectQueryLanguage,
  classifyQueryIntent,
  createSuccessResponse,
  createErrorResponse,
} from '../types/ai-query'
import type { ComponentMeta } from '../types/component-meta'
import {
  getAllComponentMeta,
  searchComponentMeta,
  getComponentsByPhase,
  getComponentsByStatus,
} from '../types/component-meta'

/**
 * Metadata index entry for fast searching
 */
export interface MetadataIndexEntry {
  /** Component ID */
  id: string
  /** Normalized searchable tokens */
  tokens: string[]
  /** Component name normalized */
  nameLower: string
  /** Summary tokens */
  summaryTokens: string[]
  /** Description tokens */
  descriptionTokens: string[]
  /** Tag tokens */
  tagTokens: string[]
  /** TF-IDF weight for relevance scoring */
  weight: number
}

/**
 * Search result with relevance score
 */
export interface SearchResult {
  /** Matched component metadata */
  component: ComponentMeta
  /** Relevance score (0-1) */
  score: number
  /** Matched fields */
  matchedFields: ('name' | 'summary' | 'description' | 'tags')[]
}

/**
 * Query parsing result
 */
export interface ParsedQuery {
  /** Original query text */
  original: string
  /** Normalized query text */
  normalized: string
  /** Extracted keywords */
  keywords: string[]
  /** Detected intent */
  intent: QueryIntent
  /** Detected language */
  language: QueryLanguage
  /** Extracted component name if mentioned */
  componentName: string | null
  /** Extracted phase number if mentioned */
  phaseNumber: number | null
  /** Extracted status filter if mentioned */
  statusFilter: ComponentMeta['status'] | null
  /** Context component ID if provided */
  context: string | null
  /** Maximum results to return (optional, used internally) */
  maxResults?: number
}

/**
 * Processor configuration options
 */
export interface ProcessorConfig {
  /** Maximum results to return */
  maxResults: number
  /** Minimum relevance score threshold (0-1) */
  minRelevanceScore: number
  /** Enable caching */
  enableCache: boolean
  /** Cache TTL in milliseconds */
  cacheTTL: number
}

/**
 * Default processor configuration
 */
export const DEFAULT_PROCESSOR_CONFIG: ProcessorConfig = {
  maxResults: 10,
  minRelevanceScore: 0.1,
  enableCache: true,
  cacheTTL: 60000, // 1 minute
}

/**
 * Cache entry
 */
interface CacheEntry {
  response: AIQueryResponse
  timestamp: number
}

/**
 * Russian-to-English translation map for common component-related words
 */
const RUSSIAN_WORD_MAP: Record<string, string> = {
  // Component-related
  компонент: 'component',
  компоненты: 'component',
  компонента: 'component',
  компоненту: 'component',
  компонентом: 'component',
  модуль: 'module',
  файл: 'file',
  функция: 'function',
  класс: 'class',
  тип: 'type',
  // Status-related
  стабильный: 'stable',
  стабильные: 'stable',
  бета: 'beta',
  экспериментальный: 'experimental',
  экспериментальные: 'experimental',
  устаревший: 'deprecated',
  устаревшие: 'deprecated',
  // Phase-related
  фаза: 'phase',
  фазы: 'phase',
  этап: 'phase',
  // Action-related
  редактор: 'editor',
  редакторы: 'editor',
  панель: 'panel',
  панели: 'panel',
  превью: 'preview',
  просмотр: 'preview',
  галерея: 'gallery',
  экспорт: 'export',
  импорт: 'import',
  генератор: 'generator',
  генерация: 'generation',
  // Feature-related
  куб: 'cube',
  кубик: 'cube',
  кубики: 'cube',
  шейдер: 'shader',
  шейдеры: 'shader',
  визуализация: 'visualization',
  анимация: 'animation',
  // Technical
  зависимость: 'dependency',
  зависимости: 'dependency',
  тест: 'test',
  тесты: 'test',
  документация: 'documentation',
}

/**
 * Stopwords to filter out from queries
 */
const STOPWORDS: Set<string> = new Set([
  // English
  'the',
  'a',
  'an',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'must',
  'shall',
  'can',
  'need',
  'dare',
  'ought',
  'used',
  'to',
  'of',
  'in',
  'for',
  'on',
  'with',
  'at',
  'by',
  'from',
  'as',
  'into',
  'through',
  'during',
  'before',
  'after',
  'above',
  'below',
  'between',
  'and',
  'but',
  'or',
  'nor',
  'so',
  'yet',
  'both',
  'either',
  'neither',
  'not',
  'only',
  'same',
  'than',
  'too',
  'very',
  'just',
  'also',
  'now',
  'this',
  'that',
  'these',
  'those',
  'it',
  'its',
  'my',
  'your',
  'his',
  'her',
  'their',
  'our',
  'me',
  'you',
  'him',
  'them',
  'us',
  'who',
  'whom',
  'whose',
  'which',
  'what',
  'where',
  'when',
  'why',
  'how',
  // Russian
  'и',
  'в',
  'во',
  'не',
  'что',
  'он',
  'на',
  'я',
  'с',
  'со',
  'как',
  'а',
  'то',
  'все',
  'она',
  'так',
  'его',
  'но',
  'да',
  'ты',
  'к',
  'у',
  'же',
  'вы',
  'за',
  'бы',
  'по',
  'только',
  'её',
  'мне',
  'было',
  'вот',
  'от',
  'меня',
  'ещё',
  'нет',
  'о',
  'из',
  'ему',
  'теперь',
  'когда',
  'уже',
  'вам',
  'ли',
  'или',
  'ни',
  'быть',
  'был',
  'до',
  'если',
  'при',
  'для',
  'этот',
  'эта',
  'эти',
  'это',
  'та',
  'тот',
  'те',
  'мой',
  'моя',
  'мои',
  'моё',
  'твой',
  'твоя',
])

/**
 * AI Metadata Processor class
 */
export class AIMetadataProcessor {
  private config: ProcessorConfig
  private index: Map<string, MetadataIndexEntry> = new Map()
  private cache: Map<string, CacheEntry> = new Map()
  private lastIndexUpdate: number = 0

  constructor(config: Partial<ProcessorConfig> = {}) {
    this.config = { ...DEFAULT_PROCESSOR_CONFIG, ...config }
    this.buildIndex()
  }

  /**
   * Builds the metadata index for fast searching
   */
  buildIndex(): void {
    this.index.clear()
    const components = getAllComponentMeta()

    for (const component of components) {
      const entry = this.createIndexEntry(component)
      this.index.set(component.id, entry)
    }

    this.lastIndexUpdate = Date.now()
  }

  /**
   * Creates an index entry for a component
   */
  private createIndexEntry(component: ComponentMeta): MetadataIndexEntry {
    const nameLower = component.name.toLowerCase()
    const nameTokens = this.tokenize(component.name)
    const summaryTokens = this.tokenize(component.summary)
    const descriptionTokens = this.tokenize(component.description)
    const tagTokens = component.tags.flatMap((tag) => this.tokenize(tag))

    // Combine all tokens with deduplication
    const allTokens = new Set([...nameTokens, ...summaryTokens, ...descriptionTokens, ...tagTokens])

    // Calculate weight based on content richness
    const weight = Math.min(
      1.0,
      0.3 +
        component.features.length * 0.05 +
        component.dependencies.length * 0.03 +
        component.history.length * 0.02 +
        component.tags.length * 0.05
    )

    return {
      id: component.id,
      tokens: Array.from(allTokens),
      nameLower,
      summaryTokens,
      descriptionTokens,
      tagTokens,
      weight,
    }
  }

  /**
   * Tokenizes text into normalized searchable tokens
   */
  tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\wа-яёА-ЯЁ\s-]/g, ' ')
      .split(/[\s-]+/)
      .filter((token) => token.length > 1)
      .filter((token) => !STOPWORDS.has(token))
      .map((token) => RUSSIAN_WORD_MAP[token] || token)
  }

  /**
   * Parses a natural language query
   */
  parseQuery(query: string, context?: string): ParsedQuery {
    const normalized = query.trim().toLowerCase()
    const language = detectQueryLanguage(query)
    const intent = classifyQueryIntent(query, language)
    const keywords = this.tokenize(query)

    // Extract component name from query
    const componentName = this.extractComponentName(query)

    // Extract phase number
    const phaseNumber = this.extractPhaseNumber(query)

    // Extract status filter
    const statusFilter = this.extractStatusFilter(query, language)

    return {
      original: query,
      normalized,
      keywords,
      intent,
      language,
      componentName,
      phaseNumber,
      statusFilter,
      context: context || null,
    }
  }

  /**
   * Extracts a potential component name from query
   */
  private extractComponentName(query: string): string | null {
    // Look for PascalCase component names
    const pascalCaseMatch = query.match(
      /([A-Z][a-zA-Z]*(?:Editor|Panel|Preview|Gallery|Generator|Cube|Stack|Grid)?)/g
    )
    if (pascalCaseMatch && pascalCaseMatch.length > 0) {
      // Return the longest match (more specific)
      return pascalCaseMatch.sort((a, b) => b.length - a.length)[0]
    }
    return null
  }

  /**
   * Extracts phase number from query
   */
  private extractPhaseNumber(query: string): number | null {
    const match = query.match(/(?:phase|фаз[аеуыо]?)\s*(\d+)/i)
    if (match) {
      return parseInt(match[1], 10)
    }
    return null
  }

  /**
   * Extracts status filter from query
   */
  private extractStatusFilter(
    query: string,
    language: QueryLanguage
  ): ComponentMeta['status'] | null {
    const queryLower = query.toLowerCase()

    // Language-specific patterns (prioritize native language patterns)
    const statusPatterns: Record<QueryLanguage, Record<ComponentMeta['status'], string[]>> = {
      ru: {
        stable: ['стабильн', 'stable'],
        beta: ['бета', 'beta'],
        experimental: ['эксперимент', 'experimental'],
        deprecated: ['устарев', 'deprecated'],
      },
      en: {
        stable: ['stable', 'стабильн'],
        beta: ['beta', 'бета'],
        experimental: ['experimental', 'эксперимент'],
        deprecated: ['deprecated', 'устарев'],
      },
    }

    const patterns = statusPatterns[language]
    for (const [status, statusKeywords] of Object.entries(patterns)) {
      for (const pattern of statusKeywords) {
        if (queryLower.includes(pattern)) {
          return status as ComponentMeta['status']
        }
      }
    }

    return null
  }

  /**
   * Performs semantic search across metadata
   */
  search(parsedQuery: ParsedQuery): SearchResult[] {
    const results: SearchResult[] = []
    const components = getAllComponentMeta()

    // If specific component name was extracted, prioritize exact match
    if (parsedQuery.componentName) {
      const exactMatches = searchComponentMeta(parsedQuery.componentName)
      for (const component of exactMatches) {
        results.push({
          component,
          score: 1.0,
          matchedFields: ['name'],
        })
      }

      // If we found exact matches, return them directly
      if (results.length > 0) {
        return results.slice(0, this.config.maxResults)
      }
    }

    // Filter by phase if specified
    let candidateComponents = components
    if (parsedQuery.phaseNumber !== null) {
      candidateComponents = getComponentsByPhase(parsedQuery.phaseNumber)
    }

    // Filter by status if specified
    if (parsedQuery.statusFilter) {
      candidateComponents = candidateComponents.filter((c) => c.status === parsedQuery.statusFilter)
    }

    // Score each component
    for (const component of candidateComponents) {
      const indexEntry = this.index.get(component.id)
      if (!indexEntry) continue

      const result = this.scoreComponent(parsedQuery, component, indexEntry)
      if (result.score >= this.config.minRelevanceScore) {
        results.push(result)
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score)

    return results.slice(0, this.config.maxResults)
  }

  /**
   * Scores a component against a query
   */
  private scoreComponent(
    parsedQuery: ParsedQuery,
    component: ComponentMeta,
    indexEntry: MetadataIndexEntry
  ): SearchResult {
    let score = 0
    const matchedFields: SearchResult['matchedFields'] = []
    const keywords = parsedQuery.keywords

    // Name matching (highest weight)
    const nameScore = this.calculateFieldScore(keywords, [indexEntry.nameLower])
    if (nameScore > 0) {
      score += nameScore * 0.4
      matchedFields.push('name')
    }

    // Summary matching
    const summaryScore = this.calculateFieldScore(keywords, indexEntry.summaryTokens)
    if (summaryScore > 0) {
      score += summaryScore * 0.3
      matchedFields.push('summary')
    }

    // Description matching
    const descScore = this.calculateFieldScore(keywords, indexEntry.descriptionTokens)
    if (descScore > 0) {
      score += descScore * 0.2
      matchedFields.push('description')
    }

    // Tag matching
    const tagScore = this.calculateFieldScore(keywords, indexEntry.tagTokens)
    if (tagScore > 0) {
      score += tagScore * 0.1
      matchedFields.push('tags')
    }

    // Apply content richness weight
    score *= indexEntry.weight

    return {
      component,
      score: Math.min(1.0, score),
      matchedFields,
    }
  }

  /**
   * Calculates field matching score
   */
  private calculateFieldScore(queryTokens: string[], fieldTokens: string[]): number {
    if (queryTokens.length === 0 || fieldTokens.length === 0) {
      return 0
    }

    let matchCount = 0
    for (const queryToken of queryTokens) {
      for (const fieldToken of fieldTokens) {
        if (fieldToken.includes(queryToken) || queryToken.includes(fieldToken)) {
          matchCount++
          break
        }
      }
    }

    return matchCount / queryTokens.length
  }

  /**
   * Processes a query and generates a response
   */
  processQuery(request: AIQueryRequest): AIQueryResponse {
    const startTime = Date.now()
    const cacheKey = this.getCacheKey(request)

    // Check cache
    if (this.config.enableCache) {
      const cached = this.cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
        return {
          ...cached.response,
          processingTime: Date.now() - startTime,
        }
      }
    }

    try {
      // Parse the query
      const parsedQuery = this.parseQuery(request.query, request.context)

      // Generate response based on intent
      const response = this.generateResponse(parsedQuery, request)

      // Cache the response
      if (this.config.enableCache) {
        this.cache.set(cacheKey, { response, timestamp: Date.now() })
      }

      return {
        ...response,
        processingTime: Date.now() - startTime,
      }
    } catch (error) {
      return createErrorResponse(
        String(error instanceof Error ? error.message : error),
        request.query
      )
    }
  }

  /**
   * Generates a response based on parsed query and intent
   */
  private generateResponse(parsedQuery: ParsedQuery, request: AIQueryRequest): AIQueryResponse {
    const { intent, language } = parsedQuery
    // Use maxResults from request to potentially override config
    const effectiveMaxResults = request.maxResults || this.config.maxResults
    // Create a modified query with the effective max results for search operations
    const queryWithMaxResults = { ...parsedQuery, maxResults: effectiveMaxResults }

    switch (intent) {
      case 'describe':
        return this.handleDescribeIntent(queryWithMaxResults, language)
      case 'find':
        return this.handleFindIntent(queryWithMaxResults, language)
      case 'dependencies':
        return this.handleDependenciesIntent(queryWithMaxResults, language)
      case 'history':
        return this.handleHistoryIntent(queryWithMaxResults, language)
      case 'usage':
        return this.handleUsageIntent(queryWithMaxResults, language)
      case 'related':
        return this.handleRelatedIntent(queryWithMaxResults, language)
      case 'features':
        return this.handleFeaturesIntent(queryWithMaxResults, language)
      case 'status':
        return this.handleStatusIntent(queryWithMaxResults, language)
      default:
        return this.handleUnknownIntent(queryWithMaxResults, language)
    }
  }

  /**
   * Handles 'describe' intent
   */
  private handleDescribeIntent(parsedQuery: ParsedQuery, language: QueryLanguage): AIQueryResponse {
    const results = this.search(parsedQuery)

    if (results.length === 0) {
      return createSuccessResponse(
        language === 'ru'
          ? `Компонент не найден. Уточните название или используйте поиск.`
          : `Component not found. Specify the name or use search.`,
        [],
        'describe',
        language,
        0.4,
        {
          suggestions: this.getSuggestions(language),
        }
      )
    }

    const component = results[0].component
    const answer =
      language === 'ru'
        ? `**${component.name}** (v${component.version}) — ${component.summary}\n\n${component.description}`
        : `**${component.name}** (v${component.version}) — ${component.summary}\n\n${component.description}`

    return createSuccessResponse(answer, [component], 'describe', language, results[0].score, {
      relatedQueries: this.getRelatedQueries(component, 'describe', language),
    })
  }

  /**
   * Handles 'find' intent
   */
  private handleFindIntent(parsedQuery: ParsedQuery, language: QueryLanguage): AIQueryResponse {
    const results = this.search(parsedQuery)

    if (results.length === 0) {
      return createSuccessResponse(
        language === 'ru'
          ? `Компоненты не найдены. Попробуйте другие ключевые слова.`
          : `No components found. Try different keywords.`,
        [],
        'find',
        language,
        0.3,
        {
          suggestions: this.getSuggestions(language),
        }
      )
    }

    const components = results.map((r) => r.component)
    const names = components.map((c) => c.name).join(', ')
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length

    const answer =
      language === 'ru'
        ? `Найдено ${results.length} компонент(ов): ${names}`
        : `Found ${results.length} component(s): ${names}`

    return createSuccessResponse(answer, components, 'find', language, avgScore)
  }

  /**
   * Handles 'dependencies' intent
   */
  private handleDependenciesIntent(
    parsedQuery: ParsedQuery,
    language: QueryLanguage
  ): AIQueryResponse {
    const results = this.search(parsedQuery)

    if (results.length === 0) {
      return createSuccessResponse(
        language === 'ru'
          ? `Укажите название компонента для просмотра зависимостей.`
          : `Specify a component name to view dependencies.`,
        [],
        'dependencies',
        language,
        0.4
      )
    }

    const component = results[0].component
    if (component.dependencies.length === 0) {
      return createSuccessResponse(
        language === 'ru'
          ? `Компонент ${component.name} не имеет зарегистрированных зависимостей.`
          : `Component ${component.name} has no registered dependencies.`,
        [component],
        'dependencies',
        language,
        0.7
      )
    }

    const deps = component.dependencies
      .map((d) => `- ${d.name} (${d.type}): ${d.purpose}`)
      .join('\n')

    const answer =
      language === 'ru'
        ? `**Зависимости ${component.name}:**\n\n${deps}`
        : `**Dependencies of ${component.name}:**\n\n${deps}`

    return createSuccessResponse(answer, [component], 'dependencies', language, results[0].score)
  }

  /**
   * Handles 'history' intent
   */
  private handleHistoryIntent(parsedQuery: ParsedQuery, language: QueryLanguage): AIQueryResponse {
    const results = this.search(parsedQuery)

    if (results.length === 0) {
      return createSuccessResponse(
        language === 'ru'
          ? `Укажите название компонента для просмотра истории.`
          : `Specify a component name to view history.`,
        [],
        'history',
        language,
        0.4
      )
    }

    const component = results[0].component
    if (component.history.length === 0) {
      return createSuccessResponse(
        language === 'ru'
          ? `История изменений ${component.name} недоступна.`
          : `Change history for ${component.name} is not available.`,
        [component],
        'history',
        language,
        0.6
      )
    }

    const history = component.history
      .slice(0, 5)
      .map((h) => `- v${h.version} (${h.date.split('T')[0]}): ${h.description}`)
      .join('\n')

    const answer =
      language === 'ru'
        ? `**История изменений ${component.name}:**\n\n${history}`
        : `**Change history of ${component.name}:**\n\n${history}`

    return createSuccessResponse(answer, [component], 'history', language, results[0].score)
  }

  /**
   * Handles 'usage' intent
   */
  private handleUsageIntent(parsedQuery: ParsedQuery, language: QueryLanguage): AIQueryResponse {
    const results = this.search(parsedQuery)

    if (results.length === 0) {
      return createSuccessResponse(
        language === 'ru'
          ? `Укажите название компонента для получения информации об использовании.`
          : `Specify a component name to get usage information.`,
        [],
        'usage',
        language,
        0.4
      )
    }

    const component = results[0].component
    const tips = component.tips?.length
      ? component.tips.map((t) => `- ${t}`).join('\n')
      : language === 'ru'
        ? 'Нет доступных подсказок.'
        : 'No tips available.'

    const answer =
      language === 'ru'
        ? `**Использование ${component.name}:**\n\n${tips}\n\nФайл: \`${component.filePath}\``
        : `**Usage of ${component.name}:**\n\n${tips}\n\nFile: \`${component.filePath}\``

    return createSuccessResponse(answer, [component], 'usage', language, results[0].score)
  }

  /**
   * Handles 'related' intent
   */
  private handleRelatedIntent(parsedQuery: ParsedQuery, language: QueryLanguage): AIQueryResponse {
    const results = this.search(parsedQuery)

    if (results.length === 0) {
      return createSuccessResponse(
        language === 'ru'
          ? `Укажите название компонента для поиска связанных.`
          : `Specify a component name to find related ones.`,
        [],
        'related',
        language,
        0.4
      )
    }

    const component = results[0].component
    const allComponents = getAllComponentMeta()

    // Find related components by phase or tags
    const related = allComponents
      .filter(
        (c) =>
          c.id !== component.id &&
          (c.phase === component.phase || c.tags.some((t) => component.tags.includes(t)))
      )
      .slice(0, 5)

    if (related.length === 0) {
      return createSuccessResponse(
        language === 'ru'
          ? `Связанные компоненты для ${component.name} не найдены.`
          : `No related components found for ${component.name}.`,
        [component],
        'related',
        language,
        0.5
      )
    }

    const names = related.map((c) => c.name).join(', ')
    const answer =
      language === 'ru'
        ? `**Связанные с ${component.name}:**\n\n${names}`
        : `**Related to ${component.name}:**\n\n${names}`

    return createSuccessResponse(answer, related, 'related', language, 0.75)
  }

  /**
   * Handles 'features' intent
   */
  private handleFeaturesIntent(parsedQuery: ParsedQuery, language: QueryLanguage): AIQueryResponse {
    const results = this.search(parsedQuery)

    if (results.length === 0) {
      return createSuccessResponse(
        language === 'ru'
          ? `Укажите название компонента для просмотра функций.`
          : `Specify a component name to view features.`,
        [],
        'features',
        language,
        0.4
      )
    }

    const component = results[0].component
    if (component.features.length === 0) {
      return createSuccessResponse(
        language === 'ru'
          ? `Список функций ${component.name} не определён.`
          : `Feature list for ${component.name} is not defined.`,
        [component],
        'features',
        language,
        0.6
      )
    }

    const features = component.features
      .map((f) => `- ${f.enabled ? '[+]' : '[-]'} ${f.name}: ${f.description}`)
      .join('\n')

    const answer =
      language === 'ru'
        ? `**Функции ${component.name}:**\n\n${features}`
        : `**Features of ${component.name}:**\n\n${features}`

    return createSuccessResponse(answer, [component], 'features', language, results[0].score)
  }

  /**
   * Handles 'status' intent
   */
  private handleStatusIntent(parsedQuery: ParsedQuery, language: QueryLanguage): AIQueryResponse {
    // If specific component is requested
    if (parsedQuery.componentName) {
      const results = this.search(parsedQuery)

      if (results.length > 0) {
        const component = results[0].component
        const statusLabels = {
          stable: language === 'ru' ? 'Стабильный' : 'Stable',
          beta: 'Beta',
          experimental: language === 'ru' ? 'Экспериментальный' : 'Experimental',
          deprecated: language === 'ru' ? 'Устаревший' : 'Deprecated',
        }

        let answer =
          language === 'ru'
            ? `**${component.name}**: ${statusLabels[component.status]} (v${component.version}, Фаза ${component.phase})`
            : `**${component.name}**: ${statusLabels[component.status]} (v${component.version}, Phase ${component.phase})`

        if (component.knownIssues && component.knownIssues.length > 0) {
          const issues = component.knownIssues.map((i) => `- ${i}`).join('\n')
          answer += `\n\n${language === 'ru' ? 'Известные проблемы' : 'Known issues'}:\n${issues}`
        }

        return createSuccessResponse(answer, [component], 'status', language, results[0].score)
      }
    }

    // Show general status summary
    const stable = getComponentsByStatus('stable').length
    const beta = getComponentsByStatus('beta').length
    const experimental = getComponentsByStatus('experimental').length
    const deprecated = getComponentsByStatus('deprecated').length

    const answer =
      language === 'ru'
        ? `**Статус компонентов:**\n\n- Стабильные: ${stable}\n- Beta: ${beta}\n- Экспериментальные: ${experimental}\n- Устаревшие: ${deprecated}`
        : `**Component status:**\n\n- Stable: ${stable}\n- Beta: ${beta}\n- Experimental: ${experimental}\n- Deprecated: ${deprecated}`

    return createSuccessResponse(answer, [], 'status', language, 0.85)
  }

  /**
   * Handles unknown intent
   */
  private handleUnknownIntent(parsedQuery: ParsedQuery, language: QueryLanguage): AIQueryResponse {
    // Try generic search
    const results = this.search(parsedQuery)

    if (results.length > 0) {
      const components = results.map((r) => r.component)
      const names = components.map((c) => c.name).join(', ')
      const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length

      const answer =
        language === 'ru' ? `Возможно, вы ищете: ${names}` : `Perhaps you're looking for: ${names}`

      return createSuccessResponse(
        answer,
        components,
        'unknown',
        language,
        avgScore * 0.8, // Lower confidence for unknown intent
        {
          suggestions: this.getSuggestions(language),
        }
      )
    }

    return createSuccessResponse(
      language === 'ru'
        ? 'Не удалось понять запрос. Попробуйте переформулировать или используйте один из примеров.'
        : 'Could not understand the query. Try rephrasing or use one of the examples.',
      [],
      'unknown',
      language,
      0.2,
      {
        suggestions: this.getSuggestions(language),
      }
    )
  }

  /**
   * Gets search suggestions based on language
   */
  private getSuggestions(language: QueryLanguage): string[] {
    const allComponents = getAllComponentMeta()
    const names = allComponents.slice(0, 5).map((c) => c.name)

    if (language === 'ru') {
      return [...names, 'Покажи все компоненты', 'Найди компоненты фазы 1']
    }

    return [...names, 'Show all components', 'Find phase 1 components']
  }

  /**
   * Gets related queries for a component
   */
  private getRelatedQueries(
    component: ComponentMeta,
    currentIntent: QueryIntent,
    language: QueryLanguage
  ): string[] {
    const queries: string[] = []

    if (currentIntent !== 'dependencies') {
      queries.push(
        language === 'ru'
          ? `Какие зависимости у ${component.name}?`
          : `What are the dependencies of ${component.name}?`
      )
    }

    if (currentIntent !== 'usage') {
      queries.push(
        language === 'ru' ? `Как использовать ${component.name}?` : `How to use ${component.name}?`
      )
    }

    if (currentIntent !== 'history') {
      queries.push(
        language === 'ru'
          ? `История изменений ${component.name}`
          : `Change history of ${component.name}`
      )
    }

    return queries.slice(0, 3)
  }

  /**
   * Generates cache key from request
   */
  private getCacheKey(request: AIQueryRequest): string {
    return `${request.query.toLowerCase().trim()}|${request.context || ''}|${request.language || ''}`
  }

  /**
   * Clears the response cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Refreshes the metadata index
   */
  refreshIndex(): void {
    this.buildIndex()
    this.clearCache()
  }

  /**
   * Gets the number of indexed components
   */
  getIndexSize(): number {
    return this.index.size
  }

  /**
   * Gets the index last update timestamp
   */
  getLastIndexUpdate(): number {
    return this.lastIndexUpdate
  }
}

// Default processor instance
let defaultProcessor: AIMetadataProcessor | null = null

/**
 * Gets or creates the default processor instance
 */
export function getDefaultProcessor(): AIMetadataProcessor {
  if (!defaultProcessor) {
    defaultProcessor = new AIMetadataProcessor()
  }
  return defaultProcessor
}

/**
 * Processes a query using the default processor
 */
export function processMetadataQuery(request: AIQueryRequest): AIQueryResponse {
  return getDefaultProcessor().processQuery(request)
}

/**
 * Parses a query using the default processor
 */
export function parseMetadataQuery(query: string, context?: string): ParsedQuery {
  return getDefaultProcessor().parseQuery(query, context)
}

/**
 * Searches metadata using the default processor
 */
export function searchMetadata(query: string): SearchResult[] {
  const processor = getDefaultProcessor()
  const parsed = processor.parseQuery(query)
  return processor.search(parsed)
}

/**
 * Refreshes the default processor's index
 */
export function refreshMetadataIndex(): void {
  getDefaultProcessor().refreshIndex()
}
