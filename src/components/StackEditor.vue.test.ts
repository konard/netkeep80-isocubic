/**
 * Unit tests for StackEditor Vue component
 * Tests the Vue.js 3.0 migration of the StackEditor component (TASK 63)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import StackEditor from './StackEditor.vue'
import type { CubeStackConfig, StackLayer } from '../types/stack'
import { createCubeStack, createStackLayer } from '../types/stack'
import { createDefaultCube } from '../types/cube'

// Mock StackPresetPicker child component
vi.mock('./StackPresetPicker.vue', () => ({
  default: {
    name: 'StackPresetPicker',
    template: '<div class="mock-stack-preset-picker"></div>',
    props: ['currentStack', 'isOpen'],
    emits: ['applyPreset', 'close'],
  },
}))

describe('StackEditor Vue Component — Module Exports', () => {
  it('should export StackEditor.vue as a valid Vue component', async () => {
    const module = await import('./StackEditor.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })
})

describe('StackEditor Vue Component — Stack Operations', () => {
  it('should create a valid cube stack', () => {
    const cube = createDefaultCube('stack_cube_001')
    const layer = createStackLayer('layer_001', cube)
    const stack = createCubeStack('stack_001', [layer])
    expect(stack).toBeDefined()
    expect(stack.layers).toBeDefined()
    expect(Array.isArray(stack.layers)).toBe(true)
  })

  it('should validate stack layer order', () => {
    const cube1 = createDefaultCube('stack_cube_001')
    const cube2 = createDefaultCube('stack_cube_002')
    const layer1 = createStackLayer('layer_001', cube1)
    const layer2 = createStackLayer('layer_002', cube2)
    const stack = createCubeStack('stack_002', [layer1, layer2])
    expect(stack.layers).toHaveLength(2)
    for (let i = 0; i < stack.layers.length; i++) {
      expect(stack.layers[i]).toBeDefined()
    }
  })

  it('should support drag and drop reordering logic', () => {
    const layers = ['A', 'B', 'C', 'D']
    const dragIndex = 1
    const dropIndex = 3
    const item = layers[dragIndex]
    const reordered = [...layers]
    reordered.splice(dragIndex, 1)
    reordered.splice(dropIndex, 0, item)
    expect(reordered).toEqual(['A', 'C', 'D', 'B'])
  })
})

// Helper to create a test stack
function createTestStack(numLayers: number = 2): CubeStackConfig {
  const layers: StackLayer[] = []
  for (let i = 0; i < numLayers; i++) {
    const cube = createDefaultCube(`test-cube-${i}`)
    cube.base.color = [0.5 + i * 0.1, 0.4, 0.3]
    const layer = createStackLayer(`layer-${i}`, cube)
    layer.name = `Test Layer ${i + 1}`
    layer.height = 1 + i * 0.5
    layers.push(layer)
  }
  const stack = createCubeStack('test-stack', layers, 'Test stack prompt')
  stack.meta = {
    name: 'Test Stack',
    created: new Date().toISOString(),
  }
  return stack
}

describe('StackEditor Vue Component', () => {
  describe('Empty state', () => {
    it('renders empty state when no stack is provided', () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: null },
      })
      expect(wrapper.text()).toContain('No stack selected')
      expect(wrapper.text()).toContain('Create a new stack or select one from the gallery')
    })

    it('renders create new stack button in empty state', () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: null },
      })
      expect(wrapper.text()).toContain('Create New Stack')
    })

    it('creates a new stack when create button is clicked', async () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: null },
      })
      await wrapper.find('.stack-editor__create-btn').trigger('click')

      expect(wrapper.emitted('update:stack')).toBeTruthy()
      const newStack = wrapper.emitted('update:stack')![0][0] as CubeStackConfig
      expect(newStack.layers).toHaveLength(1)
      expect(newStack.layers[0].name).toBe('Layer 1')
    })
  })

  describe('With stack', () => {
    let testStack: CubeStackConfig

    beforeEach(() => {
      testStack = createTestStack(2)
    })

    it('renders the editor title', () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })
      expect(wrapper.text()).toContain('Stack Editor')
    })

    it('renders the stack name input', () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })
      const nameInput = wrapper.find('#stack-name')
      expect(nameInput.exists()).toBe(true)
      expect((nameInput.element as HTMLInputElement).value).toBe('Test Stack')
    })

    it('renders reset button', () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })
      const resetBtn = wrapper.find('.stack-editor__reset-btn')
      expect(resetBtn.exists()).toBe(true)
      expect(resetBtn.text()).toBe('Reset')
    })

    it('renders section headers', () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })
      expect(wrapper.text()).toMatch(/Layers/)
      expect(wrapper.text()).toContain('Stack Physics')
    })

    it('renders stack summary with layer count and total height', () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })
      expect(wrapper.text()).toContain('Layers:')
      expect(wrapper.text()).toContain('2')
      expect(wrapper.text()).toContain('Total Height:')
    })

    it('updates stack name when input is changed', async () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })
      await wrapper.find('#stack-name').setValue('New Stack Name')

      expect(wrapper.emitted('update:stack')).toBeTruthy()
      const updatedStack = wrapper.emitted('update:stack')![0][0] as CubeStackConfig
      expect(updatedStack.meta?.name).toBe('New Stack Name')
    })
  })

  describe('Layers section', () => {
    let testStack: CubeStackConfig

    beforeEach(() => {
      testStack = createTestStack(3)
    })

    it('renders layer count in section header', () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })
      expect(wrapper.text()).toContain('Layers (3)')
    })

    it('renders add layer button', () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })
      expect(wrapper.text()).toContain('+ Add Layer')
    })

    it('renders all layers', () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })
      expect(wrapper.text()).toContain('Test Layer 1')
      expect(wrapper.text()).toContain('Test Layer 2')
      expect(wrapper.text()).toContain('Test Layer 3')
    })

    it('renders layer position indicators', () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })
      expect(wrapper.text()).toContain('(bottom)')
      expect(wrapper.text()).toContain('(middle)')
      expect(wrapper.text()).toContain('(top)')
    })

    it('adds a new layer when add button is clicked', async () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })
      await wrapper.find('.stack-editor__add-btn').trigger('click')

      expect(wrapper.emitted('update:stack')).toBeTruthy()
      const updatedStack = wrapper.emitted('update:stack')![0][0] as CubeStackConfig
      expect(updatedStack.layers).toHaveLength(4)
    })

    it('removes a layer when remove button is clicked', async () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })

      const removeButtons = wrapper.findAll('.stack-editor__layer-remove-btn')
      await removeButtons[0].trigger('click')

      expect(wrapper.emitted('update:stack')).toBeTruthy()
      const updatedStack = wrapper.emitted('update:stack')![0][0] as CubeStackConfig
      expect(updatedStack.layers).toHaveLength(2)
    })

    it('does not allow removing the last layer', () => {
      const singleLayerStack = createTestStack(1)
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: singleLayerStack },
      })

      const removeButton = wrapper.find('.stack-editor__layer-remove-btn')
      expect((removeButton.element as HTMLButtonElement).disabled).toBe(true)
    })

    it('renders move up and move down buttons for layers', () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })

      const moveUpButtons = wrapper.findAll('[aria-label="Move layer up"]')
      const moveDownButtons = wrapper.findAll('[aria-label="Move layer down"]')

      expect(moveUpButtons.length).toBe(3)
      expect(moveDownButtons.length).toBe(3)
    })
  })

  describe('Layer expansion and editing', () => {
    let testStack: CubeStackConfig

    beforeEach(() => {
      testStack = createTestStack(2)
    })

    it('expands layer details when layer title is clicked', async () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })

      const layerTitles = wrapper.findAll('.stack-editor__layer-title')
      // Layers are in reverse order (top first), find Test Layer 1 (bottom)
      const layer1Title = layerTitles.find((t) => t.text().includes('Test Layer 1'))
      await layer1Title!.trigger('click')

      expect(wrapper.text()).toContain('Height')
      expect(wrapper.text()).toContain('Edit Cube Parameters')
    })

    it('emits editLayerCube when edit cube button is clicked', async () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })

      // Expand a layer
      const layerTitles = wrapper.findAll('.stack-editor__layer-title')
      const layer1Title = layerTitles.find((t) => t.text().includes('Test Layer 1'))
      await layer1Title!.trigger('click')

      // Click edit cube button
      await wrapper.find('.stack-editor__edit-cube-btn').trigger('click')

      expect(wrapper.emitted('editLayerCube')).toBeTruthy()
    })
  })

  describe('Transition settings', () => {
    let testStack: CubeStackConfig

    beforeEach(() => {
      testStack = createTestStack(3)
    })

    it('shows transition settings for non-top layers when expanded', async () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })

      // Expand the bottom layer
      const layerTitles = wrapper.findAll('.stack-editor__layer-title')
      const layer1Title = layerTitles.find((t) => t.text().includes('Test Layer 1'))
      await layer1Title!.trigger('click')

      expect(wrapper.text()).toContain('Transition to Next Layer')
    })

    it('does not show transition settings for top layer', async () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })

      // Expand the top layer
      const layerTitles = wrapper.findAll('.stack-editor__layer-title')
      const layer3Title = layerTitles.find((t) => t.text().includes('Test Layer 3'))
      await layer3Title!.trigger('click')

      expect(wrapper.text()).not.toContain('Transition to Next Layer')
    })

    it('renders blend height slider', async () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })

      const layerTitles = wrapper.findAll('.stack-editor__layer-title')
      const layer1Title = layerTitles.find((t) => t.text().includes('Test Layer 1'))
      await layer1Title!.trigger('click')

      expect(wrapper.text()).toContain('Blend Height')
    })

    it('renders blend noise checkbox', async () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })

      const layerTitles = wrapper.findAll('.stack-editor__layer-title')
      const layer1Title = layerTitles.find((t) => t.text().includes('Test Layer 1'))
      await layer1Title!.trigger('click')

      expect(wrapper.text()).toContain('Blend Noise')
    })

    it('renders blend gradients checkbox', async () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })

      const layerTitles = wrapper.findAll('.stack-editor__layer-title')
      const layer1Title = layerTitles.find((t) => t.text().includes('Test Layer 1'))
      await layer1Title!.trigger('click')

      expect(wrapper.text()).toContain('Blend Gradients')
    })
  })

  describe('Stack Physics section', () => {
    let testStack: CubeStackConfig

    beforeEach(() => {
      testStack = createTestStack(2)
    })

    it('renders stability indicator', () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })
      expect(wrapper.text()).toContain('Stability:')
    })

    it('renders total weight indicator', () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })
      expect(wrapper.text()).toContain('Total Weight:')
    })

    it('renders structural integrity indicator', () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })
      expect(wrapper.text()).toContain('Structural Integrity')
    })

    it('renders weight distribution slider', () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })
      expect(wrapper.text()).toContain('Weight Distribution')
    })

    it('renders is stable checkbox', () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })
      expect(wrapper.text()).toContain('Mark as Stable')
    })

    it('shows stable status in green', () => {
      testStack.physics = {
        ...testStack.physics!,
        isStable: true,
        structuralIntegrity: 1.0,
      }
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })
      const statusElement = wrapper.find('.stack-editor__physics-status')
      expect(statusElement.text()).toBe('Stable')
      expect(statusElement.attributes('style')).toContain('rgb(34, 197, 94)')
    })

    it('shows warning status in orange for medium integrity', () => {
      testStack.physics = {
        ...testStack.physics!,
        isStable: true,
        structuralIntegrity: 0.5,
      }
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })
      const statusElement = wrapper.find('.stack-editor__physics-status')
      expect(statusElement.text()).toBe('Warning')
      expect(statusElement.attributes('style')).toContain('rgb(245, 158, 11)')
    })

    it('shows unstable status in red for low integrity', () => {
      testStack.physics = {
        ...testStack.physics!,
        isStable: false,
        structuralIntegrity: 0.2,
      }
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })
      const statusElement = wrapper.find('.stack-editor__physics-status')
      expect(statusElement.text()).toBe('Unstable')
      expect(statusElement.attributes('style')).toContain('rgb(239, 68, 68)')
    })
  })

  describe('Section toggling', () => {
    let testStack: CubeStackConfig

    beforeEach(() => {
      testStack = createTestStack(2)
    })

    it('collapses layers section when header is clicked', async () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })

      expect(wrapper.text()).toContain('+ Add Layer')

      const sectionHeaders = wrapper.findAll('.stack-editor__section-header')
      const layersHeader = sectionHeaders.find((h) => h.text().includes('Layers'))
      await layersHeader!.trigger('click')

      expect(wrapper.text()).not.toContain('+ Add Layer')
    })

    it('expands section when collapsed header is clicked', async () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })

      const sectionHeaders = wrapper.findAll('.stack-editor__section-header')
      const layersHeader = sectionHeaders.find((h) => h.text().includes('Layers'))
      await layersHeader!.trigger('click')
      expect(wrapper.text()).not.toContain('+ Add Layer')

      await layersHeader!.trigger('click')
      expect(wrapper.text()).toContain('+ Add Layer')
    })
  })

  describe('Reset functionality', () => {
    let testStack: CubeStackConfig

    beforeEach(() => {
      testStack = createTestStack(3)
      testStack.meta = { name: 'Custom Stack' }
    })

    it('resets stack to default when reset button is clicked', async () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })

      await wrapper.find('.stack-editor__reset-btn').trigger('click')

      expect(wrapper.emitted('update:stack')).toBeTruthy()
      const resetStack = wrapper.emitted('update:stack')![0][0] as CubeStackConfig
      expect(resetStack.layers).toHaveLength(1)
      expect(resetStack.layers[0].name).toBe('Layer 1')
    })
  })

  describe('Drag and drop', () => {
    let testStack: CubeStackConfig

    beforeEach(() => {
      testStack = createTestStack(3)
    })

    it('layers are draggable', () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })

      const layers = wrapper.findAll('.stack-editor__layer')
      layers.forEach((layer) => {
        expect(layer.attributes('draggable')).toBe('true')
      })
    })

    it('renders drag handles', () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })

      const dragHandles = wrapper.findAll('.stack-editor__layer-drag-handle')
      expect(dragHandles.length).toBe(3)
    })
  })

  describe('Total height calculation', () => {
    it('calculates total height correctly', () => {
      const stack = createTestStack(3)
      stack.layers[0].height = 1.0
      stack.layers[1].height = 1.5
      stack.layers[2].height = 2.0

      const updatedStack = createCubeStack(stack.id, stack.layers, stack.prompt)
      expect(updatedStack.totalHeight).toBe(4.5)
    })

    it('updates total height when layer is added', async () => {
      const stack = createTestStack(2)
      stack.totalHeight = 2.5

      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: stack },
      })

      await wrapper.find('.stack-editor__add-btn').trigger('click')

      expect(wrapper.emitted('update:stack')).toBeTruthy()
      const updatedStack = wrapper.emitted('update:stack')![0][0] as CubeStackConfig
      expect(updatedStack.totalHeight).toBeGreaterThan(stack.totalHeight)
    })
  })

  describe('Total weight calculation', () => {
    it('calculates total weight based on layer densities', () => {
      const stack = createTestStack(2)
      stack.layers[0].cubeConfig.physics = { ...stack.layers[0].cubeConfig.physics, density: 2.0 }
      stack.layers[1].cubeConfig.physics = { ...stack.layers[1].cubeConfig.physics, density: 3.0 }
      stack.layers[0].height = 1.0
      stack.layers[1].height = 1.0

      const updatedStack = createCubeStack(stack.id, stack.layers, stack.prompt)
      expect(updatedStack.physics?.totalWeight).toBe(5.0)
    })
  })

  describe('Accessibility', () => {
    let testStack: CubeStackConfig

    beforeEach(() => {
      testStack = createTestStack(2)
    })

    it('section headers have aria-expanded attribute', async () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })

      const sectionHeaders = wrapper.findAll('.stack-editor__section-header')
      const layersHeader = sectionHeaders.find((h) => h.text().includes('Layers'))
      expect(layersHeader!.attributes('aria-expanded')).toBe('true')

      await layersHeader!.trigger('click')
      expect(layersHeader!.attributes('aria-expanded')).toBe('false')
    })

    it('layer titles have aria-expanded attribute', async () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })

      const layerTitles = wrapper.findAll('.stack-editor__layer-title')
      const layer1Title = layerTitles.find((t) => t.text().includes('Test Layer 1'))
      expect(layer1Title!.attributes('aria-expanded')).toBe('false')

      await layer1Title!.trigger('click')
      expect(layer1Title!.attributes('aria-expanded')).toBe('true')
    })

    it('buttons have accessible labels', () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack },
      })

      expect(wrapper.findAll('[aria-label="Move layer up"]')).toHaveLength(2)
      expect(wrapper.findAll('[aria-label="Move layer down"]')).toHaveLength(2)
      expect(wrapper.findAll('[aria-label="Remove layer"]')).toHaveLength(2)
    })
  })

  describe('CSS classes for styling', () => {
    it('applies custom className', () => {
      const testStack = createTestStack(2)
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: testStack, className: 'custom-class' },
      })
      const editor = wrapper.find('.stack-editor')
      expect(editor.classes()).toContain('custom-class')
    })

    it('applies correct class to empty state', () => {
      const wrapper = shallowMount(StackEditor, {
        props: { currentStack: null },
      })
      expect(wrapper.find('.stack-editor__empty').exists()).toBe(true)
    })
  })
})
