<!--
  MagicCubeDemo Component
  Vue.js 3.0 + TresJS demonstration of magical cube interactions, energy transfer, and destruction effects

  Migrated from React Three Fiber (MagicCubeDemo.tsx) to TresJS as part of Phase 10 (TASK 62)

  Features:
  - Two interactive magical cubes with energy visualization
  - Real-time energy transfer between cubes on click/touch
  - Visual feedback for energy levels and fracture states
  - Destruction effects when energy exceeds fracture threshold
  - Chain reaction mechanics when cubes break
-->
<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls, Environment, Html } from '@tresjs/cientos'
import {
  createMagicCrystalConfig,
  createUnstableCoreConfig,
  type EnergyCubeConfig,
} from '../shaders/energy-cube'
import {
  calculateTotalEnergy,
  applyEnergyTransfer,
  checkFracture,
  isNearFracture,
  applyCoherenceLoss,
  getNormalizedEnergy,
  type FractureCheckResult,
} from '../lib/energyPhysics'
import type { FFTCubeConfig, FFTChannel, FFTCoefficient } from '../types/cube'

// Sub-components are defined inline via template since they need TresJS context

/**
 * Converts EnergyCubeConfig to FFTCubeConfig for physics calculations
 */
function energyConfigToFFT(
  config: EnergyCubeConfig,
  id: string,
  currentEnergy?: number
): FFTCubeConfig {
  const convertChannel = (channel: EnergyCubeConfig['channelR']): FFTChannel | undefined => {
    if (!channel) return undefined
    return {
      dcAmplitude: channel.dcAmplitude,
      dcPhase: channel.dcPhase,
      coefficients: channel.coefficients.map(
        (c): FFTCoefficient => ({
          amplitude: c.amplitude,
          phase: c.phase,
          freqX: c.freqX,
          freqY: c.freqY,
          freqZ: c.freqZ,
        })
      ),
    }
  }

  const channels = {
    R: convertChannel(config.channelR),
    G: convertChannel(config.channelG),
    B: convertChannel(config.channelB),
    A: convertChannel(config.channelA),
  }

  const calculatedEnergy =
    currentEnergy ??
    calculateTotalEnergy({
      id,
      is_magical: true,
      fft_size: 8,
      energy_capacity: config.energyCapacity ?? 100,
      channels,
    })

  return {
    id,
    is_magical: true,
    fft_size: 8,
    energy_capacity: config.energyCapacity ?? 100,
    current_energy: calculatedEnergy,
    channels,
    physics: {
      material: 'crystal',
      density: 3.0,
      break_pattern: 'shatter',
      coherence_loss: config.coherenceLoss ?? 0.01,
      fracture_threshold: config.fractureThreshold ?? 80,
    },
  }
}

/**
 * State for a magical cube in the demo
 */
interface MagicCubeState {
  id: string
  name: string
  fftConfig: FFTCubeConfig
  position: [number, number, number]
  fractured: boolean
  fractureTime?: number
}

/**
 * Creates an initial magic crystal cube state
 */
function createMagicCrystalState(
  id: string,
  name: string,
  position: [number, number, number]
): MagicCubeState {
  const energyConfig = createMagicCrystalConfig()
  const fftConfig = energyConfigToFFT(energyConfig, id)
  return { id, name, fftConfig, position, fractured: false }
}

/**
 * Creates an initial unstable core cube state
 */
function createUnstableCoreState(
  id: string,
  name: string,
  position: [number, number, number]
): MagicCubeState {
  const energyConfig = createUnstableCoreConfig()
  const fftConfig = energyConfigToFFT(energyConfig, id)
  return { id, name, fftConfig, position, fractured: false }
}

/**
 * Creates an energy shield cube state
 */
function createEnergyShieldState(
  id: string,
  name: string,
  position: [number, number, number]
): MagicCubeState {
  const baseConfig: EnergyCubeConfig = {
    channelR: {
      dcAmplitude: 0.2,
      dcPhase: 0,
      coefficients: [{ amplitude: 0.15, phase: 0, freqX: 1, freqY: 1, freqZ: 0 }],
    },
    channelG: {
      dcAmplitude: 0.7,
      dcPhase: Math.PI / 4,
      coefficients: [
        { amplitude: 0.3, phase: Math.PI / 2, freqX: 2, freqY: 0, freqZ: 1 },
        { amplitude: 0.2, phase: Math.PI, freqX: 0, freqY: 2, freqZ: 1 },
      ],
    },
    channelB: {
      dcAmplitude: 0.5,
      dcPhase: 0,
      coefficients: [{ amplitude: 0.25, phase: 0, freqX: 1, freqY: 0, freqZ: 2 }],
    },
    channelA: {
      dcAmplitude: 0.8,
      dcPhase: 0,
      coefficients: [],
    },
    energyCapacity: 300.0,
    coherenceLoss: 0.005,
    fractureThreshold: 250.0,
  }

  const fftConfig = energyConfigToFFT(baseConfig, id)
  return { id, name, fftConfig, position, fractured: false }
}

