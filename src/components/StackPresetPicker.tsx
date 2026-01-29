/**
 * StackPresetPicker Component
 * Provides a gallery UI for selecting and managing stack presets
 *
 * ISSUE 30: Шаблоны стопок (Stack Presets)
 *
 * Features:
 * - Gallery of preset thumbnails
 * - Search by name/tags
 * - Category filtering
 * - Apply preset to editor
 * - Save current stack as preset
 */

import { useState, useCallback, useMemo } from 'react'
import type { CubeStackConfig } from '../types/stack'
import type { Color3 } from '../types/cube'
import {
  getAllStackPresets,
  searchStackPresets,
  getPresetsByCategory,
  applyPreset,
  saveStackAsPreset,
  deleteUserPreset,
  STACK_PRESET_CATEGORIES,
  type StackPreset,
  type StackPresetCategory,
} from '../lib/stack-presets'

/**
 * Props for StackPresetPicker component
 */
export interface StackPresetPickerProps {
  /** Current stack configuration (for saving as preset) */
  currentStack?: CubeStackConfig | null
  /** Callback when a preset is selected/applied */
  onApplyPreset?: (config: CubeStackConfig) => void
  /** Callback when preset picker is closed */
  onClose?: () => void
  /** Whether the picker is visible */
  isOpen?: boolean
  /** Custom class name */
  className?: string
}

/**
 * Convert RGB [0-1] to CSS color
 */
function rgbToCss(color: Color3 | undefined): string {
  if (!color) return '#808080'
  return `rgb(${Math.round(color[0] * 255)}, ${Math.round(color[1] * 255)}, ${Math.round(color[2] * 255)})`
}

/**
 * Generate a gradient preview based on stack layers
 */
function generateStackGradient(preset: StackPreset): string {
  const layers = preset.config.layers
  if (layers.length === 0) {
    return rgbToCss(preset.previewColor)
  }

  const colors = layers.map((layer) => rgbToCss(layer.cubeConfig.base.color))
  // Vertical gradient from bottom to top
  return `linear-gradient(to top, ${colors.join(', ')})`
}

/**
 * StackPresetPicker component
 */
