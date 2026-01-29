/**
 * SharePanel component for managing share links (TASK 46)
 * Provides UI for creating, viewing, and managing share links for cubes
 *
 * Features:
 * - Generate unique share links for cubes
 * - QR code generation for mobile sharing
 * - Password protection for private links
 * - Link expiration settings
 * - Copy to clipboard functionality
 * - Analytics overview
 * - Developer Mode metadata support
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import type { SpectralCube } from '../types/cube'
import type { ComponentMeta } from '../types/component-meta'
import type { ShareLink, ShareLinkVisibility, LinkExpiration } from '../types/share'
import { VISIBILITY_INFO, EXPIRATION_INFO, DEFAULT_QR_CONFIG } from '../types/share'
import { shareLinkService, generateQRCode } from '../lib/share-links'
import { registerComponentMeta } from '../types/component-meta'
import { ComponentInfo } from './ComponentInfo'
import { useIsDevModeEnabled } from '../lib/devmode'

/**
 * Component metadata for Developer Mode
 */
export const SHARE_PANEL_META: ComponentMeta = {
  id: 'share-panel',
  name: 'SharePanel',
  version: '1.0.0',
  summary: 'Share link management panel for cube configurations.',
  description:
    'SharePanel provides a comprehensive UI for creating and managing share links for cubes. ' +
    'It supports generating unique short URLs, QR codes for mobile sharing, password protection ' +
    'for private links, configurable expiration times, and clipboard copying. The panel also ' +
    'displays a list of created share links with analytics and management options.',
  phase: 7,
  taskId: 'TASK 46',
  filePath: 'components/SharePanel.tsx',
  history: [
    {
      version: '1.0.0',
      date: '2026-01-29T22:00:00Z',
      description:
        'Initial implementation with share link creation, QR codes, password protection, and analytics',
      taskId: 'TASK 46',
      type: 'created',
    },
  ],
  features: [
    {
      id: 'link-generation',
      name: 'Link Generation',
      description: 'Generate unique short URLs for sharing cubes',
      enabled: true,
      taskId: 'TASK 46',
    },
    {
      id: 'qr-code',
      name: 'QR Code',
      description: 'Generate QR codes for mobile sharing',
      enabled: true,
      taskId: 'TASK 46',
    },
    {
      id: 'password-protection',
      name: 'Password Protection',
      description: 'Protect share links with a password',
      enabled: true,
      taskId: 'TASK 46',
    },
    {
      id: 'link-expiration',
      name: 'Link Expiration',
      description: 'Set automatic expiration for share links',
      enabled: true,
      taskId: 'TASK 46',
    },
    {
      id: 'clipboard-copy',
      name: 'Clipboard Copy',
      description: 'Copy share link URL to clipboard',
      enabled: true,
      taskId: 'TASK 46',
    },
    {
      id: 'link-analytics',
      name: 'Link Analytics',
      description: 'View basic analytics for share links',
      enabled: true,
      taskId: 'TASK 46',
    },
  ],
  dependencies: [
    {
      name: '../lib/share-links',
      type: 'lib',
      purpose: 'Share link service and QR code generation',
    },
    {
      name: '../types/share',
      type: 'lib',
      purpose: 'Share link type definitions',
    },
  ],
  relatedFiles: [
    { path: 'types/share.ts', type: 'type', description: 'Share link type definitions' },
    { path: 'lib/share-links.ts', type: 'util', description: 'Share link service' },
    {
      path: 'components/SharePanel.test.tsx',
      type: 'test',
      description: 'Unit tests for SharePanel',
    },
  ],
  props: [
    {
      name: 'currentCube',
      type: 'SpectralCube | null',
      required: true,
      description: 'Current cube configuration to share',
    },
    {
      name: 'onShareLinkCreated',
      type: '(shareLink: ShareLink) => void',
      required: false,
      description: 'Callback when a share link is created',
    },
    {
      name: 'className',
      type: 'string',
      required: false,
      defaultValue: "''",
      description: 'Additional CSS class name',
    },
  ],
  tips: [
    'Use password protection for sensitive cube configurations',
    'QR codes work great for sharing on mobile devices',
    'Set expiration for temporary shares',
    'Copy link to clipboard for quick sharing',
  ],
  knownIssues: [
    'QR code generation uses a simplified algorithm - consider a proper library for production',
    'Share links are stored in localStorage - may be lost on browser data clear',
  ],
  tags: ['share', 'links', 'qr-code', 'social', 'phase-7'],
  status: 'stable',
  lastUpdated: '2026-01-29T22:00:00Z',
}

