<!--
  Gallery component for displaying and selecting cube presets (Vue 3 SFC)
  Provides thumbnail previews, category filtering, tag-based search, and user cube management

  TASK 40: Added component metadata for Developer Mode support (Phase 6)
  TASK 64: Migration from React to Vue 3.0 SFC (Phase 10)
-->
<script lang="ts">
import type { ComponentMeta } from '../types/component-meta'
import { registerComponentMeta } from '../types/component-meta'

/**
 * Component metadata for Developer Mode
 */
export const GALLERY_META: ComponentMeta = {
  id: 'gallery',
  name: 'Gallery',
  version: '1.2.0',
  summary: 'Displays and manages cube presets with filtering, search, and user cube storage.',
  description:
    'Gallery is the cube browsing and management interface for isocubic. It displays preset cubes ' +
    'loaded from JSON files and user-saved cubes from localStorage. Features include category filtering ' +
    'by material type, tag-based search, thumbnail preview generation from cube gradients, and the ability ' +
    'to save the current cube to the personal gallery. The component supports both preset cubes (read-only) ' +
    'and user cubes (editable).',
  phase: 1,
  taskId: 'TASK 1',
  filePath: 'components/Gallery.vue',
  history: [
    {
      version: '1.0.0',
      date: '2026-01-28T12:00:00Z',
      description: 'Initial implementation with preset display and category filtering',
      taskId: 'TASK 1',
      type: 'created',
    },
    {
      version: '1.0.1',
      date: '2026-01-28T14:00:00Z',
      description: 'Added magical energy cubes (FFT system presets)',
      taskId: 'TASK 5',
      type: 'updated',
    },
    {
      version: '1.1.0',
      date: '2026-01-29T21:00:00Z',
      description: 'Added Developer Mode metadata support for self-documentation',
      taskId: 'TASK 40',
      type: 'updated',
    },
    {
      version: '1.2.0',
      date: '2026-01-31T00:00:00Z',
      description: 'Migrated from React to Vue 3.0 SFC',
      taskId: 'TASK 64',
      type: 'updated',
    },
  ],
  features: [
    {
      id: 'preset-display',
      name: 'Preset Display',
      description: 'Displays built-in preset cubes from JSON files',
      enabled: true,
      taskId: 'TASK 1',
    },
    {
      id: 'user-cubes',
      name: 'User Cubes',
      description: 'Manage user-saved cubes in localStorage',
      enabled: true,
      taskId: 'TASK 1',
    },
    {
      id: 'category-filter',
      name: 'Category Filtering',
      description: 'Filter cubes by material type (Stone, Wood, Metal, etc.)',
      enabled: true,
      taskId: 'TASK 1',
    },
    {
      id: 'tag-search',
      name: 'Tag Search',
      description: 'Search cubes by name, tags, or prompt',
      enabled: true,
      taskId: 'TASK 1',
    },
    {
      id: 'thumbnail-preview',
      name: 'Thumbnail Preview',
      description: 'CSS-based thumbnail generation from cube gradients',
      enabled: true,
      taskId: 'TASK 1',
    },
    {
      id: 'save-current',
      name: 'Save Current Cube',
      description: 'Save the current editing cube to personal gallery',
      enabled: true,
      taskId: 'TASK 1',
    },
  ],
  dependencies: [
    { name: 'storage', type: 'lib', path: 'lib/storage.ts', purpose: 'Cube storage operations' },
  ],
  relatedFiles: [
    { path: 'components/Gallery.vue.test.ts', type: 'test', description: 'Unit tests for Gallery' },
    { path: 'lib/storage.ts', type: 'util', description: 'LocalStorage operations' },
    { path: 'examples/*.json', type: 'config', description: 'Preset cube JSON files' },
  ],
  props: [
    {
      name: 'onCubeSelect',
      type: '(cube: SpectralCube) => void',
      required: false,
      description: 'Callback when a cube is selected',
    },
    {
      name: 'currentCube',
      type: 'SpectralCube | null',
      required: false,
      description: 'Current cube for save functionality',
    },
    { name: 'className', type: 'string', required: false, description: 'Additional CSS class' },
  ],
  tips: [
    'Click on a cube thumbnail to load it into the editor',
    'Use the search bar to find cubes by name or tags',
    'Switch between Presets and My Cubes tabs to view different collections',
    'Save your current work using the "Save Current to Gallery" button',
  ],
  tags: ['gallery', 'ui', 'presets', 'storage', 'search', 'phase-1'],
  status: 'stable',
  lastUpdated: '2026-01-31T00:00:00Z',
}

// Register metadata in the global registry
registerComponentMeta(GALLERY_META)
</script>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { SpectralCube, MaterialType } from '../types/cube'
import { getSavedCubesList, saveCubeToStorage, type StoredConfig } from '../lib/storage'

