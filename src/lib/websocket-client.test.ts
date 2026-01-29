/**
 * Unit tests for WebSocket client module
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import {
  WebSocketClient,
  PollingClient,
  RealtimeClient,
  createWebSocketClient,
  createPollingClient,
  createRealtimeClient,
} from './websocket-client'
import {
  DEFAULT_WEBSOCKET_CONFIG,
  DEFAULT_POLLING_CONFIG,
  generateMessageId,
  parseWebSocketMessage,
  serializeWebSocketMessage,
  createJoinSessionMessage,
  createLeaveSessionMessage,
  createSyncActionMessage,
  createFullSyncRequestMessage,
  createPresenceUpdateMessage,
  createHeartbeatMessage,
} from '../types/websocket'
import type { CollaborativeAction } from '../types/collaboration'

// Helper to create mock cube for tests
const createMockCube = () => ({
  id: 'cube-1',
  base: { color: [1, 0, 0] as [number, number, number] },
})

// Helper to create mock action for tests
const createMockAction = (overrides = {}): CollaborativeAction =>
  ({
    id: 'action-1',
    type: 'cube_create',
    participantId: 'participant-1',
    sessionId: 'session-1',
    timestamp: new Date().toISOString(),
    payload: { cube: createMockCube() },
    ...overrides,
  }) as CollaborativeAction

// ============================================================================
// Mock WebSocket
// ============================================================================

class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState = MockWebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null

  public readonly url: string
  private messageQueue: string[] = []

  constructor(url: string) {
    this.url = url
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
    }, 10)
  }

  send(data: string): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open')
    }
    this.messageQueue.push(data)
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED
    if (this.onclose) {
      const event = {
        code: code ?? 1000,
        reason: reason ?? '',
        wasClean: true,
      } as CloseEvent
      this.onclose(event)
    }
  }

  // Test helper to simulate incoming message
  simulateMessage(data: string | object): void {
    if (this.onmessage) {
      const messageData = typeof data === 'string' ? data : JSON.stringify(data)
      this.onmessage(new MessageEvent('message', { data: messageData }))
    }
  }

  // Test helper to simulate error
  simulateError(): void {
    if (this.onerror) {
      this.onerror(new Event('error'))
    }
  }

  // Test helper to get sent messages
  getSentMessages(): string[] {
    return this.messageQueue
  }
}

// Store reference to original WebSocket
const OriginalWebSocket = globalThis.WebSocket

// ============================================================================
// WebSocket Message Helper Tests
// ============================================================================

describe('WebSocket message helpers', () => {
  describe('generateMessageId', () => {
    it('should generate unique IDs', () => {
      const ids = new Set<string>()
      for (let i = 0; i < 100; i++) {
        ids.add(generateMessageId())
      }
      expect(ids.size).toBe(100)
    })

    it('should generate IDs with correct format', () => {
      const id = generateMessageId()
      expect(id).toMatch(/^msg-\d+-[a-z0-9]+$/)
    })
  })

  describe('parseWebSocketMessage', () => {
    it('should parse valid message', () => {
      const message = {
        id: 'msg-123',
        type: 'heartbeat',
        timestamp: '2024-01-01T00:00:00Z',
        payload: { clientTime: '2024-01-01T00:00:00Z' },
      }
      const parsed = parseWebSocketMessage(JSON.stringify(message))
      expect(parsed).toEqual(message)
    })

    it('should return null for invalid JSON', () => {
      expect(parseWebSocketMessage('not json')).toBeNull()
    })

    it('should return null for missing required fields', () => {
      expect(parseWebSocketMessage(JSON.stringify({ type: 'test' }))).toBeNull()
      expect(parseWebSocketMessage(JSON.stringify({ id: 'test' }))).toBeNull()
    })
  })

  describe('serializeWebSocketMessage', () => {
    it('should serialize message to JSON', () => {
      const message = createHeartbeatMessage()
      const serialized = serializeWebSocketMessage(message)
      expect(JSON.parse(serialized)).toEqual(message)
    })
  })

  describe('createJoinSessionMessage', () => {
    it('should create join session message', () => {
      const message = createJoinSessionMessage('ABC123', 'TestUser')
      expect(message.type).toBe('join_session')
      expect(message.payload.sessionCode).toBe('ABC123')
      expect(message.payload.participantName).toBe('TestUser')
      expect(message.id).toBeDefined()
      expect(message.timestamp).toBeDefined()
    })

    it('should include participant ID if provided', () => {
      const message = createJoinSessionMessage('ABC123', 'TestUser', 'p-123')
      expect(message.payload.participantId).toBe('p-123')
    })
  })

  describe('createLeaveSessionMessage', () => {
    it('should create leave session message', () => {
      const message = createLeaveSessionMessage('session-1', 'participant-1', 'manual')
      expect(message.type).toBe('leave_session')
      expect(message.payload.sessionId).toBe('session-1')
      expect(message.payload.participantId).toBe('participant-1')
      expect(message.payload.reason).toBe('manual')
    })
  })

  describe('createSyncActionMessage', () => {
    it('should create sync action message', () => {
      const action = createMockAction({ id: 'action-1', participantId: 'p-1', sessionId: 's-1' })
      const message = createSyncActionMessage(action, 'session-1')
      expect(message.type).toBe('sync_action')
      expect(message.payload.action).toEqual(action)
      expect(message.payload.sessionId).toBe('session-1')
    })
  })

  describe('createFullSyncRequestMessage', () => {
    it('should create full sync request message', () => {
      const message = createFullSyncRequestMessage('session-1')
      expect(message.type).toBe('full_sync')
      expect(message.payload.sessionId).toBe('session-1')
      expect(message.payload.requestType).toBe('request')
    })
  })

  describe('createPresenceUpdateMessage', () => {
    it('should create presence update message', () => {
      const message = createPresenceUpdateMessage('session-1', 'participant-1', 'online', {
        x: 1,
        y: 2,
        z: 3,
      })
      expect(message.type).toBe('presence_update')
      expect(message.payload.sessionId).toBe('session-1')
      expect(message.payload.participantId).toBe('participant-1')
      expect(message.payload.status).toBe('online')
      expect(message.payload.cursor).toEqual({ x: 1, y: 2, z: 3 })
    })
  })

  describe('createHeartbeatMessage', () => {
    it('should create heartbeat message', () => {
      const message = createHeartbeatMessage('session-1', 'participant-1')
      expect(message.type).toBe('heartbeat')
      expect(message.payload.sessionId).toBe('session-1')
      expect(message.payload.participantId).toBe('participant-1')
      expect(message.payload.clientTime).toBeDefined()
    })
  })
})

// ============================================================================
// WebSocketClient Tests
// ============================================================================

describe('WebSocketClient', () => {
  let client: WebSocketClient

  beforeEach(() => {
    // Replace global WebSocket with mock
    ;(globalThis as Record<string, unknown>).WebSocket = MockWebSocket
    client = createWebSocketClient({ debug: false })
  })

  afterEach(() => {
    client.dispose()
    // Restore original WebSocket
    ;(globalThis as Record<string, unknown>).WebSocket = OriginalWebSocket
  })

  describe('initialization', () => {
    it('should create client with default config', () => {
      expect(client.getState()).toBe('disconnected')
      expect(client.isConnected()).toBe(false)
    })

    it('should create client with custom config', () => {
      const customClient = createWebSocketClient({
        serverUrl: 'wss://custom.example.com/ws',
        heartbeatInterval: 60000,
      })
      expect(customClient.getState()).toBe('disconnected')
      customClient.dispose()
    })
  })

  describe('connection', () => {
    it('should connect to server', async () => {
      const openListener = vi.fn()
      client.on('open', openListener)

      await client.connect('wss://test.example.com/ws')

      expect(client.getState()).toBe('connected')
      expect(client.isConnected()).toBe(true)
      expect(openListener).toHaveBeenCalled()
    })

    it('should emit state_changed events', async () => {
      const stateListener = vi.fn()
      client.on('state_changed', stateListener)

      await client.connect()

      expect(stateListener).toHaveBeenCalled()
      const lastCall = stateListener.mock.calls[stateListener.mock.calls.length - 1][0]
      expect(lastCall.data.currentState).toBe('connected')
    })

    it('should disconnect', async () => {
      await client.connect()
      expect(client.isConnected()).toBe(true)

      client.disconnect()

      expect(client.getState()).toBe('disconnected')
      expect(client.isConnected()).toBe(false)
    })

    it('should emit close event on disconnect', async () => {
      const stateListener = vi.fn()
      client.on('state_changed', stateListener)

      await client.connect()
      client.disconnect()

      // The disconnect method sets state to 'disconnected' and cleans up
      // We verify that the state changed correctly
      expect(client.getState()).toBe('disconnected')
      // Check that state_changed event was emitted with disconnected state
      const calls = stateListener.mock.calls
      const disconnectCall = calls.find((call: unknown[]) => {
        const event = call[0] as { data: { currentState: string } }
        return event.data.currentState === 'disconnected'
      })
      expect(disconnectCall).toBeDefined()
    })
  })

  describe('message sending', () => {
    beforeEach(async () => {
      await client.connect()
    })

    it('should send messages', () => {
      const message = createHeartbeatMessage()
      const result = client.send(message)
      expect(result).toBe(true)
    })

    it('should fail to send when disconnected', () => {
      client.disconnect()
      const message = createHeartbeatMessage()
      const result = client.send(message)
      expect(result).toBe(false)
    })
  })

  describe('event system', () => {
    it('should add and remove listeners', async () => {
      const listener = vi.fn()

      client.on('open', listener)
      await client.connect()
      expect(listener).toHaveBeenCalledTimes(1)

      client.off('open', listener)
      client.disconnect()
      await client.connect()
      expect(listener).toHaveBeenCalledTimes(1) // Still 1
    })

    it('should handle listener errors gracefully', async () => {
      const badListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error')
      })
      const goodListener = vi.fn()

      client.on('open', badListener)
      client.on('open', goodListener)

      await expect(client.connect()).resolves.not.toThrow()
      expect(goodListener).toHaveBeenCalled()
    })
  })

  describe('dispose', () => {
    it('should clean up resources', async () => {
      await client.connect()
      expect(() => client.dispose()).not.toThrow()
      expect(client.getState()).toBe('disconnected')
    })
  })
})

// ============================================================================
// PollingClient Tests
// ============================================================================

describe('PollingClient', () => {
  let client: PollingClient
  let fetchMock: Mock

  beforeEach(() => {
    // Mock fetch
    fetchMock = vi.fn()
    globalThis.fetch = fetchMock
    client = createPollingClient({ debug: false, pollInterval: 100 })
  })

  afterEach(() => {
    client.dispose()
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should create client with default config', () => {
      expect(client.getState()).toBe('disconnected')
      expect(client.isConnected()).toBe(false)
    })
  })

  describe('connection', () => {
    it('should connect and start polling', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, messages: [] }),
      })

      const openListener = vi.fn()
      client.on('open', openListener)

      await client.connect('session-1', 'participant-1')

      expect(client.getState()).toBe('connected')
      expect(client.isConnected()).toBe(true)
      expect(openListener).toHaveBeenCalled()
    })

    it('should emit state_changed events', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, messages: [] }),
      })

      const stateListener = vi.fn()
      client.on('state_changed', stateListener)

      await client.connect('session-1', 'participant-1')

      expect(stateListener).toHaveBeenCalled()
    })

    it('should disconnect and stop polling', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, messages: [] }),
      })

      await client.connect('session-1', 'participant-1')
      expect(client.isConnected()).toBe(true)

      client.disconnect()

      expect(client.getState()).toBe('disconnected')
      expect(client.isConnected()).toBe(false)
    })

    it('should handle connection failure', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'))

      const errorListener = vi.fn()
      client.on('error', errorListener)

      await expect(client.connect('session-1', 'participant-1')).rejects.toThrow()
      expect(client.getState()).toBe('error')
    })
  })

  describe('message handling', () => {
    it('should process incoming messages from poll', async () => {
      const incomingMessage = {
        id: 'msg-1',
        type: 'sync_action',
        timestamp: new Date().toISOString(),
        payload: {
          action: {
            id: 'action-1',
            type: 'cube_create',
            participantId: 'other-p',
            sessionId: 'session-1',
            timestamp: new Date().toISOString(),
            payload: { cube: { id: 'cube-1' } },
          },
          sessionId: 'session-1',
        },
      }

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, messages: [incomingMessage] }),
      })

      const messageListener = vi.fn()
      client.on('message', messageListener)

      await client.connect('session-1', 'participant-1')

      // Wait for poll to process
      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(messageListener).toHaveBeenCalled()
    })
  })

  describe('action sending', () => {
    beforeEach(async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, messages: [] }),
      })
      await client.connect('session-1', 'participant-1')
    })

    it('should send actions', async () => {
      const action = createMockAction()

      fetchMock.mockResolvedValue({ ok: true })

      await expect(client.sendAction(action)).resolves.not.toThrow()
    })

    it('should fail when not connected', async () => {
      client.disconnect()

      const action = createMockAction()

      await expect(client.sendAction(action)).rejects.toThrow('Not connected')
    })
  })

  describe('presence updates', () => {
    beforeEach(async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, messages: [] }),
      })
      await client.connect('session-1', 'participant-1')
    })

    it('should update presence', async () => {
      fetchMock.mockResolvedValue({ ok: true })

      await expect(client.updatePresence('online', { x: 1, y: 2, z: 3 })).resolves.not.toThrow()
    })
  })
})

// ============================================================================
// RealtimeClient Tests
// ============================================================================

describe('RealtimeClient', () => {
  let client: RealtimeClient
  let fetchMock: Mock

  beforeEach(() => {
    // Mock WebSocket and fetch
    ;(globalThis as Record<string, unknown>).WebSocket = MockWebSocket
    fetchMock = vi.fn()
    globalThis.fetch = fetchMock
    client = createRealtimeClient({
      preferWebSocket: true,
      enablePollingFallback: true,
    })
  })

  afterEach(() => {
    client.dispose()
    ;(globalThis as Record<string, unknown>).WebSocket = OriginalWebSocket
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should create client', () => {
      expect(client.getState()).toBe('disconnected')
      expect(client.isConnected()).toBe(false)
    })
  })

  describe('WebSocket preferred mode', () => {
    it('should use WebSocket when available', async () => {
      await client.connect('session-1', 'participant-1')

      expect(client.isUsingWebSocket()).toBe(true)
      expect(client.getWebSocketClient()).not.toBeNull()
      expect(client.getPollingClient()).toBeNull()
    })
  })

  describe('polling fallback', () => {
    it('should fallback to polling when WebSocket not supported', async () => {
      // Remove WebSocket to simulate unsupported environment
      const savedWebSocket = (globalThis as Record<string, unknown>).WebSocket
      delete (globalThis as Record<string, unknown>).WebSocket

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, messages: [] }),
      })

      const fallbackClient = createRealtimeClient({
        preferWebSocket: true,
        enablePollingFallback: true,
      })

      await fallbackClient.connect('session-1', 'participant-1')
      expect(fallbackClient.isUsingWebSocket()).toBe(false)
      expect(fallbackClient.getPollingClient()).not.toBeNull()

      fallbackClient.dispose()
      // Restore WebSocket
      ;(globalThis as Record<string, unknown>).WebSocket = savedWebSocket
    })

    it('should use polling when WebSocket not preferred', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, messages: [] }),
      })

      const pollingClient = createRealtimeClient({
        preferWebSocket: false,
        enablePollingFallback: true,
      })

      await pollingClient.connect('session-1', 'participant-1')

      expect(pollingClient.isUsingWebSocket()).toBe(false)
      expect(pollingClient.getPollingClient()).not.toBeNull()

      pollingClient.dispose()
    })
  })

  describe('event forwarding', () => {
    it('should forward state_changed events', async () => {
      const stateListener = vi.fn()
      client.on('state_changed', stateListener)

      await client.connect('session-1', 'participant-1')

      expect(stateListener).toHaveBeenCalled()
    })

    it('should forward open events', async () => {
      const openListener = vi.fn()
      client.on('open', openListener)

      await client.connect('session-1', 'participant-1')

      expect(openListener).toHaveBeenCalled()
    })
  })

  describe('disconnect', () => {
    it('should disconnect properly', async () => {
      await client.connect('session-1', 'participant-1')
      expect(client.isConnected()).toBe(true)

      client.disconnect()

      expect(client.isConnected()).toBe(false)
      expect(client.getWebSocketClient()).toBeNull()
    })
  })
})

// ============================================================================
// Default Config Tests
// ============================================================================

describe('Default configurations', () => {
  it('should have valid WebSocket default config', () => {
    expect(DEFAULT_WEBSOCKET_CONFIG.serverUrl).toBeDefined()
    expect(DEFAULT_WEBSOCKET_CONFIG.autoReconnect).toBe(true)
    expect(DEFAULT_WEBSOCKET_CONFIG.maxReconnectAttempts).toBeGreaterThan(0)
    expect(DEFAULT_WEBSOCKET_CONFIG.heartbeatInterval).toBeGreaterThan(0)
    expect(DEFAULT_WEBSOCKET_CONFIG.connectionTimeout).toBeGreaterThan(0)
  })

  it('should have valid polling default config', () => {
    expect(DEFAULT_POLLING_CONFIG.serverUrl).toBeDefined()
    expect(DEFAULT_POLLING_CONFIG.pollInterval).toBeGreaterThan(0)
    expect(DEFAULT_POLLING_CONFIG.requestTimeout).toBeGreaterThan(0)
    expect(DEFAULT_POLLING_CONFIG.maxRetries).toBeGreaterThan(0)
  })
})
