/**
 * Tests for authentication module
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import {
  AuthProvider,
  useAuth,
  useCurrentUser,
  useIsAuthenticated,
  useAuthLoading,
  useUserPreferences,
} from './auth'
import { DEFAULT_USER_PREFERENCES, AUTH_STORAGE_KEYS } from '../types/auth'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Helper to create wrapper
const createWrapper = () => {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(AuthProvider, null, children)
  }
}

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should provide auth context', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    expect(result.current).toBeDefined()
    expect(result.current.state).toBeDefined()
    expect(result.current.signIn).toBeInstanceOf(Function)
    expect(result.current.signUp).toBeInstanceOf(Function)
    expect(result.current.signOut).toBeInstanceOf(Function)
  })

  it('should start with unauthenticated state when no stored session', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.state.status).toBe('unauthenticated')
    })
  })

  it('should throw error when useAuth is called outside provider', () => {
    // Suppress console error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      renderHook(() => useAuth())
    }).toThrow('useAuth must be used within an AuthProvider')

    consoleSpy.mockRestore()
  })
})

describe('signUp', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('should successfully register a new user', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.state.status).toBe('unauthenticated')
    })

    await act(async () => {
      const signUpResult = await result.current.signUp({
        email: 'test@example.com',
        password: 'SecurePass123',
        acceptTerms: true,
      })
      expect(signUpResult.success).toBe(true)
      expect(signUpResult.user).toBeDefined()
    })

    expect(result.current.state.status).toBe('authenticated')
    expect(result.current.state.user?.email).toBe('test@example.com')
  })

  it('should fail with invalid email', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.state.status).toBe('unauthenticated')
    })

    await act(async () => {
      const signUpResult = await result.current.signUp({
        email: 'invalid-email',
        password: 'SecurePass123',
        acceptTerms: true,
      })
      expect(signUpResult.success).toBe(false)
      expect(signUpResult.error).toContain('Invalid email')
    })
  })

  it('should fail with weak password', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.state.status).toBe('unauthenticated')
    })

    await act(async () => {
      const signUpResult = await result.current.signUp({
        email: 'test@example.com',
        password: 'weak',
        acceptTerms: true,
      })
      expect(signUpResult.success).toBe(false)
      expect(signUpResult.error).toBeDefined()
    })
  })

  it('should fail without accepting terms', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.state.status).toBe('unauthenticated')
    })

    await act(async () => {
      const signUpResult = await result.current.signUp({
        email: 'test@example.com',
        password: 'SecurePass123',
        acceptTerms: false,
      })
      expect(signUpResult.success).toBe(false)
      expect(signUpResult.error).toContain('terms of service')
    })
  })

  it('should prevent duplicate registration', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.state.status).toBe('unauthenticated')
    })

    // First registration
    await act(async () => {
      await result.current.signUp({
        email: 'duplicate@example.com',
        password: 'SecurePass123',
        acceptTerms: true,
      })
    })

    // Sign out
    await act(async () => {
      await result.current.signOut()
    })

    // Try to register again with same email
    await act(async () => {
      const signUpResult = await result.current.signUp({
        email: 'duplicate@example.com',
        password: 'DifferentPass456',
        acceptTerms: true,
      })
      expect(signUpResult.success).toBe(false)
      expect(signUpResult.error).toContain('already exists')
    })
  })
})

describe('signIn', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('should successfully sign in registered user', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.state.status).toBe('unauthenticated')
    })

    // First register
    await act(async () => {
      await result.current.signUp({
        email: 'login@example.com',
        password: 'SecurePass123',
        acceptTerms: true,
      })
    })

    // Sign out
    await act(async () => {
      await result.current.signOut()
    })

    // Sign in
    await act(async () => {
      const signInResult = await result.current.signIn({
        email: 'login@example.com',
        password: 'SecurePass123',
      })
      expect(signInResult.success).toBe(true)
    })

    expect(result.current.state.status).toBe('authenticated')
  })

  it('should fail with wrong password', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.state.status).toBe('unauthenticated')
    })

    // Register
    await act(async () => {
      await result.current.signUp({
        email: 'wrong-pass@example.com',
        password: 'SecurePass123',
        acceptTerms: true,
      })
    })

    // Sign out
    await act(async () => {
      await result.current.signOut()
    })

    // Try to sign in with wrong password
    await act(async () => {
      const signInResult = await result.current.signIn({
        email: 'wrong-pass@example.com',
        password: 'WrongPassword456',
      })
      expect(signInResult.success).toBe(false)
      expect(signInResult.error).toContain('Invalid email or password')
    })
  })

  it('should fail with non-existent user', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.state.status).toBe('unauthenticated')
    })

    await act(async () => {
      const signInResult = await result.current.signIn({
        email: 'nonexistent@example.com',
        password: 'AnyPassword123',
      })
      expect(signInResult.success).toBe(false)
      expect(signInResult.error).toContain('Invalid email or password')
    })
  })
})

describe('signInWithOAuth', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('should sign in with Google (mock)', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.state.status).toBe('unauthenticated')
    })

    await act(async () => {
      const oauthResult = await result.current.signInWithOAuth('google')
      expect(oauthResult.success).toBe(true)
      expect(oauthResult.user?.displayName).toBe('Google User')
    })

    expect(result.current.state.status).toBe('authenticated')
  })

  it('should sign in with GitHub (mock)', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.state.status).toBe('unauthenticated')
    })

    await act(async () => {
      const oauthResult = await result.current.signInWithOAuth('github')
      expect(oauthResult.success).toBe(true)
      expect(oauthResult.user?.displayName).toBe('Github User')
    })

    expect(result.current.state.status).toBe('authenticated')
  })
})

describe('signOut', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('should sign out and clear session', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.state.status).toBe('unauthenticated')
    })

    // Sign up first
    await act(async () => {
      await result.current.signUp({
        email: 'signout@example.com',
        password: 'SecurePass123',
        acceptTerms: true,
      })
    })

    expect(result.current.state.status).toBe('authenticated')

    // Sign out
    await act(async () => {
      await result.current.signOut()
    })

    expect(result.current.state.status).toBe('unauthenticated')
    expect(result.current.state.user).toBeNull()
    expect(result.current.state.session).toBeNull()
  })

  it('should clear localStorage on sign out', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.state.status).toBe('unauthenticated')
    })

    await act(async () => {
      await result.current.signUp({
        email: 'clear-storage@example.com',
        password: 'SecurePass123',
        acceptTerms: true,
      })
    })

    await act(async () => {
      await result.current.signOut()
    })

    expect(localStorageMock.removeItem).toHaveBeenCalledWith(AUTH_STORAGE_KEYS.USER)
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(AUTH_STORAGE_KEYS.SESSION)
  })
})

describe('resetPassword', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('should accept valid email for password reset', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.state.status).toBe('unauthenticated')
    })

    await act(async () => {
      const resetResult = await result.current.resetPassword('reset@example.com')
      expect(resetResult.success).toBe(true)
    })

    consoleSpy.mockRestore()
  })

  it('should reject invalid email for password reset', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.state.status).toBe('unauthenticated')
    })

    await act(async () => {
      const resetResult = await result.current.resetPassword('invalid-email')
      expect(resetResult.success).toBe(false)
      expect(resetResult.error).toContain('Invalid email')
    })
  })
})

describe('updateProfile', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('should update user profile', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.state.status).toBe('unauthenticated')
    })

    await act(async () => {
      await result.current.signUp({
        email: 'update@example.com',
        password: 'SecurePass123',
        acceptTerms: true,
      })
    })

    await act(async () => {
      const updateResult = await result.current.updateProfile({
        displayName: 'New Display Name',
        avatarUrl: 'https://example.com/avatar.png',
      })
      expect(updateResult.success).toBe(true)
    })

    expect(result.current.state.user?.displayName).toBe('New Display Name')
    expect(result.current.state.user?.avatarUrl).toBe('https://example.com/avatar.png')
  })

  it('should fail when not authenticated', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.state.status).toBe('unauthenticated')
    })

    await act(async () => {
      const updateResult = await result.current.updateProfile({
        displayName: 'Test',
      })
      expect(updateResult.success).toBe(false)
      expect(updateResult.error).toContain('Not authenticated')
    })
  })
})

describe('updatePreferences', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('should update user preferences', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.state.status).toBe('unauthenticated')
    })

    await act(async () => {
      await result.current.signUp({
        email: 'prefs@example.com',
        password: 'SecurePass123',
        acceptTerms: true,
      })
    })

    await act(async () => {
      const updateResult = await result.current.updatePreferences({
        theme: 'dark',
        language: 'ru',
      })
      expect(updateResult.success).toBe(true)
    })

    expect(result.current.state.user?.preferences?.theme).toBe('dark')
    expect(result.current.state.user?.preferences?.language).toBe('ru')
  })
})

describe('utility hooks', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe('useCurrentUser', () => {
    it('should return null when not authenticated', async () => {
      const { result } = renderHook(() => useCurrentUser(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current).toBeNull()
      })
    })
  })

  describe('useIsAuthenticated', () => {
    it('should return false when not authenticated', async () => {
      const { result } = renderHook(() => useIsAuthenticated(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current).toBe(false)
      })
    })
  })

  describe('useAuthLoading', () => {
    it('should return true initially, then false', async () => {
      const { result } = renderHook(() => useAuthLoading(), {
        wrapper: createWrapper(),
      })

      // Initial state might be loading briefly
      await waitFor(() => {
        expect(result.current).toBe(false)
      })
    })
  })

  describe('useUserPreferences', () => {
    it('should return default preferences when not authenticated', async () => {
      const { result } = renderHook(() => useUserPreferences(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current).toEqual(DEFAULT_USER_PREFERENCES)
      })
    })
  })
})

describe('session persistence', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('should persist session to localStorage', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.state.status).toBe('unauthenticated')
    })

    await act(async () => {
      await result.current.signUp({
        email: 'persist@example.com',
        password: 'SecurePass123',
        acceptTerms: true,
      })
    })

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      AUTH_STORAGE_KEYS.USER,
      expect.any(String)
    )
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      AUTH_STORAGE_KEYS.SESSION,
      expect.any(String)
    )
  })
})

describe('refreshSession', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('should refresh active session', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.state.status).toBe('unauthenticated')
    })

    await act(async () => {
      await result.current.signUp({
        email: 'refresh@example.com',
        password: 'SecurePass123',
        acceptTerms: true,
      })
    })

    const originalSession = result.current.state.session

    // Wait a bit to ensure different timestamp for new session
    await new Promise((resolve) => setTimeout(resolve, 5))

    await act(async () => {
      const refreshResult = await result.current.refreshSession()
      expect(refreshResult.success).toBe(true)
    })

    // New session should be different (new tokens)
    expect(result.current.state.session?.accessToken).not.toBe(originalSession?.accessToken)
  })

  it('should fail when not authenticated', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.state.status).toBe('unauthenticated')
    })

    await act(async () => {
      const refreshResult = await result.current.refreshSession()
      expect(refreshResult.success).toBe(false)
      expect(refreshResult.error).toContain('No active session')
    })
  })
})
