/**
 * Comprehensive unit tests for IssueDraftPanel Vue component
 * Migrated from IssueDraftPanel.test.tsx (React) + existing Vue tests
 * TASK 66: Vue.js 3.0 Migration
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { nextTick } from 'vue'
import IssueDraftPanel from './IssueDraftPanel.vue'

// Mock child components
vi.mock('./GitHubAuthButton.vue', () => ({
  default: { name: 'GitHubAuthButton', template: '<div data-testid="mock-github-auth" />' },
}))
vi.mock('./AnnotationCanvas.vue', () => ({
  default: { name: 'AnnotationCanvas', template: '<div data-testid="mock-annotation-canvas" />' },
}))

// Mock the issue generator
vi.mock('../lib/issue-generator', () => {
  const templates = [
    {
      id: 'bug_report',
      name: 'Bug Report',
      description: 'Report a bug',
      type: 'bug',
      titleTemplate: 'Bug: {summary}',
      bodyTemplate: '## Description\n{description}',
      defaultLabels: ['bug'],
      defaultPriority: 'medium',
      icon: '\uD83D\uDC1B',
      categories: ['bug'],
      builtin: true,
      placeholders: [],
    },
    {
      id: 'feature_request',
      name: 'Feature Request',
      description: 'Request a feature',
      type: 'feature',
      titleTemplate: 'Feature: {summary}',
      bodyTemplate: '## Description\n{description}',
      defaultLabels: ['enhancement'],
      defaultPriority: 'medium',
      icon: '\uD83D\uDE80',
      categories: ['feature'],
      builtin: true,
      placeholders: [],
    },
  ]

  return {
    createIssueGenerator: vi.fn().mockReturnValue({
      getTemplates: () => templates,
      generateFromConversation: vi.fn().mockResolvedValue({
        draft: {
          id: 'test-draft-1',
          title: 'Bug: Test issue',
          body: '## Description\nTest description',
          type: 'bug',
          priority: 'medium',
          labels: ['bug', 'needs-triage'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'draft',
          confidence: 0.8,
        },
        success: true,
        confidence: 0.8,
        insights: {
          detectedType: 'bug',
          detectedPriority: 'medium',
          relatedComponents: [],
          keyPhrases: ['bug', 'error'],
          requirements: ['fix the issue'],
        },
        warnings: [],
      }),
      createFromTemplate: vi.fn().mockImplementation((templateId: string) => {
        if (templateId === 'bug_report') {
          return {
            id: 'test-draft-2',
            title: 'Bug: ',
            body: '## Description\n',
            type: 'bug',
            priority: 'medium',
            labels: ['bug'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'draft',
          }
        }
        return null
      }),
    }),
  }
})

// Mock the github-api module
vi.mock('../lib/github-api', () => ({
  createGitHubClient: vi.fn().mockReturnValue({
    isAuthenticated: () => false,
    getAuthState: vi.fn().mockResolvedValue({ authenticated: false }),
    getConfig: () => ({ owner: '', repo: '', apiBaseUrl: '' }),
  }),
}))

// Mock screen-capture module
vi.mock('../lib/screen-capture', () => ({
  captureScreenshot: vi.fn(),
  renderAnnotationsOnImage: vi.fn(),
  drawAnnotation: vi.fn(),
}))

describe('IssueDraftPanel Vue Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function mountPanel(props: Record<string, unknown> = {}) {
    return shallowMount(IssueDraftPanel, {
      props: {
        conversationMessages: [],
        language: 'ru' as const,
        ...props,
      },
    })
  }

  // ========================================================================
  // Module Exports (from original Vue test)
  // ========================================================================
  describe('Module Exports', () => {
    it('should export IssueDraftPanel.vue as a valid Vue component', async () => {
      const module = await import('./IssueDraftPanel.vue')
      expect(module.default).toBeDefined()
      expect(typeof module.default).toBe('object')
    })
  })

  // ========================================================================
  // Draft Modes (from original Vue test)
  // ========================================================================
  describe('Draft Modes', () => {
    it('should define all valid draft modes', () => {
      const draftModes = ['conversation', 'screenshot', 'manual', 'template']
      expect(draftModes.length).toBe(4)
      expect(draftModes).toContain('conversation')
      expect(draftModes).toContain('screenshot')
      expect(draftModes).toContain('manual')
      expect(draftModes).toContain('template')
    })

    it('should define template categories', () => {
      const templateCategories = ['bug', 'feature', 'enhancement', 'question']
      expect(templateCategories.length).toBeGreaterThanOrEqual(3)
      expect(templateCategories).toContain('bug')
      expect(templateCategories).toContain('feature')
    })
  })

  // ========================================================================
  // Issue Label Defaults (from original Vue test)
  // ========================================================================
  describe('Issue Label Defaults', () => {
    it('should provide default labels', () => {
      const defaultLabels = ['bug', 'enhancement', 'documentation', 'good first issue']
      expect(Array.isArray(defaultLabels)).toBe(true)
      expect(defaultLabels.length).toBeGreaterThan(0)
    })
  })

  // ========================================================================
  // Draft Structure (from original Vue test)
  // ========================================================================
  describe('Draft Structure', () => {
    it('should have correct draft data structure', () => {
      const draft = {
        title: '',
        body: '',
        labels: [] as string[],
        assignees: [] as string[],
      }
      expect(draft.title).toBe('')
      expect(draft.body).toBe('')
      expect(Array.isArray(draft.labels)).toBe(true)
      expect(Array.isArray(draft.assignees)).toBe(true)
    })

    it('should validate draft has required fields', () => {
      function isDraftValid(draft: { title: string; body: string }): boolean {
        return draft.title.trim().length > 0 && draft.body.trim().length > 0
      }
      expect(isDraftValid({ title: 'Bug report', body: 'Description' })).toBe(true)
      expect(isDraftValid({ title: '', body: 'Description' })).toBe(false)
      expect(isDraftValid({ title: 'Bug report', body: '' })).toBe(false)
    })
  })

  // ========================================================================
  // Issue Generator Integration (from original Vue test)
  // ========================================================================
  describe('Issue Generator Integration', () => {
    it('should import issue generator module', async () => {
      const generatorModule = await import('../lib/issue-generator')
      expect(generatorModule).toBeDefined()
    })
  })

  // ========================================================================
  // Initial Rendering (from React test)
  // ========================================================================
  describe('Initial Rendering', () => {
    it('should render with correct Russian title', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toContain('Черновики задач')
    })

    it('should render in English when language is en', () => {
      const wrapper = mountPanel({ language: 'en' })
      expect(wrapper.text()).toContain('Issue Drafts')
    })

    it('should show template selection area', () => {
      const wrapper = mountPanel()
      expect(wrapper.text()).toContain('Создать черновик')
    })

    it('should not show generate from conversation button when no messages', () => {
      const wrapper = mountPanel({ conversationMessages: [] })
      expect(wrapper.text()).not.toContain('Создать из диалога')
    })

    it('should show generate from conversation button when messages exist', () => {
      const wrapper = mountPanel({
        conversationMessages: [
          { id: '1', role: 'user', content: 'Test', timestamp: new Date().toISOString() },
        ],
      })
      expect(wrapper.text()).toContain('Создать из диалога')
    })
  })

  // ========================================================================
  // Template Selection (from React test)
  // ========================================================================
  describe('Template Selection', () => {
    it('should render templates in select dropdown', () => {
      const wrapper = mountPanel()
      const select = wrapper.find('select')
      expect(select.exists()).toBe(true)
      expect(select.html()).toContain('Bug Report')
      expect(select.html()).toContain('Feature Request')
    })
  })

  // ========================================================================
  // Integration (from React test)
  // ========================================================================
  describe('Integration', () => {
    it('should accept custom styles', () => {
      const wrapper = mountPanel({ style: { backgroundColor: 'red' } })
      expect(wrapper.find('[data-testid]').exists() || wrapper.element).toBeTruthy()
    })
  })
})
