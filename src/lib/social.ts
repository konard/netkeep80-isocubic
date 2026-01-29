/**
 * Social Features Service (TASK 47)
 * Provides API for comments, subscriptions, notifications, and favorites
 *
 * Current implementation: Mock service with in-memory data and localStorage persistence
 * Future: Replace with real API calls to backend (Supabase/Firebase)
 */

import type { CubeAuthor } from '../types/community'
import type {
  Comment,
  CreateCommentRequest,
  UpdateCommentRequest,
  CommentResult,
  CommentsResponse,
  Subscription,
  SubscriptionResult,
  AuthorProfile,
  Notification,
  NotificationType,
  NotificationsResponse,
  NotificationResult,
  NotificationPreferences,
  Favorite,
  FavoriteResult,
  FavoriteCollection,
} from '../types/social'
import {
  SOCIAL_STORAGE_KEYS,
  DEFAULT_NOTIFICATION_PREFERENCES,
  validateCommentContent,
  generateSocialId,
} from '../types/social'

// ============================================================================
// Mock Data Storage
// ============================================================================

/** Mock comments database */
let mockComments: Comment[] = []

/** Mock subscriptions database */
let mockSubscriptions: Map<string, Set<string>> = new Map() // userId -> Set<authorId>

/** Mock author stats */
let mockAuthorStats: Map<
  string,
  { subscriberCount: number; cubeCount: number; totalLikes: number }
> = new Map()

/** Mock notifications database */
let mockNotifications: Notification[] = []

/** Mock favorites database */
let mockFavorites: Map<string, Favorite[]> = new Map() // userId -> favorites

/** Current user ID (for mock purposes) */
let currentUserId = 'current-user'

/** Read notification IDs */
let readNotificationIds: Set<string> = new Set()

// ============================================================================
// Storage Helpers
// ============================================================================

/**
 * Loads subscriptions from localStorage
 */
function loadSubscriptions(): void {
  try {
    const stored = localStorage.getItem(SOCIAL_STORAGE_KEYS.SUBSCRIPTIONS)
    if (stored) {
      const data = JSON.parse(stored) as Record<string, string[]>
      mockSubscriptions = new Map(
        Object.entries(data).map(([userId, authorIds]) => [userId, new Set(authorIds)])
      )
    }
  } catch {
    mockSubscriptions = new Map()
  }
}

/**
 * Saves subscriptions to localStorage
 */
function saveSubscriptions(): void {
  try {
    const data: Record<string, string[]> = {}
    mockSubscriptions.forEach((authorIds, userId) => {
      data[userId] = Array.from(authorIds)
    })
    localStorage.setItem(SOCIAL_STORAGE_KEYS.SUBSCRIPTIONS, JSON.stringify(data))
  } catch {
    // Ignore storage errors
  }
}

/**
 * Loads favorites from localStorage
 */
function loadFavorites(): void {
  try {
    const stored = localStorage.getItem(SOCIAL_STORAGE_KEYS.FAVORITES)
    if (stored) {
      const data = JSON.parse(stored) as Record<string, Favorite[]>
      mockFavorites = new Map(Object.entries(data))
    }
  } catch {
    mockFavorites = new Map()
  }
}

/**
 * Saves favorites to localStorage
 */
function saveFavorites(): void {
  try {
    const data: Record<string, Favorite[]> = {}
    mockFavorites.forEach((favorites, userId) => {
      data[userId] = favorites
    })
    localStorage.setItem(SOCIAL_STORAGE_KEYS.FAVORITES, JSON.stringify(data))
  } catch {
    // Ignore storage errors
  }
}

/**
 * Loads read notification IDs from localStorage
 */
function loadReadNotifications(): void {
  try {
    const stored = localStorage.getItem(SOCIAL_STORAGE_KEYS.READ_NOTIFICATIONS)
    if (stored) {
      readNotificationIds = new Set(JSON.parse(stored))
    }
  } catch {
    readNotificationIds = new Set()
  }
}

/**
 * Saves read notification IDs to localStorage
 */
function saveReadNotifications(): void {
  try {
    localStorage.setItem(
      SOCIAL_STORAGE_KEYS.READ_NOTIFICATIONS,
      JSON.stringify(Array.from(readNotificationIds))
    )
  } catch {
    // Ignore storage errors
  }
}

/**
 * Loads notification preferences from localStorage
 */
