<!--
  GitHub Auth Button Component (Vue 3 SFC)
  Provides GitHub authentication UI for GOD MODE.
  Supports Personal Access Token (PAT) entry and OAuth Device Flow.

  Migrated from GitHubAuthButton.tsx to Vue 3.0 SFC

  TASK 57: GitHub Integration (Phase 9 - GOD MODE)

  Features:
  - PAT token input with validation
  - OAuth Device Flow with user code display
  - Auth state display (user avatar, name)
  - Sign out functionality
  - Multi-language support (Russian/English)
-->
<script setup lang="ts">
import { ref, shallowRef, computed, onMounted } from 'vue'
import type { CSSProperties } from 'vue'
import type { QueryLanguage } from '../types/ai-query'
import {
  createGitHubClient,
  type GitHubApiClient,
  type GitHubAuthState,
  type DeviceCodeResponse,
} from '../lib/github-api'

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontSize: '13px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#e5e7eb',
  },
  authRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  avatar: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: '1px solid rgba(139, 92, 246, 0.3)',
  },
  userName: {
    fontSize: '12px',
    color: '#c4b5fd',
    fontWeight: 500,
  },
  button: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    color: '#c4b5fd',
    cursor: 'pointer',
    fontSize: '12px',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
  },
  buttonHover: {
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  buttonDanger: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#fca5a5',
  },
  buttonSuccess: {
    borderColor: 'rgba(34, 197, 94, 0.3)',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    color: '#86efac',
  },
  input: {
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    color: '#e5e7eb',
    fontSize: '12px',
    fontFamily: 'monospace',
    outline: 'none',
    flex: 1,
    minWidth: '0',
  },
  inputFocused: {
    borderColor: 'rgba(139, 92, 246, 0.6)',
    boxShadow: '0 0 0 2px rgba(139, 92, 246, 0.1)',
  },
  error: {
    color: '#fca5a5',
    fontSize: '11px',
    padding: '4px 0',
  },
  deviceFlow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
  },
  userCode: {
    fontSize: '18px',
    fontWeight: 700,
    fontFamily: 'monospace',
    color: '#c4b5fd',
    textAlign: 'center',
    letterSpacing: '2px',
    padding: '8px',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: '6px',
  },
  hint: {
    fontSize: '11px',
    color: '#9ca3af',
  },
  link: {
    color: '#818cf8',
    textDecoration: 'underline',
    cursor: 'pointer',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'inline-block',
  },
  statusConnected: {
    backgroundColor: '#22c55e',
    boxShadow: '0 0 4px rgba(34, 197, 94, 0.5)',
  },
  statusDisconnected: {
    backgroundColor: '#6b7280',
  },
  loading: {
    display: 'inline-block',
    width: '12px',
    height: '12px',
    border: '2px solid rgba(139, 92, 246, 0.3)',
    borderTopColor: '#c4b5fd',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
}

// ============================================================================
// Labels
// ============================================================================

const labels = {
  ru: {
    signIn: 'Войти в GitHub',
    signOut: 'Выйти',
    enterToken: 'Введите GitHub PAT',
    tokenPlaceholder: 'ghp_xxxxxxxxxxxx',
    connect: 'Подключить',
    cancel: 'Отмена',
    connected: 'Подключено',
    disconnected: 'Не подключено',
    authenticating: 'Авторизация...',
    authFailed: 'Ошибка авторизации',
    deviceFlowTitle: 'Авторизация через GitHub',
    deviceFlowInstructions: 'Откройте ссылку и введите код:',
    deviceFlowWaiting: 'Ожидание авторизации...',
    openGitHub: 'Открыть GitHub',
    useToken: 'Использовать токен',
    useOAuth: 'Использовать OAuth',
  },
  en: {
    signIn: 'Sign in to GitHub',
    signOut: 'Sign out',
    enterToken: 'Enter GitHub PAT',
    tokenPlaceholder: 'ghp_xxxxxxxxxxxx',
    connect: 'Connect',
    cancel: 'Cancel',
    connected: 'Connected',
    disconnected: 'Not connected',
    authenticating: 'Authenticating...',
    authFailed: 'Authentication failed',
    deviceFlowTitle: 'GitHub Authorization',
    deviceFlowInstructions: 'Open the link and enter the code:',
    deviceFlowWaiting: 'Waiting for authorization...',
    openGitHub: 'Open GitHub',
    useToken: 'Use token',
    useOAuth: 'Use OAuth',
  },
}

// ============================================================================
// Types
// ============================================================================

type AuthView = 'status' | 'pat-input' | 'device-flow'

// ============================================================================
// Props & Emits
// ============================================================================

const props = withDefaults(
  defineProps<{
    /** Language for UI text */
    language?: QueryLanguage
    /** Custom styles */
    style?: CSSProperties
    /** Custom class name */
    class?: string
    /** GitHub API client instance (optional, creates default if not provided) */
    client?: GitHubApiClient
    /** Repository owner */
    owner?: string
    /** Repository name */
    repo?: string
    /** OAuth Client ID (enables Device Flow) */
    oauthClientId?: string
    /** Compact mode (just show status icon) */
    compact?: boolean
  }>(),
  {
    language: 'ru',
    style: () => ({}),
    class: '',
    client: undefined,
    owner: undefined,
    repo: undefined,
    oauthClientId: undefined,
    compact: false,
  }
)

