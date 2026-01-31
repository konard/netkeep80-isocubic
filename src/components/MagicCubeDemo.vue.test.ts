/**
 * Unit tests for MagicCubeDemo Vue component
 * Tests the Vue.js 3.0 + TresJS migration of the MagicCubeDemo component (TASK 62)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest'
import {
  createMagicCrystalConfig,
  createUnstableCoreConfig,
  type EnergyCubeConfig,
} from '../shaders/energy-cube'

// Mock @tresjs/cientos to avoid ESM import issues in test environment
vi.mock('@tresjs/cientos', () => ({
  OrbitControls: {},
  Environment: {},
  Html: {},
  ContactShadows: {},
}))
import {
  calculateTotalEnergy,
  applyEnergyTransfer,
  checkFracture,
  isNearFracture,
  applyCoherenceLoss,
  getNormalizedEnergy,
} from '../lib/energyPhysics'
import type { FFTCubeConfig, FFTChannel, FFTCoefficient } from '../types/cube'

/**
 * Converts EnergyCubeConfig to FFTCubeConfig (same logic as in MagicCubeDemo.vue)
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

describe('MagicCubeDemo Vue Component — Energy Config Conversions', () => {
  it('should convert magic crystal config to FFT config', () => {
    const energyConfig = createMagicCrystalConfig()
    const fftConfig = energyConfigToFFT(energyConfig, 'crystal-1')

    expect(fftConfig.id).toBe('crystal-1')
    expect(fftConfig.is_magical).toBe(true)
    expect(fftConfig.fft_size).toBe(8)
    expect(fftConfig.energy_capacity).toBeGreaterThan(0)
    expect(fftConfig.current_energy).toBeGreaterThan(0)
    expect(fftConfig.channels.R).toBeDefined()
  })

  it('should convert unstable core config to FFT config', () => {
    const energyConfig = createUnstableCoreConfig()
    const fftConfig = energyConfigToFFT(energyConfig, 'core-1')

    expect(fftConfig.id).toBe('core-1')
    expect(fftConfig.is_magical).toBe(true)
    expect(fftConfig.physics?.fracture_threshold).toBeDefined()
  })

  it('should use provided currentEnergy when given', () => {
    const energyConfig = createMagicCrystalConfig()
    const fftConfig = energyConfigToFFT(energyConfig, 'test-1', 42.5)

    expect(fftConfig.current_energy).toBe(42.5)
  })
})

describe('MagicCubeDemo Vue Component — Energy Physics', () => {
  it('should calculate total energy correctly', () => {
    const config = createMagicCrystalConfig()
    const fftConfig = energyConfigToFFT(config, 'energy-test')
    const energy = calculateTotalEnergy(fftConfig)

    expect(energy).toBeGreaterThan(0)
    expect(typeof energy).toBe('number')
  })

  it('should transfer energy between cubes', () => {
    const crystal = energyConfigToFFT(createMagicCrystalConfig(), 'source')
    const core = energyConfigToFFT(createUnstableCoreConfig(), 'target')

    const sourceEnergy = crystal.current_energy ?? 0
    const transferAmount = sourceEnergy * 0.2

    const { source, target, result } = applyEnergyTransfer(crystal, core, transferAmount, {
      efficiency: 0.9,
    })

    expect(result.transferredAmount).toBeGreaterThan(0)
    expect(result.transferredAmount).toBeLessThanOrEqual(transferAmount)
    expect(source.current_energy!).toBeLessThan(crystal.current_energy!)
  })

  it('should check fracture correctly for normal cube', () => {
    const config = createMagicCrystalConfig()
    const fftConfig = energyConfigToFFT(config, 'fracture-test')

    const result = checkFracture(fftConfig)
    expect(result).toBeDefined()
    expect(typeof result.fractured).toBe('boolean')
  })

  it('should detect near-fracture state', () => {
    const config = createMagicCrystalConfig()
    const fftConfig = energyConfigToFFT(config, 'near-fracture-test')

    const nearFracture = isNearFracture(fftConfig, 0.7)
    expect(typeof nearFracture).toBe('boolean')
  })

  it('should apply coherence loss over time', () => {
    const config = createMagicCrystalConfig()
    const fftConfig = energyConfigToFFT(config, 'decay-test')

    const decayedConfig = applyCoherenceLoss(fftConfig, 1.0) // 1 second
    expect(decayedConfig).toBeDefined()
    expect(decayedConfig.id).toBe('decay-test')
  })

  it('should calculate normalized energy', () => {
    const config = createMagicCrystalConfig()
    const fftConfig = energyConfigToFFT(config, 'normalized-test')

    const normalized = getNormalizedEnergy(fftConfig)
    expect(normalized).toBeGreaterThanOrEqual(0)
    expect(normalized).toBeLessThanOrEqual(1)
  })
})

describe('MagicCubeDemo Vue Component — Energy Shield Config', () => {
  it('should create energy shield with high capacity and threshold', () => {
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

    const fftConfig = energyConfigToFFT(baseConfig, 'shield-1')
    expect(fftConfig.energy_capacity).toBe(300.0)
    expect(fftConfig.physics?.fracture_threshold).toBe(250.0)
    expect(fftConfig.physics?.coherence_loss).toBe(0.005)
  })
})

describe('MagicCubeDemo Vue Component — Module Exports', () => {
  it('should export MagicCubeDemo.vue as a valid Vue component', async () => {
    const module = await import('./MagicCubeDemo.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })
})
