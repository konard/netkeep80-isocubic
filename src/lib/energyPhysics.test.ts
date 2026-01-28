import { describe, it, expect } from 'vitest'
import {
  calculateCoefficientEnergy,
  calculateChannelEnergy,
  calculateChannelsEnergy,
  calculateTotalEnergy,
  applyChannelCoherenceLoss,
  applyCoherenceLoss,
  checkFracture,
  transferEnergy,
  applyEnergyTransfer,
  getNormalizedEnergy,
  isNearFracture,
  getRemainingCapacity,
  updateCurrentEnergy,
} from './energyPhysics'
import type { FFTCubeConfig, FFTChannel, FFTCoefficient, FFTChannels } from '../types/cube'
import { createDefaultFFTCube } from '../types/cube'

// Helper to create a test FFT channel
function createTestChannel(
  dcAmplitude: number,
  coefficients: { amplitude: number; freqX?: number; freqY?: number; freqZ?: number }[] = []
): FFTChannel {
  return {
    dcAmplitude,
    dcPhase: 0,
    coefficients: coefficients.map((c, i) => ({
      amplitude: c.amplitude,
      phase: 0,
      freqX: c.freqX ?? i + 1,
      freqY: c.freqY ?? 0,
      freqZ: c.freqZ ?? 0,
    })),
  }
}

// Helper to create a test FFT cube
// Note: If channels is provided in overrides, it completely replaces the default channels
function createTestCube(overrides: Partial<FFTCubeConfig> = {}): FFTCubeConfig {
  const defaultCube = createDefaultFFTCube('test_cube', [0.5, 0.5, 0.5])
  return {
    ...defaultCube,
    ...overrides,
    // If channels is provided, use it directly (don't merge with defaults)
    channels: overrides.channels ?? defaultCube.channels,
    physics: {
      ...defaultCube.physics,
      ...(overrides.physics ?? {}),
    },
  }
}

