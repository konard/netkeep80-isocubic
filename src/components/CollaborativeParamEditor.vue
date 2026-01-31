<!--
  CollaborativeParamEditor component for collaborative editing mode (Vue 3 SFC)
  Extends ParamEditor with real-time collaboration features:
  - Shows who is editing which parameter
  - Displays editing indicators with participant colors
  - Handles conflict resolution visualization
  - Integrates with ActionHistory for change tracking

  ISSUE 33: Collaborative editing mode for ParamEditor
  TASK 65: Migration from React to Vue 3.0 SFC (Phase 10)
-->
<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { SpectralCube } from '../types/cube'
import type { LODConfig, LODStatistics } from '../types/lod'
import type {
  Participant,
  CollaborativeAction,
  ParticipantId,
  CubeUpdateAction,
} from '../types/collaboration'
import ParamEditor from './ParamEditor.vue'
import ActionHistory from './ActionHistory.vue'
import { CollaborationManager, canEdit } from '../lib/collaboration'

/**
 * Field being edited by a participant
 */
export interface FieldEdit {
  /** ID of participant editing this field */
  participantId: ParticipantId
  /** Name of the field being edited */
  fieldName: string
  /** Section the field belongs to */
  section: string
  /** Timestamp when editing started */
  startedAt: string
  /** Last value change timestamp */
  lastChangeAt: string
}

/**
 * Conflict information for a field
 */
export interface FieldConflict {
  /** Name of the field with conflict */
  fieldName: string
  /** Participants involved in the conflict */
  participants: ParticipantId[]
  /** Timestamp of the conflict */
  timestamp: string
  /** Whether the conflict was resolved */
  resolved: boolean
  /** Resolution strategy used */
  resolution?: 'last_write_wins' | 'first_write_wins' | 'merge'
}

/**
 * Infers which field is being edited from a cube update action
 * Uses 'in' operator to safely handle union types (SpectralCube | FFTCubeConfig)
 */
function inferEditedField(action: CubeUpdateAction): { fieldName: string; section: string } | null {
  const { changes } = action.payload

  // Check for SpectralCube-specific properties using 'in' operator for type safety
  if ('base' in changes && changes.base) {
    const base = changes.base
    if ('color' in base) return { fieldName: 'color', section: 'base' }
    if ('roughness' in base) return { fieldName: 'roughness', section: 'base' }
    if ('transparency' in base) return { fieldName: 'transparency', section: 'base' }
  }

  if ('gradients' in changes && changes.gradients) {
    return { fieldName: 'gradients', section: 'gradients' }
  }

  if ('noise' in changes && changes.noise) {
    const noise = changes.noise
    if ('type' in noise) return { fieldName: 'type', section: 'noise' }
    if ('scale' in noise) return { fieldName: 'scale', section: 'noise' }
    if ('octaves' in noise) return { fieldName: 'octaves', section: 'noise' }
    if ('persistence' in noise) return { fieldName: 'persistence', section: 'noise' }
    if ('mask' in noise) return { fieldName: 'mask', section: 'noise' }
    return { fieldName: 'noise', section: 'noise' }
  }

  // physics exists on both SpectralCube and FFTCubeConfig, but with different types
  if ('physics' in changes && changes.physics) {
    const physics = changes.physics
    if ('material' in physics) return { fieldName: 'material', section: 'physics' }
    if ('density' in physics) return { fieldName: 'density', section: 'physics' }
    if ('break_pattern' in physics) return { fieldName: 'break_pattern', section: 'physics' }
    // FFTCubeConfig physics fields
    if ('conductivity' in physics) return { fieldName: 'conductivity', section: 'physics' }
    if ('resistance' in physics) return { fieldName: 'resistance', section: 'physics' }
    return { fieldName: 'physics', section: 'physics' }
  }

  // boundary exists on both types
  if ('boundary' in changes && changes.boundary) {
    const boundary = changes.boundary
    if ('mode' in boundary) return { fieldName: 'mode', section: 'boundary' }
    if ('neighbor_influence' in boundary)
      return { fieldName: 'neighbor_influence', section: 'boundary' }
    return { fieldName: 'boundary', section: 'boundary' }
  }

  // meta exists on both types
  if ('meta' in changes && changes.meta) {
    const meta = changes.meta
    if ('name' in meta) return { fieldName: 'name', section: 'meta' }
  }

  // FFTCubeConfig-specific properties
  if ('channels' in changes && changes.channels) {
    return { fieldName: 'channels', section: 'fft' }
  }

  if ('fft_size' in changes) {
    return { fieldName: 'fft_size', section: 'fft' }
  }

  if ('energy_capacity' in changes) {
    return { fieldName: 'energy_capacity', section: 'energy' }
  }

  if ('current_energy' in changes) {
    return { fieldName: 'current_energy', section: 'energy' }
  }

  return null
}

