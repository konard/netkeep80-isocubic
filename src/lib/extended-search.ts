/**
 * Extended Component Search Module
 *
 * Provides advanced search capabilities for finding components
 * by description, functionality, and various filters.
 *
 * TASK 52: Extended Component Search (Phase 8 - AI + Metadata)
 *
 * Features:
 * - Semantic search by component descriptions
 * - Search by functionality ("find component for...")
 * - Filtering by phases, status, tags
 * - Query autocomplete
 * - Relevance ranking for search results
 */

import type { ComponentMeta } from '../types/component-meta'
import { getAllComponentMeta } from '../types/component-meta'
import type { QueryLanguage } from '../types/ai-query'
import { detectQueryLanguage } from '../types/ai-query'

/**
 * Search filter options
 */
export interface SearchFilters {
  /** Filter by specific phases */
  phases?: number[]
  /** Filter by component status */
  status?: ComponentMeta['status'][]
  /** Filter by tags (OR logic) */
  tags?: string[]
  /** Filter by tags (AND logic - all tags must match) */
  requiredTags?: string[]
  /** Minimum version */
  minVersion?: string
  /** Text to exclude from results */
  excludeTerms?: string[]
}

/**
 * Search options for configuring search behavior
 */
export interface SearchOptions {
  /** Maximum number of results to return */
  maxResults?: number
  /** Minimum relevance score (0-1) */
  minScore?: number
  /** Whether to enable fuzzy matching */
  fuzzyMatch?: boolean
  /** Fuzzy match threshold (0-1, lower = more fuzzy) */
  fuzzyThreshold?: number
  /** Whether to boost exact matches */
  boostExactMatch?: boolean
  /** Fields to search in */
  searchFields?: ('name' | 'summary' | 'description' | 'tags' | 'features')[]
  /** Query language override */
  language?: QueryLanguage
}

/**
 * Extended search result with detailed scoring
 */
export interface ExtendedSearchResult {
  /** Matched component */
  component: ComponentMeta
  /** Overall relevance score (0-1) */
  score: number
  /** Individual field scores */
  fieldScores: {
    name: number
    summary: number
    description: number
    tags: number
    features: number
  }
  /** Fields that matched */
  matchedFields: string[]
  /** Matched keywords/terms */
  matchedTerms: string[]
  /** Highlighted snippets from matching content */
  highlights: {
    field: string
    snippet: string
    matches: string[]
  }[]
  /** Explanation of the score */
  explanation?: string
}

/**
 * Autocomplete suggestion
 */
export interface AutocompleteSuggestion {
  /** Suggestion text */
  text: string
  /** Type of suggestion */
  type: 'component' | 'tag' | 'feature' | 'phrase' | 'filter'
  /** Relevance score for ordering */
  score: number
  /** Optional description */
  description?: string
  /** If type is 'component', the component data */
  component?: ComponentMeta
  /** If type is 'filter', the filter to apply */
  filter?: Partial<SearchFilters>
}

/**
 * Functionality search pattern
 */
export interface FunctionalityPattern {
  /** Keywords that trigger this pattern */
  keywords: string[]
  /** Tags to search for */
  searchTags: string[]
  /** Additional search terms */
  searchTerms: string[]
  /** Description of what this functionality does */
  description: string
}

/**
 * Default search options
 */
export const DEFAULT_SEARCH_OPTIONS: Required<SearchOptions> = {
  maxResults: 10,
  minScore: 0.1,
  fuzzyMatch: true,
  fuzzyThreshold: 0.7,
  boostExactMatch: true,
  searchFields: ['name', 'summary', 'description', 'tags', 'features'],
  language: 'ru',
}

/**
 * Russian-English translation map for common search terms
 */
const TERM_TRANSLATIONS: Record<string, string> = {
  // Search actions
  найти: 'find',
  найди: 'find',
  поиск: 'search',
  искать: 'search',
  покажи: 'show',
  показать: 'show',
  // Features
  экспорт: 'export',
  экспортировать: 'export',
  импорт: 'import',
  импортировать: 'import',
  редактор: 'editor',
  редактирование: 'editing',
  просмотр: 'preview',
  превью: 'preview',
  генератор: 'generator',
  генерация: 'generation',
  галерея: 'gallery',
  панель: 'panel',
  // Components
  компонент: 'component',
  компоненты: 'components',
  куб: 'cube',
  кубик: 'cube',
  кубики: 'cubes',
  шейдер: 'shader',
  // Status
  стабильный: 'stable',
  стабильные: 'stable',
  бета: 'beta',
  экспериментальный: 'experimental',
  устаревший: 'deprecated',
  // Technical
  '3d': '3d',
  трехмерный: '3d',
  визуализация: 'visualization',
  анимация: 'animation',
  коллаборация: 'collaboration',
  совместная: 'collaboration',
  шаринг: 'share',
  поделиться: 'share',
  сохранить: 'save',
  сохранение: 'save',
}

