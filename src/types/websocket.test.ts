/**
 * Unit tests for WebSocket types module
 */

import { describe, it, expect } from 'vitest'
import {
  DEFAULT_WEBSOCKET_CONFIG,
  DEFAULT_POLLING_CONFIG,
  generateMessageId,
  isIncomingMessage,
  isOutgoingMessage,
  createJoinSessionMessage,
  createLeaveSessionMessage,
  createSyncActionMessage,
  createFullSyncRequestMessage,
  createPresenceUpdateMessage,
  createHeartbeatMessage,
  parseWebSocketMessage,
  serializeWebSocketMessage,
} from './websocket'
import type { WebSocketMessage, JoinSessionResponse, ErrorMessage, AckMessage } from './websocket'

// ============================================================================
// Default Configuration Tests
// ============================================================================

describe('Default configurations', () => {
  describe('DEFAULT_WEBSOCKET_CONFIG', () => {
    it('should have all required fields', () => {
      expect(DEFAULT_WEBSOCKET_CONFIG.serverUrl).toBeDefined()
      expect(typeof DEFAULT_WEBSOCKET_CONFIG.autoReconnect).toBe('boolean')
      expect(typeof DEFAULT_WEBSOCKET_CONFIG.maxReconnectAttempts).toBe('number')
      expect(typeof DEFAULT_WEBSOCKET_CONFIG.reconnectBaseDelay).toBe('number')
      expect(typeof DEFAULT_WEBSOCKET_CONFIG.reconnectMaxDelay).toBe('number')
      expect(typeof DEFAULT_WEBSOCKET_CONFIG.heartbeatInterval).toBe('number')
      expect(typeof DEFAULT_WEBSOCKET_CONFIG.connectionTimeout).toBe('number')
      expect(typeof DEFAULT_WEBSOCKET_CONFIG.enableCompression).toBe('boolean')
      expect(typeof DEFAULT_WEBSOCKET_CONFIG.debug).toBe('boolean')
    })

    it('should have sensible default values', () => {
      expect(DEFAULT_WEBSOCKET_CONFIG.autoReconnect).toBe(true)
      expect(DEFAULT_WEBSOCKET_CONFIG.maxReconnectAttempts).toBeGreaterThanOrEqual(5)
      expect(DEFAULT_WEBSOCKET_CONFIG.heartbeatInterval).toBeGreaterThanOrEqual(10000)
      expect(DEFAULT_WEBSOCKET_CONFIG.connectionTimeout).toBeGreaterThanOrEqual(5000)
    })
  })

  describe('DEFAULT_POLLING_CONFIG', () => {
    it('should have all required fields', () => {
      expect(DEFAULT_POLLING_CONFIG.serverUrl).toBeDefined()
      expect(typeof DEFAULT_POLLING_CONFIG.pollInterval).toBe('number')
      expect(typeof DEFAULT_POLLING_CONFIG.requestTimeout).toBe('number')
      expect(typeof DEFAULT_POLLING_CONFIG.maxRetries).toBe('number')
      expect(typeof DEFAULT_POLLING_CONFIG.debug).toBe('boolean')
    })

    it('should have sensible default values', () => {
      expect(DEFAULT_POLLING_CONFIG.pollInterval).toBeGreaterThanOrEqual(1000)
      expect(DEFAULT_POLLING_CONFIG.requestTimeout).toBeGreaterThanOrEqual(3000)
      expect(DEFAULT_POLLING_CONFIG.maxRetries).toBeGreaterThanOrEqual(1)
    })
  })
})

// ============================================================================
// Message ID Generation Tests
// ============================================================================

describe('generateMessageId', () => {
  it('should generate unique IDs', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 1000; i++) {
      ids.add(generateMessageId())
    }
    expect(ids.size).toBe(1000)
  })

  it('should generate IDs with msg- prefix', () => {
    const id = generateMessageId()
    expect(id.startsWith('msg-')).toBe(true)
  })

  it('should include timestamp component', () => {
    const before = Date.now()
    const id = generateMessageId()
    const after = Date.now()

    const parts = id.split('-')
    const timestamp = parseInt(parts[1], 10)

    expect(timestamp).toBeGreaterThanOrEqual(before)
    expect(timestamp).toBeLessThanOrEqual(after)
  })
})

