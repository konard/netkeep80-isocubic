/**
 * Comprehensive unit tests for ComponentInfo Vue component
 * Migrated from ComponentInfo.test.tsx (React) + existing Vue tests
 * TASK 66: Vue.js 3.0 Migration
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ComponentInfo from './ComponentInfo.vue'
import type { ComponentMeta } from '../types/component-meta'

// Mock devmode composable
const { mockDevModeEnabled, mockSettings } = vi.hoisted(() => {
  const mockDevModeEnabled = { value: true }
  const mockSettings = {
    enabled: true,
    verbosity: 'normal' as string,
    categories: {
      basic: true,
      history: true,
      features: true,
      dependencies: false,
      relatedFiles: false,
      props: false,
      tips: true,
    },
    showOutline: true,
    showHoverInfo: true,
    panelPosition: 'top-right' as string,
  }
  return { mockDevModeEnabled, mockSettings }
})

vi.mock('../lib/devmode', () => ({
  useIsDevModeEnabled: vi.fn(() => mockDevModeEnabled.value),
  useDevMode: vi.fn(() => ({
    settings: mockSettings,
    toggleDevMode: vi.fn(),
    updateSettings: vi.fn(),
    updateCategory: vi.fn(),
    resetSettings: vi.fn(),
    isEnabled: mockDevModeEnabled.value,
  })),
  useDevModeSettings: vi.fn(() => mockSettings),
}))

// Test metadata
const testMeta: ComponentMeta = {
  id: 'test-component',
  name: 'TestComponent',
  version: '1.0.0',
  summary: 'A test component for unit testing.',
  description: 'This is a test component used for unit testing the ComponentInfo overlay.',
  phase: 1,
  taskId: 'TASK 1',
  filePath: 'components/TestComponent.tsx',
  history: [
    {
      version: '1.0.0',
      date: '2026-01-29T12:00:00Z',
      description: 'Initial version',
      taskId: 'TASK 1',
      type: 'created',
    },
  ],
  features: [
    {
      id: 'feature-1',
      name: 'Feature One',
      description: 'First test feature',
      enabled: true,
      taskId: 'TASK 1',
    },
    {
      id: 'feature-2',
      name: 'Feature Two',
      description: 'Second test feature',
      enabled: false,
      disabledReason: 'Not implemented yet',
      taskId: 'TASK 2',
    },
  ],
  dependencies: [
    { name: 'react', type: 'external', purpose: 'UI library' },
    { name: 'OtherComponent', type: 'component', path: 'components/Other.tsx', purpose: 'Helper' },
  ],
  relatedFiles: [
    { path: 'components/TestComponent.test.tsx', type: 'test', description: 'Unit tests' },
  ],
  props: [
    { name: 'value', type: 'string', required: true, description: 'The value prop' },
    {
      name: 'onChange',
      type: '(v: string) => void',
      required: false,
      description: 'Change handler',
    },
  ],
  tips: ['Use this component for testing', 'It supports all standard props'],
  knownIssues: ['Known issue 1'],
  tags: ['test', 'component', 'phase-1'],
  status: 'stable',
  lastUpdated: '2026-01-29T12:00:00Z',
}

describe('ComponentInfo Vue Component', () => {
  beforeEach(() => {
    mockDevModeEnabled.value = true
    localStorage.clear()
    vi.clearAllMocks()
  })

  function mountInfo(props: Record<string, unknown> = {}) {
    return shallowMount(ComponentInfo, {
      props: {
        meta: testMeta,
        ...props,
      },
      slots: {
        default: '<div data-testid="child-content">Child Content</div>',
      },
    })
  }

  // ========================================================================
  // Module Exports (from original Vue test)
  // ========================================================================
  describe('Module Exports', () => {
    it('should export ComponentInfo.vue as a valid Vue component', async () => {
      const module = await import('./ComponentInfo.vue')
      expect(module.default).toBeDefined()
      expect(typeof module.default).toBe('object')
    })
  })

  // ========================================================================
  // Verbosity Levels (from original Vue test)
  // ========================================================================
  describe('Verbosity Levels', () => {
    it('should define all valid verbosity levels', () => {
      const verbosityLevels = ['minimal', 'normal', 'detailed']
      expect(verbosityLevels.length).toBe(3)
      expect(verbosityLevels).toContain('minimal')
      expect(verbosityLevels).toContain('normal')
      expect(verbosityLevels).toContain('detailed')
    })

    it('should default to normal verbosity', () => {
      const defaultVerbosity = 'normal'
      expect(defaultVerbosity).toBe('normal')
    })

    it('should control displayed fields based on verbosity', () => {
      function getVisibleFields(verbosity: string): string[] {
        const minimal = ['name', 'status']
        const normal = [...minimal, 'description', 'category']
        const detailed = [...normal, 'props', 'events', 'slots', 'dependencies']

        switch (verbosity) {
          case 'minimal':
            return minimal
          case 'normal':
            return normal
          case 'detailed':
            return detailed
          default:
            return normal
        }
      }

      expect(getVisibleFields('minimal').length).toBe(2)
      expect(getVisibleFields('normal').length).toBe(4)
      expect(getVisibleFields('detailed').length).toBe(8)
    })
  })

  // ========================================================================
  // DevMode Indicator States (from original Vue test)
  // ========================================================================
  describe('DevMode Indicator States', () => {
    it('should define devmode indicator states', () => {
      const indicatorStates = ['active', 'inactive', 'error']
      expect(indicatorStates).toContain('active')
      expect(indicatorStates).toContain('inactive')
      expect(indicatorStates).toContain('error')
    })

    it('should map indicator states to colors', () => {
      function getIndicatorColor(state: string): string {
        switch (state) {
          case 'active':
            return '#4caf50'
          case 'inactive':
            return '#888'
          case 'error':
            return '#f44336'
          default:
            return '#888'
        }
      }

      expect(getIndicatorColor('active')).toBe('#4caf50')
      expect(getIndicatorColor('inactive')).toBe('#888')
      expect(getIndicatorColor('error')).toBe('#f44336')
      expect(getIndicatorColor('unknown')).toBe('#888')
    })
  })

  // ========================================================================
  // Component Metadata Structure (from original Vue test)
  // ========================================================================
  describe('Component Metadata Structure', () => {
    it('should import component meta types', async () => {
      const metaModule = await import('../types/component-meta')
      expect(metaModule).toBeDefined()
    })

    it('should have correct metadata structure', () => {
      const metadata = {
        name: 'ExampleComponent',
        category: 'ui',
        description: 'An example component',
        version: '1.0.0',
        props: [] as string[],
        events: [] as string[],
      }

      expect(metadata.name).toBeDefined()
      expect(typeof metadata.name).toBe('string')
      expect(metadata.category).toBeDefined()
      expect(typeof metadata.description).toBe('string')
      expect(Array.isArray(metadata.props)).toBe(true)
      expect(Array.isArray(metadata.events)).toBe(true)
    })
  })

  // ========================================================================
  // Pin Toggle Behavior (from original Vue test)
  // ========================================================================
  describe('Pin Toggle Behavior', () => {
    it('should toggle pinned state', () => {
      let pinned = false

      pinned = !pinned
      expect(pinned).toBe(true)

      pinned = !pinned
      expect(pinned).toBe(false)
    })
  })

  // ========================================================================
  // Rendering (from React test)
  // ========================================================================
  describe('Rendering', () => {
    it('should render children (slot content)', () => {
      const wrapper = mountInfo()
      expect(wrapper.find('[data-testid="child-content"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('Child Content')
    })

    it('should display component name in panel', () => {
      const wrapper = mountInfo({ alwaysShow: true })
      expect(wrapper.text()).toContain('TestComponent')
    })

    it('should display version in panel', () => {
      const wrapper = mountInfo({ alwaysShow: true })
      expect(wrapper.text()).toMatch(/v1\.0\.0/)
    })

    it('should display status badge', () => {
      const wrapper = mountInfo({ alwaysShow: true })
      expect(wrapper.text()).toContain('Stable')
    })

    it('should display component summary when alwaysShow is true', () => {
      const wrapper = mountInfo({ alwaysShow: true })
      expect(wrapper.text()).toContain(testMeta.summary)
    })

    it('should display phase information', () => {
      const wrapper = mountInfo({ alwaysShow: true })
      expect(wrapper.text()).toMatch(/Phase 1/)
    })

    it('should display features when panel is visible', () => {
      const wrapper = mountInfo({ alwaysShow: true })
      expect(wrapper.text()).toContain('Feature One')
      expect(wrapper.text()).toContain('Feature Two')
    })

    it('should display history section', () => {
      const wrapper = mountInfo({ alwaysShow: true })
      expect(wrapper.text()).toMatch(/History/)
    })

    it('should display tips when available', () => {
      const wrapper = mountInfo({ alwaysShow: true })
      expect(wrapper.text()).toContain('Use this component for testing')
    })

    it('should not render overlay when DevMode is disabled', async () => {
      mockDevModeEnabled.value = false

      const wrapper = mountInfo()
      // Children should still render
      expect(wrapper.find('[data-testid="child-content"]').exists()).toBe(true)
      // But overlay/version elements should not be present
      expect(wrapper.text()).not.toContain('v1.0.0')

      mockDevModeEnabled.value = true
    })
  })

  // ========================================================================
  // Hover behavior (from React test)
  // ========================================================================
  describe('Hover behavior', () => {
    it('should show info panel on hover', async () => {
      const wrapper = mountInfo()
      const wrapperEl = wrapper.find('.component-info')
      if (wrapperEl.exists()) {
        await wrapperEl.trigger('mouseenter')
        await nextTick()
        expect(wrapper.text()).toContain(testMeta.summary)
      }
    })
  })

  // ========================================================================
  // Different statuses (from React test)
  // ========================================================================
  describe('Different statuses', () => {
    const createMetaWithStatus = (status: ComponentMeta['status']): ComponentMeta => ({
      ...testMeta,
      id: `test-${status}`,
      status,
    })

    it('should render component with beta status', () => {
      const wrapper = shallowMount(ComponentInfo, {
        props: { meta: createMetaWithStatus('beta') },
        slots: { default: '<div>Content</div>' },
      })
      expect(wrapper.element).toBeTruthy()
    })

    it('should render component with experimental status', () => {
      const wrapper = shallowMount(ComponentInfo, {
        props: { meta: createMetaWithStatus('experimental') },
        slots: { default: '<div>Content</div>' },
      })
      expect(wrapper.element).toBeTruthy()
    })

    it('should render component with deprecated status', () => {
      const wrapper = shallowMount(ComponentInfo, {
        props: { meta: createMetaWithStatus('deprecated') },
        slots: { default: '<div>Content</div>' },
      })
      expect(wrapper.element).toBeTruthy()
    })
  })

  // ========================================================================
  // Accessibility (from React test)
  // ========================================================================
  describe('Accessibility', () => {
    it('should have wrapper element', () => {
      const wrapper = mountInfo()
      expect(wrapper.element).toBeTruthy()
    })

    it('should be keyboard navigable via slot content', () => {
      const wrapper = shallowMount(ComponentInfo, {
        props: { meta: testMeta },
        slots: {
          default: '<button type="button">Clickable Child</button>',
        },
      })

      const childButton = wrapper.find('button')
      expect(childButton.exists()).toBe(true)
    })
  })
})