// Props
export interface MagicCubeDemoProps {
  /** Optional CSS class name */
  className?: string
}

const props = withDefaults(defineProps<MagicCubeDemoProps>(), {
  className: '',
})

// State
const cubes = ref<MagicCubeState[]>([
  createMagicCrystalState('crystal-1', 'Magic Crystal', [-1.5, 0.5, 0]),
  createUnstableCoreState('core-1', 'Unstable Core', [1.5, 0.5, 0]),
  createEnergyShieldState('shield-1', 'Energy Shield', [0, 0.5, 2]),
])

const selectedCubeId = ref<string | null>(null)
const message = ref<string>('Click a cube to select it as energy source')
const autoDecay = ref(false)
let decayInterval: ReturnType<typeof setInterval> | null = null
let lastDecayTime = Date.now()

// Helper function to check fractures and update cube state
function checkAndApplyFractures(cubeList: MagicCubeState[]): {
  cubes: MagicCubeState[]
  message: string | null
} {
  let messageToSet: string | null = null

  const updatedCubes = cubeList.map((cube) => {
    if (cube.fractured) return cube

    const fractureResult = checkFracture(cube.fftConfig)
    if (fractureResult.fractured) {
      messageToSet = `${cube.name} has fractured! Energy overflow: ${fractureResult.excessEnergy.toFixed(1)}`
      return {
        ...cube,
        fractured: true,
        fractureTime: Date.now(),
      }
    }
    return cube
  })

  return { cubes: updatedCubes, message: messageToSet }
}

// Auto-decay effect
watch(autoDecay, (enabled) => {
  if (decayInterval) {
    clearInterval(decayInterval)
    decayInterval = null
  }

  if (enabled) {
    lastDecayTime = Date.now()
    decayInterval = setInterval(() => {
      const now = Date.now()
      const deltaTime = (now - lastDecayTime) / 1000
      lastDecayTime = now

      const decayedCubes = cubes.value.map((cube) => {
        if (cube.fractured) return cube
        const newFftConfig = applyCoherenceLoss(cube.fftConfig, deltaTime)
        return { ...cube, fftConfig: newFftConfig }
      })

      const { cubes: updatedCubes, message: fractureMessage } = checkAndApplyFractures(decayedCubes)
      if (fractureMessage) {
        message.value = fractureMessage
      }
      cubes.value = updatedCubes
    }, 100)
  }
})

onUnmounted(() => {
  if (decayInterval) {
    clearInterval(decayInterval)
  }
})

// Handle energy transfer
function handleTransferEnergy(cubeId: string) {
  if (selectedCubeId.value === null) {
    // First click - select source cube
    const cube = cubes.value.find((c) => c.id === cubeId)
    if (cube && !cube.fractured) {
      selectedCubeId.value = cubeId
      message.value = `Selected ${cube.name}. Click another cube to transfer energy to it.`
    }
  } else if (selectedCubeId.value === cubeId) {
    // Clicked same cube - deselect
    selectedCubeId.value = null
    message.value = 'Selection cleared. Click a cube to select it as energy source.'
  } else {
    // Second click - perform transfer
    const sourceCube = cubes.value.find((c) => c.id === selectedCubeId.value)
    const targetCube = cubes.value.find((c) => c.id === cubeId)

    if (sourceCube && targetCube && !sourceCube.fractured && !targetCube.fractured) {
      const sourceEnergy = sourceCube.fftConfig.current_energy ?? 0
      const transferAmount = sourceEnergy * 0.2

      if (transferAmount > 0.1) {
        const {
          source: newSource,
          target: newTarget,
          result,
        } = applyEnergyTransfer(sourceCube.fftConfig, targetCube.fftConfig, transferAmount, {
          efficiency: 0.9,
        })

        const updatedCubes = cubes.value.map((cube) => {
          if (cube.id === selectedCubeId.value) return { ...cube, fftConfig: newSource }
          if (cube.id === cubeId) return { ...cube, fftConfig: newTarget }
          return cube
        })

        const { cubes: fractureCheckedCubes, message: fractureMessage } =
          checkAndApplyFractures(updatedCubes)
        cubes.value = fractureCheckedCubes

        let transferMsg = `Transferred ${result.transferredAmount.toFixed(1)} energy from ${sourceCube.name} to ${targetCube.name}!`
        if (isNearFracture(newTarget, 0.7)) {
          transferMsg += ` Warning: ${targetCube.name} is near fracture threshold!`
        }
        if (fractureMessage) {
          setTimeout(() => {
            message.value = fractureMessage
          }, 100)
        }
        message.value = transferMsg
      } else {
        message.value = `${sourceCube.name} has insufficient energy to transfer.`
      }
    }

    selectedCubeId.value = null
  }
}

