/**
 * WebSocket server for isocubic collaborative editing
 * Handles real-time communication between clients
 */

import { WebSocketServer, WebSocket } from 'ws'
import type { IncomingMessage } from 'http'
import { v4 as uuidv4 } from 'uuid'
import type {
  ServerConfig,
  SessionId,
  ParticipantId,
  IncomingMessage as WSIncomingMessage,
  OutgoingMessage,
  JoinSessionMessage,
  JoinSessionResponse,
  LeaveSessionMessage,
  LeaveSessionResponse,
  SyncActionMessage,
  SyncActionResponse,
  FullSyncMessage,
  PresenceUpdateMessage,
  HeartbeatMessage,
  HeartbeatResponse,
  ErrorMessage,
  Participant,
} from './types.js'
import { generateMessageId } from './types.js'
import type { SessionStore } from './session-store.js'
import type { AuthManager } from './auth.js'

/**
 * Client connection metadata
 */
interface ClientConnection {
  ws: WebSocket
  sessionId: SessionId | null
  participantId: ParticipantId | null
  lastHeartbeat: number
}

/**
 * WebSocket server for real-time collaboration
 */
export class IsocubicWebSocketServer {
  private wss: WebSocketServer
  private config: ServerConfig
  private sessionStore: SessionStore
  private authManager: AuthManager
  private clients: Map<string, ClientConnection> = new Map()
  private sessionClients: Map<SessionId, Set<string>> = new Map()
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor(config: ServerConfig, sessionStore: SessionStore, authManager: AuthManager) {
    this.config = config
    this.sessionStore = sessionStore
    this.authManager = authManager
    this.wss = new WebSocketServer({ noServer: true })

    this.setupWebSocketServer()
    this.startCleanupInterval()
  }

  /**
   * Gets the WebSocket server instance (for HTTP server integration)
   */
  getServer(): WebSocketServer {
    return this.wss
  }

  /**
   * Handles WebSocket upgrade from HTTP server
   */
  handleUpgrade(request: IncomingMessage, socket: import('stream').Duplex, head: Buffer): void {
    this.wss.handleUpgrade(request, socket, head, (ws) => {
      this.wss.emit('connection', ws, request)
    })
  }

