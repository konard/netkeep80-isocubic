/**
 * Tests for AuthForms component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthForms, LoginForm, RegisterForm } from './AuthForms'
import { AuthProvider } from '../lib/auth'

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

// Wrapper component with AuthProvider
function AuthWrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

describe('AuthForms', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe('LoginForm (initial)', () => {
    it('should render login form by default', () => {
      render(
        <AuthWrapper>
          <AuthForms />
        </AuthWrapper>
      )

      expect(screen.getByRole('tab', { name: 'Sign In' })).toHaveAttribute(
        'class',
        expect.stringContaining('active')
      )
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      // Check for submit button within form
      const form = document.querySelector('form')
      expect(form?.querySelector('button[type="submit"]')).toBeInTheDocument()
    })

    it('should show forgot password link', () => {
      render(
        <AuthWrapper>
          <AuthForms />
        </AuthWrapper>
      )

      expect(screen.getByText(/forgot password/i)).toBeInTheDocument()
    })

    it('should show OAuth buttons', () => {
      render(
        <AuthWrapper>
          <AuthForms />
        </AuthWrapper>
      )

      expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /github/i })).toBeInTheDocument()
    })

    it('should validate email format', async () => {
      const user = userEvent.setup()

      render(
        <AuthWrapper>
          <AuthForms />
        </AuthWrapper>
      )

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const form = document.querySelector('form')
      const submitButton = form?.querySelector('button[type="submit"]') as HTMLElement

      await user.type(emailInput, 'invalid-email')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/valid email/i)
      })
    })

    it('should require password', async () => {
      const user = userEvent.setup()

      render(
        <AuthWrapper>
          <AuthForms />
        </AuthWrapper>
      )

      const emailInput = screen.getByLabelText(/email/i)
      const form = document.querySelector('form')
      const submitButton = form?.querySelector('button[type="submit"]') as HTMLElement

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/password.*required/i)
      })
    })
  })

  describe('RegisterForm (via tab)', () => {
    it('should switch to register form when tab clicked', async () => {
      const user = userEvent.setup()

      render(
        <AuthWrapper>
          <AuthForms />
        </AuthWrapper>
      )

      const registerTab = screen.getByRole('tab', { name: 'Register' })
      await user.click(registerTab)

      expect(screen.getByLabelText(/display name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/terms of service/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    })

    it('should validate password requirements', async () => {
      const user = userEvent.setup()

      render(
        <AuthWrapper>
          <AuthForms initialForm="register" />
        </AuthWrapper>
      )

      const emailInput = screen.getByLabelText(/^email$/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmInput = screen.getByLabelText(/confirm password/i)
      const termsCheckbox = screen.getByLabelText(/terms of service/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'weak')
      await user.type(confirmInput, 'weak')
      await user.click(termsCheckbox)
      await user.click(submitButton)

      await waitFor(() => {
        const alert = screen.getByRole('alert')
        expect(alert).toBeInTheDocument()
      })
    })

    it('should validate password confirmation', async () => {
      const user = userEvent.setup()

      render(
        <AuthWrapper>
          <AuthForms initialForm="register" />
        </AuthWrapper>
      )

      const emailInput = screen.getByLabelText(/^email$/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmInput = screen.getByLabelText(/confirm password/i)
      const termsCheckbox = screen.getByLabelText(/terms of service/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'SecurePass123')
      await user.type(confirmInput, 'DifferentPass456')
      await user.click(termsCheckbox)
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/passwords do not match/i)
      })
    })

    it('should require terms acceptance', async () => {
      const user = userEvent.setup()

      render(
        <AuthWrapper>
          <AuthForms initialForm="register" />
        </AuthWrapper>
      )

      const emailInput = screen.getByLabelText(/^email$/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'SecurePass123')
      await user.type(confirmInput, 'SecurePass123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/terms of service/i)
      })
    })

    it('should successfully register with valid data', async () => {
      const onSuccess = vi.fn()
      const user = userEvent.setup()

      render(
        <AuthWrapper>
          <AuthForms initialForm="register" onSuccess={onSuccess} />
        </AuthWrapper>
      )

      const emailInput = screen.getByLabelText(/^email$/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmInput = screen.getByLabelText(/confirm password/i)
      const termsCheckbox = screen.getByLabelText(/terms of service/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'newuser@example.com')
      await user.type(passwordInput, 'SecurePass123')
      await user.type(confirmInput, 'SecurePass123')
      await user.click(termsCheckbox)
      await user.click(submitButton)

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled()
      })
    })
  })

  describe('Password Reset', () => {
    it('should switch to password reset form', async () => {
      const user = userEvent.setup()

      render(
        <AuthWrapper>
          <AuthForms />
        </AuthWrapper>
      )

      const forgotLink = screen.getByText(/forgot password/i)
      await user.click(forgotLink)

      expect(screen.getByText(/reset password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument()
    })

    it('should validate email for password reset', async () => {
      const user = userEvent.setup()

      render(
        <AuthWrapper>
          <AuthForms />
        </AuthWrapper>
      )

      // Go to reset form
      await user.click(screen.getByText(/forgot password/i))

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      await user.type(emailInput, 'invalid')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/valid email/i)
      })
    })

    it('should show success message on password reset', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const user = userEvent.setup()

      render(
        <AuthWrapper>
          <AuthForms />
        </AuthWrapper>
      )

      // Go to reset form
      await user.click(screen.getByText(/forgot password/i))

      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/reset email sent/i)
      })

      consoleSpy.mockRestore()
    })

    it('should have back to login link', async () => {
      const user = userEvent.setup()

      render(
        <AuthWrapper>
          <AuthForms />
        </AuthWrapper>
      )

      await user.click(screen.getByText(/forgot password/i))

      const backLink = screen.getByText(/back to sign in/i)
      expect(backLink).toBeInTheDocument()

      await user.click(backLink)

      // Should be back on login form - check for submit button in form
      const form = document.querySelector('form')
      expect(form?.querySelector('button[type="submit"]')).toBeInTheDocument()
    })
  })

  describe('OAuth', () => {
    it('should call signInWithOAuth when Google button clicked', async () => {
      const onSuccess = vi.fn()
      const user = userEvent.setup()

      render(
        <AuthWrapper>
          <AuthForms onSuccess={onSuccess} />
        </AuthWrapper>
      )

      const googleButton = screen.getByRole('button', { name: /google/i })
      await user.click(googleButton)

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled()
      })
    })

    it('should call signInWithOAuth when GitHub button clicked', async () => {
      const onSuccess = vi.fn()
      const user = userEvent.setup()

      render(
        <AuthWrapper>
          <AuthForms onSuccess={onSuccess} />
        </AuthWrapper>
      )

      const githubButton = screen.getByRole('button', { name: /github/i })
      await user.click(githubButton)

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled()
      })
    })
  })
})

describe('LoginForm component', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('should render as login form only', () => {
    render(
      <AuthWrapper>
        <LoginForm />
      </AuthWrapper>
    )

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })
})

describe('RegisterForm component', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('should render as register form by default', () => {
    render(
      <AuthWrapper>
        <RegisterForm />
      </AuthWrapper>
    )

    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
  })
})

describe('Form accessibility', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('should have proper labels for all inputs', () => {
    render(
      <AuthWrapper>
        <AuthForms />
      </AuthWrapper>
    )

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)

    expect(emailInput).toHaveAttribute('id', 'login-email')
    expect(passwordInput).toHaveAttribute('id', 'login-password')
  })

  it('should have proper autocomplete attributes', () => {
    render(
      <AuthWrapper>
        <AuthForms />
      </AuthWrapper>
    )

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)

    expect(emailInput).toHaveAttribute('autocomplete', 'email')
    expect(passwordInput).toHaveAttribute('autocomplete', 'current-password')
  })

  it('should use role="alert" for error messages', async () => {
    const user = userEvent.setup()

    render(
      <AuthWrapper>
        <AuthForms />
      </AuthWrapper>
    )

    // Fill in invalid email to trigger validation error
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    await user.type(emailInput, 'invalid')
    await user.type(passwordInput, 'somepassword')

    // Use type="submit" to get the form submit button, not the tab
    const form = document.querySelector('form')
    const submitButton = form?.querySelector('button[type="submit"]') as HTMLElement
    await user.click(submitButton)

    await waitFor(() => {
      const alert = screen.getByRole('alert')
      expect(alert).toBeInTheDocument()
    })
  })
})

describe('Form state management', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('should clear errors when switching forms', async () => {
    const user = userEvent.setup()

    render(
      <AuthWrapper>
        <AuthForms />
      </AuthWrapper>
    )

    // Fill in invalid data to trigger validation error
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    await user.type(emailInput, 'invalid')
    await user.type(passwordInput, 'somepassword')

    // Trigger an error - use form's submit button
    const form = document.querySelector('form')
    const submitButton = form?.querySelector('button[type="submit"]') as HTMLElement
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    // Switch to register form
    const registerTab = screen.getByRole('tab', { name: 'Register' })
    await user.click(registerTab)

    // Error should be cleared
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('should clear errors when user types', async () => {
    const user = userEvent.setup()

    render(
      <AuthWrapper>
        <AuthForms />
      </AuthWrapper>
    )

    // Fill in invalid data to trigger validation error
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    await user.type(emailInput, 'invalid')
    await user.type(passwordInput, 'somepassword')

    // Trigger an error - use form's submit button
    const form = document.querySelector('form')
    const submitButton = form?.querySelector('button[type="submit"]') as HTMLElement
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    // Clear email and start typing again - error should be cleared
    await user.clear(emailInput)
    await user.type(emailInput, 't')

    // Error should be cleared
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
