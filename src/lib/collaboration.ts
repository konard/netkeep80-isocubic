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
  private actionQueue: CollaborativeAction[]
  private cursorUpdateTimer: ReturnType<typeof setInterval> | null = null

  constructor(config?: Partial<CollaborationConfig>) {
    this.config = { ...DEFAULT_COLLABORATION_CONFIG, ...config }
    this.listeners = new Map()
    this.actionQueue = []
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
    this.actionQueue = []
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