  /**
   * Sets up WebSocket server event handlers
   */
  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws, request) => {
      const clientId = `client-${uuidv4()}`
      this.log(`Client connected: ${clientId} from ${request.socket.remoteAddress}`)

      const client: ClientConnection = {
        ws,
        sessionId: null,
        participantId: null,
        lastHeartbeat: Date.now(),
      }
      this.clients.set(clientId, client)

      ws.on('message', (data) => {
        this.handleMessage(clientId, data.toString())
      })

      ws.on('close', (code, reason) => {
        this.log(`Client disconnected: ${clientId} (${code}: ${reason.toString()})`)
        this.handleDisconnect(clientId)
      })

      ws.on('error', (error) => {
        this.log(`Client error: ${clientId}`, error)
        this.handleDisconnect(clientId)
      })

      ws.on('pong', () => {
        const client = this.clients.get(clientId)
        if (client) {
          client.lastHeartbeat = Date.now()
        }
      })
    })
  }

  /**
   * Starts the periodic cleanup interval
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60000) // Every minute
  }

  /**
   * Handles incoming WebSocket message
   */
  private handleMessage(clientId: string, data: string): void {
    const client = this.clients.get(clientId)
    if (!client) return

    let message: WSIncomingMessage
    try {
      message = JSON.parse(data) as WSIncomingMessage
      if (!message.type || !message.id) {
        throw new Error('Invalid message format')
      }
    } catch (error) {
      this.sendError(client.ws, 'PARSE_ERROR', 'Invalid message format', { error: String(error) })
      return
    }

    this.log(`Received ${message.type} from ${clientId}`)

    try {
      switch (message.type) {
        case 'join_session':
          this.handleJoinSession(clientId, message)
          break
        case 'leave_session':
          this.handleLeaveSession(clientId, message)
          break
        case 'sync_action':
          this.handleSyncAction(clientId, message)
          break
        case 'full_sync':
          this.handleFullSync(clientId, message)
          break
        case 'presence_update':
          this.handlePresenceUpdate(clientId, message)
          break
        case 'heartbeat':
          this.handleHeartbeat(clientId, message)
          break
        default:
          this.sendError(client.ws, 'UNKNOWN_MESSAGE', `Unknown message type: ${message.type}`)
      }
    } catch (error) {
      this.log(`Error handling message from ${clientId}:`, error)
      this.sendError(
        client.ws,
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Internal server error'
      )
    }
  }

  /**
   * Handles join session request
   */
  private handleJoinSession(clientId: string, message: JoinSessionMessage): void {
    const client = this.clients.get(clientId)
    if (!client) return

    const { sessionCode, participantName, participantId } = message.payload

    try {
      // Check if session exists; if not and it's a 6-char code, create new session
      let session = this.sessionStore.getSessionByCode(sessionCode)
      let participant: Participant
      let isNewSession = false

      if (!session) {
        // Create new session with this participant as owner
        const result = this.sessionStore.createSession(participantName)
        session = result.session
        participant = result.participant
        isNewSession = true
      } else {
        // Join existing session
        const result = this.sessionStore.joinSession(sessionCode, participantName, participantId)
        session = result.session
        participant = result.participant
      }

      // Update client metadata
      client.sessionId = session.id
      client.participantId = participant.id
      client.lastHeartbeat = Date.now()

      // Add to session clients map
      if (!this.sessionClients.has(session.id)) {
        this.sessionClients.set(session.id, new Set())
      }
      this.sessionClients.get(session.id)!.add(clientId)

      // Generate auth token
      const authToken = this.authManager.generateToken(session.id, participant.id, participant.role)

      // Send success response
      const response: JoinSessionResponse = {
        id: message.id,
        type: 'join_session',
        timestamp: new Date().toISOString(),
        payload: {
          success: true,
          session: this.sessionStore.serializeSession(session),
          participant,
          authToken,
        },
      }
      this.send(client.ws, response)

      // Broadcast participant joined to other clients in session (if not new session)
      if (!isNewSession) {
        this.broadcastToSession(session.id, clientId, {
          id: generateMessageId(),
          type: 'sync_action',
          timestamp: new Date().toISOString(),
          payload: {
            sessionId: session.id,
            action: {
              id: generateMessageId(),
              type: 'participant_join',
              participantId: participant.id,
              sessionId: session.id,
              timestamp: new Date().toISOString(),
              payload: { participant },
            },
          },
        })
      }
    } catch (error) {
      const response: JoinSessionResponse = {
        id: message.id,
        type: 'join_session',
        timestamp: new Date().toISOString(),
        payload: {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to join session',
        },
      }
      this.send(client.ws, response)
    }
  }

  /**
   * Handles leave session request
   */
  private handleLeaveSession(clientId: string, message: LeaveSessionMessage): void {
    const client = this.clients.get(clientId)
    if (!client) return

    const { sessionId, participantId, reason } = message.payload

    try {
      const success = this.sessionStore.leaveSession(sessionId, participantId, reason)

      // Remove from session clients map
      this.sessionClients.get(sessionId)?.delete(clientId)
      if (this.sessionClients.get(sessionId)?.size === 0) {
        this.sessionClients.delete(sessionId)
      }

      // Clear client metadata
      client.sessionId = null
      client.participantId = null

      const response: LeaveSessionResponse = {
        id: message.id,
        type: 'leave_session',
        timestamp: new Date().toISOString(),
        payload: { success },
      }
      this.send(client.ws, response)

      // Broadcast to remaining clients
      if (success) {
        this.broadcastToSession(sessionId, clientId, {
          id: generateMessageId(),
          type: 'sync_action',
          timestamp: new Date().toISOString(),
          payload: {
            sessionId,
            action: {
              id: generateMessageId(),
              type: 'participant_leave',
              participantId,
              sessionId,
              timestamp: new Date().toISOString(),
              payload: { reason },
            },
          },
        })
      }
    } catch (error) {
      const response: LeaveSessionResponse = {
        id: message.id,
        type: 'leave_session',
        timestamp: new Date().toISOString(),
        payload: {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to leave session',
        },
      }
      this.send(client.ws, response)
    }
  }

  /**
   * Handles sync action request
   */
  private handleSyncAction(clientId: string, message: SyncActionMessage): void {
    const client = this.clients.get(clientId)
    if (!client) return

    const { action, sessionId } = message.payload

    try {
      // Verify client is in this session
      if (client.sessionId !== sessionId) {
        throw new Error('Not in this session')
      }

      // Apply action to session
      const success = this.sessionStore.applyAction(action)

      const response: SyncActionResponse = {
        id: message.id,
        type: 'sync_action',
        timestamp: new Date().toISOString(),
        payload: {
          success,
          actionId: action.id,
          error: success ? undefined : 'Failed to apply action',
        },
      }
      this.send(client.ws, response)

      // Broadcast action to other clients in session
      if (success) {
        this.broadcastToSession(sessionId, clientId, message)
      }
    } catch (error) {
      const response: SyncActionResponse = {
        id: message.id,
        type: 'sync_action',
        timestamp: new Date().toISOString(),
        payload: {
          success: false,
          actionId: action.id,
          error: error instanceof Error ? error.message : 'Failed to sync action',
        },
      }
      this.send(client.ws, response)
    }
  }

  /**
   * Handles full sync request
   */
  private handleFullSync(clientId: string, message: FullSyncMessage): void {
    const client = this.clients.get(clientId)
    if (!client) return

    const { sessionId, requestType } = message.payload

    if (requestType !== 'request') return

    const session = this.sessionStore.getSession(sessionId)
    if (!session) {
      this.sendError(client.ws, 'SESSION_NOT_FOUND', 'Session not found')
      return
    }

    const response: FullSyncMessage = {
      id: message.id,
      type: 'full_sync',
      timestamp: new Date().toISOString(),
      payload: {
        sessionId,
        requestType: 'response',
        session: this.sessionStore.serializeSession(session),
      },
    }
    this.send(client.ws, response)
  }

  /**
   * Handles presence update
   */
  private handlePresenceUpdate(clientId: string, message: PresenceUpdateMessage): void {
    const client = this.clients.get(clientId)
    if (!client) return

    const { sessionId, participantId, status, cursor } = message.payload

    // Verify client owns this participant
    if (client.participantId !== participantId || client.sessionId !== sessionId) {
      return
    }

    // Update in session store
    this.sessionStore.updatePresence(sessionId, participantId, status, cursor)

    // Broadcast to other clients
    this.broadcastToSession(sessionId, clientId, message)
  }

  /**
   * Handles heartbeat message
   */
  private handleHeartbeat(clientId: string, message: HeartbeatMessage): void {
    const client = this.clients.get(clientId)
    if (!client) return

    client.lastHeartbeat = Date.now()

    const response: HeartbeatResponse = {
      id: message.id,
      type: 'heartbeat',
      timestamp: new Date().toISOString(),
      payload: {
        serverTime: new Date().toISOString(),
        latency: Date.now() - new Date(message.payload.clientTime).getTime(),
      },
    }
    this.send(client.ws, response)
  }

  /**
   * Handles client disconnect
   */
  private handleDisconnect(clientId: string): void {
    const client = this.clients.get(clientId)
    if (!client) return

    if (client.sessionId && client.participantId) {
      // Mark participant as offline
      this.sessionStore.updatePresence(client.sessionId, client.participantId, 'offline')

      // Remove from session clients map
      this.sessionClients.get(client.sessionId)?.delete(clientId)
      if (this.sessionClients.get(client.sessionId)?.size === 0) {
        this.sessionClients.delete(client.sessionId)
      }

      // Broadcast presence update
      this.broadcastToSession(client.sessionId, clientId, {
        id: generateMessageId(),
        type: 'presence_update',
        timestamp: new Date().toISOString(),
        payload: {
          sessionId: client.sessionId,
          participantId: client.participantId,
          status: 'offline',
        },
      })
    }

    this.clients.delete(clientId)
  }

  /**
   * Sends a message to a WebSocket
   */
  private send(ws: WebSocket, message: OutgoingMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  /**
   * Sends an error message to a WebSocket
   */
  private sendError(ws: WebSocket, code: string, messageText: string, details?: unknown): void {
    const error: ErrorMessage = {
      id: generateMessageId(),
      type: 'error',
      timestamp: new Date().toISOString(),
      payload: {
        code,
        message: messageText,
        details,
      },
    }
    this.send(ws, error)
  }

  /**
   * Broadcasts a message to all clients in a session except the sender
   */
  private broadcastToSession(
    sessionId: SessionId,
    excludeClientId: string,
    message: OutgoingMessage
  ): void {
    const clientIds = this.sessionClients.get(sessionId)
    if (!clientIds) return

    for (const clientId of clientIds) {
      if (clientId === excludeClientId) continue

      const client = this.clients.get(clientId)
      if (client && client.ws.readyState === WebSocket.OPEN) {
        this.send(client.ws, message)
      }
    }
  }

  /**
   * Cleans up stale connections and sessions
   */
  private cleanup(): void {
    const now = Date.now()
    const heartbeatTimeout = 120000 // 2 minutes

    // Check for stale connections
    for (const [clientId, client] of this.clients) {
      if (now - client.lastHeartbeat > heartbeatTimeout) {
        this.log(`Closing stale connection: ${clientId}`)
        client.ws.terminate()
        this.handleDisconnect(clientId)
      } else if (client.ws.readyState === WebSocket.OPEN) {
        // Send ping to check connection
        client.ws.ping()
      }
    }

    // Cleanup sessions
    this.sessionStore.cleanup()
  }

  /**
   * Gets client count
   */
  getClientCount(): number {
    return this.clients.size
  }

  /**
   * Gets session client count
   */
  getSessionClientCount(sessionId: SessionId): number {
    return this.sessionClients.get(sessionId)?.size ?? 0
  }

  /**
   * Logs debug messages
   */
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[WebSocketServer]', ...args)
    }
  }

  /**
   * Closes the server
   */
  close(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    for (const [, client] of this.clients) {
      client.ws.close(1001, 'Server shutting down')
    }
    this.clients.clear()
    this.sessionClients.clear()

    this.wss.close()
  }
}

/**
 * Creates a new WebSocket server instance
 */
export function createWebSocketServer(
  config: ServerConfig,
  sessionStore: SessionStore,
  authManager: AuthManager
): IsocubicWebSocketServer {
  return new IsocubicWebSocketServer(config, sessionStore, authManager)
}
