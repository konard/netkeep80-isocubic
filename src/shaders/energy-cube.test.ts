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
} from './energy-cube'

describe('Energy Cube Shader Module', () => {
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

    it('should calculate 3D UV coordinates', () => {
      expect(vertexShader).toContain('vUV3D = position + 0.5')
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
      expect(fragmentShader).toContain('varying vec3 vGlobalPosition')
      expect(fragmentShader).toContain('varying vec3 vUV3D')
    })

    it('should declare animation uniforms', () => {
      expect(fragmentShader).toContain('uniform float uTime')
      expect(fragmentShader).toContain('uniform float uEnergyScale')
      expect(fragmentShader).toContain('uniform float uGlowIntensity')
    })

    it('should declare DC component uniforms', () => {
      expect(fragmentShader).toContain('uniform vec4 uDCAmplitude')
      expect(fragmentShader).toContain('uniform vec4 uDCPhase')
    })

    it('should declare coefficient count uniforms', () => {
      expect(fragmentShader).toContain('uniform int uCoeffCountR')
      expect(fragmentShader).toContain('uniform int uCoeffCountG')
      expect(fragmentShader).toContain('uniform int uCoeffCountB')
      expect(fragmentShader).toContain('uniform int uCoeffCountA')
    })

    it('should declare FFT coefficient uniforms for all channels', () => {
      expect(fragmentShader).toContain('uniform vec4 uCoeffR[8]')
      expect(fragmentShader).toContain('uniform float uCoeffRFreqZ[8]')
      expect(fragmentShader).toContain('uniform vec4 uCoeffG[8]')
      expect(fragmentShader).toContain('uniform float uCoeffGFreqZ[8]')
      expect(fragmentShader).toContain('uniform vec4 uCoeffB[8]')
      expect(fragmentShader).toContain('uniform float uCoeffBFreqZ[8]')
      expect(fragmentShader).toContain('uniform vec4 uCoeffA[8]')
      expect(fragmentShader).toContain('uniform float uCoeffAFreqZ[8]')
    })

    it('should declare energy physics uniforms', () => {
      expect(fragmentShader).toContain('uniform float uEnergyCapacity')
      expect(fragmentShader).toContain('uniform float uCoherenceLoss')
      expect(fragmentShader).toContain('uniform float uFractureThreshold')
    })

    it('should declare visualization mode uniforms', () => {
      expect(fragmentShader).toContain('uniform int uVisualizationMode')
      expect(fragmentShader).toContain('uniform int uChannelMask')
    })

    it('should declare lighting uniforms', () => {
      expect(fragmentShader).toContain('uniform vec3 uLightDirection')
      expect(fragmentShader).toContain('uniform vec3 uLightColor')
      expect(fragmentShader).toContain('uniform float uAmbientIntensity')
    })

    it('should declare boundary stitching uniforms', () => {
      expect(fragmentShader).toContain('uniform int uBoundaryMode')
      expect(fragmentShader).toContain('uniform float uNeighborInfluence')
      expect(fragmentShader).toContain('uniform vec3 uGridPosition')
    })

    it('should have main function', () => {
      expect(fragmentShader).toContain('void main()')
    })

    it('should output gl_FragColor', () => {
      expect(fragmentShader).toContain('gl_FragColor')
    })

    it('should implement wave function reconstruction', () => {
      expect(fragmentShader).toContain('reconstructWaveFunction')
      expect(fragmentShader).toContain('vec2 psi')
    })

    it('should implement energy density calculation', () => {
      expect(fragmentShader).toContain('calculateEnergyDensity')
      expect(fragmentShader).toContain('dot(psi, psi)')
    })

    it('should implement glow effect', () => {
      expect(fragmentShader).toContain('applyGlow')
      expect(fragmentShader).toContain('glowFactor')
    })

    it('should implement fracture visualization', () => {
      expect(fragmentShader).toContain('calculateFracturePattern')
      expect(fragmentShader).toContain('uFractureThreshold')
    })

    it('should implement color mapping', () => {
      expect(fragmentShader).toContain('mapEnergyToColor')
      expect(fragmentShader).toContain('channelMask')
    })

    it('should handle all visualization modes', () => {
      expect(fragmentShader).toContain('uVisualizationMode == 0') // energy
      expect(fragmentShader).toContain('uVisualizationMode == 1') // amplitude
      // phase is the else case
    })

    it('should handle boundary modes', () => {
      expect(fragmentShader).toContain('uBoundaryMode == 0')
      expect(fragmentShader).toContain('uBoundaryMode == 1')
      // hard is the else case
    })

    it('should include HDR tone mapping', () => {
      expect(fragmentShader).toContain('finalColor / (1.0 + finalColor)')
    })

    it('should define PI constants', () => {
      expect(fragmentShader).toContain('const float PI')
      expect(fragmentShader).toContain('const float TWO_PI')
    })
  })

  describe('defaultUniforms', () => {
    it('should have uTime with default 0.0', () => {
      expect(defaultUniforms.uTime.value).toBe(0.0)
    })

    it('should have uEnergyScale with default 1.0', () => {
      expect(defaultUniforms.uEnergyScale.value).toBe(1.0)
    })

    it('should have uGlowIntensity with default 0.5', () => {
      expect(defaultUniforms.uGlowIntensity.value).toBe(0.5)
    })

    it('should have uDCAmplitude with sensible defaults', () => {
      expect(defaultUniforms.uDCAmplitude.value).toEqual([0.5, 0.5, 0.5, 1.0])
    })

    it('should have uDCPhase with all zeros', () => {
      expect(defaultUniforms.uDCPhase.value).toEqual([0.0, 0.0, 0.0, 0.0])
    })

    it('should have coefficient counts default to 0', () => {
      expect(defaultUniforms.uCoeffCountR.value).toBe(0)
      expect(defaultUniforms.uCoeffCountG.value).toBe(0)
      expect(defaultUniforms.uCoeffCountB.value).toBe(0)
      expect(defaultUniforms.uCoeffCountA.value).toBe(0)
    })

    it('should have coefficient arrays with 8 elements each', () => {
      expect(defaultUniforms.uCoeffR.value).toHaveLength(8)
      expect(defaultUniforms.uCoeffG.value).toHaveLength(8)
      expect(defaultUniforms.uCoeffB.value).toHaveLength(8)
      expect(defaultUniforms.uCoeffA.value).toHaveLength(8)
    })

    it('should have uEnergyCapacity with default 100.0', () => {
      expect(defaultUniforms.uEnergyCapacity.value).toBe(100.0)
    })

    it('should have uCoherenceLoss with default 0.0', () => {
      expect(defaultUniforms.uCoherenceLoss.value).toBe(0.0)
    })

    it('should have uFractureThreshold with default 0.0 (disabled)', () => {
      expect(defaultUniforms.uFractureThreshold.value).toBe(0.0)
    })

    it('should have uVisualizationMode with default 0 (energy)', () => {
      expect(defaultUniforms.uVisualizationMode.value).toBe(0)
    })

    it('should have uChannelMask with default 15 (RGBA)', () => {
      expect(defaultUniforms.uChannelMask.value).toBe(15)
    })

    it('should have uLightDirection with default [1,1,1]', () => {
      expect(defaultUniforms.uLightDirection.value).toEqual([1, 1, 1])
    })

    it('should have uLightColor with default white', () => {
      expect(defaultUniforms.uLightColor.value).toEqual([1, 1, 1])
    })

    it('should have uAmbientIntensity with default 0.4', () => {
      expect(defaultUniforms.uAmbientIntensity.value).toBe(0.4)
    })

    it('should have uBoundaryMode with default 1 (smooth)', () => {
      expect(defaultUniforms.uBoundaryMode.value).toBe(1)
    })

    it('should have uNeighborInfluence with default 0.5', () => {
      expect(defaultUniforms.uNeighborInfluence.value).toBe(0.5)
    })

    it('should have uGridPosition with default [0,0,0]', () => {
      expect(defaultUniforms.uGridPosition.value).toEqual([0, 0, 0])
    })
  })

  describe('visualizationModeToInt', () => {
    it('should map energy to 0', () => {
      expect(visualizationModeToInt('energy')).toBe(0)
    })

    it('should map amplitude to 1', () => {
      expect(visualizationModeToInt('amplitude')).toBe(1)
    })

    it('should map phase to 2', () => {
      expect(visualizationModeToInt('phase')).toBe(2)
    })
  })

  describe('ChannelMask', () => {
    it('should have correct bit values', () => {
      expect(ChannelMask.R).toBe(1)
      expect(ChannelMask.G).toBe(2)
      expect(ChannelMask.B).toBe(4)
      expect(ChannelMask.A).toBe(8)
    })

    it('should have correct combined values', () => {
      expect(ChannelMask.RGB).toBe(7)
      expect(ChannelMask.RGBA).toBe(15)
    })

    it('should allow custom combinations', () => {
      const RG = ChannelMask.R | ChannelMask.G
      expect(RG).toBe(3)

      const RBA = ChannelMask.R | ChannelMask.B | ChannelMask.A
      expect(RBA).toBe(13)
    })
  })

  describe('createEnergyUniforms', () => {
    it('should create uniforms from empty config', () => {
      const config: EnergyCubeConfig = {}
      const uniforms = createEnergyUniforms(config)

      expect(uniforms.uTime.value).toBe(0)
      expect(uniforms.uEnergyScale.value).toBe(1.0)
      expect(uniforms.uCoeffCountR.value).toBe(0)
      expect(uniforms.uCoeffCountG.value).toBe(0)
      expect(uniforms.uCoeffCountB.value).toBe(0)
      expect(uniforms.uCoeffCountA.value).toBe(0)
    })

    it('should apply grid position', () => {
      const config: EnergyCubeConfig = {}
      const uniforms = createEnergyUniforms(config, { gridPosition: [1, 2, 3] })

      expect(uniforms.uGridPosition.value).toEqual([1, 2, 3])
    })

    it('should apply visualization mode', () => {
      const config: EnergyCubeConfig = {}
      const uniforms = createEnergyUniforms(config, { visualizationMode: 'phase' })

      expect(uniforms.uVisualizationMode.value).toBe(2)
    })

    it('should apply channel mask', () => {
      const config: EnergyCubeConfig = {}
      const uniforms = createEnergyUniforms(config, { channelMask: ChannelMask.RGB })

      expect(uniforms.uChannelMask.value).toBe(7)
    })

    it('should apply energy scale', () => {
      const config: EnergyCubeConfig = {}
      const uniforms = createEnergyUniforms(config, { energyScale: 2.5 })

      expect(uniforms.uEnergyScale.value).toBe(2.5)
    })

    it('should apply glow intensity', () => {
      const config: EnergyCubeConfig = {}
      const uniforms = createEnergyUniforms(config, { glowIntensity: 1.5 })

      expect(uniforms.uGlowIntensity.value).toBe(1.5)
    })

    it('should process channel coefficients correctly', () => {
      const config: EnergyCubeConfig = {
        channelR: {
          dcAmplitude: 0.8,
          dcPhase: Math.PI / 4,
          coefficients: [
            { amplitude: 0.5, phase: 0, freqX: 1, freqY: 0, freqZ: 0 },
            { amplitude: 0.3, phase: Math.PI, freqX: 0, freqY: 1, freqZ: 2 },
          ],
        },
      }
      const uniforms = createEnergyUniforms(config)

      expect(uniforms.uCoeffCountR.value).toBe(2)
      expect((uniforms.uDCAmplitude.value as number[])[0]).toBe(0.8)
      expect((uniforms.uDCPhase.value as number[])[0]).toBe(Math.PI / 4)

      const coeffR = uniforms.uCoeffR.value as number[][]
      expect(coeffR[0]).toEqual([0.5, 0, 1, 0]) // amplitude, phase, freqX, freqY
      expect(coeffR[1]).toEqual([0.3, Math.PI, 0, 1])

      const freqZ = uniforms.uCoeffRFreqZ.value as number[]
      expect(freqZ[0]).toBe(0)
      expect(freqZ[1]).toBe(2)
    })

    it('should apply energy physics parameters', () => {
      const config: EnergyCubeConfig = {
        energyCapacity: 200,
        coherenceLoss: 0.05,
        fractureThreshold: 150,
      }
      const uniforms = createEnergyUniforms(config)

      expect(uniforms.uEnergyCapacity.value).toBe(200)
      expect(uniforms.uCoherenceLoss.value).toBe(0.05)
      expect(uniforms.uFractureThreshold.value).toBe(150)
    })
  })

  describe('createSimpleEnergyConfig', () => {
    it('should create config with specified base color', () => {
      const config = createSimpleEnergyConfig([0.8, 0.2, 0.5])

      expect(config.channelR?.dcAmplitude).toBe(0.8)
      expect(config.channelG?.dcAmplitude).toBe(0.2)
      expect(config.channelB?.dcAmplitude).toBe(0.5)
    })

    it('should include basic coefficients for pulsation', () => {
      const config = createSimpleEnergyConfig([1, 1, 1])

      expect(config.channelR?.coefficients.length).toBeGreaterThan(0)
      expect(config.channelG?.coefficients.length).toBeGreaterThan(0)
      expect(config.channelB?.coefficients.length).toBeGreaterThan(0)
    })

    it('should have alpha channel at full opacity', () => {
      const config = createSimpleEnergyConfig([1, 1, 1])

      expect(config.channelA?.dcAmplitude).toBe(1.0)
    })

    it('should have reasonable energy capacity', () => {
      const config = createSimpleEnergyConfig([1, 1, 1])

      expect(config.energyCapacity).toBeGreaterThan(0)
    })
  })

  describe('createMagicCrystalConfig', () => {
    it('should create config with blue-dominant color', () => {
      const config = createMagicCrystalConfig()

      expect(config.channelB?.dcAmplitude).toBeGreaterThan(config.channelR?.dcAmplitude ?? 0)
      expect(config.channelB?.dcAmplitude).toBeGreaterThan(config.channelG?.dcAmplitude ?? 0)
    })

    it('should have multiple coefficients for complex patterns', () => {
      const config = createMagicCrystalConfig()

      expect((config.channelR?.coefficients.length ?? 0) >= 2).toBe(true)
      expect((config.channelB?.coefficients.length ?? 0) >= 2).toBe(true)
    })

    it('should have high energy capacity', () => {
      const config = createMagicCrystalConfig()

      expect(config.energyCapacity).toBeGreaterThan(100)
    })

    it('should have fracture threshold set', () => {
      const config = createMagicCrystalConfig()

      expect(config.fractureThreshold).toBeGreaterThan(0)
    })

    it('should have slight coherence loss', () => {
      const config = createMagicCrystalConfig()

      expect(config.coherenceLoss).toBeGreaterThan(0)
      expect(config.coherenceLoss).toBeLessThan(0.1)
    })
  })

  describe('createUnstableCoreConfig', () => {
    it('should create config with red-dominant color', () => {
      const config = createUnstableCoreConfig()

      expect(config.channelR?.dcAmplitude).toBeGreaterThan(config.channelG?.dcAmplitude ?? 0)
      expect(config.channelR?.dcAmplitude).toBeGreaterThan(config.channelB?.dcAmplitude ?? 0)
    })

    it('should have many coefficients for chaotic patterns', () => {
      const config = createUnstableCoreConfig()

      expect((config.channelR?.coefficients.length ?? 0) >= 3).toBe(true)
    })

    it('should have high coherence loss', () => {
      const config = createUnstableCoreConfig()

      expect(config.coherenceLoss).toBeGreaterThan(0.03)
    })

    it('should have fracture threshold near energy capacity', () => {
      const config = createUnstableCoreConfig()

      expect(config.fractureThreshold).toBeLessThan(config.energyCapacity ?? 100)
      expect(config.fractureThreshold).toBeGreaterThan((config.energyCapacity ?? 100) * 0.5)
    })
  })
})

describe('Shader GLSL Syntax', () => {
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
