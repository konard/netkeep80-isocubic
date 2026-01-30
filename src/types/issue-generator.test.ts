/**
 * Issue Generator Types Tests
 *
 * Test suite for issue generator type definitions and utilities.
 * Tests validation, creation, and utility functions.
 *
 * TASK 56: Issue Draft Generator (Phase 9 - GOD MODE)
 */

import { describe, it, expect } from 'vitest'
import type { IssueType, IssuePriority } from '../types/issue-generator'
import {
  validateIssueDraft,
  createIssueDraft,
  getDefaultLabels,
  generateDraftId,
  BUILTIN_ISSUE_TEMPLATES,
  LABEL_COLORS,
  PRIORITY_LABELS,
  TYPE_LABELS,
  DEFAULT_ISSUE_DRAFT_SETTINGS,
} from '../types/issue-generator'

describe('Issue Generator Types', () => {
  describe('createIssueDraft', () => {
    it('should create draft with default values', () => {
      const draft = createIssueDraft()

      expect(draft.id).toBeDefined()
      expect(draft.id).toMatch(/^draft_\d+_[a-z0-9]+$/)
      expect(draft.title).toBe('')
      expect(draft.body).toBe('')
      expect(draft.type).toBe('improvement')
      expect(draft.priority).toBe('medium')
      expect(draft.labels).toContain('type: improvement')
      expect(draft.labels).toContain('priority: medium')
      expect(draft.status).toBe('draft')
      expect(draft.createdAt).toBeDefined()
      expect(draft.updatedAt).toBeDefined()
      expect(draft.confidence).toBe(0.5)
    })

    it('should create draft with overrides', () => {
      const overrides = {
        title: 'Test Issue',
        type: 'bug' as IssueType,
        priority: 'high' as IssuePriority,
        labels: getDefaultLabels('bug', 'high'),
      }

      const draft = createIssueDraft(overrides)

      expect(draft.title).toBe('Test Issue')
      expect(draft.type).toBe('bug')
      expect(draft.priority).toBe('high')
      expect(draft.labels).toContain('type: bug')
      expect(draft.labels).toContain('priority: high')
    })
  })

  describe('generateDraftId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateDraftId()
      const id2 = generateDraftId()

      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^draft_\d+_[a-z0-9]+$/)
      expect(id2).toMatch(/^draft_\d+_[a-z0-9]+$/)
    })
  })

  describe('getDefaultLabels', () => {
    it('should return correct labels for bug type with high priority', () => {
      const labels = getDefaultLabels('bug', 'high')

      expect(labels).toContain('type: bug')
      expect(labels).toContain('priority: high')
      expect(labels).toContain('needs-triage')
    })

    it('should return correct labels for feature type with medium priority', () => {
      const labels = getDefaultLabels('feature', 'medium')

      expect(labels).toContain('type: feature')
      expect(labels).toContain('priority: medium')
      expect(labels).toContain('enhancement')
      expect(labels).toContain('feature-request')
    })

    it('should return correct labels for improvement type with low priority', () => {
      const labels = getDefaultLabels('improvement', 'low')

      expect(labels).toContain('type: improvement')
      expect(labels).toContain('priority: low')
      expect(labels).toContain('enhancement')
    })

    it('should return correct labels for documentation type', () => {
      const labels = getDefaultLabels('documentation', 'medium')

      expect(labels).toContain('type: documentation')
      expect(labels).toContain('priority: medium')
    })
  })

  describe('validateIssueDraft', () => {
    it('should validate valid draft', () => {
      const draft = createIssueDraft({
        title: 'Valid Title',
        body: 'Valid description',
        type: 'bug',
        priority: 'medium',
        labels: ['bug', 'needs-triage'],
      })

      const validation = validateIssueDraft(draft)

      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
      expect(validation.warnings).toHaveLength(0)
    })

    it('should reject draft without title', () => {
      const draft = createIssueDraft({
        title: '',
        body: 'Valid description',
        type: 'bug',
        priority: 'medium',
      })

      const validation = validateIssueDraft(draft)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('Title is required')
    })

    it('should reject draft without body', () => {
      const draft = createIssueDraft({
        title: 'Valid Title',
        body: '',
        type: 'bug',
        priority: 'medium',
      })

      const validation = validateIssueDraft(draft)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('Description is required')
    })

    it('should reject draft without type', () => {
      const draft = createIssueDraft({
        title: 'Valid Title',
        body: 'Valid description',
        type: undefined as unknown as 'bug',
        priority: 'medium',
      })

      const validation = validateIssueDraft(draft)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('Issue type is required')
    })

    it('should reject draft without priority', () => {
      const draft = createIssueDraft({
        title: 'Valid Title',
        body: 'Valid description',
        type: 'bug',
        priority: undefined as unknown as 'medium',
      })

      const validation = validateIssueDraft(draft)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('Priority is required')
    })

    it('should warn about long title', () => {
      const draft = createIssueDraft({
        title:
          'This is a very long title that exceeds the recommended maximum length of 72 characters',
        body: 'Valid description',
        type: 'bug',
        priority: 'medium',
      })

      const validation = validateIssueDraft(draft)

      expect(validation.warnings).toContain('Title is too long (>72 characters)')
    })

    it('should warn about too many labels', () => {
      const draft = createIssueDraft({
        title: 'Valid Title',
        body: 'Valid description',
        type: 'bug',
        priority: 'medium',
        labels: [
          'label1',
          'label2',
          'label3',
          'label4',
          'label5',
          'label6',
          'label7',
          'label8',
          'label9',
          'label10',
          'label11',
        ],
      })

      const validation = validateIssueDraft(draft)

      expect(validation.warnings).toContain('Too many labels (>10)')
    })
  })

  describe('BUILTIN_ISSUE_TEMPLATES', () => {
    it('should contain required templates', () => {
      expect(BUILTIN_ISSUE_TEMPLATES.length).toBeGreaterThan(0)

      const bugTemplate = BUILTIN_ISSUE_TEMPLATES.find((t) => t.id === 'bug_report')
      expect(bugTemplate).toBeDefined()
      expect(bugTemplate?.type).toBe('bug')
      expect(bugTemplate?.icon).toBe('🐛')

      const featureTemplate = BUILTIN_ISSUE_TEMPLATES.find((t) => t.id === 'feature_request')
      expect(featureTemplate).toBeDefined()
      expect(featureTemplate?.type).toBe('feature')
      expect(featureTemplate?.icon).toBe('🚀')

      const improvementTemplate = BUILTIN_ISSUE_TEMPLATES.find((t) => t.id === 'improvement')
      expect(improvementTemplate).toBeDefined()
      expect(improvementTemplate?.type).toBe('improvement')
      expect(improvementTemplate?.icon).toBe('✨')
    })

    it('should have valid template structure', () => {
      BUILTIN_ISSUE_TEMPLATES.forEach((template) => {
        expect(template.id).toBeDefined()
        expect(template.name).toBeDefined()
        expect(template.description).toBeDefined()
        expect(template.type).toBeDefined()
        expect(template.titleTemplate).toBeDefined()
        expect(template.bodyTemplate).toBeDefined()
        expect(template.defaultLabels).toBeDefined()
        expect(template.defaultPriority).toBeDefined()
        expect(template.icon).toBeDefined()
        expect(template.categories).toBeDefined()
        expect(template.builtin).toBe(true)
        expect(template.placeholders).toBeDefined()
      })
    })

    it('should have valid placeholder structure', () => {
      BUILTIN_ISSUE_TEMPLATES.forEach((template) => {
        if (template.placeholders) {
          template.placeholders.forEach((placeholder) => {
            expect(placeholder.id).toBeDefined()
            expect(placeholder.name).toBeDefined()
            expect(placeholder.description).toBeDefined()
            expect(placeholder.type).toBeDefined()
            expect(typeof placeholder.required).toBe('boolean')

            if (placeholder.type === 'select' || placeholder.type === 'multiselect') {
              expect(placeholder.options).toBeDefined()
              expect(Array.isArray(placeholder.options)).toBe(true)
            }
          })
        }
      })
    })
  })

  describe('LABEL_COLORS', () => {
    it('should have colors for all common labels', () => {
      expect(LABEL_COLORS.bug).toBeDefined()
      expect(LABEL_COLORS.enhancement).toBeDefined()
      expect(LABEL_COLORS['feature-request']).toBeDefined()
      expect(LABEL_COLORS.improvement).toBeDefined()
      expect(LABEL_COLORS.documentation).toBeDefined()
      expect(LABEL_COLORS.question).toBeDefined()

      // Priority colors
      expect(LABEL_COLORS.critical).toBeDefined()
      expect(LABEL_COLORS.high).toBeDefined()
      expect(LABEL_COLORS.medium).toBeDefined()
      expect(LABEL_COLORS.low).toBeDefined()
    })

    it('should have valid hex color format', () => {
      Object.values(LABEL_COLORS).forEach((color) => {
        expect(color).toMatch(/^[0-9a-f]{6}$/i)
      })
    })
  })

  describe('PRIORITY_LABELS', () => {
    it('should map all priorities to labels', () => {
      expect(PRIORITY_LABELS.low).toBe('priority: low')
      expect(PRIORITY_LABELS.medium).toBe('priority: medium')
      expect(PRIORITY_LABELS.high).toBe('priority: high')
      expect(PRIORITY_LABELS.critical).toBe('priority: critical')
    })
  })

  describe('TYPE_LABELS', () => {
    it('should map all types to labels', () => {
      expect(TYPE_LABELS.bug).toBe('type: bug')
      expect(TYPE_LABELS.feature).toBe('type: feature')
      expect(TYPE_LABELS.improvement).toBe('type: improvement')
      expect(TYPE_LABELS.documentation).toBe('type: documentation')
      expect(TYPE_LABELS.question).toBe('type: question')
      expect(TYPE_LABELS.maintenance).toBe('type: maintenance')
    })
  })

  describe('DEFAULT_ISSUE_DRAFT_SETTINGS', () => {
    it('should have all required settings', () => {
      expect(DEFAULT_ISSUE_DRAFT_SETTINGS.language).toBeDefined()
      expect(DEFAULT_ISSUE_DRAFT_SETTINGS.includeConversationContext).toBeDefined()
      expect(DEFAULT_ISSUE_DRAFT_SETTINGS.autoSuggestComponents).toBeDefined()
      expect(DEFAULT_ISSUE_DRAFT_SETTINGS.autoGenerateScreenshots).toBeDefined()
      expect(DEFAULT_ISSUE_DRAFT_SETTINGS.defaultType).toBeDefined()
      expect(DEFAULT_ISSUE_DRAFT_SETTINGS.defaultPriority).toBeDefined()
      expect(DEFAULT_ISSUE_DRAFT_SETTINGS.customLabels).toBeDefined()
      expect(DEFAULT_ISSUE_DRAFT_SETTINGS.validateBeforeReady).toBeDefined()
      expect(DEFAULT_ISSUE_DRAFT_SETTINGS.showAdvancedOptions).toBeDefined()
    })

    it('should have sensible default values', () => {
      expect(DEFAULT_ISSUE_DRAFT_SETTINGS.language).toBe('ru')
      expect(DEFAULT_ISSUE_DRAFT_SETTINGS.includeConversationContext).toBe(true)
      expect(DEFAULT_ISSUE_DRAFT_SETTINGS.autoSuggestComponents).toBe(true)
      expect(DEFAULT_ISSUE_DRAFT_SETTINGS.autoGenerateScreenshots).toBe(false)
      expect(DEFAULT_ISSUE_DRAFT_SETTINGS.defaultType).toBe('improvement')
      expect(DEFAULT_ISSUE_DRAFT_SETTINGS.defaultPriority).toBe('medium')
      expect(DEFAULT_ISSUE_DRAFT_SETTINGS.customLabels).toEqual([])
      expect(DEFAULT_ISSUE_DRAFT_SETTINGS.validateBeforeReady).toBe(true)
      expect(DEFAULT_ISSUE_DRAFT_SETTINGS.showAdvancedOptions).toBe(false)
    })
  })

  describe('Type Safety', () => {
    it('should allow valid issue types', () => {
      const validTypes: IssueType[] = [
        'bug',
        'feature',
        'improvement',
        'documentation',
        'question',
        'maintenance',
      ]

      validTypes.forEach((type) => {
        expect(type).toBeDefined()
        expect(typeof type).toBe('string')
      })
    })

    it('should allow valid priorities', () => {
      const validPriorities: IssuePriority[] = ['low', 'medium', 'high', 'critical']

      validPriorities.forEach((priority) => {
        expect(priority).toBeDefined()
        expect(typeof priority).toBe('string')
      })
    })
  })

  describe('Template Integration', () => {
    it('should have placeholders in template text', () => {
      const bugTemplate = BUILTIN_ISSUE_TEMPLATES.find((t) => t.id === 'bug_report')
      expect(bugTemplate).toBeDefined()

      if (bugTemplate) {
        expect(bugTemplate.titleTemplate).toContain('{summary}')
        expect(bugTemplate.bodyTemplate).toContain('{description}')
        expect(bugTemplate.bodyTemplate).toContain('{expectedBehavior}')
        expect(bugTemplate.bodyTemplate).toContain('{actualBehavior}')
      }
    })

    it('should have matching placeholders and definitions', () => {
      BUILTIN_ISSUE_TEMPLATES.forEach((template) => {
        if (template.placeholders) {
          template.placeholders.forEach((placeholder) => {
            const placeholderPattern = `{${placeholder.id}}`
            expect(
              template.titleTemplate.includes(placeholderPattern) ||
                template.bodyTemplate.includes(placeholderPattern)
            ).toBe(true)
          })
        }
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty override object', () => {
      const draft = createIssueDraft({})

      expect(draft.type).toBe('improvement')
      expect(draft.priority).toBe('medium')
      expect(draft.labels.length).toBeGreaterThan(0)
    })

    it('should handle partial overrides', () => {
      const draft = createIssueDraft({
        title: 'Custom Title',
      })

      expect(draft.title).toBe('Custom Title')
      expect(draft.type).toBe('improvement') // Should keep default
      expect(draft.priority).toBe('medium') // Should keep default
    })

    it('should handle validation with minimal valid draft', () => {
      const minimalDraft = createIssueDraft({
        title: 'Title',
        body: 'Description',
        type: 'bug',
        priority: 'low',
      })

      const validation = validateIssueDraft(minimalDraft)
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should handle validation with maximal valid draft', () => {
      const maximalDraft = createIssueDraft({
        title: 'Title',
        body: 'Description',
        type: 'bug',
        priority: 'low',
        labels: ['bug', 'low', 'test', 'validation'],
        relatedComponents: ['Component1', 'Component2'],
        screenshots: [],
        estimatedEffort: 'medium',
        assignees: ['user1', 'user2'],
      })

      const validation = validateIssueDraft(maximalDraft)
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })
  })
})
