<!--
  CubePreview Component
  Vue.js 3.0 + TresJS component for interactive 3D visualization of parametric cubes

  Migrated from React Three Fiber (CubePreview.tsx) to TresJS as part of Phase 10 (TASK 62)

  TASK 40: Added component metadata for Developer Mode support (Phase 6)

  Features:
  - Interactive camera controls (orbit, zoom, pan)
  - Configurable lighting system
  - Grid for spatial orientation
  - Responsive viewport handling
  - Touch gesture support for mobile devices
  - Developer Mode metadata for self-documentation
-->
<script lang="ts">
import type { ComponentMeta } from '../types/component-meta'
import { registerComponentMeta } from '../types/component-meta'

/**
 * Component metadata for Developer Mode
 */
export const CUBE_PREVIEW_META: ComponentMeta = {
  id: 'cube-preview',
  name: 'CubePreview',
  version: '2.0.0',
  summary: 'Interactive 3D preview canvas for parametric cubes using TresJS (Vue.js 3.0).',
  description:
    'CubePreview is the main 3D visualization component for isocubic. It renders parametric cubes ' +
    'using Three.js via TresJS with interactive OrbitControls for camera manipulation. ' +
    'The component includes configurable lighting (ambient, directional, point), an optional grid floor ' +
    'for spatial orientation, contact shadows for depth perception, and environment reflections. ' +
    'It is fully responsive and supports touch gestures on mobile devices. ' +
    'Migrated from React Three Fiber to TresJS as part of Phase 10 (TASK 62).',
  phase: 10,
  taskId: 'TASK 62',
  filePath: 'components/CubePreview.vue',
  history: [
    {
      version: '1.0.0',
      date: '2026-01-28T12:00:00Z',
      description: 'Initial implementation with Three.js canvas and OrbitControls',
      taskId: 'TASK 1',
      type: 'created',
    },
    {
      version: '1.0.1',
      date: '2026-01-28T14:00:00Z',
      description: 'Added touch gesture support for mobile devices',
      taskId: 'TASK 1',
      type: 'updated',
    },
    {
      version: '1.1.0',
      date: '2026-01-29T21:00:00Z',
      description: 'Added Developer Mode metadata support for self-documentation',
      taskId: 'TASK 40',
      type: 'updated',
    },
    {
      version: '2.0.0',
      date: '2026-01-31T00:00:00Z',
      description: 'Migrated from React Three Fiber to TresJS (Vue.js 3.0)',
      taskId: 'TASK 62',
      type: 'updated',
    },
  ],
  features: [
    {
      id: 'orbit-controls',
      name: 'Orbit Controls',
      description: 'Interactive camera controls with orbit, zoom, and pan capabilities',
      enabled: true,
      taskId: 'TASK 1',
    },
    {
      id: 'lighting-system',
      name: 'Configurable Lighting',
      description: 'Multi-light setup with ambient, directional, and point lights',
      enabled: true,
      taskId: 'TASK 1',
    },
    {
      id: 'grid-floor',
      name: 'Grid Floor',
      description: 'Optional infinite grid for spatial orientation',
      enabled: true,
      taskId: 'TASK 1',
    },
    {
      id: 'contact-shadows',
      name: 'Contact Shadows',
      description: 'Soft shadows beneath the cube for depth perception',
      enabled: true,
      taskId: 'TASK 1',
    },
    {
      id: 'responsive-viewport',
      name: 'Responsive Viewport',
      description: 'Automatically resizes with container using ResizeObserver',
      enabled: true,
      taskId: 'TASK 1',
    },
    {
      id: 'touch-support',
      name: 'Touch Gesture Support',
      description: 'Mobile-friendly touch gestures for rotation and zoom',
      enabled: true,
      taskId: 'TASK 1',
    },
  ],
  dependencies: [
    { name: '@tresjs/core', type: 'external', purpose: 'Vue.js renderer for Three.js' },
    { name: '@tresjs/cientos', type: 'external', purpose: 'Useful helpers for TresJS' },
    {
      name: 'ParametricCube',
      type: 'component',
      path: 'components/ParametricCube.vue',
      purpose: 'Renders the parametric cube mesh',
    },
  ],
  relatedFiles: [
    {
      path: 'components/ParametricCube.vue',
      type: 'component',
      description: 'The cube mesh component',
    },
    {
      path: 'shaders/parametric-cube.ts',
      type: 'util',
      description: 'GLSL shader for cube rendering',
    },
  ],
  props: [
    {
      name: 'config',
      type: 'SpectralCube | null',
      required: true,
      description: 'Cube configuration to display',
    },
    {
      name: 'showGrid',
      type: 'boolean',
      required: false,
      defaultValue: 'true',
      description: 'Whether to show the grid floor',
    },
    {
      name: 'animate',
      type: 'boolean',
      required: false,
      defaultValue: 'false',
      description: 'Enable rotation animation',
    },
    {
      name: 'rotationSpeed',
      type: 'number',
      required: false,
      defaultValue: '0.5',
      description: 'Animation speed in rad/s',
    },
    {
      name: 'showShadows',
      type: 'boolean',
      required: false,
      defaultValue: 'true',
      description: 'Show contact shadows',
    },
    {
      name: 'backgroundColor',
      type: 'string',
      required: false,
      defaultValue: '#1a1a1a',
      description: 'Background color',
    },
  ],
  tips: [
    'Use mouse drag to orbit, scroll to zoom, right-click drag to pan',
    'On touch devices: one finger to rotate, two fingers to zoom and pan',
    'Enable animate prop for a rotating showcase effect',
  ],
  tags: ['3d', 'preview', 'three.js', 'webgl', 'visualization', 'tresjs', 'phase-10'],
  status: 'stable',
  lastUpdated: '2026-01-31T00:00:00Z',
}

