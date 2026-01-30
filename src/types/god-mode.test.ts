/**
 * GOD MODE Types Tests
 *
 * Tests for the GOD MODE type definitions and utility functions.
 *
 * TASK 54: Unified DevMode Window (Phase 9 - GOD MODE)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  GOD_MODE_TABS,
  DEFAULT_WINDOW_SIZE,
  DEFAULT_WINDOW_POSITION,
  DEFAULT_KEYBOARD_SHORTCUTS,
  DEFAULT_GOD_MODE_CONFIG,
  DEFAULT_WINDOW_STATE,
  GOD_MODE_STORAGE_KEY,
  loadGodModeState,
  saveGodModeState,
  isValidTab,
  getTabInfo,
  getAvailableTabs,
  clamp,
  constrainPosition,
  constrainSize,
  parseShortcut,
  matchesShortcut,
  type GodModeTab,
  type WindowPosition,
  type WindowSize,
  type GodModeWindowState,
  type GodModeConfig,
} from './god-mode'

describe('god-mode types', () => {
  describe('GOD_MODE_TABS', () => {
    it('should have all required tabs', () => {
      expect(GOD_MODE_TABS).toHaveLength(5)
      expect(GOD_MODE_TABS.map((t) => t.id)).toEqual([
        'query',
        'context',
        'search',
        'conversation',
        'issues',
      ])
    })

    it('should have correct structure for each tab', () => {
      for (const tab of GOD_MODE_TABS) {
        expect(tab).toHaveProperty('id')
        expect(tab).toHaveProperty('labelRu')
        expect(tab).toHaveProperty('labelEn')
        expect(tab).toHaveProperty('icon')
        expect(tab).toHaveProperty('available')
        expect(tab).toHaveProperty('descriptionRu')
        expect(tab).toHaveProperty('descriptionEn')
      }
    })

    it('should have available tabs for existing panels', () => {
      const availableTabs = GOD_MODE_TABS.filter((t) => t.available)
      expect(availableTabs.map((t) => t.id)).toContain('query')
      expect(availableTabs.map((t) => t.id)).toContain('context')
      expect(availableTabs.map((t) => t.id)).toContain('search')
      expect(availableTabs.map((t) => t.id)).toContain('conversation')
      expect(availableTabs.map((t) => t.id)).toContain('issues')
    })

    it('should have all tabs available after TASK 56 completion', () => {
      // TASK 55 completed - conversation is available
      // TASK 56 completed - issues is available
      const conversationTab = GOD_MODE_TABS.find((t) => t.id === 'conversation')
      const issuesTab = GOD_MODE_TABS.find((t) => t.id === 'issues')
      expect(conversationTab?.available).toBe(true)
      expect(issuesTab?.available).toBe(true)
    })
  })

  describe('DEFAULT_WINDOW_SIZE', () => {
    it('should have sensible default dimensions', () => {
      expect(DEFAULT_WINDOW_SIZE.width).toBeGreaterThanOrEqual(DEFAULT_WINDOW_SIZE.minWidth)
      expect(DEFAULT_WINDOW_SIZE.width).toBeLessThanOrEqual(DEFAULT_WINDOW_SIZE.maxWidth)
      expect(DEFAULT_WINDOW_SIZE.height).toBeGreaterThanOrEqual(DEFAULT_WINDOW_SIZE.minHeight)
      expect(DEFAULT_WINDOW_SIZE.height).toBeLessThanOrEqual(DEFAULT_WINDOW_SIZE.maxHeight)
    })

    it('should have positive min/max constraints', () => {
      expect(DEFAULT_WINDOW_SIZE.minWidth).toBeGreaterThan(0)
      expect(DEFAULT_WINDOW_SIZE.minHeight).toBeGreaterThan(0)
      expect(DEFAULT_WINDOW_SIZE.maxWidth).toBeGreaterThan(DEFAULT_WINDOW_SIZE.minWidth)
      expect(DEFAULT_WINDOW_SIZE.maxHeight).toBeGreaterThan(DEFAULT_WINDOW_SIZE.minHeight)
    })
  })

  describe('DEFAULT_WINDOW_POSITION', () => {
    it('should have valid position values', () => {
      expect(DEFAULT_WINDOW_POSITION.x).toBeGreaterThanOrEqual(0)
      expect(DEFAULT_WINDOW_POSITION.y).toBeGreaterThanOrEqual(0)
    })

    it('should have a valid anchor', () => {
      const validAnchors = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
      expect(validAnchors).toContain(DEFAULT_WINDOW_POSITION.anchor)
    })
  })

  describe('DEFAULT_KEYBOARD_SHORTCUTS', () => {
    it('should have toggleWindow shortcut', () => {
      expect(DEFAULT_KEYBOARD_SHORTCUTS.toggleWindow).toBe('Ctrl+Shift+G')
    })

    it('should have all optional shortcuts', () => {
      expect(DEFAULT_KEYBOARD_SHORTCUTS.minimizeWindow).toBeDefined()
      expect(DEFAULT_KEYBOARD_SHORTCUTS.nextTab).toBeDefined()
      expect(DEFAULT_KEYBOARD_SHORTCUTS.prevTab).toBeDefined()
    })
  })

  describe('DEFAULT_GOD_MODE_CONFIG', () => {
    it('should have all required configuration', () => {
      expect(DEFAULT_GOD_MODE_CONFIG.position).toBeDefined()
      expect(DEFAULT_GOD_MODE_CONFIG.size).toBeDefined()
      expect(DEFAULT_GOD_MODE_CONFIG.tabs).toBeDefined()
      expect(DEFAULT_GOD_MODE_CONFIG.shortcuts).toBeDefined()
      expect(DEFAULT_GOD_MODE_CONFIG.preferredLanguage).toBeDefined()
      expect(DEFAULT_GOD_MODE_CONFIG.persistState).toBe(true)
    })

    it('should only include available tabs by default', () => {
      const tabs = DEFAULT_GOD_MODE_CONFIG.tabs
      expect(tabs).toContain('query')
      expect(tabs).toContain('context')
      expect(tabs).toContain('search')
      expect(tabs).not.toContain('conversation')
      expect(tabs).not.toContain('issues')
    })
  })

  describe('DEFAULT_WINDOW_STATE', () => {
    it('should start closed', () => {
      expect(DEFAULT_WINDOW_STATE.state).toBe('closed')
    })

    it('should have query as default tab', () => {
      expect(DEFAULT_WINDOW_STATE.activeTab).toBe('query')
    })

    it('should not be pinned by default', () => {
      expect(DEFAULT_WINDOW_STATE.isPinned).toBe(false)
    })
  })

  describe('isValidTab', () => {
    it('should return true for valid tabs', () => {
      const validTabs: GodModeTab[] = ['query', 'context', 'search', 'conversation', 'issues']
      for (const tab of validTabs) {
        expect(isValidTab(tab)).toBe(true)
      }
    })

    it('should return false for invalid tabs', () => {
      expect(isValidTab('invalid')).toBe(false)
      expect(isValidTab('')).toBe(false)
      expect(isValidTab('settings')).toBe(false)
    })
  })

  describe('getTabInfo', () => {
    it('should return tab info for valid tab', () => {
      const info = getTabInfo('query')
      expect(info).toBeDefined()
      expect(info?.id).toBe('query')
      expect(info?.icon).toBe('🤖')
    })

    it('should return undefined for invalid tab', () => {
      const info = getTabInfo('invalid' as GodModeTab)
      expect(info).toBeUndefined()
    })
  })

  describe('getAvailableTabs', () => {
    it('should return only available tabs', () => {
      const tabs = getAvailableTabs()
      expect(tabs.every((t) => t.available)).toBe(true)
    })

    it('should filter by config tabs', () => {
      const config: GodModeConfig = {
        tabs: ['query', 'search'],
      }
      const tabs = getAvailableTabs(config)
      expect(tabs).toHaveLength(2)
      expect(tabs.map((t) => t.id)).toEqual(['query', 'search'])
    })

    it('should include issues tab now that TASK 56 is complete', () => {
      const config: GodModeConfig = {
        tabs: ['query', 'issues'], // issues is now available (TASK 56 complete)
      }
      const tabs = getAvailableTabs(config)
      expect(tabs.map((t) => t.id)).toEqual(['query', 'issues'])
    })
  })

  describe('clamp', () => {
    it('should clamp values within range', () => {
      expect(clamp(50, 0, 100)).toBe(50)
      expect(clamp(-10, 0, 100)).toBe(0)
      expect(clamp(150, 0, 100)).toBe(100)
    })

    it('should handle edge cases', () => {
      expect(clamp(0, 0, 100)).toBe(0)
      expect(clamp(100, 0, 100)).toBe(100)
    })
  })

  describe('constrainPosition', () => {
    const size: WindowSize = { ...DEFAULT_WINDOW_SIZE, width: 400, height: 300 }

    it('should keep position within viewport', () => {
      const position: WindowPosition = { x: 10, y: 10 }
      const result = constrainPosition(position, size, 1000, 800)
      expect(result.x).toBeGreaterThanOrEqual(20)
      expect(result.y).toBeGreaterThanOrEqual(20)
    })

    it('should constrain position that would overflow', () => {
      const position: WindowPosition = { x: 900, y: 700 }
      const result = constrainPosition(position, size, 1000, 800)
      expect(result.x).toBeLessThanOrEqual(1000 - 400 - 20) // viewport - width - padding
      expect(result.y).toBeLessThanOrEqual(800 - 300 - 20) // viewport - height - padding
    })
  })

  describe('constrainSize', () => {
    it('should enforce minimum size', () => {
      const result = constrainSize({ width: 100, height: 100 })
      expect(result.width).toBe(DEFAULT_WINDOW_SIZE.minWidth)
      expect(result.height).toBe(DEFAULT_WINDOW_SIZE.minHeight)
    })

    it('should enforce maximum size', () => {
      const result = constrainSize({ width: 2000, height: 2000 })
      expect(result.width).toBe(DEFAULT_WINDOW_SIZE.maxWidth)
      expect(result.height).toBe(DEFAULT_WINDOW_SIZE.maxHeight)
    })

    it('should keep valid sizes unchanged', () => {
      const result = constrainSize({ width: 500, height: 500 })
      expect(result.width).toBe(500)
      expect(result.height).toBe(500)
    })
  })

  describe('parseShortcut', () => {
    it('should parse simple shortcuts', () => {
      const result = parseShortcut('g')
      expect(result.key).toBe('g')
      expect(result.ctrl).toBe(false)
      expect(result.shift).toBe(false)
    })

    it('should parse Ctrl+Shift+G', () => {
      const result = parseShortcut('Ctrl+Shift+G')
      expect(result.key).toBe('g')
      expect(result.ctrl).toBe(true)
      expect(result.shift).toBe(true)
      expect(result.alt).toBe(false)
    })

    it('should parse complex shortcuts', () => {
      const result = parseShortcut('Ctrl+Alt+Shift+X')
      expect(result.key).toBe('x')
      expect(result.ctrl).toBe(true)
      expect(result.alt).toBe(true)
      expect(result.shift).toBe(true)
    })

    it('should handle cmd/meta', () => {
      const result = parseShortcut('Cmd+G')
      expect(result.meta).toBe(true)
    })
  })

  describe('matchesShortcut', () => {
    it('should match correct keyboard event', () => {
      const event = new KeyboardEvent('keydown', {
        key: 'g',
        ctrlKey: true,
        shiftKey: true,
        altKey: false,
        metaKey: false,
      })
      expect(matchesShortcut(event, 'Ctrl+Shift+G')).toBe(true)
    })

    it('should not match when modifiers differ', () => {
      const event = new KeyboardEvent('keydown', {
        key: 'g',
        ctrlKey: true,
        shiftKey: false, // Missing shift
        altKey: false,
        metaKey: false,
      })
      expect(matchesShortcut(event, 'Ctrl+Shift+G')).toBe(false)
    })

    it('should not match when key differs', () => {
      const event = new KeyboardEvent('keydown', {
        key: 'h',
        ctrlKey: true,
        shiftKey: true,
        altKey: false,
        metaKey: false,
      })
      expect(matchesShortcut(event, 'Ctrl+Shift+G')).toBe(false)
    })
  })
})

describe('god-mode localStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('saveGodModeState', () => {
    it('should save state to localStorage', () => {
      const state: GodModeWindowState = {
        state: 'open',
        position: { x: 100, y: 200 },
        size: { ...DEFAULT_WINDOW_SIZE, width: 600 },
        activeTab: 'context',
        isPinned: true,
      }
      saveGodModeState(state)
      const stored = localStorage.getItem(GOD_MODE_STORAGE_KEY)
      expect(stored).toBeDefined()
      const parsed = JSON.parse(stored!)
      expect(parsed.state).toBe('open')
      expect(parsed.activeTab).toBe('context')
      expect(parsed.isPinned).toBe(true)
    })

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage.setItem to throw an error
      const mockSetItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage full')
      })

      const state: GodModeWindowState = { ...DEFAULT_WINDOW_STATE }
      // The function should not throw when localStorage fails - it should catch the error
      expect(() => saveGodModeState(state)).not.toThrow()

      mockSetItem.mockRestore()
    })
  })

  describe('loadGodModeState', () => {
    it('should return default state when no saved state', () => {
      const state = loadGodModeState()
      expect(state).toEqual(DEFAULT_WINDOW_STATE)
    })

    it('should load saved state', () => {
      const savedState: GodModeWindowState = {
        state: 'open',
        position: { x: 150, y: 250 },
        size: { ...DEFAULT_WINDOW_SIZE, width: 550, height: 650 },
        activeTab: 'search',
        isPinned: true,
        lastOpened: '2024-01-01T00:00:00.000Z',
      }
      localStorage.setItem(GOD_MODE_STORAGE_KEY, JSON.stringify(savedState))

      const loaded = loadGodModeState()
      expect(loaded.state).toBe('open')
      expect(loaded.position.x).toBe(150)
      expect(loaded.activeTab).toBe('search')
      expect(loaded.isPinned).toBe(true)
    })

    it('should merge with defaults for partial state', () => {
      const partialState = { state: 'minimized', activeTab: 'context' }
      localStorage.setItem(GOD_MODE_STORAGE_KEY, JSON.stringify(partialState))

      const loaded = loadGodModeState()
      expect(loaded.state).toBe('minimized')
      expect(loaded.activeTab).toBe('context')
      expect(loaded.position).toEqual(expect.objectContaining(DEFAULT_WINDOW_POSITION))
      expect(loaded.size).toEqual(expect.objectContaining(DEFAULT_WINDOW_SIZE))
    })

    it('should handle corrupted localStorage data', () => {
      localStorage.setItem(GOD_MODE_STORAGE_KEY, 'not valid json')
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const state = loadGodModeState()
      expect(state).toEqual(DEFAULT_WINDOW_STATE)
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })
})