/**
 * Functionality patterns for natural language search
 */
const FUNCTIONALITY_PATTERNS: FunctionalityPattern[] = [
  {
    keywords: ['export', 'экспорт', 'save', 'сохранить', 'download', 'скачать'],
    searchTags: ['export', 'save', 'download'],
    searchTerms: ['export', 'save', 'json', 'png'],
    description: 'Components for exporting and saving data',
  },
  {
    keywords: ['import', 'импорт', 'load', 'загрузить', 'upload'],
    searchTags: ['import', 'load', 'upload'],
    searchTerms: ['import', 'load', 'upload'],
    description: 'Components for importing and loading data',
  },
  {
    keywords: ['preview', 'превью', 'просмотр', 'view', 'показать'],
    searchTags: ['preview', '3d', 'display', 'view'],
    searchTerms: ['preview', 'view', 'display', 'render'],
    description: 'Components for previewing and viewing content',
  },
  {
    keywords: ['edit', 'редактировать', 'редактор', 'editor', 'modify', 'изменить'],
    searchTags: ['editor', 'edit', 'modify', 'parameters'],
    searchTerms: ['editor', 'edit', 'param', 'config'],
    description: 'Components for editing and modifying content',
  },
  {
    keywords: ['gallery', 'галерея', 'collection', 'коллекция', 'list', 'список'],
    searchTags: ['gallery', 'collection', 'list', 'display'],
    searchTerms: ['gallery', 'collection', 'grid', 'list'],
    description: 'Components for displaying collections and galleries',
  },
  {
    keywords: [
      'generate',
      'генерировать',
      'генератор',
      'генерации',
      'генерация',
      'create',
      'создать',
      'создания',
      'создание',
    ],
    searchTags: ['generator', 'create', 'ai'],
    searchTerms: ['generator', 'create', 'generate', 'ai', 'prompt'],
    description: 'Components for generating and creating content',
  },
  {
    keywords: ['3d', 'трехмерный', 'cube', 'куб', 'render', 'рендер'],
    searchTags: ['3d', 'cube', 'webgl', 'render'],
    searchTerms: ['3d', 'cube', 'render', 'three', 'webgl'],
    description: 'Components for 3D rendering and visualization',
  },
  {
    keywords: [
      'share',
      'sharing',
      'шаринг',
      'поделиться',
      'publish',
      'опубликовать',
      'публикация',
      'публикации',
    ],
    searchTags: ['share', 'publish', 'social'],
    searchTerms: ['share', 'publish', 'link', 'qr'],
    description: 'Components for sharing and publishing content',
  },
  {
    keywords: ['collaborate', 'коллаборация', 'совместный', 'multiplayer', 'мультиплеер'],
    searchTags: ['collaboration', 'multiplayer', 'realtime'],
    searchTerms: ['collaboration', 'realtime', 'sync', 'websocket'],
    description: 'Components for collaborative editing',
  },
  {
    keywords: [
      'stack',
      'стопка',
      'стопки',
      'стопок',
      'vertical',
      'вертикальный',
      'вертикальных',
      'layer',
      'слой',
      'слои',
      'слоев',
    ],
    searchTags: ['stack', 'layer', 'vertical'],
    searchTerms: ['stack', 'layer', 'vertical', 'preset'],
    description: 'Components for working with cube stacks',
  },
]

/**
 * Stopwords to filter out from search queries
 */
const STOPWORDS = new Set([
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
  'me',
  'you',
  'him',
  'them',
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
])

/**
 * Extended Search Engine class
 */
export class ExtendedSearchEngine {
  private options: Required<SearchOptions>
  private componentIndex: Map<string, ComponentIndexEntry> = new Map()
  private tagIndex: Map<string, Set<string>> = new Map()
  private featureIndex: Map<string, Set<string>> = new Map()

