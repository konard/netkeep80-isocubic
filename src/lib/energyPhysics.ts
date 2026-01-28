/**
 * Energy Physics Module for Magical Objects
 *
 * Implements the energy physics system for FFT-based magical cubes.
 * Provides functions for:
 * - Calculating total energy using Parseval's theorem
 * - Transferring energy between cubes
 * - Modeling coherence loss over time
 * - Checking fracture conditions
 *
 * @module energyPhysics
 */

import type { FFTCubeConfig, FFTChannel, FFTCoefficient, FFTChannels } from '../types/cube'

/**
 * Result of a fracture check
 */
export interface FractureCheckResult {
  /** Whether the cube has fractured */
  fractured: boolean
  /** Current energy level */
  currentEnergy: number
  /** Fracture threshold */
  threshold: number
  /** How much the threshold was exceeded (0 if not exceeded) */
  excessEnergy: number
  /** Stress level as a ratio of current energy to threshold (0-1+) */
  stressLevel: number
}

/**
 * Result of an energy transfer operation
 */
export interface EnergyTransferResult {
  /** Amount of energy actually transferred */
  transferredAmount: number
  /** Energy remaining in source cube */
  sourceRemainingEnergy: number
  /** New energy level in target cube */
  targetNewEnergy: number
  /** Whether the source cube was depleted */
  sourceDepleted: boolean
  /** Whether the target cube reached capacity */
  targetAtCapacity: boolean
}

/**
 * Options for energy transfer
 */
export interface EnergyTransferOptions {
  /** Maximum percentage of source energy to transfer (0-1, default 1.0) */
  maxTransferRatio?: number
  /** Efficiency of transfer (0-1, default 1.0 = no loss) */
  efficiency?: number
  /** Whether to allow exceeding target capacity (default false) */
  allowOverflow?: boolean
}

/**
 * Calculate the energy of a single FFT coefficient
 * Energy = amplitude^2 (magnitude squared)
 *
 * @param coefficient - FFT coefficient
 * @returns Energy of this frequency component
 */
export function calculateCoefficientEnergy(coefficient: FFTCoefficient): number {
  return coefficient.amplitude * coefficient.amplitude
}

/**
 * Calculate the total energy in a single FFT channel
 * Uses Parseval's theorem: E = |DC|² + Σ|c_k|²
 *
 * @param channel - FFT channel data
 * @returns Total energy in the channel
 */
export function calculateChannelEnergy(channel: FFTChannel | undefined): number {
  if (!channel) {
    return 0
  }

  // DC component energy
  let energy = channel.dcAmplitude * channel.dcAmplitude

  // Add energy from each coefficient
  for (const coeff of channel.coefficients) {
    energy += calculateCoefficientEnergy(coeff)
  }

  return energy
}

/**
 * Calculate the total energy across all channels of an FFT cube
 * Total energy is the sum of energies in R, G, B, and A channels
 *
 * @param channels - FFT channels structure
 * @returns Total energy across all channels
 */
export function calculateChannelsEnergy(channels: FFTChannels): number {
  return (
    calculateChannelEnergy(channels.R) +
    calculateChannelEnergy(channels.G) +
    calculateChannelEnergy(channels.B) +
    calculateChannelEnergy(channels.A)
  )
}

/**
 * Calculate the total energy stored in an FFT cube
 * This implements the energy calculation using Parseval's theorem
 *
 * @param cube - FFT cube configuration
 * @returns Total energy of the cube
 */
export function calculateTotalEnergy(cube: FFTCubeConfig): number {
  return calculateChannelsEnergy(cube.channels)
}

/**
 * Apply coherence loss to a single channel over a time delta
 * Coherence decays exponentially: A(t) = A(0) * e^(-λt)
 *
 * @param channel - FFT channel to modify
 * @param coherenceLoss - Coherence loss rate (λ)
 * @param deltaTime - Time elapsed in seconds
 * @returns New channel with decayed amplitudes
 */
export function applyChannelCoherenceLoss(
  channel: FFTChannel,
  coherenceLoss: number,
  deltaTime: number
): FFTChannel {
  if (coherenceLoss <= 0 || deltaTime <= 0) {
    return channel
  }

  // Calculate decay factor: e^(-λt)
  const decayFactor = Math.exp(-coherenceLoss * deltaTime)

  return {
    dcAmplitude: channel.dcAmplitude * decayFactor,
    dcPhase: channel.dcPhase,
    coefficients: channel.coefficients.map((coeff) => ({
      ...coeff,
      amplitude: coeff.amplitude * decayFactor,
    })),
  }
}

/**
 * Apply coherence loss to an FFT cube over a time delta
 * This models the natural decay of magical energy over time
 *
 * @param cube - FFT cube configuration
 * @param deltaTime - Time elapsed in seconds
 * @returns New cube configuration with decayed energy
 */
