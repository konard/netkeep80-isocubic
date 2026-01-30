/**
 * GitHub Auth Button Component
 *
 * Provides GitHub authentication UI for GOD MODE.
 * Supports Personal Access Token (PAT) entry and OAuth Device Flow.
 *
 * TASK 57: GitHub Integration (Phase 9 - GOD MODE)
 *
 * Features:
 * - PAT token input with validation
 * - OAuth Device Flow with user code display
 * - Auth state display (user avatar, name)
 * - Sign out functionality
 * - Multi-language support (Russian/English)
 */

import { useState, useCallback, useEffect, type CSSProperties } from 'react'
import type { QueryLanguage } from '../types/ai-query'
import {
  createGitHubClient,
  type GitHubApiClient,
  type GitHubAuthState,
  type DeviceCodeResponse,
} from '../lib/github-api'

/**
 * Props for GitHubAuthButton
 */
export interface GitHubAuthButtonProps {
  /** Language for UI text */
  language?: QueryLanguage
  /** Custom styles */
  style?: CSSProperties
  /** Custom class name */
  className?: string
  /** GitHub API client instance (optional, creates default if not provided) */
  client?: GitHubApiClient
  /** Repository owner */
  owner?: string
  /** Repository name */
  repo?: string
  /** OAuth Client ID (enables Device Flow) */
  oauthClientId?: string
  /** Callback when auth state changes */
  onAuthStateChange?: (state: GitHubAuthState) => void
  /** Compact mode (just show status icon) */
  compact?: boolean
}

/**
 * Component styles
 */
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

/**
 * Text labels for different languages
 */
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

type AuthView = 'status' | 'pat-input' | 'device-flow'

/**
 * GitHub Auth Button / Panel Component
 *
 * Displays authentication state and provides sign-in/sign-out UI.
 */
