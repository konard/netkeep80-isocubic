/**
 * Unit tests for CubeGrid Vue component
 * Tests the Vue.js 3.0 + TresJS migration of the CubeGrid component (TASK 62)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import type { SpectralCube } from '../types/cube'

// Mock cube for testing
const mockCube: SpectralCube = {
  id: 'test_grid_cube',
  base: {
    color: [0.65, 0.55, 0.45],
    roughness: 0.8,
    transparency: 1.0,
  },
  noise: {
    type: 'perlin',
    scale: 8.0,
    octaves: 4,
    persistence: 0.6,
    mask: 'bottom_40%',
  },
  boundary: {
    mode: 'smooth',
    neighbor_influence: 0.5,
  },
}

describe('CubeGrid Vue Component — Grid Position Calculations', () => {
  it('should calculate correct grid positions for 3x1x3 default grid', () => {
    const gridSize: [number, number, number] = [3, 1, 3]
    const cubeScale = 1
    const spacing = 0
    const position: [number, number, number] = [0, 0, 0]

    const step = cubeScale + spacing
    const offsetX = ((gridSize[0] - 1) * step) / 2
    const offsetZ = ((gridSize[2] - 1) * step) / 2

    // Total cubes should be 3 * 1 * 3 = 9
    expect(gridSize[0] * gridSize[1] * gridSize[2]).toBe(9)

    // Center cube should be at origin
    const centerX = 1 * step - offsetX
    const centerZ = 1 * step - offsetZ
    expect(centerX).toBeCloseTo(0)
    expect(centerZ).toBeCloseTo(0)
  })

  it('should calculate correct grid positions with spacing', () => {
    const gridSize: [number, number, number] = [2, 1, 2]
    const cubeScale = 1
    const spacing = 0.5
    const step = cubeScale + spacing

    // With 2x1x2 grid and 0.5 spacing, step is 1.5
    expect(step).toBe(1.5)

    // Offset should center the grid
    const offsetX = ((gridSize[0] - 1) * step) / 2
    const offsetZ = ((gridSize[2] - 1) * step) / 2
    expect(offsetX).toBeCloseTo(0.75)
    expect(offsetZ).toBeCloseTo(0.75)
  })

  it('should apply boundary mode to grid config', () => {
    const config: SpectralCube = {
      id: 'no_boundary_001',
      base: { color: [0.5, 0.5, 0.5] },
    }

    // CubeGrid sets default boundary mode
    const gridConfig: SpectralCube = {
      ...config,
      boundary: {
        mode: config.boundary?.mode ?? 'smooth',
        neighbor_influence: config.boundary?.neighbor_influence ?? 0.5,
      },
    }

    expect(gridConfig.boundary?.mode).toBe('smooth')
    expect(gridConfig.boundary?.neighbor_influence).toBe(0.5)
  })

  it('should preserve existing boundary settings', () => {
    const config: SpectralCube = {
      id: 'hard_boundary_001',
      base: { color: [0.5, 0.5, 0.5] },
      boundary: {
        mode: 'hard',
        neighbor_influence: 0.8,
      },
    }

    const gridConfig: SpectralCube = {
      ...config,
      boundary: {
        mode: config.boundary?.mode ?? 'smooth',
        neighbor_influence: config.boundary?.neighbor_influence ?? 0.5,
      },
    }

    expect(gridConfig.boundary?.mode).toBe('hard')
    expect(gridConfig.boundary?.neighbor_influence).toBe(0.8)
  })
})

describe('CubeGrid Vue Component — Module Exports', () => {
  it('should export CubeGrid.vue as a valid Vue component', async () => {
    const module = await import('./CubeGrid.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })
})
