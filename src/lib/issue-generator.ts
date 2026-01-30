/**
 * Issue Generator Module
 *
 * Provides AI-powered generation of GitHub Issue drafts from conversation context.
 * Analyzes dialog between user and AI to extract requirements and create structured issues.
 *
 * TASK 56: Issue Draft Generator (Phase 9 - GOD MODE)
 *
 * Features:
 * - Conversation analysis and requirement extraction
 * - Automatic draft generation from context
 * - Template-based issue creation
 * - Component suggestion and linking
 * - Priority and type auto-detection
 */

import type { QueryLanguage } from '../types/ai-query'
import type { ConversationMessage, ConversationMessageContext } from '../types/god-mode'
import type {
  IssueDraft,
  IssueTemplate,
  IssueType,
  IssuePriority,
  IssueDraftSettings,
} from '../types/issue-generator'
import {
  BUILTIN_ISSUE_TEMPLATES,
  createIssueDraft,
  getDefaultLabels,
  validateIssueDraft,
  DEFAULT_ISSUE_DRAFT_SETTINGS,
} from '../types/issue-generator'
import { getAllComponentMeta } from '../types/component-meta'
import type { ComponentMeta } from '../types/component-meta'

/**
 * Issue generation result
 */
export interface IssueGenerationResult {
  /** Generated issue draft */
  draft: IssueDraft
  /** Whether generation was successful */
  success: boolean
  /** Confidence in the generated draft (0-1) */
  confidence: number
  /** Extraction insights */
  insights: {
    /** Detected issue type */
    detectedType: IssueType
    /** Detected priority */
    detectedPriority: IssuePriority
    /** Found related components */
    relatedComponents: ComponentMeta[]
    /** Key phrases extracted */
    keyPhrases: string[]
    /** User requirements identified */
    requirements: string[]
  }
  /** Generation warnings */
  warnings: string[]
  /** Error message if failed */
  error?: string
}

/**
 * Draft generation options
 */
export interface DraftGenerationOptions {
  /** Force specific issue type */
  forceType?: IssueType
  /** Force specific priority */
  forcePriority?: IssuePriority
  /** Use specific template */
  template?: IssueTemplate
  /** Include conversation context in draft */
  includeContext?: boolean
  /** Auto-suggest components */
  suggestComponents?: boolean
  /** Language for generated content */
  language?: QueryLanguage
}

/**
 * Keyword patterns for issue type detection (Russian)
 */
const TYPE_PATTERNS_RU: Record<IssueType, string[]> = {
  bug: [
    'баг',
    'ошибка',
    'не работает',
    'сломалось',
    'проблема',
    'неправильно',
    'глюк',
    'crash',
    'упало',
    'вылетает',
    'не отображается',
  ],
  feature: [
    'добавить',
    'новая функция',
    'фича',
    'хочу',
    'нужно',
    'создать',
    'сделать',
    'реализовать',
    'функционал',
    'возможность',
  ],
  improvement: [
    'улучшить',
    'улучшение',
    'оптимизировать',
    'лучше',
    'быстрее',
    'рефакторинг',
    'доработать',
    'модернизировать',
  ],
  documentation: [
    'документация',
    'описать',
    'инструкция',
    'руководство',
    'помощь',
    'справка',
    'объяснить',
  ],
  question: ['как', 'почему', 'зачем', 'объясни', 'расскажи', 'вопрос', 'непонятно', 'подскажи'],
  maintenance: [
    'обновить',
    'поддержать',
    'убрать',
    'чистка',
    'рефакторинг',
    'модернизация',
    'технический долг',
  ],
}

/**
 * Keyword patterns for issue type detection (English)
 */
