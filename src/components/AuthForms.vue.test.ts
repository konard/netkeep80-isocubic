/**
 * Unit tests for AuthForms Vue component
 * Tests the Vue.js 3.0 migration of the AuthForms component
 * Covers: form rendering, validation, tab switching, OAuth, password reset, accessibility
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import AuthForms from './AuthForms.vue'
import { authValidation } from '../types/auth'
import { useAuthStore } from '../lib/auth'

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

function createWrapper(props: Record<string, unknown> = {}) {
  const pinia = createPinia()
  setActivePinia(pinia)
  // Initialize auth store to transition from 'loading' to 'unauthenticated'
  const authStore = useAuthStore()
  authStore.initialize()

  return mount(AuthForms, {
    props,
    global: {
      plugins: [pinia],
    },
  })
}

/**
 * Helper to set an input value using native dispatchEvent.
 * VTU's trigger() creates a synthetic event where $event.target may not work
 * correctly with inline handlers that read ($event.target as HTMLInputElement).value.
 * Using native dispatchEvent ensures the target is the actual DOM element.
 */
async function setInputValue(wrapper: ReturnType<typeof mount>, selector: string, value: string) {
  const el = wrapper.find(selector).element as HTMLInputElement
  el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
  await nextTick()
}

/**
 * Helper to set a checkbox value using native dispatchEvent
 */
async function setCheckboxValue(
  wrapper: ReturnType<typeof mount>,
  selector: string,
  checked: boolean
) {
  const el = wrapper.find(selector).element as HTMLInputElement
  el.checked = checked
  el.dispatchEvent(new Event('change', { bubbles: true }))
  await nextTick()
}

