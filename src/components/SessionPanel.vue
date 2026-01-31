/** * SessionPanel component for collaborative editing mode * Provides UI for creating/joining
sessions, viewing participants, and managing session settings */
<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type {
  Session,
  Participant,
  SessionSettings,
  ParticipantRole,
  ConnectionState,
} from '../types/collaboration'
import {
  CollaborationManager,
  createCollaborationManager,
  formatSessionCode,
  parseSessionCode,
  canEdit,
  isOwner,
} from '../lib/collaboration'

/**
 * View mode for the session panel
 */
type ViewMode = 'idle' | 'create' | 'join' | 'active'

/**
 * Props for SessionPanel component
 */
interface SessionPanelProps {
  /** Collaboration manager instance (optional - will create one if not provided) */
  collaborationManager?: CollaborationManager
  /** Custom class name */
  className?: string
}

const props = withDefaults(defineProps<SessionPanelProps>(), {
  collaborationManager: undefined,
  className: '',
})

const emit = defineEmits<{
  sessionChange: [session: Session | null]
  connectionStateChange: [state: ConnectionState]
}>()

// Create or use provided collaboration manager
const manager = props.collaborationManager ?? createCollaborationManager()

// UI state
const viewMode = ref<ViewMode>(manager.getSession() ? 'active' : 'idle')
const participantName = ref('')
const sessionCode = ref('')
const sessionName = ref('')
const error = ref<string | null>(null)
const statusMessage = ref<string | null>(null)
const connectionState = ref<ConnectionState>(manager.getState().connectionState)

// Session state
const session = ref<Session | null>(manager.getSession())
const participants = ref<Participant[]>(manager.getParticipants())
const localParticipant = ref<Participant | null>(manager.getLocalParticipant())

// Derived state
const isSessionOwner = computed(() => isOwner(localParticipant.value))
const canEditCubes = computed(() => canEdit(localParticipant.value))

// Clear error message after timeout
watch(error, (newError) => {
  if (newError) {
    const timer = setTimeout(() => {
      error.value = null
    }, 5000)
    // Clean up on next change
    const unwatch = watch(error, () => {
      clearTimeout(timer)
      unwatch()
    })
  }
})

// Clear status message after timeout
watch(statusMessage, (newMessage) => {
  if (newMessage) {
    const timer = setTimeout(() => {
      statusMessage.value = null
    }, 3000)
    const unwatch = watch(statusMessage, () => {
      clearTimeout(timer)
      unwatch()
    })
  }
})

// Event handlers for collaboration manager
function handleSessionCreated() {
  session.value = manager.getSession()
  participants.value = manager.getParticipants()
  localParticipant.value = manager.getLocalParticipant()
  viewMode.value = 'active'
  statusMessage.value = 'Session created successfully'
  emit('sessionChange', manager.getSession())
}

function handleSessionJoined() {
  session.value = manager.getSession()
  participants.value = manager.getParticipants()
  localParticipant.value = manager.getLocalParticipant()
  viewMode.value = 'active'
  statusMessage.value = 'Joined session successfully'
  emit('sessionChange', manager.getSession())
}

function handleSessionLeft() {
  session.value = null
  participants.value = []
  localParticipant.value = null
  viewMode.value = 'idle'
  statusMessage.value = 'Left session'
  emit('sessionChange', null)
}

function handleSessionUpdated() {
  session.value = manager.getSession()
}

function handleParticipantJoined() {
  participants.value = manager.getParticipants()
}

function handleParticipantLeft() {
  participants.value = manager.getParticipants()
}

function handleParticipantUpdated() {
  participants.value = manager.getParticipants()
  localParticipant.value = manager.getLocalParticipant()
}

function handleConnectionChanged(event: { data: unknown }) {
  const data = event.data as { currentState: ConnectionState }
  connectionState.value = data.currentState
  emit('connectionStateChange', data.currentState)
}

function handleManagerError(event: { data: unknown }) {
  const data = event.data as { message?: string }
  error.value = data.message ?? 'An error occurred'
}

// Subscribe to collaboration manager events
onMounted(() => {
  manager.on('session_created', handleSessionCreated)
  manager.on('session_joined', handleSessionJoined)
  manager.on('session_left', handleSessionLeft)
  manager.on('session_updated', handleSessionUpdated)
  manager.on('participant_joined', handleParticipantJoined)
  manager.on('participant_left', handleParticipantLeft)
  manager.on('participant_updated', handleParticipantUpdated)
  manager.on('connection_changed', handleConnectionChanged)
  manager.on('error', handleManagerError)
})

onUnmounted(() => {
  manager.off('session_created', handleSessionCreated)
  manager.off('session_joined', handleSessionJoined)
  manager.off('session_left', handleSessionLeft)
  manager.off('session_updated', handleSessionUpdated)
  manager.off('participant_joined', handleParticipantJoined)
  manager.off('participant_left', handleParticipantLeft)
  manager.off('participant_updated', handleParticipantUpdated)
  manager.off('connection_changed', handleConnectionChanged)
  manager.off('error', handleManagerError)
})