const TYPE_PATTERNS_EN: Record<IssueType, string[]> = {
  bug: [
    'bug',
    'error',
    'not working',
    'broken',
    'problem',
    'wrong',
    'glitch',
    'crash',
    'crashed',
    'fail',
    'incorrect',
  ],
  feature: [
    'add',
    'new feature',
    'feature',
    'want',
    'need',
    'create',
    'make',
    'implement',
    'functionality',
    'capability',
  ],
  improvement: [
    'improve',
    'improvement',
    'optimize',
    'better',
    'faster',
    'refactor',
    'enhance',
    'upgrade',
  ],
  documentation: [
    'documentation',
    'document',
    'explain',
    'instruction',
    'guide',
    'help',
    'manual',
    'tutorial',
  ],
  question: ['how', 'why', 'what', 'explain', 'tell me', 'question', 'unclear', 'clarify'],
  maintenance: [
    'update',
    'maintain',
    'remove',
    'cleanup',
    'refactor',
    'modernize',
    'tech debt',
    'deprecated',
  ],
}

/**
 * Priority keyword patterns (Russian)
 */
const PRIORITY_PATTERNS_RU: Record<IssuePriority, string[]> = {
  critical: [
    'критический',
    'критично',
    'блокирует',
    'не работает вообще',
    'аварийный',
    'срочно',
    'немедленно',
  ],
  high: ['важно', 'срочно', 'приоритет', 'высокий', 'незамедлительно', 'проблема'],
  medium: ['важно', 'нужно', 'желательно', 'средний', 'обычный', 'стандартный'],
  low: ['желательно', 'незначительно', 'мелочь', 'когда будет время', 'низкий', 'непринципиально'],
}

/**
 * Priority keyword patterns (English)
 */
const PRIORITY_PATTERNS_EN: Record<IssuePriority, string[]> = {
  critical: ['critical', 'blocking', 'broken', 'emergency', 'urgent', 'immediately', 'showstopper'],
  high: ['important', 'urgent', 'priority', 'high', 'asap', 'soon', 'problem'],
  medium: ['important', 'needed', 'should', 'medium', 'normal', 'standard'],
  low: ['nice to have', 'minor', 'when you have time', 'low', 'optional', 'minor issue'],
}

/**
 * Issue Generator class
 */
export class IssueGenerator {
  private settings: IssueDraftSettings

  constructor(settings: Partial<IssueDraftSettings> = {}) {
    this.settings = { ...DEFAULT_ISSUE_DRAFT_SETTINGS, ...settings }
  }

  /**
   * Updates generator settings
   */
  updateSettings(settings: Partial<IssueDraftSettings>): void {
    this.settings = { ...this.settings, ...settings }
  }

  /**
   * Gets current settings
   */
  getSettings(): IssueDraftSettings {
    return { ...this.settings }
  }

