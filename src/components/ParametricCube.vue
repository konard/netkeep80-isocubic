<!--
  ParametricCube Component
  Vue.js 3.0 + TresJS component for rendering parametric cubes with GLSL shaders

  Migrated from React Three Fiber (ParametricCube.tsx) to TresJS as part of Phase 10 (TASK 62)
-->
<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useRenderLoop } from '@tresjs/core'
import * as THREE from 'three'
import { vertexShader, fragmentShader } from '../shaders/parametric-cube'
import { createUniforms } from '../lib/shader-utils'
import type { SpectralCube } from '../types/cube'
import type { LODLevel, LODLevelSettings } from '../types/lod'

/**
 * Props for the ParametricCube component
 */
export interface ParametricCubeProps {
  /** SpectralCube configuration to render */
  config: SpectralCube
  /** Position in 3D space [x, y, z] */
  position?: [number, number, number]
  /** Scale multiplier (uniform) or [x, y, z] scale (per-axis) */
  scale?: number | [number, number, number]
  /** Whether to animate rotation */
  animate?: boolean
  /** Rotation speed (radians per second) */
  rotationSpeed?: number
  /** Grid position for seamless stitching [x, y, z] - used when rendering cube grids */
  gridPosition?: [number, number, number]
  /** LOD level to apply (0 = full detail, 4 = lowest detail) */
  lodLevel?: LODLevel
  /** Custom LOD settings (overrides defaults if provided) */
  lodSettings?: LODLevelSettings
}

const props = withDefaults(defineProps<ParametricCubeProps>(), {
  position: () => [0, 0, 0],
  scale: 1,
  animate: false,
  rotationSpeed: 0.5,
  gridPosition: () => [0, 0, 0],
  lodLevel: undefined,
  lodSettings: undefined,
})

const meshRef = shallowRef<THREE.Mesh | null>(null)

// Create shader material with uniforms derived from config
// The material is recreated when config, gridPosition, or LOD settings change
const shaderMaterial = computed(() => {
  const uniforms = createUniforms(props.config, {
    gridPosition: props.gridPosition,
    lodLevel: props.lodLevel,
    lodSettings: props.lodSettings,
  })

  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: (props.config.base.transparency ?? 1) < 1,
    side: THREE.FrontSide,
  })
})

// Animation frame for rotation
const { onLoop } = useRenderLoop()

onLoop(({ delta }) => {
  if (props.animate && meshRef.value) {
    meshRef.value.rotation.y += props.rotationSpeed * delta
  }
})
</script>

<template>
  <TresMesh
    ref="meshRef"
    :position="props.position"
    :scale="props.scale"
    :material="shaderMaterial"
  >
    <TresBoxGeometry :args="[1, 1, 1]" />
  </TresMesh>
</template>