// Handle create session
function handleCreateSession() {
  if (!participantName.value.trim()) {
    error.value = 'Please enter your name'
    return
  }

  const settings: Partial<SessionSettings> | undefined = sessionName.value.trim()
    ? { name: sessionName.value.trim() }
    : undefined

  const result = manager.createSession(participantName.value.trim(), settings)

  if (!result.success) {
    error.value = result.error ?? 'Failed to create session'
  }
}

// Handle join session
function handleJoinSession() {
  if (!participantName.value.trim()) {
    error.value = 'Please enter your name'
    return
  }

  if (!sessionCode.value.trim()) {
    error.value = 'Please enter session code'
    return
  }

  // Parse the session code (validates format)
  const parsedCode = parseSessionCode(sessionCode.value)

  // Note: In a real implementation, this would fetch the session from a server
  // For now, we'll show an error since we don't have a server
  // The parsedCode would be used to connect to the session
  console.debug('Attempting to join session with code:', parsedCode)
  error.value = 'Session joining requires a server. Use "Create Session" to start a new session.'
}

// Handle leave session
function handleLeaveSession() {
  manager.leaveSession()
}

// Handle copy session code
async function handleCopySessionCode() {
  if (!session.value) return

  try {
    await navigator.clipboard.writeText(session.value.code)
    statusMessage.value = 'Session code copied!'
  } catch {
    // Fallback for browsers without clipboard API
    statusMessage.value = `Code: ${session.value.code}`
  }
}

// Handle role change
function handleRoleChange(participantId: string, newRole: ParticipantRole) {
  if (!isSessionOwner.value || newRole === 'owner') return

  const success = manager.updateParticipantRole(participantId, newRole)
  if (success) {
    statusMessage.value = 'Role updated'
  } else {
    error.value = 'Failed to update role'
  }
}

// Handle kick participant
function handleKickParticipant(participantId: string) {
  if (!isSessionOwner.value) return

  const success = manager.kickParticipant(participantId)
  if (success) {
    statusMessage.value = 'Participant removed'
  } else {
    error.value = 'Failed to remove participant'
  }
}

// Get status indicator color
function getStatusColor(status: string): string {
  switch (status) {
    case 'online':
      return '#4caf50'
    case 'away':
      return '#ff9800'
    case 'offline':
      return '#888'
    default:
      return '#888'
  }
}

// Get connection status text
function getConnectionStatusText(): string {
  switch (connectionState.value) {
    case 'connected':
      return 'Connected'
    case 'connecting':
      return 'Connecting...'
    case 'reconnecting':
      return 'Reconnecting...'
    case 'disconnected':
      return 'Offline'
    default:
      return 'Unknown'
  }
}

// Handle session code input with uppercase transform
function onSessionCodeInput(event: Event) {
  const target = event.target as HTMLInputElement
  sessionCode.value = target.value.toUpperCase()
}
</script>

