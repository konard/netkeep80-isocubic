/**
 * GitHub API Client Tests
 *
 * Tests for the GitHub API integration module.
 *
 * TASK 57: GitHub Integration (Phase 9 - GOD MODE)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  createGitHubClient,
  getDefaultGitHubClient,
  resetDefaultGitHubClient,
  parseIssueTemplate,
  GITHUB_TOKEN_STORAGE_KEY,
  GITHUB_AUTH_METHOD_KEY,
  DEFAULT_GITHUB_API_CONFIG,
} from './github-api'
import type { IssueDraft } from '../types/issue-generator'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('GitHubApiClient', () => {
  beforeEach(() => {
    localStorage.clear()
    resetDefaultGitHubClient()
    mockFetch.mockReset()
  })

  afterEach(() => {
    localStorage.clear()
    resetDefaultGitHubClient()
  })

  describe('constructor', () => {
    it('should create client with default config', () => {
      const client = createGitHubClient()
      const config = client.getConfig()

      expect(config.owner).toBe('')
      expect(config.repo).toBe('')
      expect(config.apiBaseUrl).toBe(DEFAULT_GITHUB_API_CONFIG.apiBaseUrl)
    })

    it('should create client with custom config', () => {
      const client = createGitHubClient({
        owner: 'testowner',
        repo: 'testrepo',
      })
      const config = client.getConfig()

      expect(config.owner).toBe('testowner')
      expect(config.repo).toBe('testrepo')
    })

    it('should load token from localStorage', () => {
      localStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, 'test-token-123')
      localStorage.setItem(GITHUB_AUTH_METHOD_KEY, 'pat')

      const client = createGitHubClient()

      expect(client.isAuthenticated()).toBe(true)
    })
  })

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const client = createGitHubClient({ owner: 'old' })
      client.updateConfig({ owner: 'new' })

      expect(client.getConfig().owner).toBe('new')
    })

    it('should preserve other config values', () => {
      const client = createGitHubClient({ owner: 'test', repo: 'myrepo' })
      client.updateConfig({ owner: 'updated' })

      expect(client.getConfig().repo).toBe('myrepo')
    })
  })

  describe('getRepoPath', () => {
    it('should return owner/repo path', () => {
      const client = createGitHubClient({
        owner: 'myowner',
        repo: 'myrepo',
      })

      expect(client.getRepoPath()).toBe('myowner/myrepo')
    })
  })

  describe('authentication', () => {
    it('should not be authenticated by default', () => {
      const client = createGitHubClient()

      expect(client.isAuthenticated()).toBe(false)
    })

    it('should authenticate with PAT successfully', async () => {
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

      const client = createGitHubClient()
      const result = await client.authenticateWithPAT('ghp_test123')

      expect(result.authenticated).toBe(true)
      expect(result.method).toBe('pat')
      expect(result.user?.login).toBe('testuser')
      expect(client.isAuthenticated()).toBe(true)
      expect(localStorage.getItem(GITHUB_TOKEN_STORAGE_KEY)).toBe('ghp_test123')
    })

    it('should fail authentication with invalid token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            message: 'Bad credentials',
          }),
      })

      const client = createGitHubClient()
      const result = await client.authenticateWithPAT('invalid-token')

      expect(result.authenticated).toBe(false)
      expect(result.error).toBe('Bad credentials')
      expect(client.isAuthenticated()).toBe(false)
    })

    it('should get auth state when authenticated', async () => {
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

      const client = createGitHubClient()
      const state = await client.getAuthState()

      expect(state.authenticated).toBe(true)
      expect(state.user?.login).toBe('testuser')
      expect(state.method).toBe('pat')
    })

    it('should return unauthenticated state when no token', async () => {
      const client = createGitHubClient()
      const state = await client.getAuthState()

      expect(state.authenticated).toBe(false)
    })

    it('should handle expired token in getAuthState', async () => {
      localStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, 'expired-token')

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Bad credentials' }),
      })

      const client = createGitHubClient()
      const state = await client.getAuthState()

      expect(state.authenticated).toBe(false)
      expect(state.error).toBe('Token is invalid or expired')
    })

    it('should sign out and clear token', () => {
      localStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, 'test-token')
      localStorage.setItem(GITHUB_AUTH_METHOD_KEY, 'pat')

      const client = createGitHubClient()
      expect(client.isAuthenticated()).toBe(true)

      client.signOut()

      expect(client.isAuthenticated()).toBe(false)
      expect(localStorage.getItem(GITHUB_TOKEN_STORAGE_KEY)).toBeNull()
      expect(localStorage.getItem(GITHUB_AUTH_METHOD_KEY)).toBeNull()
    })
  })

  describe('OAuth Device Flow', () => {
    it('should initiate device flow', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            device_code: 'dc_test123',
            user_code: 'ABCD-1234',
            verification_uri: 'https://github.com/login/device',
            expires_in: 900,
            interval: 5,
          }),
      })

      const client = createGitHubClient({ oauthClientId: 'test-client-id' })
      const result = await client.initiateDeviceFlow()

      expect(result.deviceCode).toBe('dc_test123')
      expect(result.userCode).toBe('ABCD-1234')
      expect(result.verificationUri).toBe('https://github.com/login/device')
      expect(result.expiresIn).toBe(900)
      expect(result.interval).toBe(5)
    })

    it('should throw if no client ID for device flow', async () => {
      const client = createGitHubClient()

      await expect(client.initiateDeviceFlow()).rejects.toThrow('OAuth Client ID is required')
    })

    it('should handle pending authorization in polling', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            error: 'authorization_pending',
          }),
      })

      const client = createGitHubClient({ oauthClientId: 'test-client-id' })
      const result = await client.pollDeviceToken('dc_test123', 5)

      expect(result.authenticated).toBe(false)
      expect(result.error).toBe('authorization_pending')
    })

    it('should handle slow_down response in polling', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            error: 'slow_down',
          }),
      })

      const client = createGitHubClient({ oauthClientId: 'test-client-id' })
      const result = await client.pollDeviceToken('dc_test123', 5)

      expect(result.authenticated).toBe(false)
      expect(result.error).toBe('slow_down:10')
    })

    it('should authenticate when token received in polling', async () => {
      // First call: poll returns access_token
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'gho_test_token',
            token_type: 'bearer',
            scope: 'repo',
          }),
      })

      // Second call: verifying token with /user
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

      const client = createGitHubClient({ oauthClientId: 'test-client-id' })
      const result = await client.pollDeviceToken('dc_test123', 5)

      expect(result.authenticated).toBe(true)
      expect(result.user?.login).toBe('testuser')
    })
  })

  describe('getRepository', () => {
    it('should get repository info', async () => {
      localStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, 'test-token')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            full_name: 'testowner/testrepo',
            owner: { login: 'testowner' },
            name: 'testrepo',
            description: 'Test repository',
            html_url: 'https://github.com/testowner/testrepo',
            has_issues: true,
            default_branch: 'main',
          }),
      })

      const client = createGitHubClient({
        owner: 'testowner',
        repo: 'testrepo',
      })
      const repo = await client.getRepository()

      expect(repo.fullName).toBe('testowner/testrepo')
      expect(repo.hasIssues).toBe(true)
      expect(repo.defaultBranch).toBe('main')
    })

    it('should throw if owner/repo not configured', async () => {
      const client = createGitHubClient()

      await expect(client.getRepository()).rejects.toThrow('Repository owner and name are required')
    })

    it('should accept override owner/repo', async () => {
      localStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, 'test-token')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            full_name: 'other/repo',
            owner: { login: 'other' },
            name: 'repo',
            description: null,
            html_url: 'https://github.com/other/repo',
            has_issues: true,
            default_branch: 'master',
          }),
      })

      const client = createGitHubClient()
      const repo = await client.getRepository('other', 'repo')

      expect(repo.fullName).toBe('other/repo')
    })
  })

  describe('getLabels', () => {
    it('should get repository labels', async () => {
      localStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, 'test-token')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: 1,
              name: 'bug',
              color: 'd73a4a',
              description: 'Something is broken',
            },
            {
              id: 2,
              name: 'enhancement',
              color: 'a2eeef',
              description: 'New feature',
            },
          ]),
      })

      const client = createGitHubClient({
        owner: 'testowner',
        repo: 'testrepo',
      })
      const labels = await client.getLabels()

      expect(labels).toHaveLength(2)
      expect(labels[0].name).toBe('bug')
      expect(labels[1].name).toBe('enhancement')
    })
  })

  describe('createIssue', () => {
    const mockDraft: IssueDraft = {
      id: 'test-draft',
      title: 'Test Issue',
      body: '## Description\nTest body',
      type: 'bug',
      priority: 'medium',
      labels: ['bug', 'needs-triage'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'ready',
    }

    it('should create an issue successfully', async () => {
      localStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, 'test-token')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 12345,
            number: 42,
            html_url: 'https://github.com/testowner/testrepo/issues/42',
          }),
      })

      const client = createGitHubClient({
        owner: 'testowner',
        repo: 'testrepo',
      })
      const result = await client.createIssue(mockDraft)

      expect(result.success).toBe(true)
      expect(result.number).toBe(42)
      expect(result.htmlUrl).toBe('https://github.com/testowner/testrepo/issues/42')

      // Verify the API was called correctly
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/testowner/testrepo/issues',
        expect.objectContaining({
          method: 'POST',
        })
      )

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string)
      expect(callBody.title).toBe('Test Issue')
      expect(callBody.labels).toEqual(['bug', 'needs-triage'])
    })

    it('should fail if not authenticated', async () => {
      const client = createGitHubClient({
        owner: 'testowner',
        repo: 'testrepo',
      })
      const result = await client.createIssue(mockDraft)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Authentication required')
    })

    it('should fail if no repo configured', async () => {
      localStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, 'test-token')

      const client = createGitHubClient()
      const result = await client.createIssue(mockDraft)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Repository owner and name are required')
    })

    it('should handle API errors gracefully', async () => {
      localStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, 'test-token')

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            message: 'Validation Failed',
          }),
      })

      const client = createGitHubClient({
        owner: 'testowner',
        repo: 'testrepo',
      })
      const result = await client.createIssue(mockDraft)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Validation Failed')
    })

    it('should include assignees when provided', async () => {
      localStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, 'test-token')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 12345,
            number: 43,
            html_url: 'https://github.com/testowner/testrepo/issues/43',
          }),
      })

      const draftWithAssignees: IssueDraft = {
        ...mockDraft,
        assignees: ['user1', 'user2'],
      }

      const client = createGitHubClient({
        owner: 'testowner',
        repo: 'testrepo',
      })
      await client.createIssue(draftWithAssignees)

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string)
      expect(callBody.assignees).toEqual(['user1', 'user2'])
    })
  })

  describe('singleton', () => {
    it('should create and return default client', () => {
      const client1 = getDefaultGitHubClient({ owner: 'test' })
      const client2 = getDefaultGitHubClient()

      expect(client1).toBe(client2)
      expect(client2.getConfig().owner).toBe('test')
    })

    it('should update default client config', () => {
      const client1 = getDefaultGitHubClient({ owner: 'test1' })
      const client2 = getDefaultGitHubClient({ owner: 'test2' })

      expect(client1).toBe(client2)
      expect(client2.getConfig().owner).toBe('test2')
    })

    it('should reset default client', () => {
      const client1 = getDefaultGitHubClient({ owner: 'test' })
      resetDefaultGitHubClient()
      const client2 = getDefaultGitHubClient({ owner: 'other' })

      expect(client1).not.toBe(client2)
      expect(client2.getConfig().owner).toBe('other')
    })
  })
})

describe('parseIssueTemplate', () => {
  it('should parse markdown template with frontmatter', () => {
    const content = `---
name: Bug Report
about: Report a bug
title: "Bug: "
labels: [bug, needs-triage]
assignees: [user1]
---

## Description
Describe the bug here.

## Steps to Reproduce
1. Step 1
2. Step 2`

    const result = parseIssueTemplate(content, 'bug_report.md')

    expect(result).not.toBeNull()
    expect(result?.name).toBe('Bug Report')
    expect(result?.about).toBe('Report a bug')
    expect(result?.title).toBe('Bug:')
    expect(result?.labels).toContain('bug')
    expect(result?.labels).toContain('needs-triage')
    expect(result?.body).toContain('## Description')
  })

  it('should parse template without frontmatter', () => {
    const content = `## Description
Simple template without frontmatter`

    const result = parseIssueTemplate(content, 'simple.md')

    expect(result).not.toBeNull()
    expect(result?.name).toBe('simple')
    expect(result?.body).toContain('## Description')
  })

  it('should handle empty labels', () => {
    const content = `---
name: Simple Template
about: A simple template
---

Body content`

    const result = parseIssueTemplate(content, 'simple.md')

    expect(result).not.toBeNull()
    expect(result?.labels).toEqual([])
  })
})
