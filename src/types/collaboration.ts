/**
 * TypeScript types for collaborative editing
 * Provides types for multiplayer sessions, participants, and real-time synchronization
 */

import type { SpectralCube, FFTCubeConfig } from './cube'

// ============================================================================
// Session Types
// ============================================================================

/** Unique identifier for a session */
export type SessionId = string

/** Unique identifier for a participant */
export type ParticipantId = string

/** Role of a participant in a session */
export type ParticipantRole = 'owner' | 'editor' | 'viewer'

/** Current status of a participant */
export type ParticipantStatus = 'online' | 'away' | 'offline'

/** Connection state of the collaboration system */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

/** Type of collaborative action */
export type ActionType =
  | 'cube_create'
  | 'cube_update'
  | 'cube_delete'
  | 'cube_select'
  | 'cursor_move'
  | 'participant_join'
  | 'participant_leave'
  | 'session_settings_update'

/**
 * Cursor position in 3D space
 */
export interface CursorPosition {
  /** X coordinate */
  x: number
  /** Y coordinate */
  y: number
  /** Z coordinate */
  z: number
  /** Currently selected cube ID (if any) */
  selectedCubeId?: string
}

/**
 * Participant in a collaborative session
 */
export interface Participant {
  /** Unique identifier */
  id: ParticipantId
  /** Display name */
  name: string
  /** Assigned color for cursors and highlights */
  color: string
  /** Role in the session */
  role: ParticipantRole
  /** Current status */
  status: ParticipantStatus
  /** Current cursor position */
  cursor?: CursorPosition
  /** Avatar URL (optional) */
  avatarUrl?: string
  /** Timestamp of when participant joined */
  joinedAt: string
  /** Timestamp of last activity */
  lastActiveAt: string
}

/**
 * Session settings that can be modified by owner
 */
export interface SessionSettings {
  /** Session name for display */
  name: string
  /** Whether new participants can join */
  isOpen: boolean
  /** Maximum number of participants (0 = unlimited) */
  maxParticipants: number
  /** Whether viewers can request editor role */
  allowRoleRequests: boolean
  /** Auto-save interval in milliseconds (0 = disabled) */
  autoSaveInterval: number
}

/**
 * Collaborative session state
 */
export interface Session {
  /** Unique session identifier */
  id: SessionId
  /** Session code for joining (short alphanumeric) */
  code: string
  /** Session settings */
  settings: SessionSettings
  /** Participant who created the session */
  ownerId: ParticipantId
  /** All participants in the session */
  participants: Map<ParticipantId, Participant>
  /** Cubes being edited in this session */
  cubes: Map<string, SpectralCube | FFTCubeConfig>
  /** Timestamp of session creation */
  createdAt: string
  /** Timestamp of last modification */
  modifiedAt: string
}

/**
 * Serializable version of Session for storage/transmission
 */
export interface SerializableSession {
  id: SessionId
  code: string
  settings: SessionSettings
  ownerId: ParticipantId
  participants: [ParticipantId, Participant][]
  cubes: [string, SpectralCube | FFTCubeConfig][]
  createdAt: string
  modifiedAt: string
}

// ============================================================================
// Action Types for Synchronization
// ============================================================================

/**
 * Base interface for all collaborative actions
 */
export interface BaseAction {
  /** Unique action identifier */
  id: string
  /** Type of action */
  type: ActionType
  /** ID of participant who performed the action */
  participantId: ParticipantId
  /** Timestamp when action was created */
  timestamp: string
  /** Session this action belongs to */
  sessionId: SessionId
}

/**
 * Action to create a new cube
 */
export interface CubeCreateAction extends BaseAction {
  type: 'cube_create'
  payload: {
    cube: SpectralCube | FFTCubeConfig
  }
}

/**
 * Action to update an existing cube
 */
export interface CubeUpdateAction extends BaseAction {
  type: 'cube_update'
  payload: {
    cubeId: string
    changes: Partial<SpectralCube | FFTCubeConfig>
    /** Previous state for conflict resolution */
    previousState?: SpectralCube | FFTCubeConfig
  }
}

/**
 * Action to delete a cube
 */
export interface CubeDeleteAction extends BaseAction {
  type: 'cube_delete'
  payload: {
    cubeId: string
    /** Deleted cube for undo capability */
    deletedCube?: SpectralCube | FFTCubeConfig
  }
}

/**
 * Action to select a cube
 */
export interface CubeSelectAction extends BaseAction {
  type: 'cube_select'
  payload: {
    cubeId: string | null
  }
}

/**
 * Action to update cursor position
 */
export interface CursorMoveAction extends BaseAction {
  type: 'cursor_move'
  payload: {
    position: CursorPosition
  }
}

/**
 * Action when participant joins session
 */
export interface ParticipantJoinAction extends BaseAction {
  type: 'participant_join'
  payload: {
    participant: Participant
  }
}

/**
 * Action when participant leaves session
 */
export interface ParticipantLeaveAction extends BaseAction {
  type: 'participant_leave'
  payload: {
    reason?: 'manual' | 'timeout' | 'kicked'
  }
}

