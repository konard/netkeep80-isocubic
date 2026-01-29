/**
 * Tests for session store module
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { SessionStore, createSessionStore } from './session-store.js'
import { DEFAULT_SERVER_CONFIG } from './types.js'
import type { ServerConfig, CollaborativeAction } from './types.js'

describe('SessionStore', () => {
  let store: SessionStore
  let config: ServerConfig

  beforeEach(() => {
    config = { ...DEFAULT_SERVER_CONFIG, debug: false }
    store = createSessionStore(config)
  })

  describe('createSession', () => {
    it('should create a new session with owner participant', () => {
      const { session, participant } = store.createSession('Alice')

      expect(session).toBeDefined()
      expect(session.id).toMatch(/^s-/)
      expect(session.code).toHaveLength(6)
      expect(session.ownerId).toBe(participant.id)

      expect(participant).toBeDefined()
      expect(participant.name).toBe('Alice')
      expect(participant.role).toBe('owner')
      expect(participant.status).toBe('online')
    })

    it('should create session with custom settings', () => {
      const { session } = store.createSession('Alice', {
        name: 'My Session',
        maxParticipants: 5,
        isOpen: false,
      })

      expect(session.settings.name).toBe('My Session')
      expect(session.settings.maxParticipants).toBe(5)
      expect(session.settings.isOpen).toBe(false)
    })

    it('should generate unique session codes', () => {
      const codes = new Set<string>()
      for (let i = 0; i < 100; i++) {
        const { session } = store.createSession(`User${i}`)
        expect(codes.has(session.code)).toBe(false)
        codes.add(session.code)
      }
    })

    it('should throw when max sessions reached', () => {
      const limitedConfig = { ...config, maxSessions: 2 }
      const limitedStore = createSessionStore(limitedConfig)

      limitedStore.createSession('Alice')
      limitedStore.createSession('Bob')

      expect(() => limitedStore.createSession('Charlie')).toThrow(
        'Maximum number of sessions reached'
      )
    })
  })

  describe('joinSession', () => {
    it('should allow joining an existing session', () => {
      const { session: createdSession } = store.createSession('Alice')
      const { session, participant } = store.joinSession(createdSession.code, 'Bob')

      expect(session.id).toBe(createdSession.id)
      expect(participant.name).toBe('Bob')
      expect(participant.role).toBe('editor')
      expect(session.participants).toHaveLength(2)
    })

    it('should throw for invalid session code', () => {
      expect(() => store.joinSession('INVALID', 'Bob')).toThrow('Session not found')
    })

    it('should throw when session is closed', () => {
      const { session } = store.createSession('Alice', { isOpen: false })
      expect(() => store.joinSession(session.code, 'Bob')).toThrow('Session is closed')
    })

    it('should throw when session is full', () => {
      const { session } = store.createSession('Alice', { maxParticipants: 1 })
      expect(() => store.joinSession(session.code, 'Bob')).toThrow('Session is full')
    })

    it('should allow reconnection with existing participantId', () => {
      const { session: createdSession } = store.createSession('Alice')
      const { participant: bob } = store.joinSession(createdSession.code, 'Bob')

      // Simulate reconnection
      const { participant: reconnectedBob } = store.joinSession(createdSession.code, 'Bob', bob.id)

      expect(reconnectedBob.id).toBe(bob.id)
      expect(reconnectedBob.status).toBe('online')
    })
  })

  describe('leaveSession', () => {
    it('should remove participant from session', () => {
      const { session } = store.createSession('Alice')
      const { participant: bob } = store.joinSession(session.code, 'Bob')

      const success = store.leaveSession(session.id, bob.id)

      expect(success).toBe(true)
      const updatedSession = store.getSession(session.id)
      expect(updatedSession?.participants).toHaveLength(1)
    })

    it('should transfer ownership when owner leaves', () => {
      const { session, participant: alice } = store.createSession('Alice')
      store.joinSession(session.code, 'Bob')

      store.leaveSession(session.id, alice.id)

      const updatedSession = store.getSession(session.id)
      expect(updatedSession?.participants).toHaveLength(1)
      expect(updatedSession?.participants[0]?.[1].role).toBe('owner')
    })

    it('should delete session when last participant leaves', () => {
      const { session, participant } = store.createSession('Alice')

      store.leaveSession(session.id, participant.id)

      expect(store.getSession(session.id)).toBeNull()
    })

    it('should return false for non-existent participant', () => {
      const { session } = store.createSession('Alice')
      const success = store.leaveSession(session.id, 'non-existent')
      expect(success).toBe(false)
    })
  })

  describe('updatePresence', () => {
    it('should update participant status', () => {
      const { session, participant } = store.createSession('Alice')

      const updated = store.updatePresence(session.id, participant.id, 'away')

      expect(updated?.status).toBe('away')
    })

    it('should update participant cursor', () => {
      const { session, participant } = store.createSession('Alice')

      const cursor = { x: 1, y: 2, z: 3, selectedCubeId: 'cube-1' }
      const updated = store.updatePresence(session.id, participant.id, undefined, cursor)

      expect(updated?.cursor).toEqual(cursor)
    })

    it('should return null for non-existent participant', () => {
      const { session } = store.createSession('Alice')
      const updated = store.updatePresence(session.id, 'non-existent', 'away')
      expect(updated).toBeNull()
    })
  })

  describe('updateParticipantRole', () => {
    it('should update participant role when owner requests', () => {
      const { session, participant: owner } = store.createSession('Alice')
      const { participant: editor } = store.joinSession(session.code, 'Bob')

      const success = store.updateParticipantRole(session.id, owner.id, editor.id, 'viewer')

      expect(success).toBe(true)
      const updatedSession = store.getSession(session.id)
      const updatedBob = updatedSession?.participants.find(([id]) => id === editor.id)?.[1]
      expect(updatedBob?.role).toBe('viewer')
    })

    it('should not allow non-owner to update roles', () => {
      const { session } = store.createSession('Alice')
      const { participant: bob } = store.joinSession(session.code, 'Bob')
      const { participant: charlie } = store.joinSession(session.code, 'Charlie')

      const success = store.updateParticipantRole(session.id, bob.id, charlie.id, 'viewer')
      expect(success).toBe(false)
    })

    it('should not allow changing owner role', () => {
      const { session, participant: owner } = store.createSession('Alice')
      const { participant: bob } = store.joinSession(session.code, 'Bob')

      const success = store.updateParticipantRole(session.id, owner.id, owner.id, 'viewer')
      expect(success).toBe(false)

      // Also can't make someone else owner
      const success2 = store.updateParticipantRole(session.id, owner.id, bob.id, 'owner')
      expect(success2).toBe(false)
    })
  })

  describe('applyAction', () => {
    it('should apply cube_create action', () => {
      const { session, participant } = store.createSession('Alice')

      const action: CollaborativeAction = {
        id: 'action-1',
        type: 'cube_create',
        participantId: participant.id,
        sessionId: session.id,
        timestamp: new Date().toISOString(),
        payload: { cube: { id: 'cube-1', name: 'Test Cube' } },
      }

      const success = store.applyAction(action)

      expect(success).toBe(true)
      const updatedSession = store.getSession(session.id)
      expect(updatedSession?.cubes).toHaveLength(1)
      expect(updatedSession?.cubes[0]?.[0]).toBe('cube-1')
    })

    it('should apply cube_update action', () => {
      const { session, participant } = store.createSession('Alice')

      // First create a cube
      store.applyAction({
        id: 'action-1',
        type: 'cube_create',
        participantId: participant.id,
        sessionId: session.id,
        timestamp: new Date().toISOString(),
        payload: { cube: { id: 'cube-1', name: 'Test Cube', color: 'red' } },
      })

      // Then update it
      const success = store.applyAction({
        id: 'action-2',
        type: 'cube_update',
        participantId: participant.id,
        sessionId: session.id,
        timestamp: new Date().toISOString(),
        payload: { cubeId: 'cube-1', changes: { color: 'blue' } },
      })

      expect(success).toBe(true)
      const updatedSession = store.getSession(session.id)
      const cube = updatedSession?.cubes[0]?.[1] as Record<string, unknown>
      expect(cube?.color).toBe('blue')
    })

    it('should apply cube_delete action', () => {
      const { session, participant } = store.createSession('Alice')

      store.applyAction({
        id: 'action-1',
        type: 'cube_create',
        participantId: participant.id,
        sessionId: session.id,
        timestamp: new Date().toISOString(),
        payload: { cube: { id: 'cube-1' } },
      })

      const success = store.applyAction({
        id: 'action-2',
        type: 'cube_delete',
        participantId: participant.id,
        sessionId: session.id,
        timestamp: new Date().toISOString(),
        payload: { cubeId: 'cube-1' },
      })

      expect(success).toBe(true)
      const updatedSession = store.getSession(session.id)
      expect(updatedSession?.cubes).toHaveLength(0)
    })

    it('should not allow viewer to modify cubes', () => {
      const { session, participant: owner } = store.createSession('Alice')
      const { participant: viewer } = store.joinSession(session.code, 'Bob')

      // Make Bob a viewer
      store.updateParticipantRole(session.id, owner.id, viewer.id, 'viewer')

      const success = store.applyAction({
        id: 'action-1',
        type: 'cube_create',
        participantId: viewer.id,
        sessionId: session.id,
        timestamp: new Date().toISOString(),
        payload: { cube: { id: 'cube-1' } },
      })

      expect(success).toBe(false)
    })
  })

  describe('cleanup', () => {
    it('should mark inactive participants as offline', () => {
      // Use a very short timeout for testing
      const shortTimeoutConfig = { ...config, participantTimeoutMs: 1 }
      const shortStore = createSessionStore(shortTimeoutConfig)

      const { session, participant } = shortStore.createSession('Alice')

      // Wait a bit and run cleanup
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          shortStore.cleanup()

          const updatedSession = shortStore.getSession(session.id)
          const alice = updatedSession?.participants.find(([id]) => id === participant.id)?.[1]
          expect(alice?.status).toBe('offline')
          resolve()
        }, 10)
      })
    })
  })

  describe('getSessionByCode', () => {
    it('should find session by code', () => {
      const { session } = store.createSession('Alice')
      const found = store.getSessionByCode(session.code)
      expect(found?.id).toBe(session.id)
    })

    it('should be case-insensitive', () => {
      const { session } = store.createSession('Alice')
      const found = store.getSessionByCode(session.code.toLowerCase())
      expect(found?.id).toBe(session.id)
    })

    it('should return null for non-existent code', () => {
      const found = store.getSessionByCode('INVALID')
      expect(found).toBeNull()
    })
  })
})
