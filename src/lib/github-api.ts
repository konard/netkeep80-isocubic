/**
 * GitHub API Integration Module
 *
 * Provides GitHub API client for GOD MODE integration.
 * Supports authentication via Personal Access Token (PAT) and
 * GitHub OAuth Device Flow for browser-based apps.
 *
 * TASK 57: GitHub Integration (Phase 9 - GOD MODE)
 *
 * Features:
 * - Personal Access Token authentication
 * - GitHub OAuth Device Flow support
 * - Issue creation via GitHub REST API
 * - Repository info and labels retrieval
 * - Issue template fetching
 * - Token secure storage (localStorage with prefix)
 */

import type { IssueDraft } from '../types/issue-generator'

/**
 * GitHub authentication method
 */
export type GitHubAuthMethod = 'pat' | 'oauth-device'

/**
 * GitHub authentication state
 */
export interface GitHubAuthState {
  /** Whether the user is authenticated */
  authenticated: boolean
  /** Authentication method used */
  method?: GitHubAuthMethod
  /** Authenticated user info */
  user?: GitHubUser
  /** Token scopes */
  scopes?: string[]
  /** Error message if authentication failed */
  error?: string
}

/**
 * GitHub user info (minimal)
 */
export interface GitHubUser {
  /** GitHub username */
  login: string
  /** Display name */
  name: string | null
  /** Avatar URL */
  avatarUrl: string
  /** Profile URL */
  htmlUrl: string
}

/**
 * GitHub repository info (minimal)
 */
export interface GitHubRepository {
  /** Full name (owner/repo) */
  fullName: string
  /** Repository owner */
  owner: string
  /** Repository name */
  name: string
  /** Description */
  description: string | null
  /** HTML URL */
  htmlUrl: string
  /** Whether issues are enabled */
  hasIssues: boolean
  /** Default branch */
  defaultBranch: string
}

/**
 * GitHub label
 */
export interface GitHubLabel {
  /** Label ID */
  id: number
  /** Label name */
  name: string
  /** Label color (hex without #) */
  color: string
  /** Label description */
  description: string | null
}

/**
 * GitHub issue template
 */
export interface GitHubIssueTemplate {
  /** Template name */
  name: string
  /** Template description */
  about: string
  /** Template body */
  body: string
  /** Template title (can include placeholders) */
  title: string
  /** Suggested labels */
  labels: string[]
  /** Suggested assignees */
  assignees: string[]
}

/**
 * Result of creating a GitHub issue
 */
export interface GitHubIssueResult {
  /** Whether the issue was created successfully */
  success: boolean
  /** Created issue number */
  number?: number
  /** Created issue URL */
  htmlUrl?: string
  /** Created issue ID */
  id?: number
  /** Error message if creation failed */
  error?: string
}

/**
 * OAuth Device Flow response
 */
export interface DeviceCodeResponse {
  /** Device code for polling */
  deviceCode: string
  /** User code to enter */
  userCode: string
  /** Verification URL */
  verificationUri: string
  /** Expiration in seconds */
  expiresIn: number
  /** Polling interval in seconds */
  interval: number
}

/**
 * GitHub API client configuration
 */
export interface GitHubApiConfig {
  /** Repository owner */
  owner: string
  /** Repository name */
  repo: string
  /** GitHub API base URL (default: https://api.github.com) */
  apiBaseUrl: string
  /** OAuth Client ID for Device Flow (optional) */
  oauthClientId?: string
}

/**
 * Default API configuration
 */
export const DEFAULT_GITHUB_API_CONFIG: GitHubApiConfig = {
  owner: '',
  repo: '',
  apiBaseUrl: 'https://api.github.com',
}

/**
 * Storage key for GitHub token
 */
export const GITHUB_TOKEN_STORAGE_KEY = 'isocubic_github_token'

/**
 * Storage key for GitHub auth method
 */
export const GITHUB_AUTH_METHOD_KEY = 'isocubic_github_auth_method'

/**
 * GitHub API client class
 */
export class GitHubApiClient {
  private config: GitHubApiConfig
  private token: string | null = null
  private authMethod: GitHubAuthMethod | null = null

  constructor(config: Partial<GitHubApiConfig> = {}) {
    this.config = { ...DEFAULT_GITHUB_API_CONFIG, ...config }
    this.loadToken()
  }

