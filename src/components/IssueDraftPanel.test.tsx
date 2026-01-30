/**
 * Issue Draft Panel Component Tests (Simplified)
 *
 * Test suite for IssueDraftPanel React component.
 * Tests UI interaction, draft generation, and state management.
 *
 * TASK 56: Issue Draft Generator (Phase 9 - GOD MODE)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { IssueDraftPanel } from '../components/IssueDraftPanel'
import type { ConversationMessage } from '../types/god-mode'

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
      icon: '🐛',
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
      icon: '🚀',
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
          keyPhrases: ['баг', 'ошибка'],
          requirements: ['исправить проблему'],
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
vi.mock('../lib/github-api', () => {
  return {
    createGitHubClient: vi.fn().mockReturnValue({
      isAuthenticated: () => false,
      getAuthState: vi.fn().mockResolvedValue({ authenticated: false }),
      getConfig: () => ({ owner: '', repo: '', apiBaseUrl: '' }),
    }),
  }
})

describe('IssueDraftPanel', () => {
  const mockConversationMessages: ConversationMessage[] = [
    {
      id: '1',
      role: 'user',
      content: 'У меня проблема с кнопкой, не работает',
      timestamp: new Date().toISOString(),
    },
    {
      id: '2',
      role: 'assistant',
      content: 'Какая именно проблема с кнопкой?',
      timestamp: new Date().toISOString(),
    },
  ]

  const defaultProps = {
    conversationMessages: mockConversationMessages,
    language: 'ru' as const,
    showAdvancedOptions: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial Rendering', () => {
    it('should render with correct title', () => {
      render(<IssueDraftPanel {...defaultProps} />)

      expect(screen.getByText('Черновики задач')).toBeInTheDocument()
      expect(screen.getByText('📝')).toBeInTheDocument()
    })

    it('should render in English when language is en', () => {
      render(<IssueDraftPanel {...defaultProps} language="en" />)

      expect(screen.getByText('Issue Drafts')).toBeInTheDocument()
      expect(screen.getByText('📝')).toBeInTheDocument()
    })

    it('should show template selection when no draft', () => {
      render(<IssueDraftPanel {...defaultProps} />)

      expect(screen.getByText('Создать черновик')).toBeInTheDocument()
      expect(
        screen.getByText(
          'Используйте ИИ для создания черновика на основе диалога или выберите шаблон'
        )
      ).toBeInTheDocument()
    })

    it('should show template options', () => {
      render(<IssueDraftPanel {...defaultProps} />)

      // Template names are inside <option> elements with emoji prefix (e.g. "🐛 Bug Report")
      const select = screen.getByRole('combobox')
      const optionTexts = select.innerHTML
      expect(optionTexts).toContain('Bug Report')
      expect(optionTexts).toContain('Feature Request')
    })

    it('should show generate from conversation button when messages exist', () => {
      render(<IssueDraftPanel {...defaultProps} />)

      expect(screen.getByText('🤖 Создать из диалога')).toBeInTheDocument()
    })

    it('should not show generate button when no messages', () => {
      render(<IssueDraftPanel {...defaultProps} conversationMessages={[]} />)

      expect(screen.queryByText('🤖 Создать из диалога')).not.toBeInTheDocument()
    })
  })

  describe('Template Selection', () => {
    it('should render templates in select', () => {
      render(<IssueDraftPanel {...defaultProps} />)

      const select = screen.getByDisplayValue('Выберите шаблон...')
      expect(select).toBeInTheDocument()
    })

    it('should show option placeholders', () => {
      render(<IssueDraftPanel {...defaultProps} language="en" />)

      expect(screen.getByText('Choose template...')).toBeInTheDocument()
    })
  })

  describe('Integration', () => {
    it('should work with custom settings', () => {
      const customSettings = {
        defaultType: 'feature' as const,
        defaultPriority: 'high' as const,
        language: 'en' as const,
      }

      render(<IssueDraftPanel {...defaultProps} language="en" settings={customSettings} />)

      expect(screen.getByText('Issue Drafts')).toBeInTheDocument()
    })

    it('should apply custom styles', () => {
      const customStyle = { backgroundColor: 'red' }

      const { container } = render(<IssueDraftPanel {...defaultProps} style={customStyle} />)

      const outerDiv = container.firstElementChild as HTMLElement
      expect(outerDiv.style.backgroundColor).toBe('red')
    })

    it('should apply custom className', () => {
      const { container } = render(<IssueDraftPanel {...defaultProps} className="custom-class" />)

      const outerDiv = container.firstElementChild as HTMLElement
      expect(outerDiv).toHaveClass('custom-class')
    })
  })
})