function loadNotificationPreferences(): NotificationPreferences {
  try {
    const stored = localStorage.getItem(SOCIAL_STORAGE_KEYS.NOTIFICATION_PREFS)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Ignore storage errors
  }
  return { ...DEFAULT_NOTIFICATION_PREFERENCES }
}

/**
 * Saves notification preferences to localStorage
 */
function saveNotificationPreferences(prefs: NotificationPreferences): void {
  try {
    localStorage.setItem(SOCIAL_STORAGE_KEYS.NOTIFICATION_PREFS, JSON.stringify(prefs))
  } catch {
    // Ignore storage errors
  }
}

// Initialize from storage
loadSubscriptions()
loadFavorites()
loadReadNotifications()

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Simulates network delay
 */
async function simulateNetworkDelay(ms: number = 200): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Creates a mock notification
 */
function createNotification(
  type: NotificationType,
  title: string,
  message: string,
  actor?: CubeAuthor,
  relatedIds?: Notification['relatedIds']
): Notification {
  const notification: Notification = {
    id: generateSocialId('notif'),
    type,
    title,
    message,
    isRead: false,
    createdAt: new Date().toISOString(),
    relatedIds,
    actor,
  }
  mockNotifications.unshift(notification)
  return notification
}

// ============================================================================
// Comments Service
// ============================================================================

export const commentsService = {
  /**
   * Gets comments for a cube
   */
  async getComments(
    cubeId: string,
    options: { parentId?: string | null; limit?: number; cursor?: string } = {}
  ): Promise<CommentsResponse> {
    await simulateNetworkDelay()

    const { parentId = null, limit = 20 } = options

    const filtered = mockComments.filter(
      (c) => c.cubeId === cubeId && c.parentId === parentId && !c.isHidden
    )

    // Sort by creation time (newest first for replies, oldest first for top-level)
    filtered.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime()
      const timeB = new Date(b.createdAt).getTime()
      return parentId ? timeB - timeA : timeA - timeB
    })

    const totalCount = filtered.length
    const hasMore = totalCount > limit
    const comments = filtered.slice(0, limit)

    return {
      comments,
      totalCount,
      hasMore,
      nextCursor: hasMore ? comments[comments.length - 1]?.id : undefined,
    }
  },

  /**
   * Creates a new comment
   */
  async createComment(request: CreateCommentRequest, author: CubeAuthor): Promise<CommentResult> {
    await simulateNetworkDelay(300)

    // Validate content
    const validation = validateCommentContent(request.content)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    // Create comment
    const comment: Comment = {
      id: generateSocialId('comment'),
      cubeId: request.cubeId,
      author,
      content: request.content.trim(),
      parentId: request.parentId || null,
      likes: 0,
      isLiked: false,
      replyCount: 0,
      createdAt: new Date().toISOString(),
      isEdited: false,
      isHidden: false,
    }

    mockComments.push(comment)

    // Update reply count on parent
    if (request.parentId) {
      const parent = mockComments.find((c) => c.id === request.parentId)
      if (parent) {
        parent.replyCount += 1
      }
    }

    // Create notification for cube author (if different from commenter)
    createNotification(
      request.parentId ? 'comment_reply' : 'new_comment',
      request.parentId ? 'New Reply' : 'New Comment',
      `${author.displayName} ${request.parentId ? 'replied to your comment' : 'commented on your cube'}`,
      author,
      { cubeId: request.cubeId, commentId: comment.id }
    )

    return { success: true, comment }
  },

  /**
   * Updates an existing comment
   */
  async updateComment(request: UpdateCommentRequest, userId: string): Promise<CommentResult> {
    await simulateNetworkDelay(200)

    const comment = mockComments.find((c) => c.id === request.commentId)
    if (!comment) {
      return { success: false, error: 'Comment not found' }
    }

    if (comment.author.id !== userId) {
      return { success: false, error: 'Not authorized to edit this comment' }
    }

    // Validate content
    const validation = validateCommentContent(request.content)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    comment.content = request.content.trim()
    comment.isEdited = true
    comment.editedAt = new Date().toISOString()

    return { success: true, comment }
  },

  /**
   * Deletes a comment
   */
  async deleteComment(commentId: string, userId: string): Promise<CommentResult> {
    await simulateNetworkDelay(200)

    const commentIndex = mockComments.findIndex((c) => c.id === commentId)
    if (commentIndex === -1) {
      return { success: false, error: 'Comment not found' }
    }

    const comment = mockComments[commentIndex]
    if (comment.author.id !== userId) {
      return { success: false, error: 'Not authorized to delete this comment' }
    }

    // Update parent reply count
    if (comment.parentId) {
      const parent = mockComments.find((c) => c.id === comment.parentId)
      if (parent) {
        parent.replyCount = Math.max(0, parent.replyCount - 1)
      }
    }

    // Remove comment and its replies
    mockComments = mockComments.filter((c) => c.id !== commentId && c.parentId !== commentId)

    return { success: true }
  },

  /**
   * Toggles like on a comment
   */
  async toggleCommentLike(commentId: string): Promise<CommentResult> {
    await simulateNetworkDelay(100)

    const comment = mockComments.find((c) => c.id === commentId)
    if (!comment) {
      return { success: false, error: 'Comment not found' }
    }

    if (comment.isLiked) {
      comment.likes = Math.max(0, comment.likes - 1)
      comment.isLiked = false
    } else {
      comment.likes += 1
      comment.isLiked = true
      // Create notification
      createNotification('comment_like', 'Comment Liked', 'Someone liked your comment', undefined, {
        commentId,
      })
    }

    return { success: true, comment }
  },

  /**
   * Gets comment count for a cube
   */
  async getCommentCount(cubeId: string): Promise<number> {
    await simulateNetworkDelay(50)
    return mockComments.filter((c) => c.cubeId === cubeId && !c.isHidden).length
  },
}

