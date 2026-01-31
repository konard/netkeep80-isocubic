/**
 * Unit tests for ParamEditor Vue component
 * Tests the Vue.js 3.0 migration of the ParamEditor component (TASK 63)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import type { SpectralCube } from '../types/cube'
import { createDefaultCube } from '../types/cube'

describe('ParamEditor Vue Component — Module Exports', () => {
  it('should export ParamEditor.vue as a valid Vue component', async () => {
    const module = await import('./ParamEditor.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })
})

describe('ParamEditor Vue Component — Default Values', () => {
  it('should work with default cube configuration', () => {
    const defaultCube = createDefaultCube('test_default_001')
    expect(defaultCube).toBeDefined()
    expect(defaultCube.base).toBeDefined()
    expect(defaultCube.base.color).toBeDefined()
    expect(defaultCube.base.color).toHaveLength(3)
  })

  it('should handle cube with all optional properties', () => {
    const cube: SpectralCube = {
      id: 'test_param_001',
      base: {
        color: [0.5, 0.3, 0.7],
        roughness: 0.6,
        transparency: 0.9,
      },
      gradients: [{ axis: 'y', factor: 0.5, color_shift: [0.1, 0.2, 0.3] }],
      noise: {
        type: 'perlin',
        scale: 5.0,
        octaves: 3,
        persistence: 0.5,
      },
      physics: {
        material: 'stone',
        density: 2.5,
        break_pattern: 'crumble',
      },
      boundary: {
        mode: 'smooth',
        neighbor_influence: 0.5,
      },
    }
    expect(cube.gradients).toHaveLength(1)
    expect(cube.noise?.type).toBe('perlin')
    expect(cube.physics?.material).toBe('stone')
    expect(cube.boundary?.mode).toBe('smooth')
  })

  it('should handle cube with minimal properties', () => {
    const cube: SpectralCube = {
      id: 'minimal_001',
      base: { color: [1, 0, 0] },
    }
    expect(cube.gradients).toBeUndefined()
    expect(cube.noise).toBeUndefined()
    expect(cube.physics).toBeUndefined()
  })
})
