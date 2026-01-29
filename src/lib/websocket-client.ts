/**
 * WebSocket client for real-time collaboration
 * Provides WebSocket connection management, reconnection, heartbeat, and message handling
 */

import type {
  WebSocketClientConfig,
  WebSocketState,
  WebSocketEventType,
  WebSocketEventListener,
  WebSocketEvent,
  WebSocketMessage,
  OutgoingMessage,
  IncomingMessage,
  CloseEventData,
  ErrorEventData,
  StateChangeEventData,
  JoinSessionResponse,
  SyncActionResponse,
} from '../types/websocket'
import {
  DEFAULT_WEBSOCKET_CONFIG,
  parseWebSocketMessage,
  serializeWebSocketMessage,
  createJoinSessionMessage,
  createLeaveSessionMessage,
  createSyncActionMessage,
  createFullSyncRequestMessage,
  createPresenceUpdateMessage,
  createHeartbeatMessage,
} from '../types/websocket'
import type { CollaborativeAction, SessionId, ParticipantId } from '../types/collaboration'

// ============================================================================
// WebSocket Client Class
// ============================================================================

/**
 * WebSocket client for real-time collaboration
 * Handles connection management, automatic reconnection, heartbeat, and message routing
 */
export class WebSocketClient {
  private config: WebSocketClientConfig
  private socket: WebSocket | null = null
  private state: WebSocketState = 'disconnected'
  private reconnectAttempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private connectionTimeoutTimer: ReturnType<typeof setTimeout> | null = null
  private listeners: Map<WebSocketEventType, Set<WebSocketEventListener>> = new Map()
  private messageListeners: Map<string, Set<WebSocketEventListener<IncomingMessage>>> = new Map()
  private pendingRequests: Map<
    string,
    {
      resolve: (message: IncomingMessage) => void
      reject: (error: Error) => void
      timeout: ReturnType<typeof setTimeout>
    }
  > = new Map()
  private lastPingTime: number = 0
  private latency: number = 0

  constructor(config?: Partial<WebSocketClientConfig>) {
    this.config = { ...DEFAULT_WEBSOCKET_CONFIG, ...config }
  }

  // ==========================================================================
  // Connection Management
  // ==========================================================================

  /**
   * Gets the current connection state
   */
  getState(): WebSocketState {
    return this.state
  }

  /**
   * Gets the current latency in milliseconds
   */
  getLatency(): number {
    return this.latency
  }

  /**
   * Checks if the client is connected
   */
  isConnected(): boolean {
    return this.state === 'connected' && this.socket?.readyState === WebSocket.OPEN
  }

  /**
   * Connects to the WebSocket server
   */
  connect(serverUrl?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.state === 'connected' || this.state === 'connecting') {
        resolve()
        return
      }

      const url = serverUrl ?? this.config.serverUrl
      this.setState('connecting')
      this.log('Connecting to', url)

