/**
 * SubscriptionButton component for following/unfollowing authors (TASK 47)
 * Provides a toggle button for subscribing to cube authors
 *
 * Features:
 * - Subscribe/unsubscribe to authors
 * - Show subscriber count
 * - Loading state during operation
 * - Developer Mode metadata support
 */

import { useState, useCallback } from 'react'
import type { ComponentMeta } from '../types/component-meta'
import { subscriptionsService } from '../lib/social'
import { registerComponentMeta } from '../types/component-meta'
import { ComponentInfo } from './ComponentInfo'
import { useIsDevModeEnabled } from '../lib/devmode'

/**
 * Component metadata for Developer Mode
 */
export const SUBSCRIPTION_BUTTON_META: ComponentMeta = {
  id: 'subscription-button',
  name: 'SubscriptionButton',
  version: '1.0.0',
  summary: 'Follow/unfollow button for cube authors.',
  description:
    'SubscriptionButton provides a toggle for subscribing to cube authors. ' +
    'When subscribed, users receive notifications about new cubes from the author.',
  phase: 7,
  taskId: 'TASK 47',
  filePath: 'components/SubscriptionButton.tsx',
  history: [
    {
      version: '1.0.0',
      date: '2026-01-30T00:00:00Z',
      description: 'Initial implementation with subscribe/unsubscribe toggle',
      taskId: 'TASK 47',
      type: 'created',
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
      name: 'onSubscriptionChange',
      type: '(isSubscribed: boolean, subscriberCount: number) => void',
      required: false,
      description: 'Callback when subscription changes',
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
  lastUpdated: '2026-01-30T00:00:00Z',
}

// Register metadata in the global registry
registerComponentMeta(SUBSCRIPTION_BUTTON_META)

// ============================================================================
// Props Interface
// ============================================================================

export interface SubscriptionButtonProps {
  /** ID of the author to subscribe to */
  authorId: string
  /** Initial subscription state */
  initialIsSubscribed?: boolean
  /** Initial subscriber count */
  initialSubscriberCount?: number
  /** Callback when subscription changes */
  onSubscriptionChange?: (isSubscribed: boolean, subscriberCount: number) => void
  /** Whether to show subscriber count */
  showCount?: boolean
  /** Button size */
  size?: 'small' | 'medium' | 'large'
  /** Additional CSS class name */
  className?: string
}

// ============================================================================
// Main Component
// ============================================================================

export function SubscriptionButton({
  authorId,
  initialIsSubscribed = false,
  initialSubscriberCount = 0,
  onSubscriptionChange,
  showCount = true,
  size = 'medium',
  className = '',
}: SubscriptionButtonProps) {
  const [isSubscribed, setIsSubscribed] = useState(initialIsSubscribed)
  const [subscriberCount, setSubscriberCount] = useState(initialSubscriberCount)
  const [isLoading, setIsLoading] = useState(false)

  // Check if DevMode is enabled
  const isDevModeEnabled = useIsDevModeEnabled()

  // Handle toggle
  const handleToggle = useCallback(async () => {
    if (isLoading) return

    setIsLoading(true)

    try {
      const result = await subscriptionsService.toggleSubscription(authorId)

      if (result.success) {
        setIsSubscribed(result.isSubscribed)
        setSubscriberCount(result.subscriberCount)
        onSubscriptionChange?.(result.isSubscribed, result.subscriberCount)
      }
    } catch (err) {
      console.error('Failed to toggle subscription:', err)
    } finally {
      setIsLoading(false)
    }
  }, [authorId, isLoading, onSubscriptionChange])

  // Format count
  const formatCount = (count: number): string => {
    if (count < 1000) return count.toString()
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K`
    return `${(count / 1000000).toFixed(1)}M`
  }

  const content = (
    <button
      type="button"
      className={`subscription-button subscription-button--${size} ${isSubscribed ? 'subscription-button--subscribed' : ''} ${isLoading ? 'subscription-button--loading' : ''} ${className}`}
      onClick={handleToggle}
      disabled={isLoading}
      aria-label={isSubscribed ? 'Unfollow author' : 'Follow author'}
      aria-pressed={isSubscribed}
    >
      {isLoading ? (
        <span className="subscription-button__spinner" />
      ) : (
        <>
          <span className="subscription-button__icon">{isSubscribed ? '✓' : '+'}</span>
          <span className="subscription-button__text">{isSubscribed ? 'Following' : 'Follow'}</span>
          {showCount && subscriberCount > 0 && (
            <span className="subscription-button__count">{formatCount(subscriberCount)}</span>
          )}
        </>
      )}
    </button>
  )

  return isDevModeEnabled ? (
    <ComponentInfo meta={SUBSCRIPTION_BUTTON_META}>{content}</ComponentInfo>
  ) : (
    content
  )
}

export default SubscriptionButton
