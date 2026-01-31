<!--
  NotificationPanel component for user notifications (Vue 3.0 SFC)
  Displays and manages user notifications

  TASK 47: Initial implementation
  TASK 64: Migration from React to Vue 3.0 SFC (Phase 10)

  Features:
  - View all notifications
  - Mark notifications as read
  - Delete notifications
  - Filter by notification type
-->
<script lang="ts">
import type { ComponentMeta } from '../types/component-meta'
import { registerComponentMeta } from '../types/component-meta'

/**
 * Component metadata for Developer Mode
 */
export const NOTIFICATION_PANEL_META: ComponentMeta = {
  id: 'notification-panel',
  name: 'NotificationPanel',
  version: '1.1.0',
  summary: 'Notification panel for user alerts and updates.',
  description:
    'NotificationPanel displays all user notifications including new followers, likes, comments, ' +
    'and system messages. Users can mark notifications as read, delete them, and filter by type.',
  phase: 7,
  taskId: 'TASK 47',
  filePath: 'components/NotificationPanel.vue',
  history: [
    {
      version: '1.0.0',
      date: '2026-01-30T00:00:00Z',
      description: 'Initial implementation with notification list, read status, and filtering',
      taskId: 'TASK 47',
      type: 'created',
    },
    {
      version: '1.1.0',
      date: '2026-01-31T00:00:00Z',
      description: 'Migrated from React to Vue 3.0 SFC',
      taskId: 'TASK 64',
      type: 'updated',
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
      path: 'components/NotificationPanel.vue.test.ts',
      type: 'test',
      description: 'Unit tests for NotificationPanel',
    },
  ],
  props: [
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
  lastUpdated: '2026-01-31T00:00:00Z',
}

// Register metadata in the global registry
registerComponentMeta(NOTIFICATION_PANEL_META)
</script>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Notification, NotificationType } from '../types/social'
import { formatRelativeTime, NOTIFICATION_TYPE_INFO } from '../types/social'
import { notificationsService } from '../lib/social'

// ============================================================================
// Props
// ============================================================================

interface NotificationPanelProps {
  /** Additional CSS class name */
  className?: string
}

withDefaults(defineProps<NotificationPanelProps>(), {
  className: '',
})

const emit = defineEmits<{
  notificationClick: [notification: Notification]
  unreadCountChange: [count: number]
}>()

// ============================================================================
// State
// ============================================================================

const notifications = ref<Notification[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)
const unreadCount = ref(0)
const filterType = ref<NotificationType | 'all'>('all')

// ============================================================================
// Computed
// ============================================================================

const filteredNotifications = computed(() => {
  if (filterType.value === 'all') return notifications.value
  return notifications.value.filter((n) => n.type === filterType.value)
})

// ============================================================================
// Load notifications
// ============================================================================

async function loadNotifications() {
  isLoading.value = true
  error.value = null

  try {
    const response = await notificationsService.getNotifications({ limit: 50 })
    notifications.value = response.notifications
    unreadCount.value = response.unreadCount
    emit('unreadCountChange', response.unreadCount)
  } catch (err) {
    error.value = 'Failed to load notifications'
    console.error('NotificationPanel load error:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadNotifications()
})

// ============================================================================
// Handlers
// ============================================================================

async function handleClick(notification: Notification) {
  if (!notification.isRead) {
    await notificationsService.markAsRead(notification.id)
    notifications.value = notifications.value.map((n) =>
      n.id === notification.id ? { ...n, isRead: true } : n
    )
    const newUnreadCount = Math.max(0, unreadCount.value - 1)
    unreadCount.value = newUnreadCount
    emit('unreadCountChange', newUnreadCount)
  }
  emit('notificationClick', notification)
}

async function handleMarkRead(notificationId: string) {
  try {
    await notificationsService.markAsRead(notificationId)
    notifications.value = notifications.value.map((n) =>
      n.id === notificationId ? { ...n, isRead: true } : n
    )
    const newUnreadCount = Math.max(0, unreadCount.value - 1)
    unreadCount.value = newUnreadCount
    emit('unreadCountChange', newUnreadCount)
  } catch (err) {
    console.error('Failed to mark notification as read:', err)
  }
}

async function handleMarkAllRead() {
  try {
    await notificationsService.markAllAsRead()
    notifications.value = notifications.value.map((n) => ({ ...n, isRead: true }))
    unreadCount.value = 0
    emit('unreadCountChange', 0)
  } catch (err) {
    console.error('Failed to mark all notifications as read:', err)
  }
}

async function handleDelete(notificationId: string) {
  try {
    await notificationsService.deleteNotification(notificationId)
    const notification = notifications.value.find((n) => n.id === notificationId)
    notifications.value = notifications.value.filter((n) => n.id !== notificationId)
    if (notification && !notification.isRead) {
      const newUnreadCount = Math.max(0, unreadCount.value - 1)
      unreadCount.value = newUnreadCount
      emit('unreadCountChange', newUnreadCount)
    }
  } catch (err) {
    console.error('Failed to delete notification:', err)
  }
}

function handleNotificationKeyDown(e: KeyboardEvent, notification: Notification) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    handleClick(notification)
  }
}
</script>

