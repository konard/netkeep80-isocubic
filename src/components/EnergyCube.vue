<!--
  EnergyCube Component
  Vue.js 3.0 + TresJS component for rendering energy-based cubes with FFT visualization

  Migrated from React Three Fiber (EnergyCube.tsx) to TresJS as part of Phase 10 (TASK 62)

  Features:
  - Real-time animation of energy pulsation
  - Multiple visualization modes (energy density, amplitude, phase)
  - Glow and emission effects
  - Fracture visualization at high energies
-->
<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { useRenderLoop } from '@tresjs/core'
import * as THREE from 'three'
import {
  vertexShader,
  fragmentShader,
  createEnergyUniforms,
  type EnergyCubeConfig,
  type VisualizationMode,
  ChannelMask,
} from '../shaders/energy-cube'

/**
 * Props for the EnergyCube component
 */
export interface EnergyCubeProps {
  /** Energy cube configuration with FFT coefficients */
  config: EnergyCubeConfig
  /** Position in 3D space [x, y, z] */
  position?: [number, number, number]
  /** Scale multiplier */
  scale?: number
  /** Whether to animate the energy pulsation */
  animate?: boolean
  /** Animation speed multiplier (default 1.0) */
  animationSpeed?: number
  /** Whether to also rotate the cube during animation */
  rotate?: boolean
  /** Rotation speed (radians per second) */
  rotationSpeed?: number
  /** Grid position for seamless stitching [x, y, z] */
  gridPosition?: [number, number, number]
  /** Visualization mode: 'energy', 'amplitude', or 'phase' */
  visualizationMode?: VisualizationMode
  /** Channel mask (use ChannelMask.R, ChannelMask.RGB, etc.) */
  channelMask?: number
  /** Energy scale factor for visualization intensity */
  energyScale?: number
  /** Glow intensity [0.0, 2.0] */
  glowIntensity?: number
}

const props = withDefaults(defineProps<EnergyCubeProps>(), {
  position: () => [0, 0, 0],
  scale: 1,
  animate: true,
  animationSpeed: 1.0,
  rotate: false,
  rotationSpeed: 0.5,
  gridPosition: () => [0, 0, 0],
  visualizationMode: 'energy',
  channelMask: ChannelMask.RGBA,
  energyScale: 1.0,
  glowIntensity: 0.5,
})

const meshRef = shallowRef<THREE.Mesh | null>(null)
const materialRef = shallowRef<THREE.ShaderMaterial | null>(null)

// Create shader material with uniforms derived from config
const shaderMaterial = computed(() => {
  const initialUniforms = createEnergyUniforms(props.config, {
    gridPosition: props.gridPosition,
    time: 0,
    visualizationMode: props.visualizationMode,
    channelMask: props.channelMask,
    energyScale: props.energyScale,
    glowIntensity: props.glowIntensity,
  })

  // Convert plain uniforms to THREE.IUniform format
  const threeUniforms: Record<string, THREE.IUniform> = {}
  for (const [key, uniform] of Object.entries(initialUniforms)) {
    if (
      key === 'uDCAmplitude' ||
      key === 'uDCPhase' ||
      key === 'uLightDirection' ||
      key === 'uLightColor' ||
      key === 'uGridPosition'
    ) {
      // Convert arrays to Vector4/Vector3
      const arr = uniform.value as number[]
      if (arr.length === 4) {
        threeUniforms[key] = { value: new THREE.Vector4(arr[0], arr[1], arr[2], arr[3]) }
      } else {
        threeUniforms[key] = { value: new THREE.Vector3(arr[0], arr[1], arr[2]) }
      }
    } else if (key.startsWith('uCoeff') && key.endsWith('FreqZ')) {
      // Keep frequency arrays as-is
      threeUniforms[key] = uniform
    } else if (key.startsWith('uCoeff') && !key.includes('Count')) {
      // Convert coefficient arrays to Vector4 arrays
      const coeffArr = uniform.value as number[][]
      threeUniforms[key] = {
        value: coeffArr.map((c) => new THREE.Vector4(c[0], c[1], c[2], c[3])),
      }
    } else {
      threeUniforms[key] = uniform
    }
  }

  const mat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: threeUniforms,
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: true,
    blending: THREE.NormalBlending,
  })

  return mat
})

// Store material in ref after creation for animation access
watch(
  shaderMaterial,
  (newMat) => {
    materialRef.value = newMat
  },
  { immediate: true }
)

// Animation frame for time updates and rotation
const { onLoop } = useRenderLoop()

onLoop(({ delta }) => {
  // Update time uniform for animation
  if (props.animate && materialRef.value) {
    materialRef.value.uniforms.uTime.value += delta * props.animationSpeed
  }

  // Optional rotation
  if (props.rotate && meshRef.value) {
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
