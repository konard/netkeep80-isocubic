/**
 * Gallery component for displaying and selecting cube presets
 * Provides thumbnail previews, category filtering, tag-based search, and user cube management
 *
 * TASK 40: Added component metadata for Developer Mode support (Phase 6)
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import type { SpectralCube, MaterialType } from '../types/cube'
import type { ComponentMeta } from '../types/component-meta'
import { getSavedCubesList, saveCubeToStorage, type StoredConfig } from '../lib/storage'
import { registerComponentMeta } from '../types/component-meta'
import { ComponentInfo } from './ComponentInfo'
import { useIsDevModeEnabled } from '../lib/devmode'

/**
 * Component metadata for Developer Mode
 */
export const GALLERY_META: ComponentMeta = {
  id: 'gallery',
  name: 'Gallery',
  version: '1.1.0',
  summary: 'Displays and manages cube presets with filtering, search, and user cube storage.',
  description:
    'Gallery is the cube browsing and management interface for isocubic. It displays preset cubes ' +
    'loaded from JSON files and user-saved cubes from localStorage. Features include category filtering ' +
    'by material type, tag-based search, thumbnail preview generation from cube gradients, and the ability ' +
    'to save the current cube to the personal gallery. The component supports both preset cubes (read-only) ' +
    'and user cubes (editable).',
  phase: 1,
  taskId: 'TASK 1',
  filePath: 'components/Gallery.tsx',
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
    { path: 'components/Gallery.test.tsx', type: 'test', description: 'Unit tests for Gallery' },
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
  lastUpdated: '2026-01-29T21:00:00Z',
}

// Register metadata in the global registry
registerComponentMeta(GALLERY_META)

// Preset cubes data - these are imported at build time
// In a production app, these would be loaded from the /examples folder
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
// Magical energy cubes (Phase 2 FFT system)
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
  // Magical energy cubes
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
export interface GalleryProps {
  /** Callback when a cube is selected from the gallery */
  onCubeSelect?: (cube: SpectralCube) => void
  /** Current cube for saving to gallery */
  currentCube?: SpectralCube | null
  /** Custom class name */
  className?: string
}

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

  // Create a gradient based on the first gradient configuration
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

/**
 * Gallery component
 * Displays preset and user-saved cube configurations with filtering and search
 */
