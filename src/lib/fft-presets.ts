/**
 * FFT Channel Presets for common effects
 *
 * This module provides preset configurations for FFT channels
 * that can be applied to magical/energy cubes for common visual effects.
 *
 * ISSUE 27: Редактор FFT-каналов (FFT Channels Editor)
 */

import type { FFTChannels } from '../types/cube'

/** FFT Channel Editor Preset interface */
export interface FFTChannelPreset {
  id: string
  name: string
  description: string
  channels: FFTChannels
}

/** Preset configurations for common effects */
export const FFT_CHANNEL_PRESETS: FFTChannelPreset[] = [
  {
    id: 'crystal_pulsation',
    name: 'Crystal Pulsation',
    description: 'Gentle pulsating energy for crystalline objects',
    channels: {
      R: {
        dcAmplitude: 0.6,
        dcPhase: 0,
        coefficients: [
          { amplitude: 0.3, phase: 0, freqX: 1, freqY: 0, freqZ: 0 },
          { amplitude: 0.2, phase: Math.PI / 2, freqX: 0, freqY: 1, freqZ: 0 },
        ],
      },
      G: {
        dcAmplitude: 0.4,
        dcPhase: Math.PI / 4,
        coefficients: [{ amplitude: 0.25, phase: Math.PI / 3, freqX: 1, freqY: 1, freqZ: 0 }],
      },
      B: {
        dcAmplitude: 0.8,
        dcPhase: 0,
        coefficients: [
          { amplitude: 0.4, phase: 0, freqX: 0, freqY: 0, freqZ: 1 },
          { amplitude: 0.2, phase: Math.PI, freqX: 1, freqY: 0, freqZ: 1 },
        ],
      },
      A: {
        dcAmplitude: 1.0,
        dcPhase: 0,
        coefficients: [],
      },
    },
  },
  {
    id: 'energy_waves',
    name: 'Energy Waves',
    description: 'Dynamic wave patterns for energy visualization',
    channels: {
      R: {
        dcAmplitude: 0.5,
        dcPhase: 0,
        coefficients: [
          { amplitude: 0.4, phase: 0, freqX: 2, freqY: 0, freqZ: 0 },
          { amplitude: 0.3, phase: Math.PI / 2, freqX: 0, freqY: 2, freqZ: 0 },
          { amplitude: 0.2, phase: Math.PI, freqX: 0, freqY: 0, freqZ: 2 },
        ],
      },
      G: {
        dcAmplitude: 0.7,
        dcPhase: 0,
        coefficients: [
          { amplitude: 0.35, phase: Math.PI / 4, freqX: 1, freqY: 1, freqZ: 1 },
          { amplitude: 0.25, phase: Math.PI / 2, freqX: 2, freqY: 1, freqZ: 0 },
        ],
      },
      B: {
        dcAmplitude: 0.3,
        dcPhase: Math.PI / 6,
        coefficients: [{ amplitude: 0.2, phase: 0, freqX: 1, freqY: 2, freqZ: 1 }],
      },
      A: {
        dcAmplitude: 0.9,
        dcPhase: 0,
        coefficients: [{ amplitude: 0.1, phase: 0, freqX: 1, freqY: 1, freqZ: 1 }],
      },
    },
  },
  {
    id: 'unstable_core',
    name: 'Unstable Core',
    description: 'High-energy unstable configuration near fracture threshold',
    channels: {
      R: {
        dcAmplitude: 0.9,
        dcPhase: 0,
        coefficients: [
          { amplitude: 0.7, phase: 0, freqX: 1, freqY: 0, freqZ: 0 },
          { amplitude: 0.6, phase: Math.PI / 3, freqX: 0, freqY: 1, freqZ: 0 },
          { amplitude: 0.5, phase: (2 * Math.PI) / 3, freqX: 0, freqY: 0, freqZ: 1 },
          { amplitude: 0.4, phase: Math.PI, freqX: 1, freqY: 1, freqZ: 0 },
        ],
      },
      G: {
        dcAmplitude: 0.6,
        dcPhase: Math.PI / 2,
        coefficients: [
          { amplitude: 0.5, phase: 0, freqX: 2, freqY: 1, freqZ: 0 },
          { amplitude: 0.4, phase: Math.PI / 4, freqX: 1, freqY: 2, freqZ: 1 },
          { amplitude: 0.3, phase: Math.PI / 2, freqX: 0, freqY: 1, freqZ: 2 },
        ],
      },
      B: {
        dcAmplitude: 0.4,
        dcPhase: Math.PI,
        coefficients: [
          { amplitude: 0.6, phase: Math.PI / 6, freqX: 1, freqY: 1, freqZ: 1 },
          { amplitude: 0.5, phase: Math.PI / 3, freqX: 2, freqY: 2, freqZ: 0 },
        ],
      },
      A: {
        dcAmplitude: 1.0,
        dcPhase: 0,
        coefficients: [{ amplitude: 0.15, phase: 0, freqX: 1, freqY: 0, freqZ: 1 }],
      },
    },
  },
]