export function applyCoherenceLoss(cube: FFTCubeConfig, deltaTime: number): FFTCubeConfig {
  const coherenceLoss = cube.physics?.coherence_loss ?? 0

  if (coherenceLoss <= 0 || deltaTime <= 0) {
    return cube
  }

  const newChannels: FFTChannels = {}

  if (cube.channels.R) {
    newChannels.R = applyChannelCoherenceLoss(cube.channels.R, coherenceLoss, deltaTime)
  }
  if (cube.channels.G) {
    newChannels.G = applyChannelCoherenceLoss(cube.channels.G, coherenceLoss, deltaTime)
  }
  if (cube.channels.B) {
    newChannels.B = applyChannelCoherenceLoss(cube.channels.B, coherenceLoss, deltaTime)
  }
  if (cube.channels.A) {
    newChannels.A = applyChannelCoherenceLoss(cube.channels.A, coherenceLoss, deltaTime)
  }

  const newEnergy = calculateChannelsEnergy(newChannels)

  return {
    ...cube,
    channels: newChannels,
    current_energy: newEnergy,
  }
}

/**
 * Check if a cube has exceeded its fracture threshold
 *
 * @param cube - FFT cube configuration
 * @returns Fracture check result with detailed information
 */
export function checkFracture(cube: FFTCubeConfig): FractureCheckResult {
  const threshold = cube.physics?.fracture_threshold ?? 0
  const currentEnergy = cube.current_energy ?? calculateTotalEnergy(cube)

  // If no threshold is set, cube cannot fracture
  if (threshold <= 0) {
    return {
      fractured: false,
      currentEnergy,
      threshold: 0,
      excessEnergy: 0,
      stressLevel: 0,
    }
  }

  const fractured = currentEnergy >= threshold
  const excessEnergy = Math.max(0, currentEnergy - threshold)
  const stressLevel = currentEnergy / threshold

  return {
    fractured,
    currentEnergy,
    threshold,
    excessEnergy,
    stressLevel,
  }
}

/**
 * Scale a channel's amplitudes by a factor
 *
 * @param channel - FFT channel to scale
 * @param factor - Scale factor
 * @returns New channel with scaled amplitudes
 */
function scaleChannel(channel: FFTChannel, factor: number): FFTChannel {
  return {
    dcAmplitude: channel.dcAmplitude * factor,
    dcPhase: channel.dcPhase,
    coefficients: channel.coefficients.map((coeff) => ({
      ...coeff,
      amplitude: coeff.amplitude * factor,
    })),
  }
}

/**
 * Add energy from one channel to another (weighted combination)
 *
 * @param target - Target channel
 * @param source - Source channel to add from
 * @param sourceWeight - Weight for source contribution
 * @returns Combined channel
 */
function addChannelEnergy(
  target: FFTChannel | undefined,
  source: FFTChannel | undefined,
  sourceWeight: number
): FFTChannel {
  // If no target, create new from source
  if (!target) {
    if (!source) {
      return { dcAmplitude: 0, dcPhase: 0, coefficients: [] }
    }
    return scaleChannel(source, Math.sqrt(sourceWeight))
  }

  // If no source, return target as is
  if (!source) {
    return target
  }

  // Combine energies (add in energy domain, convert back to amplitude)
  const targetEnergy = calculateChannelEnergy(target)
  const sourceEnergy = calculateChannelEnergy(source) * sourceWeight
  const combinedEnergy = targetEnergy + sourceEnergy

  // Scale target to new energy level while preserving spectral shape
  if (targetEnergy > 0) {
    const scaleFactor = Math.sqrt(combinedEnergy / targetEnergy)
    return scaleChannel(target, scaleFactor)
  } else {
    // Target has no energy, use scaled source
    return scaleChannel(source, Math.sqrt(sourceWeight))
  }
}

/**
 * Transfer energy from one cube to another
 * Implements conservation of energy with optional efficiency loss
 *
 * @param source - Source cube (energy is taken from here)
 * @param target - Target cube (energy is added here)
 * @param amount - Amount of energy to transfer
 * @param options - Transfer options
 * @returns Transfer result with updated energy levels
 */
export function transferEnergy(
  source: FFTCubeConfig,
  target: FFTCubeConfig,
  amount: number,
  options: EnergyTransferOptions = {}
): EnergyTransferResult {
  const { maxTransferRatio = 1.0, efficiency = 1.0, allowOverflow = false } = options

  // Calculate current energies
  const sourceEnergy = source.current_energy ?? calculateTotalEnergy(source)
  const targetEnergy = target.current_energy ?? calculateTotalEnergy(target)

  // Validate inputs
  if (amount <= 0 || sourceEnergy <= 0) {
    return {
      transferredAmount: 0,
      sourceRemainingEnergy: sourceEnergy,
      targetNewEnergy: targetEnergy,
      sourceDepleted: sourceEnergy <= 0,
      targetAtCapacity: targetEnergy >= target.energy_capacity,
    }
  }

  // Limit by max transfer ratio
  const maxTransferFromSource = sourceEnergy * maxTransferRatio
  let actualAmount = Math.min(amount, maxTransferFromSource)

  // Limit by source available energy
  actualAmount = Math.min(actualAmount, sourceEnergy)

  // Apply efficiency (some energy is lost in transfer)
  const energyReceived = actualAmount * efficiency

  // Limit by target capacity (unless overflow allowed)
  const targetCapacity = target.energy_capacity
  const spaceInTarget = targetCapacity - targetEnergy
  const targetAtCapacity = spaceInTarget <= 0

  let finalReceived = energyReceived
  if (!allowOverflow && spaceInTarget < energyReceived) {
    finalReceived = Math.max(0, spaceInTarget)
    // Adjust actual amount based on what can be received
    actualAmount = efficiency > 0 ? finalReceived / efficiency : 0
  }

  // Calculate new energy levels
  const sourceRemainingEnergy = sourceEnergy - actualAmount
  const targetNewEnergy = targetEnergy + finalReceived

  return {
    transferredAmount: actualAmount,
    sourceRemainingEnergy,
    targetNewEnergy,
    sourceDepleted: sourceRemainingEnergy <= 0,
    targetAtCapacity: targetAtCapacity || targetNewEnergy >= targetCapacity,
  }
}

