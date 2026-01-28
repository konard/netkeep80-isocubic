import { describe, it, expect } from 'vitest'
import { axisToInt, noiseTypeToInt, parseMask, createUniforms } from '../lib/shader-utils'
import type { SpectralCube } from '../types/cube'
import { createDefaultCube } from '../types/cube'

// Import example configs for testing
import stoneMoss from '../../examples/stone-moss.json'
import woodOak from '../../examples/wood-oak.json'
import metalRust from '../../examples/metal-rust.json'

describe('ParametricCube Utility Functions', () => {
  describe('axisToInt', () => {
    it('should convert x axis to 0', () => {
      expect(axisToInt('x')).toBe(0)
    })

    it('should convert y axis to 1', () => {
      expect(axisToInt('y')).toBe(1)
    })

    it('should convert z axis to 2', () => {
      expect(axisToInt('z')).toBe(2)
    })

    it('should convert radial to 3', () => {
      expect(axisToInt('radial')).toBe(3)
    })
  })

  describe('noiseTypeToInt', () => {
    it('should convert perlin to 1', () => {
      expect(noiseTypeToInt('perlin')).toBe(1)
    })

    it('should convert worley to 2', () => {
      expect(noiseTypeToInt('worley')).toBe(2)
    })

    it('should convert crackle to 3', () => {
      expect(noiseTypeToInt('crackle')).toBe(3)
    })

    it('should return 0 for undefined', () => {
      expect(noiseTypeToInt(undefined)).toBe(0)
    })
  })

  describe('parseMask', () => {
    it('should return full range for undefined mask', () => {
      const result = parseMask(undefined)
      expect(result.start).toBe(0)
      expect(result.end).toBe(1)
      expect(result.axis).toBe(0)
    })

    it('should parse bottom_40% correctly', () => {
      const result = parseMask('bottom_40%')
      expect(result.start).toBe(0)
      expect(result.end).toBe(0.4)
      expect(result.axis).toBe(0) // Y axis
    })

    it('should parse top_60% correctly', () => {
      const result = parseMask('top_60%')
      expect(result.start).toBe(0.4)
      expect(result.end).toBe(1)
      expect(result.axis).toBe(0) // Y axis
    })

    it('should parse left_30% correctly', () => {
      const result = parseMask('left_30%')
      expect(result.start).toBe(0)
      expect(result.end).toBe(0.3)
      expect(result.axis).toBe(1) // X axis
    })

    it('should parse right_50% correctly', () => {
      const result = parseMask('right_50%')
      expect(result.start).toBe(0.5)
      expect(result.end).toBe(1)
      expect(result.axis).toBe(1) // X axis
    })

    it('should parse front_25% correctly', () => {
      const result = parseMask('front_25%')
      expect(result.start).toBe(0)
      expect(result.end).toBe(0.25)
      expect(result.axis).toBe(2) // Z axis
    })

    it('should parse back_75% correctly', () => {
      const result = parseMask('back_75%')
      expect(result.start).toBe(0.25)
      expect(result.end).toBe(1)
      expect(result.axis).toBe(2) // Z axis
    })

    it('should return defaults for unrecognized mask', () => {
      const result = parseMask('unknown_mask')
      expect(result.start).toBe(0)
      expect(result.end).toBe(1)
      expect(result.axis).toBe(0)
    })
  })

  describe('createUniforms', () => {
    it('should create uniforms for default cube', () => {
      const cube = createDefaultCube('test_001')
      const uniforms = createUniforms(cube)

      expect(uniforms.uBaseColor).toBeDefined()
      expect(uniforms.uBaseColor.value.x).toBe(0.5)
      expect(uniforms.uBaseColor.value.y).toBe(0.5)
      expect(uniforms.uBaseColor.value.z).toBe(0.5)

      expect(uniforms.uRoughness.value).toBe(0.5)
      expect(uniforms.uTransparency.value).toBe(1.0)
      expect(uniforms.uGradientCount.value).toBe(0)
    })

    it('should create uniforms for stone-moss config', () => {
      const cube = stoneMoss as SpectralCube
      const uniforms = createUniforms(cube)

      // Check base color
      expect(uniforms.uBaseColor.value.x).toBeCloseTo(0.65)
      expect(uniforms.uBaseColor.value.y).toBeCloseTo(0.55)
      expect(uniforms.uBaseColor.value.z).toBeCloseTo(0.45)

      expect(uniforms.uRoughness.value).toBe(0.8)
      expect(uniforms.uTransparency.value).toBe(1.0)

      // Check gradient
      expect(uniforms.uGradientCount.value).toBe(1)
      expect(uniforms.uGradientAxis.value[0]).toBe(1) // Y axis
      expect(uniforms.uGradientFactor.value[0]).toBeCloseTo(0.3)

      // Check noise
      expect(uniforms.uNoiseType.value).toBe(1) // Perlin
      expect(uniforms.uNoiseScale.value).toBe(8.0)
      expect(uniforms.uNoiseOctaves.value).toBe(4)

      // Check mask (bottom_40%)
      expect(uniforms.uNoiseMaskStart.value).toBe(0)
      expect(uniforms.uNoiseMaskEnd.value).toBeCloseTo(0.4)
    })

    it('should create uniforms for wood-oak config', () => {
      const cube = woodOak as SpectralCube
      const uniforms = createUniforms(cube)

      expect(uniforms.uNoiseType.value).toBe(1) // Perlin
      expect(uniforms.uGradientCount.value).toBe(2)
    })

    it('should create uniforms for metal-rust config', () => {
      const cube = metalRust as SpectralCube
      const uniforms = createUniforms(cube)

      expect(uniforms.uNoiseType.value).toBe(2) // Worley
    })

    it('should handle cube without noise', () => {
      const cube: SpectralCube = {
        id: 'no_noise_001',
        base: {
          color: [0.5, 0.5, 0.5],
        },
      }
      const uniforms = createUniforms(cube)

      expect(uniforms.uNoiseType.value).toBe(0) // No noise
    })

    it('should handle cube without gradients', () => {
      const cube: SpectralCube = {
        id: 'no_gradient_001',
        base: {
          color: [0.5, 0.5, 0.5],
        },
      }
      const uniforms = createUniforms(cube)

      expect(uniforms.uGradientCount.value).toBe(0)
    })

    it('should limit gradients to maximum of 4', () => {
      const cube: SpectralCube = {
        id: 'many_gradients_001',
        base: {
          color: [0.5, 0.5, 0.5],
        },
        gradients: [
          { axis: 'x', factor: 0.1, color_shift: [0.1, 0, 0] },
          { axis: 'y', factor: 0.2, color_shift: [0, 0.1, 0] },
          { axis: 'z', factor: 0.3, color_shift: [0, 0, 0.1] },
          { axis: 'radial', factor: 0.4, color_shift: [0.1, 0.1, 0] },
          { axis: 'x', factor: 0.5, color_shift: [0.2, 0, 0] }, // 5th - should be ignored
        ],
      }
      const uniforms = createUniforms(cube)

      expect(uniforms.uGradientCount.value).toBe(4)
    })

    it('should handle transparency less than 1', () => {
      const cube: SpectralCube = {
        id: 'transparent_001',
        base: {
          color: [0.5, 0.5, 0.5],
          transparency: 0.5,
        },
      }
      const uniforms = createUniforms(cube)

      expect(uniforms.uTransparency.value).toBe(0.5)
    })
  })
})

