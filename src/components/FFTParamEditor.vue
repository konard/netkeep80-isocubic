<!--
  FFTParamEditor Component
  Vue.js 3.0 SFC for editing FFT-based magical/energy cube configurations

  Migrated from React (FFTParamEditor.tsx) to Vue.js SFC

  This component provides UI for editing FFTCubeConfig properties including:
  - Energy Settings: is_magical, fft_size, energy_capacity, current_energy indicator
  - FFT Physics: coherence_loss, fracture_threshold, stress level indicator
  - Integration with energy physics functions for real-time status display

  Can be used standalone or as an extension to ParamEditor with mode switching
  between SpectralCube and FFTCubeConfig types.
-->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type {
  FFTCubeConfig,
  FFTCubePhysics,
  FFTSize,
  MaterialType,
  BreakPattern,
  BoundaryMode,
  CubeBoundary,
} from '../types/cube'
import { FFT_CUBE_DEFAULTS, createDefaultFFTCube } from '../types/cube'
import {
  calculateTotalEnergy,
  getNormalizedEnergy,
  isNearFracture,
  checkFracture,
  type FractureCheckResult,
} from '../lib/energyPhysics'

/**
 * Editor mode - determines which type of cube is being edited
 */
export type EditorMode = 'spectral' | 'fft'

/**
 * Props for FFTParamEditor component
 */
export interface FFTParamEditorProps {
  /** Current FFT cube configuration */
  currentCube: FFTCubeConfig | null
  /** Custom class name */
  className?: string
  /** Whether to show the mode switcher (for integration with unified editor) */
  showModeSwitcher?: boolean
  /** Current editor mode when mode switcher is shown */
  editorMode?: EditorMode
}

const props = withDefaults(defineProps<FFTParamEditorProps>(), {
  className: '',
  showModeSwitcher: false,
  editorMode: 'fft',
})

const emit = defineEmits<{
  (e: 'update:cube', cube: FFTCubeConfig): void
  (e: 'modeChange', mode: EditorMode): void
}>()

/** Available FFT sizes */
const FFT_SIZES: FFTSize[] = [8, 16, 32]

/** Available material types */
const MATERIAL_TYPES: MaterialType[] = [
  'stone',
  'wood',
  'metal',
  'glass',
  'organic',
  'crystal',
  'liquid',
]

/** Available break patterns */
const BREAK_PATTERNS: BreakPattern[] = ['crumble', 'shatter', 'splinter', 'melt', 'dissolve']

/** Available boundary modes */
const BOUNDARY_MODES: BoundaryMode[] = ['none', 'smooth', 'hard']

/**
 * Get stress level class for visual indication
 */
function getStressLevelClass(stressLevel: number): string {
  if (stressLevel >= 1.0) return 'fft-editor__stress-indicator--critical'
  if (stressLevel >= 0.8) return 'fft-editor__stress-indicator--warning'
  if (stressLevel >= 0.5) return 'fft-editor__stress-indicator--moderate'
  return 'fft-editor__stress-indicator--safe'
}

/**
 * Get stress level label for display
 */
function getStressLevelLabel(stressLevel: number): string {
  if (stressLevel >= 1.0) return 'CRITICAL - Fracture Imminent!'
  if (stressLevel >= 0.8) return 'Warning - High Stress'
  if (stressLevel >= 0.5) return 'Moderate Stress'
  return 'Stable'
}

// Use local state for editing
const localCube = ref<FFTCubeConfig | null>(props.currentCube)
const expandedSections = ref<Set<string>>(new Set(['energy', 'physics', 'boundary']))

// Sync local state with prop
watch(
  () => props.currentCube,
  (newCube) => {
    localCube.value = newCube
  }
)

