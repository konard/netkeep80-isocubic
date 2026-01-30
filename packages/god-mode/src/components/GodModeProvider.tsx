/**
 * GodModeProvider Component
 *
 * React Context Provider for GOD MODE library integration.
 * Wraps your application and provides GOD MODE state management,
 * keyboard shortcuts, and persistence.
 *
 * ## Usage
 *
 * ```tsx
 * import { GodModeProvider, useGodMode } from '@isocubic/god-mode'
 *
 * function App() {
 *   return (
 *     <GodModeProvider
 *       config={{
 *         github: { owner: 'my-org', repo: 'my-repo' },
 *         preferredLanguage: 'en',
 *         tabs: ['conversation', 'issues'],
 *         storageKeyPrefix: 'my_app',
 *       }}
 *     >
 *       <MyApp />
 *     </GodModeProvider>
 *   )
 * }
 *
 * function MyComponent() {
 *   const { toggleWindow, isVisible } = useGodMode()
 *   return <button onClick={toggleWindow}>{isVisible ? 'Close' : 'Open'} GOD MODE</button>
 * }
 * ```
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react'
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
 * React Context for GOD MODE state
 */
const GodModeContext = createContext<GodModeContextValue | null>(null)

/**
 * Props for GodModeProvider
 */
export interface GodModeProviderProps {
  /** GOD MODE configuration */
  config?: GodModeConfig
  /** Child components */
  children: ReactNode
}

/**
 * GOD MODE Context Provider
 *
 * Provides window state management, keyboard shortcuts, and
 * localStorage persistence for GOD MODE across the application.
 */
export function GodModeProvider({ config: customConfig, children }: GodModeProviderProps) {
  // Merge config with defaults
  const config: GodModeConfig = useMemo(
    () => ({
      ...DEFAULT_GOD_MODE_CONFIG,
      ...customConfig,
      shortcuts: {
        ...DEFAULT_GOD_MODE_CONFIG.shortcuts,
        ...customConfig?.shortcuts,
      },
    }),
    [customConfig]
  )

  const storagePrefix = config.storageKeyPrefix

  // Window state with optional persistence
  const [windowState, setWindowState] = useState<GodModeWindowState>(() =>
    config.persistState ? loadGodModeState(storagePrefix) : DEFAULT_WINDOW_STATE
  )

  // Persist state on change
  useEffect(() => {
    if (config.persistState) {
      saveGodModeState(windowState, storagePrefix)
    }
  }, [windowState, config.persistState, storagePrefix])

  // Window actions
  const openWindow = useCallback(() => {
    setWindowState((prev) => ({
      ...prev,
      state: 'open',
      lastOpened: new Date().toISOString(),
    }))
  }, [])

  const closeWindow = useCallback(() => {
    setWindowState((prev) => ({
      ...prev,
      state: 'closed',
    }))
  }, [])

  const minimizeWindow = useCallback(() => {
    setWindowState((prev) => ({
      ...prev,
      state: prev.state === 'minimized' ? 'open' : 'minimized',
    }))
  }, [])

  const toggleWindow = useCallback(() => {
    setWindowState((prev) => ({
      ...prev,
      state: prev.state === 'closed' ? 'open' : 'closed',
      ...(prev.state === 'closed' ? { lastOpened: new Date().toISOString() } : {}),
    }))
  }, [])

  const setActiveTab = useCallback((tab: GodModeTab) => {
    setWindowState((prev) => ({
      ...prev,
      activeTab: tab,
    }))
  }, [])

  const setPosition = useCallback((position: WindowPosition) => {
    setWindowState((prev) => ({
      ...prev,
      position,
    }))
  }, [])

  const setSize = useCallback((size: Partial<WindowSize>) => {
    setWindowState((prev) => ({
      ...prev,
      size: { ...prev.size, ...size },
    }))
  }, [])

  const togglePin = useCallback(() => {
    setWindowState((prev) => ({
      ...prev,
      isPinned: !prev.isPinned,
    }))
  }, [])

  const resetState = useCallback(() => {
    setWindowState(DEFAULT_WINDOW_STATE)
  }, [])

  // Keyboard shortcut: toggle window
  useEffect(() => {
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

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [windowState.state, config.shortcuts, toggleWindow, minimizeWindow])

  const contextValue: GodModeContextValue = useMemo(
    () => ({
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
      isVisible: windowState.state !== 'closed',
    }),
    [
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
    ]
  )

  return <GodModeContext.Provider value={contextValue}>{children}</GodModeContext.Provider>
}

/**
 * Hook to access GOD MODE context.
 *
 * Must be used within a `<GodModeProvider>`.
 *
 * @throws Error if used outside of GodModeProvider
 */
export function useGodMode(): GodModeContextValue {
  const context = useContext(GodModeContext)
  if (!context) {
    throw new Error('useGodMode must be used within a <GodModeProvider>')
  }
  return context
}
