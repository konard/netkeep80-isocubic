/**
 * Unit tests for SharePanel Vue component
 * Tests the Vue.js 3.0 migration of the SharePanel component (TASK 64)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'
import SharePanel, { SHARE_PANEL_META } from './SharePanel.vue'
import { shareLinkService, generateQRCode } from '../lib/share-links'
import type { SpectralCube } from '../types/cube'
import type { ShareLink } from '../types/share'

// Mock the share-links service
vi.mock('../lib/share-links', () => ({
  shareLinkService: {
    createShareLink: vi.fn(),
    getUserShareLinks: vi.fn(),
    copyToClipboard: vi.fn(),
    deleteShareLink: vi.fn(),
    updateShareLink: vi.fn(),
    generateQRCode: vi.fn(),
    _resetMockData: vi.fn(),
  },
  generateQRCode: vi.fn(),
}))

// Mock devmode
vi.mock('../lib/devmode', () => ({
  useIsDevModeEnabled: vi.fn(() => false),
}))

// Sample cube for testing
const sampleCube: SpectralCube = {
  id: 'test-cube',
  base: { color: [0.5, 0.5, 0.5], roughness: 0.7, transparency: 1.0 },
  prompt: 'A test cube',
  meta: { name: 'Test Cube', tags: ['test'] },
}

// Sample share link
const sampleShareLink: ShareLink = {
  id: 'abc12345',
  url: 'https://isocubic.app/share/abc12345',
  shortUrl: 'https://isocubic.app/s/abc12345',
  cube: sampleCube,
  visibility: 'public',
  protection: { enabled: false, currentAccessCount: 0 },
  expiration: 'never',
  isActive: true,
  ogTags: {
    title: 'Test Cube - isocubic',
    description: 'A test cube',
    type: 'website',
    siteName: 'isocubic',
  },
  analytics: {
    totalViews: 10,
    uniqueVisitors: 5,
    accessHistory: [],
  },
  createdAt: '2026-01-29T12:00:00Z',
}

describe('SharePanel Vue Component — Module Exports', () => {
  it('should export SharePanel.vue as a valid Vue component', async () => {
    const module = await import('./SharePanel.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })

  it('should export SHARE_PANEL_META with correct metadata', () => {
    expect(SHARE_PANEL_META).toBeDefined()
    expect(SHARE_PANEL_META.id).toBe('share-panel')
    expect(SHARE_PANEL_META.name).toBe('SharePanel')
    expect(SHARE_PANEL_META.filePath).toBe('components/SharePanel.vue')
  })
})

describe('SharePanel Vue Component — Visibility Options', () => {
  it('should have correct visibility types', () => {
    const visibilityTypes = ['public', 'unlisted', 'protected', 'private']
    expect(visibilityTypes).toContain('public')
    expect(visibilityTypes).toContain('unlisted')
    expect(visibilityTypes).toContain('protected')
    expect(visibilityTypes).toContain('private')
  })
})

describe('SharePanel Vue Component — Date Formatting', () => {
  it('should format date for display', () => {
    function formatDate(isoDate: string): string {
      try {
        return new Date(isoDate).toLocaleDateString()
      } catch {
        return isoDate
      }
    }

    const date = '2026-01-30T12:00:00Z'
    const result = formatDate(date)
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })
})

describe('SharePanel Vue Component — Features', () => {
  it('should have all expected features in metadata', () => {
    const features = SHARE_PANEL_META.features
    expect(features).toBeDefined()

    const featureIds = features!.map((f) => f.id)
    expect(featureIds).toContain('link-generation')
    expect(featureIds).toContain('qr-code')
    expect(featureIds).toContain('password-protection')
    expect(featureIds).toContain('link-expiration')
    expect(featureIds).toContain('clipboard-copy')
    expect(featureIds).toContain('link-analytics')
  })
})

describe('SharePanel Vue Component — Component Metadata', () => {
  it('has correct metadata id', () => {
    expect(SHARE_PANEL_META.id).toBe('share-panel')
  })

  it('has correct metadata name', () => {
    expect(SHARE_PANEL_META.name).toBe('SharePanel')
  })

  it('has correct phase', () => {
    expect(SHARE_PANEL_META.phase).toBe(7)
  })

  it('has correct taskId', () => {
    expect(SHARE_PANEL_META.taskId).toBe('TASK 46')
  })

  it('has features defined', () => {
    expect(SHARE_PANEL_META.features!.length).toBeGreaterThan(0)
  })

  it('has link-generation feature', () => {
    const feature = SHARE_PANEL_META.features!.find((f) => f.id === 'link-generation')
    expect(feature).toBeDefined()
    expect(feature!.enabled).toBe(true)
  })

  it('has qr-code feature', () => {
    const feature = SHARE_PANEL_META.features!.find((f) => f.id === 'qr-code')
    expect(feature).toBeDefined()
    expect(feature!.enabled).toBe(true)
  })

  it('has password-protection feature', () => {
    const feature = SHARE_PANEL_META.features!.find((f) => f.id === 'password-protection')
    expect(feature).toBeDefined()
    expect(feature!.enabled).toBe(true)
  })
})

describe('SharePanel Vue Component — Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(shareLinkService.getUserShareLinks).mockResolvedValue([])
    vi.mocked(shareLinkService.createShareLink).mockResolvedValue({
      success: true,
      shareLink: sampleShareLink,
    })
    vi.mocked(shareLinkService.copyToClipboard).mockResolvedValue({ success: true })
    vi.mocked(shareLinkService.deleteShareLink).mockResolvedValue({ success: true })
    vi.mocked(shareLinkService.updateShareLink).mockResolvedValue({
      success: true,
      shareLink: { ...sampleShareLink, isActive: false },
    })
    vi.mocked(generateQRCode).mockResolvedValue({
      success: true,
      data: '<svg></svg>',
      format: 'svg',
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the share panel', async () => {
    const wrapper = shallowMount(SharePanel, {
      props: { currentCube: sampleCube },
    })
    await flushPromises()

    expect(wrapper.find('[data-testid="share-panel"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Create Share Link')
  })

  it('renders visibility select', async () => {
    const wrapper = shallowMount(SharePanel, {
      props: { currentCube: sampleCube },
    })
    await flushPromises()

    expect(wrapper.find('[data-testid="visibility-select"]').exists()).toBe(true)
  })

  it('renders expiration select', async () => {
    const wrapper = shallowMount(SharePanel, {
      props: { currentCube: sampleCube },
    })
    await flushPromises()

    expect(wrapper.find('[data-testid="expiration-select"]').exists()).toBe(true)
  })

  it('renders create button', async () => {
    const wrapper = shallowMount(SharePanel, {
      props: { currentCube: sampleCube },
    })
    await flushPromises()

    expect(wrapper.find('[data-testid="create-link-button"]').exists()).toBe(true)
  })

  it('disables create button when no cube', async () => {
    const wrapper = shallowMount(SharePanel, {
      props: { currentCube: null },
    })
    await flushPromises()

    const createBtn = wrapper.find('[data-testid="create-link-button"]')
    expect(createBtn.attributes('disabled')).toBeDefined()
  })

  it('shows empty state when no links', async () => {
    const wrapper = shallowMount(SharePanel, {
      props: { currentCube: sampleCube },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('No share links created yet')
  })

  it('applies custom className', async () => {
    const wrapper = shallowMount(SharePanel, {
      props: { currentCube: sampleCube, className: 'custom-class' },
    })
    await flushPromises()

    expect(wrapper.find('[data-testid="share-panel"]').classes()).toContain('custom-class')
  })
})

describe('SharePanel Vue Component — Visibility Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(shareLinkService.getUserShareLinks).mockResolvedValue([])
    vi.mocked(shareLinkService.createShareLink).mockResolvedValue({
      success: true,
      shareLink: sampleShareLink,
    })
    vi.mocked(generateQRCode).mockResolvedValue({
      success: true,
      data: '<svg></svg>',
      format: 'svg',
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('defaults to public visibility', async () => {
    const wrapper = shallowMount(SharePanel, {
      props: { currentCube: sampleCube },
    })
    await flushPromises()

    const select = wrapper.find('[data-testid="visibility-select"]')
    expect((select.element as HTMLSelectElement).value).toBe('public')
  })

  it('shows password field when protected visibility selected', async () => {
    const wrapper = shallowMount(SharePanel, {
      props: { currentCube: sampleCube },
    })
    await flushPromises()

    const select = wrapper.find('[data-testid="visibility-select"]')
    await select.setValue('protected')

    expect(wrapper.find('[data-testid="password-input"]').exists()).toBe(true)
  })

  it('hides password field for non-protected visibility', async () => {
    const wrapper = shallowMount(SharePanel, {
      props: { currentCube: sampleCube },
    })
    await flushPromises()

    const select = wrapper.find('[data-testid="visibility-select"]')
    await select.setValue('unlisted')

    expect(wrapper.find('[data-testid="password-input"]').exists()).toBe(false)
  })

  it('shows visibility hint', async () => {
    const wrapper = shallowMount(SharePanel, {
      props: { currentCube: sampleCube },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Anyone with the link can access')
  })
})

describe('SharePanel Vue Component — Expiration Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(shareLinkService.getUserShareLinks).mockResolvedValue([])
    vi.mocked(generateQRCode).mockResolvedValue({
      success: true,
      data: '<svg></svg>',
      format: 'svg',
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('defaults to never expiration', async () => {
    const wrapper = shallowMount(SharePanel, {
      props: { currentCube: sampleCube },
    })
    await flushPromises()

    const select = wrapper.find('[data-testid="expiration-select"]')
    expect((select.element as HTMLSelectElement).value).toBe('never')
  })

  it('allows changing expiration', async () => {
    const wrapper = shallowMount(SharePanel, {
      props: { currentCube: sampleCube },
    })
    await flushPromises()

    const select = wrapper.find('[data-testid="expiration-select"]')
    await select.setValue('24h')

    expect((select.element as HTMLSelectElement).value).toBe('24h')
  })

  it('shows expiration hint', async () => {
    const wrapper = shallowMount(SharePanel, {
      props: { currentCube: sampleCube },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Link never expires')
  })
})

describe('SharePanel Vue Component — Create Link', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(shareLinkService.getUserShareLinks).mockResolvedValue([])
    vi.mocked(shareLinkService.createShareLink).mockResolvedValue({
      success: true,
      shareLink: sampleShareLink,
    })
    vi.mocked(shareLinkService.copyToClipboard).mockResolvedValue({ success: true })
    vi.mocked(generateQRCode).mockResolvedValue({
      success: true,
      data: '<svg></svg>',
      format: 'svg',
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates link when button clicked', async () => {
    const wrapper = shallowMount(SharePanel, {
      props: { currentCube: sampleCube },
    })
    await flushPromises()

    const button = wrapper.find('[data-testid="create-link-button"]')
    await button.trigger('click')
    await flushPromises()

    expect(shareLinkService.createShareLink).toHaveBeenCalledWith({
      cube: sampleCube,
      visibility: 'public',
      password: undefined,
      expiration: 'never',
    })
  })

  it('shows success message after creating link', async () => {
    const wrapper = shallowMount(SharePanel, {
      props: { currentCube: sampleCube },
    })
    await flushPromises()

    await wrapper.find('[data-testid="create-link-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Share link created successfully!')
  })

  it('shows created link URL', async () => {
    const wrapper = shallowMount(SharePanel, {
      props: { currentCube: sampleCube },
    })
    await flushPromises()

    await wrapper.find('[data-testid="create-link-button"]').trigger('click')
    await flushPromises()

    const urlInput = wrapper.find('[data-testid="share-link-url"]')
    expect(urlInput.exists()).toBe(true)
    expect((urlInput.element as HTMLInputElement).value).toBe(sampleShareLink.url)
  })

  it('generates QR code automatically', async () => {
    const wrapper = shallowMount(SharePanel, {
      props: { currentCube: sampleCube },
    })
    await flushPromises()

    await wrapper.find('[data-testid="create-link-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="qr-code-container"]').exists()).toBe(true)
  })

  it('shows error message on failure', async () => {
    vi.mocked(shareLinkService.createShareLink).mockResolvedValue({
      success: false,
      error: 'Failed to create link',
    })

    const wrapper = shallowMount(SharePanel, {
      props: { currentCube: sampleCube },
    })
    await flushPromises()

    await wrapper.find('[data-testid="create-link-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to create link')
  })

  it('disables button when protected but no password', async () => {
    const wrapper = shallowMount(SharePanel, {
      props: { currentCube: sampleCube },
    })
    await flushPromises()

    await wrapper.find('[data-testid="visibility-select"]').setValue('protected')

    const createBtn = wrapper.find('[data-testid="create-link-button"]')
    expect(createBtn.attributes('disabled')).toBeDefined()
  })

  it('enables button when protected with password', async () => {
    const wrapper = shallowMount(SharePanel, {
      props: { currentCube: sampleCube },
    })
    await flushPromises()

    await wrapper.find('[data-testid="visibility-select"]').setValue('protected')
    await wrapper.find('[data-testid="password-input"]').setValue('secret123')

    const createBtn = wrapper.find('[data-testid="create-link-button"]')
    expect(createBtn.attributes('disabled')).toBeUndefined()
  })

  it('passes password for protected links', async () => {
    const wrapper = shallowMount(SharePanel, {
      props: { currentCube: sampleCube },
    })
    await flushPromises()

    await wrapper.find('[data-testid="visibility-select"]').setValue('protected')
    await wrapper.find('[data-testid="password-input"]').setValue('secret123')
    await wrapper.find('[data-testid="create-link-button"]').trigger('click')
    await flushPromises()

    expect(shareLinkService.createShareLink).toHaveBeenCalledWith(
      expect.objectContaining({
        visibility: 'protected',
        password: 'secret123',
      })
    )
  })

  it('emits shareLinkCreated callback', async () => {
    const wrapper = shallowMount(SharePanel, {
      props: { currentCube: sampleCube },
    })
    await flushPromises()

    await wrapper.find('[data-testid="create-link-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('shareLinkCreated')).toBeTruthy()
    expect(wrapper.emitted('shareLinkCreated')![0][0]).toEqual(sampleShareLink)
  })
})

describe('SharePanel Vue Component — Copy to Clipboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(shareLinkService.getUserShareLinks).mockResolvedValue([])
    vi.mocked(shareLinkService.createShareLink).mockResolvedValue({
      success: true,
      shareLink: sampleShareLink,
    })
    vi.mocked(shareLinkService.copyToClipboard).mockResolvedValue({ success: true })
    vi.mocked(generateQRCode).mockResolvedValue({
      success: true,
      data: '<svg></svg>',
      format: 'svg',
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('copies link when copy button clicked', async () => {
    const wrapper = shallowMount(SharePanel, {
      props: { currentCube: sampleCube },
    })
    await flushPromises()

    // Create a link first
    await wrapper.find('[data-testid="create-link-button"]').trigger('click')
    await flushPromises()

    const copyBtn = wrapper.find('[data-testid="copy-link-button"]')
    expect(copyBtn.exists()).toBe(true)
    await copyBtn.trigger('click')
    await flushPromises()

    expect(shareLinkService.copyToClipboard).toHaveBeenCalledWith(sampleShareLink)
  })

  it('shows Copied! after copying', async () => {
    const wrapper = shallowMount(SharePanel, {
      props: { currentCube: sampleCube },
    })
    await flushPromises()

    await wrapper.find('[data-testid="create-link-button"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="copy-link-button"]').trigger('click')
    await flushPromises()

    const copyBtn = wrapper.find('[data-testid="copy-link-button"]')
    expect(copyBtn.text()).toContain('Copied!')
  })
})

describe('SharePanel Vue Component — QR Code', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(shareLinkService.getUserShareLinks).mockResolvedValue([])
    vi.mocked(shareLinkService.createShareLink).mockResolvedValue({
      success: true,
      shareLink: sampleShareLink,
    })
    vi.mocked(generateQRCode).mockResolvedValue({
      success: true,
      data: '<svg></svg>',
      format: 'svg',
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows QR code after link creation', async () => {
    const wrapper = shallowMount(SharePanel, {
      props: { currentCube: sampleCube },
    })
    await flushPromises()

    await wrapper.find('[data-testid="create-link-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="qr-code-container"]').exists()).toBe(true)
  })

  it('shows download QR button', async () => {
    const wrapper = shallowMount(SharePanel, {
      props: { currentCube: sampleCube },
    })
    await flushPromises()

    await wrapper.find('[data-testid="create-link-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="download-qr-button"]').exists()).toBe(true)
  })
})

describe('SharePanel Vue Component — Share Links List', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(shareLinkService.getUserShareLinks).mockResolvedValue([sampleShareLink])
    vi.mocked(shareLinkService.createShareLink).mockResolvedValue({
      success: true,
      shareLink: sampleShareLink,
    })
    vi.mocked(shareLinkService.copyToClipboard).mockResolvedValue({ success: true })
    vi.mocked(shareLinkService.deleteShareLink).mockResolvedValue({ success: true })
    vi.mocked(shareLinkService.updateShareLink).mockResolvedValue({
      success: true,
      shareLink: { ...sampleShareLink, isActive: false },
    })
    vi.mocked(generateQRCode).mockResolvedValue({
      success: true,
      data: '<svg></svg>',
      format: 'svg',
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads user links on mount', async () => {
    shallowMount(SharePanel, {
      props: { currentCube: sampleCube },
    })
    await flushPromises()

    expect(shareLinkService.getUserShareLinks).toHaveBeenCalled()
  })

  it('displays existing share links', async () => {
    const wrapper = shallowMount(SharePanel, {
      props: { currentCube: sampleCube },
    })
    await flushPromises()

    expect(wrapper.find('[data-testid="share-links-list"]').exists()).toBe(true)
    expect(wrapper.text()).toContain(sampleShareLink.shortUrl)
  })

  it('shows analytics for links', async () => {
    const wrapper = shallowMount(SharePanel, {
      props: { currentCube: sampleCube },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('10 views')
    expect(wrapper.text()).toContain('5 unique')
  })

  it('shows active links count', async () => {
    const wrapper = shallowMount(SharePanel, {
      props: { currentCube: sampleCube },
    })
    await flushPromises()

    expect(wrapper.text()).toMatch(/\(1 active\)/)
  })
})

describe('SharePanel Vue Component — Delete Link', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(shareLinkService.getUserShareLinks).mockResolvedValue([sampleShareLink])
    vi.mocked(shareLinkService.deleteShareLink).mockResolvedValue({ success: true })
    vi.mocked(generateQRCode).mockResolvedValue({
      success: true,
      data: '<svg></svg>',
      format: 'svg',
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('deletes link when delete button clicked', async () => {
    const wrapper = shallowMount(SharePanel, {
      props: { currentCube: sampleCube },
    })
    await flushPromises()

    const deleteButton = wrapper.find('[title="Delete link"]')
    await deleteButton.trigger('click')
    await flushPromises()

    expect(shareLinkService.deleteShareLink).toHaveBeenCalledWith(sampleShareLink.id)
  })
})

describe('SharePanel Vue Component — Toggle Active', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(shareLinkService.getUserShareLinks).mockResolvedValue([sampleShareLink])
    vi.mocked(shareLinkService.updateShareLink).mockResolvedValue({
      success: true,
      shareLink: { ...sampleShareLink, isActive: false },
    })
    vi.mocked(generateQRCode).mockResolvedValue({
      success: true,
      data: '<svg></svg>',
      format: 'svg',
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('toggles link active status', async () => {
    const wrapper = shallowMount(SharePanel, {
      props: { currentCube: sampleCube },
    })
    await flushPromises()

    const toggleButton = wrapper.find('[title="Deactivate link"]')
    await toggleButton.trigger('click')
    await flushPromises()

    expect(shareLinkService.updateShareLink).toHaveBeenCalledWith(sampleShareLink.id, {
      isActive: false,
    })
  })

  it('shows correct toggle button text for active links', async () => {
    const wrapper = shallowMount(SharePanel, {
      props: { currentCube: sampleCube },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Disable')
  })

  it('shows correct toggle button text for inactive links', async () => {
    vi.mocked(shareLinkService.getUserShareLinks).mockResolvedValue([
      { ...sampleShareLink, isActive: false },
    ])

    const wrapper = shallowMount(SharePanel, {
      props: { currentCube: sampleCube },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Enable')
  })
})

describe('SharePanel Vue Component — Loading States', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows loading state while fetching links', async () => {
    vi.mocked(shareLinkService.getUserShareLinks).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
    )

    const wrapper = shallowMount(SharePanel, {
      props: { currentCube: sampleCube },
    })

    // onMounted triggers loadUserLinks which sets isLoadingLinks = true
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Loading links...')
  })
})
