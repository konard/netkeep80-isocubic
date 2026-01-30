/**
 * Issue Draft Panel Component
 *
 * React component for creating and editing GitHub Issue drafts in GOD MODE.
 * Provides interface for AI-generated drafts with manual editing capabilities.
 *
 * TASK 56: Issue Draft Generator (Phase 9 - GOD MODE)
 *
 * Features:
 * - AI-powered draft generation from conversation
 * - Manual draft editing with preview
 * - Template-based issue creation
 * - Component suggestion and linking
 * - Screenshot attachment support
 * - Draft validation and quality scoring
 */

import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  type CSSProperties,
  type ChangeEvent,
} from 'react'
import type { QueryLanguage } from '../types/ai-query'
import type { ConversationMessage } from '../types/god-mode'
import type {
  IssueDraft,
  IssueType,
  IssuePriority,
  IssueDraftSettings,
  IssueScreenshot,
} from '../types/issue-generator'
import { createIssueGenerator, type IssueGenerationResult } from '../lib/issue-generator'
import { validateIssueDraft } from '../types/issue-generator'
import { createGitHubClient, type GitHubApiClient, type GitHubIssueResult } from '../lib/github-api'
import { captureViewport, type CaptureResult } from '../lib/screen-capture'
import { GitHubAuthButton } from './GitHubAuthButton'
import { AnnotationCanvas } from './AnnotationCanvas'

/**
 * Props for IssueDraftPanel
 */
export interface IssueDraftPanelProps {
  /** Conversation messages to analyze */
  conversationMessages?: ConversationMessage[]
  /** Language for UI and generated content */
  language?: QueryLanguage
  /** Whether to show advanced options */
  showAdvancedOptions?: boolean
  /** Custom styles */
  style?: CSSProperties
  /** Custom class name */
  className?: string
  /** Callback when draft is created */
  onDraftCreated?: (draft: IssueDraft) => void
  /** Callback when draft is updated */
  onDraftUpdated?: (draft: IssueDraft) => void
  /** Callback when draft is ready for publishing */
  onDraftReady?: (draft: IssueDraft) => void
  /** Callback when issue is published to GitHub */
  onIssuePublished?: (result: GitHubIssueResult) => void
  /** GitHub API client (optional) */
  githubClient?: GitHubApiClient
  /** GitHub repository owner */
  githubOwner?: string
  /** GitHub repository name */
  githubRepo?: string
  /** GitHub OAuth Client ID (enables OAuth Device Flow) */
  githubOAuthClientId?: string
  /** Settings for the panel */
  settings?: Partial<IssueDraftSettings>
}

/**
 * Styles for the component
 */
