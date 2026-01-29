/**
 * NotificationPanel component for user notifications (TASK 47)
 * Displays and manages user notifications
 *
 * Features:
 * - View all notifications
 * - Mark notifications as read
 * - Delete notifications
 * - Filter by notification type
 * - Developer Mode metadata support
 */

import { useState, useCallback, useEffect } from 'react'
import type { ComponentMeta } from '../types/component-meta'
import type { Notification, NotificationType } from '../types/social'
import { formatRelativeTime, NOTIFICATION_TYPE_INFO } from '../types/social'
import { notificationsService } from '../lib/social'
import { registerComponentMeta } from '../types/component-meta'
import { ComponentInfo } from './ComponentInfo'
import { useIsDevModeEnabled } from '../lib/devmode'

/**
 * Component metadata for Developer Mode
 */
export const NOTIFICATION_PANEL_META: ComponentMeta = {
  id: 'notification-panel',
  name: 'NotificationPanel',
  version: '1.0.0',
  summary: 'Notification panel for user alerts and updates.',
  description:
    'NotificationPanel displays all user notifications including new followers, likes, comments, ' +
    'and system messages. Users can mark notifications as read, delete them, and filter by type.',
  phase: 7,
  taskId: 'TASK 47',
  filePath: 'components/NotificationPanel.tsx',
  history: [
    {
      version: '1.0.0',
      date: '2026-01-30T00:00:00Z',
      description: 'Initial implementation with notification list, read status, and filtering',
      taskId: 'TASK 47',
      type: 'created',
    },
  ],
  features: [
    {
      id: 'view-notifications',
      name: 'View Notifications',
      description: 'Display all user notifications',
      enabled: true,
      taskId: 'TASK 47',
    },
    {
      id: 'mark-read',
      name: 'Mark as Read',
      description: 'Mark individual or all notifications as read',
      enabled: true,
      taskId: 'TASK 47',
    },
    {
      id: 'delete',
      name: 'Delete',
      description: 'Delete notifications',
      enabled: true,
      taskId: 'TASK 47',
    },
    {
      id: 'filter-type',
      name: 'Filter by Type',
      description: 'Filter notifications by type',
      enabled: true,
      taskId: 'TASK 47',
    },
  ],
  dependencies: [
    { name: '../lib/social', type: 'lib', path: 'lib/social.ts', purpose: 'Notifications service' },
    { name: '../types/social', type: 'lib', path: 'types/social.ts', purpose: 'Type definitions' },
  ],
  relatedFiles: [
    { path: 'types/social.ts', type: 'type', description: 'Social feature types' },
    { path: 'lib/social.ts', type: 'util', description: 'Social features service' },
    {
      path: 'components/NotificationPanel.test.tsx',
      type: 'test',
      description: 'Unit tests for NotificationPanel',
    },
  ],
  props: [
    {
      name: 'onNotificationClick',
      type: '(notification: Notification) => void',
      required: false,
      description: 'Callback when a notification is clicked',
    },
    {
      name: 'onUnreadCountChange',
      type: '(count: number) => void',
      required: false,
      description: 'Callback when unread count changes',
    },
    {
      name: 'className',
      type: 'string',
      required: false,
      description: 'Additional CSS class name',
    },
  ],
  tips: [
    'Click on a notification to navigate to the related content',
    'Use the filter to focus on specific notification types',
    'Mark all as read to clear your notification count',
  ],
  tags: ['notifications', 'social', 'alerts', 'phase-7'],
  status: 'stable',
  lastUpdated: '2026-01-30T00:00:00Z',
}

// Register metadata in the global registry
registerComponentMeta(NOTIFICATION_PANEL_META)

// ============================================================================
// Props Interface
// ============================================================================

export interface NotificationPanelProps {
  /** Callback when a notification is clicked */
  onNotificationClick?: (notification: Notification) => void
  /** Callback when unread count changes */
  onUnreadCountChange?: (count: number) => void
  /** Additional CSS class name */
  className?: string
}

// ============================================================================
// Single Notification Item
// ============================================================================

interface NotificationItemProps {
  notification: Notification
  onClick: (notification: Notification) => void
  onMarkRead: (notificationId: string) => void
  onDelete: (notificationId: string) => void
}

