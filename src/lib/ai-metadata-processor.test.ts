/**
 * Tests for AI Metadata Processor Module
 *
 * TASK 50: AI Metadata Processor (Phase 8 - AI + Metadata)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  AIMetadataProcessor,
  getDefaultProcessor,
  processMetadataQuery,
  parseMetadataQuery,
  searchMetadata,
  refreshMetadataIndex,
  DEFAULT_PROCESSOR_CONFIG,
  type ProcessorConfig,
} from './ai-metadata-processor'
import {
  componentMetaRegistry,
  registerComponentMeta,
  type ComponentMeta,
} from '../types/component-meta'
import type { AIQueryRequest } from '../types/ai-query'

// Mock component metadata for testing
const mockComponents: ComponentMeta[] = [
  {
    id: 'gallery',
    name: 'Gallery',
    version: '1.0.0',
    summary: 'A gallery component for displaying cube collections',
    description: 'Gallery displays cubes in a grid layout with filtering and search capabilities.',
    phase: 1,
    filePath: 'components/Gallery.tsx',
    history: [
      {
        version: '1.0.0',
        date: '2024-01-01T00:00:00Z',
        description: 'Initial release',
        type: 'created',
      },
    ],
    features: [
      {
        id: 'filtering',
        name: 'Filtering',
        description: 'Filter cubes by tags and categories',
        enabled: true,
      },
      {
        id: 'search',
        name: 'Search',
        description: 'Full-text search in cube names and descriptions',
        enabled: true,
      },
    ],
    dependencies: [
      {
        name: 'CubePreview',
        type: 'component',
        purpose: 'Renders individual cube previews',
      },
    ],
    relatedFiles: [],
    tips: ['Use tags for better filtering', 'Click on a cube to open it in editor'],
    knownIssues: ['Large collections may have performance issues'],
    tags: ['gallery', 'display', 'cubes', 'ui'],
    status: 'stable',
    lastUpdated: '2024-01-15T00:00:00Z',
  },
  {
    id: 'cube-preview',
    name: 'CubePreview',
    version: '2.1.0',
    summary: 'Interactive 3D preview component for parametric cubes',
    description:
      'CubePreview provides real-time 3D rendering of parametric cubes with rotation and zoom controls.',
    phase: 1,
    filePath: 'components/CubePreview.tsx',
    history: [
      {
        version: '2.1.0',
        date: '2024-02-01T00:00:00Z',
        description: 'Added zoom controls',
        type: 'updated',
      },
      {
        version: '2.0.0',
        date: '2024-01-15T00:00:00Z',
        description: 'Refactored rendering',
        type: 'updated',
      },
      {
        version: '1.0.0',
        date: '2024-01-01T00:00:00Z',
        description: 'Initial release',
        type: 'created',
      },
    ],
    features: [
      {
        id: 'rotation',
        name: 'Rotation',
        description: 'Interactive cube rotation with mouse drag',
        enabled: true,
      },
      {
        id: 'zoom',
        name: 'Zoom',
        description: 'Zoom in/out with mouse wheel',
        enabled: true,
      },
    ],
    dependencies: [
      {
        name: 'three',
        type: 'external',
        purpose: '3D rendering engine',
      },
    ],
    relatedFiles: [],
    tips: ['Hold shift for faster rotation'],
    tags: ['3d', 'preview', 'cube', 'webgl'],
    status: 'stable',
    lastUpdated: '2024-02-01T00:00:00Z',
  },
  {
    id: 'param-editor',
    name: 'ParamEditor',
    version: '1.5.0',
    summary: 'Parameter editor for cube configuration',
    description:
      'ParamEditor allows users to modify cube parameters including colors, noise, and physics.',
    phase: 2,
    filePath: 'components/ParamEditor.tsx',
    history: [],
    features: [],
    dependencies: [],
    relatedFiles: [],
    tags: ['editor', 'parameters', 'configuration'],
    status: 'beta',
    lastUpdated: '2024-02-15T00:00:00Z',
  },
  {
    id: 'export-panel',
    name: 'ExportPanel',
    version: '1.0.0',
    summary: 'Export functionality for cubes',
    description:
      'ExportPanel provides export options for cubes in various formats including JSON and PNG.',
    phase: 1,
    filePath: 'components/ExportPanel.tsx',
    history: [],
    features: [],
    dependencies: [],
    relatedFiles: [],
    tags: ['export', 'save', 'download'],
    status: 'experimental',
    lastUpdated: '2024-01-20T00:00:00Z',
  },
]

describe('AIMetadataProcessor', () => {
  let processor: AIMetadataProcessor

  beforeEach(() => {
    // Clear and populate the registry with mock data
    componentMetaRegistry.clear()
    for (const comp of mockComponents) {
      registerComponentMeta(comp)
    }
    processor = new AIMetadataProcessor()
  })

  afterEach(() => {
    componentMetaRegistry.clear()
  })

  describe('constructor and configuration', () => {
    it('should create processor with default config', () => {
      const proc = new AIMetadataProcessor()
      expect(proc.getIndexSize()).toBe(mockComponents.length)
    })

    it('should accept custom configuration', () => {
      const customConfig: Partial<ProcessorConfig> = {
        maxResults: 5,
        minRelevanceScore: 0.2,
        enableCache: false,
      }
      const proc = new AIMetadataProcessor(customConfig)
      expect(proc.getIndexSize()).toBe(mockComponents.length)
    })

    it('should build index on construction', () => {
      expect(processor.getIndexSize()).toBe(mockComponents.length)
      expect(processor.getLastIndexUpdate()).toBeGreaterThan(0)
    })
  })

  describe('parseQuery', () => {
    describe('language detection', () => {
      it('should detect Russian language', () => {
        const parsed = processor.parseQuery('Что делает Gallery?')
        expect(parsed.language).toBe('ru')
      })

      it('should detect English language', () => {
        const parsed = processor.parseQuery('What does Gallery do?')
        expect(parsed.language).toBe('en')
      })
    })

    describe('intent classification', () => {
      it('should classify describe intent', () => {
        expect(processor.parseQuery('What is Gallery?').intent).toBe('describe')
        expect(processor.parseQuery('Describe Gallery').intent).toBe('describe')
        expect(processor.parseQuery('Что такое Gallery?').intent).toBe('describe')
      })

      it('should classify find intent', () => {
        expect(processor.parseQuery('Find gallery').intent).toBe('find')
        expect(processor.parseQuery('Search for export').intent).toBe('find')
        expect(processor.parseQuery('Найди галерею').intent).toBe('find')
      })

      it('should classify dependencies intent', () => {
        expect(processor.parseQuery('Dependencies of Gallery').intent).toBe('dependencies')
        expect(processor.parseQuery('Зависимости Gallery').intent).toBe('dependencies')
      })

      it('should classify history intent', () => {
        expect(processor.parseQuery('History of CubePreview').intent).toBe('history')
        expect(processor.parseQuery('История CubePreview').intent).toBe('history')
      })

      it('should classify usage intent', () => {
        expect(processor.parseQuery('How to use Gallery?').intent).toBe('usage')
        expect(processor.parseQuery('Как использовать Gallery?').intent).toBe('usage')
      })

      it('should classify related intent', () => {
        expect(processor.parseQuery('Related to Gallery').intent).toBe('related')
        expect(processor.parseQuery('Связанные с Gallery').intent).toBe('related')
      })

      it('should classify features intent', () => {
        expect(processor.parseQuery('Features of Gallery').intent).toBe('features')
        expect(processor.parseQuery('Функции Gallery').intent).toBe('features')
      })

      it('should classify status intent', () => {
        expect(processor.parseQuery('Status of Gallery').intent).toBe('status')
        expect(processor.parseQuery('Статус Gallery').intent).toBe('status')
      })

      it('should return unknown for unrecognized queries', () => {
        expect(processor.parseQuery('xyz abc 123').intent).toBe('unknown')
      })
    })

    describe('component name extraction', () => {
      it('should extract PascalCase component names', () => {
        const parsed = processor.parseQuery('What is Gallery?')
        expect(parsed.componentName).toBe('Gallery')
      })

      it('should extract compound component names', () => {
        const parsed = processor.parseQuery('Show CubePreview component')
        expect(parsed.componentName).toBe('CubePreview')
      })

      it('should extract component names with common suffixes', () => {
        const parsed1 = processor.parseQuery('About ParamEditor')
        expect(parsed1.componentName).toBe('ParamEditor')

        const parsed2 = processor.parseQuery('ExportPanel docs')
        expect(parsed2.componentName).toBe('ExportPanel')
      })

      it('should return null when no component name found', () => {
        const parsed = processor.parseQuery('show all components')
        expect(parsed.componentName).toBeNull()
      })
    })

    describe('phase number extraction', () => {
      it('should extract phase number from English query', () => {
        const parsed = processor.parseQuery('Show phase 1 components')
        expect(parsed.phaseNumber).toBe(1)
      })

      it('should extract phase number from Russian query', () => {
        const parsed = processor.parseQuery('Покажи компоненты фазы 2')
        expect(parsed.phaseNumber).toBe(2)
      })

      it('should return null when no phase number found', () => {
        const parsed = processor.parseQuery('Show all components')
        expect(parsed.phaseNumber).toBeNull()
      })
    })

    describe('status filter extraction', () => {
      it('should extract stable status filter', () => {
        const parsed = processor.parseQuery('Show stable components')
        expect(parsed.statusFilter).toBe('stable')
      })

      it('should extract beta status filter', () => {
        const parsed = processor.parseQuery('Find beta components')
        expect(parsed.statusFilter).toBe('beta')
      })

      it('should extract experimental status filter (Russian)', () => {
        const parsed = processor.parseQuery('Покажи экспериментальные')
        expect(parsed.statusFilter).toBe('experimental')
      })

      it('should extract deprecated status filter', () => {
        const parsed = processor.parseQuery('List deprecated components')
        expect(parsed.statusFilter).toBe('deprecated')
      })

      it('should return null when no status filter found', () => {
        const parsed = processor.parseQuery('Show all components')
        expect(parsed.statusFilter).toBeNull()
      })
    })

    describe('keyword extraction', () => {
      it('should extract meaningful keywords', () => {
        const parsed = processor.parseQuery('Find gallery with filtering')
        expect(parsed.keywords).toContain('gallery')
        expect(parsed.keywords).toContain('filtering')
      })

      it('should filter out stopwords', () => {
        const parsed = processor.parseQuery('What is the Gallery component?')
        expect(parsed.keywords).not.toContain('what')
        expect(parsed.keywords).not.toContain('is')
        expect(parsed.keywords).not.toContain('the')
      })

      it('should translate Russian words', () => {
        const parsed = processor.parseQuery('найди компонент галерея')
        expect(parsed.keywords).toContain('gallery')
        expect(parsed.keywords).toContain('component')
      })
    })
  })

  describe('search', () => {
    it('should find component by exact name', () => {
      const parsed = processor.parseQuery('Gallery')
      const results = processor.search(parsed)

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].component.name).toBe('Gallery')
      expect(results[0].score).toBeGreaterThan(0.5)
    })

    it('should find components by keywords in summary', () => {
      const parsed = processor.parseQuery('3D preview')
      const results = processor.search(parsed)

      expect(results.length).toBeGreaterThan(0)
      const names = results.map((r) => r.component.name)
      expect(names).toContain('CubePreview')
    })

    it('should find components by tags', () => {
      const parsed = processor.parseQuery('export save')
      const results = processor.search(parsed)

      expect(results.length).toBeGreaterThan(0)
      const names = results.map((r) => r.component.name)
      expect(names).toContain('ExportPanel')
    })

    it('should filter by phase number', () => {
      const parsed = processor.parseQuery('phase 2 components')
      const results = processor.search(parsed)

      for (const result of results) {
        expect(result.component.phase).toBe(2)
      }
    })

    it('should filter by status', () => {
      const parsed = processor.parseQuery('stable components')
      const results = processor.search(parsed)

      for (const result of results) {
        expect(result.component.status).toBe('stable')
      }
    })

    it('should return empty array for no matches', () => {
      const parsed = processor.parseQuery('nonexistent xyz123')
      const results = processor.search(parsed)

      expect(results.length).toBe(0)
    })

    it('should include matched fields in results', () => {
      const parsed = processor.parseQuery('Gallery')
      const results = processor.search(parsed)

      expect(results[0].matchedFields).toContain('name')
    })

    it('should respect maxResults configuration', () => {
      const customProcessor = new AIMetadataProcessor({ maxResults: 2 })
      const parsed = customProcessor.parseQuery('cube')
      const results = customProcessor.search(parsed)

      expect(results.length).toBeLessThanOrEqual(2)
    })
  })

  describe('processQuery', () => {
    describe('describe intent', () => {
      it('should describe a component in English', () => {
        const request: AIQueryRequest = {
          query: 'What is Gallery?',
          language: 'en',
        }
        const response = processor.processQuery(request)

        expect(response.success).toBe(true)
        expect(response.intent).toBe('describe')
        expect(response.answer).toContain('Gallery')
        expect(response.components).toHaveLength(1)
        expect(response.components![0].name).toBe('Gallery')
      })

      it('should describe a component in Russian', () => {
        const request: AIQueryRequest = {
          query: 'Что такое Gallery?',
          language: 'ru',
        }
        const response = processor.processQuery(request)

        expect(response.success).toBe(true)
        expect(response.language).toBe('ru')
        expect(response.components).toHaveLength(1)
      })

      it('should return not found message for unknown component', () => {
        const request: AIQueryRequest = {
          query: 'Describe XyzQwertyNonexistent',
          language: 'en',
        }
        const response = processor.processQuery(request)

        expect(response.success).toBe(true)
        expect(response.answer).toContain('not found')
        expect(response.confidence).toBeLessThan(0.5)
      })

      it('should include related queries in response', () => {
        const request: AIQueryRequest = {
          query: 'Describe Gallery',
          language: 'en',
        }
        const response = processor.processQuery(request)

        expect(response.relatedQueries).toBeDefined()
        expect(response.relatedQueries!.length).toBeGreaterThan(0)
      })
    })

    describe('find intent', () => {
      it('should find components by keywords', () => {
        const request: AIQueryRequest = {
          query: 'Find gallery for display',
          language: 'en',
        }
        const response = processor.processQuery(request)

        expect(response.success).toBe(true)
        expect(response.intent).toBe('find')
        expect(response.components!.length).toBeGreaterThan(0)
      })

      it('should report no matches found', () => {
        const request: AIQueryRequest = {
          query: 'Find xyznonexistent',
          language: 'en',
        }
        const response = processor.processQuery(request)

        expect(response.success).toBe(true)
        expect(response.answer).toContain('No components found')
        expect(response.suggestions).toBeDefined()
      })
    })

    describe('dependencies intent', () => {
      it('should list dependencies', () => {
        const request: AIQueryRequest = {
          query: 'Dependencies of Gallery',
          language: 'en',
        }
        const response = processor.processQuery(request)

        expect(response.success).toBe(true)
        expect(response.intent).toBe('dependencies')
        expect(response.answer).toContain('CubePreview')
      })

      it('should handle components with no dependencies', () => {
        const request: AIQueryRequest = {
          query: 'Dependencies of ParamEditor',
          language: 'en',
        }
        const response = processor.processQuery(request)

        expect(response.success).toBe(true)
        expect(response.answer).toContain('no registered dependencies')
      })
    })

    describe('history intent', () => {
      it('should show component history', () => {
        const request: AIQueryRequest = {
          query: 'History of CubePreview',
          language: 'en',
        }
        const response = processor.processQuery(request)

        expect(response.success).toBe(true)
        expect(response.intent).toBe('history')
        expect(response.answer).toContain('2.1.0')
        expect(response.answer).toContain('zoom')
      })

      it('should handle components with no history', () => {
        const request: AIQueryRequest = {
          query: 'History of ParamEditor',
          language: 'en',
        }
        const response = processor.processQuery(request)

        expect(response.success).toBe(true)
        expect(response.answer).toContain('not available')
      })
    })

    describe('usage intent', () => {
      it('should show usage tips', () => {
        const request: AIQueryRequest = {
          query: 'How to use Gallery?',
          language: 'en',
        }
        const response = processor.processQuery(request)

        expect(response.success).toBe(true)
        expect(response.intent).toBe('usage')
        expect(response.answer).toContain('tags')
        expect(response.answer).toContain('File:')
      })
    })

    describe('related intent', () => {
      it('should find related components', () => {
        const request: AIQueryRequest = {
          query: 'Related to Gallery',
          language: 'en',
        }
        const response = processor.processQuery(request)

        expect(response.success).toBe(true)
        expect(response.intent).toBe('related')
        expect(response.components!.length).toBeGreaterThan(0)
      })
    })

    describe('features intent', () => {
      it('should list component features', () => {
        const request: AIQueryRequest = {
          query: 'Features of Gallery',
          language: 'en',
        }
        const response = processor.processQuery(request)

        expect(response.success).toBe(true)
        expect(response.intent).toBe('features')
        expect(response.answer).toContain('Filtering')
        expect(response.answer).toContain('Search')
      })

      it('should handle components with no features', () => {
        const request: AIQueryRequest = {
          query: 'Features of ParamEditor',
          language: 'en',
        }
        const response = processor.processQuery(request)

        expect(response.success).toBe(true)
        expect(response.answer).toContain('not defined')
      })
    })

    describe('status intent', () => {
      it('should show component status', () => {
        const request: AIQueryRequest = {
          query: 'Status of Gallery',
          language: 'en',
        }
        const response = processor.processQuery(request)

        expect(response.success).toBe(true)
        expect(response.intent).toBe('status')
        expect(response.answer).toContain('Stable')
      })

      it('should show overall status summary', () => {
        const request: AIQueryRequest = {
          query: 'Status summary',
          language: 'en',
        }
        const response = processor.processQuery(request)

        expect(response.success).toBe(true)
        expect(response.answer).toContain('Stable')
        expect(response.answer).toContain('Beta')
        expect(response.answer).toContain('Experimental')
      })

      it('should include known issues for component', () => {
        const request: AIQueryRequest = {
          query: 'Status of Gallery',
          language: 'en',
        }
        const response = processor.processQuery(request)

        expect(response.answer).toContain('Known issues')
        expect(response.answer).toContain('performance')
      })
    })

    describe('unknown intent', () => {
      it('should handle unknown queries gracefully', () => {
        const request: AIQueryRequest = {
          query: 'xyz random text',
          language: 'en',
        }
        const response = processor.processQuery(request)

        expect(response.success).toBe(true)
        expect(response.intent).toBe('unknown')
        expect(response.confidence).toBeLessThan(0.5)
        expect(response.suggestions).toBeDefined()
      })

      it('should try generic search for unknown intent', () => {
        const request: AIQueryRequest = {
          query: 'gallery something',
          language: 'en',
        }
        const response = processor.processQuery(request)

        // Should still find Gallery even with unknown intent
        expect(response.components).toBeDefined()
      })
    })

    describe('processing time', () => {
      it('should include processing time in response', () => {
        const request: AIQueryRequest = {
          query: 'What is Gallery?',
        }
        const response = processor.processQuery(request)

        expect(response.processingTime).toBeDefined()
        expect(response.processingTime).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('caching', () => {
    it('should cache responses when enabled', () => {
      const request: AIQueryRequest = {
        query: 'What is Gallery?',
      }

      // First call
      const response1 = processor.processQuery(request)

      // Second call should be faster (cached)
      const response2 = processor.processQuery(request)

      expect(response1.answer).toBe(response2.answer)
    })

    it('should not cache when disabled', () => {
      const noCacheProcessor = new AIMetadataProcessor({ enableCache: false })
      const request: AIQueryRequest = {
        query: 'What is Gallery?',
      }

      const response1 = noCacheProcessor.processQuery(request)
      const response2 = noCacheProcessor.processQuery(request)

      expect(response1.answer).toBe(response2.answer)
    })

    it('should clear cache on request', () => {
      const request: AIQueryRequest = {
        query: 'What is Gallery?',
      }

      processor.processQuery(request)
      processor.clearCache()

      // Cache should be empty now
      const response = processor.processQuery(request)
      expect(response.success).toBe(true)
    })
  })

  describe('index management', () => {
    it('should refresh index on demand', () => {
      const initialUpdate = processor.getLastIndexUpdate()

      // Refresh the index
      processor.refreshIndex()

      expect(processor.getLastIndexUpdate()).toBeGreaterThanOrEqual(initialUpdate)
    })

    it('should update index when components change', () => {
      const initialSize = processor.getIndexSize()

      // Add a new component
      registerComponentMeta({
        ...mockComponents[0],
        id: 'new-component',
        name: 'NewComponent',
      })

      processor.refreshIndex()

      expect(processor.getIndexSize()).toBe(initialSize + 1)
    })
  })
})

describe('Module exports', () => {
  beforeEach(() => {
    componentMetaRegistry.clear()
    for (const comp of mockComponents) {
      registerComponentMeta(comp)
    }
  })

  afterEach(() => {
    componentMetaRegistry.clear()
  })

  describe('getDefaultProcessor', () => {
    it('should return a singleton processor', () => {
      const proc1 = getDefaultProcessor()
      const proc2 = getDefaultProcessor()

      expect(proc1).toBe(proc2)
    })
  })

  describe('processMetadataQuery', () => {
    it('should process queries using default processor', () => {
      const response = processMetadataQuery({
        query: 'What is Gallery?',
      })

      expect(response.success).toBe(true)
      expect(response.components).toBeDefined()
    })
  })

  describe('parseMetadataQuery', () => {
    it('should parse queries using default processor', () => {
      const parsed = parseMetadataQuery('What is Gallery?')

      expect(parsed.componentName).toBe('Gallery')
      expect(parsed.intent).toBe('describe')
    })

    it('should accept context parameter', () => {
      const parsed = parseMetadataQuery('Show details', 'gallery')

      expect(parsed.original).toBe('Show details')
    })
  })

  describe('searchMetadata', () => {
    it('should search using default processor', () => {
      const results = searchMetadata('Gallery')

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].component.name).toBe('Gallery')
    })
  })

  describe('refreshMetadataIndex', () => {
    it('should refresh the default processor index', () => {
      const proc = getDefaultProcessor()
      const initialUpdate = proc.getLastIndexUpdate()

      refreshMetadataIndex()

      expect(proc.getLastIndexUpdate()).toBeGreaterThanOrEqual(initialUpdate)
    })
  })
})

describe('DEFAULT_PROCESSOR_CONFIG', () => {
  it('should have reasonable defaults', () => {
    expect(DEFAULT_PROCESSOR_CONFIG.maxResults).toBe(10)
    expect(DEFAULT_PROCESSOR_CONFIG.minRelevanceScore).toBe(0.1)
    expect(DEFAULT_PROCESSOR_CONFIG.enableCache).toBe(true)
    expect(DEFAULT_PROCESSOR_CONFIG.cacheTTL).toBe(60000)
  })
})

describe('Russian language support', () => {
  beforeEach(() => {
    componentMetaRegistry.clear()
    for (const comp of mockComponents) {
      registerComponentMeta(comp)
    }
  })

  afterEach(() => {
    componentMetaRegistry.clear()
  })

  it('should translate Russian component words', () => {
    const processor = new AIMetadataProcessor()
    const parsed = processor.parseQuery('найди компонент галерея')

    expect(parsed.keywords).toContain('component')
    expect(parsed.keywords).toContain('gallery')
  })

  it('should respond in Russian when query is Russian', () => {
    const processor = new AIMetadataProcessor()
    const response = processor.processQuery({
      query: 'Что такое Gallery?',
    })

    expect(response.language).toBe('ru')
    // Response should contain Russian text
    expect(response.answer).toBeDefined()
  })

  it('should handle mixed Russian/English queries', () => {
    const processor = new AIMetadataProcessor()
    const response = processor.processQuery({
      query: 'Покажи компонент Gallery',
    })

    expect(response.success).toBe(true)
    expect(response.components).toHaveLength(1)
    expect(response.components![0].name).toBe('Gallery')
  })
})

describe('Edge cases', () => {
  beforeEach(() => {
    componentMetaRegistry.clear()
    for (const comp of mockComponents) {
      registerComponentMeta(comp)
    }
  })

  afterEach(() => {
    componentMetaRegistry.clear()
  })

  it('should handle empty query', () => {
    const processor = new AIMetadataProcessor()
    const response = processor.processQuery({
      query: '',
    })

    expect(response.success).toBe(true)
    expect(response.intent).toBe('unknown')
  })

  it('should handle whitespace-only query', () => {
    const processor = new AIMetadataProcessor()
    const response = processor.processQuery({
      query: '   ',
    })

    expect(response.success).toBe(true)
  })

  it('should handle very long queries', () => {
    const processor = new AIMetadataProcessor()
    const longQuery = 'What is Gallery? '.repeat(100)
    const response = processor.processQuery({
      query: longQuery,
    })

    expect(response.success).toBe(true)
  })

  it('should handle special characters in query', () => {
    const processor = new AIMetadataProcessor()
    const response = processor.processQuery({
      query: 'What is <Gallery>?! @#$%',
    })

    expect(response.success).toBe(true)
    expect(response.components).toHaveLength(1)
  })

  it('should handle empty registry gracefully', () => {
    componentMetaRegistry.clear()
    const processor = new AIMetadataProcessor()
    const response = processor.processQuery({
      query: 'Find Gallery',
    })

    expect(response.success).toBe(true)
    expect(response.components?.length || 0).toBe(0)
  })
})
