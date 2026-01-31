/**
 * Unit tests for StackPresetPicker Vue component
 * Tests the Vue.js 3.0 migration of the StackPresetPicker component (TASK 63)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import StackPresetPicker from './StackPresetPicker.vue'
import type { CubeStackConfig } from '../types/stack'
import { createCubeStack, createStackLayer } from '../types/stack'
import { createDefaultCube } from '../types/cube'
import { STACK_PRESETS, STACK_PRESET_CATEGORIES } from '../lib/stack-presets'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Helper to create a test stack
function createTestStack(id: string = 'test_stack'): CubeStackConfig {
  const cube1 = createDefaultCube('test_cube_1')
  cube1.base.color = [0.5, 0.5, 0.5]

  const cube2 = createDefaultCube('test_cube_2')
  cube2.base.color = [0.7, 0.7, 0.7]

  const layer1 = createStackLayer('layer_1', cube1, 'bottom', 1.0)
  layer1.name = 'Bottom Layer'

  const layer2 = createStackLayer('layer_2', cube2, 'top', 1.0)
  layer2.name = 'Top Layer'

  return createCubeStack(id, [layer1, layer2], 'Test stack prompt')
}

describe('StackPresetPicker Vue Component — Module Exports', () => {
  it('should export StackPresetPicker.vue as a valid Vue component', async () => {
    const module = await import('./StackPresetPicker.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })
})

describe('StackPresetPicker Vue Component — Search and Filter Logic', () => {
  it('should filter presets by search query', () => {
    const presets = [
      { id: '1', name: 'Crystal Tower', category: 'geometric' },
      { id: '2', name: 'Forest Floor', category: 'nature' },
      { id: '3', name: 'Crystal Cave', category: 'nature' },
    ]
    const query = 'crystal'
    const filtered = presets.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    expect(filtered).toHaveLength(2)
    expect(filtered[0].name).toBe('Crystal Tower')
    expect(filtered[1].name).toBe('Crystal Cave')
  })

  it('should filter presets by category', () => {
    const presets = [
      { id: '1', name: 'Crystal Tower', category: 'geometric' },
      { id: '2', name: 'Forest Floor', category: 'nature' },
      { id: '3', name: 'Crystal Cave', category: 'nature' },
    ]
    const category = 'nature'
    const filtered = presets.filter((p) => p.category === category)
    expect(filtered).toHaveLength(2)
  })

  it('should handle empty search query', () => {
    const presets = [
      { id: '1', name: 'Preset A', category: 'cat1' },
      { id: '2', name: 'Preset B', category: 'cat2' },
    ]
    const query = ''
    const filtered = query
      ? presets.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
      : presets
    expect(filtered).toHaveLength(2)
  })
})

describe('StackPresetPicker Vue Component', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorageMock.clear()
  })

  describe('Rendering', () => {
    it('renders the title', () => {
      const wrapper = shallowMount(StackPresetPicker, {
        props: { isOpen: true },
      })
      expect(wrapper.text()).toContain('Stack Presets')
    })

    it('renders close button', () => {
      const wrapper = shallowMount(StackPresetPicker, {
        props: { isOpen: true },
      })
      const closeButton = wrapper.find('.stack-preset-picker__close-btn')
      expect(closeButton.exists()).toBe(true)
      expect(closeButton.attributes('aria-label')).toBe('Close preset picker')
    })

    it('does not render when isOpen is false', () => {
      const wrapper = shallowMount(StackPresetPicker, {
        props: { isOpen: false },
      })
      expect(wrapper.find('.stack-preset-picker').exists()).toBe(false)
    })

    it('renders search input', () => {
      const wrapper = shallowMount(StackPresetPicker, {
        props: { isOpen: true },
      })
      const searchInput = wrapper.find('.stack-preset-picker__search-input')
      expect(searchInput.exists()).toBe(true)
      expect(searchInput.attributes('placeholder')).toMatch(/search presets/i)
    })

    it('renders category filter buttons', () => {
      const wrapper = shallowMount(StackPresetPicker, {
        props: { isOpen: true },
      })

      // Should have "All" button plus category buttons
      const categoryButtons = wrapper.findAll('.stack-preset-picker__category')
      expect(categoryButtons.length).toBeGreaterThan(1)

      // Check for "All" button
      expect(wrapper.text()).toContain('All')

      // Check category names
      for (const category of Object.values(STACK_PRESET_CATEGORIES)) {
        expect(wrapper.text()).toContain(category.name)
      }
    })

    it('renders all built-in presets', () => {
      const wrapper = shallowMount(StackPresetPicker, {
        props: { isOpen: true },
      })

      for (const preset of STACK_PRESETS) {
        expect(wrapper.text()).toContain(preset.name)
      }
    })

    it('renders apply button', () => {
      const wrapper = shallowMount(StackPresetPicker, {
        props: { isOpen: true },
      })
      expect(wrapper.text()).toContain('Apply Preset')
    })
  })

  describe('Category Filtering', () => {
    it('shows all presets by default', () => {
      const wrapper = shallowMount(StackPresetPicker, {
        props: { isOpen: true },
      })

      for (const preset of STACK_PRESETS) {
        expect(wrapper.text()).toContain(preset.name)
      }
    })

    it('filters presets by category when category is selected', async () => {
      const wrapper = shallowMount(StackPresetPicker, {
        props: { isOpen: true },
      })

      // Click on Construction category
      const categoryButtons = wrapper.findAll('.stack-preset-picker__category')
      const constructionButton = categoryButtons.find((btn) => btn.text().includes('Construction'))
      await constructionButton!.trigger('click')

      // Should show construction presets
      const constructionPresets = STACK_PRESETS.filter((p) => p.category === 'construction')
      for (const preset of constructionPresets) {
        expect(wrapper.text()).toContain(preset.name)
      }

      // Should not show other category presets
      const otherPresets = STACK_PRESETS.filter((p) => p.category !== 'construction')
      for (const preset of otherPresets) {
        expect(wrapper.text()).not.toContain(preset.name)
      }
    })

    it('returns to all presets when All is clicked', async () => {
      const wrapper = shallowMount(StackPresetPicker, {
        props: { isOpen: true },
      })

      // First filter by category
      const categoryButtons = wrapper.findAll('.stack-preset-picker__category')
      const constructionButton = categoryButtons.find((btn) => btn.text().includes('Construction'))
      await constructionButton!.trigger('click')

      // Then click All
      const allButton = categoryButtons.find((btn) => btn.text().includes('All'))
      await allButton!.trigger('click')

      // All presets should be visible again
      for (const preset of STACK_PRESETS) {
        expect(wrapper.text()).toContain(preset.name)
      }
    })
  })

  describe('Search', () => {
    it('filters presets by search query', async () => {
      const wrapper = shallowMount(StackPresetPicker, {
        props: { isOpen: true },
      })

      const searchInput = wrapper.find('.stack-preset-picker__search-input')
      // Simulate input event with value
      await searchInput.setValue('stone')
      // The component uses @input handler that reads event.target.value
      // setValue triggers both input and change events
      await wrapper.vm.$nextTick()

      // Should show stone-related presets
      expect(wrapper.text()).toContain('Stone Wall')

      // Should not show unrelated presets
      expect(wrapper.text()).not.toContain('Wood Tower')
    })

    it('shows empty state when no presets match', async () => {
      const wrapper = shallowMount(StackPresetPicker, {
        props: { isOpen: true },
      })

      const searchInput = wrapper.find('.stack-preset-picker__search-input')
      await searchInput.setValue('xyznonexistent123')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('No presets found')
    })

    it('shows clear button when search has text', async () => {
      const wrapper = shallowMount(StackPresetPicker, {
        props: { isOpen: true },
      })

      // Initially no clear button
      expect(wrapper.find('.stack-preset-picker__search-clear').exists()).toBe(false)

      const searchInput = wrapper.find('.stack-preset-picker__search-input')
      await searchInput.setValue('stone')
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.stack-preset-picker__search-clear').exists()).toBe(true)
    })

    it('clears search when clear button is clicked', async () => {
      const wrapper = shallowMount(StackPresetPicker, {
        props: { isOpen: true },
      })

      const searchInput = wrapper.find('.stack-preset-picker__search-input')
      await searchInput.setValue('stone')
      await wrapper.vm.$nextTick()

      const clearButton = wrapper.find('.stack-preset-picker__search-clear')
      await clearButton.trigger('click')
      await wrapper.vm.$nextTick()

      // All presets should be visible again
      for (const preset of STACK_PRESETS) {
        expect(wrapper.text()).toContain(preset.name)
      }
    })
  })

  describe('Preset Selection', () => {
    it('selects preset on click', async () => {
      const wrapper = shallowMount(StackPresetPicker, {
        props: { isOpen: true },
      })

      const presetCards = wrapper.findAll('.stack-preset-picker__preset')
      const stoneWallCard = presetCards.find((card) => card.text().includes('Stone Wall'))
      await stoneWallCard!.trigger('click')

      expect(stoneWallCard!.attributes('aria-selected')).toBe('true')
    })

    it('shows preset details when selected', async () => {
      const wrapper = shallowMount(StackPresetPicker, {
        props: { isOpen: true },
      })

      const presetCards = wrapper.findAll('.stack-preset-picker__preset')
      const stoneWallCard = presetCards.find((card) => card.text().includes('Stone Wall'))
      await stoneWallCard!.trigger('click')

      const details = wrapper.find('.stack-preset-picker__details')
      expect(details.exists()).toBe(true)
      expect(details.text()).toContain('Stone Wall')
    })

    it('deselects when category changes', async () => {
      const wrapper = shallowMount(StackPresetPicker, {
        props: { isOpen: true },
      })

      // Select a preset
      const presetCards = wrapper.findAll('.stack-preset-picker__preset')
      const stoneWallCard = presetCards.find((card) => card.text().includes('Stone Wall'))
      await stoneWallCard!.trigger('click')

      // Change category
      const categoryButtons = wrapper.findAll('.stack-preset-picker__category')
      const magicalButton = categoryButtons.find((btn) => btn.text().includes('Magical'))
      await magicalButton!.trigger('click')

      // Details should not be visible (no selection)
      expect(wrapper.find('.stack-preset-picker__details').exists()).toBe(false)
    })
  })

  describe('Applying Presets', () => {
    it('apply button is disabled when no preset is selected', () => {
      const wrapper = shallowMount(StackPresetPicker, {
        props: { isOpen: true },
      })

      const applyButton = wrapper.find('.stack-preset-picker__apply-btn')
      expect((applyButton.element as HTMLButtonElement).disabled).toBe(true)
    })

    it('apply button is enabled when preset is selected', async () => {
      const wrapper = shallowMount(StackPresetPicker, {
        props: { isOpen: true },
      })

      // Select preset
      const presetCards = wrapper.findAll('.stack-preset-picker__preset')
      const stoneWallCard = presetCards.find((card) => card.text().includes('Stone Wall'))
      await stoneWallCard!.trigger('click')

      const applyButton = wrapper.find('.stack-preset-picker__apply-btn')
      expect((applyButton.element as HTMLButtonElement).disabled).toBe(false)
    })

    it('emits applyPreset when apply button is clicked', async () => {
      const wrapper = shallowMount(StackPresetPicker, {
        props: { isOpen: true },
      })

      // Select preset
      const presetCards = wrapper.findAll('.stack-preset-picker__preset')
      const stoneWallCard = presetCards.find((card) => card.text().includes('Stone Wall'))
      await stoneWallCard!.trigger('click')

      // Click apply
      await wrapper.find('.stack-preset-picker__apply-btn').trigger('click')

      expect(wrapper.emitted('applyPreset')).toBeTruthy()
      const appliedConfig = wrapper.emitted('applyPreset')![0][0] as CubeStackConfig
      expect(appliedConfig.layers.length).toBeGreaterThan(0)
    })

    it('emits close after applying preset', async () => {
      const wrapper = shallowMount(StackPresetPicker, {
        props: { isOpen: true },
      })

      // Select and apply preset
      const presetCards = wrapper.findAll('.stack-preset-picker__preset')
      const stoneWallCard = presetCards.find((card) => card.text().includes('Stone Wall'))
      await stoneWallCard!.trigger('click')
      await wrapper.find('.stack-preset-picker__apply-btn').trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('applies preset on double-click', async () => {
      const wrapper = shallowMount(StackPresetPicker, {
        props: { isOpen: true },
      })

      const presetCards = wrapper.findAll('.stack-preset-picker__preset')
      const stoneWallCard = presetCards.find((card) => card.text().includes('Stone Wall'))
      await stoneWallCard!.trigger('dblclick')

      expect(wrapper.emitted('applyPreset')).toBeTruthy()
      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('Saving Presets', () => {
    it('shows save button when currentStack is provided', () => {
      const testStack = createTestStack()
      const wrapper = shallowMount(StackPresetPicker, {
        props: { isOpen: true, currentStack: testStack },
      })

      expect(wrapper.text()).toContain('Save Current as Preset')
    })

    it('does not show save button when no currentStack', () => {
      const wrapper = shallowMount(StackPresetPicker, {
        props: { isOpen: true, currentStack: null },
      })

      expect(wrapper.text()).not.toContain('Save Current as Preset')
    })

    it('opens save dialog when save button is clicked', async () => {
      const testStack = createTestStack()
      const wrapper = shallowMount(StackPresetPicker, {
        props: { isOpen: true, currentStack: testStack },
      })

      await wrapper.find('.stack-preset-picker__save-btn').trigger('click')

      expect(wrapper.text()).toContain('Save as Preset')
      expect(wrapper.find('#preset-name').exists()).toBe(true)
    })

    it('closes save dialog when cancel is clicked', async () => {
      const testStack = createTestStack()
      const wrapper = shallowMount(StackPresetPicker, {
        props: { isOpen: true, currentStack: testStack },
      })

      await wrapper.find('.stack-preset-picker__save-btn').trigger('click')
      expect(wrapper.find('#preset-name').exists()).toBe(true)

      await wrapper.find('.stack-preset-picker__dialog-cancel').trigger('click')
      expect(wrapper.find('#preset-name').exists()).toBe(false)
    })

    it('saves preset when form is submitted', async () => {
      const testStack = createTestStack()
      const wrapper = shallowMount(StackPresetPicker, {
        props: { isOpen: true, currentStack: testStack },
      })

      // Open dialog
      await wrapper.find('.stack-preset-picker__save-btn').trigger('click')

      // Fill form
      await wrapper.find('#preset-name').setValue('My Custom Stack')
      await wrapper.find('#preset-description').setValue('A custom description')
      await wrapper.find('#preset-tags').setValue('custom, test')

      // Submit
      await wrapper.find('.stack-preset-picker__dialog-save').trigger('click')
      await wrapper.vm.$nextTick()

      // Dialog should close
      expect(wrapper.find('#preset-name').exists()).toBe(false)

      // Preset should appear in list
      expect(wrapper.text()).toContain('My Custom Stack')
    })

    it('save button is disabled when name is empty', async () => {
      const testStack = createTestStack()
      const wrapper = shallowMount(StackPresetPicker, {
        props: { isOpen: true, currentStack: testStack },
      })

      await wrapper.find('.stack-preset-picker__save-btn').trigger('click')

      const saveButton = wrapper.find('.stack-preset-picker__dialog-save')
      expect((saveButton.element as HTMLButtonElement).disabled).toBe(true)
    })
  })

  describe('Deleting User Presets', () => {
    it('shows delete button on user presets', async () => {
      const testStack = createTestStack()
      const wrapper = shallowMount(StackPresetPicker, {
        props: { isOpen: true, currentStack: testStack },
      })

      // Save a user preset
      await wrapper.find('.stack-preset-picker__save-btn').trigger('click')
      await wrapper.find('#preset-name').setValue('Deletable Stack')
      await wrapper.find('.stack-preset-picker__dialog-save').trigger('click')
      await wrapper.vm.$nextTick()

      // Find the user preset card and check for delete button
      const presetCards = wrapper.findAll('.stack-preset-picker__preset')
      const userCard = presetCards.find((card) => card.text().includes('Deletable Stack'))
      expect(userCard).toBeDefined()
      expect(userCard!.find('.stack-preset-picker__delete-btn').exists()).toBe(true)
    })

    it('does not show delete button on built-in presets', () => {
      const wrapper = shallowMount(StackPresetPicker, {
        props: { isOpen: true },
      })

      const presetCards = wrapper.findAll('.stack-preset-picker__preset')
      const stoneWallCard = presetCards.find((card) => card.text().includes('Stone Wall'))
      expect(stoneWallCard!.find('.stack-preset-picker__delete-btn').exists()).toBe(false)
    })

    it('deletes user preset when delete button is clicked', async () => {
      const testStack = createTestStack()
      const wrapper = shallowMount(StackPresetPicker, {
        props: { isOpen: true, currentStack: testStack },
      })

      // Save a user preset
      await wrapper.find('.stack-preset-picker__save-btn').trigger('click')
      await wrapper.find('#preset-name').setValue('To Be Deleted')
      await wrapper.find('.stack-preset-picker__dialog-save').trigger('click')
      await wrapper.vm.$nextTick()

      // Verify it's there
      expect(wrapper.text()).toContain('To Be Deleted')

      // Delete it
      const presetCards = wrapper.findAll('.stack-preset-picker__preset')
      const userCard = presetCards.find((card) => card.text().includes('To Be Deleted'))
      await userCard!.find('.stack-preset-picker__delete-btn').trigger('click')
      await wrapper.vm.$nextTick()

      // Should be gone
      expect(wrapper.text()).not.toContain('To Be Deleted')
    })
  })

  describe('Close Button', () => {
    it('emits close when close button is clicked', async () => {
      const wrapper = shallowMount(StackPresetPicker, {
        props: { isOpen: true },
      })

      await wrapper.find('.stack-preset-picker__close-btn').trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
      expect(wrapper.emitted('close')!.length).toBe(1)
    })
  })

  describe('Accessibility', () => {
    it('preset cards are keyboard accessible', () => {
      const wrapper = shallowMount(StackPresetPicker, {
        props: { isOpen: true },
      })

      const presetCards = wrapper.findAll('.stack-preset-picker__preset')
      const stoneWallCard = presetCards.find((card) => card.text().includes('Stone Wall'))
      expect(stoneWallCard!.attributes('tabindex')).toBe('0')
      expect(stoneWallCard!.attributes('role')).toBe('button')
    })

    it('preset cards respond to Enter key', async () => {
      const wrapper = shallowMount(StackPresetPicker, {
        props: { isOpen: true },
      })

      const presetCards = wrapper.findAll('.stack-preset-picker__preset')
      const stoneWallCard = presetCards.find((card) => card.text().includes('Stone Wall'))
      await stoneWallCard!.trigger('keydown', { key: 'Enter' })

      expect(stoneWallCard!.attributes('aria-selected')).toBe('true')
    })
  })

  describe('Custom className', () => {
    it('applies custom className', () => {
      const wrapper = shallowMount(StackPresetPicker, {
        props: { isOpen: true, className: 'custom-class' },
      })
      const picker = wrapper.find('.stack-preset-picker')
      expect(picker.classes()).toContain('custom-class')
    })
  })
})
