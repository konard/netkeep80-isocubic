/**
 * Issue Generator Types
 *
 * TypeScript types for GitHub Issue draft generation in GOD MODE.
 * Provides types for issue drafts, templates, and generation settings.
 *
 * Features:
 * - Issue draft structure with GitHub compatibility
 * - Template system for different issue types
 * - Screenshot and annotation support
 * - Priority and labeling system
 */

import type { QueryLanguage } from './common'
import type { ConversationMessage } from './god-mode'

/**
 * Issue type categories
 */
export type IssueType =
  | 'bug'
  | 'feature'
  | 'improvement'
  | 'documentation'
  | 'question'
  | 'maintenance'

/**
 * Issue priority levels
 */
export type IssuePriority = 'low' | 'medium' | 'high' | 'critical'

/**
 * Issue annotation types for screenshots
 */
export type IssueAnnotationType = 'arrow' | 'circle' | 'rectangle' | 'text' | 'highlight'

/**
 * Annotation coordinates and properties
 */
export interface IssueAnnotation {
  /** Unique annotation ID */
  id: string
  /** Type of annotation */
  type: IssueAnnotationType
  /** Start coordinates */
  x: number
  y: number
  /** End coordinates (for line-based annotations) */
  x2?: number
  y2?: number
  /** Annotation color (hex) */
  color?: string
  /** Text content (for text annotations) */
  text?: string
  /** Line width (for drawing annotations) */
  strokeWidth?: number
  /** Opacity level */
  opacity?: number
}

/**
 * Screenshot with optional annotations
 */
export interface IssueScreenshot {
  /** Unique screenshot ID */
  id: string
  /** Base64 image data */
  imageData: string
  /** Original filename */
  filename?: string
  /** Image MIME type */
  mimeType?: string
  /** Capture timestamp */
  timestamp: string
  /** Component ID being shown */
  componentId?: string
  /** Screen resolution */
  resolution?: { width: number; height: number }
  /** Browser viewport */
  viewport?: { width: number; height: number }
  /** Annotations on the screenshot */
  annotations?: IssueAnnotation[]
  /** Screenshot title/description */
  title?: string
}

/**
 * Issue draft configuration
 */