describe('Energy Physics Module', () => {
  describe('calculateCoefficientEnergy', () => {
    it('should calculate energy as amplitude squared', () => {
      const coeff: FFTCoefficient = {
        amplitude: 3,
        phase: 0,
        freqX: 1,
        freqY: 0,
        freqZ: 0,
      }
      expect(calculateCoefficientEnergy(coeff)).toBe(9) // 3^2 = 9
    })

    it('should handle zero amplitude', () => {
      const coeff: FFTCoefficient = {
        amplitude: 0,
        phase: Math.PI,
        freqX: 1,
        freqY: 2,
        freqZ: 3,
      }
      expect(calculateCoefficientEnergy(coeff)).toBe(0)
    })

    it('should handle fractional amplitudes', () => {
      const coeff: FFTCoefficient = {
        amplitude: 0.5,
        phase: 0,
        freqX: 1,
        freqY: 0,
        freqZ: 0,
      }
      expect(calculateCoefficientEnergy(coeff)).toBeCloseTo(0.25, 10)
    })
  })

  describe('calculateChannelEnergy', () => {
    it('should calculate DC energy only', () => {
      const channel = createTestChannel(2.0, [])
      expect(calculateChannelEnergy(channel)).toBe(4) // 2^2 = 4
    })

    it('should sum DC and coefficient energies', () => {
      const channel = createTestChannel(2.0, [{ amplitude: 3.0 }])
      // DC: 2^2 = 4, coeff: 3^2 = 9, total = 13
      expect(calculateChannelEnergy(channel)).toBe(13)
    })

    it('should handle multiple coefficients', () => {
      const channel = createTestChannel(1.0, [
        { amplitude: 2.0 },
        { amplitude: 3.0 },
        { amplitude: 4.0 },
      ])
      // DC: 1, coeffs: 4 + 9 + 16 = 29, total = 30
      expect(calculateChannelEnergy(channel)).toBe(30)
    })

    it('should return 0 for undefined channel', () => {
      expect(calculateChannelEnergy(undefined)).toBe(0)
    })

    it('should return 0 for empty channel', () => {
      const channel = createTestChannel(0, [])
      expect(calculateChannelEnergy(channel)).toBe(0)
    })
  })

  describe('calculateChannelsEnergy', () => {
    it('should sum energy across all channels', () => {
      const channels: FFTChannels = {
        R: createTestChannel(1.0, []), // energy = 1
        G: createTestChannel(2.0, []), // energy = 4
        B: createTestChannel(3.0, []), // energy = 9
        A: createTestChannel(4.0, []), // energy = 16
      }
      // Total = 1 + 4 + 9 + 16 = 30
      expect(calculateChannelsEnergy(channels)).toBe(30)
    })

    it('should handle missing channels', () => {
      const channels: FFTChannels = {
        R: createTestChannel(2.0, []), // energy = 4
        // G, B, A are undefined
      }
      expect(calculateChannelsEnergy(channels)).toBe(4)
    })

    it('should handle empty channels object', () => {
      const channels: FFTChannels = {}
      expect(calculateChannelsEnergy(channels)).toBe(0)
    })
  })

  describe('calculateTotalEnergy', () => {
    it('should calculate total energy of an FFT cube', () => {
      const cube = createTestCube({
        channels: {
          R: createTestChannel(1.0, [{ amplitude: 1.0 }]), // 1 + 1 = 2
          G: createTestChannel(1.0, [{ amplitude: 1.0 }]), // 1 + 1 = 2
          B: createTestChannel(1.0, [{ amplitude: 1.0 }]), // 1 + 1 = 2
          A: createTestChannel(1.0, []), // 1
        },
      })
      // Total = 2 + 2 + 2 + 1 = 7
      expect(calculateTotalEnergy(cube)).toBe(7)
    })
  })

  describe('applyChannelCoherenceLoss', () => {
    it('should decay amplitudes exponentially', () => {
      const channel = createTestChannel(1.0, [{ amplitude: 1.0 }])
      const coherenceLoss = 0.1
      const deltaTime = 1.0

      const result = applyChannelCoherenceLoss(channel, coherenceLoss, deltaTime)

      // Expected decay factor: e^(-0.1 * 1) ≈ 0.9048
      const expectedDecay = Math.exp(-0.1)
      expect(result.dcAmplitude).toBeCloseTo(expectedDecay, 4)
      expect(result.coefficients[0].amplitude).toBeCloseTo(expectedDecay, 4)
    })

    it('should preserve phase', () => {
      const channel: FFTChannel = {
        dcAmplitude: 1.0,
        dcPhase: Math.PI / 4,
        coefficients: [{ amplitude: 1.0, phase: Math.PI / 2, freqX: 1, freqY: 0, freqZ: 0 }],
      }

      const result = applyChannelCoherenceLoss(channel, 0.1, 1.0)

      expect(result.dcPhase).toBe(Math.PI / 4)
      expect(result.coefficients[0].phase).toBe(Math.PI / 2)
    })

    it('should return unchanged channel for zero coherence loss', () => {
      const channel = createTestChannel(1.0, [{ amplitude: 1.0 }])
      const result = applyChannelCoherenceLoss(channel, 0, 1.0)

      expect(result.dcAmplitude).toBe(1.0)
      expect(result.coefficients[0].amplitude).toBe(1.0)
    })

    it('should return unchanged channel for zero delta time', () => {
      const channel = createTestChannel(1.0, [{ amplitude: 1.0 }])
      const result = applyChannelCoherenceLoss(channel, 0.1, 0)

      expect(result.dcAmplitude).toBe(1.0)
      expect(result.coefficients[0].amplitude).toBe(1.0)
    })

    it('should handle negative coherence loss', () => {
      const channel = createTestChannel(1.0, [])
      const result = applyChannelCoherenceLoss(channel, -0.1, 1.0)

      // Negative coherence loss should be treated as no loss
      expect(result.dcAmplitude).toBe(1.0)
    })
  })

  describe('applyCoherenceLoss', () => {
    it('should apply decay to all channels', () => {
      const cube = createTestCube({
        channels: {
          R: createTestChannel(1.0, []),
          G: createTestChannel(1.0, []),
          B: createTestChannel(1.0, []),
          A: createTestChannel(1.0, []),
        },
        physics: { coherence_loss: 0.1 },
      })

      const result = applyCoherenceLoss(cube, 1.0)
      const expectedDecay = Math.exp(-0.1)

      expect(result.channels.R?.dcAmplitude).toBeCloseTo(expectedDecay, 4)
      expect(result.channels.G?.dcAmplitude).toBeCloseTo(expectedDecay, 4)
      expect(result.channels.B?.dcAmplitude).toBeCloseTo(expectedDecay, 4)
      expect(result.channels.A?.dcAmplitude).toBeCloseTo(expectedDecay, 4)
    })

    it('should update current_energy after decay', () => {
      const cube = createTestCube({
        channels: {
          R: createTestChannel(1.0, []),
          G: createTestChannel(1.0, []),
          B: createTestChannel(1.0, []),
          A: createTestChannel(1.0, []),
        },
        physics: { coherence_loss: 0.1 },
        current_energy: 4.0, // Initial energy = 4 * 1 = 4
      })

      const result = applyCoherenceLoss(cube, 1.0)
      const expectedDecay = Math.exp(-0.1)
      const expectedEnergy = 4 * expectedDecay * expectedDecay // Energy decays as amplitude^2

      expect(result.current_energy).toBeCloseTo(expectedEnergy, 4)
    })

    it('should return unchanged cube when no coherence loss defined', () => {
      const cube = createTestCube({
        channels: {
          R: createTestChannel(1.0, []),
        },
        physics: { coherence_loss: undefined },
      })

      const result = applyCoherenceLoss(cube, 1.0)
      expect(result.channels.R?.dcAmplitude).toBe(1.0)
    })
  })

  describe('checkFracture', () => {
    it('should detect fracture when energy exceeds threshold', () => {
      const cube = createTestCube({
        channels: {
          R: createTestChannel(10.0, []), // energy = 100
        },
        physics: { fracture_threshold: 50.0 },
        current_energy: 100.0,
      })

      const result = checkFracture(cube)

      expect(result.fractured).toBe(true)
      expect(result.currentEnergy).toBe(100)
      expect(result.threshold).toBe(50)
      expect(result.excessEnergy).toBe(50)
      expect(result.stressLevel).toBe(2.0) // 100 / 50 = 2
    })

    it('should not detect fracture when energy is below threshold', () => {
      const cube = createTestCube({
        channels: {
          R: createTestChannel(5.0, []), // energy = 25
        },
        physics: { fracture_threshold: 50.0 },
        current_energy: 25.0,
      })

      const result = checkFracture(cube)

      expect(result.fractured).toBe(false)
      expect(result.excessEnergy).toBe(0)
      expect(result.stressLevel).toBe(0.5) // 25 / 50 = 0.5
    })

    it('should not fracture when no threshold is set', () => {
      const cube = createTestCube({
        channels: {
          R: createTestChannel(100.0, []),
        },
        physics: { fracture_threshold: 0 },
        current_energy: 10000.0,
      })

      const result = checkFracture(cube)

      expect(result.fractured).toBe(false)
      expect(result.threshold).toBe(0)
      expect(result.stressLevel).toBe(0)
    })

    it('should calculate energy from channels if current_energy not set', () => {
      const cube = createTestCube({
        channels: {
          R: createTestChannel(7.0, []), // energy = 49
        },
        physics: { fracture_threshold: 50.0 },
        current_energy: undefined,
      })

      const result = checkFracture(cube)

      expect(result.currentEnergy).toBe(49)
      expect(result.fractured).toBe(false)
    })
  })

  describe('transferEnergy', () => {
    it('should transfer energy between cubes', () => {
      const source = createTestCube({
        energy_capacity: 100.0,
        current_energy: 50.0,
      })
      const target = createTestCube({
        energy_capacity: 100.0,
        current_energy: 20.0,
      })

      const result = transferEnergy(source, target, 10.0)

      expect(result.transferredAmount).toBe(10.0)
      expect(result.sourceRemainingEnergy).toBe(40.0)
      expect(result.targetNewEnergy).toBe(30.0)
      expect(result.sourceDepleted).toBe(false)
      expect(result.targetAtCapacity).toBe(false)
    })

    it('should limit transfer to available source energy', () => {
      const source = createTestCube({
        energy_capacity: 100.0,
        current_energy: 10.0,
      })
      const target = createTestCube({
        energy_capacity: 100.0,
        current_energy: 0,
      })

      const result = transferEnergy(source, target, 50.0)

      expect(result.transferredAmount).toBe(10.0)
      expect(result.sourceRemainingEnergy).toBe(0)
      expect(result.targetNewEnergy).toBe(10.0)
      expect(result.sourceDepleted).toBe(true)
    })

    it('should respect max transfer ratio', () => {
      const source = createTestCube({
        energy_capacity: 100.0,
        current_energy: 100.0,
      })
      const target = createTestCube({
        energy_capacity: 100.0,
        current_energy: 0,
      })

      const result = transferEnergy(source, target, 100.0, { maxTransferRatio: 0.5 })

      expect(result.transferredAmount).toBe(50.0)
      expect(result.sourceRemainingEnergy).toBe(50.0)
    })

    it('should apply efficiency loss', () => {
      const source = createTestCube({
        energy_capacity: 100.0,
        current_energy: 100.0,
      })
      const target = createTestCube({
        energy_capacity: 100.0,
        current_energy: 0,
      })

      const result = transferEnergy(source, target, 100.0, { efficiency: 0.8 })

      expect(result.transferredAmount).toBe(100.0) // Source loses full amount
      expect(result.targetNewEnergy).toBe(80.0) // Target receives 80%
    })

    it('should limit transfer to target capacity', () => {
      const source = createTestCube({
        energy_capacity: 100.0,
        current_energy: 100.0,
      })
      const target = createTestCube({
        energy_capacity: 50.0,
        current_energy: 40.0,
      })

      const result = transferEnergy(source, target, 50.0)

      expect(result.targetNewEnergy).toBe(50.0) // Capped at capacity
      expect(result.transferredAmount).toBe(10.0) // Only transferred what fits
      expect(result.targetAtCapacity).toBe(true)
    })

    it('should allow overflow when specified', () => {
      const source = createTestCube({
        energy_capacity: 100.0,
        current_energy: 100.0,
      })
      const target = createTestCube({
        energy_capacity: 50.0,
        current_energy: 40.0,
      })

      const result = transferEnergy(source, target, 50.0, { allowOverflow: true })

      expect(result.transferredAmount).toBe(50.0)
      expect(result.targetNewEnergy).toBe(90.0) // Exceeds capacity
    })

    it('should handle zero transfer amount', () => {
      const source = createTestCube({ current_energy: 50.0 })
      const target = createTestCube({ current_energy: 20.0 })

      const result = transferEnergy(source, target, 0)

      expect(result.transferredAmount).toBe(0)
      expect(result.sourceRemainingEnergy).toBe(50.0)
      expect(result.targetNewEnergy).toBe(20.0)
    })

    it('should handle empty source', () => {
      const source = createTestCube({ current_energy: 0 })
      const target = createTestCube({ current_energy: 20.0 })

      const result = transferEnergy(source, target, 10.0)

      expect(result.transferredAmount).toBe(0)
      expect(result.sourceDepleted).toBe(true)
    })
  })

  describe('applyEnergyTransfer', () => {
    it('should update both cube configurations', () => {
      const source = createTestCube({
        channels: { R: createTestChannel(2.0, []) }, // energy = 4
        energy_capacity: 100.0,
        current_energy: 4.0,
      })
      const target = createTestCube({
        channels: { R: createTestChannel(1.0, []) }, // energy = 1
        energy_capacity: 100.0,
        current_energy: 1.0,
      })

      const {
        source: newSource,
        target: newTarget,
        result,
      } = applyEnergyTransfer(source, target, 2.0)

      expect(result.transferredAmount).toBe(2.0)
      expect(newSource.current_energy).toBe(2.0)
      expect(newTarget.current_energy).toBe(3.0)
    })

    it('should return result object with transfer details', () => {
      const source = createTestCube({ current_energy: 50.0 })
      const target = createTestCube({ current_energy: 20.0 })

      const { result } = applyEnergyTransfer(source, target, 10.0)

      expect(result).toHaveProperty('transferredAmount')
      expect(result).toHaveProperty('sourceRemainingEnergy')
      expect(result).toHaveProperty('targetNewEnergy')
    })
  })

  describe('getNormalizedEnergy', () => {
    it('should return energy as fraction of capacity', () => {
      const cube = createTestCube({
        energy_capacity: 100.0,
        current_energy: 75.0,
      })

      expect(getNormalizedEnergy(cube)).toBe(0.75)
    })

    it('should handle zero capacity', () => {
      const cube = createTestCube({
        energy_capacity: 0,
        current_energy: 50.0,
      })

      expect(getNormalizedEnergy(cube)).toBe(0)
    })

    it('should calculate from channels if current_energy not set', () => {
      const cube = createTestCube({
        channels: { R: createTestChannel(5.0, []) }, // energy = 25
        energy_capacity: 100.0,
        current_energy: undefined,
      })

      expect(getNormalizedEnergy(cube)).toBe(0.25)
    })
  })

  describe('isNearFracture', () => {
    it('should return true when energy is above warning threshold', () => {
      const cube = createTestCube({
        current_energy: 85.0,
        physics: { fracture_threshold: 100.0 },
      })

      expect(isNearFracture(cube, 0.8)).toBe(true) // 85 > 80 (warning) but < 100 (threshold)
    })

    it('should return false when energy is below warning threshold', () => {
      const cube = createTestCube({
        current_energy: 50.0,
        physics: { fracture_threshold: 100.0 },
      })

      expect(isNearFracture(cube, 0.8)).toBe(false) // 50 < 80 (warning)
    })

    it('should return false when energy exceeds fracture threshold', () => {
      const cube = createTestCube({
        current_energy: 120.0,
        physics: { fracture_threshold: 100.0 },
      })

      expect(isNearFracture(cube, 0.8)).toBe(false) // Already fractured, not "near"
    })

    it('should return false when no threshold is set', () => {
      const cube = createTestCube({
        current_energy: 1000.0,
        physics: { fracture_threshold: 0 },
      })

      expect(isNearFracture(cube)).toBe(false)
    })

    it('should use default warning threshold of 0.8', () => {
      const cube = createTestCube({
        current_energy: 85.0,
        physics: { fracture_threshold: 100.0 },
      })

      expect(isNearFracture(cube)).toBe(true) // Uses default 0.8
    })
  })

  describe('getRemainingCapacity', () => {
    it('should return remaining space in cube', () => {
      const cube = createTestCube({
        energy_capacity: 100.0,
        current_energy: 60.0,
      })

      expect(getRemainingCapacity(cube)).toBe(40.0)
    })

    it('should return 0 when at or over capacity', () => {
      const cube = createTestCube({
        energy_capacity: 100.0,
        current_energy: 150.0, // Over capacity
      })

      expect(getRemainingCapacity(cube)).toBe(0)
    })

    it('should return full capacity when empty', () => {
      const cube = createTestCube({
        energy_capacity: 100.0,
        current_energy: 0,
      })

      expect(getRemainingCapacity(cube)).toBe(100.0)
    })
  })

  describe('updateCurrentEnergy', () => {
    it('should recalculate current_energy from channels', () => {
      const cube = createTestCube({
        channels: {
          R: createTestChannel(2.0, [{ amplitude: 1.0 }]), // 4 + 1 = 5
          G: createTestChannel(1.0, []), // 1
        },
        current_energy: 0, // Stale value
      })

      const updated = updateCurrentEnergy(cube)

      expect(updated.current_energy).toBe(6) // 5 + 1 = 6
    })

    it('should preserve all other cube properties', () => {
      const cube = createTestCube({
        id: 'my_cube',
        energy_capacity: 200.0,
        physics: { coherence_loss: 0.5 },
      })

      const updated = updateCurrentEnergy(cube)

      expect(updated.id).toBe('my_cube')
      expect(updated.energy_capacity).toBe(200.0)
      expect(updated.physics?.coherence_loss).toBe(0.5)
    })
  })

  describe('Energy Conservation', () => {
    it('should conserve total energy in transfer (100% efficiency)', () => {
      const source = createTestCube({
        current_energy: 80.0,
        energy_capacity: 100.0,
      })
      const target = createTestCube({
        current_energy: 20.0,
        energy_capacity: 100.0,
      })

      const totalBefore = source.current_energy! + target.current_energy!

      const result = transferEnergy(source, target, 30.0, { efficiency: 1.0 })

      const totalAfter = result.sourceRemainingEnergy + result.targetNewEnergy
      expect(totalAfter).toBeCloseTo(totalBefore, 10)
    })

    it('should lose energy according to efficiency', () => {
      const source = createTestCube({
        current_energy: 100.0,
        energy_capacity: 100.0,
      })
      const target = createTestCube({
        current_energy: 0,
        energy_capacity: 200.0,
      })

      const result = transferEnergy(source, target, 50.0, { efficiency: 0.5 })

      // Source loses 50, target gains only 25 (50% efficiency)
      expect(result.transferredAmount).toBe(50.0)
      expect(result.sourceRemainingEnergy).toBe(50.0)
      expect(result.targetNewEnergy).toBe(25.0)

      const energyLost = 50.0 - 25.0 // 25 units lost
      expect(energyLost).toBe(25.0)
    })
  })

  describe('Parseval Theorem Verification', () => {
    it('should correctly calculate energy as sum of squared amplitudes', () => {
      // Create a channel with known amplitudes
      const channel: FFTChannel = {
        dcAmplitude: 3.0, // DC^2 = 9
        dcPhase: 0,
        coefficients: [
          { amplitude: 4.0, phase: 0, freqX: 1, freqY: 0, freqZ: 0 }, // 16
          { amplitude: 5.0, phase: 0, freqX: 0, freqY: 1, freqZ: 0 }, // 25
        ],
      }

      // Total energy should be 9 + 16 + 25 = 50
      expect(calculateChannelEnergy(channel)).toBe(50)
    })

    it('should compute same energy regardless of phase', () => {
      const channel1: FFTChannel = {
        dcAmplitude: 2.0,
        dcPhase: 0,
        coefficients: [{ amplitude: 3.0, phase: 0, freqX: 1, freqY: 0, freqZ: 0 }],
      }

      const channel2: FFTChannel = {
        dcAmplitude: 2.0,
        dcPhase: Math.PI,
        coefficients: [{ amplitude: 3.0, phase: Math.PI / 2, freqX: 1, freqY: 0, freqZ: 0 }],
      }

      // Energy depends only on amplitude, not phase
      expect(calculateChannelEnergy(channel1)).toBe(calculateChannelEnergy(channel2))
    })
  })
})
