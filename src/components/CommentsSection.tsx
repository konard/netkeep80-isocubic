/**
 * CommentsSection component for cube comments (TASK 47)
 * Displays and manages comments on published cubes
 *
 * Features:
 * - View comments on a cube
 * - Add new comments
 * - Reply to comments
 * - Like comments
 * - Edit and delete own comments
 * - Developer Mode metadata support
 */

import { useState, useCallback, useEffect } from 'react'
import type { ComponentMeta } from '../types/component-meta'
import type { CubeAuthor } from '../types/community'
import type { Comment, CreateCommentRequest } from '../types/social'
import { formatRelativeTime, MAX_COMMENT_LENGTH } from '../types/social'
import { commentsService } from '../lib/social'
import { registerComponentMeta } from '../types/component-meta'
import { ComponentInfo } from './ComponentInfo'
import { useIsDevModeEnabled } from '../lib/devmode'

/**
 * Component metadata for Developer Mode
 */
export const COMMENTS_SECTION_META: ComponentMeta = {
  id: 'comments-section',
  name: 'CommentsSection',
  version: '1.0.0',
  summary: 'Comment section for published cubes.',
  description:
    'CommentsSection provides a full-featured comment system for published cubes. ' +
    'Users can view, create, reply to, like, edit, and delete comments. The component ' +
    'supports threaded replies and real-time character counting.',
  phase: 7,
  taskId: 'TASK 47',
  filePath: 'components/CommentsSection.tsx',
  history: [
    {
      version: '1.0.0',
      date: '2026-01-30T00:00:00Z',
      description: 'Initial implementation with comments, replies, likes, and editing',
      taskId: 'TASK 47',
      type: 'created',
    },
  ],
  features: [
    {
      id: 'view-comments',
      name: 'View Comments',
      description: 'Display comments on a published cube',
      enabled: true,
      taskId: 'TASK 47',
    },
    {
      id: 'add-comment',
      name: 'Add Comment',
      description: 'Post new comments with character limit',
      enabled: true,
      taskId: 'TASK 47',
    },
    {
      id: 'reply',
      name: 'Reply',
      description: 'Reply to existing comments',
      enabled: true,
      taskId: 'TASK 47',
    },
    {
      id: 'like-comment',
      name: 'Like Comment',
      description: 'Like or unlike comments',
      enabled: true,
      taskId: 'TASK 47',
    },
    {
      id: 'edit-delete',
      name: 'Edit/Delete',
      description: 'Edit or delete own comments',
      enabled: true,
      taskId: 'TASK 47',
    },
  ],
  dependencies: [
    { name: '../lib/social', type: 'lib', path: 'lib/social.ts', purpose: 'Comments service' },
    { name: '../types/social', type: 'lib', path: 'types/social.ts', purpose: 'Type definitions' },
  ],
  relatedFiles: [
    { path: 'types/social.ts', type: 'type', description: 'Social feature types' },
    { path: 'lib/social.ts', type: 'util', description: 'Social features service' },
    {
      path: 'components/CommentsSection.test.tsx',
      type: 'test',
      description: 'Unit tests for CommentsSection',
    },
  ],
  props: [
    {
      name: 'cubeId',
      type: 'string',
      required: true,
      description: 'ID of the cube to show comments for',
    },
    {
      name: 'currentUser',
      type: 'CubeAuthor | null',
      required: false,
      description: 'Current logged-in user',
    },
    {
      name: 'onCommentCountChange',
      type: '(count: number) => void',
      required: false,
      description: 'Callback when comment count changes',
    },
    {
      name: 'className',
      type: 'string',
      required: false,
      description: 'Additional CSS class name',
    },
  ],
  tips: [
    'Click on a comment to reply',
    'Double-click your comment to edit it',
    'Like comments to show appreciation',
  ],
  tags: ['comments', 'social', 'community', 'phase-7'],
  status: 'stable',
  lastUpdated: '2026-01-30T00:00:00Z',
}

