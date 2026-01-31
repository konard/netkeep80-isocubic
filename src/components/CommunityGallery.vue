<!--
  Community Gallery Component (Vue 3.0 SFC)
  Displays published cubes from the community with search, filtering, and sorting

  TASK 45: Initial implementation
  TASK 64: Migration from React to Vue 3.0 SFC (Phase 10)

  Features:
  - Browse community-published cubes
  - Search by name, tags, author
  - Filter by category and material type
  - Sort by recent, popular, trending, etc.
  - Like/unlike cubes
  - Pagination support
-->
<script lang="ts">
import type { ComponentMeta } from '../types/component-meta'
import { registerComponentMeta } from '../types/component-meta'

/**
 * Component metadata for Developer Mode
 */
export const COMMUNITY_GALLERY_META: ComponentMeta = {
  id: 'community-gallery',
  name: 'CommunityGallery',
  version: '1.1.0',
  summary: 'Browse and interact with community-published cubes.',
  description:
    'CommunityGallery is the public gallery for viewing cubes published by other users. ' +
    'It provides search, filtering by category and material type, sorting options, and ' +
    'social features like liking cubes. The component supports pagination for browsing ' +
    'large collections efficiently.',
  phase: 7,
  taskId: 'TASK 45',
  filePath: 'components/CommunityGallery.vue',
  history: [
    {
      version: '1.0.0',
      date: '2026-01-29T22:00:00Z',
      description: 'Initial implementation with search, filter, sort, and like features',
      taskId: 'TASK 45',
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
      id: 'search',
      name: 'Search',
      description: 'Search cubes by name, tags, prompt, or author',
      enabled: true,
      taskId: 'TASK 45',
    },
    {
      id: 'filter-category',
      name: 'Category Filter',
      description: 'Filter by category (Nature, Building, Fantasy, etc.)',
      enabled: true,
      taskId: 'TASK 45',
    },
    {
      id: 'filter-material',
      name: 'Material Filter',
      description: 'Filter by material type (Stone, Wood, Metal, etc.)',
      enabled: true,
      taskId: 'TASK 45',
    },
    {
      id: 'sorting',
      name: 'Sorting',
      description: 'Sort by recent, popular, trending, downloads, views',
      enabled: true,
      taskId: 'TASK 45',
    },
    {
      id: 'likes',
      name: 'Like System',
      description: 'Like and unlike cubes with persisted state',
      enabled: true,
      taskId: 'TASK 45',
    },
    {
      id: 'pagination',
      name: 'Pagination',
      description: 'Navigate through pages of results',
      enabled: true,
      taskId: 'TASK 45',
    },
  ],
  dependencies: [
    {
      name: 'community-gallery',
      type: 'lib',
      path: 'lib/community-gallery.ts',
      purpose: 'API service for community cubes',
    },
    { name: 'community', type: 'lib', path: 'types/community.ts', purpose: 'Type definitions' },
  ],
  relatedFiles: [
    {
      path: 'components/CommunityGallery.vue.test.ts',
      type: 'test',
      description: 'Unit tests for CommunityGallery',
    },
    {
      path: 'lib/community-gallery.ts',
      type: 'util',
      description: 'Community gallery service',
    },
    { path: 'types/community.ts', type: 'type', description: 'Community types' },
  ],
  props: [
    {
      name: 'onCubeSelect',
      type: '(cube: SpectralCube) => void',
      required: false,
      description: 'Callback when a cube is selected for use',
    },
    {
      name: 'onCubePreview',
      type: '(cube: PublishedCube) => void',
      required: false,
      description: 'Callback to preview a cube details',
    },
    { name: 'className', type: 'string', required: false, description: 'Additional CSS class' },
  ],
  tips: [
    'Use the search bar to find specific cubes by name or tags',
    'Click the heart icon to like a cube and save it for later',
    'Switch between sorting options to discover new and popular cubes',
    'Filter by category to focus on specific types of materials',
  ],
  tags: ['community', 'gallery', 'social', 'search', 'filter', 'phase-7'],
  status: 'stable',
  lastUpdated: '2026-01-31T00:00:00Z',
}

