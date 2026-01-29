/**
 * TypeScript types for Cube Stack System
 * Types and interfaces for vertical cube stacking functionality
 *
 * ISSUE 20: Система "стопок кубиков"
 */

import type { Color3, SpectralCube, CubePhysics, MaterialType, BoundaryMode } from './cube'

/**
 * Type of transition between stack layers
 */
export type StackTransitionType = 'blend' | 'hard' | 'gradient' | 'noise'

/**
 * Stack layer position relative to others
 */
export type StackLayerPosition = 'bottom' | 'middle' | 'top' | 'single'

/**
 * Single layer in a cube stack
 * Each layer represents one vertical level of the stack
 */
export interface StackLayer {
  /** Unique identifier for this layer */
  id: string
  /** Human-readable name for the layer */
  name?: string
  /** Layer's position indicator */
  position: StackLayerPosition
  /** SpectralCube configuration for this layer */
  cubeConfig: SpectralCube
  /** Height of this layer in units (default: 1) */
  height?: number
  /** Transition settings for blending with the layer above */
  transitionToNext?: StackTransition
}

/**
 * Transition settings between two adjacent layers
 */
export interface StackTransition {
  /** Type of transition between layers */
  type: StackTransitionType
  /** Height of the transition zone in units (0 = sharp, 0.5 = half cube height) */
  blendHeight?: number
  /** Easing function for the transition (0-1 normalized position) */
  easing?: 'linear' | 'smooth' | 'ease-in' | 'ease-out'
  /** Whether to blend noise patterns between layers */
  blendNoise?: boolean
  /** Whether to blend gradients between layers */
  blendGradients?: boolean
}

/**
 * Physics properties specific to stacked structures
 */
export interface StackPhysics extends CubePhysics {
  /** Whether the stack is structurally stable */
  isStable?: boolean
  /** Total weight of the stack */
  totalWeight?: number
  /** Weight distribution factor (0 = even, 1 = bottom-heavy) */
  weightDistribution?: number
  /** Structural integrity (0-1) */
  structuralIntegrity?: number
}

/**
 * Complete configuration for a cube stack
 * Represents a vertical construction of multiple layers
 */
export interface CubeStackConfig {
  /** Unique identifier for the stack */
  id: string
  /** Text prompt used to generate this stack */
  prompt?: string
  /** Array of layers from bottom to top */
  layers: StackLayer[]
  /** Total height of the stack in units */
  totalHeight: number
  /** Physical properties of the stack as a whole */
  physics?: StackPhysics
  /** Boundary mode for seamless stitching with adjacent stacks */
  boundaryMode?: BoundaryMode
  /** Neighbor influence for boundary stitching */
  neighborInfluence?: number
  /** Metadata */
  meta?: {
    name?: string
    tags?: string[]
    author?: string
    created?: string
    modified?: string
  }
}

/**
 * Runtime state for a rendered stack
 */
export interface StackRenderState {
  /** Current LOD level for the stack */
  currentLODLevel: number
  /** Number of visible layers based on LOD */
  visibleLayers: number
  /** Whether layer transitions are simplified */
  simplifiedTransitions: boolean
  /** Distance from camera */
  distanceFromCamera: number
}

/**
 * Default transition settings
 */
export const DEFAULT_STACK_TRANSITION: StackTransition = {
  type: 'blend',
  blendHeight: 0.2,
  easing: 'smooth',
  blendNoise: true,
  blendGradients: true,
}

/**
 * Default stack physics
 */
export const DEFAULT_STACK_PHYSICS: StackPhysics = {
  material: 'stone' as MaterialType,
  density: 2.5,
  break_pattern: 'crumble',
  isStable: true,
  totalWeight: 0,
  weightDistribution: 0.5,
  structuralIntegrity: 1.0,
}

/**
 * Creates a default stack layer from a SpectralCube config
 */
export function createStackLayer(
  id: string,
  cubeConfig: SpectralCube,
  position: StackLayerPosition = 'middle',
  height: number = 1
): StackLayer {
  return {
    id,
    position,
    cubeConfig,
    height,
    transitionToNext:
      position !== 'top' && position !== 'single' ? DEFAULT_STACK_TRANSITION : undefined,
  }
}

