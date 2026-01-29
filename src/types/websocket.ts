/**
 * TypeScript types for WebSocket communication
 * Provides types for WebSocket messages, events, and protocol
 */

import type { CollaborativeAction, Participant, SessionId, ParticipantId } from './collaboration'
import type { SerializableSession } from './collaboration'

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
  /** Unique message identifier */
  id: string
  /** Type of message */
  type: WebSocketMessageType
  /** Timestamp when message was created */
  timestamp: string
}

/** Message to join a session */
export interface JoinSessionMessage extends BaseWebSocketMessage {
  type: 'join_session'
  payload: {
    sessionCode: string
    participantName: string
    participantId?: ParticipantId
  }
}

/** Response to join session request */
export interface JoinSessionResponse extends BaseWebSocketMessage {
  type: 'join_session'
  payload: {
    success: boolean
    session?: SerializableSession
    participant?: Participant
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

/** Message for presence updates (participant status, cursor) */
export interface PresenceUpdateMessage extends BaseWebSocketMessage {
  type: 'presence_update'
  payload: {
    sessionId: SessionId
    participantId: ParticipantId
    status?: 'online' | 'away' | 'offline'
    cursor?: {
      x: number
      y: number
      z: number
      selectedCubeId?: string
    }
  }
}

/** Heartbeat message to keep connection alive */
export interface HeartbeatMessage extends BaseWebSocketMessage {
  type: 'heartbeat'
  payload: {
    clientTime: string
    sessionId?: SessionId
    participantId?: ParticipantId
  }
}

/** Heartbeat response from server */
export interface HeartbeatResponse extends BaseWebSocketMessage {
  type: 'heartbeat'
  payload: {
    serverTime: string
    latency?: number
  }
}

/** Error message from server */
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

/** Union type of all outgoing messages (client -> server) */
export type OutgoingMessage =
  | JoinSessionMessage
  | LeaveSessionMessage
  | SyncActionMessage
  | FullSyncMessage
  | PresenceUpdateMessage
  | HeartbeatMessage

/** Union type of all incoming messages (server -> client) */
export type IncomingMessage =
  | JoinSessionResponse
  | LeaveSessionResponse
  | SyncActionResponse
  | FullSyncMessage
  | PresenceUpdateMessage
  | HeartbeatResponse
  | ErrorMessage
  | AckMessage
  | SyncActionMessage // Actions from other participants

/** Union type of all WebSocket messages */
export type WebSocketMessage = OutgoingMessage | IncomingMessage

// ============================================================================
// WebSocket Client Types
// ============================================================================

/** WebSocket connection state */
export type WebSocketState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

/** WebSocket client configuration */
export interface WebSocketClientConfig {
  /** WebSocket server URL */
  serverUrl: string
  /** Reconnect after disconnect */
  autoReconnect: boolean
  /** Maximum reconnection attempts */
  maxReconnectAttempts: number
  /** Base delay between reconnection attempts (ms) */
  reconnectBaseDelay: number
  /** Maximum delay between reconnection attempts (ms) */
  reconnectMaxDelay: number
  /** Heartbeat interval (ms) */
  heartbeatInterval: number
  /** Connection timeout (ms) */
  connectionTimeout: number
  /** Enable message compression */
  enableCompression: boolean
  /** Enable debug logging */
  debug: boolean
}

/** Default WebSocket client configuration */
export const DEFAULT_WEBSOCKET_CONFIG: WebSocketClientConfig = {
  serverUrl: 'wss://isocubic.example.com/ws',
  autoReconnect: true,
  maxReconnectAttempts: 10,
  reconnectBaseDelay: 1000,
  reconnectMaxDelay: 30000,
  heartbeatInterval: 30000,
  connectionTimeout: 10000,
  enableCompression: true,
  debug: false,
}

/** WebSocket client event types */
export type WebSocketEventType =
  | 'open'
  | 'close'
  | 'error'
  | 'message'
  | 'reconnecting'
  | 'reconnected'
  | 'max_reconnects'
  | 'state_changed'

/** WebSocket client event */
export interface WebSocketEvent<T = unknown> {
  type: WebSocketEventType
  data: T
  timestamp: string
}

/** WebSocket event listener callback */
export type WebSocketEventListener<T = unknown> = (event: WebSocketEvent<T>) => void

/** WebSocket close event data */
export interface CloseEventData {
  code: number
  reason: string
  wasClean: boolean
}

/** WebSocket error event data */
export interface ErrorEventData {
  message: string
  error?: Error
}

/** WebSocket state change event data */
export interface StateChangeEventData {
  previousState: WebSocketState
  currentState: WebSocketState
  reason?: string
}

// ============================================================================
// Polling Fallback Types
// ============================================================================

/** Polling client configuration */
export interface PollingClientConfig {
  /** Server endpoint URL */
  serverUrl: string
  /** Polling interval (ms) */
  pollInterval: number
  /** Request timeout (ms) */
  requestTimeout: number
  /** Maximum retry attempts */
  maxRetries: number
  /** Enable debug logging */
  debug: boolean
}

/** Default polling client configuration */
export const DEFAULT_POLLING_CONFIG: PollingClientConfig = {
  serverUrl: 'https://isocubic.example.com/api',
  pollInterval: 2000,
  requestTimeout: 5000,
  maxRetries: 3,
  debug: false,
}

/** Polling request types */
export type PollingRequestType = 'poll' | 'send_action' | 'join' | 'leave' | 'presence'

/** Polling response */
export interface PollingResponse {
  success: boolean
  messages?: IncomingMessage[]
  error?: string
  nextPollDelay?: number
}

// ============================================================================
// Utility Functions
// ============================================================================

/** Generates a unique message ID */
export function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/** Type guard to check if message is an incoming message */
export function isIncomingMessage(message: WebSocketMessage): message is IncomingMessage {
  // Check for response-type payloads
  if ('payload' in message) {
    const payload = message.payload as Record<string, unknown>
    // Response messages typically have 'success' field or specific response patterns
    if (typeof payload.success === 'boolean') {
      return true
    }
    // Error messages are always incoming
    if (message.type === 'error') {
      return true
    }
    // Ack messages are always incoming
    if (message.type === 'ack') {
      return true
    }
    // Server-originated sync actions (from other participants)
    if (message.type === 'sync_action' && payload.action) {
      const action = payload.action as Record<string, unknown>
      // If participantId doesn't match local, it's from server
      return typeof action.participantId === 'string'
    }
  }
  return false
}

/** Type guard to check if message is an outgoing message */
export function isOutgoingMessage(message: WebSocketMessage): message is OutgoingMessage {
  return !isIncomingMessage(message)
}

/** Creates a join session message */
export function createJoinSessionMessage(
  sessionCode: string,
  participantName: string,
  participantId?: ParticipantId
): JoinSessionMessage {
  return {
    id: generateMessageId(),
    type: 'join_session',
    timestamp: new Date().toISOString(),
    payload: {
      sessionCode,
      participantName,
      participantId,
    },
  }
}

/** Creates a leave session message */
export function createLeaveSessionMessage(
  sessionId: SessionId,
  participantId: ParticipantId,
  reason?: 'manual' | 'timeout' | 'kicked'
): LeaveSessionMessage {
  return {
    id: generateMessageId(),
    type: 'leave_session',
    timestamp: new Date().toISOString(),
    payload: {
      sessionId,
      participantId,
      reason,
    },
  }
}

/** Creates a sync action message */
export function createSyncActionMessage(
  action: CollaborativeAction,
  sessionId: SessionId
): SyncActionMessage {
  return {
    id: generateMessageId(),
    type: 'sync_action',
    timestamp: new Date().toISOString(),
    payload: {
      action,
      sessionId,
    },
  }
}

/** Creates a full sync request message */
export function createFullSyncRequestMessage(sessionId: SessionId): FullSyncMessage {
  return {
    id: generateMessageId(),
    type: 'full_sync',
    timestamp: new Date().toISOString(),
    payload: {
      sessionId,
      requestType: 'request',
    },
  }
}

/** Creates a presence update message */
export function createPresenceUpdateMessage(
  sessionId: SessionId,
  participantId: ParticipantId,
  status?: 'online' | 'away' | 'offline',
  cursor?: { x: number; y: number; z: number; selectedCubeId?: string }
): PresenceUpdateMessage {
  return {
    id: generateMessageId(),
    type: 'presence_update',
    timestamp: new Date().toISOString(),
    payload: {
      sessionId,
      participantId,
      status,
      cursor,
    },
  }
}

/** Creates a heartbeat message */
export function createHeartbeatMessage(
  sessionId?: SessionId,
  participantId?: ParticipantId
): HeartbeatMessage {
  return {
    id: generateMessageId(),
    type: 'heartbeat',
    timestamp: new Date().toISOString(),
    payload: {
      clientTime: new Date().toISOString(),
      sessionId,
      participantId,
    },
  }
}

/** Parses a raw WebSocket message string to a typed message */
export function parseWebSocketMessage(data: string): WebSocketMessage | null {
  try {
    const parsed = JSON.parse(data) as WebSocketMessage
    if (!parsed.type || !parsed.id || !parsed.timestamp) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

/** Serializes a WebSocket message to string */
export function serializeWebSocketMessage(message: WebSocketMessage): string {
  return JSON.stringify(message)
}