const emit = defineEmits<{
  (e: 'authStateChange', state: GitHubAuthState): void
}>()

// ============================================================================
// State
// ============================================================================

const client = shallowRef<GitHubApiClient>(
  props.client ||
    createGitHubClient({
      owner: props.owner,
      repo: props.repo,
      oauthClientId: props.oauthClientId,
    })
)
const authState = ref<GitHubAuthState>({ authenticated: false })
const view = ref<AuthView>('status')
const tokenInput = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const deviceCode = ref<DeviceCodeResponse | null>(null)
const hoveredButton = ref<string | null>(null)

// ============================================================================
// Computed
// ============================================================================

const t = computed(() => labels[props.language] || labels.ru)

// ============================================================================
// Methods
// ============================================================================

/** Button style helper */
function getButtonStyle(base: string, extraStyle?: CSSProperties): CSSProperties {
  return {
    ...styles.button,
    ...(extraStyle || {}),
    ...(hoveredButton.value === base ? styles.buttonHover : {}),
  }
}

/** Handle PAT authentication */
async function handlePATAuth() {
  if (!tokenInput.value.trim()) return

  loading.value = true
  error.value = null

  const state = await client.value.authenticateWithPAT(tokenInput.value.trim())
  authState.value = state
  loading.value = false

  if (state.authenticated) {
    view.value = 'status'
    tokenInput.value = ''
    emit('authStateChange', state)
  } else {
    error.value = state.error || t.value.authFailed
  }
}

/** Handle OAuth Device Flow initiation */
async function handleDeviceFlowStart() {
  loading.value = true
  error.value = null

  try {
    const dc = await client.value.initiateDeviceFlow()
    deviceCode.value = dc
    view.value = 'device-flow'
    loading.value = false

    // Start polling
    let pollInterval = dc.interval
    const startTime = Date.now()
    const maxTime = dc.expiresIn * 1000

    const poll = async () => {
      if (Date.now() - startTime > maxTime) {
        error.value = 'Authorization timed out'
        view.value = 'status'
        deviceCode.value = null
        return
      }

      const result = await client.value.pollDeviceToken(dc.deviceCode, pollInterval)

      if (result.authenticated) {
        authState.value = result
        view.value = 'status'
        deviceCode.value = null
        emit('authStateChange', result)
        return
      }

      if (result.error?.startsWith('slow_down:')) {
        pollInterval = parseInt(result.error.split(':')[1], 10)
      } else if (result.error !== 'authorization_pending') {
        error.value = result.error || t.value.authFailed
        view.value = 'status'
        deviceCode.value = null
        return
      }

      setTimeout(poll, pollInterval * 1000)
    }

    setTimeout(poll, pollInterval * 1000)
  } catch (err) {
    error.value = err instanceof Error ? err.message : t.value.authFailed
    loading.value = false
  }
}

/** Handle sign out */
function handleSignOut() {
  client.value.signOut()
  const state: GitHubAuthState = { authenticated: false }
  authState.value = state
  view.value = 'status'
  emit('authStateChange', state)
}

/** Handle PAT input key events */
function handlePatKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter') handlePATAuth()
  if (e.key === 'Escape') view.value = 'status'
}

/** Cancel PAT input */
function handlePatCancel() {
  view.value = 'status'
  error.value = null
  tokenInput.value = ''
}

/** Cancel device flow */
function handleDeviceFlowCancel() {
  view.value = 'status'
  deviceCode.value = null
  error.value = null
}

/** Open PAT input view */
function handleUseToken() {
  view.value = 'pat-input'
  error.value = null
}

// ============================================================================
// Lifecycle
// ============================================================================

onMounted(async () => {
  const state = await client.value.getAuthState()
  authState.value = state
  emit('authStateChange', state)
})
</script>