// Register metadata in the global registry
registerComponentMeta(COMMUNITY_GALLERY_META)
</script>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { SpectralCube, MaterialType } from '../types/cube'
import type {
  PublishedCube,
  CommunityGallerySearchParams,
  CubeCategory,
  CommunitySortOption,
  PaginationMeta,
} from '../types/community'
import { CATEGORY_INFO, SORT_OPTION_INFO, formatCount } from '../types/community'
import { communityGalleryService } from '../lib/community-gallery'

// ============================================================================
// Constants
// ============================================================================

/** Material types with labels */
const MATERIAL_TYPES: { id: MaterialType | 'all'; label: string }[] = [
  { id: 'all', label: 'All Materials' },
  { id: 'stone', label: 'Stone' },
  { id: 'wood', label: 'Wood' },
  { id: 'metal', label: 'Metal' },
  { id: 'glass', label: 'Glass' },
  { id: 'crystal', label: 'Crystal' },
  { id: 'organic', label: 'Organic' },
  { id: 'liquid', label: 'Liquid' },
]

/** Categories with labels */
const CATEGORIES: { id: CubeCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All Categories' },
  ...Object.entries(CATEGORY_INFO).map(([id, info]) => ({
    id: id as CubeCategory,
    label: info.label,
  })),
]

/** Sort options with labels */
const SORT_OPTIONS: { id: CommunitySortOption; label: string }[] = Object.entries(
  SORT_OPTION_INFO
).map(([id, info]) => ({
  id: id as CommunitySortOption,
  label: info.label,
}))

// ============================================================================
// Props
// ============================================================================

interface CommunityGalleryProps {
  /** Custom class name */
  className?: string
}

withDefaults(defineProps<CommunityGalleryProps>(), {
  className: '',
})

const emit = defineEmits<{
  cubeSelect: [cube: SpectralCube]
  cubePreview: [cube: PublishedCube]
}>()

// ============================================================================
// Helper Functions
// ============================================================================

function colorToCSS(color: [number, number, number]): string {
  const r = Math.round(color[0] * 255)
  const g = Math.round(color[1] * 255)
  const b = Math.round(color[2] * 255)
  return `rgb(${r}, ${g}, ${b})`
}

function generateCubeGradient(cube: SpectralCube): string {
  const baseColor = colorToCSS(cube.base.color)

  if (!cube.gradients || cube.gradients.length === 0) {
    return baseColor
  }

  const gradient = cube.gradients[0]
  const shift = gradient.color_shift
  const endColor = colorToCSS([
    Math.max(0, Math.min(1, cube.base.color[0] + shift[0] * gradient.factor)),
    Math.max(0, Math.min(1, cube.base.color[1] + shift[1] * gradient.factor)),
    Math.max(0, Math.min(1, cube.base.color[2] + shift[2] * gradient.factor)),
  ])

  switch (gradient.axis) {
    case 'y':
      return `linear-gradient(to top, ${baseColor}, ${endColor})`
    case 'x':
      return `linear-gradient(to right, ${baseColor}, ${endColor})`
    case 'z':
      return `linear-gradient(135deg, ${baseColor}, ${endColor})`
    case 'radial':
      return `radial-gradient(circle, ${endColor}, ${baseColor})`
    default:
      return baseColor
  }
}

// ============================================================================
// State
// ============================================================================

const cubes = ref<PublishedCube[]>([])
const pagination = ref<PaginationMeta | null>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)

const searchQuery = ref('')
const selectedCategory = ref<CubeCategory | 'all'>('all')
const selectedMaterial = ref<MaterialType | 'all'>('all')
const sortBy = ref<CommunitySortOption>('recent')
const currentPage = ref(1)

// Build search params from state
const searchParams = computed<CommunityGallerySearchParams>(() => ({
  filters: {
    query: searchQuery.value || undefined,
    category: selectedCategory.value !== 'all' ? selectedCategory.value : undefined,
    materialType: selectedMaterial.value !== 'all' ? selectedMaterial.value : undefined,
  },
  sortBy: sortBy.value,
  sortDirection: 'desc',
  page: currentPage.value,
  pageSize: 12,
}))

// Fetch cubes when params change
watch(
  searchParams,
  async (params) => {
    const localCancelled = { value: false }

    isLoading.value = true
    error.value = null

    try {
      const response = await communityGalleryService.search(params)
      if (!localCancelled.value) {
        cubes.value = response.cubes
        pagination.value = response.pagination
      }
    } catch (err) {
      if (!localCancelled.value) {
        error.value = 'Failed to load community cubes'
        console.error('CommunityGallery fetch error:', err)
      }
    } finally {
      if (!localCancelled.value) {
        isLoading.value = false
      }
    }
  },
  { immediate: true }
)

