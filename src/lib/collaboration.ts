/**
 * Collaboration module for isocubic
 * Provides session management, action synchronization, and conflict resolution
 */

import type { SpectralCube, FFTCubeConfig } from '../types/cube'
import type {
  Session,
  Participant,
  ParticipantId,
  ParticipantRole,
  ParticipantStatus,
  SessionSettings,
  CollaborativeAction,
  CollaborationState,
  CollaborationConfig,
  ActionResult,
  JoinSessionResult,
  CreateSessionResult,
  CubeCreateAction,
  CubeUpdateAction,
  CubeDeleteAction,
  CubeSelectAction,
  CursorMoveAction,
  CursorPosition,
  ConnectionState,
  SerializableSession,
} from '../types/collaboration'
import {
  DEFAULT_SESSION_SETTINGS,
  DEFAULT_COLLABORATION_CONFIG,
  generateSessionId,
  generateSessionCode,
  generateParticipantId,
  generateParticipantColor,
  generateActionId,
  isCubeModificationAction,
  serializeSession,
  deserializeSession,
} from '../types/collaboration'

// Storage keys for collaboration state
const STORAGE_KEY_SESSION = 'isocubic_collab_session'
const STORAGE_KEY_PARTICIPANT = 'isocubic_collab_participant'
const STORAGE_KEY_PENDING_ACTIONS = 'isocubic_collab_pending'

// ============================================================================
// Collaboration Manager Class
// ============================================================================

/**
 * Event types emitted by CollaborationManager
 */
export type CollaborationEventType =
  | 'session_created'
  | 'session_joined'
  | 'session_left'
  | 'session_updated'
  | 'participant_joined'
  | 'participant_left'
  | 'participant_updated'
  | 'action_received'
  | 'action_applied'
  | 'conflict_resolved'
  | 'connection_changed'
  | 'error'

/**
 * Event data for collaboration events
 */
export interface CollaborationEvent {
  type: CollaborationEventType
  data: unknown
  timestamp: string
}

/**
 * Event listener callback type
 */
export type CollaborationEventListener = (event: CollaborationEvent) => void

/**
 * Manager class for collaborative editing sessions
 * Handles session lifecycle, action synchronization, and conflict resolution
 */
export class CollaborationManager {
  private state: CollaborationState
  private config: CollaborationConfig
  private listeners: Map<CollaborationEventType, Set<CollaborationEventListener>>
  private cursorUpdateTimer: ReturnType<typeof setInterval> | null = null

  constructor(config?: Partial<CollaborationConfig>) {
    this.config = { ...DEFAULT_COLLABORATION_CONFIG, ...config }
    this.listeners = new Map()
    this.state = this.loadState()
  }

  // ==========================================================================
  // State Management
  // ==========================================================================

  /**
   * Gets the current collaboration state
   */
  getState(): Readonly<CollaborationState> {
    return { ...this.state }
  }

  /**
   * Gets the current session (if any)
   */
  getSession(): Session | null {
    return this.state.session ? { ...this.state.session } : null
  }

  /**
   * Gets the local participant
   */
  getLocalParticipant(): Participant | null {
    if (!this.state.session || !this.state.localParticipantId) {
      return null
    }
    return this.state.session.participants.get(this.state.localParticipantId) ?? null
  }

  /**
   * Gets all participants in the current session
   */
  getParticipants(): Participant[] {
    if (!this.state.session) {
      return []
    }
    return Array.from(this.state.session.participants.values())
  }

  /**
   * Gets a specific participant by ID
   */
  getParticipant(id: ParticipantId): Participant | null {
    return this.state.session?.participants.get(id) ?? null
  }

  /**
   * Loads state from localStorage
   */
  private loadState(): CollaborationState {
    try {
      const sessionData = localStorage.getItem(STORAGE_KEY_SESSION)
      const participantId = localStorage.getItem(STORAGE_KEY_PARTICIPANT)
      const pendingData = localStorage.getItem(STORAGE_KEY_PENDING_ACTIONS)

      let session: Session | null = null
      if (sessionData) {
        const parsed = JSON.parse(sessionData) as SerializableSession
        session = deserializeSession(parsed)
      }

      const pendingActions: CollaborativeAction[] = pendingData ? JSON.parse(pendingData) : []

      return {
        session,
        localParticipantId: participantId,
        connectionState: 'disconnected',
        pendingActions,
        lastSyncedActionId: null,
        error: null,
      }
    } catch {
      return {
        session: null,
        localParticipantId: null,
        connectionState: 'disconnected',
        pendingActions: [],
        lastSyncedActionId: null,
        error: null,
      }
    }
  }