// Preset cubes data
import stoneMoss from '../../examples/stone-moss.json'
import woodOak from '../../examples/wood-oak.json'
import metalRust from '../../examples/metal-rust.json'
import brickRed from '../../examples/brick-red.json'
import marbleWhite from '../../examples/marble-white.json'
import grassGreen from '../../examples/grass-green.json'
import iceFrozen from '../../examples/ice-frozen.json'
import crystalMagic from '../../examples/crystal-magic.json'
import lavaMolten from '../../examples/lava-molten.json'
import sandDesert from '../../examples/sand-desert.json'
import magicCrystalEnergy from '../../examples/magic-crystal-energy.json'
import unstableCore from '../../examples/unstable-core.json'
import energyShield from '../../examples/energy-shield.json'

/** Preset cube configurations */
const PRESET_CUBES: SpectralCube[] = [
  stoneMoss as SpectralCube,
  woodOak as SpectralCube,
  metalRust as SpectralCube,
  brickRed as SpectralCube,
  marbleWhite as SpectralCube,
  grassGreen as SpectralCube,
  iceFrozen as SpectralCube,
  crystalMagic as SpectralCube,
  lavaMolten as SpectralCube,
  sandDesert as SpectralCube,
  magicCrystalEnergy as SpectralCube,
  unstableCore as SpectralCube,
  energyShield as SpectralCube,
]

/** Category definition for grouping cubes */
interface Category {
  id: string
  name: string
  materialTypes: MaterialType[]
}

/** Available categories for filtering */
const CATEGORIES: Category[] = [
  { id: 'all', name: 'All', materialTypes: [] },
  { id: 'stone', name: 'Stone', materialTypes: ['stone'] },
  { id: 'wood', name: 'Wood', materialTypes: ['wood'] },
  { id: 'metal', name: 'Metal', materialTypes: ['metal'] },
  { id: 'organic', name: 'Organic', materialTypes: ['organic'] },
  { id: 'crystal', name: 'Crystal', materialTypes: ['crystal', 'glass'] },
  { id: 'liquid', name: 'Liquid', materialTypes: ['liquid'] },
]

/**
 * Props for Gallery component
 */
interface GalleryProps {
  /** Current cube for saving to gallery */
  currentCube?: SpectralCube | null
  /** Custom class name */
  className?: string
}

const props = withDefaults(defineProps<GalleryProps>(), {
  currentCube: null,
  className: '',
})

const emit = defineEmits<{
  cubeSelect: [cube: SpectralCube]
}>()

// Reactive state
const searchQuery = ref('')
const selectedCategory = ref<string>('all')
const showUserCubes = ref(false)
const userCubes = ref<StoredConfig[]>(getSavedCubesList())
const statusMessage = ref<string | null>(null)

// Clear status message after timeout
let statusTimer: ReturnType<typeof setTimeout> | null = null
watch(statusMessage, (msg) => {
  if (statusTimer) clearTimeout(statusTimer)
  if (msg) {
    statusTimer = setTimeout(() => {
      statusMessage.value = null
    }, 3000)
  }
})

/**
 * Converts RGB color array to CSS color string
 */
function colorToCSS(color: [number, number, number]): string {
  const r = Math.round(color[0] * 255)
  const g = Math.round(color[1] * 255)
  const b = Math.round(color[2] * 255)
  return `rgb(${r}, ${g}, ${b})`
}

/**
 * Generates a gradient CSS based on cube configuration
 */
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

// Refresh user cubes list
function refreshUserCubes() {
  userCubes.value = getSavedCubesList()
}

// Get cubes to display based on current view mode
const displayCubes = computed(() => {
  return showUserCubes.value ? userCubes.value.map((sc) => sc.cube) : PRESET_CUBES
})

// Filter cubes by category
const categoryFilteredCubes = computed(() => {
  if (selectedCategory.value === 'all') return displayCubes.value

  const category = CATEGORIES.find((c) => c.id === selectedCategory.value)
  if (!category || category.materialTypes.length === 0) return displayCubes.value

  return displayCubes.value.filter((cube) => {
    const material = cube.physics?.material
    return material && category.materialTypes.includes(material)
  })
})

// Filter cubes by search query
const filteredCubes = computed(() => {
  if (!searchQuery.value.trim()) return categoryFilteredCubes.value

  const query = searchQuery.value.toLowerCase().trim()
  return categoryFilteredCubes.value.filter((cube) => {
    const name = cube.meta?.name?.toLowerCase() || ''
    if (name.includes(query)) return true

    const tags = cube.meta?.tags || []
    if (tags.some((tag) => tag.toLowerCase().includes(query))) return true

    const prompt = cube.prompt?.toLowerCase() || ''
    if (prompt.includes(query)) return true

    if (cube.id.toLowerCase().includes(query)) return true

    return false
  })
})

// Get all unique tags from cubes
const allTags = computed(() => {
  const tagSet = new Set<string>()
  displayCubes.value.forEach((cube) => {
    cube.meta?.tags?.forEach((tag) => tagSet.add(tag))
  })
  return Array.from(tagSet).sort()
})

// Matching tags for search suggestions
const matchingTags = computed(() => {
  if (!searchQuery.value) return []
  return allTags.value
    .filter((tag) => tag.toLowerCase().includes(searchQuery.value.toLowerCase()))
    .slice(0, 8)
})

