import { describe, it, expect } from 'vitest'
import {
  createStackLayer,
  createCubeStack,
  createGradientStack,
  getLayerYPosition,
  getStackCenterOffset,
  getLayerBlendFactor,
  DEFAULT_STACK_TRANSITION,
  DEFAULT_STACK_PHYSICS,
  type CubeStackConfig,
  type StackLayer,
} from './stack'
import { createDefaultCube, type SpectralCube } from './cube'

// Import example stack configs
import stoneWall from '../../examples/stack-stone-wall.json'
import woodenTower from '../../examples/stack-wooden-tower.json'
import layeredEarth from '../../examples/stack-layered-earth.json'

describe('Stack Types', () => {
  describe('DEFAULT_STACK_TRANSITION', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_STACK_TRANSITION.type).toBe('blend')
      expect(DEFAULT_STACK_TRANSITION.blendHeight).toBe(0.2)
      expect(DEFAULT_STACK_TRANSITION.easing).toBe('smooth')
      expect(DEFAULT_STACK_TRANSITION.blendNoise).toBe(true)
      expect(DEFAULT_STACK_TRANSITION.blendGradients).toBe(true)
    })
  })

  describe('DEFAULT_STACK_PHYSICS', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_STACK_PHYSICS.material).toBe('stone')
      expect(DEFAULT_STACK_PHYSICS.density).toBe(2.5)
      expect(DEFAULT_STACK_PHYSICS.break_pattern).toBe('crumble')
      expect(DEFAULT_STACK_PHYSICS.isStable).toBe(true)
      expect(DEFAULT_STACK_PHYSICS.structuralIntegrity).toBe(1.0)
    })
  })
})

describe('createStackLayer', () => {
  const testCube: SpectralCube = createDefaultCube('test-cube')

  it('should create a layer with default values', () => {
    const layer = createStackLayer('layer-1', testCube)

    expect(layer.id).toBe('layer-1')
    expect(layer.position).toBe('middle')
    expect(layer.cubeConfig).toBe(testCube)
    expect(layer.height).toBe(1)
    expect(layer.transitionToNext).toBeDefined()
  })

  it('should create a layer with custom position and height', () => {
    const layer = createStackLayer('layer-bottom', testCube, 'bottom', 1.5)

    expect(layer.id).toBe('layer-bottom')
    expect(layer.position).toBe('bottom')
    expect(layer.height).toBe(1.5)
    expect(layer.transitionToNext).toBeDefined()
  })

  it('should not include transition for top layer', () => {
    const layer = createStackLayer('layer-top', testCube, 'top')

    expect(layer.position).toBe('top')
    expect(layer.transitionToNext).toBeUndefined()
  })

  it('should not include transition for single layer', () => {
    const layer = createStackLayer('layer-single', testCube, 'single')

    expect(layer.position).toBe('single')
    expect(layer.transitionToNext).toBeUndefined()
  })
})