// ============================================================================
// Message Creation Tests
// ============================================================================

describe('Message creation functions', () => {
  describe('createJoinSessionMessage', () => {
    it('should create valid join session message', () => {
      const message = createJoinSessionMessage('ABC123', 'TestUser')

      expect(message.type).toBe('join_session')
      expect(message.id).toBeDefined()
      expect(message.timestamp).toBeDefined()
      expect(message.payload.sessionCode).toBe('ABC123')
      expect(message.payload.participantName).toBe('TestUser')
    })

    it('should include participant ID when provided', () => {
      const message = createJoinSessionMessage('ABC123', 'TestUser', 'p-123')
      expect(message.payload.participantId).toBe('p-123')
    })

    it('should not include participant ID when not provided', () => {
      const message = createJoinSessionMessage('ABC123', 'TestUser')
      expect(message.payload.participantId).toBeUndefined()
    })
  })

  describe('createLeaveSessionMessage', () => {
    it('should create valid leave session message', () => {
      const message = createLeaveSessionMessage('s-123', 'p-456')

      expect(message.type).toBe('leave_session')
      expect(message.id).toBeDefined()
      expect(message.timestamp).toBeDefined()
      expect(message.payload.sessionId).toBe('s-123')
      expect(message.payload.participantId).toBe('p-456')
    })

    it('should include reason when provided', () => {
      const message = createLeaveSessionMessage('s-123', 'p-456', 'kicked')
      expect(message.payload.reason).toBe('kicked')
    })

    it('should not include reason when not provided', () => {
      const message = createLeaveSessionMessage('s-123', 'p-456')
      expect(message.payload.reason).toBeUndefined()
    })
  })

  describe('createSyncActionMessage', () => {
    it('should create valid sync action message', () => {
      const action = {
        id: 'action-1',
        type: 'cube_create' as const,
        participantId: 'p-1',
        sessionId: 's-1',
        timestamp: new Date().toISOString(),
        payload: { cube: { id: 'cube-1', base: { color: [1, 0, 0] } } },
      }

      const message = createSyncActionMessage(action, 's-123')

      expect(message.type).toBe('sync_action')
      expect(message.id).toBeDefined()
      expect(message.timestamp).toBeDefined()
      expect(message.payload.action).toEqual(action)
      expect(message.payload.sessionId).toBe('s-123')
    })
  })

  describe('createFullSyncRequestMessage', () => {
    it('should create valid full sync request message', () => {
      const message = createFullSyncRequestMessage('s-123')

      expect(message.type).toBe('full_sync')
      expect(message.id).toBeDefined()
      expect(message.timestamp).toBeDefined()
      expect(message.payload.sessionId).toBe('s-123')
      expect(message.payload.requestType).toBe('request')
    })
  })

  describe('createPresenceUpdateMessage', () => {
    it('should create valid presence update message with all fields', () => {
      const cursor = { x: 1, y: 2, z: 3, selectedCubeId: 'cube-1' }
      const message = createPresenceUpdateMessage('s-123', 'p-456', 'online', cursor)

      expect(message.type).toBe('presence_update')
      expect(message.id).toBeDefined()
      expect(message.timestamp).toBeDefined()
      expect(message.payload.sessionId).toBe('s-123')
      expect(message.payload.participantId).toBe('p-456')
      expect(message.payload.status).toBe('online')
      expect(message.payload.cursor).toEqual(cursor)
    })

    it('should create valid presence update message with only status', () => {
      const message = createPresenceUpdateMessage('s-123', 'p-456', 'away')

      expect(message.payload.status).toBe('away')
      expect(message.payload.cursor).toBeUndefined()
    })

    it('should create valid presence update message with only cursor', () => {
      const cursor = { x: 10, y: 20, z: 30 }
      const message = createPresenceUpdateMessage('s-123', 'p-456', undefined, cursor)

      expect(message.payload.status).toBeUndefined()
      expect(message.payload.cursor).toEqual(cursor)
    })
  })

  describe('createHeartbeatMessage', () => {
    it('should create valid heartbeat message', () => {
      const message = createHeartbeatMessage()

      expect(message.type).toBe('heartbeat')
      expect(message.id).toBeDefined()
      expect(message.timestamp).toBeDefined()
      expect(message.payload.clientTime).toBeDefined()
    })

    it('should include session and participant IDs when provided', () => {
      const message = createHeartbeatMessage('s-123', 'p-456')

      expect(message.payload.sessionId).toBe('s-123')
      expect(message.payload.participantId).toBe('p-456')
    })
  })
})

