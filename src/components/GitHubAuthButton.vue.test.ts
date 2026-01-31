/**
 * Comprehensive unit tests for GitHubAuthButton Vue component
 * Migrated from GitHubAuthButton.test.tsx (React) + existing Vue tests
 * TASK 66: Vue.js 3.0 Migration
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { nextTick } from 'vue'
import GitHubAuthButton from './GitHubAuthButton.vue'
import { GITHUB_TOKEN_STORAGE_KEY, GITHUB_AUTH_METHOD_KEY } from '../lib/github-api'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock the github-api module
const mockGetAuthState = vi.fn().mockResolvedValue({ authenticated: false })
const mockAuthenticateWithPAT = vi.fn()
const mockSignOut = vi.fn()
const mockInitiateDeviceFlow = vi.fn()
const mockPollDeviceToken = vi.fn()

vi.mock('../lib/github-api', () => ({
  createGitHubClient: vi.fn(() => ({
    getAuthState: mockGetAuthState,
    authenticateWithPAT: mockAuthenticateWithPAT,
    signOut: mockSignOut,
    initiateDeviceFlow: mockInitiateDeviceFlow,
    pollDeviceToken: mockPollDeviceToken,
    isAuthenticated: () => false,
    getConfig: () => ({ owner: '', repo: '', apiBaseUrl: '' }),
  })),
  GITHUB_TOKEN_STORAGE_KEY: 'github_pat_token',
  GITHUB_AUTH_METHOD_KEY: 'github_auth_method',
}))

describe('GitHubAuthButton Vue Component', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    mockGetAuthState.mockResolvedValue({ authenticated: false })
  })

  afterEach(() => {
    localStorage.clear()
  })

  function mountButton(props: Record<string, unknown> = {}) {
    return shallowMount(GitHubAuthButton, { props })
  }

  // ========================================================================
  // Module Exports (from original Vue test)
  // ========================================================================
  describe('Module Exports', () => {
    it('should export GitHubAuthButton.vue as a valid Vue component', async () => {
      const module = await import('./GitHubAuthButton.vue')
      expect(module.default).toBeDefined()
      expect(typeof module.default).toBe('object')
    })
  })

  // ========================================================================
  // Auth View Modes (from original Vue test)
  // ========================================================================
  describe('Auth View Modes', () => {
    it('should define all valid auth view modes', () => {
      const viewModes = ['status', 'pat-input', 'device-flow']
      expect(viewModes.length).toBe(3)
      expect(viewModes).toContain('status')
      expect(viewModes).toContain('pat-input')
      expect(viewModes).toContain('device-flow')
    })

    it('should default to status view mode', () => {
      const defaultMode = 'status'
      expect(defaultMode).toBe('status')
    })
  })

  // ========================================================================
  // PAT Validation (from original Vue test)
  // ========================================================================
  describe('PAT Validation', () => {
    it('should validate PAT tokens starting with ghp_', () => {
      function isValidPAT(token: string): boolean {
        return token.startsWith('ghp_') || token.startsWith('github_pat_')
      }
      expect(isValidPAT('ghp_abcdef1234567890')).toBe(true)
      expect(isValidPAT('github_pat_abcdef1234567890')).toBe(true)
      expect(isValidPAT('invalid_token')).toBe(false)
      expect(isValidPAT('')).toBe(false)
    })

    it('should reject empty or whitespace-only tokens', () => {
      function isValidPAT(token: string): boolean {
        const trimmed = token.trim()
        if (trimmed.length === 0) return false
        return trimmed.startsWith('ghp_') || trimmed.startsWith('github_pat_')
      }
      expect(isValidPAT('   ')).toBe(false)
      expect(isValidPAT('')).toBe(false)
    })
  })

  // ========================================================================
  // GitHub API Types (from original Vue test)
  // ========================================================================
  describe('GitHub API Types', () => {
    it('should import GitHub API module', async () => {
      const apiModule = await import('../lib/github-api')
      expect(apiModule).toBeDefined()
    })
  })

  // ========================================================================
  // Auth State Structure (from original Vue test)
  // ========================================================================
  describe('Auth State Structure', () => {
    it('should have correct auth state structure', () => {
      const authState = {
        authenticated: false,
        username: '',
        avatarUrl: '',
        scopes: [] as string[],
      }
      expect(authState.authenticated).toBe(false)
      expect(authState.username).toBe('')
      expect(Array.isArray(authState.scopes)).toBe(true)
    })
  })

  // ========================================================================
  // Rendering (from React test)
  // ========================================================================
  describe('Rendering', () => {
    it('should render status view when not authenticated', async () => {
      const wrapper = mountButton()
      await nextTick()
      await nextTick()
      expect(wrapper.find('[data-testid="github-auth-status"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('Не подключено')
    })

    it('should render in English', async () => {
      const wrapper = mountButton({ language: 'en' })
      await nextTick()
      await nextTick()
      expect(wrapper.text()).toContain('Not connected')
    })

    it('should show use token button', async () => {
      const wrapper = mountButton()
      await nextTick()
      await nextTick()
      expect(wrapper.find('[data-testid="use-token-button"]').exists()).toBe(true)
    })

    it('should show OAuth button when clientId is provided', async () => {
      const wrapper = mountButton({ oauthClientId: 'test-client-id' })
      await nextTick()
      await nextTick()
      expect(wrapper.find('[data-testid="use-oauth-button"]').exists()).toBe(true)
    })

    it('should not show OAuth button without clientId', async () => {
      const wrapper = mountButton()
      await nextTick()
      await nextTick()
      expect(wrapper.find('[data-testid="use-oauth-button"]').exists()).toBe(false)
    })

    it('should render compact mode', async () => {
      const wrapper = mountButton({ compact: true })
      await nextTick()
      await nextTick()
      expect(wrapper.find('[data-testid="github-auth-compact"]').exists()).toBe(true)
    })
  })

  // ========================================================================
  // PAT Authentication (from React test)
  // ========================================================================
  describe('PAT Authentication', () => {
    it('should show PAT input when use-token is clicked', async () => {
      const wrapper = mountButton()
      await nextTick()
      await nextTick()

      await wrapper.find('[data-testid="use-token-button"]').trigger('click')
      await nextTick()

      expect(wrapper.find('[data-testid="github-auth-pat"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="pat-input"]').exists()).toBe(true)
    })

    it('should cancel PAT input view', async () => {
      const wrapper = mountButton()
      await nextTick()
      await nextTick()

      await wrapper.find('[data-testid="use-token-button"]').trigger('click')
      await nextTick()
      expect(wrapper.find('[data-testid="github-auth-pat"]').exists()).toBe(true)

      await wrapper.find('[data-testid="pat-cancel-button"]').trigger('click')
      await nextTick()
      expect(wrapper.find('[data-testid="github-auth-status"]').exists()).toBe(true)
    })
  })

  // ========================================================================
  // Sign Out (from React test)
  // ========================================================================
  describe('Sign Out', () => {
    it('should show sign out button when authenticated', async () => {
      mockGetAuthState.mockResolvedValue({
        authenticated: true,
        user: { login: 'testuser', name: 'Test User', avatarUrl: 'https://example.com/avatar', htmlUrl: 'https://github.com/testuser' },
      })

      const wrapper = mountButton()
      await nextTick()
      await nextTick()
      // Wait for onMounted async
      await new Promise((r) => setTimeout(r, 10))
      await nextTick()

      expect(wrapper.find('[data-testid="signout-button"]').exists()).toBe(true)
    })
  })
})