describe('createCubeStack', () => {
  const testCube1: SpectralCube = createDefaultCube('cube-1')
  const testCube2: SpectralCube = createDefaultCube('cube-2')
  const testCube3: SpectralCube = createDefaultCube('cube-3')

  it('should create a stack with correct total height', () => {
    const layers: StackLayer[] = [
      createStackLayer('l1', testCube1, 'bottom', 1),
      createStackLayer('l2', testCube2, 'middle', 2),
      createStackLayer('l3', testCube3, 'top', 1.5),
    ]

    const stack = createCubeStack('test-stack', layers)

    expect(stack.totalHeight).toBe(4.5)
  })

  it('should update layer positions correctly', () => {
    const layers: StackLayer[] = [
      createStackLayer('l1', testCube1, 'middle', 1), // Will be updated to bottom
      createStackLayer('l2', testCube2, 'middle', 1),
      createStackLayer('l3', testCube3, 'middle', 1), // Will be updated to top
    ]

    const stack = createCubeStack('test-stack', layers)

    expect(stack.layers[0].position).toBe('bottom')
    expect(stack.layers[1].position).toBe('middle')
    expect(stack.layers[2].position).toBe('top')
  })

  it('should mark single layer as single position', () => {
    const layers: StackLayer[] = [createStackLayer('l1', testCube1, 'bottom', 1)]

    const stack = createCubeStack('test-stack', layers)

    expect(stack.layers[0].position).toBe('single')
  })

  it('should calculate total weight from layer densities', () => {
    const cube1: SpectralCube = {
      ...testCube1,
      physics: { material: 'stone', density: 3.0 },
    }
    const cube2: SpectralCube = {
      ...testCube2,
      physics: { material: 'stone', density: 2.0 },
    }

    const layers: StackLayer[] = [
      createStackLayer('l1', cube1, 'bottom', 1), // 3.0 * 1 = 3.0
      createStackLayer('l2', cube2, 'top', 1), // 2.0 * 1 = 2.0
    ]

    const stack = createCubeStack('test-stack', layers)

    expect(stack.physics?.totalWeight).toBe(5.0)
  })

  it('should include prompt in stack config', () => {
    const layers: StackLayer[] = [createStackLayer('l1', testCube1, 'single', 1)]

    const stack = createCubeStack('test-stack', layers, 'A test stack prompt')

    expect(stack.prompt).toBe('A test stack prompt')
  })

  it('should set default boundary settings', () => {
    const layers: StackLayer[] = [createStackLayer('l1', testCube1, 'single', 1)]

    const stack = createCubeStack('test-stack', layers)

    expect(stack.boundaryMode).toBe('smooth')
    expect(stack.neighborInfluence).toBe(0.5)
  })

  it('should add creation timestamp in meta', () => {
    const layers: StackLayer[] = [createStackLayer('l1', testCube1, 'single', 1)]

    const stack = createCubeStack('test-stack', layers)

    expect(stack.meta?.created).toBeDefined()
    expect(new Date(stack.meta!.created!).getTime()).toBeGreaterThan(0)
  })
})

describe('createGradientStack', () => {
  it('should create a stack with correct number of layers', () => {
    const stack = createGradientStack('gradient-stack', [0.2, 0.2, 0.2], [0.8, 0.8, 0.8], 5)

    expect(stack.layers).toHaveLength(5)
  })

  it('should interpolate colors correctly', () => {
    const baseColor: [number, number, number] = [0.0, 0.0, 0.0]
    const topColor: [number, number, number] = [1.0, 1.0, 1.0]
    const stack = createGradientStack('gradient-stack', baseColor, topColor, 3)

    // First layer should be base color
    expect(stack.layers[0].cubeConfig.base.color[0]).toBeCloseTo(0.0)

    // Middle layer should be halfway
    expect(stack.layers[1].cubeConfig.base.color[0]).toBeCloseTo(0.5)

    // Last layer should be top color
    expect(stack.layers[2].cubeConfig.base.color[0]).toBeCloseTo(1.0)
  })

  it('should apply material to all layers', () => {
    const stack = createGradientStack('gradient-stack', [0.5, 0.5, 0.5], [0.8, 0.8, 0.8], 3, 'wood')

    stack.layers.forEach((layer) => {
      expect(layer.cubeConfig.physics?.material).toBe('wood')
    })
  })

  it('should create rougher layers at top', () => {
    const stack = createGradientStack('gradient-stack', [0.5, 0.5, 0.5], [0.8, 0.8, 0.8], 3)

    const bottomRoughness = stack.layers[0].cubeConfig.base.roughness
    const topRoughness = stack.layers[2].cubeConfig.base.roughness

    expect(topRoughness).toBeGreaterThan(bottomRoughness!)
  })

  it('should create denser layers at bottom', () => {
    const stack = createGradientStack('gradient-stack', [0.5, 0.5, 0.5], [0.8, 0.8, 0.8], 3)

    const bottomDensity = stack.layers[0].cubeConfig.physics?.density ?? 0
    const topDensity = stack.layers[2].cubeConfig.physics?.density ?? 0

    expect(bottomDensity).toBeGreaterThan(topDensity)
  })

  it('should handle single layer correctly', () => {
    const stack = createGradientStack('single-layer', [0.5, 0.5, 0.5], [0.8, 0.8, 0.8], 1)

    expect(stack.layers).toHaveLength(1)
    expect(stack.layers[0].position).toBe('single')
  })
})

