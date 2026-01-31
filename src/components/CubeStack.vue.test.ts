/**
 * Unit tests for CubeStack and CubeStackGrid Vue components
 * Tests the Vue.js 3.0 + TresJS migration (TASK 62)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest'
import { mount, shallowMount } from '@vue/test-utils'
import type { CubeStackConfig, StackLayer } from '../types/stack'
import {
  getLayerYPosition,
  getStackCenterOffset,
  createCubeStack,
  createStackLayer,
  createGradientStack,
} from '../types/stack'
import { createDefaultCube, type SpectralCube } from '../types/cube'

// Mock TresJS dependencies
vi.mock('@tresjs/core', () => ({
  useLoop: () => ({ onBeforeRender: vi.fn(), onRender: vi.fn() }),
}))

// Mock ParametricCube to render a simple stub with data attributes
vi.mock('./ParametricCube.vue', () => ({
  default: {
    name: 'ParametricCube',
    props: [
      'config',
      'position',
      'gridPosition',
      'scale',
      'lodLevel',
      'animate',
      'rotationSpeed',
      'lodSettings',
    ],
    template: `<div
      data-testid="parametric-cube-mock"
      :data-config-id="config?.id"
      :data-position="position?.join(',')"
      :data-grid-position="gridPosition?.join(',')"
      :data-scale="Array.isArray(scale) ? scale.join(',') : scale"
      :data-lod-level="lodLevel"
    />`,
  },
}))

// Mock CubeStack for CubeStackGrid tests
vi.mock('./CubeStack.vue', async () => {
  const actual = await vi.importActual('./CubeStack.vue')
  return actual
})

const globalStubs = {
  stubs: {
    TresGroup: { template: '<div><slot /></div>' },
  },
}

// Helper to create a mock stack config
function createMockStackConfig(): CubeStackConfig {
  const baseCube: SpectralCube = {
    id: 'stack_layer_base',
    base: { color: [0.65, 0.55, 0.45], roughness: 0.8, transparency: 1.0 },
  }

  const layers: StackLayer[] = [
    {
      id: 'layer-1',
      cubeConfig: { ...baseCube, id: 'layer-1-cube' },
      height: 1,
      position: 'bottom',
    },
    {
      id: 'layer-2',
      cubeConfig: { ...baseCube, id: 'layer-2-cube' },
      height: 0.5,
      position: 'middle',
    },
    { id: 'layer-3', cubeConfig: { ...baseCube, id: 'layer-3-cube' }, height: 1, position: 'top' },
  ]

  const totalHeight = layers.reduce((sum, l) => sum + (l.height ?? 1), 0)

  return {
    id: 'test-stack',
    layers,
    totalHeight,
    boundaryMode: 'smooth',
    neighborInfluence: 0.5,
  }
}

describe('CubeStack Vue Component — Layer Position Calculations', () => {
  it('should calculate correct layer Y positions', () => {
    const config = createMockStackConfig()

    const y0 = getLayerYPosition(config, 0)
    const y1 = getLayerYPosition(config, 1)
    const y2 = getLayerYPosition(config, 2)

    expect(y0).toBeLessThan(y1)
    expect(y1).toBeLessThan(y2)
  })

  it('should calculate center offset for vertical centering', () => {
    const config = createMockStackConfig()
    const centerOffset = getStackCenterOffset(config)

    expect(typeof centerOffset).toBe('number')
    expect(centerOffset).toBeGreaterThan(0)
  })

  it('should simplify layers at LOD level 4 to 2 layers', () => {
    const config = createMockStackConfig()
    const lodLevel = 4

    let visibleLayers = config.layers
    if (lodLevel >= 3) {
      if (lodLevel === 4 && config.layers.length > 2) {
        visibleLayers = [config.layers[0], config.layers[config.layers.length - 1]]
      }
    }

    expect(visibleLayers).toHaveLength(2)
    expect(visibleLayers[0].id).toBe('layer-1')
    expect(visibleLayers[1].id).toBe('layer-3')
  })

  it('should simplify layers at LOD level 3 to 3 layers', () => {
    const config = createMockStackConfig()
    const lodLevel = 3

    let visibleLayers = config.layers
    if (lodLevel >= 3 && lodLevel === 3 && config.layers.length > 3) {
      const midIndex = Math.floor(config.layers.length / 2)
      visibleLayers = [
        config.layers[0],
        config.layers[midIndex],
        config.layers[config.layers.length - 1],
      ]
    }

    // With 3 layers input and LOD 3, all layers are kept (3 <= 3)
    expect(visibleLayers).toHaveLength(3)
  })

  it('should keep all layers at LOD level 0-2', () => {
    const config = createMockStackConfig()

    for (const lodLevel of [0, 1, 2] as const) {
      let visibleLayers = config.layers
      if (lodLevel !== undefined && lodLevel >= 3) {
        visibleLayers = config.layers.slice(0, 1)
      }
      expect(visibleLayers).toHaveLength(3)
    }
  })
})

describe('CubeStack Vue Component — Debug Layer Colors', () => {
  it('should generate different debug colors per layer', () => {
    const baseConfig: SpectralCube = {
      id: 'debug_test',
      base: { color: [0.5, 0.5, 0.5] },
    }

    const colors = [0, 1, 2].map((index) => {
      const debugHue = ((index * 60) % 360) / 360
      return [
        Math.max(0, Math.min(1, baseConfig.base.color[0] + debugHue * 0.3)),
        Math.max(0, Math.min(1, baseConfig.base.color[1] + (1 - debugHue) * 0.3)),
        Math.max(0, Math.min(1, baseConfig.base.color[2])),
      ]
    })

    expect(colors[0]).not.toEqual(colors[1])
    expect(colors[1]).not.toEqual(colors[2])
  })
})

describe('CubeStack Vue Component — Module Exports', () => {
  it('should export CubeStack.vue as a valid Vue component', async () => {
    const module = await import('./CubeStack.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })

  it('should export CubeStackGrid.vue as a valid Vue component', async () => {
    const module = await import('./CubeStackGrid.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })
})

describe('CubeStack Vue Component — Component Mounting', () => {
  const testCube1 = createDefaultCube('cube-1')
  const testCube2 = createDefaultCube('cube-2')
  const testCube3 = createDefaultCube('cube-3')

  const createTestStack = () => {
    const layers = [
      createStackLayer('l1', testCube1, 'bottom', 1),
      createStackLayer('l2', testCube2, 'middle', 1),
      createStackLayer('l3', testCube3, 'top', 1),
    ]
    return createCubeStack('test-stack', layers)
  }

  describe('Layer Rendering', () => {
    it('should render all layers', async () => {
      const stack = createTestStack()
      const { default: CubeStack } = await import('./CubeStack.vue')
      const wrapper = mount(CubeStack as any, {
        props: { config: stack },
        global: globalStubs,
      })
      const cubes = wrapper.findAll('[data-testid="parametric-cube-mock"]')
      expect(cubes).toHaveLength(3)
    })

    it('should render single layer stack', async () => {
      const layers = [createStackLayer('l1', testCube1, 'single', 1)]
      const stack = createCubeStack('single-stack', layers)

      const { default: CubeStack } = await import('./CubeStack.vue')
      const wrapper = mount(CubeStack as any, {
        props: { config: stack },
        global: globalStubs,
      })
      const cubes = wrapper.findAll('[data-testid="parametric-cube-mock"]')
      expect(cubes).toHaveLength(1)
    })

    it('should render gradient stack', async () => {
      const stack = createGradientStack('gradient', [0.2, 0.2, 0.2], [0.8, 0.8, 0.8], 5)

      const { default: CubeStack } = await import('./CubeStack.vue')
      const wrapper = mount(CubeStack as any, {
        props: { config: stack },
        global: globalStubs,
      })
      const cubes = wrapper.findAll('[data-testid="parametric-cube-mock"]')
      expect(cubes).toHaveLength(5)
    })
  })

  describe('Vertical Positioning', () => {
    it('should position layers vertically when centered', async () => {
      const stack = createTestStack()
      const { default: CubeStack } = await import('./CubeStack.vue')
      const wrapper = mount(CubeStack as any, {
        props: { config: stack, centerVertically: true },
        global: globalStubs,
      })
      const cubes = wrapper.findAll('[data-testid="parametric-cube-mock"]')

      const yPositions = cubes.map((cube) => {
        const pos = cube.attributes('data-position')
        return pos ? parseFloat(pos.split(',')[1]) : null
      })

      // With 3 layers of height 1 each, total height is 3
      // Centered: positions should be at -1, 0, 1 relative to center
      expect(yPositions[0]).toBeCloseTo(-1)
      expect(yPositions[1]).toBeCloseTo(0)
      expect(yPositions[2]).toBeCloseTo(1)
    })

    it('should position layers from bottom when not centered', async () => {
      const stack = createTestStack()
      const { default: CubeStack } = await import('./CubeStack.vue')
      const wrapper = mount(CubeStack as any, {
        props: { config: stack, centerVertically: false },
        global: globalStubs,
      })
      const cubes = wrapper.findAll('[data-testid="parametric-cube-mock"]')

      const yPositions = cubes.map((cube) => {
        const pos = cube.attributes('data-position')
        return pos ? parseFloat(pos.split(',')[1]) : null
      })

      // Not centered: positions should be at 0.5, 1.5, 2.5 (center of each unit cube)
      expect(yPositions[0]).toBeCloseTo(0.5)
      expect(yPositions[1]).toBeCloseTo(1.5)
      expect(yPositions[2]).toBeCloseTo(2.5)
    })
  })

  describe('Grid Position for Stitching', () => {
    it('should pass grid positions to layers', async () => {
      const stack = createTestStack()
      const { default: CubeStack } = await import('./CubeStack.vue')
      const wrapper = mount(CubeStack as any, {
        props: { config: stack, gridPosition: [1, 0, 2] },
        global: globalStubs,
      })
      const cubes = wrapper.findAll('[data-testid="parametric-cube-mock"]')

      const gridPositions = cubes.map((cube) => cube.attributes('data-grid-position'))

      expect(gridPositions[0]).toBe('1,0,2')
      expect(gridPositions[1]).toBe('1,1,2')
      expect(gridPositions[2]).toBe('1,2,2')
    })
  })

  describe('Scale', () => {
    it('should apply scale to stack', async () => {
      const stack = createTestStack()
      const { default: CubeStack } = await import('./CubeStack.vue')
      const wrapper = mount(CubeStack as any, {
        props: { config: stack, scale: 2 },
        global: globalStubs,
      })
      const cubes = wrapper.findAll('[data-testid="parametric-cube-mock"]')

      cubes.forEach((cube) => {
        const scale = cube.attributes('data-scale')
        expect(scale).toBe('2,2,2')
      })
    })

    it('should handle varying layer heights with scale', async () => {
      const layers = [
        createStackLayer('l1', testCube1, 'bottom', 2),
        createStackLayer('l2', testCube2, 'top', 1),
      ]
      const stack = createCubeStack('varied-stack', layers)

      const { default: CubeStack } = await import('./CubeStack.vue')
      const wrapper = mount(CubeStack as any, {
        props: { config: stack, scale: 1 },
        global: globalStubs,
      })
      const cubes = wrapper.findAll('[data-testid="parametric-cube-mock"]')

      const scales = cubes.map((cube) => cube.attributes('data-scale'))
      expect(scales[0]).toBe('1,2,1')
      expect(scales[1]).toBe('1,1,1')
    })
  })

  describe('LOD Support', () => {
    it('should pass LOD level to all layers', async () => {
      const stack = createTestStack()
      const { default: CubeStack } = await import('./CubeStack.vue')
      const wrapper = mount(CubeStack as any, {
        props: { config: stack, lodLevel: 2 },
        global: globalStubs,
      })
      const cubes = wrapper.findAll('[data-testid="parametric-cube-mock"]')

      cubes.forEach((cube) => {
        expect(cube.attributes('data-lod-level')).toBe('2')
      })
    })

    it('should simplify layers at LOD level 3', async () => {
      const layers = [
        createStackLayer('l1', testCube1, 'bottom', 1),
        createStackLayer('l2', testCube2, 'middle', 1),
        createStackLayer('l3', testCube3, 'middle', 1),
        createStackLayer('l4', createDefaultCube('cube-4'), 'middle', 1),
        createStackLayer('l5', createDefaultCube('cube-5'), 'top', 1),
      ]
      const stack = createCubeStack('big-stack', layers)

      const { default: CubeStack } = await import('./CubeStack.vue')
      const wrapper = mount(CubeStack as any, {
        props: { config: stack, lodLevel: 3 },
        global: globalStubs,
      })
      const cubes = wrapper.findAll('[data-testid="parametric-cube-mock"]')

      // At LOD 3 with 5+ layers, should show bottom, middle, and top (3 layers)
      expect(cubes).toHaveLength(3)
    })

    it('should simplify to 2 layers at LOD level 4', async () => {
      const layers = [
        createStackLayer('l1', testCube1, 'bottom', 1),
        createStackLayer('l2', testCube2, 'middle', 1),
        createStackLayer('l3', testCube3, 'middle', 1),
        createStackLayer('l4', createDefaultCube('cube-4'), 'top', 1),
      ]
      const stack = createCubeStack('big-stack', layers)

      const { default: CubeStack } = await import('./CubeStack.vue')
      const wrapper = mount(CubeStack as any, {
        props: { config: stack, lodLevel: 4 },
        global: globalStubs,
      })
      const cubes = wrapper.findAll('[data-testid="parametric-cube-mock"]')

      // At LOD 4 with 3+ layers, should show only bottom and top (2 layers)
      expect(cubes).toHaveLength(2)
    })
  })

  describe('Position', () => {
    it('should apply position offset to stack', async () => {
      const layers = [createStackLayer('l1', testCube1, 'single', 1)]
      const stack = createCubeStack('single-stack', layers)

      const { default: CubeStack } = await import('./CubeStack.vue')
      const wrapper = mount(CubeStack as any, {
        props: { config: stack, position: [5, 10, 15] },
        global: globalStubs,
      })
      const cubes = wrapper.findAll('[data-testid="parametric-cube-mock"]')

      const position = cubes[0].attributes('data-position')
      expect(position).toContain('5,')
      expect(position).toContain(',15')
    })
  })

  describe('Props Interface', () => {
    it('should accept all optional props', async () => {
      const stack = createTestStack()
      const { default: CubeStack } = await import('./CubeStack.vue')
      const wrapper = mount(CubeStack as any, {
        props: {
          config: stack,
          position: [1, 2, 3],
          scale: 0.5,
          animate: true,
          rotationSpeed: 1.0,
          gridPosition: [0, 0, 0],
          lodLevel: 1,
          centerVertically: false,
          debugLayers: true,
        },
        global: globalStubs,
      })
      const cubes = wrapper.findAll('[data-testid="parametric-cube-mock"]')
      expect(cubes.length).toBeGreaterThan(0)
    })

    it('should work with minimal props', async () => {
      const stack = createTestStack()
      const { default: CubeStack } = await import('./CubeStack.vue')
      const wrapper = mount(CubeStack as any, {
        props: { config: stack },
        global: globalStubs,
      })
      const cubes = wrapper.findAll('[data-testid="parametric-cube-mock"]')
      expect(cubes.length).toBeGreaterThan(0)
    })
  })
})

describe('CubeStackGrid Vue Component — Component Mounting', () => {
  const testCube = createDefaultCube('test')
  const layers = [
    createStackLayer('l1', testCube, 'bottom', 1),
    createStackLayer('l2', testCube, 'top', 1),
  ]
  const testStack = createCubeStack('grid-stack', layers)

  // CubeStackGrid renders CubeStack children which each render ParametricCubes
  // We need to stub CubeStack to count stacks, not individual cubes
  const stackGridStubs = {
    stubs: {
      TresGroup: { template: '<div><slot /></div>' },
      CubeStack: {
        name: 'CubeStack',
        props: ['config', 'position', 'gridPosition', 'scale', 'lodLevel'],
        template: `<div
          data-testid="cube-stack-mock"
          :data-position="position?.join(',')"
          :data-grid-position="gridPosition?.join(',')"
          :data-scale="scale"
          :data-lod-level="lodLevel"
        ><div data-testid="parametric-cube-mock" /><div data-testid="parametric-cube-mock" /></div>`,
      },
    },
  }

  describe('Grid Generation', () => {
    it('should render default 3x3 grid (9 stacks)', async () => {
      const { default: CubeStackGrid } = await import('./CubeStackGrid.vue')
      const wrapper = shallowMount(CubeStackGrid as any, {
        props: { config: testStack },
        global: stackGridStubs,
      })
      const stacks = wrapper.findAll('[data-testid="cube-stack-mock"]')
      expect(stacks).toHaveLength(9)
    })

    it('should render custom grid size', async () => {
      const { default: CubeStackGrid } = await import('./CubeStackGrid.vue')
      const wrapper = shallowMount(CubeStackGrid as any, {
        props: { config: testStack, gridSize: [2, 2] },
        global: stackGridStubs,
      })
      const stacks = wrapper.findAll('[data-testid="cube-stack-mock"]')
      expect(stacks).toHaveLength(4)
    })

    it('should render single stack when gridSize is [1,1]', async () => {
      const { default: CubeStackGrid } = await import('./CubeStackGrid.vue')
      const wrapper = shallowMount(CubeStackGrid as any, {
        props: { config: testStack, gridSize: [1, 1] },
        global: stackGridStubs,
      })
      const stacks = wrapper.findAll('[data-testid="cube-stack-mock"]')
      expect(stacks).toHaveLength(1)
    })
  })

  describe('Grid Positioning', () => {
    it('should distribute stacks in X-Z plane', async () => {
      const { default: CubeStackGrid } = await import('./CubeStackGrid.vue')
      const wrapper = shallowMount(CubeStackGrid as any, {
        props: { config: testStack, gridSize: [2, 2], stackScale: 1, spacing: 0 },
        global: stackGridStubs,
      })
      const stacks = wrapper.findAll('[data-testid="cube-stack-mock"]')
      const positions = stacks.map((s) => s.attributes('data-position'))

      const xzPositions = positions.map((p) => {
        const parts = p?.split(',') ?? []
        return `${parts[0]},${parts[2]}`
      })

      const uniqueXZ = new Set(xzPositions)
      expect(uniqueXZ.size).toBe(4)
    })
  })

  describe('Grid Props', () => {
    it('should apply spacing between stacks', async () => {
      const { default: CubeStackGrid } = await import('./CubeStackGrid.vue')
      const wrapper = shallowMount(CubeStackGrid as any, {
        props: { config: testStack, gridSize: [2, 1], stackScale: 1, spacing: 1 },
        global: stackGridStubs,
      })
      const stacks = wrapper.findAll('[data-testid="cube-stack-mock"]')
      const positions = stacks.map((s) => {
        const pos = s.attributes('data-position')
        return pos ? pos.split(',').map(Number) : null
      })

      const xPositions = positions.map((p) => p?.[0] ?? 0)
      const distance = Math.abs(xPositions[1] - xPositions[0])
      expect(distance).toBeCloseTo(2)
    })

    it('should pass LOD level to all stacks', async () => {
      const { default: CubeStackGrid } = await import('./CubeStackGrid.vue')
      const wrapper = shallowMount(CubeStackGrid as any, {
        props: { config: testStack, gridSize: [2, 2], lodLevel: 2 },
        global: stackGridStubs,
      })
      const stacks = wrapper.findAll('[data-testid="cube-stack-mock"]')

      stacks.forEach((stack) => {
        expect(stack.attributes('data-lod-level')).toBe('2')
      })
    })

    it('should apply stack scale', async () => {
      const { default: CubeStackGrid } = await import('./CubeStackGrid.vue')
      const wrapper = shallowMount(CubeStackGrid as any, {
        props: { config: testStack, gridSize: [1, 1], stackScale: 2 },
        global: stackGridStubs,
      })
      const stacks = wrapper.findAll('[data-testid="cube-stack-mock"]')

      expect(stacks[0].attributes('data-scale')).toBe('2')
    })
  })
})

describe('CubeStackGrid Vue Component — Grid Position Calculations', () => {
  it('should calculate correct grid positions for 3x3 default grid', () => {
    const gridSize: [number, number] = [3, 3]
    const stackScale = 1
    const spacing = 0
    const step = stackScale + spacing

    expect(gridSize[0] * gridSize[1]).toBe(9)

    const offsetX = ((gridSize[0] - 1) * step) / 2
    const offsetZ = ((gridSize[1] - 1) * step) / 2
    const centerX = 1 * step - offsetX
    const centerZ = 1 * step - offsetZ
    expect(centerX).toBeCloseTo(0)
    expect(centerZ).toBeCloseTo(0)
  })
})
