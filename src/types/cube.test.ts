import { describe, it, expect } from 'vitest'
import { validateCube, validateAndParseCube, isValidCube } from '../lib/validation'
import { createDefaultCube, type SpectralCube } from './cube'

// Import example configs
import stoneMoss from '../../examples/stone-moss.json'
import woodOak from '../../examples/wood-oak.json'
import metalRust from '../../examples/metal-rust.json'

describe('SpectralCube Schema Validation', () => {
  describe('validateCube', () => {
    it('should validate a minimal valid cube', () => {
      const minimalCube = {
        id: 'test_001',
        base: {
          color: [0.5, 0.5, 0.5],
        },
      }

      const result = validateCube(minimalCube)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate stone-moss example', () => {
      const result = validateCube(stoneMoss)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate wood-oak example', () => {
      const result = validateCube(woodOak)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate metal-rust example', () => {
      const result = validateCube(metalRust)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject cube without id', () => {
      const invalidCube = {
        base: {
          color: [0.5, 0.5, 0.5],
        },
      }

      const result = validateCube(invalidCube)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should reject cube without base', () => {
      const invalidCube = {
        id: 'test_001',
      }

      const result = validateCube(invalidCube)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should reject invalid color values', () => {
      const invalidCube = {
        id: 'test_001',
        base: {
          color: [1.5, 0.5, 0.5], // 1.5 is out of range
        },
      }

      const result = validateCube(invalidCube)
      expect(result.valid).toBe(false)
    })

    it('should reject invalid gradient axis', () => {
      const invalidCube = {
        id: 'test_001',
        base: {
          color: [0.5, 0.5, 0.5],
        },
        gradients: [
          {
            axis: 'w', // invalid axis
            factor: 0.5,
            color_shift: [0.1, 0.1, 0.1],
          },
        ],
      }

      const result = validateCube(invalidCube)
      expect(result.valid).toBe(false)
    })

    it('should reject invalid noise type', () => {
      const invalidCube = {
        id: 'test_001',
        base: {
          color: [0.5, 0.5, 0.5],
        },
        noise: {
          type: 'simplex', // not in enum
        },
      }

      const result = validateCube(invalidCube)
      expect(result.valid).toBe(false)
    })
  })

  describe('validateAndParseCube', () => {
    it('should return typed cube for valid config', () => {
      const cube = validateAndParseCube(stoneMoss)
      expect(cube.id).toBe('stone_moss_001')
      expect(cube.base.color).toEqual([0.65, 0.55, 0.45])
    })

    it('should throw error for invalid config', () => {
      const invalidCube = { id: 'test' } // missing base

      expect(() => validateAndParseCube(invalidCube)).toThrow('Invalid SpectralCube configuration')
    })
  })

  describe('isValidCube', () => {
    it('should return true for valid cube', () => {
      expect(isValidCube(stoneMoss)).toBe(true)
      expect(isValidCube(woodOak)).toBe(true)
      expect(isValidCube(metalRust)).toBe(true)
    })

    it('should return false for invalid cube', () => {
      expect(isValidCube({})).toBe(false)
      expect(isValidCube(null)).toBe(false)
      expect(isValidCube('not a cube')).toBe(false)
    })
  })

  describe('createDefaultCube', () => {
    it('should create a valid default cube', () => {
      const cube = createDefaultCube('new_cube_001')

      expect(cube.id).toBe('new_cube_001')
      expect(cube.base.color).toEqual([0.5, 0.5, 0.5])
      expect(cube.base.roughness).toBe(0.5)
      expect(cube.base.transparency).toBe(1.0)

      // Validate against schema
      const result = validateCube(cube)
      expect(result.valid).toBe(true)
    })
  })
})

describe('Example Configs Type Safety', () => {
  it('stoneMoss should match SpectralCube type', () => {
    const cube: SpectralCube = stoneMoss as SpectralCube
    expect(cube.id).toBe('stone_moss_001')
    expect(cube.prompt).toBe('каменная кладка с мхом')
    expect(cube.gradients).toHaveLength(1)
    expect(cube.physics?.material).toBe('stone')
  })

  it('woodOak should match SpectralCube type', () => {
    const cube: SpectralCube = woodOak as SpectralCube
    expect(cube.id).toBe('wood_oak_001')
    expect(cube.physics?.material).toBe('wood')
    expect(cube.physics?.break_pattern).toBe('splinter')
  })

  it('metalRust should match SpectralCube type', () => {
    const cube: SpectralCube = metalRust as SpectralCube
    expect(cube.id).toBe('metal_rust_001')
    expect(cube.physics?.material).toBe('metal')
    expect(cube.noise?.type).toBe('worley')
  })
})