  /**
   * Generates issue draft from conversation messages
   */
  async generateFromConversation(
    messages: ConversationMessage[],
    options: DraftGenerationOptions = {}
  ): Promise<IssueGenerationResult> {
    try {
      const language = options.language || this.settings.language
      const includeContext = options.includeContext ?? this.settings.includeConversationContext
      const suggestComponents = options.suggestComponents ?? this.settings.autoSuggestComponents

      // Extract user messages for analysis
      const userMessages = messages.filter((msg) => msg.role === 'user')

      if (userMessages.length === 0) {
        return {
          draft: createIssueDraft(),
          success: false,
          confidence: 0,
          insights: {
            detectedType: 'improvement',
            detectedPriority: 'medium',
            relatedComponents: [],
            keyPhrases: [],
            requirements: [],
          },
          warnings: ['No user messages found in conversation'],
          error: 'No user messages found in conversation',
        }
      }

      // Combine user message content
      const fullText = userMessages.map((msg) => msg.content).join('\n\n')

      // Detect issue type and priority
      const detectedType = options.forceType || this.detectIssueType(fullText, language)
      const detectedPriority = options.forcePriority || this.detectPriority(fullText, language)

      // Extract key information
      const keyPhrases = this.extractKeyPhrases(fullText, language)
      const requirements = this.extractRequirements(fullText, language)

      // Find related components
      const relatedComponents = suggestComponents
        ? this.findRelatedComponents(fullText, messages)
        : []

      // Generate title
      const title = this.generateTitle(fullText, detectedType, language)

      // Generate body
      const body = this.generateBody(
        fullText,
        requirements,
        detectedType,
        language,
        includeContext ? messages : undefined
      )

      // Create draft
      const draft = createIssueDraft({
        title,
        body,
        type: detectedType,
        priority: detectedPriority,
        labels: this.generateLabels(detectedType, detectedPriority),
        relatedComponents: relatedComponents.map((c) => c.id),
        conversationContext: includeContext ? messages : undefined,
        confidence: this.calculateConfidence(fullText, requirements, relatedComponents),
      })

      // Validate draft
      const validation = validateIssueDraft(draft)

      return {
        draft,
        success: validation.isValid,
        confidence: draft.confidence || 0,
        insights: {
          detectedType,
          detectedPriority,
          relatedComponents,
          keyPhrases,
          requirements,
        },
        warnings: validation.warnings,
      }
    } catch (error) {
      return {
        draft: createIssueDraft(),
        success: false,
        confidence: 0,
        insights: {
          detectedType: 'improvement',
          detectedPriority: 'medium',
          relatedComponents: [],
          keyPhrases: [],
          requirements: [],
        },
        warnings: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Generates issue draft from single message
   */
  async generateFromMessage(
    message: string,
    context?: ConversationMessageContext,
    options: DraftGenerationOptions = {}
  ): Promise<IssueGenerationResult> {
    const mockMessage: ConversationMessage = {
      id: 'temp',
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      context,
    }

    return this.generateFromConversation([mockMessage], options)
  }

  /**
   * Detects issue type from text
   */
  private detectIssueType(text: string, language: QueryLanguage): IssueType {
    const patterns = language === 'ru' ? TYPE_PATTERNS_RU : TYPE_PATTERNS_EN
    const lowerText = text.toLowerCase()

    let bestMatch: IssueType = 'improvement'
    let maxScore = 0

    for (const [type, keywords] of Object.entries(patterns)) {
      const score = keywords.reduce((count, keyword) => {
        return count + (lowerText.includes(keyword.toLowerCase()) ? 1 : 0)
      }, 0)

      if (score > maxScore) {
        maxScore = score
        bestMatch = type as IssueType
      }
    }

    // Default to improvement if no clear signals
    return maxScore > 0 ? bestMatch : 'improvement'
  }

  /**
   * Detects priority from text
   */
  private detectPriority(text: string, language: QueryLanguage): IssuePriority {
    const patterns = language === 'ru' ? PRIORITY_PATTERNS_RU : PRIORITY_PATTERNS_EN
    const lowerText = text.toLowerCase()

    let bestMatch: IssuePriority = 'medium'
    let maxScore = 0

    for (const [priority, keywords] of Object.entries(patterns)) {
      const score = keywords.reduce((count, keyword) => {
        return count + (lowerText.includes(keyword.toLowerCase()) ? 1 : 0)
      }, 0)

      if (score > maxScore) {
        maxScore = score
        bestMatch = priority as IssuePriority
      }
    }

    // Default to medium if no clear signals
    return maxScore > 0 ? bestMatch : 'medium'
  }

  /**
   * Extracts key phrases from text
   */
  private extractKeyPhrases(text: string, language: QueryLanguage): string[] {
    const phrases: string[] = []

    // Common issue-related phrases (simplified extraction)
    const phrasePatterns =
      language === 'ru'
        ? [
            /не работает/gi,
            /улучшить/gi,
            /добавить/gi,
            /проблема/gi,
            /ошибка/gi,
            /нужно/gi,
            /хочу/gi,
          ]
        : [/not working/gi, /improve/gi, /add/gi, /problem/gi, /error/gi, /need/gi, /want/gi]

    for (const pattern of phrasePatterns) {
      const matches = text.match(pattern)
      if (matches) {
        phrases.push(...matches)
      }
    }

    // Extract component names (simplified)
    const componentNames = getAllComponentMeta().map((c) => c.name)
    for (const name of componentNames) {
      if (text.toLowerCase().includes(name.toLowerCase())) {
        phrases.push(name)
      }
    }

    return [...new Set(phrases)].slice(0, 10) // Limit to 10 phrases
  }

  /**
   * Extracts user requirements from text
   */
  private extractRequirements(text: string, language: QueryLanguage): string[] {
    const requirements: string[] = []

    // Split text into sentences
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)

    // Look for requirement indicators
    const requirementIndicators =
      language === 'ru'
        ? [
            'нужно',
            'хочу',
            'должен',
            'требуется',
            'необходимо',
            'пожелание',
            'ожидание',
            'сценарий',
          ]
        : ['need', 'want', 'should', 'must', 'require', 'expectation', 'scenario', 'user story']

    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase().trim()
      if (requirementIndicators.some((indicator) => lowerSentence.includes(indicator))) {
        requirements.push(sentence.trim())
      }
    }

    return requirements.slice(0, 5) // Limit to 5 requirements
  }

  /**
   * Finds components related to the text
   */
  private findRelatedComponents(text: string, messages: ConversationMessage[]): ComponentMeta[] {
    const components: ComponentMeta[] = []
    const searchText = text.toLowerCase()

    // Search by component name and description
    const allComponents = getAllComponentMeta()
    for (const component of allComponents) {
      if (
        searchText.includes(component.name.toLowerCase()) ||
        searchText.includes(component.id.toLowerCase()) ||
        component.keywords.some((keyword) => searchText.includes(keyword.toLowerCase()))
      ) {
        components.push(component)
      }
    }

    // Also check message context for component IDs
    for (const message of messages) {
      if (message.context?.componentId) {
        const component = allComponents.find((c) => c.id === message.context.componentId)
        if (component && !components.some((c) => c.id === component.id)) {
          components.push(component)
        }
      }
    }

    return components.slice(0, 5) // Limit to 5 components
  }

  /**
   * Generates issue title
   */
  private generateTitle(text: string, type: IssueType, language: QueryLanguage): string {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)

    if (sentences.length === 0) {
      return language === 'ru' ? 'Новая задача' : 'New issue'
    }

    // Try to extract a meaningful title from first sentence
    let title = sentences[0].trim()

    // Clean up common prefixes
    const prefixes =
      language === 'ru'
        ? [
            'Я хочу ',
            'Я бы хотел ',
            'Нужно ',
            'Требуется ',
            'Есть проблема ',
            'Обнаружил ',
            'Нашел ',
          ]
        : [
            'I want ',
            'I would like ',
            'We need ',
            'It requires ',
            'There is a problem ',
            'I found ',
            'I discovered ',
          ]

    for (const prefix of prefixes) {
      if (title.toLowerCase().startsWith(prefix.toLowerCase())) {
        title = title.substring(prefix.length).trim()
      }
    }

    // Limit length
    if (title.length > 60) {
      title = title.substring(0, 57) + '...'
    }

    // Add type prefix if not obvious
    const typePrefixes =
      language === 'ru'
        ? {
            bug: 'Баг: ',
            feature: 'Фича: ',
            improvement: 'Улучшение: ',
            documentation: 'Документация: ',
            question: 'Вопрос: ',
            maintenance: 'Поддержка: ',
          }
        : {
            bug: 'Bug: ',
            feature: 'Feature: ',
            improvement: 'Improvement: ',
            documentation: 'Documentation: ',
            question: 'Question: ',
            maintenance: 'Maintenance: ',
          }

    return typePrefixes[type] + title
  }

