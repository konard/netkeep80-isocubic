/**
 * Tests for authentication types and validation helpers
 */

import { describe, it, expect } from 'vitest'
import {
  authValidation,
  getDisplayNameFromEmail,
  createDefaultUserProfile,
  isSessionExpired,
  DEFAULT_USER_PREFERENCES,
  DEFAULT_AUTH_STATE,
  AUTH_STORAGE_KEYS,
  type AuthSession,
  type UserProfile,
  type RegistrationData,
} from './auth'

describe('authValidation', () => {
  describe('isValidEmail', () => {
    it('should accept valid email addresses', () => {
      expect(authValidation.isValidEmail('user@example.com')).toBe(true)
      expect(authValidation.isValidEmail('user.name@example.co.uk')).toBe(true)
      expect(authValidation.isValidEmail('user+tag@example.org')).toBe(true)
      expect(authValidation.isValidEmail('user123@test-domain.com')).toBe(true)
    })

    it('should reject invalid email addresses', () => {
      expect(authValidation.isValidEmail('')).toBe(false)
      expect(authValidation.isValidEmail('invalid')).toBe(false)
      expect(authValidation.isValidEmail('user@')).toBe(false)
      expect(authValidation.isValidEmail('@example.com')).toBe(false)
      expect(authValidation.isValidEmail('user @example.com')).toBe(false)
      expect(authValidation.isValidEmail('user@example')).toBe(false)
    })
  })

  describe('isValidPassword', () => {
    it('should accept valid passwords', () => {
      const result = authValidation.isValidPassword('Password123')
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should accept passwords with special characters', () => {
      const result = authValidation.isValidPassword('Secure!Pass1')
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should reject passwords shorter than 8 characters', () => {
      const result = authValidation.isValidPassword('Pass1')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must be at least 8 characters')
    })

    it('should reject passwords without letters', () => {
      const result = authValidation.isValidPassword('12345678')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one letter')
    })

    it('should reject passwords without numbers', () => {
      const result = authValidation.isValidPassword('PasswordOnly')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one number')
    })

    it('should return multiple errors for very weak passwords', () => {
      const result = authValidation.isValidPassword('abc')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(1)
    })
  })

  describe('validateRegistration', () => {
    it('should accept valid registration data', () => {
      const data: RegistrationData = {
        email: 'user@example.com',
        password: 'SecurePass123',
        acceptTerms: true,
      }
      const result = authValidation.validateRegistration(data)
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should reject registration with invalid email', () => {
      const data: RegistrationData = {
        email: 'invalid-email',
        password: 'SecurePass123',
        acceptTerms: true,
      }
      const result = authValidation.validateRegistration(data)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Invalid email address')
    })

    it('should reject registration with weak password', () => {
      const data: RegistrationData = {
        email: 'user@example.com',
        password: 'weak',
        acceptTerms: true,
      }
      const result = authValidation.validateRegistration(data)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should reject registration without accepting terms', () => {
      const data: RegistrationData = {
        email: 'user@example.com',
        password: 'SecurePass123',
        acceptTerms: false,
      }
      const result = authValidation.validateRegistration(data)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('You must accept the terms of service')
    })

    it('should return all errors for completely invalid data', () => {
      const data: RegistrationData = {
        email: 'invalid',
        password: 'weak',
        acceptTerms: false,
      }
      const result = authValidation.validateRegistration(data)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(3)
    })
  })
})

describe('getDisplayNameFromEmail', () => {
  it('should extract and capitalize name from email', () => {
    expect(getDisplayNameFromEmail('john@example.com')).toBe('John')
    expect(getDisplayNameFromEmail('jane.doe@example.com')).toBe('Jane Doe')
    expect(getDisplayNameFromEmail('john_smith@example.com')).toBe('John Smith')
    expect(getDisplayNameFromEmail('user123@example.com')).toBe('User123')
  })

  it('should handle complex email patterns', () => {
    expect(getDisplayNameFromEmail('john.paul.jones@example.com')).toBe('John Paul Jones')
    expect(getDisplayNameFromEmail('test_user.name@example.com')).toBe('Test User Name')
  })
})

