/**
 * StackEditor Component
 * Provides UI for editing vertical stacks of cubes (CubeStackConfig)
 *
 * ISSUE 29: Редактор стопок кубиков (Stack Editor)
 *
 * Features:
 * - Visual representation of layers (vertical list)
 * - Add/remove/reorder layers
 * - Drag-and-drop for changing layer order
 * - Layer editing (name, height, cube config reference)
 * - Transition editing (type, blend height, easing)
 * - Stack physics display (stability, weight, integrity)
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import type {
  CubeStackConfig,
  StackLayer,
  StackTransition,
  StackTransitionType,
  StackPhysics,
} from '../types/stack'
import {
  DEFAULT_STACK_TRANSITION,
  DEFAULT_STACK_PHYSICS,
  createStackLayer,
  createCubeStack,
} from '../types/stack'
import type { SpectralCube, Color3 } from '../types/cube'
import { createDefaultCube } from '../types/cube'

/**
 * Props for StackEditor component
 */
export interface StackEditorProps {
  /** Current stack configuration */
  currentStack: CubeStackConfig | null
  /** Callback when stack is updated */
  onStackUpdate?: (stack: CubeStackConfig) => void
  /** Callback to open ParamEditor for a specific layer's cube config */
  onEditLayerCube?: (layerIndex: number, cubeConfig: SpectralCube) => void
  /** Custom class name */
  className?: string
}

/** Available transition types */
const TRANSITION_TYPES: StackTransitionType[] = ['blend', 'hard', 'gradient', 'noise']

/** Available easing functions */
const EASING_TYPES: Array<'linear' | 'smooth' | 'ease-in' | 'ease-out'> = [
  'linear',
  'smooth',
  'ease-in',
  'ease-out',
]

/** Transition type descriptions */
const TRANSITION_TYPE_DESCRIPTIONS: Record<StackTransitionType, string> = {
  blend: 'Smooth blending between layers',
  hard: 'Sharp boundary between layers',
  gradient: 'Color gradient transition',
  noise: 'Noisy/organic transition',
}

/** Easing descriptions */
const EASING_DESCRIPTIONS: Record<string, string> = {
  linear: 'Constant speed transition',
  smooth: 'Accelerate and decelerate',
  'ease-in': 'Start slow, end fast',
  'ease-out': 'Start fast, end slow',
}

/**
 * Generates a unique ID for new layers
 */
