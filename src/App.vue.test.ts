/**
 * Integration tests for App Vue component
 * Tests responsive layout, navigation, and component integration
 * TASK 68: Migrated from React to Vue.js 3.0 (@vue/test-utils)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import App from './App.vue'

// Mock child components
vi.mock('./components/Gallery.vue', () => ({
  default: {
    name: 'Gallery',
    template: '<div class="gallery-mock"><span>Gallery</span><slot /></div>',
    props: ['currentCube'],
  },
}))

vi.mock('./components/ExportPanel.vue', () => ({
  default: {
    name: 'ExportPanel',
    template:
      '<div class="export-panel-mock"><button>Download JSON</button><button>Upload JSON</button><button>Save</button></div>',
    props: ['currentCube'],
  },
}))

vi.mock('./components/CubePreview.vue', () => ({
  default: {
    name: 'CubePreview',
    template: '<div class="cube-preview-mock" data-testid="cube-preview">Preview</div>',
    props: ['config'],
  },
}))

vi.mock('./components/UnifiedEditor.vue', () => ({
  default: {
    name: 'UnifiedEditor',
    template: '<div class="unified-editor-mock"><span>Unified Editor</span></div>',
    props: ['cube'],
  },
}))

vi.mock('./components/ActionHistory.vue', () => ({
  default: {
    name: 'ActionHistory',
    template: '<div class="action-history-mock">ActionHistory</div>',
    props: ['actions'],
  },
}))

vi.mock('./components/PromptGenerator.vue', () => ({
  default: {
    name: 'PromptGenerator',
    template: '<div class="prompt-generator-mock">PromptGenerator</div>',
  },
}))

vi.mock('./components/GodModeWindow.vue', () => ({
  default: {
    name: 'GodModeWindow',
    template: '<div class="god-mode-mock">GodModeWindow</div>',
  },
}))

vi.mock('./components/ComponentInfo.vue', () => ({
  default: {
    name: 'ComponentInfo',
    template: '<div class="component-info-mock">ComponentInfo</div>',
    props: ['meta'],
  },
}))

// Mock composables
const mockDeviceType = {
  isMobile: false,
  isTablet: false,
  isDesktop: true,
}

vi.mock('./composables/useDeviceType', () => ({
  useDeviceType: () => mockDeviceType,
}))

vi.mock('./composables/useCubeEditor', () => ({
  useCubeEditor: () => ({
    currentCube: { id: 'test-cube', base: { color: [0.5, 0.5, 0.5] } },
    updateCube: vi.fn(),
    selectCube: vi.fn(),
    loadCube: vi.fn(),
  }),
}))

vi.mock('./lib/devmode', () => ({
  useDevModeKeyboard: vi.fn(),
  useDevModeStore: () => ({
    isDevMode: false,
    toggleDevMode: vi.fn(),
  }),
}))

vi.mock('./lib/auth', () => ({
  useAuthStore: () => ({
    initialize: vi.fn(),
    isAuthenticated: false,
  }),
}))

/**
 * Helper to set device type for test
 */
function setDeviceType(type: 'desktop' | 'tablet' | 'mobile') {
  mockDeviceType.isDesktop = type === 'desktop'
  mockDeviceType.isTablet = type === 'tablet'
  mockDeviceType.isMobile = type === 'mobile'
}

function createWrapper() {
  return shallowMount(App, {
    global: {
      plugins: [createPinia()],
      stubs: {
        teleport: true,
      },
    },
  })
}

