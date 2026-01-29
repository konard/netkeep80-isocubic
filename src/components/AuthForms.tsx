/**
 * Authentication form components
 * Provides LoginForm and RegisterForm UI components for user authentication
 */

import { useState, useCallback, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import type { OAuthProvider } from '../types/auth'
import { authValidation } from '../types/auth'

// ============================================================================
// Types
// ============================================================================

export interface AuthFormsProps {
  /** Initial form to display */
  initialForm?: 'login' | 'register'
  /** Callback on successful authentication */
  onSuccess?: () => void
  /** Custom class name */
  className?: string
}

interface FormState {
  email: string
  password: string
  confirmPassword: string
  displayName: string
  acceptTerms: boolean
}

// ============================================================================
// AuthForms Component
// ============================================================================

/**
 * Combined authentication forms component
 * Switches between login and register forms
 */
export function AuthForms({ initialForm = 'login', onSuccess, className = '' }: AuthFormsProps) {
  const { signIn, signUp, signInWithOAuth, resetPassword, state } = useAuth()

  const [activeForm, setActiveForm] = useState<'login' | 'register' | 'reset'>(initialForm)
  const [formState, setFormState] = useState<FormState>({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    acceptTerms: false,
  })
  const [errors, setErrors] = useState<string[]>([])
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const isLoading = state.status === 'loading'

  // Update form field
  const updateField = useCallback(
    (field: keyof FormState, value: string | boolean) => {
      setFormState((prev) => ({ ...prev, [field]: value }))
      // Clear errors when user starts typing
      if (errors.length > 0) {
        setErrors([])
      }
    },
    [errors]
  )

  // Handle login form submission
  const handleLogin = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      setErrors([])
      setSuccessMessage(null)

      if (!authValidation.isValidEmail(formState.email)) {
        setErrors(['Please enter a valid email address'])
        return
      }

      if (!formState.password) {
        setErrors(['Password is required'])
        return
      }

      const result = await signIn({
        email: formState.email,
        password: formState.password,
      })

      if (result.success) {
        onSuccess?.()
      } else {
        setErrors([result.error || 'Login failed'])
      }
    },
    [formState.email, formState.password, signIn, onSuccess]
  )

  // Handle register form submission
  const handleRegister = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      setErrors([])
      setSuccessMessage(null)

      // Validate email
      if (!authValidation.isValidEmail(formState.email)) {
        setErrors(['Please enter a valid email address'])
        return
      }

      // Validate password
      const passwordValidation = authValidation.isValidPassword(formState.password)
      if (!passwordValidation.valid) {
        setErrors(passwordValidation.errors)
        return
      }

      // Check password confirmation
      if (formState.password !== formState.confirmPassword) {
        setErrors(['Passwords do not match'])
        return
      }

      // Check terms acceptance
      if (!formState.acceptTerms) {
        setErrors(['You must accept the terms of service'])
        return
      }

      const result = await signUp({
        email: formState.email,
        password: formState.password,
        displayName: formState.displayName || undefined,
        acceptTerms: formState.acceptTerms,
      })

      if (result.success) {
        onSuccess?.()
      } else {
        setErrors([result.error || 'Registration failed'])
      }
    },
    [formState, signUp, onSuccess]
  )

  // Handle password reset
  const handleResetPassword = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      setErrors([])
      setSuccessMessage(null)

      if (!authValidation.isValidEmail(formState.email)) {
        setErrors(['Please enter a valid email address'])
        return
      }

      const result = await resetPassword(formState.email)

      if (result.success) {
        setSuccessMessage('Password reset email sent. Check your inbox.')
        setActiveForm('login')
      } else {
        setErrors([result.error || 'Password reset failed'])
      }
    },
    [formState.email, resetPassword]
  )

  // Handle OAuth login
  const handleOAuth = useCallback(
    async (provider: OAuthProvider) => {
      setErrors([])
      setSuccessMessage(null)

      const result = await signInWithOAuth(provider)

      if (result.success) {
        onSuccess?.()
      } else {
        setErrors([result.error || `${provider} login failed`])
      }
    },
    [signInWithOAuth, onSuccess]
  )

  // Switch between forms
  const switchToForm = useCallback((form: 'login' | 'register' | 'reset') => {
    setActiveForm(form)
    setErrors([])
    setSuccessMessage(null)
  }, [])

  return (
    <div className={`auth-forms ${className}`}>
      {/* Form tabs */}
      {activeForm !== 'reset' && (
        <div className="auth-forms__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeForm === 'login'}
            className={`auth-forms__tab ${activeForm === 'login' ? 'auth-forms__tab--active' : ''}`}
            onClick={() => switchToForm('login')}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeForm === 'register'}
            className={`auth-forms__tab ${activeForm === 'register' ? 'auth-forms__tab--active' : ''}`}
            onClick={() => switchToForm('register')}
          >
            Register
          </button>
        </div>
      )}

      {/* Success message */}
      {successMessage && (
        <div className="auth-forms__message auth-forms__message--success" role="status">
          {successMessage}
        </div>
      )}

      {/* Error messages */}
      {errors.length > 0 && (
        <div className="auth-forms__message auth-forms__message--error" role="alert">
          {errors.map((error, index) => (
            <p key={index}>{error}</p>
          ))}
        </div>
      )}

      {/* Login form */}
      {activeForm === 'login' && (
        <form onSubmit={handleLogin} className="auth-forms__form" noValidate>
          <div className="auth-forms__field">
            <label htmlFor="login-email" className="auth-forms__label">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={formState.email}
              onChange={(e) => updateField('email', e.target.value)}
              className="auth-forms__input"
              placeholder="you@example.com"
              autoComplete="email"
              required
              disabled={isLoading}
            />
          </div>

          <div className="auth-forms__field">
            <label htmlFor="login-password" className="auth-forms__label">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={formState.password}
              onChange={(e) => updateField('password', e.target.value)}
              className="auth-forms__input"
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="auth-forms__button auth-forms__button--primary"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>

          <button type="button" className="auth-forms__link" onClick={() => switchToForm('reset')}>
            Forgot password?
          </button>
        </form>
      )}

      {/* Register form */}
      {activeForm === 'register' && (
        <form onSubmit={handleRegister} className="auth-forms__form" noValidate>
          <div className="auth-forms__field">
            <label htmlFor="register-displayname" className="auth-forms__label">
              Display Name (optional)
            </label>
            <input
              id="register-displayname"
              type="text"
              value={formState.displayName}
              onChange={(e) => updateField('displayName', e.target.value)}
              className="auth-forms__input"
              placeholder="Your name"
              autoComplete="name"
              disabled={isLoading}
            />
          </div>

          <div className="auth-forms__field">
            <label htmlFor="register-email" className="auth-forms__label">
              Email
            </label>
            <input
              id="register-email"
              type="email"
              value={formState.email}
              onChange={(e) => updateField('email', e.target.value)}
              className="auth-forms__input"
              placeholder="you@example.com"
              autoComplete="email"
              required
              disabled={isLoading}
            />
          </div>

          <div className="auth-forms__field">
            <label htmlFor="register-password" className="auth-forms__label">
              Password
            </label>
            <input
              id="register-password"
              type="password"
              value={formState.password}
              onChange={(e) => updateField('password', e.target.value)}
              className="auth-forms__input"
              placeholder="Min 8 chars, letter & number"
              autoComplete="new-password"
              required
              disabled={isLoading}
            />
          </div>

          <div className="auth-forms__field">
            <label htmlFor="register-confirm" className="auth-forms__label">
              Confirm Password
            </label>
            <input
              id="register-confirm"
              type="password"
              value={formState.confirmPassword}
              onChange={(e) => updateField('confirmPassword', e.target.value)}
              className="auth-forms__input"
              placeholder="Confirm your password"
              autoComplete="new-password"
              required
              disabled={isLoading}
            />
          </div>

          <div className="auth-forms__checkbox">
            <input
              id="register-terms"
              type="checkbox"
              checked={formState.acceptTerms}
              onChange={(e) => updateField('acceptTerms', e.target.checked)}
              className="auth-forms__checkbox-input"
              required
              disabled={isLoading}
            />
            <label htmlFor="register-terms" className="auth-forms__checkbox-label">
              I accept the Terms of Service
            </label>
          </div>

          <button
            type="submit"
            className="auth-forms__button auth-forms__button--primary"
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
      )}

      {/* Password reset form */}
      {activeForm === 'reset' && (
        <form onSubmit={handleResetPassword} className="auth-forms__form" noValidate>
          <h3 className="auth-forms__title">Reset Password</h3>
          <p className="auth-forms__description">
            Enter your email address and we'll send you a link to reset your password.
          </p>

          <div className="auth-forms__field">
            <label htmlFor="reset-email" className="auth-forms__label">
              Email
            </label>
            <input
              id="reset-email"
              type="email"
              value={formState.email}
              onChange={(e) => updateField('email', e.target.value)}
              className="auth-forms__input"
              placeholder="you@example.com"
              autoComplete="email"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="auth-forms__button auth-forms__button--primary"
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>

          <button type="button" className="auth-forms__link" onClick={() => switchToForm('login')}>
            Back to Sign In
          </button>
        </form>
      )}

      {/* OAuth buttons */}
      {activeForm !== 'reset' && (
        <div className="auth-forms__oauth">
          <div className="auth-forms__divider">
            <span>or continue with</span>
          </div>

          <div className="auth-forms__oauth-buttons">
            <button
              type="button"
              className="auth-forms__button auth-forms__button--oauth"
              onClick={() => handleOAuth('google')}
              disabled={isLoading}
            >
              <span className="auth-forms__oauth-icon">G</span>
              Google
            </button>
            <button
              type="button"
              className="auth-forms__button auth-forms__button--oauth"
              onClick={() => handleOAuth('github')}
              disabled={isLoading}
            >
              <span className="auth-forms__oauth-icon">GH</span>
              GitHub
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Individual form exports for flexibility
// ============================================================================

export interface LoginFormProps {
  onSuccess?: () => void
  className?: string
}

/**
 * Standalone login form
 */
export function LoginForm({ onSuccess, className = '' }: LoginFormProps) {
  return <AuthForms initialForm="login" onSuccess={onSuccess} className={className} />
}

export interface RegisterFormProps {
  onSuccess?: () => void
  className?: string
}

/**
 * Standalone register form
 */
export function RegisterForm({ onSuccess, className = '' }: RegisterFormProps) {
  return <AuthForms initialForm="register" onSuccess={onSuccess} className={className} />
}

export default AuthForms