// Register metadata in the global registry
registerComponentMeta(COMMENTS_SECTION_META)

// ============================================================================
// Props Interface
// ============================================================================

export interface CommentsSectionProps {
  /** ID of the cube to show comments for */
  cubeId: string
  /** Current logged-in user (null if not logged in) */
  currentUser?: CubeAuthor | null
  /** Callback when comment count changes */
  onCommentCountChange?: (count: number) => void
  /** Additional CSS class name */
  className?: string
}

// ============================================================================
// Single Comment Component
// ============================================================================

interface CommentItemProps {
  comment: Comment
  currentUser?: CubeAuthor | null
  onReply: (parentId: string) => void
  onLike: (commentId: string) => void
  onEdit: (comment: Comment) => void
  onDelete: (commentId: string) => void
  replies?: Comment[]
}

function CommentItem({
  comment,
  currentUser,
  onReply,
  onLike,
  onEdit,
  onDelete,
  replies = [],
}: CommentItemProps) {
  const isOwnComment = currentUser && currentUser.id === comment.author.id

  return (
    <div className="comments-section__comment">
      <div className="comments-section__comment-header">
        <div className="comments-section__author">
          {comment.author.avatarUrl ? (
            <img
              src={comment.author.avatarUrl}
              alt={comment.author.displayName}
              className="comments-section__avatar"
            />
          ) : (
            <div className="comments-section__avatar-placeholder">
              {comment.author.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="comments-section__author-name">{comment.author.displayName}</span>
        </div>
        <span className="comments-section__time">
          {formatRelativeTime(comment.createdAt)}
          {comment.isEdited && <span className="comments-section__edited"> (edited)</span>}
        </span>
      </div>

      <p className="comments-section__content">{comment.content}</p>

      <div className="comments-section__actions">
        <button
          type="button"
          className={`comments-section__action-btn ${comment.isLiked ? 'comments-section__action-btn--active' : ''}`}
          onClick={() => onLike(comment.id)}
          aria-label={comment.isLiked ? 'Unlike comment' : 'Like comment'}
        >
          {comment.isLiked ? '❤️' : '🤍'} {comment.likes > 0 && comment.likes}
        </button>

        {currentUser && (
          <button
            type="button"
            className="comments-section__action-btn"
            onClick={() => onReply(comment.id)}
            aria-label="Reply to comment"
          >
            💬 Reply
          </button>
        )}

        {isOwnComment && (
          <>
            <button
              type="button"
              className="comments-section__action-btn"
              onClick={() => onEdit(comment)}
              aria-label="Edit comment"
            >
              ✏️ Edit
            </button>
            <button
              type="button"
              className="comments-section__action-btn comments-section__action-btn--danger"
              onClick={() => onDelete(comment.id)}
              aria-label="Delete comment"
            >
              🗑️ Delete
            </button>
          </>
        )}
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="comments-section__replies">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUser={currentUser}
              onReply={onReply}
              onLike={onLike}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      {comment.replyCount > replies.length && (
        <button type="button" className="comments-section__load-replies">
          Load {comment.replyCount - replies.length} more replies
        </button>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function CommentsSection({
  cubeId,
  currentUser,
  onCommentCountChange,
  className = '',
}: CommentsSectionProps) {
  // State
  const [comments, setComments] = useState<Comment[]>([])
  const [repliesByParent, setRepliesByParent] = useState<Map<string, Comment[]>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  // New comment state
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Edit state
  const [editingComment, setEditingComment] = useState<Comment | null>(null)
  const [editContent, setEditContent] = useState('')

  // Check if DevMode is enabled
  const isDevModeEnabled = useIsDevModeEnabled()

  // Load comments
  useEffect(() => {
    let cancelled = false

    async function loadComments() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await commentsService.getComments(cubeId, { parentId: null })
        if (!cancelled) {
          setComments(response.comments)
          setTotalCount(response.totalCount)
          onCommentCountChange?.(response.totalCount)

          // Load replies for each comment with replies
          const repliesMap = new Map<string, Comment[]>()
          for (const comment of response.comments) {
            if (comment.replyCount > 0) {
              const repliesResponse = await commentsService.getComments(cubeId, {
                parentId: comment.id,
                limit: 3,
              })
              repliesMap.set(comment.id, repliesResponse.comments)
            }
          }
          setRepliesByParent(repliesMap)
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load comments')
          console.error('CommentsSection load error:', err)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadComments()

    return () => {
      cancelled = true
    }
  }, [cubeId, onCommentCountChange])

  // Handle new comment submission
  const handleSubmitComment = useCallback(async () => {
    if (!currentUser || !newComment.trim() || isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      const request: CreateCommentRequest = {
        cubeId,
        content: newComment.trim(),
        parentId: replyingTo || undefined,
      }

      const result = await commentsService.createComment(request, currentUser)

      if (result.success && result.comment) {
        if (replyingTo) {
          // Add to replies
          setRepliesByParent((prev) => {
            const newMap = new Map(prev)
            const existing = newMap.get(replyingTo) || []
            newMap.set(replyingTo, [result.comment!, ...existing])
            return newMap
          })
          // Update parent reply count
          setComments((prev) =>
            prev.map((c) => (c.id === replyingTo ? { ...c, replyCount: c.replyCount + 1 } : c))
          )
        } else {
          // Add to top-level comments
          setComments((prev) => [...prev, result.comment!])
        }
        setTotalCount((prev) => prev + 1)
        onCommentCountChange?.(totalCount + 1)
        setNewComment('')
        setReplyingTo(null)
      } else {
        setError(result.error || 'Failed to post comment')
      }
    } catch (err) {
      setError('Failed to post comment')
      console.error('CommentsSection submit error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }, [currentUser, newComment, isSubmitting, cubeId, replyingTo, totalCount, onCommentCountChange])

  // Handle like toggle
  const handleLike = useCallback(async (commentId: string) => {
    try {
      const result = await commentsService.toggleCommentLike(commentId)
      if (result.success && result.comment) {
        // Update in comments list
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? { ...c, likes: result.comment!.likes, isLiked: result.comment!.isLiked }
              : c
          )
        )
        // Update in replies
        setRepliesByParent((prev) => {
          const newMap = new Map(prev)
          newMap.forEach((replies, parentId) => {
            const updated = replies.map((r) =>
              r.id === commentId
                ? { ...r, likes: result.comment!.likes, isLiked: result.comment!.isLiked }
                : r
            )
            newMap.set(parentId, updated)
          })
          return newMap
        })
      }
    } catch (err) {
      console.error('Failed to toggle like:', err)
    }
  }, [])

  // Handle edit
  const handleEdit = useCallback((comment: Comment) => {
    setEditingComment(comment)
    setEditContent(comment.content)
  }, [])

  // Handle save edit
  const handleSaveEdit = useCallback(async () => {
    if (!editingComment || !currentUser || !editContent.trim()) return

    try {
      const result = await commentsService.updateComment(
        { commentId: editingComment.id, content: editContent.trim() },
        currentUser.id
      )

      if (result.success && result.comment) {
        // Update in comments list
        setComments((prev) => prev.map((c) => (c.id === editingComment.id ? result.comment! : c)))
        // Update in replies
        setRepliesByParent((prev) => {
          const newMap = new Map(prev)
          newMap.forEach((replies, parentId) => {
            const updated = replies.map((r) => (r.id === editingComment.id ? result.comment! : r))
            newMap.set(parentId, updated)
          })
          return newMap
        })
        setEditingComment(null)
        setEditContent('')
      } else {
        setError(result.error || 'Failed to update comment')
      }
    } catch (err) {
      setError('Failed to update comment')
      console.error('CommentsSection edit error:', err)
    }
  }, [editingComment, currentUser, editContent])

  // Handle delete
  const handleDelete = useCallback(
    async (commentId: string) => {
      if (!currentUser) return

      if (!window.confirm('Are you sure you want to delete this comment?')) return

      try {
        const result = await commentsService.deleteComment(commentId, currentUser.id)

        if (result.success) {
          // Remove from comments list
          setComments((prev) => prev.filter((c) => c.id !== commentId))
          // Remove from replies
          setRepliesByParent((prev) => {
            const newMap = new Map(prev)
            newMap.forEach((replies, parentId) => {
              newMap.set(
                parentId,
                replies.filter((r) => r.id !== commentId)
              )
            })
            newMap.delete(commentId) // Remove replies of deleted comment
            return newMap
          })
          setTotalCount((prev) => prev - 1)
          onCommentCountChange?.(totalCount - 1)
        } else {
          setError(result.error || 'Failed to delete comment')
        }
      } catch (err) {
        setError('Failed to delete comment')
        console.error('CommentsSection delete error:', err)
      }
    },
    [currentUser, totalCount, onCommentCountChange]
  )

  // Handle reply
  const handleReply = useCallback((parentId: string) => {
    setReplyingTo(parentId)
    setNewComment('')
  }, [])

  // Cancel reply
  const handleCancelReply = useCallback(() => {
    setReplyingTo(null)
    setNewComment('')
  }, [])

  // Cancel edit
  const handleCancelEdit = useCallback(() => {
    setEditingComment(null)
    setEditContent('')
  }, [])

  const content = (
    <div className={`comments-section ${className}`}>
      <div className="comments-section__header">
        <h3 className="comments-section__title">
          Comments{' '}
          {totalCount > 0 && <span className="comments-section__count">({totalCount})</span>}
        </h3>
      </div>

      {/* Error message */}
      {error && (
        <div className="comments-section__error" role="alert">
          {error}
        </div>
      )}

      {/* New comment form */}
      {currentUser ? (
        <div className="comments-section__form">
          {replyingTo && (
            <div className="comments-section__replying-to">
              Replying to comment
              <button
                type="button"
                className="comments-section__cancel-reply"
                onClick={handleCancelReply}
              >
                Cancel
              </button>
            </div>
          )}
          <textarea
            className="comments-section__input"
            placeholder={replyingTo ? 'Write a reply...' : 'Write a comment...'}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            maxLength={MAX_COMMENT_LENGTH}
            disabled={isSubmitting}
          />
          <div className="comments-section__form-footer">
            <span className="comments-section__char-count">
              {newComment.length}/{MAX_COMMENT_LENGTH}
            </span>
            <button
              type="button"
              className="comments-section__submit-btn"
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || isSubmitting}
            >
              {isSubmitting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      ) : (
        <div className="comments-section__login-prompt">Please log in to leave a comment.</div>
      )}

      {/* Edit modal */}
      {editingComment && (
        <div className="comments-section__edit-modal">
          <div className="comments-section__edit-content">
            <h4>Edit Comment</h4>
            <textarea
              className="comments-section__input"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              maxLength={MAX_COMMENT_LENGTH}
            />
            <div className="comments-section__edit-actions">
              <button type="button" onClick={handleCancelEdit}>
                Cancel
              </button>
              <button type="button" onClick={handleSaveEdit} disabled={!editContent.trim()}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="comments-section__loading">
          <div className="comments-section__spinner" />
          Loading comments...
        </div>
      )}

      {/* Comments list */}
      {!isLoading && (
        <div className="comments-section__list">
          {comments.length === 0 ? (
            <div className="comments-section__empty">No comments yet. Be the first to comment!</div>
          ) : (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUser={currentUser}
                onReply={handleReply}
                onLike={handleLike}
                onEdit={handleEdit}
                onDelete={handleDelete}
                replies={repliesByParent.get(comment.id) || []}
              />
            ))
          )}
        </div>
      )}
    </div>
  )

  return isDevModeEnabled ? (
    <ComponentInfo meta={COMMENTS_SECTION_META}>{content}</ComponentInfo>
  ) : (
    content
  )
}

export default CommentsSection