      try {
        this.socket = new WebSocket(url)
        this.setupSocketListeners(resolve, reject)
        this.startConnectionTimeout(reject)
      } catch (error) {
        this.setState('error')
        reject(error)
      }
    })
  }

  /**
   * Disconnects from the WebSocket server
   */
  disconnect(reason = 'manual'): void {
    this.log('Disconnecting:', reason)
    this.stopReconnectTimer()
    this.stopHeartbeat()
    this.stopConnectionTimeout()
    this.clearPendingRequests(new Error('Connection closed'))

    if (this.socket) {
      // Remove listeners before closing to prevent reconnection
      this.socket.onclose = null
      this.socket.onerror = null
      this.socket.onmessage = null
      this.socket.onopen = null

      if (
        this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING
      ) {
        this.socket.close(1000, reason)
      }
      this.socket = null
    }

    this.setState('disconnected')
    this.reconnectAttempts = 0
  }

  /**
   * Sets up WebSocket event listeners
   */
  private setupSocketListeners(
    connectResolve: () => void,
    connectReject: (error: Error) => void
  ): void {
    if (!this.socket) return

    this.socket.onopen = () => {
      this.log('Connection opened')
      this.stopConnectionTimeout()
      this.setState('connected')
      this.reconnectAttempts = 0
      this.startHeartbeat()
      this.emit('open', { url: this.config.serverUrl })
      connectResolve()
    }

    this.socket.onclose = (event) => {
      this.log('Connection closed:', event.code, event.reason)
      this.stopHeartbeat()
      this.stopConnectionTimeout()

      const closeData: CloseEventData = {
        code: event.code,
        reason: event.reason || 'Unknown',
        wasClean: event.wasClean,
      }

      this.emit('close', closeData)

      // Don't reject if we successfully connected and then closed
      if (this.state === 'connecting') {
        connectReject(new Error(`WebSocket closed: ${event.reason || event.code}`))
      }

      if (this.config.autoReconnect && event.code !== 1000) {
        this.scheduleReconnect()
      } else {
        this.setState('disconnected')
      }
    }

    this.socket.onerror = (event) => {
      this.log('Connection error:', event)
      const errorData: ErrorEventData = {
        message: 'WebSocket error',
        error: new Error('WebSocket connection error'),
      }
      this.emit('error', errorData)

      if (this.state === 'connecting') {
        connectReject(new Error('WebSocket connection error'))
      }
    }

    this.socket.onmessage = (event) => {
      this.handleMessage(event.data)
    }
  }

  /**
   * Handles incoming WebSocket messages
   */
  private handleMessage(data: string | ArrayBuffer | Blob): void {
    // Convert to string if necessary
    let messageString: string
    if (typeof data === 'string') {
      messageString = data
    } else {
      this.log('Received non-string message, skipping')
      return
    }

    const message = parseWebSocketMessage(messageString)
    if (!message) {
      this.log('Failed to parse message:', messageString)
      return
    }

    this.log('Received message:', message.type, message.id)

    // Handle heartbeat responses
    if (message.type === 'heartbeat' && 'serverTime' in message.payload) {
      this.handleHeartbeatResponse(message)
      return
    }

    // Check for pending request responses
    const pendingRequest = this.pendingRequests.get(message.id)
    if (pendingRequest) {
      clearTimeout(pendingRequest.timeout)
      this.pendingRequests.delete(message.id)
      pendingRequest.resolve(message as IncomingMessage)
      return
    }

    // Emit to type-specific listeners
    this.emitMessage(message.type, message as IncomingMessage)

    // Emit generic message event
    this.emit('message', message)
  }

  /**
   * Handles heartbeat response
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handleHeartbeatResponse(_message: WebSocketMessage): void {
    if (this.lastPingTime > 0) {
      this.latency = Date.now() - this.lastPingTime
      this.log('Latency:', this.latency, 'ms')
    }
  }

  // ==========================================================================
  // Reconnection Logic
  // ==========================================================================

  /**
   * Schedules a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.log('Max reconnection attempts reached')
      this.setState('error')
      this.emit('max_reconnects', { attempts: this.reconnectAttempts })
      return
    }

    this.setState('reconnecting')
    this.reconnectAttempts++

    // Exponential backoff with jitter
    const baseDelay = this.config.reconnectBaseDelay
    const exponentialDelay = baseDelay * Math.pow(2, this.reconnectAttempts - 1)
    const jitter = Math.random() * 1000
    const delay = Math.min(exponentialDelay + jitter, this.config.reconnectMaxDelay)

    this.log(`Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts})`)
    this.emit('reconnecting', { attempt: this.reconnectAttempts, delay })

    this.reconnectTimer = setTimeout(() => {
      this.connect()
        .then(() => {
          this.emit('reconnected', { attempts: this.reconnectAttempts })
        })
        .catch(() => {
          // Error handling is done in setupSocketListeners
        })
    }, delay)
  }

  /**
   * Stops the reconnection timer
   */
  private stopReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  // ==========================================================================
  // Heartbeat
  // ==========================================================================

  /**
   * Starts the heartbeat timer
   */
  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat()
    }, this.config.heartbeatInterval)
  }

  /**
   * Stops the heartbeat timer
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  /**
   * Sends a heartbeat message
   */
  private sendHeartbeat(): void {
    if (!this.isConnected()) return

    this.lastPingTime = Date.now()
    const message = createHeartbeatMessage()
    this.sendRaw(message)
  }

  // ==========================================================================
  // Connection Timeout
  // ==========================================================================

  /**
   * Starts the connection timeout
   */
  private startConnectionTimeout(reject: (error: Error) => void): void {
    this.stopConnectionTimeout()
    this.connectionTimeoutTimer = setTimeout(() => {
      if (this.state === 'connecting') {
        this.log('Connection timeout')
        this.socket?.close()
        reject(new Error('Connection timeout'))
      }
    }, this.config.connectionTimeout)
  }

  /**
   * Stops the connection timeout
   */
  private stopConnectionTimeout(): void {
    if (this.connectionTimeoutTimer) {
      clearTimeout(this.connectionTimeoutTimer)
      this.connectionTimeoutTimer = null
    }
  }

  // ==========================================================================
  // Message Sending
  // ==========================================================================

  /**
   * Sends a raw message without waiting for response
   */
  send(message: OutgoingMessage): boolean {
    return this.sendRaw(message)
  }

  /**
   * Sends a message and waits for a response
   */
  sendWithResponse<T extends IncomingMessage>(
    message: OutgoingMessage,
    timeout = 10000
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('Not connected'))
        return
      }

      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(message.id)
        reject(new Error('Request timeout'))
      }, timeout)

      this.pendingRequests.set(message.id, {
        resolve: resolve as (message: IncomingMessage) => void,
        reject,
        timeout: timeoutId,
      })

      if (!this.sendRaw(message)) {
        clearTimeout(timeoutId)
        this.pendingRequests.delete(message.id)
        reject(new Error('Failed to send message'))
      }
    })
  }

  /**
   * Sends raw message to socket
   */
  private sendRaw(message: WebSocketMessage): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.log('Cannot send, socket not open')
      return false
    }

    try {
      const serialized = serializeWebSocketMessage(message)
      this.socket.send(serialized)
      this.log('Sent message:', message.type, message.id)
      return true
    } catch (error) {
      this.log('Failed to send message:', error)
      return false
    }
  }

  /**
   * Clears all pending requests with an error
   */
  private clearPendingRequests(error: Error): void {
    for (const request of this.pendingRequests.values()) {
      clearTimeout(request.timeout)
      request.reject(error)
    }
    this.pendingRequests.clear()
  }

  // ==========================================================================
  // High-Level API
  // ==========================================================================

  /**
   * Joins a session
   */
  async joinSession(
    sessionCode: string,
    participantName: string,
    participantId?: ParticipantId
  ): Promise<JoinSessionResponse> {
    const message = createJoinSessionMessage(sessionCode, participantName, participantId)
    return this.sendWithResponse<JoinSessionResponse>(message)
  }

  /**
   * Leaves a session
   */
  async leaveSession(
    sessionId: SessionId,
    participantId: ParticipantId,
    reason?: 'manual' | 'timeout' | 'kicked'
  ): Promise<void> {
    const message = createLeaveSessionMessage(sessionId, participantId, reason)
    this.send(message)
  }

  /**
   * Synchronizes an action
   */
  async syncAction(action: CollaborativeAction, sessionId: SessionId): Promise<SyncActionResponse> {
    const message = createSyncActionMessage(action, sessionId)
    return this.sendWithResponse<SyncActionResponse>(message)
  }

  /**
   * Requests full state synchronization
   */
  requestFullSync(sessionId: SessionId): void {
    const message = createFullSyncRequestMessage(sessionId)
    this.send(message)
  }

  /**
   * Updates presence (status and/or cursor)
   */
  updatePresence(
    sessionId: SessionId,
    participantId: ParticipantId,
    status?: 'online' | 'away' | 'offline',
    cursor?: { x: number; y: number; z: number; selectedCubeId?: string }
  ): void {
    const message = createPresenceUpdateMessage(sessionId, participantId, status, cursor)
    this.send(message)
  }

  // ==========================================================================
  // State Management
  // ==========================================================================

  /**
   * Sets the connection state
   */
  private setState(newState: WebSocketState): void {
    if (this.state === newState) return

    const previousState = this.state
    this.state = newState

    const stateData: StateChangeEventData = {
      previousState,
      currentState: newState,
    }

    this.emit('state_changed', stateData)
  }

  // ==========================================================================
  // Event System
  // ==========================================================================

  /**
   * Adds an event listener
   */
  on(type: WebSocketEventType, listener: WebSocketEventListener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)!.add(listener)
  }

  /**
   * Removes an event listener
   */
  off(type: WebSocketEventType, listener: WebSocketEventListener): void {
    this.listeners.get(type)?.delete(listener)
  }

  /**
   * Adds a message type listener
   */
  onMessage(type: string, listener: WebSocketEventListener<IncomingMessage>): void {
    if (!this.messageListeners.has(type)) {
      this.messageListeners.set(type, new Set())
    }
    this.messageListeners.get(type)!.add(listener)
  }

  /**
   * Removes a message type listener
   */
  offMessage(type: string, listener: WebSocketEventListener<IncomingMessage>): void {
    this.messageListeners.get(type)?.delete(listener)
  }

  /**
   * Emits an event to all listeners
   */
  private emit<T>(type: WebSocketEventType, data: T): void {
    const event: WebSocketEvent<T> = {
      type,
      data,
      timestamp: new Date().toISOString(),
    }

    this.listeners.get(type)?.forEach((listener) => {
      try {
        listener(event)
      } catch (error) {
        this.log('Listener error:', error)
      }
    })
  }

  /**
   * Emits a message event to type-specific listeners
   */
  private emitMessage(type: string, message: IncomingMessage): void {
    const event: WebSocketEvent<IncomingMessage> = {
      type: 'message',
      data: message,
      timestamp: new Date().toISOString(),
    }

    this.messageListeners.get(type)?.forEach((listener) => {
      try {
        listener(event)
      } catch (error) {
        this.log('Message listener error:', error)
      }
    })
  }

  // ==========================================================================
  // Utility
  // ==========================================================================

  /**
   * Logs debug messages
   */
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[WebSocketClient]', ...args)
    }
  }

  /**
   * Cleans up resources
   */
  dispose(): void {
    this.disconnect('dispose')
    this.listeners.clear()
    this.messageListeners.clear()
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a new WebSocket client instance
 */
export function createWebSocketClient(config?: Partial<WebSocketClientConfig>): WebSocketClient {
  return new WebSocketClient(config)
}

// ============================================================================
// Polling Fallback Client
// ============================================================================

import type { PollingClientConfig, PollingResponse } from '../types/websocket'
import { DEFAULT_POLLING_CONFIG } from '../types/websocket'

/**
 * Polling client as fallback for WebSocket
 * Used when WebSocket is not available or connection fails
 */
export class PollingClient {
  private config: PollingClientConfig
  private state: WebSocketState = 'disconnected'
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private listeners: Map<WebSocketEventType, Set<WebSocketEventListener>> = new Map()
  private messageListeners: Map<string, Set<WebSocketEventListener<IncomingMessage>>> = new Map()
  private sessionId: SessionId | null = null
  private participantId: ParticipantId | null = null
  private lastPollTimestamp: string | null = null

  constructor(config?: Partial<PollingClientConfig>) {
    this.config = { ...DEFAULT_POLLING_CONFIG, ...config }
  }

  /**
   * Gets the current connection state
   */
  getState(): WebSocketState {
    return this.state
  }

  /**
   * Checks if the client is connected (polling)
   */
  isConnected(): boolean {
    return this.state === 'connected'
  }

  /**
   * Starts polling with session context
   */
  async connect(sessionId: SessionId, participantId: ParticipantId): Promise<void> {
    this.sessionId = sessionId
    this.participantId = participantId
    this.state = 'connecting'
    this.emit('state_changed', { previousState: 'disconnected', currentState: 'connecting' })

    try {
      // Initial poll to verify connection
      await this.poll()
      this.state = 'connected'
      this.emit('state_changed', { previousState: 'connecting', currentState: 'connected' })
      this.emit('open', { url: this.config.serverUrl })
      this.startPolling()
    } catch (error) {
      this.state = 'error'
      this.emit('state_changed', { previousState: 'connecting', currentState: 'error' })
      throw error
    }
  }

  /**
   * Stops polling
   */
  disconnect(): void {
    this.stopPolling()
    this.sessionId = null
    this.participantId = null
    this.lastPollTimestamp = null
    const previousState = this.state
    this.state = 'disconnected'
    this.emit('state_changed', { previousState, currentState: 'disconnected' })
    this.emit('close', { code: 1000, reason: 'manual', wasClean: true })
  }

  /**
   * Starts the polling timer
   */
  private startPolling(): void {
    this.stopPolling()
    this.pollTimer = setInterval(() => {
      this.poll().catch((error) => {
        this.log('Poll error:', error)
      })
    }, this.config.pollInterval)
  }

  /**
   * Stops the polling timer
   */
  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
  }

  /**
   * Performs a single poll request
   */
  private async poll(): Promise<void> {
    if (!this.sessionId || !this.participantId) return

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.requestTimeout)

    try {
      const params = new URLSearchParams({
        sessionId: this.sessionId,
        participantId: this.participantId,
      })

      if (this.lastPollTimestamp) {
        params.set('since', this.lastPollTimestamp)
      }

      const response = await fetch(`${this.config.serverUrl}/poll?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Poll failed: ${response.status}`)
      }

      const data = (await response.json()) as PollingResponse

      if (data.messages) {
        for (const message of data.messages) {
          this.handleMessage(message)
        }
      }

      if (data.nextPollDelay && data.nextPollDelay !== this.config.pollInterval) {
        // Adjust polling interval if server suggests
        this.stopPolling()
        this.config.pollInterval = data.nextPollDelay
        this.startPolling()
      }

      this.lastPollTimestamp = new Date().toISOString()
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  /**
   * Handles an incoming message
   */
  private handleMessage(message: IncomingMessage): void {
    this.log('Received message:', message.type)
    this.emitMessage(message.type, message)
    this.emit('message', message)
  }

  /**
   * Sends an action to the server
   */
  async sendAction(action: CollaborativeAction): Promise<void> {
    if (!this.sessionId || !this.participantId) {
      throw new Error('Not connected')
    }

    const response = await fetch(`${this.config.serverUrl}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: this.sessionId,
        participantId: this.participantId,
        action,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to send action: ${response.status}`)
    }
  }

  /**
   * Updates presence
   */
  async updatePresence(
    status?: 'online' | 'away' | 'offline',
    cursor?: { x: number; y: number; z: number; selectedCubeId?: string }
  ): Promise<void> {
    if (!this.sessionId || !this.participantId) {
      throw new Error('Not connected')
    }

    const response = await fetch(`${this.config.serverUrl}/presence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: this.sessionId,
        participantId: this.participantId,
        status,
        cursor,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to update presence: ${response.status}`)
    }
  }

  // ==========================================================================
  // Event System
  // ==========================================================================

  /**
   * Adds an event listener
   */
  on(type: WebSocketEventType, listener: WebSocketEventListener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)!.add(listener)
  }

  /**
   * Removes an event listener
   */
  off(type: WebSocketEventType, listener: WebSocketEventListener): void {
    this.listeners.get(type)?.delete(listener)
  }

  /**
   * Adds a message type listener
   */
  onMessage(type: string, listener: WebSocketEventListener<IncomingMessage>): void {
    if (!this.messageListeners.has(type)) {
      this.messageListeners.set(type, new Set())
    }
    this.messageListeners.get(type)!.add(listener)
  }

  /**
   * Removes a message type listener
   */
  offMessage(type: string, listener: WebSocketEventListener<IncomingMessage>): void {
    this.messageListeners.get(type)?.delete(listener)
  }

  /**
   * Emits an event
   */
  private emit<T>(type: WebSocketEventType, data: T): void {
    const event: WebSocketEvent<T> = {
      type,
      data,
      timestamp: new Date().toISOString(),
    }

    this.listeners.get(type)?.forEach((listener) => {
      try {
        listener(event)
      } catch (error) {
        this.log('Listener error:', error)
      }
    })
  }

  /**
   * Emits a message event
   */
  private emitMessage(type: string, message: IncomingMessage): void {
    const event: WebSocketEvent<IncomingMessage> = {
      type: 'message',
      data: message,
      timestamp: new Date().toISOString(),
    }

    this.messageListeners.get(type)?.forEach((listener) => {
      try {
        listener(event)
      } catch (error) {
        this.log('Message listener error:', error)
      }
    })
  }

  /**
   * Logs debug messages
   */
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[PollingClient]', ...args)
    }
  }

  /**
   * Cleans up resources
   */
  dispose(): void {
    this.disconnect()
    this.listeners.clear()
    this.messageListeners.clear()
  }
}