function generateLayerId(): string {
  return `layer-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

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
 * Drag state interface for tracking drag-and-drop operations
 */
interface DragState {
  isDragging: boolean
  draggedIndex: number | null
  dropTargetIndex: number | null
}

/**
 * StackEditor component
 * Comprehensive UI for editing cube stack configurations
 */
export function StackEditor({
  currentStack,
  onStackUpdate,
  onEditLayerCube,
  className = '',
}: StackEditorProps) {
  // Local state for editing
  const [localStack, setLocalStack] = useState<CubeStackConfig | null>(currentStack)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['layers', 'physics'])
  )
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set())
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedIndex: null,
    dropTargetIndex: null,
  })

  // Ref for drag ghost element
  const dragGhostRef = useRef<HTMLDivElement | null>(null)

  // Sync local state with prop
  useEffect(() => {
    setLocalStack(currentStack)
  }, [currentStack])

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

  // Toggle layer expansion
  const toggleLayer = useCallback((layerId: string) => {
    setExpandedLayers((prev) => {
      const next = new Set(prev)
      if (next.has(layerId)) {
        next.delete(layerId)
      } else {
        next.add(layerId)
      }
      return next
    })
  }, [])

  // Update stack and notify parent
  const updateStack = useCallback(
    (updates: Partial<CubeStackConfig>) => {
      if (!localStack) return

      const updatedStack: CubeStackConfig = {
        ...localStack,
        ...updates,
        meta: {
          ...localStack.meta,
          ...updates.meta,
          modified: new Date().toISOString(),
        },
      }
      setLocalStack(updatedStack)
      onStackUpdate?.(updatedStack)
    },
    [localStack, onStackUpdate]
  )

  // Recalculate stack properties after layer changes
  const recalculateStack = useCallback(
    (layers: StackLayer[]): Partial<CubeStackConfig> => {
      // Update positions based on index
      const positionedLayers = layers.map((layer, index) => {
        let position: 'bottom' | 'middle' | 'top' | 'single'
        if (layers.length === 1) {
          position = 'single'
        } else if (index === 0) {
          position = 'bottom'
        } else if (index === layers.length - 1) {
          position = 'top'
        } else {
          position = 'middle'
        }

        return {
          ...layer,
          position,
          transitionToNext:
            position !== 'top' && position !== 'single'
              ? (layer.transitionToNext ?? DEFAULT_STACK_TRANSITION)
              : undefined,
        }
      })

      // Calculate total height
      const totalHeight = positionedLayers.reduce((sum, layer) => sum + (layer.height ?? 1), 0)

      // Calculate total weight
      const totalWeight = positionedLayers.reduce((sum, layer) => {
        const density = layer.cubeConfig.physics?.density ?? 2.5
        const height = layer.height ?? 1
        return sum + density * height
      }, 0)

      return {
        layers: positionedLayers,
        totalHeight,
        physics: {
          ...(localStack?.physics ?? DEFAULT_STACK_PHYSICS),
          totalWeight,
        },
      }
    },
    [localStack?.physics]
  )

  // Add a new layer
  const addLayer = useCallback(() => {
    if (!localStack) return

    const newLayerId = generateLayerId()
    const newCubeId = `cube-${newLayerId}`
    const newCube = createDefaultCube(newCubeId)

    // Add layer at the top (before the current top layer becomes middle)
    const newLayer = createStackLayer(newLayerId, newCube, 'top', 1)
    newLayer.name = `Layer ${localStack.layers.length + 1}`

    const newLayers = [...localStack.layers, newLayer]
    const updates = recalculateStack(newLayers)
    updateStack(updates)

    // Auto-expand the new layer
    setExpandedLayers((prev) => new Set([...prev, newLayerId]))
  }, [localStack, updateStack, recalculateStack])

  // Remove a layer
  const removeLayer = useCallback(
    (index: number) => {
      if (!localStack || localStack.layers.length <= 1) return

      const newLayers = localStack.layers.filter((_, i) => i !== index)
      const updates = recalculateStack(newLayers)
      updateStack(updates)
    },
    [localStack, updateStack, recalculateStack]
  )

  // Update a specific layer
  const updateLayer = useCallback(
    (index: number, updates: Partial<StackLayer>) => {
      if (!localStack) return

      const newLayers = [...localStack.layers]
      newLayers[index] = { ...newLayers[index], ...updates }

      const stackUpdates = recalculateStack(newLayers)
      updateStack(stackUpdates)
    },
    [localStack, updateStack, recalculateStack]
  )

  // Update layer transition
  const updateLayerTransition = useCallback(
    (index: number, updates: Partial<StackTransition>) => {
      if (!localStack) return

      const layer = localStack.layers[index]
      if (!layer.transitionToNext) return

      updateLayer(index, {
        transitionToNext: {
          ...layer.transitionToNext,
          ...updates,
        },
      })
    },
    [localStack, updateLayer]
  )

  // Move layer up (toward top)
  const moveLayerUp = useCallback(
    (index: number) => {
      if (!localStack || index >= localStack.layers.length - 1) return

      const newLayers = [...localStack.layers]
      const temp = newLayers[index]
      newLayers[index] = newLayers[index + 1]
      newLayers[index + 1] = temp

      const updates = recalculateStack(newLayers)
      updateStack(updates)
    },
    [localStack, updateStack, recalculateStack]
  )

  // Move layer down (toward bottom)
  const moveLayerDown = useCallback(
    (index: number) => {
      if (!localStack || index <= 0) return

      const newLayers = [...localStack.layers]
      const temp = newLayers[index]
      newLayers[index] = newLayers[index - 1]
      newLayers[index - 1] = temp

      const updates = recalculateStack(newLayers)
      updateStack(updates)
    },
    [localStack, updateStack, recalculateStack]
  )

  // Drag-and-drop handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, index: number) => {
      if (!localStack) return

      setDragState({
        isDragging: true,
        draggedIndex: index,
        dropTargetIndex: null,
      })

      // Set drag data
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', String(index))

      // Create custom drag image
      const dragGhost = document.createElement('div')
      dragGhost.className = 'stack-editor__drag-ghost'
      dragGhost.textContent = localStack.layers[index].name || `Layer ${index + 1}`
      document.body.appendChild(dragGhost)
      dragGhostRef.current = dragGhost
      e.dataTransfer.setDragImage(dragGhost, 0, 0)
    },
    [localStack]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'

      if (dragState.draggedIndex !== null && dragState.draggedIndex !== targetIndex) {
        setDragState((prev) => ({
          ...prev,
          dropTargetIndex: targetIndex,
        }))
      }
    },
    [dragState.draggedIndex]
  )

  const handleDragEnd = useCallback(() => {
    // Cleanup drag ghost
    if (dragGhostRef.current) {
      document.body.removeChild(dragGhostRef.current)
      dragGhostRef.current = null
    }

    setDragState({
      isDragging: false,
      draggedIndex: null,
      dropTargetIndex: null,
    })
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
      e.preventDefault()

      if (!localStack || dragState.draggedIndex === null) return

      const sourceIndex = dragState.draggedIndex
      if (sourceIndex === targetIndex) {
        handleDragEnd()
        return
      }

      // Reorder layers
      const newLayers = [...localStack.layers]
      const [draggedLayer] = newLayers.splice(sourceIndex, 1)
      newLayers.splice(targetIndex, 0, draggedLayer)

      const updates = recalculateStack(newLayers)
      updateStack(updates)
      handleDragEnd()
    },
    [localStack, dragState.draggedIndex, recalculateStack, updateStack, handleDragEnd]
  )

  // Update stack physics
  const updatePhysics = useCallback(
    (updates: Partial<StackPhysics>) => {
      if (!localStack) return
      updateStack({
        physics: {
          ...localStack.physics,
          ...updates,
        },
      })
    },
    [localStack, updateStack]
  )

  // Reset to default stack
  const handleReset = useCallback(() => {
    const defaultCube = createDefaultCube('default-layer-cube')
    const defaultLayer = createStackLayer('default-layer', defaultCube, 'single', 1)
    defaultLayer.name = 'Layer 1'

    const newStack = createCubeStack(localStack?.id || `stack-${Date.now()}`, [defaultLayer])
    setLocalStack(newStack)
    onStackUpdate?.(newStack)
  }, [localStack?.id, onStackUpdate])

  // Handle name update
  const handleNameUpdate = useCallback(
    (name: string) => {
      if (!localStack) return
      updateStack({
        meta: {
          ...localStack.meta,
          name,
        },
      })
    },
    [localStack, updateStack]
  )

  // Calculate structural integrity based on physics
  const structuralIntegrity = useMemo(() => {
    if (!localStack?.physics) return 1.0
    return localStack.physics.structuralIntegrity ?? 1.0
  }, [localStack?.physics])

  // Calculate stability indicator
  const stabilityStatus = useMemo(() => {
    if (!localStack?.physics) return { status: 'stable', color: '#22c55e' }

    const integrity = localStack.physics.structuralIntegrity ?? 1.0
    const isStable = localStack.physics.isStable ?? true

    if (!isStable || integrity < 0.3) {
      return { status: 'Unstable', color: '#ef4444' }
    }
    if (integrity < 0.6) {
      return { status: 'Warning', color: '#f59e0b' }
    }
    return { status: 'Stable', color: '#22c55e' }
  }, [localStack?.physics])

  // If no stack is selected
  if (!localStack) {
    return (
      <div className={`stack-editor ${className}`}>
        <div className="stack-editor__empty">
          <p>No stack selected</p>
          <p>Create a new stack or select one from the gallery</p>
          <button
            type="button"
            className="stack-editor__create-btn"
            onClick={() => {
              const defaultCube = createDefaultCube('new-layer-cube')
              const defaultLayer = createStackLayer('new-layer', defaultCube, 'single', 1)
              defaultLayer.name = 'Layer 1'
              const newStack = createCubeStack(`stack-${Date.now()}`, [defaultLayer])
              setLocalStack(newStack)
              onStackUpdate?.(newStack)
            }}
          >
            Create New Stack
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`stack-editor ${className}`}>
      <div className="stack-editor__header">
        <h2 className="stack-editor__title">Stack Editor</h2>
        <button
          type="button"
          className="stack-editor__reset-btn"
          onClick={handleReset}
          title="Reset to default stack"
        >
          Reset
        </button>
      </div>

      {/* Stack Name */}
      <div className="stack-editor__name-field">
        <label htmlFor="stack-name" className="stack-editor__label">
          Stack Name
        </label>
        <input
          id="stack-name"
          type="text"
          className="stack-editor__input"
          value={localStack.meta?.name || ''}
          onChange={(e) => handleNameUpdate(e.target.value)}
          placeholder="Enter stack name..."
        />
      </div>

      {/* Stack Summary */}
      <div className="stack-editor__summary">
        <div className="stack-editor__summary-item">
          <span className="stack-editor__summary-label">Layers:</span>
          <span className="stack-editor__summary-value">{localStack.layers.length}</span>
        </div>
        <div className="stack-editor__summary-item">
          <span className="stack-editor__summary-label">Total Height:</span>
          <span className="stack-editor__summary-value">{localStack.totalHeight.toFixed(1)}</span>
        </div>
      </div>

      {/* Layers Section */}
      <section className="stack-editor__section">
        <button
          type="button"
          className={`stack-editor__section-header ${expandedSections.has('layers') ? 'stack-editor__section-header--expanded' : ''}`}
          onClick={() => toggleSection('layers')}
          aria-expanded={expandedSections.has('layers')}
        >
          <span>Layers ({localStack.layers.length})</span>
          <span className="stack-editor__chevron">
            {expandedSections.has('layers') ? '▼' : '▶'}
          </span>
        </button>

        {expandedSections.has('layers') && (
          <div className="stack-editor__section-content">
            {/* Layer list - rendered from top to bottom (reverse order) */}
            <div className="stack-editor__layers-container">
              <div className="stack-editor__layers-label">
                <span className="stack-editor__layers-top">Top</span>
                <span className="stack-editor__layers-bottom">Bottom</span>
              </div>

              <div className="stack-editor__layers-list">
                {[...localStack.layers].reverse().map((layer, reversedIndex) => {
                  const index = localStack.layers.length - 1 - reversedIndex
                  const isExpanded = expandedLayers.has(layer.id)
                  const isDragTarget = dragState.isDragging && dragState.dropTargetIndex === index
                  const isDragged = dragState.isDragging && dragState.draggedIndex === index

                  return (
                    <div
                      key={layer.id}
                      className={`stack-editor__layer ${isDragTarget ? 'stack-editor__layer--drag-target' : ''} ${isDragged ? 'stack-editor__layer--dragging' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      onDrop={(e) => handleDrop(e, index)}
                    >
                      {/* Layer Header */}
                      <div className="stack-editor__layer-header">
                        <div className="stack-editor__layer-drag-handle" title="Drag to reorder">
                          ⋮⋮
                        </div>
                        <div
                          className="stack-editor__layer-color-preview"
                          style={{ backgroundColor: rgbToHex(layer.cubeConfig.base.color) }}
                          title={`Color: ${rgbToHex(layer.cubeConfig.base.color)}`}
                        />
                        <button
                          type="button"
                          className="stack-editor__layer-title"
                          onClick={() => toggleLayer(layer.id)}
                          aria-expanded={isExpanded}
                        >
                          <span>{layer.name || `Layer ${index + 1}`}</span>
                          <span className="stack-editor__layer-position">({layer.position})</span>
                        </button>
                        <div className="stack-editor__layer-actions">
                          <button
                            type="button"
                            className="stack-editor__layer-move-btn"
                            onClick={() => moveLayerUp(index)}
                            disabled={index === localStack.layers.length - 1}
                            title="Move up (toward top)"
                            aria-label="Move layer up"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            className="stack-editor__layer-move-btn"
                            onClick={() => moveLayerDown(index)}
                            disabled={index === 0}
                            title="Move down (toward bottom)"
                            aria-label="Move layer down"
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            className="stack-editor__layer-remove-btn"
                            onClick={() => removeLayer(index)}
                            disabled={localStack.layers.length <= 1}
                            title="Remove layer"
                            aria-label="Remove layer"
                          >
                            ×
                          </button>
                        </div>
                      </div>

                      {/* Layer Content (expanded) */}
                      {isExpanded && (
                        <div className="stack-editor__layer-content">
                          {/* Layer Name */}
                          <div className="stack-editor__field">
                            <label className="stack-editor__label">Name</label>
                            <input
                              type="text"
                              className="stack-editor__input"
                              value={layer.name || ''}
                              onChange={(e) => updateLayer(index, { name: e.target.value })}
                              placeholder="Layer name..."
                            />
                          </div>

                          {/* Layer Height */}
                          <div className="stack-editor__field">
                            <label className="stack-editor__label">
                              Height
                              <span className="stack-editor__value">
                                {(layer.height ?? 1).toFixed(1)}
                              </span>
                            </label>
                            <input
                              type="range"
                              className="stack-editor__slider"
                              min="0.5"
                              max="3"
                              step="0.1"
                              value={layer.height ?? 1}
                              onChange={(e) =>
                                updateLayer(index, { height: parseFloat(e.target.value) })
                              }
                            />
                            <div className="stack-editor__slider-labels">
                              <span>Thin</span>
                              <span>Tall</span>
                            </div>
                          </div>

                          {/* Edit Cube Config Button */}
                          <button
                            type="button"
                            className="stack-editor__edit-cube-btn"
                            onClick={() => onEditLayerCube?.(index, layer.cubeConfig)}
                          >
                            Edit Cube Parameters
                          </button>

                          {/* Transition Settings (if not top layer) */}
                          {layer.transitionToNext && (
                            <div className="stack-editor__transition">
                              <h4 className="stack-editor__transition-title">
                                Transition to Next Layer
                              </h4>

                              {/* Transition Type */}
                              <div className="stack-editor__field">
                                <label className="stack-editor__label">Type</label>
                                <select
                                  className="stack-editor__select"
                                  value={layer.transitionToNext.type}
                                  onChange={(e) =>
                                    updateLayerTransition(index, {
                                      type: e.target.value as StackTransitionType,
                                    })
                                  }
                                >
                                  {TRANSITION_TYPES.map((type) => (
                                    <option key={type} value={type}>
                                      {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </option>
                                  ))}
                                </select>
                                <p className="stack-editor__description">
                                  {TRANSITION_TYPE_DESCRIPTIONS[layer.transitionToNext.type]}
                                </p>
                              </div>

                              {/* Blend Height */}
                              <div className="stack-editor__field">
                                <label className="stack-editor__label">
                                  Blend Height
                                  <span className="stack-editor__value">
                                    {(layer.transitionToNext.blendHeight ?? 0.2).toFixed(2)}
                                  </span>
                                </label>
                                <input
                                  type="range"
                                  className="stack-editor__slider"
                                  min="0"
                                  max="1"
                                  step="0.05"
                                  value={layer.transitionToNext.blendHeight ?? 0.2}
                                  onChange={(e) =>
                                    updateLayerTransition(index, {
                                      blendHeight: parseFloat(e.target.value),
                                    })
                                  }
                                />
                                <div className="stack-editor__slider-labels">
                                  <span>Sharp</span>
                                  <span>Gradual</span>
                                </div>
                              </div>

                              {/* Easing */}
                              <div className="stack-editor__field">
                                <label className="stack-editor__label">Easing</label>
                                <select
                                  className="stack-editor__select"
                                  value={layer.transitionToNext.easing ?? 'smooth'}
                                  onChange={(e) =>
                                    updateLayerTransition(index, {
                                      easing: e.target.value as
                                        | 'linear'
                                        | 'smooth'
                                        | 'ease-in'
                                        | 'ease-out',
                                    })
                                  }
                                >
                                  {EASING_TYPES.map((type) => (
                                    <option key={type} value={type}>
                                      {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </option>
                                  ))}
                                </select>
                                <p className="stack-editor__description">
                                  {EASING_DESCRIPTIONS[layer.transitionToNext.easing ?? 'smooth']}
                                </p>
                              </div>

                              {/* Blend Options */}
                              <div className="stack-editor__field stack-editor__checkboxes">
                                <label className="stack-editor__checkbox-label">
                                  <input
                                    type="checkbox"
                                    checked={layer.transitionToNext.blendNoise ?? true}
                                    onChange={(e) =>
                                      updateLayerTransition(index, { blendNoise: e.target.checked })
                                    }
                                  />
                                  <span>Blend Noise</span>
                                </label>
                                <label className="stack-editor__checkbox-label">
                                  <input
                                    type="checkbox"
                                    checked={layer.transitionToNext.blendGradients ?? true}
                                    onChange={(e) =>
                                      updateLayerTransition(index, {
                                        blendGradients: e.target.checked,
                                      })
                                    }
                                  />
                                  <span>Blend Gradients</span>
                                </label>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Add Layer Button */}
            <button type="button" className="stack-editor__add-btn" onClick={addLayer}>
              + Add Layer
            </button>
          </div>
        )}
      </section>

      {/* Stack Physics Section */}
      <section className="stack-editor__section">
        <button
          type="button"
          className={`stack-editor__section-header ${expandedSections.has('physics') ? 'stack-editor__section-header--expanded' : ''}`}
          onClick={() => toggleSection('physics')}
          aria-expanded={expandedSections.has('physics')}
        >
          <span>Stack Physics</span>
          <span className="stack-editor__chevron">
            {expandedSections.has('physics') ? '▼' : '▶'}
          </span>
        </button>

        {expandedSections.has('physics') && (
          <div className="stack-editor__section-content">
            {/* Stability Indicator */}
            <div className="stack-editor__physics-indicator">
              <span className="stack-editor__physics-label">Stability:</span>
              <span
                className="stack-editor__physics-status"
                style={{ color: stabilityStatus.color }}
              >
                {stabilityStatus.status}
              </span>
            </div>

            {/* Total Weight (read-only) */}
            <div className="stack-editor__physics-indicator">
              <span className="stack-editor__physics-label">Total Weight:</span>
              <span className="stack-editor__physics-value">
                {(localStack.physics?.totalWeight ?? 0).toFixed(1)} units
              </span>
            </div>

            {/* Structural Integrity (read-only visual) */}
            <div className="stack-editor__field">
              <label className="stack-editor__label">
                Structural Integrity
                <span className="stack-editor__value">
                  {(structuralIntegrity * 100).toFixed(0)}%
                </span>
              </label>
              <div className="stack-editor__integrity-bar">
                <div
                  className="stack-editor__integrity-fill"
                  style={{
                    width: `${structuralIntegrity * 100}%`,
                    backgroundColor: stabilityStatus.color,
                  }}
                />
              </div>
            </div>

            {/* Weight Distribution */}
            <div className="stack-editor__field">
              <label className="stack-editor__label">
                Weight Distribution
                <span className="stack-editor__value">
                  {(localStack.physics?.weightDistribution ?? 0.5).toFixed(2)}
                </span>
              </label>
              <input
                type="range"
                className="stack-editor__slider"
                min="0"
                max="1"
                step="0.05"
                value={localStack.physics?.weightDistribution ?? 0.5}
                onChange={(e) => updatePhysics({ weightDistribution: parseFloat(e.target.value) })}
              />
              <div className="stack-editor__slider-labels">
                <span>Even</span>
                <span>Bottom-heavy</span>
              </div>
            </div>

            {/* Is Stable Checkbox */}
            <div className="stack-editor__field">
              <label className="stack-editor__checkbox-label">
                <input
                  type="checkbox"
                  checked={localStack.physics?.isStable ?? true}
                  onChange={(e) => updatePhysics({ isStable: e.target.checked })}
                />
                <span>Mark as Stable</span>
              </label>
              <p className="stack-editor__description">
                Manually override the stability status of this stack.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export default StackEditor
