import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { CubeStack, CubeStackGrid } from './CubeStack'
import { createCubeStack, createStackLayer, createGradientStack } from '../types/stack'
import { createDefaultCube, type SpectralCube } from '../types/cube'

// Mock react-three-fiber to avoid WebGL context issues in tests
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="canvas-mock">{children}</div>
  ),
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({
    size: { width: 800, height: 600 },
    camera: {},
    gl: {},
  })),
}))

// Mock THREE.js
vi.mock('three', async () => {
  const actual = await vi.importActual('three')
  return {
    ...actual,
    ShaderMaterial: vi.fn().mockImplementation(() => ({
      vertexShader: '',
      fragmentShader: '',
      uniforms: {},
    })),
  }
})

// Mock ParametricCube since it uses Three.js internals
vi.mock('./ParametricCube', () => ({
  ParametricCube: ({
    config,
    position,
    gridPosition,
    scale,
    lodLevel,
  }: {
    config: SpectralCube
    position?: [number, number, number]
    gridPosition?: [number, number, number]
    scale?: number | [number, number, number]
    lodLevel?: number
  }) => (
    <div
      data-testid="parametric-cube-mock"
      data-config-id={config.id}
      data-position={position?.join(',')}
      data-grid-position={gridPosition?.join(',')}
      data-scale={Array.isArray(scale) ? scale.join(',') : scale}
      data-lod-level={lodLevel}
    />
  ),
}))