// Reset page when filters change
watch([searchQuery, selectedCategory, selectedMaterial, sortBy], () => {
  currentPage.value = 1
})

// Handle cube selection
function handleCubeSelect(pub: PublishedCube) {
  emit('cubeSelect', pub.cube)
  communityGalleryService.recordDownload(pub.id)
}

// Handle like toggle
async function handleLikeToggle(e: Event, cubeId: string) {
  e.stopPropagation()

  try {
    const result = await communityGalleryService.toggleLike(cubeId)
    if (result.success) {
      cubes.value = cubes.value.map((cube) =>
        cube.id === cubeId
          ? {
              ...cube,
              isLiked: result.isLiked,
              stats: { ...cube.stats, likes: result.likeCount },
            }
          : cube
      )
    }
  } catch (err) {
    console.error('Failed to toggle like:', err)
  }
}

// Handle pagination
function handlePageChange(page: number) {
  currentPage.value = page
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Handle keyboard interaction on cube items
function handleCubeKeyDown(e: KeyboardEvent, pub: PublishedCube) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    handleCubeSelect(pub)
  }
}

// Pagination pages computation
const paginationPages = computed(() => {
  if (!pagination.value || pagination.value.totalPages <= 1) return null

  const pages: (number | string)[] = []
  const { currentPage: cp, totalPages } = pagination.value

  pages.push(1)

  if (cp > 3) {
    pages.push('...')
  }

  for (let i = Math.max(2, cp - 1); i <= Math.min(totalPages - 1, cp + 1); i++) {
    if (!pages.includes(i)) {
      pages.push(i)
    }
  }

  if (cp < totalPages - 2) {
    pages.push('...')
  }

  if (totalPages > 1 && !pages.includes(totalPages)) {
    pages.push(totalPages)
  }

  return pages
})
</script>