  constructor(options: SearchOptions = {}) {
    this.options = { ...DEFAULT_SEARCH_OPTIONS, ...options }
    this.buildIndex()
  }

  /**
   * Builds search index for fast querying
   */
  buildIndex(): void {
    this.componentIndex.clear()
    this.tagIndex.clear()
    this.featureIndex.clear()

    const components = getAllComponentMeta()

    for (const component of components) {
      // Index component
      const entry = this.createIndexEntry(component)
      this.componentIndex.set(component.id, entry)

      // Index tags
      for (const tag of component.tags) {
        const tagLower = tag.toLowerCase()
        if (!this.tagIndex.has(tagLower)) {
          this.tagIndex.set(tagLower, new Set())
        }
        this.tagIndex.get(tagLower)!.add(component.id)
      }

      // Index features
      for (const feature of component.features) {
        const featureLower = feature.name.toLowerCase()
        if (!this.featureIndex.has(featureLower)) {
          this.featureIndex.set(featureLower, new Set())
        }
        this.featureIndex.get(featureLower)!.add(component.id)
      }
    }
  }

  /**
   * Creates an index entry for a component
   */
  private createIndexEntry(component: ComponentMeta): ComponentIndexEntry {
    const nameTokens = this.tokenize(component.name)
    const summaryTokens = this.tokenize(component.summary)
    const descriptionTokens = this.tokenize(component.description)
    const tagTokens = component.tags.flatMap((tag) => this.tokenize(tag))
    const featureTokens = component.features.flatMap((f) => [
      ...this.tokenize(f.name),
      ...this.tokenize(f.description),
    ])

    // All tokens combined
    const allTokens = new Set([
      ...nameTokens,
      ...summaryTokens,
      ...descriptionTokens,
      ...tagTokens,
      ...featureTokens,
    ])

    // Calculate IDF-style weight
    const weight = this.calculateWeight(component)

    return {
      id: component.id,
      nameLower: component.name.toLowerCase(),
      nameTokens,
      summaryTokens,
      descriptionTokens,
      tagTokens,
      featureTokens,
      allTokens: Array.from(allTokens),
      weight,
      component,
    }
  }

  /**
   * Calculates weight for a component based on content richness
   */
  private calculateWeight(component: ComponentMeta): number {
    let weight = 0.5 // Base weight

    // More features = higher weight
    weight += Math.min(0.15, component.features.length * 0.03)

    // More tags = higher weight
    weight += Math.min(0.1, component.tags.length * 0.02)

    // Has tips = higher weight
    if (component.tips && component.tips.length > 0) {
      weight += 0.05
    }

    // Has history = higher weight (more mature)
    weight += Math.min(0.1, component.history.length * 0.02)

    // Stable = higher weight
    if (component.status === 'stable') {
      weight += 0.1
    }

    return Math.min(1.0, weight)
  }