export function StackPresetPicker({
  currentStack,
  onApplyPreset,
  onClose,
  isOpen = true,
  className = '',
}: StackPresetPickerProps) {
  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<StackPresetCategory | 'all'>('all')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [savePresetName, setSavePresetName] = useState('')
  const [savePresetDescription, setSavePresetDescription] = useState('')
  const [savePresetTags, setSavePresetTags] = useState('')
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Get filtered presets
  const filteredPresets = useMemo(() => {
    let presets: StackPreset[]

    if (searchQuery.trim()) {
      presets = searchStackPresets(searchQuery)
    } else if (selectedCategory === 'all') {
      presets = getAllStackPresets()
    } else {
      presets = getPresetsByCategory(selectedCategory)
    }

    // Force refresh when refreshKey changes
    void refreshKey
    return presets
  }, [searchQuery, selectedCategory, refreshKey])

  // Category counts - refreshKey dependency is intentional to trigger recalculation when presets change
  const categoryCounts = useMemo(() => {
    // Note: refreshKey is used to force recalculation when user presets change
    void refreshKey
    const allPresets = getAllStackPresets()
    const counts: Record<string, number> = { all: allPresets.length }

    for (const category of Object.keys(STACK_PRESET_CATEGORIES)) {
      counts[category] = allPresets.filter((p) => p.category === category).length
    }

    return counts
  }, [refreshKey])

  // Handle preset selection
  const handlePresetClick = useCallback((preset: StackPreset) => {
    setSelectedPresetId(preset.id)
  }, [])

  // Handle preset apply
  const handleApplyPreset = useCallback(() => {
    if (!selectedPresetId) return

    const preset = filteredPresets.find((p) => p.id === selectedPresetId)
    if (!preset) return

    const newConfig = applyPreset(preset)
    onApplyPreset?.(newConfig)
    onClose?.()
  }, [selectedPresetId, filteredPresets, onApplyPreset, onClose])

  // Handle double-click to apply immediately
  const handlePresetDoubleClick = useCallback(
    (preset: StackPreset) => {
      const newConfig = applyPreset(preset)
      onApplyPreset?.(newConfig)
      onClose?.()
    },
    [onApplyPreset, onClose]
  )

  // Handle save current stack as preset
  const handleSaveAsPreset = useCallback(() => {
    if (!currentStack || !savePresetName.trim()) return

    const tags = savePresetTags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)

    saveStackAsPreset(currentStack, savePresetName.trim(), savePresetDescription.trim(), tags)

    // Reset form and refresh
    setSavePresetName('')
    setSavePresetDescription('')
    setSavePresetTags('')
    setShowSaveDialog(false)
    setRefreshKey((k) => k + 1)
  }, [currentStack, savePresetName, savePresetDescription, savePresetTags])

  // Handle delete preset
  const handleDeletePreset = useCallback(
    (presetId: string, event: React.MouseEvent) => {
      event.stopPropagation()

      if (deleteUserPreset(presetId)) {
        if (selectedPresetId === presetId) {
          setSelectedPresetId(null)
        }
        setRefreshKey((k) => k + 1)
      }
    },
    [selectedPresetId]
  )

  // Handle search input
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setSelectedPresetId(null)
  }, [])

  // Handle category change
  const handleCategoryChange = useCallback((category: StackPresetCategory | 'all') => {
    setSelectedCategory(category)
    setSelectedPresetId(null)
  }, [])

  if (!isOpen) {
    return null
  }

  const selectedPreset = selectedPresetId
    ? filteredPresets.find((p) => p.id === selectedPresetId)
    : null

  return (
    <div className={`stack-preset-picker ${className}`}>
      <div className="stack-preset-picker__header">
        <h2 className="stack-preset-picker__title">Stack Presets</h2>
        {onClose && (
          <button
            type="button"
            className="stack-preset-picker__close-btn"
            onClick={onClose}
            aria-label="Close preset picker"
          >
            &times;
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="stack-preset-picker__search">
        <input
          type="text"
          className="stack-preset-picker__search-input"
          placeholder="Search presets by name or tags..."
          value={searchQuery}
          onChange={handleSearchChange}
          aria-label="Search presets"
        />
        {searchQuery && (
          <button
            type="button"
            className="stack-preset-picker__search-clear"
            onClick={() => {
              setSearchQuery('')
              setSelectedPresetId(null)
            }}
            aria-label="Clear search"
          >
            &times;
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div className="stack-preset-picker__categories">
        <button
          type="button"
          className={`stack-preset-picker__category ${selectedCategory === 'all' ? 'stack-preset-picker__category--active' : ''}`}
          onClick={() => handleCategoryChange('all')}
        >
          All ({categoryCounts.all})
        </button>
        {(Object.keys(STACK_PRESET_CATEGORIES) as StackPresetCategory[]).map((category) => (
          <button
            key={category}
            type="button"
            className={`stack-preset-picker__category ${selectedCategory === category ? 'stack-preset-picker__category--active' : ''}`}
            onClick={() => handleCategoryChange(category)}
            title={STACK_PRESET_CATEGORIES[category].description}
          >
            {STACK_PRESET_CATEGORIES[category].name} ({categoryCounts[category] || 0})
          </button>
        ))}
      </div>

      {/* Preset Grid */}
      <div className="stack-preset-picker__grid">
        {filteredPresets.length === 0 ? (
          <div className="stack-preset-picker__empty">
            <p>No presets found</p>
            {searchQuery && <p>Try a different search term</p>}
          </div>
        ) : (
          filteredPresets.map((preset) => (
            <div
              key={preset.id}
              className={`stack-preset-picker__preset ${selectedPresetId === preset.id ? 'stack-preset-picker__preset--selected' : ''}`}
              onClick={() => handlePresetClick(preset)}
              onDoubleClick={() => handlePresetDoubleClick(preset)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handlePresetClick(preset)
                }
              }}
              aria-selected={selectedPresetId === preset.id}
            >
              {/* Preview */}
              <div
                className="stack-preset-picker__preview"
                style={{ background: generateStackGradient(preset) }}
              >
                <div className="stack-preset-picker__layers-count">
                  {preset.config.layers.length}
                </div>
              </div>

              {/* Info */}
              <div className="stack-preset-picker__info">
                <h3 className="stack-preset-picker__preset-name">{preset.name}</h3>
                <p className="stack-preset-picker__preset-desc">{preset.description}</p>
                <div className="stack-preset-picker__tags">
                  {preset.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="stack-preset-picker__tag">
                      {tag}
                    </span>
                  ))}
                  {preset.tags.length > 3 && (
                    <span className="stack-preset-picker__tag stack-preset-picker__tag--more">
                      +{preset.tags.length - 3}
                    </span>
                  )}
                </div>
              </div>

              {/* Delete button for user presets */}
              {preset.isUserPreset && (
                <button
                  type="button"
                  className="stack-preset-picker__delete-btn"
                  onClick={(e) => handleDeletePreset(preset.id, e)}
                  aria-label={`Delete ${preset.name}`}
                  title="Delete preset"
                >
                  &times;
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Selected Preset Details */}
      {selectedPreset && (
        <div className="stack-preset-picker__details">
          <h3>{selectedPreset.name}</h3>
          <p>{selectedPreset.description}</p>
          <div className="stack-preset-picker__details-meta">
            <span>Layers: {selectedPreset.config.layers.length}</span>
            <span>Height: {selectedPreset.config.totalHeight.toFixed(1)}</span>
            <span>Category: {STACK_PRESET_CATEGORIES[selectedPreset.category].name}</span>
          </div>
          <div className="stack-preset-picker__tags">
            {selectedPreset.tags.map((tag) => (
              <span key={tag} className="stack-preset-picker__tag">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="stack-preset-picker__actions">
        <button
          type="button"
          className="stack-preset-picker__apply-btn"
          onClick={handleApplyPreset}
          disabled={!selectedPresetId}
        >
          Apply Preset
        </button>

        {currentStack && (
          <button
            type="button"
            className="stack-preset-picker__save-btn"
            onClick={() => setShowSaveDialog(true)}
          >
            Save Current as Preset
          </button>
        )}
      </div>

      {/* Save Preset Dialog */}
      {showSaveDialog && (
        <div className="stack-preset-picker__dialog-overlay">
          <div className="stack-preset-picker__dialog">
            <h3 className="stack-preset-picker__dialog-title">Save as Preset</h3>

            <div className="stack-preset-picker__dialog-field">
              <label htmlFor="preset-name">Name *</label>
              <input
                id="preset-name"
                type="text"
                value={savePresetName}
                onChange={(e) => setSavePresetName(e.target.value)}
                placeholder="My Custom Stack"
                autoFocus
              />
            </div>

            <div className="stack-preset-picker__dialog-field">
              <label htmlFor="preset-description">Description</label>
              <textarea
                id="preset-description"
                value={savePresetDescription}
                onChange={(e) => setSavePresetDescription(e.target.value)}
                placeholder="Describe your stack preset..."
                rows={3}
              />
            </div>

            <div className="stack-preset-picker__dialog-field">
              <label htmlFor="preset-tags">Tags (comma-separated)</label>
              <input
                id="preset-tags"
                type="text"
                value={savePresetTags}
                onChange={(e) => setSavePresetTags(e.target.value)}
                placeholder="stone, wall, medieval"
              />
            </div>

            <div className="stack-preset-picker__dialog-actions">
              <button
                type="button"
                className="stack-preset-picker__dialog-cancel"
                onClick={() => {
                  setShowSaveDialog(false)
                  setSavePresetName('')
                  setSavePresetDescription('')
                  setSavePresetTags('')
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="stack-preset-picker__dialog-save"
                onClick={handleSaveAsPreset}
                disabled={!savePresetName.trim()}
              >
                Save Preset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StackPresetPicker
