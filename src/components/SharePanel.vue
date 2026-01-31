<!--
  SharePanel component for managing share links (Vue 3 SFC)
  Provides UI for creating, viewing, and managing share links for cubes

  TASK 46: Initial implementation
  TASK 64: Migration from React to Vue 3.0 SFC (Phase 10)

  Features:
  - Generate unique share links for cubes
  - QR code generation for mobile sharing
  - Password protection for private links
  - Link expiration settings
  - Copy to clipboard functionality
  - Analytics overview
-->
<script lang="ts">
import type { ComponentMeta } from '../types/component-meta'
import { registerComponentMeta } from '../types/component-meta'

/**
 * Component metadata for Developer Mode
 */
export const SHARE_PANEL_META: ComponentMeta = {
  id: 'share-panel',
  name: 'SharePanel',
  version: '1.1.0',
  summary: 'Share link management panel for cube configurations.',
  description:
    'SharePanel provides a comprehensive UI for creating and managing share links for cubes. ' +
    'It supports generating unique short URLs, QR codes for mobile sharing, password protection ' +
    'for private links, configurable expiration times, and clipboard copying. The panel also ' +
    'displays a list of created share links with analytics and management options.',
  phase: 7,
  taskId: 'TASK 46',
  filePath: 'components/SharePanel.vue',
  history: [
    {
      version: '1.0.0',
      date: '2026-01-29T22:00:00Z',
      description:
        'Initial implementation with share link creation, QR codes, password protection, and analytics',
      taskId: 'TASK 46',
      type: 'created',
    },
    {
      version: '1.1.0',
      date: '2026-01-31T00:00:00Z',
      description: 'Migrated from React to Vue 3.0 SFC',
      taskId: 'TASK 64',
      type: 'updated',
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
      path: 'components/SharePanel.vue.test.ts',
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
  lastUpdated: '2026-01-31T00:00:00Z',
}

// Register metadata in the global registry
registerComponentMeta(SHARE_PANEL_META)
</script>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { SpectralCube } from '../types/cube'
import type { ShareLink, ShareLinkVisibility, LinkExpiration } from '../types/share'
import { VISIBILITY_INFO, EXPIRATION_INFO, DEFAULT_QR_CONFIG } from '../types/share'
import { shareLinkService, generateQRCode } from '../lib/share-links'

/**
 * Props for SharePanel component
 */
interface SharePanelProps {
  /** Current cube configuration */
  currentCube: SpectralCube | null
  /** Custom class name */
  className?: string
}

const props = withDefaults(defineProps<SharePanelProps>(), {
  className: '',
})

const emit = defineEmits<{
  shareLinkCreated: [shareLink: ShareLink]
}>()

// State for share link creation
const visibility = ref<ShareLinkVisibility>('public')
const password = ref('')
const expiration = ref<LinkExpiration>('never')
const isCreating = ref(false)
const createError = ref<string | null>(null)
const createSuccess = ref<string | null>(null)

// State for created share link
const createdLink = ref<ShareLink | null>(null)
const qrCodeSvg = ref<string | null>(null)
const isGeneratingQR = ref(false)

// State for share links list
const userLinks = ref<ShareLink[]>([])
const isLoadingLinks = ref(false)
const selectedLinkId = ref<string | null>(null)

// Copy to clipboard state
const copiedId = ref<string | null>(null)

// Clear messages after timeout
let errorTimer: ReturnType<typeof setTimeout> | null = null
let successTimer: ReturnType<typeof setTimeout> | null = null
let copiedTimer: ReturnType<typeof setTimeout> | null = null

watch(createError, (msg) => {
  if (errorTimer) clearTimeout(errorTimer)
  if (msg) {
    errorTimer = setTimeout(() => {
      createError.value = null
    }, 5000)
  }
})

watch(createSuccess, (msg) => {
  if (successTimer) clearTimeout(successTimer)
  if (msg) {
    successTimer = setTimeout(() => {
      createSuccess.value = null
    }, 3000)
  }
})

watch(copiedId, (id) => {
  if (copiedTimer) clearTimeout(copiedTimer)
  if (id) {
    copiedTimer = setTimeout(() => {
      copiedId.value = null
    }, 2000)
  }
})

// Load user's share links
async function loadUserLinks() {
  isLoadingLinks.value = true
  try {
    const links = await shareLinkService.getUserShareLinks()
    userLinks.value = links
  } catch {
    // Ignore errors, keep empty list
  } finally {
    isLoadingLinks.value = false
  }
}

// Load on mount
onMounted(() => {
  loadUserLinks()
})

// Create a new share link
async function handleCreateLink() {
  if (!props.currentCube) return

  isCreating.value = true
  createError.value = null
  createdLink.value = null
  qrCodeSvg.value = null

  try {
    const result = await shareLinkService.createShareLink({
      cube: props.currentCube,
      visibility: visibility.value,
      password: visibility.value === 'protected' ? password.value : undefined,
      expiration: expiration.value,
    })

    if (result.success && result.shareLink) {
      createdLink.value = result.shareLink
      createSuccess.value = 'Share link created successfully!'
      emit('shareLinkCreated', result.shareLink)

      // Generate QR code automatically
      isGeneratingQR.value = true
      const qrResult = await generateQRCode(result.shareLink.url, DEFAULT_QR_CONFIG)
      if (qrResult.success && qrResult.data) {
        qrCodeSvg.value = qrResult.data
      }
      isGeneratingQR.value = false

      // Refresh links list
      loadUserLinks()

      // Reset form
      password.value = ''
    } else {
      createError.value = result.error || 'Failed to create share link'
    }
  } catch (error) {
    createError.value = error instanceof Error ? error.message : 'Failed to create share link'
  } finally {
    isCreating.value = false
  }
}

// Copy link URL to clipboard
async function handleCopyLink(link: ShareLink) {
  const result = await shareLinkService.copyToClipboard(link)
  if (result.success) {
    copiedId.value = link.id
  }
}

// Delete a share link
async function handleDeleteLink(id: string) {
  const result = await shareLinkService.deleteShareLink(id)
  if (result.success) {
    loadUserLinks()
    if (createdLink.value?.id === id) {
      createdLink.value = null
      qrCodeSvg.value = null
    }
  }
}

// Toggle link active status
async function handleToggleActive(link: ShareLink) {
  await shareLinkService.updateShareLink(link.id, { isActive: !link.isActive })
  loadUserLinks()
}

// Generate QR code for a link
async function handleGenerateQR(link: ShareLink) {
  selectedLinkId.value = link.id
  isGeneratingQR.value = true
  try {
    const result = await generateQRCode(link.url, DEFAULT_QR_CONFIG)
    if (result.success && result.data) {
      qrCodeSvg.value = result.data
      createdLink.value = link
    }
  } finally {
    isGeneratingQR.value = false
  }
}

// Download QR code as SVG
function handleDownloadQR() {
  if (!qrCodeSvg.value || !createdLink.value) return

  const blob = new Blob([qrCodeSvg.value], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `qr-${createdLink.value.id}.svg`
  a.click()
  URL.revokeObjectURL(url)
}

// Format date for display
function formatDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString()
  } catch {
    return isoDate
  }
}

// Get visibility icon
function getVisibilityIcon(v: ShareLinkVisibility): string {
  return VISIBILITY_INFO[v].icon
}

// Active links count
const activeLinksCount = computed(() => userLinks.value.filter((link) => link.isActive).length)
</script>

<template>
  <div :class="['share-panel', className]" data-testid="share-panel">
    <!-- Create New Share Link Section -->
    <div class="share-panel__create">
      <h3 class="share-panel__title">Create Share Link</h3>

      <!-- Visibility Selection -->
      <div class="share-panel__field">
        <label class="share-panel__label" for="visibility">Visibility</label>
        <select
          id="visibility"
          v-model="visibility"
          class="share-panel__select"
          data-testid="visibility-select"
        >
          <option v-for="(info, key) in VISIBILITY_INFO" :key="key" :value="key">
            {{ info.icon }} {{ info.label }}
          </option>
        </select>
        <p class="share-panel__hint">{{ VISIBILITY_INFO[visibility].description }}</p>
      </div>

      <!-- Password Field (for protected links) -->
      <div v-if="visibility === 'protected'" class="share-panel__field">
        <label class="share-panel__label" for="password">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          placeholder="Enter password for protected link"
          class="share-panel__input"
          data-testid="password-input"
        />
      </div>

      <!-- Expiration Selection -->
      <div class="share-panel__field">
        <label class="share-panel__label" for="expiration">Expiration</label>
        <select
          id="expiration"
          v-model="expiration"
          class="share-panel__select"
          data-testid="expiration-select"
        >
          <option
            v-for="(info, key) in EXPIRATION_INFO"
            :key="key"
            :value="key"
            :disabled="key === 'custom'"
          >
            {{ info.label }}
          </option>
        </select>
        <p class="share-panel__hint">{{ EXPIRATION_INFO[expiration].description }}</p>
      </div>

      <!-- Create Button -->
      <button
        type="button"
        :disabled="!currentCube || isCreating || (visibility === 'protected' && !password)"
        class="share-panel__button share-panel__button--primary"
        data-testid="create-link-button"
        @click="handleCreateLink"
      >
        {{ isCreating ? 'Creating...' : 'Create Share Link' }}
      </button>

      <!-- Status Messages -->
      <div v-if="createError" class="share-panel__message share-panel__message--error" role="alert">
        {{ createError }}
      </div>
      <div
        v-if="createSuccess"
        class="share-panel__message share-panel__message--success"
        role="status"
      >
        {{ createSuccess }}
      </div>
    </div>

    <!-- Created Link Display -->
    <div v-if="createdLink" class="share-panel__result" data-testid="created-link-result">
      <h4 class="share-panel__subtitle">Your Share Link</h4>

      <!-- Link URL -->
      <div class="share-panel__link-display">
        <input
          type="text"
          :value="createdLink.url"
          readonly
          class="share-panel__link-input"
          data-testid="share-link-url"
        />
        <button
          type="button"
          class="share-panel__button share-panel__button--copy"
          data-testid="copy-link-button"
          @click="handleCopyLink(createdLink!)"
        >
          {{ copiedId === createdLink.id ? 'Copied!' : 'Copy' }}
        </button>
      </div>

      <!-- QR Code -->
      <div v-if="qrCodeSvg" class="share-panel__qr" data-testid="qr-code-container">
        <div class="share-panel__qr-image" v-html="qrCodeSvg" />
        <button
          type="button"
          class="share-panel__button share-panel__button--secondary"
          data-testid="download-qr-button"
          @click="handleDownloadQR"
        >
          Download QR Code
        </button>
      </div>
      <div v-if="isGeneratingQR" class="share-panel__qr-loading">Generating QR code...</div>

      <!-- Link Info -->
      <div class="share-panel__link-info">
        <span class="share-panel__info-item">
          {{ getVisibilityIcon(createdLink.visibility) }}
          {{ VISIBILITY_INFO[createdLink.visibility].label }}
        </span>
        <span class="share-panel__info-item">
          Expires: {{ createdLink.expiresAt ? formatDate(createdLink.expiresAt) : 'Never' }}
        </span>
      </div>
    </div>

    <!-- Existing Share Links List -->
    <div class="share-panel__links">
      <h3 class="share-panel__title">
        Your Share Links
        <template v-if="activeLinksCount > 0">({{ activeLinksCount }} active)</template>
      </h3>

      <div v-if="isLoadingLinks" class="share-panel__loading">Loading links...</div>

      <div v-if="!isLoadingLinks && userLinks.length === 0" class="share-panel__empty">
        No share links created yet
      </div>

      <ul
        v-if="!isLoadingLinks && userLinks.length > 0"
        class="share-panel__links-list"
        data-testid="share-links-list"
      >
        <li
          v-for="link in userLinks"
          :key="link.id"
          :class="[
            'share-panel__link-item',
            { 'share-panel__link-item--inactive': !link.isActive },
          ]"
          :data-testid="`share-link-item-${link.id}`"
        >
          <div class="share-panel__link-header">
            <span class="share-panel__link-name">
              {{ getVisibilityIcon(link.visibility) }} {{ link.cube.meta?.name || link.cube.id }}
            </span>
            <span class="share-panel__link-date">{{ formatDate(link.createdAt) }}</span>
          </div>

          <div class="share-panel__link-url">{{ link.shortUrl }}</div>

          <div class="share-panel__link-stats">
            <span title="Views">{{ link.analytics.totalViews }} views</span>
            <span title="Unique visitors">{{ link.analytics.uniqueVisitors }} unique</span>
          </div>

          <div class="share-panel__link-actions">
            <button
              type="button"
              class="share-panel__button share-panel__button--small"
              title="Copy link"
              @click="handleCopyLink(link)"
            >
              {{ copiedId === link.id ? 'Copied!' : 'Copy' }}
            </button>
            <button
              type="button"
              class="share-panel__button share-panel__button--small"
              title="Show QR code"
              :disabled="isGeneratingQR && selectedLinkId === link.id"
              @click="handleGenerateQR(link)"
            >
              QR
            </button>
            <button
              type="button"
              class="share-panel__button share-panel__button--small"
              :title="link.isActive ? 'Deactivate link' : 'Activate link'"
              @click="handleToggleActive(link)"
            >
              {{ link.isActive ? 'Disable' : 'Enable' }}
            </button>
            <button
              type="button"
              class="share-panel__button share-panel__button--small share-panel__button--danger"
              title="Delete link"
              @click="handleDeleteLink(link.id)"
            >
              Delete
            </button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
