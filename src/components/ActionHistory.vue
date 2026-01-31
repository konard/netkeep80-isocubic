<!--
  ActionHistory component for displaying collaborative action history (Vue 3.0 SFC)
  Shows recent actions with participant info, timestamps, and action details

  TASK 64: Migration from React to Vue 3.0 SFC (Phase 10)
-->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { CollaborativeAction, ActionType, Participant } from '../types/collaboration'

/**
 * Extended action with resolved participant info
 */
type ResolvedAction = CollaborativeAction & {
  /** Resolved participant info (if available) */
  participant?: Participant
}

/**
 * Props for ActionHistory component
 */
interface ActionHistoryProps {
  /** List of actions to display */
  actions: CollaborativeAction[]
  /** Map of participant IDs to participant info for resolving names/colors */
  participants?: Map<string, Participant>
  /** Maximum number of actions to display */
  maxActions?: number
  /** Whether to group actions by participant */
  groupByParticipant?: boolean
  /** Filter to show only specific action types */
  filterTypes?: ActionType[]
  /** Local participant ID (to highlight own actions) */
  localParticipantId?: string
  /** Custom class name */
  className?: string
}

const props = withDefaults(defineProps<ActionHistoryProps>(), {
  participants: undefined,
  maxActions: 50,
  groupByParticipant: false,
  filterTypes: undefined,
  localParticipantId: undefined,
  className: '',
})

const emit = defineEmits<{
  actionClick: [action: CollaborativeAction]
  undoAction: [action: CollaborativeAction]
}>()

/**
 * Available action type filters
 */
const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  cube_create: 'Create',
  cube_update: 'Update',
  cube_delete: 'Delete',
  cube_select: 'Select',
  cursor_move: 'Cursor',
  participant_join: 'Join',
  participant_leave: 'Leave',
  session_settings_update: 'Settings',
}

/**
 * Get icon for action type
 */
function getActionIcon(type: ActionType): string {
  switch (type) {
    case 'cube_create':
      return '+'
    case 'cube_update':
      return '~'
    case 'cube_delete':
      return '-'
    case 'cube_select':
      return '[]'
    case 'cursor_move':
      return '\u2197'
    case 'participant_join':
      return '\u2192'
    case 'participant_leave':
      return '\u2190'
    case 'session_settings_update':
      return '\u2699'
    default:
      return '?'
  }
}

/**
 * Format action description
 */
function formatActionDescription(action: CollaborativeAction): string {
  switch (action.type) {
    case 'cube_create':
      return 'Created a cube'
    case 'cube_update':
      return `Updated cube${action.payload.cubeId ? ` "${action.payload.cubeId}"` : ''}`
    case 'cube_delete':
      return `Deleted cube${action.payload.cubeId ? ` "${action.payload.cubeId}"` : ''}`
    case 'cube_select':
      return action.payload.cubeId ? `Selected "${action.payload.cubeId}"` : 'Deselected cube'
    case 'cursor_move':
      return 'Moved cursor'
    case 'participant_join':
      return `${action.payload.participant?.name ?? 'Someone'} joined`
    case 'participant_leave':
      return 'Left session'
    case 'session_settings_update':
      return 'Updated settings'
    default:
      return 'Unknown action'
  }
}

/**
 * Format relative time
 */
function formatRelativeTime(timestamp: string): string {
  const now = Date.now()
  const actionTime = new Date(timestamp).getTime()
  const diff = now - actionTime

  if (diff < 5000) return 'just now'
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return new Date(timestamp).toLocaleDateString()
}

// State
const expandedActionId = ref<string | null>(null)
const activeFilters = ref<Set<ActionType>>(new Set(props.filterTypes ?? []))

// Force re-render for relative times
let tickInterval: ReturnType<typeof setInterval> | null = null
const tick = ref(0)

onMounted(() => {
  tickInterval = setInterval(() => {
    tick.value++
  }, 10000)
})

onUnmounted(() => {
  if (tickInterval) clearInterval(tickInterval)
})