const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: 'rgba(24, 24, 36, 0.95)',
    color: '#e5e7eb',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '13px',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
    flexShrink: 0,
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#c4b5fd',
  },
  headerControls: {
    display: 'flex',
    gap: '8px',
  },
  button: {
    background: 'rgba(139, 92, 246, 0.1)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '6px',
    color: '#c4b5fd',
    cursor: 'pointer',
    padding: '6px 12px',
    fontSize: '11px',
    fontWeight: 500,
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
  },
  buttonHover: {
    background: 'rgba(139, 92, 246, 0.2)',
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  buttonPrimary: {
    background: 'rgba(139, 92, 246, 0.2)',
    borderColor: 'rgba(139, 92, 246, 0.4)',
    color: '#e5e7eb',
  },
  buttonPrimaryHover: {
    background: 'rgba(139, 92, 246, 0.3)',
    borderColor: 'rgba(139, 92, 246, 0.6)',
  },
  buttonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  generateSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px',
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    border: '1px solid rgba(139, 92, 246, 0.15)',
    borderRadius: '8px',
  },
  generateTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#c4b5fd',
    marginBottom: '8px',
  },
  generateDescription: {
    fontSize: '12px',
    color: '#9ca3af',
    lineHeight: 1.4,
    marginBottom: '12px',
  },
  generateControls: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  templateSelect: {
    background: 'rgba(17, 24, 39, 0.8)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: '6px',
    color: '#e5e7eb',
    padding: '6px 10px',
    fontSize: '12px',
    minWidth: '150px',
  },
  draftEditor: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  formLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#c4b5fd',
  },
  formInput: {
    background: 'rgba(17, 24, 39, 0.8)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: '6px',
    color: '#e5e7eb',
    padding: '8px 12px',
    fontSize: '13px',
    fontFamily: 'inherit',
  },
  formTextarea: {
    background: 'rgba(17, 24, 39, 0.8)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: '6px',
    color: '#e5e7eb',
    padding: '8px 12px',
    fontSize: '13px',
    fontFamily: 'inherit',
    minHeight: '120px',
    resize: 'vertical',
  },
  formSelect: {
    background: 'rgba(17, 24, 39, 0.8)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: '6px',
    color: '#e5e7eb',
    padding: '6px 10px',
    fontSize: '13px',
    fontFamily: 'inherit',
  },
  formRow: {
    display: 'flex',
    gap: '12px',
  },
  formRowHalf: {
    flex: 1,
  },
  metadataSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
    backgroundColor: 'rgba(17, 24, 39, 0.5)',
    border: '1px solid rgba(139, 92, 246, 0.1)',
    borderRadius: '6px',
    fontSize: '11px',
    color: '#9ca3af',
  },
  metadataItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metadataLabel: {
    color: '#6b7280',
  },
  metadataValue: {
    color: '#d1d5db',
    fontWeight: 500,
  },
  confidenceBar: {
    width: '100%',
    height: '4px',
    backgroundColor: 'rgba(107, 114, 128, 0.3)',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: '#10b981',
    transition: 'width 0.3s ease',
  },
  confidenceFillLow: {
    backgroundColor: '#f59e0b',
  },
  confidenceFillMedium: {
    backgroundColor: '#3b82f6',
  },
  confidenceFillHigh: {
    backgroundColor: '#10b981',
  },
  warningsSection: {
    padding: '12px',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#fbbf24',
  },
  warningTitle: {
    fontWeight: 600,
    marginBottom: '6px',
    color: '#f59e0b',
  },
  warningList: {
    margin: 0,
    paddingLeft: '16px',
  },
  previewSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px',
    backgroundColor: 'rgba(17, 24, 39, 0.5)',
    border: '1px solid rgba(139, 92, 246, 0.1)',
    borderRadius: '8px',
  },
  previewTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#c4b5fd',
    marginBottom: '8px',
  },
  previewContent: {
    backgroundColor: 'rgba(24, 24, 36, 0.8)',
    border: '1px solid rgba(139, 92, 246, 0.1)',
    borderRadius: '6px',
    padding: '12px',
    fontSize: '12px',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    maxHeight: '200px',
    overflow: 'auto',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '20px',
    color: '#9ca3af',
    fontSize: '12px',
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(139, 92, 246, 0.2)',
    borderTop: '2px solid #8b5cf6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
}

/**
 * CSS animation for spinner
 */