/**
 * Apply an energy transfer to update cube configurations
 * Returns new cube configurations with updated energy levels
 *
 * @param source - Source cube configuration
 * @param target - Target cube configuration
 * @param amount - Amount of energy to transfer
 * @param options - Transfer options
 * @returns Object with new source and target configurations
 */
export function applyEnergyTransfer(
  source: FFTCubeConfig,
  target: FFTCubeConfig,
  amount: number,
  options: EnergyTransferOptions = {}
): { source: FFTCubeConfig; target: FFTCubeConfig; result: EnergyTransferResult } {
  const result = transferEnergy(source, target, amount, options)

  // Calculate energy ratios for scaling
  const sourceCurrentEnergy = source.current_energy ?? calculateTotalEnergy(source)
  const sourceScale =
    sourceCurrentEnergy > 0 ? Math.sqrt(result.sourceRemainingEnergy / sourceCurrentEnergy) : 0

  const targetCurrentEnergy = target.current_energy ?? calculateTotalEnergy(target)
  const energyAdded = result.targetNewEnergy - targetCurrentEnergy

  // Create new source with reduced energy
  const newSourceChannels: FFTChannels = {}
  if (source.channels.R) {
    newSourceChannels.R = scaleChannel(source.channels.R, sourceScale)
  }
  if (source.channels.G) {
    newSourceChannels.G = scaleChannel(source.channels.G, sourceScale)
  }
  if (source.channels.B) {
    newSourceChannels.B = scaleChannel(source.channels.B, sourceScale)
  }
  if (source.channels.A) {
    newSourceChannels.A = scaleChannel(source.channels.A, sourceScale)
  }

  // Create new target with added energy
  const energyWeight = targetCurrentEnergy > 0 ? energyAdded / targetCurrentEnergy : 1.0
  const newTargetChannels: FFTChannels = {
    R: addChannelEnergy(target.channels.R, source.channels.R, energyWeight),
    G: addChannelEnergy(target.channels.G, source.channels.G, energyWeight),
    B: addChannelEnergy(target.channels.B, source.channels.B, energyWeight),
    A: addChannelEnergy(target.channels.A, source.channels.A, energyWeight),
  }

  return {
    source: {
      ...source,
      channels: newSourceChannels,
      current_energy: result.sourceRemainingEnergy,
    },
    target: {
      ...target,
      channels: newTargetChannels,
      current_energy: result.targetNewEnergy,
    },
    result,
  }
}

/**
 * Calculate the normalized energy level (0-1) of a cube
 *
 * @param cube - FFT cube configuration
 * @returns Normalized energy level (current / capacity)
 */
export function getNormalizedEnergy(cube: FFTCubeConfig): number {
  const currentEnergy = cube.current_energy ?? calculateTotalEnergy(cube)
  const capacity = cube.energy_capacity

  if (capacity <= 0) {
    return 0
  }

  return currentEnergy / capacity
}

/**
 * Check if a cube is near its fracture threshold
 *
 * @param cube - FFT cube configuration
 * @param warningThreshold - Percentage of threshold to trigger warning (default 0.8 = 80%)
 * @returns True if energy is above warning threshold but below fracture
 */
export function isNearFracture(cube: FFTCubeConfig, warningThreshold: number = 0.8): boolean {
  const threshold = cube.physics?.fracture_threshold ?? 0
  if (threshold <= 0) {
    return false
  }

  const currentEnergy = cube.current_energy ?? calculateTotalEnergy(cube)
  const warningLevel = threshold * warningThreshold

  return currentEnergy >= warningLevel && currentEnergy < threshold
}

/**
 * Calculate the remaining capacity of a cube
 *
 * @param cube - FFT cube configuration
 * @returns Remaining energy capacity
 */
export function getRemainingCapacity(cube: FFTCubeConfig): number {
  const currentEnergy = cube.current_energy ?? calculateTotalEnergy(cube)
  return Math.max(0, cube.energy_capacity - currentEnergy)
}

/**
 * Update the current_energy field of a cube based on its channels
 *
 * @param cube - FFT cube configuration
 * @returns Cube with updated current_energy field
 */
export function updateCurrentEnergy(cube: FFTCubeConfig): FFTCubeConfig {
  return {
    ...cube,
    current_energy: calculateTotalEnergy(cube),
  }
}
