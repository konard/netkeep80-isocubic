<!--
  Authentication form components (Vue 3 SFC)
  Provides LoginForm and RegisterForm UI components for user authentication

  Migrated from AuthForms.tsx to Vue 3.0 SFC
-->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuth } from '../lib/auth'
import type { OAuthProvider } from '../types/auth'
import { authValidation } from '../types/auth'

// ============================================================================
// Types
// ============================================================================

interface FormState {
  email: string
  password: string
  confirmPassword: string
  displayName: string
  acceptTerms: boolean
}

// ============================================================================
// Props & Emits
// ============================================================================

const props = withDefaults(
  defineProps<{
    /** Initial form to display */
    initialForm?: 'login' | 'register'
    /** Custom class name */
    class?: string
  }>(),
  {
    initialForm: 'login',
    class: '',
  }
)

const emit = defineEmits<{
  (e: 'success'): void
}>()

// ============================================================================
// State
// ============================================================================

const { signIn, signUp, signInWithOAuth, resetPassword, state } = useAuth()

const activeForm = ref<'login' | 'register' | 'reset'>(props.initialForm)
const formState = ref<FormState>({
  email: '',
  password: '',
  confirmPassword: '',
  displayName: '',
  acceptTerms: false,
})
const errors = ref<string[]>([])
const successMessage = ref<string | null>(null)

const isLoading = computed(() => state.status === 'loading')

// ============================================================================
// Methods
// ============================================================================

/** Update form field */
function updateField(field: keyof FormState, value: string | boolean) {
  ;(formState.value as Record<string, string | boolean>)[field] = value
  // Clear errors when user starts typing
  if (errors.value.length > 0) {
    errors.value = []
  }
}

/** Handle login form submission */
async function handleLogin(e: Event) {
  e.preventDefault()
  errors.value = []
  successMessage.value = null

  if (!authValidation.isValidEmail(formState.value.email)) {
    errors.value = ['Please enter a valid email address']
    return
  }

  if (!formState.value.password) {
    errors.value = ['Password is required']
    return
  }

  const result = await signIn({
    email: formState.value.email,
    password: formState.value.password,
  })

  if (result.success) {
    emit('success')
  } else {
    errors.value = [result.error || 'Login failed']
  }
}

/** Handle register form submission */
async function handleRegister(e: Event) {
  e.preventDefault()
  errors.value = []
  successMessage.value = null

  // Validate email
  if (!authValidation.isValidEmail(formState.value.email)) {
    errors.value = ['Please enter a valid email address']
    return
  }

  // Validate password
  const passwordValidation = authValidation.isValidPassword(formState.value.password)
  if (!passwordValidation.valid) {
    errors.value = passwordValidation.errors
    return
  }

  // Check password confirmation
  if (formState.value.password !== formState.value.confirmPassword) {
    errors.value = ['Passwords do not match']
    return
  }

  // Check terms acceptance
  if (!formState.value.acceptTerms) {
    errors.value = ['You must accept the terms of service']
    return
  }

  const result = await signUp({
    email: formState.value.email,
    password: formState.value.password,
    displayName: formState.value.displayName || undefined,
    acceptTerms: formState.value.acceptTerms,
  })

  if (result.success) {
    emit('success')
  } else {
    errors.value = [result.error || 'Registration failed']
  }
}

/** Handle password reset */
async function handleResetPassword(e: Event) {
  e.preventDefault()
  errors.value = []
  successMessage.value = null

  if (!authValidation.isValidEmail(formState.value.email)) {
    errors.value = ['Please enter a valid email address']
    return
  }

  const result = await resetPassword(formState.value.email)

  if (result.success) {
    successMessage.value = 'Password reset email sent. Check your inbox.'
    activeForm.value = 'login'
  } else {
    errors.value = [result.error || 'Password reset failed']
  }
}

/** Handle OAuth login */
async function handleOAuth(provider: OAuthProvider) {
  errors.value = []
  successMessage.value = null

  const result = await signInWithOAuth(provider)

  if (result.success) {
    emit('success')
  } else {
    errors.value = [result.error || `${provider} login failed`]
  }
}

/** Switch between forms */
function switchToForm(form: 'login' | 'register' | 'reset') {
  activeForm.value = form
  errors.value = []
  successMessage.value = null
}
</script>

