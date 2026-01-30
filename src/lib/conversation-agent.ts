/**
 * Conversation Agent Module
 *
 * Provides AI-powered conversation capabilities for GOD MODE.
 * Enables users to have natural language discussions about app improvements,
 * bug reports, and feature requests.
 *
 * TASK 55: AI Conversation Agent (Phase 9 - GOD MODE)
 *
 * Features:
 * - Natural language conversation with AI
 * - Context-aware responses about current component/screen
 * - Guided brainstorming for improvement ideas
 * - Integration with TinyLLM for response generation
 * - Conversation history management
 */

import type { QueryLanguage } from '../types/ai-query'
import type {
  ConversationMessage,
  ConversationSession,
  ConversationMessageContext,
} from '../types/god-mode'
import {
  createMessage,
  createSession,
  loadConversationSession,
  saveConversationSession,
} from '../types/god-mode'
import { getAllComponentMeta, searchComponentMeta } from '../types/component-meta'
import type { ComponentMeta } from '../types/component-meta'

/**
 * Agent response result
 */
export interface AgentResponse {
  /** Whether the response was generated successfully */
  success: boolean
  /** The generated response message */
  message: ConversationMessage
  /** Suggested follow-up actions */
  suggestions?: string[]
  /** Related components found */
  relatedComponents?: ComponentMeta[]
  /** Confidence score (0-1) */
  confidence: number
  /** Error message if failed */
  error?: string
}

/**
 * Agent configuration
 */
export interface ConversationAgentConfig {
  /** Preferred language */
  language: QueryLanguage
  /** Maximum response length */
  maxResponseLength: number
  /** Whether to include component context in responses */
  includeComponentContext: boolean
  /** Whether to suggest improvements */
  suggestImprovements: boolean
  /** System prompt for AI */
  systemPrompt?: string
}

/**
 * Default agent configuration
 */
export const DEFAULT_AGENT_CONFIG: ConversationAgentConfig = {
  language: 'ru',
  maxResponseLength: 2000,
  includeComponentContext: true,
  suggestImprovements: true,
}

/**
 * System prompts for different languages
 */
// System prompts for future use when connecting to real LLM backend
const _SYSTEM_PROMPTS: Record<QueryLanguage, string> = {
  ru: `Ты - AI-помощник для разработки приложения isocubic.
Твоя задача - помогать пользователям обсуждать улучшения приложения, находить баги и формулировать задачи.
Отвечай кратко и по делу. Если пользователь описывает проблему, помоги сформулировать её как задачу для разработчика.
Если пользователь спрашивает о компоненте, используй контекст для точного ответа.`,
  en: `You are an AI assistant for developing the isocubic application.
Your task is to help users discuss app improvements, find bugs, and formulate tasks.
Answer briefly and to the point. If the user describes a problem, help formulate it as a task for a developer.
If the user asks about a component, use the context for an accurate answer.`,
}
void _SYSTEM_PROMPTS // Reserved for future LLM integration

/**
 * Intent patterns for conversation classification
 */
interface IntentMatch {
  intent: 'improvement' | 'bug' | 'feature' | 'question' | 'task' | 'general'
  confidence: number
  keywords: string[]
}

/**
 * Keyword patterns for intent detection (Russian)
 */
const INTENT_PATTERNS_RU: Record<string, string[]> = {
  improvement: [
    'улучшить',
    'улучшение',
    'оптимизировать',
    'оптимизация',
    'лучше',
    'быстрее',
    'рефакторинг',
  ],
  bug: [
    'баг',
    'ошибка',
    'проблема',
    'не работает',
    'сломал',
    'crash',
    'упал',
    'неправильно',
    'глюк',
  ],
  feature: [
    'добавить',
    'новая',
    'функция',
    'фича',
    'хочу',
    'нужно',
    'реализовать',
    'создать',
    'сделать',
  ],
  question: ['как', 'что', 'почему', 'зачем', 'когда', 'где', 'какой', 'объясни', 'расскажи'],
  task: ['задача', 'таск', 'issue', 'тикет', 'сформулировать', 'записать', 'создать задачу'],
}

/**
 * Keyword patterns for intent detection (English)
 */
