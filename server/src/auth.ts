/**
 * Authentication module for isocubic server
 * Handles JWT token generation and verification for session authentication
 */

import jwt from 'jsonwebtoken'
import type {
  SessionId,
  ParticipantId,
  ParticipantRole,
  JWTPayload,
  ServerConfig,
} from './types.js'

/**
 * Authentication manager for JWT-based session authentication
 */
export class AuthManager {
  private config: ServerConfig

  constructor(config: ServerConfig) {
    this.config = config
  }

  /**
   * Generates a JWT token for a participant
   */
  generateToken(sessionId: SessionId, participantId: ParticipantId, role: ParticipantRole): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      sessionId,
      participantId,
      role,
    }

    return jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: this.config.sessionExpirationMs / 1000, // Convert to seconds
    })
  }

  /**
   * Verifies a JWT token and returns the payload
   */
  verifyToken(token: string): JWTPayload | null {
    try {
      const payload = jwt.verify(token, this.config.jwtSecret) as JWTPayload
      return payload
    } catch (error) {
      if (this.config.debug) {
        console.log('[AuthManager] Token verification failed:', error)
      }
      return null
    }
  }

  /**
   * Decodes a token without verification (for debugging)
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.decode(token) as JWTPayload | null
      return decoded
    } catch {
      return null
    }
  }

  /**
   * Checks if a token is expired
   */
  isTokenExpired(token: string): boolean {
    const payload = this.decodeToken(token)
    if (!payload) return true
    return payload.exp * 1000 < Date.now()
  }

  /**
   * Refreshes a token with new expiration
   */
  refreshToken(token: string): string | null {
    const payload = this.verifyToken(token)
    if (!payload) return null

    return this.generateToken(payload.sessionId, payload.participantId, payload.role)
  }

  /**
   * Validates that a token matches the expected session and participant
   */
  validateTokenContext(
    token: string,
    expectedSessionId: SessionId,
    expectedParticipantId: ParticipantId
  ): boolean {
    const payload = this.verifyToken(token)
    if (!payload) return false

    return (
      payload.sessionId === expectedSessionId && payload.participantId === expectedParticipantId
    )
  }

  /**
   * Gets the role from a token
   */
  getRoleFromToken(token: string): ParticipantRole | null {
    const payload = this.verifyToken(token)
    return payload?.role ?? null
  }
}

/**
 * Creates a new auth manager instance
 */
export function createAuthManager(config: ServerConfig): AuthManager {
  return new AuthManager(config)
}

/**
 * Middleware-style function to validate request authentication
 */
export function validateAuth(
  authManager: AuthManager,
  token: string | undefined,
  sessionId: SessionId,
  participantId: ParticipantId
): { valid: boolean; error?: string; role?: ParticipantRole } {
  if (!token) {
    return { valid: false, error: 'Authentication required' }
  }

  const payload = authManager.verifyToken(token)
  if (!payload) {
    return { valid: false, error: 'Invalid or expired token' }
  }

  if (payload.sessionId !== sessionId) {
    return { valid: false, error: 'Token session mismatch' }
  }

  if (payload.participantId !== participantId) {
    return { valid: false, error: 'Token participant mismatch' }
  }

  return { valid: true, role: payload.role }
}
