/**
 * Comprehensive unit tests for ConversationPanel Vue component
 * Migrated from ConversationPanel.test.tsx (React) + existing Vue tests
 * TASK 66: Vue.js 3.0 Migration
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { shallowMount, flushPromises, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import ConversationPanel from './ConversationPanel.vue'
import { CONVERSATION_SUGGESTIONS } from '../types/god-mode'

// Mock conversation-agent module
const mockProcessMessage = vi.fn().mockResolvedValue({
  success: true,
  message: {
    id: 'resp_1',
    role: 'assistant',
    content: 'Test response',
    timestamp: new Date().toISOString(),
  },
  suggestions: [],
})
const mockGetSession = vi.fn().mockReturnValue({
  id: 'session_1',
  title: 'Test',
  messages: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  status: 'idle',
  language: 'ru',
})
const mockClearSession = vi.fn().mockReturnValue({
  id: 'session_2',
  title: '',
  messages: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  status: 'idle',
  language: 'ru',
})

vi.mock('../lib/conversation-agent', () => ({
  createConversationAgent: vi.fn(() => ({
    processMessage: mockProcessMessage,
    getSession: mockGetSession,
    clearSession: mockClearSession,
  })),
  resetDefaultAgent: vi.fn(),
}))

describe('ConversationPanel Vue Component', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    // Reset getSession to return empty messages
    mockGetSession.mockReturnValue({
      id: 'session_1',
      title: 'Test',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'idle',
      language: 'ru',
    })
  })

  afterEach(() => {
    localStorage.clear()
  })

  function mountPanel(props: Record<string, unknown> = {}) {
    return shallowMount(ConversationPanel, { props })
  }

  // ========================================================================
  // Module Exports (from original Vue test)
  // ========================================================================
  describe('Module Exports', () => {
    it('should export ConversationPanel.vue as a valid Vue component', async () => {
      const module = await import('./ConversationPanel.vue')
      expect(module.default).toBeDefined()
      expect(typeof module.default).toBe('object')
    })
  })

  // ========================================================================
  // Message Types (from original Vue test)
  // ========================================================================
  describe('Message Types', () => {
    it('should define all valid message types', () => {
      const messageTypes = ['user', 'assistant', 'system']
      expect(messageTypes.length).toBe(3)
      expect(messageTypes).toContain('user')
      expect(messageTypes).toContain('assistant')
      expect(messageTypes).toContain('system')
    })

    it('should have correct message structure', () => {
      const message = {
        id: 'msg-001',
        type: 'user' as const,
        content: 'Hello',
        timestamp: Date.now(),
      }
      expect(message.id).toBeDefined()
      expect(message.type).toBe('user')
      expect(typeof message.content).toBe('string')
      expect(typeof message.timestamp).toBe('number')
    })
  })

  // ========================================================================
  // Suggestion Items (from original Vue test)
  // ========================================================================
  describe('Suggestion Items', () => {
    it('should have correct suggestion structure', () => {
      const suggestion = {
        label: 'Describe this component',
        action: 'describe',
        icon: 'info',
      }
      expect(suggestion.label).toBeDefined()
      expect(typeof suggestion.label).toBe('string')
      expect(suggestion.action).toBeDefined()
      expect(suggestion.icon).toBeDefined()
    })

    it('should support multiple suggestion items', () => {
      const suggestions = [
        { label: 'Describe component', action: 'describe' },
        { label: 'Find issues', action: 'issues' },
        { label: 'Show patterns', action: 'patterns' },
      ]
      expect(suggestions.length).toBeGreaterThanOrEqual(1)
      suggestions.forEach((s) => {
        expect(s.label).toBeDefined()
        expect(s.action).toBeDefined()
      })
    })
  })

  // ========================================================================
  // Typing Indicator (from original Vue test)
  // ========================================================================
  describe('Typing Indicator', () => {
    it('should define typing indicator states', () => {
      const typingStates = ['idle', 'typing', 'thinking']
      expect(typingStates).toContain('idle')
      expect(typingStates).toContain('typing')
      expect(typingStates).toContain('thinking')
    })
  })

  // ========================================================================
  // Conversation Agent Integration (from original Vue test)
  // ========================================================================
  describe('Conversation Agent Integration', () => {
    it('should import conversation agent module', async () => {
      const agentModule = await import('../lib/conversation-agent')
      expect(agentModule).toBeDefined()
    })
  })

  // ========================================================================
  // Rendering (from React test)
  // ========================================================================
  describe('Rendering', () => {
    it('should render the conversation panel', () => {
      const wrapper = mountPanel()
      expect(wrapper.find('[data-testid="conversation-panel"]').exists()).toBe(true)
    })

    it('should render empty state when no messages', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toMatch(/Начните диалог|Start a conversation/)
    })

    it('should render message input', () => {
      const wrapper = mountPanel()
      expect(wrapper.find('[data-testid="message-input"]').exists()).toBe(true)
    })

    it('should render send button', () => {
      const wrapper = mountPanel()
      expect(wrapper.find('[data-testid="send-button"]').exists()).toBe(true)
    })

    it('should render suggestions when panel is empty', () => {
      const wrapper = mountPanel()
      expect(wrapper.find('[data-testid="suggestions"]').exists()).toBe(true)
    })
  })

  // ========================================================================
  // Input Handling (from React test)
  // ========================================================================
  describe('Input Handling', () => {
    it('should update input value on typing', async () => {
      const wrapper = mountPanel()
      const input = wrapper.find('[data-testid="message-input"]')
      await input.setValue('Hello')
      expect((input.element as HTMLTextAreaElement).value).toBe('Hello')
    })

    it('should disable send button when input is empty', () => {
      const wrapper = mountPanel()
      const sendButton = wrapper.find('[data-testid="send-button"]')
      expect(sendButton.attributes('disabled')).toBeDefined()
    })

    it('should enable send button when input has content', async () => {
      const wrapper = mountPanel()
      const input = wrapper.find('[data-testid="message-input"]')
      await input.setValue('Test message')
      await nextTick()
      const sendButton = wrapper.find('[data-testid="send-button"]')
      expect(sendButton.attributes('disabled')).toBeUndefined()
    })
  })

  // ========================================================================
  // Suggestions (from React test)
  // ========================================================================
  describe('Suggestions', () => {
    it('should render suggestion buttons', () => {
      const wrapper = mountPanel()
      const suggestion0 = wrapper.find('[data-testid="suggestion-0"]')
      expect(suggestion0.exists()).toBe(true)
    })

    it('should fill input when suggestion is clicked', async () => {
      const wrapper = mountPanel({ settings: { preferredLanguage: 'ru' } })
      const firstSuggestion = wrapper.find('[data-testid="suggestion-0"]')
      await firstSuggestion.trigger('click')
      await nextTick()

      const input = wrapper.find('[data-testid="message-input"]')
      expect((input.element as HTMLTextAreaElement).value).toBe(CONVERSATION_SUGGESTIONS[0].textRu)
    })

    it('should display suggestion icons', () => {
      const wrapper = mountPanel()
      const firstSuggestion = wrapper.find('[data-testid="suggestion-0"]')
      expect(firstSuggestion.text()).toContain(CONVERSATION_SUGGESTIONS[0].icon)
    })
  })

  // ========================================================================
  // Settings (from React test)
  // ========================================================================
  describe('Settings', () => {
    it('should use English language when configured', () => {
      const wrapper = mountPanel({ settings: { preferredLanguage: 'en' } })
      expect(wrapper.text()).toMatch(/Start a conversation/)
    })

    it('should use Russian language when configured', () => {
      const wrapper = mountPanel({ settings: { preferredLanguage: 'ru' } })
      expect(wrapper.text()).toMatch(/Начните диалог/)
    })

    it('should hide suggestions when showSuggestions is false', () => {
      const wrapper = mountPanel({ settings: { showSuggestions: false } })
      expect(wrapper.find('[data-testid="suggestions"]').exists()).toBe(false)
    })
  })

  // ========================================================================
  // Callbacks / Emits (from React test)
  // ========================================================================
  describe('Callbacks / Emits', () => {
    it('should emit messageSent when message is sent', async () => {
      const wrapper = mountPanel()
      const input = wrapper.find('[data-testid="message-input"]')
      await input.setValue('Test message')
      await nextTick()

      // Trigger form submit directly (button click as type=submit may not bubble in jsdom)
      const form = wrapper.find('form')
      if (form.exists()) {
        await form.trigger('submit')
      } else {
        await wrapper.find('[data-testid="send-button"]').trigger('click')
      }
      await flushPromises()
      await nextTick()

      expect(wrapper.emitted('messageSent')).toBeTruthy()
      expect(wrapper.emitted('messageSent')![0]).toEqual(['Test message'])
    })
  })

  // ========================================================================
  // Context Handling (from React test)
  // ========================================================================
  describe('Context Handling', () => {
    it('should accept selectedComponentId prop', () => {
      const wrapper = mountPanel({ selectedComponentId: 'TestComponent' })
      expect(wrapper.find('[data-testid="conversation-panel"]').exists()).toBe(true)
    })
  })

  // ========================================================================
  // Accessibility (from React test)
  // ========================================================================
  describe('Accessibility', () => {
    it('should have accessible input placeholder', () => {
      const wrapper = mountPanel({ settings: { preferredLanguage: 'ru' } })
      const input = wrapper.find('[data-testid="message-input"]')
      expect(input.attributes('placeholder')).toBeTruthy()
    })
  })
})