// Calculate energy-related values
const energyInfo = computed(() => {
  if (!localCube.value) {
    return {
      totalEnergy: 0,
      normalizedEnergy: 0,
      fractureResult: null as FractureCheckResult | null,
      nearFracture: false,
    }
  }

  const totalEnergy = calculateTotalEnergy(localCube.value)
  const normalizedEnergy = getNormalizedEnergy(localCube.value)
  const fractureResult = checkFracture(localCube.value)
  const nearFracture = isNearFracture(localCube.value)

  return {
    totalEnergy,
    normalizedEnergy,
    fractureResult,
    nearFracture,
  }
})

// Toggle section expansion
function toggleSection(section: string): void {
  const next = new Set(expandedSections.value)
  if (next.has(section)) {
    next.delete(section)
  } else {
    next.add(section)
  }
  expandedSections.value = next
}

// Update cube and notify parent
function updateCube(updates: Partial<FFTCubeConfig>): void {
  if (!localCube.value) return

  const updatedCube: FFTCubeConfig = {
    ...localCube.value,
    ...updates,
    meta: {
      ...localCube.value.meta,
      ...updates.meta,
      modified: new Date().toISOString(),
    },
  }

  // Recalculate current energy if channels changed
  if (updates.channels) {
    updatedCube.current_energy = calculateTotalEnergy(updatedCube)
  }

  localCube.value = updatedCube
  emit('update:cube', updatedCube)
}

// Update physics properties
function updatePhysics(updates: Partial<FFTCubePhysics>): void {
  if (!localCube.value) return
  updateCube({
    physics: {
      ...localCube.value.physics,
      ...updates,
    },
  })
}

// Update boundary properties
function updateBoundary(updates: Partial<CubeBoundary>): void {
  if (!localCube.value) return
  updateCube({
    boundary: {
      ...localCube.value.boundary,
      ...updates,
    },
  })
}

// Handle name update
function handleNameUpdate(name: string): void {
  if (!localCube.value) return
  updateCube({
    meta: {
      ...localCube.value.meta,
      name,
      modified: new Date().toISOString(),
    },
  })
}

// Reset to default values
function handleReset(): void {
  const id = localCube.value?.id || `fft_cube_${Date.now()}`
  const defaultCube = createDefaultFFTCube(id)
  localCube.value = defaultCube
  emit('update:cube', defaultCube)
}
</script>