const spinnerAnimation = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`

/**
 * Issue Draft Panel Component
 */
export function IssueDraftPanel({
  conversationMessages = [],
  language = 'ru',
  showAdvancedOptions = false,
  style,
  className,
  onDraftCreated,
  onDraftUpdated,
  onDraftReady,
  onIssuePublished,
  githubClient: externalGithubClient,
  githubOwner,
  githubRepo,
  githubOAuthClientId,
  settings,
}: IssueDraftPanelProps) {
  // State
  const [draft, setDraft] = useState<IssueDraft | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [hoveredButton, setHoveredButton] = useState<string | null>(null)
  const [generationInsights, setGenerationInsights] = useState<
    IssueGenerationResult['insights'] | null
  >(null)

  // Screenshot & annotation state
  const [screenshots, setScreenshots] = useState<IssueScreenshot[]>([])
  const [activeScreenshot, setActiveScreenshot] = useState<IssueScreenshot | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)

  // GitHub state
  const [githubClient] = useState<GitHubApiClient>(
    () =>
      externalGithubClient ||
      createGitHubClient({
        owner: githubOwner || '',
        repo: githubRepo || '',
        oauthClientId: githubOAuthClientId,
      })
  )
  const [isGithubAuthenticated, setIsGithubAuthenticated] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishResult, setPublishResult] = useState<GitHubIssueResult | null>(null)

  // Generator instance
  const generator = useMemo(() => {
    return createIssueGenerator({
      language,
      ...settings,
    })
  }, [language, settings])

  // Available templates
  const templates = useMemo(() => generator.getTemplates(), [generator])

  // Add CSS for spinner animation
  useEffect(() => {
    if (document.getElementById('issue-draft-panel-styles')) return

    const styleElement = document.createElement('style')
    styleElement.id = 'issue-draft-panel-styles'
    styleElement.textContent = spinnerAnimation
    document.head.appendChild(styleElement)

    return () => {
      document.head.removeChild(styleElement)
    }
  }, [])

  // Handle draft generation from conversation
  const handleGenerateFromConversation = useCallback(async () => {
    if (conversationMessages.length === 0) return

    setIsGenerating(true)
    try {
      const result = await generator.generateFromConversation(conversationMessages, {
        includeContext: true,
        suggestComponents: true,
      })

      setDraft(result.draft)
      setGenerationInsights(result.insights)

      if (result.success) {
        onDraftCreated?.(result.draft)
      }
    } catch (error) {
      console.error('Failed to generate draft:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [conversationMessages, generator, onDraftCreated])

  // Handle draft generation from template
  const handleGenerateFromTemplate = useCallback(
    async (templateId: string) => {
      setIsGenerating(true)
      try {
        const templateDraft = generator.createFromTemplate(templateId)
        setDraft(templateDraft)
        setGenerationInsights(null)
        onDraftCreated?.(templateDraft)
      } catch (error) {
        console.error('Failed to generate draft from template:', error)
      } finally {
        setIsGenerating(false)
      }
    },
    [generator, onDraftCreated]
  )

  // Handle draft field changes
  const handleDraftChange = useCallback(
    (field: keyof IssueDraft, value: IssueDraft[keyof IssueDraft]) => {
      if (!draft) return

      const updatedDraft = {
        ...draft,
        [field]: value,
        updatedAt: new Date().toISOString(),
      }

      setDraft(updatedDraft)
      onDraftUpdated?.(updatedDraft)
    },
    [draft, onDraftUpdated]
  )

  // Handle draft validation
  const validation = useMemo(() => {
    return draft ? validateIssueDraft(draft) : { isValid: false, errors: [], warnings: [] }
  }, [draft])

  // Handle publish to GitHub
  const handlePublishToGitHub = useCallback(async () => {
    if (!draft || !validation.isValid) return

    setIsPublishing(true)
    setPublishResult(null)

    const result = await githubClient.createIssue(draft)
    setPublishResult(result)
    setIsPublishing(false)

    if (result.success) {
      setDraft({ ...draft, status: 'published', updatedAt: new Date().toISOString() })
      onIssuePublished?.(result)
    }
  }, [draft, validation.isValid, githubClient, onIssuePublished])

  // Handle screenshot capture
  const handleCaptureScreenshot = useCallback(async () => {
    setIsCapturing(true)
    try {
      const result: CaptureResult = await captureViewport()
      if (result.success && result.screenshot) {
        setScreenshots((prev) => [...prev, result.screenshot!])
        // Attach to draft if exists
        if (draft) {
          handleDraftChange('screenshots', [...(draft.screenshots || []), result.screenshot])
        }
      }
    } catch (error) {
      console.error('Failed to capture screenshot:', error)
    } finally {
      setIsCapturing(false)
    }
  }, [draft, handleDraftChange])

  // Handle screenshot annotation save
  const handleAnnotationSave = useCallback(
    (imageData: string) => {
      if (!activeScreenshot) return
      const updatedScreenshot: IssueScreenshot = {
        ...activeScreenshot,
        imageData,
      }
      setScreenshots((prev) =>
        prev.map((s) => (s.id === updatedScreenshot.id ? updatedScreenshot : s))
      )
      if (draft) {
        const updatedScreenshots = (draft.screenshots || []).map((s) =>
          s.id === updatedScreenshot.id ? updatedScreenshot : s
        )
        handleDraftChange('screenshots', updatedScreenshots)
      }
      setActiveScreenshot(null)
    },
    [activeScreenshot, draft, handleDraftChange]
  )

  // Handle screenshot removal
  const handleRemoveScreenshot = useCallback(
    (id: string) => {
      setScreenshots((prev) => prev.filter((s) => s.id !== id))
      if (draft) {
        handleDraftChange(
          'screenshots',
          (draft.screenshots || []).filter((s) => s.id !== id)
        )
      }
    },
    [draft, handleDraftChange]
  )

  // Get confidence color class
  const getConfidenceColor = useCallback((confidence: number) => {
    if (confidence < 0.3) return styles.confidenceFillLow
    if (confidence < 0.7) return styles.confidenceFillMedium
    return styles.confidenceFillHigh
  }, [])

  // Get button style
  const getButtonStyle = useCallback(
    (baseStyle: CSSProperties, isDisabled = false) => {
      return {
        ...baseStyle,
        ...(hoveredButton === baseStyle && !isDisabled ? styles.buttonHover : {}),
        ...(isDisabled ? styles.buttonDisabled : {}),
      }
    },
    [hoveredButton]
  )

  // Render template selection
  const renderTemplateSelection = () => {
    return (
      <div style={styles.generateSection}>
        <div style={styles.generateTitle}>
          {language === 'ru' ? 'Создать черновик' : 'Create Draft'}
        </div>
        <div style={styles.generateDescription}>
          {language === 'ru'
            ? 'Используйте ИИ для создания черновика на основе диалога или выберите шаблон'
            : 'Use AI to create a draft from conversation or select a template'}
        </div>
        <div style={styles.generateControls}>
          <select
            style={styles.templateSelect}
            value={selectedTemplate}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
              const value = e.target.value
              setSelectedTemplate(value)
              if (value) {
                handleGenerateFromTemplate(value)
              }
            }}
          >
            <option value="">
              {language === 'ru' ? 'Выберите шаблон...' : 'Choose template...'}
            </option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.icon} {language === 'ru' ? template.name : template.name}
              </option>
            ))}
          </select>
          {conversationMessages.length > 0 && (
            <button
              type="button"
              style={getButtonStyle(styles.buttonPrimary, isGenerating)}
              onClick={handleGenerateFromConversation}
              disabled={isGenerating}
              onMouseEnter={() => setHoveredButton('generate')}
              onMouseLeave={() => setHoveredButton(null)}
            >
              {isGenerating ? (
                <div style={styles.loading}>
                  <div style={styles.spinner}></div>
                  <span>{language === 'ru' ? 'Создание...' : 'Generating...'}</span>
                </div>
              ) : (
                <span>
                  {language === 'ru' ? '🤖 Создать из диалога' : '🤖 Generate from conversation'}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    )
  }

  // Render draft editor
  const renderDraftEditor = () => {
    if (!draft) return null

    return (
      <div style={styles.draftEditor}>
        {/* Title */}
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>{language === 'ru' ? 'Заголовок' : 'Title'}</label>
          <input
            type="text"
            style={styles.formInput}
            value={draft.title}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              handleDraftChange('title', e.target.value)
            }}
            placeholder={language === 'ru' ? 'Введите заголовок задачи...' : 'Enter issue title...'}
          />
        </div>

        {/* Type and Priority */}
        <div style={styles.formRow}>
          <div style={{ ...styles.formGroup, ...styles.formRowHalf }}>
            <label style={styles.formLabel}>{language === 'ru' ? 'Тип' : 'Type'}</label>
            <select
              style={styles.formSelect}
              value={draft.type}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                handleDraftChange('type', e.target.value as IssueType)
              }}
            >
              <option value="bug">{language === 'ru' ? '🐛 Баг' : '🐛 Bug'}</option>
              <option value="feature">{language === 'ru' ? '🚀 Фича' : '🚀 Feature'}</option>
              <option value="improvement">
                {language === 'ru' ? '✨ Улучшение' : '✨ Improvement'}
              </option>
              <option value="documentation">
                {language === 'ru' ? '📚 Документация' : '📚 Documentation'}
              </option>
              <option value="question">{language === 'ru' ? '❓ Вопрос' : '❓ Question'}</option>
              <option value="maintenance">
                {language === 'ru' ? '🔧 Поддержка' : '🔧 Maintenance'}
              </option>
            </select>
          </div>

          <div style={{ ...styles.formGroup, ...styles.formRowHalf }}>
            <label style={styles.formLabel}>{language === 'ru' ? 'Приоритет' : 'Priority'}</label>
            <select
              style={styles.formSelect}
              value={draft.priority}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                handleDraftChange('priority', e.target.value as IssuePriority)
              }}
            >
              <option value="low">{language === 'ru' ? '🟢 Низкий' : '🟢 Low'}</option>
              <option value="medium">{language === 'ru' ? '🟡 Средний' : '🟡 Medium'}</option>
              <option value="high">{language === 'ru' ? '🟠 Высокий' : '🟠 High'}</option>
              <option value="critical">
                {language === 'ru' ? '🔴 Критический' : '🔴 Critical'}
              </option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>{language === 'ru' ? 'Описание' : 'Description'}</label>
          <textarea
            style={styles.formTextarea}
            value={draft.body}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
              handleDraftChange('body', e.target.value)
            }}
            placeholder={
              language === 'ru' ? 'Подробное описание задачи...' : 'Detailed issue description...'
            }
          />
        </div>

        {/* Metadata */}
        {showAdvancedOptions && (
          <div style={styles.metadataSection}>
            <div style={styles.metadataItem}>
              <span style={styles.metadataLabel}>
                {language === 'ru' ? 'Конфиденциальность:' : 'Confidence:'}
              </span>
              <span style={styles.metadataValue}>
                {draft.confidence ? `${Math.round((draft.confidence || 0) * 100)}%` : 'N/A'}
              </span>
            </div>
            <div style={styles.confidenceBar}>
              <div
                style={{
                  ...styles.confidenceFill,
                  ...getConfidenceColor(draft.confidence || 0),
                  width: `${(draft.confidence || 0) * 100}%`,
                }}
              />
            </div>
            {draft.relatedComponents && draft.relatedComponents.length > 0 && (
              <div style={styles.metadataItem}>
                <span style={styles.metadataLabel}>
                  {language === 'ru' ? 'Связанные компоненты:' : 'Related components:'}
                </span>
                <span style={styles.metadataValue}>{draft.relatedComponents.join(', ')}</span>
              </div>
            )}
          </div>
        )}

        {/* Validation warnings/errors */}
        {validation.warnings.length > 0 && (
          <div style={styles.warningsSection}>
            <div style={styles.warningTitle}>
              {language === 'ru' ? '⚠️ Рекомендации' : '⚠️ Recommendations'}
            </div>
            <ul style={styles.warningList}>
              {validation.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {validation.errors.length > 0 && (
          <div style={styles.warningsSection}>
            <div style={styles.warningTitle}>{language === 'ru' ? '❌ Ошибки' : '❌ Errors'}</div>
            <ul style={styles.warningList}>
              {validation.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  // Render insights
  const renderInsights = () => {
    if (!generationInsights) return null

    return (
      <div style={styles.metadataSection}>
        <div style={styles.metadataItem}>
          <span style={styles.metadataLabel}>
            {language === 'ru' ? 'Определенный тип:' : 'Detected type:'}
          </span>
          <span style={styles.metadataValue}>
            {language === 'ru' ? generationInsights.detectedType : generationInsights.detectedType}
          </span>
        </div>
        <div style={styles.metadataItem}>
          <span style={styles.metadataLabel}>{language === 'ru' ? 'Приоритет:' : 'Priority:'}</span>
          <span style={styles.metadataValue}>
            {language === 'ru'
              ? generationInsights.detectedPriority
              : generationInsights.detectedPriority}
          </span>
        </div>
        {generationInsights.keyPhrases.length > 0 && (
          <div style={styles.metadataItem}>
            <span style={styles.metadataLabel}>
              {language === 'ru' ? 'Ключевые фразы:' : 'Key phrases:'}
            </span>
            <span style={styles.metadataValue}>
              {generationInsights.keyPhrases.slice(0, 3).join(', ')}
            </span>
          </div>
        )}
        {generationInsights.requirements.length > 0 && (
          <div style={styles.metadataItem}>
            <span style={styles.metadataLabel}>
              {language === 'ru' ? 'Требования:' : 'Requirements:'}
            </span>
            <span style={styles.metadataValue}>
              {generationInsights.requirements.length} {language === 'ru' ? 'найдено' : 'found'}
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ ...styles.container, ...style }} className={className}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <span>📝</span>
          <span>{language === 'ru' ? 'Черновики задач' : 'Issue Drafts'}</span>
        </div>
        <div style={styles.headerControls}>
          {draft && validation.isValid && (
            <button
              type="button"
              style={getButtonStyle(styles.buttonPrimary)}
              onClick={() => onDraftReady?.(draft)}
              onMouseEnter={() => setHoveredButton('ready')}
              onMouseLeave={() => setHoveredButton(null)}
            >
              {language === 'ru' ? '✅ Готово к публикации' : '✅ Ready to publish'}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* Template selection */}
        {!draft && renderTemplateSelection()}

        {/* Generation insights */}
        {generationInsights && renderInsights()}

        {/* Draft editor */}
        {draft && renderDraftEditor()}

        {/* Preview */}
        {draft && (
          <div style={styles.previewSection}>
            <div style={styles.previewTitle}>{language === 'ru' ? 'Предпросмотр' : 'Preview'}</div>
            <div style={styles.previewContent}>
              **{draft.title}**
              {draft.body}
            </div>
          </div>
        )}

        {/* Screenshot Section */}
        {draft && (
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid rgba(139, 92, 246, 0.2)',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#c4b5fd',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>
                {language === 'ru' ? '📸 Скриншоты' : '📸 Screenshots'}
                {screenshots.length > 0 && ` (${screenshots.length})`}
              </span>
              <button
                type="button"
                onClick={handleCaptureScreenshot}
                disabled={isCapturing}
                style={{
                  ...styles.button,
                  opacity: isCapturing ? 0.5 : 1,
                  cursor: isCapturing ? 'not-allowed' : 'pointer',
                }}
                data-testid="capture-screenshot-button"
              >
                {isCapturing
                  ? language === 'ru'
                    ? '⏳ Захват...'
                    : '⏳ Capturing...'
                  : language === 'ru'
                    ? '📷 Сделать скриншот'
                    : '📷 Capture screenshot'}
              </button>
            </div>
            {screenshots.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap',
                  marginTop: '8px',
                }}
              >
                {screenshots.map((screenshot) => (
                  <div
                    key={screenshot.id}
                    style={{
                      position: 'relative',
                      border: '1px solid rgba(139, 92, 246, 0.2)',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      width: '80px',
                      height: '60px',
                    }}
                    onClick={() => setActiveScreenshot(screenshot)}
                    data-testid={`screenshot-thumb-${screenshot.id}`}
                  >
                    <img
                      src={screenshot.imageData}
                      alt={screenshot.title || 'Screenshot'}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveScreenshot(screenshot.id)
                      }}
                      style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        background: 'rgba(0, 0, 0, 0.6)',
                        border: 'none',
                        color: '#fff',
                        borderRadius: '50%',
                        width: '16px',
                        height: '16px',
                        fontSize: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                      }}
                      data-testid={`screenshot-remove-${screenshot.id}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Annotation Canvas Modal */}
        {activeScreenshot && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              zIndex: 20000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
            data-testid="annotation-modal"
          >
            <div
              style={{
                maxWidth: '900px',
                maxHeight: '700px',
                width: '100%',
                height: '100%',
              }}
            >
              <AnnotationCanvas
                screenshot={activeScreenshot}
                language={language}
                onAnnotationsChange={(annotations) => {
                  setActiveScreenshot((prev) => (prev ? { ...prev, annotations } : null))
                }}
                onExport={handleAnnotationSave}
                onClose={() => setActiveScreenshot(null)}
              />
            </div>
          </div>
        )}

        {/* GitHub Integration Section */}
        {draft && validation.isValid && (
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid rgba(139, 92, 246, 0.2)',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#c4b5fd',
                marginBottom: '8px',
              }}
            >
              {language === 'ru' ? '🐙 GitHub' : '🐙 GitHub'}
            </div>

            {/* Auth Button */}
            <GitHubAuthButton
              language={language}
              client={githubClient}
              owner={githubOwner}
              repo={githubRepo}
              oauthClientId={githubOAuthClientId}
              compact={isGithubAuthenticated}
              onAuthStateChange={(state) => {
                setIsGithubAuthenticated(state.authenticated)
              }}
            />

            {/* Publish Button */}
            {isGithubAuthenticated && githubOwner && githubRepo && (
              <div style={{ marginTop: '8px' }}>
                {publishResult?.success ? (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(34, 197, 94, 0.1)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      fontSize: '12px',
                    }}
                  >
                    <span style={{ color: '#86efac' }}>
                      {language === 'ru'
                        ? `✅ Issue #${publishResult.number} создан!`
                        : `✅ Issue #${publishResult.number} created!`}
                    </span>
                    <br />
                    <a
                      href={publishResult.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#818cf8',
                        textDecoration: 'underline',
                        fontSize: '11px',
                      }}
                    >
                      {publishResult.htmlUrl}
                    </a>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handlePublishToGitHub}
                    disabled={isPublishing || draft.status === 'published'}
                    style={{
                      ...styles.buttonPrimary,
                      width: '100%',
                      opacity: isPublishing || draft.status === 'published' ? 0.5 : 1,
                      cursor:
                        isPublishing || draft.status === 'published' ? 'not-allowed' : 'pointer',
                    }}
                    data-testid="publish-github-button"
                  >
                    {isPublishing
                      ? language === 'ru'
                        ? '⏳ Публикация...'
                        : '⏳ Publishing...'
                      : language === 'ru'
                        ? '🚀 Опубликовать на GitHub'
                        : '🚀 Publish to GitHub'}
                  </button>
                )}
                {publishResult && !publishResult.success && (
                  <div
                    style={{
                      color: '#fca5a5',
                      fontSize: '11px',
                      marginTop: '4px',
                    }}
                  >
                    {publishResult.error}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default IssueDraftPanel
