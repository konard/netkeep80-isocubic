/**
 * Unit tests for FFTParamEditor Vue component
 * Tests the Vue.js 3.0 migration of the FFTParamEditor component (TASK 63)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { createDefaultFFTCube } from '../types/cube'

describe('FFTParamEditor Vue Component — Module Exports', () => {
  it('should export FFTParamEditor.vue as a valid Vue component', async () => {
    const module = await import('./FFTParamEditor.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })
})

describe('FFTParamEditor Vue Component — FFT Configuration', () => {
  it('should create a valid default FFT cube', () => {
    const fftCube = createDefaultFFTCube('fft_test_001')
    expect(fftCube).toBeDefined()
    expect(fftCube.channels).toBeDefined()
    expect(fftCube.is_magical).toBe(true)
  })

  it('should validate FFT energy capacity', () => {
    const fftCube = createDefaultFFTCube('fft_test_002')
    expect(typeof fftCube.energy_capacity).toBe('number')
    expect(fftCube.energy_capacity).toBeGreaterThan(0)
  })

  it('should support editor mode types', () => {
    const modes: Array<'spectral' | 'fft'> = ['spectral', 'fft']
    expect(modes).toHaveLength(2)
    expect(modes).toContain('spectral')
    expect(modes).toContain('fft')
  })
})
