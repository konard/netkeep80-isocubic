/**
 * Developer Mode Store (Pinia)
 *
 * Provides a Pinia store for enabling Developer Mode throughout the application.
 * When Developer Mode is enabled, components display their metadata and development
 * information via tooltips and overlays.
 *
 * TASK 40: Developer Mode System (Phase 6 - Developer Experience)
 * TASK 61: Migrated from React Context to Pinia store (Phase 10 - Vue.js 3.0 Migration)
 *
 * Features:
 * - Toggle Developer Mode on/off via UI or keyboard shortcut (Ctrl+Shift+D)
 * - Persist preference in localStorage
 * - Configure verbosity level (minimal, normal, verbose)
 * - Enable/disable specific metadata categories
 */

import { ref, watch, onMounted, onUnmounted } from 'vue'
import { defineStore } from 'pinia'

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
 * DevMode context value interface (preserved for API compatibility)
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
 * Pinia store for DevMode
 */
export const useDevModeStore = defineStore('devMode', () => {
  const settings = ref<DevModeSettings>(loadSettings())

  // Persist settings changes
  watch(
    settings,
    (newSettings) => {
      saveSettings(newSettings)
    },
    { deep: true }
  )

  function toggleDevMode() {
    settings.value = {
      ...settings.value,
      enabled: !settings.value.enabled,
    }
  }

  function updateSettings(updates: Partial<DevModeSettings>) {
    settings.value = {
      ...settings.value,
      ...updates,
    }
  }

  function updateCategory(category: keyof DevModeCategories, enabled: boolean) {
    settings.value = {
      ...settings.value,
      categories: {
        ...settings.value.categories,
        [category]: enabled,
      },
    }
  }

  function resetSettings() {
    settings.value = { ...DEFAULT_SETTINGS }
  }

  return {
    settings,
    toggleDevMode,
    updateSettings,
    updateCategory,
    resetSettings,
  }
})

/**
 * Composable to set up DevMode keyboard shortcut (Ctrl+Shift+D)
 *
 * Call this in your root App.vue or layout component to enable the shortcut.
 */
export function useDevModeKeyboard() {
  const store = useDevModeStore()

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
      e.preventDefault()
      store.toggleDevMode()
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  return store
}

/**
 * Composable to access DevMode state (convenience wrapper)
 *
 * @returns DevMode context value compatible with the previous React API
 */
export function useDevMode(): DevModeContextValue {
  const store = useDevModeStore()
  return {
    settings: store.settings,
    toggleDevMode: store.toggleDevMode,
    updateSettings: store.updateSettings,
    updateCategory: store.updateCategory,
    resetSettings: store.resetSettings,
    isEnabled: store.settings.enabled,
  }
}

/**
 * Composable to check if DevMode is enabled
 */
export function useIsDevModeEnabled(): boolean {
  const store = useDevModeStore()
  return store.settings.enabled
}

/**
 * Composable to get DevMode settings
 */
export function useDevModeSettings(): DevModeSettings {
  const store = useDevModeStore()
  return store.settings
}

export default useDevModeStore
