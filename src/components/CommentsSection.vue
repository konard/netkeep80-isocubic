<!--
  CommentsSection component for cube comments (Vue 3.0 SFC)
  Displays and manages comments on published cubes

  TASK 47: Initial implementation
  TASK 64: Migration from React to Vue 3.0 SFC (Phase 10)

  Features:
  - View comments on a cube
  - Add new comments
  - Reply to comments
  - Like comments
  - Edit and delete own comments
-->
<script lang="ts">
import type { ComponentMeta } from '../types/component-meta'
import { registerComponentMeta } from '../types/component-meta'

/**
 * Component metadata for Developer Mode
 */
export const COMMENTS_SECTION_META: ComponentMeta = {
  id: 'comments-section',
  name: 'CommentsSection',
  version: '1.1.0',
  summary: 'Comment section for published cubes.',
  description:
    'CommentsSection provides a full-featured comment system for published cubes. ' +
    'Users can view, create, reply to, like, edit, and delete comments. The component ' +
    'supports threaded replies and real-time character counting.',
  phase: 7,
  taskId: 'TASK 47',
  filePath: 'components/CommentsSection.vue',
  history: [
    {
      version: '1.0.0',
      date: '2026-01-30T00:00:00Z',
      description: 'Initial implementation with comments, replies, likes, and editing',
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
      path: 'components/CommentsSection.vue.test.ts',
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
  lastUpdated: '2026-01-31T00:00:00Z',
}

// Register metadata in the global registry
registerComponentMeta(COMMENTS_SECTION_META)
</script>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { CubeAuthor } from '../types/community'
import type { Comment, CreateCommentRequest } from '../types/social'
import { formatRelativeTime, MAX_COMMENT_LENGTH } from '../types/social'
import { commentsService } from '../lib/social'

// ============================================================================
// Props
// ============================================================================

interface CommentsSectionProps {
  /** ID of the cube to show comments for */
  cubeId: string
  /** Current logged-in user (null if not logged in) */
  currentUser?: CubeAuthor | null
  /** Additional CSS class name */
  className?: string
}

const props = withDefaults(defineProps<CommentsSectionProps>(), {
  currentUser: null,
  className: '',
})

const emit = defineEmits<{
  commentCountChange: [count: number]
}>()

// ============================================================================
// State
// ============================================================================

const comments = ref<Comment[]>([])
const repliesByParent = ref<Map<string, Comment[]>>(new Map())
const isLoading = ref(true)
const error = ref<string | null>(null)
const totalCount = ref(0)

// New comment state
const newComment = ref('')
const replyingTo = ref<string | null>(null)
const isSubmitting = ref(false)

// Edit state
const editingComment = ref<Comment | null>(null)
const editContent = ref('')

// ============================================================================
// Load comments
// ============================================================================

async function loadComments() {
  isLoading.value = true
  error.value = null

  try {
    const response = await commentsService.getComments(props.cubeId, { parentId: null })
    comments.value = response.comments
    totalCount.value = response.totalCount
    emit('commentCountChange', response.totalCount)

    // Load replies for each comment with replies
    const repliesMap = new Map<string, Comment[]>()
    for (const comment of response.comments) {
      if (comment.replyCount > 0) {
        const repliesResponse = await commentsService.getComments(props.cubeId, {
          parentId: comment.id,
          limit: 3,
        })
        repliesMap.set(comment.id, repliesResponse.comments)
      }
    }
    repliesByParent.value = repliesMap
  } catch (err) {
    error.value = 'Failed to load comments'
    console.error('CommentsSection load error:', err)
  } finally {
    isLoading.value = false
  }
}

// Watch cubeId changes
watch(
  () => props.cubeId,
  () => {
    loadComments()
  },
  { immediate: true }
)

// ============================================================================
// Handlers
// ============================================================================

async function handleSubmitComment() {
  if (!props.currentUser || !newComment.value.trim() || isSubmitting.value) return

  isSubmitting.value = true
  error.value = null

  try {
    const request: CreateCommentRequest = {
      cubeId: props.cubeId,
      content: newComment.value.trim(),
      parentId: replyingTo.value || undefined,
    }

    const result = await commentsService.createComment(request, props.currentUser)

    if (result.success && result.comment) {
      if (replyingTo.value) {
        const newMap = new Map(repliesByParent.value)
        const existing = newMap.get(replyingTo.value) || []
        newMap.set(replyingTo.value, [result.comment, ...existing])
        repliesByParent.value = newMap
        // Update parent reply count
        comments.value = comments.value.map((c) =>
          c.id === replyingTo.value ? { ...c, replyCount: c.replyCount + 1 } : c
        )
      } else {
        comments.value = [...comments.value, result.comment]
      }
      totalCount.value += 1
      emit('commentCountChange', totalCount.value)
      newComment.value = ''
      replyingTo.value = null
    } else {
      error.value = result.error || 'Failed to post comment'
    }
  } catch (err) {
    error.value = 'Failed to post comment'
    console.error('CommentsSection submit error:', err)
  } finally {
    isSubmitting.value = false
  }
}

async function handleLike(commentId: string) {
  try {
    const result = await commentsService.toggleCommentLike(commentId)
    if (result.success && result.comment) {
      comments.value = comments.value.map((c) =>
        c.id === commentId
          ? { ...c, likes: result.comment!.likes, isLiked: result.comment!.isLiked }
          : c
      )
      const newMap = new Map(repliesByParent.value)
      newMap.forEach((replies, parentId) => {
        const updated = replies.map((r) =>
          r.id === commentId
            ? { ...r, likes: result.comment!.likes, isLiked: result.comment!.isLiked }
            : r
        )
        newMap.set(parentId, updated)
      })
      repliesByParent.value = newMap
    }
  } catch (err) {
    console.error('Failed to toggle like:', err)
  }
}

function handleEdit(comment: Comment) {
  editingComment.value = comment
  editContent.value = comment.content
}

async function handleSaveEdit() {
  if (!editingComment.value || !props.currentUser || !editContent.value.trim()) return

  try {
    const result = await commentsService.updateComment(
      { commentId: editingComment.value.id, content: editContent.value.trim() },
      props.currentUser.id
    )

    if (result.success && result.comment) {
      comments.value = comments.value.map((c) =>
        c.id === editingComment.value!.id ? result.comment! : c
      )
      const newMap = new Map(repliesByParent.value)
      newMap.forEach((replies, parentId) => {
        const updated = replies.map((r) =>
          r.id === editingComment.value!.id ? result.comment! : r
        )
        newMap.set(parentId, updated)
      })
      repliesByParent.value = newMap
      editingComment.value = null
      editContent.value = ''
    } else {
      error.value = result.error || 'Failed to update comment'
    }
  } catch (err) {
    error.value = 'Failed to update comment'
    console.error('CommentsSection edit error:', err)
  }
}

async function handleDelete(commentId: string) {
  if (!props.currentUser) return
  if (!window.confirm('Are you sure you want to delete this comment?')) return

  try {
    const result = await commentsService.deleteComment(commentId, props.currentUser.id)

    if (result.success) {
      comments.value = comments.value.filter((c) => c.id !== commentId)
      const newMap = new Map(repliesByParent.value)
      newMap.forEach((replies, parentId) => {
        newMap.set(
          parentId,
          replies.filter((r) => r.id !== commentId)
        )
      })
      newMap.delete(commentId)
      repliesByParent.value = newMap
      totalCount.value -= 1
      emit('commentCountChange', totalCount.value)
    } else {
      error.value = result.error || 'Failed to delete comment'
    }
  } catch (err) {
    error.value = 'Failed to delete comment'
    console.error('CommentsSection delete error:', err)
  }
}

function handleReply(parentId: string) {
  replyingTo.value = parentId
  newComment.value = ''
}

function handleCancelReply() {
  replyingTo.value = null
  newComment.value = ''
}

function handleCancelEdit() {
  editingComment.value = null
  editContent.value = ''
}

function getReplies(commentId: string): Comment[] {
  return repliesByParent.value.get(commentId) || []
}

function isOwnComment(comment: Comment): boolean {
  return !!props.currentUser && props.currentUser.id === comment.author.id
}
</script>

<template>
  <div :class="['comments-section', className]">
    <div class="comments-section__header">
      <h3 class="comments-section__title">
        Comments
        <span v-if="totalCount > 0" class="comments-section__count">({{ totalCount }})</span>
      </h3>
    </div>

    <!-- Error message -->
    <div v-if="error" class="comments-section__error" role="alert">
      {{ error }}
    </div>

    <!-- New comment form -->
    <div v-if="currentUser" class="comments-section__form">
      <div v-if="replyingTo" class="comments-section__replying-to">
        Replying to comment
        <button type="button" class="comments-section__cancel-reply" @click="handleCancelReply">
          Cancel
        </button>
      </div>
      <textarea
        v-model="newComment"
        class="comments-section__input"
        :placeholder="replyingTo ? 'Write a reply...' : 'Write a comment...'"
        :maxlength="MAX_COMMENT_LENGTH"
        :disabled="isSubmitting"
      />
      <div class="comments-section__form-footer">
        <span class="comments-section__char-count">
          {{ newComment.length }}/{{ MAX_COMMENT_LENGTH }}
        </span>
        <button
          type="button"
          class="comments-section__submit-btn"
          :disabled="!newComment.trim() || isSubmitting"
          @click="handleSubmitComment"
        >
          {{ isSubmitting ? 'Posting...' : 'Post' }}
        </button>
      </div>
    </div>
    <div v-else class="comments-section__login-prompt">Please log in to leave a comment.</div>

    <!-- Edit modal -->
    <div v-if="editingComment" class="comments-section__edit-modal">
      <div class="comments-section__edit-content">
        <h4>Edit Comment</h4>
        <textarea
          v-model="editContent"
          class="comments-section__input"
          :maxlength="MAX_COMMENT_LENGTH"
        />
        <div class="comments-section__edit-actions">
          <button type="button" @click="handleCancelEdit">Cancel</button>
          <button type="button" :disabled="!editContent.trim()" @click="handleSaveEdit">
            Save
          </button>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="comments-section__loading">
      <div class="comments-section__spinner" />
      Loading comments...
    </div>

    <!-- Comments list -->
    <div v-if="!isLoading" class="comments-section__list">
      <div v-if="comments.length === 0" class="comments-section__empty">
        No comments yet. Be the first to comment!
      </div>
      <template v-else>
        <div v-for="comment in comments" :key="comment.id" class="comments-section__comment">
          <div class="comments-section__comment-header">
            <div class="comments-section__author">
              <img
                v-if="comment.author.avatarUrl"
                :src="comment.author.avatarUrl"
                :alt="comment.author.displayName"
                class="comments-section__avatar"
              />
              <div v-else class="comments-section__avatar-placeholder">
                {{ comment.author.displayName.charAt(0).toUpperCase() }}
              </div>
              <span class="comments-section__author-name">{{ comment.author.displayName }}</span>
            </div>
            <span class="comments-section__time">
              {{ formatRelativeTime(comment.createdAt) }}
              <span v-if="comment.isEdited" class="comments-section__edited"> (edited)</span>
            </span>
          </div>

          <p class="comments-section__content">{{ comment.content }}</p>

          <div class="comments-section__actions">
            <button
              type="button"
              :class="[
                'comments-section__action-btn',
                { 'comments-section__action-btn--active': comment.isLiked },
              ]"
              :aria-label="comment.isLiked ? 'Unlike comment' : 'Like comment'"
              @click="handleLike(comment.id)"
            >
              {{ comment.isLiked ? '\u2764\uFE0F' : '\U0001F90D' }}
              <template v-if="comment.likes > 0"> {{ comment.likes }}</template>
            </button>

            <button
              v-if="currentUser"
              type="button"
              class="comments-section__action-btn"
              aria-label="Reply to comment"
              @click="handleReply(comment.id)"
            >
              \uD83D\uDCAC Reply
            </button>

            <template v-if="isOwnComment(comment)">
              <button
                type="button"
                class="comments-section__action-btn"
                aria-label="Edit comment"
                @click="handleEdit(comment)"
              >
                \u270F\uFE0F Edit
              </button>
              <button
                type="button"
                class="comments-section__action-btn comments-section__action-btn--danger"
                aria-label="Delete comment"
                @click="handleDelete(comment.id)"
              >
                \uD83D\uDDD1\uFE0F Delete
              </button>
            </template>
          </div>

          <!-- Replies -->
          <div v-if="getReplies(comment.id).length > 0" class="comments-section__replies">
            <div
              v-for="reply in getReplies(comment.id)"
              :key="reply.id"
              class="comments-section__comment"
            >
              <div class="comments-section__comment-header">
                <div class="comments-section__author">
                  <img
                    v-if="reply.author.avatarUrl"
                    :src="reply.author.avatarUrl"
                    :alt="reply.author.displayName"
                    class="comments-section__avatar"
                  />
                  <div v-else class="comments-section__avatar-placeholder">
                    {{ reply.author.displayName.charAt(0).toUpperCase() }}
                  </div>
                  <span class="comments-section__author-name">{{ reply.author.displayName }}</span>
                </div>
                <span class="comments-section__time">
                  {{ formatRelativeTime(reply.createdAt) }}
                  <span v-if="reply.isEdited" class="comments-section__edited"> (edited)</span>
                </span>
              </div>
              <p class="comments-section__content">{{ reply.content }}</p>
              <div class="comments-section__actions">
                <button
                  type="button"
                  :class="[
                    'comments-section__action-btn',
                    { 'comments-section__action-btn--active': reply.isLiked },
                  ]"
                  :aria-label="reply.isLiked ? 'Unlike comment' : 'Like comment'"
                  @click="handleLike(reply.id)"
                >
                  {{ reply.isLiked ? '\u2764\uFE0F' : '\U0001F90D' }}
                  <template v-if="reply.likes > 0"> {{ reply.likes }}</template>
                </button>
                <button
                  v-if="currentUser"
                  type="button"
                  class="comments-section__action-btn"
                  aria-label="Reply to comment"
                  @click="handleReply(comment.id)"
                >
                  \uD83D\uDCAC Reply
                </button>
                <template v-if="isOwnComment(reply)">
                  <button
                    type="button"
                    class="comments-section__action-btn"
                    aria-label="Edit comment"
                    @click="handleEdit(reply)"
                  >
                    \u270F\uFE0F Edit
                  </button>
                  <button
                    type="button"
                    class="comments-section__action-btn comments-section__action-btn--danger"
                    aria-label="Delete comment"
                    @click="handleDelete(reply.id)"
                  >
                    \uD83D\uDDD1\uFE0F Delete
                  </button>
                </template>
              </div>
            </div>
          </div>

          <button
            v-if="comment.replyCount > getReplies(comment.id).length"
            type="button"
            class="comments-section__load-replies"
          >
            Load {{ comment.replyCount - getReplies(comment.id).length }} more replies
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
