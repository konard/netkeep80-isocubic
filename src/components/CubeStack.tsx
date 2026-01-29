/**
 * CubeStack Component
 * React Three Fiber component for rendering vertical cube stacks
 *
 * ISSUE 20: Система "стопок кубиков"
 *
 * Features:
 * - Renders multiple cube layers vertically stacked
 * - Supports smooth transitions between layers
 * - LOD support for performance optimization
 * - Seamless boundary stitching with adjacent stacks
 */

import { useMemo } from 'react'
import { ParametricCube } from './ParametricCube'
import type { CubeStackConfig, StackLayer } from '../types/stack'
import { getLayerYPosition, getStackCenterOffset } from '../types/stack'
import type { LODLevel, LODLevelSettings } from '../types/lod'
import type { SpectralCube } from '../types/cube'

/**
 * Props for the CubeStack component
 */
export interface CubeStackProps {
  /** Stack configuration containing all layers */
  config: CubeStackConfig
  /** Position in 3D space [x, y, z] */
  position?: [number, number, number]
  /** Scale multiplier for the entire stack */
  scale?: number
  /** Whether to animate rotation */
  animate?: boolean
  /** Rotation speed (radians per second) */
  rotationSpeed?: number
  /** Grid position for seamless stitching [x, y, z] - used when rendering stack grids */
  gridPosition?: [number, number, number]
  /** LOD level to apply (0 = full detail, 4 = lowest detail) */
  lodLevel?: LODLevel
  /** Custom LOD settings (overrides defaults if provided) */
  lodSettings?: LODLevelSettings
  /** Whether to center the stack vertically (default: true) */
  centerVertically?: boolean
  /** Whether to show layer debug colors (for development) */
  debugLayers?: boolean
}

/**
 * Internal type for rendered layer data
 */
interface RenderedLayer {
  key: string
  layer: StackLayer
  worldPosition: [number, number, number]
  gridPosition: [number, number, number]
  layerIndex: number
}

/**
 * CubeStack - Renders a vertical stack of parametric cubes
 *
 * Features:
 * - Real-time rendering of multi-layer cube stacks
 * - Support for layer transitions and blending
 * - Seamless boundary stitching when used in grids
 * - Optional animation
 * - LOD (Level of Detail) support for performance optimization
 */
export function CubeStack({
  config,
  position = [0, 0, 0],
  scale = 1,
  animate = false,
  rotationSpeed = 0.5,
  gridPosition = [0, 0, 0],
  lodLevel,
  lodSettings,
  centerVertically = true,
  debugLayers = false,
}: CubeStackProps) {
  // Calculate rendered layers with positions
  const renderedLayers = useMemo<RenderedLayer[]>(() => {
    const layers: RenderedLayer[] = []
    const centerOffset = centerVertically ? getStackCenterOffset(config) : 0

    // Apply LOD-based layer simplification
    let visibleLayers = config.layers
    if (lodLevel !== undefined && lodLevel >= 3) {
      // At high LOD levels (far from camera), simplify to fewer layers
      if (lodLevel === 4 && config.layers.length > 2) {
        // LOD 4: Only show bottom and top layers
        visibleLayers = [config.layers[0], config.layers[config.layers.length - 1]]
      } else if (lodLevel === 3 && config.layers.length > 3) {
        // LOD 3: Show bottom, middle, and top layers
        const midIndex = Math.floor(config.layers.length / 2)
        visibleLayers = [
          config.layers[0],
          config.layers[midIndex],
          config.layers[config.layers.length - 1],
        ]
      }
    }

    visibleLayers.forEach((layer, index) => {
      // Find original layer index for position calculation
      const originalIndex = config.layers.indexOf(layer)
      const layerY = getLayerYPosition(config, originalIndex)

      // Calculate world position for this layer
      const worldPosition: [number, number, number] = [
        position[0],
        position[1] + (layerY - centerOffset) * scale,
        position[2],
      ]

      // Calculate grid position for seamless stitching
      // Y grid position is based on the layer index for continuous vertical stitching
      const layerGridPosition: [number, number, number] = [
        gridPosition[0],
        gridPosition[1] + originalIndex,
        gridPosition[2],
      ]

      layers.push({
        key: `layer-${layer.id}-${index}`,
        layer,
        worldPosition,
        gridPosition: layerGridPosition,
        layerIndex: originalIndex,
      })
    })

    return layers
  }, [config, position, scale, centerVertically, gridPosition, lodLevel])

  // Apply LOD settings to layer configs
  const getLayerConfig = useMemo(() => {
    return (layer: StackLayer, index: number): SpectralCube => {
      const baseConfig = layer.cubeConfig

      // If debug mode, modify colors to show layer boundaries
      if (debugLayers) {
        const debugHue = ((index * 60) % 360) / 360 // Different hue per layer
        const debugColor: [number, number, number] = [
          Math.max(0, Math.min(1, baseConfig.base.color[0] + debugHue * 0.3)),
          Math.max(0, Math.min(1, baseConfig.base.color[1] + (1 - debugHue) * 0.3)),
          Math.max(0, Math.min(1, baseConfig.base.color[2])),
        ]
        return {
          ...baseConfig,
          base: {
            ...baseConfig.base,
            color: debugColor,
          },
          boundary: {
            mode: config.boundaryMode ?? 'smooth',
            neighbor_influence: config.neighborInfluence ?? 0.5,
          },
        }
      }

      // Apply stack-level boundary settings to each layer
      return {
        ...baseConfig,
        boundary: {
          mode: config.boundaryMode ?? baseConfig.boundary?.mode ?? 'smooth',
          neighbor_influence:
            config.neighborInfluence ?? baseConfig.boundary?.neighbor_influence ?? 0.5,
        },
      }
    }
  }, [config.boundaryMode, config.neighborInfluence, debugLayers])

  return (
    <group>
      {renderedLayers.map((rendered) => (
        <ParametricCube
          key={rendered.key}
          config={getLayerConfig(rendered.layer, rendered.layerIndex)}
          position={rendered.worldPosition}
          gridPosition={rendered.gridPosition}
          scale={[scale, (rendered.layer.height ?? 1) * scale, scale]}
          animate={animate}
          rotationSpeed={rotationSpeed}
          lodLevel={lodLevel}
          lodSettings={lodSettings}
        />
      ))}
    </group>
  )
}