export interface IssueDraft {
  /** Unique draft ID */
  id: string
  /** Issue title (required) */
  title: string
  /** Detailed description (markdown supported) */
  body: string
  /** Issue type */
  type: IssueType
  /** Priority level */
  priority: IssuePriority
  /** GitHub labels to apply */
  labels: string[]
  /** Component IDs mentioned in issue */
  relatedComponents?: string[]
  /** Screenshots attached to issue */
  screenshots?: IssueScreenshot[]
  /** Conversation messages that led to this draft */
  conversationContext?: ConversationMessage[]
  /** Estimated complexity/effort */
  estimatedEffort?: 'small' | 'medium' | 'large' | 'xlarge'
  /** Target milestone/phase */
  milestone?: string
  /** Assignees (GitHub usernames) */
  assignees?: string[]
  /** Draft creation timestamp */
  createdAt: string
  /** Last update timestamp */
  updatedAt: string
  /** Draft status */
  status: 'draft' | 'ready' | 'published' | 'archived'
  /** AI confidence in draft quality */
  confidence?: number
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Issue template for structured creation
 */
export interface IssueTemplate {
  /** Template ID */
  id: string
  /** Template name */
  name: string
  /** Template description */
  description: string
  /** Issue type this template creates */
  type: IssueType
  /** Template title (can include placeholders) */
  titleTemplate: string
  /** Template body (markdown with placeholders) */
  bodyTemplate: string
  /** Default labels for this template */
  defaultLabels: string[]
  /** Default priority */
  defaultPriority: IssuePriority
  /** Template icon */
  icon: string
  /** Template categories */
  categories: string[]
  /** Placeholders defined in template */
  placeholders?: IssueTemplatePlaceholder[]
  /** Whether template is built-in or custom */
  builtin: boolean
}

/**
 * Template placeholder definition
 */
export interface IssueTemplatePlaceholder {
  /** Placeholder identifier */
  id: string
  /** Placeholder display name */
  name: string
  /** Placeholder description */
  description: string
  /** Placeholder type */
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'number' | 'boolean'
  /** Whether placeholder is required */
  required: boolean
  /** Default value */
  defaultValue?: string | number | boolean
  /** Options for select/multiselect types */
  options?: Array<{ value: string; label: string }>
  /** Validation pattern */
  validation?: string
}

/**
 * Issue draft generation settings
 */
export interface IssueDraftSettings {
  /** Preferred language for generated content */
  language: QueryLanguage
  /** Whether to include conversation context */
  includeConversationContext: boolean
  /** Whether to auto-suggest components */
  autoSuggestComponents: boolean
  /** Whether to auto-generate screenshots */
  autoGenerateScreenshots: boolean
  /** Default issue type */
  defaultType: IssueType
  /** Default priority */
  defaultPriority: IssuePriority
  /** Custom labels to suggest */
  customLabels: string[]
  /** Repository information */
  repository?: {
    owner: string
    repo: string
    defaultLabels?: string[]
    allowedLabels?: string[]
  }
  /** Whether to validate drafts before marking as ready */
  validateBeforeReady: boolean
  /** Whether to show advanced options */
  showAdvancedOptions: boolean
}

/**
 * Default issue draft settings
 */
export const DEFAULT_ISSUE_DRAFT_SETTINGS: IssueDraftSettings = {
  language: 'ru',
  includeConversationContext: true,
  autoSuggestComponents: true,
  autoGenerateScreenshots: false,
  defaultType: 'improvement',
  defaultPriority: 'medium',
  customLabels: [],
  validateBeforeReady: true,
  showAdvancedOptions: false,
}

/**
 * Built-in issue templates
 */
export const BUILTIN_ISSUE_TEMPLATES: IssueTemplate[] = [
  {
    id: 'bug_report',
    name: 'Bug Report',
    description: 'Report a bug or unexpected behavior',
    type: 'bug',
    titleTemplate: 'Bug: {summary}',
    bodyTemplate: `## Bug Description
{description}

## Steps to Reproduce
1.
2.
3.

## Expected Behavior
{expectedBehavior}

## Actual Behavior
{actualBehavior}

## Environment
- Browser: {browser}
- OS: {os}
- Device: {device}

## Screenshots
{screenshots}

## Additional Context
{additionalContext}`,
    defaultLabels: ['bug', 'needs-triage'],
    defaultPriority: 'medium',
    icon: '\u{1F41B}',
    categories: ['bug', 'report'],
    builtin: true,
    placeholders: [
      {
        id: 'summary',
        name: 'Summary',
        description: 'Brief summary of the bug',
        type: 'text',
        required: true,
      },
      {
        id: 'description',
        name: 'Description',
        description: 'Detailed description of the issue',
        type: 'textarea',
        required: true,
      },
      {
        id: 'expectedBehavior',
        name: 'Expected Behavior',
        description: 'What you expected to happen',
        type: 'textarea',
        required: true,
      },
      {
        id: 'actualBehavior',
        name: 'Actual Behavior',
        description: 'What actually happened',
        type: 'textarea',
        required: true,
      },
      {
        id: 'browser',
        name: 'Browser',
        description: 'Web browser and version',
        type: 'text',
        required: false,
        defaultValue: 'Chrome',
      },
      {
        id: 'os',
        name: 'Operating System',
        description: 'Operating system',
        type: 'select',
        required: false,
        defaultValue: 'Windows',
        options: [
          { value: 'Windows', label: 'Windows' },
          { value: 'macOS', label: 'macOS' },
          { value: 'Linux', label: 'Linux' },
          { value: 'iOS', label: 'iOS' },
          { value: 'Android', label: 'Android' },
        ],
      },
      {
        id: 'device',
        name: 'Device',
        description: 'Device type',
        type: 'text',
        required: false,
      },
      {
        id: 'screenshots',
        name: 'Screenshots',
        description: 'Screenshots demonstrating the issue',
        type: 'textarea',
        required: false,
      },
      {
        id: 'additionalContext',
        name: 'Additional Context',
        description: 'Any other relevant information',
        type: 'textarea',
        required: false,
      },
    ],
  },
  {
    id: 'feature_request',
    name: 'Feature Request',
    description: 'Suggest a new feature or enhancement',
    type: 'feature',
    titleTemplate: 'Feature: {summary}',
    bodyTemplate: `## Feature Description
{description}

## Problem Statement
{problemStatement}

## Proposed Solution
{proposedSolution}

## Alternatives Considered
{alternatives}

## Implementation Notes
{implementationNotes}

## Acceptance Criteria
- [ ]
- [ ]
- [ ]

## Additional Context
{additionalContext}`,
    defaultLabels: ['enhancement', 'feature-request'],
    defaultPriority: 'medium',
    icon: '\u{1F680}',
    categories: ['feature', 'enhancement'],
    builtin: true,
    placeholders: [
      {
        id: 'summary',
        name: 'Summary',
        description: 'Brief summary of the feature',
        type: 'text',
        required: true,
      },
      {
        id: 'description',
        name: 'Description',
        description: 'Detailed description of the feature',
        type: 'textarea',
        required: true,
      },
      {
        id: 'problemStatement',
        name: 'Problem Statement',
        description: 'What problem does this feature solve?',
        type: 'textarea',
        required: true,
      },
      {
        id: 'proposedSolution',
        name: 'Proposed Solution',
        description: 'How do you propose to solve this problem?',
        type: 'textarea',
        required: true,
      },
      {
        id: 'alternatives',
        name: 'Alternatives Considered',
        description: 'What other approaches did you consider?',
        type: 'textarea',
        required: false,
      },
      {
        id: 'implementationNotes',
        name: 'Implementation Notes',
        description: 'Any technical considerations or implementation ideas',
        type: 'textarea',
        required: false,
      },
      {
        id: 'additionalContext',
        name: 'Additional Context',
        description: 'Any other relevant information',
        type: 'textarea',
        required: false,
      },
    ],
  },
  {
    id: 'improvement',
    name: 'Improvement',
    description: 'Suggest an improvement to existing functionality',
    type: 'improvement',
    titleTemplate: 'Improvement: {summary}',
    bodyTemplate: `## Current Situation
{currentSituation}

## Proposed Improvement
{proposedImprovement}

## Benefits
{benefits}

## Implementation Approach
{implementationApproach}

## Additional Context
{additionalContext}`,
    defaultLabels: ['enhancement', 'improvement'],
    defaultPriority: 'low',
    icon: '\u2728',
    categories: ['improvement', 'enhancement'],
    builtin: true,
    placeholders: [
      {
        id: 'summary',
        name: 'Summary',
        description: 'Brief summary of the improvement',
        type: 'text',
        required: true,
      },
      {
        id: 'currentSituation',
        name: 'Current Situation',
        description: 'How does it work currently?',
        type: 'textarea',
        required: true,
      },
      {
        id: 'proposedImprovement',
        name: 'Proposed Improvement',
        description: 'What should be improved?',
        type: 'textarea',
        required: true,
      },
      {
        id: 'benefits',
        name: 'Benefits',
        description: 'What are the benefits of this improvement?',
        type: 'textarea',
        required: true,
      },
      {
        id: 'implementationApproach',
        name: 'Implementation Approach',
        description: 'How should this be implemented?',
        type: 'textarea',
        required: false,
      },
      {
        id: 'additionalContext',
        name: 'Additional Context',
        description: 'Any other relevant information',
        type: 'textarea',
        required: false,
      },
    ],
  },
]

/**
 * Label color schemes for GitHub
 */
export const LABEL_COLORS = {
  bug: 'd73a4a',
  enhancement: 'a2eeef',
  'feature-request': '0075ca',
  improvement: '84b6eb',
  documentation: '0075ca',
  question: 'd876e3',
  'needs-triage': 'ededed',
  'good first issue': '7057ff',
  'help wanted': '008672',
  critical: 'b60205',
  high: 'e11d21',
  medium: 'fbca04',
  low: 'e4ea2a',
} as const

/**
 * Priority to label mapping
 */
export const PRIORITY_LABELS: Record<IssuePriority, string> = {
  low: 'priority: low',
  medium: 'priority: medium',
  high: 'priority: high',
  critical: 'priority: critical',
}

/**
 * Issue type to label mapping
 */
export const TYPE_LABELS: Record<IssueType, string> = {
  bug: 'type: bug',
  feature: 'type: feature',
  improvement: 'type: improvement',
  documentation: 'type: documentation',
  question: 'type: question',
  maintenance: 'type: maintenance',
}

/**
 * Gets default labels for issue type and priority
 */
export function getDefaultLabels(type: IssueType, priority: IssuePriority): string[] {
  const labels = [TYPE_LABELS[type], PRIORITY_LABELS[priority]]

  switch (type) {
    case 'bug':
      labels.push('needs-triage')
      break
    case 'feature':
      labels.push('enhancement', 'feature-request')
      break
    case 'improvement':
      labels.push('enhancement')
      break
  }

  return labels
}

/**
 * Validates issue draft structure
 */
export function validateIssueDraft(draft: Partial<IssueDraft>): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  if (!draft.title || draft.title.trim().length === 0) {
    errors.push('Title is required')
  } else if (draft.title.length > 72) {
    warnings.push('Title is too long (>72 characters)')
  }

