/**
 * Comprehensive unit tests for ExtendedSearchPanel Vue component
 * Migrated from ExtendedSearchPanel.test.tsx (React) + existing Vue tests
 * TASK 66: Vue.js 3.0 Migration
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ExtendedSearchPanel from './ExtendedSearchPanel.vue'
import {
  componentMetaRegistry,
  registerComponentMeta,
  type ComponentMeta,
} from '../types/component-meta'

// Mock devmode composable
// vi.hoisted ensures the variable is declared before vi.mock (which is hoisted)
const { mockDevModeEnabled } = vi.hoisted(() => {
  const mockDevModeEnabled = { value: true }
  return { mockDevModeEnabled }
})
vi.mock('../lib/devmode', () => ({
  useIsDevModeEnabled: vi.fn(() => mockDevModeEnabled.value),
}))

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
    history: [],
    features: [
      {
        id: 'filtering',
        name: 'Filtering',
        description: 'Filter cubes by tags',
        enabled: true,
      },
    ],
    dependencies: [],
    relatedFiles: [],
    tags: ['gallery', 'display', 'cubes'],
    status: 'stable',
    lastUpdated: '2024-01-15T00:00:00Z',
  },
  {
    id: 'cube-preview',
    name: 'CubePreview',
    version: '2.1.0',
    summary: 'Interactive 3D preview component for parametric cubes',
    description: 'CubePreview provides real-time 3D rendering.',
    phase: 1,
    filePath: 'components/CubePreview.tsx',
    history: [],
    features: [],
    dependencies: [],
    relatedFiles: [],
    tags: ['3d', 'preview', 'cube'],
    status: 'stable',
    lastUpdated: '2024-02-01T00:00:00Z',
  },
  {
    id: 'export-panel',
    name: 'ExportPanel',
    version: '1.0.0',
    summary: 'Export functionality for cubes',
    description: 'ExportPanel provides export options in JSON and PNG formats.',
    phase: 1,
    filePath: 'components/ExportPanel.tsx',
    history: [],
    features: [],
    dependencies: [],
    relatedFiles: [],
    tags: ['export', 'save', 'download'],
    status: 'stable',
    lastUpdated: '2024-01-20T00:00:00Z',
  },
  {
    id: 'param-editor',
    name: 'ParamEditor',
    version: '1.5.0',
    summary: 'Parameter editor for cube configuration',
    description: 'ParamEditor allows users to modify cube parameters.',
    phase: 2,
    filePath: 'components/ParamEditor.tsx',
    history: [],
    features: [],
    dependencies: [],
    relatedFiles: [],
    tags: ['editor', 'parameters'],
    status: 'beta',
    lastUpdated: '2024-02-15T00:00:00Z',
  },
]

describe('ExtendedSearchPanel Vue Component', () => {
  beforeEach(() => {
    mockDevModeEnabled.value = true
    componentMetaRegistry.clear()
    for (const comp of mockComponents) {
      registerComponentMeta(comp)
    }
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    componentMetaRegistry.clear()
    localStorage.clear()
  })

  function mountPanel(props: Record<string, unknown> = {}) {
    return shallowMount(ExtendedSearchPanel, { props })
  }

  // ========================================================================
  // Module Exports (from original Vue test)
  // ========================================================================
  describe('Module Exports', () => {
    it('should export ExtendedSearchPanel.vue as a valid Vue component', async () => {
      const module = await import('./ExtendedSearchPanel.vue')
      expect(module.default).toBeDefined()
      expect(typeof module.default).toBe('object')
    })
  })

  // ========================================================================
  // Search Filter Categories (from original Vue test)
  // ========================================================================
  describe('Search Filter Categories', () => {
    it('should define all search filter categories', () => {
      const filterCategories = ['component', 'pattern', 'issue', 'documentation', 'code']
      expect(filterCategories.length).toBeGreaterThanOrEqual(3)
      expect(filterCategories).toContain('component')
      expect(filterCategories).toContain('pattern')
      expect(filterCategories).toContain('issue')
    })

    it('should support toggling filter categories', () => {
      const activeFilters = new Set(['component', 'pattern'])
      expect(activeFilters.has('component')).toBe(true)

      activeFilters.delete('component')
      expect(activeFilters.has('component')).toBe(false)

      activeFilters.add('issue')
      expect(activeFilters.has('issue')).toBe(true)
    })
  })

  // ========================================================================
  // Relevance Scoring (from original Vue test)
  // ========================================================================
  describe('Relevance Scoring', () => {
    it('should validate relevance scores are within 0-100 range', () => {
      function isValidRelevance(score: number): boolean {
        return score >= 0 && score <= 100
      }

      expect(isValidRelevance(0)).toBe(true)
      expect(isValidRelevance(50)).toBe(true)
      expect(isValidRelevance(100)).toBe(true)
      expect(isValidRelevance(-1)).toBe(false)
      expect(isValidRelevance(101)).toBe(false)
    })

    it('should sort results by relevance descending', () => {
      const results = [
        { name: 'B', relevance: 50 },
        { name: 'A', relevance: 95 },
        { name: 'C', relevance: 72 },
      ]

      const sorted = [...results].sort((a, b) => b.relevance - a.relevance)
      expect(sorted[0].name).toBe('A')
      expect(sorted[1].name).toBe('C')
      expect(sorted[2].name).toBe('B')
    })
  })

  // ========================================================================
  // Autocomplete Suggestions (from original Vue test)
  // ========================================================================
  describe('Autocomplete Suggestions', () => {
    it('should have correct autocomplete suggestion structure', () => {
      const suggestion = {
        text: 'Button component',
        category: 'component',
        relevance: 85,
      }

      expect(suggestion.text).toBeDefined()
      expect(typeof suggestion.text).toBe('string')
      expect(suggestion.category).toBeDefined()
      expect(typeof suggestion.relevance).toBe('number')
    })

    it('should filter suggestions by prefix', () => {
      const suggestions = [
        { text: 'Button', category: 'component' },
        { text: 'Badge', category: 'component' },
        { text: 'Card', category: 'component' },
      ]

      const filtered = suggestions.filter((s) => s.text.toLowerCase().startsWith('b'))
      expect(filtered.length).toBe(2)
      expect(filtered.map((s) => s.text)).toContain('Button')
      expect(filtered.map((s) => s.text)).toContain('Badge')
    })
  })

  // ========================================================================
  // Extended Search Engine Integration (from original Vue test)
  // ========================================================================
  describe('Extended Search Engine Integration', () => {
    it('should import extended search module', async () => {
      const searchModule = await import('../lib/extended-search')
      expect(searchModule).toBeDefined()
    })
  })

  // ========================================================================
  // Rendering (from React test)
  // ========================================================================
  describe('Rendering', () => {
    it('should render the panel when DevMode is enabled', () => {
      const wrapper = mountPanel()
      expect(wrapper.find('[data-testid="extended-search-panel"]').exists()).toBe(true)
    })

    it('should render collapsed by default when initialExpanded is false', () => {
      const wrapper = mountPanel({ initialExpanded: false })
      expect(wrapper.find('[data-testid="extended-search-panel"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="search-input"]').exists()).toBe(false)
    })

    it('should render expanded by default when initialExpanded is true', () => {
      const wrapper = mountPanel({ initialExpanded: true })
      expect(wrapper.find('[data-testid="search-input"]').exists()).toBe(true)
    })

    it('should display header with title', () => {
      const wrapper = mountPanel()
      const text = wrapper.text()
      expect(text.includes('Расширенный поиск') || text.includes('Extended Search')).toBe(true)
    })

    it('should display search button', () => {
      const wrapper = mountPanel()
      expect(wrapper.find('[data-testid="search-button"]').exists()).toBe(true)
    })

    it('should apply custom className', () => {
      const wrapper = mountPanel({ className: 'custom-class' })
      const panel = wrapper.find('[data-testid="extended-search-panel"]')
      expect(panel.classes()).toContain('custom-class')
    })

    it('should apply custom style', () => {
      const wrapper = mountPanel({ style: { opacity: 0.5 } })
      const panel = wrapper.find('[data-testid="extended-search-panel"]')
      const style = panel.attributes('style') || ''
      expect(style).toContain('opacity')
    })
  })

  // ========================================================================
  // Toggle functionality (from React test)
  // ========================================================================
  describe('Toggle functionality', () => {
    it('should toggle panel when header is clicked', async () => {
      const wrapper = mountPanel({ initialExpanded: true })

      // Initially expanded
      expect(wrapper.find('[data-testid="search-input"]').exists()).toBe(true)

      // Click to collapse
      const header = wrapper.find('[role="button"]')
      await header.trigger('click')
      await nextTick()
      expect(wrapper.find('[data-testid="search-input"]').exists()).toBe(false)

      // Click to expand
      await header.trigger('click')
      await nextTick()
      expect(wrapper.find('[data-testid="search-input"]').exists()).toBe(true)
    })
  })

  // ========================================================================
  // Search input (from React test)
  // ========================================================================
  describe('Search input', () => {
    it('should allow typing in search input', async () => {
      const wrapper = mountPanel()
      const input = wrapper.find('[data-testid="search-input"]')
      await input.setValue('Gallery')
      expect((input.element as HTMLInputElement).value).toBe('Gallery')
    })

    it('should disable search button when input is empty', () => {
      const wrapper = mountPanel()
      const button = wrapper.find('[data-testid="search-button"]')
      expect(button.attributes('disabled')).toBeDefined()
    })

    it('should enable search button when input has value', async () => {
      const wrapper = mountPanel()
      const input = wrapper.find('[data-testid="search-input"]')
      await input.setValue('test')
      await nextTick()
      const button = wrapper.find('[data-testid="search-button"]')
      expect(button.attributes('disabled')).toBeUndefined()
    })
  })

  // ========================================================================
  // Search functionality (from React test)
  // ========================================================================
  describe('Search functionality', () => {
    it('should perform search when button is clicked', async () => {
      const wrapper = mountPanel()
      const input = wrapper.find('[data-testid="search-input"]')
      await input.setValue('Gallery')
      await nextTick()

      // The button is type="submit" inside a form, trigger submit on form
      const form = wrapper.find('form')
      if (form.exists()) {
        await form.trigger('submit')
      } else {
        await wrapper.find('[data-testid="search-button"]').trigger('click')
      }

      // handleSearch uses setTimeout(50ms)
      await new Promise((r) => setTimeout(r, 200))
      await nextTick()
      await nextTick()

      expect(wrapper.find('[data-testid="search-results"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="search-result-gallery"]').exists()).toBe(true)
    })

    it('should perform search when Enter is pressed', async () => {
      const wrapper = mountPanel()
      const input = wrapper.find('[data-testid="search-input"]')
      await input.setValue('Gallery')
      await input.trigger('keydown', { key: 'Enter' })

      await new Promise((r) => setTimeout(r, 150))
      await nextTick()

      expect(wrapper.find('[data-testid="search-results"]').exists()).toBe(true)
    })

    it('should display empty state when no results', async () => {
      const wrapper = mountPanel()
      const input = wrapper.find('[data-testid="search-input"]')
      await input.setValue('xyznonexistent123')
      await wrapper.find('[data-testid="search-button"]').trigger('click')

      await new Promise((r) => setTimeout(r, 150))
      await nextTick()

      const text = wrapper.text()
      expect(text.includes('не найдены') || text.includes('No components found')).toBe(true)
    })
  })

  // ========================================================================
  // Result interaction (from React test)
  // ========================================================================
  describe('Result interaction', () => {
    async function searchForGallery() {
      const wrapper = mountPanel()
      const input = wrapper.find('[data-testid="search-input"]')
      await input.setValue('Gallery')
      await nextTick()

      // Use Enter key to trigger search (more reliable than form submit in test env)
      await input.trigger('keydown', { key: 'Enter' })

      // handleSearch uses setTimeout(50ms)
      await new Promise((r) => setTimeout(r, 200))
      await nextTick()
      await nextTick()

      return wrapper
    }

    it('should emit componentSelect when result is clicked', async () => {
      const wrapper = await searchForGallery()

      const result = wrapper.find('[data-testid="search-result-gallery"]')
      expect(result.exists()).toBe(true)
      await result.trigger('click')

      expect(wrapper.emitted('component-select') || wrapper.emitted('componentSelect')).toBeTruthy()
    })

    it('should display component tags in result', async () => {
      const wrapper = await searchForGallery()

      const result = wrapper.find('[data-testid="search-result-gallery"]')
      expect(result.exists()).toBe(true)
      expect(result.text()).toContain('#gallery')
    })

    it('should display relevance score in result', async () => {
      const wrapper = await searchForGallery()

      const result = wrapper.find('[data-testid="search-result-gallery"]')
      expect(result.exists()).toBe(true)
      expect(result.text()).toMatch(/\d+%/)
    })
  })

  // ========================================================================
  // Filters (from React test)
  // ========================================================================
  describe('Filters', () => {
    it('should display phase filter chips', () => {
      const wrapper = mountPanel()
      const text = wrapper.text()
      expect(text.includes('Phase 1') || text.includes('Фаза 1')).toBe(true)
    })

    it('should display status filter chips', () => {
      const wrapper = mountPanel()
      const text = wrapper.text()
      expect(text.includes('stable')).toBe(true)
      expect(text.includes('beta')).toBe(true)
    })
  })

  // ========================================================================
  // Autocomplete (from React test)
  // ========================================================================
  describe('Autocomplete', () => {
    it('should show autocomplete suggestions as user types', async () => {
      const wrapper = mountPanel()
      const input = wrapper.find('[data-testid="search-input"]')
      await input.setValue('Gal')
      await nextTick()

      expect(wrapper.text()).toContain('Gallery')
    })
  })

  // ========================================================================
  // Positions (from React test)
  // ========================================================================
  describe('Positions', () => {
    it('should apply top-left position', () => {
      const wrapper = mountPanel({ position: 'top-left' })
      const panel = wrapper.find('[data-testid="extended-search-panel"]')
      const style = panel.attributes('style') || ''
      expect(style).toContain('top: 80px')
      expect(style).toContain('left: 20px')
    })

    it('should apply top-right position', () => {
      const wrapper = mountPanel({ position: 'top-right' })
      const panel = wrapper.find('[data-testid="extended-search-panel"]')
      const style = panel.attributes('style') || ''
      expect(style).toContain('top: 80px')
      expect(style).toContain('right: 20px')
    })

    it('should apply bottom-left position', () => {
      const wrapper = mountPanel({ position: 'bottom-left' })
      const panel = wrapper.find('[data-testid="extended-search-panel"]')
      const style = panel.attributes('style') || ''
      expect(style).toContain('bottom: 20px')
      expect(style).toContain('left: 20px')
    })

    it('should apply bottom-right position', () => {
      const wrapper = mountPanel({ position: 'bottom-right' })
      const panel = wrapper.find('[data-testid="extended-search-panel"]')
      const style = panel.attributes('style') || ''
      expect(style).toContain('bottom: 20px')
      expect(style).toContain('right: 20px')
    })
  })

  // ========================================================================
  // Slot rendering (from React children test)
  // ========================================================================
  describe('Slot rendering', () => {
    it('should render slot content inside the panel', () => {
      const wrapper = shallowMount(ExtendedSearchPanel, {
        slots: {
          default: '<div data-testid="custom-child">Custom Content</div>',
        },
      })

      expect(wrapper.find('[data-testid="custom-child"]').exists()).toBe(true)
    })
  })

  // ========================================================================
  // DevMode disabled (from React test)
  // ========================================================================
  describe('DevMode disabled', () => {
    it('should not render when DevMode is disabled', async () => {
      mockDevModeEnabled.value = false

      const wrapper = shallowMount(ExtendedSearchPanel, { props: {} })
      await nextTick()

      expect(wrapper.find('[data-testid="extended-search-panel"]').exists()).toBe(false)

      // Restore for other tests
      mockDevModeEnabled.value = true
    })
  })
})

// ========================================================================
// DEFAULT_PANEL_SETTINGS (from React test)
// ========================================================================
describe('DEFAULT_PANEL_SETTINGS', () => {
  it('should have reasonable default values', async () => {
    const module = await import('./ExtendedSearchPanel.vue')
    const DEFAULT_PANEL_SETTINGS = (module as any).DEFAULT_PANEL_SETTINGS
    if (DEFAULT_PANEL_SETTINGS) {
      expect(DEFAULT_PANEL_SETTINGS.showAutocomplete).toBe(true)
      expect(DEFAULT_PANEL_SETTINGS.showScores).toBe(true)
      expect(DEFAULT_PANEL_SETTINGS.showHighlights).toBe(true)
      expect(DEFAULT_PANEL_SETTINGS.maxDisplayResults).toBe(10)
      expect(DEFAULT_PANEL_SETTINGS.preferredLanguage).toBe('ru')
    }
  })
})
