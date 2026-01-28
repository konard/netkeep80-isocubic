import { describe, it, expect } from 'vitest'
import { vertexShader, fragmentShader, defaultUniforms } from './parametric-cube'

describe('Parametric Cube Shader Module', () => {
  describe('vertexShader', () => {
    it('should be a non-empty string', () => {
      expect(typeof vertexShader).toBe('string')
      expect(vertexShader.length).toBeGreaterThan(0)
    })

    it('should declare required varying variables', () => {
      expect(vertexShader).toContain('varying vec3 vPosition')
      expect(vertexShader).toContain('varying vec3 vNormal')
      expect(vertexShader).toContain('varying vec3 vWorldPosition')
    })

    it('should have main function', () => {
      expect(vertexShader).toContain('void main()')
    })

    it('should output gl_Position', () => {
      expect(vertexShader).toContain('gl_Position')
    })

    it('should use Three.js built-in uniforms', () => {
      expect(vertexShader).toContain('position')
      expect(vertexShader).toContain('normal')
      expect(vertexShader).toContain('projectionMatrix')
      expect(vertexShader).toContain('modelViewMatrix')
    })
  })

  describe('fragmentShader', () => {
    it('should be a non-empty string', () => {
      expect(typeof fragmentShader).toBe('string')
      expect(fragmentShader.length).toBeGreaterThan(0)
    })

    it('should declare matching varying variables', () => {
      expect(fragmentShader).toContain('varying vec3 vPosition')
      expect(fragmentShader).toContain('varying vec3 vNormal')
      expect(fragmentShader).toContain('varying vec3 vWorldPosition')
    })

    it('should declare base material uniforms', () => {
      expect(fragmentShader).toContain('uniform vec3 uBaseColor')
      expect(fragmentShader).toContain('uniform float uRoughness')
      expect(fragmentShader).toContain('uniform float uTransparency')
    })

    it('should declare gradient uniforms', () => {
      expect(fragmentShader).toContain('uniform int uGradientCount')
      expect(fragmentShader).toContain('uniform int uGradientAxis[4]')
      expect(fragmentShader).toContain('uniform float uGradientFactor[4]')
      expect(fragmentShader).toContain('uniform vec3 uGradientColorShift[4]')
    })

    it('should declare noise uniforms', () => {
      expect(fragmentShader).toContain('uniform int uNoiseType')
      expect(fragmentShader).toContain('uniform float uNoiseScale')
      expect(fragmentShader).toContain('uniform int uNoiseOctaves')
      expect(fragmentShader).toContain('uniform float uNoisePersistence')
      expect(fragmentShader).toContain('uniform float uNoiseMaskStart')
      expect(fragmentShader).toContain('uniform float uNoiseMaskEnd')
      expect(fragmentShader).toContain('uniform int uNoiseMaskAxis')
    })

    it('should declare lighting uniforms', () => {
      expect(fragmentShader).toContain('uniform vec3 uLightDirection')
      expect(fragmentShader).toContain('uniform vec3 uLightColor')
      expect(fragmentShader).toContain('uniform float uAmbientIntensity')
    })

    it('should have main function', () => {
      expect(fragmentShader).toContain('void main()')
    })

    it('should output gl_FragColor', () => {
      expect(fragmentShader).toContain('gl_FragColor')
    })

    it('should implement hash function for noise', () => {
      expect(fragmentShader).toContain('vec3 hash3(vec3 p)')
    })

    it('should implement gradient noise function', () => {
      expect(fragmentShader).toContain('float gradientNoise(vec3 p)')
    })

    it('should implement fBm function', () => {
      expect(fragmentShader).toContain('float fbm(vec3 p, int octaves, float persistence)')
    })

    it('should implement worley noise function', () => {
      expect(fragmentShader).toContain('float worleyNoise(vec3 p)')
    })

    it('should implement crackle noise function', () => {
      expect(fragmentShader).toContain('float crackleNoise(vec3 p)')
    })

    it('should implement computeNoise function', () => {
      expect(fragmentShader).toContain(
        'float computeNoise(vec3 p, int noiseType, int octaves, float persistence)'
      )
    })

    it('should implement getGradientFactor function', () => {
      expect(fragmentShader).toContain('float getGradientFactor(vec3 pos, int axis)')
    })

    it('should handle all gradient axes in getGradientFactor', () => {
      // Check that all axis cases are handled
      expect(fragmentShader).toContain('axis == 0') // X
      expect(fragmentShader).toContain('axis == 1') // Y
      expect(fragmentShader).toContain('axis == 2') // Z
      // Radial is the else case
    })

    it('should handle all noise types in computeNoise', () => {
      expect(fragmentShader).toContain('noiseType == 1') // Perlin
      expect(fragmentShader).toContain('noiseType == 2') // Worley
      expect(fragmentShader).toContain('noiseType == 3') // Crackle
    })

    it('should clamp final color output', () => {
      expect(fragmentShader).toContain('clamp(finalColor, 0.0, 1.0)')
    })
  })

  describe('defaultUniforms', () => {
    it('should have uBaseColor with default gray', () => {
      expect(defaultUniforms.uBaseColor.value).toEqual([0.5, 0.5, 0.5])
    })

    it('should have uRoughness with default 0.5', () => {
      expect(defaultUniforms.uRoughness.value).toBe(0.5)
    })

    it('should have uTransparency with default 1.0', () => {
      expect(defaultUniforms.uTransparency.value).toBe(1.0)
    })

    it('should have uGradientCount with default 0', () => {
      expect(defaultUniforms.uGradientCount.value).toBe(0)
    })

    it('should have uGradientAxis as array of 4 zeros', () => {
      expect(defaultUniforms.uGradientAxis.value).toEqual([0, 0, 0, 0])
    })

    it('should have uGradientFactor as array of 4 zeros', () => {
      expect(defaultUniforms.uGradientFactor.value).toEqual([0, 0, 0, 0])
    })

    it('should have uGradientColorShift as 4 zero vectors', () => {
      expect(defaultUniforms.uGradientColorShift.value).toHaveLength(4)
      defaultUniforms.uGradientColorShift.value.forEach((shift) => {
        expect(shift).toEqual([0, 0, 0])
      })
    })

    it('should have uNoiseType with default 0 (none)', () => {
      expect(defaultUniforms.uNoiseType.value).toBe(0)
    })

    it('should have uNoiseScale with default 8.0', () => {
      expect(defaultUniforms.uNoiseScale.value).toBe(8.0)
    })

    it('should have uNoiseOctaves with default 4', () => {
      expect(defaultUniforms.uNoiseOctaves.value).toBe(4)
    })

    it('should have uNoisePersistence with default 0.5', () => {
      expect(defaultUniforms.uNoisePersistence.value).toBe(0.5)
    })

    it('should have uNoiseMaskStart with default 0.0', () => {
      expect(defaultUniforms.uNoiseMaskStart.value).toBe(0.0)
    })

    it('should have uNoiseMaskEnd with default 1.0', () => {
      expect(defaultUniforms.uNoiseMaskEnd.value).toBe(1.0)
    })

    it('should have uNoiseMaskAxis with default 0 (Y)', () => {
      expect(defaultUniforms.uNoiseMaskAxis.value).toBe(0)
    })

    it('should have uLightDirection with default [1,1,1]', () => {
      expect(defaultUniforms.uLightDirection.value).toEqual([1, 1, 1])
    })

    it('should have uLightColor with default white', () => {
      expect(defaultUniforms.uLightColor.value).toEqual([1, 1, 1])
    })

    it('should have uAmbientIntensity with default 0.3', () => {
      expect(defaultUniforms.uAmbientIntensity.value).toBe(0.3)
    })
  })
})

