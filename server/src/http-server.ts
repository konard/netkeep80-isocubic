/**
 * HTTP server for isocubic collaborative editing
 * Provides REST API endpoints for polling fallback and session management
 */

import { createServer, IncomingMessage, ServerResponse } from 'http'
import type { Server } from 'http'
import type {
  ServerConfig,
  SessionId,
  ParticipantId,
  ParticipantStatus,
  CollaborativeAction,
  CursorPosition,
} from './types.js'
import { generateMessageId } from './types.js'
import type { SessionStore } from './session-store.js'
import type { AuthManager } from './auth.js'
import type { IsocubicWebSocketServer } from './websocket-server.js'

/**
 * HTTP request context
 */
interface RequestContext {
  req: IncomingMessage
  res: ServerResponse
  body: string
  parsedBody?: unknown
}

/**
 * HTTP server for REST API and polling fallback
 */
export class IsocubicHttpServer {
  private server: Server
  private config: ServerConfig
  private sessionStore: SessionStore
  private authManager: AuthManager
  private wsServer: IsocubicWebSocketServer | null = null

  // Pending messages for polling clients (sessionId -> participantId -> messages)
  private pendingMessages: Map<SessionId, Map<ParticipantId, unknown[]>> = new Map()

  constructor(config: ServerConfig, sessionStore: SessionStore, authManager: AuthManager) {
    this.config = config
    this.sessionStore = sessionStore
    this.authManager = authManager

    this.server = createServer((req, res) => {
      this.handleRequest(req, res)
    })
  }

  /**
   * Sets the WebSocket server for upgrade handling
   */
  setWebSocketServer(wsServer: IsocubicWebSocketServer): void {
    this.wsServer = wsServer

    this.server.on('upgrade', (request, socket, head) => {
      if (request.url === '/ws') {
        this.wsServer!.handleUpgrade(request, socket, head)
      } else {
        socket.destroy()
      }
    })
  }