const INTENT_PATTERNS_EN: Record<string, string[]> = {
  improvement: [
    'improve',
    'improvement',
    'optimize',
    'optimization',
    'better',
    'faster',
    'refactor',
  ],
  bug: ['bug', 'error', 'problem', 'not working', 'broken', 'crash', 'crashed', 'wrong', 'glitch'],
  feature: ['add', 'new', 'feature', 'want', 'need', 'implement', 'make', 'build'],
  question: ['how', 'what', 'why', 'when', 'where', 'which', 'explain', 'tell'],
  // Note: 'task' keyword should be matched before 'create' in feature, so keep 'create task' as phrase
  task: ['task', 'issue', 'ticket', 'formulate', 'write task', 'create task', 'create issue'],
}

/**
 * Detects the intent of a user message
 */
export function detectIntent(message: string, language: QueryLanguage): IntentMatch {
  const lowerMessage = message.toLowerCase()
  const patterns = language === 'ru' ? INTENT_PATTERNS_RU : INTENT_PATTERNS_EN

  let bestMatch: IntentMatch = {
    intent: 'general',
    confidence: 0.1, // Start low so any keyword match wins
    keywords: [],
  }

  for (const [intent, keywords] of Object.entries(patterns)) {
    const matchedKeywords = keywords.filter((kw) => lowerMessage.includes(kw.toLowerCase()))

    if (matchedKeywords.length > 0) {
      // Base confidence for having at least one match
      const baseConfidence = 0.4
      // Additional confidence per matched keyword
      const additionalConfidence = matchedKeywords.length * 0.15
      const confidence = Math.min(baseConfidence + additionalConfidence, 1)

      if (matchedKeywords.length > bestMatch.keywords.length || confidence > bestMatch.confidence) {
        bestMatch = {
          intent: intent as IntentMatch['intent'],
          confidence,
          keywords: matchedKeywords,
        }
      }
    }
  }

  return bestMatch
}

/**
 * Generates a response based on intent
 */
function generateIntentResponse(
  intent: IntentMatch,
  userMessage: string,
  context: ConversationMessageContext | undefined,
  language: QueryLanguage
): string {
  const componentName = context?.componentId || (language === 'ru' ? 'компоненте' : 'component')

  switch (intent.intent) {
    case 'improvement':
      return language === 'ru'
        ? `Отличная идея насчёт улучшения! ${context?.componentId ? `Для компонента ${componentName} ` : ''}Можете ли вы уточнить, какой именно аспект хотите улучшить? Это поможет сформулировать более конкретную задачу.`
        : `Great idea for improvement! ${context?.componentId ? `For the ${componentName} component, ` : ''}Could you clarify which aspect you want to improve? This will help formulate a more specific task.`

    case 'bug':
      return language === 'ru'
        ? `Понимаю, вы обнаружили проблему${context?.componentId ? ` в ${componentName}` : ''}. Пожалуйста, опишите:\n1. Что должно было произойти?\n2. Что произошло вместо этого?\n3. Можете ли воспроизвести проблему?\n\nЭто поможет создать качественный баг-репорт.`
        : `I understand you found a problem${context?.componentId ? ` in ${componentName}` : ''}. Please describe:\n1. What was supposed to happen?\n2. What happened instead?\n3. Can you reproduce the issue?\n\nThis will help create a quality bug report.`

    case 'feature':
      return language === 'ru'
        ? `Интересное предложение по новой функции! ${context?.componentId ? `Для ${componentName} ` : ''}Давайте обсудим детали:\n- Какую проблему это решит?\n- Кто будет использовать эту функцию?\n- Есть ли примеры подобной функциональности в других приложениях?`
        : `Interesting feature suggestion! ${context?.componentId ? `For ${componentName}, ` : ''}Let's discuss the details:\n- What problem will this solve?\n- Who will use this feature?\n- Are there examples of similar functionality in other apps?`

    case 'question':
      return generateQuestionResponse(userMessage, context, language)

    case 'task':
      return language === 'ru'
        ? `Давайте сформулируем задачу. Опишите:\n- **Цель**: что нужно сделать\n- **Контекст**: почему это важно\n- **Критерии готовности**: как понять, что задача выполнена\n\nЯ помогу оформить это в виде GitHub Issue.`
        : `Let's formulate a task. Describe:\n- **Goal**: what needs to be done\n- **Context**: why this is important\n- **Done criteria**: how to know the task is complete\n\nI'll help format this as a GitHub Issue.`

    default:
      return language === 'ru'
        ? `Интересно! Расскажите подробнее, чем я могу помочь${context?.componentId ? ` с ${componentName}` : ''}?`
        : `Interesting! Tell me more, how can I help${context?.componentId ? ` with ${componentName}` : ''}?`
  }
}

