/**
 * Comprehensive unit tests for ComponentContextPanel Vue component
 * Migrated from ComponentContextPanel.test.tsx (React) + existing Vue tests
 * TASK 66: Vue.js 3.0 Migration
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ComponentContextPanel, {
  generateContextInfo,
  generateDescription,
  findRelatedComponents,
  generatePatterns,
  calculateConfidence,
} from './ComponentContextPanel.vue'
import { registerComponentMeta, componentMetaRegistry } from '../types/component-meta'
import type { ComponentMeta } from '../types/component-meta'

// Mock devmode composable
const { mockDevModeEnabled } = vi.hoisted(() => {
  const mockDevModeEnabled = { value: true }
  return { mockDevModeEnabled }
})
vi.mock('../lib/devmode', () => ({
  useIsDevModeEnabled: vi.fn(() => mockDevModeEnabled.value),
}))

// Test component metadata
const testGalleryMeta: ComponentMeta = {
  id: 'gallery',
  name: 'Gallery',
  version: '1.1.0',
  summary: 'Displays a gallery of cubes with search and filtering.',
  description:
    'The Gallery component provides a visual display of all available cubes with search, filtering, and selection capabilities. It includes preset and user cube management.',
  phase: 1,
  taskId: 'TASK 5',
  filePath: 'components/Gallery.tsx',
  history: [
    {
      version: '1.0.0',
      date: '2026-01-01T12:00:00Z',
      description: 'Initial version',
      type: 'created',
    },
    {
      version: '1.1.0',
      date: '2026-01-15T12:00:00Z',
      description: 'Added search functionality',
      type: 'updated',
    },
  ],
  features: [
    {
      id: 'search',
      name: 'Search',
      description: 'Search cubes by name or tags',
      enabled: true,
    },
    {
      id: 'filtering',
      name: 'Filtering',
      description: 'Filter by category',
      enabled: true,
    },
    {
      id: 'thumbnails',
      name: 'Thumbnails',
      description: 'Visual cube previews',
      enabled: true,
    },
  ],
  dependencies: [
    { name: 'react', type: 'external', purpose: 'UI library' },
    {
      name: 'CubePreview',
      type: 'component',
      path: 'components/CubePreview.tsx',
      purpose: 'Preview cubes',
    },
  ],
  relatedFiles: [{ path: 'components/Gallery.test.tsx', type: 'test', description: 'Unit tests' }],
  tips: ['Use for browsing cubes', 'Click to select a cube', 'Search supports tags and names'],
  tags: ['gallery', 'ui', 'browse', 'search'],
  status: 'stable',
  lastUpdated: '2026-01-15T12:00:00Z',
}

const testEditorMeta: ComponentMeta = {
  id: 'unified-editor',
  name: 'UnifiedEditor',
  version: '1.2.0',
  summary: 'Unified editor for all cube parameters.',
  description: 'A comprehensive editor component that allows editing all aspects of a cube.',
  phase: 5,
  taskId: 'TASK 35',
  filePath: 'components/UnifiedEditor.tsx',
  history: [
    {
      version: '1.0.0',
      date: '2026-01-10T12:00:00Z',
      description: 'Initial version',
      type: 'created',
    },
  ],
  features: [
    {
      id: 'param-editing',
      name: 'Parameter Editing',
      description: 'Edit all cube parameters',
      enabled: true,
    },
  ],
  dependencies: [
    { name: 'react', type: 'external', purpose: 'UI library' },
    {
      name: 'Gallery',
      type: 'component',
      path: 'components/Gallery.tsx',
      purpose: 'Cube selection',
    },
  ],
  relatedFiles: [],
  props: [
    {
      name: 'cube',
      type: 'SpectralCube',
      required: true,
      description: 'The cube to edit',
    },
    {
      name: 'onChange',
      type: '(cube: SpectralCube) => void',
      required: true,
      description: 'Callback when cube changes',
    },
  ],
  tags: ['editor', 'ui', 'params', 'browse'],
  status: 'stable',
  lastUpdated: '2026-01-10T12:00:00Z',
}

const testPreviewMeta: ComponentMeta = {
  id: 'cube-preview',
  name: 'CubePreview',
  version: '1.0.0',
  summary: 'Renders 3D preview of a cube.',
  description: 'CubePreview renders a three.js scene with the cube visualization.',
  phase: 1,
  taskId: 'TASK 2',
  filePath: 'components/CubePreview.tsx',
  history: [
    {
      version: '1.0.0',
      date: '2026-01-05T12:00:00Z',
      description: 'Initial version',
      type: 'created',
    },
  ],
  features: [],
  dependencies: [{ name: 'three', type: 'external', purpose: '3D rendering' }],
  relatedFiles: [],
  tags: ['preview', '3d', 'visualization'],
  status: 'stable',
  lastUpdated: '2026-01-05T12:00:00Z',
}

describe('ComponentContextPanel Vue Component', () => {
  beforeEach(() => {
    mockDevModeEnabled.value = true
    localStorage.clear()
    vi.clearAllMocks()

    // Clear and re-register test components
    componentMetaRegistry.clear()
    registerComponentMeta(testGalleryMeta)
    registerComponentMeta(testEditorMeta)
    registerComponentMeta(testPreviewMeta)
  })

  afterEach(() => {
    componentMetaRegistry.clear()
    localStorage.clear()
  })

  function mountPanel(props: Record<string, unknown> = {}) {
    return shallowMount(ComponentContextPanel, {
      props: {
        componentId: 'gallery',
        ...props,
      },
    })
  }

  // ========================================================================
  // Module Exports (from original Vue test)
  // ========================================================================
  describe('Module Exports', () => {
    it('should export ComponentContextPanel.vue as a valid Vue component', async () => {
      const module = await import('./ComponentContextPanel.vue')
      expect(module.default).toBeDefined()
      expect(typeof module.default).toBe('object')
    })
  })

  // ========================================================================
  // Context Info Sections (from original Vue test)
  // ========================================================================
  describe('Context Info Sections', () => {
    it('should define all context info sections', () => {
      const sections = ['description', 'patterns', 'tips']
      expect(sections.length).toBe(3)
      expect(sections).toContain('description')
      expect(sections).toContain('patterns')
      expect(sections).toContain('tips')
    })
  })

  // ========================================================================
  // Confidence Score (from original Vue test)
  // ========================================================================
  describe('Confidence Score', () => {
    it('should validate confidence score is within 0-1 range', () => {
      function isValidConfidence(score: number): boolean {
        return score >= 0 && score <= 1
      }

      expect(isValidConfidence(0)).toBe(true)
      expect(isValidConfidence(0.5)).toBe(true)
      expect(isValidConfidence(1)).toBe(true)
      expect(isValidConfidence(-0.1)).toBe(false)
      expect(isValidConfidence(1.1)).toBe(false)
    })

    it('should format confidence as percentage', () => {
      function formatConfidence(score: number): string {
        return `${Math.round(score * 100)}%`
      }

      expect(formatConfidence(0.95)).toBe('95%')
      expect(formatConfidence(0)).toBe('0%')
      expect(formatConfidence(1)).toBe('100%')
    })
  })

  // ========================================================================
  // Related Component Finding (from original Vue test)
  // ========================================================================
  describe('Related Component Finding', () => {
    it('should find related components by tag similarity', () => {
      const components = [
        { name: 'Button', tags: ['ui', 'form', 'input'] },
        { name: 'TextArea', tags: ['ui', 'form', 'input'] },
        { name: 'NavBar', tags: ['ui', 'navigation'] },
      ]

      function findRelated(target: { tags: string[] }, all: typeof components): string[] {
        return all.filter((c) => c.tags.some((t) => target.tags.includes(t))).map((c) => c.name)
      }

      const related = findRelated({ tags: ['form'] }, components)
      expect(related).toContain('Button')
      expect(related).toContain('TextArea')
      expect(related).not.toContain('NavBar')
    })
  })

  // ========================================================================
  // Component Meta Types (from original Vue test)
  // ========================================================================
  describe('Component Meta Types', () => {
    it('should import component meta types', async () => {
      const metaModule = await import('../types/component-meta')
      expect(metaModule).toBeDefined()
    })
  })

  // ========================================================================
  // Rendering (from React test)
  // ========================================================================
  describe('Rendering', () => {
    it('should not render when DevMode is disabled', async () => {
      mockDevModeEnabled.value = false

      const wrapper = mountPanel()
      await nextTick()
      expect(wrapper.find('[data-testid="component-context-panel"]').exists()).toBe(false)

      mockDevModeEnabled.value = true
    })

    it('should render when DevMode is enabled', () => {
      const wrapper = mountPanel()
      expect(wrapper.find('[data-testid="component-context-panel"]').exists()).toBe(true)
    })

    it('should render with Context header', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toMatch(/Context|Контекст/)
    })

    it('should show no selection message when componentId is null', () => {
      const wrapper = mountPanel({ componentId: null })
      expect(wrapper.text()).toMatch(/Select a component|Выберите компонент/)
    })

    it('should display component name when componentId is provided', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toContain('Gallery')
    })

    it('should display component version', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toMatch(/1\.1\.0/)
    })

    it('should display component status badge', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toContain('stable')
    })

    it('should display key features', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toContain('Search')
      expect(wrapper.text()).toContain('Filtering')
      expect(wrapper.text()).toContain('Thumbnails')
    })

    it('should display usage tips', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toContain('Use for browsing cubes')
    })

    it('should display related components', () => {
      const wrapper = mountPanel()
      expect(wrapper.find('[data-testid="related-component-cube-preview"]').exists()).toBe(true)
    })

    it('should display confidence score', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toMatch(/%/)
    })
  })

  // ========================================================================
  // Interaction (from React test)
  // ========================================================================
  describe('Interaction', () => {
    it('should emit relatedComponentSelect when related component is clicked', async () => {
      const wrapper = mountPanel()
      const relatedItem = wrapper.find('[data-testid="related-component-cube-preview"]')
      await relatedItem.trigger('click')

      expect(wrapper.emitted('relatedComponentSelect')).toBeTruthy()
      expect(wrapper.emitted('relatedComponentSelect')![0]).toEqual(['cube-preview'])
    })

    it('should update context when componentId changes', async () => {
      const wrapper = mountPanel({ componentId: 'gallery' })
      expect(wrapper.text()).toContain('Gallery')

      await wrapper.setProps({ componentId: 'unified-editor' })
      await nextTick()
      expect(wrapper.text()).toContain('UnifiedEditor')
    })
  })

  // ========================================================================
  // Settings (from React test)
  // ========================================================================
  describe('Settings', () => {
    it('should respect showTips setting', () => {
      const wrapper = mountPanel({ settings: { showTips: false } })
      expect(wrapper.text()).not.toContain('Use for browsing cubes')
    })

    it('should respect showRelated setting', () => {
      const wrapper = mountPanel({ settings: { showRelated: false } })
      expect(wrapper.find('[data-testid="related-component-cube-preview"]').exists()).toBe(false)
    })

    it('should respect showPatterns setting', () => {
      const wrapper = mountPanel({ settings: { showPatterns: false } })
      expect(wrapper.text()).not.toMatch(/import \{/)
    })

    it('should limit related components by maxRelatedComponents', () => {
      const wrapper = mountPanel({ settings: { maxRelatedComponents: 1 } })
      const relatedItems = wrapper.findAll('[data-testid^="related-component-"]')
      expect(relatedItems.length).toBeLessThanOrEqual(1)
    })
  })

  // ========================================================================
  // Position (from React test)
  // ========================================================================
  describe('Position', () => {
    it('should apply top-left position styles', () => {
      const wrapper = mountPanel({ position: 'top-left' })
      const panel = wrapper.find('[data-testid="component-context-panel"]')
      const style = panel.attributes('style') || ''
      expect(style).toContain('top: 80px')
      expect(style).toContain('left: 20px')
    })

    it('should apply bottom-right position styles', () => {
      const wrapper = mountPanel({ position: 'bottom-right' })
      const panel = wrapper.find('[data-testid="component-context-panel"]')
      const style = panel.attributes('style') || ''
      expect(style).toContain('bottom: 20px')
      expect(style).toContain('right')
    })
  })
})

// ========================================================================
// Utility Functions (from React test)
// ========================================================================
describe('Utility Functions', () => {
  beforeEach(() => {
    componentMetaRegistry.clear()
    registerComponentMeta(testGalleryMeta)
    registerComponentMeta(testEditorMeta)
    registerComponentMeta(testPreviewMeta)
  })

  afterEach(() => {
    componentMetaRegistry.clear()
  })

  describe('generateContextInfo', () => {
    it('should generate context info for a valid component', () => {
      const allComponents = [testGalleryMeta, testEditorMeta, testPreviewMeta]
      const context = generateContextInfo('gallery', 'en', allComponents)

      expect(context.componentId).toBe('gallery')
      expect(context.description).toContain('Gallery')
      expect(context.keyFeatures.length).toBeGreaterThan(0)
      expect(context.confidence).toBeGreaterThan(0)
    })

    it('should return default context for unknown component', () => {
      const allComponents = [testGalleryMeta, testEditorMeta, testPreviewMeta]
      const context = generateContextInfo('unknown', 'en', allComponents)

      expect(context.componentId).toBe('unknown')
      expect(context.description).toBe('')
      expect(context.keyFeatures.length).toBe(0)
      expect(context.confidence).toBe(0)
    })

    it('should generate Russian context info', () => {
      const allComponents = [testGalleryMeta, testEditorMeta, testPreviewMeta]
      const context = generateContextInfo('gallery', 'ru', allComponents)

      expect(context.language).toBe('ru')
      expect(context.description).toContain('компонент')
    })
  })

  describe('generateDescription', () => {
    it('should generate English description', () => {
      const description = generateDescription(testGalleryMeta, 'en')

      expect(description).toContain('Gallery')
      expect(description).toContain('stable')
      expect(description).toContain('phase 1')
    })

    it('should generate Russian description', () => {
      const description = generateDescription(testGalleryMeta, 'ru')

      expect(description).toContain('Gallery')
      expect(description).toContain('стабильный')
      expect(description).toContain('фазы 1')
    })

    it('should mention feature count', () => {
      const description = generateDescription(testGalleryMeta, 'en')

      expect(description).toContain('3 features')
    })
  })

  describe('findRelatedComponents', () => {
    it('should find dependency relationships', () => {
      const allComponents = [testGalleryMeta, testEditorMeta, testPreviewMeta]
      const related = findRelatedComponents(testGalleryMeta, allComponents, 'en')

      const cubePreviewRelation = related.find((r) => r.id === 'cube-preview')
      expect(cubePreviewRelation).toBeDefined()
      expect(cubePreviewRelation?.relationship).toBe('dependency')
    })

    it('should find dependent relationships', () => {
      const allComponents = [testGalleryMeta, testEditorMeta, testPreviewMeta]
      const related = findRelatedComponents(testGalleryMeta, allComponents, 'en')

      const editorRelation = related.find((r) => r.id === 'unified-editor')
      expect(editorRelation).toBeDefined()
      expect(editorRelation?.relationship).toBe('dependent')
    })

    it('should find similar components by tags', () => {
      const similarComponent: ComponentMeta = {
        id: 'search-panel',
        name: 'SearchPanel',
        version: '1.0.0',
        summary: 'Search panel for browsing',
        description: 'A search panel component',
        phase: 1,
        filePath: 'components/SearchPanel.tsx',
        history: [],
        features: [],
        dependencies: [],
        relatedFiles: [],
        tags: ['search', 'browse', 'ui'],
        status: 'stable',
        lastUpdated: '2026-01-20T12:00:00Z',
      }

      const allComponents = [testGalleryMeta, testEditorMeta, testPreviewMeta, similarComponent]
      const related = findRelatedComponents(testGalleryMeta, allComponents, 'en')

      const searchPanelRelation = related.find((r) => r.id === 'search-panel')
      expect(searchPanelRelation).toBeDefined()
      expect(searchPanelRelation?.reason).toContain('browse')
    })

    it('should limit results to 5', () => {
      const allComponents = [testGalleryMeta, testEditorMeta, testPreviewMeta]
      const related = findRelatedComponents(testGalleryMeta, allComponents, 'en')

      expect(related.length).toBeLessThanOrEqual(5)
    })
  })

  describe('generatePatterns', () => {
    it('should generate import pattern', () => {
      const patterns = generatePatterns(testGalleryMeta, 'en')

      const importPattern = patterns.find((p) => p.includes('import'))
      expect(importPattern).toBeDefined()
      expect(importPattern).toContain('Gallery')
    })

    it('should generate usage pattern with props', () => {
      const patterns = generatePatterns(testEditorMeta, 'en')

      const usagePattern = patterns.find((p) => p.includes('<UnifiedEditor'))
      expect(usagePattern).toBeDefined()
      expect(usagePattern).toContain('cube={...}')
    })

    it('should generate Russian patterns', () => {
      const patterns = generatePatterns(testGalleryMeta, 'ru')

      expect(patterns.some((p) => p.includes('import'))).toBe(true)
    })
  })

  describe('calculateConfidence', () => {
    it('should calculate higher confidence for well-documented components', () => {
      const confidence = calculateConfidence(testGalleryMeta)
      expect(confidence).toBeGreaterThan(0.7)
    })

    it('should calculate lower confidence for minimal components', () => {
      const minimalMeta: ComponentMeta = {
        id: 'minimal',
        name: 'Minimal',
        version: '1.0.0',
        summary: 'A minimal component',
        description: 'Short',
        phase: 1,
        filePath: 'components/Minimal.tsx',
        history: [],
        features: [],
        dependencies: [],
        relatedFiles: [],
        tags: [],
        status: 'experimental',
        lastUpdated: '2026-01-01T00:00:00Z',
      }

      const confidence = calculateConfidence(minimalMeta)
      expect(confidence).toBeLessThan(0.7)
    })

    it('should not exceed 1.0', () => {
      const confidence = calculateConfidence(testGalleryMeta)
      expect(confidence).toBeLessThanOrEqual(1)
    })

    it('should award points for features', () => {
      const withFeatures: ComponentMeta = {
        ...testPreviewMeta,
        features: [
          { id: 'f1', name: 'F1', description: 'Feature 1', enabled: true },
          { id: 'f2', name: 'F2', description: 'Feature 2', enabled: true },
          { id: 'f3', name: 'F3', description: 'Feature 3', enabled: true },
        ],
      }
      const withoutFeatures: ComponentMeta = {
        ...testPreviewMeta,
        features: [],
      }

      const confWith = calculateConfidence(withFeatures)
      const confWithout = calculateConfidence(withoutFeatures)

      expect(confWith).toBeGreaterThan(confWithout)
    })

    it('should award points for tips', () => {
      const withTips: ComponentMeta = {
        ...testPreviewMeta,
        tips: ['Tip 1', 'Tip 2'],
      }
      const withoutTips: ComponentMeta = {
        ...testPreviewMeta,
        tips: undefined,
      }

      const confWith = calculateConfidence(withTips)
      const confWithout = calculateConfidence(withoutTips)

      expect(confWith).toBeGreaterThan(confWithout)
    })
  })
})

// ========================================================================
// Type Exports (from React test)
// ========================================================================
describe('Type Exports', () => {
  it('should export ComponentContextInfo type', () => {
    const contextInfo: import('../types/ai-query').ComponentContextInfo = {
      componentId: 'test',
      description: 'Test',
      keyFeatures: [],
      usageTips: [],
      relatedComponents: [],
      patterns: [],
      confidence: 0.5,
      language: 'en',
      generatedAt: new Date().toISOString(),
    }

    expect(contextInfo.componentId).toBe('test')
  })

  it('should export RelatedComponentInfo type', () => {
    const relatedInfo: import('../types/ai-query').RelatedComponentInfo = {
      id: 'related',
      name: 'Related',
      relationship: 'dependency',
      reason: 'Test reason',
    }

    expect(relatedInfo.relationship).toBe('dependency')
  })

  it('should export ContextPanelSettings type', () => {
    const settings: import('../types/ai-query').ContextPanelSettings = {
      autoUpdate: true,
      showRelated: true,
      showTips: true,
      showPatterns: true,
      maxRelatedComponents: 5,
      position: 'top-left',
      preferredLanguage: 'en',
    }

    expect(settings.autoUpdate).toBe(true)
  })
})