const props = withDefaults(
  defineProps<{
    /** Current cube configuration */
    currentCube: SpectralCube | null
    /** Current LOD configuration */
    lodConfig?: LODConfig
    /** Current LOD statistics */
    lodStatistics?: LODStatistics
    /** Collaboration manager instance */
    collaborationManager?: CollaborationManager
    /** All participants in the session */
    participants?: Map<ParticipantId, Participant>
    /** Local participant ID */
    localParticipantId?: ParticipantId
    /** Recent actions for history display */
    actions?: CollaborativeAction[]
    /** Whether to show action history panel */
    showHistory?: boolean
    /** Maximum actions to show in history */
    maxHistoryActions?: number
    /** Custom class name */
    class?: string
  }>(),
  {
    actions: () => [],
    showHistory: true,
    maxHistoryActions: 30,
    class: '',
  }
)

const emit = defineEmits<{
  /** Callback when cube is updated */
  cubeUpdate: [cube: SpectralCube]
  /** Callback when LOD configuration changes */
  lodConfigChange: [config: LODConfig]
  /** Callback when action is undone */
  undoAction: [action: CollaborativeAction]
}>()

// Track recent conflicts
const conflicts = ref<FieldConflict[]>([])

// Whether the current user can edit
const localParticipant = computed(() => {
  if (!props.participants || !props.localParticipantId) return null
  return props.participants.get(props.localParticipantId) ?? null
})

const isReadOnly = computed(() => !canEdit(localParticipant.value))

// Compute active edits from recent actions
// Filter actions to only those within the edit timeout period
const activeEdits = computed(() => {
  if (!props.actions.length) return new Map<string, FieldEdit>()

  const editTimeout = 5000 // Consider an edit active for 5 seconds

  const newActiveEdits = new Map<string, FieldEdit>()

  // Get the most recent timestamp from actions to use as reference
  // This makes the computation pure as it doesn't depend on current time
  const mostRecentAction = props.actions.reduce((latest, action) => {
    const actionTime = new Date(action.timestamp).getTime()
    const latestTime = new Date(latest.timestamp).getTime()
    return actionTime > latestTime ? action : latest
  }, props.actions[0])

  const referenceTime = new Date(mostRecentAction.timestamp).getTime()

  // Process recent update actions
  for (const action of props.actions) {
    if (action.type !== 'cube_update') continue
    if (action.participantId === props.localParticipantId) continue

    const actionTime = new Date(action.timestamp).getTime()
    // Only consider actions within editTimeout of the most recent action
    if (referenceTime - actionTime > editTimeout) continue

    const field = inferEditedField(action as CubeUpdateAction)
    if (!field) continue

    const key = `${field.section}.${field.fieldName}`
    const existing = newActiveEdits.get(key)

    if (!existing || new Date(existing.lastChangeAt).getTime() < actionTime) {
      newActiveEdits.set(key, {
        participantId: action.participantId,
        fieldName: field.fieldName,
        section: field.section,
        startedAt: existing?.startedAt ?? action.timestamp,
        lastChangeAt: action.timestamp,
      })
    }
  }

  return newActiveEdits
})

