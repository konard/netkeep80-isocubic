<!--
  CubeGrid Component
  Vue.js 3.0 + TresJS component for rendering a grid of parametric cubes with seamless boundary stitching

  Migrated from React Three Fiber (CubeGrid.tsx) to TresJS as part of Phase 10 (TASK 62)

  This component demonstrates ISSUE 7: Seamless cube boundary stitching
  by rendering multiple cubes in a grid with continuous noise and gradient
  transitions across boundaries.
-->
<script setup lang="ts">
import { computed } from 'vue'
import ParametricCube from './ParametricCube.vue'
import type { SpectralCube } from '../types/cube'

/**
 * Props for the CubeGrid component
 */
export interface CubeGridProps {
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
}

/**
 * Grid position type for internal use
 */
interface GridCube {
  key: string
  gridPosition: [number, number, number]
  worldPosition: [number, number, number]
}

const props = withDefaults(defineProps<CubeGridProps>(), {
  gridSize: () => [3, 1, 3],
  spacing: 0,
  cubeScale: 1,
  position: () => [0, 0, 0],
})

// Generate grid positions
const gridCubes = computed<GridCube[]>(() => {
  const cubes: GridCube[] = []
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
          key: `cube-${x}-${y}-${z}`,
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
</script>

<template>
  <TresGroup>
    <ParametricCube
      v-for="cube in gridCubes"
      :key="cube.key"
      :config="gridConfig"
      :position="cube.worldPosition"
      :grid-position="cube.gridPosition"
      :scale="props.cubeScale"
    />
  </TresGroup>
</template>
