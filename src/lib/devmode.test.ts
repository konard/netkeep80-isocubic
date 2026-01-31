/**
 * Tests for Developer Mode Pinia store and composables
 *
 * TASK 61: Migrated from React testing-library to Pinia testing (Phase 10)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDevModeStore, useDevMode, useIsDevModeEnabled, useDevModeSettings } from './devmode'

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

describe('DevMode Pinia Store', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('should provide DevMode store', () => {
    const store = useDevModeStore()

    expect(store).toBeDefined()
    expect(store.settings).toBeDefined()
    expect(store.toggleDevMode).toBeInstanceOf(Function)
    expect(store.updateSettings).toBeInstanceOf(Function)
    expect(store.updateCategory).toBeInstanceOf(Function)
    expect(store.resetSettings).toBeInstanceOf(Function)
  })

  it('should start with DevMode disabled by default', () => {
    const store = useDevModeStore()

    expect(store.settings.enabled).toBe(false)
  })

  it('should toggle DevMode on/off', () => {
    const store = useDevModeStore()

    expect(store.settings.enabled).toBe(false)

    store.toggleDevMode()
    expect(store.settings.enabled).toBe(true)

    store.toggleDevMode()
    expect(store.settings.enabled).toBe(false)
  })

  it('should update settings', () => {
    const store = useDevModeStore()

    expect(store.settings.verbosity).toBe('normal')

    store.updateSettings({ verbosity: 'verbose' })
    expect(store.settings.verbosity).toBe('verbose')
  })

  it('should update individual categories', () => {
    const store = useDevModeStore()

    expect(store.settings.categories.dependencies).toBe(false)

    store.updateCategory('dependencies', true)
    expect(store.settings.categories.dependencies).toBe(true)
  })

  it('should reset to default settings', () => {
    const store = useDevModeStore()

    // Modify some settings
    store.updateSettings({ enabled: true, verbosity: 'verbose' })
    store.updateCategory('dependencies', true)

    expect(store.settings.enabled).toBe(true)
    expect(store.settings.verbosity).toBe('verbose')

    // Reset
    store.resetSettings()

    expect(store.settings.enabled).toBe(false)
    expect(store.settings.verbosity).toBe('normal')
    expect(store.settings.categories.dependencies).toBe(false)
  })

  it('should persist settings to localStorage', async () => {
    const store = useDevModeStore()

    store.toggleDevMode()

    // Pinia uses watchers which are async, give it a tick
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Should persist after toggle
    expect(localStorageMock.setItem).toHaveBeenCalled()

    // Find the last call to setItem for our key
    const calls = localStorageMock.setItem.mock.calls.filter(
      (call: string[]) => call[0] === 'isocubic_devmode_settings'
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

    const store = useDevModeStore()

    expect(store.settings.enabled).toBe(true)
    expect(store.settings.verbosity).toBe('minimal')
  })
})

describe('useDevMode composable', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('should return DevMode context value', () => {
    const devMode = useDevMode()

    expect(devMode).toBeDefined()
    expect(devMode.settings).toBeDefined()
    expect(devMode.toggleDevMode).toBeInstanceOf(Function)
    expect(devMode.updateSettings).toBeInstanceOf(Function)
    expect(devMode.updateCategory).toBeInstanceOf(Function)
    expect(devMode.resetSettings).toBeInstanceOf(Function)
    expect(devMode.isEnabled).toBe(false)
  })
})

describe('useIsDevModeEnabled composable', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('should return false by default', () => {
    const isEnabled = useIsDevModeEnabled()
    expect(isEnabled).toBe(false)
  })

  it('should return true after toggling', () => {
    const store = useDevModeStore()
    store.toggleDevMode()

    const isEnabled = useIsDevModeEnabled()
    expect(isEnabled).toBe(true)
  })
})

describe('useDevModeSettings composable', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('should return default settings', () => {
    const settings = useDevModeSettings()

    expect(settings.enabled).toBe(false)
    expect(settings.verbosity).toBe('normal')
    expect(settings.showOutline).toBe(true)
    expect(settings.showHoverInfo).toBe(true)
    expect(settings.panelPosition).toBe('top-right')
  })

  it('should return current settings after modification', () => {
    const store = useDevModeStore()
    store.updateSettings({
      showOutline: false,
      panelPosition: 'bottom-left',
    })

    const settings = useDevModeSettings()
    expect(settings.showOutline).toBe(false)
    expect(settings.panelPosition).toBe('bottom-left')
  })
})

describe('Category settings', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('should have correct default categories', () => {
    const store = useDevModeStore()

    const { categories } = store.settings
    expect(categories.basic).toBe(true)
    expect(categories.history).toBe(true)
    expect(categories.features).toBe(true)
    expect(categories.dependencies).toBe(false)
    expect(categories.relatedFiles).toBe(false)
    expect(categories.props).toBe(false)
    expect(categories.tips).toBe(true)
  })

  it('should update multiple categories', () => {
    const store = useDevModeStore()

    store.updateCategory('dependencies', true)
    store.updateCategory('props', true)
    store.updateCategory('basic', false)

    const { categories } = store.settings
    expect(categories.dependencies).toBe(true)
    expect(categories.props).toBe(true)
    expect(categories.basic).toBe(false)
  })
})