function NotificationItem({ notification, onClick, onMarkRead, onDelete }: NotificationItemProps) {
  const typeInfo = NOTIFICATION_TYPE_INFO[notification.type]

  return (
    <div
      className={`notification-panel__item ${notification.isRead ? '' : 'notification-panel__item--unread'}`}
      onClick={() => onClick(notification)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(notification)
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${notification.title}: ${notification.message}`}
    >
      <div className="notification-panel__icon" style={{ color: typeInfo.color }}>
        {typeInfo.icon}
      </div>

      <div className="notification-panel__content">
        <div className="notification-panel__header">
          <span className="notification-panel__title">{notification.title}</span>
          <span className="notification-panel__time">
            {formatRelativeTime(notification.createdAt)}
          </span>
        </div>
        <p className="notification-panel__message">{notification.message}</p>
        {notification.actor && (
          <span className="notification-panel__actor">by {notification.actor.displayName}</span>
        )}
      </div>

      <div className="notification-panel__actions">
        {!notification.isRead && (
          <button
            type="button"
            className="notification-panel__action-btn"
            onClick={(e) => {
              e.stopPropagation()
              onMarkRead(notification.id)
            }}
            aria-label="Mark as read"
            title="Mark as read"
          >
            ✓
          </button>
        )}
        <button
          type="button"
          className="notification-panel__action-btn notification-panel__action-btn--danger"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(notification.id)
          }}
          aria-label="Delete notification"
          title="Delete"
        >
          ×
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function NotificationPanel({
  onNotificationClick,
  onUnreadCountChange,
  className = '',
}: NotificationPanelProps) {
  // State
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [filterType, setFilterType] = useState<NotificationType | 'all'>('all')

  // Check if DevMode is enabled
  const isDevModeEnabled = useIsDevModeEnabled()

  // Load notifications
  useEffect(() => {
    let cancelled = false

    async function loadNotifications() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await notificationsService.getNotifications({ limit: 50 })
        if (!cancelled) {
          setNotifications(response.notifications)
          setUnreadCount(response.unreadCount)
          onUnreadCountChange?.(response.unreadCount)
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load notifications')
          console.error('NotificationPanel load error:', err)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadNotifications()

    return () => {
      cancelled = true
    }
  }, [onUnreadCountChange])

  // Filter notifications
  const filteredNotifications =
    filterType === 'all' ? notifications : notifications.filter((n) => n.type === filterType)

  // Handle notification click
  const handleClick = useCallback(
    async (notification: Notification) => {
      if (!notification.isRead) {
        await notificationsService.markAsRead(notification.id)
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
        )
        const newUnreadCount = Math.max(0, unreadCount - 1)
        setUnreadCount(newUnreadCount)
        onUnreadCountChange?.(newUnreadCount)
      }
      onNotificationClick?.(notification)
    },
    [unreadCount, onUnreadCountChange, onNotificationClick]
  )

  // Handle mark as read
  const handleMarkRead = useCallback(
    async (notificationId: string) => {
      try {
        await notificationsService.markAsRead(notificationId)
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
        )
        const newUnreadCount = Math.max(0, unreadCount - 1)
        setUnreadCount(newUnreadCount)
        onUnreadCountChange?.(newUnreadCount)
      } catch (err) {
        console.error('Failed to mark notification as read:', err)
      }
    },
    [unreadCount, onUnreadCountChange]
  )

  // Handle mark all as read
  const handleMarkAllRead = useCallback(async () => {
    try {
      await notificationsService.markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
      onUnreadCountChange?.(0)
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err)
    }
  }, [onUnreadCountChange])

  // Handle delete
  const handleDelete = useCallback(
    async (notificationId: string) => {
      try {
        await notificationsService.deleteNotification(notificationId)
        const notification = notifications.find((n) => n.id === notificationId)
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
        if (notification && !notification.isRead) {
          const newUnreadCount = Math.max(0, unreadCount - 1)
          setUnreadCount(newUnreadCount)
          onUnreadCountChange?.(newUnreadCount)
        }
      } catch (err) {
        console.error('Failed to delete notification:', err)
      }
    },
    [notifications, unreadCount, onUnreadCountChange]
  )

  // Handle filter change
  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterType(e.target.value as NotificationType | 'all')
  }, [])

  const content = (
    <div className={`notification-panel ${className}`}>
      <div className="notification-panel__header">
        <h3 className="notification-panel__title">
          Notifications
          {unreadCount > 0 && <span className="notification-panel__badge">{unreadCount}</span>}
        </h3>

        <div className="notification-panel__controls">
          <select
            className="notification-panel__filter"
            value={filterType}
            onChange={handleFilterChange}
            aria-label="Filter notifications"
          >
            <option value="all">All Types</option>
            {Object.entries(NOTIFICATION_TYPE_INFO).map(([type, info]) => (
              <option key={type} value={type}>
                {info.icon} {info.label}
              </option>
            ))}
          </select>

          {unreadCount > 0 && (
            <button
              type="button"
              className="notification-panel__mark-all-btn"
              onClick={handleMarkAllRead}
              aria-label="Mark all as read"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="notification-panel__error" role="alert">
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="notification-panel__loading">
          <div className="notification-panel__spinner" />
          Loading notifications...
        </div>
      )}

      {/* Notifications list */}
      {!isLoading && (
        <div className="notification-panel__list">
          {filteredNotifications.length === 0 ? (
            <div className="notification-panel__empty">
              {filterType === 'all'
                ? 'No notifications yet'
                : `No ${NOTIFICATION_TYPE_INFO[filterType as NotificationType]?.label || ''} notifications`}
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={handleClick}
                onMarkRead={handleMarkRead}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      )}
    </div>
  )

  return isDevModeEnabled ? (
    <ComponentInfo meta={NOTIFICATION_PANEL_META}>{content}</ComponentInfo>
  ) : (
    content
  )
}

export default NotificationPanel
