/**
 * Tests for social service (TASK 47)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  socialService,
  commentsService,
  subscriptionsService,
  notificationsService,
  favoritesService,
} from './social'
import type { CubeAuthor } from '../types/community'

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

describe('SocialService', () => {
  beforeEach(() => {
    mockLocalStorage.clear()
    socialService._resetMockData()
    socialService.setCurrentUser('test-user-id')
  })

  describe('commentsService', () => {
    const mockAuthor: CubeAuthor = {
      id: 'author-1',
      displayName: 'Test Author',
    }

    describe('getComments', () => {
      it('should return empty array for cube with no comments', async () => {
        const result = await commentsService.getComments('cube-1')

        expect(result.comments).toEqual([])
        expect(result.totalCount).toBe(0)
        expect(result.hasMore).toBe(false)
      })

      it('should return comments for a cube', async () => {
        // First create a comment
        await commentsService.createComment(
          { cubeId: 'cube-1', content: 'Great cube!' },
          mockAuthor
        )

        const result = await commentsService.getComments('cube-1')

        expect(result.comments.length).toBe(1)
        expect(result.comments[0].content).toBe('Great cube!')
        expect(result.totalCount).toBe(1)
      })

      it('should only return top-level comments when parentId is null', async () => {
        // Create top-level comment
        const topLevelResult = await commentsService.createComment(
          { cubeId: 'cube-1', content: 'Top level' },
          mockAuthor
        )

        // Create reply
        await commentsService.createComment(
          { cubeId: 'cube-1', content: 'Reply', parentId: topLevelResult.comment!.id },
          mockAuthor
        )

        const result = await commentsService.getComments('cube-1', { parentId: null })

        expect(result.comments.length).toBe(1)
        expect(result.comments[0].content).toBe('Top level')
      })

      it('should return replies when parentId is specified', async () => {
        // Create top-level comment
        const topLevelResult = await commentsService.createComment(
          { cubeId: 'cube-1', content: 'Top level' },
          mockAuthor
        )

        // Create reply
        await commentsService.createComment(
          { cubeId: 'cube-1', content: 'Reply', parentId: topLevelResult.comment!.id },
          mockAuthor
        )

        const result = await commentsService.getComments('cube-1', {
          parentId: topLevelResult.comment!.id,
        })

        expect(result.comments.length).toBe(1)
        expect(result.comments[0].content).toBe('Reply')
      })
    })

    describe('createComment', () => {
      it('should create a new comment', async () => {
        const result = await commentsService.createComment(
          { cubeId: 'cube-1', content: 'Nice work!' },
          mockAuthor
        )

        expect(result.success).toBe(true)
        expect(result.comment).toBeDefined()
        expect(result.comment!.content).toBe('Nice work!')
        expect(result.comment!.author.displayName).toBe('Test Author')
        expect(result.comment!.likes).toBe(0)
        expect(result.comment!.isEdited).toBe(false)
      })

      it('should reject empty content', async () => {
        const result = await commentsService.createComment(
          { cubeId: 'cube-1', content: '' },
          mockAuthor
        )

        expect(result.success).toBe(false)
        expect(result.error).toContain('empty')
      })

      it('should create a reply and update parent reply count', async () => {
        // Create parent comment
        const parentResult = await commentsService.createComment(
          { cubeId: 'cube-1', content: 'Parent' },
          mockAuthor
        )

        expect(parentResult.comment!.replyCount).toBe(0)

        // Create reply
        const replyResult = await commentsService.createComment(
          { cubeId: 'cube-1', content: 'Reply', parentId: parentResult.comment!.id },
          mockAuthor
        )

        expect(replyResult.success).toBe(true)
        expect(replyResult.comment!.parentId).toBe(parentResult.comment!.id)

        // Check parent reply count was updated
        const comments = await commentsService.getComments('cube-1', { parentId: null })
        expect(comments.comments[0].replyCount).toBe(1)
      })
    })

    describe('updateComment', () => {
      it('should update own comment', async () => {
        const createResult = await commentsService.createComment(
          { cubeId: 'cube-1', content: 'Original' },
          mockAuthor
        )

        const updateResult = await commentsService.updateComment(
          { commentId: createResult.comment!.id, content: 'Updated' },
          mockAuthor.id
        )

        expect(updateResult.success).toBe(true)
        expect(updateResult.comment!.content).toBe('Updated')
        expect(updateResult.comment!.isEdited).toBe(true)
        expect(updateResult.comment!.editedAt).toBeDefined()
      })

      it('should reject update by non-owner', async () => {
        const createResult = await commentsService.createComment(
          { cubeId: 'cube-1', content: 'Original' },
          mockAuthor
        )

        const updateResult = await commentsService.updateComment(
          { commentId: createResult.comment!.id, content: 'Updated' },
          'different-user'
        )

        expect(updateResult.success).toBe(false)
        expect(updateResult.error).toContain('Not authorized')
      })

      it('should reject update with empty content', async () => {
        const createResult = await commentsService.createComment(
          { cubeId: 'cube-1', content: 'Original' },
          mockAuthor
        )

        const updateResult = await commentsService.updateComment(
          { commentId: createResult.comment!.id, content: '' },
          mockAuthor.id
        )

        expect(updateResult.success).toBe(false)
        expect(updateResult.error).toContain('empty')
      })
    })

    describe('deleteComment', () => {
      it('should delete own comment', async () => {
        const createResult = await commentsService.createComment(
          { cubeId: 'cube-1', content: 'To delete' },
          mockAuthor
        )

        const deleteResult = await commentsService.deleteComment(
          createResult.comment!.id,
          mockAuthor.id
        )

        expect(deleteResult.success).toBe(true)

        // Verify comment is gone
        const comments = await commentsService.getComments('cube-1')
        expect(comments.comments.length).toBe(0)
      })

      it('should reject deletion by non-owner', async () => {
        const createResult = await commentsService.createComment(
          { cubeId: 'cube-1', content: 'To delete' },
          mockAuthor
        )

        const deleteResult = await commentsService.deleteComment(
          createResult.comment!.id,
          'different-user'
        )

        expect(deleteResult.success).toBe(false)
        expect(deleteResult.error).toContain('Not authorized')
      })
    })

    describe('toggleCommentLike', () => {
      it('should like an unliked comment', async () => {
        const createResult = await commentsService.createComment(
          { cubeId: 'cube-1', content: 'Like me!' },
          mockAuthor
        )

        const likeResult = await commentsService.toggleCommentLike(createResult.comment!.id)

        expect(likeResult.success).toBe(true)
        expect(likeResult.comment!.isLiked).toBe(true)
        expect(likeResult.comment!.likes).toBe(1)
      })

      it('should unlike a liked comment', async () => {
        const createResult = await commentsService.createComment(
          { cubeId: 'cube-1', content: 'Like me!' },
          mockAuthor
        )

        // Like first
        await commentsService.toggleCommentLike(createResult.comment!.id)

        // Then unlike
        const unlikeResult = await commentsService.toggleCommentLike(createResult.comment!.id)

        expect(unlikeResult.success).toBe(true)
        expect(unlikeResult.comment!.isLiked).toBe(false)
        expect(unlikeResult.comment!.likes).toBe(0)
      })

      it('should fail for non-existent comment', async () => {
        const result = await commentsService.toggleCommentLike('non-existent')

        expect(result.success).toBe(false)
        expect(result.error).toContain('not found')
      })
    })

    describe('getCommentCount', () => {
      it('should return 0 for cube with no comments', async () => {
        const count = await commentsService.getCommentCount('cube-1')
        expect(count).toBe(0)
      })

      it('should return correct count', async () => {
        await commentsService.createComment({ cubeId: 'cube-1', content: 'Comment 1' }, mockAuthor)
        await commentsService.createComment({ cubeId: 'cube-1', content: 'Comment 2' }, mockAuthor)

        const count = await commentsService.getCommentCount('cube-1')
        expect(count).toBe(2)
      })
    })
  })

  describe('subscriptionsService', () => {
    describe('subscribe', () => {
      it('should subscribe to an author', async () => {
        const result = await subscriptionsService.subscribe('author-1')

        expect(result.success).toBe(true)
        expect(result.isSubscribed).toBe(true)
        expect(result.subscriberCount).toBeGreaterThanOrEqual(1)
      })

      it('should be idempotent (subscribing twice returns same state)', async () => {
        await subscriptionsService.subscribe('author-1')
        const result = await subscriptionsService.subscribe('author-1')

        expect(result.success).toBe(true)
        expect(result.isSubscribed).toBe(true)
      })
    })

    describe('unsubscribe', () => {
      it('should unsubscribe from an author', async () => {
        await subscriptionsService.subscribe('author-1')
        const result = await subscriptionsService.unsubscribe('author-1')

        expect(result.success).toBe(true)
        expect(result.isSubscribed).toBe(false)
      })

      it('should be idempotent (unsubscribing twice returns same state)', async () => {
        const result = await subscriptionsService.unsubscribe('author-1')

        expect(result.success).toBe(true)
        expect(result.isSubscribed).toBe(false)
      })
    })

    describe('toggleSubscription', () => {
      it('should toggle from unsubscribed to subscribed', async () => {
        const result = await subscriptionsService.toggleSubscription('author-1')

        expect(result.success).toBe(true)
        expect(result.isSubscribed).toBe(true)
      })

      it('should toggle from subscribed to unsubscribed', async () => {
        await subscriptionsService.subscribe('author-1')
        const result = await subscriptionsService.toggleSubscription('author-1')

        expect(result.success).toBe(true)
        expect(result.isSubscribed).toBe(false)
      })
    })

    describe('isSubscribed', () => {
      it('should return false when not subscribed', () => {
        expect(subscriptionsService.isSubscribed('author-1')).toBe(false)
      })

      it('should return true when subscribed', async () => {
        await subscriptionsService.subscribe('author-1')
        expect(subscriptionsService.isSubscribed('author-1')).toBe(true)
      })
    })

    describe('getSubscriptions', () => {
      it('should return empty array when no subscriptions', async () => {
        const subscriptions = await subscriptionsService.getSubscriptions()
        expect(subscriptions).toEqual([])
      })

      it('should return subscriptions', async () => {
        await subscriptionsService.subscribe('author-1')
        await subscriptionsService.subscribe('author-2')

        const subscriptions = await subscriptionsService.getSubscriptions()

        expect(subscriptions.length).toBe(2)
        expect(subscriptions.some((s) => s.author.id === 'author-1')).toBe(true)
        expect(subscriptions.some((s) => s.author.id === 'author-2')).toBe(true)
      })
    })

    describe('getAuthorProfile', () => {
      it('should return author profile', async () => {
        const profile = await subscriptionsService.getAuthorProfile('author-1')

        expect(profile.author.id).toBe('author-1')
        expect(profile.subscriberCount).toBeGreaterThanOrEqual(0)
        expect(profile.cubeCount).toBeGreaterThanOrEqual(0)
        expect(profile.memberSince).toBeDefined()
      })

      it('should include isSubscribed flag', async () => {
        await subscriptionsService.subscribe('author-1')
        const profile = await subscriptionsService.getAuthorProfile('author-1')

        expect(profile.isSubscribed).toBe(true)
      })
    })
  })

  describe('notificationsService', () => {
    describe('getNotifications', () => {
      it('should return empty array when no notifications', async () => {
        const result = await notificationsService.getNotifications()

        expect(result.notifications).toEqual([])
        expect(result.unreadCount).toBe(0)
      })

      it('should return notifications after creating test notification', async () => {
        notificationsService._createTestNotification('new_like')

        const result = await notificationsService.getNotifications()

        expect(result.notifications.length).toBe(1)
        expect(result.notifications[0].type).toBe('new_like')
        expect(result.unreadCount).toBe(1)
      })
    })

    describe('markAsRead', () => {
      it('should mark notification as read', async () => {
        const notification = notificationsService._createTestNotification('new_comment')

        const result = await notificationsService.markAsRead(notification.id)

        expect(result.success).toBe(true)

        const notifications = await notificationsService.getNotifications()
        expect(notifications.notifications[0].isRead).toBe(true)
        expect(notifications.unreadCount).toBe(0)
      })

      it('should fail for non-existent notification', async () => {
        const result = await notificationsService.markAsRead('non-existent')

        expect(result.success).toBe(false)
        expect(result.error).toContain('not found')
      })
    })

    describe('markAllAsRead', () => {
      it('should mark all notifications as read', async () => {
        notificationsService._createTestNotification('new_like')
        notificationsService._createTestNotification('new_follower')
        notificationsService._createTestNotification('new_comment')

        await notificationsService.markAllAsRead()

        const result = await notificationsService.getNotifications()
        expect(result.unreadCount).toBe(0)
        result.notifications.forEach((n) => {
          expect(n.isRead).toBe(true)
        })
      })
    })

    describe('deleteNotification', () => {
      it('should delete a notification', async () => {
        const notification = notificationsService._createTestNotification('new_like')

        const result = await notificationsService.deleteNotification(notification.id)

        expect(result.success).toBe(true)

        const notifications = await notificationsService.getNotifications()
        expect(notifications.notifications.length).toBe(0)
      })

      it('should fail for non-existent notification', async () => {
        const result = await notificationsService.deleteNotification('non-existent')

        expect(result.success).toBe(false)
        expect(result.error).toContain('not found')
      })
    })

    describe('getUnreadCount', () => {
      it('should return 0 when no notifications', async () => {
        const count = await notificationsService.getUnreadCount()
        expect(count).toBe(0)
      })

      it('should return correct count', async () => {
        notificationsService._createTestNotification('new_like')
        notificationsService._createTestNotification('new_follower')

        const count = await notificationsService.getUnreadCount()
        expect(count).toBe(2)
      })
    })

    describe('preferences', () => {
      it('should get default preferences', () => {
        const prefs = notificationsService.getPreferences()

        expect(prefs.emailEnabled).toBe(false)
        expect(prefs.pushEnabled).toBe(true)
        expect(prefs.enabledTypes.length).toBeGreaterThan(0)
      })

      it('should update preferences', async () => {
        await notificationsService.updatePreferences({ emailEnabled: true })

        const prefs = notificationsService.getPreferences()
        expect(prefs.emailEnabled).toBe(true)
      })
    })
  })

  describe('favoritesService', () => {
    describe('addFavorite', () => {
      it('should add a cube to favorites', async () => {
        const result = await favoritesService.addFavorite('cube-1')

        expect(result.success).toBe(true)
        expect(result.isFavorited).toBe(true)
      })

      it('should be idempotent (adding twice returns same state)', async () => {
        await favoritesService.addFavorite('cube-1')
        const result = await favoritesService.addFavorite('cube-1')

        expect(result.success).toBe(true)
        expect(result.isFavorited).toBe(true)
      })

      it('should support collections', async () => {
        await favoritesService.addFavorite('cube-1', 'My Collection')

        const favorites = await favoritesService.getFavorites()
        expect(favorites[0].collection).toBe('My Collection')
      })

      it('should support notes', async () => {
        await favoritesService.addFavorite('cube-1', undefined, 'Great design!')

        const favorites = await favoritesService.getFavorites()
        expect(favorites[0].note).toBe('Great design!')
      })
    })

    describe('removeFavorite', () => {
      it('should remove a cube from favorites', async () => {
        await favoritesService.addFavorite('cube-1')
        const result = await favoritesService.removeFavorite('cube-1')

        expect(result.success).toBe(true)
        expect(result.isFavorited).toBe(false)
      })

      it('should be idempotent (removing twice returns same state)', async () => {
        const result = await favoritesService.removeFavorite('cube-1')

        expect(result.success).toBe(true)
        expect(result.isFavorited).toBe(false)
      })
    })

    describe('toggleFavorite', () => {
      it('should toggle from unfavorited to favorited', async () => {
        const result = await favoritesService.toggleFavorite('cube-1')

        expect(result.success).toBe(true)
        expect(result.isFavorited).toBe(true)
      })

      it('should toggle from favorited to unfavorited', async () => {
        await favoritesService.addFavorite('cube-1')
        const result = await favoritesService.toggleFavorite('cube-1')

        expect(result.success).toBe(true)
        expect(result.isFavorited).toBe(false)
      })
    })

    describe('isFavorited', () => {
      it('should return false when not favorited', () => {
        expect(favoritesService.isFavorited('cube-1')).toBe(false)
      })

      it('should return true when favorited', async () => {
        await favoritesService.addFavorite('cube-1')
        expect(favoritesService.isFavorited('cube-1')).toBe(true)
      })
    })

    describe('getFavorites', () => {
      it('should return empty array when no favorites', async () => {
        const favorites = await favoritesService.getFavorites()
        expect(favorites).toEqual([])
      })

      it('should return all favorites', async () => {
        await favoritesService.addFavorite('cube-1')
        await favoritesService.addFavorite('cube-2')

        const favorites = await favoritesService.getFavorites()

        expect(favorites.length).toBe(2)
        expect(favorites.some((f) => f.cubeId === 'cube-1')).toBe(true)
        expect(favorites.some((f) => f.cubeId === 'cube-2')).toBe(true)
      })

      it('should filter by collection', async () => {
        await favoritesService.addFavorite('cube-1', 'Collection A')
        await favoritesService.addFavorite('cube-2', 'Collection B')
        await favoritesService.addFavorite('cube-3', 'Collection A')

        const favorites = await favoritesService.getFavorites('Collection A')

        expect(favorites.length).toBe(2)
        favorites.forEach((f) => {
          expect(f.collection).toBe('Collection A')
        })
      })
    })

    describe('getCollections', () => {
      it('should return empty array when no favorites', async () => {
        const collections = await favoritesService.getCollections()
        expect(collections).toEqual([])
      })

      it('should return collections with counts', async () => {
        await favoritesService.addFavorite('cube-1', 'Nature')
        await favoritesService.addFavorite('cube-2', 'Nature')
        await favoritesService.addFavorite('cube-3', 'Fantasy')

        const collections = await favoritesService.getCollections()

        expect(collections.length).toBe(2)

        const natureCol = collections.find((c) => c.name === 'Nature')
        expect(natureCol?.count).toBe(2)

        const fantasyCol = collections.find((c) => c.name === 'Fantasy')
        expect(fantasyCol?.count).toBe(1)
      })
    })

    describe('updateFavorite', () => {
      it('should update collection', async () => {
        await favoritesService.addFavorite('cube-1', 'Old Collection')

        const result = await favoritesService.updateFavorite('cube-1', {
          collection: 'New Collection',
        })

        expect(result.success).toBe(true)

        const favorites = await favoritesService.getFavorites()
        expect(favorites[0].collection).toBe('New Collection')
      })

      it('should update note', async () => {
        await favoritesService.addFavorite('cube-1')

        const result = await favoritesService.updateFavorite('cube-1', {
          note: 'Updated note',
        })

        expect(result.success).toBe(true)

        const favorites = await favoritesService.getFavorites()
        expect(favorites[0].note).toBe('Updated note')
      })

      it('should fail for non-existent favorite', async () => {
        const result = await favoritesService.updateFavorite('non-existent', {
          note: 'Note',
        })

        expect(result.success).toBe(false)
        expect(result.error).toContain('not found')
      })
    })
  })
})