<template>
  <div :class="['auth-forms', props.class]">
    <!-- Form tabs -->
    <div v-if="activeForm !== 'reset'" class="auth-forms__tabs" role="tablist">
      <button
        type="button"
        role="tab"
        :aria-selected="activeForm === 'login'"
        :class="['auth-forms__tab', { 'auth-forms__tab--active': activeForm === 'login' }]"
        @click="switchToForm('login')"
      >
        Sign In
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="activeForm === 'register'"
        :class="['auth-forms__tab', { 'auth-forms__tab--active': activeForm === 'register' }]"
        @click="switchToForm('register')"
      >
        Register
      </button>
    </div>

    <!-- Success message -->
    <div
      v-if="successMessage"
      class="auth-forms__message auth-forms__message--success"
      role="status"
    >
      {{ successMessage }}
    </div>

    <!-- Error messages -->
    <div
      v-if="errors.length > 0"
      class="auth-forms__message auth-forms__message--error"
      role="alert"
    >
      <p v-for="(error, index) in errors" :key="index">{{ error }}</p>
    </div>

    <!-- Login form -->
    <form v-if="activeForm === 'login'" class="auth-forms__form" novalidate @submit="handleLogin">
      <div class="auth-forms__field">
        <label for="login-email" class="auth-forms__label"> Email </label>
        <input
          id="login-email"
          type="email"
          :value="formState.email"
          class="auth-forms__input"
          placeholder="you@example.com"
          autocomplete="email"
          required
          :disabled="isLoading"
          @input="updateField('email', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <div class="auth-forms__field">
        <label for="login-password" class="auth-forms__label"> Password </label>
        <input
          id="login-password"
          type="password"
          :value="formState.password"
          class="auth-forms__input"
          placeholder="Enter your password"
          autocomplete="current-password"
          required
          :disabled="isLoading"
          @input="updateField('password', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <button
        type="submit"
        class="auth-forms__button auth-forms__button--primary"
        :disabled="isLoading"
      >
        {{ isLoading ? 'Signing in...' : 'Sign In' }}
      </button>

      <button type="button" class="auth-forms__link" @click="switchToForm('reset')">
        Forgot password?
      </button>
    </form>

    <!-- Register form -->
    <form
      v-if="activeForm === 'register'"
      class="auth-forms__form"
      novalidate
      @submit="handleRegister"
    >
      <div class="auth-forms__field">
        <label for="register-displayname" class="auth-forms__label">
          Display Name (optional)
        </label>
        <input
          id="register-displayname"
          type="text"
          :value="formState.displayName"
          class="auth-forms__input"
          placeholder="Your name"
          autocomplete="name"
          :disabled="isLoading"
          @input="updateField('displayName', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <div class="auth-forms__field">
        <label for="register-email" class="auth-forms__label"> Email </label>
        <input
          id="register-email"
          type="email"
          :value="formState.email"
          class="auth-forms__input"
          placeholder="you@example.com"
          autocomplete="email"
          required
          :disabled="isLoading"
          @input="updateField('email', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <div class="auth-forms__field">
        <label for="register-password" class="auth-forms__label"> Password </label>
        <input
          id="register-password"
          type="password"
          :value="formState.password"
          class="auth-forms__input"
          placeholder="Min 8 chars, letter & number"
          autocomplete="new-password"
          required
          :disabled="isLoading"
          @input="updateField('password', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <div class="auth-forms__field">
        <label for="register-confirm" class="auth-forms__label"> Confirm Password </label>
        <input
          id="register-confirm"
          type="password"
          :value="formState.confirmPassword"
          class="auth-forms__input"
          placeholder="Confirm your password"
          autocomplete="new-password"
          required
          :disabled="isLoading"
          @input="updateField('confirmPassword', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <div class="auth-forms__checkbox">
        <input
          id="register-terms"
          type="checkbox"
          :checked="formState.acceptTerms"
          class="auth-forms__checkbox-input"
          required
          :disabled="isLoading"
          @change="updateField('acceptTerms', ($event.target as HTMLInputElement).checked)"
        />
        <label for="register-terms" class="auth-forms__checkbox-label">
          I accept the Terms of Service
        </label>
      </div>

      <button
        type="submit"
        class="auth-forms__button auth-forms__button--primary"
        :disabled="isLoading"
      >
        {{ isLoading ? 'Creating account...' : 'Create Account' }}
      </button>
    </form>

    <!-- Password reset form -->
    <form
      v-if="activeForm === 'reset'"
      class="auth-forms__form"
      novalidate
      @submit="handleResetPassword"
    >
      <h3 class="auth-forms__title">Reset Password</h3>
      <p class="auth-forms__description">
        Enter your email address and we'll send you a link to reset your password.
      </p>

      <div class="auth-forms__field">
        <label for="reset-email" class="auth-forms__label"> Email </label>
        <input
          id="reset-email"
          type="email"
          :value="formState.email"
          class="auth-forms__input"
          placeholder="you@example.com"
          autocomplete="email"
          required
          :disabled="isLoading"
          @input="updateField('email', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <button
        type="submit"
        class="auth-forms__button auth-forms__button--primary"
        :disabled="isLoading"
      >
        {{ isLoading ? 'Sending...' : 'Send Reset Link' }}
      </button>

      <button type="button" class="auth-forms__link" @click="switchToForm('login')">
        Back to Sign In
      </button>
    </form>

    <!-- OAuth buttons -->
    <div v-if="activeForm !== 'reset'" class="auth-forms__oauth">
      <div class="auth-forms__divider">
        <span>or continue with</span>
      </div>

      <div class="auth-forms__oauth-buttons">
        <button
          type="button"
          class="auth-forms__button auth-forms__button--oauth"
          :disabled="isLoading"
          @click="handleOAuth('google')"
        >
          <span class="auth-forms__oauth-icon">G</span>
          Google
        </button>
        <button
          type="button"
          class="auth-forms__button auth-forms__button--oauth"
          :disabled="isLoading"
          @click="handleOAuth('github')"
        >
          <span class="auth-forms__oauth-icon">GH</span>
          GitHub
        </button>
      </div>
    </div>
  </div>
</template>