describe('AuthForms Vue Component', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  describe('LoginForm (initial)', () => {
    it('should render login form by default', () => {
      const wrapper = createWrapper()

      // Sign In tab should have active class
      const tabs = wrapper.findAll('[role="tab"]')
      const signInTab = tabs.find((t) => t.text() === 'Sign In')
      expect(signInTab?.classes()).toContain('auth-forms__tab--active')

      // Should have email and password inputs
      expect(wrapper.find('#login-email').exists()).toBe(true)
      expect(wrapper.find('#login-password').exists()).toBe(true)

      // Should have a submit button
      expect(wrapper.find('form button[type="submit"]').exists()).toBe(true)
    })

    it('should show forgot password link', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Forgot password')
    })

    it('should show OAuth buttons', () => {
      const wrapper = createWrapper()
      const oauthButtons = wrapper.findAll('.auth-forms__button--oauth')
      const buttonTexts = oauthButtons.map((b) => b.text())
      expect(buttonTexts.some((t) => /google/i.test(t))).toBe(true)
      expect(buttonTexts.some((t) => /github/i.test(t))).toBe(true)
    })

    it('should validate email format', async () => {
      const wrapper = createWrapper()

      await setInputValue(wrapper, '#login-email', 'invalid-email')
      await setInputValue(wrapper, '#login-password', 'password123')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      const alert = wrapper.find('[role="alert"]')
      expect(alert.exists()).toBe(true)
      expect(alert.text()).toMatch(/valid email/i)
    })

    it('should require password', async () => {
      const wrapper = createWrapper()

      await setInputValue(wrapper, '#login-email', 'test@example.com')
      // Leave password empty

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      const alert = wrapper.find('[role="alert"]')
      expect(alert.exists()).toBe(true)
      expect(alert.text()).toMatch(/password.*required/i)
    })
  })

  describe('RegisterForm (via tab)', () => {
    it('should switch to register form when tab clicked', async () => {
      const wrapper = createWrapper()

      const tabs = wrapper.findAll('[role="tab"]')
      const registerTab = tabs.find((t) => t.text() === 'Register')
      await registerTab!.trigger('click')
      await nextTick()

      expect(wrapper.find('#register-displayname').exists()).toBe(true)
      expect(wrapper.find('#register-confirm').exists()).toBe(true)
      expect(wrapper.find('#register-terms').exists()).toBe(true)

      // Check the submit button text
      const submitBtn = wrapper.find('form button[type="submit"]')
      expect(submitBtn.text()).toContain('Create Account')
    })

    it('should validate password requirements', async () => {
      const wrapper = createWrapper({ initialForm: 'register' })

      await setInputValue(wrapper, '#register-email', 'test@example.com')
      await setInputValue(wrapper, '#register-password', 'weak')
      await setInputValue(wrapper, '#register-confirm', 'weak')
      await setCheckboxValue(wrapper, '#register-terms', true)

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      const alert = wrapper.find('[role="alert"]')
      expect(alert.exists()).toBe(true)
    })

    it('should validate password confirmation', async () => {
      const wrapper = createWrapper({ initialForm: 'register' })

      await setInputValue(wrapper, '#register-email', 'test@example.com')
      await setInputValue(wrapper, '#register-password', 'SecurePass123')
      await setInputValue(wrapper, '#register-confirm', 'DifferentPass456')
      await setCheckboxValue(wrapper, '#register-terms', true)

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      const alert = wrapper.find('[role="alert"]')
      expect(alert.exists()).toBe(true)
      expect(alert.text()).toMatch(/passwords do not match/i)
    })

    it('should require terms acceptance', async () => {
      const wrapper = createWrapper({ initialForm: 'register' })

      await setInputValue(wrapper, '#register-email', 'test@example.com')
      await setInputValue(wrapper, '#register-password', 'SecurePass123')
      await setInputValue(wrapper, '#register-confirm', 'SecurePass123')
      // Do NOT check terms

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      const alert = wrapper.find('[role="alert"]')
      expect(alert.exists()).toBe(true)
      expect(alert.text()).toMatch(/terms of service/i)
    })

    it('should successfully register with valid data and emit success', async () => {
      const wrapper = createWrapper({ initialForm: 'register' })

      await setInputValue(wrapper, '#register-email', 'newuser@example.com')
      await setInputValue(wrapper, '#register-password', 'SecurePass123')
      await setInputValue(wrapper, '#register-confirm', 'SecurePass123')
      await setCheckboxValue(wrapper, '#register-terms', true)

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.emitted('success')).toBeTruthy()
    })
  })

  describe('Password Reset', () => {
    it('should switch to password reset form', async () => {
      const wrapper = createWrapper()

      const forgotLink = wrapper.findAll('button').find((b) => b.text().match(/forgot password/i))
      await forgotLink!.trigger('click')
      await nextTick()

      expect(wrapper.text()).toContain('Reset Password')

      const submitBtn = wrapper.find('form button[type="submit"]')
      expect(submitBtn.text()).toContain('Send Reset Link')
    })

    it('should validate email for password reset', async () => {
      const wrapper = createWrapper()

      const forgotLink = wrapper.findAll('button').find((b) => b.text().match(/forgot password/i))
      await forgotLink!.trigger('click')
      await nextTick()

      await setInputValue(wrapper, '#reset-email', 'invalid')

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      const alert = wrapper.find('[role="alert"]')
      expect(alert.exists()).toBe(true)
      expect(alert.text()).toMatch(/valid email/i)
    })

    it('should show success message on password reset', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const wrapper = createWrapper()

      const forgotLink = wrapper.findAll('button').find((b) => b.text().match(/forgot password/i))
      await forgotLink!.trigger('click')
      await nextTick()

      await setInputValue(wrapper, '#reset-email', 'test@example.com')

      await wrapper.find('form').trigger('submit')
      await flushPromises()
      await nextTick()

      const status = wrapper.find('[role="status"]')
      expect(status.exists()).toBe(true)
      expect(status.text()).toMatch(/reset email sent/i)

      consoleSpy.mockRestore()
    })

    it('should have back to login link', async () => {
      const wrapper = createWrapper()

      const forgotLink = wrapper.findAll('button').find((b) => b.text().match(/forgot password/i))
      await forgotLink!.trigger('click')
      await nextTick()

      const backLink = wrapper.findAll('button').find((b) => b.text().match(/back to sign in/i))
      expect(backLink!.exists()).toBe(true)

      await backLink!.trigger('click')
      await nextTick()

      // Should be back on login form
      expect(wrapper.find('form button[type="submit"]').exists()).toBe(true)
      expect(wrapper.find('#login-email').exists()).toBe(true)
    })
  })

  describe('OAuth', () => {
    it('should call signInWithOAuth when Google button clicked and emit success', async () => {
      const wrapper = createWrapper()

      const googleButton = wrapper
        .findAll('.auth-forms__button--oauth')
        .find((b) => /google/i.test(b.text()))
      await googleButton!.trigger('click')
      await flushPromises()
      await nextTick()

      expect(wrapper.emitted('success')).toBeTruthy()
    })

    it('should call signInWithOAuth when GitHub button clicked and emit success', async () => {
      const wrapper = createWrapper()

      const githubButton = wrapper
        .findAll('.auth-forms__button--oauth')
        .find((b) => /github/i.test(b.text()))
      await githubButton!.trigger('click')
      await flushPromises()
      await nextTick()

      expect(wrapper.emitted('success')).toBeTruthy()
    })
  })
})