// Handle cube selection
function handleCubeSelect(cube: SpectralCube) {
  emit('cubeSelect', cube)
  statusMessage.value = `Loaded: ${cube.meta?.name || cube.id}`
}

// Handle saving current cube to gallery
function handleSaveToGallery() {
  if (!props.currentCube) return
  saveCubeToStorage(props.currentCube)
  refreshUserCubes()
  statusMessage.value = `Saved: ${props.currentCube.meta?.name || props.currentCube.id}`
}

// Handle view mode toggle
function handleViewModeToggle(showUser: boolean) {
  showUserCubes.value = showUser
  if (showUser) {
    refreshUserCubes()
  }
}

// Handle keyboard interaction on cube items
function handleCubeKeyDown(e: KeyboardEvent, cube: SpectralCube) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    handleCubeSelect(cube)
  }
}
</script>

<template>
  <div :class="['gallery', className]">
    <!-- Header -->
    <div class="gallery__header">
      <h2 class="gallery__title">Gallery</h2>

      <!-- View mode toggle -->
      <div class="gallery__view-toggle">
        <button
          type="button"
          :class="['gallery__toggle-btn', { 'gallery__toggle-btn--active': !showUserCubes }]"
          @click="handleViewModeToggle(false)"
        >
          Presets
        </button>
        <button
          type="button"
          :class="['gallery__toggle-btn', { 'gallery__toggle-btn--active': showUserCubes }]"
          @click="handleViewModeToggle(true)"
        >
          My Cubes
        </button>
      </div>
    </div>

    <!-- Search bar -->
    <div class="gallery__search">
      <input
        v-model="searchQuery"
        type="text"
        class="gallery__search-input"
        placeholder="Search by name, tags..."
        aria-label="Search cubes"
      />
      <button
        v-if="searchQuery"
        type="button"
        class="gallery__search-clear"
        aria-label="Clear search"
        @click="searchQuery = ''"
      >
        ×
      </button>
    </div>

    <!-- Category filters -->
    <div class="gallery__categories">
      <button
        v-for="category in CATEGORIES"
        :key="category.id"
        type="button"
        :class="[
          'gallery__category-btn',
          { 'gallery__category-btn--active': selectedCategory === category.id },
        ]"
        @click="selectedCategory = category.id"
      >
        {{ category.name }}
      </button>
    </div>

    <!-- Tag suggestions -->
    <div v-if="searchQuery && matchingTags.length > 0" class="gallery__tags">
      <span class="gallery__tags-label">Tags:</span>
      <button
        v-for="tag in matchingTags"
        :key="tag"
        type="button"
        class="gallery__tag"
        @click="searchQuery = tag"
      >
        {{ tag }}
      </button>
    </div>

    <!-- Status message -->
    <div v-if="statusMessage" class="gallery__message gallery__message--success" role="status">
      {{ statusMessage }}
    </div>

    <!-- Save to gallery button -->
    <button v-if="currentCube" type="button" class="gallery__save-btn" @click="handleSaveToGallery">
      Save Current to Gallery
    </button>

    <!-- Cube grid -->
    <div class="gallery__grid">
      <div v-if="filteredCubes.length === 0" class="gallery__empty">
        {{
          searchQuery
            ? 'No cubes match your search'
            : showUserCubes
              ? 'No saved cubes yet'
              : 'No cubes available'
        }}
      </div>
      <div
        v-for="cube in filteredCubes"
        v-else
        :key="cube.id"
        class="gallery__item"
        role="button"
        :tabindex="0"
        :aria-label="`Select ${cube.meta?.name || cube.id}`"
        @click="handleCubeSelect(cube)"
        @keydown="handleCubeKeyDown($event, cube)"
      >
        <!-- Cube preview thumbnail -->
        <div
          class="gallery__thumbnail"
          :style="{
            background: generateCubeGradient(cube),
            opacity: cube.base.transparency ?? 1,
          }"
        >
          <div
            v-if="cube.noise?.type"
            :class="['gallery__noise-indicator', `gallery__noise-indicator--${cube.noise.type}`]"
          />
        </div>

        <!-- Cube info -->
        <div class="gallery__item-info">
          <span class="gallery__item-name">{{ cube.meta?.name || cube.id }}</span>
          <span class="gallery__item-material">{{ cube.physics?.material || 'Unknown' }}</span>
        </div>

        <!-- Tags -->
        <div v-if="cube.meta?.tags && cube.meta.tags.length > 0" class="gallery__item-tags">
          <span v-for="tag in cube.meta.tags.slice(0, 3)" :key="tag" class="gallery__item-tag">
            {{ tag }}
          </span>
          <span v-if="cube.meta.tags.length > 3" class="gallery__item-tag gallery__item-tag--more">
            +{{ cube.meta.tags.length - 3 }}
          </span>
        </div>
      </div>
    </div>

    <!-- Results count -->
    <div class="gallery__footer">
      <span class="gallery__count">
        {{ filteredCubes.length }} of {{ displayCubes.length }} cubes
      </span>
    </div>
  </div>
</template>
