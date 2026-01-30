/**
 * Tests for Extended Component Search Module
 *
 * TASK 52: Extended Component Search (Phase 8 - AI + Metadata)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  ExtendedSearchEngine,
  getDefaultSearchEngine,
  extendedSearch,
  searchByFunctionality,
  getAutocompleteSuggestions,
  refreshSearchIndex,
  DEFAULT_SEARCH_OPTIONS,
  type SearchOptions,
} from './extended-search'
import {
  componentMetaRegistry,
  registerComponentMeta,
  type ComponentMeta,
} from '../types/component-meta'

// Mock component metadata for testing
const mockComponents: ComponentMeta[] = [
  {
    id: 'gallery',
    name: 'Gallery',
    version: '1.0.0',
    summary: 'A gallery component for displaying cube collections',
    description:
      'Gallery displays cubes in a grid layout with filtering and search capabilities. Supports pagination and infinite scrolling.',
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
    tags: ['gallery', 'display', 'cubes', 'ui', 'collection'],
    status: 'stable',
    lastUpdated: '2024-01-15T00:00:00Z',
  },
  {
    id: 'cube-preview',
    name: 'CubePreview',
    version: '2.1.0',
    summary: 'Interactive 3D preview component for parametric cubes',
    description:
      'CubePreview provides real-time 3D rendering of parametric cubes with rotation and zoom controls. Uses Three.js for WebGL rendering.',
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
    tags: ['3d', 'preview', 'cube', 'webgl', 'render'],
    status: 'stable',
    lastUpdated: '2024-02-01T00:00:00Z',
  },
  {
    id: 'param-editor',
    name: 'ParamEditor',
    version: '1.5.0',
    summary: 'Parameter editor for cube configuration',
    description:
      'ParamEditor allows users to modify cube parameters including colors, noise, gradients and physics properties.',
    phase: 2,
    filePath: 'components/ParamEditor.tsx',
    history: [],
    features: [
      {
        id: 'color-picker',
        name: 'Color Picker',
        description: 'Interactive color selection',
        enabled: true,
      },
    ],
    dependencies: [],
    relatedFiles: [],
    tags: ['editor', 'parameters', 'configuration', 'colors'],
    status: 'beta',
    lastUpdated: '2024-02-15T00:00:00Z',
  },
  {
    id: 'export-panel',
    name: 'ExportPanel',
    version: '1.0.0',
    summary: 'Export functionality for cubes and configurations',
    description:
      'ExportPanel provides export options for cubes in various formats including JSON, PNG, and SVG. Supports batch export.',
    phase: 1,
    filePath: 'components/ExportPanel.tsx',
    history: [],
    features: [
      {
        id: 'json-export',
        name: 'JSON Export',
        description: 'Export cube configuration as JSON',
        enabled: true,
      },
      {
        id: 'image-export',
        name: 'Image Export',
        description: 'Export cube preview as image',
        enabled: true,
      },
    ],
    dependencies: [],
    relatedFiles: [],
    tags: ['export', 'save', 'download', 'json', 'png'],
    status: 'stable',
    lastUpdated: '2024-01-20T00:00:00Z',
  },
  {
    id: 'prompt-generator',
    name: 'PromptGenerator',
    version: '1.2.0',
    summary: 'AI-powered cube generation from text prompts',
    description:
      'PromptGenerator uses TinyLLM to generate cube configurations from natural language descriptions. Supports multiple generation modes.',
    phase: 3,
    filePath: 'components/PromptGenerator.tsx',
    history: [],
    features: [
      {
        id: 'ai-generation',
        name: 'AI Generation',
        description: 'Generate cubes from text descriptions',
        enabled: true,
      },
    ],
    dependencies: [],
    relatedFiles: [],
    tags: ['generator', 'ai', 'prompt', 'create', 'llm'],
    status: 'experimental',
    lastUpdated: '2024-03-01T00:00:00Z',
  },
  {
    id: 'share-panel',
    name: 'SharePanel',
    version: '1.0.0',
    summary: 'Share cubes with links and QR codes',
    description:
      'SharePanel allows users to share their cube creations via links, QR codes, and social media integration.',
    phase: 7,
    filePath: 'components/SharePanel.tsx',
    history: [],
    features: [
      {
        id: 'qr-codes',
        name: 'QR Codes',
        description: 'Generate QR codes for sharing',
        enabled: true,
      },
    ],
    dependencies: [],
    relatedFiles: [],
    tags: ['share', 'social', 'link', 'qr'],
    status: 'stable',
    lastUpdated: '2024-04-01T00:00:00Z',
  },
  {
    id: 'stack-editor',
    name: 'StackEditor',
    version: '1.0.0',
    summary: 'Editor for creating cube stacks',
    description:
      'StackEditor provides tools for creating and editing vertical stacks of cubes with smooth transitions between layers.',
    phase: 5,
    filePath: 'components/StackEditor.tsx',
    history: [],
    features: [
      {
        id: 'layer-management',
        name: 'Layer Management',
        description: 'Add, remove, and reorder layers',
        enabled: true,
      },
    ],
    dependencies: [],
    relatedFiles: [],
    tags: ['stack', 'editor', 'layer', 'vertical'],
    status: 'stable',
    lastUpdated: '2024-03-15T00:00:00Z',
  },
]

describe('ExtendedSearchEngine', () => {
  let engine: ExtendedSearchEngine

  beforeEach(() => {
    // Clear and populate the registry with mock data
    componentMetaRegistry.clear()
    for (const comp of mockComponents) {
      registerComponentMeta(comp)
    }
    engine = new ExtendedSearchEngine()
  })

  afterEach(() => {
    componentMetaRegistry.clear()
  })

  describe('constructor and configuration', () => {
    it('should create engine with default options', () => {
      const eng = new ExtendedSearchEngine()
      expect(eng.getIndexSize()).toBe(mockComponents.length)
    })

    it('should accept custom options', () => {
      const customOptions: SearchOptions = {
        maxResults: 5,
        minScore: 0.2,
        fuzzyMatch: false,
      }
      const eng = new ExtendedSearchEngine(customOptions)
      expect(eng.getIndexSize()).toBe(mockComponents.length)
    })

    it('should build index on construction', () => {
      expect(engine.getIndexSize()).toBe(mockComponents.length)
    })

    it('should index all tags', () => {
      const tags = engine.getAllTags()
      expect(tags.length).toBeGreaterThan(0)
      expect(tags).toContain('gallery')
      expect(tags).toContain('3d')
      expect(tags).toContain('export')
    })

    it('should index all features', () => {
      const features = engine.getAllFeatures()
      expect(features.length).toBeGreaterThan(0)
      expect(features).toContain('filtering')
      expect(features).toContain('rotation')
    })
  })

  describe('basic search', () => {
    it('should find components by name', () => {
      const results = engine.search('Gallery')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].component.name).toBe('Gallery')
      expect(results[0].score).toBeGreaterThan(0.5)
    })

    it('should find components by partial name', () => {
      const results = engine.search('Cube')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((r) => r.component.name === 'CubePreview')).toBe(true)
    })

    it('should find components by summary keywords', () => {
      const results = engine.search('3D preview')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((r) => r.component.id === 'cube-preview')).toBe(true)
    })

    it('should find components by description keywords', () => {
      const results = engine.search('Three.js WebGL rendering')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((r) => r.component.id === 'cube-preview')).toBe(true)
    })

    it('should find components by tags', () => {
      const results = engine.search('3d webgl')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((r) => r.component.id === 'cube-preview')).toBe(true)
    })

    it('should return empty array for non-matching query', () => {
      const results = engine.search('xyznonexistent123')
      expect(results.length).toBe(0)
    })

    it('should respect maxResults option', () => {
      const results = engine.search('cube', undefined, { maxResults: 2 })
      expect(results.length).toBeLessThanOrEqual(2)
    })

    it('should respect minScore option', () => {
      const results = engine.search('component', undefined, { minScore: 0.5 })
      for (const result of results) {
        expect(result.score).toBeGreaterThanOrEqual(0.5)
      }
    })
  })

  describe('Russian language search', () => {
    it('should find components with Russian keywords', () => {
      const results = engine.search('экспорт')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((r) => r.component.id === 'export-panel')).toBe(true)
    })

    it('should find components with Russian functionality description', () => {
      const results = engine.search('редактор параметров')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((r) => r.component.id === 'param-editor')).toBe(true)
    })

    it('should find components with Russian preview terms', () => {
      const results = engine.search('превью куба')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((r) => r.component.id === 'cube-preview')).toBe(true)
    })

    it('should translate Russian terms to English for search', () => {
      const results = engine.search('галерея')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((r) => r.component.id === 'gallery')).toBe(true)
    })
  })

  describe('filtering', () => {
    it('should filter by single phase', () => {
      const results = engine.search('component', { phases: [1] })
      for (const result of results) {
        expect(result.component.phase).toBe(1)
      }
    })

    it('should filter by multiple phases', () => {
      const results = engine.search('component', { phases: [1, 2] })
      for (const result of results) {
        expect([1, 2]).toContain(result.component.phase)
      }
    })

    it('should filter by status', () => {
      const results = engine.search('component', { status: ['stable'] })
      for (const result of results) {
        expect(result.component.status).toBe('stable')
      }
    })

    it('should filter by multiple statuses', () => {
      const results = engine.search('component', { status: ['stable', 'beta'] })
      for (const result of results) {
        expect(['stable', 'beta']).toContain(result.component.status)
      }
    })

    it('should filter by tags (OR logic)', () => {
      const results = engine.search('component', { tags: ['export', '3d'] })
      for (const result of results) {
        const hasTags = result.component.tags.some((t) =>
          ['export', '3d'].includes(t.toLowerCase())
        )
        expect(hasTags).toBe(true)
      }
    })

    it('should filter by required tags (AND logic)', () => {
      const results = engine.search('component', { requiredTags: ['cube', 'preview'] })
      for (const result of results) {
        const componentTags = result.component.tags.map((t) => t.toLowerCase())
        expect(componentTags).toContain('cube')
        expect(componentTags).toContain('preview')
      }
    })

    it('should exclude components with excluded terms', () => {
      const results = engine.search('component', { excludeTerms: ['gallery'] })
      for (const result of results) {
        expect(result.component.id).not.toBe('gallery')
      }
    })

    it('should combine multiple filters', () => {
      const results = engine.search('component', {
        phases: [1],
        status: ['stable'],
      })
      for (const result of results) {
        expect(result.component.phase).toBe(1)
        expect(result.component.status).toBe('stable')
      }
    })
  })

  describe('inline filter parsing', () => {
    it('should parse phase filter from query', () => {
      const parsed = engine.parseSearchQuery('Gallery phase:1', 'en')
      expect(parsed.filters.phases).toContain(1)
    })

    it('should parse Russian phase filter', () => {
      const parsed = engine.parseSearchQuery('Gallery фаза:2', 'ru')
      expect(parsed.filters.phases).toContain(2)
    })

    it('should parse status filter from query', () => {
      const parsed = engine.parseSearchQuery('component status:stable', 'en')
      expect(parsed.filters.status).toContain('stable')
    })

    it('should parse Russian status filter', () => {
      const parsed = engine.parseSearchQuery('компонент статус:стабильный', 'ru')
      expect(parsed.filters.status).toContain('stable')
    })

    it('should parse tag filter with hash', () => {
      const parsed = engine.parseSearchQuery('component #export', 'en')
      expect(parsed.filters.tags).toContain('export')
    })

    it('should parse multiple tag filters', () => {
      const parsed = engine.parseSearchQuery('component #export #3d', 'en')
      expect(parsed.filters.tags).toContain('export')
      expect(parsed.filters.tags).toContain('3d')
    })
  })

  describe('functionality search', () => {
    it('should find export components by functionality', () => {
      const results = engine.searchByFunctionality('найди компонент для экспорта')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((r) => r.component.id === 'export-panel')).toBe(true)
    })

    it('should find preview components by functionality', () => {
      const results = engine.searchByFunctionality('component for 3D preview')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((r) => r.component.id === 'cube-preview')).toBe(true)
    })

    it('should find editor components by functionality', () => {
      const results = engine.searchByFunctionality('найти редактор')
      expect(results.length).toBeGreaterThan(0)
      expect(
        results.some((r) => r.component.id === 'param-editor' || r.component.id === 'stack-editor')
      ).toBe(true)
    })

    it('should find generator components by functionality', () => {
      const results = engine.searchByFunctionality('компонент для генерации')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((r) => r.component.id === 'prompt-generator')).toBe(true)
    })

    it('should find share components by functionality', () => {
      const results = engine.searchByFunctionality('component for sharing')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((r) => r.component.id === 'share-panel')).toBe(true)
    })

    it('should find gallery components by functionality', () => {
      const results = engine.searchByFunctionality('find gallery component')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((r) => r.component.id === 'gallery')).toBe(true)
    })

    it('should find stack components by functionality', () => {
      const results = engine.searchByFunctionality('компонент для стопок')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((r) => r.component.id === 'stack-editor')).toBe(true)
    })

    it('should add explanation to functionality search results', () => {
      const results = engine.searchByFunctionality('find component for export')
      const exportResult = results.find((r) => r.component.id === 'export-panel')
      if (exportResult) {
        expect(exportResult.explanation).toBeDefined()
      }
    })
  })

  describe('autocomplete', () => {
    it('should return suggestions for partial component name', () => {
      const suggestions = engine.getAutocompleteSuggestions('Gal')
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.some((s) => s.text === 'Gallery')).toBe(true)
    })

    it('should return component type suggestions', () => {
      const suggestions = engine.getAutocompleteSuggestions('Gal')
      const gallerySuggestion = suggestions.find((s) => s.text === 'Gallery')
      expect(gallerySuggestion?.type).toBe('component')
      expect(gallerySuggestion?.component).toBeDefined()
    })

    it('should return tag suggestions with hash prefix', () => {
      const suggestions = engine.getAutocompleteSuggestions('exp')
      expect(suggestions.some((s) => s.type === 'tag' && s.text.startsWith('#'))).toBe(true)
    })

    it('should return feature suggestions', () => {
      const suggestions = engine.getAutocompleteSuggestions('filt')
      expect(suggestions.some((s) => s.type === 'feature')).toBe(true)
    })

    it('should return phrase suggestions', () => {
      const suggestions = engine.getAutocompleteSuggestions('prev')
      expect(suggestions.some((s) => s.type === 'phrase')).toBe(true)
    })

    it('should respect max suggestions limit', () => {
      const suggestions = engine.getAutocompleteSuggestions('e', 3)
      expect(suggestions.length).toBeLessThanOrEqual(3)
    })

    it('should sort suggestions by score', () => {
      const suggestions = engine.getAutocompleteSuggestions('Cube')
      for (let i = 0; i < suggestions.length - 1; i++) {
        expect(suggestions[i].score).toBeGreaterThanOrEqual(suggestions[i + 1].score)
      }
    })

    it('should deduplicate suggestions', () => {
      const suggestions = engine.getAutocompleteSuggestions('export')
      const texts = suggestions.map((s) => s.text.toLowerCase())
      const uniqueTexts = new Set(texts)
      expect(texts.length).toBe(uniqueTexts.size)
    })

    it('should return empty array for very short query', () => {
      const suggestions = engine.getAutocompleteSuggestions('')
      expect(suggestions.length).toBe(0)
    })
  })

  describe('relevance scoring', () => {
    it('should give higher score to exact name matches', () => {
      const results = engine.search('Gallery')
      const galleryResult = results.find((r) => r.component.name === 'Gallery')
      expect(galleryResult).toBeDefined()
      expect(galleryResult!.score).toBeGreaterThan(0.7)
    })

    it('should include matched fields in result', () => {
      const results = engine.search('Gallery')
      const galleryResult = results.find((r) => r.component.name === 'Gallery')
      expect(galleryResult?.matchedFields).toContain('name')
    })

    it('should include matched terms in result', () => {
      const results = engine.search('gallery collection')
      const result = results[0]
      expect(result.matchedTerms.length).toBeGreaterThan(0)
    })

    it('should include field scores breakdown', () => {
      const results = engine.search('Gallery')
      const result = results[0]
      expect(result.fieldScores).toBeDefined()
      expect(result.fieldScores.name).toBeGreaterThan(0)
    })

    it('should rank name matches higher than description matches', () => {
      const results = engine.search('export')
      // ExportPanel should be ranked higher than components that just mention export
      const exportPanelIndex = results.findIndex((r) => r.component.id === 'export-panel')
      expect(exportPanelIndex).toBeLessThan(3) // Should be in top 3
    })

    it('should provide highlights for matching content', () => {
      const results = engine.search('3D rendering')
      const result = results.find((r) => r.component.id === 'cube-preview')
      if (result) {
        expect(result.highlights.length).toBeGreaterThan(0)
      }
    })
  })

  describe('fuzzy matching', () => {
    it('should find components with typos when fuzzy enabled', () => {
      const results = engine.search('Galery', undefined, {
        fuzzyMatch: true,
        fuzzyThreshold: 0.6,
      })
      expect(results.some((r) => r.component.name === 'Gallery')).toBe(true)
    })

    it('should not find components with typos when fuzzy disabled', () => {
      const results = engine.search('Galery', undefined, {
        fuzzyMatch: false,
        minScore: 0.5,
      })
      expect(results.some((r) => r.component.name === 'Gallery')).toBe(false)
    })

    it('should respect fuzzy threshold', () => {
      const strictResults = engine.search('Galery', undefined, {
        fuzzyMatch: true,
        fuzzyThreshold: 0.95,
      })
      const looseResults = engine.search('Galery', undefined, {
        fuzzyMatch: true,
        fuzzyThreshold: 0.5,
      })
      expect(looseResults.length).toBeGreaterThanOrEqual(strictResults.length)
    })
  })

  describe('search fields selection', () => {
    it('should search only in name when specified', () => {
      const results = engine.search('Gallery', undefined, {
        searchFields: ['name'],
      })
      const result = results.find((r) => r.component.id === 'gallery')
      if (result) {
        expect(result.fieldScores.name).toBeGreaterThan(0)
        expect(result.matchedFields).toContain('name')
      }
    })

    it('should search in tags when specified', () => {
      const results = engine.search('3d webgl', undefined, {
        searchFields: ['tags'],
      })
      expect(results.some((r) => r.matchedFields.includes('tags'))).toBe(true)
    })

    it('should search in features when specified', () => {
      const results = engine.search('filtering', undefined, {
        searchFields: ['features'],
      })
      expect(results.some((r) => r.matchedFields.includes('features'))).toBe(true)
    })
  })

  describe('index refresh', () => {
    it('should refresh index when components change', () => {
      const initialSize = engine.getIndexSize()

      // Add new component
      const newComponent: ComponentMeta = {
        id: 'new-component',
        name: 'NewComponent',
        version: '1.0.0',
        summary: 'A new test component',
        description: 'This is a new component added for testing.',
        phase: 1,
        filePath: 'components/NewComponent.tsx',
        history: [],
        features: [],
        dependencies: [],
        relatedFiles: [],
        tags: ['new', 'test'],
        status: 'stable',
        lastUpdated: '2024-05-01T00:00:00Z',
      }
      registerComponentMeta(newComponent)

      engine.refreshIndex()

      expect(engine.getIndexSize()).toBe(initialSize + 1)
    })

    it('should find newly added components after refresh', () => {
      const newComponent: ComponentMeta = {
        id: 'refresh-test',
        name: 'RefreshTest',
        version: '1.0.0',
        summary: 'Component added for refresh test',
        description: 'Testing index refresh functionality.',
        phase: 1,
        filePath: 'components/RefreshTest.tsx',
        history: [],
        features: [],
        dependencies: [],
        relatedFiles: [],
        tags: ['refresh', 'test'],
        status: 'stable',
        lastUpdated: '2024-05-01T00:00:00Z',
      }
      registerComponentMeta(newComponent)
      engine.refreshIndex()

      const results = engine.search('RefreshTest')
      expect(results.some((r) => r.component.id === 'refresh-test')).toBe(true)
    })
  })
})

describe('Exported functions', () => {
  beforeEach(() => {
    componentMetaRegistry.clear()
    for (const comp of mockComponents) {
      registerComponentMeta(comp)
    }
    refreshSearchIndex()
  })

  afterEach(() => {
    componentMetaRegistry.clear()
  })

  describe('getDefaultSearchEngine', () => {
    it('should return singleton instance', () => {
      const engine1 = getDefaultSearchEngine()
      const engine2 = getDefaultSearchEngine()
      expect(engine1).toBe(engine2)
    })
  })

  describe('extendedSearch', () => {
    it('should perform search using default engine', () => {
      const results = extendedSearch('Gallery')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].component.name).toBe('Gallery')
    })

    it('should accept filters', () => {
      const results = extendedSearch('component', { phases: [1] })
      for (const result of results) {
        expect(result.component.phase).toBe(1)
      }
    })

    it('should accept options', () => {
      const results = extendedSearch('cube', undefined, { maxResults: 1 })
      expect(results.length).toBeLessThanOrEqual(1)
    })
  })

  describe('searchByFunctionality', () => {
    it('should find components by functionality description', () => {
      const results = searchByFunctionality('компонент для экспорта')
      expect(results.some((r) => r.component.id === 'export-panel')).toBe(true)
    })
  })

  describe('getAutocompleteSuggestions', () => {
    it('should return suggestions using default engine', () => {
      const suggestions = getAutocompleteSuggestions('Gal')
      expect(suggestions.some((s) => s.text === 'Gallery')).toBe(true)
    })
  })

  describe('refreshSearchIndex', () => {
    it('should refresh the default engine index', () => {
      const newComponent: ComponentMeta = {
        id: 'global-refresh-test',
        name: 'GlobalRefreshTest',
        version: '1.0.0',
        summary: 'Testing global refresh',
        description: 'Testing global index refresh functionality.',
        phase: 1,
        filePath: 'components/GlobalRefreshTest.tsx',
        history: [],
        features: [],
        dependencies: [],
        relatedFiles: [],
        tags: ['global', 'refresh'],
        status: 'stable',
        lastUpdated: '2024-05-01T00:00:00Z',
      }
      registerComponentMeta(newComponent)
      refreshSearchIndex()

      const results = extendedSearch('GlobalRefreshTest')
      expect(results.some((r) => r.component.id === 'global-refresh-test')).toBe(true)
    })
  })
})

describe('DEFAULT_SEARCH_OPTIONS', () => {
  it('should have reasonable default values', () => {
    expect(DEFAULT_SEARCH_OPTIONS.maxResults).toBe(10)
    expect(DEFAULT_SEARCH_OPTIONS.minScore).toBe(0.1)
    expect(DEFAULT_SEARCH_OPTIONS.fuzzyMatch).toBe(true)
    expect(DEFAULT_SEARCH_OPTIONS.fuzzyThreshold).toBe(0.7)
    expect(DEFAULT_SEARCH_OPTIONS.boostExactMatch).toBe(true)
    expect(DEFAULT_SEARCH_OPTIONS.searchFields).toContain('name')
    expect(DEFAULT_SEARCH_OPTIONS.searchFields).toContain('summary')
    expect(DEFAULT_SEARCH_OPTIONS.searchFields).toContain('description')
    expect(DEFAULT_SEARCH_OPTIONS.searchFields).toContain('tags')
    expect(DEFAULT_SEARCH_OPTIONS.searchFields).toContain('features')
    expect(DEFAULT_SEARCH_OPTIONS.language).toBe('ru')
  })
})
