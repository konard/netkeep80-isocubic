/**
 * GodModeProvider Tests
 *
 * Tests for the GOD MODE Context Provider from @isocubic/god-mode library.
 *
 * TASK 59: GOD MODE Library Extraction (Phase 9)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { GodModeProvider, useGodMode } from '../../packages/god-mode/src/components/GodModeProvider'
import type { GodModeConfig } from '../../packages/god-mode/src'

describe('GodModeProvider', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  function createWrapper(config?: GodModeConfig) {
    return function Wrapper({ children }: { children: ReactNode }) {
      return <GodModeProvider config={config}>{children}</GodModeProvider>
    }
  }

  describe('basic functionality', () => {
    it('should provide default context values', () => {
      const { result } = renderHook(() => useGodMode(), {
        wrapper: createWrapper(),
      })

      expect(result.current.windowState.state).toBe('closed')
      expect(result.current.windowState.isPinned).toBe(false)
      expect(result.current.isVisible).toBe(false)
      expect(result.current.config.persistState).toBe(true)
    })

    it('should throw when used outside provider', () => {
      expect(() => {
        renderHook(() => useGodMode())
      }).toThrow('useGodMode must be used within a <GodModeProvider>')
    })
  })

  describe('window actions', () => {
    it('should toggle window state', () => {
      const { result } = renderHook(() => useGodMode(), {
        wrapper: createWrapper(),
      })

      expect(result.current.isVisible).toBe(false)

      act(() => result.current.toggleWindow())
      expect(result.current.windowState.state).toBe('open')
      expect(result.current.isVisible).toBe(true)

      act(() => result.current.toggleWindow())
      expect(result.current.windowState.state).toBe('closed')
      expect(result.current.isVisible).toBe(false)
    })

    it('should open window', () => {
      const { result } = renderHook(() => useGodMode(), {
        wrapper: createWrapper(),
      })

      act(() => result.current.openWindow())
      expect(result.current.windowState.state).toBe('open')
      expect(result.current.windowState.lastOpened).toBeTruthy()
    })

    it('should close window', () => {
      const { result } = renderHook(() => useGodMode(), {
        wrapper: createWrapper(),
      })

      act(() => result.current.openWindow())
      act(() => result.current.closeWindow())
      expect(result.current.windowState.state).toBe('closed')
    })

    it('should minimize/restore window', () => {
      const { result } = renderHook(() => useGodMode(), {
        wrapper: createWrapper(),
      })

      act(() => result.current.openWindow())
      act(() => result.current.minimizeWindow())
      expect(result.current.windowState.state).toBe('minimized')

      act(() => result.current.minimizeWindow())
      expect(result.current.windowState.state).toBe('open')
    })

    it('should toggle pin', () => {
      const { result } = renderHook(() => useGodMode(), {
        wrapper: createWrapper(),
      })

      expect(result.current.windowState.isPinned).toBe(false)
      act(() => result.current.togglePin())
      expect(result.current.windowState.isPinned).toBe(true)
      act(() => result.current.togglePin())
      expect(result.current.windowState.isPinned).toBe(false)
    })

    it('should set active tab', () => {
      const { result } = renderHook(() => useGodMode(), {
        wrapper: createWrapper(),
      })

      act(() => result.current.setActiveTab('conversation'))
      expect(result.current.windowState.activeTab).toBe('conversation')

      act(() => result.current.setActiveTab('issues'))
      expect(result.current.windowState.activeTab).toBe('issues')
    })

    it('should set position', () => {
      const { result } = renderHook(() => useGodMode(), {
        wrapper: createWrapper(),
      })

      act(() => result.current.setPosition({ x: 100, y: 200 }))
      expect(result.current.windowState.position.x).toBe(100)
      expect(result.current.windowState.position.y).toBe(200)
    })

    it('should set size', () => {
      const { result } = renderHook(() => useGodMode(), {
        wrapper: createWrapper(),
      })

      act(() => result.current.setSize({ width: 600, height: 700 }))
      expect(result.current.windowState.size.width).toBe(600)
      expect(result.current.windowState.size.height).toBe(700)
    })

    it('should reset state', () => {
      const { result } = renderHook(() => useGodMode(), {
        wrapper: createWrapper(),
      })

      act(() => result.current.openWindow())
      act(() => result.current.setActiveTab('issues'))
      act(() => result.current.togglePin())

      act(() => result.current.resetState())
      expect(result.current.windowState.state).toBe('closed')
      expect(result.current.windowState.activeTab).toBe('query')
      expect(result.current.windowState.isPinned).toBe(false)
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

      const { result } = renderHook(() => useGodMode(), {
        wrapper: createWrapper(config),
      })

      expect(result.current.config.preferredLanguage).toBe('en')
      expect(result.current.config.tabs).toEqual(['conversation', 'issues'])
      expect(result.current.config.storageKeyPrefix).toBe('test_app')
      expect(result.current.config.persistState).toBe(false)
    })

    it('should merge custom shortcuts', () => {
      const config: GodModeConfig = {
        shortcuts: { toggleWindow: 'Ctrl+Shift+D' },
      }

      const { result } = renderHook(() => useGodMode(), {
        wrapper: createWrapper(config),
      })

      expect(result.current.config.shortcuts?.toggleWindow).toBe('Ctrl+Shift+D')
    })

    it('should accept GitHub config', () => {
      const config: GodModeConfig = {
        github: {
          owner: 'test-org',
          repo: 'test-repo',
          defaultLabels: ['auto-generated'],
        },
      }

      const { result } = renderHook(() => useGodMode(), {
        wrapper: createWrapper(config),
      })

      expect(result.current.config.github?.owner).toBe('test-org')
      expect(result.current.config.github?.repo).toBe('test-repo')
    })
  })

  describe('persistence with custom prefix', () => {
    it('should save state with custom storage prefix', () => {
      const config: GodModeConfig = {
        storageKeyPrefix: 'my_custom_prefix',
        persistState: true,
      }

      const { result } = renderHook(() => useGodMode(), {
        wrapper: createWrapper(config),
      })

      act(() => result.current.openWindow())

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

      const { result } = renderHook(() => useGodMode(), {
        wrapper: createWrapper(config),
      })

      act(() => result.current.openWindow())

      const stored = localStorage.getItem('no_persist_prefix_state')
      expect(stored).toBeNull()
    })
  })
})