// Resolve participant info for actions
const resolvedActions = computed<ResolvedAction[]>(() => {
  // Reference tick to trigger recomputation
  void tick.value
  return props.actions.map((action) => ({
    ...action,
    participant: props.participants?.get(action.participantId),
  }))
})

// Filter and limit actions
const displayActions = computed(() => {
  let filtered = resolvedActions.value

  if (activeFilters.value.size > 0) {
    filtered = filtered.filter((action) => activeFilters.value.has(action.type))
  }

  // Exclude cursor moves by default
  if (activeFilters.value.size === 0) {
    filtered = filtered.filter((action) => action.type !== 'cursor_move')
  }

  return filtered.slice(-props.maxActions).reverse()
})

// Group by participant if requested
const groupedActions = computed(() => {
  if (!props.groupByParticipant) return null

  const groups = new Map<string, ResolvedAction[]>()
  for (const action of displayActions.value) {
    const key = action.participantId
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(action)
  }
  return groups
})

// Non-cursor action type labels for filter display
const filterableTypes = computed(() => {
  return Object.entries(ACTION_TYPE_LABELS).filter(([type]) => type !== 'cursor_move')
})

// Handle filter toggle
function handleFilterToggle(type: ActionType) {
  const next = new Set(activeFilters.value)
  if (next.has(type)) {
    next.delete(type)
  } else {
    next.add(type)
  }
  activeFilters.value = next
}

// Handle clear filters
function handleClearFilters() {
  activeFilters.value = new Set()
}

// Handle action click
function handleActionClick(action: CollaborativeAction) {
  if (expandedActionId.value === action.id) {
    expandedActionId.value = null
  } else {
    expandedActionId.value = action.id
  }
  emit('actionClick', action)
}

// Handle undo
function handleUndoAction(e: Event, action: CollaborativeAction) {
  e.stopPropagation()
  emit('undoAction', action)
}
</script>

