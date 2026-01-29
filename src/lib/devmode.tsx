/**
 * Developer Mode Context
 *
 * Provides a React context for enabling Developer Mode throughout the application.
 * When Developer Mode is enabled, components display their metadata and development
 * information via tooltips and overlays.
 *
 * TASK 40: Developer Mode System (Phase 6 - Developer Experience)
 *
 * Features:
 * - Toggle Developer Mode on/off via UI or keyboard shortcut (Ctrl+Shift+D)
 * - Persist preference in localStorage
 * - Configure verbosity level (minimal, normal, verbose)
 * - Enable/disable specific metadata categories
 */

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

/**
 * Verbosity level for metadata display
 */
export type DevModeVerbosity = 'minimal' | 'normal' | 'verbose'

/**
 * Categories of metadata that can be shown/hidden
 */
export interface DevModeCategories {
  /** Show basic info (name, summary, status) */
  basic: boolean
  /** Show component history */
  history: boolean
  /** Show feature list */
  features: boolean
  /** Show dependencies */
  dependencies: boolean
  /** Show related files */
  relatedFiles: boolean
  /** Show props documentation */
  props: boolean
  /** Show tips and known issues */
  tips: boolean
}

/**
 * Default category settings
 */
const DEFAULT_CATEGORIES: DevModeCategories = {
  basic: true,
  history: true,
  features: true,
  dependencies: false,
  relatedFiles: false,
  props: false,
  tips: true,
}

/**
 * DevMode settings interface
 */
export interface DevModeSettings {
  /** Whether Developer Mode is enabled */
  enabled: boolean
  /** Verbosity level */
  verbosity: DevModeVerbosity
  /** Categories to display */
  categories: DevModeCategories
  /** Show component outline/highlight */
  showOutline: boolean
  /** Show floating info panel on hover */
  showHoverInfo: boolean
  /** Position for info panels */
  panelPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

/**
 * Default DevMode settings
 */
const DEFAULT_SETTINGS: DevModeSettings = {
  enabled: false,
  verbosity: 'normal',
  categories: DEFAULT_CATEGORIES,
  showOutline: true,
  showHoverInfo: true,
  panelPosition: 'top-right',
}

/**
 * LocalStorage key for persisting DevMode settings
 */
const STORAGE_KEY = 'isocubic_devmode_settings'

/**
 * Load settings from localStorage
 */
function loadSettings(): DevModeSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        categories: {
          ...DEFAULT_CATEGORIES,
          ...parsed.categories,
        },
      }
    }
  } catch (e) {
    console.warn('Failed to load DevMode settings:', e)
  }
  return DEFAULT_SETTINGS
}

/**
 * Save settings to localStorage
 */
function saveSettings(settings: DevModeSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (e) {
    console.warn('Failed to save DevMode settings:', e)
  }
}

/**
 * DevMode context value interface
 */
export interface DevModeContextValue {
  /** Current settings */
  settings: DevModeSettings
  /** Toggle DevMode on/off */
  toggleDevMode: () => void
  /** Update settings */
  updateSettings: (updates: Partial<DevModeSettings>) => void
  /** Update a specific category */
  updateCategory: (category: keyof DevModeCategories, enabled: boolean) => void
  /** Reset to default settings */
  resetSettings: () => void
  /** Check if DevMode is enabled */
  isEnabled: boolean
}

/**
 * DevMode context
 */
const DevModeContext = createContext<DevModeContextValue | null>(null)

/**
 * Props for DevModeProvider
 */
export interface DevModeProviderProps {
  /** Child components */
  children: ReactNode
  /** Initial settings override */
  initialSettings?: Partial<DevModeSettings>
}

/**
 * DevMode Provider Component
 *
 * Wraps the application to provide Developer Mode functionality.
 */
export function DevModeProvider({ children, initialSettings }: DevModeProviderProps) {
  const [settings, setSettings] = useState<DevModeSettings>(() => ({
    ...loadSettings(),
    ...initialSettings,
  }))

  // Persist settings changes
  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  // Keyboard shortcut: Ctrl+Shift+D to toggle DevMode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        setSettings((prev) => ({
          ...prev,
          enabled: !prev.enabled,
        }))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Toggle DevMode
  const toggleDevMode = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      enabled: !prev.enabled,
    }))
  }, [])

  // Update settings
  const updateSettings = useCallback((updates: Partial<DevModeSettings>) => {
    setSettings((prev) => ({
      ...prev,
      ...updates,
    }))
  }, [])

  // Update a specific category
  const updateCategory = useCallback((category: keyof DevModeCategories, enabled: boolean) => {
    setSettings((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: enabled,
      },
    }))
  }, [])

  // Reset to default settings
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
  }, [])

  const value: DevModeContextValue = {
    settings,
    toggleDevMode,
    updateSettings,
    updateCategory,
    resetSettings,
    isEnabled: settings.enabled,
  }

  return <DevModeContext.Provider value={value}>{children}</DevModeContext.Provider>
}

/**
 * Hook to access DevMode context
 *
 * @throws Error if used outside of DevModeProvider
 */
export function useDevMode(): DevModeContextValue {
  const context = useContext(DevModeContext)
  if (!context) {
    throw new Error('useDevMode must be used within a DevModeProvider')
  }
  return context
}

/**
 * Hook to check if DevMode is enabled
 * Safe to use outside of DevModeProvider (returns false)
 */
export function useIsDevModeEnabled(): boolean {
  const context = useContext(DevModeContext)
  return context?.isEnabled ?? false
}

/**
 * Hook to get DevMode settings
 * Safe to use outside of DevModeProvider (returns defaults)
 */
export function useDevModeSettings(): DevModeSettings {
  const context = useContext(DevModeContext)
  return context?.settings ?? DEFAULT_SETTINGS
}

export default DevModeProvider