describe('Shader GLSL Syntax', () => {
  // Basic syntax checks to ensure GLSL code is well-formed

  describe('vertexShader syntax', () => {
    it('should have balanced braces', () => {
      const openBraces = (vertexShader.match(/{/g) || []).length
      const closeBraces = (vertexShader.match(/}/g) || []).length
      expect(openBraces).toBe(closeBraces)
    })

    it('should have balanced parentheses', () => {
      const openParens = (vertexShader.match(/\(/g) || []).length
      const closeParens = (vertexShader.match(/\)/g) || []).length
      expect(openParens).toBe(closeParens)
    })
  })

  describe('fragmentShader syntax', () => {
    it('should have balanced braces', () => {
      const openBraces = (fragmentShader.match(/{/g) || []).length
      const closeBraces = (fragmentShader.match(/}/g) || []).length
      expect(openBraces).toBe(closeBraces)
    })

    it('should have balanced parentheses', () => {
      const openParens = (fragmentShader.match(/\(/g) || []).length
      const closeParens = (fragmentShader.match(/\)/g) || []).length
      expect(openParens).toBe(closeParens)
    })

    it('should have balanced brackets', () => {
      const openBrackets = (fragmentShader.match(/\[/g) || []).length
      const closeBrackets = (fragmentShader.match(/\]/g) || []).length
      expect(openBrackets).toBe(closeBrackets)
    })
  })
})
