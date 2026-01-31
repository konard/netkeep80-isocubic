/**
 * GodModeProvider Tests
 *
 * Tests for the GOD MODE Vue provide/inject provider from @isocubic/god-mode library.
 *
 * TASK 59: GOD MODE Library Extraction (Phase 9)
 * TASK 61: Migrated from React testing to Vue testing (Phase 10)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { defineComponent, h, inject } from 'vue'
import { mount } from '@vue/test-utils'
import {
  provideGodMode,
  useGodMode,
  GOD_MODE_KEY,
} from '../../packages/god-mode/src/components/GodModeProvider'
import type { GodModeConfig, GodModeContextValue } from '../../packages/god-mode/src'

describe('GodModeProvider', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  /**
   * Helper: create a wrapper component that calls provideGodMode in setup
   * and renders a child component that uses inject to get the context
   */
  function createTestApp(config?: GodModeConfig) {
    let context: GodModeContextValue | undefined

    const Child = defineComponent({
      setup() {
        context = inject<GodModeContextValue>(GOD_MODE_KEY)
        return () => h('div', 'child')
      },
    })

    const Parent = defineComponent({
      setup() {
        provideGodMode(config)
        return () => h(Child)
      },
    })

    return { Parent, getContext: () => context! }
  }

  describe('basic functionality', () => {
    it('should provide default context values', () => {
      const { Parent, getContext } = createTestApp()
      mount(Parent)

      const ctx = getContext()
      expect(ctx).toBeDefined()
      expect(ctx.windowState.state).toBe('closed')
      expect(ctx.windowState.isPinned).toBe(false)
      expect(ctx.isVisible).toBe(false)
      expect(ctx.config.persistState).toBe(true)
    })

    it('should throw when useGodMode is used outside provider', () => {
      const Component = defineComponent({
        setup() {
          expect(() => useGodMode()).toThrow(
            'useGodMode must be used within a component that calls provideGodMode()'
          )
          return () => h('div')
        },
      })

      mount(Component)
    })
  })

  describe('window actions', () => {
    it('should toggle window state', () => {
      const { Parent, getContext } = createTestApp()
      mount(Parent)

      const ctx = getContext()
      expect(ctx.windowState.state).toBe('closed')

      ctx.toggleWindow()
      expect(ctx.windowState.state).toBe('open')

      ctx.toggleWindow()
      expect(ctx.windowState.state).toBe('closed')
    })

    it('should open window', () => {
      const { Parent, getContext } = createTestApp()
      mount(Parent)

      const ctx = getContext()
      ctx.openWindow()
      expect(ctx.windowState.state).toBe('open')
      expect(ctx.windowState.lastOpened).toBeTruthy()
    })

    it('should close window', () => {
      const { Parent, getContext } = createTestApp()
      mount(Parent)

      const ctx = getContext()
      ctx.openWindow()
      ctx.closeWindow()
      expect(ctx.windowState.state).toBe('closed')
    })

    it('should minimize/restore window', () => {
      const { Parent, getContext } = createTestApp()
      mount(Parent)

      const ctx = getContext()
      ctx.openWindow()
      ctx.minimizeWindow()
      expect(ctx.windowState.state).toBe('minimized')

      ctx.minimizeWindow()
      expect(ctx.windowState.state).toBe('open')
    })

    it('should toggle pin', () => {
      const { Parent, getContext } = createTestApp()
      mount(Parent)

      const ctx = getContext()
      expect(ctx.windowState.isPinned).toBe(false)
      ctx.togglePin()
      expect(ctx.windowState.isPinned).toBe(true)
      ctx.togglePin()
      expect(ctx.windowState.isPinned).toBe(false)
    })

    it('should set active tab', () => {
      const { Parent, getContext } = createTestApp()
      mount(Parent)

      const ctx = getContext()
      ctx.setActiveTab('conversation')
      expect(ctx.windowState.activeTab).toBe('conversation')

      ctx.setActiveTab('issues')
      expect(ctx.windowState.activeTab).toBe('issues')
    })

    it('should set position', () => {
      const { Parent, getContext } = createTestApp()
      mount(Parent)

      const ctx = getContext()
      ctx.setPosition({ x: 100, y: 200 })
      expect(ctx.windowState.position.x).toBe(100)
      expect(ctx.windowState.position.y).toBe(200)
    })

    it('should set size', () => {
      const { Parent, getContext } = createTestApp()
      mount(Parent)

      const ctx = getContext()
      ctx.setSize({ width: 600, height: 700 })
      expect(ctx.windowState.size.width).toBe(600)
      expect(ctx.windowState.size.height).toBe(700)
    })

    it('should reset state', () => {
      const { Parent, getContext } = createTestApp()
      mount(Parent)

      const ctx = getContext()
      ctx.openWindow()
      ctx.setActiveTab('issues')
      ctx.togglePin()

      ctx.resetState()
      expect(ctx.windowState.state).toBe('closed')
      expect(ctx.windowState.activeTab).toBe('query')
      expect(ctx.windowState.isPinned).toBe(false)
    })
  })

  describe('custom config', () => {
    it('should accept custom config', () => {
      const config: GodModeConfig = {
        preferredLanguage: 'en',
        tabs: ['conversation', 'issues'],
        storageKeyPrefix: 'test_app',
        persistState: false,
      }

      const { Parent, getContext } = createTestApp(config)
      mount(Parent)

      const ctx = getContext()
      expect(ctx.config.preferredLanguage).toBe('en')
      expect(ctx.config.tabs).toEqual(['conversation', 'issues'])
      expect(ctx.config.storageKeyPrefix).toBe('test_app')
      expect(ctx.config.persistState).toBe(false)
    })

    it('should merge custom shortcuts', () => {
      const config: GodModeConfig = {
        shortcuts: { toggleWindow: 'Ctrl+Shift+D' },
      }

      const { Parent, getContext } = createTestApp(config)
      mount(Parent)

      const ctx = getContext()
      expect(ctx.config.shortcuts?.toggleWindow).toBe('Ctrl+Shift+D')
    })

    it('should accept GitHub config', () => {
      const config: GodModeConfig = {
        github: {
          owner: 'test-org',
          repo: 'test-repo',
          defaultLabels: ['auto-generated'],
        },
      }

      const { Parent, getContext } = createTestApp(config)
      mount(Parent)

      const ctx = getContext()
      expect(ctx.config.github?.owner).toBe('test-org')
      expect(ctx.config.github?.repo).toBe('test-repo')
    })
  })

  describe('persistence with custom prefix', () => {
    it('should save state with custom storage prefix', async () => {
      const config: GodModeConfig = {
        storageKeyPrefix: 'my_custom_prefix',
        persistState: true,
      }

      const { Parent, getContext } = createTestApp(config)
      mount(Parent)

      const ctx = getContext()
      ctx.openWindow()

      // Vue watchers are async, give them a tick to flush
      await new Promise((resolve) => setTimeout(resolve, 0))

      const stored = localStorage.getItem('my_custom_prefix_state')
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored!)
      expect(parsed.state).toBe('open')
    })

    it('should not save state when persistState is false', () => {
      const config: GodModeConfig = {
        storageKeyPrefix: 'no_persist_prefix',
        persistState: false,
      }

      const { Parent, getContext } = createTestApp(config)
      mount(Parent)

      const ctx = getContext()
      ctx.openWindow()

      const stored = localStorage.getItem('no_persist_prefix_state')
      expect(stored).toBeNull()
    })
  })
})
