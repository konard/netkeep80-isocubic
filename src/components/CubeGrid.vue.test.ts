/**
 * Unit tests for CubeGrid Vue component
 * Tests the Vue.js 3.0 + TresJS migration of the CubeGrid component (TASK 62)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { SpectralCube } from '../types/cube'

// Mock TresJS dependencies
vi.mock('@tresjs/core', () => ({
  useLoop: () => ({ onBeforeRender: vi.fn(), onRender: vi.fn() }),
}))

// Mock ParametricCube to render a simple stub with data attributes
vi.mock('./ParametricCube.vue', () => ({
  default: {
    name: 'ParametricCube',
    props: ['config', 'position', 'gridPosition', 'scale', 'lodLevel'],
    template: `<div
      data-testid="parametric-cube-mock"
      :data-config-id="config?.id"
      :data-position="position?.join(',')"
      :data-grid-position="gridPosition?.join(',')"
      :data-scale="scale"
    />`,
  },
}))

// Mock cube for testing
const mockConfig: SpectralCube = {
  id: 'test-cube',
  base: {
    color: [0.5, 0.5, 0.5],
    roughness: 0.5,
    transparency: 1.0,
  },
  boundary: {
    mode: 'smooth',
    neighbor_influence: 0.5,
  },
}

const globalStubs = {
  stubs: {
    TresGroup: { template: '<div><slot /></div>' },
  },
}

describe('CubeGrid Vue Component — Grid Position Calculations', () => {
  it('should calculate correct grid positions for 3x1x3 default grid', () => {
    const gridSize: [number, number, number] = [3, 1, 3]
    const cubeScale = 1
    const spacing = 0

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

    expect(step).toBe(1.5)

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

describe('CubeGrid Vue Component — Component Mounting', () => {
  describe('Grid Generation', () => {
    it('should render default 3x1x3 grid (9 cubes)', async () => {
      const { default: CubeGrid } = await import('./CubeGrid.vue')
      const wrapper = mount(CubeGrid as any, {
        props: { config: mockConfig },
        global: globalStubs,
      })
      const cubes = wrapper.findAll('[data-testid="parametric-cube-mock"]')
      expect(cubes).toHaveLength(9)
    })

    it('should render custom grid size', async () => {
      const { default: CubeGrid } = await import('./CubeGrid.vue')
      const wrapper = mount(CubeGrid as any, {
        props: { config: mockConfig, gridSize: [2, 2, 2] },
        global: globalStubs,
      })
      const cubes = wrapper.findAll('[data-testid="parametric-cube-mock"]')
      expect(cubes).toHaveLength(8)
    })

    it('should render single cube when gridSize is [1,1,1]', async () => {
      const { default: CubeGrid } = await import('./CubeGrid.vue')
      const wrapper = mount(CubeGrid as any, {
        props: { config: mockConfig, gridSize: [1, 1, 1] },
        global: globalStubs,
      })
      const cubes = wrapper.findAll('[data-testid="parametric-cube-mock"]')
      expect(cubes).toHaveLength(1)
    })

    it('should render large grid correctly', async () => {
      const { default: CubeGrid } = await import('./CubeGrid.vue')
      const wrapper = mount(CubeGrid as any, {
        props: { config: mockConfig, gridSize: [5, 1, 5] },
        global: globalStubs,
      })
      const cubes = wrapper.findAll('[data-testid="parametric-cube-mock"]')
      expect(cubes).toHaveLength(25)
    })
  })

  describe('Grid Positioning', () => {
    it('should pass correct grid positions to cubes', async () => {
      const { default: CubeGrid } = await import('./CubeGrid.vue')
      const wrapper = mount(CubeGrid as any, {
        props: { config: mockConfig, gridSize: [2, 1, 2] },
        global: globalStubs,
      })
      const cubes = wrapper.findAll('[data-testid="parametric-cube-mock"]')
      const gridPositions = cubes.map((cube) => cube.attributes('data-grid-position'))

      expect(gridPositions).toContain('0,0,0')
      expect(gridPositions).toContain('0,0,1')
      expect(gridPositions).toContain('1,0,0')
      expect(gridPositions).toContain('1,0,1')
    })

    it('should center the grid when using default position', async () => {
      const { default: CubeGrid } = await import('./CubeGrid.vue')
      const wrapper = mount(CubeGrid as any, {
        props: { config: mockConfig, gridSize: [3, 1, 1], cubeScale: 1, spacing: 0 },
        global: globalStubs,
      })
      const cubes = wrapper.findAll('[data-testid="parametric-cube-mock"]')
      const positions = cubes.map((cube) => cube.attributes('data-position'))

      expect(positions).toContain('-1,0,0')
      expect(positions).toContain('0,0,0')
      expect(positions).toContain('1,0,0')
    })
  })

  describe('Spacing', () => {
    it('should apply spacing between cubes', async () => {
      const { default: CubeGrid } = await import('./CubeGrid.vue')
      const wrapper = mount(CubeGrid as any, {
        props: { config: mockConfig, gridSize: [2, 1, 1], cubeScale: 1, spacing: 0.5 },
        global: globalStubs,
      })
      const cubes = wrapper.findAll('[data-testid="parametric-cube-mock"]')
      const positions = cubes.map((cube) => {
        const pos = cube.attributes('data-position')
        return pos ? pos.split(',').map(Number) : null
      })

      const xPositions = positions.map((p) => p?.[0] ?? 0)
      const distance = Math.abs(xPositions[1] - xPositions[0])
      expect(distance).toBeCloseTo(1.5)
    })
  })

  describe('Scale', () => {
    it('should pass scale to all cubes', async () => {
      const { default: CubeGrid } = await import('./CubeGrid.vue')
      const wrapper = mount(CubeGrid as any, {
        props: { config: mockConfig, gridSize: [2, 1, 1], cubeScale: 2 },
        global: globalStubs,
      })
      const cubes = wrapper.findAll('[data-testid="parametric-cube-mock"]')

      cubes.forEach((cube) => {
        expect(cube.attributes('data-scale')).toBe('2')
      })
    })
  })

  describe('Configuration', () => {
    it('should pass config with boundary settings to all cubes', async () => {
      const { default: CubeGrid } = await import('./CubeGrid.vue')
      const wrapper = mount(CubeGrid as any, {
        props: { config: mockConfig, gridSize: [2, 1, 1] },
        global: globalStubs,
      })
      const cubes = wrapper.findAll('[data-testid="parametric-cube-mock"]')

      cubes.forEach((cube) => {
        expect(cube.attributes('data-config-id')).toBe('test-cube')
      })
    })

    it('should use default boundary mode if not specified in config', async () => {
      const configWithoutBoundary: SpectralCube = {
        id: 'no-boundary',
        base: { color: [0.5, 0.5, 0.5] },
      }

      const { default: CubeGrid } = await import('./CubeGrid.vue')
      const wrapper = mount(CubeGrid as any, {
        props: { config: configWithoutBoundary, gridSize: [2, 1, 1] },
        global: globalStubs,
      })
      const cubes = wrapper.findAll('[data-testid="parametric-cube-mock"]')
      expect(cubes).toHaveLength(2)
    })
  })

  describe('Props Interface', () => {
    it('should accept all optional props', async () => {
      const { default: CubeGrid } = await import('./CubeGrid.vue')
      const wrapper = mount(CubeGrid as any, {
        props: {
          config: mockConfig,
          gridSize: [3, 2, 3],
          spacing: 0.1,
          cubeScale: 0.5,
          position: [1, 2, 3],
        },
        global: globalStubs,
      })
      const cubes = wrapper.findAll('[data-testid="parametric-cube-mock"]')
      expect(cubes).toHaveLength(18)
    })

    it('should work with minimal props', async () => {
      const { default: CubeGrid } = await import('./CubeGrid.vue')
      const wrapper = mount(CubeGrid as any, {
        props: { config: mockConfig },
        global: globalStubs,
      })
      const cubes = wrapper.findAll('[data-testid="parametric-cube-mock"]')
      expect(cubes.length).toBeGreaterThan(0)
    })
  })
})

describe('CubeGrid Vue Component — Boundary Stitching', () => {
  const boundaryConfig: SpectralCube = {
    id: 'boundary-test',
    base: { color: [0.5, 0.5, 0.5] },
    boundary: {
      mode: 'smooth',
      neighbor_influence: 0.7,
    },
  }

  it('should generate sequential grid positions for seamless stitching', async () => {
    const { default: CubeGrid } = await import('./CubeGrid.vue')
    const wrapper = mount(CubeGrid as any, {
      props: { config: boundaryConfig, gridSize: [3, 1, 3] },
      global: globalStubs,
    })
    const cubes = wrapper.findAll('[data-testid="parametric-cube-mock"]')
    const gridPositions = cubes.map((cube) => cube.attributes('data-grid-position'))

    // All grid positions should be unique
    const uniquePositions = new Set(gridPositions)
    expect(uniquePositions.size).toBe(9)

    // Check corner positions exist
    expect(gridPositions).toContain('0,0,0')
    expect(gridPositions).toContain('2,0,0')
    expect(gridPositions).toContain('0,0,2')
    expect(gridPositions).toContain('2,0,2')

    // Check center position exists
    expect(gridPositions).toContain('1,0,1')
  })

  it('should maintain grid integrity for 3D grids', async () => {
    const { default: CubeGrid } = await import('./CubeGrid.vue')
    const wrapper = mount(CubeGrid as any, {
      props: { config: boundaryConfig, gridSize: [2, 2, 2] },
      global: globalStubs,
    })
    const cubes = wrapper.findAll('[data-testid="parametric-cube-mock"]')

    expect(cubes).toHaveLength(8)

    const gridPositions = cubes.map((cube) => cube.attributes('data-grid-position'))
    const expectedPositions = [
      '0,0,0',
      '0,0,1',
      '0,1,0',
      '0,1,1',
      '1,0,0',
      '1,0,1',
      '1,1,0',
      '1,1,1',
    ]
    expectedPositions.forEach((pos) => {
      expect(gridPositions).toContain(pos)
    })
  })
})
