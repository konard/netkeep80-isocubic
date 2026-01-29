/**
 * TypeScript types for Social Features (TASK 47)
 * Defines types for comments, subscriptions, notifications, and favorites
 *
 * This module provides types for:
 * - Comments on published cubes
 * - Author subscriptions (follow/unfollow)
 * - Notifications system
 * - Favorites/bookmarks
 */

import type { CubeAuthor } from './community'

// ============================================================================
// Comment Types
// ============================================================================

/**
 * A comment on a published cube
 */
export interface Comment {
  /** Unique comment identifier */
  id: string
  /** ID of the cube this comment belongs to */
  cubeId: string
  /** Author of the comment */
  author: CubeAuthor
  /** Comment text content (max 1000 characters) */
  content: string
  /** Parent comment ID for replies (null for top-level comments) */
  parentId: string | null
  /** Number of likes on this comment */
  likes: number
  /** Whether current user has liked this comment */
  isLiked?: boolean
  /** Number of replies to this comment */
  replyCount: number
  /** Comment creation timestamp (ISO 8601) */
  createdAt: string
  /** Whether this comment was edited */
  isEdited: boolean
  /** Edit timestamp (ISO 8601), if edited */
  editedAt?: string
  /** Whether this comment is hidden (e.g., reported) */
  isHidden: boolean
}

/**
 * Request to create a new comment
 */
export interface CreateCommentRequest {
  /** ID of the cube to comment on */
  cubeId: string
  /** Comment text content */
  content: string
  /** Parent comment ID for replies (optional) */
  parentId?: string
}

/**
 * Request to update an existing comment
 */
export interface UpdateCommentRequest {
  /** Comment ID to update */
  commentId: string
  /** New content */
  content: string
}

/**
 * Response for comment operations
 */
export interface CommentResult {
  /** Whether the operation was successful */
  success: boolean
  /** Error message if failed */
  error?: string
  /** The comment (if applicable) */
  comment?: Comment
}

/**
 * Paginated comments response
 */
export interface CommentsResponse {
  /** Array of comments */
  comments: Comment[]
  /** Total number of comments */
  totalCount: number
  /** Whether there are more comments to load */
  hasMore: boolean
  /** Cursor for pagination */
  nextCursor?: string
}

// ============================================================================
// Subscription Types
// ============================================================================

/**
 * A subscription to an author
 */
export interface Subscription {
  /** Subscription ID */
  id: string
  /** ID of the user who subscribed */
  subscriberId: string
  /** Author being followed */
  author: CubeAuthor
  /** When the subscription was created */
  subscribedAt: string
  /** Whether to receive notifications for this author */
  notificationsEnabled: boolean
}

/**
 * Author profile with subscription info
 */
export interface AuthorProfile {
  /** Author info */
  author: CubeAuthor
  /** Number of subscribers */
  subscriberCount: number
  /** Number of published cubes */
  cubeCount: number
  /** Total likes across all cubes */
  totalLikes: number
  /** Whether current user is subscribed */
  isSubscribed?: boolean
  /** Author bio */
  bio?: string
  /** Member since date */
  memberSince: string
}

/**
 * Response for subscription operations
 */
export interface SubscriptionResult {
  /** Whether the operation was successful */
  success: boolean
  /** Error message if failed */
  error?: string
  /** Whether user is now subscribed */
  isSubscribed: boolean
  /** Updated subscriber count */
  subscriberCount: number
}

// ============================================================================
// Notification Types
// ============================================================================

/**
 * Types of notifications
 */
export type NotificationType =
  | 'new_follower' // Someone followed you
  | 'new_like' // Someone liked your cube
  | 'new_comment' // Someone commented on your cube
  | 'comment_reply' // Someone replied to your comment
  | 'comment_like' // Someone liked your comment
  | 'new_cube' // An author you follow published a new cube
  | 'mention' // Someone mentioned you in a comment
  | 'system' // System notification

/**
 * A notification for the user
 */
export interface Notification {
  /** Unique notification ID */
  id: string
  /** Type of notification */
  type: NotificationType
  /** Notification title */
  title: string
  /** Notification message */
  message: string
  /** Whether the notification has been read */
  isRead: boolean
  /** When the notification was created */
  createdAt: string
  /** Related entity IDs for navigation */
  relatedIds?: {
    cubeId?: string
    commentId?: string
    authorId?: string
  }
  /** Actor who triggered the notification (if applicable) */
  actor?: CubeAuthor
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  /** Enable email notifications */
  emailEnabled: boolean
  /** Enable push notifications */
  pushEnabled: boolean
  /** Notification types to receive */
  enabledTypes: NotificationType[]
  /** Quiet hours (don't send notifications) */
  quietHours?: {
    enabled: boolean
    startHour: number // 0-23
    endHour: number // 0-23
    timezone: string
  }
}

