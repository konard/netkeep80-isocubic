/**
 * Authentication module for isocubic
 *
 * Provides a Pinia store and composables for user authentication.
 * Designed to work with Supabase but abstracted to allow provider changes.
 *
 * TASK 61: Migrated from React Context to Pinia store (Phase 10 - Vue.js 3.0 Migration)
 *
 * Usage:
 * In App.vue — just install Pinia in main.ts, no provider needed.
 * In any component, import useAuthStore from './lib/auth' and use it.
 */

import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type {
  AuthState,
  AuthContextValue,
  AuthResult,
  LoginCredentials,
  RegistrationData,
  UserProfile,
  UserPreferences,
  AuthSession,
  OAuthProvider,
} from '../types/auth'
import {
  DEFAULT_AUTH_STATE,
  AUTH_STORAGE_KEYS,
  createDefaultUserProfile,
  isSessionExpired,
  authValidation,
  DEFAULT_USER_PREFERENCES,
} from '../types/auth'

// ============================================================================
// Action types for auth reducer
// ============================================================================

type AuthAction =
  | { type: 'AUTH_LOADING' }
  | { type: 'AUTH_SUCCESS'; user: UserProfile; session: AuthSession }
  | { type: 'AUTH_ERROR'; error: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'UPDATE_USER'; user: Partial<UserProfile> }
  | { type: 'UPDATE_PREFERENCES'; preferences: Partial<UserPreferences> }

// ============================================================================
// Auth reducer
// ============================================================================

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_LOADING':
      return {
        ...state,
        status: 'loading',
        error: null,
      }
    case 'AUTH_SUCCESS':
      return {
        status: 'authenticated',
        user: action.user,
        session: action.session,
        error: null,
      }
    case 'AUTH_ERROR':
      return {
        status: 'error',
        user: null,
        session: null,
        error: action.error,
      }
    case 'AUTH_LOGOUT':
      return {
        status: 'unauthenticated',
        user: null,
        session: null,
        error: null,
      }
    case 'UPDATE_USER':
      if (!state.user) return state
      return {
        ...state,
        user: { ...state.user, ...action.user },
      }
    case 'UPDATE_PREFERENCES':
      if (!state.user) return state
      return {
        ...state,
        user: {
          ...state.user,
          preferences: {
            ...(state.user.preferences || DEFAULT_USER_PREFERENCES),
            ...action.preferences,
          },
        },
      }
    default:
      return state
  }
}

// ============================================================================
// Storage helpers
// ============================================================================

/**
 * Saves auth data to localStorage
 */
function saveAuthToStorage(user: UserProfile | null, session: AuthSession | null): void {
  try {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEYS.USER, JSON.stringify(user))
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEYS.USER)
    }

    if (session) {
      localStorage.setItem(AUTH_STORAGE_KEYS.SESSION, JSON.stringify(session))
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEYS.SESSION)
    }
  } catch (error) {
    console.warn('[Auth] Failed to save to localStorage:', error)
  }
}

/**
 * Loads auth data from localStorage
 */
function loadAuthFromStorage(): { user: UserProfile | null; session: AuthSession | null } {
  try {
    const userJson = localStorage.getItem(AUTH_STORAGE_KEYS.USER)
    const sessionJson = localStorage.getItem(AUTH_STORAGE_KEYS.SESSION)

    const user = userJson ? (JSON.parse(userJson) as UserProfile) : null
    const session = sessionJson ? (JSON.parse(sessionJson) as AuthSession) : null

    return { user, session }
  } catch (error) {
    console.warn('[Auth] Failed to load from localStorage:', error)
    return { user: null, session: null }
  }
}

/**
 * Clears all auth data from localStorage
 */
function clearAuthFromStorage(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEYS.USER)
    localStorage.removeItem(AUTH_STORAGE_KEYS.SESSION)
    localStorage.removeItem(AUTH_STORAGE_KEYS.PREFERENCES)
  } catch (error) {
    console.warn('[Auth] Failed to clear localStorage:', error)
  }
}

// ============================================================================
// Mock auth functions (to be replaced with Supabase integration)
// ============================================================================

/**
 * Generates a mock session for demo purposes
 * Replace with actual Supabase session handling
 */