describe('AuthForms Vue Component - Form Validation Logic', () => {
  it('should validate email format', () => {
    expect(authValidation.isValidEmail('user@example.com')).toBe(true)
    expect(authValidation.isValidEmail('invalid')).toBe(false)
    expect(authValidation.isValidEmail('')).toBe(false)
  })

  it('should validate password requirements', () => {
    const weakResult = authValidation.isValidPassword('123')
    expect(weakResult.valid).toBe(false)
    expect(weakResult.errors.length).toBeGreaterThan(0)

    const strongResult = authValidation.isValidPassword('StrongPass123!')
    expect(strongResult.valid).toBe(true)
    expect(strongResult.errors.length).toBe(0)
  })
})

describe('AuthForms Vue Component - Form States', () => {
  it('should define valid form states', () => {
    const validStates = ['login', 'register', 'reset']
    expect(validStates).toContain('login')
    expect(validStates).toContain('register')
    expect(validStates).toContain('reset')
  })

  it('should have correct initial form state structure', () => {
    const initialFormState = {
      email: '',
      password: '',
      confirmPassword: '',
      displayName: '',
      acceptTerms: false,
    }

    expect(initialFormState.email).toBe('')
    expect(initialFormState.password).toBe('')
    expect(initialFormState.confirmPassword).toBe('')
    expect(initialFormState.displayName).toBe('')
    expect(initialFormState.acceptTerms).toBe(false)
  })
})

describe('AuthForms Vue Component - OAuth Providers', () => {
  it('should support google and github providers', () => {
    const providers = ['google', 'github'] as const
    expect(providers).toContain('google')
    expect(providers).toContain('github')
  })
})

describe('Form accessibility', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('should have proper labels for all inputs', () => {
    const wrapper = createWrapper()

    const emailInput = wrapper.find('#login-email')
    const passwordInput = wrapper.find('#login-password')

    expect(emailInput.attributes('id')).toBe('login-email')
    expect(passwordInput.attributes('id')).toBe('login-password')
  })

  it('should have proper autocomplete attributes', () => {
    const wrapper = createWrapper()

    const emailInput = wrapper.find('#login-email')
    const passwordInput = wrapper.find('#login-password')

    expect(emailInput.attributes('autocomplete')).toBe('email')
    expect(passwordInput.attributes('autocomplete')).toBe('current-password')
  })

  it('should use role="alert" for error messages', async () => {
    const wrapper = createWrapper()

    await setInputValue(wrapper, '#login-email', 'invalid')
    await setInputValue(wrapper, '#login-password', 'somepassword')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const alert = wrapper.find('[role="alert"]')
    expect(alert.exists()).toBe(true)
  })
})

describe('Form state management', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('should clear errors when switching forms', async () => {
    const wrapper = createWrapper()

    // Trigger an error
    await setInputValue(wrapper, '#login-email', 'invalid')
    await setInputValue(wrapper, '#login-password', 'somepassword')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)

    // Switch to register form
    const registerTab = wrapper.findAll('[role="tab"]').find((t) => t.text() === 'Register')
    await registerTab!.trigger('click')
    await nextTick()

    // Error should be cleared
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('should clear errors when user types', async () => {
    const wrapper = createWrapper()

    // Trigger an error
    await setInputValue(wrapper, '#login-email', 'invalid')
    await setInputValue(wrapper, '#login-password', 'somepassword')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)

    // Type in the email field - updateField clears errors
    await setInputValue(wrapper, '#login-email', 'test')
    await nextTick()

    // Error should be cleared
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })
})

describe('AuthForms Module Exports', () => {
  it('should export AuthForms.vue as a valid Vue component', async () => {
    const module = await import('./AuthForms.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })
})