<template>
  <!-- Empty state -->
  <div
    v-if="displayActions.length === 0 && activeFilters.size === 0"
    :class="['action-history', 'action-history--empty', className]"
  >
    <p class="action-history__empty-text">No actions yet</p>
    <p class="action-history__empty-hint">Actions will appear here as participants make changes</p>
  </div>

  <!-- Main content -->
  <div v-else :class="['action-history', className]">
    <!-- Header with filters -->
    <div class="action-history__header">
      <h3 class="action-history__title">Action History</h3>
      <span class="action-history__count">{{ displayActions.length }} actions</span>
    </div>

    <!-- Filter chips -->
    <div class="action-history__filters">
      <button
        v-for="[type, label] in filterableTypes"
        :key="type"
        type="button"
        :class="[
          'action-history__filter',
          { 'action-history__filter--active': activeFilters.has(type as ActionType) },
        ]"
        @click="handleFilterToggle(type as ActionType)"
      >
        {{ label }}
      </button>
      <button
        v-if="activeFilters.size > 0"
        type="button"
        class="action-history__filter action-history__filter--clear"
        @click="handleClearFilters"
      >
        Clear
      </button>
    </div>

    <!-- Actions list - Grouped view -->
    <div v-if="groupedActions" class="action-history__groups">
      <div
        v-for="[participantId, groupActions] in groupedActions"
        :key="participantId"
        class="action-history__group"
      >
        <div
          class="action-history__group-header"
          :style="{ borderColor: groupActions[0]?.participant?.color ?? '#888' }"
        >
          <span
            class="action-history__group-color"
            :style="{ backgroundColor: groupActions[0]?.participant?.color ?? '#888' }"
          />
          <span class="action-history__group-name">
            {{ groupActions[0]?.participant?.name ?? 'Unknown' }}
            <span v-if="participantId === localParticipantId" class="action-history__local-badge"
              >(you)</span
            >
          </span>
          <span class="action-history__group-count">{{ groupActions.length }} actions</span>
        </div>
        <ul class="action-history__list">
          <li
            v-for="action in groupActions"
            :key="action.id"
            :class="[
              'action-history__item',
              { 'action-history__item--local': action.participantId === localParticipantId },
              { 'action-history__item--expanded': expandedActionId === action.id },
            ]"
          >
            <button
              type="button"
              class="action-history__item-button"
              @click="handleActionClick(action)"
            >
              <span
                class="action-history__icon"
                :style="{ backgroundColor: action.participant?.color ?? '#888' }"
                :title="ACTION_TYPE_LABELS[action.type]"
              >
                {{ getActionIcon(action.type) }}
              </span>
              <div class="action-history__content">
                <span class="action-history__description">{{
                  formatActionDescription(action)
                }}</span>
                <span class="action-history__time">{{ formatRelativeTime(action.timestamp) }}</span>
              </div>
            </button>

            <div v-if="expandedActionId === action.id" class="action-history__details">
              <div class="action-history__detail-row">
                <span class="action-history__detail-label">ID:</span>
                <span class="action-history__detail-value action-history__detail-value--mono">
                  {{ action.id.slice(0, 8) }}...
                </span>
              </div>
              <div class="action-history__detail-row">
                <span class="action-history__detail-label">Type:</span>
                <span class="action-history__detail-value">{{ action.type }}</span>
              </div>
              <div class="action-history__detail-row">
                <span class="action-history__detail-label">Time:</span>
                <span class="action-history__detail-value">
                  {{ new Date(action.timestamp).toLocaleString() }}
                </span>
              </div>
              <button
                v-if="action.participantId === localParticipantId"
                type="button"
                class="action-history__undo-btn"
                @click="handleUndoAction($event, action)"
              >
                Undo
              </button>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- Actions list - Flat view -->
    <ul v-else class="action-history__list">
      <li
        v-for="action in displayActions"
        :key="action.id"
        :class="[
          'action-history__item',
          { 'action-history__item--local': action.participantId === localParticipantId },
          { 'action-history__item--expanded': expandedActionId === action.id },
        ]"
      >
        <button
          type="button"
          class="action-history__item-button"
          @click="handleActionClick(action)"
        >
          <span
            class="action-history__icon"
            :style="{ backgroundColor: action.participant?.color ?? '#888' }"
            :title="ACTION_TYPE_LABELS[action.type]"
          >
            {{ getActionIcon(action.type) }}
          </span>
          <div class="action-history__content">
            <span class="action-history__participant">
              {{ action.participant?.name ?? 'Unknown' }}
              <span
                v-if="action.participantId === localParticipantId"
                class="action-history__local-badge"
                >(you)</span
              >
            </span>
            <span class="action-history__description">{{ formatActionDescription(action) }}</span>
            <span class="action-history__time">{{ formatRelativeTime(action.timestamp) }}</span>
          </div>
        </button>

        <div v-if="expandedActionId === action.id" class="action-history__details">
          <div class="action-history__detail-row">
            <span class="action-history__detail-label">ID:</span>
            <span class="action-history__detail-value action-history__detail-value--mono">
              {{ action.id.slice(0, 8) }}...
            </span>
          </div>
          <div class="action-history__detail-row">
            <span class="action-history__detail-label">Type:</span>
            <span class="action-history__detail-value">{{ action.type }}</span>
          </div>
          <div class="action-history__detail-row">
            <span class="action-history__detail-label">Time:</span>
            <span class="action-history__detail-value">
              {{ new Date(action.timestamp).toLocaleString() }}
            </span>
          </div>
          <button
            v-if="action.participantId === localParticipantId"
            type="button"
            class="action-history__undo-btn"
            @click="handleUndoAction($event, action)"
          >
            Undo
          </button>
        </div>
      </li>
    </ul>

    <!-- No results for filter -->
    <div
      v-if="displayActions.length === 0 && activeFilters.size > 0"
      class="action-history__no-results"
    >
      <p>No actions match the selected filters</p>
      <button type="button" class="action-history__clear-btn" @click="handleClearFilters">
        Clear filters
      </button>
    </div>
  </div>
</template>
