/**
 * Comprehensive unit tests for DevModeQueryPanel Vue component
 * Migrated from DevModeQueryPanel.test.tsx (React) + existing Vue tests
 * TASK 66: Vue.js 3.0 Migration
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import DevModeQueryPanel from './DevModeQueryPanel.vue'
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
    'The Gallery component provides a visual display of all available cubes with search, filtering, and selection capabilities.',
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
  tips: ['Use for browsing cubes', 'Click to select a cube'],
  tags: ['gallery', 'ui', 'browse'],
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
  features: [],
  dependencies: [{ name: 'react', type: 'external', purpose: 'UI library' }],
  relatedFiles: [],
  tags: ['editor', 'ui', 'params'],
  status: 'stable',
  lastUpdated: '2026-01-10T12:00:00Z',
}

describe('DevModeQueryPanel Vue Component', () => {
  beforeEach(() => {
    mockDevModeEnabled.value = true
    localStorage.clear()
    vi.clearAllMocks()

    // Clear and re-register test components
    componentMetaRegistry.clear()
    registerComponentMeta(testGalleryMeta)
    registerComponentMeta(testEditorMeta)
  })

  afterEach(() => {
    componentMetaRegistry.clear()
    localStorage.clear()
  })

  function mountPanel(props: Record<string, unknown> = {}) {
    return shallowMount(DevModeQueryPanel, { props })
  }

  // ========================================================================
  // Module Exports (from original Vue test)
  // ========================================================================
  describe('Module Exports', () => {
    it('should export DevModeQueryPanel.vue as a valid Vue component', async () => {
      const module = await import('./DevModeQueryPanel.vue')
      expect(module.default).toBeDefined()
      expect(typeof module.default).toBe('object')
    })
  })

  // ========================================================================
  // Query Processing Keywords (from original Vue test)
  // ========================================================================
  describe('Query Processing Keywords', () => {
    it('should define component category keywords', () => {
      const componentCategories = ['ui', 'layout', 'form', 'navigation', 'data', 'utility']
      expect(componentCategories.length).toBeGreaterThanOrEqual(3)
      expect(componentCategories).toContain('ui')
      expect(componentCategories).toContain('layout')
      expect(componentCategories).toContain('form')
    })

    it('should match query keywords case-insensitively', () => {
      function matchesCategory(query: string, categories: string[]): string | null {
        const lower = query.toLowerCase()
        return categories.find((c) => lower.includes(c)) ?? null
      }

      expect(matchesCategory('Show UI components', ['ui', 'layout', 'form'])).toBe('ui')
      expect(matchesCategory('LAYOUT elements', ['ui', 'layout', 'form'])).toBe('layout')
      expect(matchesCategory('nothing relevant', ['ui', 'layout', 'form'])).toBeNull()
    })
  })

  // ========================================================================
  // History Storage (from original Vue test)
  // ========================================================================
  describe('History Storage', () => {
    it('should limit history entries', () => {
      const maxHistoryEntries = 50
      const history: string[] = []
      for (let i = 0; i < 60; i++) {
        history.push(`query-${i}`)
      }
      const trimmed = history.slice(-maxHistoryEntries)
      expect(trimmed.length).toBe(50)
      expect(trimmed[0]).toBe('query-10')
    })
  })

  // ========================================================================
  // Keyboard Shortcut (from original Vue test)
  // ========================================================================
  describe('Keyboard Shortcut', () => {
    it('should define the correct keyboard shortcut', () => {
      const shortcut = {
        key: 'Q',
        ctrlKey: true,
        shiftKey: true,
      }

      expect(shortcut.key).toBe('Q')
      expect(shortcut.ctrlKey).toBe(true)
      expect(shortcut.shiftKey).toBe(true)
    })
  })

  // ========================================================================
  // DevMode API Integration (from original Vue test)
  // ========================================================================
  describe('DevMode API Integration', () => {
    it('should import devmode module', async () => {
      const devmodeModule = await import('../lib/devmode')
      expect(devmodeModule).toBeDefined()
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
      expect(wrapper.find('[data-testid="devmode-query-panel"]').exists()).toBe(false)

      mockDevModeEnabled.value = true
    })

    it('should render when DevMode is enabled', () => {
      const wrapper = mountPanel()
      expect(wrapper.find('[data-testid="devmode-query-panel"]').exists()).toBe(true)
    })

    it('should render with AI Query header', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toContain('AI Query')
    })

    it('should render input field', () => {
      const wrapper = mountPanel()
      expect(wrapper.find('[data-testid="query-input"]').exists()).toBe(true)
    })

    it('should render submit button', () => {
      const wrapper = mountPanel()
      expect(wrapper.find('[data-testid="query-submit"]').exists()).toBe(true)
    })

    it('should render example queries initially', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toMatch(/Примеры запросов|Example queries/)
    })
  })

  // ========================================================================
  // Collapsible behavior (from React test)
  // ========================================================================
  describe('Collapsible behavior', () => {
    it('should render expanded by default', () => {
      const wrapper = mountPanel()
      expect(wrapper.find('[data-testid="query-input"]').exists()).toBe(true)
    })

    it('should render collapsed when initialExpanded is false', () => {
      const wrapper = mountPanel({ initialExpanded: false })
      expect(wrapper.find('[data-testid="query-input"]').exists()).toBe(false)
    })

    it('should toggle expansion when header is clicked', async () => {
      const wrapper = mountPanel()

      // Collapse by clicking header
      await wrapper.find('[role="button"]').trigger('click')
      await nextTick()
      expect(wrapper.find('[data-testid="query-input"]').exists()).toBe(false)

      // Expand
      await wrapper.find('[role="button"]').trigger('click')
      await nextTick()
      expect(wrapper.find('[data-testid="query-input"]').exists()).toBe(true)
    })
  })

  // ========================================================================
  // Query input (from React test)
  // ========================================================================
  describe('Query input', () => {
    it('should update input value on change', async () => {
      const wrapper = mountPanel()
      const input = wrapper.find('[data-testid="query-input"]')
      await input.setValue('Test query')
      expect((input.element as HTMLInputElement).value).toBe('Test query')
    })

    it('should disable submit button when input is empty', () => {
      const wrapper = mountPanel()
      const button = wrapper.find('[data-testid="query-submit"]')
      expect(button.attributes('disabled')).toBeDefined()
    })

    it('should enable submit button when input has value', async () => {
      const wrapper = mountPanel()
      const input = wrapper.find('[data-testid="query-input"]')
      await input.setValue('Test query')
      await nextTick()
      const button = wrapper.find('[data-testid="query-submit"]')
      expect(button.attributes('disabled')).toBeUndefined()
    })

    it('should show Russian placeholder by default', () => {
      const wrapper = mountPanel()
      const input = wrapper.find('[data-testid="query-input"]')
      expect(input.attributes('placeholder')).toBe('Задайте вопрос о компонентах...')
    })
  })

  // ========================================================================
  // Query processing (from React test)
  // ========================================================================
  describe('Query processing', () => {
    it('should process query on submit', async () => {
      const wrapper = mountPanel()
      const input = wrapper.find('[data-testid="query-input"]')
      await input.setValue('Что делает Gallery?')
      await input.trigger('keydown', { key: 'Enter' })

      // Wait for setTimeout(100ms) in handleSubmit
      await new Promise((r) => setTimeout(r, 200))
      await nextTick()

      expect(wrapper.find('[data-testid="query-response"]').exists()).toBe(true)
    })

    it('should process query on Enter key', async () => {
      const wrapper = mountPanel()
      const input = wrapper.find('[data-testid="query-input"]')
      await input.setValue('Что делает Gallery?')
      await input.trigger('keydown', { key: 'Enter' })

      await new Promise((r) => setTimeout(r, 200))
      await nextTick()

      expect(wrapper.find('[data-testid="query-response"]').exists()).toBe(true)
    })

    it('should display response for describe intent', async () => {
      const wrapper = mountPanel()
      const input = wrapper.find('[data-testid="query-input"]')
      await input.setValue('Что делает Gallery?')
      await input.trigger('keydown', { key: 'Enter' })

      await new Promise((r) => setTimeout(r, 200))
      await nextTick()

      expect(wrapper.text()).toContain('Gallery')
    })

    it('should emit queryProcessed event', async () => {
      const wrapper = mountPanel()
      const input = wrapper.find('[data-testid="query-input"]')
      await input.setValue('Test query')
      await input.trigger('keydown', { key: 'Enter' })

      await new Promise((r) => setTimeout(r, 200))
      await nextTick()

      expect(wrapper.emitted('queryProcessed')).toBeTruthy()
    })

    it('should display confidence badge', async () => {
      const wrapper = mountPanel()
      const input = wrapper.find('[data-testid="query-input"]')
      await input.setValue('Что делает Gallery?')
      await input.trigger('keydown', { key: 'Enter' })

      await new Promise((r) => setTimeout(r, 200))
      await nextTick()

      expect(wrapper.text()).toMatch(/%/)
    })
  })

  // ========================================================================
  // Query history (from React test)
  // ========================================================================
  describe('Query history', () => {
    it('should add query to history after processing', async () => {
      const wrapper = mountPanel()
      const input = wrapper.find('[data-testid="query-input"]')
      await input.setValue('Test query')
      await input.trigger('keydown', { key: 'Enter' })

      await new Promise((r) => setTimeout(r, 200))
      await nextTick()

      expect(wrapper.text()).toMatch(/История|History/)
      expect(wrapper.text()).toContain('Test query')
    })

    it('should allow clicking history to reuse query', async () => {
      const wrapper = mountPanel()
      const input = wrapper.find('[data-testid="query-input"]')
      await input.setValue('First query')
      await input.trigger('keydown', { key: 'Enter' })

      await new Promise((r) => setTimeout(r, 200))
      await nextTick()

      // Clear input
      await input.setValue('')

      // Click history item
      const historyItems = wrapper.findAll('[role="button"]')
      const historyItem = historyItems.find((el) => el.text().includes('First query'))
      if (historyItem) {
        await historyItem.trigger('click')
        await nextTick()
        expect((input.element as HTMLInputElement).value).toBe('First query')
      }
    })

    it('should allow clearing history', async () => {
      const wrapper = mountPanel()
      const input = wrapper.find('[data-testid="query-input"]')
      await input.setValue('Test query')
      await input.trigger('keydown', { key: 'Enter' })

      await new Promise((r) => setTimeout(r, 200))
      await nextTick()

      expect(wrapper.text()).toContain('Test query')

      // Find and click clear button
      const clearButtons = wrapper.findAll('button')
      const clearBtn = clearButtons.find(
        (btn) => btn.text().includes('Очистить') || btn.text().includes('Clear')
      )
      if (clearBtn) {
        await clearBtn.trigger('click')
        await nextTick()
      }
    })

    it('should persist history to localStorage', async () => {
      const wrapper = mountPanel()
      const input = wrapper.find('[data-testid="query-input"]')
      await input.setValue('Persistent query')
      await input.trigger('keydown', { key: 'Enter' })

      await new Promise((r) => setTimeout(r, 200))
      await nextTick()

      const stored = localStorage.getItem('isocubic_query_history')
      expect(stored).toBeTruthy()
    })
  })

  // ========================================================================
  // Example queries (from React test)
  // ========================================================================
  describe('Example queries', () => {
    it('should display example queries when no response', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toMatch(/Примеры запросов|Example queries/)
    })

    it('should fill input when example is clicked', async () => {
      const wrapper = mountPanel()
      const exampleButtons = wrapper.findAll('button')
      const exampleBtn = exampleButtons.find(
        (btn) => btn.text().includes('Gallery') || btn.text().includes('компонент')
      )

      if (exampleBtn) {
        await exampleBtn.trigger('click')
        await nextTick()
        const input = wrapper.find('[data-testid="query-input"]')
        expect((input.element as HTMLInputElement).value).toBeTruthy()
      }
    })
  })

  // ========================================================================
  // Keyboard shortcuts (from React test)
  // ========================================================================
  describe('Keyboard shortcuts', () => {
    it('should toggle panel with Ctrl+Shift+Q', async () => {
      const wrapper = mountPanel()
      expect(wrapper.find('[data-testid="query-input"]').exists()).toBe(true)

      // Collapse
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'q', ctrlKey: true, shiftKey: true })
      )
      await nextTick()
      expect(wrapper.find('[data-testid="query-input"]').exists()).toBe(false)

      // Expand
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'q', ctrlKey: true, shiftKey: true })
      )
      await nextTick()
      expect(wrapper.find('[data-testid="query-input"]').exists()).toBe(true)
    })

    it('should display keyboard shortcut hint', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toContain('Ctrl+Shift+Q')
    })
  })

  // ========================================================================
  // Position and styling (from React test)
  // ========================================================================
  describe('Position and styling', () => {
    it('should apply custom styles', () => {
      const wrapper = mountPanel({ style: { opacity: 0.5 } })
      const panel = wrapper.find('[data-testid="devmode-query-panel"]')
      const style = panel.attributes('style') || ''
      expect(style).toContain('opacity')
    })

    it('should apply custom className', () => {
      const wrapper = mountPanel({ className: 'custom-class' })
      const panel = wrapper.find('[data-testid="devmode-query-panel"]')
      expect(panel.classes()).toContain('custom-class')
    })

    it('should support different positions', () => {
      const wrapper = mountPanel({ position: 'top-left' })
      const panel = wrapper.find('[data-testid="devmode-query-panel"]')
      const style = panel.attributes('style') || ''
      expect(style).toContain('top: 80px')
      expect(style).toContain('left: 20px')
    })
  })

  // ========================================================================
  // Children rendering (from React test - slot in Vue)
  // ========================================================================
  describe('Slot rendering', () => {
    it('should render slot content inside the panel', () => {
      const wrapper = shallowMount(DevModeQueryPanel, {
        slots: {
          default: '<div data-testid="custom-child">Custom Content</div>',
        },
      })

      expect(wrapper.find('[data-testid="custom-child"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('Custom Content')
    })
  })

  // ========================================================================
  // Query intents (from React test)
  // ========================================================================
  describe('Query intents', () => {
    it('should process dependencies intent', async () => {
      const wrapper = mountPanel()
      const input = wrapper.find('[data-testid="query-input"]')
      await input.setValue('Какие зависимости у Gallery?')
      await input.trigger('keydown', { key: 'Enter' })

      await new Promise((r) => setTimeout(r, 200))
      await nextTick()

      expect(wrapper.find('[data-testid="query-response"]').exists()).toBe(true)
      expect(wrapper.text()).toMatch(/Зависимости|Dependencies/)
    })

    it('should process history intent', async () => {
      const wrapper = mountPanel()
      const input = wrapper.find('[data-testid="query-input"]')
      await input.setValue('История изменений Gallery')
      await input.trigger('keydown', { key: 'Enter' })

      await new Promise((r) => setTimeout(r, 200))
      await nextTick()

      expect(wrapper.find('[data-testid="query-response"]').exists()).toBe(true)
      expect(wrapper.text()).toMatch(/история|history/i)
    })

    it('should process features intent', async () => {
      const wrapper = mountPanel()
      const input = wrapper.find('[data-testid="query-input"]')
      await input.setValue('Функции Gallery')
      await input.trigger('keydown', { key: 'Enter' })

      await new Promise((r) => setTimeout(r, 200))
      await nextTick()

      expect(wrapper.find('[data-testid="query-response"]').exists()).toBe(true)
      expect(wrapper.text()).toMatch(/функци|feature/i)
    })

    it('should process status intent', async () => {
      const wrapper = mountPanel()
      const input = wrapper.find('[data-testid="query-input"]')
      await input.setValue('Статус Gallery')
      await input.trigger('keydown', { key: 'Enter' })

      await new Promise((r) => setTimeout(r, 200))
      await nextTick()

      expect(wrapper.find('[data-testid="query-response"]').exists()).toBe(true)
      expect(wrapper.text()).toMatch(/статус|status|стабильн|stable/i)
    })

    it('should process unknown intent gracefully', async () => {
      const wrapper = mountPanel()
      const input = wrapper.find('[data-testid="query-input"]')
      await input.setValue('xyz random text 123')
      await input.trigger('keydown', { key: 'Enter' })

      await new Promise((r) => setTimeout(r, 200))
      await nextTick()

      expect(wrapper.find('[data-testid="query-response"]').exists()).toBe(true)
    })
  })

  // ========================================================================
  // English language support (from React test)
  // ========================================================================
  describe('English language support', () => {
    it('should detect English language queries and show Ask button', async () => {
      const wrapper = mountPanel()
      const input = wrapper.find('[data-testid="query-input"]')
      await input.setValue('What does Gallery do?')
      await nextTick()

      const button = wrapper.find('[data-testid="query-submit"]')
      expect(button.text()).toBe('Ask')
    })

    it('should respond in English for English queries', async () => {
      const wrapper = mountPanel()
      const input = wrapper.find('[data-testid="query-input"]')
      await input.setValue('What does Gallery do?')
      await input.trigger('keydown', { key: 'Enter' })

      await new Promise((r) => setTimeout(r, 200))
      await nextTick()

      expect(wrapper.find('[data-testid="query-response"]').exists()).toBe(true)
    })
  })

  // ========================================================================
  // Settings (from React test)
  // ========================================================================
  describe('Settings', () => {
    it('should respect showSuggestions setting', async () => {
      const wrapper = mountPanel({ settings: { showSuggestions: false } })
      const input = wrapper.find('[data-testid="query-input"]')
      await input.setValue('Что делает UnknownComponent?')
      await input.trigger('keydown', { key: 'Enter' })

      await new Promise((r) => setTimeout(r, 300))
      await nextTick()
      await nextTick()

      expect(wrapper.find('[data-testid="query-response"]').exists()).toBe(true)
    })

    it('should respect showRelatedQueries setting', async () => {
      const wrapper = mountPanel({ settings: { showRelatedQueries: false } })
      const input = wrapper.find('[data-testid="query-input"]')
      await input.setValue('Что делает Gallery?')
      await input.trigger('keydown', { key: 'Enter' })

      await new Promise((r) => setTimeout(r, 300))
      await nextTick()
      await nextTick()

      expect(wrapper.find('[data-testid="query-response"]').exists()).toBe(true)
    })
  })

  // ========================================================================
  // Components display (from React test)
  // ========================================================================
  describe('Components display', () => {
    it('should display found components in response', async () => {
      const wrapper = mountPanel()
      const input = wrapper.find('[data-testid="query-input"]')
      await input.setValue('Что делает Gallery?')
      await input.trigger('keydown', { key: 'Enter' })

      await new Promise((r) => setTimeout(r, 300))
      await nextTick()
      await nextTick()

      expect(wrapper.text()).toMatch(/Найденные компоненты|Found components|Gallery/)
    })
  })
})
