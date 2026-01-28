/**
 * Unit tests for CubePreview component
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import type { SpectralCube } from '../types/cube'
import { createDefaultCube } from '../types/cube'

// Note: ResizeObserver is mocked globally in src/test/setup.ts

// Mock @react-three/fiber
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="canvas-mock">{children}</div>
  ),
  useFrame: vi.fn(),
}))

// Mock @react-three/drei
vi.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls-mock" />,
  Grid: () => <div data-testid="grid-mock" />,
  Environment: () => <div data-testid="environment-mock" />,
  ContactShadows: () => <div data-testid="contact-shadows-mock" />,
}))

// Mock ParametricCube
vi.mock('./ParametricCube', () => ({
  ParametricCube: ({ config }: { config: SpectralCube }) => (
    <div data-testid="parametric-cube-mock" data-cube-id={config.id} />
  ),
}))

// Mock cube for testing
const mockCube: SpectralCube = {
  id: 'test_cube',
  prompt: 'Test cube',
  base: {
    color: [0.5, 0.5, 0.5],
    roughness: 0.5,
    transparency: 1.0,
  },
  gradients: [
    {
      axis: 'y',
      factor: 0.3,
      color_shift: [0.1, 0.2, 0.1],
    },
  ],
  physics: {
    material: 'stone',
    density: 2.5,
    break_pattern: 'crumble',
  },
  meta: {
    name: 'Test Cube',
    tags: ['test', 'sample'],
    author: 'test',
  },
}

describe('CubePreview', () => {
  let CubePreview: typeof import('./CubePreview').CubePreview

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks()

    // Mock getBoundingClientRect to return non-zero dimensions
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 400,
      height: 300,
      top: 0,
      left: 0,
      bottom: 300,
      right: 400,
      x: 0,
      y: 0,
      toJSON: () => {},
    }))

    // Dynamic import to ensure mocks are in place
    const module = await import('./CubePreview')
    CubePreview = module.CubePreview
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('should render the container with data-testid', () => {
      render(<CubePreview config={mockCube} />)
      expect(screen.getByTestId('cube-preview')).toBeInTheDocument()
    })

    it('should render with default background color', () => {
      render(<CubePreview config={mockCube} />)
      const container = screen.getByTestId('cube-preview')
      expect(container).toHaveStyle({ background: '#1a1a1a' })
    })

    it('should render with custom background color', () => {
      render(<CubePreview config={mockCube} backgroundColor="#2a2a2a" />)
      const container = screen.getByTestId('cube-preview')
      expect(container).toHaveStyle({ background: '#2a2a2a' })
    })

    it('should apply custom className', () => {
      render(<CubePreview config={mockCube} className="custom-class" />)
      const container = screen.getByTestId('cube-preview')
      expect(container).toHaveClass('cube-preview')
      expect(container).toHaveClass('custom-class')
    })

    it('should render placeholder when no config provided', () => {
      render(<CubePreview config={null} />)
      expect(screen.getByText('Select a cube to preview')).toBeInTheDocument()
    })
  })

  describe('Canvas Rendering', () => {
    it('should render Canvas when dimensions are available', async () => {
      render(<CubePreview config={mockCube} />)

      await waitFor(() => {
        expect(screen.getByTestId('canvas-mock')).toBeInTheDocument()
      })
    })

    it('should render OrbitControls', async () => {
      render(<CubePreview config={mockCube} />)

      await waitFor(() => {
        expect(screen.getByTestId('orbit-controls-mock')).toBeInTheDocument()
      })
    })

    it('should render ParametricCube when config is provided', async () => {
      render(<CubePreview config={mockCube} />)

      await waitFor(() => {
        expect(screen.getByTestId('parametric-cube-mock')).toBeInTheDocument()
      })
    })

    it('should render Grid when showGrid is true (default)', async () => {
      render(<CubePreview config={mockCube} />)

      await waitFor(() => {
        expect(screen.getByTestId('grid-mock')).toBeInTheDocument()
      })
    })

    it('should not render Grid when showGrid is false', async () => {
      render(<CubePreview config={mockCube} showGrid={false} />)

      await waitFor(() => {
        expect(screen.queryByTestId('grid-mock')).not.toBeInTheDocument()
      })
    })

    it('should render ContactShadows when showShadows is true (default)', async () => {
      render(<CubePreview config={mockCube} />)

      await waitFor(() => {
        expect(screen.getByTestId('contact-shadows-mock')).toBeInTheDocument()
      })
    })

    it('should not render ContactShadows when showShadows is false', async () => {
      render(<CubePreview config={mockCube} showShadows={false} />)

      await waitFor(() => {
        expect(screen.queryByTestId('contact-shadows-mock')).not.toBeInTheDocument()
      })
    })
  })

  describe('Props', () => {
    it('should pass config to ParametricCube', async () => {
      render(<CubePreview config={mockCube} />)

      await waitFor(() => {
        const cube = screen.getByTestId('parametric-cube-mock')
        expect(cube).toHaveAttribute('data-cube-id', 'test_cube')
      })
    })

    it('should handle different cube configs', async () => {
      const differentCube = createDefaultCube('different_cube')

      const { rerender } = render(<CubePreview config={mockCube} />)

      await waitFor(() => {
        expect(screen.getByTestId('parametric-cube-mock')).toHaveAttribute(
          'data-cube-id',
          'test_cube'
        )
      })

      rerender(<CubePreview config={differentCube} />)

      await waitFor(() => {
        expect(screen.getByTestId('parametric-cube-mock')).toHaveAttribute(
          'data-cube-id',
          'different_cube'
        )
      })
    })
  })

  describe('Container', () => {
    it('should render container with proper styling', () => {
      render(<CubePreview config={mockCube} />)
      const container = screen.getByTestId('cube-preview')
      expect(container).toHaveStyle({ width: '100%' })
      expect(container).toHaveStyle({ height: '100%' })
    })

    it('should have border-radius for rounded corners', () => {
      render(<CubePreview config={mockCube} />)
      const container = screen.getByTestId('cube-preview')
      expect(container).toHaveStyle({ borderRadius: '8px' })
    })

    it('should handle overflow hidden', () => {
      render(<CubePreview config={mockCube} />)
      const container = screen.getByTestId('cube-preview')
      expect(container).toHaveStyle({ overflow: 'hidden' })
    })
  })

  describe('Accessibility', () => {
    it('should have minimum height for touch targets', () => {
      render(<CubePreview config={mockCube} />)
      const container = screen.getByTestId('cube-preview')
      expect(container).toHaveStyle({ minHeight: '200px' })
    })

    it('should disable touch-action on container', () => {
      render(<CubePreview config={mockCube} />)
      const container = screen.getByTestId('cube-preview')
      // Check for touch-action in style attribute directly as jsdom might not parse it
      expect(container.style.touchAction).toBe('none')
    })
  })
})

describe('CubePreview Integration', () => {
  it('should export CubePreview as named export', async () => {
    const module = await import('./CubePreview')
    expect(module.CubePreview).toBeDefined()
    expect(typeof module.CubePreview).toBe('function')
  })

  it('should export CubePreview as default export', async () => {
    const module = await import('./CubePreview')
    expect(module.default).toBeDefined()
    expect(module.default).toBe(module.CubePreview)
  })
})

describe('CubePreviewProps Interface', () => {
  let CubePreview: typeof import('./CubePreview').CubePreview

  beforeEach(async () => {
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 400,
      height: 300,
      top: 0,
      left: 0,
      bottom: 300,
      right: 400,
      x: 0,
      y: 0,
      toJSON: () => {},
    }))

    const module = await import('./CubePreview')
    CubePreview = module.CubePreview
  })

  it('should accept all optional props', () => {
    const onControlsChange = vi.fn()

    // This should not throw
    expect(() => {
      render(
        <CubePreview
          config={mockCube}
          showGrid={true}
          animate={true}
          rotationSpeed={1.0}
          showShadows={true}
          backgroundColor="#333"
          className="test-class"
          onControlsChange={onControlsChange}
        />
      )
    }).not.toThrow()
  })

  it('should work with minimal props', () => {
    // This should not throw
    expect(() => {
      render(<CubePreview config={null} />)
    }).not.toThrow()
  })
})
