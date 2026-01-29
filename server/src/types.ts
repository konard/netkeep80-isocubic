/**
 * Server-side types for isocubic collaborative editing
 * These types mirror the client-side types but are adapted for server use
 */

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

/**
 * Cursor position in 3D space
 */
export interface CursorPosition {
  x: number
  y: number
  z: number
  selectedCubeId?: string
}

/**
 * Participant in a collaborative session
 */
export interface Participant {
  id: ParticipantId
  name: string
  color: string
  role: ParticipantRole
  status: ParticipantStatus
  cursor?: CursorPosition
  avatarUrl?: string
  joinedAt: string
  lastActiveAt: string
}

/**
 * Session settings that can be modified by owner
 */
export interface SessionSettings {
  name: string
  isOpen: boolean
  maxParticipants: number
  allowRoleRequests: boolean
  autoSaveInterval: number
}

/**
 * Serializable session state for storage and transmission
 */
export interface SerializableSession {
  id: SessionId
  code: string
  settings: SessionSettings
  ownerId: ParticipantId
  participants: [ParticipantId, Participant][]
  cubes: [string, unknown][]
  createdAt: string
  modifiedAt: string
}

/**
 * Server-side session with additional metadata
 */
export interface ServerSession extends SerializableSession {
  /** JWT token for authentication */
  authToken?: string
  /** Session expiration timestamp */
  expiresAt?: string
}

// ============================================================================
// Action Types
// ============================================================================

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
 * Base interface for all collaborative actions
 */
export interface CollaborativeAction {
  id: string
  type: ActionType
  participantId: ParticipantId
  timestamp: string
  sessionId: SessionId
  payload: unknown
}

// ============================================================================
// WebSocket Message Types
// ============================================================================

/** Type of WebSocket message */
export type WebSocketMessageType =
  | 'join_session'
  | 'leave_session'
  | 'sync_action'
  | 'full_sync'
  | 'presence_update'
  | 'heartbeat'
  | 'error'
  | 'ack'

/** Base interface for all WebSocket messages */
export interface BaseWebSocketMessage {
  id: string
  type: WebSocketMessageType
  timestamp: string
}

/** Message to join a session */
export interface JoinSessionMessage extends BaseWebSocketMessage {
  type: 'join_session'
  payload: {
    sessionCode: string
    participantName: string
    participantId?: ParticipantId
    /** Optional JWT token for authentication */
    authToken?: string
  }
}

/** Response to join session request */
export interface JoinSessionResponse extends BaseWebSocketMessage {
  type: 'join_session'
  payload: {
    success: boolean
    session?: SerializableSession
    participant?: Participant
    /** JWT token for subsequent requests */
    authToken?: string
    error?: string
  }
}

/** Message to leave a session */
export interface LeaveSessionMessage extends BaseWebSocketMessage {
  type: 'leave_session'
  payload: {
    sessionId: SessionId
    participantId: ParticipantId
    reason?: 'manual' | 'timeout' | 'kicked'
  }
}

/** Response to leave session request */
export interface LeaveSessionResponse extends BaseWebSocketMessage {
  type: 'leave_session'
  payload: {
    success: boolean
    error?: string
  }
}

/** Message to synchronize an action */
export interface SyncActionMessage extends BaseWebSocketMessage {
  type: 'sync_action'
  payload: {
    action: CollaborativeAction
    sessionId: SessionId
  }
}

/** Response to sync action request */
export interface SyncActionResponse extends BaseWebSocketMessage {
  type: 'sync_action'
  payload: {
    success: boolean
    actionId: string
    error?: string
  }
}

/** Message for full state synchronization */
export interface FullSyncMessage extends BaseWebSocketMessage {
  type: 'full_sync'
  payload: {
    sessionId: SessionId
    requestType: 'request' | 'response'
    session?: SerializableSession
  }
}

/** Message for presence updates */
export interface PresenceUpdateMessage extends BaseWebSocketMessage {
  type: 'presence_update'
  payload: {
    sessionId: SessionId
    participantId: ParticipantId
    status?: ParticipantStatus
    cursor?: CursorPosition
  }
}

/** Heartbeat message */
export interface HeartbeatMessage extends BaseWebSocketMessage {
  type: 'heartbeat'
  payload: {
    clientTime: string
    sessionId?: SessionId
    participantId?: ParticipantId
  }
}

/** Heartbeat response */
export interface HeartbeatResponse extends BaseWebSocketMessage {
  type: 'heartbeat'
  payload: {
    serverTime: string
    latency?: number
  }
}

/** Error message */
export interface ErrorMessage extends BaseWebSocketMessage {
  type: 'error'
  payload: {
    code: string
    message: string
    details?: unknown
  }
}

/** Acknowledgement message */
export interface AckMessage extends BaseWebSocketMessage {
  type: 'ack'
  payload: {
    messageId: string
    success: boolean
  }
}

/** Union of all incoming messages (client -> server) */
export type IncomingMessage =
  | JoinSessionMessage
  | LeaveSessionMessage
  | SyncActionMessage
  | FullSyncMessage
  | PresenceUpdateMessage
  | HeartbeatMessage

/** Union of all outgoing messages (server -> client) */
export type OutgoingMessage =
  | JoinSessionResponse
  | LeaveSessionResponse
  | SyncActionResponse
  | FullSyncMessage
  | PresenceUpdateMessage
  | HeartbeatResponse
  | ErrorMessage
  | AckMessage
  | SyncActionMessage

/** Union of all WebSocket messages */
export type WebSocketMessage = IncomingMessage | OutgoingMessage

// ============================================================================
// Server Configuration
// ============================================================================

/**
 * Server configuration options
 */
export interface ServerConfig {
  /** Port to listen on */
  port: number
  /** Host to bind to */
  host: string
  /** JWT secret for authentication */
  jwtSecret: string
  /** Session expiration time in milliseconds */
  sessionExpirationMs: number
  /** Participant timeout in milliseconds */
  participantTimeoutMs: number
  /** Enable debug logging */
  debug: boolean
  /** CORS origins allowed */
  corsOrigins: string[]
  /** Maximum sessions per server */
  maxSessions: number
  /** Maximum participants per session */
  maxParticipantsPerSession: number
}

/**
 * Default server configuration
 */
export const DEFAULT_SERVER_CONFIG: ServerConfig = {
  port: 3001,
  host: '0.0.0.0',
  jwtSecret: process.env['JWT_SECRET'] || 'isocubic-dev-secret-change-in-production',
  sessionExpirationMs: 24 * 60 * 60 * 1000, // 24 hours
  participantTimeoutMs: 5 * 60 * 1000, // 5 minutes
  debug: process.env['NODE_ENV'] !== 'production',
  corsOrigins: ['*'],
  maxSessions: 1000,
  maxParticipantsPerSession: 50,
}

// ============================================================================
// JWT Payload
// ============================================================================

/**
 * JWT token payload for session authentication
 */
export interface JWTPayload {
  sessionId: SessionId
  participantId: ParticipantId
  role: ParticipantRole
  iat: number
  exp: number
}

// ============================================================================
// Utility Functions
// ============================================================================

/** Generates a unique message ID */
export function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/** Generates a random session code (6 characters, no ambiguous chars) */
export function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

/** Generates a random participant color */
export function generateParticipantColor(): string {
  const colors = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#96CEB4',
    '#FFEAA7',
    '#DDA0DD',
    '#98D8C8',
    '#F7DC6F',
    '#BB8FCE',
    '#85C1E9',
  ]
  return colors[Math.floor(Math.random() * colors.length)] as string
}
