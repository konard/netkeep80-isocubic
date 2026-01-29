/**
 * Unit tests for collaboration types
 */

import { describe, it, expect } from 'vitest'
import {
  generateParticipantColor,
  generateSessionCode,
  generateActionId,
  generateParticipantId,
  generateSessionId,
  isCubeModificationAction,
  isPresenceAction,
  serializeSession,
  deserializeSession,
  DEFAULT_SESSION_SETTINGS,
  DEFAULT_COLLABORATION_CONFIG,
} from './collaboration'
import type {
  Session,
  Participant,
  CubeCreateAction,
  CubeUpdateAction,
  CubeDeleteAction,
  CursorMoveAction,
  ParticipantJoinAction,
} from './collaboration'

describe('collaboration types', () => {
  describe('generateParticipantColor', () => {
    it('should generate a valid hex color', () => {
      const color = generateParticipantColor()
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })

    it('should generate colors from predefined palette', () => {
      const validColors = [
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

      for (let i = 0; i < 50; i++) {
        const color = generateParticipantColor()
        expect(validColors).toContain(color)
      }
    })
  })

  describe('generateSessionCode', () => {
    it('should generate a 6 character code', () => {
      const code = generateSessionCode()
      expect(code.length).toBe(6)
    })

    it('should only contain valid characters', () => {
      const validChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

      for (let i = 0; i < 50; i++) {
        const code = generateSessionCode()
        for (const char of code) {
          expect(validChars).toContain(char)
        }
      }
    })

    it('should not contain ambiguous characters', () => {
      const ambiguousChars = ['0', 'O', '1', 'I', 'L']

      for (let i = 0; i < 100; i++) {
        const code = generateSessionCode()
        for (const char of ambiguousChars) {
          expect(code).not.toContain(char)
        }
      }
    })

    it('should generate unique codes', () => {
      const codes = new Set<string>()

      for (let i = 0; i < 100; i++) {
        codes.add(generateSessionCode())
      }

      // Most codes should be unique (allow some collisions due to randomness)
      expect(codes.size).toBeGreaterThan(90)
    })
  })

  describe('generateActionId', () => {
    it('should generate a non-empty string', () => {
      const id = generateActionId()
      expect(id.length).toBeGreaterThan(0)
    })

    it('should contain timestamp component', () => {
      const id = generateActionId()
      const parts = id.split('-')
      expect(parts.length).toBe(2)

      const timestamp = parseInt(parts[0], 10)
      expect(timestamp).toBeGreaterThan(0)
      expect(timestamp).toBeLessThanOrEqual(Date.now())
    })

    it('should generate unique IDs', () => {
      const ids = new Set<string>()

      for (let i = 0; i < 100; i++) {
        ids.add(generateActionId())
      }

      expect(ids.size).toBe(100)
    })
  })

  describe('generateParticipantId', () => {
    it('should start with p-', () => {
      const id = generateParticipantId()
      expect(id.startsWith('p-')).toBe(true)
    })

    it('should be unique', () => {
      const ids = new Set<string>()

      for (let i = 0; i < 100; i++) {
        ids.add(generateParticipantId())
      }

      expect(ids.size).toBe(100)
    })
  })

  describe('generateSessionId', () => {
    it('should start with s-', () => {
      const id = generateSessionId()
      expect(id.startsWith('s-')).toBe(true)
    })

    it('should be unique', () => {
      const ids = new Set<string>()

      for (let i = 0; i < 100; i++) {
        ids.add(generateSessionId())
      }

      expect(ids.size).toBe(100)
    })
  })

  describe('isCubeModificationAction', () => {
    it('should return true for cube_create action', () => {
      const action: CubeCreateAction = {
        id: 'test',
        type: 'cube_create',
        participantId: 'p1',
        sessionId: 's1',
        timestamp: new Date().toISOString(),
        payload: {
          cube: {
            id: 'cube1',
            base: { color: [1, 0, 0] },
          },
        },
      }

      expect(isCubeModificationAction(action)).toBe(true)
    })

    it('should return true for cube_update action', () => {
      const action: CubeUpdateAction = {
        id: 'test',
        type: 'cube_update',
        participantId: 'p1',
        sessionId: 's1',
        timestamp: new Date().toISOString(),
        payload: {
          cubeId: 'cube1',
          changes: { base: { color: [0, 1, 0] } },
        },
      }

      expect(isCubeModificationAction(action)).toBe(true)
    })

    it('should return true for cube_delete action', () => {
      const action: CubeDeleteAction = {
        id: 'test',
        type: 'cube_delete',
        participantId: 'p1',
        sessionId: 's1',
        timestamp: new Date().toISOString(),
        payload: {
          cubeId: 'cube1',
        },
      }

      expect(isCubeModificationAction(action)).toBe(true)
    })

    it('should return false for cursor_move action', () => {
      const action: CursorMoveAction = {
        id: 'test',
        type: 'cursor_move',
        participantId: 'p1',
        sessionId: 's1',
        timestamp: new Date().toISOString(),
        payload: {
          position: { x: 0, y: 0, z: 0 },
        },
      }

      expect(isCubeModificationAction(action)).toBe(false)
    })

    it('should return false for participant_join action', () => {
      const action: ParticipantJoinAction = {
        id: 'test',
        type: 'participant_join',
        participantId: 'p1',
        sessionId: 's1',
        timestamp: new Date().toISOString(),
        payload: {
          participant: {
            id: 'p1',
            name: 'Test',
            color: '#FF6B6B',
            role: 'editor',
            status: 'online',
            joinedAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
          },
        },
      }

      expect(isCubeModificationAction(action)).toBe(false)
    })
  })

  describe('isPresenceAction', () => {
    it('should return true for cursor_move action', () => {
      const action: CursorMoveAction = {
        id: 'test',
        type: 'cursor_move',
        participantId: 'p1',
        sessionId: 's1',
        timestamp: new Date().toISOString(),
        payload: {
          position: { x: 0, y: 0, z: 0 },
        },
      }

      expect(isPresenceAction(action)).toBe(true)
    })

    it('should return true for participant_join action', () => {
      const action: ParticipantJoinAction = {
        id: 'test',
        type: 'participant_join',
        participantId: 'p1',
        sessionId: 's1',
        timestamp: new Date().toISOString(),
        payload: {
          participant: {
            id: 'p1',
            name: 'Test',
            color: '#FF6B6B',
            role: 'editor',
            status: 'online',
            joinedAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
          },
        },
      }

      expect(isPresenceAction(action)).toBe(true)
    })

    it('should return false for cube_create action', () => {
      const action: CubeCreateAction = {
        id: 'test',
        type: 'cube_create',
        participantId: 'p1',
        sessionId: 's1',
        timestamp: new Date().toISOString(),
        payload: {
          cube: {
            id: 'cube1',
            base: { color: [1, 0, 0] },
          },
        },
      }

      expect(isPresenceAction(action)).toBe(false)
    })
  })

  describe('serializeSession and deserializeSession', () => {
    it('should correctly serialize and deserialize a session', () => {
      const now = new Date().toISOString()
      const participant: Participant = {
        id: 'p1',
        name: 'Test User',
        color: '#FF6B6B',
        role: 'owner',
        status: 'online',
        joinedAt: now,
        lastActiveAt: now,
      }

      const session: Session = {
        id: 's1',
        code: 'ABC123',
        settings: DEFAULT_SESSION_SETTINGS,
        ownerId: 'p1',
        participants: new Map([['p1', participant]]),
        cubes: new Map([
          [
            'cube1',
            {
              id: 'cube1',
              base: { color: [1, 0, 0] as [number, number, number] },
            },
          ],
        ]),
        createdAt: now,
        modifiedAt: now,
      }

      const serialized = serializeSession(session)
      const deserialized = deserializeSession(serialized)

      expect(deserialized.id).toBe(session.id)
      expect(deserialized.code).toBe(session.code)
      expect(deserialized.settings).toEqual(session.settings)
      expect(deserialized.ownerId).toBe(session.ownerId)
      expect(deserialized.participants.size).toBe(1)
      expect(deserialized.participants.get('p1')).toEqual(participant)
      expect(deserialized.cubes.size).toBe(1)
      expect(deserialized.cubes.get('cube1')).toEqual(session.cubes.get('cube1'))
      expect(deserialized.createdAt).toBe(session.createdAt)
      expect(deserialized.modifiedAt).toBe(session.modifiedAt)
    })

    it('should handle empty maps', () => {
      const now = new Date().toISOString()
      const session: Session = {
        id: 's1',
        code: 'ABC123',
        settings: DEFAULT_SESSION_SETTINGS,
        ownerId: 'p1',
        participants: new Map(),
        cubes: new Map(),
        createdAt: now,
        modifiedAt: now,
      }

      const serialized = serializeSession(session)
      const deserialized = deserializeSession(serialized)

      expect(deserialized.participants.size).toBe(0)
      expect(deserialized.cubes.size).toBe(0)
    })
  })

  describe('DEFAULT_SESSION_SETTINGS', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_SESSION_SETTINGS.name).toBe('Untitled Session')
      expect(DEFAULT_SESSION_SETTINGS.isOpen).toBe(true)
      expect(DEFAULT_SESSION_SETTINGS.maxParticipants).toBe(10)
      expect(DEFAULT_SESSION_SETTINGS.allowRoleRequests).toBe(true)
      expect(DEFAULT_SESSION_SETTINGS.autoSaveInterval).toBe(30000)
    })
  })

  describe('DEFAULT_COLLABORATION_CONFIG', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_COLLABORATION_CONFIG.conflictResolution).toBe('last_write_wins')
      expect(DEFAULT_COLLABORATION_CONFIG.offlineActionTimeout).toBe(300000)
      expect(DEFAULT_COLLABORATION_CONFIG.maxPendingActions).toBe(100)
      expect(DEFAULT_COLLABORATION_CONFIG.cursorUpdateInterval).toBe(50)
      expect(DEFAULT_COLLABORATION_CONFIG.enableOptimisticUpdates).toBe(true)
    })
  })
})
