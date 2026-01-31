<!--
  CubeStackGrid Component
  Vue.js 3.0 + TresJS component for rendering a grid of cube stacks with seamless stitching

  Migrated from React Three Fiber (CubeStack.tsx - CubeStackGrid export) to TresJS as part of Phase 10 (TASK 62)

  Features:
  - Renders stacks in a 2D grid pattern (X-Z plane)
  - Each stack uses its grid position for seamless boundary continuity
  - Configurable grid size, spacing, and positioning
  - Demonstrates boundary stitching across multiple stacks
-->
<script setup lang="ts">
import { computed } from 'vue'
import CubeStack from './CubeStack.vue'
import type { CubeStackConfig } from '../types/stack'
import type { LODLevel } from '../types/lod'

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
 * Grid stack type for internal use
 */
interface GridStack {
  key: string
  gridPosition: [number, number, number]
  worldPosition: [number, number, number]
}

const props = withDefaults(defineProps<CubeStackGridProps>(), {
  gridSize: () => [3, 3],
  spacing: 0,
  stackScale: 1,
  position: () => [0, 0, 0],
  lodLevel: undefined,
})

// Generate grid positions
const gridStacks = computed<GridStack[]>(() => {
  const stacks: GridStack[] = []
  const [sizeX, sizeZ] = props.gridSize
  const step = props.stackScale + props.spacing

  // Calculate offset to center the grid
  const offsetX = ((sizeX - 1) * step) / 2
  const offsetZ = ((sizeZ - 1) * step) / 2

  for (let x = 0; x < sizeX; x++) {
    for (let z = 0; z < sizeZ; z++) {
      stacks.push({
        key: `stack-${x}-${z}`,
        gridPosition: [x, 0, z],
        worldPosition: [
          props.position[0] + x * step - offsetX,
          props.position[1],
          props.position[2] + z * step - offsetZ,
        ],
      })
    }
  }

  return stacks
})
</script>

<template>
  <TresGroup>
    <CubeStack
      v-for="stack in gridStacks"
      :key="stack.key"
      :config="props.config"
      :position="stack.worldPosition"
      :grid-position="stack.gridPosition"
      :scale="props.stackScale"
      :lod-level="props.lodLevel"
    />
  </TresGroup>
</template>