  /**
   * Generates issue body
   */
  private generateBody(
    text: string,
    requirements: string[],
    type: IssueType,
    language: QueryLanguage,
    conversationContext?: ConversationMessage[]
  ): string {
    let body = ''

    // Add description section
    if (language === 'ru') {
      body += '## Описание\n\n'
      body += text + '\n\n'
    } else {
      body += '## Description\n\n'
      body += text + '\n\n'
    }

    // Add requirements if any
    if (requirements.length > 0) {
      if (language === 'ru') {
        body += '## Требования\n\n'
      } else {
        body += '## Requirements\n\n'
      }

      requirements.forEach((req, index) => {
        body += `${index + 1}. ${req}\n`
      })
      body += '\n'
    }

    // Add type-specific sections
    if (type === 'bug') {
      if (language === 'ru') {
        body += '## Шаги для воспроизведения\n\n'
        body += '1. \n2. \n3. \n\n'
        body += '## Ожидаемое поведение\n\n'
        body += '\n\n'
        body += '## Фактическое поведение\n\n'
      } else {
        body += '## Steps to Reproduce\n\n'
        body += '1. \n2. \n3. \n\n'
        body += '## Expected Behavior\n\n'
        body += '\n\n'
        body += '## Actual Behavior\n\n'
      }
    }

    if (type === 'feature') {
      if (language === 'ru') {
        body += '## Предлагаемое решение\n\n'
        body += '\n\n'
        body += '## Критерии приемки\n\n'
        body += '- [ ] \n- [ ] \n- [ ] \n\n'
      } else {
        body += '## Proposed Solution\n\n'
        body += '\n\n'
        body += '## Acceptance Criteria\n\n'
        body += '- [ ] \n- [ ] \n- [ ] \n\n'
      }
    }

    // Add conversation context if requested
    if (conversationContext && conversationContext.length > 0) {
      if (language === 'ru') {
        body += '## Контекст диалога\n\n'
      } else {
        body += '## Conversation Context\n\n'
      }

      const recentMessages = conversationContext.slice(-5) // Last 5 messages
      for (const message of recentMessages) {
        const role = message.role === 'user' ? 'User' : 'Assistant'
        body += `**${role}**: ${message.content}\n\n`
      }
    }

    return body
  }