  /**
   * Gets current configuration
   */
  getConfig(): GitHubApiConfig {
    return { ...this.config }
  }

  /**
   * Updates configuration
   */
  updateConfig(config: Partial<GitHubApiConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Gets the full repo path (owner/repo)
   */
  getRepoPath(): string {
    return `${this.config.owner}/${this.config.repo}`
  }

  // --- Authentication ---

  /**
   * Loads token from localStorage
   */
  private loadToken(): void {
    try {
      this.token = localStorage.getItem(GITHUB_TOKEN_STORAGE_KEY)
      const method = localStorage.getItem(GITHUB_AUTH_METHOD_KEY)
      this.authMethod = method as GitHubAuthMethod | null
    } catch {
      // localStorage not available
      this.token = null
      this.authMethod = null
    }
  }

  /**
   * Saves token to localStorage
   */
  private saveToken(token: string, method: GitHubAuthMethod): void {
    try {
      localStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, token)
      localStorage.setItem(GITHUB_AUTH_METHOD_KEY, method)
      this.token = token
      this.authMethod = method
    } catch {
      // localStorage not available
    }
  }

  /**
   * Clears stored token
   */
  clearToken(): void {
    try {
      localStorage.removeItem(GITHUB_TOKEN_STORAGE_KEY)
      localStorage.removeItem(GITHUB_AUTH_METHOD_KEY)
    } catch {
      // localStorage not available
    }
    this.token = null
    this.authMethod = null
  }

  /**
   * Checks if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.token !== null && this.token.length > 0
  }

  /**
   * Gets current auth state
   */
  async getAuthState(): Promise<GitHubAuthState> {
    if (!this.isAuthenticated()) {
      return { authenticated: false }
    }

    try {
      const user = await this.getAuthenticatedUser()
      return {
        authenticated: true,
        method: this.authMethod ?? undefined,
        user,
      }
    } catch {
      return {
        authenticated: false,
        error: 'Token is invalid or expired',
      }
    }
  }

  /**
   * Authenticates with Personal Access Token
   */
  async authenticateWithPAT(token: string): Promise<GitHubAuthState> {
    this.token = token
    try {
      const user = await this.getAuthenticatedUser()
      this.saveToken(token, 'pat')
      return {
        authenticated: true,
        method: 'pat',
        user,
      }
    } catch (error) {
      this.token = null
      return {
        authenticated: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      }
    }
  }