  /**
   * Starts the HTTP server
   */
  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.config.port, this.config.host, () => {
        console.log(`isocubic server listening on ${this.config.host}:${this.config.port}`)
        console.log(`WebSocket endpoint: ws://${this.config.host}:${this.config.port}/ws`)
        console.log(`REST API endpoint: http://${this.config.host}:${this.config.port}/api`)
        resolve()
      })
    })
  }

  /**
   * Stops the HTTP server
   */
  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.wsServer?.close()
      this.server.close((err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  /**
   * Gets the underlying HTTP server
   */
  getServer(): Server {
    return this.server
  }

  /**
   * Handles incoming HTTP request
   */
  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Set CORS headers
    this.setCorsHeaders(res)

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    // Parse body for POST/PUT requests
    const body = await this.readBody(req)
    const ctx: RequestContext = { req, res, body }

    try {
      if (body) {
        ctx.parsedBody = JSON.parse(body)
      }
    } catch {
      this.sendError(res, 400, 'Invalid JSON body')
      return
    }

    // Route request
    const url = new URL(req.url || '/', `http://${req.headers.host}`)
    const path = url.pathname

    this.log(`${req.method} ${path}`)

    try {
      if (path === '/') {
        this.handleRoot(ctx)
      } else if (path === '/api/health') {
        this.handleHealth(ctx)
      } else if (path === '/api/sessions' && req.method === 'POST') {
        this.handleCreateSession(ctx)
      } else if (path === '/api/sessions/join' && req.method === 'POST') {
        this.handleJoinSession(ctx)
      } else if (path === '/api/sessions/leave' && req.method === 'POST') {
        this.handleLeaveSession(ctx)
      } else if (path === '/api/poll' && req.method === 'GET') {
        this.handlePoll(ctx, url)
      } else if (path === '/api/action' && req.method === 'POST') {
        this.handleAction(ctx)
      } else if (path === '/api/presence' && req.method === 'POST') {
        this.handlePresence(ctx)
      } else if (path.startsWith('/api/sessions/') && req.method === 'GET') {
        const sessionId = path.replace('/api/sessions/', '')
        this.handleGetSession(ctx, sessionId)
      } else {
        this.sendError(res, 404, 'Not found')
      }
    } catch (error) {
      this.log('Error handling request:', error)
      this.sendError(res, 500, error instanceof Error ? error.message : 'Internal server error')
    }
  }

  /**
   * Handles root endpoint
   */
  private handleRoot(ctx: RequestContext): void {
    this.sendJson(ctx.res, 200, {
      name: 'isocubic-server',
      version: '0.1.0',
      endpoints: {
        websocket: '/ws',
        api: '/api',
        health: '/api/health',
        sessions: '/api/sessions',
        poll: '/api/poll',
        action: '/api/action',
        presence: '/api/presence',
      },
    })
  }

  /**
   * Handles health check
   */
  private handleHealth(ctx: RequestContext): void {
    this.sendJson(ctx.res, 200, {
      status: 'ok',
      timestamp: new Date().toISOString(),
      sessions: this.sessionStore.getSessionCount(),
      clients: this.wsServer?.getClientCount() ?? 0,
    })
  }

  /**
   * Handles session creation
   */
  private handleCreateSession(ctx: RequestContext): void {
    const body = ctx.parsedBody as { participantName: string; settings?: Record<string, unknown> }
    if (!body?.participantName) {
      this.sendError(ctx.res, 400, 'participantName is required')
      return
    }

    try {
      const { session, participant } = this.sessionStore.createSession(
        body.participantName,
        body.settings as Parameters<typeof this.sessionStore.createSession>[1]
      )

      const authToken = this.authManager.generateToken(session.id, participant.id, participant.role)

      this.sendJson(ctx.res, 201, {
        success: true,
        session: this.sessionStore.serializeSession(session),
        participant,
        authToken,
      })
    } catch (error) {
      this.sendError(
        ctx.res,
        400,
        error instanceof Error ? error.message : 'Failed to create session'
      )
    }
  }

  /**
   * Handles joining a session
   */
  private handleJoinSession(ctx: RequestContext): void {
    const body = ctx.parsedBody as {
      sessionCode: string
      participantName: string
      participantId?: string
    }

    if (!body?.sessionCode || !body?.participantName) {
      this.sendError(ctx.res, 400, 'sessionCode and participantName are required')
      return
    }

    try {
      const { session, participant } = this.sessionStore.joinSession(
        body.sessionCode,
        body.participantName,
        body.participantId
      )

      const authToken = this.authManager.generateToken(session.id, participant.id, participant.role)

      // Initialize pending messages for this participant
      if (!this.pendingMessages.has(session.id)) {
        this.pendingMessages.set(session.id, new Map())
      }
      this.pendingMessages.get(session.id)!.set(participant.id, [])

      this.sendJson(ctx.res, 200, {
        success: true,
        session: this.sessionStore.serializeSession(session),
        participant,
        authToken,
      })
    } catch (error) {
      this.sendError(
        ctx.res,
        400,
        error instanceof Error ? error.message : 'Failed to join session'
      )
    }
  }

  /**
   * Handles leaving a session
   */
  private handleLeaveSession(ctx: RequestContext): void {
    const body = ctx.parsedBody as {
      sessionId: string
      participantId: string
      reason?: 'manual' | 'timeout' | 'kicked'
    }

    if (!body?.sessionId || !body?.participantId) {
      this.sendError(ctx.res, 400, 'sessionId and participantId are required')
      return
    }

    try {
      const success = this.sessionStore.leaveSession(
        body.sessionId,
        body.participantId,
        body.reason
      )

      // Clean up pending messages
      this.pendingMessages.get(body.sessionId)?.delete(body.participantId)

      this.sendJson(ctx.res, 200, { success })
    } catch (error) {
      this.sendError(
        ctx.res,
        400,
        error instanceof Error ? error.message : 'Failed to leave session'
      )
    }
  }

  /**
   * Handles polling for updates
   */
  private handlePoll(ctx: RequestContext, url: URL): void {
    const sessionId = url.searchParams.get('sessionId')
    const participantId = url.searchParams.get('participantId')

    if (!sessionId || !participantId) {
      this.sendError(ctx.res, 400, 'sessionId and participantId are required')
      return
    }

    // Update participant presence
    this.sessionStore.updatePresence(sessionId, participantId, 'online')

    // Get pending messages
    const sessionMessages = this.pendingMessages.get(sessionId)
    const messages = sessionMessages?.get(participantId) ?? []

    // Clear pending messages
    if (sessionMessages) {
      sessionMessages.set(participantId, [])
    }

    this.sendJson(ctx.res, 200, {
      success: true,
      messages,
      nextPollDelay: 2000,
    })
  }

  /**
   * Handles action sync (for polling clients)
   */
  private handleAction(ctx: RequestContext): void {
    const body = ctx.parsedBody as {
      sessionId: string
      participantId: string
      action: CollaborativeAction
    }

    if (!body?.sessionId || !body?.participantId || !body?.action) {
      this.sendError(ctx.res, 400, 'sessionId, participantId, and action are required')
      return
    }

    try {
      const success = this.sessionStore.applyAction(body.action)

      if (success) {
        // Queue action for other polling clients
        this.queueMessageForSession(body.sessionId, body.participantId, {
          id: generateMessageId(),
          type: 'sync_action',
          timestamp: new Date().toISOString(),
          payload: {
            action: body.action,
            sessionId: body.sessionId,
          },
        })
      }

      this.sendJson(ctx.res, 200, {
        success,
        actionId: body.action.id,
      })
    } catch (error) {
      this.sendError(
        ctx.res,
        400,
        error instanceof Error ? error.message : 'Failed to apply action'
      )
    }
  }

  /**
   * Handles presence update (for polling clients)
   */
  private handlePresence(ctx: RequestContext): void {
    const body = ctx.parsedBody as {
      sessionId: string
      participantId: string
      status?: ParticipantStatus
      cursor?: CursorPosition
    }

    if (!body?.sessionId || !body?.participantId) {
      this.sendError(ctx.res, 400, 'sessionId and participantId are required')
      return
    }

    const participant = this.sessionStore.updatePresence(
      body.sessionId,
      body.participantId,
      body.status,
      body.cursor
    )

    if (participant) {
      // Queue presence update for other polling clients
      this.queueMessageForSession(body.sessionId, body.participantId, {
        id: generateMessageId(),
        type: 'presence_update',
        timestamp: new Date().toISOString(),
        payload: {
          sessionId: body.sessionId,
          participantId: body.participantId,
          status: body.status,
          cursor: body.cursor,
        },
      })
    }

    this.sendJson(ctx.res, 200, { success: !!participant })
  }

  /**
   * Handles get session
   */
  private handleGetSession(ctx: RequestContext, sessionId: string): void {
    const session = this.sessionStore.getSession(sessionId)

    if (!session) {
      this.sendError(ctx.res, 404, 'Session not found')
      return
    }

    this.sendJson(ctx.res, 200, {
      session: this.sessionStore.serializeSession(session),
    })
  }

  /**
   * Queues a message for all participants in a session except the sender
   */
  private queueMessageForSession(
    sessionId: SessionId,
    excludeParticipantId: ParticipantId,
    message: unknown
  ): void {
    const sessionMessages = this.pendingMessages.get(sessionId)
    if (!sessionMessages) return

    for (const [participantId, messages] of sessionMessages) {
      if (participantId !== excludeParticipantId) {
        messages.push(message)
      }
    }
  }

  /**
   * Sets CORS headers
   */
  private setCorsHeaders(res: ServerResponse): void {
    const origins = this.config.corsOrigins
    res.setHeader('Access-Control-Allow-Origin', origins.includes('*') ? '*' : origins.join(', '))
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Max-Age', '86400')
  }

  /**
   * Reads request body
   */
  private readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve) => {
      const chunks: Buffer[] = []
      req.on('data', (chunk) => chunks.push(chunk))
      req.on('end', () => resolve(Buffer.concat(chunks).toString()))
      req.on('error', () => resolve(''))
    })
  }

  /**
   * Sends JSON response
   */
  private sendJson(res: ServerResponse, status: number, data: unknown): void {
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(data))
  }

  /**
   * Sends error response
   */
  private sendError(res: ServerResponse, status: number, message: string): void {
    this.sendJson(res, status, { error: message })
  }

  /**
   * Logs debug messages
   */
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[HttpServer]', ...args)
    }
  }
}

/**
 * Creates a new HTTP server instance
 */
export function createHttpServer(
  config: ServerConfig,
  sessionStore: SessionStore,
  authManager: AuthManager
): IsocubicHttpServer {
  return new IsocubicHttpServer(config, sessionStore, authManager)
}