/**
 * Generates a response for question intents
 */
function generateQuestionResponse(
  userMessage: string,
  context: ConversationMessageContext | undefined,
  language: QueryLanguage
): string {
  // Try to find relevant components
  const searchQuery = userMessage.replace(/[?!.,]/g, '').trim()
  const components = searchComponentMeta(searchQuery)

  if (context?.componentId) {
    const componentMeta = getAllComponentMeta().find((c) => c.id === context.componentId)
    if (componentMeta) {
      return language === 'ru'
        ? `**${componentMeta.name}** - ${componentMeta.description}\n\n**Статус**: ${componentMeta.status}\n**Фаза**: ${componentMeta.phase || 'N/A'}\n\nЧто конкретно вас интересует об этом компоненте?`
        : `**${componentMeta.name}** - ${componentMeta.description}\n\n**Status**: ${componentMeta.status}\n**Phase**: ${componentMeta.phase || 'N/A'}\n\nWhat specifically interests you about this component?`
    }
  }

  if (components.length > 0) {
    const componentList = components
      .slice(0, 3)
      .map((c) => `- **${c.name}**: ${c.description}`)
      .join('\n')

    return language === 'ru'
      ? `Вот что я нашёл по вашему вопросу:\n\n${componentList}\n\nХотите узнать больше о каком-то из этих компонентов?`
      : `Here's what I found for your question:\n\n${componentList}\n\nWould you like to know more about any of these components?`
  }

  return language === 'ru'
    ? `Я понял ваш вопрос. К сожалению, у меня нет конкретной информации по этой теме. Попробуйте:\n- Переформулировать вопрос\n- Указать конкретный компонент\n- Описать контекст подробнее`
    : `I understand your question. Unfortunately, I don't have specific information on this topic. Try:\n- Rephrasing the question\n- Specifying a particular component\n- Describing the context in more detail`
}

/**
 * Conversation Agent class
 */
export class ConversationAgent {
  private config: ConversationAgentConfig
  private session: ConversationSession | null = null

  constructor(config: Partial<ConversationAgentConfig> = {}) {
    this.config = { ...DEFAULT_AGENT_CONFIG, ...config }
  }

  /**
   * Gets or creates the current session
   */
  getSession(): ConversationSession {
    if (!this.session) {
      const loaded = loadConversationSession()
      this.session = loaded || createSession(this.config.language)
    }
    return this.session
  }

  /**
   * Sets the current session
   */
  setSession(session: ConversationSession): void {
    this.session = session
    saveConversationSession(session)
  }

  /**
   * Clears the current session and starts a new one
   */
  clearSession(): ConversationSession {
    this.session = createSession(this.config.language)
    saveConversationSession(this.session)
    return this.session
  }

  /**
   * Adds a message to the session
   */
  addMessage(message: ConversationMessage): void {
    const session = this.getSession()
    session.messages.push(message)
    session.updatedAt = new Date().toISOString()
    this.setSession(session)
  }

