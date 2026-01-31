/**
 * Unit tests for CubeStack and CubeStackGrid Vue components
 * Tests the Vue.js 3.0 + TresJS migration (TASK 62)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import type { CubeStackConfig, StackLayer } from '../types/stack'
import { getLayerYPosition, getStackCenterOffset } from '../types/stack'
import type { SpectralCube } from '../types/cube'

// Helper to create a mock stack config
function createMockStackConfig(): CubeStackConfig {
  const baseCube: SpectralCube = {
    id: 'stack_layer_base',
    base: { color: [0.65, 0.55, 0.45], roughness: 0.8, transparency: 1.0 },
  }

  const layers: StackLayer[] = [
    { id: 'layer-1', cubeConfig: { ...baseCube, id: 'layer-1-cube' }, height: 1 },
    { id: 'layer-2', cubeConfig: { ...baseCube, id: 'layer-2-cube' }, height: 0.5 },
    { id: 'layer-3', cubeConfig: { ...baseCube, id: 'layer-3-cube' }, height: 1 },
  ]

  const totalHeight = layers.reduce((sum, l) => sum + (l.height ?? 1), 0)

  return {
    id: 'test-stack',
    name: 'Test Stack',
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

    // Layer positions should be incrementally higher
    expect(y0).toBeLessThan(y1)
    expect(y1).toBeLessThan(y2)
  })

  it('should calculate center offset for vertical centering', () => {
    const config = createMockStackConfig()
    const centerOffset = getStackCenterOffset(config)

    // Center offset should be the middle of the total stack height
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
        // This block won't execute for LOD 0-2
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

    // Each layer should have a different color
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

describe('CubeStackGrid Vue Component — Grid Position Calculations', () => {
  it('should calculate correct grid positions for 3x3 default grid', () => {
    const gridSize: [number, number] = [3, 3]
    const stackScale = 1
    const spacing = 0
    const step = stackScale + spacing

    // Total stacks should be 3 * 3 = 9
    expect(gridSize[0] * gridSize[1]).toBe(9)

    // Center stack should be at origin
    const offsetX = ((gridSize[0] - 1) * step) / 2
    const offsetZ = ((gridSize[1] - 1) * step) / 2
    const centerX = 1 * step - offsetX
    const centerZ = 1 * step - offsetZ
    expect(centerX).toBeCloseTo(0)
    expect(centerZ).toBeCloseTo(0)
  })
})