<template>
  <!-- Empty state -->
  <div v-if="!localCube" :class="`fft-editor ${props.className}`">
    <div class="fft-editor__empty">
      <p>No FFT cube selected</p>
      <p>Select a magical cube from the gallery or create a new one</p>
    </div>
  </div>

  <!-- Editor -->
  <div v-else :class="`fft-editor ${props.className}`">
    <div class="fft-editor__header">
      <h2 class="fft-editor__title">FFT Cube Editor</h2>
      <button
        type="button"
        class="fft-editor__reset-btn"
        title="Reset to default values"
        @click="handleReset"
      >
        Reset
      </button>
    </div>

    <!-- Mode Switcher (optional) -->
    <div v-if="props.showModeSwitcher" class="fft-editor__mode-switcher">
      <label class="fft-editor__label">Cube Type</label>
      <div class="fft-editor__mode-buttons">
        <button
          type="button"
          :class="`fft-editor__mode-btn ${props.editorMode === 'spectral' ? 'fft-editor__mode-btn--active' : ''}`"
          @click="emit('modeChange', 'spectral')"
        >
          SpectralCube
        </button>
        <button
          type="button"
          :class="`fft-editor__mode-btn ${props.editorMode === 'fft' ? 'fft-editor__mode-btn--active' : ''}`"
          @click="emit('modeChange', 'fft')"
        >
          FFTCubeConfig
        </button>
      </div>
    </div>

    <!-- Name field -->
    <div class="fft-editor__name-field">
      <label for="fft-cube-name" class="fft-editor__label"> Name </label>
      <input
        id="fft-cube-name"
        type="text"
        class="fft-editor__input"
        :value="localCube.meta?.name || ''"
        placeholder="Enter cube name..."
        @input="handleNameUpdate(($event.target as HTMLInputElement).value)"
      />
    </div>

    <!-- Energy Settings Section -->
    <section class="fft-editor__section">
      <button
        type="button"
        :class="`fft-editor__section-header ${expandedSections.has('energy') ? 'fft-editor__section-header--expanded' : ''}`"
        :aria-expanded="expandedSections.has('energy')"
        @click="toggleSection('energy')"
      >
        <span>Energy Settings</span>
        <span class="fft-editor__chevron">{{
          expandedSections.has('energy') ? '\u25BC' : '\u25B6'
        }}</span>
      </button>

      <div v-if="expandedSections.has('energy')" class="fft-editor__section-content">
        <!-- Is Magical checkbox -->
        <div class="fft-editor__field">
          <label class="fft-editor__checkbox-label">
            <input
              type="checkbox"
              class="fft-editor__checkbox"
              :checked="localCube.is_magical"
              @change="updateCube({ is_magical: ($event.target as HTMLInputElement).checked })"
            />
            <span>Is Magical</span>
          </label>
          <p class="fft-editor__description">
            Enable energy-based visualization and physics for this cube.
          </p>
        </div>

        <!-- FFT Size dropdown -->
        <div class="fft-editor__field">
          <label for="fft-size" class="fft-editor__label"> FFT Size </label>
          <select
            id="fft-size"
            class="fft-editor__select"
            :value="localCube.fft_size"
            @change="
              updateCube({
                fft_size: parseInt(($event.target as HTMLSelectElement).value, 10) as FFTSize,
              })
            "
          >
            <option v-for="size in FFT_SIZES" :key="size" :value="size">
              {{ size }}x{{ size }}x{{ size }}
            </option>
          </select>
          <p class="fft-editor__description">
            Size of the FFT grid. Higher values provide more detail but use more memory.
          </p>
        </div>

        <!-- Energy Capacity -->
        <div class="fft-editor__field">
          <label for="energy-capacity" class="fft-editor__label">
            Energy Capacity
            <span class="fft-editor__value">{{ localCube.energy_capacity.toFixed(1) }}</span>
          </label>
          <input
            id="energy-capacity"
            type="number"
            class="fft-editor__number-input"
            min="1"
            max="1000"
            step="1"
            :value="localCube.energy_capacity"
            @change="
              updateCube({
                energy_capacity: parseFloat(($event.target as HTMLInputElement).value) || 1,
              })
            "
          />
          <p class="fft-editor__description">
            Maximum energy the cube can hold. Used for normalization and physics calculations.
          </p>
        </div>

        <!-- Current Energy (read-only indicator) -->
        <div class="fft-editor__field">
          <label class="fft-editor__label">
            Current Energy
            <span class="fft-editor__value">{{ energyInfo.totalEnergy.toFixed(2) }}</span>
          </label>
          <div class="fft-editor__progress-bar">
            <div
              class="fft-editor__progress-fill"
              :style="{ width: `${Math.min(energyInfo.normalizedEnergy * 100, 100)}%` }"
            />
          </div>
          <div class="fft-editor__progress-labels">
            <span>0</span>
            <span>{{ (energyInfo.normalizedEnergy * 100).toFixed(1) }}%</span>
            <span>{{ localCube.energy_capacity }}</span>
          </div>
          <p class="fft-editor__description">
            Current energy level calculated from FFT coefficients (read-only).
          </p>
        </div>
      </div>
    </section>

    <!-- FFT Physics Section -->
    <section class="fft-editor__section">
      <button
        type="button"
        :class="`fft-editor__section-header ${expandedSections.has('physics') ? 'fft-editor__section-header--expanded' : ''}`"
        :aria-expanded="expandedSections.has('physics')"
        @click="toggleSection('physics')"
      >
        <span>FFT Physics</span>
        <span class="fft-editor__chevron">{{
          expandedSections.has('physics') ? '\u25BC' : '\u25B6'
        }}</span>
      </button>

      <div v-if="expandedSections.has('physics')" class="fft-editor__section-content">
        <!-- Material type selector -->
        <div class="fft-editor__field">
          <label for="fft-physics-material" class="fft-editor__label"> Material </label>
          <select
            id="fft-physics-material"
            class="fft-editor__select"
            :value="localCube.physics?.material ?? FFT_CUBE_DEFAULTS.physics.material"
            @change="
              updatePhysics({
                material: ($event.target as HTMLSelectElement).value as MaterialType,
              })
            "
          >
            <option v-for="type in MATERIAL_TYPES" :key="type" :value="type">
              {{ type.charAt(0).toUpperCase() + type.slice(1) }}
            </option>
          </select>
        </div>

        <!-- Density slider -->
        <div class="fft-editor__field">
          <label for="fft-physics-density" class="fft-editor__label">
            Density (g/cm&sup3;)
            <span class="fft-editor__value">
              {{ (localCube.physics?.density ?? FFT_CUBE_DEFAULTS.physics.density).toFixed(2) }}
            </span>
          </label>
          <input
            id="fft-physics-density"
            type="range"
            class="fft-editor__slider"
            min="0.1"
            max="10"
            step="0.1"
            :value="localCube.physics?.density ?? FFT_CUBE_DEFAULTS.physics.density"
            @input="
              updatePhysics({ density: parseFloat(($event.target as HTMLInputElement).value) })
            "
          />
        </div>

        <!-- Break pattern selector -->
        <div class="fft-editor__field">
          <label for="fft-physics-break-pattern" class="fft-editor__label"> Break Pattern </label>
          <select
            id="fft-physics-break-pattern"
            class="fft-editor__select"
            :value="localCube.physics?.break_pattern ?? FFT_CUBE_DEFAULTS.physics.break_pattern"
            @change="
              updatePhysics({
                break_pattern: ($event.target as HTMLSelectElement).value as BreakPattern,
              })
            "
          >
            <option v-for="pattern in BREAK_PATTERNS" :key="pattern" :value="pattern">
              {{ pattern.charAt(0).toUpperCase() + pattern.slice(1) }}
            </option>
          </select>
        </div>

        <!-- Coherence Loss slider -->
        <div class="fft-editor__field">
          <label for="coherence-loss" class="fft-editor__label">
            Coherence Loss
            <span class="fft-editor__value">
              {{
                (
                  localCube.physics?.coherence_loss ?? FFT_CUBE_DEFAULTS.physics.coherence_loss
                ).toFixed(3)
              }}
            </span>
          </label>
          <input
            id="coherence-loss"
            type="range"
            class="fft-editor__slider"
            min="0"
            max="0.1"
            step="0.001"
            :value="localCube.physics?.coherence_loss ?? FFT_CUBE_DEFAULTS.physics.coherence_loss"
            @input="
              updatePhysics({
                coherence_loss: parseFloat(($event.target as HTMLInputElement).value),
              })
            "
          />
          <div class="fft-editor__slider-labels">
            <span>No decay</span>
            <span>Fast decay</span>
          </div>
          <p class="fft-editor__description">
            Rate at which energy naturally decays over time. Higher values = faster energy loss.
          </p>
        </div>

        <!-- Fracture Threshold slider -->
        <div class="fft-editor__field">
          <label for="fracture-threshold" class="fft-editor__label">
            Fracture Threshold
            <span class="fft-editor__value">
              {{
                (
                  localCube.physics?.fracture_threshold ??
                  FFT_CUBE_DEFAULTS.physics.fracture_threshold
                ).toFixed(1)
              }}
            </span>
          </label>
          <input
            id="fracture-threshold"
            type="range"
            class="fft-editor__slider"
            min="0"
            max="200"
            step="1"
            :value="
              localCube.physics?.fracture_threshold ?? FFT_CUBE_DEFAULTS.physics.fracture_threshold
            "
            @input="
              updatePhysics({
                fracture_threshold: parseFloat(($event.target as HTMLInputElement).value),
              })
            "
          />
          <div class="fft-editor__slider-labels">
            <span>Fragile</span>
            <span>Durable</span>
          </div>
          <p class="fft-editor__description">
            Energy level at which the cube fractures/breaks. Set to 0 to disable fracturing.
          </p>
        </div>

        <!-- Stress Level Indicator -->
        <div
          v-if="energyInfo.fractureResult && energyInfo.fractureResult.threshold > 0"
          class="fft-editor__field"
        >
          <label class="fft-editor__label">Stress Level</label>
          <div
            :class="`fft-editor__stress-indicator ${getStressLevelClass(energyInfo.fractureResult.stressLevel)}`"
          >
            <div class="fft-editor__stress-bar">
              <div
                class="fft-editor__stress-fill"
                :style="{ width: `${Math.min(energyInfo.fractureResult.stressLevel * 100, 100)}%` }"
              />
              <div class="fft-editor__stress-threshold" :style="{ left: '80%' }" />
            </div>
            <div class="fft-editor__stress-info">
              <span class="fft-editor__stress-value">
                {{ (energyInfo.fractureResult.stressLevel * 100).toFixed(1) }}%
              </span>
              <span class="fft-editor__stress-label">
                {{ getStressLevelLabel(energyInfo.fractureResult.stressLevel) }}
              </span>
            </div>
          </div>
          <div v-if="energyInfo.nearFracture" class="fft-editor__warning" role="alert">
            Warning: Energy approaching fracture threshold!
          </div>
          <div v-if="energyInfo.fractureResult.fractured" class="fft-editor__error" role="alert">
            CRITICAL: Fracture threshold exceeded! Cube is unstable.
          </div>
        </div>
      </div>
    </section>

    <!-- Boundary Settings Section -->
    <section class="fft-editor__section">
      <button
        type="button"
        :class="`fft-editor__section-header ${expandedSections.has('boundary') ? 'fft-editor__section-header--expanded' : ''}`"
        :aria-expanded="expandedSections.has('boundary')"
        @click="toggleSection('boundary')"
      >
        <span>Boundary Settings</span>
        <span class="fft-editor__chevron">{{
          expandedSections.has('boundary') ? '\u25BC' : '\u25B6'
        }}</span>
      </button>

      <div v-if="expandedSections.has('boundary')" class="fft-editor__section-content">
        <p class="fft-editor__hint">
          Controls how this cube blends with neighboring cubes in a grid.
        </p>

        <!-- Boundary mode selector -->
        <div class="fft-editor__field">
          <label for="fft-boundary-mode" class="fft-editor__label"> Mode </label>
          <select
            id="fft-boundary-mode"
            class="fft-editor__select"
            :value="localCube.boundary?.mode ?? FFT_CUBE_DEFAULTS.boundary.mode"
            @change="
              updateBoundary({ mode: ($event.target as HTMLSelectElement).value as BoundaryMode })
            "
          >
            <option v-for="mode in BOUNDARY_MODES" :key="mode" :value="mode">
              {{ mode.charAt(0).toUpperCase() + mode.slice(1) }}
            </option>
          </select>
        </div>

        <!-- Neighbor influence slider -->
        <div class="fft-editor__field">
          <label for="fft-boundary-neighbor-influence" class="fft-editor__label">
            Neighbor Influence
            <span class="fft-editor__value">
              {{
                (
                  localCube.boundary?.neighbor_influence ??
                  FFT_CUBE_DEFAULTS.boundary.neighbor_influence
                ).toFixed(2)
              }}
            </span>
          </label>
          <input
            id="fft-boundary-neighbor-influence"
            type="range"
            class="fft-editor__slider"
            min="0"
            max="1"
            step="0.01"
            :value="
              localCube.boundary?.neighbor_influence ??
              FFT_CUBE_DEFAULTS.boundary.neighbor_influence
            "
            @input="
              updateBoundary({
                neighbor_influence: parseFloat(($event.target as HTMLInputElement).value),
              })
            "
          />
          <div class="fft-editor__slider-labels">
            <span>None</span>
            <span>Full</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