// ============================================================================
// Subscriptions Service
// ============================================================================

export const subscriptionsService = {
  /**
   * Subscribes to an author
   */
  async subscribe(authorId: string): Promise<SubscriptionResult> {
    await simulateNetworkDelay(200)

    let userSubs = mockSubscriptions.get(currentUserId)
    if (!userSubs) {
      userSubs = new Set()
      mockSubscriptions.set(currentUserId, userSubs)
    }

    if (userSubs.has(authorId)) {
      return {
        success: true,
        isSubscribed: true,
        subscriberCount: this._getSubscriberCount(authorId),
      }
    }

    userSubs.add(authorId)
    saveSubscriptions()

    // Update author stats
    const stats = mockAuthorStats.get(authorId) || {
      subscriberCount: 0,
      cubeCount: 0,
      totalLikes: 0,
    }
    stats.subscriberCount += 1
    mockAuthorStats.set(authorId, stats)

    // Create notification for the author
    createNotification(
      'new_follower',
      'New Follower',
      'Someone started following you',
      { id: currentUserId, displayName: 'You' },
      { authorId }
    )

    return {
      success: true,
      isSubscribed: true,
      subscriberCount: stats.subscriberCount,
    }
  },

  /**
   * Unsubscribes from an author
   */
  async unsubscribe(authorId: string): Promise<SubscriptionResult> {
    await simulateNetworkDelay(200)

    const userSubs = mockSubscriptions.get(currentUserId)
    if (!userSubs || !userSubs.has(authorId)) {
      return {
        success: true,
        isSubscribed: false,
        subscriberCount: this._getSubscriberCount(authorId),
      }
    }

    userSubs.delete(authorId)
    saveSubscriptions()

    // Update author stats
    const stats = mockAuthorStats.get(authorId)
    if (stats) {
      stats.subscriberCount = Math.max(0, stats.subscriberCount - 1)
      mockAuthorStats.set(authorId, stats)
    }

    return {
      success: true,
      isSubscribed: false,
      subscriberCount: stats?.subscriberCount || 0,
    }
  },

  /**
   * Toggles subscription to an author
   */
  async toggleSubscription(authorId: string): Promise<SubscriptionResult> {
    const isSubscribed = this.isSubscribed(authorId)
    if (isSubscribed) {
      return this.unsubscribe(authorId)
    } else {
      return this.subscribe(authorId)
    }
  },

  /**
   * Checks if current user is subscribed to an author
   */
  isSubscribed(authorId: string): boolean {
    const userSubs = mockSubscriptions.get(currentUserId)
    return userSubs?.has(authorId) || false
  },

  /**
   * Gets list of subscribed authors
   */
  async getSubscriptions(): Promise<Subscription[]> {
    await simulateNetworkDelay(150)

    const userSubs = mockSubscriptions.get(currentUserId)
    if (!userSubs) return []

    return Array.from(userSubs).map((authorId) => ({
      id: `sub-${currentUserId}-${authorId}`,
      subscriberId: currentUserId,
      author: {
        id: authorId,
        displayName: `Author ${authorId.slice(-4)}`,
      },
      subscribedAt: new Date().toISOString(),
      notificationsEnabled: true,
    }))
  },

  /**
   * Gets author profile with subscription info
   */
  async getAuthorProfile(authorId: string): Promise<AuthorProfile> {
    await simulateNetworkDelay(200)

    const stats = mockAuthorStats.get(authorId) || {
      subscriberCount: Math.floor(Math.random() * 1000) + 10,
      cubeCount: Math.floor(Math.random() * 50) + 1,
      totalLikes: Math.floor(Math.random() * 5000) + 100,
    }
    mockAuthorStats.set(authorId, stats)

    return {
      author: {
        id: authorId,
        displayName: `Author ${authorId.slice(-4)}`,
      },
      subscriberCount: stats.subscriberCount,
      cubeCount: stats.cubeCount,
      totalLikes: stats.totalLikes,
      isSubscribed: this.isSubscribed(authorId),
      bio: 'A passionate cube creator.',
      memberSince: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
    }
  },

  /**
   * Gets subscriber count for an author
   */
  _getSubscriberCount(authorId: string): number {
    const stats = mockAuthorStats.get(authorId)
    return stats?.subscriberCount || 0
  },
}

