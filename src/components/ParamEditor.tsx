/**
 * ParamEditor component for manual parameter editing of cube configurations
 * Provides UI for editing base properties, gradients, noise, and physics settings
 */

import { useState, useCallback, useEffect } from 'react'
import type {
  SpectralCube,
  CubeBase,
  CubeGradient,
  CubeNoise,
  CubePhysics,
  GradientAxis,
  NoiseType,
  MaterialType,
  BreakPattern,
  Color3,
  ColorShift3,
} from '../types/cube'
import { CUBE_DEFAULTS, createDefaultCube } from '../types/cube'

/**
 * Props for ParamEditor component
 */
export interface ParamEditorProps {
  /** Current cube configuration */
  currentCube: SpectralCube | null
  /** Callback when cube is updated */
  onCubeUpdate?: (cube: SpectralCube) => void
  /** Custom class name */
  className?: string
}

/** Available gradient axes */
const GRADIENT_AXES: GradientAxis[] = ['x', 'y', 'z', 'radial']

/** Available noise types */
const NOISE_TYPES: NoiseType[] = ['perlin', 'worley', 'crackle']

/** Available material types */
const MATERIAL_TYPES: MaterialType[] = [
  'stone',
  'wood',
  'metal',
  'glass',
  'organic',
  'crystal',
  'liquid',
]

/** Available break patterns */
const BREAK_PATTERNS: BreakPattern[] = ['crumble', 'shatter', 'splinter', 'melt', 'dissolve']

/** Common noise masks */
const NOISE_MASKS = [
  'none',
  'bottom_25%',
  'bottom_40%',
  'top_25%',
  'top_40%',
  'center_50%',
  'edges_30%',
]

/**
 * Converts RGB array [0-1] to hex color string
 */