// Register metadata in the global registry
registerComponentMeta(CUBE_PREVIEW_META)
</script>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls, ContactShadows, Environment } from '@tresjs/cientos'
import ParametricCube from './ParametricCube.vue'
import type { SpectralCube } from '../types/cube'

/**
 * Props for the CubePreview component
 */
export interface CubePreviewProps {
  /** SpectralCube configuration to display */
  config: SpectralCube | null
  /** Whether to show the grid */
  showGrid?: boolean
  /** Whether to enable cube rotation animation */
  animate?: boolean
  /** Animation rotation speed (radians per second) */
  rotationSpeed?: number
  /** Whether to show contact shadows */
  showShadows?: boolean
  /** Background color (CSS color string) */
  backgroundColor?: string
  /** Additional class name for the container */
  className?: string
}

const props = withDefaults(defineProps<CubePreviewProps>(), {
  showGrid: true,
  animate: false,
  rotationSpeed: 0.5,
  showShadows: true,
  backgroundColor: '#1a1a1a',
  className: '',
})

const emit = defineEmits<{
  /** Callback when controls change (camera moved) */
  controlsChange: []
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const dimensions = ref({ width: 0, height: 0 })
let resizeObserver: ResizeObserver | null = null

function updateDimensions() {
  if (containerRef.value) {
    const { width, height } = containerRef.value.getBoundingClientRect()
    dimensions.value = { width, height }
  }
}

onMounted(() => {
  updateDimensions()
  resizeObserver = new ResizeObserver(updateDimensions)
  if (containerRef.value) {
    resizeObserver.observe(containerRef.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})
</script>

<template>
  <div
    ref="containerRef"
    :class="`cube-preview ${props.className}`"
    :style="{
      width: '100%',
      height: '100%',
      minHeight: '200px',
      background: props.backgroundColor,
      borderRadius: '8px',
      overflow: 'hidden',
      touchAction: 'none',
    }"
    data-testid="cube-preview"
  >
    <TresCanvas
      v-if="dimensions.width > 0 && dimensions.height > 0"
      :camera="{
        position: [2, 2, 2],
        fov: 50,
        near: 0.1,
        far: 100,
      }"
      :antialias="true"
      :alpha="false"
      power-preference="high-performance"
      :dpr="[1, 2]"
      :style="{ width: '100%', height: '100%' }"
    >
      <!-- Background color -->
      <TresColor attach="background" :args="[props.backgroundColor]" />

      <!-- Ambient light for base illumination -->
      <TresAmbientLight :intensity="0.4" />

      <!-- Main directional light (sun-like) -->
      <TresDirectionalLight :position="[5, 8, 5]" :intensity="0.8" :cast-shadow="true" />

      <!-- Secondary directional light for fill -->
      <TresDirectionalLight :position="[-3, 4, -3]" :intensity="0.24" />

      <!-- Point light for highlights -->
      <TresPointLight :position="[2, 3, 2]" :intensity="0.3" color="#fff5e0" />

      <!-- Environment for reflections -->
      <Environment preset="city" />

      <!-- Camera controls -->
      <OrbitControls
        :enable-pan="true"
        :enable-zoom="true"
        :enable-rotate="true"
        :min-distance="1"
        :max-distance="10"
        :min-polar-angle="0"
        :max-polar-angle="Math.PI * 0.85"
        :damping-factor="0.05"
        :enable-damping="true"
        @change="emit('controlsChange')"
      />

      <!-- Contact shadows -->
      <ContactShadows
        v-if="props.showShadows"
        :position="[0, -0.499, 0]"
        :opacity="0.4"
        :scale="5"
        :blur="2"
        :far="2"
      />

      <!-- Parametric cube -->
      <ParametricCube
        v-if="props.config"
        :config="props.config"
        :position="[0, 0, 0]"
        :animate="props.animate"
        :rotation-speed="props.rotationSpeed"
      />
    </TresCanvas>

    <!-- Placeholder when no config -->
    <div
      v-if="!props.config"
      class="cube-preview__placeholder"
      :style="{
        position: 'absolute',
        inset: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#666',
        fontSize: '0.875rem',
      }"
    >
      <p>Select a cube to preview</p>
    </div>
  </div>
</template>