describe('getLayerYPosition', () => {
  it('should return correct Y position for first layer', () => {
    const testCube = createDefaultCube('test')
    const layers: StackLayer[] = [
      createStackLayer('l1', testCube, 'bottom', 2),
      createStackLayer('l2', testCube, 'top', 1),
    ]
    const stack = createCubeStack('stack', layers)

    const yPos = getLayerYPosition(stack, 0)

    // First layer height is 2, center should be at 1
    expect(yPos).toBe(1)
  })

  it('should return correct Y position for second layer', () => {
    const testCube = createDefaultCube('test')
    const layers: StackLayer[] = [
      createStackLayer('l1', testCube, 'bottom', 2),
      createStackLayer('l2', testCube, 'top', 1),
    ]
    const stack = createCubeStack('stack', layers)

    const yPos = getLayerYPosition(stack, 1)

    // Second layer starts at 2, height is 1, center should be at 2.5
    expect(yPos).toBe(2.5)
  })

  it('should work with multiple layers of varying heights', () => {
    const testCube = createDefaultCube('test')
    const layers: StackLayer[] = [
      createStackLayer('l1', testCube, 'bottom', 1),
      createStackLayer('l2', testCube, 'middle', 2),
      createStackLayer('l3', testCube, 'top', 1),
    ]
    const stack = createCubeStack('stack', layers)

    expect(getLayerYPosition(stack, 0)).toBe(0.5) // 0 + 1/2
    expect(getLayerYPosition(stack, 1)).toBe(2) // 1 + 2/2
    expect(getLayerYPosition(stack, 2)).toBe(3.5) // 1 + 2 + 1/2
  })
})

describe('getStackCenterOffset', () => {
  it('should return half of total height', () => {
    const testCube = createDefaultCube('test')
    const layers: StackLayer[] = [
      createStackLayer('l1', testCube, 'bottom', 2),
      createStackLayer('l2', testCube, 'top', 2),
    ]
    const stack = createCubeStack('stack', layers)

    const offset = getStackCenterOffset(stack)

    expect(offset).toBe(2) // totalHeight 4 / 2
  })
})

describe('getLayerBlendFactor', () => {
  const testCube = createDefaultCube('test')
  const layers: StackLayer[] = [
    {
      ...createStackLayer('l1', testCube, 'bottom', 1),
      transitionToNext: {
        type: 'blend',
        blendHeight: 0.2,
        easing: 'linear',
      },
    },
    createStackLayer('l2', testCube, 'top', 1),
  ]
  const stack = createCubeStack('stack', layers)

  it('should return 0 for bottom of layer', () => {
    const blendFactor = getLayerBlendFactor(stack, 0, 0)
    expect(blendFactor).toBe(0)
  })

  it('should return 0 before transition zone', () => {
    const blendFactor = getLayerBlendFactor(stack, 0, 0.5) // 50% up the layer
    expect(blendFactor).toBe(0)
  })

  it('should return value > 0 in transition zone', () => {
    const blendFactor = getLayerBlendFactor(stack, 0, 0.9) // 90% up the layer (in transition zone)
    expect(blendFactor).toBeGreaterThan(0)
    expect(blendFactor).toBeLessThan(1)
  })

  it('should return 1 at top of transition zone', () => {
    const blendFactor = getLayerBlendFactor(stack, 0, 1.0) // Top of layer
    expect(blendFactor).toBeCloseTo(1)
  })

  it('should return 0 for top layer (no transition)', () => {
    const blendFactor = getLayerBlendFactor(stack, 1, 0.9)
    expect(blendFactor).toBe(0)
  })

  it('should handle smooth easing', () => {
    const smoothLayers: StackLayer[] = [
      {
        ...createStackLayer('l1', testCube, 'bottom', 1),
        transitionToNext: {
          type: 'blend',
          blendHeight: 0.4, // Larger transition zone for testing
          easing: 'smooth',
        },
      },
      createStackLayer('l2', testCube, 'top', 1),
    ]
    const smoothStack = createCubeStack('stack', smoothLayers)

    // Mid-transition should follow smoothstep curve
    const midBlend = getLayerBlendFactor(smoothStack, 0, 0.8) // Halfway through transition
    expect(midBlend).toBeCloseTo(0.5, 1) // smoothstep at 0.5 = 0.5
  })
})

