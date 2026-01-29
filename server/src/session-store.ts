/**
 * In-memory session store for isocubic server
 * Manages session state and provides session operations
 */

import { v4 as uuidv4 } from 'uuid'
import type {
  SessionId,
  ParticipantId,
  Participant,
  ParticipantRole,
  ServerSession,
  SessionSettings,
  SerializableSession,
  CollaborativeAction,
  ServerConfig,
} from './types.js'
import { generateSessionCode, generateParticipantColor } from './types.js'

/**
 * Default session settings
 */
const DEFAULT_SESSION_SETTINGS: SessionSettings = {
  name: 'Untitled Session',
  isOpen: true,
  maxParticipants: 10,
  allowRoleRequests: true,
  autoSaveInterval: 30000,
}

/**
 * In-memory session store
 * In production, this could be replaced with Redis or a database
 */
export class SessionStore {
  private sessions: Map<SessionId, ServerSession> = new Map()
  private sessionsByCode: Map<string, SessionId> = new Map()
  private config: ServerConfig

  constructor(config: ServerConfig) {
    this.config = config
  }

  /**
   * Creates a new session
   */
  createSession(
    ownerName: string,
    settings?: Partial<SessionSettings>
  ): { session: ServerSession; participant: Participant } {
    if (this.sessions.size >= this.config.maxSessions) {
      throw new Error('Maximum number of sessions reached')
    }

    const sessionId = `s-${uuidv4()}`
    const sessionCode = this.generateUniqueCode()
    const participantId = `p-${uuidv4()}`
    const now = new Date().toISOString()

    const participant: Participant = {
      id: participantId,
      name: ownerName,
      color: generateParticipantColor(),
      role: 'owner',
      status: 'online',
      joinedAt: now,
      lastActiveAt: now,
    }

    const session: ServerSession = {
      id: sessionId,
      code: sessionCode,
      settings: { ...DEFAULT_SESSION_SETTINGS, ...settings },
      ownerId: participantId,
      participants: [[participantId, participant]],
      cubes: [],
      createdAt: now,
      modifiedAt: now,
      expiresAt: new Date(Date.now() + this.config.sessionExpirationMs).toISOString(),
    }

    this.sessions.set(sessionId, session)
    this.sessionsByCode.set(sessionCode, sessionId)

    this.log(`Session created: ${sessionId} (code: ${sessionCode})`)

    return { session, participant }
  }

  /**
   * Generates a unique session code
   */
  private generateUniqueCode(): string {
    let code: string
    let attempts = 0
    do {
      code = generateSessionCode()
      attempts++
      if (attempts > 100) {
        throw new Error('Failed to generate unique session code')
      }
    } while (this.sessionsByCode.has(code))
    return code
  }

  /**
   * Gets a session by ID
   */
  getSession(sessionId: SessionId): ServerSession | null {
    return this.sessions.get(sessionId) ?? null
  }

  /**
   * Gets a session by code
   */
  getSessionByCode(code: string): ServerSession | null {
    const sessionId = this.sessionsByCode.get(code.toUpperCase())
    if (!sessionId) return null
    return this.getSession(sessionId)
  }

  /**
   * Joins a session
   */
  joinSession(
    sessionCode: string,
    participantName: string,
    participantId?: ParticipantId
  ): { session: ServerSession; participant: Participant } {
    const session = this.getSessionByCode(sessionCode)
    if (!session) {
      throw new Error('Session not found')
    }

    if (!session.settings.isOpen) {
      throw new Error('Session is closed')
    }

    const participantsMap = new Map(session.participants)
    if (
      session.settings.maxParticipants > 0 &&
      participantsMap.size >= session.settings.maxParticipants
    ) {
      throw new Error('Session is full')
    }

    const newParticipantId = participantId || `p-${uuidv4()}`
    const now = new Date().toISOString()

    // Check if participant already exists (reconnection)
    const existingParticipant = participantsMap.get(newParticipantId)
    if (existingParticipant) {
      existingParticipant.status = 'online'
      existingParticipant.lastActiveAt = now
      session.modifiedAt = now
      return { session, participant: existingParticipant }
    }

    const participant: Participant = {
      id: newParticipantId,
      name: participantName,
      color: generateParticipantColor(),
      role: 'editor',
      status: 'online',
      joinedAt: now,
      lastActiveAt: now,
    }

    participantsMap.set(newParticipantId, participant)
    session.participants = Array.from(participantsMap.entries())
    session.modifiedAt = now

    this.log(`Participant ${newParticipantId} joined session ${session.id}`)

    return { session, participant }
  }