  /**
   * Tokenizes text into normalized searchable tokens
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\wа-яёА-ЯЁ\s-]/g, ' ')
      .split(/[\s-]+/)
      .filter((token) => token.length > 1)
      .filter((token) => !STOPWORDS.has(token))
      .map((token) => TERM_TRANSLATIONS[token] || token)
  }

  /**
   * Performs semantic search across components
   */
  search(query: string, filters?: SearchFilters, options?: SearchOptions): ExtendedSearchResult[] {
    const opts = { ...this.options, ...options }
    const language = opts.language || detectQueryLanguage(query)

    // Parse query
    const parsedQuery = this.parseSearchQuery(query, language)

    // Get candidate components
    const candidates = this.getCandidates(filters)

    // Score each candidate
    const results: ExtendedSearchResult[] = []

    for (const component of candidates) {
      const entry = this.componentIndex.get(component.id)
      if (!entry) continue

      // Skip if excluded terms match
      if (filters?.excludeTerms && this.hasExcludedTerms(entry, filters.excludeTerms)) {
        continue
      }

      const result = this.scoreComponent(parsedQuery, entry, opts)

      if (result.score >= opts.minScore) {
        results.push(result)
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score)

    return results.slice(0, opts.maxResults)
  }

  /**
   * Searches by functionality description
   */
  searchByFunctionality(
    description: string,
    filters?: SearchFilters,
    options?: SearchOptions
  ): ExtendedSearchResult[] {
    const language = detectQueryLanguage(description)
    const tokens = this.tokenize(description)

    // Find matching functionality patterns
    const matchedPatterns: FunctionalityPattern[] = []
    for (const pattern of FUNCTIONALITY_PATTERNS) {
      for (const keyword of pattern.keywords) {
        if (tokens.includes(keyword.toLowerCase()) || description.toLowerCase().includes(keyword)) {
          matchedPatterns.push(pattern)
          break
        }
      }
    }

    // Build expanded search query
    const expandedTerms = new Set<string>(tokens)
    const expandedTags = new Set<string>()

    for (const pattern of matchedPatterns) {
      for (const term of pattern.searchTerms) {
        expandedTerms.add(term.toLowerCase())
      }
      for (const tag of pattern.searchTags) {
        expandedTags.add(tag.toLowerCase())
      }
    }

    // Search with expanded terms
    const expandedQuery = Array.from(expandedTerms).join(' ')
    const results = this.search(
      expandedQuery,
      {
        ...filters,
        tags: filters?.tags
          ? [...filters.tags, ...Array.from(expandedTags)]
          : Array.from(expandedTags),
      },
      options
    )

    // Add explanation to results
    for (const result of results) {
      if (matchedPatterns.length > 0) {
        result.explanation =
          language === 'ru'
            ? `Найдено по функциональности: ${matchedPatterns.map((p) => p.description).join(', ')}`
            : `Found by functionality: ${matchedPatterns.map((p) => p.description).join(', ')}`
      }
    }

    return results
  }

  /**
   * Gets autocomplete suggestions for a partial query
   */
  getAutocompleteSuggestions(
    partialQuery: string,
    maxSuggestions: number = 10
  ): AutocompleteSuggestion[] {
    const suggestions: AutocompleteSuggestion[] = []
    const queryLower = partialQuery.toLowerCase().trim()
    const queryTokens = this.tokenize(partialQuery)
    const lastToken = queryTokens[queryTokens.length - 1] || queryLower

    if (queryLower.length < 1) {
      return suggestions
    }

    // Component name suggestions
    for (const [, entry] of this.componentIndex) {
      if (entry.nameLower.startsWith(queryLower) || entry.nameLower.includes(queryLower)) {
        suggestions.push({
          text: entry.component.name,
          type: 'component',
          score: entry.nameLower.startsWith(queryLower) ? 0.95 : 0.8,
          description: entry.component.summary,
          component: entry.component,
        })
      }
    }

    // Tag suggestions
    for (const [tag] of this.tagIndex) {
      if (tag.startsWith(lastToken) || tag.includes(lastToken)) {
        suggestions.push({
          text: `#${tag}`,
          type: 'tag',
          score: tag.startsWith(lastToken) ? 0.85 : 0.7,
          description: `Filter by tag: ${tag}`,
          filter: { tags: [tag] },
        })
      }
    }

    // Feature suggestions
    for (const [feature] of this.featureIndex) {
      if (feature.startsWith(lastToken) || feature.includes(lastToken)) {
        suggestions.push({
          text: feature,
          type: 'feature',
          score: feature.startsWith(lastToken) ? 0.75 : 0.6,
          description: `Components with "${feature}" feature`,
        })
      }
    }

    // Phrase suggestions based on functionality patterns
    for (const pattern of FUNCTIONALITY_PATTERNS) {
      for (const keyword of pattern.keywords) {
        if (keyword.startsWith(lastToken) || keyword.includes(lastToken)) {
          suggestions.push({
            text: keyword,
            type: 'phrase',
            score: keyword.startsWith(lastToken) ? 0.7 : 0.55,
            description: pattern.description,
          })
        }
      }
    }

    // Filter suggestions
    const filterPatterns = [
      { pattern: 'phase:', type: 'filter' as const, description: 'Filter by phase number' },
      {
        pattern: 'status:',
        type: 'filter' as const,
        description: 'Filter by status (stable, beta, experimental)',
      },
      { pattern: 'tag:', type: 'filter' as const, description: 'Filter by tag' },
    ]

    for (const filterPattern of filterPatterns) {
      if (filterPattern.pattern.startsWith(queryLower)) {
        suggestions.push({
          text: filterPattern.pattern,
          type: filterPattern.type,
          score: 0.65,
          description: filterPattern.description,
        })
      }
    }

    // Sort by score and deduplicate
    suggestions.sort((a, b) => b.score - a.score)

    // Remove duplicates by text
    const seen = new Set<string>()
    const unique: AutocompleteSuggestion[] = []
    for (const suggestion of suggestions) {
      const key = suggestion.text.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        unique.push(suggestion)
      }
    }

    return unique.slice(0, maxSuggestions)
  }

