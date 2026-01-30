/**
 * Tests for AI Query Types
 *
 * TASK 49: AI Query Interface (Phase 8 - AI + Metadata)
 */

import { describe, it, expect } from 'vitest'
import {
  detectQueryLanguage,
  classifyQueryIntent,
  createQueryRequest,
  createErrorResponse,
  createSuccessResponse,
  createHistoryEntry,
  generateHistoryId,
  validateQueryRequest,
  DEFAULT_QUERY_PANEL_SETTINGS,
  INTENT_PATTERNS,
  EXAMPLE_QUERIES,
  type AIQueryRequest,
  type AIQueryResponse,
  type QueryHistoryEntry,
  type QueryIntent,
  type QueryLanguage,
} from './ai-query'
import type { ComponentMeta } from './component-meta'

// Mock component for testing
const mockComponent: ComponentMeta = {
  id: 'test-component',
  name: 'TestComponent',
  version: '1.0.0',
  summary: 'A test component',
  description: 'A test component for unit testing',
  phase: 8,
  filePath: 'components/TestComponent.tsx',
  history: [],
  features: [],
  dependencies: [],
  relatedFiles: [],
  tags: ['test'],
  status: 'stable',
  lastUpdated: new Date().toISOString(),
}

describe('AI Query Types', () => {
  describe('detectQueryLanguage', () => {
    it('should detect Russian language from Cyrillic characters', () => {
      expect(detectQueryLanguage('Что делает компонент?')).toBe('ru')
      expect(detectQueryLanguage('Найди компонент Gallery')).toBe('ru')
      expect(detectQueryLanguage('Покажи зависимости')).toBe('ru')
    })

    it('should detect English language from Latin characters', () => {
      expect(detectQueryLanguage('What does this component do?')).toBe('en')
      expect(detectQueryLanguage('Find the Gallery component')).toBe('en')
      expect(detectQueryLanguage('Show dependencies')).toBe('en')
    })

    it('should default to English for mixed or ambiguous text', () => {
      expect(detectQueryLanguage('Gallery')).toBe('en')
      expect(detectQueryLanguage('123')).toBe('en')
      expect(detectQueryLanguage('')).toBe('en')
    })

    it('should detect Russian when Cyrillic is present with English', () => {
      expect(detectQueryLanguage('Что такое Gallery?')).toBe('ru')
      expect(detectQueryLanguage('Найди UnifiedEditor')).toBe('ru')
    })
  })

  describe('classifyQueryIntent', () => {
    describe('Russian queries', () => {
      it('should classify describe intent', () => {
        expect(classifyQueryIntent('Что делает Gallery?')).toBe('describe')
        expect(classifyQueryIntent('Расскажи о Gallery')).toBe('describe')
        expect(classifyQueryIntent('Опиши Gallery')).toBe('describe')
      })

      it('should classify find intent', () => {
        expect(classifyQueryIntent('Найди Gallery')).toBe('find')
        expect(classifyQueryIntent('Покажи Gallery')).toBe('find')
        expect(classifyQueryIntent('Где Gallery?')).toBe('find')
      })

      it('should classify dependencies intent', () => {
        expect(classifyQueryIntent('Зависимости Gallery')).toBe('dependencies')
        expect(classifyQueryIntent('От чего зависит Gallery?')).toBe('dependencies')
      })

      it('should classify history intent', () => {
        expect(classifyQueryIntent('История Gallery')).toBe('history')
        expect(classifyQueryIntent('Когда обновили Gallery?')).toBe('history')
        expect(classifyQueryIntent('Версия Gallery')).toBe('history')
      })

      it('should classify usage intent', () => {
        expect(classifyQueryIntent('Как Gallery?')).toBe('usage')
        expect(classifyQueryIntent('Пример Gallery')).toBe('usage')
      })

      it('should classify related intent', () => {
        expect(classifyQueryIntent('Связанные с Gallery')).toBe('related')
        expect(classifyQueryIntent('Похожие на Gallery')).toBe('related')
      })

      it('should classify features intent', () => {
        expect(classifyQueryIntent('Функции Gallery')).toBe('features')
        expect(classifyQueryIntent('Возможности Gallery')).toBe('features')
      })

      it('should classify status intent', () => {
        expect(classifyQueryIntent('Статус Gallery')).toBe('status')
        expect(classifyQueryIntent('Состояние Gallery')).toBe('status')
      })
    })

    describe('English queries', () => {
      it('should classify describe intent', () => {
        expect(classifyQueryIntent('What does Gallery do?')).toBe('describe')
        expect(classifyQueryIntent('Describe Gallery')).toBe('describe')
        expect(classifyQueryIntent('Explain Gallery')).toBe('describe')
      })

      it('should classify find intent', () => {
        expect(classifyQueryIntent('Find Gallery')).toBe('find')
        expect(classifyQueryIntent('Search Gallery')).toBe('find')
        expect(classifyQueryIntent('Where is Gallery?')).toBe('find')
      })

      it('should classify dependencies intent', () => {
        expect(classifyQueryIntent('Dependencies of Gallery')).toBe('dependencies')
        expect(classifyQueryIntent('Uses of Gallery')).toBe('dependencies')
      })

      it('should classify history intent', () => {
        expect(classifyQueryIntent('History of Gallery')).toBe('history')
        expect(classifyQueryIntent('When was Gallery updated?')).toBe('history')
        expect(classifyQueryIntent('Version of Gallery')).toBe('history')
      })

      it('should classify usage intent', () => {
        expect(classifyQueryIntent('How to Gallery?')).toBe('usage')
        expect(classifyQueryIntent('Example of Gallery')).toBe('usage')
      })

      it('should classify related intent', () => {
        expect(classifyQueryIntent('Related to Gallery')).toBe('related')
        expect(classifyQueryIntent('Similar to Gallery')).toBe('related')
      })

      it('should classify features intent', () => {
        expect(classifyQueryIntent('Features of Gallery')).toBe('features')
        expect(classifyQueryIntent('Capabilities of Gallery')).toBe('features')
      })

      it('should classify status intent', () => {
        expect(classifyQueryIntent('Status of Gallery')).toBe('status')
        expect(classifyQueryIntent('Stability of Gallery')).toBe('status')
      })
    })

    it('should return unknown for unrecognized queries', () => {
      expect(classifyQueryIntent('xyz abc')).toBe('unknown')
      expect(classifyQueryIntent('123')).toBe('unknown')
      expect(classifyQueryIntent('random text here')).toBe('unknown')
    })

    it('should use provided language parameter', () => {
      // Force Russian patterns on text that looks English
      expect(classifyQueryIntent('component status', 'ru')).toBe('unknown')
      // Force English patterns on Russian text
      expect(classifyQueryIntent('статус', 'en')).toBe('unknown')
    })
  })

  describe('createQueryRequest', () => {
    it('should create a request with detected language and intent', () => {
      const request = createQueryRequest('Что делает Gallery?')

      expect(request.query).toBe('Что делает Gallery?')
      expect(request.language).toBe('ru')
      expect(request.intent).toBe('describe')
      expect(request.maxResults).toBe(10)
    })

    it('should include context if provided', () => {
      const request = createQueryRequest('Show details', 'gallery-component')

      expect(request.context).toBe('gallery-component')
    })

    it('should merge additional options', () => {
      const request = createQueryRequest('Find component', undefined, {
        maxResults: 5,
        language: 'en',
      })

      expect(request.maxResults).toBe(5)
      expect(request.language).toBe('en')
    })
  })

  describe('createErrorResponse', () => {
    it('should create an error response', () => {
      const response = createErrorResponse('Query failed', 'Test query')

      expect(response.success).toBe(false)
      expect(response.answer).toBe('')
      expect(response.confidence).toBe(0)
      expect(response.intent).toBe('unknown')
      expect(response.error).toBe('Query failed')
    })

    it('should detect language from the query', () => {
      const ruResponse = createErrorResponse('Ошибка', 'Тестовый запрос')
      expect(ruResponse.language).toBe('ru')

      const enResponse = createErrorResponse('Error', 'Test query')
      expect(enResponse.language).toBe('en')
    })
  })

  describe('createSuccessResponse', () => {
    it('should create a success response', () => {
      const response = createSuccessResponse(
        'Gallery is a component for displaying cubes',
        [mockComponent],
        'describe',
        'en',
        0.95
      )

      expect(response.success).toBe(true)
      expect(response.answer).toBe('Gallery is a component for displaying cubes')
      expect(response.components).toHaveLength(1)
      expect(response.confidence).toBe(0.95)
      expect(response.intent).toBe('describe')
      expect(response.language).toBe('en')
    })

    it('should merge additional options', () => {
      const response = createSuccessResponse('Answer', [], 'find', 'ru', 0.8, {
        suggestions: ['Try another query'],
        relatedQueries: ['Find more'],
        processingTime: 150,
      })

      expect(response.suggestions).toEqual(['Try another query'])
      expect(response.relatedQueries).toEqual(['Find more'])
      expect(response.processingTime).toBe(150)
    })
  })

  describe('generateHistoryId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateHistoryId()
      const id2 = generateHistoryId()

      expect(id1).not.toBe(id2)
    })

    it('should start with query_ prefix', () => {
      const id = generateHistoryId()

      expect(id).toMatch(/^query_/)
    })

    it('should contain timestamp', () => {
      const before = Date.now()
      const id = generateHistoryId()
      const after = Date.now()

      // Extract timestamp from ID
      const timestampMatch = id.match(/^query_(\d+)_/)
      expect(timestampMatch).not.toBeNull()

      const timestamp = parseInt(timestampMatch![1], 10)
      expect(timestamp).toBeGreaterThanOrEqual(before)
      expect(timestamp).toBeLessThanOrEqual(after)
    })
  })

  describe('createHistoryEntry', () => {
    it('should create a history entry from query and response', () => {
      const response: AIQueryResponse = {
        success: true,
        answer: 'Gallery displays cubes',
        components: [mockComponent],
        confidence: 0.9,
        intent: 'describe',
        language: 'en',
      }

      const entry = createHistoryEntry('What is Gallery?', response)

      expect(entry.query).toBe('What is Gallery?')
      expect(entry.answer).toBe('Gallery displays cubes')
      expect(entry.componentCount).toBe(1)
      expect(entry.intent).toBe('describe')
      expect(entry.success).toBe(true)
      expect(entry.id).toMatch(/^query_/)
      expect(entry.timestamp).toBeDefined()
    })

    it('should handle empty components array', () => {
      const response: AIQueryResponse = {
        success: true,
        answer: 'No results',
        confidence: 0.5,
        intent: 'find',
        language: 'en',
      }

      const entry = createHistoryEntry('Find something', response)

      expect(entry.componentCount).toBe(0)
    })

    it('should handle error responses', () => {
      const response = createErrorResponse('Query failed', 'Test')

      const entry = createHistoryEntry('Test', response)

      expect(entry.success).toBe(false)
      expect(entry.answer).toBe('')
    })
  })

  describe('validateQueryRequest', () => {
    it('should validate correct requests', () => {
      const request: AIQueryRequest = {
        query: 'Test query',
        language: 'en',
      }

      expect(validateQueryRequest(request)).toBe(true)
    })

    it('should reject empty queries', () => {
      expect(validateQueryRequest({ query: '' })).toBe(false)
      expect(validateQueryRequest({ query: '   ' })).toBe(false)
    })

    it('should reject missing query', () => {
      expect(validateQueryRequest({})).toBe(false)
      expect(validateQueryRequest({ context: 'some-context' })).toBe(false)
    })

    it('should reject non-string queries', () => {
      expect(validateQueryRequest({ query: 123 } as unknown as Partial<AIQueryRequest>)).toBe(false)
      expect(validateQueryRequest({ query: null } as unknown as Partial<AIQueryRequest>)).toBe(
        false
      )
    })
  })

  describe('DEFAULT_QUERY_PANEL_SETTINGS', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_QUERY_PANEL_SETTINGS.maxHistoryEntries).toBe(50)
      expect(DEFAULT_QUERY_PANEL_SETTINGS.showSuggestions).toBe(true)
      expect(DEFAULT_QUERY_PANEL_SETTINGS.showRelatedQueries).toBe(true)
      expect(DEFAULT_QUERY_PANEL_SETTINGS.autoFocus).toBe(true)
      expect(DEFAULT_QUERY_PANEL_SETTINGS.preferredLanguage).toBe('ru')
      expect(DEFAULT_QUERY_PANEL_SETTINGS.persistHistory).toBe(true)
    })
  })

  describe('INTENT_PATTERNS', () => {
    it('should have patterns for both languages', () => {
      expect(INTENT_PATTERNS.ru).toBeDefined()
      expect(INTENT_PATTERNS.en).toBeDefined()
    })

    it('should have the same intents in both languages', () => {
      const ruIntents = new Set(INTENT_PATTERNS.ru.map((p) => p.intent))
      const enIntents = new Set(INTENT_PATTERNS.en.map((p) => p.intent))

      expect(ruIntents).toEqual(enIntents)
    })

    it('should have patterns and keywords for each intent', () => {
      for (const lang of ['ru', 'en'] as QueryLanguage[]) {
        for (const pattern of INTENT_PATTERNS[lang]) {
          expect(pattern.patterns.length).toBeGreaterThan(0)
          expect(pattern.keywords.length).toBeGreaterThan(0)
        }
      }
    })
  })

  describe('EXAMPLE_QUERIES', () => {
    it('should have examples for both languages', () => {
      expect(EXAMPLE_QUERIES.ru).toBeDefined()
      expect(EXAMPLE_QUERIES.en).toBeDefined()
    })

    it('should have multiple examples per language', () => {
      expect(EXAMPLE_QUERIES.ru.length).toBeGreaterThan(0)
      expect(EXAMPLE_QUERIES.en.length).toBeGreaterThan(0)
    })

    it('should have Russian examples in Cyrillic', () => {
      for (const example of EXAMPLE_QUERIES.ru) {
        expect(detectQueryLanguage(example)).toBe('ru')
      }
    })

    it('should have English examples in Latin', () => {
      for (const example of EXAMPLE_QUERIES.en) {
        expect(detectQueryLanguage(example)).toBe('en')
      }
    })
  })

  describe('Type guards and interfaces', () => {
    it('should allow creating valid QueryHistoryEntry', () => {
      const entry: QueryHistoryEntry = {
        id: 'test-id',
        query: 'Test query',
        answer: 'Test answer',
        componentCount: 1,
        intent: 'describe',
        timestamp: new Date().toISOString(),
        success: true,
      }

      expect(entry.id).toBe('test-id')
      expect(entry.success).toBe(true)
    })

    it('should allow all valid QueryIntent values', () => {
      const intents: QueryIntent[] = [
        'describe',
        'find',
        'dependencies',
        'history',
        'usage',
        'related',
        'features',
        'status',
        'unknown',
      ]

      expect(intents).toHaveLength(9)
    })

    it('should allow all valid QueryLanguage values', () => {
      const languages: QueryLanguage[] = ['ru', 'en']

      expect(languages).toHaveLength(2)
    })
  })
})