  /**
   * Processes a user message and generates a response
   */
  async processMessage(
    userContent: string,
    context?: ConversationMessageContext
  ): Promise<AgentResponse> {
    const session = this.getSession()

    // Create and add user message
    const userMessage = createMessage('user', userContent, context)
    this.addMessage(userMessage)

    // Update session status
    session.status = 'processing'
    this.setSession(session)

    try {
      // Detect intent
      const intent = detectIntent(userContent, this.config.language)

      // Generate response
      const responseContent = generateIntentResponse(
        intent,
        userContent,
        context,
        this.config.language
      )

      // Find related components
      const relatedComponents = this.findRelatedComponents(userContent, context)

      // Generate suggestions based on intent
      const suggestions = this.generateSuggestions(intent, this.config.language)

      // Create assistant message
      const assistantMessage = createMessage('assistant', responseContent)

      // Add to session
      this.addMessage(assistantMessage)

      // Update session status
      session.status = 'idle'
      this.setSession(session)

      return {
        success: true,
        message: assistantMessage,
        suggestions,
        relatedComponents: relatedComponents.length > 0 ? relatedComponents : undefined,
        confidence: intent.confidence,
      }
    } catch (error) {
      // Update session status
      session.status = 'error'
      this.setSession(session)

      const errorMessage =
        this.config.language === 'ru'
          ? 'Произошла ошибка при обработке сообщения.'
          : 'An error occurred while processing the message.'

      return {
        success: false,
        message: createMessage('assistant', errorMessage),
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Finds components related to the message
   */
  private findRelatedComponents(
    message: string,
    context?: ConversationMessageContext
  ): ComponentMeta[] {
    const results: ComponentMeta[] = []

    // If context has a component, add it first
    if (context?.componentId) {
      const component = getAllComponentMeta().find((c) => c.id === context.componentId)
      if (component) {
        results.push(component)
      }
    }

    // Search for related components
    const searchResults = searchComponentMeta(message)
    for (const component of searchResults) {
      if (!results.some((r) => r.id === component.id)) {
        results.push(component)
      }
      if (results.length >= 5) break
    }

    return results
  }

  /**
   * Generates follow-up suggestions based on intent
   */
  private generateSuggestions(intent: IntentMatch, language: QueryLanguage): string[] {
    const suggestions: Record<string, Record<QueryLanguage, string[]>> = {
      improvement: {
        ru: [
          'Какие метрики должны улучшиться?',
          'Создать задачу на улучшение',
          'Показать похожие компоненты',
        ],
        en: [
          'What metrics should improve?',
          'Create an improvement task',
          'Show similar components',
        ],
      },
      bug: {
        ru: ['Как воспроизвести баг?', 'Создать баг-репорт', 'Показать логи консоли'],
        en: ['How to reproduce the bug?', 'Create a bug report', 'Show console logs'],
      },
      feature: {
        ru: ['Описать сценарий использования', 'Создать задачу на фичу', 'Показать похожие фичи'],
        en: ['Describe use case', 'Create a feature request', 'Show similar features'],
      },
      question: {
        ru: [
          'Показать документацию',
          'Найти примеры использования',
          'Показать связанные компоненты',
        ],
        en: ['Show documentation', 'Find usage examples', 'Show related components'],
      },
      task: {
        ru: ['Добавить скриншот', 'Указать приоритет', 'Выбрать метки'],
        en: ['Add screenshot', 'Set priority', 'Choose labels'],
      },
      general: {
        ru: ['Описать проблему подробнее', 'Показать текущий экран', 'Начать новый диалог'],
        en: ['Describe the issue in detail', 'Show current screen', 'Start new conversation'],
      },
    }

    return suggestions[intent.intent]?.[language] || suggestions.general[language]
  }

  /**
   * Gets conversation history as formatted text
   */
  getHistoryAsText(): string {
    const session = this.getSession()
    return session.messages
      .map((msg) => {
        const role = msg.role === 'user' ? 'User' : 'Assistant'
        return `[${role}]: ${msg.content}`
      })
      .join('\n\n')
  }

  /**
   * Updates the agent configuration
   */
  updateConfig(config: Partial<ConversationAgentConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Gets the current configuration
   */
  getConfig(): ConversationAgentConfig {
    return { ...this.config }
  }
}

/**
 * Creates a new conversation agent instance
 */
export function createConversationAgent(
  config?: Partial<ConversationAgentConfig>
): ConversationAgent {
  return new ConversationAgent(config)
}

/**
 * Default singleton agent instance
 */
let defaultAgent: ConversationAgent | null = null

/**
 * Gets the default conversation agent
 */
export function getDefaultAgent(): ConversationAgent {
  if (!defaultAgent) {
    defaultAgent = new ConversationAgent()
  }
  return defaultAgent
}

/**
 * Resets the default agent (useful for testing)
 */
export function resetDefaultAgent(): void {
  defaultAgent = null
}