  /**
   * Parses a search query with filters
   */
  parseSearchQuery(query: string, language: QueryLanguage): ParsedSearchQuery {
    const tokens = this.tokenize(query)
    const filters: SearchFilters = {}
    const searchTerms: string[] = []

    // Extract inline filters
    const queryLower = query.toLowerCase()

    // Phase filter: "phase:1" or "фаза:1"
    const phaseMatch = queryLower.match(/(?:phase|фаза)[:\s]?(\d+)/i)
    if (phaseMatch) {
      filters.phases = [parseInt(phaseMatch[1], 10)]
    }

    // Status filter: "status:stable" or "статус:стабильный"
    const statusMatch = queryLower.match(
      /(?:status|статус)[:\s]?(stable|beta|experimental|deprecated|стабильный|бета|экспериментальный|устаревший)/i
    )
    if (statusMatch) {
      const statusMap: Record<string, ComponentMeta['status']> = {
        stable: 'stable',
        стабильный: 'stable',
        beta: 'beta',
        бета: 'beta',
        experimental: 'experimental',
        экспериментальный: 'experimental',
        deprecated: 'deprecated',
        устаревший: 'deprecated',
      }
      filters.status = [statusMap[statusMatch[1].toLowerCase()]]
    }

    // Tag filter: "#tag" or "tag:name"
    const tagMatches = queryLower.matchAll(/#(\w+)|tag[:\s]?(\w+)/g)
    const tags: string[] = []
    for (const match of tagMatches) {
      tags.push(match[1] || match[2])
    }
    if (tags.length > 0) {
      filters.tags = tags
    }

    // Remaining terms are search terms
    for (const token of tokens) {
      if (!token.match(/^(phase|фаза|status|статус|tag)$/) && !tags.includes(token)) {
        searchTerms.push(token)
      }
    }

    return {
      originalQuery: query,
      language,
      tokens,
      searchTerms,
      filters,
      isFilterQuery: !!(
        filters.phases ||
        filters.status ||
        (filters.tags && filters.tags.length > 0)
      ),
    }
  }

  /**
   * Gets candidate components based on filters
   */
  private getCandidates(filters?: SearchFilters): ComponentMeta[] {
    let candidates = getAllComponentMeta()

    if (!filters) {
      return candidates
    }

    // Filter by phases
    if (filters.phases && filters.phases.length > 0) {
      candidates = candidates.filter((c) => filters.phases!.includes(c.phase))
    }

    // Filter by status
    if (filters.status && filters.status.length > 0) {
      candidates = candidates.filter((c) => filters.status!.includes(c.status))
    }

    // Filter by tags (OR logic)
    if (filters.tags && filters.tags.length > 0) {
      const tagsLower = filters.tags.map((t) => t.toLowerCase())
      candidates = candidates.filter((c) =>
        c.tags.some((tag) => tagsLower.includes(tag.toLowerCase()))
      )
    }

    // Filter by required tags (AND logic)
    if (filters.requiredTags && filters.requiredTags.length > 0) {
      const requiredLower = filters.requiredTags.map((t) => t.toLowerCase())
      candidates = candidates.filter((c) => {
        const componentTags = c.tags.map((t) => t.toLowerCase())
        return requiredLower.every((req) => componentTags.includes(req))
      })
    }

    return candidates
  }

  /**
   * Checks if a component has excluded terms
   */
  private hasExcludedTerms(entry: ComponentIndexEntry, excludeTerms: string[]): boolean {
    const excludeLower = excludeTerms.map((t) => t.toLowerCase())
    return entry.allTokens.some((token) => excludeLower.includes(token))
  }

  /**
   * Scores a component against a parsed query
   */
  private scoreComponent(
    query: ParsedSearchQuery,
    entry: ComponentIndexEntry,
    options: Required<SearchOptions>
  ): ExtendedSearchResult {
    const fieldScores = {
      name: 0,
      summary: 0,
      description: 0,
      tags: 0,
      features: 0,
    }
    const matchedFields: string[] = []
    const matchedTerms: string[] = []
    const highlights: ExtendedSearchResult['highlights'] = []

    const searchTerms = query.searchTerms.length > 0 ? query.searchTerms : query.tokens

    // Score name
    if (options.searchFields.includes('name')) {
      const nameScore = this.calculateFieldScore(searchTerms, entry.nameTokens, options)
      fieldScores.name = nameScore.score
      if (nameScore.score > 0) {
        matchedFields.push('name')
        matchedTerms.push(...nameScore.matches)
        if (nameScore.matches.length > 0) {
          highlights.push({
            field: 'name',
            snippet: entry.component.name,
            matches: nameScore.matches,
          })
        }
      }
    }

    // Score summary
    if (options.searchFields.includes('summary')) {
      const summaryScore = this.calculateFieldScore(searchTerms, entry.summaryTokens, options)
      fieldScores.summary = summaryScore.score
      if (summaryScore.score > 0) {
        matchedFields.push('summary')
        matchedTerms.push(...summaryScore.matches)
        if (summaryScore.matches.length > 0) {
          highlights.push({
            field: 'summary',
            snippet: entry.component.summary,
            matches: summaryScore.matches,
          })
        }
      }
    }

    // Score description
    if (options.searchFields.includes('description')) {
      const descScore = this.calculateFieldScore(searchTerms, entry.descriptionTokens, options)
      fieldScores.description = descScore.score
      if (descScore.score > 0) {
        matchedFields.push('description')
        matchedTerms.push(...descScore.matches)
        if (descScore.matches.length > 0) {
          highlights.push({
            field: 'description',
            snippet: this.extractSnippet(entry.component.description, descScore.matches),
            matches: descScore.matches,
          })
        }
      }
    }

    // Score tags
    if (options.searchFields.includes('tags')) {
      const tagScore = this.calculateFieldScore(searchTerms, entry.tagTokens, options)
      fieldScores.tags = tagScore.score
      if (tagScore.score > 0) {
        matchedFields.push('tags')
        matchedTerms.push(...tagScore.matches)
      }
    }

    // Score features
    if (options.searchFields.includes('features')) {
      const featureScore = this.calculateFieldScore(searchTerms, entry.featureTokens, options)
      fieldScores.features = featureScore.score
      if (featureScore.score > 0) {
        matchedFields.push('features')
        matchedTerms.push(...featureScore.matches)
      }
    }

    // Calculate overall score with field weights
    // Weights are normalized based on which fields are being searched
    const fieldWeights: Record<string, number> = {
      name: 0.35,
      summary: 0.25,
      description: 0.2,
      tags: 0.1,
      features: 0.1,
    }

    // Calculate total weight of searched fields for normalization
    const totalWeight = options.searchFields.reduce((sum, field) => sum + fieldWeights[field], 0)

    // Calculate weighted score normalized to searched fields
    let score = 0
    if (options.searchFields.includes('name')) score += fieldScores.name * fieldWeights.name
    if (options.searchFields.includes('summary'))
      score += fieldScores.summary * fieldWeights.summary
    if (options.searchFields.includes('description'))
      score += fieldScores.description * fieldWeights.description
    if (options.searchFields.includes('tags')) score += fieldScores.tags * fieldWeights.tags
    if (options.searchFields.includes('features'))
      score += fieldScores.features * fieldWeights.features

    // Normalize score so that max is 1.0 regardless of which fields are searched
    score = totalWeight > 0 ? score / totalWeight : 0

    // Apply component weight
    score *= entry.weight

    // Boost exact name match
    if (options.boostExactMatch && entry.nameLower === query.originalQuery.toLowerCase()) {
      score = Math.min(1.0, score * 1.5)
    }

    // Deduplicate matched terms
    const uniqueTerms = [...new Set(matchedTerms)]

    return {
      component: entry.component,
      score: Math.min(1.0, score),
      fieldScores,
      matchedFields,
      matchedTerms: uniqueTerms,
      highlights,
    }
  }

  /**
   * Calculates score for a single field
   */
  private calculateFieldScore(
    queryTerms: string[],
    fieldTokens: string[],
    options: Required<SearchOptions>
  ): { score: number; matches: string[] } {
    if (queryTerms.length === 0 || fieldTokens.length === 0) {
      return { score: 0, matches: [] }
    }

    const matches: string[] = []
    let matchScore = 0

    for (const queryTerm of queryTerms) {
      let termMatched = false

      for (const fieldToken of fieldTokens) {
        // Exact match
        if (fieldToken === queryTerm) {
          matchScore += 1.0
          matches.push(queryTerm)
          termMatched = true
          break
        }

        // Prefix/contains match
        if (fieldToken.includes(queryTerm) || queryTerm.includes(fieldToken)) {
          matchScore += 0.7
          matches.push(queryTerm)
          termMatched = true
          break
        }

        // Fuzzy match
        if (options.fuzzyMatch && !termMatched) {
          const similarity = this.calculateSimilarity(queryTerm, fieldToken)
          if (similarity >= options.fuzzyThreshold) {
            matchScore += similarity * 0.5
            matches.push(queryTerm)
            termMatched = true
            break
          }
        }
      }
    }

    const score = queryTerms.length > 0 ? matchScore / queryTerms.length : 0
    return { score: Math.min(1.0, score), matches }
  }

  /**
   * Calculates Levenshtein similarity between two strings
   */
  private calculateSimilarity(a: string, b: string): number {
    if (a === b) return 1.0
    if (a.length === 0 || b.length === 0) return 0

    const matrix: number[][] = []

    for (let i = 0; i <= a.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= b.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    const distance = matrix[a.length][b.length]
    const maxLength = Math.max(a.length, b.length)
    return 1 - distance / maxLength
  }

  /**
   * Extracts a snippet around matched terms
   */
  private extractSnippet(text: string, matches: string[]): string {
    if (matches.length === 0) {
      return text.substring(0, 100) + (text.length > 100 ? '...' : '')
    }

    const textLower = text.toLowerCase()
    const firstMatch = matches[0].toLowerCase()
    const matchIndex = textLower.indexOf(firstMatch)

    if (matchIndex === -1) {
      return text.substring(0, 100) + (text.length > 100 ? '...' : '')
    }

    const start = Math.max(0, matchIndex - 30)
    const end = Math.min(text.length, matchIndex + firstMatch.length + 50)

    let snippet = text.substring(start, end)
    if (start > 0) snippet = '...' + snippet
    if (end < text.length) snippet = snippet + '...'

    return snippet
  }

  /**
   * Refreshes the search index
   */
  refreshIndex(): void {
    this.buildIndex()
  }

  /**
   * Gets the number of indexed components
   */
  getIndexSize(): number {
    return this.componentIndex.size
  }

  /**
   * Gets all indexed tags
   */
  getAllTags(): string[] {
    return Array.from(this.tagIndex.keys())
  }

  /**
   * Gets all indexed features
   */
  getAllFeatures(): string[] {
    return Array.from(this.featureIndex.keys())
  }
}

/**
 * Internal component index entry
 */
interface ComponentIndexEntry {
  id: string
  nameLower: string
  nameTokens: string[]
  summaryTokens: string[]
  descriptionTokens: string[]
  tagTokens: string[]
  featureTokens: string[]
  allTokens: string[]
  weight: number
  component: ComponentMeta
}

/**
 * Parsed search query
 */
interface ParsedSearchQuery {
  originalQuery: string
  language: QueryLanguage
  tokens: string[]
  searchTerms: string[]
  filters: SearchFilters
  isFilterQuery: boolean
}

// Default search engine instance
let defaultEngine: ExtendedSearchEngine | null = null

/**
 * Gets or creates the default search engine instance
 */
export function getDefaultSearchEngine(): ExtendedSearchEngine {
  if (!defaultEngine) {
    defaultEngine = new ExtendedSearchEngine()
  }
  return defaultEngine
}

/**
 * Performs extended search using the default engine
 */
export function extendedSearch(
  query: string,
  filters?: SearchFilters,
  options?: SearchOptions
): ExtendedSearchResult[] {
  return getDefaultSearchEngine().search(query, filters, options)
}

/**
 * Searches by functionality description using the default engine
 */
export function searchByFunctionality(
  description: string,
  filters?: SearchFilters,
  options?: SearchOptions
): ExtendedSearchResult[] {
  return getDefaultSearchEngine().searchByFunctionality(description, filters, options)
}

/**
 * Gets autocomplete suggestions using the default engine
 */
export function getAutocompleteSuggestions(
  partialQuery: string,
  maxSuggestions?: number
): AutocompleteSuggestion[] {
  return getDefaultSearchEngine().getAutocompleteSuggestions(partialQuery, maxSuggestions)
}

/**
 * Refreshes the default search engine index
 */
export function refreshSearchIndex(): void {
  getDefaultSearchEngine().refreshIndex()
}