// ============================================================================
// Message Parsing Tests
// ============================================================================

describe('parseWebSocketMessage', () => {
  it('should parse valid JSON message', () => {
    const original = createHeartbeatMessage()
    const serialized = JSON.stringify(original)
    const parsed = parseWebSocketMessage(serialized)

    expect(parsed).toEqual(original)
  })

  it('should return null for invalid JSON', () => {
    expect(parseWebSocketMessage('not valid json')).toBeNull()
    expect(parseWebSocketMessage('{invalid: json}')).toBeNull()
    expect(parseWebSocketMessage('')).toBeNull()
  })

  it('should return null for missing required fields', () => {
    // Missing id
    expect(
      parseWebSocketMessage(
        JSON.stringify({
          type: 'heartbeat',
          timestamp: '2024-01-01',
          payload: {},
        })
      )
    ).toBeNull()

    // Missing type
    expect(
      parseWebSocketMessage(
        JSON.stringify({
          id: 'msg-1',
          timestamp: '2024-01-01',
          payload: {},
        })
      )
    ).toBeNull()

    // Missing timestamp
    expect(
      parseWebSocketMessage(
        JSON.stringify({
          id: 'msg-1',
          type: 'heartbeat',
          payload: {},
        })
      )
    ).toBeNull()
  })

  it('should parse all message types', () => {
    const messages = [
      createJoinSessionMessage('ABC', 'User'),
      createLeaveSessionMessage('s-1', 'p-1'),
      createSyncActionMessage(
        {
          id: 'a-1',
          type: 'cube_create' as const,
          participantId: 'p-1',
          sessionId: 's-1',
          timestamp: new Date().toISOString(),
          payload: { cube: { id: 'c-1', base: { color: [1, 0, 0] } } },
        },
        's-1'
      ),
      createFullSyncRequestMessage('s-1'),
      createPresenceUpdateMessage('s-1', 'p-1', 'online'),
      createHeartbeatMessage(),
    ]

    for (const message of messages) {
      const serialized = JSON.stringify(message)
      const parsed = parseWebSocketMessage(serialized)
      expect(parsed).toEqual(message)
    }
  })
})

describe('serializeWebSocketMessage', () => {
  it('should serialize message to valid JSON', () => {
    const message = createHeartbeatMessage()
    const serialized = serializeWebSocketMessage(message)

    expect(() => JSON.parse(serialized)).not.toThrow()
    expect(JSON.parse(serialized)).toEqual(message)
  })

  it('should handle complex payloads', () => {
    const action = {
      id: 'action-1',
      type: 'cube_update' as const,
      participantId: 'p-1',
      sessionId: 's-1',
      timestamp: new Date().toISOString(),
      payload: {
        cubeId: 'cube-1',
        changes: {
          base: { color: [1, 0, 0] },
          gradients: [{ axis: 'x', factor: 0.5, color_shift: [0.1, 0.2, 0.3] }],
        },
      },
    }

    const message = createSyncActionMessage(action, 's-1')
    const serialized = serializeWebSocketMessage(message)
    const parsed = JSON.parse(serialized)

    expect(parsed.payload.action.payload.changes.gradients).toHaveLength(1)
  })
})

// ============================================================================
// Type Guard Tests
// ============================================================================