describe('Example Stack Configs', () => {
  describe('stack-stone-wall.json', () => {
    const config = stoneWall as CubeStackConfig

    it('should have correct id', () => {
      expect(config.id).toBe('stack_stone_wall_001')
    })

    it('should have 3 layers', () => {
      expect(config.layers).toHaveLength(3)
    })

    it('should have correct total height', () => {
      expect(config.totalHeight).toBe(3)
    })

    it('should have smooth boundary mode', () => {
      expect(config.boundaryMode).toBe('smooth')
    })

    it('should have stone material physics', () => {
      expect(config.physics?.material).toBe('stone')
    })

    it('layers should have correct positions', () => {
      expect(config.layers[0].position).toBe('bottom')
      expect(config.layers[1].position).toBe('middle')
      expect(config.layers[2].position).toBe('top')
    })

    it('should have transitions except for top layer', () => {
      expect(config.layers[0].transitionToNext).toBeDefined()
      expect(config.layers[1].transitionToNext).toBeDefined()
      expect(config.layers[2].transitionToNext).toBeUndefined()
    })
  })

  describe('stack-wooden-tower.json', () => {
    const config = woodenTower as CubeStackConfig

    it('should have correct id', () => {
      expect(config.id).toBe('stack_wooden_tower_001')
    })

    it('should have 4 layers', () => {
      expect(config.layers).toHaveLength(4)
    })

    it('should have correct total height', () => {
      expect(config.totalHeight).toBe(4.0)
    })

    it('should have wood material physics', () => {
      expect(config.physics?.material).toBe('wood')
    })

    it('layers should use radial gradients for ring patterns', () => {
      config.layers.forEach((layer) => {
        const hasRadialGradient = layer.cubeConfig.gradients?.some((g) => g.axis === 'radial')
        expect(hasRadialGradient).toBe(true)
      })
    })

    it('all layers should use perlin noise', () => {
      config.layers.forEach((layer) => {
        expect(layer.cubeConfig.noise?.type).toBe('perlin')
      })
    })
  })

  describe('stack-layered-earth.json', () => {
    const config = layeredEarth as CubeStackConfig

    it('should have correct id', () => {
      expect(config.id).toBe('stack_layered_earth_001')
    })

    it('should have 5 layers', () => {
      expect(config.layers).toHaveLength(5)
    })

    it('should have correct total height', () => {
      expect(config.totalHeight).toBeCloseTo(2.6)
    })

    it('should have layer names in Russian', () => {
      expect(config.layers[0].name).toBe('Коренная порода')
      expect(config.layers[4].name).toBe('Плодородный слой')
    })

    it('layers should have varying heights', () => {
      const heights = config.layers.map((l) => l.height)
      expect(heights).toEqual([0.8, 0.6, 0.5, 0.4, 0.3])
    })

    it('bedrock layer should use crackle noise', () => {
      expect(config.layers[0].cubeConfig.noise?.type).toBe('crackle')
    })

    it('topsoil layer should have mask applied', () => {
      expect(config.layers[4].cubeConfig.noise?.mask).toBe('top_60%')
    })
  })
})
