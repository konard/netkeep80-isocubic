/**
 * Unit tests for EnergyCube Vue component
 * Tests the Vue.js 3.0 + TresJS migration of the EnergyCube component (TASK 62)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import {
  vertexShader,
  fragmentShader,
  defaultUniforms,
  createEnergyUniforms,
  createSimpleEnergyConfig,
  createMagicCrystalConfig,
  createUnstableCoreConfig,
  visualizationModeToInt,
  ChannelMask,
  type EnergyCubeConfig,
} from '../shaders/energy-cube'

describe('EnergyCube Vue Component — Shader Module', () => {
  describe('vertexShader', () => {
    it('should be a non-empty string', () => {
      expect(typeof vertexShader).toBe('string')
      expect(vertexShader.length).toBeGreaterThan(0)
    })

    it('should declare required varying variables', () => {
      expect(vertexShader).toContain('varying vec3 vPosition')
      expect(vertexShader).toContain('varying vec3 vNormal')
      expect(vertexShader).toContain('varying vec3 vWorldPosition')
      expect(vertexShader).toContain('varying vec3 vGlobalPosition')
      expect(vertexShader).toContain('varying vec3 vUV3D')
    })

    it('should declare grid position uniform for boundary stitching', () => {
      expect(vertexShader).toContain('uniform vec3 uGridPosition')
    })
  })

  describe('fragmentShader', () => {
    it('should be a non-empty string', () => {
      expect(typeof fragmentShader).toBe('string')
      expect(fragmentShader.length).toBeGreaterThan(0)
    })

    it('should declare energy-specific uniforms', () => {
      expect(fragmentShader).toContain('uTime')
      expect(fragmentShader).toContain('uVisualizationMode')
      expect(fragmentShader).toContain('uChannelMask')
      expect(fragmentShader).toContain('uEnergyScale')
      expect(fragmentShader).toContain('uGlowIntensity')
    })
  })

  describe('visualizationModeToInt', () => {
    it('should convert energy to 0', () => {
      expect(visualizationModeToInt('energy')).toBe(0)
    })

    it('should convert amplitude to 1', () => {
      expect(visualizationModeToInt('amplitude')).toBe(1)
    })

    it('should convert phase to 2', () => {
      expect(visualizationModeToInt('phase')).toBe(2)
    })
  })

  describe('ChannelMask', () => {
    it('should have correct R mask', () => {
      expect(ChannelMask.R).toBe(1)
    })

    it('should have correct RGBA mask', () => {
      expect(ChannelMask.RGBA).toBe(15)
    })
  })

  describe('createEnergyUniforms', () => {
    it('should create uniforms for simple energy config', () => {
      const config = createSimpleEnergyConfig([0.5, 0.3, 0.8])
      const uniforms = createEnergyUniforms(config)

      expect(uniforms.uTime).toBeDefined()
      expect(uniforms.uTime.value).toBe(0)
      expect(uniforms.uVisualizationMode).toBeDefined()
      expect(uniforms.uChannelMask).toBeDefined()
    })

    it('should create uniforms for magic crystal config', () => {
      const config = createMagicCrystalConfig()
      const uniforms = createEnergyUniforms(config)

      expect(uniforms.uDCAmplitude).toBeDefined()
      expect(uniforms.uEnergyScale).toBeDefined()
      expect(uniforms.uGlowIntensity).toBeDefined()
    })

    it('should create uniforms for unstable core config', () => {
      const config = createUnstableCoreConfig()
      const uniforms = createEnergyUniforms(config)

      expect(uniforms.uDCAmplitude).toBeDefined()
      expect(uniforms.uFractureThreshold).toBeDefined()
    })

    it('should respect visualization mode option', () => {
      const config = createSimpleEnergyConfig([0.5, 0.3, 0.8])
      const uniforms = createEnergyUniforms(config, {
        visualizationMode: 'amplitude',
      })

      expect(uniforms.uVisualizationMode.value).toBe(1)
    })

    it('should respect grid position option', () => {
      const config = createSimpleEnergyConfig([0.5, 0.3, 0.8])
      const uniforms = createEnergyUniforms(config, {
        gridPosition: [1, 2, 3],
      })

      expect(uniforms.uGridPosition).toBeDefined()
    })
  })
})

describe('EnergyCube Vue Component — Module Exports', () => {
  it('should export EnergyCube.vue as a valid Vue component', async () => {
    const module = await import('./EnergyCube.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })
})