<template>
  <div :class="['community-gallery', className]">
    <!-- Header -->
    <div class="community-gallery__header">
      <h2 class="community-gallery__title">Community Gallery</h2>
      <p class="community-gallery__subtitle">Discover cubes created by the isocubic community</p>
    </div>

    <!-- Search and Filters -->
    <div class="community-gallery__controls">
      <!-- Search Input -->
      <div class="community-gallery__search">
        <input
          v-model="searchQuery"
          type="text"
          class="community-gallery__search-input"
          placeholder="Search by name, tags, author..."
          aria-label="Search community cubes"
        />
        <button
          v-if="searchQuery"
          type="button"
          class="community-gallery__search-clear"
          aria-label="Clear search"
          @click="searchQuery = ''"
        >
          ×
        </button>
      </div>

      <!-- Filter Controls -->
      <div class="community-gallery__filters">
        <select
          v-model="selectedCategory"
          class="community-gallery__select"
          aria-label="Filter by category"
        >
          <option v-for="cat in CATEGORIES" :key="cat.id" :value="cat.id">
            {{ cat.label }}
          </option>
        </select>

        <select
          v-model="selectedMaterial"
          class="community-gallery__select"
          aria-label="Filter by material"
        >
          <option v-for="mat in MATERIAL_TYPES" :key="mat.id" :value="mat.id">
            {{ mat.label }}
          </option>
        </select>

        <select v-model="sortBy" class="community-gallery__select" aria-label="Sort by">
          <option v-for="opt in SORT_OPTIONS" :key="opt.id" :value="opt.id">
            {{ opt.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="community-gallery__loading">
      <div class="community-gallery__spinner" />
      <span>Loading cubes...</span>
    </div>

    <!-- Error State -->
    <div v-if="error" class="community-gallery__error" role="alert">
      {{ error }}
    </div>

    <!-- Cube Grid -->
    <template v-if="!isLoading && !error">
      <div class="community-gallery__grid">
        <div v-if="cubes.length === 0" class="community-gallery__empty">
          {{
            searchQuery || selectedCategory !== 'all' || selectedMaterial !== 'all'
              ? 'No cubes match your search criteria'
              : 'No community cubes available yet'
          }}
        </div>
        <div
          v-for="pub in cubes"
          v-else
          :key="pub.id"
          class="community-gallery__item"
          role="button"
          :tabindex="0"
          :aria-label="`Select ${pub.cube.meta?.name || pub.cube.id}`"
          @click="handleCubeSelect(pub)"
          @keydown="handleCubeKeyDown($event, pub)"
        >
          <!-- Badges -->
          <div class="community-gallery__badges">
            <span
              v-if="pub.isFeatured"
              class="community-gallery__badge community-gallery__badge--featured"
            >
              Featured
            </span>
            <span
              v-if="pub.isStaffPick"
              class="community-gallery__badge community-gallery__badge--staff"
            >
              Staff Pick
            </span>
          </div>

          <!-- Thumbnail -->
          <div
            class="community-gallery__thumbnail"
            :style="{
              background: generateCubeGradient(pub.cube),
              opacity: pub.cube.base.transparency ?? 1,
            }"
          >
            <div
              v-if="pub.cube.noise?.type"
              :class="[
                'community-gallery__noise-indicator',
                `community-gallery__noise-indicator--${pub.cube.noise.type}`,
              ]"
            />
          </div>

          <!-- Info -->
          <div class="community-gallery__item-info">
            <span class="community-gallery__item-name">
              {{ pub.cube.meta?.name || pub.cube.id }}
            </span>
            <span class="community-gallery__item-author"> by {{ pub.author.displayName }} </span>
          </div>

          <!-- Stats -->
          <div class="community-gallery__item-stats">
            <button
              type="button"
              :class="[
                'community-gallery__like-btn',
                { 'community-gallery__like-btn--liked': pub.isLiked },
              ]"
              :aria-label="pub.isLiked ? 'Unlike' : 'Like'"
              @click="handleLikeToggle($event, pub.id)"
            >
              <span class="community-gallery__like-icon">{{
                pub.isLiked ? '\u2764\uFE0F' : '\U0001F90D'
              }}</span>
              <span class="community-gallery__like-count">{{ formatCount(pub.stats.likes) }}</span>
            </button>
            <span class="community-gallery__views">
              \uD83D\uDC41 {{ formatCount(pub.stats.views) }}
            </span>
            <span class="community-gallery__downloads">
              \u2B07 {{ formatCount(pub.stats.downloads) }}
            </span>
          </div>

          <!-- Tags -->
          <div
            v-if="pub.cube.meta?.tags && pub.cube.meta.tags.length > 0"
            class="community-gallery__item-tags"
          >
            <span
              v-for="tag in pub.cube.meta.tags.slice(0, 3)"
              :key="tag"
              class="community-gallery__item-tag"
            >
              {{ tag }}
            </span>
            <span
              v-if="pub.cube.meta.tags.length > 3"
              class="community-gallery__item-tag community-gallery__item-tag--more"
            >
              +{{ pub.cube.meta.tags.length - 3 }}
            </span>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="paginationPages" class="community-gallery__pagination">
        <button
          type="button"
          class="community-gallery__page-btn"
          :disabled="!pagination?.hasPrevPage"
          aria-label="Previous page"
          @click="handlePageChange(currentPage - 1)"
        >
          &lt;
        </button>

        <template
          v-for="(page, index) in paginationPages"
          :key="typeof page === 'number' ? page : `ellipsis-${index}`"
        >
          <button
            v-if="typeof page === 'number'"
            type="button"
            :class="[
              'community-gallery__page-btn',
              { 'community-gallery__page-btn--active': page === currentPage },
            ]"
            @click="handlePageChange(page)"
          >
            {{ page }}
          </button>
          <span v-else class="community-gallery__ellipsis">{{ page }}</span>
        </template>

        <button
          type="button"
          class="community-gallery__page-btn"
          :disabled="!pagination?.hasNextPage"
          aria-label="Next page"
          @click="handlePageChange(currentPage + 1)"
        >
          &gt;
        </button>
      </div>

      <!-- Results Count -->
      <div v-if="pagination" class="community-gallery__footer">
        <span class="community-gallery__count">
          Showing {{ cubes.length }} of {{ pagination.totalItems }} cubes
          <template v-if="pagination.totalPages > 1">
            (Page {{ pagination.currentPage }} of {{ pagination.totalPages }})
          </template>
        </span>
      </div>
    </template>
  </div>
</template>