describe('createDefaultUserProfile', () => {
  it('should create a user profile with correct defaults', () => {
    const profile = createDefaultUserProfile('user-123', 'test@example.com')

    expect(profile.id).toBe('user-123')
    expect(profile.email).toBe('test@example.com')
    expect(profile.displayName).toBe('Test')
    expect(profile.role).toBe('user')
    expect(profile.createdAt).toBeDefined()
    expect(profile.preferences).toEqual(DEFAULT_USER_PREFERENCES)
  })

  it('should create valid ISO timestamp', () => {
    const profile = createDefaultUserProfile('user-123', 'test@example.com')
    const parsedDate = new Date(profile.createdAt)
    expect(parsedDate.getTime()).not.toBeNaN()
  })
})

describe('isSessionExpired', () => {
  it('should return true for null session', () => {
    expect(isSessionExpired(null)).toBe(true)
  })

  it('should return true for expired session', () => {
    const expiredSession: AuthSession = {
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt: Date.now() - 1000, // Expired 1 second ago
      tokenType: 'Bearer',
    }
    expect(isSessionExpired(expiredSession)).toBe(true)
  })

  it('should return true for session expiring within 5 minutes', () => {
    const soonExpiredSession: AuthSession = {
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt: Date.now() + 4 * 60 * 1000, // Expires in 4 minutes
      tokenType: 'Bearer',
    }
    expect(isSessionExpired(soonExpiredSession)).toBe(true)
  })

  it('should return false for valid session', () => {
    const validSession: AuthSession = {
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt: Date.now() + 60 * 60 * 1000, // Expires in 1 hour
      tokenType: 'Bearer',
    }
    expect(isSessionExpired(validSession)).toBe(false)
  })
})

describe('DEFAULT_AUTH_STATE', () => {
  it('should have correct initial values', () => {
    expect(DEFAULT_AUTH_STATE.status).toBe('loading')
    expect(DEFAULT_AUTH_STATE.user).toBeNull()
    expect(DEFAULT_AUTH_STATE.session).toBeNull()
    expect(DEFAULT_AUTH_STATE.error).toBeNull()
  })
})

describe('DEFAULT_USER_PREFERENCES', () => {
  it('should have correct default values', () => {
    expect(DEFAULT_USER_PREFERENCES.theme).toBe('system')
    expect(DEFAULT_USER_PREFERENCES.language).toBe('en')
    expect(DEFAULT_USER_PREFERENCES.showHints).toBe(true)
    expect(DEFAULT_USER_PREFERENCES.autosave).toBe(true)
    expect(DEFAULT_USER_PREFERENCES.defaultView).toEqual({
      showGrid: true,
      animate: false,
      showShadows: true,
    })
  })
})

describe('AUTH_STORAGE_KEYS', () => {
  it('should have correct key values', () => {
    expect(AUTH_STORAGE_KEYS.SESSION).toBe('isocubic_auth_session')
    expect(AUTH_STORAGE_KEYS.USER).toBe('isocubic_auth_user')
    expect(AUTH_STORAGE_KEYS.PREFERENCES).toBe('isocubic_auth_preferences')
  })
})

describe('Type interfaces', () => {
  it('should allow creating valid UserProfile', () => {
    const profile: UserProfile = {
      id: 'user-1',
      email: 'test@example.com',
      displayName: 'Test User',
      role: 'user',
      createdAt: new Date().toISOString(),
    }
    expect(profile).toBeDefined()
    expect(profile.role).toBe('user')
  })

  it('should allow all UserRole values', () => {
    const roles: UserProfile['role'][] = ['user', 'creator', 'moderator', 'admin']
    roles.forEach((role) => {
      const profile: UserProfile = {
        id: 'user-1',
        email: 'test@example.com',
        displayName: 'Test',
        role,
        createdAt: new Date().toISOString(),
      }
      expect(profile.role).toBe(role)
    })
  })

  it('should allow creating valid AuthSession', () => {
    const session: AuthSession = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: Date.now() + 3600000,
      tokenType: 'Bearer',
    }
    expect(session).toBeDefined()
    expect(session.tokenType).toBe('Bearer')
  })
})