// ============================================================================
// Notifications Service
// ============================================================================

export const notificationsService = {
  /**
   * Gets notifications for current user
   */
  async getNotifications(
    options: { limit?: number; cursor?: string } = {}
  ): Promise<NotificationsResponse> {
    await simulateNetworkDelay(150)

    const { limit = 20 } = options

    // Apply read status
    const notifications = mockNotifications.map((n) => ({
      ...n,
      isRead: readNotificationIds.has(n.id),
    }))

    const unreadCount = notifications.filter((n) => !n.isRead).length
    const hasMore = notifications.length > limit

    return {
      notifications: notifications.slice(0, limit),
      unreadCount,
      hasMore,
      nextCursor: hasMore ? notifications[limit - 1]?.id : undefined,
    }
  },

  /**
   * Marks a notification as read
   */
  async markAsRead(notificationId: string): Promise<NotificationResult> {
    await simulateNetworkDelay(100)

    const notification = mockNotifications.find((n) => n.id === notificationId)
    if (!notification) {
      return { success: false, error: 'Notification not found' }
    }

    readNotificationIds.add(notificationId)
    saveReadNotifications()

    return { success: true }
  },

  /**
   * Marks all notifications as read
   */
  async markAllAsRead(): Promise<NotificationResult> {
    await simulateNetworkDelay(150)

    mockNotifications.forEach((n) => {
      readNotificationIds.add(n.id)
    })
    saveReadNotifications()

    return { success: true }
  },

  /**
   * Deletes a notification
   */
  async deleteNotification(notificationId: string): Promise<NotificationResult> {
    await simulateNetworkDelay(100)

    const index = mockNotifications.findIndex((n) => n.id === notificationId)
    if (index === -1) {
      return { success: false, error: 'Notification not found' }
    }

    mockNotifications.splice(index, 1)
    readNotificationIds.delete(notificationId)
    saveReadNotifications()

    return { success: true }
  },

  /**
   * Gets unread count
   */
  async getUnreadCount(): Promise<number> {
    await simulateNetworkDelay(50)
    return mockNotifications.filter((n) => !readNotificationIds.has(n.id)).length
  },

  /**
   * Gets notification preferences
   */
  getPreferences(): NotificationPreferences {
    return loadNotificationPreferences()
  },

  /**
   * Updates notification preferences
   */
  async updatePreferences(prefs: Partial<NotificationPreferences>): Promise<NotificationResult> {
    await simulateNetworkDelay(100)

    const current = loadNotificationPreferences()
    const updated = { ...current, ...prefs }
    saveNotificationPreferences(updated)

    return { success: true }
  },

  /**
   * Creates a test notification (for development)
   */
  _createTestNotification(type: NotificationType): Notification {
    return createNotification(
      type,
      `Test ${type} Notification`,
      `This is a test notification of type ${type}`,
      { id: 'test-actor', displayName: 'Test User' }
    )
  },
}

// ============================================================================
// Favorites Service
// ============================================================================