/**
 * Creates a new polling client instance
 */
export function createPollingClient(config?: Partial<PollingClientConfig>): PollingClient {
  return new PollingClient(config)
}

// ============================================================================
// Unified Realtime Client
// ============================================================================

/**
 * Configuration for the unified realtime client
 */
export interface RealtimeClientConfig {
  /** WebSocket configuration */
  websocket: Partial<WebSocketClientConfig>
  /** Polling configuration */
  polling: Partial<PollingClientConfig>
  /** Prefer WebSocket over polling */
  preferWebSocket: boolean
  /** Fallback to polling if WebSocket fails */
  enablePollingFallback: boolean
}

/**
 * Default realtime client configuration
 */
export const DEFAULT_REALTIME_CONFIG: RealtimeClientConfig = {
  websocket: DEFAULT_WEBSOCKET_CONFIG,
  polling: DEFAULT_POLLING_CONFIG,
  preferWebSocket: true,
  enablePollingFallback: true,
}

/**
 * Unified client that handles both WebSocket and polling
 */
export class RealtimeClient {
  private config: RealtimeClientConfig
  private wsClient: WebSocketClient | null = null
  private pollingClient: PollingClient | null = null
  private usingWebSocket = true
  private listeners: Map<WebSocketEventType, Set<WebSocketEventListener>> = new Map()
  private messageListeners: Map<string, Set<WebSocketEventListener<IncomingMessage>>> = new Map()

