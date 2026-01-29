/**
 * Tests for Developer Mode context and utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import {
  DevModeProvider,
  useDevMode,
  useIsDevModeEnabled,
  useDevModeSettings,
  type DevModeSettings,
} from './devmode'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Helper to create wrapper
const createWrapper = (initialSettings?: Partial<DevModeSettings>) => {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(DevModeProvider, { initialSettings }, children)
  }
}

describe('DevModeProvider', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('should provide DevMode context', () => {
    const { result } = renderHook(() => useDevMode(), {
      wrapper: createWrapper(),
    })

    expect(result.current).toBeDefined()
    expect(result.current.settings).toBeDefined()
    expect(result.current.toggleDevMode).toBeInstanceOf(Function)
    expect(result.current.updateSettings).toBeInstanceOf(Function)
    expect(result.current.updateCategory).toBeInstanceOf(Function)
    expect(result.current.resetSettings).toBeInstanceOf(Function)
  })

  it('should start with DevMode disabled by default', () => {
    const { result } = renderHook(() => useDevMode(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isEnabled).toBe(false)
    expect(result.current.settings.enabled).toBe(false)
  })

  it('should toggle DevMode on/off', () => {
    const { result } = renderHook(() => useDevMode(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isEnabled).toBe(false)

    act(() => {
      result.current.toggleDevMode()
    })

    expect(result.current.isEnabled).toBe(true)

    act(() => {
      result.current.toggleDevMode()
    })

    expect(result.current.isEnabled).toBe(false)
  })

  it('should update settings', () => {
    const { result } = renderHook(() => useDevMode(), {
      wrapper: createWrapper(),
    })

    expect(result.current.settings.verbosity).toBe('normal')

    act(() => {
      result.current.updateSettings({ verbosity: 'verbose' })
    })

    expect(result.current.settings.verbosity).toBe('verbose')
  })

  it('should update individual categories', () => {
    const { result } = renderHook(() => useDevMode(), {
      wrapper: createWrapper(),
    })

    expect(result.current.settings.categories.dependencies).toBe(false)

    act(() => {
      result.current.updateCategory('dependencies', true)
    })

    expect(result.current.settings.categories.dependencies).toBe(true)
  })

  it('should reset to default settings', () => {
    const { result } = renderHook(() => useDevMode(), {
      wrapper: createWrapper(),
    })

    // Modify some settings
    act(() => {
      result.current.updateSettings({ enabled: true, verbosity: 'verbose' })
      result.current.updateCategory('dependencies', true)
    })

    expect(result.current.isEnabled).toBe(true)
    expect(result.current.settings.verbosity).toBe('verbose')

    // Reset
    act(() => {
      result.current.resetSettings()
    })

    expect(result.current.isEnabled).toBe(false)
    expect(result.current.settings.verbosity).toBe('normal')
    expect(result.current.settings.categories.dependencies).toBe(false)
  })

  it('should persist settings to localStorage', () => {
    const { result } = renderHook(() => useDevMode(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.toggleDevMode()
    })

    // Should persist after toggle
    expect(localStorageMock.setItem).toHaveBeenCalled()

    // Find the last call to setItem for our key (most recent state)
    const calls = localStorageMock.setItem.mock.calls.filter(
      (call) => call[0] === 'isocubic_devmode_settings'
    )
    expect(calls.length).toBeGreaterThan(0)

    // Get the last call (after toggle)
    const lastCall = calls[calls.length - 1]
    const savedSettings = JSON.parse(lastCall[1])
    expect(savedSettings.enabled).toBe(true)
  })

  it('should load settings from localStorage', () => {
    // Pre-populate localStorage
    localStorageMock.setItem(
      'isocubic_devmode_settings',
      JSON.stringify({ enabled: true, verbosity: 'minimal' })
    )

    const { result } = renderHook(() => useDevMode(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isEnabled).toBe(true)
    expect(result.current.settings.verbosity).toBe('minimal')
  })

  it('should accept initial settings override', () => {
    const { result } = renderHook(() => useDevMode(), {
      wrapper: createWrapper({ enabled: true }),
    })

    expect(result.current.isEnabled).toBe(true)
  })

  it('should throw error when useDevMode is called outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      renderHook(() => useDevMode())
    }).toThrow('useDevMode must be used within a DevModeProvider')

    consoleSpy.mockRestore()
  })
})

describe('useIsDevModeEnabled', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('should return false when outside provider', () => {
    const { result } = renderHook(() => useIsDevModeEnabled())
    expect(result.current).toBe(false)
  })

  it('should return current enabled state when inside provider', () => {
    const { result } = renderHook(
      () => ({
        isEnabled: useIsDevModeEnabled(),
        devMode: useDevMode(),
      }),
      { wrapper: createWrapper() }
    )

    expect(result.current.isEnabled).toBe(false)

    act(() => {
      result.current.devMode.toggleDevMode()
    })

    expect(result.current.isEnabled).toBe(true)
  })
})

describe('useDevModeSettings', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('should return default settings when outside provider', () => {
    const { result } = renderHook(() => useDevModeSettings())

    expect(result.current.enabled).toBe(false)
    expect(result.current.verbosity).toBe('normal')
    expect(result.current.showOutline).toBe(true)
    expect(result.current.showHoverInfo).toBe(true)
    expect(result.current.panelPosition).toBe('top-right')
  })

  it('should return current settings when inside provider', () => {
    const { result } = renderHook(
      () => ({
        settings: useDevModeSettings(),
        devMode: useDevMode(),
      }),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.devMode.updateSettings({
        showOutline: false,
        panelPosition: 'bottom-left',
      })
    })

    expect(result.current.settings.showOutline).toBe(false)
    expect(result.current.settings.panelPosition).toBe('bottom-left')
  })
})

describe('Keyboard shortcut', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('should toggle DevMode with Ctrl+Shift+D', () => {
    const { result } = renderHook(() => useDevMode(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isEnabled).toBe(false)

    // Simulate Ctrl+Shift+D
    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'd',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      })
      window.dispatchEvent(event)
    })

    expect(result.current.isEnabled).toBe(true)

    // Toggle again
    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'D',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      })
      window.dispatchEvent(event)
    })

    expect(result.current.isEnabled).toBe(false)
  })

  it('should toggle DevMode with Meta+Shift+D (Mac)', () => {
    const { result } = renderHook(() => useDevMode(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isEnabled).toBe(false)

    // Simulate Meta+Shift+D (Mac)
    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'd',
        metaKey: true,
        shiftKey: true,
        bubbles: true,
      })
      window.dispatchEvent(event)
    })

    expect(result.current.isEnabled).toBe(true)
  })

  it('should not toggle DevMode without Shift key', () => {
    const { result } = renderHook(() => useDevMode(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isEnabled).toBe(false)

    // Ctrl+D without Shift should not toggle
    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'd',
        ctrlKey: true,
        shiftKey: false,
        bubbles: true,
      })
      window.dispatchEvent(event)
    })

    expect(result.current.isEnabled).toBe(false)
  })
})

describe('Category settings', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('should have correct default categories', () => {
    const { result } = renderHook(() => useDevMode(), {
      wrapper: createWrapper(),
    })

    const { categories } = result.current.settings
    expect(categories.basic).toBe(true)
    expect(categories.history).toBe(true)
    expect(categories.features).toBe(true)
    expect(categories.dependencies).toBe(false)
    expect(categories.relatedFiles).toBe(false)
    expect(categories.props).toBe(false)
    expect(categories.tips).toBe(true)
  })

  it('should update multiple categories', () => {
    const { result } = renderHook(() => useDevMode(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.updateCategory('dependencies', true)
      result.current.updateCategory('props', true)
      result.current.updateCategory('basic', false)
    })

    const { categories } = result.current.settings
    expect(categories.dependencies).toBe(true)
    expect(categories.props).toBe(true)
    expect(categories.basic).toBe(false)
  })
})
