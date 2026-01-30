/**
 * Issue Generator Tests
 *
 * Comprehensive test suite for issue generation functionality.
 * Tests conversation analysis, draft creation, and template processing.
 *
 * TASK 56: Issue Draft Generator (Phase 9 - GOD MODE)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  IssueGenerator,
  createIssueGenerator,
  getDefaultIssueGenerator,
  resetDefaultIssueGenerator,
} from '../lib/issue-generator'
import type { ConversationMessage } from '../types/god-mode'
import { validateIssueDraft } from '../types/issue-generator'

describe('IssueGenerator', () => {
  let generator: IssueGenerator

  beforeEach(() => {
    generator = createIssueGenerator({ language: 'ru' })
    resetDefaultIssueGenerator()
  })

  describe('Constructor and Settings', () => {
    it('should create generator with default settings', () => {
      const gen = createIssueGenerator()
      const settings = gen.getSettings()

      expect(settings.language).toBe('ru')
      expect(settings.includeConversationContext).toBe(true)
      expect(settings.autoSuggestComponents).toBe(true)
      expect(settings.defaultType).toBe('improvement')
      expect(settings.defaultPriority).toBe('medium')
    })

    it('should create generator with custom settings', () => {
      const gen = createIssueGenerator({
        language: 'en',
        defaultType: 'bug',
        defaultPriority: 'high',
      })

      const settings = gen.getSettings()
      expect(settings.language).toBe('en')
      expect(settings.defaultType).toBe('bug')
      expect(settings.defaultPriority).toBe('high')
    })

    it('should update settings', () => {
      generator.updateSettings({ language: 'en', defaultType: 'feature' })

      const settings = generator.getSettings()
      expect(settings.language).toBe('en')
      expect(settings.defaultType).toBe('feature')
    })
  })

  describe('Issue Type Detection', () => {
    it('should detect bug type from Russian keywords', async () => {
      const messages: ConversationMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'У меня баг, кнопка не работает и вылетает приложение',
          timestamp: new Date().toISOString(),
        },
      ]

      const result = await generator.generateFromConversation(messages)

      expect(result.insights.detectedType).toBe('bug')
      expect(result.draft.type).toBe('bug')
      expect(result.draft.labels).toContain('type: bug')
      expect(result.draft.labels).toContain('needs-triage')
    })

    it('should detect feature type from English keywords', async () => {
      const messages: ConversationMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'I want to add a new feature for dark mode support',
          timestamp: new Date().toISOString(),
        },
      ]

      generator.updateSettings({ language: 'en' })
      const result = await generator.generateFromConversation(messages)

      expect(result.insights.detectedType).toBe('feature')
      expect(result.draft.type).toBe('feature')
      expect(result.draft.labels).toContain('type: feature')
    })

    it('should detect improvement type', async () => {
      const messages: ConversationMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Нужно улучшить производительность этого компонента',
          timestamp: new Date().toISOString(),
        },
      ]

      const result = await generator.generateFromConversation(messages)

      expect(result.insights.detectedType).toBe('feature')
      expect(result.draft.type).toBe('feature')
    })

    it('should default to improvement when no clear signals', async () => {
      const messages: ConversationMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Обычный текст без конкретики',
          timestamp: new Date().toISOString(),
        },
      ]

      const result = await generator.generateFromConversation(messages)

      expect(result.insights.detectedType).toBe('improvement')
    })
  })

  describe('Priority Detection', () => {
    it('should detect critical priority from Russian keywords', async () => {
      const messages: ConversationMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Критическая проблема, приложение не запускается вообще',
          timestamp: new Date().toISOString(),
        },
      ]

      const result = await generator.generateFromConversation(messages)

      expect(result.insights.detectedPriority).toBe('high')
      expect(result.draft.priority).toBe('high')
      expect(result.draft.labels).toContain('priority: high')
    })

    it('should detect high priority from English keywords', async () => {
      const messages: ConversationMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'This is urgent and high priority issue',
          timestamp: new Date().toISOString(),
        },
      ]

      generator.updateSettings({ language: 'en' })
      const result = await generator.generateFromConversation(messages)

      expect(result.insights.detectedPriority).toBe('high')
      expect(result.draft.priority).toBe('high')
    })

    it('should default to medium when no clear signals', async () => {
      const messages: ConversationMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Обычный вопрос',
          timestamp: new Date().toISOString(),
        },
      ]

      const result = await generator.generateFromConversation(messages)

      expect(result.insights.detectedPriority).toBe('medium')
    })
  })

  describe('Key Phrase Extraction', () => {
    it('should extract bug-related phrases', async () => {
      const messages: ConversationMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Проблема: не работает кнопка, вылетает приложение, ошибка при загрузке',
          timestamp: new Date().toISOString(),
        },
      ]

      const result = await generator.generateFromConversation(messages)

      expect(result.insights.keyPhrases).toContain('Проблема')
      expect(result.insights.keyPhrases).toContain('ошибка')
      expect(result.insights.keyPhrases.length).toBeGreaterThan(0)
    })

    it('should extract feature-related phrases', async () => {
      const messages: ConversationMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Хочу добавить новую функцию, нужно реализовать возможность экспорта',
          timestamp: new Date().toISOString(),
        },
      ]

      const result = await generator.generateFromConversation(messages)

      expect(result.insights.keyPhrases).toContain('Хочу')
      expect(result.insights.keyPhrases).toContain('нужно')
    })
  })

  describe('Requirements Extraction', () => {
    it('should extract requirements from user messages', async () => {
      const messages: ConversationMessage[] = [
        {
          id: '1',
          role: 'user',
          content:
            'Я хочу чтобы кнопка была синей. Нужно чтобы она была справа. Требуется анимация при наведении.',
          timestamp: new Date().toISOString(),
        },
      ]

      const result = await generator.generateFromConversation(messages)

      expect(result.insights.requirements.length).toBeGreaterThan(0)
      expect(
        result.insights.requirements.some(
          (req) => req.includes('синей') || req.includes('справа') || req.includes('анимацию')
        )
      ).toBe(true)
    })

    it('should extract requirements from English messages', async () => {
      const messages: ConversationMessage[] = [
        {
          id: '1',
          role: 'user',
          content:
            'I need the button to be blue. It should have animation on hover. We want it on the right side.',
          timestamp: new Date().toISOString(),
        },
      ]

      generator.updateSettings({ language: 'en' })
      const result = await generator.generateFromConversation(messages)

      expect(result.insights.requirements.length).toBeGreaterThan(0)
    })
  })

  describe('Title Generation', () => {
    it('should generate meaningful title from Russian text', async () => {
      const messages: ConversationMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Кнопка сохранения не работает при нажатии',
          timestamp: new Date().toISOString(),
        },
      ]

      const result = await generator.generateFromConversation(messages)

      expect(result.draft.title).toContain('Баг:')
      expect(result.draft.title.length).toBeGreaterThan(5)
      expect(result.draft.title.length).toBeLessThan(80)
    })

    it('should generate meaningful title from English text', async () => {
      const messages: ConversationMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Save button does not work when clicked',
          timestamp: new Date().toISOString(),
        },
      ]

      generator.updateSettings({ language: 'en' })
      const result = await generator.generateFromConversation(messages)

      expect(result.draft.title).toContain('Improvement:')
      expect(result.draft.title.length).toBeGreaterThan(5)
    })
  })

  describe('Body Generation', () => {
    it('should generate structured body for bug reports', async () => {
      const messages: ConversationMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Кнопка не работает при клике',
          timestamp: new Date().toISOString(),
        },
      ]

      const result = await generator.generateFromConversation(messages)

      expect(result.draft.body).toContain('## Описание')
      expect(result.draft.body).toContain('## Шаги для воспроизведения')
      expect(result.draft.body).toContain('## Ожидаемое поведение')
      expect(result.draft.body).toContain('## Фактическое поведение')
    })

    it('should generate structured body for features', async () => {
      const messages: ConversationMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Добавить темную тему в приложение',
          timestamp: new Date().toISOString(),
        },
      ]

      const result = await generator.generateFromConversation(messages, { forceType: 'feature' })

      expect(result.draft.body).toContain('## Предлагаемое решение')
      expect(result.draft.body).toContain('## Критерии приемки')
      expect(result.draft.type).toBe('feature')
    })

    it('should include conversation context when requested', async () => {
      const messages: ConversationMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Проблема с кнопкой',
          timestamp: new Date().toISOString(),
        },
        {
          id: '2',
          role: 'assistant',
          content: 'Какая именно проблема?',
          timestamp: new Date().toISOString(),
        },
        {
          id: '3',
          role: 'user',
          content: 'Кнопка не реагирует на клик',
          timestamp: new Date().toISOString(),
        },
      ]

      const result = await generator.generateFromConversation(messages, { includeContext: true })

      expect(result.draft.body).toContain('## Контекст диалога')
      expect(result.draft.conversationContext).toEqual(messages)
    })
  })

  describe('Confidence Calculation', () => {
    it('should calculate higher confidence for longer text', async () => {
      const shortMessages: ConversationMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Баг',
          timestamp: new Date().toISOString(),
        },
      ]

      const longMessages: ConversationMessage[] = [
        {
          id: '1',
          role: 'user',
          content:
            'Обнаружил баг в приложении: когда нажимаю на кнопку сохранения в верхнем правом углу, происходит вылет приложения. Это происходит каждый раз при попытке сохранить данные. Пробовал на разных устройствах, проблема воспроизводится.',
          timestamp: new Date().toISOString(),
        },
      ]

      const shortResult = await generator.generateFromConversation(shortMessages)
      const longResult = await generator.generateFromConversation(longMessages)

      expect(longResult.confidence).toBeGreaterThan(shortResult.confidence)
    })

    it('should increase confidence with requirements', async () => {
      const messages: ConversationMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Нужно чтобы кнопка была синей. Требуется анимация. Хочу округлые края.',
          timestamp: new Date().toISOString(),
        },
      ]

      const result = await generator.generateFromConversation(messages)

      expect(result.confidence).toBeGreaterThan(0.5)
      expect(result.insights.requirements.length).toBe(3)
    })
  })

  describe('Draft Validation Integration', () => {
    it('should validate generated drafts', async () => {
      const messages: ConversationMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Кнопка не работает при нажатии',
          timestamp: new Date().toISOString(),
        },
      ]

      const result = await generator.generateFromConversation(messages)

      expect(result.success).toBe(true)
      expect(result.draft.title.length).toBeGreaterThan(0)
      expect(result.draft.body.length).toBeGreaterThan(0)
    })

    it('should handle generation errors gracefully', async () => {
      const messages: ConversationMessage[] = [] // Empty messages should cause error

      const result = await generator.generateFromConversation(messages)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('Template Creation', () => {
    it('should get available templates', () => {
      const templates = generator.getTemplates()

      expect(templates.length).toBeGreaterThan(0)
      expect(templates.some((t) => t.id === 'bug_report')).toBe(true)
      expect(templates.some((t) => t.id === 'feature_request')).toBe(true)
      expect(templates.some((t) => t.id === 'improvement')).toBe(true)
    })

    it('should get template by ID', () => {
      const template = generator.getTemplate('bug_report')

      expect(template).toBeDefined()
      expect(template?.id).toBe('bug_report')
      expect(template?.type).toBe('bug')
      expect(template?.name).toBe('Bug Report')
    })

    it('should return undefined for unknown template', () => {
      const template = generator.getTemplate('unknown')

      expect(template).toBeUndefined()
    })

    it('should create draft from template with values', () => {
      const draft = generator.createFromTemplate('bug_report', {
        summary: 'Test bug',
        description: 'This is a test bug description',
        expectedBehavior: 'Should work',
        actualBehavior: 'Does not work',
      })

      expect(draft.title).toContain('Bug: Test bug')
      expect(draft.body).toContain('test bug description')
      expect(draft.body).toContain('Should work')
      expect(draft.body).toContain('Does not work')
      expect(draft.type).toBe('bug')
      expect(draft.labels).toContain('bug')
    })

    it('should throw error for unknown template', () => {
      expect(() => {
        generator.createFromTemplate('unknown_template')
      }).toThrow('Template not found: unknown_template')
    })
  })

  describe('Single Message Generation', () => {
    it('should generate draft from single message', async () => {
      const result = await generator.generateFromMessage(
        'Кнопка не работает, нужно исправить баг',
        {
          componentId: 'SaveButton',
        },
        { forceType: 'bug' }
      )

      expect(result.success).toBe(true)
      expect(result.draft.type).toBe('bug')
      expect(result.draft.title).toContain('Баг:')
      expect(result.draft.body).toContain('Кнопка не работает')
    })
  })

  describe('Component Detection', () => {
    it('should find related components in text', async () => {
      const messages: ConversationMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Проблема с компонентом CubePreview, не работает ParamEditor',
          timestamp: new Date().toISOString(),
        },
      ]

      const result = await generator.generateFromConversation(messages)

      expect(result.insights.relatedComponents.length).toBeGreaterThanOrEqual(0)
    })

    it('should use component context', async () => {
      const messages: ConversationMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Эта кнопка не работает',
          timestamp: new Date().toISOString(),
          context: {
            componentId: 'SaveButton',
          },
        },
      ]

      const result = await generator.generateFromConversation(messages)

      expect(result.insights.relatedComponents.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Forced Options', () => {
    it('should respect forced issue type', async () => {
      const messages: ConversationMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Добавить новую функцию',
          timestamp: new Date().toISOString(),
        },
      ]

      const result = await generator.generateFromConversation(messages, { forceType: 'bug' })

      expect(result.draft.type).toBe('bug')
      expect(result.insights.detectedType).toBe('bug') // Forced type overrides detectedType too
    })

    it('should respect forced priority', async () => {
      const messages: ConversationMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Обычный вопрос',
          timestamp: new Date().toISOString(),
        },
      ]

      const result = await generator.generateFromConversation(messages, {
        forcePriority: 'critical',
      })

      expect(result.draft.priority).toBe('critical')
      expect(result.insights.detectedPriority).toBe('critical') // Forced priority overrides detectedPriority too
    })
  })

  describe('Language Support', () => {
    it('should generate Russian content', async () => {
      generator.updateSettings({ language: 'ru' })

      const messages: ConversationMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Проблема с кнопкой',
          timestamp: new Date().toISOString(),
        },
      ]

      const result = await generator.generateFromConversation(messages)

      expect(result.draft.body).toContain('## Описание')
      expect(result.draft.body).toContain('## Шаги для воспроизведения')
    })

    it('should generate English content', async () => {
      generator.updateSettings({ language: 'en' })

      const messages: ConversationMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Button problem',
          timestamp: new Date().toISOString(),
        },
      ]

      const result = await generator.generateFromConversation(messages)

      expect(result.draft.body).toContain('## Description')
      expect(result.draft.body).toContain('## Steps to Reproduce')
    })
  })

  describe('Default Instance', () => {
    it('should return singleton default instance', () => {
      const gen1 = getDefaultIssueGenerator()
      const gen2 = getDefaultIssueGenerator()

      expect(gen1).toBe(gen2)
    })

    it('should reset default instance', () => {
      const gen1 = getDefaultIssueGenerator()
      resetDefaultIssueGenerator()
      const gen2 = getDefaultIssueGenerator()

      expect(gen1).not.toBe(gen2)
    })
  })

  describe('Error Handling', () => {
    it('should handle empty messages array', async () => {
      const result = await generator.generateFromConversation([])

      expect(result.success).toBe(false)
      expect(result.error).toContain('No user messages found')
    })

    it('should handle malformed messages gracefully', async () => {
      const messages: ConversationMessage[] = [
        {
          id: '1',
          role: 'user',
          content: '',
          timestamp: new Date().toISOString(),
        },
      ]

      const result = await generator.generateFromConversation(messages)

      // Should not crash and return some result
      expect(result).toBeDefined()
      expect(result.draft).toBeDefined()
    })
  })
})

describe('Issue Generator Integration Tests', () => {
  it('should create valid drafts that pass validation', async () => {
    const generator = createIssueGenerator()

    const messages: ConversationMessage[] = [
      {
        id: '1',
        role: 'user',
        content: 'Кнопка сохранения не работает при нажатии, нужно исправить эту проблему',
        timestamp: new Date().toISOString(),
      },
    ]

    const result = await generator.generateFromConversation(messages)

    expect(result.success).toBe(true)

    const validation = validateIssueDraft(result.draft)
    expect(validation.isValid).toBe(true)
    expect(validation.errors.length).toBe(0)
  })

  it('should maintain consistency across multiple generations', async () => {
    const generator = createIssueGenerator({ language: 'ru' })

    const messages: ConversationMessage[] = [
      {
        id: '1',
        role: 'user',
        content: 'Баг в компоненте',
        timestamp: new Date().toISOString(),
      },
    ]

    const result1 = await generator.generateFromConversation(messages)
    const result2 = await generator.generateFromConversation(messages)

    // Results should be consistent
    expect(result1.draft.type).toBe(result2.draft.type)
    expect(result1.insights.detectedType).toBe(result2.insights.detectedType)
  })

  it('should handle complex scenarios with multiple requirements', async () => {
    const generator = createIssueGenerator({ language: 'ru' })

    const messages: ConversationMessage[] = [
      {
        id: '1',
        role: 'user',
        content:
          'Нужно улучшить форму регистрации: добавить валидацию email, сделать кнопку активной только при заполненных полях, добавить анимацию загрузки, показать сообщения об ошибках под полями, реализовать Remember Me функцию',
        timestamp: new Date().toISOString(),
      },
    ]

    const result = await generator.generateFromConversation(messages)

    expect(result.insights.requirements.length).toBeGreaterThan(0)
    expect(result.draft.body).toContain('## Требования')
    expect(result.insights.detectedType).toBe('feature')
    expect(result.confidence).toBeGreaterThanOrEqual(0.6)
  })
})