  constructor(config?: Partial<RealtimeClientConfig>) {
    this.config = {
      ...DEFAULT_REALTIME_CONFIG,
      ...config,
      websocket: { ...DEFAULT_WEBSOCKET_CONFIG, ...config?.websocket },
      polling: { ...DEFAULT_POLLING_CONFIG, ...config?.polling },
    }
  }

  /**
   * Gets the current connection state
   */
  getState(): WebSocketState {
    if (this.usingWebSocket && this.wsClient) {
      return this.wsClient.getState()
    }
    if (this.pollingClient) {
      return this.pollingClient.getState()
    }
    return 'disconnected'
  }

  /**
   * Checks if using WebSocket or polling
   */
  isUsingWebSocket(): boolean {
    return this.usingWebSocket
  }

  /**
   * Checks if connected
   */
  isConnected(): boolean {
    if (this.usingWebSocket && this.wsClient) {
      return this.wsClient.isConnected()
    }
    if (this.pollingClient) {
      return this.pollingClient.isConnected()
    }
    return false
  }

  /**
   * Connects using WebSocket or falls back to polling
   */
  async connect(
    sessionId: SessionId,
    participantId: ParticipantId,
    serverUrl?: string
  ): Promise<void> {
    if (this.config.preferWebSocket && this.isWebSocketSupported()) {
      try {
        this.wsClient = createWebSocketClient(this.config.websocket)
        this.setupWebSocketListeners()

        const wsUrl = serverUrl ?? this.config.websocket.serverUrl
        await this.wsClient.connect(wsUrl)
        this.usingWebSocket = true
        return
      } catch (error) {
        console.log('WebSocket connection failed:', error)
        if (!this.config.enablePollingFallback) {
          throw error
        }
        // Fall through to polling
      }
    }

    // Use polling as fallback or primary
    this.usingWebSocket = false
    this.pollingClient = createPollingClient(this.config.polling)
    this.setupPollingListeners()
    await this.pollingClient.connect(sessionId, participantId)
  }