  /**
   * Removes a participant from a session
   */
  leaveSession(
    sessionId: SessionId,
    participantId: ParticipantId,
    reason: 'manual' | 'timeout' | 'kicked' = 'manual'
  ): boolean {
    const session = this.getSession(sessionId)
    if (!session) return false

    const participantsMap = new Map(session.participants)
    const participant = participantsMap.get(participantId)
    if (!participant) return false

    participantsMap.delete(participantId)
    session.participants = Array.from(participantsMap.entries())
    session.modifiedAt = new Date().toISOString()

    this.log(`Participant ${participantId} left session ${sessionId} (${reason})`)

    // If owner left, transfer ownership or close session
    if (participant.role === 'owner') {
      const remaining = Array.from(participantsMap.values())
      if (remaining.length > 0) {
        // Transfer ownership to first participant
        const newOwner = remaining[0]
        if (newOwner) {
          newOwner.role = 'owner'
          session.ownerId = newOwner.id
          this.log(`Ownership transferred to ${newOwner.id}`)
        }
      } else {
        // No participants left, delete session
        this.deleteSession(sessionId)
      }
    }

    return true
  }

  /**
   * Updates participant presence
   */
  updatePresence(
    sessionId: SessionId,
    participantId: ParticipantId,
    status?: 'online' | 'away' | 'offline',
    cursor?: { x: number; y: number; z: number; selectedCubeId?: string }
  ): Participant | null {
    const session = this.getSession(sessionId)
    if (!session) return null

    const participantsMap = new Map(session.participants)
    const participant = participantsMap.get(participantId)
    if (!participant) return null

    if (status) {
      participant.status = status
    }
    if (cursor) {
      participant.cursor = cursor
    }
    participant.lastActiveAt = new Date().toISOString()

    session.participants = Array.from(participantsMap.entries())
    session.modifiedAt = participant.lastActiveAt

    return participant
  }

  /**
   * Updates participant role
   */
  updateParticipantRole(
    sessionId: SessionId,
    requesterId: ParticipantId,
    targetId: ParticipantId,
    newRole: ParticipantRole
  ): boolean {
    const session = this.getSession(sessionId)
    if (!session) return false

    const participantsMap = new Map(session.participants)
    const requester = participantsMap.get(requesterId)
    const target = participantsMap.get(targetId)

    if (!requester || !target) return false
    if (requester.role !== 'owner') return false
    if (target.role === 'owner' || newRole === 'owner') return false

    target.role = newRole
    session.participants = Array.from(participantsMap.entries())
    session.modifiedAt = new Date().toISOString()

    this.log(`Role of ${targetId} changed to ${newRole} by ${requesterId}`)

    return true
  }

