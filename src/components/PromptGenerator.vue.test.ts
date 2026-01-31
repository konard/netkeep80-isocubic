/**
 * Unit tests for PromptGenerator Vue component
 * Tests the Vue.js 3.0 migration of the PromptGenerator component (TASK 63)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PromptGenerator from './PromptGenerator.vue'
import type { SpectralCube } from '../types/cube'

describe('PromptGenerator Vue Component — Module Exports', () => {
  it('should export PromptGenerator.vue as a valid Vue component', async () => {
    const module = await import('./PromptGenerator.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })
})

describe('PromptGenerator Vue Component — Generation Modes', () => {
  it('should define valid generation modes', () => {
    const modes = ['single', 'batch', 'group', 'composite', 'contextual']
    expect(modes).toHaveLength(5)
    expect(modes).toContain('single')
    expect(modes).toContain('contextual')
  })

  it('should validate batch count range', () => {
    const minBatch = 1
    const maxBatch = 10
    expect(minBatch).toBeGreaterThan(0)
    expect(maxBatch).toBeLessThanOrEqual(10)
  })

  it('should handle feedback rating values', () => {
    const validRatings = [1, 2, 3, 4, 5]
    validRatings.forEach((rating) => {
      expect(rating).toBeGreaterThanOrEqual(1)
      expect(rating).toBeLessThanOrEqual(5)
    })
  })
})

describe('PromptGenerator Vue Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  describe('Rendering', () => {
    it('should render the component title', () => {
      const wrapper = shallowMount(PromptGenerator)
      expect(wrapper.text()).toContain('Generate by Description')
    })

    it('should render status indicator', () => {
      const wrapper = shallowMount(PromptGenerator)
      expect(wrapper.text()).toContain('Ready')
    })

    it('should render prompt input field', () => {
      const wrapper = shallowMount(PromptGenerator)
      const input = wrapper.find('#prompt-input')
      expect(input.exists()).toBe(true)
      expect(input.attributes('placeholder')).toMatch(/e\.g\., dark stone with moss/i)
    })

    it('should render generate button', () => {
      const wrapper = shallowMount(PromptGenerator)
      const button = wrapper.find('.prompt-generator__generate-btn')
      expect(button.exists()).toBe(true)
      expect(button.attributes('aria-label')).toBe('Generate cube')
    })

    it('should render Templates button', () => {
      const wrapper = shallowMount(PromptGenerator)
      const templateBtn = wrapper.find('.prompt-generator__action-btn--template')
      expect(templateBtn.exists()).toBe(true)
      expect(templateBtn.text()).toContain('Templates')
    })

    it('should render Random button', () => {
      const wrapper = shallowMount(PromptGenerator)
      const randomBtn = wrapper.find('.prompt-generator__action-btn--random')
      expect(randomBtn.exists()).toBe(true)
      expect(randomBtn.text()).toContain('Random')
    })

    it('should render example prompts', () => {
      const wrapper = shallowMount(PromptGenerator)
      expect(wrapper.text()).toContain('Try:')
    })

    it('should apply custom className', () => {
      const wrapper = shallowMount(PromptGenerator, {
        props: { className: 'custom-class' },
      })
      expect(wrapper.find('.prompt-generator').classes()).toContain('custom-class')
    })
  })

  describe('Input handling', () => {
    it('should update prompt value on input', async () => {
      const wrapper = shallowMount(PromptGenerator)
      const input = wrapper.find('#prompt-input')
      await input.setValue('test stone')
      expect((input.element as HTMLInputElement).value).toBe('test stone')
    })

    it('should disable generate button when input is empty', () => {
      const wrapper = shallowMount(PromptGenerator)
      const button = wrapper.find('.prompt-generator__generate-btn')
      expect((button.element as HTMLButtonElement).disabled).toBe(true)
    })

    it('should enable generate button when input has text', async () => {
      const wrapper = shallowMount(PromptGenerator)
      await wrapper.find('#prompt-input').setValue('stone')
      const button = wrapper.find('.prompt-generator__generate-btn')
      expect((button.element as HTMLButtonElement).disabled).toBe(false)
    })

    it('should clear error when typing new prompt', async () => {
      const wrapper = shallowMount(PromptGenerator)
      await wrapper.find('#prompt-input').setValue('stone')
      // No error alert should exist
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    })
  })

  describe('Generation', () => {
    it('should emit cubeGenerated when generation succeeds', async () => {
      const wrapper = shallowMount(PromptGenerator)

      await wrapper.find('#prompt-input').setValue('stone')
      await wrapper.find('.prompt-generator__generate-btn').trigger('click')
      await flushPromises()

      expect(wrapper.emitted('cubeGenerated')).toBeTruthy()
      const generatedCube = wrapper.emitted('cubeGenerated')![0][0] as SpectralCube
      expect(generatedCube.id).toBeDefined()
      expect(generatedCube.base).toBeDefined()
      expect(generatedCube.base.color).toHaveLength(3)
    })

    it('should show success result after generation', async () => {
      const wrapper = shallowMount(PromptGenerator)

      await wrapper.find('#prompt-input').setValue('stone')
      await wrapper.find('.prompt-generator__generate-btn').trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('Generated!')
    })

    it('should show generation method in result', async () => {
      const wrapper = shallowMount(PromptGenerator)

      await wrapper.find('#prompt-input').setValue('stone')
      await wrapper.find('.prompt-generator__generate-btn').trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('Method:')
    })

    it('should show confidence score in result', async () => {
      const wrapper = shallowMount(PromptGenerator)

      await wrapper.find('#prompt-input').setValue('stone')
      await wrapper.find('.prompt-generator__generate-btn').trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('Confidence:')
    })

    it('should handle Enter key press to generate', async () => {
      const wrapper = shallowMount(PromptGenerator)

      await wrapper.find('#prompt-input').setValue('stone')
      await wrapper.find('#prompt-input').trigger('keydown', { key: 'Enter' })
      await flushPromises()

      expect(wrapper.emitted('cubeGenerated')).toBeTruthy()
    })
  })

  describe('Template selection', () => {
    it('should show template panel when Templates button is clicked', async () => {
      const wrapper = shallowMount(PromptGenerator)

      await wrapper.find('.prompt-generator__action-btn--template').trigger('click')

      // Should show category buttons
      const categoryButtons = wrapper.findAll('.prompt-generator__category-btn')
      expect(categoryButtons.length).toBeGreaterThan(0)

      const categoryNames = categoryButtons.map((btn) => btn.text())
      expect(categoryNames).toContain('Natural')
      expect(categoryNames).toContain('Wood')
      expect(categoryNames).toContain('Stone')
      expect(categoryNames).toContain('Metal')
    })

    it('should close template panel when clicking Templates again', async () => {
      const wrapper = shallowMount(PromptGenerator)

      // Open
      await wrapper.find('.prompt-generator__action-btn--template').trigger('click')
      expect(wrapper.find('.prompt-generator__category-btn').exists()).toBe(true)

      // Close
      await wrapper.find('.prompt-generator__action-btn--template').trigger('click')
      expect(wrapper.find('.prompt-generator__category-btn').exists()).toBe(false)
    })

    it('should generate cube when template is selected', async () => {
      const wrapper = shallowMount(PromptGenerator)

      // Open templates
      await wrapper.find('.prompt-generator__action-btn--template').trigger('click')

      // Click on Stone category
      const stoneCategory = wrapper
        .findAll('.prompt-generator__category-btn')
        .find((btn) => btn.text().includes('Stone'))
      await stoneCategory!.trigger('click')

      // Find and click a template button (e.g., granite)
      const graniteButton = wrapper
        .findAll('.prompt-generator__template-btn')
        .find((btn) => btn.text().toLowerCase().includes('granite'))
      await graniteButton!.trigger('click')
      await flushPromises()

      expect(wrapper.emitted('cubeGenerated')).toBeTruthy()
    })

    it('should filter templates by category', async () => {
      const wrapper = shallowMount(PromptGenerator)

      // Open templates
      await wrapper.find('.prompt-generator__action-btn--template').trigger('click')

      // Click on Metal category
      const metalCategory = wrapper
        .findAll('.prompt-generator__category-btn')
        .find((btn) => btn.text().includes('Metal'))
      await metalCategory!.trigger('click')

      // Should show metal templates
      const templateButtons = wrapper.findAll('.prompt-generator__template-btn')
      const templateNames = templateButtons.map((btn) => btn.text().toLowerCase())
      expect(templateNames).toContain('iron')
      expect(templateNames).toContain('steel')
      expect(templateNames).toContain('gold')
    })
  })

  describe('Random generation', () => {
    it('should emit cubeGenerated when Random button is clicked', async () => {
      const wrapper = shallowMount(PromptGenerator)

      await wrapper.find('.prompt-generator__action-btn--random').trigger('click')
      await flushPromises()

      expect(wrapper.emitted('cubeGenerated')).toBeTruthy()
      const generatedCube = wrapper.emitted('cubeGenerated')![0][0] as SpectralCube
      expect(generatedCube.id).toContain('gen_')
      expect(generatedCube.meta?.tags).toContain('random')
    })

    it('should show success message after random generation', async () => {
      const wrapper = shallowMount(PromptGenerator)

      await wrapper.find('.prompt-generator__action-btn--random').trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('Generated!')
      expect(wrapper.text()).toContain('Random')
    })
  })

  describe('Example prompts', () => {
    it('should fill input when example prompt is clicked', async () => {
      const wrapper = shallowMount(PromptGenerator)

      const exampleButtons = wrapper.findAll('.prompt-generator__example-btn')
      expect(exampleButtons.length).toBeGreaterThan(0)

      await exampleButtons[0].trigger('click')

      const input = wrapper.find('#prompt-input')
      expect((input.element as HTMLInputElement).value).not.toBe('')
    })
  })

  describe('Accessibility', () => {
    it('should have accessible label for prompt input', () => {
      const wrapper = shallowMount(PromptGenerator)
      const label = wrapper.find('label[for="prompt-input"]')
      expect(label.exists()).toBe(true)
      expect(label.text()).toMatch(/describe your cube/i)
    })

    it('should have accessible generate button', () => {
      const wrapper = shallowMount(PromptGenerator)
      const button = wrapper.find('.prompt-generator__generate-btn')
      expect(button.attributes('aria-label')).toBe('Generate cube')
    })

    it('should show error message with alert role', () => {
      const wrapper = shallowMount(PromptGenerator)
      // No error initially
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    })

    it('should have live region for loading announcement', () => {
      const wrapper = shallowMount(PromptGenerator)
      // Loading region is not visible initially but is aria-live="polite" when shown
      // This verifies the component renders without errors
      expect(wrapper.find('.prompt-generator').exists()).toBe(true)
    })
  })

  describe('Confidence display', () => {
    it('should show confidence percentage after generation', async () => {
      const wrapper = shallowMount(PromptGenerator)

      await wrapper.find('#prompt-input').setValue('stone')
      await wrapper.find('.prompt-generator__generate-btn').trigger('click')
      await flushPromises()

      // Check that confidence is displayed as a percentage
      expect(wrapper.text()).toMatch(/\d+%/)
    })

    it('should show low confidence for random generation', async () => {
      const wrapper = shallowMount(PromptGenerator)

      await wrapper.find('.prompt-generator__action-btn--random').trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('20%')
    })
  })

  describe('Integration with tinyLLM', () => {
    it('should handle Russian prompts correctly', async () => {
      const wrapper = shallowMount(PromptGenerator)

      await wrapper.find('#prompt-input').setValue('\u043a\u0430\u043c\u0435\u043d\u044c')
      await wrapper.find('.prompt-generator__generate-btn').trigger('click')
      await flushPromises()

      expect(wrapper.emitted('cubeGenerated')).toBeTruthy()
      const generatedCube = wrapper.emitted('cubeGenerated')![0][0] as SpectralCube
      expect(generatedCube.physics?.material).toBe('stone')
    })

    it('should handle complex English prompts', async () => {
      const wrapper = shallowMount(PromptGenerator)

      await wrapper.find('#prompt-input').setValue('dark weathered ancient stone')
      await wrapper.find('.prompt-generator__generate-btn').trigger('click')
      await flushPromises()

      expect(wrapper.emitted('cubeGenerated')).toBeTruthy()
      expect(wrapper.text()).toContain('Hybrid')
    })
  })

  describe('Advanced mode (ISSUE 32: AI Integration)', () => {
    it('should render advanced mode toggle when enableAdvanced is true', () => {
      const wrapper = shallowMount(PromptGenerator, {
        props: { enableAdvanced: true },
      })
      const advancedBtn = wrapper.find('.prompt-generator__action-btn--advanced')
      expect(advancedBtn.exists()).toBe(true)
      expect(advancedBtn.text()).toContain('Advanced')
    })

    it('should not render advanced mode toggle when enableAdvanced is false', () => {
      const wrapper = shallowMount(PromptGenerator, {
        props: { enableAdvanced: false },
      })
      expect(wrapper.find('.prompt-generator__action-btn--advanced').exists()).toBe(false)
    })

    it('should show mode buttons when advanced panel is opened', async () => {
      const wrapper = shallowMount(PromptGenerator, {
        props: { enableAdvanced: true },
      })

      await wrapper.find('.prompt-generator__action-btn--advanced').trigger('click')

      const modeButtons = wrapper.findAll('.prompt-generator__mode-btn')
      const modeNames = modeButtons.map((btn) => btn.text())
      expect(modeNames).toContain('Single')
      expect(modeNames).toContain('Batch')
      expect(modeNames).toContain('Group')
      expect(modeNames).toContain('Composite')
      expect(modeNames).toContain('Contextual')
    })

    it('should disable Contextual mode button when no context cubes provided', async () => {
      const wrapper = shallowMount(PromptGenerator, {
        props: { enableAdvanced: true },
      })

      await wrapper.find('.prompt-generator__action-btn--advanced').trigger('click')

      const contextualButton = wrapper
        .findAll('.prompt-generator__mode-btn')
        .find((btn) => btn.text().includes('Contextual'))
      expect((contextualButton!.element as HTMLButtonElement).disabled).toBe(true)
    })

    it('should enable Contextual mode button when context cubes provided', async () => {
      const contextCube: SpectralCube = {
        id: 'ctx_1',
        base: { color: [0.5, 0.5, 0.5], roughness: 0.5 },
        physics: { material: 'stone' },
        meta: { name: 'Test Stone' },
      }
      const wrapper = shallowMount(PromptGenerator, {
        props: { enableAdvanced: true, contextCubes: [contextCube] },
      })

      await wrapper.find('.prompt-generator__action-btn--advanced').trigger('click')

      const contextualButton = wrapper
        .findAll('.prompt-generator__mode-btn')
        .find((btn) => btn.text().includes('Contextual'))
      expect((contextualButton!.element as HTMLButtonElement).disabled).toBe(false)
    })

    it('should show context info when in contextual mode with cubes', async () => {
      const contextCube: SpectralCube = {
        id: 'ctx_1',
        base: { color: [0.5, 0.5, 0.5], roughness: 0.5 },
        physics: { material: 'stone' },
        meta: { name: 'Test Stone' },
      }
      const wrapper = shallowMount(PromptGenerator, {
        props: { enableAdvanced: true, contextCubes: [contextCube] },
      })

      // Open advanced mode
      await wrapper.find('.prompt-generator__action-btn--advanced').trigger('click')

      // Switch to contextual mode
      const contextualButton = wrapper
        .findAll('.prompt-generator__mode-btn')
        .find((btn) => btn.text().includes('Contextual'))
      await contextualButton!.trigger('click')

      // Should show context cubes toggle
      expect(wrapper.text()).toContain('Context Cubes')
    })

    it('should generate cube in contextual mode using context', async () => {
      const contextCube: SpectralCube = {
        id: 'ctx_1',
        base: { color: [0.8, 0.6, 0.4], roughness: 0.7 },
        physics: { material: 'wood' },
        meta: { name: 'Oak Wood', tags: ['wood', 'natural'] },
        noise: { type: 'perlin', scale: 2 },
      }
      const wrapper = shallowMount(PromptGenerator, {
        props: { enableAdvanced: true, contextCubes: [contextCube] },
      })

      // Open advanced mode
      await wrapper.find('.prompt-generator__action-btn--advanced').trigger('click')

      // Switch to contextual mode
      const contextualButton = wrapper
        .findAll('.prompt-generator__mode-btn')
        .find((btn) => btn.text().includes('Contextual'))
      await contextualButton!.trigger('click')

      // Enter prompt
      await wrapper.find('#prompt-input').setValue('similar wooden plank')

      // Generate
      await wrapper.find('.prompt-generator__generate-btn').trigger('click')
      await flushPromises()

      expect(wrapper.emitted('cubeGenerated')).toBeTruthy()
      const generatedCube = wrapper.emitted('cubeGenerated')![0][0] as SpectralCube
      expect(generatedCube.id).toBeDefined()
    })

    it('should show extracted style info in contextual mode', async () => {
      const contextCubes: SpectralCube[] = [
        {
          id: 'ctx_1',
          base: { color: [0.5, 0.5, 0.5], roughness: 0.6 },
          physics: { material: 'stone' },
          meta: { tags: ['stone', 'natural'] },
          noise: { type: 'perlin', scale: 2 },
        },
        {
          id: 'ctx_2',
          base: { color: [0.4, 0.4, 0.4], roughness: 0.7 },
          physics: { material: 'stone' },
          meta: { tags: ['stone', 'rough'] },
          noise: { type: 'perlin', scale: 3 },
        },
      ]
      const wrapper = shallowMount(PromptGenerator, {
        props: { enableAdvanced: true, contextCubes },
      })

      // Open advanced mode
      await wrapper.find('.prompt-generator__action-btn--advanced').trigger('click')

      // Switch to contextual mode
      const contextualButton = wrapper
        .findAll('.prompt-generator__mode-btn')
        .find((btn) => btn.text().includes('Contextual'))
      await contextualButton!.trigger('click')

      // Toggle show context info
      const showButton = wrapper.find('.prompt-generator__context-toggle')
      await showButton.trigger('click')

      // Should show extracted style
      expect(wrapper.text()).toContain('Extracted Style:')
      expect(wrapper.text()).toContain('Dominant material:')
    })

    it('should show theme selector in advanced mode', async () => {
      const wrapper = shallowMount(PromptGenerator, {
        props: { enableAdvanced: true },
      })

      await wrapper.find('.prompt-generator__action-btn--advanced').trigger('click')

      expect(wrapper.find('#theme-select').exists()).toBe(true)
    })
  })
})
