<!--
  SubscriptionButton component for following/unfollowing authors (Vue 3.0 SFC)
  Provides a toggle button for subscribing to cube authors

  TASK 47: Initial implementation
  TASK 64: Migration from React to Vue 3.0 SFC (Phase 10)

  Features:
  - Subscribe/unsubscribe to authors
  - Show subscriber count
  - Loading state during operation
-->
<script lang="ts">
import type { ComponentMeta } from '../types/component-meta'
import { registerComponentMeta } from '../types/component-meta'

/**
 * Component metadata for Developer Mode
 */
export const SUBSCRIPTION_BUTTON_META: ComponentMeta = {
  id: 'subscription-button',
  name: 'SubscriptionButton',
  version: '1.1.0',
  summary: 'Follow/unfollow button for cube authors.',
  description:
    'SubscriptionButton provides a toggle for subscribing to cube authors. ' +
    'When subscribed, users receive notifications about new cubes from the author.',
  phase: 7,
  taskId: 'TASK 47',
  filePath: 'components/SubscriptionButton.vue',
  history: [
    {
      version: '1.0.0',
      date: '2026-01-30T00:00:00Z',
      description: 'Initial implementation with subscribe/unsubscribe toggle',
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
      id: 'subscribe',
      name: 'Subscribe',
      description: 'Follow an author to receive updates',
      enabled: true,
      taskId: 'TASK 47',
    },
    {
      id: 'unsubscribe',
      name: 'Unsubscribe',
      description: 'Unfollow an author',
      enabled: true,
      taskId: 'TASK 47',
    },
    {
      id: 'subscriber-count',
      name: 'Subscriber Count',
      description: 'Display number of subscribers',
      enabled: true,
      taskId: 'TASK 47',
    },
  ],
  dependencies: [
    { name: '../lib/social', type: 'lib', path: 'lib/social.ts', purpose: 'Subscriptions service' },
  ],
  relatedFiles: [{ path: 'lib/social.ts', type: 'util', description: 'Social features service' }],
  props: [
    {
      name: 'authorId',
      type: 'string',
      required: true,
      description: 'ID of the author to subscribe to',
    },
    {
      name: 'initialIsSubscribed',
      type: 'boolean',
      required: false,
      description: 'Initial subscription state',
    },
    {
      name: 'initialSubscriberCount',
      type: 'number',
      required: false,
      description: 'Initial subscriber count',
    },
    {
      name: 'showCount',
      type: 'boolean',
      required: false,
      description: 'Whether to show subscriber count',
    },
    {
      name: 'size',
      type: "'small' | 'medium' | 'large'",
      required: false,
      description: 'Button size',
    },
    {
      name: 'className',
      type: 'string',
      required: false,
      description: 'Additional CSS class name',
    },
  ],
  tips: [
    'Subscribe to your favorite authors to stay updated',
    'Unsubscribe anytime by clicking the button again',
  ],
  tags: ['subscriptions', 'follow', 'social', 'phase-7'],
  status: 'stable',
  lastUpdated: '2026-01-31T00:00:00Z',
}

// Register metadata in the global registry
registerComponentMeta(SUBSCRIPTION_BUTTON_META)
</script>

<script setup lang="ts">
import { ref } from 'vue'
import { subscriptionsService } from '../lib/social'

// ============================================================================
// Props
// ============================================================================

interface SubscriptionButtonProps {
  /** ID of the author to subscribe to */
  authorId: string
  /** Initial subscription state */
  initialIsSubscribed?: boolean
  /** Initial subscriber count */
  initialSubscriberCount?: number
  /** Whether to show subscriber count */
  showCount?: boolean
  /** Button size */
  size?: 'small' | 'medium' | 'large'
  /** Additional CSS class name */
  className?: string
}

const props = withDefaults(defineProps<SubscriptionButtonProps>(), {
  initialIsSubscribed: false,
  initialSubscriberCount: 0,
  showCount: true,
  size: 'medium',
  className: '',
})

const emit = defineEmits<{
  subscriptionChange: [isSubscribed: boolean, subscriberCount: number]
}>()

// State
const isSubscribed = ref(props.initialIsSubscribed)
const subscriberCount = ref(props.initialSubscriberCount)
const isLoading = ref(false)

// Handle toggle
async function handleToggle() {
  if (isLoading.value) return

  isLoading.value = true

  try {
    const result = await subscriptionsService.toggleSubscription(props.authorId)

    if (result.success) {
      isSubscribed.value = result.isSubscribed
      subscriberCount.value = result.subscriberCount
      emit('subscriptionChange', result.isSubscribed, result.subscriberCount)
    }
  } catch (err) {
    console.error('Failed to toggle subscription:', err)
  } finally {
    isLoading.value = false
  }
}

// Format count
function formatCount(count: number): string {
  if (count < 1000) return count.toString()
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`
  return `${(count / 1000000).toFixed(1)}M`
}
</script>

<template>
  <button
    type="button"
    :class="[
      'subscription-button',
      `subscription-button--${size}`,
      { 'subscription-button--subscribed': isSubscribed },
      { 'subscription-button--loading': isLoading },
      className,
    ]"
    :disabled="isLoading"
    :aria-label="isSubscribed ? 'Unfollow author' : 'Follow author'"
    :aria-pressed="isSubscribed"
    @click="handleToggle"
  >
    <span v-if="isLoading" class="subscription-button__spinner" />
    <template v-else>
      <span class="subscription-button__icon">{{ isSubscribed ? '\u2713' : '+' }}</span>
      <span class="subscription-button__text">{{ isSubscribed ? 'Following' : 'Follow' }}</span>
      <span v-if="showCount && subscriberCount > 0" class="subscription-button__count">
        {{ formatCount(subscriberCount) }}
      </span>
    </template>
  </button>
</template>
