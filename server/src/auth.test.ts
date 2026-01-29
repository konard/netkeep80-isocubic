/**
 * Tests for authentication module
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { AuthManager, createAuthManager, validateAuth } from './auth.js'
import { DEFAULT_SERVER_CONFIG } from './types.js'
import type { ServerConfig } from './types.js'

describe('AuthManager', () => {
  let authManager: AuthManager
  let config: ServerConfig

  beforeEach(() => {
    config = { ...DEFAULT_SERVER_CONFIG, debug: false }
    authManager = createAuthManager(config)
  })

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = authManager.generateToken('session-1', 'participant-1', 'owner')

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT format
    })

    it('should include correct payload', () => {
      const token = authManager.generateToken('session-1', 'participant-1', 'editor')
      const payload = authManager.decodeToken(token)

      expect(payload?.sessionId).toBe('session-1')
      expect(payload?.participantId).toBe('participant-1')
      expect(payload?.role).toBe('editor')
    })
  })

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = authManager.generateToken('session-1', 'participant-1', 'owner')
      const payload = authManager.verifyToken(token)

      expect(payload).toBeDefined()
      expect(payload?.sessionId).toBe('session-1')
      expect(payload?.participantId).toBe('participant-1')
      expect(payload?.role).toBe('owner')
    })

    it('should return null for invalid token', () => {
      const payload = authManager.verifyToken('invalid-token')
      expect(payload).toBeNull()
    })

    it('should return null for token signed with different secret', () => {
      const otherConfig = { ...config, jwtSecret: 'different-secret' }
      const otherManager = createAuthManager(otherConfig)

      const token = otherManager.generateToken('session-1', 'participant-1', 'owner')
      const payload = authManager.verifyToken(token)

      expect(payload).toBeNull()
    })

    it('should return null for expired token', () => {
      // Create config with minimum valid expiration (1 second)
      const shortExpiryConfig = { ...config, sessionExpirationMs: 1000 }
      const shortExpiryManager = createAuthManager(shortExpiryConfig)

      const token = shortExpiryManager.generateToken('session-1', 'participant-1', 'owner')

      // Wait for token to expire (need >1 second)
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const payload = shortExpiryManager.verifyToken(token)
          expect(payload).toBeNull()
          resolve()
        }, 1100)
      })
    })
  })

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const otherConfig = { ...config, jwtSecret: 'different-secret' }
      const otherManager = createAuthManager(otherConfig)

      const token = otherManager.generateToken('session-1', 'participant-1', 'owner')

      // decodeToken should work even though verification would fail
      const payload = authManager.decodeToken(token)
      expect(payload?.sessionId).toBe('session-1')
    })

    it('should return null for completely invalid tokens', () => {
      const payload = authManager.decodeToken('not-a-jwt')
      expect(payload).toBeNull()
    })
  })

  describe('isTokenExpired', () => {
    it('should return false for valid non-expired token', () => {
      const token = authManager.generateToken('session-1', 'participant-1', 'owner')
      expect(authManager.isTokenExpired(token)).toBe(false)
    })

    it('should return true for expired token', () => {
      const shortExpiryConfig = { ...config, sessionExpirationMs: 1000 }
      const shortExpiryManager = createAuthManager(shortExpiryConfig)

      const token = shortExpiryManager.generateToken('session-1', 'participant-1', 'owner')

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(shortExpiryManager.isTokenExpired(token)).toBe(true)
          resolve()
        }, 1100)
      })
    })

    it('should return true for invalid token', () => {
      expect(authManager.isTokenExpired('invalid')).toBe(true)
    })
  })

  describe('refreshToken', () => {
    it('should refresh a valid token', () => {
      const originalToken = authManager.generateToken('session-1', 'participant-1', 'owner')
      const newToken = authManager.refreshToken(originalToken)

      expect(newToken).toBeDefined()
      // Note: Tokens generated within the same second may be identical since JWT uses seconds
      // We just verify the new token is valid and contains the correct payload
      const payload = authManager.verifyToken(newToken!)
      expect(payload?.sessionId).toBe('session-1')
      expect(payload?.participantId).toBe('participant-1')
      expect(payload?.role).toBe('owner')
    })

    it('should return null for invalid token', () => {
      const newToken = authManager.refreshToken('invalid')
      expect(newToken).toBeNull()
    })
  })

  describe('validateTokenContext', () => {
    it('should validate matching context', () => {
      const token = authManager.generateToken('session-1', 'participant-1', 'owner')
      const isValid = authManager.validateTokenContext(token, 'session-1', 'participant-1')
      expect(isValid).toBe(true)
    })

    it('should reject mismatched session', () => {
      const token = authManager.generateToken('session-1', 'participant-1', 'owner')
      const isValid = authManager.validateTokenContext(token, 'session-2', 'participant-1')
      expect(isValid).toBe(false)
    })

    it('should reject mismatched participant', () => {
      const token = authManager.generateToken('session-1', 'participant-1', 'owner')
      const isValid = authManager.validateTokenContext(token, 'session-1', 'participant-2')
      expect(isValid).toBe(false)
    })
  })

  describe('getRoleFromToken', () => {
    it('should return role from valid token', () => {
      const token = authManager.generateToken('session-1', 'participant-1', 'editor')
      const role = authManager.getRoleFromToken(token)
      expect(role).toBe('editor')
    })

    it('should return null for invalid token', () => {
      const role = authManager.getRoleFromToken('invalid')
      expect(role).toBeNull()
    })
  })
})

describe('validateAuth', () => {
  let authManager: AuthManager
  let config: ServerConfig

  beforeEach(() => {
    config = { ...DEFAULT_SERVER_CONFIG, debug: false }
    authManager = createAuthManager(config)
  })

  it('should return valid for correct token and context', () => {
    const token = authManager.generateToken('session-1', 'participant-1', 'owner')
    const result = validateAuth(authManager, token, 'session-1', 'participant-1')

    expect(result.valid).toBe(true)
    expect(result.role).toBe('owner')
    expect(result.error).toBeUndefined()
  })

  it('should return invalid when token is missing', () => {
    const result = validateAuth(authManager, undefined, 'session-1', 'participant-1')

    expect(result.valid).toBe(false)
    expect(result.error).toBe('Authentication required')
  })

  it('should return invalid for expired token', () => {
    const shortExpiryConfig = { ...config, sessionExpirationMs: 1000 }
    const shortExpiryManager = createAuthManager(shortExpiryConfig)

    const token = shortExpiryManager.generateToken('session-1', 'participant-1', 'owner')

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const result = validateAuth(shortExpiryManager, token, 'session-1', 'participant-1')
        expect(result.valid).toBe(false)
        expect(result.error).toBe('Invalid or expired token')
        resolve()
      }, 1100)
    })
  })

  it('should return invalid for session mismatch', () => {
    const token = authManager.generateToken('session-1', 'participant-1', 'owner')
    const result = validateAuth(authManager, token, 'session-2', 'participant-1')

    expect(result.valid).toBe(false)
    expect(result.error).toBe('Token session mismatch')
  })

  it('should return invalid for participant mismatch', () => {
    const token = authManager.generateToken('session-1', 'participant-1', 'owner')
    const result = validateAuth(authManager, token, 'session-1', 'participant-2')

    expect(result.valid).toBe(false)
    expect(result.error).toBe('Token participant mismatch')
  })
})
