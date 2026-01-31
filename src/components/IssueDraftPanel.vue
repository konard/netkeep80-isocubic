<!--
  Issue Draft Panel Component (Vue 3 SFC)

  Component for creating and editing GitHub Issue drafts in GOD MODE.
  Provides interface for AI-generated drafts with manual editing capabilities.

  TASK 56: Issue Draft Generator (Phase 9 - GOD MODE)
  TASK 138: Migration from React to Vue 3.0 SFC

  Features:
  - AI-powered draft generation from conversation
  - Manual draft editing with preview
  - Template-based issue creation
  - Component suggestion and linking
  - Screenshot attachment support
  - Draft validation and quality scoring
-->
<script setup lang="ts">
// --- Imports ---
import { ref, computed, shallowRef, onMounted, onUnmounted, type CSSProperties } from 'vue'
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
import GitHubAuthButton from './GitHubAuthButton.vue'
import AnnotationCanvas from './AnnotationCanvas.vue'

// --- Props ---
interface IssueDraftPanelProps {
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

const props = withDefaults(defineProps<IssueDraftPanelProps>(), {
  conversationMessages: () => [],
  language: 'ru',
  showAdvancedOptions: false,
  style: undefined,
  className: undefined,
  githubClient: undefined,
  githubOwner: undefined,
  githubRepo: undefined,
  githubOAuthClientId: undefined,
  settings: undefined,
})

// --- Emits ---
const emit = defineEmits<{
  draftCreated: [draft: IssueDraft]
  draftUpdated: [draft: IssueDraft]
  draftReady: [draft: IssueDraft]
  issuePublished: [result: GitHubIssueResult]
}>()

// --- Styles ---
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

// --- Spinner animation CSS injection ---
const spinnerAnimationCSS = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`

let styleElement: HTMLStyleElement | null = null

onMounted(() => {
  if (document.getElementById('issue-draft-panel-styles')) return

  styleElement = document.createElement('style')
  styleElement.id = 'issue-draft-panel-styles'
  styleElement.textContent = spinnerAnimationCSS
  document.head.appendChild(styleElement)
})

onUnmounted(() => {
  if (styleElement && styleElement.parentNode) {
    document.head.removeChild(styleElement)
    styleElement = null
  }
})

// --- State ---
const draft = ref<IssueDraft | null>(null)
const isGenerating = ref(false)
const selectedTemplate = ref<string>('')
const hoveredButton = ref<string | null>(null)
const generationInsights = ref<IssueGenerationResult['insights'] | null>(null)

// Screenshot & annotation state
const screenshots = ref<IssueScreenshot[]>([])
const activeScreenshot = ref<IssueScreenshot | null>(null)
const isCapturing = ref(false)

// GitHub state
const internalGithubClient = shallowRef<GitHubApiClient>(
  props.githubClient ||
    createGitHubClient({
      owner: props.githubOwner || '',
      repo: props.githubRepo || '',
      oauthClientId: props.githubOAuthClientId,
    })
)
const isGithubAuthenticated = ref(false)
const isPublishing = ref(false)
const publishResult = ref<GitHubIssueResult | null>(null)

// --- Computed ---

// Generator instance
const generator = computed(() => {
  return createIssueGenerator({
    language: props.language,
    ...props.settings,
  })
})

// Available templates
const templates = computed(() => generator.value.getTemplates())

// Draft validation
const validation = computed(() => {
  return draft.value
    ? validateIssueDraft(draft.value)
    : { isValid: false, errors: [], warnings: [] }
})

// --- Functions ---

// Get confidence color
function getConfidenceColor(confidence: number): CSSProperties {
  if (confidence < 0.3) return styles.confidenceFillLow
  if (confidence < 0.7) return styles.confidenceFillMedium
  return styles.confidenceFillHigh
}

// Get button style with hover/disabled states
function getButtonStyle(baseStyle: CSSProperties, isDisabled = false): CSSProperties {
  return {
    ...baseStyle,
    ...(isDisabled ? styles.buttonDisabled : {}),
  }
}

// Handle draft field changes
function handleDraftChange(field: keyof IssueDraft, value: IssueDraft[keyof IssueDraft]) {
  if (!draft.value) return

  const updatedDraft = {
    ...draft.value,
    [field]: value,
    updatedAt: new Date().toISOString(),
  }

  draft.value = updatedDraft
  emit('draftUpdated', updatedDraft)
}

// Handle draft generation from conversation
async function handleGenerateFromConversation() {
  if (props.conversationMessages.length === 0) return

  isGenerating.value = true
  try {
    const result = await generator.value.generateFromConversation(props.conversationMessages, {
      includeContext: true,
      suggestComponents: true,
    })

    draft.value = result.draft
    generationInsights.value = result.insights

    if (result.success) {
      emit('draftCreated', result.draft)
    }
  } catch (error) {
    console.error('Failed to generate draft:', error)
  } finally {
    isGenerating.value = false
  }
}

// Handle draft generation from template
async function handleGenerateFromTemplate(templateId: string) {
  isGenerating.value = true
  try {
    const templateDraft = generator.value.createFromTemplate(templateId)
    draft.value = templateDraft
    generationInsights.value = null
    emit('draftCreated', templateDraft)
  } catch (error) {
    console.error('Failed to generate draft from template:', error)
  } finally {
    isGenerating.value = false
  }
}

// Handle template select change
function handleTemplateChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  selectedTemplate.value = value
  if (value) {
    handleGenerateFromTemplate(value)
  }
}

// Handle publish to GitHub
async function handlePublishToGitHub() {
  if (!draft.value || !validation.value.isValid) return

  isPublishing.value = true
  publishResult.value = null

  const result = await internalGithubClient.value.createIssue(draft.value)
  publishResult.value = result
  isPublishing.value = false

  if (result.success) {
    draft.value = { ...draft.value, status: 'published', updatedAt: new Date().toISOString() }
    emit('issuePublished', result)
  }
}

// Handle screenshot capture
async function handleCaptureScreenshot() {
  isCapturing.value = true
  try {
    const result: CaptureResult = await captureViewport()
    if (result.success && result.screenshot) {
      screenshots.value = [...screenshots.value, result.screenshot]
      // Attach to draft if exists
      if (draft.value) {
        handleDraftChange('screenshots', [...(draft.value.screenshots || []), result.screenshot])
      }
    }
  } catch (error) {
    console.error('Failed to capture screenshot:', error)
  } finally {
    isCapturing.value = false
  }
}

// Handle screenshot annotation save
function handleAnnotationSave(imageData: string) {
  if (!activeScreenshot.value) return
  const updatedScreenshot: IssueScreenshot = {
    ...activeScreenshot.value,
    imageData,
  }
  screenshots.value = screenshots.value.map((s) =>
    s.id === updatedScreenshot.id ? updatedScreenshot : s
  )
  if (draft.value) {
    const updatedScreenshots = (draft.value.screenshots || []).map((s) =>
      s.id === updatedScreenshot.id ? updatedScreenshot : s
    )
    handleDraftChange('screenshots', updatedScreenshots)
  }
  activeScreenshot.value = null
}

// Handle screenshot removal
function handleRemoveScreenshot(id: string) {
  screenshots.value = screenshots.value.filter((s) => s.id !== id)
  if (draft.value) {
    handleDraftChange(
      'screenshots',
      (draft.value.screenshots || []).filter((s) => s.id !== id)
    )
  }
}

// Handle remove screenshot button click (stop propagation)
function handleRemoveScreenshotClick(event: Event, id: string) {
  event.stopPropagation()
  handleRemoveScreenshot(id)
}

// Handle annotations change from AnnotationCanvas
function handleAnnotationsChange(annotations: unknown[]) {
  if (activeScreenshot.value) {
    activeScreenshot.value = {
      ...activeScreenshot.value,
      annotations: annotations as IssueScreenshot['annotations'],
    }
  }
}

// Handle auth state change
function handleAuthStateChange(state: { authenticated: boolean }) {
  isGithubAuthenticated.value = state.authenticated
}
</script>

<template>
  <div :style="{ ...styles.container, ...props.style }" :class="props.className">
    <!-- Header -->
    <div :style="styles.header">
      <div :style="styles.headerTitle">
        <span>&#x1F4DD;</span>
        <span>{{
          props.language === 'ru'
            ? '\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0438 \u0437\u0430\u0434\u0430\u0447'
            : 'Issue Drafts'
        }}</span>
      </div>
      <div :style="styles.headerControls">
        <button
          v-if="draft && validation.isValid"
          type="button"
          :style="getButtonStyle(styles.buttonPrimary)"
          @click="emit('draftReady', draft!)"
          @mouseenter="hoveredButton = 'ready'"
          @mouseleave="hoveredButton = null"
        >
          {{
            props.language === 'ru'
              ? '\u2705 \u0413\u043E\u0442\u043E\u0432\u043E \u043A \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0438'
              : '\u2705 Ready to publish'
          }}
        </button>
      </div>
    </div>

    <!-- Content -->
    <div :style="styles.content">
      <!-- Template selection (when no draft) -->
      <div v-if="!draft" :style="styles.generateSection">
        <div :style="styles.generateTitle">
          {{
            props.language === 'ru'
              ? '\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A'
              : 'Create Draft'
          }}
        </div>
        <div :style="styles.generateDescription">
          {{
            props.language === 'ru'
              ? '\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0418\u0418 \u0434\u043B\u044F \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A\u0430 \u043D\u0430 \u043E\u0441\u043D\u043E\u0432\u0435 \u0434\u0438\u0430\u043B\u043E\u0433\u0430 \u0438\u043B\u0438 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0448\u0430\u0431\u043B\u043E\u043D'
              : 'Use AI to create a draft from conversation or select a template'
          }}
        </div>
        <div :style="styles.generateControls">
          <select
            :style="styles.templateSelect"
            :value="selectedTemplate"
            @change="handleTemplateChange"
          >
            <option value="">
              {{
                props.language === 'ru'
                  ? '\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0448\u0430\u0431\u043B\u043E\u043D...'
                  : 'Choose template...'
              }}
            </option>
            <option v-for="template in templates" :key="template.id" :value="template.id">
              {{ template.icon }} {{ template.name }}
            </option>
          </select>
          <button
            v-if="conversationMessages.length > 0"
            type="button"
            :style="getButtonStyle(styles.buttonPrimary, isGenerating)"
            :disabled="isGenerating"
            @click="handleGenerateFromConversation"
            @mouseenter="hoveredButton = 'generate'"
            @mouseleave="hoveredButton = null"
          >
            <div v-if="isGenerating" :style="styles.loading">
              <div :style="styles.spinner"></div>
              <span>{{
                props.language === 'ru'
                  ? '\u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435...'
                  : 'Generating...'
              }}</span>
            </div>
            <span v-else>
              {{
                props.language === 'ru'
                  ? '\uD83E\uDD16 \u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0438\u0437 \u0434\u0438\u0430\u043B\u043E\u0433\u0430'
                  : '\uD83E\uDD16 Generate from conversation'
              }}
            </span>
          </button>
        </div>
      </div>

      <!-- Generation insights -->
      <div v-if="generationInsights" :style="styles.metadataSection">
        <div :style="styles.metadataItem">
          <span :style="styles.metadataLabel">
            {{
              props.language === 'ru'
                ? '\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u043D\u044B\u0439 \u0442\u0438\u043F:'
                : 'Detected type:'
            }}
          </span>
          <span :style="styles.metadataValue">
            {{ generationInsights.detectedType }}
          </span>
        </div>
        <div :style="styles.metadataItem">
          <span :style="styles.metadataLabel">
            {{
              props.language === 'ru'
                ? '\u041F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442:'
                : 'Priority:'
            }}
          </span>
          <span :style="styles.metadataValue">
            {{ generationInsights.detectedPriority }}
          </span>
        </div>
        <div v-if="generationInsights.keyPhrases.length > 0" :style="styles.metadataItem">
          <span :style="styles.metadataLabel">
            {{
              props.language === 'ru'
                ? '\u041A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u0444\u0440\u0430\u0437\u044B:'
                : 'Key phrases:'
            }}
          </span>
          <span :style="styles.metadataValue">
            {{ generationInsights.keyPhrases.slice(0, 3).join(', ') }}
          </span>
        </div>
        <div v-if="generationInsights.requirements.length > 0" :style="styles.metadataItem">
          <span :style="styles.metadataLabel">
            {{
              props.language === 'ru'
                ? '\u0422\u0440\u0435\u0431\u043E\u0432\u0430\u043D\u0438\u044F:'
                : 'Requirements:'
            }}
          </span>
          <span :style="styles.metadataValue">
            {{ generationInsights.requirements.length }}
            {{ props.language === 'ru' ? '\u043D\u0430\u0439\u0434\u0435\u043D\u043E' : 'found' }}
          </span>
        </div>
      </div>

      <!-- Draft editor -->
      <div v-if="draft" :style="styles.draftEditor">
        <!-- Title -->
        <div :style="styles.formGroup">
          <label :style="styles.formLabel">{{
            props.language === 'ru'
              ? '\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A'
              : 'Title'
          }}</label>
          <input
            type="text"
            :style="styles.formInput"
            :value="draft.title"
            :placeholder="
              props.language === 'ru'
                ? '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0437\u0430\u0434\u0430\u0447\u0438...'
                : 'Enter issue title...'
            "
            @input="handleDraftChange('title', ($event.target as HTMLInputElement).value)"
          />
        </div>

        <!-- Type and Priority -->
        <div :style="styles.formRow">
          <div :style="{ ...styles.formGroup, ...styles.formRowHalf }">
            <label :style="styles.formLabel">{{
              props.language === 'ru' ? '\u0422\u0438\u043F' : 'Type'
            }}</label>
            <select
              :style="styles.formSelect"
              :value="draft.type"
              @change="
                handleDraftChange('type', ($event.target as HTMLSelectElement).value as IssueType)
              "
            >
              <option value="bug">
                {{
                  props.language === 'ru' ? '\uD83D\uDC1B \u0411\u0430\u0433' : '\uD83D\uDC1B Bug'
                }}
              </option>
              <option value="feature">
                {{
                  props.language === 'ru'
                    ? '\uD83D\uDE80 \u0424\u0438\u0447\u0430'
                    : '\uD83D\uDE80 Feature'
                }}
              </option>
              <option value="improvement">
                {{
                  props.language === 'ru'
                    ? '\u2728 \u0423\u043B\u0443\u0447\u0448\u0435\u043D\u0438\u0435'
                    : '\u2728 Improvement'
                }}
              </option>
              <option value="documentation">
                {{
                  props.language === 'ru'
                    ? '\uD83D\uDCDA \u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430\u0446\u0438\u044F'
                    : '\uD83D\uDCDA Documentation'
                }}
              </option>
              <option value="question">
                {{
                  props.language === 'ru'
                    ? '\u2753 \u0412\u043E\u043F\u0440\u043E\u0441'
                    : '\u2753 Question'
                }}
              </option>
              <option value="maintenance">
                {{
                  props.language === 'ru'
                    ? '\uD83D\uDD27 \u041F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0430'
                    : '\uD83D\uDD27 Maintenance'
                }}
              </option>
            </select>
          </div>

          <div :style="{ ...styles.formGroup, ...styles.formRowHalf }">
            <label :style="styles.formLabel">{{
              props.language === 'ru'
                ? '\u041F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442'
                : 'Priority'
            }}</label>
            <select
              :style="styles.formSelect"
              :value="draft.priority"
              @change="
                handleDraftChange(
                  'priority',
                  ($event.target as HTMLSelectElement).value as IssuePriority
                )
              "
            >
              <option value="low">
                {{
                  props.language === 'ru'
                    ? '\uD83D\uDFE2 \u041D\u0438\u0437\u043A\u0438\u0439'
                    : '\uD83D\uDFE2 Low'
                }}
              </option>
              <option value="medium">
                {{
                  props.language === 'ru'
                    ? '\uD83D\uDFE1 \u0421\u0440\u0435\u0434\u043D\u0438\u0439'
                    : '\uD83D\uDFE1 Medium'
                }}
              </option>
              <option value="high">
                {{
                  props.language === 'ru'
                    ? '\uD83D\uDFE0 \u0412\u044B\u0441\u043E\u043A\u0438\u0439'
                    : '\uD83D\uDFE0 High'
                }}
              </option>
              <option value="critical">
                {{
                  props.language === 'ru'
                    ? '\uD83D\uDD34 \u041A\u0440\u0438\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0439'
                    : '\uD83D\uDD34 Critical'
                }}
              </option>
            </select>
          </div>
        </div>

        <!-- Description -->
        <div :style="styles.formGroup">
          <label :style="styles.formLabel">{{
            props.language === 'ru'
              ? '\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435'
              : 'Description'
          }}</label>
          <textarea
            :style="styles.formTextarea"
            :value="draft.body"
            :placeholder="
              props.language === 'ru'
                ? '\u041F\u043E\u0434\u0440\u043E\u0431\u043D\u043E\u0435 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0437\u0430\u0434\u0430\u0447\u0438...'
                : 'Detailed issue description...'
            "
            @input="handleDraftChange('body', ($event.target as HTMLTextAreaElement).value)"
          />
        </div>

        <!-- Metadata (advanced options) -->
        <div v-if="showAdvancedOptions" :style="styles.metadataSection">
          <div :style="styles.metadataItem">
            <span :style="styles.metadataLabel">
              {{
                props.language === 'ru'
                  ? '\u041A\u043E\u043D\u0444\u0438\u0434\u0435\u043D\u0446\u0438\u0430\u043B\u044C\u043D\u043E\u0441\u0442\u044C:'
                  : 'Confidence:'
              }}
            </span>
            <span :style="styles.metadataValue">
              {{ draft.confidence ? `${Math.round((draft.confidence || 0) * 100)}%` : 'N/A' }}
            </span>
          </div>
          <div :style="styles.confidenceBar">
            <div
              :style="{
                ...styles.confidenceFill,
                ...getConfidenceColor(draft.confidence || 0),
                width: `${(draft.confidence || 0) * 100}%`,
              }"
            />
          </div>
          <div
            v-if="draft.relatedComponents && draft.relatedComponents.length > 0"
            :style="styles.metadataItem"
          >
            <span :style="styles.metadataLabel">
              {{
                props.language === 'ru'
                  ? '\u0421\u0432\u044F\u0437\u0430\u043D\u043D\u044B\u0435 \u043A\u043E\u043C\u043F\u043E\u043D\u0435\u043D\u0442\u044B:'
                  : 'Related components:'
              }}
            </span>
            <span :style="styles.metadataValue">{{ draft.relatedComponents.join(', ') }}</span>
          </div>
        </div>

        <!-- Validation warnings -->
        <div v-if="validation.warnings.length > 0" :style="styles.warningsSection">
          <div :style="styles.warningTitle">
            {{
              props.language === 'ru'
                ? '\u26A0\uFE0F \u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u0438'
                : '\u26A0\uFE0F Recommendations'
            }}
          </div>
          <ul :style="styles.warningList">
            <li v-for="(warning, index) in validation.warnings" :key="index">{{ warning }}</li>
          </ul>
        </div>

        <!-- Validation errors -->
        <div v-if="validation.errors.length > 0" :style="styles.warningsSection">
          <div :style="styles.warningTitle">
            {{
              props.language === 'ru'
                ? '\u274C \u041E\u0448\u0438\u0431\u043A\u0438'
                : '\u274C Errors'
            }}
          </div>
          <ul :style="styles.warningList">
            <li v-for="(error, index) in validation.errors" :key="index">{{ error }}</li>
          </ul>
        </div>
      </div>

      <!-- Preview -->
      <div v-if="draft" :style="styles.previewSection">
        <div :style="styles.previewTitle">
          {{
            props.language === 'ru'
              ? '\u041F\u0440\u0435\u0434\u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440'
              : 'Preview'
          }}
        </div>
        <div :style="styles.previewContent">
          **{{ draft.title }}**
          {{ draft.body }}
        </div>
      </div>

      <!-- Screenshot Section -->
      <div
        v-if="draft"
        :style="{
          padding: '12px 16px',
          borderTop: '1px solid rgba(139, 92, 246, 0.2)',
        }"
      >
        <div
          :style="{
            fontSize: '12px',
            fontWeight: 600,
            color: '#c4b5fd',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }"
        >
          <span>
            {{
              props.language === 'ru'
                ? '\uD83D\uDCF8 \u0421\u043A\u0440\u0438\u043D\u0448\u043E\u0442\u044B'
                : '\uD83D\uDCF8 Screenshots'
            }}{{ screenshots.length > 0 ? ` (${screenshots.length})` : '' }}
          </span>
          <button
            type="button"
            :disabled="isCapturing"
            :style="{
              ...styles.button,
              opacity: isCapturing ? 0.5 : 1,
              cursor: isCapturing ? 'not-allowed' : 'pointer',
            }"
            data-testid="capture-screenshot-button"
            @click="handleCaptureScreenshot"
          >
            {{
              isCapturing
                ? props.language === 'ru'
                  ? '\u23F3 \u0417\u0430\u0445\u0432\u0430\u0442...'
                  : '\u23F3 Capturing...'
                : props.language === 'ru'
                  ? '\uD83D\uDCF7 \u0421\u0434\u0435\u043B\u0430\u0442\u044C \u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442'
                  : '\uD83D\uDCF7 Capture screenshot'
            }}
          </button>
        </div>
        <div
          v-if="screenshots.length > 0"
          :style="{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            marginTop: '8px',
          }"
        >
          <div
            v-for="screenshot in screenshots"
            :key="screenshot.id"
            :style="{
              position: 'relative',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '6px',
              overflow: 'hidden',
              cursor: 'pointer',
              width: '80px',
              height: '60px',
            }"
            :data-testid="`screenshot-thumb-${screenshot.id}`"
            @click="activeScreenshot = screenshot"
          >
            <img
              :src="screenshot.imageData"
              :alt="screenshot.title || 'Screenshot'"
              :style="{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }"
            />
            <button
              type="button"
              :style="{
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
              }"
              :data-testid="`screenshot-remove-${screenshot.id}`"
              @click="handleRemoveScreenshotClick($event, screenshot.id)"
            >
              &#x2715;
            </button>
          </div>
        </div>
      </div>

      <!-- Annotation Canvas Modal -->
      <div
        v-if="activeScreenshot"
        :style="{
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
        }"
        data-testid="annotation-modal"
      >
        <div
          :style="{
            maxWidth: '900px',
            maxHeight: '700px',
            width: '100%',
            height: '100%',
          }"
        >
          <AnnotationCanvas
            :screenshot="activeScreenshot"
            :language="props.language"
            @annotations-change="handleAnnotationsChange"
            @export="handleAnnotationSave"
            @close="activeScreenshot = null"
          />
        </div>
      </div>

      <!-- GitHub Integration Section -->
      <div
        v-if="draft && validation.isValid"
        :style="{
          padding: '12px 16px',
          borderTop: '1px solid rgba(139, 92, 246, 0.2)',
        }"
      >
        <div
          :style="{
            fontSize: '12px',
            fontWeight: 600,
            color: '#c4b5fd',
            marginBottom: '8px',
          }"
        >
          {{ props.language === 'ru' ? '\uD83D\uDC19 GitHub' : '\uD83D\uDC19 GitHub' }}
        </div>

        <!-- Auth Button -->
        <GitHubAuthButton
          :language="props.language"
          :client="internalGithubClient"
          :owner="props.githubOwner"
          :repo="props.githubRepo"
          :oauth-client-id="props.githubOAuthClientId"
          :compact="isGithubAuthenticated"
          @auth-state-change="handleAuthStateChange"
        />

        <!-- Publish Button -->
        <div
          v-if="isGithubAuthenticated && props.githubOwner && props.githubRepo"
          :style="{ marginTop: '8px' }"
        >
          <div
            v-if="publishResult?.success"
            :style="{
              padding: '8px 12px',
              borderRadius: '6px',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              fontSize: '12px',
            }"
          >
            <span :style="{ color: '#86efac' }">
              {{
                props.language === 'ru'
                  ? `\u2705 Issue #${publishResult.number} \u0441\u043E\u0437\u0434\u0430\u043D!`
                  : `\u2705 Issue #${publishResult.number} created!`
              }}
            </span>
            <br />
            <a
              :href="publishResult.htmlUrl"
              target="_blank"
              rel="noopener noreferrer"
              :style="{
                color: '#818cf8',
                textDecoration: 'underline',
                fontSize: '11px',
              }"
            >
              {{ publishResult.htmlUrl }}
            </a>
          </div>
          <template v-else>
            <button
              type="button"
              :disabled="isPublishing || draft.status === 'published'"
              :style="{
                ...styles.buttonPrimary,
                width: '100%',
                opacity: isPublishing || draft.status === 'published' ? 0.5 : 1,
                cursor: isPublishing || draft.status === 'published' ? 'not-allowed' : 'pointer',
              }"
              data-testid="publish-github-button"
              @click="handlePublishToGitHub"
            >
              {{
                isPublishing
                  ? props.language === 'ru'
                    ? '\u23F3 \u041F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u044F...'
                    : '\u23F3 Publishing...'
                  : props.language === 'ru'
                    ? '\uD83D\uDE80 \u041E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u0442\u044C \u043D\u0430 GitHub'
                    : '\uD83D\uDE80 Publish to GitHub'
              }}
            </button>
          </template>
          <div
            v-if="publishResult && !publishResult.success"
            :style="{
              color: '#fca5a5',
              fontSize: '11px',
              marginTop: '4px',
            }"
          >
            {{ publishResult.error }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
