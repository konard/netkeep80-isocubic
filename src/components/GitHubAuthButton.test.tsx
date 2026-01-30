/**
 * GitHub Auth Button Component Tests
 *
 * Tests for the GitHub authentication button in GOD MODE.
 *
 * TASK 57: GitHub Integration (Phase 9 - GOD MODE)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { GitHubAuthButton } from './GitHubAuthButton'
import { GITHUB_TOKEN_STORAGE_KEY, GITHUB_AUTH_METHOD_KEY } from '../lib/github-api'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('GitHubAuthButton', () => {
  beforeEach(() => {
    localStorage.clear()
    mockFetch.mockReset()
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  describe('rendering', () => {
    it('should render status view when not authenticated', () => {
      render(<GitHubAuthButton />)

      expect(screen.getByTestId('github-auth-status')).toBeInTheDocument()
      expect(screen.getByText('Не подключено')).toBeInTheDocument()
    })

    it('should render in English', () => {
      render(<GitHubAuthButton language="en" />)

      expect(screen.getByText('Not connected')).toBeInTheDocument()
    })

    it('should show use token button', () => {
      render(<GitHubAuthButton />)

      expect(screen.getByTestId('use-token-button')).toBeInTheDocument()
    })

    it('should show OAuth button when clientId is provided', () => {
      render(<GitHubAuthButton oauthClientId="test-client-id" />)

      expect(screen.getByTestId('use-oauth-button')).toBeInTheDocument()
    })

    it('should not show OAuth button without clientId', () => {
      render(<GitHubAuthButton />)

      expect(screen.queryByTestId('use-oauth-button')).not.toBeInTheDocument()
    })

    it('should render authenticated state', async () => {
      localStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, 'test-token')
      localStorage.setItem(GITHUB_AUTH_METHOD_KEY, 'pat')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            login: 'testuser',
            name: 'Test User',
            avatar_url: 'https://avatars.githubusercontent.com/u/1',
            html_url: 'https://github.com/testuser',
          }),
      })

      render(<GitHubAuthButton />)

      // Wait for auth check to complete
      const signOutBtn = await screen.findByTestId('signout-button')
      expect(signOutBtn).toBeInTheDocument()
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })

    it('should render compact mode', () => {
      render(<GitHubAuthButton compact />)

      expect(screen.getByTestId('github-auth-compact')).toBeInTheDocument()
    })
  })

  describe('PAT authentication', () => {
    it('should show PAT input when use-token is clicked', async () => {
      const user = userEvent.setup()
      render(<GitHubAuthButton />)

      await user.click(screen.getByTestId('use-token-button'))

      expect(screen.getByTestId('github-auth-pat')).toBeInTheDocument()
      expect(screen.getByTestId('pat-input')).toBeInTheDocument()
    })

    it('should cancel PAT input view', async () => {
      const user = userEvent.setup()
      render(<GitHubAuthButton />)

      await user.click(screen.getByTestId('use-token-button'))
      expect(screen.getByTestId('github-auth-pat')).toBeInTheDocument()

      await user.click(screen.getByTestId('pat-cancel-button'))
      expect(screen.getByTestId('github-auth-status')).toBeInTheDocument()
    })

    it('should authenticate with PAT', async () => {
      const user = userEvent.setup()
      const onAuthChange = vi.fn()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            login: 'testuser',
            name: 'Test User',
            avatar_url: 'https://avatars.githubusercontent.com/u/1',
            html_url: 'https://github.com/testuser',
          }),
      })

      render(<GitHubAuthButton onAuthStateChange={onAuthChange} />)

      await user.click(screen.getByTestId('use-token-button'))
      await user.type(screen.getByTestId('pat-input'), 'ghp_testtoken123')
      await user.click(screen.getByTestId('pat-connect-button'))

      // Should switch back to status view and show user
      const signOutBtn = await screen.findByTestId('signout-button')
      expect(signOutBtn).toBeInTheDocument()

      expect(onAuthChange).toHaveBeenCalledWith(
        expect.objectContaining({
          authenticated: true,
          user: expect.objectContaining({ login: 'testuser' }),
        })
      )
    })

    it('should show error on failed PAT auth', async () => {
      const user = userEvent.setup()

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Bad credentials' }),
      })

      render(<GitHubAuthButton language="en" />)

      await user.click(screen.getByTestId('use-token-button'))
      await user.type(screen.getByTestId('pat-input'), 'invalid-token')
      await user.click(screen.getByTestId('pat-connect-button'))

      // Should show error
      expect(await screen.findByText('Bad credentials')).toBeInTheDocument()
    })
  })

  describe('sign out', () => {
    it('should sign out and clear auth state', async () => {
      const user = userEvent.setup()
      const onAuthChange = vi.fn()

      localStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, 'test-token')
      localStorage.setItem(GITHUB_AUTH_METHOD_KEY, 'pat')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            login: 'testuser',
            name: 'Test User',
            avatar_url: 'https://avatars.githubusercontent.com/u/1',
            html_url: 'https://github.com/testuser',
          }),
      })

      render(<GitHubAuthButton onAuthStateChange={onAuthChange} />)

      // Wait for authenticated state
      const signOutBtn = await screen.findByTestId('signout-button')
      await user.click(signOutBtn)

      // Should show disconnected state
      expect(screen.getByText('Не подключено')).toBeInTheDocument()
      expect(localStorage.getItem(GITHUB_TOKEN_STORAGE_KEY)).toBeNull()
    })
  })
})
