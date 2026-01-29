/**
 * Tests for social types and validation (TASK 47)
 */

import { describe, it, expect } from 'vitest'
import {
  validateCommentContent,
  isNotificationTypeEnabled,
  formatRelativeTime,
  generateSocialId,
  MAX_COMMENT_LENGTH,
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_TYPE_INFO,
  SOCIAL_STORAGE_KEYS,
} from './social'
import type { NotificationPreferences, NotificationType } from './social'

describe('Social Types', () => {
  describe('validateCommentContent', () => {
    it('should reject empty content', () => {
      const result = validateCommentContent('')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Comment cannot be empty')
    })

    it('should reject whitespace-only content', () => {
      const result = validateCommentContent('   ')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Comment cannot be empty')
    })

    it('should accept valid content', () => {
      const result = validateCommentContent('This is a great cube!')
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject content exceeding max length', () => {
      const longContent = 'a'.repeat(MAX_COMMENT_LENGTH + 1)
      const result = validateCommentContent(longContent)
      expect(result.valid).toBe(false)
      expect(result.error).toContain(`cannot exceed ${MAX_COMMENT_LENGTH}`)
    })

    it('should accept content at exactly max length', () => {
      const maxContent = 'a'.repeat(MAX_COMMENT_LENGTH)
      const result = validateCommentContent(maxContent)
      expect(result.valid).toBe(true)
    })
  })

  describe('isNotificationTypeEnabled', () => {
    it('should return true for enabled notification types', () => {
      const prefs: NotificationPreferences = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        enabledTypes: ['new_like', 'new_comment'],
      }
      expect(isNotificationTypeEnabled('new_like', prefs)).toBe(true)
      expect(isNotificationTypeEnabled('new_comment', prefs)).toBe(true)
    })

    it('should return false for disabled notification types', () => {
      const prefs: NotificationPreferences = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        enabledTypes: ['new_like'],
      }
      expect(isNotificationTypeEnabled('new_follower', prefs)).toBe(false)
      expect(isNotificationTypeEnabled('system', prefs)).toBe(false)
    })

    it('should work with default preferences', () => {
      expect(isNotificationTypeEnabled('new_like', DEFAULT_NOTIFICATION_PREFERENCES)).toBe(true)
      expect(isNotificationTypeEnabled('new_follower', DEFAULT_NOTIFICATION_PREFERENCES)).toBe(true)
      expect(isNotificationTypeEnabled('system', DEFAULT_NOTIFICATION_PREFERENCES)).toBe(true)
    })
  })

  describe('formatRelativeTime', () => {
    it('should format just now for very recent times', () => {
      const now = new Date().toISOString()
      expect(formatRelativeTime(now)).toBe('just now')
    })

    it('should format minutes ago', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      expect(formatRelativeTime(fiveMinutesAgo)).toBe('5m ago')
    })

    it('should format hours ago', () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
      expect(formatRelativeTime(threeHoursAgo)).toBe('3h ago')
    })

    it('should format days ago', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      expect(formatRelativeTime(twoDaysAgo)).toBe('2d ago')
    })

    it('should format as date for older times', () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      const result = formatRelativeTime(tenDaysAgo)
      // Should be a date string, not relative time
      expect(result).not.toContain('ago')
      expect(result).toMatch(/\d/)
    })
  })

  describe('generateSocialId', () => {
    it('should generate unique IDs with prefix', () => {
      const id1 = generateSocialId('comment')
      const id2 = generateSocialId('comment')

      expect(id1).toContain('comment-')
      expect(id2).toContain('comment-')
      expect(id1).not.toBe(id2)
    })

    it('should generate IDs with different prefixes', () => {
      const commentId = generateSocialId('comment')
      const notifId = generateSocialId('notif')
      const favId = generateSocialId('fav')

      expect(commentId).toContain('comment-')
      expect(notifId).toContain('notif-')
      expect(favId).toContain('fav-')
    })
  })

  describe('Constants', () => {
    it('should have valid MAX_COMMENT_LENGTH', () => {
      expect(MAX_COMMENT_LENGTH).toBe(1000)
      expect(MAX_COMMENT_LENGTH).toBeGreaterThan(0)
    })

    it('should have all notification types defined', () => {
      const expectedTypes: NotificationType[] = [
        'new_follower',
        'new_like',
        'new_comment',
        'comment_reply',
        'comment_like',
        'new_cube',
        'mention',
        'system',
      ]

      expectedTypes.forEach((type) => {
        expect(NOTIFICATION_TYPE_INFO[type]).toBeDefined()
        expect(NOTIFICATION_TYPE_INFO[type].label).toBeDefined()
        expect(NOTIFICATION_TYPE_INFO[type].icon).toBeDefined()
        expect(NOTIFICATION_TYPE_INFO[type].color).toBeDefined()
      })
    })

    it('should have valid default notification preferences', () => {
      expect(DEFAULT_NOTIFICATION_PREFERENCES.emailEnabled).toBe(false)
      expect(DEFAULT_NOTIFICATION_PREFERENCES.pushEnabled).toBe(true)
      expect(DEFAULT_NOTIFICATION_PREFERENCES.enabledTypes.length).toBeGreaterThan(0)
    })

    it('should have all storage keys defined', () => {
      expect(SOCIAL_STORAGE_KEYS.SUBSCRIPTIONS).toBeDefined()
      expect(SOCIAL_STORAGE_KEYS.FAVORITES).toBeDefined()
      expect(SOCIAL_STORAGE_KEYS.NOTIFICATION_PREFS).toBeDefined()
      expect(SOCIAL_STORAGE_KEYS.READ_NOTIFICATIONS).toBeDefined()
    })
  })
})