// Register metadata in the global registry
registerComponentMeta(SHARE_PANEL_META)

/**
 * Props for SharePanel component
 */
export interface SharePanelProps {
  /** Current cube configuration */
  currentCube: SpectralCube | null
  /** Callback when a share link is created */
  onShareLinkCreated?: (shareLink: ShareLink) => void
  /** Custom class name */
  className?: string
}

/**
 * SharePanel component
 * Provides share link creation and management UI
 */
export function SharePanel({ currentCube, onShareLinkCreated, className = '' }: SharePanelProps) {
  // State for share link creation
  const [visibility, setVisibility] = useState<ShareLinkVisibility>('public')
  const [password, setPassword] = useState('')
  const [expiration, setExpiration] = useState<LinkExpiration>('never')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)

  // State for created share link
  const [createdLink, setCreatedLink] = useState<ShareLink | null>(null)
  const [qrCodeSvg, setQrCodeSvg] = useState<string | null>(null)
  const [isGeneratingQR, setIsGeneratingQR] = useState(false)

  // State for share links list
  const [userLinks, setUserLinks] = useState<ShareLink[]>([])
  const [isLoadingLinks, setIsLoadingLinks] = useState(false)
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null)

  // Copy to clipboard state
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // DevMode state
  const isDevModeEnabled = useIsDevModeEnabled()

  /**
   * Loads user's share links
   */
  const loadUserLinks = useCallback(async () => {
    setIsLoadingLinks(true)
    try {
      const links = await shareLinkService.getUserShareLinks()
      setUserLinks(links)
    } catch {
      // Ignore errors, keep empty list
    } finally {
      setIsLoadingLinks(false)
    }
  }, [])

  // Load user's share links on mount
  useEffect(() => {
    loadUserLinks()
  }, [loadUserLinks])

  // Clear messages after timeout
  useEffect(() => {
    if (createError) {
      const timer = setTimeout(() => setCreateError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [createError])

  useEffect(() => {
    if (createSuccess) {
      const timer = setTimeout(() => setCreateSuccess(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [createSuccess])

  // Reset copied state after timeout
  useEffect(() => {
    if (copiedId) {
      const timer = setTimeout(() => setCopiedId(null), 2000)
      return () => clearTimeout(timer)
    }
  }, [copiedId])

  /**
   * Creates a new share link
   */
  const handleCreateLink = useCallback(async () => {
    if (!currentCube) return

    setIsCreating(true)
    setCreateError(null)
    setCreatedLink(null)
    setQrCodeSvg(null)

    try {
      const result = await shareLinkService.createShareLink({
        cube: currentCube,
        visibility,
        password: visibility === 'protected' ? password : undefined,
        expiration,
      })

      if (result.success && result.shareLink) {
        setCreatedLink(result.shareLink)
        setCreateSuccess('Share link created successfully!')
        onShareLinkCreated?.(result.shareLink)

        // Generate QR code automatically
        setIsGeneratingQR(true)
        const qrResult = await generateQRCode(result.shareLink.url, DEFAULT_QR_CONFIG)
        if (qrResult.success && qrResult.data) {
          setQrCodeSvg(qrResult.data)
        }
        setIsGeneratingQR(false)

        // Refresh links list
        loadUserLinks()

        // Reset form
        setPassword('')
      } else {
        setCreateError(result.error || 'Failed to create share link')
      }
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create share link')
    } finally {
      setIsCreating(false)
    }
  }, [currentCube, visibility, password, expiration, onShareLinkCreated, loadUserLinks])

  /**
   * Copies link URL to clipboard
   */
  const handleCopyLink = useCallback(async (link: ShareLink) => {
    const result = await shareLinkService.copyToClipboard(link)
    if (result.success) {
      setCopiedId(link.id)
    }
  }, [])

  /**
   * Deletes a share link
   */
  const handleDeleteLink = useCallback(
    async (id: string) => {
      const result = await shareLinkService.deleteShareLink(id)
      if (result.success) {
        loadUserLinks()
        if (createdLink?.id === id) {
          setCreatedLink(null)
          setQrCodeSvg(null)
        }
      }
    },
    [loadUserLinks, createdLink]
  )

  /**
   * Toggles link active status
   */
  const handleToggleActive = useCallback(
    async (link: ShareLink) => {
      await shareLinkService.updateShareLink(link.id, { isActive: !link.isActive })
      loadUserLinks()
    },
    [loadUserLinks]
  )

  /**
   * Generates QR code for a link
   */
  const handleGenerateQR = useCallback(async (link: ShareLink) => {
    setSelectedLinkId(link.id)
    setIsGeneratingQR(true)
    try {
      const result = await generateQRCode(link.url, DEFAULT_QR_CONFIG)
      if (result.success && result.data) {
        setQrCodeSvg(result.data)
        setCreatedLink(link)
      }
    } finally {
      setIsGeneratingQR(false)
    }
  }, [])

  /**
   * Downloads QR code as SVG
   */
  const handleDownloadQR = useCallback(() => {
    if (!qrCodeSvg || !createdLink) return

    const blob = new Blob([qrCodeSvg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-${createdLink.id}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }, [qrCodeSvg, createdLink])

  /**
   * Formats date for display
   */
  const formatDate = (isoDate: string): string => {
    try {
      return new Date(isoDate).toLocaleDateString()
    } catch {
      return isoDate
    }
  }

  /**
   * Gets visibility icon
   */
  const getVisibilityIcon = (v: ShareLinkVisibility): string => {
    return VISIBILITY_INFO[v].icon
  }

  // Memoized active links count
  const activeLinksCount = useMemo(
    () => userLinks.filter((link) => link.isActive).length,
    [userLinks]
  )

  const panelContent = (
    <div className={`share-panel ${className}`} data-testid="share-panel">
      {/* Create New Share Link Section */}
      <div className="share-panel__create">
        <h3 className="share-panel__title">Create Share Link</h3>

        {/* Visibility Selection */}
        <div className="share-panel__field">
          <label className="share-panel__label" htmlFor="visibility">
            Visibility
          </label>
          <select
            id="visibility"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as ShareLinkVisibility)}
            className="share-panel__select"
            data-testid="visibility-select"
          >
            {Object.entries(VISIBILITY_INFO).map(([key, info]) => (
              <option key={key} value={key}>
                {info.icon} {info.label}
              </option>
            ))}
          </select>
          <p className="share-panel__hint">{VISIBILITY_INFO[visibility].description}</p>
        </div>

        {/* Password Field (for protected links) */}
        {visibility === 'protected' && (
          <div className="share-panel__field">
            <label className="share-panel__label" htmlFor="password">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password for protected link"
              className="share-panel__input"
              data-testid="password-input"
            />
          </div>
        )}

        {/* Expiration Selection */}
        <div className="share-panel__field">
          <label className="share-panel__label" htmlFor="expiration">
            Expiration
          </label>
          <select
            id="expiration"
            value={expiration}
            onChange={(e) => setExpiration(e.target.value as LinkExpiration)}
            className="share-panel__select"
            data-testid="expiration-select"
          >
            {Object.entries(EXPIRATION_INFO).map(([key, info]) => (
              <option key={key} value={key} disabled={key === 'custom'}>
                {info.label}
              </option>
            ))}
          </select>
          <p className="share-panel__hint">{EXPIRATION_INFO[expiration].description}</p>
        </div>

        {/* Create Button */}
        <button
          type="button"
          onClick={handleCreateLink}
          disabled={!currentCube || isCreating || (visibility === 'protected' && !password)}
          className="share-panel__button share-panel__button--primary"
          data-testid="create-link-button"
        >
          {isCreating ? 'Creating...' : 'Create Share Link'}
        </button>

        {/* Status Messages */}
        {createError && (
          <div className="share-panel__message share-panel__message--error" role="alert">
            {createError}
          </div>
        )}
        {createSuccess && (
          <div className="share-panel__message share-panel__message--success" role="status">
            {createSuccess}
          </div>
        )}
      </div>

      {/* Created Link Display */}
      {createdLink && (
        <div className="share-panel__result" data-testid="created-link-result">
          <h4 className="share-panel__subtitle">Your Share Link</h4>

          {/* Link URL */}
          <div className="share-panel__link-display">
            <input
              type="text"
              value={createdLink.url}
              readOnly
              className="share-panel__link-input"
              data-testid="share-link-url"
            />
            <button
              type="button"
              onClick={() => handleCopyLink(createdLink)}
              className="share-panel__button share-panel__button--copy"
              data-testid="copy-link-button"
            >
              {copiedId === createdLink.id ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* QR Code */}
          {qrCodeSvg && (
            <div className="share-panel__qr" data-testid="qr-code-container">
              <div
                className="share-panel__qr-image"
                dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
              />
              <button
                type="button"
                onClick={handleDownloadQR}
                className="share-panel__button share-panel__button--secondary"
                data-testid="download-qr-button"
              >
                Download QR Code
              </button>
            </div>
          )}
          {isGeneratingQR && <div className="share-panel__qr-loading">Generating QR code...</div>}

          {/* Link Info */}
          <div className="share-panel__link-info">
            <span className="share-panel__info-item">
              {getVisibilityIcon(createdLink.visibility)}{' '}
              {VISIBILITY_INFO[createdLink.visibility].label}
            </span>
            <span className="share-panel__info-item">
              Expires: {createdLink.expiresAt ? formatDate(createdLink.expiresAt) : 'Never'}
            </span>
          </div>
        </div>
      )}

      {/* Existing Share Links List */}
      <div className="share-panel__links">
        <h3 className="share-panel__title">
          Your Share Links {activeLinksCount > 0 && `(${activeLinksCount} active)`}
        </h3>

        {isLoadingLinks && <div className="share-panel__loading">Loading links...</div>}

        {!isLoadingLinks && userLinks.length === 0 && (
          <div className="share-panel__empty">No share links created yet</div>
        )}

        {!isLoadingLinks && userLinks.length > 0 && (
          <ul className="share-panel__links-list" data-testid="share-links-list">
            {userLinks.map((link) => (
              <li
                key={link.id}
                className={`share-panel__link-item ${!link.isActive ? 'share-panel__link-item--inactive' : ''}`}
                data-testid={`share-link-item-${link.id}`}
              >
                <div className="share-panel__link-header">
                  <span className="share-panel__link-name">
                    {getVisibilityIcon(link.visibility)} {link.cube.meta?.name || link.cube.id}
                  </span>
                  <span className="share-panel__link-date">{formatDate(link.createdAt)}</span>
                </div>

                <div className="share-panel__link-url">{link.shortUrl}</div>

                <div className="share-panel__link-stats">
                  <span title="Views">{link.analytics.totalViews} views</span>
                  <span title="Unique visitors">{link.analytics.uniqueVisitors} unique</span>
                </div>

                <div className="share-panel__link-actions">
                  <button
                    type="button"
                    onClick={() => handleCopyLink(link)}
                    className="share-panel__button share-panel__button--small"
                    title="Copy link"
                  >
                    {copiedId === link.id ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerateQR(link)}
                    className="share-panel__button share-panel__button--small"
                    title="Show QR code"
                    disabled={isGeneratingQR && selectedLinkId === link.id}
                  >
                    QR
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(link)}
                    className="share-panel__button share-panel__button--small"
                    title={link.isActive ? 'Deactivate link' : 'Activate link'}
                  >
                    {link.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteLink(link.id)}
                    className="share-panel__button share-panel__button--small share-panel__button--danger"
                    title="Delete link"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )

  return isDevModeEnabled ? (
    <ComponentInfo meta={SHARE_PANEL_META}>{panelContent}</ComponentInfo>
  ) : (
    panelContent
  )
}

export default SharePanel