  if (!draft.body || draft.body.trim().length === 0) {
    errors.push('Description is required')
  }

  if (!draft.type) {
    errors.push('Issue type is required')
  }

  if (!draft.priority) {
    errors.push('Priority is required')
  }

  if (draft.labels && draft.labels.length > 10) {
    warnings.push('Too many labels (>10)')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Generates a unique draft ID
 */
export function generateDraftId(): string {
  return `draft_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Creates a new issue draft with defaults
 */
export function createIssueDraft(overrides: Partial<IssueDraft> = {}): IssueDraft {
  const now = new Date().toISOString()
  const defaults: IssueDraft = {
    id: generateDraftId(),
    title: '',
    body: '',
    type: 'improvement',
    priority: 'medium',
    labels: getDefaultLabels('improvement', 'medium'),
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    confidence: 0.5,
  }

  return { ...defaults, ...overrides }
}

/**
 * Gets the issue drafts storage key
 */
export function getIssueDraftStorageKey(prefix?: string): string {
  return `${prefix || 'god_mode'}_issue_drafts`
}

/**
 * Maximum number of drafts to store
 */
export const MAX_DRAFTS_COUNT = 50

/**
 * Draft auto-save interval in milliseconds
 */
export const DRAFT_AUTO_SAVE_INTERVAL = 30000 // 30 seconds
