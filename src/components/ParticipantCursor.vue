<!--
  ParticipantCursor component for displaying other participants' cursors in 3D space
  Shows cursor position, name label, and selection highlighting

  This file contains three components:
  - CursorDisplay (internal) - Single cursor display
  - ParticipantCursor (main/default) - Multiple cursors overlay
  - CursorList (named export) - Sidebar/panel list format

  TASK 65: Migration from React to Vue 3.0 SFC (Phase 10)
-->

<script lang="ts">
import { computed, defineComponent, type PropType } from 'vue'
import type { Participant, CursorPosition } from '../types/collaboration'

/**
 * CursorDisplay - internal sub-component for rendering a single participant's cursor
 */
const CursorDisplay = defineComponent({
  name: 'CursorDisplay',
  props: {
    participant: {
      type: Object as PropType<Participant>,
      required: true,
    },
    showCoordinates: {
      type: Boolean,
      default: false,
    },
    animationDuration: {
      type: Number,
      default: 100,
    },
  },
  setup(props) {
    const cursor = computed(() => props.participant.cursor)

    const cursorStyle = computed(() => ({
      '--cursor-color': props.participant.color,
      '--animation-duration': `${props.animationDuration}ms`,
    }))

    return { cursor, cursorStyle }
  },
  template: `
    <div
      v-if="cursor"
      class="participant-cursor"
      :style="cursorStyle"
      :data-participant-id="participant.id"
      :data-selected-cube="cursor.selectedCubeId || ''"
    >
      <!-- Cursor icon -->
      <svg
        class="participant-cursor__icon"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.86a.5.5 0 0 0-.85.35z"
          :fill="participant.color"
          stroke="#000"
          stroke-width="1"
        />
      </svg>

      <!-- Name label -->
      <div class="participant-cursor__label" :style="{ backgroundColor: participant.color }">
        <span class="participant-cursor__name">{{ participant.name }}</span>
        <span v-if="showCoordinates && cursor" class="participant-cursor__coords">
          ({{ cursor.x.toFixed(1) }}, {{ cursor.y.toFixed(1) }}, {{ cursor.z.toFixed(1) }})
        </span>
      </div>

      <!-- Selection indicator (if participant has selected a cube) -->
      <div
        v-if="cursor.selectedCubeId"
        class="participant-cursor__selection"
        :style="{ borderColor: participant.color }"
      >
        <span class="participant-cursor__selection-label">
          Selected: {{ cursor.selectedCubeId }}
        </span>
      </div>
    </div>
  `,
})

/**
 * CursorList - sub-component for displaying cursors in a sidebar/panel format
 * Shows participant names with their current positions
 */
export const CursorList = defineComponent({
  name: 'CursorList',
  props: {
    participants: {
      type: Array as PropType<
        Array<{
          participant: Participant
          cursor: CursorPosition | null
        }>
      >,
      required: true,
    },
    localParticipantId: {
      type: String,
      default: undefined,
    },
    className: {
      type: String,
      default: '',
    },
  },
  emits: ['cursorClick'],
  setup(props, { emit }) {
    const cursors = computed(() => {
      return props.participants
        .filter(({ participant }) => {
          if (props.localParticipantId && participant.id === props.localParticipantId) {
            return false
          }
          return participant.status !== 'offline'
        })
        .map(({ participant, cursor }) => ({
          participant,
          cursor: cursor ?? participant.cursor ?? null,
        }))
    })

    const handleCursorClick = (cursor: CursorPosition | null, participant: Participant) => {
      if (cursor) {
        emit('cursorClick', cursor, participant)
      }
    }

    const statusColor = (status: string) => {
      if (status === 'online') return '#4caf50'
      if (status === 'away') return '#ff9800'
      return '#888'
    }

    return { cursors, handleCursorClick, statusColor }
  },
  template: `
    <div v-if="cursors.length === 0" :class="['cursor-list', 'cursor-list--empty', className]">
      <p class="cursor-list__empty-text">No other participants online</p>
    </div>
    <div v-else :class="['cursor-list', className]">
      <h4 class="cursor-list__title">Participants</h4>
      <ul class="cursor-list__items">
        <li
          v-for="item in cursors"
          :key="item.participant.id"
          class="cursor-list__item"
        >
          <button
            type="button"
            class="cursor-list__button"
            :disabled="!item.cursor"
            @click="handleCursorClick(item.cursor, item.participant)"
          >
            <!-- Color indicator -->
            <span class="cursor-list__color" :style="{ backgroundColor: item.participant.color }" />

            <!-- Info -->
            <div class="cursor-list__info">
              <span class="cursor-list__name">{{ item.participant.name }}</span>
              <span v-if="item.cursor" class="cursor-list__position">
                x: {{ item.cursor.x.toFixed(1) }}, y: {{ item.cursor.y.toFixed(1) }}, z: {{ item.cursor.z.toFixed(1) }}
              </span>
              <span v-else class="cursor-list__position cursor-list__position--inactive">
                No position
              </span>
            </div>

            <!-- Status -->
            <span
              class="cursor-list__status"
              :style="{ backgroundColor: statusColor(item.participant.status) }"
              :title="item.participant.status"
            />
          </button>
        </li>
      </ul>
    </div>
  `,
})
</script>

<script setup lang="ts">
import { computed as vueComputed } from 'vue'
import type {
  Participant as ParticipantType,
  CursorPosition as CursorPositionType,
} from '../types/collaboration'

/**
 * Props for ParticipantCursor component (multiple cursors overlay)
 */
interface ParticipantCursorProps {
  /** List of participants with their cursor positions */
  participants: Array<{
    participant: ParticipantType
    cursor: CursorPositionType | null
  }>
  /** Local participant ID to exclude from display */
  localParticipantId?: string
  /** Whether to show coordinates on hover */
  showCoordinates?: boolean
  /** Animation duration for cursor movement */
  animationDuration?: number
  /** Custom class name */
  className?: string
}

const props = withDefaults(defineProps<ParticipantCursorProps>(), {
  localParticipantId: undefined,
  showCoordinates: false,
  animationDuration: 100,
  className: '',
})

// Filter out local participant and those without cursor positions
const remoteCursors = vueComputed(() => {
  return props.participants.filter(({ participant, cursor }) => {
    // Exclude local participant
    if (props.localParticipantId && participant.id === props.localParticipantId) {
      return false
    }
    // Exclude if no cursor data
    if (!cursor && !participant.cursor) {
      return false
    }
    // Exclude offline participants
    if (participant.status === 'offline') {
      return false
    }
    return true
  })
})
</script>

<template>
  <div v-if="remoteCursors.length > 0" :class="['participant-cursors', className]">
    <CursorDisplay
      v-for="{ participant } in remoteCursors"
      :key="participant.id"
      :participant="participant"
      :show-coordinates="showCoordinates"
      :animation-duration="animationDuration"
    />
  </div>
</template>
