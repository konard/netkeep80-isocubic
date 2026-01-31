<!--
  CubeStack Component
  Vue.js 3.0 + TresJS component for rendering vertical cube stacks

  Migrated from React Three Fiber (CubeStack.tsx) to TresJS as part of Phase 10 (TASK 62)

  ISSUE 20: Система "стопок кубиков"

  Features:
  - Renders multiple cube layers vertically stacked
  - Supports smooth transitions between layers
  - LOD support for performance optimization
  - Seamless boundary stitching with adjacent stacks
-->
<script setup lang="ts">
import { computed } from 'vue'
import ParametricCube from './ParametricCube.vue'
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

const props = withDefaults(defineProps<CubeStackProps>(), {
  position: () => [0, 0, 0],
  scale: 1,
  animate: false,
  rotationSpeed: 0.5,
  gridPosition: () => [0, 0, 0],
  lodLevel: undefined,
  lodSettings: undefined,
  centerVertically: true,
  debugLayers: false,
})

// Calculate rendered layers with positions
const renderedLayers = computed<RenderedLayer[]>(() => {
  const layers: RenderedLayer[] = []
  const centerOffset = props.centerVertically ? getStackCenterOffset(props.config) : 0

  // Apply LOD-based layer simplification
  let visibleLayers = props.config.layers
  if (props.lodLevel !== undefined && props.lodLevel >= 3) {
    // At high LOD levels (far from camera), simplify to fewer layers
    if (props.lodLevel === 4 && props.config.layers.length > 2) {
      // LOD 4: Only show bottom and top layers
      visibleLayers = [props.config.layers[0], props.config.layers[props.config.layers.length - 1]]
    } else if (props.lodLevel === 3 && props.config.layers.length > 3) {
      // LOD 3: Show bottom, middle, and top layers
      const midIndex = Math.floor(props.config.layers.length / 2)
      visibleLayers = [
        props.config.layers[0],
        props.config.layers[midIndex],
        props.config.layers[props.config.layers.length - 1],
      ]
    }
  }

  visibleLayers.forEach((layer, index) => {
    // Find original layer index for position calculation
    const originalIndex = props.config.layers.indexOf(layer)
    const layerY = getLayerYPosition(props.config, originalIndex)

    // Calculate world position for this layer
    const worldPosition: [number, number, number] = [
      props.position[0],
      props.position[1] + (layerY - centerOffset) * props.scale,
      props.position[2],
    ]

    // Calculate grid position for seamless stitching
    // Y grid position is based on the layer index for continuous vertical stitching
    const layerGridPosition: [number, number, number] = [
      props.gridPosition[0],
      props.gridPosition[1] + originalIndex,
      props.gridPosition[2],
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
})

// Apply LOD settings to layer configs
function getLayerConfig(layer: StackLayer, index: number): SpectralCube {
  const baseConfig = layer.cubeConfig

  // If debug mode, modify colors to show layer boundaries
  if (props.debugLayers) {
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
        mode: props.config.boundaryMode ?? 'smooth',
        neighbor_influence: props.config.neighborInfluence ?? 0.5,
      },
    }
  }

  // Apply stack-level boundary settings to each layer
  return {
    ...baseConfig,
    boundary: {
      mode: props.config.boundaryMode ?? baseConfig.boundary?.mode ?? 'smooth',
      neighbor_influence:
        props.config.neighborInfluence ?? baseConfig.boundary?.neighbor_influence ?? 0.5,
    },
  }
}
</script>

<template>
  <TresGroup>
    <ParametricCube
      v-for="rendered in renderedLayers"
      :key="rendered.key"
      :config="getLayerConfig(rendered.layer, rendered.layerIndex)"
      :position="rendered.worldPosition"
      :grid-position="rendered.gridPosition"
      :scale="[props.scale, (rendered.layer.height ?? 1) * props.scale, props.scale]"
      :animate="props.animate"
      :rotation-speed="props.rotationSpeed"
      :lod-level="props.lodLevel"
      :lod-settings="props.lodSettings"
    />
  </TresGroup>
</template>