export const favoritesService = {
  /**
   * Adds a cube to favorites
   */
  async addFavorite(cubeId: string, collection?: string, note?: string): Promise<FavoriteResult> {
    await simulateNetworkDelay(150)

    let userFavorites = mockFavorites.get(currentUserId)
    if (!userFavorites) {
      userFavorites = []
      mockFavorites.set(currentUserId, userFavorites)
    }

    // Check if already favorited
    if (userFavorites.some((f) => f.cubeId === cubeId)) {
      return { success: true, isFavorited: true }
    }

    const favorite: Favorite = {
      id: generateSocialId('fav'),
      cubeId,
      favoritedAt: new Date().toISOString(),
      collection,
      note,
    }

    userFavorites.push(favorite)
    saveFavorites()

    return { success: true, isFavorited: true }
  },

  /**
   * Removes a cube from favorites
   */
  async removeFavorite(cubeId: string): Promise<FavoriteResult> {
    await simulateNetworkDelay(150)

    const userFavorites = mockFavorites.get(currentUserId)
    if (!userFavorites) {
      return { success: true, isFavorited: false }
    }

    const index = userFavorites.findIndex((f) => f.cubeId === cubeId)
    if (index === -1) {
      return { success: true, isFavorited: false }
    }

    userFavorites.splice(index, 1)
    saveFavorites()

    return { success: true, isFavorited: false }
  },

  /**
   * Toggles favorite status
   */
  async toggleFavorite(cubeId: string): Promise<FavoriteResult> {
    if (this.isFavorited(cubeId)) {
      return this.removeFavorite(cubeId)
    } else {
      return this.addFavorite(cubeId)
    }
  },

  /**
   * Checks if a cube is favorited
   */
  isFavorited(cubeId: string): boolean {
    const userFavorites = mockFavorites.get(currentUserId)
    return userFavorites?.some((f) => f.cubeId === cubeId) || false
  },

  /**
   * Gets all favorites
   */
  async getFavorites(collection?: string): Promise<Favorite[]> {
    await simulateNetworkDelay(150)

    const userFavorites = mockFavorites.get(currentUserId) || []
    if (collection) {
      return userFavorites.filter((f) => f.collection === collection)
    }
    return userFavorites
  },

  /**
   * Gets favorite collections
   */
  async getCollections(): Promise<FavoriteCollection[]> {
    await simulateNetworkDelay(100)

    const userFavorites = mockFavorites.get(currentUserId) || []
    const collections = new Map<string, number>()

    userFavorites.forEach((f) => {
      const col = f.collection || 'Uncategorized'
      collections.set(col, (collections.get(col) || 0) + 1)
    })

    return Array.from(collections.entries()).map(([name, count]) => ({
      name,
      count,
      createdAt: new Date().toISOString(),
    }))
  },

  /**
   * Updates a favorite's note or collection
   */
  async updateFavorite(
    cubeId: string,
    updates: { collection?: string; note?: string }
  ): Promise<FavoriteResult> {
    await simulateNetworkDelay(100)

    const userFavorites = mockFavorites.get(currentUserId)
    if (!userFavorites) {
      return { success: false, error: 'Favorite not found', isFavorited: false }
    }

    const favorite = userFavorites.find((f) => f.cubeId === cubeId)
    if (!favorite) {
      return { success: false, error: 'Favorite not found', isFavorited: false }
    }

    if (updates.collection !== undefined) {
      favorite.collection = updates.collection
    }
    if (updates.note !== undefined) {
      favorite.note = updates.note
    }

    saveFavorites()

    return { success: true, isFavorited: true }
  },
}

// ============================================================================
// Combined Social Service
// ============================================================================

export const socialService = {
  comments: commentsService,
  subscriptions: subscriptionsService,
  notifications: notificationsService,
  favorites: favoritesService,

  /**
   * Sets the current user ID (for testing and initialization)
   */
  setCurrentUser(userId: string): void {
    currentUserId = userId
  },

  /**
   * Resets all mock data (for testing)
   */
  _resetMockData(): void {
    mockComments = []
    mockSubscriptions = new Map()
    mockAuthorStats = new Map()
    mockNotifications = []
    mockFavorites = new Map()
    readNotificationIds = new Set()

    // Clear localStorage
    try {
      localStorage.removeItem(SOCIAL_STORAGE_KEYS.SUBSCRIPTIONS)
      localStorage.removeItem(SOCIAL_STORAGE_KEYS.FAVORITES)
      localStorage.removeItem(SOCIAL_STORAGE_KEYS.READ_NOTIFICATIONS)
      localStorage.removeItem(SOCIAL_STORAGE_KEYS.NOTIFICATION_PREFS)
    } catch {
      // Ignore storage errors
    }
  },

  /**
   * Gets mock comments (for testing)
   */
  _getMockComments(): Comment[] {
    return mockComments
  },

  /**
   * Gets mock notifications (for testing)
   */
  _getMockNotifications(): Notification[] {
    return mockNotifications
  },
}

export default socialService