describe('CubeStack', () => {
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
    it('should render all layers', () => {
      const stack = createTestStack()
      const { getAllByTestId } = render(<CubeStack config={stack} />)
      const cubes = getAllByTestId('parametric-cube-mock')
      expect(cubes).toHaveLength(3)
    })

    it('should render single layer stack', () => {
      const layers = [createStackLayer('l1', testCube1, 'single', 1)]
      const stack = createCubeStack('single-stack', layers)

      const { getAllByTestId } = render(<CubeStack config={stack} />)
      const cubes = getAllByTestId('parametric-cube-mock')
      expect(cubes).toHaveLength(1)
    })

    it('should render gradient stack', () => {
      const stack = createGradientStack('gradient', [0.2, 0.2, 0.2], [0.8, 0.8, 0.8], 5)

      const { getAllByTestId } = render(<CubeStack config={stack} />)
      const cubes = getAllByTestId('parametric-cube-mock')
      expect(cubes).toHaveLength(5)
    })
  })

  describe('Vertical Positioning', () => {
    it('should position layers vertically when centered', () => {
      const stack = createTestStack()
      const { getAllByTestId } = render(<CubeStack config={stack} centerVertically={true} />)
      const cubes = getAllByTestId('parametric-cube-mock')

      const yPositions = cubes.map((cube) => {
        const pos = cube.getAttribute('data-position')
        return pos ? parseFloat(pos.split(',')[1]) : null
      })

      // With 3 layers of height 1 each, total height is 3
      // Centered: positions should be at -1, 0, 1 relative to center
      expect(yPositions[0]).toBeCloseTo(-1)
      expect(yPositions[1]).toBeCloseTo(0)
      expect(yPositions[2]).toBeCloseTo(1)
    })

    it('should position layers from bottom when not centered', () => {
      const stack = createTestStack()
      const { getAllByTestId } = render(<CubeStack config={stack} centerVertically={false} />)
      const cubes = getAllByTestId('parametric-cube-mock')

      const yPositions = cubes.map((cube) => {
        const pos = cube.getAttribute('data-position')
        return pos ? parseFloat(pos.split(',')[1]) : null
      })

      // Not centered: positions should be at 0.5, 1.5, 2.5 (center of each unit cube)
      expect(yPositions[0]).toBeCloseTo(0.5)
      expect(yPositions[1]).toBeCloseTo(1.5)
      expect(yPositions[2]).toBeCloseTo(2.5)
    })
  })

  describe('Grid Position for Stitching', () => {
    it('should pass grid positions to layers', () => {
      const stack = createTestStack()
      const { getAllByTestId } = render(<CubeStack config={stack} gridPosition={[1, 0, 2]} />)
      const cubes = getAllByTestId('parametric-cube-mock')

      // Each layer should have gridPosition with different Y values
      const gridPositions = cubes.map((cube) => cube.getAttribute('data-grid-position'))

      expect(gridPositions[0]).toBe('1,0,2')
      expect(gridPositions[1]).toBe('1,1,2')
      expect(gridPositions[2]).toBe('1,2,2')
    })
  })

  describe('Scale', () => {
    it('should apply scale to stack', () => {
      const stack = createTestStack()
      const { getAllByTestId } = render(<CubeStack config={stack} scale={2} />)
      const cubes = getAllByTestId('parametric-cube-mock')

      cubes.forEach((cube) => {
        const scale = cube.getAttribute('data-scale')
        // Scale should be [2, 1*2, 2] for unit height layers
        expect(scale).toBe('2,2,2')
      })
    })

    it('should handle varying layer heights with scale', () => {
      const layers = [
        createStackLayer('l1', testCube1, 'bottom', 2), // Height 2
        createStackLayer('l2', testCube2, 'top', 1), // Height 1
      ]
      const stack = createCubeStack('varied-stack', layers)

      const { getAllByTestId } = render(<CubeStack config={stack} scale={1} />)
      const cubes = getAllByTestId('parametric-cube-mock')

      const scales = cubes.map((cube) => cube.getAttribute('data-scale'))
      expect(scales[0]).toBe('1,2,1') // Height 2 layer
      expect(scales[1]).toBe('1,1,1') // Height 1 layer
    })
  })

  describe('LOD Support', () => {
    it('should pass LOD level to all layers', () => {
      const stack = createTestStack()
      const { getAllByTestId } = render(<CubeStack config={stack} lodLevel={2} />)
      const cubes = getAllByTestId('parametric-cube-mock')

      cubes.forEach((cube) => {
        expect(cube.getAttribute('data-lod-level')).toBe('2')
      })
    })

    it('should simplify layers at LOD level 3', () => {
      const layers = [
        createStackLayer('l1', testCube1, 'bottom', 1),
        createStackLayer('l2', testCube2, 'middle', 1),
        createStackLayer('l3', testCube3, 'middle', 1),
        createStackLayer('l4', createDefaultCube('cube-4'), 'middle', 1),
        createStackLayer('l5', createDefaultCube('cube-5'), 'top', 1),
      ]
      const stack = createCubeStack('big-stack', layers)

      const { getAllByTestId } = render(<CubeStack config={stack} lodLevel={3} />)
      const cubes = getAllByTestId('parametric-cube-mock')

      // At LOD 3 with 5+ layers, should show bottom, middle, and top (3 layers)
      expect(cubes).toHaveLength(3)
    })

    it('should simplify to 2 layers at LOD level 4', () => {
      const layers = [
        createStackLayer('l1', testCube1, 'bottom', 1),
        createStackLayer('l2', testCube2, 'middle', 1),
        createStackLayer('l3', testCube3, 'middle', 1),
        createStackLayer('l4', createDefaultCube('cube-4'), 'top', 1),
      ]
      const stack = createCubeStack('big-stack', layers)

      const { getAllByTestId } = render(<CubeStack config={stack} lodLevel={4} />)
      const cubes = getAllByTestId('parametric-cube-mock')

      // At LOD 4 with 3+ layers, should show only bottom and top (2 layers)
      expect(cubes).toHaveLength(2)
    })
  })

  describe('Position', () => {
    it('should apply position offset to stack', () => {
      const layers = [createStackLayer('l1', testCube1, 'single', 1)]
      const stack = createCubeStack('single-stack', layers)

      const { getAllByTestId } = render(<CubeStack config={stack} position={[5, 10, 15]} />)
      const cubes = getAllByTestId('parametric-cube-mock')

      const position = cubes[0].getAttribute('data-position')
      expect(position).toContain('5,')
      expect(position).toContain(',15')
    })
  })

  describe('Props Interface', () => {
    it('should accept all optional props', () => {
      const stack = createTestStack()
      const { getAllByTestId } = render(
        <CubeStack
          config={stack}
          position={[1, 2, 3]}
          scale={0.5}
          animate={true}
          rotationSpeed={1.0}
          gridPosition={[0, 0, 0]}
          lodLevel={1}
          centerVertically={false}
          debugLayers={true}
        />
      )
      const cubes = getAllByTestId('parametric-cube-mock')
      expect(cubes.length).toBeGreaterThan(0)
    })

    it('should work with minimal props', () => {
      const stack = createTestStack()
      const { getAllByTestId } = render(<CubeStack config={stack} />)
      const cubes = getAllByTestId('parametric-cube-mock')
      expect(cubes.length).toBeGreaterThan(0)
    })
  })
})