/**
 * Props for CubeStackGrid component
 */
export interface CubeStackGridProps {
  /** Base stack configuration to use for all stacks in the grid */
  config: CubeStackConfig
  /** Number of stacks along each axis [x, z] - defaults to 3x3 for a flat grid */
  gridSize?: [number, number]
  /** Spacing between stacks (0 = touching, >0 = gap) */
  spacing?: number
  /** Scale of each stack */
  stackScale?: number
  /** Center position of the grid in 3D space */
  position?: [number, number, number]
  /** LOD level to apply */
  lodLevel?: LODLevel
}

/**
 * Grid cube type for internal use
 */
interface GridStack {
  key: string
  gridPosition: [number, number, number]
  worldPosition: [number, number, number]
}

/**
 * CubeStackGrid - Renders a grid of cube stacks with seamless stitching
 *
 * Features:
 * - Renders stacks in a 2D grid pattern (X-Z plane)
 * - Each stack uses its grid position for seamless boundary continuity
 * - Configurable grid size, spacing, and positioning
 * - Demonstrates boundary stitching across multiple stacks
 */
export function CubeStackGrid({
  config,
  gridSize = [3, 3],
  spacing = 0,
  stackScale = 1,
  position = [0, 0, 0],
  lodLevel,
}: CubeStackGridProps) {
  // Generate grid positions
  const gridStacks = useMemo<GridStack[]>(() => {
    const stacks: GridStack[] = []
    const [sizeX, sizeZ] = gridSize
    const step = stackScale + spacing

    // Calculate offset to center the grid
    const offsetX = ((sizeX - 1) * step) / 2
    const offsetZ = ((sizeZ - 1) * step) / 2

    for (let x = 0; x < sizeX; x++) {
      for (let z = 0; z < sizeZ; z++) {
        stacks.push({
          key: `stack-${x}-${z}`,
          gridPosition: [x, 0, z],
          worldPosition: [
            position[0] + x * step - offsetX,
            position[1],
            position[2] + z * step - offsetZ,
          ],
        })
      }
    }

    return stacks
  }, [gridSize, spacing, stackScale, position])

  return (
    <group>
      {gridStacks.map((stack) => (
        <CubeStack
          key={stack.key}
          config={config}
          position={stack.worldPosition}
          gridPosition={stack.gridPosition}
          scale={stackScale}
          lodLevel={lodLevel}
        />
      ))}
    </group>
  )
}
