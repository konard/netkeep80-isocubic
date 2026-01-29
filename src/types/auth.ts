/**
 * TypeScript types for authentication system
 * Supports Supabase as the authentication provider
 *
 * Provider decision: Supabase was chosen because:
 * - Open-source friendly (aligns with project's Unlicense license)
 * - Built-in OAuth support (Google, GitHub)
 * - Good free tier for hobby projects
 * - PostgreSQL-based for future data persistence
 * - TypeScript-first SDK
 */

/**
 * Supported OAuth providers
 */
export type OAuthProvider = 'google' | 'github'

/**
 * User authentication status
 */
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error'

/**
 * User roles for access control
 */
export type UserRole = 'user' | 'creator' | 'moderator' | 'admin'

/**
 * User profile information
 */
export interface UserProfile {
  /** Unique user identifier */
  id: string
  /** User's email address */
  email: string
  /** Display name (from profile or derived from email) */
  displayName: string
  /** Profile avatar URL */
  avatarUrl?: string
  /** User role for access control */
  role: UserRole
  /** Account creation timestamp (ISO 8601) */
  createdAt: string
  /** Last login timestamp (ISO 8601) */
  lastLoginAt?: string
  /** Custom user preferences */
  preferences?: UserPreferences
}

/**
 * User preferences for personalization
 */
export interface UserPreferences {
  /** UI theme preference */
  theme: 'light' | 'dark' | 'system'
  /** Preferred language (ISO 639-1 code) */
  language: string
  /** Show tooltips and hints */
  showHints: boolean
  /** Enable autosave */
  autosave: boolean
  /** Default cube view settings */
  defaultView?: {
    showGrid: boolean
    animate: boolean
    showShadows: boolean
  }
}

/**
 * Default user preferences
 */
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'system',
  language: 'en',
  showHints: true,
  autosave: true,
  defaultView: {
    showGrid: true,
    animate: false,
    showShadows: true,
  },
}

/**
 * Authentication session data
 */
export interface AuthSession {
  /** Access token for API calls */
  accessToken: string
  /** Refresh token for session renewal */
  refreshToken: string
  /** Token expiration timestamp (Unix milliseconds) */
  expiresAt: number
  /** Token type (typically 'Bearer') */
  tokenType: string
}

/**
 * Authentication state
 */
export interface AuthState {
  /** Current authentication status */
  status: AuthStatus
  /** Current user profile (null if not authenticated) */
  user: UserProfile | null
  /** Current session (null if not authenticated) */
  session: AuthSession | null
  /** Error message if status is 'error' */
  error: string | null
}

/**
 * Default authentication state
 */
export const DEFAULT_AUTH_STATE: AuthState = {
  status: 'loading',
  user: null,
  session: null,
  error: null,
}

/**
 * Login credentials for email/password authentication
 */
export interface LoginCredentials {
  /** User's email address */
  email: string
  /** User's password */
  password: string
  /** Remember login session */
  rememberMe?: boolean
}

/**
 * Registration data for new user signup
 */
export interface RegistrationData {
  /** User's email address */
  email: string
  /** User's password */
  password: string
  /** Display name (optional, derived from email if not provided) */
  displayName?: string
  /** Accept terms of service */
  acceptTerms: boolean
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  /** User's email address */
  email: string
}

/**
 * Result of an authentication operation
 */
export interface AuthResult {
  /** Whether the operation was successful */
  success: boolean
  /** Error message if not successful */
  error?: string
  /** User profile if successful */
  user?: UserProfile
  /** Session data if successful */
  session?: AuthSession
}

/**
 * OAuth callback data
 */
export interface OAuthCallbackData {
  /** OAuth provider */
  provider: OAuthProvider
  /** Authorization code from provider */
  code?: string
  /** State parameter for CSRF protection */
  state?: string
  /** Error from provider */
  error?: string
  /** Error description from provider */
  errorDescription?: string
}

/**
 * Authentication context value for React context
 */
export interface AuthContextValue {
  /** Current auth state */
  state: AuthState
  /** Sign in with email/password */
  signIn: (credentials: LoginCredentials) => Promise<AuthResult>
  /** Sign in with OAuth provider */
  signInWithOAuth: (provider: OAuthProvider) => Promise<AuthResult>
  /** Sign up with email/password */
  signUp: (data: RegistrationData) => Promise<AuthResult>
  /** Sign out current user */
  signOut: () => Promise<void>
  /** Send password reset email */
  resetPassword: (email: string) => Promise<AuthResult>
  /** Update user profile */
  updateProfile: (data: Partial<UserProfile>) => Promise<AuthResult>
  /** Update user preferences */
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<AuthResult>
  /** Refresh the current session */
  refreshSession: () => Promise<AuthResult>
}

/**
 * Storage keys for auth persistence
 */
export const AUTH_STORAGE_KEYS = {
  SESSION: 'isocubic_auth_session',
  USER: 'isocubic_auth_user',
  PREFERENCES: 'isocubic_auth_preferences',
} as const

/**
 * Validation helpers for auth data
 */
export const authValidation = {
  /** Minimum password length */
  MIN_PASSWORD_LENGTH: 8,

  /** Email validation regex */
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  /**
   * Validates an email address
   */
  isValidEmail(email: string): boolean {
    return this.EMAIL_REGEX.test(email)
  },

  /**
   * Validates a password
   * Requirements: min 8 chars, at least one letter and one number
   */
  isValidPassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (password.length < this.MIN_PASSWORD_LENGTH) {
      errors.push(`Password must be at least ${this.MIN_PASSWORD_LENGTH} characters`)
    }
    if (!/[a-zA-Z]/.test(password)) {
      errors.push('Password must contain at least one letter')
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number')
    }

    return { valid: errors.length === 0, errors }
  },

  /**
   * Validates registration data
   */
  validateRegistration(data: RegistrationData): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!this.isValidEmail(data.email)) {
      errors.push('Invalid email address')
    }

    const passwordValidation = this.isValidPassword(data.password)
    if (!passwordValidation.valid) {
      errors.push(...passwordValidation.errors)
    }

    if (!data.acceptTerms) {
      errors.push('You must accept the terms of service')
    }

    return { valid: errors.length === 0, errors }
  },
}

/**
 * Helper to extract display name from email
 */
export function getDisplayNameFromEmail(email: string): string {
  const localPart = email.split('@')[0]
  // Capitalize first letter and replace dots/underscores with spaces
  return localPart.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Creates a default user profile
 */
export function createDefaultUserProfile(id: string, email: string): UserProfile {
  return {
    id,
    email,
    displayName: getDisplayNameFromEmail(email),
    role: 'user',
    createdAt: new Date().toISOString(),
    preferences: { ...DEFAULT_USER_PREFERENCES },
  }
}

/**
 * Checks if a session is expired
 */
export function isSessionExpired(session: AuthSession | null): boolean {
  if (!session) return true
  // Consider session expired 5 minutes before actual expiration
  const expirationBuffer = 5 * 60 * 1000 // 5 minutes
  return Date.now() + expirationBuffer >= session.expiresAt
}