<template>
  <!-- Compact mode: just show a status indicator -->
  <div
    v-if="compact"
    :style="{ ...styles.authRow, ...props.style }"
    :class="props.class"
    data-testid="github-auth-compact"
  >
    <span
      :style="{
        ...styles.statusDot,
        ...(authState.authenticated ? styles.statusConnected : styles.statusDisconnected),
      }"
      :title="
        authState.authenticated ? `${t.connected}: ${authState.user?.login || ''}` : t.disconnected
      "
    />
    <span v-if="authState.authenticated && authState.user" :style="styles.userName">
      {{ authState.user.login }}
    </span>
  </div>

  <!-- PAT input view -->
  <div
    v-else-if="view === 'pat-input'"
    :style="{ ...styles.container, ...props.style }"
    :class="props.class"
    data-testid="github-auth-pat"
  >
    <div :style="{ fontSize: '12px', fontWeight: 500, color: '#c4b5fd' }">
      {{ t.enterToken }}
    </div>
    <div :style="styles.authRow">
      <input
        type="password"
        :value="tokenInput"
        :placeholder="t.tokenPlaceholder"
        :style="styles.input"
        data-testid="pat-input"
        :disabled="loading"
        @input="tokenInput = ($event.target as HTMLInputElement).value"
        @keydown="handlePatKeyDown"
      />
      <button
        :style="getButtonStyle('connect', styles.buttonSuccess)"
        :disabled="loading || !tokenInput.trim()"
        data-testid="pat-connect-button"
        @click="handlePATAuth"
        @mouseenter="hoveredButton = 'connect'"
        @mouseleave="hoveredButton = null"
      >
        {{ loading ? t.authenticating : t.connect }}
      </button>
      <button
        :style="getButtonStyle('cancel')"
        data-testid="pat-cancel-button"
        @click="handlePatCancel"
        @mouseenter="hoveredButton = 'cancel'"
        @mouseleave="hoveredButton = null"
      >
        {{ t.cancel }}
      </button>
    </div>
    <div v-if="error" :style="styles.error">{{ error }}</div>
    <div :style="styles.hint">
      {{
        language === 'ru'
          ? 'Создайте токен на GitHub → Settings → Developer settings → Personal access tokens с правами "repo"'
          : 'Create a token at GitHub → Settings → Developer settings → Personal access tokens with "repo" scope'
      }}
    </div>
  </div>

  <!-- Device Flow view -->
  <div
    v-else-if="view === 'device-flow' && deviceCode"
    :style="{ ...styles.container, ...props.style }"
    :class="props.class"
    data-testid="github-auth-device-flow"
  >
    <div :style="styles.deviceFlow">
      <div :style="{ fontSize: '12px', fontWeight: 500, color: '#c4b5fd' }">
        {{ t.deviceFlowTitle }}
      </div>
      <div :style="{ fontSize: '11px', color: '#9ca3af' }">
        {{ t.deviceFlowInstructions }}
      </div>
      <div :style="styles.userCode" data-testid="device-user-code">
        {{ deviceCode.userCode }}
      </div>
      <a
        :href="deviceCode.verificationUri"
        target="_blank"
        rel="noopener noreferrer"
        :style="{
          ...styles.button,
          ...styles.buttonSuccess,
          textAlign: 'center',
          textDecoration: 'none',
        }"
      >
        {{ t.openGitHub }}
      </a>
      <div :style="{ ...styles.hint, textAlign: 'center' }">
        {{ t.deviceFlowWaiting }}
      </div>
      <button
        :style="getButtonStyle('cancel-flow')"
        data-testid="device-flow-cancel"
        @click="handleDeviceFlowCancel"
        @mouseenter="hoveredButton = 'cancel-flow'"
        @mouseleave="hoveredButton = null"
      >
        {{ t.cancel }}
      </button>
    </div>
    <div v-if="error" :style="styles.error">{{ error }}</div>
  </div>

  <!-- Default status view -->
  <div
    v-else
    :style="{ ...styles.container, ...props.style }"
    :class="props.class"
    data-testid="github-auth-status"
  >
    <!-- Authenticated state -->
    <div v-if="authState.authenticated && authState.user" :style="styles.authRow">
      <span :style="{ ...styles.statusDot, ...styles.statusConnected }" />
      <img :src="authState.user.avatarUrl" :alt="authState.user.login" :style="styles.avatar" />
      <span :style="styles.userName">
        {{ authState.user.name || authState.user.login }}
      </span>
      <button
        :style="getButtonStyle('signout', styles.buttonDanger)"
        data-testid="signout-button"
        @click="handleSignOut"
        @mouseenter="hoveredButton = 'signout'"
        @mouseleave="hoveredButton = null"
      >
        {{ t.signOut }}
      </button>
    </div>

    <!-- Not authenticated state -->
    <div v-else :style="{ ...styles.authRow, flexWrap: 'wrap', gap: '6px' }">
      <span :style="{ ...styles.statusDot, ...styles.statusDisconnected }" />
      <span :style="{ fontSize: '12px', color: '#9ca3af' }">{{ t.disconnected }}</span>
      <button
        :style="getButtonStyle('use-token')"
        data-testid="use-token-button"
        @click="handleUseToken"
        @mouseenter="hoveredButton = 'use-token'"
        @mouseleave="hoveredButton = null"
      >
        {{ t.useToken }}
      </button>
      <button
        v-if="oauthClientId"
        :style="getButtonStyle('use-oauth', styles.buttonSuccess)"
        :disabled="loading"
        data-testid="use-oauth-button"
        @click="handleDeviceFlowStart"
        @mouseenter="hoveredButton = 'use-oauth'"
        @mouseleave="hoveredButton = null"
      >
        {{ loading ? t.authenticating : t.useOAuth }}
      </button>
    </div>
    <div v-if="error" :style="styles.error">{{ error }}</div>
  </div>
</template>