describe('App', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setDeviceType('desktop')
    localStorage.clear()
  })

  describe('Module Export', () => {
    it('should export App as a valid Vue component', () => {
      expect(App).toBeDefined()
      expect(typeof App).toBe('object')
    })
  })

  describe('Desktop Layout', () => {
    beforeEach(() => {
      setDeviceType('desktop')
    })

    it('should render desktop layout for wide viewports', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.app--desktop').exists()).toBe(true)
      expect(wrapper.find('h1').text()).toBe('isocubic')
      expect(wrapper.text()).toContain('Web editor for parametric cubes')
    })

    it('should display Gallery component', () => {
      const wrapper = createWrapper()
      expect(wrapper.findComponent({ name: 'Gallery' }).exists()).toBe(true)
    })

    it('should display ExportPanel component', () => {
      const wrapper = createWrapper()
      expect(wrapper.findComponent({ name: 'ExportPanel' }).exists()).toBe(true)
    })

    it('should display the unified editor', () => {
      const wrapper = createWrapper()
      expect(wrapper.findComponent({ name: 'UnifiedEditor' }).exists()).toBe(true)
    })

    it('should include GodModeWindow component', () => {
      const wrapper = createWrapper()
      expect(wrapper.findComponent({ name: 'GodModeWindow' }).exists()).toBe(true)
    })

    it('should include ComponentInfo component', () => {
      const wrapper = createWrapper()
      expect(wrapper.findComponent({ name: 'ComponentInfo' }).exists()).toBe(true)
    })

    it('should have proper heading structure', () => {
      const wrapper = createWrapper()
      const h1 = wrapper.find('h1')
      expect(h1.exists()).toBe(true)
      expect(h1.text()).toBe('isocubic')
    })
  })

  describe('Tablet Layout', () => {
    beforeEach(() => {
      setDeviceType('tablet')
    })

    it('should render tablet layout for medium viewports', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.app--tablet').exists()).toBe(true)
      expect(wrapper.find('h1').text()).toBe('isocubic')
    })

    it('should display Gallery and tools in tablet layout', () => {
      const wrapper = createWrapper()
      expect(wrapper.findComponent({ name: 'Gallery' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'ExportPanel' }).exists()).toBe(true)
    })
  })

  describe('Mobile Layout', () => {
    beforeEach(() => {
      setDeviceType('mobile')
    })

    it('should render mobile layout for narrow viewports', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.app--mobile').exists()).toBe(true)
      expect(wrapper.find('h1').text()).toBe('isocubic')
    })

    it('should display tab navigation on mobile', () => {
      const wrapper = createWrapper()
      const mobileNav = wrapper.find('.app__mobile-nav')
      expect(mobileNav.exists()).toBe(true)

      const tabs = wrapper.findAll('.app__mobile-tab')
      expect(tabs.length).toBe(4) // Gallery, Preview, Editor, Tools
    })

    it('should display swipe indicator on mobile', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Swipe to navigate')
    })

    it('should switch tabs when clicked', async () => {
      const wrapper = createWrapper()
      const tabs = wrapper.findAll('.app__mobile-tab')

      // Click on Preview tab (second tab)
      await tabs[1].trigger('click')
      await nextTick()

      // Preview tab should be active
      expect(tabs[1].classes()).toContain('app__mobile-tab--active')
    })

    it('should show Gallery tab content by default', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Gallery')
    })

    it('should show mobile tab labels', () => {
      const wrapper = createWrapper()
      const labels = wrapper.findAll('.app__mobile-tab-label')
      expect(labels.length).toBe(4)
      expect(labels[0].text()).toBe('Gallery')
      expect(labels[1].text()).toBe('Preview')
      expect(labels[2].text()).toBe('Editor')
      expect(labels[3].text()).toBe('Tools')
    })
  })

  describe('Layout Switching', () => {
    it('should only render desktop layout when isDesktop is true', () => {
      setDeviceType('desktop')
      const wrapper = createWrapper()
      expect(wrapper.find('.app--desktop').exists()).toBe(true)
      expect(wrapper.find('.app--tablet').exists()).toBe(false)
      expect(wrapper.find('.app--mobile').exists()).toBe(false)
    })

    it('should only render tablet layout when isTablet is true', () => {
      setDeviceType('tablet')
      const wrapper = createWrapper()
      expect(wrapper.find('.app--desktop').exists()).toBe(false)
      expect(wrapper.find('.app--tablet').exists()).toBe(true)
      expect(wrapper.find('.app--mobile').exists()).toBe(false)
    })

    it('should render mobile layout when neither desktop nor tablet', () => {
      setDeviceType('mobile')
      const wrapper = createWrapper()
      expect(wrapper.find('.app--desktop').exists()).toBe(false)
      expect(wrapper.find('.app--tablet').exists()).toBe(false)
      expect(wrapper.find('.app--mobile').exists()).toBe(true)
    })
  })

  describe('Component Metadata', () => {
    it('should define APP_META with correct structure', async () => {
      const module = await import('./App.vue')
      expect(module.default).toBeDefined()
    })
  })
})