  /**
   * Disconnects
   */
  disconnect(): void {
    if (this.wsClient) {
      this.wsClient.disconnect()
      this.wsClient = null
    }
    if (this.pollingClient) {
      this.pollingClient.disconnect()
      this.pollingClient = null
    }
  }

  /**
   * Checks if WebSocket is supported
   */
  private isWebSocketSupported(): boolean {
    return typeof WebSocket !== 'undefined'
  }

  /**
   * Sets up WebSocket event forwarding
   */
  private setupWebSocketListeners(): void {
    if (!this.wsClient) return

    const events: WebSocketEventType[] = [
      'open',
      'close',
      'error',
      'message',
      'reconnecting',
      'reconnected',
      'max_reconnects',
      'state_changed',
    ]

    for (const eventType of events) {
      this.wsClient.on(eventType, (event) => {
        this.emit(eventType, event.data)
      })
    }
  }

  /**
   * Sets up polling event forwarding
   */
  private setupPollingListeners(): void {
    if (!this.pollingClient) return

    const events: WebSocketEventType[] = ['open', 'close', 'error', 'message', 'state_changed']

    for (const eventType of events) {
      this.pollingClient.on(eventType, (event) => {
        this.emit(eventType, event.data)
      })
    }
  }

  /**
   * Gets the underlying WebSocket client (if using WebSocket)
   */
  getWebSocketClient(): WebSocketClient | null {
    return this.wsClient
  }

  /**
   * Gets the underlying polling client (if using polling)
   */
  getPollingClient(): PollingClient | null {
    return this.pollingClient
  }

  // ==========================================================================
  // Event System
  // ==========================================================================

  /**
   * Adds an event listener
   */
  on(type: WebSocketEventType, listener: WebSocketEventListener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)!.add(listener)
  }

  /**
   * Removes an event listener
   */
  off(type: WebSocketEventType, listener: WebSocketEventListener): void {
    this.listeners.get(type)?.delete(listener)
  }

  /**
   * Emits an event
   */
  private emit<T>(type: WebSocketEventType, data: T): void {
    const event: WebSocketEvent<T> = {
      type,
      data,
      timestamp: new Date().toISOString(),
    }

    this.listeners.get(type)?.forEach((listener) => {
      try {
        listener(event)
      } catch (error) {
        console.error('Listener error:', error)
      }
    })
  }

  /**
   * Cleans up resources
   */
  dispose(): void {
    this.disconnect()
    this.listeners.clear()
    this.messageListeners.clear()
  }
}

/**
 * Creates a new realtime client instance
 */
export function createRealtimeClient(config?: Partial<RealtimeClientConfig>): RealtimeClient {
  return new RealtimeClient(config)
}
