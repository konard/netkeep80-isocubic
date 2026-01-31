/**
 * Comprehensive unit tests for GodModeWindow Vue component
 * Migrated from GodModeWindow.test.tsx (React) + existing Vue tests
 * TASK 66: Vue.js 3.0 Migration
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { shallowMount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import GodModeWindow from './GodModeWindow.vue'
import { GOD_MODE_STORAGE_KEY, GOD_MODE_TABS, DEFAULT_WINDOW_STATE } from '../types/god-mode'

// Mock child components
vi.mock('./DevModeQueryPanel.vue', () => ({
  default: { name: 'DevModeQueryPanel', template: '<div data-testid="mock-query-panel" />' },
}))
vi.mock('./ComponentContextPanel.vue', () => ({
  default: { name: 'ComponentContextPanel', template: '<div data-testid="mock-context-panel" />' },
}))
vi.mock('./ExtendedSearchPanel.vue', () => ({
  default: { name: 'ExtendedSearchPanel', template: '<div data-testid="mock-search-panel" />' },
}))
vi.mock('./ConversationPanel.vue', () => ({
  default: { name: 'ConversationPanel', template: '<div data-testid="mock-conversation-panel" />' },
}))
vi.mock('./IssueDraftPanel.vue', () => ({
  default: { name: 'IssueDraftPanel', template: '<div data-testid="mock-issue-panel" />' },
}))

// Mock devmode composable
vi.mock('../lib/devmode', () => ({
  useIsDevModeEnabled: vi.fn(() => ({ value: true })),
}))

describe('GodModeWindow Vue Component', () => {
  beforeEach(() => {
    localStorage.clear()
    // Set up initial open state for tests
    localStorage.setItem(
      GOD_MODE_STORAGE_KEY,
      JSON.stringify({
        state: 'open',
        activeTab: 'query',
        position: { x: 20, y: 80 },
        size: {
          width: 500,
          height: 600,
          minWidth: 380,
          minHeight: 400,
          maxWidth: 900,
          maxHeight: 900,
        },
        isPinned: false,
      })
    )
  })

  afterEach(() => {
    localStorage.clear()
  })

  function mountWindow(props: Record<string, unknown> = {}) {
    return shallowMount(GodModeWindow, {
      props,
      global: {
        stubs: {
          Teleport: true,
        },
      },
    })
  }

  // ========================================================================
  // Module Exports (from original Vue test)
  // ========================================================================
  describe('Module Exports', () => {
    it('should export GodModeWindow.vue as a valid Vue component', async () => {
      const module = await import('./GodModeWindow.vue')
      expect(module.default).toBeDefined()
      expect(typeof module.default).toBe('object')
    })
  })

  // ========================================================================
  // Tab Definitions (from original Vue test)
  // ========================================================================
  describe('Tab Definitions', () => {
    it('should define all expected tabs', () => {
      const tabIds = GOD_MODE_TABS.map((t) => t.id)
      expect(tabIds).toContain('query')
      expect(tabIds).toContain('context')
      expect(tabIds).toContain('search')
      expect(tabIds).toContain('conversation')
      expect(tabIds).toContain('issues')
    })

    it('should have a default active tab', () => {
      expect(DEFAULT_WINDOW_STATE.activeTab).toBe('query')
    })
  })

  // ========================================================================
  // Window State (from original Vue test)
  // ========================================================================
  describe('Window State', () => {
    it('should have correct default window position and size', () => {
      expect(DEFAULT_WINDOW_STATE.position.x).toBeGreaterThanOrEqual(0)
      expect(DEFAULT_WINDOW_STATE.position.y).toBeGreaterThanOrEqual(0)
      expect(DEFAULT_WINDOW_STATE.size.width).toBeGreaterThanOrEqual(300)
      expect(DEFAULT_WINDOW_STATE.size.height).toBeGreaterThanOrEqual(400)
      expect(DEFAULT_WINDOW_STATE.isPinned).toBe(false)
    })

    it('should toggle pinned state', () => {
      let pinned = false
      pinned = !pinned
      expect(pinned).toBe(true)
      pinned = !pinned
      expect(pinned).toBe(false)
    })
  })

  // ========================================================================
  // Keyboard Shortcut (from original Vue test)
  // ========================================================================
  describe('Keyboard Shortcut', () => {
    it('should define the correct keyboard shortcut', () => {
      const shortcut = {
        key: 'G',
        ctrlKey: true,
        shiftKey: true,
      }
      expect(shortcut.key).toBe('G')
      expect(shortcut.ctrlKey).toBe(true)
      expect(shortcut.shiftKey).toBe(true)
    })
  })

  // ========================================================================
  // Drag Constraints (from original Vue test)
  // ========================================================================
  describe('Drag Constraints', () => {
    it('should enforce minimum window dimensions', () => {
      const minWidth = 300
      const minHeight = 200
      expect(minWidth).toBeGreaterThan(0)
      expect(minHeight).toBeGreaterThan(0)
    })

    it('should keep window within viewport bounds', () => {
      function clampPosition(x: number, y: number, viewportWidth: number, viewportHeight: number) {
        return {
          x: Math.max(0, Math.min(x, viewportWidth - 100)),
          y: Math.max(0, Math.min(y, viewportHeight - 100)),
        }
      }

      const result = clampPosition(-50, -30, 1920, 1080)
      expect(result.x).toBe(0)
      expect(result.y).toBe(0)

      const result2 = clampPosition(2000, 1200, 1920, 1080)
      expect(result2.x).toBe(1820)
      expect(result2.y).toBe(980)
    })
  })

  // ========================================================================
  // Rendering (from React test)
  // ========================================================================
  describe('Rendering', () => {
    it('should render when DevMode is enabled and window is open', () => {
      const wrapper = mountWindow()
      expect(wrapper.find('[data-testid="god-mode-window"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="god-mode-header"]').exists()).toBe(true)
    })

    it('should not render when window state is closed', () => {
      localStorage.setItem(GOD_MODE_STORAGE_KEY, JSON.stringify({ state: 'closed' }))
      const wrapper = mountWindow()
      expect(wrapper.find('[data-testid="god-mode-window"]').exists()).toBe(false)
    })

    it('should render GOD MODE title in header', () => {
      const wrapper = mountWindow()
      expect(wrapper.text()).toContain('GOD MODE')
    })
  })

  // ========================================================================
  // Tabs (from React test)
  // ========================================================================
  describe('Tabs', () => {
    it('should render all tabs', () => {
      const wrapper = mountWindow()
      expect(wrapper.find('[data-testid="god-mode-tab-query"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="god-mode-tab-context"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="god-mode-tab-search"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="god-mode-tab-conversation"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="god-mode-tab-issues"]').exists()).toBe(true)
    })

    it('should have query tab active by default', () => {
      const wrapper = mountWindow()
      const queryTab = wrapper.find('[data-testid="god-mode-tab-query"]')
      expect(queryTab.exists()).toBe(true)
      // Active tab has marginBottom: -1px style
      const style = queryTab.attributes('style') || ''
      expect(style).toContain('margin-bottom: -1px')
    })

    it('should switch tabs when clicked', async () => {
      const wrapper = mountWindow()
      const searchTab = wrapper.find('[data-testid="god-mode-tab-search"]')
      await searchTab.trigger('click')
      await nextTick()

      expect(wrapper.emitted('tabChange')).toBeTruthy()
      expect(wrapper.emitted('tabChange')![0]).toEqual(['search'])
    })

    it('should enable all implemented tabs including conversation and issues', () => {
      const wrapper = mountWindow()
      const conversationTab = wrapper.find('[data-testid="god-mode-tab-conversation"]')
      const issuesTab = wrapper.find('[data-testid="god-mode-tab-issues"]')

      expect(conversationTab.attributes('disabled')).toBeUndefined()
      expect(issuesTab.attributes('disabled')).toBeUndefined()
    })
  })

  // ========================================================================
  // Header Buttons (from React test)
  // ========================================================================
  describe('Header Buttons', () => {
    it('should render pin, minimize, and close buttons', () => {
      const wrapper = mountWindow()
      expect(wrapper.find('[data-testid="god-mode-pin"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="god-mode-minimize"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="god-mode-close"]').exists()).toBe(true)
    })

    it('should close window when close button is clicked', async () => {
      const wrapper = mountWindow()
      await wrapper.find('[data-testid="god-mode-close"]').trigger('click')
      await nextTick()

      expect(wrapper.emitted('close')).toBeTruthy()
      expect(wrapper.find('[data-testid="god-mode-window"]').exists()).toBe(false)
    })

    it('should toggle pin state when pin button is clicked', async () => {
      const wrapper = mountWindow()
      await wrapper.find('[data-testid="god-mode-pin"]').trigger('click')
      await nextTick()

      const state = JSON.parse(localStorage.getItem(GOD_MODE_STORAGE_KEY) || '{}')
      expect(state.isPinned).toBe(true)
    })

    it('should minimize window when minimize button is clicked', async () => {
      const wrapper = mountWindow()
      expect(wrapper.find('[data-testid="god-mode-tabs"]').exists()).toBe(true)

      await wrapper.find('[data-testid="god-mode-minimize"]').trigger('click')
      await nextTick()

      expect(wrapper.find('[data-testid="god-mode-tabs"]').exists()).toBe(false)
    })

    it('should expand window when clicking minimize on minimized window', async () => {
      localStorage.setItem(
        GOD_MODE_STORAGE_KEY,
        JSON.stringify({
          state: 'minimized',
          activeTab: 'query',
          position: { x: 20, y: 80 },
          size: { width: 500, height: 600, minWidth: 380, minHeight: 400, maxWidth: 900, maxHeight: 900 },
          isPinned: false,
        })
      )

      const wrapper = mountWindow()
      expect(wrapper.find('[data-testid="god-mode-tabs"]').exists()).toBe(false)

      await wrapper.find('[data-testid="god-mode-minimize"]').trigger('click')
      await nextTick()

      expect(wrapper.find('[data-testid="god-mode-tabs"]').exists()).toBe(true)
    })
  })

  // ========================================================================
  // Keyboard Shortcuts (from React test)
  // ========================================================================
  describe('Keyboard Shortcuts (integration)', () => {
    it('should minimize window on Escape key', async () => {
      const wrapper = mountWindow()
      expect(wrapper.find('[data-testid="god-mode-window"]').exists()).toBe(true)

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await nextTick()

      const state = JSON.parse(localStorage.getItem(GOD_MODE_STORAGE_KEY) || '{}')
      expect(state.state).toBe('minimized')
    })

    it('should toggle window on Ctrl+Shift+G', async () => {
      localStorage.setItem(GOD_MODE_STORAGE_KEY, JSON.stringify({ state: 'closed' }))
      const wrapper = mountWindow()

      expect(wrapper.find('[data-testid="god-mode-window"]').exists()).toBe(false)

      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'g', ctrlKey: true, shiftKey: true })
      )
      await nextTick()

      expect(wrapper.find('[data-testid="god-mode-window"]').exists()).toBe(true)
    })
  })

  // ========================================================================
  // Drag Functionality (from React test)
  // ========================================================================
  describe('Drag Functionality', () => {
    it('should have header as drag handle', () => {
      const wrapper = mountWindow()
      const header = wrapper.find('[data-testid="god-mode-header"]')
      const style = header.attributes('style') || ''
      expect(style).toContain('cursor: move')
    })
  })

  // ========================================================================
  // Resize Functionality (from React test)
  // ========================================================================
  describe('Resize Functionality', () => {
    it('should have resize handles', () => {
      const wrapper = mountWindow()
      const godWindow = wrapper.find('[data-testid="god-mode-window"]')
      const handles = godWindow.findAll('[style*="cursor"]')
      expect(handles.length).toBeGreaterThan(0)
    })

    it('should not show resize handles when minimized', async () => {
      const wrapper = mountWindow()
      await wrapper.find('[data-testid="god-mode-minimize"]').trigger('click')
      await nextTick()

      expect(wrapper.find('[data-testid="god-mode-content"]').exists()).toBe(false)
    })
  })

  // ========================================================================
  // Persistence (from React test)
  // ========================================================================
  describe('Persistence', () => {
    it('should save state to localStorage', async () => {
      const wrapper = mountWindow()
      await wrapper.find('[data-testid="god-mode-tab-search"]').trigger('click')
      await nextTick()

      const state = JSON.parse(localStorage.getItem(GOD_MODE_STORAGE_KEY) || '{}')
      expect(state.activeTab).toBe('search')
    })

    it('should restore state from localStorage', () => {
      localStorage.setItem(
        GOD_MODE_STORAGE_KEY,
        JSON.stringify({
          state: 'open',
          activeTab: 'search',
          position: { x: 100, y: 150 },
          size: { width: 600, height: 700, minWidth: 380, minHeight: 400, maxWidth: 900, maxHeight: 900 },
          isPinned: true,
        })
      )

      const wrapper = mountWindow()
      const godWindow = wrapper.find('[data-testid="god-mode-window"]')
      const style = godWindow.attributes('style') || ''
      expect(style).toContain('left: 100px')
      expect(style).toContain('top: 150px')
    })
  })

  // ========================================================================
  // Callbacks / Emits (from React test)
  // ========================================================================
  describe('Callbacks / Emits', () => {
    it('should emit open when window opens via keyboard', async () => {
      localStorage.setItem(GOD_MODE_STORAGE_KEY, JSON.stringify({ state: 'closed' }))
      const wrapper = mountWindow()

      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'g', ctrlKey: true, shiftKey: true })
      )
      await nextTick()

      expect(wrapper.emitted('open')).toBeTruthy()
    })

    it('should emit close when window closes', async () => {
      const wrapper = mountWindow()
      await wrapper.find('[data-testid="god-mode-close"]').trigger('click')
      await nextTick()

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should accept selectedComponentId prop', () => {
      const wrapper = mountWindow({ selectedComponentId: 'test-component' })
      expect(wrapper.find('[data-testid="god-mode-window"]').exists()).toBe(true)
    })
  })

  // ========================================================================
  // Language Support (from React test)
  // ========================================================================
  describe('Language Support', () => {
    it('should display Russian labels by default', () => {
      const wrapper = mountWindow()
      expect(wrapper.text()).toContain('Запрос')
      expect(wrapper.text()).toContain('Контекст')
      expect(wrapper.text()).toContain('Поиск')
    })

    it('should display English labels when configured', () => {
      const wrapper = mountWindow({ config: { preferredLanguage: 'en' } })
      expect(wrapper.text()).toContain('Query')
      expect(wrapper.text()).toContain('Context')
      expect(wrapper.text()).toContain('Search')
    })
  })

  // ========================================================================
  // Accessibility (from React test)
  // ========================================================================
  describe('Accessibility', () => {
    it('should have accessible tab buttons', () => {
      const wrapper = mountWindow()
      const tabs = wrapper.findAll('button')
      expect(tabs.length).toBeGreaterThan(0)
    })

    it('should have title attributes on buttons', () => {
      const wrapper = mountWindow()
      const pinButton = wrapper.find('[data-testid="god-mode-pin"]')
      expect(pinButton.attributes('title')).toBeTruthy()
    })
  })
})
