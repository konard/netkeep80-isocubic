import { describe, it, expect, beforeEach } from 'vitest'
import type { FFTSize } from './fft-wasm'
import {
  FFT3D,
  calculateEnergy,
  isWasmSupported,
  createFFT,
  forwardFFT,
  inverseFFT,
  getFFTVersion,
} from './fft-wasm'

describe('FFT WASM Module', () => {
  describe('isWasmSupported', () => {
    it('should return a boolean', () => {
      const result = isWasmSupported()
      expect(typeof result).toBe('boolean')
    })
  })

  describe('getFFTVersion', () => {
    it('should return version string', () => {
      const version = getFFTVersion()
      expect(version).toBe('0.1.0')
    })
  })

  describe('calculateEnergy', () => {
    it('should calculate energy for real-only values', () => {
      const real = new Float32Array([1, 2, 3])
      const imag = new Float32Array([0, 0, 0])

      const energy = calculateEnergy(real, imag)
      // 1² + 2² + 3² = 1 + 4 + 9 = 14
      expect(energy).toBeCloseTo(14, 5)
    })

    it('should calculate energy for complex values', () => {
      const real = new Float32Array([3, 0])
      const imag = new Float32Array([4, 5])

      const energy = calculateEnergy(real, imag)
      // 3² + 4² + 0² + 5² = 9 + 16 + 0 + 25 = 50
      expect(energy).toBeCloseTo(50, 5)
    })

    it('should throw for mismatched array lengths', () => {
      const real = new Float32Array([1, 2, 3])
      const imag = new Float32Array([0, 0])

      expect(() => calculateEnergy(real, imag)).toThrow(
        'Real and imaginary arrays must have same length'
      )
    })

    it('should return 0 for zero arrays', () => {
      const real = new Float32Array([0, 0, 0, 0])
      const imag = new Float32Array([0, 0, 0, 0])

      const energy = calculateEnergy(real, imag)
      expect(energy).toBe(0)
    })
  })

  describe('FFT3D', () => {
    describe('constructor', () => {
      it('should create FFT3D with size 8', () => {
        const fft = new FFT3D(8)
        expect(fft.getSize()).toBe(8)
        expect(fft.getTotalSize()).toBe(512) // 8³
      })

      it('should create FFT3D with size 16', () => {
        const fft = new FFT3D(16)
        expect(fft.getSize()).toBe(16)
        expect(fft.getTotalSize()).toBe(4096) // 16³
      })

      it('should create FFT3D with size 32', () => {
        const fft = new FFT3D(32)
        expect(fft.getSize()).toBe(32)
        expect(fft.getTotalSize()).toBe(32768) // 32³
      })

      it('should throw for unsupported size', () => {
        expect(() => new FFT3D(5 as FFTSize)).toThrow('Unsupported FFT size: 5')
      })

      it('should default to size 8', () => {
        const fft = new FFT3D()
        expect(fft.getSize()).toBe(8)
      })
    })

    describe('initialize', () => {
      it('should initialize without error', async () => {
        const fft = new FFT3D(8)
        await expect(fft.initialize()).resolves.not.toThrow()
      })

      it('should be idempotent', async () => {
        const fft = new FFT3D(8)
        await fft.initialize()
        await fft.initialize()
        await fft.initialize()
        // Should not throw
      })
    })

    describe('isUsingWasm', () => {
      it('should return boolean after initialization', async () => {
        const fft = new FFT3D(8)
        await fft.initialize()
        expect(typeof fft.isUsingWasm()).toBe('boolean')
      })
    })

    describe('forward transform', () => {
      let fft: FFT3D
      const size = 8
      const totalSize = size * size * size

      beforeEach(async () => {
        fft = new FFT3D(8)
        await fft.initialize()
      })

      it('should throw for wrong input length', async () => {
        const inputReal = new Float32Array(100)
        const inputImag = new Float32Array(100)

        await expect(fft.forward(inputReal, inputImag)).rejects.toThrow(/Invalid input length/)
      })

      it('should transform impulse at origin', async () => {
        const inputReal = new Float32Array(totalSize)
        const inputImag = new Float32Array(totalSize)
        inputReal[0] = 1.0

        const result = await fft.forward(inputReal, inputImag)

        expect(result.real).toBeInstanceOf(Float32Array)
        expect(result.imag).toBeInstanceOf(Float32Array)
        expect(result.real.length).toBe(totalSize)
        expect(result.imag.length).toBe(totalSize)
        expect(typeof result.energy).toBe('number')
      })

      it('should preserve energy (Parseval theorem) after roundtrip', async () => {
        // Create a simple test pattern
        const inputReal = new Float32Array(totalSize)
        const inputImag = new Float32Array(totalSize)

        // Set some values
        inputReal[0] = 1.0
        inputReal[1] = 2.0
        inputReal[10] = 0.5

        const inputEnergy = calculateEnergy(inputReal, inputImag)

        // Forward then inverse should preserve energy
        const forward = await fft.forward(inputReal, inputImag)
        const recovered = await fft.inverse(forward.real, forward.imag)

        // Energy should be preserved after roundtrip (within numerical precision)
        expect(recovered.energy).toBeCloseTo(inputEnergy, 3)
      })

      it('should produce DC component for constant input', async () => {
        const inputReal = new Float32Array(totalSize).fill(1.0)
        const inputImag = new Float32Array(totalSize).fill(0.0)

        const result = await fft.forward(inputReal, inputImag)

        // DC component (index 0) should have all the energy
        const dcMagnitude = Math.sqrt(
          result.real[0] * result.real[0] + result.imag[0] * result.imag[0]
        )
        expect(dcMagnitude).toBeCloseTo(totalSize, 2) // DC = sum of all inputs
      })
    })

    describe('inverse transform', () => {
      let fft: FFT3D
      const size = 8
      const totalSize = size * size * size

      beforeEach(async () => {
        fft = new FFT3D(8)
        await fft.initialize()
      })

      it('should throw for wrong input length', async () => {
        const inputReal = new Float32Array(100)
        const inputImag = new Float32Array(100)

        await expect(fft.inverse(inputReal, inputImag)).rejects.toThrow(/Invalid input length/)
      })

      it('should recover original from roundtrip', async () => {
        // Create test input with impulse
        const inputReal = new Float32Array(totalSize)
        const inputImag = new Float32Array(totalSize)
        inputReal[0] = 1.0

        // Forward transform
        const forward = await fft.forward(inputReal, inputImag)

        // Inverse transform
        const recovered = await fft.inverse(forward.real, forward.imag)

        // Should recover original impulse
        expect(recovered.real[0]).toBeCloseTo(1.0, 4)

        // Other values should be near zero
        for (let i = 1; i < totalSize; i++) {
          expect(recovered.real[i]).toBeCloseTo(0, 4)
          expect(recovered.imag[i]).toBeCloseTo(0, 4)
        }
      })

      it('should recover complex input from roundtrip', async () => {
        const inputReal = new Float32Array(totalSize)
        const inputImag = new Float32Array(totalSize)

        // Set several values
        inputReal[0] = 1.0
        inputReal[7] = 0.5
        inputImag[0] = 0.3
        inputReal[63] = -0.2

        // Roundtrip
        const forward = await fft.forward(inputReal, inputImag)
        const recovered = await fft.inverse(forward.real, forward.imag)

        // Check recovery
        expect(recovered.real[0]).toBeCloseTo(inputReal[0], 4)
        expect(recovered.real[7]).toBeCloseTo(inputReal[7], 4)
        expect(recovered.imag[0]).toBeCloseTo(inputImag[0], 4)
        expect(recovered.real[63]).toBeCloseTo(inputReal[63], 4)
      })
    })

    describe('different sizes', () => {
      it('should work with size 8', async () => {
        const fft = new FFT3D(8)
        await fft.initialize()

        const inputReal = new Float32Array(512)
        const inputImag = new Float32Array(512)
        inputReal[0] = 1.0

        const result = await fft.forward(inputReal, inputImag)
        expect(result.real.length).toBe(512)
      })

      it('should work with size 16', async () => {
        const fft = new FFT3D(16)
        await fft.initialize()

        const inputReal = new Float32Array(4096)
        const inputImag = new Float32Array(4096)
        inputReal[0] = 1.0

        const result = await fft.forward(inputReal, inputImag)
        expect(result.real.length).toBe(4096)
      })

      // Note: size 32 test skipped in unit tests due to performance
      // it's covered by integration tests
    })
  })

  describe('createFFT', () => {
    it('should create and initialize FFT', async () => {
      const fft = await createFFT({ size: 8 })
      expect(fft.getSize()).toBe(8)
    })
  })

  describe('forwardFFT helper', () => {
    it('should perform forward FFT', async () => {
      const inputReal = new Float32Array(512).fill(0)
      const inputImag = new Float32Array(512).fill(0)
      inputReal[0] = 1.0

      const result = await forwardFFT(inputReal, inputImag, 8)

      expect(result.real.length).toBe(512)
      expect(typeof result.energy).toBe('number')
    })
  })

  describe('inverseFFT helper', () => {
    it('should perform inverse FFT', async () => {
      const inputReal = new Float32Array(512).fill(1.0)
      const inputImag = new Float32Array(512).fill(0)

      const result = await inverseFFT(inputReal, inputImag, 8)

      expect(result.real.length).toBe(512)
    })

    it('should roundtrip with forwardFFT', async () => {
      const inputReal = new Float32Array(512)
      const inputImag = new Float32Array(512)
      inputReal[0] = 1.0

      const forward = await forwardFFT(inputReal, inputImag, 8)
      const recovered = await inverseFFT(forward.real, forward.imag, 8)

      expect(recovered.real[0]).toBeCloseTo(1.0, 4)
    })
  })

  describe('FFT mathematical correctness', () => {
    let fft: FFT3D

    beforeEach(async () => {
      fft = new FFT3D(8)
      await fft.initialize()
    })

    it('should be linear (additivity)', async () => {
      const totalSize = 512

      // Create two inputs
      const a_real = new Float32Array(totalSize)
      const a_imag = new Float32Array(totalSize)
      const b_real = new Float32Array(totalSize)
      const b_imag = new Float32Array(totalSize)

      a_real[0] = 1.0
      b_real[7] = 2.0

      // FFT(a + b) should equal FFT(a) + FFT(b)
      const sum_real = new Float32Array(totalSize)
      const sum_imag = new Float32Array(totalSize)
      for (let i = 0; i < totalSize; i++) {
        sum_real[i] = a_real[i] + b_real[i]
        sum_imag[i] = a_imag[i] + b_imag[i]
      }

      const fft_a = await fft.forward(a_real, a_imag)
      const fft_b = await fft.forward(b_real, b_imag)
      const fft_sum = await fft.forward(sum_real, sum_imag)

      // Check linearity
      for (let i = 0; i < totalSize; i++) {
        const expected_real = fft_a.real[i] + fft_b.real[i]
        const expected_imag = fft_a.imag[i] + fft_b.imag[i]
        expect(fft_sum.real[i]).toBeCloseTo(expected_real, 4)
        expect(fft_sum.imag[i]).toBeCloseTo(expected_imag, 4)
      }
    })

    it('should satisfy conjugate symmetry for real input', async () => {
      const size = 8
      const totalSize = 512

      // Real-only input
      const inputReal = new Float32Array(totalSize)
      const inputImag = new Float32Array(totalSize)

      // Set some random real values
      for (let i = 0; i < totalSize; i++) {
        inputReal[i] = Math.random()
      }

      const result = await fft.forward(inputReal, inputImag)

      // For real input, F(-k) = F(k)* (conjugate)
      // Check a few pairs
      const getIndex = (x: number, y: number, z: number) => {
        const wx = ((x % size) + size) % size
        const wy = ((y % size) + size) % size
        const wz = ((z % size) + size) % size
        return wz * size * size + wy * size + wx
      }

      // Check conjugate symmetry for (1,0,0) and (-1,0,0) = (7,0,0)
      const idx1 = getIndex(1, 0, 0)
      const idx_1 = getIndex(-1, 0, 0)

      expect(result.real[idx1]).toBeCloseTo(result.real[idx_1], 3)
      expect(result.imag[idx1]).toBeCloseTo(-result.imag[idx_1], 3)
    })
  })

  describe('Performance characteristics', () => {
    it('should complete 8x8x8 FFT in reasonable time', async () => {
      const fft = new FFT3D(8)
      await fft.initialize()

      const inputReal = new Float32Array(512)
      const inputImag = new Float32Array(512)
      inputReal[0] = 1.0

      const start = performance.now()
      await fft.forward(inputReal, inputImag)
      const elapsed = performance.now() - start

      // Should complete in under 100ms (generous for JS fallback)
      expect(elapsed).toBeLessThan(100)
    })

    it('should complete 16x16x16 FFT in reasonable time', async () => {
      const fft = new FFT3D(16)
      await fft.initialize()

      const inputReal = new Float32Array(4096)
      const inputImag = new Float32Array(4096)
      inputReal[0] = 1.0

      const start = performance.now()
      await fft.forward(inputReal, inputImag)
      const elapsed = performance.now() - start

      // Should complete in under 500ms (generous for JS fallback)
      expect(elapsed).toBeLessThan(500)
    })
  })
})