<template>
  <div :class="['notification-panel', className]">
    <div class="notification-panel__header">
      <h3 class="notification-panel__title">
        Notifications
        <span v-if="unreadCount > 0" class="notification-panel__badge">{{ unreadCount }}</span>
      </h3>

      <div class="notification-panel__controls">
        <select
          v-model="filterType"
          class="notification-panel__filter"
          aria-label="Filter notifications"
        >
          <option value="all">All Types</option>
          <option v-for="(info, type) in NOTIFICATION_TYPE_INFO" :key="type" :value="type">
            {{ info.icon }} {{ info.label }}
          </option>
        </select>

        <button
          v-if="unreadCount > 0"
          type="button"
          class="notification-panel__mark-all-btn"
          aria-label="Mark all as read"
          @click="handleMarkAllRead"
        >
          Mark all read
        </button>
      </div>
    </div>

    <!-- Error message -->
    <div v-if="error" class="notification-panel__error" role="alert">
      {{ error }}
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="notification-panel__loading">
      <div class="notification-panel__spinner" />
      Loading notifications...
    </div>

    <!-- Notifications list -->
    <div v-if="!isLoading" class="notification-panel__list">
      <div v-if="filteredNotifications.length === 0" class="notification-panel__empty">
        {{
          filterType === 'all'
            ? 'No notifications yet'
            : `No ${NOTIFICATION_TYPE_INFO[filterType as NotificationType]?.label || ''} notifications`
        }}
      </div>
      <div
        v-for="notification in filteredNotifications"
        v-else
        :key="notification.id"
        :class="[
          'notification-panel__item',
          { 'notification-panel__item--unread': !notification.isRead },
        ]"
        role="button"
        :tabindex="0"
        :aria-label="`${notification.title}: ${notification.message}`"
        @click="handleClick(notification)"
        @keydown="handleNotificationKeyDown($event, notification)"
      >
        <div
          class="notification-panel__icon"
          :style="{ color: NOTIFICATION_TYPE_INFO[notification.type].color }"
        >
          {{ NOTIFICATION_TYPE_INFO[notification.type].icon }}
        </div>

        <div class="notification-panel__content">
          <div class="notification-panel__header">
            <span class="notification-panel__title">{{ notification.title }}</span>
            <span class="notification-panel__time">
              {{ formatRelativeTime(notification.createdAt) }}
            </span>
          </div>
          <p class="notification-panel__message">{{ notification.message }}</p>
          <span v-if="notification.actor" class="notification-panel__actor">
            by {{ notification.actor.displayName }}
          </span>
        </div>

        <div class="notification-panel__actions">
          <button
            v-if="!notification.isRead"
            type="button"
            class="notification-panel__action-btn"
            aria-label="Mark as read"
            title="Mark as read"
            @click.stop="handleMarkRead(notification.id)"
          >
            \u2713
          </button>
          <button
            type="button"
            class="notification-panel__action-btn notification-panel__action-btn--danger"
            aria-label="Delete notification"
            title="Delete"
            @click.stop="handleDelete(notification.id)"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