  /**
   * Saves state to localStorage
   */
  private saveState(): void {
    try {
      if (this.state.session) {
        const serialized = serializeSession(this.state.session)
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(serialized))
      } else {
        localStorage.removeItem(STORAGE_KEY_SESSION)
      }

      if (this.state.localParticipantId) {
        localStorage.setItem(STORAGE_KEY_PARTICIPANT, this.state.localParticipantId)
      } else {
        localStorage.removeItem(STORAGE_KEY_PARTICIPANT)
      }

      if (this.state.pendingActions.length > 0) {
        localStorage.setItem(STORAGE_KEY_PENDING_ACTIONS, JSON.stringify(this.state.pendingActions))
      } else {
        localStorage.removeItem(STORAGE_KEY_PENDING_ACTIONS)
      }
    } catch {
      // Silently fail for storage errors
    }
  }

  /**
   * Updates connection state
   */
  setConnectionState(state: ConnectionState): void {
    const previousState = this.state.connectionState
    this.state.connectionState = state
    this.emit('connection_changed', { previousState, currentState: state })
  }

  // ==========================================================================
  // Session Management
  // ==========================================================================

  /**
   * Creates a new collaborative session
   */
  createSession(participantName: string, settings?: Partial<SessionSettings>): CreateSessionResult {
    try {
      const sessionId = generateSessionId()
      const sessionCode = generateSessionCode()
      const participantId = generateParticipantId()
      const now = new Date().toISOString()

      const participant: Participant = {
        id: participantId,
        name: participantName,
        color: generateParticipantColor(),
        role: 'owner',
        status: 'online',
        joinedAt: now,
        lastActiveAt: now,
      }

      const session: Session = {
        id: sessionId,
        code: sessionCode,
        settings: { ...DEFAULT_SESSION_SETTINGS, ...settings },
        ownerId: participantId,
        participants: new Map([[participantId, participant]]),
        cubes: new Map(),
        createdAt: now,
        modifiedAt: now,
      }

      this.state.session = session
      this.state.localParticipantId = participantId
      this.state.pendingActions = []
      this.state.error = null

      this.saveState()
      this.emit('session_created', { session, participant })

      return { success: true, session }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      this.state.error = message
      return { success: false, error: message }
    }
  }

  /**
   * Joins an existing session by code
   */
  joinSession(
    sessionCode: string,
    participantName: string,
    existingSession?: Session
  ): JoinSessionResult {
    try {
      // In a real implementation, this would fetch the session from a server
      // For now, we'll use the existingSession parameter for testing
      if (!existingSession) {
        return {
          success: false,
          error: 'Session not found. In production, this would fetch from server.',
        }
      }

      if (existingSession.code !== sessionCode) {
        return { success: false, error: 'Invalid session code' }
      }

      if (!existingSession.settings.isOpen) {
        return { success: false, error: 'Session is closed for new participants' }
      }

      const maxParticipants = existingSession.settings.maxParticipants
      if (maxParticipants > 0 && existingSession.participants.size >= maxParticipants) {
        return { success: false, error: 'Session is full' }
      }

      const participantId = generateParticipantId()
      const now = new Date().toISOString()

      const participant: Participant = {
        id: participantId,
        name: participantName,
        color: generateParticipantColor(),
        role: 'editor',
        status: 'online',
        joinedAt: now,
        lastActiveAt: now,
      }

      existingSession.participants.set(participantId, participant)
      existingSession.modifiedAt = now

      this.state.session = existingSession
      this.state.localParticipantId = participantId
      this.state.pendingActions = []
      this.state.error = null

      this.saveState()
      this.emit('session_joined', { session: existingSession, participant })

      // Emit participant joined action
      this.applyAction({
        id: generateActionId(),
        type: 'participant_join',
        participantId,
        sessionId: existingSession.id,
        timestamp: now,
        payload: { participant },
      })

      return { success: true, session: existingSession, participant }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      this.state.error = message
      return { success: false, error: message }
    }
  }

  /**
   * Leaves the current session
   */
  leaveSession(): void {
    if (!this.state.session || !this.state.localParticipantId) {
      return
    }

    const now = new Date().toISOString()

    // Emit leave action before clearing state
    this.applyAction({
      id: generateActionId(),
      type: 'participant_leave',
      participantId: this.state.localParticipantId,
      sessionId: this.state.session.id,
      timestamp: now,
      payload: { reason: 'manual' },
    })

    this.emit('session_left', {
      sessionId: this.state.session.id,
      participantId: this.state.localParticipantId,
    })

    // Clear cursor update timer
    if (this.cursorUpdateTimer) {
      clearInterval(this.cursorUpdateTimer)
      this.cursorUpdateTimer = null
    }

    // Clear state
    this.state.session = null
    this.state.localParticipantId = null
    this.state.pendingActions = []
    this.state.error = null

    this.saveState()
  }

  /**
   * Updates session settings (owner only)
   */
  updateSessionSettings(settings: Partial<SessionSettings>): ActionResult {
    if (!this.state.session || !this.state.localParticipantId) {
      return { success: false, error: 'Not in a session' }
    }

    const localParticipant = this.state.session.participants.get(this.state.localParticipantId)
    if (!localParticipant || localParticipant.role !== 'owner') {
      return { success: false, error: 'Only the session owner can update settings' }
    }

    const action: CollaborativeAction = {
      id: generateActionId(),
      type: 'session_settings_update',
      participantId: this.state.localParticipantId,
      sessionId: this.state.session.id,
      timestamp: new Date().toISOString(),
      payload: { settings },
    }

    return this.applyAction(action)
  }

  // ==========================================================================
  // Participant Management
  // ==========================================================================

  /**
   * Updates local participant status
   */
  updateParticipantStatus(status: ParticipantStatus): void {
    if (!this.state.session || !this.state.localParticipantId) {
      return
    }

    const participant = this.state.session.participants.get(this.state.localParticipantId)
    if (participant) {
      participant.status = status
      participant.lastActiveAt = new Date().toISOString()
      this.saveState()
      this.emit('participant_updated', { participant })
    }
  }

  /**
   * Updates participant role (owner only)
   */
  updateParticipantRole(participantId: ParticipantId, role: ParticipantRole): boolean {
    if (!this.state.session || !this.state.localParticipantId) {
      return false
    }

    const localParticipant = this.state.session.participants.get(this.state.localParticipantId)
    if (!localParticipant || localParticipant.role !== 'owner') {
      return false
    }

    const targetParticipant = this.state.session.participants.get(participantId)
    if (!targetParticipant) {
      return false
    }

    // Cannot change owner's role or make another owner
    if (targetParticipant.role === 'owner' || role === 'owner') {
      return false
    }

    targetParticipant.role = role
    this.saveState()
    this.emit('participant_updated', { participant: targetParticipant })

    return true
  }

  /**
   * Kicks a participant (owner only)
   */
  kickParticipant(participantId: ParticipantId): boolean {
    if (!this.state.session || !this.state.localParticipantId) {
      return false
    }

    const localParticipant = this.state.session.participants.get(this.state.localParticipantId)
    if (!localParticipant || localParticipant.role !== 'owner') {
      return false
    }

    const targetParticipant = this.state.session.participants.get(participantId)
    if (!targetParticipant || targetParticipant.role === 'owner') {
      return false // Cannot kick owner
    }

    this.state.session.participants.delete(participantId)
    this.saveState()
    this.emit('participant_left', {
      participant: targetParticipant,
      reason: 'kicked',
    })

    return true
  }

  // ==========================================================================
  // Cursor Management
  // ==========================================================================

  /**
   * Updates the local participant's cursor position
   */
  updateCursor(position: CursorPosition): ActionResult {
    if (!this.state.session || !this.state.localParticipantId) {
      return { success: false, error: 'Not in a session' }
    }

    const action: CursorMoveAction = {
      id: generateActionId(),
      type: 'cursor_move',
      participantId: this.state.localParticipantId,
      sessionId: this.state.session.id,
      timestamp: new Date().toISOString(),
      payload: { position },
    }

    return this.applyAction(action)
  }

  /**
   * Starts periodic cursor updates
   */
  startCursorTracking(getCursorPosition: () => CursorPosition | null): void {
    this.stopCursorTracking()

    this.cursorUpdateTimer = setInterval(() => {
      const position = getCursorPosition()
      if (position) {
        this.updateCursor(position)
      }
    }, this.config.cursorUpdateInterval)
  }

  /**
   * Stops periodic cursor updates
   */
  stopCursorTracking(): void {
    if (this.cursorUpdateTimer) {
      clearInterval(this.cursorUpdateTimer)
      this.cursorUpdateTimer = null
    }
  }

  // ==========================================================================
  // Cube Operations
  // ==========================================================================

  /**
   * Creates a new cube in the session
   */
  createCube(cube: SpectralCube | FFTCubeConfig): ActionResult {
    if (!this.state.session || !this.state.localParticipantId) {
      return { success: false, error: 'Not in a session' }
    }

    const action: CubeCreateAction = {
      id: generateActionId(),
      type: 'cube_create',
      participantId: this.state.localParticipantId,
      sessionId: this.state.session.id,
      timestamp: new Date().toISOString(),
      payload: { cube },
    }

    return this.applyAction(action)
  }

  /**
   * Updates an existing cube
   */
  updateCube(cubeId: string, changes: Partial<SpectralCube | FFTCubeConfig>): ActionResult {
    if (!this.state.session || !this.state.localParticipantId) {
      return { success: false, error: 'Not in a session' }
    }

    const existingCube = this.state.session.cubes.get(cubeId)
    if (!existingCube) {
      return { success: false, error: 'Cube not found' }
    }

    const action: CubeUpdateAction = {
      id: generateActionId(),
      type: 'cube_update',
      participantId: this.state.localParticipantId,
      sessionId: this.state.session.id,
      timestamp: new Date().toISOString(),
      payload: {
        cubeId,
        changes,
        previousState: existingCube,
      },
    }

    return this.applyAction(action)
  }

  /**
   * Deletes a cube
   */
  deleteCube(cubeId: string): ActionResult {
    if (!this.state.session || !this.state.localParticipantId) {
      return { success: false, error: 'Not in a session' }
    }

    const existingCube = this.state.session.cubes.get(cubeId)
    if (!existingCube) {
      return { success: false, error: 'Cube not found' }
    }

    const action: CubeDeleteAction = {
      id: generateActionId(),
      type: 'cube_delete',
      participantId: this.state.localParticipantId,
      sessionId: this.state.session.id,
      timestamp: new Date().toISOString(),
      payload: {
        cubeId,
        deletedCube: existingCube,
      },
    }

    return this.applyAction(action)
  }

  /**
   * Selects a cube
   */
  selectCube(cubeId: string | null): ActionResult {
    if (!this.state.session || !this.state.localParticipantId) {
      return { success: false, error: 'Not in a session' }
    }

    const action: CubeSelectAction = {
      id: generateActionId(),
      type: 'cube_select',
      participantId: this.state.localParticipantId,
      sessionId: this.state.session.id,
      timestamp: new Date().toISOString(),
      payload: { cubeId },
    }

    return this.applyAction(action)
  }

  /**
   * Gets all cubes in the session
   */
  getCubes(): (SpectralCube | FFTCubeConfig)[] {
    if (!this.state.session) {
      return []
    }
    return Array.from(this.state.session.cubes.values())
  }

  /**
   * Gets a specific cube by ID
   */
  getCube(cubeId: string): SpectralCube | FFTCubeConfig | null {
    return this.state.session?.cubes.get(cubeId) ?? null
  }

  // ==========================================================================
  // Action Processing
  // ==========================================================================

  /**
   * Applies an action to the local state
   */
  applyAction(action: CollaborativeAction): ActionResult {
    if (!this.state.session) {
      return { success: false, error: 'Not in a session' }
    }

    try {
      // Apply the action to local state (optimistic update)
      this.processAction(action)

      // Add to pending actions for synchronization
      if (this.config.enableOptimisticUpdates && isCubeModificationAction(action)) {
        this.state.pendingActions.push(action)

        // Limit pending actions
        if (this.state.pendingActions.length > this.config.maxPendingActions) {
          this.state.pendingActions.shift()
        }
      }

      this.saveState()
      this.emit('action_applied', { action })

      return { success: true, action, optimistic: this.config.enableOptimisticUpdates }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  /**
   * Receives and processes an action from another participant
   */
  receiveAction(action: CollaborativeAction): ActionResult {
    if (!this.state.session) {
      return { success: false, error: 'Not in a session' }
    }

    // Check for conflicts with pending actions
    const conflictingAction = this.findConflictingAction(action)
    if (conflictingAction) {
      const resolvedAction = this.resolveConflict(action, conflictingAction)
      this.emit('conflict_resolved', {
        incoming: action,
        pending: conflictingAction,
        resolved: resolvedAction,
      })
      action = resolvedAction
    }

    try {
      this.processAction(action)
      this.state.lastSyncedActionId = action.id
      this.saveState()
      this.emit('action_received', { action })

      return { success: true, action }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  /**
   * Processes an action and updates the session state
   */
  private processAction(action: CollaborativeAction): void {
    if (!this.state.session) {
      return
    }

    const now = new Date().toISOString()
    this.state.session.modifiedAt = now

    switch (action.type) {
      case 'cube_create': {
        const { cube } = action.payload
        this.state.session.cubes.set(cube.id, cube)
        break
      }

      case 'cube_update': {
        const { cubeId, changes } = action.payload
        const existingCube = this.state.session.cubes.get(cubeId)
        if (existingCube) {
          const updatedCube = { ...existingCube, ...changes } as SpectralCube | FFTCubeConfig
          this.state.session.cubes.set(cubeId, updatedCube)
        }
        break
      }

      case 'cube_delete': {
        const { cubeId } = action.payload
        this.state.session.cubes.delete(cubeId)
        break
      }

      case 'cube_select': {
        const participant = this.state.session.participants.get(action.participantId)
        if (participant && participant.cursor) {
          participant.cursor.selectedCubeId = action.payload.cubeId ?? undefined
        }
        break
      }

      case 'cursor_move': {
        const participant = this.state.session.participants.get(action.participantId)
        if (participant) {
          participant.cursor = action.payload.position
          participant.lastActiveAt = now
        }
        break
      }

      case 'participant_join': {
        const { participant } = action.payload
        this.state.session.participants.set(participant.id, participant)
        this.emit('participant_joined', { participant })
        break
      }

      case 'participant_leave': {
        const participant = this.state.session.participants.get(action.participantId)
        if (participant) {
          this.state.session.participants.delete(action.participantId)
          this.emit('participant_left', {
            participant,
            reason: action.payload.reason,
          })
        }
        break
      }

      case 'session_settings_update': {
        const { settings } = action.payload
        this.state.session.settings = { ...this.state.session.settings, ...settings }
        this.emit('session_updated', { session: this.state.session })
        break
      }
    }
  }

  /**
   * Finds a conflicting action in the pending queue
   */
  private findConflictingAction(incoming: CollaborativeAction): CollaborativeAction | null {
    if (!isCubeModificationAction(incoming)) {
      return null
    }

    for (const pending of this.state.pendingActions) {
      if (!isCubeModificationAction(pending)) {
        continue
      }

      // Check if actions affect the same cube
      if (incoming.type === 'cube_update' && pending.type === 'cube_update') {
        if (incoming.payload.cubeId === pending.payload.cubeId) {
          return pending
        }
      }

      if (incoming.type === 'cube_delete' && pending.type === 'cube_update') {
        if (incoming.payload.cubeId === pending.payload.cubeId) {
          return pending
        }
      }

      if (incoming.type === 'cube_update' && pending.type === 'cube_delete') {
        if (incoming.payload.cubeId === pending.payload.cubeId) {
          return pending
        }
      }
    }

    return null
  }

  /**
   * Resolves a conflict between two actions
   */
  private resolveConflict(
    incoming: CollaborativeAction,
    pending: CollaborativeAction
  ): CollaborativeAction {
    switch (this.config.conflictResolution) {
      case 'last_write_wins':
        // Compare timestamps, latest wins
        if (incoming.timestamp > pending.timestamp) {
          // Remove pending action
          this.state.pendingActions = this.state.pendingActions.filter((a) => a.id !== pending.id)
          return incoming
        } else {
          // Keep pending, ignore incoming
          return pending
        }

      case 'first_write_wins':
        // Keep whichever came first
        if (pending.timestamp < incoming.timestamp) {
          return pending
        } else {
          this.state.pendingActions = this.state.pendingActions.filter((a) => a.id !== pending.id)
          return incoming
        }

      case 'merge':
        // For cube updates, try to merge changes
        if (incoming.type === 'cube_update' && pending.type === 'cube_update') {
          const mergedChanges = {
            ...pending.payload.changes,
            ...incoming.payload.changes,
          }
          const mergedAction: CubeUpdateAction = {
            ...incoming,
            payload: {
              ...incoming.payload,
              changes: mergedChanges,
            },
          }
          this.state.pendingActions = this.state.pendingActions.filter((a) => a.id !== pending.id)
          return mergedAction
        }
        // For other conflicts, fallback to last_write_wins
        if (incoming.timestamp > pending.timestamp) {
          this.state.pendingActions = this.state.pendingActions.filter((a) => a.id !== pending.id)
          return incoming
        }
        return pending

      default:
        return incoming
    }
  }

  /**
   * Clears pending actions that have been confirmed synced
   */
  confirmSyncedActions(syncedActionIds: string[]): void {
    this.state.pendingActions = this.state.pendingActions.filter(
      (action) => !syncedActionIds.includes(action.id)
    )
    this.saveState()
  }

  /**
   * Gets pending actions for synchronization
   */
  getPendingActions(): CollaborativeAction[] {
    return [...this.state.pendingActions]
  }

  // ==========================================================================
  // Event System
  // ==========================================================================

  /**
   * Adds an event listener
   */
  on(type: CollaborationEventType, listener: CollaborationEventListener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)!.add(listener)
  }

  /**
   * Removes an event listener
   */
  off(type: CollaborationEventType, listener: CollaborationEventListener): void {
    this.listeners.get(type)?.delete(listener)
  }

  /**
   * Emits an event to all listeners
   */
  private emit(type: CollaborationEventType, data: unknown): void {
    const event: CollaborationEvent = {
      type,
      data,
      timestamp: new Date().toISOString(),
    }

    this.listeners.get(type)?.forEach((listener) => {
      try {
        listener(event)
      } catch {
        // Ignore listener errors
      }
    })
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Cleans up resources and leaves the session
   */
  dispose(): void {
    this.leaveSession()
    this.listeners.clear()
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a new CollaborationManager instance
 */
export function createCollaborationManager(
  config?: Partial<CollaborationConfig>
): CollaborationManager {
  return new CollaborationManager(config)
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Checks if a participant can edit cubes
 */
export function canEdit(participant: Participant | null): boolean {
  if (!participant) return false
  return participant.role === 'owner' || participant.role === 'editor'
}

/**
 * Checks if a participant is the session owner
 */
export function isOwner(participant: Participant | null): boolean {
  if (!participant) return false
  return participant.role === 'owner'
}

/**
 * Formats a session code for display (e.g., "ABC123" -> "ABC-123")
 */
export function formatSessionCode(code: string): string {
  if (code.length === 6) {
    return `${code.slice(0, 3)}-${code.slice(3)}`
  }
  return code
}

/**
 * Parses a formatted session code back to raw code
 */
export function parseSessionCode(formattedCode: string): string {
  return formattedCode.replace(/-/g, '').toUpperCase()
}

// ============================================================================
// WebSocket-Enabled Collaboration Manager
// ============================================================================

import {
  WebSocketClient,
  RealtimeClient,
  createWebSocketClient,
  createRealtimeClient,
} from './websocket-client'
import type {
  WebSocketClientConfig,
  IncomingMessage,
  SyncActionMessage,
  FullSyncMessage,
  PresenceUpdateMessage,
} from '../types/websocket'
import type { RealtimeClientConfig } from './websocket-client'

/**
 * Configuration for networked collaboration
 */
export interface NetworkedCollaborationConfig extends CollaborationConfig {
  /** WebSocket configuration */
  websocket?: Partial<WebSocketClientConfig>
  /** Realtime client configuration */
  realtime?: Partial<RealtimeClientConfig>
  /** Whether to use unified realtime client (with fallback) */
  useRealtimeClient?: boolean
  /** Auto-sync actions to server */
  autoSyncActions?: boolean
  /** Sync debounce delay (ms) */
  syncDebounceDelay?: number
}

/**
 * Default networked collaboration configuration
 */
export const DEFAULT_NETWORKED_CONFIG: Partial<NetworkedCollaborationConfig> = {
  useRealtimeClient: true,
  autoSyncActions: true,
  syncDebounceDelay: 100,
}

/**
 * Extended CollaborationManager with WebSocket support
 * Provides real-time synchronization capabilities
 */
export class NetworkedCollaborationManager extends CollaborationManager {
  private networkConfig: NetworkedCollaborationConfig
  private wsClient: WebSocketClient | null = null
  private realtimeClient: RealtimeClient | null = null
  private syncDebounceTimer: ReturnType<typeof setTimeout> | null = null

  constructor(config?: Partial<NetworkedCollaborationConfig>) {
    super(config)
    this.networkConfig = {
      ...DEFAULT_COLLABORATION_CONFIG,
      ...DEFAULT_NETWORKED_CONFIG,
      ...config,
    }
  }

  // ==========================================================================
  // Connection Management
  // ==========================================================================

  /**
   * Connects to the WebSocket server
   */
  async connect(serverUrl?: string): Promise<void> {
    if (this.networkConfig.useRealtimeClient) {
      this.realtimeClient = createRealtimeClient(this.networkConfig.realtime)
      this.setupRealtimeListeners()

      const session = this.getSession()
      const localParticipantId = this.getState().localParticipantId

      if (session && localParticipantId) {
        await this.realtimeClient.connect(session.id, localParticipantId, serverUrl)
        this.setConnectionState('connected')
      } else {
        throw new Error('Must be in a session to connect')
      }
    } else {
      this.wsClient = createWebSocketClient(this.networkConfig.websocket)
      this.setupWebSocketListeners()
      await this.wsClient.connect(serverUrl)
      this.setConnectionState('connected')
    }
  }

  /**
   * Disconnects from the server
   */
  disconnect(): void {
    if (this.realtimeClient) {
      this.realtimeClient.disconnect()
      this.realtimeClient = null
    }
    if (this.wsClient) {
      this.wsClient.disconnect()
      this.wsClient = null
    }
    this.setConnectionState('disconnected')
  }

  /**
   * Checks if connected to server
   */
  isConnected(): boolean {
    if (this.realtimeClient) {
      return this.realtimeClient.isConnected()
    }
    if (this.wsClient) {
      return this.wsClient.isConnected()
    }
    return false
  }

  /**
   * Gets the current latency (WebSocket only)
   */
  getLatency(): number {
    return this.wsClient?.getLatency() ?? 0
  }

  // ==========================================================================
  // WebSocket Event Handlers
  // ==========================================================================

  /**
   * Sets up WebSocket event listeners
   */
  private setupWebSocketListeners(): void {
    if (!this.wsClient) return

    // Handle connection state changes
    this.wsClient.on('state_changed', (event) => {
      const data = event.data as { previousState: string; currentState: string }
      this.setConnectionState(data.currentState as ConnectionState)
    })

    // Handle incoming sync actions
    this.wsClient.onMessage('sync_action', (event) => {
      const message = event.data as SyncActionMessage
      this.handleRemoteAction(message.payload.action)
    })

    // Handle full sync responses
    this.wsClient.onMessage('full_sync', (event) => {
      const message = event.data as FullSyncMessage
      if (message.payload.requestType === 'response' && message.payload.session) {
        this.handleFullSync(message)
      }
    })

    // Handle presence updates
    this.wsClient.onMessage('presence_update', (event) => {
      const message = event.data as PresenceUpdateMessage
      this.handlePresenceUpdate(message)
    })

    // Handle reconnection
    this.wsClient.on('reconnected', () => {
      this.requestFullSync()
    })
  }

  /**
   * Sets up realtime client event listeners
   */
  private setupRealtimeListeners(): void {
    if (!this.realtimeClient) return

    this.realtimeClient.on('state_changed', (event) => {
      const data = event.data as { previousState: string; currentState: string }
      this.setConnectionState(data.currentState as ConnectionState)
    })

    this.realtimeClient.on('message', (event) => {
      const message = event.data as IncomingMessage
      this.handleIncomingMessage(message)
    })

    this.realtimeClient.on('reconnected', () => {
      this.requestFullSync()
    })
  }

  /**
   * Handles incoming messages
   */
  private handleIncomingMessage(message: IncomingMessage): void {
    switch (message.type) {
      case 'sync_action':
        this.handleRemoteAction((message as SyncActionMessage).payload.action)
        break
      case 'full_sync':
        if ((message as FullSyncMessage).payload.requestType === 'response') {
          this.handleFullSync(message as FullSyncMessage)
        }
        break
      case 'presence_update':
        this.handlePresenceUpdate(message as PresenceUpdateMessage)
        break
    }
  }

  /**
   * Handles a remote action from another participant
   */
  private handleRemoteAction(action: CollaborativeAction): void {
    // Don't apply our own actions
    if (action.participantId === this.getState().localParticipantId) {
      return
    }
    this.receiveAction(action)
  }

  /**
   * Handles full sync response
   */
  private handleFullSync(message: FullSyncMessage): void {
    if (!message.payload.session) return

    const session = deserializeSession(message.payload.session)

    // Update local state with server state
    // This is a simplified version - in production you'd want to merge states
    const state = this.getState()
    if (state.session && state.session.id === session.id) {
      // Preserve local participant
      const localParticipant = state.session.participants.get(state.localParticipantId!)
      if (localParticipant) {
        session.participants.set(state.localParticipantId!, localParticipant)
      }
    }
  }

  /**
   * Handles presence update
   */
  private handlePresenceUpdate(message: PresenceUpdateMessage): void {
    const { participantId, status, cursor } = message.payload

    // Don't update our own presence from server
    if (participantId === this.getState().localParticipantId) {
      return
    }

    const session = this.getSession()
    if (!session) return

    const participant = session.participants.get(participantId)
    if (!participant) return

    if (status) {
      participant.status = status
    }
    if (cursor) {
      participant.cursor = cursor
    }
    participant.lastActiveAt = new Date().toISOString()
  }

  // ==========================================================================
  // Sync Operations
  // ==========================================================================

  /**
   * Requests full state synchronization from server
   */
  requestFullSync(): void {
    const session = this.getSession()
    if (!session) return

    if (this.wsClient?.isConnected()) {
      this.wsClient.requestFullSync(session.id)
    }
  }

  /**
   * Syncs an action to the server
   */
  async syncAction(action: CollaborativeAction): Promise<void> {
    const session = this.getSession()
    if (!session) return

    if (this.wsClient?.isConnected()) {
      try {
        await this.wsClient.syncAction(action, session.id)
        this.confirmSyncedActions([action.id])
      } catch (error) {
        console.error('Failed to sync action:', error)
      }
    } else if (this.realtimeClient?.isConnected()) {
      const pollingClient = this.realtimeClient.getPollingClient()
      if (pollingClient) {
        try {
          await pollingClient.sendAction(action)
          this.confirmSyncedActions([action.id])
        } catch (error) {
          console.error('Failed to sync action via polling:', error)
        }
      }
    }
  }

  /**
   * Syncs pending actions with debouncing
   */
  private scheduleSyncPendingActions(): void {
    if (!this.networkConfig.autoSyncActions) return

    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer)
    }

    this.syncDebounceTimer = setTimeout(() => {
      this.syncPendingActions()
    }, this.networkConfig.syncDebounceDelay)
  }

  /**
   * Syncs all pending actions
   */
  private async syncPendingActions(): Promise<void> {
    const pending = this.getPendingActions()
    for (const action of pending) {
      await this.syncAction(action)
    }
  }

  /**
   * Updates presence on server
   */
  updatePresenceOnServer(): void {
    const session = this.getSession()
    const localParticipantId = this.getState().localParticipantId
    const localParticipant = this.getLocalParticipant()

    if (!session || !localParticipantId || !localParticipant) return

    if (this.wsClient?.isConnected()) {
      this.wsClient.updatePresence(
        session.id,
        localParticipantId,
        localParticipant.status,
        localParticipant.cursor
      )
    } else if (this.realtimeClient?.isConnected()) {
      const pollingClient = this.realtimeClient.getPollingClient()
      if (pollingClient) {
        pollingClient
          .updatePresence(localParticipant.status, localParticipant.cursor)
          .catch(console.error)
      }
    }
  }

  // ==========================================================================
  // Overrides with Auto-Sync
  // ==========================================================================

  /**
   * Applies an action and optionally syncs to server
   */
  override applyAction(action: CollaborativeAction): ActionResult {
    const result = super.applyAction(action)

    if (result.success && this.networkConfig.autoSyncActions && this.isConnected()) {
      this.scheduleSyncPendingActions()
    }

    return result
  }

  /**
   * Updates cursor and syncs to server
   */
  override updateCursor(position: CursorPosition): ActionResult {
    const result = super.updateCursor(position)

    if (result.success && this.isConnected()) {
      this.updatePresenceOnServer()
    }

    return result
  }

  /**
   * Updates participant status and syncs to server
   */
  override updateParticipantStatus(status: ParticipantStatus): void {
    super.updateParticipantStatus(status)

    if (this.isConnected()) {
      this.updatePresenceOnServer()
    }
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Cleans up resources
   */
  override dispose(): void {
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer)
      this.syncDebounceTimer = null
    }
    this.disconnect()
    super.dispose()
  }
}

/**
 * Creates a new networked collaboration manager
 */
export function createNetworkedCollaborationManager(
  config?: Partial<NetworkedCollaborationConfig>
): NetworkedCollaborationManager {
  return new NetworkedCollaborationManager(config)
}
