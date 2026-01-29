/**
 * Unit tests for collaboration module
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  CollaborationManager,
  createCollaborationManager,
  canEdit,
  isOwner,
  formatSessionCode,
  parseSessionCode,
} from './collaboration'
import type { Participant, Session } from '../types/collaboration'
import { DEFAULT_SESSION_SETTINGS } from '../types/collaboration'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
})

describe('CollaborationManager', () => {
  let manager: CollaborationManager

  beforeEach(() => {
    localStorageMock.clear()
    manager = createCollaborationManager()
  })

  afterEach(() => {
    manager.dispose()
  })

  describe('initialization', () => {
    it('should create a manager with default state', () => {
      const state = manager.getState()

      expect(state.session).toBeNull()
      expect(state.localParticipantId).toBeNull()
      expect(state.connectionState).toBe('disconnected')
      expect(state.pendingActions).toEqual([])
      expect(state.error).toBeNull()
    })

    it('should restore state from localStorage', () => {
      // Create a session
      manager.createSession('Test User')
      const session = manager.getSession()

      // Don't call dispose (which leaves the session), just create a new manager
      // that should load from localStorage
      const newManager = new CollaborationManager()
      const restoredSession = newManager.getSession()

      expect(restoredSession).not.toBeNull()
      expect(restoredSession?.id).toBe(session?.id)

      newManager.dispose()
    })
  })

  describe('createSession', () => {
    it('should create a new session', () => {
      const result = manager.createSession('Test User')

      expect(result.success).toBe(true)
      expect(result.session).toBeDefined()
      expect(result.session?.code.length).toBe(6)
    })

    it('should set the creator as owner', () => {
      manager.createSession('Test User')
      const participant = manager.getLocalParticipant()

      expect(participant).not.toBeNull()
      expect(participant?.role).toBe('owner')
      expect(participant?.name).toBe('Test User')
    })

    it('should apply custom settings', () => {
      const customSettings = {
        name: 'My Session',
        maxParticipants: 5,
      }

      const result = manager.createSession('Test User', customSettings)

      expect(result.session?.settings.name).toBe('My Session')
      expect(result.session?.settings.maxParticipants).toBe(5)
      expect(result.session?.settings.isOpen).toBe(DEFAULT_SESSION_SETTINGS.isOpen)
    })

    it('should emit session_created event', () => {
      const listener = vi.fn()
      manager.on('session_created', listener)

      manager.createSession('Test User')

      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener.mock.calls[0][0].type).toBe('session_created')
    })

    it('should clear pending actions on new session', () => {
      manager.createSession('Test User')

      expect(manager.getPendingActions()).toEqual([])
    })
  })

  describe('joinSession', () => {
    let existingSession: Session

    beforeEach(() => {
      // Create a session with first manager
      manager.createSession('Owner')
      const session = manager.getSession()!

      // Make a deep copy of the session before leaving
      // (leaveSession removes the participant from the session)
      existingSession = {
        ...session,
        settings: { ...session.settings },
        participants: new Map(session.participants),
        cubes: new Map(session.cubes),
      }

      // Leave the session (this modifies the original session but not our copy)
      manager.leaveSession()
    })

    it('should join an existing session', () => {
      const result = manager.joinSession(existingSession.code, 'Joiner', existingSession)

      expect(result.success).toBe(true)
      expect(result.participant).toBeDefined()
      expect(result.participant?.role).toBe('editor')
    })

    it('should fail with invalid code', () => {
      const result = manager.joinSession('WRONG1', 'Joiner', existingSession)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid session code')
    })

    it('should fail when session is closed', () => {
      existingSession.settings.isOpen = false

      const result = manager.joinSession(existingSession.code, 'Joiner', existingSession)

      expect(result.success).toBe(false)
      expect(result.error).toContain('closed')
    })

    it('should fail when session is full', () => {
      // Session already has 1 participant (the owner), so set max to 1
      existingSession.settings.maxParticipants = 1
      // The existing session has 1 participant from creation, so it's full

      const result = manager.joinSession(existingSession.code, 'Joiner', existingSession)

      expect(result.success).toBe(false)
      expect(result.error).toContain('full')
    })

    it('should emit session_joined event', () => {
      const listener = vi.fn()
      manager.on('session_joined', listener)

      manager.joinSession(existingSession.code, 'Joiner', existingSession)

      expect(listener).toHaveBeenCalledTimes(1)
    })
  })

  describe('leaveSession', () => {
    it('should clear session state', () => {
      manager.createSession('Test User')

      expect(manager.getSession()).not.toBeNull()

      manager.leaveSession()

      expect(manager.getSession()).toBeNull()
      expect(manager.getLocalParticipant()).toBeNull()
    })

    it('should emit session_left event', () => {
      manager.createSession('Test User')
      const listener = vi.fn()
      manager.on('session_left', listener)

      manager.leaveSession()

      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('should do nothing if not in session', () => {
      expect(() => manager.leaveSession()).not.toThrow()
    })
  })

  describe('updateSessionSettings', () => {
    it('should update settings as owner', () => {
      manager.createSession('Owner')

      const result = manager.updateSessionSettings({ name: 'New Name' })

      expect(result.success).toBe(true)
      expect(manager.getSession()?.settings.name).toBe('New Name')
    })

    it('should fail when not in session', () => {
      const result = manager.updateSessionSettings({ name: 'New Name' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Not in a session')
    })
  })

  describe('participant management', () => {
    beforeEach(() => {
      manager.createSession('Owner')
    })

    it('should update participant status', () => {
      manager.updateParticipantStatus('away')

      const participant = manager.getLocalParticipant()
      expect(participant?.status).toBe('away')
    })

    it('should get all participants', () => {
      const participants = manager.getParticipants()

      expect(participants.length).toBe(1)
      expect(participants[0].name).toBe('Owner')
    })

    it('should get participant by ID', () => {
      const localId = manager.getState().localParticipantId!
      const participant = manager.getParticipant(localId)

      expect(participant).not.toBeNull()
      expect(participant?.name).toBe('Owner')
    })

    it('should return null for non-existent participant', () => {
      const participant = manager.getParticipant('non-existent')

      expect(participant).toBeNull()
    })
  })

  describe('cube operations', () => {
    beforeEach(() => {
      manager.createSession('Test User')
    })

    it('should create a cube', () => {
      const cube = {
        id: 'test-cube',
        base: { color: [1, 0, 0] as [number, number, number] },
      }

      const result = manager.createCube(cube)

      expect(result.success).toBe(true)
      expect(manager.getCube('test-cube')).toEqual(cube)
    })

    it('should update a cube', () => {
      const cube = {
        id: 'test-cube',
        base: { color: [1, 0, 0] as [number, number, number] },
      }
      manager.createCube(cube)

      const result = manager.updateCube('test-cube', {
        base: { color: [0, 1, 0] as [number, number, number] },
      })

      expect(result.success).toBe(true)
      expect(manager.getCube('test-cube')?.base.color).toEqual([0, 1, 0])
    })

    it('should fail to update non-existent cube', () => {
      const result = manager.updateCube('non-existent', {
        base: { color: [0, 1, 0] as [number, number, number] },
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('should delete a cube', () => {
      const cube = {
        id: 'test-cube',
        base: { color: [1, 0, 0] as [number, number, number] },
      }
      manager.createCube(cube)

      const result = manager.deleteCube('test-cube')

      expect(result.success).toBe(true)
      expect(manager.getCube('test-cube')).toBeNull()
    })

    it('should fail to delete non-existent cube', () => {
      const result = manager.deleteCube('non-existent')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('should select a cube', () => {
      const cube = {
        id: 'test-cube',
        base: { color: [1, 0, 0] as [number, number, number] },
      }
      manager.createCube(cube)

      const result = manager.selectCube('test-cube')

      expect(result.success).toBe(true)
    })

    it('should get all cubes', () => {
      manager.createCube({
        id: 'cube1',
        base: { color: [1, 0, 0] as [number, number, number] },
      })
      manager.createCube({
        id: 'cube2',
        base: { color: [0, 1, 0] as [number, number, number] },
      })

      const cubes = manager.getCubes()

      expect(cubes.length).toBe(2)
    })

    it('should fail cube operations when not in session', () => {
      manager.leaveSession()

      const result = manager.createCube({
        id: 'test',
        base: { color: [1, 0, 0] as [number, number, number] },
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Not in a session')
    })
  })

  describe('cursor operations', () => {
    beforeEach(() => {
      manager.createSession('Test User')
    })

    it('should update cursor position', () => {
      const result = manager.updateCursor({ x: 1, y: 2, z: 3 })

      expect(result.success).toBe(true)

      const participant = manager.getLocalParticipant()
      expect(participant?.cursor).toEqual({ x: 1, y: 2, z: 3 })
    })

    it('should start and stop cursor tracking', async () => {
      const getCursor = vi.fn().mockReturnValue({ x: 0, y: 0, z: 0 })

      manager.startCursorTracking(getCursor)

      // Wait for at least one interval to pass (default is 50ms)
      await new Promise((resolve) => setTimeout(resolve, 100))

      manager.stopCursorTracking()

      // Should have been called at least once
      expect(getCursor).toHaveBeenCalled()
    })
  })

  describe('action processing', () => {
    beforeEach(() => {
      manager.createSession('Test User')
    })

    it('should emit action_applied event', () => {
      const listener = vi.fn()
      manager.on('action_applied', listener)

      manager.createCube({
        id: 'test-cube',
        base: { color: [1, 0, 0] as [number, number, number] },
      })

      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('should add cube modification actions to pending queue', () => {
      manager.createCube({
        id: 'test-cube',
        base: { color: [1, 0, 0] as [number, number, number] },
      })

      const pending = manager.getPendingActions()
      expect(pending.length).toBe(1)
      expect(pending[0].type).toBe('cube_create')
    })

    it('should confirm synced actions', () => {
      manager.createCube({
        id: 'test-cube',
        base: { color: [1, 0, 0] as [number, number, number] },
      })

      const pending = manager.getPendingActions()
      const actionId = pending[0].id

      manager.confirmSyncedActions([actionId])

      expect(manager.getPendingActions().length).toBe(0)
    })

    it('should receive and process external actions', () => {
      const externalAction: CollaborativeAction = {
        id: 'external-1',
        type: 'cube_create',
        participantId: 'other-participant',
        sessionId: manager.getSession()!.id,
        timestamp: new Date().toISOString(),
        payload: {
          cube: {
            id: 'external-cube',
            base: { color: [0, 0, 1] as [number, number, number] },
          },
        },
      }

      const result = manager.receiveAction(externalAction)

      expect(result.success).toBe(true)
      expect(manager.getCube('external-cube')).not.toBeNull()
    })
  })

  describe('conflict resolution', () => {
    beforeEach(() => {
      manager.createSession('Test User')
      manager.createCube({
        id: 'test-cube',
        base: { color: [1, 0, 0] as [number, number, number] },
      })
    })

    it('should resolve conflicts using last_write_wins strategy', () => {
      const conflictListener = vi.fn()
      manager.on('conflict_resolved', conflictListener)

      // Local update
      manager.updateCube('test-cube', {
        base: { color: [0, 1, 0] as [number, number, number] },
      })

      // External update with later timestamp
      const later = new Date(Date.now() + 1000).toISOString()
      const externalAction: CollaborativeAction = {
        id: 'external-1',
        type: 'cube_update',
        participantId: 'other-participant',
        sessionId: manager.getSession()!.id,
        timestamp: later,
        payload: {
          cubeId: 'test-cube',
          changes: { base: { color: [0, 0, 1] as [number, number, number] } },
        },
      }

      manager.receiveAction(externalAction)

      // External action should win due to later timestamp
      expect(conflictListener).toHaveBeenCalled()
      expect(manager.getCube('test-cube')?.base.color).toEqual([0, 0, 1])
    })
  })

  describe('event system', () => {
    it('should add and remove listeners', () => {
      const listener = vi.fn()

      manager.on('session_created', listener)
      manager.createSession('Test')

      expect(listener).toHaveBeenCalledTimes(1)

      manager.off('session_created', listener)
      manager.leaveSession()
      manager.createSession('Test 2')

      expect(listener).toHaveBeenCalledTimes(1) // Still 1
    })

    it('should handle listener errors gracefully', () => {
      const badListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error')
      })
      const goodListener = vi.fn()

      manager.on('session_created', badListener)
      manager.on('session_created', goodListener)

      expect(() => manager.createSession('Test')).not.toThrow()
      expect(goodListener).toHaveBeenCalled()
    })
  })

  describe('connection state', () => {
    it('should update connection state', () => {
      const listener = vi.fn()
      manager.on('connection_changed', listener)

      manager.setConnectionState('connecting')
      expect(manager.getState().connectionState).toBe('connecting')

      manager.setConnectionState('connected')
      expect(manager.getState().connectionState).toBe('connected')

      expect(listener).toHaveBeenCalledTimes(2)
    })
  })

  describe('dispose', () => {
    it('should clean up resources', () => {
      manager.createSession('Test User')
      manager.startCursorTracking(() => ({ x: 0, y: 0, z: 0 }))

      expect(() => manager.dispose()).not.toThrow()
      expect(manager.getSession()).toBeNull()
    })
  })
})

describe('utility functions', () => {
  describe('canEdit', () => {
    it('should return true for owner', () => {
      const participant: Participant = {
        id: 'p1',
        name: 'Owner',
        color: '#FF6B6B',
        role: 'owner',
        status: 'online',
        joinedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      }

      expect(canEdit(participant)).toBe(true)
    })

    it('should return true for editor', () => {
      const participant: Participant = {
        id: 'p1',
        name: 'Editor',
        color: '#FF6B6B',
        role: 'editor',
        status: 'online',
        joinedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      }

      expect(canEdit(participant)).toBe(true)
    })

    it('should return false for viewer', () => {
      const participant: Participant = {
        id: 'p1',
        name: 'Viewer',
        color: '#FF6B6B',
        role: 'viewer',
        status: 'online',
        joinedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      }

      expect(canEdit(participant)).toBe(false)
    })

    it('should return false for null', () => {
      expect(canEdit(null)).toBe(false)
    })
  })

  describe('isOwner', () => {
    it('should return true for owner', () => {
      const participant: Participant = {
        id: 'p1',
        name: 'Owner',
        color: '#FF6B6B',
        role: 'owner',
        status: 'online',
        joinedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      }

      expect(isOwner(participant)).toBe(true)
    })

    it('should return false for editor', () => {
      const participant: Participant = {
        id: 'p1',
        name: 'Editor',
        color: '#FF6B6B',
        role: 'editor',
        status: 'online',
        joinedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      }

      expect(isOwner(participant)).toBe(false)
    })

    it('should return false for null', () => {
      expect(isOwner(null)).toBe(false)
    })
  })

  describe('formatSessionCode', () => {
    it('should format 6-character code with dash', () => {
      expect(formatSessionCode('ABC123')).toBe('ABC-123')
    })

    it('should return unchanged for other lengths', () => {
      expect(formatSessionCode('AB12')).toBe('AB12')
      expect(formatSessionCode('ABCD1234')).toBe('ABCD1234')
    })
  })

  describe('parseSessionCode', () => {
    it('should remove dashes and uppercase', () => {
      expect(parseSessionCode('ABC-123')).toBe('ABC123')
      expect(parseSessionCode('abc-123')).toBe('ABC123')
    })

    it('should handle codes without dashes', () => {
      expect(parseSessionCode('ABC123')).toBe('ABC123')
      expect(parseSessionCode('abc123')).toBe('ABC123')
    })
  })
})