describe('Shader Strings', () => {
  it('should export vertex shader string', async () => {
    const { vertexShader } = await import('../shaders/parametric-cube')
    expect(typeof vertexShader).toBe('string')
    expect(vertexShader).toContain('vPosition')
    expect(vertexShader).toContain('vNormal')
    expect(vertexShader).toContain('vWorldPosition')
    expect(vertexShader).toContain('gl_Position')
  })

  it('should export fragment shader string', async () => {
    const { fragmentShader } = await import('../shaders/parametric-cube')
    expect(typeof fragmentShader).toBe('string')
    expect(fragmentShader).toContain('uBaseColor')
    expect(fragmentShader).toContain('uGradientCount')
    expect(fragmentShader).toContain('uNoiseType')
    expect(fragmentShader).toContain('gl_FragColor')
  })

  it('vertex shader should contain required uniform references', async () => {
    const { vertexShader } = await import('../shaders/parametric-cube')
    // Vertex shader uses built-in Three.js uniforms
    expect(vertexShader).toContain('projectionMatrix')
    expect(vertexShader).toContain('modelViewMatrix')
    expect(vertexShader).toContain('normalMatrix')
    expect(vertexShader).toContain('modelMatrix')
  })

  it('fragment shader should contain noise functions', async () => {
    const { fragmentShader } = await import('../shaders/parametric-cube')
    expect(fragmentShader).toContain('gradientNoise')
    expect(fragmentShader).toContain('fbm')
    expect(fragmentShader).toContain('worleyNoise')
    expect(fragmentShader).toContain('crackleNoise')
  })

  it('fragment shader should contain gradient function', async () => {
    const { fragmentShader } = await import('../shaders/parametric-cube')
    expect(fragmentShader).toContain('getGradientFactor')
  })
})

describe('Default Uniforms', () => {
  it('should export defaultUniforms with correct structure', async () => {
    const { defaultUniforms } = await import('../shaders/parametric-cube')

    expect(defaultUniforms.uBaseColor.value).toEqual([0.5, 0.5, 0.5])
    expect(defaultUniforms.uRoughness.value).toBe(0.5)
    expect(defaultUniforms.uTransparency.value).toBe(1.0)
    expect(defaultUniforms.uGradientCount.value).toBe(0)
    expect(defaultUniforms.uNoiseType.value).toBe(0)
    expect(defaultUniforms.uNoiseScale.value).toBe(8.0)
    expect(defaultUniforms.uNoiseOctaves.value).toBe(4)
    expect(defaultUniforms.uNoisePersistence.value).toBe(0.5)
    expect(defaultUniforms.uAmbientIntensity.value).toBe(0.3)
  })
})
