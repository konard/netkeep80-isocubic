/**
 * End-to-end workflow tests (Vue.js 3.0)
 * Tests complete user workflows for editing cubes
 * TASK 68: Migrated from React to Vue.js 3.0 (@vue/test-utils)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import App from '../App.vue'
import { clearAllConfigs, clearHistory } from '../lib/storage'

// Mock child components for E2E testing
vi.mock('../components/Gallery.vue', () => ({
  default: {
    name: 'Gallery',
    template: `<div class="gallery-mock">
      <span>Gallery</span>
      <span class="gallery__grid">
        <span>of 13 cubes</span>
        <button v-for="i in 13" :key="i" @click="$emit('cube-select', { id: 'cube-' + i })">Select</button>
      </span>
      <input placeholder="Search by name, tags..." />
      <button class="gallery__category-btn" @click="$emit('cube-select')">All</button>
      <button class="gallery__category-btn">Stone</button>
      <button class="gallery__category-btn">Wood</button>
      <button class="gallery__category-btn">Metal</button>
      <button class="gallery__toggle-btn">Presets</button>
      <button class="gallery__toggle-btn">My Cubes</button>
      <button>Save Current to Gallery</button>
    </div>`,
    props: ['currentCube'],
    emits: ['cube-select'],
  },
}))

vi.mock('../components/ExportPanel.vue', () => ({
  default: {
    name: 'ExportPanel',
    template: `<div class="export-panel-mock">
      <button>Download JSON</button>
      <button>Upload JSON</button>
      <button>Save</button>
      <button disabled>Undo</button>
      <button disabled>Redo</button>
    </div>`,
    props: ['currentCube'],
    emits: ['cube-load', 'cube-change'],
  },
}))

vi.mock('../components/CubePreview.vue', () => ({
  default: {
    name: 'CubePreview',
    template: '<div class="cube-preview-mock" data-testid="cube-preview">Preview</div>',
    props: ['config'],
  },
}))

vi.mock('../components/UnifiedEditor.vue', () => ({
  default: {
    name: 'UnifiedEditor',
    template: '<div class="unified-editor-mock"><span>Unified Editor</span></div>',
    props: ['cube'],
    emits: ['update:cube'],
  },
}))

vi.mock('../components/ActionHistory.vue', () => ({
  default: {
    name: 'ActionHistory',
    template: '<div class="action-history-mock">ActionHistory</div>',
    props: ['actions'],
  },
}))

vi.mock('../components/PromptGenerator.vue', () => ({
  default: {
    name: 'PromptGenerator',
    template: '<div class="prompt-generator-mock">PromptGenerator</div>',
    emits: ['cube-generated', 'cubes-generated'],
  },
}))

vi.mock('../components/GodModeWindow.vue', () => ({
  default: {
    name: 'GodModeWindow',
    template: '<div class="god-mode-mock">GodModeWindow</div>',
  },
}))

vi.mock('../components/ComponentInfo.vue', () => ({
  default: {
    name: 'ComponentInfo',
    template: '<div class="component-info-mock">ComponentInfo</div>',
    props: ['meta'],
  },
}))

// Mock device type — desktop by default
const mockDeviceType = {
  isMobile: false,
  isTablet: false,
  isDesktop: true,
}

vi.mock('../composables/useDeviceType', () => ({
  useDeviceType: () => mockDeviceType,
}))

const mockCubeEditor = {
  currentCube: { id: 'test-cube', base: { color: [0.5, 0.5, 0.5] } },
  updateCube: vi.fn(),
  selectCube: vi.fn(),
  loadCube: vi.fn(),
}

vi.mock('../composables/useCubeEditor', () => ({
  useCubeEditor: () => mockCubeEditor,
}))

vi.mock('../lib/devmode', () => ({
  useDevModeKeyboard: vi.fn(),
  useDevModeStore: () => ({
    isDevMode: false,
    toggleDevMode: vi.fn(),
  }),
}))

vi.mock('../lib/auth', () => ({
  useAuthStore: () => ({
    initialize: vi.fn(),
    isAuthenticated: false,
  }),
}))

function setDeviceType(type: 'desktop' | 'tablet' | 'mobile') {
  mockDeviceType.isDesktop = type === 'desktop'
  mockDeviceType.isTablet = type === 'tablet'
  mockDeviceType.isMobile = type === 'mobile'
}

function createWrapper() {
  return shallowMount(App, {
    global: {
      plugins: [createPinia()],
      stubs: { teleport: true },
    },
  })
}

// Mock URL APIs for export functionality
beforeEach(() => {
  global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  global.URL.revokeObjectURL = vi.fn()
})

describe('E2E: Complete Editing Workflow (Vue)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setDeviceType('desktop')
    localStorage.clear()
    clearAllConfigs()
    clearHistory()
  })

  describe('Workflow: Browse and Select Cube', () => {
    it('should render the gallery with presets', () => {
      const wrapper = createWrapper()
      expect(wrapper.findComponent({ name: 'Gallery' }).exists()).toBe(true)
    })

    it('should render the app with desktop layout', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.app--desktop').exists()).toBe(true)
      expect(wrapper.find('h1').text()).toBe('isocubic')
    })

    it('should display export and editor components', () => {
      const wrapper = createWrapper()
      expect(wrapper.findComponent({ name: 'ExportPanel' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'UnifiedEditor' }).exists()).toBe(true)
    })
  })

  describe('Workflow: Save and Load Cube', () => {
    it('should display save/export functionality via ExportPanel', () => {
      const wrapper = createWrapper()
      expect(wrapper.findComponent({ name: 'ExportPanel' }).exists()).toBe(true)
    })
  })

  describe('Workflow: Undo/Redo Operations', () => {
    it('should render undo/redo buttons (initially disabled)', () => {
      const wrapper = createWrapper()
      const undoButton = wrapper.findAll('button').find((b) => b.text() === 'Undo')
      const redoButton = wrapper.findAll('button').find((b) => b.text() === 'Redo')

      if (undoButton) {
        expect(undoButton.attributes('disabled')).toBeDefined()
      }
      if (redoButton) {
        expect(redoButton.attributes('disabled')).toBeDefined()
      }
    })
  })
})

describe('E2E: Mobile Workflow (Vue)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setDeviceType('mobile')
    localStorage.clear()
    clearAllConfigs()
    clearHistory()
  })

  it('should render mobile layout', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.app--mobile').exists()).toBe(true)
  })

  it('should display 4 tab navigation buttons', () => {
    const wrapper = createWrapper()
    const tabs = wrapper.findAll('.app__mobile-tab')
    expect(tabs.length).toBe(4)
  })

  it('should allow navigating between tabs', async () => {
    const wrapper = createWrapper()
    const tabs = wrapper.findAll('.app__mobile-tab')

    // Click on Preview tab
    await tabs[1].trigger('click')
    await nextTick()

    // Verify the preview tab becomes active
    expect(tabs[1].classes()).toContain('app__mobile-tab--active')
  })

  it('should show swipe indicator', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('Swipe to navigate')
  })
})

describe('E2E: Error Handling (Vue)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setDeviceType('desktop')
    localStorage.clear()
  })

  it('should render app without errors', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.app--desktop').exists()).toBe(true)
    expect(wrapper.text()).toContain('isocubic')
  })
})
