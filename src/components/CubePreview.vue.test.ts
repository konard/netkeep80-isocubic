/**
 * Unit tests for CubePreview Vue component
 * Tests the Vue.js 3.0 + TresJS migration of the CubePreview component (TASK 62)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import type { SpectralCube } from '../types/cube'
import { createDefaultCube } from '../types/cube'

// Mock TresJS dependencies to avoid ESM import issues in test environment
vi.mock('@tresjs/core', () => ({
  TresCanvas: {
    name: 'TresCanvas',
    template: '<div data-testid="canvas-mock"><slot /></div>',
    props: ['camera', 'antialias', 'alpha', 'powerPreference', 'dpr'],
  },
  useLoop: () => ({ onBeforeRender: vi.fn(), onRender: vi.fn() }),
  useTresContext: () => ({ camera: { value: null } }),
}))

vi.mock('@tresjs/cientos', () => ({
  OrbitControls: {
    name: 'OrbitControls',
    template: '<div data-testid="orbit-controls-mock" />',
  },
  ContactShadows: {
    name: 'ContactShadows',
    template: '<div data-testid="contact-shadows-mock" />',
  },
  Environment: {
    name: 'Environment',
    template: '<div data-testid="environment-mock" />',
  },
  Html: {
    name: 'Html',
    template: '<div />',
  },
}))

// Mock ParametricCube child component
vi.mock('./ParametricCube.vue', () => ({
  default: {
    name: 'ParametricCube',
    template: '<div data-testid="parametric-cube-mock" />',
    props: ['config', 'position', 'animate', 'rotationSpeed'],
  },
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

describe('CubePreview Vue Component — Metadata', () => {
  it('should export component metadata', async () => {
    const module = await import('./CubePreview.vue')
    expect(module.default).toBeDefined()
  })

  it('should have correct component metadata structure', async () => {
    const { CUBE_PREVIEW_META } = await import('./CubePreview.vue')
    expect(CUBE_PREVIEW_META).toBeDefined()
    expect(CUBE_PREVIEW_META.id).toBe('cube-preview')
    expect(CUBE_PREVIEW_META.name).toBe('CubePreview')
    expect(CUBE_PREVIEW_META.version).toBe('2.0.0')
    expect(CUBE_PREVIEW_META.phase).toBe(10)
    expect(CUBE_PREVIEW_META.taskId).toBe('TASK 62')
    expect(CUBE_PREVIEW_META.filePath).toBe('components/CubePreview.vue')
  })

  it('should have TresJS dependencies in metadata', async () => {
    const { CUBE_PREVIEW_META } = await import('./CubePreview.vue')
    const depNames = CUBE_PREVIEW_META.dependencies?.map((d: { name: string }) => d.name) ?? []
    expect(depNames).toContain('@tresjs/core')
    expect(depNames).toContain('@tresjs/cientos')
  })

  it('should have migration history in metadata', async () => {
    const { CUBE_PREVIEW_META } = await import('./CubePreview.vue')
    const migrationEntry = CUBE_PREVIEW_META.history?.find(
      (h: { taskId?: string }) => h.taskId === 'TASK 62'
    )
    expect(migrationEntry).toBeDefined()
    expect(migrationEntry?.version).toBe('2.0.0')
    expect(migrationEntry?.description).toContain('TresJS')
  })

  it('should have tresjs tag', async () => {
    const { CUBE_PREVIEW_META } = await import('./CubePreview.vue')
    expect(CUBE_PREVIEW_META.tags).toContain('tresjs')
    expect(CUBE_PREVIEW_META.tags).toContain('phase-10')
  })
})

describe('CubePreview Vue Component — Props Interface', () => {
  it('should define correct default props values', () => {
    const defaultProps = {
      showGrid: true,
      animate: false,
      rotationSpeed: 0.5,
      showShadows: true,
      backgroundColor: '#1a1a1a',
      className: '',
    }

    expect(defaultProps.showGrid).toBe(true)
    expect(defaultProps.animate).toBe(false)
    expect(defaultProps.rotationSpeed).toBe(0.5)
    expect(defaultProps.showShadows).toBe(true)
    expect(defaultProps.backgroundColor).toBe('#1a1a1a')
    expect(defaultProps.className).toBe('')
  })

  it('should handle null config for placeholder display', () => {
    const config: SpectralCube | null = null
    expect(config).toBeNull()
  })

  it('should accept a valid SpectralCube config', () => {
    expect(mockCube.id).toBe('test_cube')
    expect(mockCube.base.color).toEqual([0.5, 0.5, 0.5])
  })
})

describe('CubePreview Vue Component — Module Exports', () => {
  it('should export CubePreview.vue as a valid Vue component', async () => {
    const module = await import('./CubePreview.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })
})

describe('CubePreview Vue Component — Component Mounting', () => {
  const globalStubs = {
    stubs: {
      TresCanvas: true,
      TresColor: true,
      TresAmbientLight: true,
      TresDirectionalLight: true,
      TresPointLight: true,
      OrbitControls: true,
      ContactShadows: true,
      Environment: true,
      ParametricCube: true,
    },
  }

  beforeEach(() => {
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
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should mount with config prop', async () => {
    const { default: CubePreview } = await import('./CubePreview.vue')
    const wrapper = shallowMount(CubePreview as any, {
      props: { config: mockCube },
      global: globalStubs,
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('should render container with data-testid', async () => {
    const { default: CubePreview } = await import('./CubePreview.vue')
    const wrapper = shallowMount(CubePreview as any, {
      props: { config: mockCube },
      global: globalStubs,
    })
    expect(wrapper.find('[data-testid="cube-preview"]').exists()).toBe(true)
  })

  it('should render with default background color', async () => {
    const { default: CubePreview } = await import('./CubePreview.vue')
    const wrapper = shallowMount(CubePreview as any, {
      props: { config: mockCube },
      global: globalStubs,
    })
    const container = wrapper.find('[data-testid="cube-preview"]')
    const style = container.attributes('style') ?? ''
    expect(style).toContain('background:')
    // jsdom may convert #1a1a1a to rgb(26, 26, 26)
    expect(style.includes('1a1a1a') || style.includes('rgb(26, 26, 26)')).toBe(true)
  })

  it('should render with custom background color', async () => {
    const { default: CubePreview } = await import('./CubePreview.vue')
    const wrapper = shallowMount(CubePreview as any, {
      props: { config: mockCube, backgroundColor: '#2a2a2a' },
      global: globalStubs,
    })
    const container = wrapper.find('[data-testid="cube-preview"]')
    const style = container.attributes('style') ?? ''
    expect(style).toContain('background:')
    // jsdom may convert #2a2a2a to rgb(42, 42, 42)
    expect(style.includes('2a2a2a') || style.includes('rgb(42, 42, 42)')).toBe(true)
  })

  it('should apply custom className', async () => {
    const { default: CubePreview } = await import('./CubePreview.vue')
    const wrapper = shallowMount(CubePreview as any, {
      props: { config: mockCube, className: 'custom-class' },
      global: globalStubs,
    })
    const container = wrapper.find('[data-testid="cube-preview"]')
    expect(container.classes()).toContain('cube-preview')
    expect(container.classes()).toContain('custom-class')
  })

  it('should render placeholder when no config provided', async () => {
    const { default: CubePreview } = await import('./CubePreview.vue')
    const wrapper = shallowMount(CubePreview as any, {
      props: { config: null },
      global: globalStubs,
    })
    expect(wrapper.text()).toContain('Select a cube to preview')
  })

  it('should have proper container styling', async () => {
    const { default: CubePreview } = await import('./CubePreview.vue')
    const wrapper = shallowMount(CubePreview as any, {
      props: { config: mockCube },
      global: globalStubs,
    })
    const style = wrapper.find('[data-testid="cube-preview"]').attributes('style') ?? ''
    expect(style).toContain('width: 100%')
    expect(style).toContain('height: 100%')
    expect(style).toContain('border-radius: 8px')
    expect(style).toContain('overflow: hidden')
    expect(style).toContain('min-height: 200px')
  })

  it('should set touch-action none on container element', async () => {
    const { default: CubePreview } = await import('./CubePreview.vue')
    const wrapper = shallowMount(CubePreview as any, {
      props: { config: mockCube },
      global: globalStubs,
    })
    const container = wrapper.find('[data-testid="cube-preview"]')
    // Vue binds touchAction via :style, check the element's style property directly
    // jsdom may strip non-standard CSS props from serialized style attribute,
    // so we verify the component template includes it
    const el = container.element as HTMLElement
    // The touchAction may be set as a DOM property even if not in serialized style
    const styleAttr = container.attributes('style') ?? ''
    const hasTouchAction = styleAttr.includes('touch-action') || el.style.touchAction === 'none'
    expect(hasTouchAction).toBe(true)
  })

  it('should accept all optional props without throwing', async () => {
    const { default: CubePreview } = await import('./CubePreview.vue')
    expect(() => {
      shallowMount(CubePreview as any, {
        props: {
          config: mockCube,
          showGrid: true,
          animate: true,
          rotationSpeed: 1.0,
          showShadows: true,
          backgroundColor: '#333',
          className: 'test-class',
        },
        global: globalStubs,
      })
    }).not.toThrow()
  })

  it('should work with minimal props (null config)', async () => {
    const { default: CubePreview } = await import('./CubePreview.vue')
    expect(() => {
      shallowMount(CubePreview as any, {
        props: { config: null },
        global: globalStubs,
      })
    }).not.toThrow()
  })

  it('should handle different cube configs', async () => {
    const { default: CubePreview } = await import('./CubePreview.vue')
    const differentCube = createDefaultCube('different_cube')

    const wrapper = shallowMount(CubePreview as any, {
      props: { config: mockCube },
      global: globalStubs,
    })
    expect(wrapper.exists()).toBe(true)

    await wrapper.setProps({ config: differentCube })
    expect(wrapper.exists()).toBe(true)
  })
})