describe('CubeStackGrid', () => {
  const testCube = createDefaultCube('test')
  const layers = [
    createStackLayer('l1', testCube, 'bottom', 1),
    createStackLayer('l2', testCube, 'top', 1),
  ]
  const testStack = createCubeStack('grid-stack', layers)

  describe('Grid Generation', () => {
    it('should render default 3x3 grid (9 stacks)', () => {
      const { getAllByTestId } = render(<CubeStackGrid config={testStack} />)
      const cubes = getAllByTestId('parametric-cube-mock')
      // 9 stacks * 2 layers each = 18 cubes
      expect(cubes).toHaveLength(18)
    })

    it('should render custom grid size', () => {
      const { getAllByTestId } = render(<CubeStackGrid config={testStack} gridSize={[2, 2]} />)
      const cubes = getAllByTestId('parametric-cube-mock')
      // 4 stacks * 2 layers each = 8 cubes
      expect(cubes).toHaveLength(8)
    })

    it('should render single stack when gridSize is [1,1]', () => {
      const { getAllByTestId } = render(<CubeStackGrid config={testStack} gridSize={[1, 1]} />)
      const cubes = getAllByTestId('parametric-cube-mock')
      // 1 stack * 2 layers = 2 cubes
      expect(cubes).toHaveLength(2)
    })
  })

  describe('Grid Positioning', () => {
    it('should distribute stacks in X-Z plane', () => {
      // Use single-layer stack to simplify position checking
      const singleLayerStack = createCubeStack('single', [
        createStackLayer('l1', testCube, 'single', 1),
      ])

      const { getAllByTestId } = render(
        <CubeStackGrid config={singleLayerStack} gridSize={[2, 2]} stackScale={1} spacing={0} />
      )
      const cubes = getAllByTestId('parametric-cube-mock')

      const positions = cubes.map((cube) => cube.getAttribute('data-position'))
      const xzPositions = positions.map((p) => {
        const parts = p?.split(',') ?? []
        return `${parts[0]},${parts[2]}`
      })

      // Should have 4 unique X-Z positions for a 2x2 grid
      const uniqueXZ = new Set(xzPositions)
      expect(uniqueXZ.size).toBe(4)
    })
  })

  describe('Grid Props', () => {
    it('should apply spacing between stacks', () => {
      const singleLayerStack = createCubeStack('single', [
        createStackLayer('l1', testCube, 'single', 1),
      ])

      const { getAllByTestId } = render(
        <CubeStackGrid config={singleLayerStack} gridSize={[2, 1]} stackScale={1} spacing={1} />
      )
      const cubes = getAllByTestId('parametric-cube-mock')

      const positions = cubes.map((cube) => {
        const pos = cube.getAttribute('data-position')
        return pos ? pos.split(',').map(Number) : null
      })

      // With spacing 1 and stackScale 1, step is 2
      const xPositions = positions.map((p) => p?.[0] ?? 0)
      const distance = Math.abs(xPositions[1] - xPositions[0])
      expect(distance).toBeCloseTo(2)
    })

    it('should pass LOD level to all stacks', () => {
      const { getAllByTestId } = render(
        <CubeStackGrid config={testStack} gridSize={[2, 2]} lodLevel={2} />
      )
      const cubes = getAllByTestId('parametric-cube-mock')

      cubes.forEach((cube) => {
        expect(cube.getAttribute('data-lod-level')).toBe('2')
      })
    })

    it('should apply stack scale', () => {
      const singleLayerStack = createCubeStack('single', [
        createStackLayer('l1', testCube, 'single', 1),
      ])

      const { getAllByTestId } = render(
        <CubeStackGrid config={singleLayerStack} gridSize={[1, 1]} stackScale={2} />
      )
      const cubes = getAllByTestId('parametric-cube-mock')

      const scale = cubes[0].getAttribute('data-scale')
      expect(scale).toBe('2,2,2')
    })
  })
})