/**
 * Action to update session settings
 */
export interface SessionSettingsUpdateAction extends BaseAction {
  type: 'session_settings_update'
  payload: {
    settings: Partial<SessionSettings>
  }
}

/**
 * Union type of all collaborative actions
 */
export type CollaborativeAction =
  | CubeCreateAction
  | CubeUpdateAction
  | CubeDeleteAction
  | CubeSelectAction
  | CursorMoveAction
  | ParticipantJoinAction
  | ParticipantLeaveAction
  | SessionSettingsUpdateAction

// ============================================================================
// State Management Types
// ============================================================================

/**
 * State of the collaboration module
 */
export interface CollaborationState {
  /** Current session (null if not in a session) */
  session: Session | null
  /** Current participant's ID */
  localParticipantId: ParticipantId | null
  /** Connection state */
  connectionState: ConnectionState
  /** Pending actions waiting to be synchronized */
  pendingActions: CollaborativeAction[]
  /** Last synchronized action ID */
  lastSyncedActionId: string | null
  /** Error message (if any) */
  error: string | null
}

/**
 * Result of joining a session
 */
export interface JoinSessionResult {
  success: boolean
  session?: Session
  participant?: Participant
  error?: string
}

/**
 * Result of creating a session
 */
export interface CreateSessionResult {
  success: boolean
  session?: Session
  error?: string
}

/**
 * Result of applying an action
 */
export interface ActionResult {
  success: boolean
  action?: CollaborativeAction
  error?: string
  /** Whether the action was applied optimistically */
  optimistic?: boolean
}

/**
 * Conflict resolution strategy
 */
export type ConflictResolutionStrategy = 'last_write_wins' | 'first_write_wins' | 'merge'

/**
 * Configuration for the collaboration module
 */
export interface CollaborationConfig {
  /** How to resolve conflicts */
  conflictResolution: ConflictResolutionStrategy
  /** Timeout for offline actions before discard (ms) */
  offlineActionTimeout: number
  /** Maximum number of pending actions */
  maxPendingActions: number
  /** Interval for cursor position updates (ms) */
  cursorUpdateInterval: number
  /** Whether to enable optimistic updates */
  enableOptimisticUpdates: boolean
}

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default session settings
 */
export const DEFAULT_SESSION_SETTINGS: SessionSettings = {
  name: 'Untitled Session',
  isOpen: true,
  maxParticipants: 10,
  allowRoleRequests: true,
  autoSaveInterval: 30000, // 30 seconds
}

/**
 * Default collaboration configuration
 */
export const DEFAULT_COLLABORATION_CONFIG: CollaborationConfig = {
  conflictResolution: 'last_write_wins',
  offlineActionTimeout: 300000, // 5 minutes
  maxPendingActions: 100,
  cursorUpdateInterval: 50, // 20 updates per second
  enableOptimisticUpdates: true,
}

/**
 * Generates a random color for a participant
 */
export function generateParticipantColor(): string {
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#96CEB4', // Green
    '#FFEAA7', // Yellow
    '#DDA0DD', // Plum
    '#98D8C8', // Mint
    '#F7DC6F', // Gold
    '#BB8FCE', // Purple
    '#85C1E9', // Sky blue
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

/**
 * Generates a random session code
 * Excludes ambiguous characters: 0, O, 1, I, L
 */
export function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

/**
 * Generates a random action ID
 */
export function generateActionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Generates a random participant ID
 */
export function generateParticipantId(): string {
  return `p-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Generates a random session ID
 */
export function generateSessionId(): string {
  return `s-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if action is a cube modification action
 */
export function isCubeModificationAction(
  action: CollaborativeAction
): action is CubeCreateAction | CubeUpdateAction | CubeDeleteAction {
  return ['cube_create', 'cube_update', 'cube_delete'].includes(action.type)
}

/**
 * Type guard to check if action is a presence action
 */
export function isPresenceAction(
  action: CollaborativeAction
): action is CursorMoveAction | ParticipantJoinAction | ParticipantLeaveAction {
  return ['cursor_move', 'participant_join', 'participant_leave'].includes(action.type)
}

/**
 * Converts a Session to its serializable form
 */
export function serializeSession(session: Session): SerializableSession {
  return {
    id: session.id,
    code: session.code,
    settings: session.settings,
    ownerId: session.ownerId,
    participants: Array.from(session.participants.entries()),
    cubes: Array.from(session.cubes.entries()),
    createdAt: session.createdAt,
    modifiedAt: session.modifiedAt,
  }
}

/**
 * Converts a SerializableSession back to a Session
 */
export function deserializeSession(serializable: SerializableSession): Session {
  return {
    id: serializable.id,
    code: serializable.code,
    settings: serializable.settings,
    ownerId: serializable.ownerId,
    participants: new Map(serializable.participants),
    cubes: new Map(serializable.cubes),
    createdAt: serializable.createdAt,
    modifiedAt: serializable.modifiedAt,
  }
}
