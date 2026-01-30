/**
 * GOD MODE Library Extraction Tests
 *
 * Tests verifying the extracted @isocubic/god-mode library package
 * works correctly as a standalone unit.
 *
 * TASK 59: GOD MODE Library Extraction (Phase 9)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Import from the library package
import {
  // Types/common
  detectLanguage,
  DEFAULT_COMPONENT_REGISTRY,
  // Types/god-mode
  GOD_MODE_TABS,
  DEFAULT_WINDOW_SIZE,
  DEFAULT_KEYBOARD_SHORTCUTS,
  DEFAULT_GOD_MODE_CONFIG,
  DEFAULT_WINDOW_STATE,
  CONVERSATION_SUGGESTIONS,
  getStorageKey,
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
  getConversationStorageKey,
  generateMessageId,
  generateSessionId,
  createMessage,
  createSession,
  loadConversationSession,
  saveConversationSession,
  clearConversationSession,
  // Types/issue-generator
  DEFAULT_ISSUE_DRAFT_SETTINGS,
  BUILTIN_ISSUE_TEMPLATES,
  LABEL_COLORS,
  PRIORITY_LABELS,
  TYPE_LABELS,
  getDefaultLabels,
  validateIssueDraft,
  createIssueDraft,
  getIssueDraftStorageKey,
  MAX_DRAFTS_COUNT,
  DRAFT_AUTO_SAVE_INTERVAL,
} from '../../packages/god-mode/src'

import type {
  QueryLanguage,
  ComponentMeta,
  ComponentRegistry,
  GodModeConfig,
  GodModeTab,
  ConversationMessage,
  IssueDraft,
  IssueType,
  IssuePriority,
} from '../../packages/god-mode/src'

describe('GOD MODE Library (@isocubic/god-mode)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  // ===========================================================================
  // Common Types
  // ===========================================================================
  describe('common types', () => {
    describe('detectLanguage', () => {
      it('should detect Russian text', () => {
        expect(detectLanguage('Привет мир')).toBe('ru')
        expect(detectLanguage('Что можно улучшить?')).toBe('ru')
      })

      it('should detect English text', () => {
        expect(detectLanguage('Hello world')).toBe('en')
        expect(detectLanguage('What can be improved?')).toBe('en')
      })

      it('should default to English for non-Cyrillic text', () => {
        expect(detectLanguage('12345')).toBe('en')
        expect(detectLanguage('')).toBe('en')
      })
    })

    describe('DEFAULT_COMPONENT_REGISTRY', () => {
      it('should return empty arrays by default', () => {
        expect(DEFAULT_COMPONENT_REGISTRY.getAllComponents()).toEqual([])
        expect(DEFAULT_COMPONENT_REGISTRY.searchComponents('test')).toEqual([])
      })
    })

    describe('ComponentRegistry interface', () => {
      it('should allow custom implementations', () => {
        const components: ComponentMeta[] = [
          { id: 'btn', name: 'Button', description: 'A button' },
          { id: 'input', name: 'Input', description: 'An input field' },
        ]

        const registry: ComponentRegistry = {
          getAllComponents: () => components,
          searchComponents: (q) =>
            components.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())),
        }

        expect(registry.getAllComponents()).toHaveLength(2)
        expect(registry.searchComponents('but')).toHaveLength(1)
        expect(registry.searchComponents('xyz')).toHaveLength(0)
      })
    })
  })

  // ===========================================================================
  // GOD MODE Types
  // ===========================================================================
  describe('god-mode types', () => {
    describe('GOD_MODE_TABS', () => {
      it('should have 5 tabs', () => {
        expect(GOD_MODE_TABS).toHaveLength(5)
      })

      it('should include all tab IDs', () => {
        const ids = GOD_MODE_TABS.map((t) => t.id)
        expect(ids).toEqual(['query', 'context', 'search', 'conversation', 'issues'])
      })

      it('should have bilingual labels', () => {
        for (const tab of GOD_MODE_TABS) {
          expect(tab.labelRu).toBeTruthy()
          expect(tab.labelEn).toBeTruthy()
          expect(tab.descriptionRu).toBeTruthy()
          expect(tab.descriptionEn).toBeTruthy()
        }
      })

      it('should have all tabs available', () => {
        expect(GOD_MODE_TABS.every((t) => t.available)).toBe(true)
      })
    })

    describe('configurable storage keys', () => {
      it('should use default prefix', () => {
        expect(getStorageKey()).toBe('god_mode_state')
        expect(getConversationStorageKey()).toBe('god_mode_conversation')
        expect(getIssueDraftStorageKey()).toBe('god_mode_issue_drafts')
      })

      it('should use custom prefix', () => {
        expect(getStorageKey('my_app')).toBe('my_app_state')
        expect(getConversationStorageKey('my_app')).toBe('my_app_conversation')
        expect(getIssueDraftStorageKey('my_app')).toBe('my_app_issue_drafts')
      })
    })

    describe('loadGodModeState', () => {
      it('should return default state when nothing stored', () => {
        const state = loadGodModeState()
        expect(state).toEqual(DEFAULT_WINDOW_STATE)
      })

      it('should load stored state with custom prefix', () => {
        const customState = { ...DEFAULT_WINDOW_STATE, state: 'open' as const, isPinned: true }
        localStorage.setItem('my_app_state', JSON.stringify(customState))

        const loaded = loadGodModeState('my_app')
        expect(loaded.state).toBe('open')
        expect(loaded.isPinned).toBe(true)
      })

      it('should handle corrupted data gracefully', () => {
        localStorage.setItem('god_mode_state', 'invalid json')
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

        const state = loadGodModeState()
        expect(state).toEqual(DEFAULT_WINDOW_STATE)

        consoleSpy.mockRestore()
      })
    })

    describe('saveGodModeState', () => {
      it('should save state with custom prefix', () => {
        saveGodModeState(DEFAULT_WINDOW_STATE, 'custom')
        const stored = localStorage.getItem('custom_state')
        expect(stored).toBeTruthy()
        expect(JSON.parse(stored!)).toEqual(DEFAULT_WINDOW_STATE)
      })
    })

    describe('isValidTab', () => {
      it('should validate valid tabs', () => {
        expect(isValidTab('query')).toBe(true)
        expect(isValidTab('context')).toBe(true)
        expect(isValidTab('search')).toBe(true)
        expect(isValidTab('conversation')).toBe(true)
        expect(isValidTab('issues')).toBe(true)
      })

      it('should reject invalid tabs', () => {
        expect(isValidTab('invalid')).toBe(false)
        expect(isValidTab('')).toBe(false)
      })
    })

    describe('getTabInfo', () => {
      it('should return tab info by ID', () => {
        const tab = getTabInfo('conversation')
        expect(tab).toBeDefined()
        expect(tab!.id).toBe('conversation')
        expect(tab!.labelEn).toBe('Chat')
      })

      it('should return undefined for invalid tab', () => {
        expect(getTabInfo('invalid' as GodModeTab)).toBeUndefined()
      })
    })

    describe('getAvailableTabs', () => {
      it('should return tabs based on config', () => {
        const config: GodModeConfig = { tabs: ['conversation', 'issues'] }
        const tabs = getAvailableTabs(config)
        expect(tabs.map((t) => t.id)).toEqual(['conversation', 'issues'])
      })

      it('should return default tabs when no config', () => {
        const tabs = getAvailableTabs()
        expect(tabs.length).toBeGreaterThan(0)
      })
    })

    describe('utility functions', () => {
      it('clamp should work correctly', () => {
        expect(clamp(5, 0, 10)).toBe(5)
        expect(clamp(-5, 0, 10)).toBe(0)
        expect(clamp(15, 0, 10)).toBe(10)
      })

      it('constrainPosition should keep window in viewport', () => {
        const pos = constrainPosition({ x: -100, y: -100 }, DEFAULT_WINDOW_SIZE, 1920, 1080)
        expect(pos.x).toBeGreaterThanOrEqual(20)
        expect(pos.y).toBeGreaterThanOrEqual(20)
      })

      it('constrainSize should respect min/max', () => {
        const size = constrainSize({ width: 100, height: 100 })
        expect(size.width).toBe(DEFAULT_WINDOW_SIZE.minWidth)
        expect(size.height).toBe(DEFAULT_WINDOW_SIZE.minHeight)
      })
    })

    describe('keyboard shortcuts', () => {
      it('parseShortcut should parse correctly', () => {
        const parsed = parseShortcut('Ctrl+Shift+G')
        expect(parsed.ctrl).toBe(true)
        expect(parsed.shift).toBe(true)
        expect(parsed.key).toBe('g')
      })

      it('matchesShortcut should match keyboard events', () => {
        const event = new KeyboardEvent('keydown', {
          key: 'g',
          ctrlKey: true,
          shiftKey: true,
        })
        expect(matchesShortcut(event, 'Ctrl+Shift+G')).toBe(true)
      })

      it('matchesShortcut should not match wrong shortcuts', () => {
        const event = new KeyboardEvent('keydown', {
          key: 'g',
          ctrlKey: false,
          shiftKey: true,
        })
        expect(matchesShortcut(event, 'Ctrl+Shift+G')).toBe(false)
      })
    })
  })

  // ===========================================================================
  // Conversation Types
  // ===========================================================================
  describe('conversation types', () => {
    describe('CONVERSATION_SUGGESTIONS', () => {
      it('should have 5 suggestions', () => {
        expect(CONVERSATION_SUGGESTIONS).toHaveLength(5)
      })

      it('should have bilingual text', () => {
        for (const suggestion of CONVERSATION_SUGGESTIONS) {
          expect(suggestion.textRu).toBeTruthy()
          expect(suggestion.textEn).toBeTruthy()
          expect(suggestion.icon).toBeTruthy()
        }
      })
    })

    describe('message and session creation', () => {
      it('generateMessageId should produce unique IDs', () => {
        const id1 = generateMessageId()
        const id2 = generateMessageId()
        expect(id1).not.toBe(id2)
        expect(id1).toMatch(/^msg_/)
      })

      it('generateSessionId should produce unique IDs', () => {
        const id1 = generateSessionId()
        const id2 = generateSessionId()
        expect(id1).not.toBe(id2)
        expect(id1).toMatch(/^session_/)
      })

      it('createMessage should create valid message', () => {
        const msg = createMessage('user', 'Hello')
        expect(msg.role).toBe('user')
        expect(msg.content).toBe('Hello')
        expect(msg.timestamp).toBeTruthy()
        expect(msg.isStreaming).toBe(false)
      })

      it('createMessage with context', () => {
        const msg = createMessage('user', 'Test', { componentId: 'btn' })
        expect(msg.context?.componentId).toBe('btn')
      })

      it('createSession should create valid session', () => {
        const session = createSession('en')
        expect(session.language).toBe('en')
        expect(session.title).toBe('New conversation')
        expect(session.messages).toEqual([])
        expect(session.status).toBe('idle')
      })

      it('createSession defaults to Russian', () => {
        const session = createSession()
        expect(session.language).toBe('ru')
        expect(session.title).toBe('Новый диалог')
      })
    })

    describe('session persistence with custom prefix', () => {
      it('should save and load session', () => {
        const session = createSession('en')
        saveConversationSession(session, 'test_prefix')

        const loaded = loadConversationSession('test_prefix')
        expect(loaded).toBeTruthy()
        expect(loaded!.id).toBe(session.id)
      })

      it('should clear session', () => {
        const session = createSession()
        saveConversationSession(session, 'test_prefix')
        clearConversationSession('test_prefix')

        const loaded = loadConversationSession('test_prefix')
        expect(loaded).toBeNull()
      })

      it('should return null when no session stored', () => {
        expect(loadConversationSession('nonexistent')).toBeNull()
      })
    })
  })

  // ===========================================================================
  // Issue Generator Types
  // ===========================================================================
  describe('issue-generator types', () => {
    describe('DEFAULT_ISSUE_DRAFT_SETTINGS', () => {
      it('should have sensible defaults', () => {
        expect(DEFAULT_ISSUE_DRAFT_SETTINGS.language).toBe('ru')
        expect(DEFAULT_ISSUE_DRAFT_SETTINGS.defaultType).toBe('improvement')
        expect(DEFAULT_ISSUE_DRAFT_SETTINGS.defaultPriority).toBe('medium')
        expect(DEFAULT_ISSUE_DRAFT_SETTINGS.validateBeforeReady).toBe(true)
      })
    })

    describe('BUILTIN_ISSUE_TEMPLATES', () => {
      it('should have 3 templates', () => {
        expect(BUILTIN_ISSUE_TEMPLATES).toHaveLength(3)
      })

      it('should include bug, feature, improvement', () => {
        const types = BUILTIN_ISSUE_TEMPLATES.map((t) => t.type)
        expect(types).toContain('bug')
        expect(types).toContain('feature')
        expect(types).toContain('improvement')
      })

      it('should have all templates marked as builtin', () => {
        expect(BUILTIN_ISSUE_TEMPLATES.every((t) => t.builtin)).toBe(true)
      })
    })

    describe('label mappings', () => {
      it('PRIORITY_LABELS should have all priorities', () => {
        expect(PRIORITY_LABELS.low).toBe('priority: low')
        expect(PRIORITY_LABELS.medium).toBe('priority: medium')
        expect(PRIORITY_LABELS.high).toBe('priority: high')
        expect(PRIORITY_LABELS.critical).toBe('priority: critical')
      })

      it('TYPE_LABELS should have all types', () => {
        expect(TYPE_LABELS.bug).toBe('type: bug')
        expect(TYPE_LABELS.feature).toBe('type: feature')
        expect(TYPE_LABELS.improvement).toBe('type: improvement')
        expect(TYPE_LABELS.documentation).toBe('type: documentation')
        expect(TYPE_LABELS.question).toBe('type: question')
        expect(TYPE_LABELS.maintenance).toBe('type: maintenance')
      })

      it('LABEL_COLORS should have color values', () => {
        expect(LABEL_COLORS.bug).toBe('d73a4a')
        expect(LABEL_COLORS.enhancement).toBe('a2eeef')
      })
    })

    describe('getDefaultLabels', () => {
      it('should include type and priority labels', () => {
        const labels = getDefaultLabels('bug', 'high')
        expect(labels).toContain('type: bug')
        expect(labels).toContain('priority: high')
        expect(labels).toContain('needs-triage')
      })

      it('should add enhancement for features', () => {
        const labels = getDefaultLabels('feature', 'medium')
        expect(labels).toContain('enhancement')
        expect(labels).toContain('feature-request')
      })

      it('should add enhancement for improvements', () => {
        const labels = getDefaultLabels('improvement', 'low')
        expect(labels).toContain('enhancement')
      })
    })

    describe('validateIssueDraft', () => {
      it('should validate a valid draft', () => {
        const result = validateIssueDraft({
          title: 'Test issue',
          body: 'Issue description',
          type: 'bug',
          priority: 'high',
        })
        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should reject draft without title', () => {
        const result = validateIssueDraft({ body: 'Description', type: 'bug', priority: 'low' })
        expect(result.isValid).toBe(false)
        expect(result.errors).toContain('Title is required')
      })

      it('should warn about long titles', () => {
        const result = validateIssueDraft({
          title: 'A'.repeat(73),
          body: 'Description',
          type: 'bug',
          priority: 'low',
        })
        expect(result.isValid).toBe(true)
        expect(result.warnings).toContain('Title is too long (>72 characters)')
      })

      it('should reject draft without description', () => {
        const result = validateIssueDraft({ title: 'Test', type: 'bug', priority: 'low' })
        expect(result.isValid).toBe(false)
        expect(result.errors).toContain('Description is required')
      })
    })

    describe('createIssueDraft', () => {
      it('should create draft with defaults', () => {
        const draft = createIssueDraft()
        expect(draft.id).toMatch(/^draft_/)
        expect(draft.type).toBe('improvement')
        expect(draft.priority).toBe('medium')
        expect(draft.status).toBe('draft')
        expect(draft.confidence).toBe(0.5)
      })

      it('should merge overrides', () => {
        const draft = createIssueDraft({
          title: 'My Issue',
          type: 'bug',
          priority: 'critical',
        })
        expect(draft.title).toBe('My Issue')
        expect(draft.type).toBe('bug')
        expect(draft.priority).toBe('critical')
      })
    })

    describe('constants', () => {
      it('MAX_DRAFTS_COUNT should be 50', () => {
        expect(MAX_DRAFTS_COUNT).toBe(50)
      })

      it('DRAFT_AUTO_SAVE_INTERVAL should be 30000', () => {
        expect(DRAFT_AUTO_SAVE_INTERVAL).toBe(30000)
      })
    })
  })

  // ===========================================================================
  // Default Config
  // ===========================================================================
  describe('DEFAULT_GOD_MODE_CONFIG', () => {
    it('should have configurable storageKeyPrefix', () => {
      expect(DEFAULT_GOD_MODE_CONFIG.storageKeyPrefix).toBe('god_mode')
    })

    it('should persist state by default', () => {
      expect(DEFAULT_GOD_MODE_CONFIG.persistState).toBe(true)
    })

    it('should default to Russian language', () => {
      expect(DEFAULT_GOD_MODE_CONFIG.preferredLanguage).toBe('ru')
    })

    it('should have keyboard shortcuts', () => {
      expect(DEFAULT_GOD_MODE_CONFIG.shortcuts).toEqual(DEFAULT_KEYBOARD_SHORTCUTS)
    })
  })

  // ===========================================================================
  // Library Package Integrity
  // ===========================================================================
  describe('library package integrity', () => {
    it('should export all required types', () => {
      // Verify type imports compile (TypeScript compile-time check)
      const _lang: QueryLanguage = 'en'
      const _tab: GodModeTab = 'conversation'
      const _type: IssueType = 'bug'
      const _priority: IssuePriority = 'high'

      // These are compile-time assertions
      expect(_lang).toBe('en')
      expect(_tab).toBe('conversation')
      expect(_type).toBe('bug')
      expect(_priority).toBe('high')
    })

    it('should export ComponentMeta and ComponentRegistry types', () => {
      const meta: ComponentMeta = {
        id: 'test',
        name: 'Test',
        description: 'A test component',
        category: 'ui',
        tags: ['test'],
      }
      expect(meta.id).toBe('test')

      const registry: ComponentRegistry = DEFAULT_COMPONENT_REGISTRY
      expect(registry.getAllComponents()).toEqual([])
    })

    it('should export ConversationMessage type', () => {
      const msg: ConversationMessage = createMessage('user', 'Hello')
      expect(msg.role).toBe('user')
    })

    it('should export IssueDraft type', () => {
      const draft: IssueDraft = createIssueDraft({ title: 'Test' })
      expect(draft.title).toBe('Test')
    })

    it('should not contain isocubic-specific storage keys', () => {
      // The library should not hardcode 'isocubic' in any storage keys
      expect(getStorageKey()).not.toContain('isocubic')
      expect(getConversationStorageKey()).not.toContain('isocubic')
      expect(getIssueDraftStorageKey()).not.toContain('isocubic')
    })
  })
})