// Reset demo
function handleReset() {
  cubes.value = [
    createMagicCrystalState('crystal-1', 'Magic Crystal', [-1.5, 0.5, 0]),
    createUnstableCoreState('core-1', 'Unstable Core', [1.5, 0.5, 0]),
    createEnergyShieldState('shield-1', 'Energy Shield', [0, 0.5, 2]),
  ]
  selectedCubeId.value = null
  message.value = 'Demo reset! Click a cube to select it as energy source.'
}

// Add energy to selected cube
function handleAddEnergy() {
  if (!selectedCubeId.value) {
    message.value = 'Select a cube first to add energy to it.'
    return
  }

  cubes.value = cubes.value.map((cube) => {
    if (cube.id === selectedCubeId.value && !cube.fractured) {
      const scaleFactor = 1.2
      const newChannels = { ...cube.fftConfig.channels }

      const scaleChannel = (channel: FFTChannel | undefined): FFTChannel | undefined => {
        if (!channel) return undefined
        return {
          dcAmplitude: channel.dcAmplitude * scaleFactor,
          dcPhase: channel.dcPhase,
          coefficients: channel.coefficients.map((c) => ({
            ...c,
            amplitude: c.amplitude * scaleFactor,
          })),
        }
      }

      newChannels.R = scaleChannel(newChannels.R)
      newChannels.G = scaleChannel(newChannels.G)
      newChannels.B = scaleChannel(newChannels.B)

      const newFftConfig = {
        ...cube.fftConfig,
        channels: newChannels,
        current_energy: calculateTotalEnergy({ ...cube.fftConfig, channels: newChannels }),
      }

      message.value = `Added energy to ${cube.name}! Current: ${newFftConfig.current_energy?.toFixed(1)}`
      return { ...cube, fftConfig: newFftConfig }
    }
    return cube
  })
}

// Computed cube info for display
function getCubeEnergyPercent(cube: MagicCubeState): number {
  return Math.round(getNormalizedEnergy(cube.fftConfig) * 100)
}

function isCubeNearFracture(cube: MagicCubeState): boolean {
  return isNearFracture(cube.fftConfig, 0.7)
}

function getCubeFractureResult(cube: MagicCubeState): FractureCheckResult {
  return checkFracture(cube.fftConfig)
}

function getCubeGlowIntensity(cube: MagicCubeState): number {
  const nearFracture = isCubeNearFracture(cube)
  return nearFracture ? 1.5 : 0.5 + getNormalizedEnergy(cube.fftConfig) * 0.5
}

// Calculate stats for display
const stats = computed(() => {
  const activeCubes = cubes.value.filter((c) => !c.fractured)
  const totalEnergy = activeCubes.reduce((sum, c) => sum + (c.fftConfig.current_energy ?? 0), 0)
  const fracturedCount = cubes.value.filter((c) => c.fractured).length
  return { activeCubes: activeCubes.length, totalEnergy, fracturedCount }
})
</script>