/**
 * Response for notifications list
 */
export interface NotificationsResponse {
  /** Array of notifications */
  notifications: Notification[]
  /** Number of unread notifications */
  unreadCount: number
  /** Whether there are more notifications */
  hasMore: boolean
  /** Cursor for pagination */
  nextCursor?: string
}

/**
 * Response for notification operations
 */
export interface NotificationResult {
  /** Whether the operation was successful */
  success: boolean
  /** Error message if failed */
  error?: string
}

// ============================================================================
// Favorites Types
// ============================================================================

/**
 * A favorite/bookmark for a cube
 */
export interface Favorite {
  /** Favorite ID */
  id: string
  /** ID of the favorited cube */
  cubeId: string
  /** When the cube was favorited */
  favoritedAt: string
  /** Optional collection/folder name */
  collection?: string
  /** Optional note about the favorite */
  note?: string
}

/**
 * A collection of favorites
 */
export interface FavoriteCollection {
  /** Collection name */
  name: string
  /** Number of items in collection */
  count: number
  /** When the collection was created */
  createdAt: string
}

/**
 * Response for favorite operations
 */
export interface FavoriteResult {
  /** Whether the operation was successful */
  success: boolean
  /** Error message if failed */
  error?: string
  /** Whether cube is now favorited */
  isFavorited: boolean
}

// ============================================================================
// Constants and Defaults
// ============================================================================

/**
 * Maximum comment length
 */
export const MAX_COMMENT_LENGTH = 1000

/**
 * Default notification preferences
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  emailEnabled: false,
  pushEnabled: true,
  enabledTypes: [
    'new_follower',
    'new_like',
    'new_comment',
    'comment_reply',
    'new_cube',
    'mention',
    'system',
  ],
  quietHours: {
    enabled: false,
    startHour: 22,
    endHour: 8,
    timezone: 'UTC',
  },
}

/**
 * Notification type display information
 */
export const NOTIFICATION_TYPE_INFO: Record<
  NotificationType,
  { label: string; icon: string; color: string }
> = {
  new_follower: { label: 'New Follower', icon: '👤', color: '#4CAF50' },
  new_like: { label: 'New Like', icon: '❤️', color: '#E91E63' },
  new_comment: { label: 'New Comment', icon: '💬', color: '#2196F3' },
  comment_reply: { label: 'Reply', icon: '↩️', color: '#9C27B0' },
  comment_like: { label: 'Comment Like', icon: '👍', color: '#FF9800' },
  new_cube: { label: 'New Cube', icon: '🎨', color: '#00BCD4' },
  mention: { label: 'Mention', icon: '@', color: '#673AB7' },
  system: { label: 'System', icon: 'ℹ️', color: '#607D8B' },
}

/**
 * Storage keys for social features
 */
export const SOCIAL_STORAGE_KEYS = {
  SUBSCRIPTIONS: 'isocubic_social_subscriptions',
  FAVORITES: 'isocubic_social_favorites',
  NOTIFICATION_PREFS: 'isocubic_social_notification_prefs',
  READ_NOTIFICATIONS: 'isocubic_social_read_notifications',
} as const

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validates comment content
 */
export function validateCommentContent(content: string): { valid: boolean; error?: string } {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: 'Comment cannot be empty' }
  }
  if (content.length > MAX_COMMENT_LENGTH) {
    return { valid: false, error: `Comment cannot exceed ${MAX_COMMENT_LENGTH} characters` }
  }
  return { valid: true }
}

/**
 * Checks if a notification type is enabled in preferences
 */
export function isNotificationTypeEnabled(
  type: NotificationType,
  prefs: NotificationPreferences
): boolean {
  return prefs.enabledTypes.includes(type)
}

/**
 * Formats a relative time string (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return 'just now'
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`
  } else if (diffHours < 24) {
    return `${diffHours}h ago`
  } else if (diffDays < 7) {
    return `${diffDays}d ago`
  } else {
    return date.toLocaleDateString()
  }
}

/**
 * Generates a unique ID for social items
 */
export function generateSocialId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}