export function GitHubAuthButton({
  language = 'ru',
  style,
  className,
  client: externalClient,
  owner,
  repo,
  oauthClientId,
  onAuthStateChange,
  compact = false,
}: GitHubAuthButtonProps) {
  const [client] = useState<GitHubApiClient>(
    () => externalClient || createGitHubClient({ owner, repo, oauthClientId })
  )
  const [authState, setAuthState] = useState<GitHubAuthState>({
    authenticated: false,
  })
  const [view, setView] = useState<AuthView>('status')
  const [tokenInput, setTokenInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deviceCode, setDeviceCode] = useState<DeviceCodeResponse | null>(null)
  const [hoveredButton, setHoveredButton] = useState<string | null>(null)

  const t = labels[language] || labels.ru

  // Check auth state on mount
  useEffect(() => {
    let cancelled = false
    const checkAuth = async () => {
      const state = await client.getAuthState()
      if (!cancelled) {
        setAuthState(state)
        onAuthStateChange?.(state)
      }
    }
    checkAuth()
    return () => {
      cancelled = true
    }
  }, [client, onAuthStateChange])

  // Handle PAT authentication
  const handlePATAuth = useCallback(async () => {
    if (!tokenInput.trim()) return

    setLoading(true)
    setError(null)

    const state = await client.authenticateWithPAT(tokenInput.trim())
    setAuthState(state)
    setLoading(false)

    if (state.authenticated) {
      setView('status')
      setTokenInput('')
      onAuthStateChange?.(state)
    } else {
      setError(state.error || t.authFailed)
    }
  }, [client, tokenInput, onAuthStateChange, t.authFailed])

  // Handle OAuth Device Flow initiation
  const handleDeviceFlowStart = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const dc = await client.initiateDeviceFlow()
      setDeviceCode(dc)
      setView('device-flow')
      setLoading(false)

      // Start polling
      let pollInterval = dc.interval
      const startTime = Date.now()
      const maxTime = dc.expiresIn * 1000

      const poll = async () => {
        if (Date.now() - startTime > maxTime) {
          setError('Authorization timed out')
          setView('status')
          setDeviceCode(null)
          return
        }

        const result = await client.pollDeviceToken(dc.deviceCode, pollInterval)

        if (result.authenticated) {
          setAuthState(result)
          setView('status')
          setDeviceCode(null)
          onAuthStateChange?.(result)
          return
        }

        if (result.error?.startsWith('slow_down:')) {
          pollInterval = parseInt(result.error.split(':')[1], 10)
        } else if (result.error !== 'authorization_pending') {
          setError(result.error || t.authFailed)
          setView('status')
          setDeviceCode(null)
          return
        }

        setTimeout(poll, pollInterval * 1000)
      }

      setTimeout(poll, pollInterval * 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.authFailed)
      setLoading(false)
    }
  }, [client, onAuthStateChange, t.authFailed])

  // Handle sign out
  const handleSignOut = useCallback(() => {
    client.signOut()
    const state: GitHubAuthState = { authenticated: false }
    setAuthState(state)
    setView('status')
    onAuthStateChange?.(state)
  }, [client, onAuthStateChange])

  // Button style helper
  const getButtonStyle = (base: string, extraStyle?: CSSProperties): CSSProperties => ({
    ...styles.button,
    ...(extraStyle || {}),
    ...(hoveredButton === base ? styles.buttonHover : {}),
  })

  // Compact mode: just show a status indicator
  if (compact) {
    return (
      <div
        style={{ ...styles.authRow, ...style }}
        className={className}
        data-testid="github-auth-compact"
      >
        <span
          style={{
            ...styles.statusDot,
            ...(authState.authenticated ? styles.statusConnected : styles.statusDisconnected),
          }}
          title={
            authState.authenticated
              ? `${t.connected}: ${authState.user?.login || ''}`
              : t.disconnected
          }
        />
        {authState.authenticated && authState.user && (
          <span style={styles.userName}>{authState.user.login}</span>
        )}
      </div>
    )
  }

  // PAT input view
  if (view === 'pat-input') {
    return (
      <div
        style={{ ...styles.container, ...style }}
        className={className}
        data-testid="github-auth-pat"
      >
        <div style={{ fontSize: '12px', fontWeight: 500, color: '#c4b5fd' }}>{t.enterToken}</div>
        <div style={styles.authRow}>
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder={t.tokenPlaceholder}
            style={styles.input}
            data-testid="pat-input"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handlePATAuth()
              if (e.key === 'Escape') setView('status')
            }}
            disabled={loading}
          />
          <button
            onClick={handlePATAuth}
            style={getButtonStyle('connect', styles.buttonSuccess)}
            onMouseEnter={() => setHoveredButton('connect')}
            onMouseLeave={() => setHoveredButton(null)}
            disabled={loading || !tokenInput.trim()}
            data-testid="pat-connect-button"
          >
            {loading ? t.authenticating : t.connect}
          </button>
          <button
            onClick={() => {
              setView('status')
              setError(null)
              setTokenInput('')
            }}
            style={getButtonStyle('cancel')}
            onMouseEnter={() => setHoveredButton('cancel')}
            onMouseLeave={() => setHoveredButton(null)}
            data-testid="pat-cancel-button"
          >
            {t.cancel}
          </button>
        </div>
        {error && <div style={styles.error}>{error}</div>}
        <div style={styles.hint}>
          {language === 'ru'
            ? 'Создайте токен на GitHub → Settings → Developer settings → Personal access tokens с правами "repo"'
            : 'Create a token at GitHub → Settings → Developer settings → Personal access tokens with "repo" scope'}
        </div>
      </div>
    )
  }

  // Device Flow view
  if (view === 'device-flow' && deviceCode) {
    return (
      <div
        style={{ ...styles.container, ...style }}
        className={className}
        data-testid="github-auth-device-flow"
      >
        <div style={styles.deviceFlow}>
          <div style={{ fontSize: '12px', fontWeight: 500, color: '#c4b5fd' }}>
            {t.deviceFlowTitle}
          </div>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>{t.deviceFlowInstructions}</div>
          <div style={styles.userCode} data-testid="device-user-code">
            {deviceCode.userCode}
          </div>
          <a
            href={deviceCode.verificationUri}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...styles.button,
              ...styles.buttonSuccess,
              textAlign: 'center',
              textDecoration: 'none',
            }}
          >
            {t.openGitHub}
          </a>
          <div
            style={{
              ...styles.hint,
              textAlign: 'center',
            }}
          >
            {t.deviceFlowWaiting}
          </div>
          <button
            onClick={() => {
              setView('status')
              setDeviceCode(null)
              setError(null)
            }}
            style={getButtonStyle('cancel-flow')}
            onMouseEnter={() => setHoveredButton('cancel-flow')}
            onMouseLeave={() => setHoveredButton(null)}
            data-testid="device-flow-cancel"
          >
            {t.cancel}
          </button>
        </div>
        {error && <div style={styles.error}>{error}</div>}
      </div>
    )
  }

  // Default status view
  return (
    <div
      style={{ ...styles.container, ...style }}
      className={className}
      data-testid="github-auth-status"
    >
      {authState.authenticated && authState.user ? (
        <div style={styles.authRow}>
          <span
            style={{
              ...styles.statusDot,
              ...styles.statusConnected,
            }}
          />
          <img src={authState.user.avatarUrl} alt={authState.user.login} style={styles.avatar} />
          <span style={styles.userName}>{authState.user.name || authState.user.login}</span>
          <button
            onClick={handleSignOut}
            style={getButtonStyle('signout', styles.buttonDanger)}
            onMouseEnter={() => setHoveredButton('signout')}
            onMouseLeave={() => setHoveredButton(null)}
            data-testid="signout-button"
          >
            {t.signOut}
          </button>
        </div>
      ) : (
        <div style={{ ...styles.authRow, flexWrap: 'wrap', gap: '6px' }}>
          <span
            style={{
              ...styles.statusDot,
              ...styles.statusDisconnected,
            }}
          />
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>{t.disconnected}</span>
          <button
            onClick={() => {
              setView('pat-input')
              setError(null)
            }}
            style={getButtonStyle('use-token')}
            onMouseEnter={() => setHoveredButton('use-token')}
            onMouseLeave={() => setHoveredButton(null)}
            data-testid="use-token-button"
          >
            {t.useToken}
          </button>
          {oauthClientId && (
            <button
              onClick={handleDeviceFlowStart}
              style={getButtonStyle('use-oauth', styles.buttonSuccess)}
              onMouseEnter={() => setHoveredButton('use-oauth')}
              onMouseLeave={() => setHoveredButton(null)}
              disabled={loading}
              data-testid="use-oauth-button"
            >
              {loading ? t.authenticating : t.useOAuth}
            </button>
          )}
        </div>
      )}
      {error && <div style={styles.error}>{error}</div>}
    </div>
  )
}