  /**
   * Generates labels for issue type and priority
   */
  private generateLabels(type: IssueType, priority: IssuePriority): string[] {
    return getDefaultLabels(type, priority)
  }

  /**
   * Calculates confidence score for generated draft
   */
  private calculateConfidence(
    text: string,
    requirements: string[],
    components: ComponentMeta[]
  ): number {
    let confidence = 0.3 // Base confidence

    // More text = higher confidence (to a point)
    const textLength = text.length
    if (textLength > 50) confidence += 0.1
    if (textLength > 200) confidence += 0.1
    if (textLength > 500) confidence += 0.1

    // Requirements increase confidence
    confidence += Math.min(requirements.length * 0.1, 0.2)

    // Related components increase confidence
    confidence += Math.min(components.length * 0.05, 0.15)

    return Math.min(confidence, 1.0)
  }

  /**
   * Gets available templates
   */
  getTemplates(): IssueTemplate[] {
    return [...BUILTIN_ISSUE_TEMPLATES]
  }

  /**
   * Gets template by ID
   */
  getTemplate(id: string): IssueTemplate | undefined {
    return BUILTIN_ISSUE_TEMPLATES.find((template) => template.id === id)
  }

  /**
   * Creates draft from template
   */
  createFromTemplate(
    templateId: string,
    values: Record<string, string> = {},
    overrides: Partial<IssueDraft> = {}
  ): IssueDraft {
    const template = this.getTemplate(templateId)
    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    // Replace placeholders in title and body
    let title = template.titleTemplate
    let body = template.bodyTemplate

    for (const [key, value] of Object.entries(values)) {
      const placeholder = `{${key}}`
      title = title.replace(new RegExp(placeholder, 'g'), String(value))
      body = body.replace(new RegExp(placeholder, 'g'), String(value))
    }

    return createIssueDraft({
      title,
      body,
      type: template.type,
      priority: template.defaultPriority,
      labels: [...template.defaultLabels],
      ...overrides,
    })
  }
}

/**
 * Creates a new issue generator instance
 */
export function createIssueGenerator(settings?: Partial<IssueDraftSettings>): IssueGenerator {
  return new IssueGenerator(settings)
}

/**
 * Default singleton generator instance
 */
let defaultGenerator: IssueGenerator | null = null

/**
 * Gets default issue generator
 */
export function getDefaultIssueGenerator(): IssueGenerator {
  if (!defaultGenerator) {
    defaultGenerator = new IssueGenerator()
  }
  return defaultGenerator
}

/**
 * Resets default generator (useful for testing)
 */
export function resetDefaultIssueGenerator(): void {
  defaultGenerator = null
}

// Re-export for convenience
export { DEFAULT_ISSUE_DRAFT_SETTINGS } from '../types/issue-generator'
