/**
 * Tests for authentication Pinia store
 *
 * TASK 61: Migrated from React testing-library to Pinia testing (Phase 10)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import {
  useAuthStore,
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

describe('Auth Pinia Store', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should provide auth store', () => {
    const store = useAuthStore()

    expect(store).toBeDefined()
    expect(store.state).toBeDefined()
    expect(store.signIn).toBeInstanceOf(Function)
    expect(store.signUp).toBeInstanceOf(Function)
    expect(store.signOut).toBeInstanceOf(Function)
  })

  it('should start with unauthenticated state when no stored session', () => {
    const store = useAuthStore()
    store.initialize()

    expect(store.state.status).toBe('unauthenticated')
  })
})

describe('signUp', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('should successfully register a new user', async () => {
    const store = useAuthStore()
    store.initialize()

    const signUpResult = await store.signUp({
      email: 'test@example.com',
      password: 'SecurePass123',
      acceptTerms: true,
    })
    expect(signUpResult.success).toBe(true)
    expect(signUpResult.user).toBeDefined()

    expect(store.state.status).toBe('authenticated')
    expect(store.state.user?.email).toBe('test@example.com')
  })

  it('should fail with invalid email', async () => {
    const store = useAuthStore()
    store.initialize()

    const signUpResult = await store.signUp({
      email: 'invalid-email',
      password: 'SecurePass123',
      acceptTerms: true,
    })
    expect(signUpResult.success).toBe(false)
    expect(signUpResult.error).toContain('Invalid email')
  })

  it('should fail with weak password', async () => {
    const store = useAuthStore()
    store.initialize()

    const signUpResult = await store.signUp({
      email: 'test@example.com',
      password: 'weak',
      acceptTerms: true,
    })
    expect(signUpResult.success).toBe(false)
    expect(signUpResult.error).toBeDefined()
  })

  it('should fail without accepting terms', async () => {
    const store = useAuthStore()
    store.initialize()

    const signUpResult = await store.signUp({
      email: 'test@example.com',
      password: 'SecurePass123',
      acceptTerms: false,
    })
    expect(signUpResult.success).toBe(false)
    expect(signUpResult.error).toContain('terms of service')
  })

  it('should prevent duplicate registration', async () => {
    const store = useAuthStore()
    store.initialize()

    // First registration
    await store.signUp({
      email: 'duplicate@example.com',
      password: 'SecurePass123',
      acceptTerms: true,
    })

    // Sign out
    await store.signOut()

    // Try to register again with same email
    const signUpResult = await store.signUp({
      email: 'duplicate@example.com',
      password: 'DifferentPass456',
      acceptTerms: true,
    })
    expect(signUpResult.success).toBe(false)
    expect(signUpResult.error).toContain('already exists')
  })
})

describe('signIn', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('should successfully sign in registered user', async () => {
    const store = useAuthStore()
    store.initialize()

    // First register
    await store.signUp({
      email: 'login@example.com',
      password: 'SecurePass123',
      acceptTerms: true,
    })

    // Sign out
    await store.signOut()

    // Sign in
    const signInResult = await store.signIn({
      email: 'login@example.com',
      password: 'SecurePass123',
    })
    expect(signInResult.success).toBe(true)

    expect(store.state.status).toBe('authenticated')
  })

  it('should fail with wrong password', async () => {
    const store = useAuthStore()
    store.initialize()

    // Register
    await store.signUp({
      email: 'wrong-pass@example.com',
      password: 'SecurePass123',
      acceptTerms: true,
    })

    // Sign out
    await store.signOut()

    // Try to sign in with wrong password
    const signInResult = await store.signIn({
      email: 'wrong-pass@example.com',
      password: 'WrongPassword456',
    })
    expect(signInResult.success).toBe(false)
    expect(signInResult.error).toContain('Invalid email or password')
  })

  it('should fail with non-existent user', async () => {
    const store = useAuthStore()
    store.initialize()

    const signInResult = await store.signIn({
      email: 'nonexistent@example.com',
      password: 'AnyPassword123',
    })
    expect(signInResult.success).toBe(false)
    expect(signInResult.error).toContain('Invalid email or password')
  })
})

describe('signInWithOAuth', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('should sign in with Google (mock)', async () => {
    const store = useAuthStore()
    store.initialize()

    const oauthResult = await store.signInWithOAuth('google')
    expect(oauthResult.success).toBe(true)
    expect(oauthResult.user?.displayName).toBe('Google User')

    expect(store.state.status).toBe('authenticated')
  })

  it('should sign in with GitHub (mock)', async () => {
    const store = useAuthStore()
    store.initialize()

    const oauthResult = await store.signInWithOAuth('github')
    expect(oauthResult.success).toBe(true)
    expect(oauthResult.user?.displayName).toBe('Github User')

    expect(store.state.status).toBe('authenticated')
  })
})

describe('signOut', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('should sign out and clear session', async () => {
    const store = useAuthStore()
    store.initialize()

    // Sign up first
    await store.signUp({
      email: 'signout@example.com',
      password: 'SecurePass123',
      acceptTerms: true,
    })

    expect(store.state.status).toBe('authenticated')

    // Sign out
    await store.signOut()

    expect(store.state.status).toBe('unauthenticated')
    expect(store.state.user).toBeNull()
    expect(store.state.session).toBeNull()
  })

  it('should clear localStorage on sign out', async () => {
    const store = useAuthStore()
    store.initialize()

    await store.signUp({
      email: 'clear-storage@example.com',
      password: 'SecurePass123',
      acceptTerms: true,
    })

    await store.signOut()

    expect(localStorageMock.removeItem).toHaveBeenCalledWith(AUTH_STORAGE_KEYS.USER)
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(AUTH_STORAGE_KEYS.SESSION)
  })
})

describe('resetPassword', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('should accept valid email for password reset', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const store = useAuthStore()
    store.initialize()

    const resetResult = await store.resetPassword('reset@example.com')
    expect(resetResult.success).toBe(true)

    consoleSpy.mockRestore()
  })

  it('should reject invalid email for password reset', async () => {
    const store = useAuthStore()
    store.initialize()

    const resetResult = await store.resetPassword('invalid-email')
    expect(resetResult.success).toBe(false)
    expect(resetResult.error).toContain('Invalid email')
  })
})

describe('updateProfile', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('should update user profile', async () => {
    const store = useAuthStore()
    store.initialize()

    await store.signUp({
      email: 'update@example.com',
      password: 'SecurePass123',
      acceptTerms: true,
    })

    const updateResult = await store.updateProfile({
      displayName: 'New Display Name',
      avatarUrl: 'https://example.com/avatar.png',
    })
    expect(updateResult.success).toBe(true)

    expect(store.state.user?.displayName).toBe('New Display Name')
    expect(store.state.user?.avatarUrl).toBe('https://example.com/avatar.png')
  })

  it('should fail when not authenticated', async () => {
    const store = useAuthStore()
    store.initialize()

    const updateResult = await store.updateProfile({
      displayName: 'Test',
    })
    expect(updateResult.success).toBe(false)
    expect(updateResult.error).toContain('Not authenticated')
  })
})

describe('updatePreferences', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('should update user preferences', async () => {
    const store = useAuthStore()
    store.initialize()

    await store.signUp({
      email: 'prefs@example.com',
      password: 'SecurePass123',
      acceptTerms: true,
    })

    const updateResult = await store.updatePreferences({
      theme: 'dark',
      language: 'ru',
    })
    expect(updateResult.success).toBe(true)

    expect(store.state.user?.preferences?.theme).toBe('dark')
    expect(store.state.user?.preferences?.language).toBe('ru')
  })
})

describe('utility composables', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  describe('useAuth', () => {
    it('should return auth context value', () => {
      const auth = useAuth()

      expect(auth).toBeDefined()
      expect(auth.state).toBeDefined()
      expect(auth.signIn).toBeInstanceOf(Function)
      expect(auth.signUp).toBeInstanceOf(Function)
      expect(auth.signOut).toBeInstanceOf(Function)
    })
  })

  describe('useCurrentUser', () => {
    it('should return null when not authenticated', () => {
      const store = useAuthStore()
      store.initialize()

      const user = useCurrentUser()
      expect(user).toBeNull()
    })
  })

  describe('useIsAuthenticated', () => {
    it('should return false when not authenticated', () => {
      const store = useAuthStore()
      store.initialize()

      const isAuth = useIsAuthenticated()
      expect(isAuth).toBe(false)
    })
  })

  describe('useAuthLoading', () => {
    it('should return false when initialized', () => {
      const store = useAuthStore()
      store.initialize()

      const isLoading = useAuthLoading()
      expect(isLoading).toBe(false)
    })
  })

  describe('useUserPreferences', () => {
    it('should return default preferences when not authenticated', () => {
      const store = useAuthStore()
      store.initialize()

      const prefs = useUserPreferences()
      expect(prefs).toEqual(DEFAULT_USER_PREFERENCES)
    })
  })
})

describe('session persistence', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('should persist session to localStorage', async () => {
    const store = useAuthStore()
    store.initialize()

    await store.signUp({
      email: 'persist@example.com',
      password: 'SecurePass123',
      acceptTerms: true,
    })

    // Give watcher a tick
    await new Promise((resolve) => setTimeout(resolve, 0))

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
    setActivePinia(createPinia())
  })

  it('should refresh active session', async () => {
    const store = useAuthStore()
    store.initialize()

    await store.signUp({
      email: 'refresh@example.com',
      password: 'SecurePass123',
      acceptTerms: true,
    })

    const originalSession = store.state.session

    // Wait a bit to ensure different timestamp for new session
    await new Promise((resolve) => setTimeout(resolve, 5))

    const refreshResult = await store.refreshSession()
    expect(refreshResult.success).toBe(true)

    // New session should be different (new tokens)
    expect(store.state.session?.accessToken).not.toBe(originalSession?.accessToken)
  })

  it('should fail when not authenticated', async () => {
    const store = useAuthStore()
    store.initialize()

    const refreshResult = await store.refreshSession()
    expect(refreshResult.success).toBe(false)
    expect(refreshResult.error).toContain('No active session')
  })
})
