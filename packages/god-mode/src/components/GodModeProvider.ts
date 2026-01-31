/**
 * GodModeProvider Composable
 *
 * Vue 3 provide/inject based provider for GOD MODE library integration.
 * Provides GOD MODE state management, keyboard shortcuts, and persistence.
 *
 * TASK 61: Migrated from React Context to Vue provide/inject (Phase 10 - Vue.js 3.0 Migration)
 *
 * ## Usage
 *
 * In App.vue, call provideGodMode() in setup.
 * In any child component, call useGodMode() to access the context.
 */

import { reactive, watch, onMounted, onUnmounted, provide, inject, type InjectionKey } from 'vue'
import type {
  GodModeConfig,
  GodModeWindowState,
  GodModeContextValue,
  GodModeTab,
  WindowPosition,
  WindowSize,
} from '../types/god-mode'
import {
  DEFAULT_GOD_MODE_CONFIG,
  DEFAULT_WINDOW_STATE,
  loadGodModeState,
  saveGodModeState,
  matchesShortcut,
} from '../types/god-mode'

/**
 * Injection key for GOD MODE context
 */
const GOD_MODE_KEY: InjectionKey<GodModeContextValue> = Symbol('god-mode')

/**
 * Props for provideGodMode
 */
export interface GodModeProviderProps {
  /** GOD MODE configuration */
  config?: GodModeConfig
}

/**
 * Provide GOD MODE context to all child components.
 *
 * Call this in your root component's setup to enable GOD MODE.
 * It sets up state management, keyboard shortcuts, and localStorage persistence.
 *
 * @param customConfig - Optional configuration overrides
 * @returns GodModeContextValue for direct use in the providing component
 */
export function provideGodMode(customConfig?: GodModeConfig): GodModeContextValue {
  // Merge config with defaults
  const config: GodModeConfig = {
    ...DEFAULT_GOD_MODE_CONFIG,
    ...customConfig,
    shortcuts: {
      ...DEFAULT_GOD_MODE_CONFIG.shortcuts,
      ...customConfig?.shortcuts,
    },
  }

  const storagePrefix = config.storageKeyPrefix

  // Window state — use reactive for direct mutation tracking
  const initialState: GodModeWindowState = config.persistState
    ? loadGodModeState(storagePrefix)
    : { ...DEFAULT_WINDOW_STATE }

  const windowState = reactive<GodModeWindowState>({ ...initialState })

  // Persist state on change
  watch(
    () => ({ ...windowState }),
    (newState) => {
      if (config.persistState) {
        saveGodModeState(newState, storagePrefix)
      }
    },
    { deep: true }
  )

  // Window actions
  function openWindow() {
    windowState.state = 'open'
    windowState.lastOpened = new Date().toISOString()
  }

  function closeWindow() {
    windowState.state = 'closed'
  }

  function minimizeWindow() {
    windowState.state = windowState.state === 'minimized' ? 'open' : 'minimized'
  }

  function toggleWindow() {
    if (windowState.state === 'closed') {
      windowState.state = 'open'
      windowState.lastOpened = new Date().toISOString()
    } else {
      windowState.state = 'closed'
    }
  }

  function setActiveTab(tab: GodModeTab) {
    windowState.activeTab = tab
  }

  function setPosition(position: WindowPosition) {
    windowState.position = position
  }

  function setSize(size: Partial<WindowSize>) {
    windowState.size = { ...windowState.size, ...size }
  }

  function togglePin() {
    windowState.isPinned = !windowState.isPinned
  }

  function resetState() {
    Object.assign(windowState, { ...DEFAULT_WINDOW_STATE })
  }

  // Keyboard shortcut: toggle window
  const handleKeyDown = (e: KeyboardEvent) => {
    const shortcut = config.shortcuts?.toggleWindow || 'Ctrl+Shift+G'
    if (matchesShortcut(e, shortcut)) {
      e.preventDefault()
      toggleWindow()
    }
    if (e.key === 'Escape' && windowState.state === 'open') {
      e.preventDefault()
      minimizeWindow()
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  // Create a mutable context object — windowState is reactive so consumers see updates
  const contextValue: GodModeContextValue = reactive({
    windowState,
    config,
    openWindow,
    closeWindow,
    minimizeWindow,
    toggleWindow,
    setActiveTab,
    setPosition,
    setSize,
    togglePin,
    resetState,
    get isVisible() {
      return windowState.state !== 'closed'
    },
  })

  provide(GOD_MODE_KEY, contextValue)

  return contextValue
}

/**
 * Composable to access GOD MODE context.
 *
 * Must be used within a component tree where `provideGodMode()` has been called.
 *
 * @throws Error if used outside of a GOD MODE provider
 */
export function useGodMode(): GodModeContextValue {
  const context = inject(GOD_MODE_KEY)
  if (!context) {
    throw new Error('useGodMode must be used within a component that calls provideGodMode()')
  }
  return context
}

export { GOD_MODE_KEY }