<template>
  <!-- Idle view (no session) -->
  <div v-if="viewMode === 'idle'" :class="['session-panel', className]">
    <div class="session-panel__header">
      <h2 class="session-panel__title">Collaboration</h2>
    </div>

    <div class="session-panel__welcome">
      <p>Work together in real-time with other users.</p>
    </div>

    <div class="session-panel__actions">
      <button
        type="button"
        class="session-panel__button session-panel__button--primary"
        @click="viewMode = 'create'"
      >
        Create Session
      </button>
      <button
        type="button"
        class="session-panel__button session-panel__button--secondary"
        @click="viewMode = 'join'"
      >
        Join Session
      </button>
    </div>
  </div>

  <!-- Create session view -->
  <div v-else-if="viewMode === 'create'" :class="['session-panel', className]">
    <div class="session-panel__header">
      <h2 class="session-panel__title">Create Session</h2>
      <button
        type="button"
        class="session-panel__back-btn"
        aria-label="Back"
        @click="viewMode = 'idle'"
      >
        &larr;
      </button>
    </div>

    <div v-if="error" class="session-panel__message session-panel__message--error" role="alert">
      {{ error }}
    </div>

    <div class="session-panel__form">
      <div class="session-panel__field">
        <label class="session-panel__label" for="create-name"> Your Name * </label>
        <input
          id="create-name"
          v-model="participantName"
          type="text"
          class="session-panel__input"
          placeholder="Enter your name"
          maxlength="30"
        />
      </div>

      <div class="session-panel__field">
        <label class="session-panel__label" for="session-name"> Session Name (optional) </label>
        <input
          id="session-name"
          v-model="sessionName"
          type="text"
          class="session-panel__input"
          placeholder="My Cube Project"
          maxlength="50"
        />
      </div>

      <button
        type="button"
        class="session-panel__button session-panel__button--primary session-panel__button--full"
        @click="handleCreateSession"
      >
        Create Session
      </button>
    </div>
  </div>

  <!-- Join session view -->
  <div v-else-if="viewMode === 'join'" :class="['session-panel', className]">
    <div class="session-panel__header">
      <h2 class="session-panel__title">Join Session</h2>
      <button
        type="button"
        class="session-panel__back-btn"
        aria-label="Back"
        @click="viewMode = 'idle'"
      >
        &larr;
      </button>
    </div>

    <div v-if="error" class="session-panel__message session-panel__message--error" role="alert">
      {{ error }}
    </div>

    <div class="session-panel__form">
      <div class="session-panel__field">
        <label class="session-panel__label" for="join-name"> Your Name * </label>
        <input
          id="join-name"
          v-model="participantName"
          type="text"
          class="session-panel__input"
          placeholder="Enter your name"
          maxlength="30"
        />
      </div>

      <div class="session-panel__field">
        <label class="session-panel__label" for="session-code"> Session Code * </label>
        <input
          id="session-code"
          type="text"
          class="session-panel__input session-panel__input--code"
          placeholder="ABC-123"
          :value="sessionCode"
          maxlength="7"
          @input="onSessionCodeInput"
        />
      </div>

      <button
        type="button"
        class="session-panel__button session-panel__button--primary session-panel__button--full"
        @click="handleJoinSession"
      >
        Join Session
      </button>
    </div>
  </div>

  <!-- Active session view -->
  <div v-else :class="['session-panel', className]">
    <div class="session-panel__header">
      <h2 class="session-panel__title">{{ session?.settings.name || 'Session' }}</h2>
      <div class="session-panel__connection-status">
        <span
          class="session-panel__status-dot"
          :style="{ backgroundColor: connectionState === 'connected' ? '#4caf50' : '#ff9800' }"
        />
        <span class="session-panel__status-text">{{ getConnectionStatusText() }}</span>
      </div>
    </div>

    <div v-if="error" class="session-panel__message session-panel__message--error" role="alert">
      {{ error }}
    </div>

    <div
      v-if="statusMessage"
      class="session-panel__message session-panel__message--success"
      role="status"
    >
      {{ statusMessage }}
    </div>

    <!-- Session code -->
    <div class="session-panel__code-section">
      <span class="session-panel__code-label">Session Code:</span>
      <button
        type="button"
        class="session-panel__code-value"
        title="Click to copy"
        @click="handleCopySessionCode"
      >
        {{ session ? formatSessionCode(session.code) : '---' }}
      </button>
    </div>

    <!-- Participants list -->
    <div class="session-panel__participants">
      <h3 class="session-panel__participants-title">Participants ({{ participants.length }})</h3>
      <ul class="session-panel__participants-list">
        <li
          v-for="participant in participants"
          :key="participant.id"
          class="session-panel__participant"
        >
          <div class="session-panel__participant-info">
            <!-- Avatar/Color indicator -->
            <div
              class="session-panel__participant-avatar"
              :style="{ backgroundColor: participant.color }"
            >
              {{ participant.name.charAt(0).toUpperCase() }}
            </div>

            <!-- Name and status -->
            <div class="session-panel__participant-details">
              <span class="session-panel__participant-name">
                {{ participant.name }}
                <span
                  v-if="participant.id === localParticipant?.id"
                  class="session-panel__participant-you"
                >
                  (you)
                </span>
              </span>
              <span class="session-panel__participant-role">{{ participant.role }}</span>
            </div>

            <!-- Status indicator -->
            <span
              class="session-panel__participant-status"
              :style="{ backgroundColor: getStatusColor(participant.status) }"
              :title="participant.status"
            />
          </div>

          <!-- Actions for owner -->
          <div
            v-if="isSessionOwner && participant.id !== localParticipant?.id"
            class="session-panel__participant-actions"
          >
            <select
              class="session-panel__role-select"
              :value="participant.role"
              :aria-label="`Change role for ${participant.name}`"
              @change="
                handleRoleChange(
                  participant.id,
                  ($event.target as HTMLSelectElement).value as ParticipantRole
                )
              "
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              type="button"
              class="session-panel__kick-btn"
              :title="`Remove ${participant.name}`"
              :aria-label="`Remove ${participant.name}`"
              @click="handleKickParticipant(participant.id)"
            >
              &times;
            </button>
          </div>
        </li>
      </ul>
    </div>

    <!-- Your role info -->
    <div class="session-panel__role-info">
      <span class="session-panel__role-label">Your role:</span>
      <span class="session-panel__role-value">{{ localParticipant?.role || 'unknown' }}</span>
      <span v-if="canEditCubes" class="session-panel__role-badge session-panel__role-badge--edit">
        Can edit
      </span>
    </div>

    <!-- Leave session -->
    <button
      type="button"
      class="session-panel__button session-panel__button--danger session-panel__button--full"
      @click="handleLeaveSession"
    >
      Leave Session
    </button>
  </div>
</template>
