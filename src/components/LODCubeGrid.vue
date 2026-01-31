<!--
  LODCubeGrid Component
  Vue.js 3.0 + TresJS component for rendering a grid of parametric cubes with automatic LOD management

  Migrated from React Three Fiber (LODCubeGrid.tsx) to TresJS as part of Phase 10 (TASK 62)

  ISSUE 17: LOD-система для дальних кубиков

  Features:
  - Distance-based LOD calculation for each cube
  - Camera position tracking
  - Dynamic LOD level updates
  - Performance statistics
  - Debug visualization mode
-->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRenderLoop, useTresContext } from '@tresjs/core'
import * as THREE from 'three'
import ParametricCube from './ParametricCube.vue'
import type { SpectralCube } from '../types/cube'
import type { LODLevel, LODConfig, LODStatistics } from '../types/lod'
import { DEFAULT_LOD_CONFIG } from '../types/lod'
import { createLODSystem } from '../lib/lod-system'
import type { QualityLevel, DeviceCapabilities } from '../lib/performance'

/**
 * Props for the LODCubeGrid component
 */
export interface LODCubeGridProps {
  /** Base SpectralCube configuration to use for all cubes in the grid */
  config: SpectralCube
  /** Number of cubes along each axis [x, y, z] - defaults to 3x1x3 for a flat grid */
  gridSize?: [number, number, number]
  /** Spacing between cubes (0 = touching, >0 = gap) */
  spacing?: number
  /** Scale of each cube */
  cubeScale?: number
  /** Center position of the grid in 3D space */
  position?: [number, number, number]
  /** LOD configuration (optional, uses defaults if not provided) */
  lodConfig?: Partial<LODConfig>
  /** Current quality level for LOD adjustments */
  qualityLevel?: QualityLevel
  /** Device capabilities for adaptive LOD */
  deviceCapabilities?: DeviceCapabilities
  /** How often to update LOD calculations (in seconds) */
  updateInterval?: number
  /** Show debug visualization */
  debug?: boolean
}

const props = withDefaults(defineProps<LODCubeGridProps>(), {
  gridSize: () => [3, 1, 3],
  spacing: 0,
  cubeScale: 1,
  position: () => [0, 0, 0],
  lodConfig: undefined,
  qualityLevel: undefined,
  deviceCapabilities: undefined,
  updateInterval: 0.1,
  debug: false,
})

const emit = defineEmits<{
  /** Callback when LOD statistics update */
  statisticsUpdate: [stats: LODStatistics]
}>()

/**
 * Grid cube data with LOD information
 */
interface LODGridCube {
  key: string
  gridPosition: [number, number, number]
  worldPosition: [number, number, number]
  lodLevel: LODLevel
}

const cubeLODLevels = ref<Map<string, LODLevel>>(new Map())
const lastUpdateTime = ref(0)

// Create LOD system with merged config
const lodSystem = computed(() => {
  const mergedConfig: LODConfig = {
    ...DEFAULT_LOD_CONFIG,
    ...props.lodConfig,
  }
  return createLODSystem(mergedConfig)
})

// Generate static grid positions
const gridCubes = computed(() => {
  const cubes: {
    key: string
    gridPosition: [number, number, number]
    worldPosition: [number, number, number]
  }[] = []
  const [sizeX, sizeY, sizeZ] = props.gridSize
  const step = props.cubeScale + props.spacing

  // Calculate offset to center the grid
  const offsetX = ((sizeX - 1) * step) / 2
  const offsetY = ((sizeY - 1) * step) / 2
  const offsetZ = ((sizeZ - 1) * step) / 2

  for (let x = 0; x < sizeX; x++) {
    for (let y = 0; y < sizeY; y++) {
      for (let z = 0; z < sizeZ; z++) {
        cubes.push({
          key: `lod-cube-${x}-${y}-${z}`,
          gridPosition: [x, y, z],
          worldPosition: [
            props.position[0] + x * step - offsetX,
            props.position[1] + y * step - offsetY,
            props.position[2] + z * step - offsetZ,
          ],
        })
      }
    }
  }

  return cubes
})

// Create config with boundary mode enabled
const gridConfig = computed<SpectralCube>(() => {
  return {
    ...props.config,
    boundary: {
      mode: props.config.boundary?.mode ?? 'smooth',
      neighbor_influence: props.config.boundary?.neighbor_influence ?? 0.5,
    },
  }
})

// Get cubes with their current LOD levels
const cubesWithLOD = computed<LODGridCube[]>(() => {
  return gridCubes.value.map((cube) => ({
    ...cube,
    lodLevel: cubeLODLevels.value.get(cube.key) ?? 0,
  }))
})

// Color coding for LOD debug spheres
const lodDebugColors: Record<LODLevel, string> = {
  0: '#00ff00', // Green - highest detail
  1: '#80ff00', // Yellow-green
  2: '#ffff00', // Yellow
  3: '#ff8000', // Orange
  4: '#ff0000', // Red - lowest detail
}

// Access TresJS context for camera
const { camera } = useTresContext()

// Frame update for LOD calculations
const { onLoop } = useRenderLoop()

onLoop(({ elapsed }) => {
  // Update LOD levels at specified interval
  if (elapsed - lastUpdateTime.value >= props.updateInterval) {
    const cam = camera.value
    if (!cam) return

    const cameraPosition = cam.position.clone()
    const newLevels = new Map<string, LODLevel>()

    for (const cube of gridCubes.value) {
      const cubePos = new THREE.Vector3(
        cube.worldPosition[0],
        cube.worldPosition[1],
        cube.worldPosition[2]
      )

      const result = lodSystem.value.calculateLOD(cubePos, {
        cameraPosition,
        qualityLevel: props.qualityLevel,
        deviceCapabilities: props.deviceCapabilities,
      })

      newLevels.set(cube.key, result.level)
      lodSystem.value.updateCubeState(cube.key, result.level, props.updateInterval)
    }

    cubeLODLevels.value = newLevels

    // Update and report statistics
    const stats = lodSystem.value.updateStatistics()
    emit('statisticsUpdate', stats)

    lastUpdateTime.value = elapsed
  }
})
</script>

<template>
  <TresGroup>
    <TresGroup v-for="cube in cubesWithLOD" :key="cube.key">
      <ParametricCube
        :config="gridConfig"
        :position="cube.worldPosition"
        :grid-position="cube.gridPosition"
        :scale="props.cubeScale"
        :lod-level="cube.lodLevel"
      />
      <!-- Debug sphere to visualize LOD levels -->
      <TresMesh
        v-if="props.debug"
        :position="[cube.worldPosition[0], cube.worldPosition[1] + 0.8, cube.worldPosition[2]]"
      >
        <TresSphereGeometry :args="[0.1, 8, 8]" />
        <TresMeshBasicMaterial :color="lodDebugColors[cube.lodLevel]" />
      </TresMesh>
    </TresGroup>
  </TresGroup>
</template>
