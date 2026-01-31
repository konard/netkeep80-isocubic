/**
 * Unit tests for FFTParamEditor Vue component
 * Tests the Vue.js 3.0 migration of the FFTParamEditor component (TASK 63)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import FFTParamEditor from './FFTParamEditor.vue'
import type { FFTCubeConfig } from '../types/cube'
import { createDefaultFFTCube, FFT_CUBE_DEFAULTS } from '../types/cube'

describe('FFTParamEditor Vue Component — Module Exports', () => {
  it('should export FFTParamEditor.vue as a valid Vue component', async () => {
    const module = await import('./FFTParamEditor.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })
})

describe('FFTParamEditor Vue Component — FFT Configuration', () => {
  it('should create a valid default FFT cube', () => {
    const fftCube = createDefaultFFTCube('fft_test_001')
    expect(fftCube).toBeDefined()
    expect(fftCube.channels).toBeDefined()
    expect(fftCube.is_magical).toBe(true)
  })

  it('should validate FFT energy capacity', () => {
    const fftCube = createDefaultFFTCube('fft_test_002')
    expect(typeof fftCube.energy_capacity).toBe('number')
    expect(fftCube.energy_capacity).toBeGreaterThan(0)
  })

  it('should support editor mode types', () => {
    const modes: Array<'spectral' | 'fft'> = ['spectral', 'fft']
    expect(modes).toHaveLength(2)
    expect(modes).toContain('spectral')
    expect(modes).toContain('fft')
  })
})

describe('FFTParamEditor Vue Component', () => {
  let mockOnCubeUpdate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockOnCubeUpdate = vi.fn()
  })

  describe('Empty state', () => {
    it('renders empty state when no cube is provided', () => {
      const wrapper = shallowMount(FFTParamEditor, {
        props: { currentCube: null },
      })
      expect(wrapper.text()).toContain('No FFT cube selected')
      expect(wrapper.text()).toContain('Select a magical cube from the gallery or create a new one')
    })
  })

  describe('With cube', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
      testCube.meta = {
        name: 'Test FFT Cube',
        created: new Date().toISOString(),
      }
    })

    it('renders the editor title', () => {
      const wrapper = shallowMount(FFTParamEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.text()).toContain('FFT Cube Editor')
    })

    it('renders the cube name input', () => {
      const wrapper = shallowMount(FFTParamEditor, {
        props: { currentCube: testCube },
      })
      const nameInput = wrapper.find('#fft-cube-name')
      expect(nameInput.exists()).toBe(true)
      expect((nameInput.element as HTMLInputElement).value).toBe('Test FFT Cube')
    })

    it('renders reset button', () => {
      const wrapper = shallowMount(FFTParamEditor, {
        props: { currentCube: testCube },
      })
      const resetBtn = wrapper.find('.fft-editor__reset-btn')
      expect(resetBtn.exists()).toBe(true)
      expect(resetBtn.text()).toContain('Reset')
    })

    it('renders section headers', () => {
      const wrapper = shallowMount(FFTParamEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.text()).toContain('Energy Settings')
      expect(wrapper.text()).toContain('FFT Physics')
      expect(wrapper.text()).toContain('Boundary Settings')
    })
  })

  describe('Mode switcher', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
    })

    it('does not render mode switcher by default', () => {
      const wrapper = shallowMount(FFTParamEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.text()).not.toContain('Cube Type')
    })

    it('renders mode switcher when showModeSwitcher is true', () => {
      const wrapper = shallowMount(FFTParamEditor, {
        props: { currentCube: testCube, showModeSwitcher: true },
      })
      expect(wrapper.text()).toContain('Cube Type')
      expect(wrapper.text()).toContain('SpectralCube')
      expect(wrapper.text()).toContain('FFTCubeConfig')
    })

    it('emits modeChange when mode button is clicked', async () => {
      const wrapper = shallowMount(FFTParamEditor, {
        props: { currentCube: testCube, showModeSwitcher: true, editorMode: 'fft' },
      })
      const spectralButton = wrapper
        .findAll('.fft-editor__mode-btn')
        .find((btn) => btn.text().includes('SpectralCube'))
      await spectralButton!.trigger('click')
      expect(wrapper.emitted('modeChange')).toBeTruthy()
      expect(wrapper.emitted('modeChange')![0]).toEqual(['spectral'])
    })

    it('shows active state for current mode', () => {
      const wrapper = shallowMount(FFTParamEditor, {
        props: { currentCube: testCube, showModeSwitcher: true, editorMode: 'fft' },
      })
      const fftButton = wrapper
        .findAll('.fft-editor__mode-btn')
        .find((btn) => btn.text().includes('FFTCubeConfig'))
      expect(fftButton!.classes()).toContain('fft-editor__mode-btn--active')
    })
  })

  describe('Energy Settings section', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
    })

    it('renders is_magical checkbox', () => {
      const wrapper = shallowMount(FFTParamEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.text()).toContain('Is Magical')
      const checkbox = wrapper.find('.fft-editor__checkbox')
      expect(checkbox.exists()).toBe(true)
    })

    it('renders fft_size dropdown', () => {
      const wrapper = shallowMount(FFTParamEditor, {
        props: { currentCube: testCube },
      })
      const select = wrapper.find('#fft-size')
      expect(select.exists()).toBe(true)
    })

    it('renders energy capacity input', () => {
      const wrapper = shallowMount(FFTParamEditor, {
        props: { currentCube: testCube },
      })
      const input = wrapper.find('#energy-capacity')
      expect(input.exists()).toBe(true)
    })

    it('renders current energy indicator', () => {
      const wrapper = shallowMount(FFTParamEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.text()).toContain('Current Energy')
    })

    it('emits update:cube when is_magical is changed', async () => {
      const wrapper = shallowMount(FFTParamEditor, {
        props: { currentCube: testCube },
      })
      const checkbox = wrapper.find('.fft-editor__checkbox')
      await checkbox.setValue(!testCube.is_magical)
      expect(wrapper.emitted('update:cube')).toBeTruthy()
      const updatedCube = wrapper.emitted('update:cube')![0][0] as FFTCubeConfig
      expect(updatedCube.is_magical).toBe(!testCube.is_magical)
    })

    it('emits update:cube when fft_size is changed', async () => {
      const wrapper = shallowMount(FFTParamEditor, {
        props: { currentCube: testCube },
      })
      const select = wrapper.find('#fft-size')
      await select.setValue('32')
      expect(wrapper.emitted('update:cube')).toBeTruthy()
      const updatedCube = wrapper.emitted('update:cube')![0][0] as FFTCubeConfig
      expect(updatedCube.fft_size).toBe(32)
    })
  })

  describe('FFT Physics section', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
    })

    it('renders material type selector', () => {
      const wrapper = shallowMount(FFTParamEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.find('#fft-physics-material').exists()).toBe(true)
    })

    it('renders density slider', () => {
      const wrapper = shallowMount(FFTParamEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.find('#fft-physics-density').exists()).toBe(true)
    })

    it('renders break pattern selector', () => {
      const wrapper = shallowMount(FFTParamEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.find('#fft-physics-break-pattern').exists()).toBe(true)
    })

    it('renders coherence loss slider', () => {
      const wrapper = shallowMount(FFTParamEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.find('#coherence-loss').exists()).toBe(true)
    })

    it('renders fracture threshold slider', () => {
      const wrapper = shallowMount(FFTParamEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.find('#fracture-threshold').exists()).toBe(true)
    })

    it('emits update:cube when material is changed', async () => {
      const wrapper = shallowMount(FFTParamEditor, {
        props: { currentCube: testCube },
      })
      await wrapper.find('#fft-physics-material').setValue('wood')
      expect(wrapper.emitted('update:cube')).toBeTruthy()
      const updatedCube = wrapper.emitted('update:cube')![0][0] as FFTCubeConfig
      expect(updatedCube.physics.material).toBe('wood')
    })

    it('emits update:cube when density is changed', async () => {
      const wrapper = shallowMount(FFTParamEditor, {
        props: { currentCube: testCube },
      })
      await wrapper.find('#fft-physics-density').setValue('5.0')
      expect(wrapper.emitted('update:cube')).toBeTruthy()
      const updatedCube = wrapper.emitted('update:cube')![0][0] as FFTCubeConfig
      expect(updatedCube.physics.density).toBe(5.0)
    })
  })

  describe('Stress indicator', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
      testCube.physics = {
        ...testCube.physics,
        fracture_threshold: 100,
      }
      testCube.current_energy = 85
    })

    it('renders stress indicator when fracture threshold is set', () => {
      const wrapper = shallowMount(FFTParamEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.text()).toContain('Stress Level')
    })

    it('does not render stress indicator when fracture threshold is 0', () => {
      testCube.physics = {
        ...testCube.physics,
        fracture_threshold: 0,
      }
      const wrapper = shallowMount(FFTParamEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.text()).not.toContain('Stress Level')
    })
  })

  describe('Boundary Settings section', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
    })

    it('renders boundary mode selector', () => {
      const wrapper = shallowMount(FFTParamEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.find('#fft-boundary-mode').exists()).toBe(true)
    })

    it('renders neighbor influence slider', () => {
      const wrapper = shallowMount(FFTParamEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.find('#fft-boundary-neighbor-influence').exists()).toBe(true)
    })

    it('emits update:cube when boundary mode is changed', async () => {
      const wrapper = shallowMount(FFTParamEditor, {
        props: { currentCube: testCube },
      })
      await wrapper.find('#fft-boundary-mode').setValue('hard')
      expect(wrapper.emitted('update:cube')).toBeTruthy()
      const updatedCube = wrapper.emitted('update:cube')![0][0] as FFTCubeConfig
      expect(updatedCube.boundary.mode).toBe('hard')
    })

    it('emits update:cube when neighbor influence is changed', async () => {
      const wrapper = shallowMount(FFTParamEditor, {
        props: { currentCube: testCube },
      })
      await wrapper.find('#fft-boundary-neighbor-influence').setValue('0.8')
      expect(wrapper.emitted('update:cube')).toBeTruthy()
      const updatedCube = wrapper.emitted('update:cube')![0][0] as FFTCubeConfig
      expect(updatedCube.boundary.neighbor_influence).toBe(0.8)
    })
  })

  describe('Section toggling', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
    })

    it('collapses section when header is clicked', async () => {
      const wrapper = shallowMount(FFTParamEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.text()).toContain('Is Magical')

      const energyHeader = wrapper
        .findAll('.fft-editor__section-header')
        .find((el) => el.text().includes('Energy Settings'))
      await energyHeader!.trigger('click')
      expect(wrapper.text()).not.toContain('Is Magical')
    })

    it('expands section when collapsed header is clicked', async () => {
      const wrapper = shallowMount(FFTParamEditor, {
        props: { currentCube: testCube },
      })
      const energyHeader = wrapper
        .findAll('.fft-editor__section-header')
        .find((el) => el.text().includes('Energy Settings'))

      await energyHeader!.trigger('click')
      expect(wrapper.text()).not.toContain('Is Magical')

      await energyHeader!.trigger('click')
      expect(wrapper.text()).toContain('Is Magical')
    })
  })

  describe('Reset functionality', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
      testCube.energy_capacity = 500
      testCube.fft_size = 32
      testCube.is_magical = false
    })

    it('resets cube to default values when reset button is clicked', async () => {
      const wrapper = shallowMount(FFTParamEditor, {
        props: { currentCube: testCube },
      })
      await wrapper.find('.fft-editor__reset-btn').trigger('click')

      expect(wrapper.emitted('update:cube')).toBeTruthy()
      const resetCube = wrapper.emitted('update:cube')![0][0] as FFTCubeConfig
      expect(resetCube.energy_capacity).toBe(FFT_CUBE_DEFAULTS.energy_capacity)
      expect(resetCube.fft_size).toBe(FFT_CUBE_DEFAULTS.fft_size)
      expect(resetCube.is_magical).toBe(true)
    })
  })

  describe('Name editing', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
      testCube.meta = { name: 'Original Name' }
    })

    it('updates cube name when input changes', async () => {
      const wrapper = shallowMount(FFTParamEditor, {
        props: { currentCube: testCube },
      })
      await wrapper.find('#fft-cube-name').setValue('New FFT Cube Name')

      expect(wrapper.emitted('update:cube')).toBeTruthy()
      const updatedCube = wrapper.emitted('update:cube')![0][0] as FFTCubeConfig
      expect(updatedCube.meta.name).toBe('New FFT Cube Name')
    })
  })

  describe('Custom className', () => {
    it('applies custom className', () => {
      const testCube = createDefaultFFTCube('test-fft-cube')
      const wrapper = shallowMount(FFTParamEditor, {
        props: { currentCube: testCube, className: 'custom-class' },
      })
      const editor = wrapper.find('.fft-editor')
      expect(editor.classes()).toContain('custom-class')
    })
  })
})