describe('isIncomingMessage', () => {
  it('should return true for error messages', () => {
    const errorMessage: ErrorMessage = {
      id: 'msg-1',
      type: 'error',
      timestamp: new Date().toISOString(),
      payload: {
        code: 'ERR_001',
        message: 'Test error',
      },
    }
    expect(isIncomingMessage(errorMessage as WebSocketMessage)).toBe(true)
  })

  it('should return true for ack messages', () => {
    const ackMessage: AckMessage = {
      id: 'msg-1',
      type: 'ack',
      timestamp: new Date().toISOString(),
      payload: {
        messageId: 'msg-0',
        success: true,
      },
    }
    expect(isIncomingMessage(ackMessage as WebSocketMessage)).toBe(true)
  })

  it('should return true for response messages with success field', () => {
    const response: JoinSessionResponse = {
      id: 'msg-1',
      type: 'join_session',
      timestamp: new Date().toISOString(),
      payload: {
        success: true,
        session: undefined,
        participant: undefined,
      },
    }
    expect(isIncomingMessage(response as WebSocketMessage)).toBe(true)
  })
})

describe('isOutgoingMessage', () => {
  it('should return true for outgoing messages', () => {
    const joinMessage = createJoinSessionMessage('ABC', 'User')
    // Note: isOutgoingMessage returns the opposite of isIncomingMessage
    // Join messages without success field are outgoing
    expect(isOutgoingMessage(joinMessage as WebSocketMessage)).toBe(true)
  })

  it('should return true for leave session messages', () => {
    const leaveMessage = createLeaveSessionMessage('s-1', 'p-1')
    expect(isOutgoingMessage(leaveMessage as WebSocketMessage)).toBe(true)
  })

  it('should return true for heartbeat messages without serverTime', () => {
    const heartbeat = createHeartbeatMessage()
    expect(isOutgoingMessage(heartbeat as WebSocketMessage)).toBe(true)
  })
})

// ============================================================================
// Message Type Validation Tests
// ============================================================================

describe('Message type validation', () => {
  it('should have correct types for all message kinds', () => {
    // Join session
    const join = createJoinSessionMessage('ABC', 'User')
    expect(join.type).toBe('join_session')

    // Leave session
    const leave = createLeaveSessionMessage('s-1', 'p-1')
    expect(leave.type).toBe('leave_session')

    // Sync action
    const sync = createSyncActionMessage(
      {
        id: 'a-1',
        type: 'cube_create',
        participantId: 'p-1',
        sessionId: 's-1',
        timestamp: new Date().toISOString(),
        payload: { cube: { id: 'c-1', base: { color: [1, 0, 0] } } },
      },
      's-1'
    )
    expect(sync.type).toBe('sync_action')

    // Full sync
    const fullSync = createFullSyncRequestMessage('s-1')
    expect(fullSync.type).toBe('full_sync')

    // Presence update
    const presence = createPresenceUpdateMessage('s-1', 'p-1', 'online')
    expect(presence.type).toBe('presence_update')

    // Heartbeat
    const heartbeat = createHeartbeatMessage()
    expect(heartbeat.type).toBe('heartbeat')
  })
})

// ============================================================================
// Timestamp Tests
// ============================================================================

describe('Message timestamps', () => {
  it('should generate valid ISO timestamps', () => {
    const messages = [
      createJoinSessionMessage('ABC', 'User'),
      createLeaveSessionMessage('s-1', 'p-1'),
      createSyncActionMessage(
        {
          id: 'a-1',
          type: 'cube_create',
          participantId: 'p-1',
          sessionId: 's-1',
          timestamp: new Date().toISOString(),
          payload: { cube: { id: 'c-1', base: { color: [1, 0, 0] } } },
        },
        's-1'
      ),
      createFullSyncRequestMessage('s-1'),
      createPresenceUpdateMessage('s-1', 'p-1', 'online'),
      createHeartbeatMessage(),
    ]

    for (const message of messages) {
      expect(() => new Date(message.timestamp)).not.toThrow()
      expect(new Date(message.timestamp).toISOString()).toBe(message.timestamp)
    }
  })

  it('should generate timestamps close to current time', () => {
    const before = new Date()
    const message = createHeartbeatMessage()
    const after = new Date()

    const messageTime = new Date(message.timestamp)
    expect(messageTime.getTime()).toBeGreaterThanOrEqual(before.getTime())
    expect(messageTime.getTime()).toBeLessThanOrEqual(after.getTime())
  })
})