function createMockSession(): AuthSession {
  return {
    accessToken: `mock-access-token-${Date.now()}`,
    refreshToken: `mock-refresh-token-${Date.now()}`,
    expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
    tokenType: 'Bearer',
  }
}

/**
 * Mock user database for demo purposes
 * Replace with actual Supabase database
 */
const mockUserStore = new Map<string, { user: UserProfile; passwordHash: string }>()

/**
 * Simple hash function for demo (NOT FOR PRODUCTION)
 * In production, use bcrypt or similar on the server side
 */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(16)
}

// ============================================================================
// Pinia Auth Store
// ============================================================================

/**
 * Pinia store for authentication state management
 */
export const useAuthStore = defineStore('auth', () => {
  const state = ref<AuthState>({ ...DEFAULT_AUTH_STATE })

  function dispatch(action: AuthAction) {
    state.value = authReducer(state.value, action)
  }

  // Initialize auth state from localStorage
  function initialize() {
    const { user, session } = loadAuthFromStorage()

    if (user && session && !isSessionExpired(session)) {
      dispatch({ type: 'AUTH_SUCCESS', user, session })
    } else {
      clearAuthFromStorage()
      dispatch({ type: 'AUTH_LOGOUT' })
    }
  }

  // Save auth state to localStorage when it changes
  watch(
    () => [state.value.status, state.value.user, state.value.session] as const,
    () => {
      if (state.value.status === 'authenticated') {
        saveAuthToStorage(state.value.user, state.value.session)
      }
    }
  )

  /**
   * Sign in with email and password
   */
  async function signIn(credentials: LoginCredentials): Promise<AuthResult> {
    dispatch({ type: 'AUTH_LOADING' })

    try {
      // Validate email
      if (!authValidation.isValidEmail(credentials.email)) {
        const error = 'Invalid email address'
        dispatch({ type: 'AUTH_ERROR', error })
        return { success: false, error }
      }

      // Mock authentication - replace with Supabase
      const storedUser = mockUserStore.get(credentials.email)
      if (!storedUser) {
        const error = 'Invalid email or password'
        dispatch({ type: 'AUTH_ERROR', error })
        return { success: false, error }
      }

      const passwordHash = simpleHash(credentials.password)
      if (storedUser.passwordHash !== passwordHash) {
        const error = 'Invalid email or password'
        dispatch({ type: 'AUTH_ERROR', error })
        return { success: false, error }
      }

      // Update last login time
      const user: UserProfile = {
        ...storedUser.user,
        lastLoginAt: new Date().toISOString(),
      }
      const session = createMockSession()

      dispatch({ type: 'AUTH_SUCCESS', user, session })
      return { success: true, user, session }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed'
      dispatch({ type: 'AUTH_ERROR', error: errorMessage })
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Sign in with OAuth provider
   */
  async function signInWithOAuth(provider: OAuthProvider): Promise<AuthResult> {
    dispatch({ type: 'AUTH_LOADING' })

    try {
      // TODO: Implement actual OAuth flow with Supabase
      // For now, create a mock OAuth user
      const mockEmail = `${provider}-user-${Date.now()}@oauth.example.com`
      const user = createDefaultUserProfile(`oauth-${Date.now()}`, mockEmail)
      user.displayName = `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`
      user.avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${provider}`

      const session = createMockSession()

      dispatch({ type: 'AUTH_SUCCESS', user, session })
      return { success: true, user, session }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${provider} sign in failed`
      dispatch({ type: 'AUTH_ERROR', error: errorMessage })
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Sign up with email and password
   */
  async function signUp(data: RegistrationData): Promise<AuthResult> {
    dispatch({ type: 'AUTH_LOADING' })

    try {
      // Validate registration data
      const validation = authValidation.validateRegistration(data)
      if (!validation.valid) {
        const error = validation.errors.join(', ')
        dispatch({ type: 'AUTH_ERROR', error })
        return { success: false, error }
      }

      // Check if user already exists
      if (mockUserStore.has(data.email)) {
        const error = 'An account with this email already exists'
        dispatch({ type: 'AUTH_ERROR', error })
        return { success: false, error }
      }

      // Create new user
      const userId = `user-${Date.now()}`
      const user = createDefaultUserProfile(userId, data.email)
      if (data.displayName) {
        user.displayName = data.displayName
      }

      // Store user with password hash (mock storage)
      mockUserStore.set(data.email, {
        user,
        passwordHash: simpleHash(data.password),
      })

      const session = createMockSession()

      dispatch({ type: 'AUTH_SUCCESS', user, session })
      return { success: true, user, session }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed'
      dispatch({ type: 'AUTH_ERROR', error: errorMessage })
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Sign out current user
   */
  async function signOut(): Promise<void> {
    clearAuthFromStorage()
    dispatch({ type: 'AUTH_LOGOUT' })
  }

  /**
   * Send password reset email
   */
  async function resetPassword(email: string): Promise<AuthResult> {
    try {
      if (!authValidation.isValidEmail(email)) {
        return { success: false, error: 'Invalid email address' }
      }

      // TODO: Implement with Supabase
      // For now, just pretend we sent an email
      console.log(`[Auth] Password reset email would be sent to: ${email}`)

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset failed'
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Update user profile
   */
  async function updateProfile(data: Partial<UserProfile>): Promise<AuthResult> {
    if (!state.value.user) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      dispatch({ type: 'UPDATE_USER', user: data })

      // Update mock storage
      const storedUser = mockUserStore.get(state.value.user.email)
      if (storedUser) {
        mockUserStore.set(state.value.user.email, {
          ...storedUser,
          user: { ...storedUser.user, ...data },
        })
      }

      return { success: true, user: { ...state.value.user, ...data } }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Profile update failed'
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Update user preferences
   */
  async function updatePreferences(prefs: Partial<UserPreferences>): Promise<AuthResult> {
    if (!state.value.user) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      dispatch({ type: 'UPDATE_PREFERENCES', preferences: prefs })

      // Save preferences separately for quick access
      const updatedPrefs = {
        ...(state.value.user.preferences || DEFAULT_USER_PREFERENCES),
        ...prefs,
      }
      localStorage.setItem(AUTH_STORAGE_KEYS.PREFERENCES, JSON.stringify(updatedPrefs))

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Preferences update failed'
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Refresh the current session
   */
  async function refreshSession(): Promise<AuthResult> {
    if (!state.value.session || !state.value.user) {
      return { success: false, error: 'No active session' }
    }

    try {
      // TODO: Implement with Supabase refresh token
      const newSession = createMockSession()

      dispatch({
        type: 'AUTH_SUCCESS',
        user: state.value.user,
        session: newSession,
      })

      return { success: true, session: newSession }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Session refresh failed'
      dispatch({ type: 'AUTH_ERROR', error: errorMessage })
      return { success: false, error: errorMessage }
    }
  }

  return {
    state,
    initialize,
    signIn,
    signInWithOAuth,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    updatePreferences,
    refreshSession,
  }
})

// ============================================================================
// Composable hooks (convenience wrappers for backward compatibility)
// ============================================================================

/**
 * Composable to access authentication state
 *
 * @returns AuthContextValue compatible interface
 */
export function useAuth(): AuthContextValue {
  const store = useAuthStore()
  return {
    state: store.state,
    signIn: store.signIn,
    signInWithOAuth: store.signInWithOAuth,
    signUp: store.signUp,
    signOut: store.signOut,
    resetPassword: store.resetPassword,
    updateProfile: store.updateProfile,
    updatePreferences: store.updatePreferences,
    refreshSession: store.refreshSession,
  }
}

/**
 * Composable to get current user (convenience wrapper)
 * Returns null if not authenticated
 */
export function useCurrentUser(): UserProfile | null {
  const store = useAuthStore()
  return store.state.user
}

/**
 * Composable to check if user is authenticated
 */
export function useIsAuthenticated(): boolean {
  const store = useAuthStore()
  return store.state.status === 'authenticated'
}

/**
 * Composable to get loading state
 */
export function useAuthLoading(): boolean {
  const store = useAuthStore()
  return store.state.status === 'loading'
}

/**
 * Composable to get user preferences
 */
export function useUserPreferences(): UserPreferences {
  const store = useAuthStore()
  return store.state.user?.preferences || DEFAULT_USER_PREFERENCES
}

// ============================================================================
// Export types for testing
// ============================================================================

export type { AuthAction }