  /**
   * Initiates OAuth Device Flow
   * Returns device code info for user to enter at GitHub
   */
  async initiateDeviceFlow(): Promise<DeviceCodeResponse> {
    if (!this.config.oauthClientId) {
      throw new Error('OAuth Client ID is required for Device Flow')
    }

    const response = await fetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.config.oauthClientId,
        scope: 'repo',
      }),
    })

    if (!response.ok) {
      throw new Error(`Device flow initiation failed: ${response.status}`)
    }

    const data = await response.json()
    return {
      deviceCode: data.device_code,
      userCode: data.user_code,
      verificationUri: data.verification_uri,
      expiresIn: data.expires_in,
      interval: data.interval,
    }
  }

  /**
   * Polls for OAuth Device Flow token
   * Returns the token when user completes authorization
   */
  async pollDeviceToken(deviceCode: string, interval: number): Promise<GitHubAuthState> {
    if (!this.config.oauthClientId) {
      throw new Error('OAuth Client ID is required for Device Flow')
    }

    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.config.oauthClientId,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    })

    if (!response.ok) {
      throw new Error(`Token polling failed: ${response.status}`)
    }

    const data = await response.json()

    if (data.error === 'authorization_pending') {
      // User hasn't authorized yet, need to keep polling
      return {
        authenticated: false,
        error: 'authorization_pending',
      }
    }

    if (data.error === 'slow_down') {
      // Need to increase polling interval
      return {
        authenticated: false,
        error: `slow_down:${interval + 5}`,
      }
    }

    if (data.error) {
      return {
        authenticated: false,
        error: data.error_description || data.error,
      }
    }

    if (data.access_token) {
      return this.authenticateWithPAT(data.access_token)
    }

    return {
      authenticated: false,
      error: 'Unexpected response from GitHub',
    }
  }

  /**
   * Signs out the user
   */
  signOut(): void {
    this.clearToken()
  }

  // --- API Helpers ---

  /**
   * Makes an authenticated API request
   */
  private async apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = path.startsWith('http') ? path : `${this.config.apiBaseUrl}${path}`

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      ...((options.headers as Record<string, string>) || {}),
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json'
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(errorData.message || `GitHub API error: ${response.status}`)
    }

    return response.json() as Promise<T>
  }

  // --- User ---

  /**
   * Gets the authenticated user
   */
  async getAuthenticatedUser(): Promise<GitHubUser> {
    interface GitHubUserResponse {
      login: string
      name: string | null
      avatar_url: string
      html_url: string
    }
    const data = await this.apiRequest<GitHubUserResponse>('/user')
    return {
      login: data.login,
      name: data.name,
      avatarUrl: data.avatar_url,
      htmlUrl: data.html_url,
    }
  }

  // --- Repository ---

  /**
   * Gets repository information
   */
  async getRepository(owner?: string, repo?: string): Promise<GitHubRepository> {
    const o = owner || this.config.owner
    const r = repo || this.config.repo

    if (!o || !r) {
      throw new Error('Repository owner and name are required')
    }

    interface GitHubRepoResponse {
      full_name: string
      owner: { login: string }
      name: string
      description: string | null
      html_url: string
      has_issues: boolean
      default_branch: string
    }
    const data = await this.apiRequest<GitHubRepoResponse>(`/repos/${o}/${r}`)
    return {
      fullName: data.full_name,
      owner: data.owner.login,
      name: data.name,
      description: data.description,
      htmlUrl: data.html_url,
      hasIssues: data.has_issues,
      defaultBranch: data.default_branch,
    }
  }

  // --- Labels ---

  /**
   * Gets repository labels
   */
  async getLabels(owner?: string, repo?: string): Promise<GitHubLabel[]> {
    const o = owner || this.config.owner
    const r = repo || this.config.repo

    if (!o || !r) {
      throw new Error('Repository owner and name are required')
    }

    interface GitHubLabelResponse {
      id: number
      name: string
      color: string
      description: string | null
    }
    const data = await this.apiRequest<GitHubLabelResponse[]>(
      `/repos/${o}/${r}/labels?per_page=100`
    )
    return data.map((label) => ({
      id: label.id,
      name: label.name,
      color: label.color,
      description: label.description,
    }))
  }

  /**
   * Creates a label in the repository (if it doesn't exist)
   */
  async createLabel(name: string, color: string, description?: string): Promise<GitHubLabel> {
    const o = this.config.owner
    const r = this.config.repo

    if (!o || !r) {
      throw new Error('Repository owner and name are required')
    }

    interface GitHubLabelResponse {
      id: number
      name: string
      color: string
      description: string | null
    }
    const data = await this.apiRequest<GitHubLabelResponse>(`/repos/${o}/${r}/labels`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        color: color.replace('#', ''),
        description: description || null,
      }),
    })
    return {
      id: data.id,
      name: data.name,
      color: data.color,
      description: data.description,
    }
  }

  // --- Issue Templates ---

  /**
   * Gets issue templates from repository
   */
  async getIssueTemplates(): Promise<GitHubIssueTemplate[]> {
    const o = this.config.owner
    const r = this.config.repo

    if (!o || !r) {
      return []
    }

    try {
      interface GitHubContentResponse {
        name: string
        content: string
        encoding: string
      }
      // Try .github/ISSUE_TEMPLATE directory
      const items = await this.apiRequest<GitHubContentResponse[]>(
        `/repos/${o}/${r}/contents/.github/ISSUE_TEMPLATE`
      )

      const templates: GitHubIssueTemplate[] = []
      for (const item of items) {
        if (
          item.name.endsWith('.md') ||
          item.name.endsWith('.yml') ||
          item.name.endsWith('.yaml')
        ) {
          try {
            const content = await this.apiRequest<GitHubContentResponse>(
              `/repos/${o}/${r}/contents/.github/ISSUE_TEMPLATE/${item.name}`
            )
            const decoded = atob(content.content)
            const template = parseIssueTemplate(decoded, item.name)
            if (template) {
              templates.push(template)
            }
          } catch {
            // Skip templates that can't be parsed
          }
        }
      }
      return templates
    } catch {
      // No issue templates found
      return []
    }
  }

  // --- Issues ---

  /**
   * Creates a GitHub issue from an IssueDraft
   */
  async createIssue(draft: IssueDraft): Promise<GitHubIssueResult> {
    const o = this.config.owner
    const r = this.config.repo

    if (!o || !r) {
      return {
        success: false,
        error: 'Repository owner and name are required',
      }
    }

    if (!this.isAuthenticated()) {
      return {
        success: false,
        error: 'Authentication required',
      }
    }

    try {
      interface GitHubIssueResponse {
        id: number
        number: number
        html_url: string
      }

      const body: Record<string, unknown> = {
        title: draft.title,
        body: draft.body,
      }

      // Only include labels if they exist
      if (draft.labels && draft.labels.length > 0) {
        body.labels = draft.labels
      }

      // Only include assignees if they exist
      if (draft.assignees && draft.assignees.length > 0) {
        body.assignees = draft.assignees
      }

      // Only include milestone if it exists
      if (draft.milestone) {
        body.milestone = parseInt(draft.milestone, 10) || undefined
      }

      const data = await this.apiRequest<GitHubIssueResponse>(`/repos/${o}/${r}/issues`, {
        method: 'POST',
        body: JSON.stringify(body),
      })

      return {
        success: true,
        number: data.number,
        htmlUrl: data.html_url,
        id: data.id,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create issue',
      }
    }
  }
}