// Listen for conflict resolution events from manager
let cleanupConflictListener: (() => void) | null = null

function setupConflictListener() {
  cleanupConflictListener?.()
  cleanupConflictListener = null

  if (!props.collaborationManager) return

  const handleConflict = (event: { data: unknown }) => {
    const data = event.data as {
      incoming: CollaborativeAction
      pending: CollaborativeAction
      resolved: CollaborativeAction
    }

    if (data.incoming.type !== 'cube_update') return

    const field = inferEditedField(data.incoming as CubeUpdateAction)
    if (!field) return

    const conflict: FieldConflict = {
      fieldName: field.fieldName,
      participants: [data.incoming.participantId, data.pending.participantId],
      timestamp: new Date().toISOString(),
      resolved: true,
      resolution: 'last_write_wins', // Default, could be from config
    }

    conflicts.value = [...conflicts.value.slice(-9), conflict]

    // Auto-clear conflict after 3 seconds
    setTimeout(() => {
      conflicts.value = conflicts.value.filter((c) => c.timestamp !== conflict.timestamp)
    }, 3000)
  }

  props.collaborationManager.on('conflict_resolved', handleConflict)
  cleanupConflictListener = () => {
    props.collaborationManager?.off('conflict_resolved', handleConflict)
  }
}

watch(() => props.collaborationManager, setupConflictListener)
onMounted(setupConflictListener)
onUnmounted(() => {
  cleanupConflictListener?.()
})

// Handle cube update with collaboration tracking
function handleCubeUpdate(cube: SpectralCube) {
  emit('cubeUpdate', cube)

  // If we have a manager, sync the action
  if (props.collaborationManager && props.currentCube) {
    props.collaborationManager.updateCube(cube.id, cube)
  }
}

// Handle LOD config change
function handleLODConfigChange(config: LODConfig) {
  emit('lodConfigChange', config)
}

// Handle undo action
function handleUndoAction(action: CollaborativeAction) {
  emit('undoAction', action)
}

// Get participant info for an edit
function getParticipantForEdit(edit: FieldEdit): Participant | undefined {
  return props.participants?.get(edit.participantId)
}

// Filter cube-related actions for history
const cubeActions = computed(() => {
  return props.actions.filter(
    (action) =>
      action.type === 'cube_create' ||
      action.type === 'cube_update' ||
      action.type === 'cube_delete'
  )
})

// Get list of sections with active edits
const sectionsWithEdits = computed(() => {
  const sections = new Set<string>()
  for (const edit of activeEdits.value.values()) {
    sections.add(edit.section)
  }
  return sections
})

// Computed list of unique active editor participant IDs
const activeEditorParticipantIds = computed(() => {
  return Array.from(new Set(Array.from(activeEdits.value.values()).map((e) => e.participantId)))
})

// Computed entries for field overlays
const activeEditEntries = computed(() => {
  return Array.from(activeEdits.value.entries())
})

// Computed sections array for iteration
const sectionsWithEditsArray = computed(() => {
  return Array.from(sectionsWithEdits.value)
})

// Get edits in a given section
function getEditsInSection(section: string) {
  return Array.from(activeEdits.value.values()).filter((e) => e.section === section)
}

// Get participant objects for edits in a section
function getEditParticipants(section: string): Participant[] {
  return getEditsInSection(section)
    .map((e) => props.participants?.get(e.participantId))
    .filter(Boolean) as Participant[]
}
</script>