<template>
  <div :class="`magic-cube-demo ${props.className}`">
    <!-- Header -->
    <div class="magic-cube-demo__header">
      <h2 class="magic-cube-demo__title">Magic Cube Demo</h2>
      <p class="magic-cube-demo__subtitle">
        Interactive demonstration of energy physics and destruction effects
      </p>
    </div>

    <!-- 3D Canvas -->
    <div class="magic-cube-demo__canvas">
      <TresCanvas shadows>
        <!-- Camera -->
        <TresPerspectiveCamera :position="[4, 3, 4]" :fov="50" :make-default="true" />

        <!-- Controls -->
        <OrbitControls
          :enable-pan="true"
          :enable-zoom="true"
          :enable-rotate="true"
          :min-distance="3"
          :max-distance="15"
        />

        <!-- Lighting -->
        <TresAmbientLight :intensity="0.3" />
        <TresDirectionalLight :position="[5, 10, 5]" :intensity="0.8" :cast-shadow="true" />
        <TresPointLight :position="[-3, 3, -3]" :intensity="0.4" color="#6666ff" />

        <!-- Environment -->
        <Environment preset="city" />

        <!-- Grid helper -->
        <TresGridHelper :args="[10, 20, 0x444444, 0x333333]" />

        <!-- Interactive Cubes -->
        <template v-for="cube in cubes" :key="cube.id">
          <TresGroup v-if="!cube.fractured" :position="cube.position">
            <!-- Clickable hitbox -->
            <TresMesh @click="handleTransferEnergy(cube.id)">
              <TresBoxGeometry :args="[1.2, 1.2, 1.2]" />
              <TresMeshBasicMaterial :transparent="true" :opacity="0" />
            </TresMesh>

            <!-- Energy cube visualization - using EnergyCube inline via shaders -->
            <TresMesh>
              <TresBoxGeometry :args="[1, 1, 1]" />
              <TresMeshStandardMaterial
                :color="
                  isCubeNearFracture(cube)
                    ? '#ff6622'
                    : selectedCubeId === cube.id
                      ? '#22ff88'
                      : '#4488ff'
                "
                :emissive="isCubeNearFracture(cube) ? '#ff3300' : '#002244'"
                :emissive-intensity="getCubeGlowIntensity(cube)"
                :transparent="true"
                :opacity="0.9"
              />
            </TresMesh>

            <!-- Selection indicator -->
            <TresMesh v-if="selectedCubeId === cube.id">
              <TresBoxGeometry :args="[1.15, 1.15, 1.15]" />
              <TresMeshBasicMaterial
                color="#00ff00"
                :transparent="true"
                :opacity="0.2"
                :wireframe="true"
              />
            </TresMesh>

            <!-- Info label via Html -->
            <Html :position="[0, 0.9, 0]" center>
              <div
                :style="{
                  background: isCubeNearFracture(cube)
                    ? 'rgba(255, 100, 50, 0.9)'
                    : selectedCubeId === cube.id
                      ? 'rgba(0, 200, 100, 0.9)'
                      : 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  whiteSpace: 'nowrap',
                  fontFamily: 'monospace',
                  userSelect: 'none',
                }"
              >
                <div :style="{ fontWeight: 'bold' }">{{ cube.name }}</div>
                <div>
                  Energy: {{ getCubeEnergyPercent(cube) }}%
                  <span v-if="isCubeNearFracture(cube)">&#9888;&#65039;</span>
                </div>
                <div v-if="getCubeFractureResult(cube).fractured" :style="{ color: '#ff4444' }">
                  FRACTURED!
                </div>
              </div>
            </Html>
          </TresGroup>
        </template>
      </TresCanvas>
    </div>

    <!-- Controls -->
    <div class="magic-cube-demo__controls">
      <button
        type="button"
        class="magic-cube-demo__button magic-cube-demo__button--primary"
        @click="handleAddEnergy"
      >
        Add Energy (+20%)
      </button>
      <button
        type="button"
        :class="`magic-cube-demo__button ${autoDecay ? 'magic-cube-demo__button--active' : ''}`"
        @click="autoDecay = !autoDecay"
      >
        {{ autoDecay ? 'Disable Decay' : 'Enable Decay' }}
      </button>
      <button
        type="button"
        class="magic-cube-demo__button magic-cube-demo__button--secondary"
        @click="handleReset"
      >
        Reset Demo
      </button>
    </div>

    <!-- Stats -->
    <div class="magic-cube-demo__stats">
      <div class="magic-cube-demo__stat">
        <span class="magic-cube-demo__stat-label">Active Cubes:</span>
        <span class="magic-cube-demo__stat-value">{{ stats.activeCubes }}</span>
      </div>
      <div class="magic-cube-demo__stat">
        <span class="magic-cube-demo__stat-label">Total Energy:</span>
        <span class="magic-cube-demo__stat-value">{{ stats.totalEnergy.toFixed(1) }}</span>
      </div>
      <div class="magic-cube-demo__stat">
        <span class="magic-cube-demo__stat-label">Fractured:</span>
        <span class="magic-cube-demo__stat-value">{{ stats.fracturedCount }}</span>
      </div>
    </div>

    <!-- Message -->
    <div class="magic-cube-demo__message">
      <p>{{ message }}</p>
    </div>

    <!-- Instructions -->
    <div class="magic-cube-demo__instructions">
      <h3>Instructions</h3>
      <ul>
        <li>Click a cube to select it as the energy source</li>
        <li>Click another cube to transfer 20% of the source's energy</li>
        <li>Use "Add Energy" to increase the selected cube's energy</li>
        <li>Enable "Decay" to see coherence loss over time</li>
        <li>Watch for orange warning when near fracture threshold</li>
        <li>Cubes explode into fragments when energy exceeds threshold!</li>
      </ul>
    </div>
  </div>
</template>