// --- Utility Functions ---

/**
 * Parses a GitHub issue template from markdown/yaml content
 */
export function parseIssueTemplate(content: string, filename: string): GitHubIssueTemplate | null {
  try {
    // Simple frontmatter parser for issue templates
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/)
    if (!frontmatterMatch) {
      return {
        name: filename.replace(/\.(md|yml|yaml)$/, ''),
        about: '',
        body: content,
        title: '',
        labels: [],
        assignees: [],
      }
    }

    const frontmatter = frontmatterMatch[1]
    const body = frontmatterMatch[2].trim()

    const getName = (fm: string): string => {
      const match = fm.match(/^name:\s*["']?(.+?)["']?\s*$/m)
      return match ? match[1] : filename.replace(/\.(md|yml|yaml)$/, '')
    }

    const getAbout = (fm: string): string => {
      const match = fm.match(/^about:\s*["']?(.+?)["']?\s*$/m)
      return match ? match[1] : ''
    }

    const getTitle = (fm: string): string => {
      const match = fm.match(/^title:\s*["']?(.+?)["']?\s*$/m)
      return match ? match[1].trim() : ''
    }

    const getLabels = (fm: string): string[] => {
      const match = fm.match(/^labels:\s*\[(.+)\]\s*$/m)
      if (match) {
        return match[1].split(',').map((l) => l.trim().replace(/["']/g, ''))
      }
      const multiLineMatch = fm.match(/^labels:\s*\n((?:\s*-\s*.+\n?)+)/m)
      if (multiLineMatch) {
        return multiLineMatch[1]
          .split('\n')
          .map((l) => l.replace(/^\s*-\s*["']?|["']?\s*$/g, ''))
          .filter(Boolean)
      }
      return []
    }

    const getAssignees = (fm: string): string[] => {
      const match = fm.match(/^assignees:\s*\[(.+)\]\s*$/m)
      if (match) {
        return match[1].split(',').map((a) => a.trim().replace(/["']/g, ''))
      }
      return []
    }

    return {
      name: getName(frontmatter),
      about: getAbout(frontmatter),
      body,
      title: getTitle(frontmatter),
      labels: getLabels(frontmatter),
      assignees: getAssignees(frontmatter),
    }
  } catch {
    return null
  }
}

// --- Singleton ---

let defaultClient: GitHubApiClient | null = null

/**
 * Gets or creates the default GitHub API client
 */
export function getDefaultGitHubClient(config?: Partial<GitHubApiConfig>): GitHubApiClient {
  if (!defaultClient) {
    defaultClient = new GitHubApiClient(config)
  } else if (config) {
    defaultClient.updateConfig(config)
  }
  return defaultClient
}

/**
 * Creates a new GitHub API client instance
 */
export function createGitHubClient(config?: Partial<GitHubApiConfig>): GitHubApiClient {
  return new GitHubApiClient(config)
}

/**
 * Resets the default client (for testing)
 */
export function resetDefaultGitHubClient(): void {
  defaultClient = null
}