  /**
   * Applies an action to a session
   */
  applyAction(action: CollaborativeAction): boolean {
    const session = this.getSession(action.sessionId)
    if (!session) return false

    const participantsMap = new Map(session.participants)
    const participant = participantsMap.get(action.participantId)
    if (!participant) return false

    // Verify participant can perform the action
    if (
      action.type.startsWith('cube_') &&
      action.type !== 'cube_select' &&
      participant.role === 'viewer'
    ) {
      return false
    }

    const cubesMap = new Map(session.cubes)

    switch (action.type) {
      case 'cube_create': {
        const payload = action.payload as { cube: { id: string } }
        cubesMap.set(payload.cube.id, payload.cube)
        break
      }
      case 'cube_update': {
        const payload = action.payload as { cubeId: string; changes: Record<string, unknown> }
        const existing = cubesMap.get(payload.cubeId) as Record<string, unknown> | undefined
        if (existing) {
          cubesMap.set(payload.cubeId, { ...existing, ...payload.changes })
        }
        break
      }
      case 'cube_delete': {
        const payload = action.payload as { cubeId: string }
        cubesMap.delete(payload.cubeId)
        break
      }
      case 'cube_select': {
        const payload = action.payload as { cubeId: string | null }
        if (participant.cursor) {
          participant.cursor.selectedCubeId = payload.cubeId ?? undefined
        } else {
          participant.cursor = { x: 0, y: 0, z: 0, selectedCubeId: payload.cubeId ?? undefined }
        }
        break
      }
      case 'cursor_move': {
        const payload = action.payload as {
          position: { x: number; y: number; z: number; selectedCubeId?: string }
        }
        participant.cursor = payload.position
        participant.lastActiveAt = new Date().toISOString()
        break
      }
      case 'session_settings_update': {
        const payload = action.payload as { settings: Partial<SessionSettings> }
        if (participant.role === 'owner') {
          session.settings = { ...session.settings, ...payload.settings }
        } else {
          return false
        }
        break
      }
    }

    session.cubes = Array.from(cubesMap.entries())
    session.participants = Array.from(participantsMap.entries())
    session.modifiedAt = new Date().toISOString()

    return true
  }

  /**
   * Deletes a session
   */
  deleteSession(sessionId: SessionId): boolean {
    const session = this.getSession(sessionId)
    if (!session) return false

    this.sessionsByCode.delete(session.code)
    this.sessions.delete(sessionId)

    this.log(`Session deleted: ${sessionId}`)

    return true
  }

  /**
   * Gets session as serializable format
   */
  serializeSession(session: ServerSession): SerializableSession {
    return {
      id: session.id,
      code: session.code,
      settings: session.settings,
      ownerId: session.ownerId,
      participants: session.participants,
      cubes: session.cubes,
      createdAt: session.createdAt,
      modifiedAt: session.modifiedAt,
    }
  }

  /**
   * Cleans up expired sessions and inactive participants
   */
  cleanup(): { expiredSessions: number; inactiveParticipants: number } {
    const now = Date.now()
    let expiredSessions = 0
    let inactiveParticipants = 0

    for (const [sessionId, session] of this.sessions) {
      // Check session expiration
      if (session.expiresAt && new Date(session.expiresAt).getTime() < now) {
        this.deleteSession(sessionId)
        expiredSessions++
        continue
      }

      // Check participant timeouts
      const participantsMap = new Map(session.participants)
      for (const participant of participantsMap.values()) {
        const lastActive = new Date(participant.lastActiveAt).getTime()
        if (now - lastActive > this.config.participantTimeoutMs) {
          if (participant.status !== 'offline') {
            participant.status = 'offline'
            inactiveParticipants++
          }
        }
      }
      session.participants = Array.from(participantsMap.entries())
    }

    if (expiredSessions > 0 || inactiveParticipants > 0) {
      this.log(`Cleanup: ${expiredSessions} sessions expired, ${inactiveParticipants} inactive`)
    }

    return { expiredSessions, inactiveParticipants }
  }

  /**
   * Gets all sessions (for debugging)
   */
  getAllSessions(): ServerSession[] {
    return Array.from(this.sessions.values())
  }

  /**
   * Gets session count
   */
  getSessionCount(): number {
    return this.sessions.size
  }

  /**
   * Logs debug messages
   */
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[SessionStore]', ...args)
    }
  }
}

/**
 * Creates a new session store instance
 */
export function createSessionStore(config: ServerConfig): SessionStore {
  return new SessionStore(config)
}