<template>
  <div :class="['collab-editor', props.class]">
    <!-- Collaboration status header -->
    <div class="collab-editor__header">
      <div class="collab-editor__status">
        <template v-if="localParticipant">
          <span
            class="collab-editor__user-color"
            :style="{ backgroundColor: localParticipant.color }"
          />
          <span class="collab-editor__user-name">{{ localParticipant.name }}</span>
          <span class="collab-editor__user-role">({{ localParticipant.role }})</span>
        </template>
      </div>

      <!-- Active editors indicator -->
      <div v-if="activeEdits.size > 0" class="collab-editor__active-editors">
        <span class="collab-editor__active-count">
          {{ activeEdits.size }} field(s) being edited
        </span>
        <div class="collab-editor__active-avatars">
          <template v-for="pid in activeEditorParticipantIds" :key="pid">
            <span
              v-if="participants?.get(pid)"
              class="collab-editor__avatar"
              :style="{ backgroundColor: participants!.get(pid)!.color }"
              :title="participants!.get(pid)!.name"
            >
              {{ participants!.get(pid)!.name.charAt(0).toUpperCase() }}
            </span>
          </template>
        </div>
      </div>

      <!-- Conflict indicator -->
      <div
        v-if="conflicts.length > 0"
        class="collab-editor__conflict-badge"
        role="status"
        aria-live="polite"
      >
        <span class="collab-editor__conflict-icon">!</span>
        <span class="collab-editor__conflict-count">
          {{ conflicts.length }} conflict(s) resolved
        </span>
      </div>
    </div>

    <!-- Read-only notice -->
    <div v-if="isReadOnly" class="collab-editor__readonly-notice" role="alert">
      <span class="collab-editor__readonly-icon">View</span>
      <span class="collab-editor__readonly-text">
        You are a viewer. Request editor access to make changes.
      </span>
    </div>

    <!-- Section edit indicators -->
    <div v-if="sectionsWithEdits.size > 0" class="collab-editor__section-indicators">
      <div
        v-for="section in sectionsWithEditsArray"
        :key="section"
        class="collab-editor__section-indicator"
      >
        <span class="collab-editor__section-name">{{ section }}</span>
        <div class="collab-editor__section-editors">
          <span
            v-for="p in getEditParticipants(section)"
            :key="p.id"
            class="collab-editor__editor-chip"
            :style="{ backgroundColor: p.color }"
          >
            {{ p.name }}
          </span>
        </div>
      </div>
    </div>

    <!-- Main editor -->
    <div class="collab-editor__main">
      <ParamEditor
        :current-cube="currentCube"
        :on-cube-update="isReadOnly ? undefined : handleCubeUpdate"
        :lod-config="lodConfig"
        :on-l-o-d-config-change="isReadOnly ? undefined : handleLODConfigChange"
        :lod-statistics="lodStatistics"
        class="collab-editor__param-editor"
      />

      <!-- Field-level indicators overlay -->
      <div v-if="activeEdits.size > 0" class="collab-editor__field-overlays">
        <template v-for="[key, edit] in activeEditEntries" :key="key">
          <div
            v-if="getParticipantForEdit(edit)"
            class="collab-editor__field-overlay"
            :data-section="edit.section"
            :data-field="edit.fieldName"
            :style="{ borderColor: getParticipantForEdit(edit)!.color }"
          >
            <div
              class="collab-editor__edit-indicator"
              :style="{ backgroundColor: getParticipantForEdit(edit)!.color }"
              :title="`${getParticipantForEdit(edit)!.name} is editing this field`"
            >
              <span class="collab-editor__edit-indicator-name">
                {{ getParticipantForEdit(edit)!.name }}
              </span>
              <span class="collab-editor__edit-indicator-icon">Editing...</span>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Action history panel -->
    <div v-if="showHistory" class="collab-editor__history">
      <ActionHistory
        :actions="cubeActions"
        :participants="participants"
        :max-actions="maxHistoryActions"
        :local-participant-id="localParticipantId"
        :on-undo-action="isReadOnly ? undefined : handleUndoAction"
        class="collab-editor__action-history"
      />
    </div>
  </div>
</template>