/**
 * Creates a default CubeStackConfig from an array of layers
 */
export function createCubeStack(
  id: string,
  layers: StackLayer[],
  prompt?: string
): CubeStackConfig {
  // Update layer positions based on their index
  const positionedLayers = layers.map((layer, index) => {
    let position: StackLayerPosition
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

  // Calculate total weight based on layer physics
  const totalWeight = positionedLayers.reduce((sum, layer) => {
    const density = layer.cubeConfig.physics?.density ?? 2.5
    const height = layer.height ?? 1
    return sum + density * height
  }, 0)

  return {
    id,
    prompt,
    layers: positionedLayers,
    totalHeight,
    physics: {
      ...DEFAULT_STACK_PHYSICS,
      totalWeight,
    },
    boundaryMode: 'smooth',
    neighborInfluence: 0.5,
    meta: {
      created: new Date().toISOString(),
    },
  }
}

/**
 * Helper function to create a simple gradient stack
 * Creates a stack with smooth color transitions between layers
 */
export function createGradientStack(
  id: string,
  baseColor: Color3,
  topColor: Color3,
  layerCount: number = 3,
  material: MaterialType = 'stone'
): CubeStackConfig {
  const layers: StackLayer[] = []

  for (let i = 0; i < layerCount; i++) {
    const t = layerCount === 1 ? 0.5 : i / (layerCount - 1)
    const interpolatedColor: Color3 = [
      baseColor[0] + (topColor[0] - baseColor[0]) * t,
      baseColor[1] + (topColor[1] - baseColor[1]) * t,
      baseColor[2] + (topColor[2] - baseColor[2]) * t,
    ]

    const cubeConfig: SpectralCube = {
      id: `${id}-layer-${i}`,
      base: {
        color: interpolatedColor,
        roughness: 0.6 + t * 0.2, // Rougher at top
        transparency: 1.0,
      },
      physics: {
        material,
        density: 2.5 - t * 0.5, // Denser at bottom
        break_pattern: 'crumble',
      },
    }

    layers.push(createStackLayer(`layer-${i}`, cubeConfig))
  }

  return createCubeStack(
    id,
    layers,
    `Gradient stack from ${baseColor.join(',')} to ${topColor.join(',')}`
  )
}

/**
 * Calculate the vertical position (world Y coordinate) for a layer in the stack
 */
export function getLayerYPosition(stack: CubeStackConfig, layerIndex: number): number {
  let yPosition = 0
  for (let i = 0; i < layerIndex; i++) {
    yPosition += stack.layers[i].height ?? 1
  }
  // Add half of current layer height for center positioning
  yPosition += (stack.layers[layerIndex].height ?? 1) / 2
  return yPosition
}

/**
 * Calculate the height offset for the entire stack (centers it vertically)
 */
export function getStackCenterOffset(stack: CubeStackConfig): number {
  return stack.totalHeight / 2
}

/**
 * Get the interpolation factor between two layers at a given Y position
 * Returns a value between 0 and 1, where 0 = fully in lower layer, 1 = fully in upper layer
 */
export function getLayerBlendFactor(
  stack: CubeStackConfig,
  layerIndex: number,
  localY: number // Y position within the layer (0-1)
): number {
  const layer = stack.layers[layerIndex]
  const transition = layer.transitionToNext

  if (!transition || layerIndex >= stack.layers.length - 1) {
    return 0 // No blending
  }

  const blendHeight = transition.blendHeight ?? 0.2
  const layerHeight = layer.height ?? 1

  // Calculate transition zone (at the top of the layer)
  const transitionStart = 1 - blendHeight
  const normalizedY = localY / layerHeight

  if (normalizedY < transitionStart) {
    return 0 // Fully in current layer
  }

  // Calculate blend factor in transition zone
  const transitionProgress = (normalizedY - transitionStart) / blendHeight

  // Apply easing
  switch (transition.easing) {
    case 'linear':
      return transitionProgress
    case 'smooth':
      return transitionProgress * transitionProgress * (3 - 2 * transitionProgress) // smoothstep
    case 'ease-in':
      return transitionProgress * transitionProgress
    case 'ease-out':
      return 1 - (1 - transitionProgress) * (1 - transitionProgress)
    default:
      return transitionProgress
  }
}
