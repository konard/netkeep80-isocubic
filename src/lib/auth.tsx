/**
 * Authentication module for isocubic
 *
 * Provides React context and hooks for user authentication.
 * Designed to work with Supabase but abstracted to allow provider changes.
 *
 * Usage:
 * ```tsx
 * // In App.tsx
 * import { AuthProvider } from './lib/auth'
 *
 * function App() {
 *   return (
 *     <AuthProvider>
 *       <YourApp />
 *     </AuthProvider>
 *   )
 * }
 *
 * // In any component
 * import { useAuth } from './lib/auth'
 *
 * function Profile() {
 *   const { state, signOut } = useAuth()
 *
 *   if (state.status === 'loading') return <div>Loading...</div>
 *   if (!state.user) return <div>Please sign in</div>
 *
 *   return (
 *     <div>
 *       <p>Hello, {state.user.displayName}!</p>
 *       <button onClick={signOut}>Sign Out</button>
 *     </div>
 *   )
 * }
 * ```
 */

import { createContext, useContext, useCallback, useReducer, useEffect } from 'react'
import type { ReactNode } from 'react'
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
// React Context
// ============================================================================

const AuthContext = createContext<AuthContextValue | null>(null)

// ============================================================================
// Auth Provider Component
// ============================================================================

interface AuthProviderProps {
  children: ReactNode
}

/**
 * Auth provider component that wraps the application
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, DEFAULT_AUTH_STATE)

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const { user, session } = loadAuthFromStorage()

    if (user && session && !isSessionExpired(session)) {
      dispatch({ type: 'AUTH_SUCCESS', user, session })
    } else {
      clearAuthFromStorage()
      dispatch({ type: 'AUTH_LOGOUT' })
    }
  }, [])

  // Save auth state to localStorage when it changes
  useEffect(() => {
    if (state.status === 'authenticated') {
      saveAuthToStorage(state.user, state.session)
    }
  }, [state.status, state.user, state.session])

  /**
   * Sign in with email and password
   */
  const signIn = useCallback(async (credentials: LoginCredentials): Promise<AuthResult> => {
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
  }, [])

  /**
   * Sign in with OAuth provider
   */
  const signInWithOAuth = useCallback(async (provider: OAuthProvider): Promise<AuthResult> => {
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
  }, [])

  /**
   * Sign up with email and password
   */
  const signUp = useCallback(async (data: RegistrationData): Promise<AuthResult> => {
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
  }, [])

  /**
   * Sign out current user
   */
  const signOut = useCallback(async (): Promise<void> => {
    clearAuthFromStorage()
    dispatch({ type: 'AUTH_LOGOUT' })
  }, [])

  /**
   * Send password reset email
   */
  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
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
  }, [])

  /**
   * Update user profile
   */
  const updateProfile = useCallback(
    async (data: Partial<UserProfile>): Promise<AuthResult> => {
      if (!state.user) {
        return { success: false, error: 'Not authenticated' }
      }

      try {
        dispatch({ type: 'UPDATE_USER', user: data })

        // Update mock storage
        const storedUser = mockUserStore.get(state.user.email)
        if (storedUser) {
          mockUserStore.set(state.user.email, {
            ...storedUser,
            user: { ...storedUser.user, ...data },
          })
        }

        return { success: true, user: { ...state.user, ...data } }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Profile update failed'
        return { success: false, error: errorMessage }
      }
    },
    [state.user]
  )

  /**
   * Update user preferences
   */
  const updatePreferences = useCallback(
    async (prefs: Partial<UserPreferences>): Promise<AuthResult> => {
      if (!state.user) {
        return { success: false, error: 'Not authenticated' }
      }

      try {
        dispatch({ type: 'UPDATE_PREFERENCES', preferences: prefs })

        // Save preferences separately for quick access
        const updatedPrefs = {
          ...(state.user.preferences || DEFAULT_USER_PREFERENCES),
          ...prefs,
        }
        localStorage.setItem(AUTH_STORAGE_KEYS.PREFERENCES, JSON.stringify(updatedPrefs))

        return { success: true }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Preferences update failed'
        return { success: false, error: errorMessage }
      }
    },
    [state.user]
  )

  /**
   * Refresh the current session
   */
  const refreshSession = useCallback(async (): Promise<AuthResult> => {
    if (!state.session || !state.user) {
      return { success: false, error: 'No active session' }
    }

    try {
      // TODO: Implement with Supabase refresh token
      const newSession = createMockSession()

      dispatch({
        type: 'AUTH_SUCCESS',
        user: state.user,
        session: newSession,
      })

      return { success: true, session: newSession }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Session refresh failed'
      dispatch({ type: 'AUTH_ERROR', error: errorMessage })
      return { success: false, error: errorMessage }
    }
  }, [state.session, state.user])

  const contextValue: AuthContextValue = {
    state,
    signIn,
    signInWithOAuth,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    updatePreferences,
    refreshSession,
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

// ============================================================================
// useAuth Hook
// ============================================================================

/**
 * Hook to access authentication context
 *
 * @throws Error if used outside of AuthProvider
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}

// ============================================================================
// Utility hooks
// ============================================================================

/**
 * Hook to get current user (convenience wrapper)
 * Returns null if not authenticated
 */
export function useCurrentUser(): UserProfile | null {
  const { state } = useAuth()
  return state.user
}

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated(): boolean {
  const { state } = useAuth()
  return state.status === 'authenticated'
}

/**
 * Hook to get loading state
 */
export function useAuthLoading(): boolean {
  const { state } = useAuth()
  return state.status === 'loading'
}

/**
 * Hook to get user preferences
 */
export function useUserPreferences(): UserPreferences {
  const { state } = useAuth()
  return state.user?.preferences || DEFAULT_USER_PREFERENCES
}

// ============================================================================
// Export context for testing
// ============================================================================

export { AuthContext }
export type { AuthAction }
