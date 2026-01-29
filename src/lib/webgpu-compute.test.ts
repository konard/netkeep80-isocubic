import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  WebGPUCompute,
  checkWebGPUSupport,
  getWebGPUCompute,
  initWebGPUCompute,
  getPreferredComputeMethod,
  getWebGPUComputeVersion,
} from './webgpu-compute'
import type { WebGPUSupport, NoiseParams, NoiseResult, BenchmarkResult } from './webgpu-compute'

describe('WebGPU Compute Module', () => {
  describe('getWebGPUComputeVersion', () => {
    it('should return version string', () => {
      const version = getWebGPUComputeVersion()
      expect(version).toBe('0.1.0')
    })
  })

  describe('checkWebGPUSupport', () => {
    it('should return a WebGPUSupport object', async () => {
      const support = await checkWebGPUSupport()
      expect(typeof support.supported).toBe('boolean')
      if (!support.supported) {
        expect(typeof support.error).toBe('string')
      }
    })

    it('should detect missing WebGPU API', async () => {
      // In Node.js/vitest environment, WebGPU is typically not available
      const support = await checkWebGPUSupport()
      // Either it's supported (real browser) or has an error message
      expect(support).toMatchObject({
        supported: expect.any(Boolean),
      })
    })
  })

  describe('getPreferredComputeMethod', () => {
    it('should return a valid compute method', async () => {
      const method = await getPreferredComputeMethod()
      expect(['webgpu', 'wasm', 'javascript']).toContain(method)
    })
  })

  describe('WebGPUCompute class', () => {
    let compute: WebGPUCompute

    beforeEach(() => {
      compute = new WebGPUCompute()
    })

    afterEach(() => {
      compute.destroy()
    })

    describe('initialization', () => {
      it('should initialize without error', async () => {
        await expect(compute.initialize()).resolves.not.toThrow()
      })

      it('should be idempotent', async () => {
        await compute.initialize()
        await compute.initialize()
        await compute.initialize()
        // Should not throw
      })

      it('should return boolean indicating support', async () => {
        const result = await compute.initialize()
        expect(typeof result).toBe('boolean')
      })
    })

    describe('isSupported', () => {
      it('should return false before initialization', () => {
        expect(compute.isSupported()).toBe(false)
      })

      it('should return boolean after initialization', async () => {
        await compute.initialize()
        expect(typeof compute.isSupported()).toBe('boolean')
      })
    })

    describe('computeNoise', () => {
      const defaultParams: NoiseParams = {
        type: 'perlin',
        size: 8,
        scale: 8.0,
        octaves: 4,
        persistence: 0.5,
      }

      beforeEach(async () => {
        await compute.initialize()
      })

      it('should compute Perlin noise', async () => {
        const result = await compute.computeNoise({
          ...defaultParams,
          type: 'perlin',
        })

        expect(result.data).toBeInstanceOf(Float32Array)
        expect(result.size).toBe(8)
        expect(result.totalSize).toBe(512) // 8³
        expect(result.data.length).toBe(512)
        expect(['webgpu', 'wasm', 'javascript']).toContain(result.method)
        expect(typeof result.computeTime).toBe('number')
        expect(result.computeTime).toBeGreaterThan(0)
      })

      it('should compute Worley noise', async () => {
        const result = await compute.computeNoise({
          ...defaultParams,
          type: 'worley',
        })

        expect(result.data).toBeInstanceOf(Float32Array)
        expect(result.totalSize).toBe(512)
        expect(['webgpu', 'wasm', 'javascript']).toContain(result.method)
      })

      it('should compute Crackle noise', async () => {
        const result = await compute.computeNoise({
          ...defaultParams,
          type: 'crackle',
        })

        expect(result.data).toBeInstanceOf(Float32Array)
        expect(result.totalSize).toBe(512)
        expect(['webgpu', 'wasm', 'javascript']).toContain(result.method)
      })

      it('should support size 8', async () => {
        const result = await compute.computeNoise({
          ...defaultParams,
          size: 8,
        })

        expect(result.size).toBe(8)
        expect(result.totalSize).toBe(512)
      })

      it('should support size 16', async () => {
        const result = await compute.computeNoise({
          ...defaultParams,
          size: 16,
        })

        expect(result.size).toBe(16)
        expect(result.totalSize).toBe(4096)
      })

      it('should support size 32', async () => {
        const result = await compute.computeNoise({
          ...defaultParams,
          size: 32,
        })

        expect(result.size).toBe(32)
        expect(result.totalSize).toBe(32768)
      })

      it('should produce values in valid range for Perlin noise', async () => {
        const result = await compute.computeNoise({
          ...defaultParams,
          type: 'perlin',
        })

        // Perlin noise should be normalized to [0, 1]
        for (let i = 0; i < result.data.length; i++) {
          expect(result.data[i]).toBeGreaterThanOrEqual(0)
          expect(result.data[i]).toBeLessThanOrEqual(1)
        }
      })

      it('should produce values in valid range for Worley noise', async () => {
        const result = await compute.computeNoise({
          ...defaultParams,
          type: 'worley',
        })

        // Worley noise produces distance values, typically in [0, ~1.7]
        for (let i = 0; i < result.data.length; i++) {
          expect(result.data[i]).toBeGreaterThanOrEqual(0)
          expect(result.data[i]).toBeLessThanOrEqual(2) // Allow some margin
        }
      })

      it('should produce values in valid range for Crackle noise', async () => {
        const result = await compute.computeNoise({
          ...defaultParams,
          type: 'crackle',
        })

        // Crackle noise (F2 - F1) produces values typically in [0, ~1]
        for (let i = 0; i < result.data.length; i++) {
          expect(result.data[i]).toBeGreaterThanOrEqual(0)
          expect(result.data[i]).toBeLessThanOrEqual(2) // Allow some margin
        }
      })

      it('should respect seed parameter for reproducibility', async () => {
        const params1: NoiseParams = {
          ...defaultParams,
          seed: 12345,
        }

        const result1 = await compute.computeNoise(params1)
        const result2 = await compute.computeNoise(params1)

        // Same seed should produce same output
        for (let i = 0; i < result1.data.length; i++) {
          expect(result1.data[i]).toBeCloseTo(result2.data[i], 5)
        }
      })

      it('should produce different results with different seeds', async () => {
        const result1 = await compute.computeNoise({
          ...defaultParams,
          seed: 12345,
        })

        const result2 = await compute.computeNoise({
          ...defaultParams,
          seed: 54321,
        })

        // Different seeds should produce different output
        let differences = 0
        for (let i = 0; i < result1.data.length; i++) {
          if (Math.abs(result1.data[i] - result2.data[i]) > 0.01) {
            differences++
          }
        }
        expect(differences).toBeGreaterThan(result1.data.length * 0.5)
      })

      it('should respond to scale parameter', async () => {
        const smallScale = await compute.computeNoise({
          ...defaultParams,
          scale: 2.0,
        })

        const largeScale = await compute.computeNoise({
          ...defaultParams,
          scale: 16.0,
        })

        // Different scales should produce different patterns
        let differences = 0
        for (let i = 0; i < smallScale.data.length; i++) {
          if (Math.abs(smallScale.data[i] - largeScale.data[i]) > 0.01) {
            differences++
          }
        }
        expect(differences).toBeGreaterThan(smallScale.data.length * 0.3)
      })

      it('should respond to octaves parameter', async () => {
        const fewOctaves = await compute.computeNoise({
          ...defaultParams,
          octaves: 1,
        })

        const manyOctaves = await compute.computeNoise({
          ...defaultParams,
          octaves: 4,
        })

        // Different octave counts should produce different patterns
        let differences = 0
        for (let i = 0; i < fewOctaves.data.length; i++) {
          if (Math.abs(fewOctaves.data[i] - manyOctaves.data[i]) > 0.01) {
            differences++
          }
        }
        expect(differences).toBeGreaterThan(0)
      })
    })

    describe('computeFFT', () => {
      beforeEach(async () => {
        await compute.initialize()
      })

      it('should compute FFT for size 8', async () => {
        const size = 8
        const totalSize = size * size * size
        const inputReal = new Float32Array(totalSize)
        const inputImag = new Float32Array(totalSize)
        inputReal[0] = 1.0

        const result = await compute.computeFFT(inputReal, inputImag, 8)

        expect(result.real).toBeInstanceOf(Float32Array)
        expect(result.imag).toBeInstanceOf(Float32Array)
        expect(result.real.length).toBe(totalSize)
        expect(typeof result.energy).toBe('number')
        expect(['webgpu', 'wasm', 'javascript']).toContain(result.method)
      })

      it('should compute FFT for size 16', async () => {
        const size = 16
        const totalSize = size * size * size
        const inputReal = new Float32Array(totalSize)
        const inputImag = new Float32Array(totalSize)
        inputReal[0] = 1.0

        const result = await compute.computeFFT(inputReal, inputImag, 16)

        expect(result.real.length).toBe(totalSize)
        expect(['webgpu', 'wasm', 'javascript']).toContain(result.method)
      })
    })

    describe('runBenchmarks', () => {
      beforeEach(async () => {
        await compute.initialize()
      })

      it('should return benchmark results', async () => {
        const results = await compute.runBenchmarks(
          {
            type: 'perlin',
            size: 8,
            scale: 8,
            octaves: 2,
            persistence: 0.5,
          },
          3 // Small number of iterations for testing
        )

        expect(Array.isArray(results)).toBe(true)
        expect(results.length).toBeGreaterThan(0)

        for (const result of results) {
          expect(typeof result.method).toBe('string')
          expect(typeof result.available).toBe('boolean')
          expect(typeof result.avgTime).toBe('number')
          expect(typeof result.stdDev).toBe('number')
          expect(typeof result.iterations).toBe('number')
          expect(typeof result.opsPerSecond).toBe('number')
        }
      })

      it('should include JavaScript benchmark', async () => {
        const results = await compute.runBenchmarks(
          {
            type: 'perlin',
            size: 8,
            scale: 8,
            octaves: 2,
            persistence: 0.5,
          },
          2
        )

        const jsResult = results.find((r) => r.method === 'javascript')
        expect(jsResult).toBeDefined()
        expect(jsResult!.available).toBe(true)
        expect(jsResult!.avgTime).toBeGreaterThan(0)
      })
    })

    describe('destroy', () => {
      it('should clean up resources', async () => {
        await compute.initialize()
        compute.destroy()

        expect(compute.isSupported()).toBe(false)
      })

      it('should allow re-initialization after destroy', async () => {
        await compute.initialize()
        compute.destroy()
        await compute.initialize()

        // Should work again
        const result = await compute.computeNoise({
          type: 'perlin',
          size: 8,
          scale: 8,
          octaves: 2,
          persistence: 0.5,
        })

        expect(result.data.length).toBe(512)
      })
    })
  })

  describe('getWebGPUCompute singleton', () => {
    it('should return the same instance', () => {
      const instance1 = getWebGPUCompute()
      const instance2 = getWebGPUCompute()

      expect(instance1).toBe(instance2)
    })

    it('should return a WebGPUCompute instance', () => {
      const instance = getWebGPUCompute()
      expect(instance).toBeInstanceOf(WebGPUCompute)
    })
  })

  describe('initWebGPUCompute', () => {
    it('should return initialized instance', async () => {
      const instance = await initWebGPUCompute()
      expect(instance).toBeInstanceOf(WebGPUCompute)
    })
  })

  describe('Noise quality tests', () => {
    let compute: WebGPUCompute

    beforeEach(async () => {
      compute = new WebGPUCompute()
      await compute.initialize()
    })

    afterEach(() => {
      compute.destroy()
    })

    it('should produce non-constant Perlin noise', async () => {
      const result = await compute.computeNoise({
        type: 'perlin',
        size: 8,
        scale: 8,
        octaves: 4,
        persistence: 0.5,
      })

      // Check that not all values are the same
      const uniqueValues = new Set(result.data)
      expect(uniqueValues.size).toBeGreaterThan(10)
    })

    it('should produce non-constant Worley noise', async () => {
      const result = await compute.computeNoise({
        type: 'worley',
        size: 8,
        scale: 8,
        octaves: 1,
        persistence: 0.5,
      })

      // Check that not all values are the same
      const uniqueValues = new Set(result.data)
      expect(uniqueValues.size).toBeGreaterThan(10)
    })

    it('should produce smooth transitions in Perlin noise', async () => {
      const result = await compute.computeNoise({
        type: 'perlin',
        size: 16,
        scale: 4.0, // Lower scale = smoother
        octaves: 1,
        persistence: 0.5,
      })

      // Check adjacent values don't differ too much (smoothness test)
      let maxDiff = 0
      const size = 16
      for (let z = 0; z < size; z++) {
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size - 1; x++) {
            const idx1 = z * size * size + y * size + x
            const idx2 = z * size * size + y * size + x + 1
            const diff = Math.abs(result.data[idx1] - result.data[idx2])
            maxDiff = Math.max(maxDiff, diff)
          }
        }
      }

      // Adjacent values should be reasonably close for smooth noise
      expect(maxDiff).toBeLessThan(0.5)
    })
  })

  describe('Performance tests', () => {
    let compute: WebGPUCompute

    beforeEach(async () => {
      compute = new WebGPUCompute()
      await compute.initialize()
    })

    afterEach(() => {
      compute.destroy()
    })

    it('should complete 8x8x8 Perlin noise in reasonable time', async () => {
      const start = performance.now()
      await compute.computeNoise({
        type: 'perlin',
        size: 8,
        scale: 8,
        octaves: 4,
        persistence: 0.5,
      })
      const elapsed = performance.now() - start

      // Should complete in under 200ms (generous for JS fallback)
      expect(elapsed).toBeLessThan(200)
    })

    it('should complete 16x16x16 Perlin noise in reasonable time', async () => {
      const start = performance.now()
      await compute.computeNoise({
        type: 'perlin',
        size: 16,
        scale: 8,
        octaves: 4,
        persistence: 0.5,
      })
      const elapsed = performance.now() - start

      // Should complete in under 2000ms (generous for JS fallback)
      expect(elapsed).toBeLessThan(2000)
    })

    it('should complete 8x8x8 Worley noise in reasonable time', async () => {
      const start = performance.now()
      await compute.computeNoise({
        type: 'worley',
        size: 8,
        scale: 8,
        octaves: 1,
        persistence: 0.5,
      })
      const elapsed = performance.now() - start

      // Should complete in under 500ms (generous for JS fallback, Worley is expensive)
      expect(elapsed).toBeLessThan(500)
    })
  })

  describe('Edge cases', () => {
    let compute: WebGPUCompute

    beforeEach(async () => {
      compute = new WebGPUCompute()
      await compute.initialize()
    })

    afterEach(() => {
      compute.destroy()
    })

    it('should handle zero seed', async () => {
      const result = await compute.computeNoise({
        type: 'perlin',
        size: 8,
        scale: 8,
        octaves: 2,
        persistence: 0.5,
        seed: 0,
      })

      expect(result.data.length).toBe(512)
    })

    it('should handle negative seed', async () => {
      const result = await compute.computeNoise({
        type: 'perlin',
        size: 8,
        scale: 8,
        octaves: 2,
        persistence: 0.5,
        seed: -12345,
      })

      expect(result.data.length).toBe(512)
    })

    it('should handle large seed', async () => {
      const result = await compute.computeNoise({
        type: 'perlin',
        size: 8,
        scale: 8,
        octaves: 2,
        persistence: 0.5,
        seed: 999999999,
      })

      expect(result.data.length).toBe(512)
    })

    it('should handle small scale', async () => {
      const result = await compute.computeNoise({
        type: 'perlin',
        size: 8,
        scale: 0.5,
        octaves: 2,
        persistence: 0.5,
      })

      expect(result.data.length).toBe(512)
    })

    it('should handle large scale', async () => {
      const result = await compute.computeNoise({
        type: 'perlin',
        size: 8,
        scale: 100,
        octaves: 2,
        persistence: 0.5,
      })

      expect(result.data.length).toBe(512)
    })

    it('should handle single octave', async () => {
      const result = await compute.computeNoise({
        type: 'perlin',
        size: 8,
        scale: 8,
        octaves: 1,
        persistence: 0.5,
      })

      expect(result.data.length).toBe(512)
    })

    it('should handle many octaves', async () => {
      const result = await compute.computeNoise({
        type: 'perlin',
        size: 8,
        scale: 8,
        octaves: 8,
        persistence: 0.5,
      })

      expect(result.data.length).toBe(512)
    })

    it('should handle low persistence', async () => {
      const result = await compute.computeNoise({
        type: 'perlin',
        size: 8,
        scale: 8,
        octaves: 4,
        persistence: 0.1,
      })

      expect(result.data.length).toBe(512)
    })

    it('should handle high persistence', async () => {
      const result = await compute.computeNoise({
        type: 'perlin',
        size: 8,
        scale: 8,
        octaves: 4,
        persistence: 0.9,
      })

      expect(result.data.length).toBe(512)
    })
  })

  describe('Type exports', () => {
    it('should export WebGPUSupport type', () => {
      const support: WebGPUSupport = {
        supported: true,
      }
      expect(support.supported).toBe(true)
    })

    it('should export NoiseParams type', () => {
      const params: NoiseParams = {
        type: 'perlin',
        size: 8,
        scale: 8,
        octaves: 4,
        persistence: 0.5,
      }
      expect(params.type).toBe('perlin')
    })

    it('should export NoiseResult type', () => {
      const result: NoiseResult = {
        data: new Float32Array(512),
        size: 8,
        totalSize: 512,
        method: 'javascript',
        computeTime: 10,
      }
      expect(result.method).toBe('javascript')
    })

    it('should export BenchmarkResult type', () => {
      const result: BenchmarkResult = {
        method: 'webgpu',
        available: true,
        avgTime: 5,
        stdDev: 1,
        iterations: 10,
        opsPerSecond: 200,
      }
      expect(result.method).toBe('webgpu')
    })
  })
})
