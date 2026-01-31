/**
 * Unit tests for ParamEditor Vue component
 * Tests the Vue.js 3.0 migration of the ParamEditor component (TASK 63)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import ParamEditor from './ParamEditor.vue'
import type { SpectralCube } from '../types/cube'
import { createDefaultCube, CUBE_DEFAULTS } from '../types/cube'

// Mock LODConfigEditor child component
vi.mock('./LODConfigEditor.vue', () => ({
  default: {
    name: 'LODConfigEditor',
    template: '<div data-testid="lod-config-editor">LODConfigEditor</div>',
    props: ['config', 'onConfigChange', 'statistics', 'showAdvanced'],
  },
}))

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

describe('ParamEditor Vue Component', () => {
  let mockOnCubeUpdate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockOnCubeUpdate = vi.fn()
  })

  describe('Empty state', () => {
    it('renders empty state when no cube is provided', () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: null },
      })
      expect(wrapper.text()).toContain('No cube selected')
      expect(wrapper.text()).toContain('Select a cube from the gallery or create a new one')
    })
  })

  describe('With cube', () => {
    let testCube: SpectralCube

    beforeEach(() => {
      testCube = createDefaultCube('test-cube')
      testCube.meta = {
        name: 'Test Cube',
        created: new Date().toISOString(),
      }
    })

    it('renders the editor title', () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.text()).toContain('Edit Parameters')
    })

    it('renders the cube name input', () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube },
      })
      const nameInput = wrapper.find('#cube-name')
      expect(nameInput.exists()).toBe(true)
      expect((nameInput.element as HTMLInputElement).value).toBe('Test Cube')
    })

    it('renders reset button', () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube },
      })
      const resetBtn = wrapper.find('.param-editor__reset-btn')
      expect(resetBtn.exists()).toBe(true)
      expect(resetBtn.text()).toContain('Reset')
    })

    it('renders section headers', () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.text()).toContain('Base Properties')
      expect(wrapper.text()).toContain('Gradients')
      expect(wrapper.text()).toContain('Noise Settings')
      expect(wrapper.text()).toContain('Physics Properties')
      expect(wrapper.text()).toContain('Boundary Settings')
    })
  })

  describe('Base Properties section', () => {
    let testCube: SpectralCube

    beforeEach(() => {
      testCube = createDefaultCube('test-cube')
      testCube.base = {
        color: [0.5, 0.5, 0.5],
        roughness: 0.5,
        transparency: 1.0,
      }
    })

    it('renders base color picker', () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube },
      })
      const colorInput = wrapper.find('#base-color')
      expect(colorInput.exists()).toBe(true)
    })

    it('renders roughness slider', () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube },
      })
      const roughnessSlider = wrapper.find('#base-roughness')
      expect(roughnessSlider.exists()).toBe(true)
    })

    it('renders opacity slider', () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube },
      })
      const opacitySlider = wrapper.find('#base-transparency')
      expect(opacitySlider.exists()).toBe(true)
    })

    it('calls onCubeUpdate when roughness is changed', async () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube, onCubeUpdate: mockOnCubeUpdate },
      })
      const roughnessSlider = wrapper.find('#base-roughness')
      await roughnessSlider.setValue('0.8')
      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.base.roughness).toBe(0.8)
    })

    it('calls onCubeUpdate when opacity is changed', async () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube, onCubeUpdate: mockOnCubeUpdate },
      })
      const opacitySlider = wrapper.find('#base-transparency')
      await opacitySlider.setValue('0.7')
      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.base.transparency).toBe(0.7)
    })
  })

  describe('Gradients section', () => {
    let testCube: SpectralCube

    beforeEach(() => {
      testCube = createDefaultCube('test-cube')
      testCube.gradients = []
    })

    it('renders add gradient button', () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.text()).toContain('+ Add Gradient')
    })

    it('adds a gradient when add button is clicked', async () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube, onCubeUpdate: mockOnCubeUpdate },
      })
      const addButton = wrapper.find('.param-editor__add-btn')
      await addButton.trigger('click')
      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.gradients).toHaveLength(1)
    })

    it('renders gradient controls when gradients exist', () => {
      testCube.gradients = [{ axis: 'y', factor: 0.5, color_shift: [0.2, 0.1, 0.0] }]
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.text()).toContain('Gradient 1')
      expect(wrapper.text()).toContain('X')
      expect(wrapper.text()).toContain('Y')
      expect(wrapper.text()).toContain('Z')
      expect(wrapper.text()).toContain('RADIAL')
    })

    it('removes a gradient when remove button is clicked', async () => {
      testCube.gradients = [{ axis: 'y', factor: 0.5, color_shift: [0.2, 0.1, 0.0] }]
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube, onCubeUpdate: mockOnCubeUpdate },
      })
      const removeButton = wrapper.find('.param-editor__remove-btn')
      await removeButton.trigger('click')
      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.gradients).toHaveLength(0)
    })

    it('updates gradient axis when axis button is clicked', async () => {
      testCube.gradients = [{ axis: 'y', factor: 0.5, color_shift: [0.2, 0.1, 0.0] }]
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube, onCubeUpdate: mockOnCubeUpdate },
      })
      const axisButtons = wrapper.findAll('.param-editor__axis-btn')
      // First button is X
      await axisButtons[0].trigger('click')
      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.gradients[0].axis).toBe('x')
    })
  })

  describe('Noise section', () => {
    let testCube: SpectralCube

    beforeEach(() => {
      testCube = createDefaultCube('test-cube')
    })

    it('renders noise type selector', () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube },
      })
      const noiseTypeSelect = wrapper.find('#noise-type')
      expect(noiseTypeSelect.exists()).toBe(true)
    })

    it('renders noise scale slider', () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.find('#noise-scale').exists()).toBe(true)
    })

    it('renders noise octaves slider', () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.find('#noise-octaves').exists()).toBe(true)
    })

    it('renders noise persistence slider', () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.find('#noise-persistence').exists()).toBe(true)
    })

    it('renders noise mask selector', () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.find('#noise-mask').exists()).toBe(true)
    })

    it('calls onCubeUpdate when noise type is changed', async () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube, onCubeUpdate: mockOnCubeUpdate },
      })
      const typeSelect = wrapper.find('#noise-type')
      await typeSelect.setValue('worley')
      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.noise.type).toBe('worley')
    })
  })

  describe('Physics section', () => {
    let testCube: SpectralCube

    beforeEach(() => {
      testCube = createDefaultCube('test-cube')
    })

    it('renders material type selector', () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.find('#physics-material').exists()).toBe(true)
    })

    it('renders density slider', () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.find('#physics-density').exists()).toBe(true)
    })

    it('renders break pattern selector', () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.find('#physics-break-pattern').exists()).toBe(true)
    })

    it('calls onCubeUpdate when material is changed', async () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube, onCubeUpdate: mockOnCubeUpdate },
      })
      await wrapper.find('#physics-material').setValue('wood')
      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.physics.material).toBe('wood')
    })

    it('calls onCubeUpdate when density is changed', async () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube, onCubeUpdate: mockOnCubeUpdate },
      })
      await wrapper.find('#physics-density').setValue('5.0')
      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.physics.density).toBe(5.0)
    })
  })

  describe('Section toggling', () => {
    let testCube: SpectralCube

    beforeEach(() => {
      testCube = createDefaultCube('test-cube')
    })

    it('collapses section when header is clicked', async () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.find('#base-color').exists()).toBe(true)

      const baseHeader = wrapper.findAll('.param-editor__section-header').find((el) =>
        el.text().includes('Base Properties')
      )
      await baseHeader!.trigger('click')
      expect(wrapper.find('#base-color').exists()).toBe(false)
    })

    it('expands section when collapsed header is clicked', async () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube },
      })
      const baseHeader = wrapper.findAll('.param-editor__section-header').find((el) =>
        el.text().includes('Base Properties')
      )

      await baseHeader!.trigger('click')
      expect(wrapper.find('#base-color').exists()).toBe(false)

      await baseHeader!.trigger('click')
      expect(wrapper.find('#base-color').exists()).toBe(true)
    })
  })

  describe('Reset functionality', () => {
    let testCube: SpectralCube

    beforeEach(() => {
      testCube = createDefaultCube('test-cube')
      testCube.base = {
        color: [1, 0, 0],
        roughness: 0.9,
        transparency: 0.5,
      }
      testCube.gradients = [{ axis: 'y', factor: 0.5, color_shift: [0.2, 0.1, 0.0] }]
    })

    it('resets cube to default values when reset button is clicked', async () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube, onCubeUpdate: mockOnCubeUpdate },
      })
      await wrapper.find('.param-editor__reset-btn').trigger('click')

      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const resetCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(resetCube.base.roughness).toBe(0.5)
      expect(resetCube.base.transparency).toBe(1.0)
      expect(resetCube.gradients).toEqual([])
    })
  })

  describe('Name editing', () => {
    let testCube: SpectralCube

    beforeEach(() => {
      testCube = createDefaultCube('test-cube')
      testCube.meta = { name: 'Original Name' }
    })

    it('updates cube name when input changes', async () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube, onCubeUpdate: mockOnCubeUpdate },
      })
      await wrapper.find('#cube-name').setValue('New Name')

      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.meta.name).toBe('New Name')
    })
  })

  describe('Custom className', () => {
    it('applies custom className', () => {
      const testCube = createDefaultCube('test-cube')
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube, className: 'custom-class' },
      })
      const editor = wrapper.find('.param-editor')
      expect(editor.classes()).toContain('custom-class')
    })
  })

  describe('Boundary Settings section', () => {
    let testCube: SpectralCube

    beforeEach(() => {
      testCube = createDefaultCube('test-cube')
    })

    it('renders Boundary Settings section header', () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.text()).toContain('Boundary Settings')
    })

    it('renders boundary mode selector', () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.find('#boundary-mode').exists()).toBe(true)
    })

    it('renders neighbor influence slider', () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.find('#boundary-neighbor-influence').exists()).toBe(true)
    })

    it('displays mode descriptions', () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.text()).toContain('Smooth interpolation at edges')
    })

    it('calls onCubeUpdate when boundary mode is changed', async () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube, onCubeUpdate: mockOnCubeUpdate },
      })
      await wrapper.find('#boundary-mode').setValue('hard')
      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.boundary.mode).toBe('hard')
    })

    it('calls onCubeUpdate when neighbor influence is changed', async () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube, onCubeUpdate: mockOnCubeUpdate },
      })
      await wrapper.find('#boundary-neighbor-influence').setValue('0.8')
      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.boundary.neighbor_influence).toBe(0.8)
    })

    it('displays hint text about boundary settings', () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.text()).toContain(
        'Controls how this cube blends with neighboring cubes in a grid.'
      )
    })

    it('displays neighbor influence description', () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.text()).toContain(
        'How much neighboring cubes affect the color and gradient blending at edges.'
      )
    })

    it('can collapse and expand boundary section', async () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube },
      })
      const boundaryHeader = wrapper.findAll('.param-editor__section-header').find((el) =>
        el.text().includes('Boundary Settings')
      )

      expect(wrapper.find('#boundary-mode').exists()).toBe(true)
      await boundaryHeader!.trigger('click')
      expect(wrapper.find('#boundary-mode').exists()).toBe(false)
      await boundaryHeader!.trigger('click')
      expect(wrapper.find('#boundary-mode').exists()).toBe(true)
    })

    it('shows default boundary values from CUBE_DEFAULTS', () => {
      const wrapper = shallowMount(ParamEditor, {
        props: { currentCube: testCube },
      })
      const modeSelect = wrapper.find('#boundary-mode')
      expect((modeSelect.element as HTMLSelectElement).value).toBe('smooth')

      const influenceSlider = wrapper.find('#boundary-neighbor-influence')
      expect((influenceSlider.element as HTMLInputElement).value).toBe('0.5')
    })
  })
})