export function Gallery({ onCubeSelect, currentCube, className = '' }: GalleryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showUserCubes, setShowUserCubes] = useState(false)
  const [userCubes, setUserCubes] = useState<StoredConfig[]>(() => getSavedCubesList())
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  // Refresh user cubes list
  const refreshUserCubes = useCallback(() => {
    setUserCubes(getSavedCubesList())
  }, [])

  // Clear status message after timeout
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [statusMessage])

  // Get cubes to display based on current view mode
  const displayCubes = useMemo(() => {
    return showUserCubes ? userCubes.map((sc) => sc.cube) : PRESET_CUBES
  }, [showUserCubes, userCubes])

  // Filter cubes by category
  const categoryFilteredCubes = useMemo(() => {
    if (selectedCategory === 'all') return displayCubes

    const category = CATEGORIES.find((c) => c.id === selectedCategory)
    if (!category || category.materialTypes.length === 0) return displayCubes

    return displayCubes.filter((cube) => {
      const material = cube.physics?.material
      return material && category.materialTypes.includes(material)
    })
  }, [displayCubes, selectedCategory])

  // Filter cubes by search query (tags and name)
  const filteredCubes = useMemo(() => {
    if (!searchQuery.trim()) return categoryFilteredCubes

    const query = searchQuery.toLowerCase().trim()
    return categoryFilteredCubes.filter((cube) => {
      // Search in name
      const name = cube.meta?.name?.toLowerCase() || ''
      if (name.includes(query)) return true

      // Search in tags
      const tags = cube.meta?.tags || []
      if (tags.some((tag) => tag.toLowerCase().includes(query))) return true

      // Search in prompt
      const prompt = cube.prompt?.toLowerCase() || ''
      if (prompt.includes(query)) return true

      // Search in ID
      if (cube.id.toLowerCase().includes(query)) return true

      return false
    })
  }, [categoryFilteredCubes, searchQuery])

  // Handle cube selection
  const handleCubeSelect = useCallback(
    (cube: SpectralCube) => {
      onCubeSelect?.(cube)
      setStatusMessage(`Loaded: ${cube.meta?.name || cube.id}`)
    },
    [onCubeSelect]
  )

  // Handle saving current cube to gallery
  const handleSaveToGallery = useCallback(() => {
    if (!currentCube) return

    saveCubeToStorage(currentCube)
    refreshUserCubes()
    setStatusMessage(`Saved: ${currentCube.meta?.name || currentCube.id}`)
  }, [currentCube, refreshUserCubes])

  // Handle search input change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }, [])

  // Handle category change
  const handleCategoryChange = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId)
  }, [])

  // Handle view mode toggle
  const handleViewModeToggle = useCallback(
    (showUser: boolean) => {
      setShowUserCubes(showUser)
      if (showUser) {
        refreshUserCubes()
      }
    },
    [refreshUserCubes]
  )

  // Get all unique tags from cubes for tag suggestions
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    displayCubes.forEach((cube) => {
      cube.meta?.tags?.forEach((tag) => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  }, [displayCubes])

  // Check if DevMode is enabled for ComponentInfo wrapper
  const isDevModeEnabled = useIsDevModeEnabled()

  const galleryContent = (
    <div className={`gallery ${className}`}>
      {/* Header */}
      <div className="gallery__header">
        <h2 className="gallery__title">Gallery</h2>

        {/* View mode toggle */}
        <div className="gallery__view-toggle">
          <button
            type="button"
            className={`gallery__toggle-btn ${!showUserCubes ? 'gallery__toggle-btn--active' : ''}`}
            onClick={() => handleViewModeToggle(false)}
          >
            Presets
          </button>
          <button
            type="button"
            className={`gallery__toggle-btn ${showUserCubes ? 'gallery__toggle-btn--active' : ''}`}
            onClick={() => handleViewModeToggle(true)}
          >
            My Cubes
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="gallery__search">
        <input
          type="text"
          className="gallery__search-input"
          placeholder="Search by name, tags..."
          value={searchQuery}
          onChange={handleSearchChange}
          aria-label="Search cubes"
        />
        {searchQuery && (
          <button
            type="button"
            className="gallery__search-clear"
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {/* Category filters */}
      <div className="gallery__categories">
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            className={`gallery__category-btn ${
              selectedCategory === category.id ? 'gallery__category-btn--active' : ''
            }`}
            onClick={() => handleCategoryChange(category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Tag suggestions */}
      {searchQuery && allTags.length > 0 && (
        <div className="gallery__tags">
          <span className="gallery__tags-label">Tags:</span>
          {allTags
            .filter((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
            .slice(0, 8)
            .map((tag) => (
              <button
                key={tag}
                type="button"
                className="gallery__tag"
                onClick={() => setSearchQuery(tag)}
              >
                {tag}
              </button>
            ))}
        </div>
      )}

      {/* Status message */}
      {statusMessage && (
        <div className="gallery__message gallery__message--success" role="status">
          {statusMessage}
        </div>
      )}

      {/* Save to gallery button */}
      {currentCube && (
        <button type="button" className="gallery__save-btn" onClick={handleSaveToGallery}>
          Save Current to Gallery
        </button>
      )}

      {/* Cube grid */}
      <div className="gallery__grid">
        {filteredCubes.length === 0 ? (
          <div className="gallery__empty">
            {searchQuery
              ? 'No cubes match your search'
              : showUserCubes
                ? 'No saved cubes yet'
                : 'No cubes available'}
          </div>
        ) : (
          filteredCubes.map((cube) => (
            <div
              key={cube.id}
              className="gallery__item"
              onClick={() => handleCubeSelect(cube)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleCubeSelect(cube)
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`Select ${cube.meta?.name || cube.id}`}
            >
              {/* Cube preview thumbnail */}
              <div
                className="gallery__thumbnail"
                style={{
                  background: generateCubeGradient(cube),
                  opacity: cube.base.transparency ?? 1,
                }}
              >
                {/* Add visual indicator for noise type */}
                {cube.noise?.type && (
                  <div
                    className={`gallery__noise-indicator gallery__noise-indicator--${cube.noise.type}`}
                  />
                )}
              </div>

              {/* Cube info */}
              <div className="gallery__item-info">
                <span className="gallery__item-name">{cube.meta?.name || cube.id}</span>
                <span className="gallery__item-material">
                  {cube.physics?.material || 'Unknown'}
                </span>
              </div>

              {/* Tags */}
              {cube.meta?.tags && cube.meta.tags.length > 0 && (
                <div className="gallery__item-tags">
                  {cube.meta.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="gallery__item-tag">
                      {tag}
                    </span>
                  ))}
                  {cube.meta.tags.length > 3 && (
                    <span className="gallery__item-tag gallery__item-tag--more">
                      +{cube.meta.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Results count */}
      <div className="gallery__footer">
        <span className="gallery__count">
          {filteredCubes.length} of {displayCubes.length} cubes
        </span>
      </div>
    </div>
  )

  return isDevModeEnabled ? (
    <ComponentInfo meta={GALLERY_META}>{galleryContent}</ComponentInfo>
  ) : (
    galleryContent
  )
}

export default Gallery