function rgbToHex(color: Color3): string {
  const r = Math.round(color[0] * 255)
  const g = Math.round(color[1] * 255)
  const b = Math.round(color[2] * 255)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Converts hex color string to RGB array [0-1]
 */
function hexToRgb(hex: string): Color3 {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (result) {
    return [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
    ]
  }
  return [0.5, 0.5, 0.5]
}

/**
 * Converts color shift array [-1 to 1] to hex for display
 */
function colorShiftToHex(shift: ColorShift3): string {
  // Convert [-1, 1] to [0, 1] for display
  const normalized: Color3 = [(shift[0] + 1) / 2, (shift[1] + 1) / 2, (shift[2] + 1) / 2]
  return rgbToHex(normalized)
}

/**
 * Converts hex to color shift array [-1 to 1]
 */
function hexToColorShift(hex: string): ColorShift3 {
  const rgb = hexToRgb(hex)
  // Convert [0, 1] to [-1, 1]
  return [rgb[0] * 2 - 1, rgb[1] * 2 - 1, rgb[2] * 2 - 1]
}

/**
 * ParamEditor component
 * Provides a comprehensive UI for editing all cube parameters
 */
export function ParamEditor({ currentCube, onCubeUpdate, className = '' }: ParamEditorProps) {
  // Use local state for editing
  const [localCube, setLocalCube] = useState<SpectralCube | null>(currentCube)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['base', 'gradients', 'noise', 'physics'])
  )

  // Sync local state with prop
  useEffect(() => {
    setLocalCube(currentCube)
  }, [currentCube])

  // Toggle section expansion
  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }, [])

  // Update cube and notify parent
  const updateCube = useCallback(
    (updates: Partial<SpectralCube>) => {
      if (!localCube) return

      const updatedCube: SpectralCube = {
        ...localCube,
        ...updates,
        meta: {
          ...localCube.meta,
          ...updates.meta,
          modified: new Date().toISOString(),
        },
      }
      setLocalCube(updatedCube)
      onCubeUpdate?.(updatedCube)
    },
    [localCube, onCubeUpdate]
  )

  // Update base properties
  const updateBase = useCallback(
    (updates: Partial<CubeBase>) => {
      if (!localCube) return
      updateCube({
        base: {
          ...localCube.base,
          ...updates,
        },
      })
    },
    [localCube, updateCube]
  )

  // Update noise properties
  const updateNoise = useCallback(
    (updates: Partial<CubeNoise>) => {
      if (!localCube) return
      updateCube({
        noise: {
          ...localCube.noise,
          ...updates,
        },
      })
    },
    [localCube, updateCube]
  )

  // Update physics properties
  const updatePhysics = useCallback(
    (updates: Partial<CubePhysics>) => {
      if (!localCube) return
      updateCube({
        physics: {
          ...localCube.physics,
          ...updates,
        },
      })
    },
    [localCube, updateCube]
  )

  // Add a new gradient
  const addGradient = useCallback(() => {
    if (!localCube) return
    const newGradient: CubeGradient = {
      axis: 'y',
      factor: 0.5,
      color_shift: [0, 0, 0.2],
    }
    updateCube({
      gradients: [...(localCube.gradients || []), newGradient],
    })
  }, [localCube, updateCube])

  // Remove a gradient
  const removeGradient = useCallback(
    (index: number) => {
      if (!localCube?.gradients) return
      const newGradients = localCube.gradients.filter((_, i) => i !== index)
      updateCube({ gradients: newGradients })
    },
    [localCube, updateCube]
  )

  // Update a specific gradient
  const updateGradient = useCallback(
    (index: number, updates: Partial<CubeGradient>) => {
      if (!localCube?.gradients) return
      const newGradients = [...localCube.gradients]
      newGradients[index] = { ...newGradients[index], ...updates }
      updateCube({ gradients: newGradients })
    },
    [localCube, updateCube]
  )

  // Reset to default values
  const handleReset = useCallback(() => {
    const id = localCube?.id || `cube_${Date.now()}`
    const defaultCube = createDefaultCube(id)
    setLocalCube(defaultCube)
    onCubeUpdate?.(defaultCube)
  }, [localCube?.id, onCubeUpdate])

  // Handle name update
  const handleNameUpdate = useCallback(
    (name: string) => {
      if (!localCube) return
      updateCube({
        meta: {
          ...localCube.meta,
          name,
          modified: new Date().toISOString(),
        },
      })
    },
    [localCube, updateCube]
  )

  if (!localCube) {
    return (
      <div className={`param-editor ${className}`}>
        <div className="param-editor__empty">
          <p>No cube selected</p>
          <p>Select a cube from the gallery or create a new one</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`param-editor ${className}`}>
      <div className="param-editor__header">
        <h2 className="param-editor__title">Edit Parameters</h2>
        <button
          type="button"
          className="param-editor__reset-btn"
          onClick={handleReset}
          title="Reset to default values"
        >
          Reset
        </button>
      </div>

      {/* Name field */}
      <div className="param-editor__name-field">
        <label htmlFor="cube-name" className="param-editor__label">
          Name
        </label>
        <input
          id="cube-name"
          type="text"
          className="param-editor__input"
          value={localCube.meta?.name || ''}
          onChange={(e) => handleNameUpdate(e.target.value)}
          placeholder="Enter cube name..."
        />
      </div>

      {/* Base Properties Section */}
      <section className="param-editor__section">
        <button
          type="button"
          className={`param-editor__section-header ${expandedSections.has('base') ? 'param-editor__section-header--expanded' : ''}`}
          onClick={() => toggleSection('base')}
          aria-expanded={expandedSections.has('base')}
        >
          <span>Base Properties</span>
          <span className="param-editor__chevron">{expandedSections.has('base') ? '▼' : '▶'}</span>
        </button>

        {expandedSections.has('base') && (
          <div className="param-editor__section-content">
            {/* Color picker */}
            <div className="param-editor__field">
              <label htmlFor="base-color" className="param-editor__label">
                Base Color
              </label>
              <div className="param-editor__color-input-wrapper">
                <input
                  id="base-color"
                  type="color"
                  className="param-editor__color-input"
                  value={rgbToHex(localCube.base.color)}
                  onChange={(e) => updateBase({ color: hexToRgb(e.target.value) })}
                />
                <span className="param-editor__color-value">{rgbToHex(localCube.base.color)}</span>
              </div>
            </div>

            {/* Roughness slider */}
            <div className="param-editor__field">
              <label htmlFor="base-roughness" className="param-editor__label">
                Roughness
                <span className="param-editor__value">
                  {(localCube.base.roughness ?? CUBE_DEFAULTS.base.roughness).toFixed(2)}
                </span>
              </label>
              <input
                id="base-roughness"
                type="range"
                className="param-editor__slider"
                min="0"
                max="1"
                step="0.01"
                value={localCube.base.roughness ?? CUBE_DEFAULTS.base.roughness}
                onChange={(e) => updateBase({ roughness: parseFloat(e.target.value) })}
              />
              <div className="param-editor__slider-labels">
                <span>Glossy</span>
                <span>Matte</span>
              </div>
            </div>

            {/* Transparency slider */}
            <div className="param-editor__field">
              <label htmlFor="base-transparency" className="param-editor__label">
                Opacity
                <span className="param-editor__value">
                  {(localCube.base.transparency ?? CUBE_DEFAULTS.base.transparency).toFixed(2)}
                </span>
              </label>
              <input
                id="base-transparency"
                type="range"
                className="param-editor__slider"
                min="0"
                max="1"
                step="0.01"
                value={localCube.base.transparency ?? CUBE_DEFAULTS.base.transparency}
                onChange={(e) => updateBase({ transparency: parseFloat(e.target.value) })}
              />
              <div className="param-editor__slider-labels">
                <span>Transparent</span>
                <span>Opaque</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Gradients Section */}
      <section className="param-editor__section">
        <button
          type="button"
          className={`param-editor__section-header ${expandedSections.has('gradients') ? 'param-editor__section-header--expanded' : ''}`}
          onClick={() => toggleSection('gradients')}
          aria-expanded={expandedSections.has('gradients')}
        >
          <span>Gradients ({localCube.gradients?.length || 0})</span>
          <span className="param-editor__chevron">
            {expandedSections.has('gradients') ? '▼' : '▶'}
          </span>
        </button>

        {expandedSections.has('gradients') && (
          <div className="param-editor__section-content">
            {/* Gradient list */}
            {localCube.gradients?.map((gradient, index) => (
              <div key={index} className="param-editor__gradient-item">
                <div className="param-editor__gradient-header">
                  <span className="param-editor__gradient-title">Gradient {index + 1}</span>
                  <button
                    type="button"
                    className="param-editor__remove-btn"
                    onClick={() => removeGradient(index)}
                    aria-label={`Remove gradient ${index + 1}`}
                  >
                    ×
                  </button>
                </div>

                {/* Axis selector */}
                <div className="param-editor__field">
                  <label className="param-editor__label">Axis</label>
                  <div className="param-editor__axis-buttons">
                    {GRADIENT_AXES.map((axis) => (
                      <button
                        key={axis}
                        type="button"
                        className={`param-editor__axis-btn ${gradient.axis === axis ? 'param-editor__axis-btn--active' : ''}`}
                        onClick={() => updateGradient(index, { axis })}
                      >
                        {axis.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Factor slider */}
                <div className="param-editor__field">
                  <label className="param-editor__label">
                    Factor
                    <span className="param-editor__value">{gradient.factor.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    className="param-editor__slider"
                    min="0"
                    max="1"
                    step="0.01"
                    value={gradient.factor}
                    onChange={(e) => updateGradient(index, { factor: parseFloat(e.target.value) })}
                  />
                </div>

                {/* Color shift picker */}
                <div className="param-editor__field">
                  <label className="param-editor__label">Color Shift</label>
                  <div className="param-editor__color-input-wrapper">
                    <input
                      type="color"
                      className="param-editor__color-input"
                      value={colorShiftToHex(gradient.color_shift)}
                      onChange={(e) =>
                        updateGradient(index, { color_shift: hexToColorShift(e.target.value) })
                      }
                    />
                    <span className="param-editor__color-value">
                      {colorShiftToHex(gradient.color_shift)}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Add gradient button */}
            <button type="button" className="param-editor__add-btn" onClick={addGradient}>
              + Add Gradient
            </button>
          </div>
        )}
      </section>

      {/* Noise Section */}
      <section className="param-editor__section">
        <button
          type="button"
          className={`param-editor__section-header ${expandedSections.has('noise') ? 'param-editor__section-header--expanded' : ''}`}
          onClick={() => toggleSection('noise')}
          aria-expanded={expandedSections.has('noise')}
        >
          <span>Noise Settings</span>
          <span className="param-editor__chevron">{expandedSections.has('noise') ? '▼' : '▶'}</span>
        </button>

        {expandedSections.has('noise') && (
          <div className="param-editor__section-content">
            {/* Noise type selector */}
            <div className="param-editor__field">
              <label htmlFor="noise-type" className="param-editor__label">
                Type
              </label>
              <select
                id="noise-type"
                className="param-editor__select"
                value={localCube.noise?.type ?? CUBE_DEFAULTS.noise.type}
                onChange={(e) => updateNoise({ type: e.target.value as NoiseType })}
              >
                {NOISE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Scale slider */}
            <div className="param-editor__field">
              <label htmlFor="noise-scale" className="param-editor__label">
                Scale
                <span className="param-editor__value">
                  {(localCube.noise?.scale ?? CUBE_DEFAULTS.noise.scale).toFixed(1)}
                </span>
              </label>
              <input
                id="noise-scale"
                type="range"
                className="param-editor__slider"
                min="1"
                max="32"
                step="0.5"
                value={localCube.noise?.scale ?? CUBE_DEFAULTS.noise.scale}
                onChange={(e) => updateNoise({ scale: parseFloat(e.target.value) })}
              />
            </div>

            {/* Octaves slider */}
            <div className="param-editor__field">
              <label htmlFor="noise-octaves" className="param-editor__label">
                Octaves
                <span className="param-editor__value">
                  {localCube.noise?.octaves ?? CUBE_DEFAULTS.noise.octaves}
                </span>
              </label>
              <input
                id="noise-octaves"
                type="range"
                className="param-editor__slider"
                min="1"
                max="8"
                step="1"
                value={localCube.noise?.octaves ?? CUBE_DEFAULTS.noise.octaves}
                onChange={(e) => updateNoise({ octaves: parseInt(e.target.value, 10) })}
              />
            </div>

            {/* Persistence slider */}
            <div className="param-editor__field">
              <label htmlFor="noise-persistence" className="param-editor__label">
                Persistence
                <span className="param-editor__value">
                  {(localCube.noise?.persistence ?? CUBE_DEFAULTS.noise.persistence).toFixed(2)}
                </span>
              </label>
              <input
                id="noise-persistence"
                type="range"
                className="param-editor__slider"
                min="0.1"
                max="1"
                step="0.05"
                value={localCube.noise?.persistence ?? CUBE_DEFAULTS.noise.persistence}
                onChange={(e) => updateNoise({ persistence: parseFloat(e.target.value) })}
              />
            </div>

            {/* Mask selector */}
            <div className="param-editor__field">
              <label htmlFor="noise-mask" className="param-editor__label">
                Mask
              </label>
              <select
                id="noise-mask"
                className="param-editor__select"
                value={localCube.noise?.mask || 'none'}
                onChange={(e) =>
                  updateNoise({ mask: e.target.value === 'none' ? undefined : e.target.value })
                }
              >
                {NOISE_MASKS.map((mask) => (
                  <option key={mask} value={mask}>
                    {mask === 'none' ? 'No Mask' : mask}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </section>

      {/* Physics Section */}
      <section className="param-editor__section">
        <button
          type="button"
          className={`param-editor__section-header ${expandedSections.has('physics') ? 'param-editor__section-header--expanded' : ''}`}
          onClick={() => toggleSection('physics')}
          aria-expanded={expandedSections.has('physics')}
        >
          <span>Physics Properties</span>
          <span className="param-editor__chevron">
            {expandedSections.has('physics') ? '▼' : '▶'}
          </span>
        </button>

        {expandedSections.has('physics') && (
          <div className="param-editor__section-content">
            {/* Material type selector */}
            <div className="param-editor__field">
              <label htmlFor="physics-material" className="param-editor__label">
                Material
              </label>
              <select
                id="physics-material"
                className="param-editor__select"
                value={localCube.physics?.material ?? CUBE_DEFAULTS.physics.material}
                onChange={(e) => updatePhysics({ material: e.target.value as MaterialType })}
              >
                {MATERIAL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Density slider */}
            <div className="param-editor__field">
              <label htmlFor="physics-density" className="param-editor__label">
                Density (g/cm³)
                <span className="param-editor__value">
                  {(localCube.physics?.density ?? CUBE_DEFAULTS.physics.density).toFixed(2)}
                </span>
              </label>
              <input
                id="physics-density"
                type="range"
                className="param-editor__slider"
                min="0.1"
                max="10"
                step="0.1"
                value={localCube.physics?.density ?? CUBE_DEFAULTS.physics.density}
                onChange={(e) => updatePhysics({ density: parseFloat(e.target.value) })}
              />
            </div>

            {/* Break pattern selector */}
            <div className="param-editor__field">
              <label htmlFor="physics-break-pattern" className="param-editor__label">
                Break Pattern
              </label>
              <select
                id="physics-break-pattern"
                className="param-editor__select"
                value={localCube.physics?.break_pattern ?? CUBE_DEFAULTS.physics.break_pattern}
                onChange={(e) => updatePhysics({ break_pattern: e.target.value as BreakPattern })}
              >
                {BREAK_PATTERNS.map((pattern) => (
                  <option key={pattern} value={pattern}>
                    {pattern.charAt(0).toUpperCase() + pattern.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export default ParamEditor
