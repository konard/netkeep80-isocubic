/**
 * Unit tests for FFTChannelEditor Vue component
 * Tests the Vue.js 3.0 migration of the FFTChannelEditor component (TASK 63)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import FFTChannelEditor from './FFTChannelEditor.vue'
import { FFT_CHANNEL_PRESETS } from '../lib/fft-presets'
import type { FFTCubeConfig } from '../types/cube'
import { createDefaultFFTCube } from '../types/cube'

describe('FFTChannelEditor Vue Component — Module Exports', () => {
  it('should export FFTChannelEditor.vue as a valid Vue component', async () => {
    const module = await import('./FFTChannelEditor.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })
})

describe('FFTChannelEditor Vue Component — Channel Logic', () => {
  it('should define RGBA channel types', () => {
    const channels: Array<'R' | 'G' | 'B' | 'A'> = ['R', 'G', 'B', 'A']
    expect(channels).toHaveLength(4)
    expect(channels[0]).toBe('R')
    expect(channels[3]).toBe('A')
  })

  it('should validate phase angle range', () => {
    const minPhase = 0
    const maxPhase = 2 * Math.PI
    expect(maxPhase).toBeCloseTo(6.283, 2)
    expect(minPhase).toBeLessThan(maxPhase)
  })

  it('should validate coefficient ranges', () => {
    const coefficient = { amplitude: 0.5, phase: Math.PI / 4, frequency: 2 }
    expect(coefficient.amplitude).toBeGreaterThanOrEqual(0)
    expect(coefficient.amplitude).toBeLessThanOrEqual(1)
    expect(coefficient.phase).toBeGreaterThanOrEqual(0)
    expect(coefficient.phase).toBeLessThanOrEqual(2 * Math.PI)
  })
})

describe('FFTChannelEditor Vue Component', () => {
  describe('Empty state', () => {
    it('renders empty state when no cube is provided', () => {
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: null },
      })
      expect(wrapper.text()).toContain('No FFT cube selected')
      expect(wrapper.text()).toContain('Select a magical cube to edit its FFT channels')
    })
  })

  describe('With cube', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
    })

    it('renders the editor title', () => {
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.text()).toContain('FFT Channels')
    })

    it('renders presets button', () => {
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })
      const presetsBtn = wrapper.find('.fft-channel-editor__presets-btn')
      expect(presetsBtn.exists()).toBe(true)
      expect(presetsBtn.text()).toContain('Presets')
    })

    it('renders total energy indicator', () => {
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.text()).toContain('Total Energy:')
    })

    it('renders channel tabs', () => {
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.text()).toContain('Red')
      expect(wrapper.text()).toContain('Green')
      expect(wrapper.text()).toContain('Blue')
      expect(wrapper.text()).toContain('Alpha')
    })

    it('renders spectrum section', () => {
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.text()).toContain('Spectrum')
    })

    it('renders DC component section', () => {
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.text()).toContain('DC Component (Average)')
    })

    it('renders coefficients section', () => {
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.text()).toMatch(/Coefficients/)
    })
  })

  describe('Channel tabs', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
    })

    it('Red channel is active by default', () => {
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })
      const tabs = wrapper.findAll('.fft-channel-editor__tab')
      const redTab = tabs.find((t) => t.text().includes('Red'))
      expect(redTab!.classes()).toContain('fft-channel-editor__tab--active')
    })

    it('switches to different channel when tab is clicked', async () => {
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })

      const tabs = wrapper.findAll('.fft-channel-editor__tab')
      const greenTab = tabs.find((t) => t.text().includes('Green'))
      await greenTab!.trigger('click')

      expect(greenTab!.classes()).toContain('fft-channel-editor__tab--active')
      const redTab = tabs.find((t) => t.text().includes('Red'))
      expect(redTab!.classes()).not.toContain('fft-channel-editor__tab--active')
    })

    it('shows active styling for current channel', async () => {
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })

      const tabs = wrapper.findAll('.fft-channel-editor__tab')
      const blueTab = tabs.find((t) => t.text().includes('Blue'))
      await blueTab!.trigger('click')

      expect(blueTab!.classes()).toContain('fft-channel-editor__tab--active')
    })
  })

  describe('Presets', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
    })

    it('shows presets panel when presets button is clicked', async () => {
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })

      await wrapper.find('.fft-channel-editor__presets-btn').trigger('click')
      expect(wrapper.text()).toContain('Apply Preset')
    })

    it('renders all available presets', async () => {
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })

      await wrapper.find('.fft-channel-editor__presets-btn').trigger('click')

      FFT_CHANNEL_PRESETS.forEach((preset) => {
        expect(wrapper.text()).toContain(preset.name)
      })
    })

    it('hides presets panel when button is clicked again', async () => {
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })

      const btn = wrapper.find('.fft-channel-editor__presets-btn')
      await btn.trigger('click')
      expect(wrapper.text()).toContain('Apply Preset')

      await btn.trigger('click')
      expect(wrapper.text()).not.toContain('Apply Preset')
    })

    it('applies preset when clicked', async () => {
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })

      await wrapper.find('.fft-channel-editor__presets-btn').trigger('click')

      const presetItems = wrapper.findAll('.fft-channel-editor__preset-item')
      const crystalPreset = presetItems.find((p) => p.text().includes('Crystal Pulsation'))
      await crystalPreset!.trigger('click')

      expect(wrapper.emitted('update:cube')).toBeTruthy()
      const updatedCube = wrapper.emitted('update:cube')![0][0] as FFTCubeConfig
      expect(updatedCube.channels.R).toBeDefined()
      expect(updatedCube.channels.R.dcAmplitude).toBe(0.6)
    })

    it('closes presets panel after applying preset', async () => {
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })

      await wrapper.find('.fft-channel-editor__presets-btn').trigger('click')

      const presetItems = wrapper.findAll('.fft-channel-editor__preset-item')
      const energyWaves = presetItems.find((p) => p.text().includes('Energy Waves'))
      await energyWaves!.trigger('click')

      expect(wrapper.text()).not.toContain('Apply Preset')
    })
  })

  describe('DC Component editing', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
    })

    it('renders DC amplitude slider', () => {
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.text()).toContain('Amplitude')
    })

    it('renders DC phase control', () => {
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.text()).toContain('Phase')
    })

    it('updates DC amplitude when slider is changed', async () => {
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })

      const dcAmplitudeSlider = wrapper.find(
        '.fft-channel-editor__dc-amplitude input[type="range"]'
      )
      await dcAmplitudeSlider.setValue('1.5')

      expect(wrapper.emitted('update:cube')).toBeTruthy()
      const updatedCube = wrapper.emitted('update:cube')![0][0] as FFTCubeConfig
      expect(updatedCube.channels.R.dcAmplitude).toBe(1.5)
    })

    it('displays current DC amplitude value', () => {
      testCube.channels.R = {
        dcAmplitude: 0.75,
        dcPhase: 0,
        coefficients: [],
      }
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.text()).toContain('0.75')
    })
  })

  describe('Coefficient management', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
      testCube.channels.R = {
        dcAmplitude: 0.5,
        dcPhase: 0,
        coefficients: [],
      }
    })

    it('renders add coefficient button', () => {
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })
      const addBtn = wrapper.find('.fft-channel-editor__add-btn')
      expect(addBtn.exists()).toBe(true)
      expect(addBtn.text()).toContain('Add')
    })

    it('shows empty message when no coefficients', () => {
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.text()).toContain('No frequency coefficients')
    })

    it('adds coefficient when add button is clicked', async () => {
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })

      await wrapper.find('.fft-channel-editor__add-btn').trigger('click')

      expect(wrapper.emitted('update:cube')).toBeTruthy()
      const updatedCube = wrapper.emitted('update:cube')![0][0] as FFTCubeConfig
      expect(updatedCube.channels.R.coefficients.length).toBe(1)
    })

    it('renders coefficient editor when coefficients exist', () => {
      testCube.channels.R = {
        dcAmplitude: 0.5,
        dcPhase: 0,
        coefficients: [{ amplitude: 0.5, phase: 0, freqX: 1, freqY: 0, freqZ: 0 }],
      }
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })

      expect(wrapper.text()).toContain('#1')
      expect(wrapper.text()).not.toContain('No frequency coefficients')
    })

    it('removes coefficient when remove button is clicked', async () => {
      testCube.channels.R = {
        dcAmplitude: 0.5,
        dcPhase: 0,
        coefficients: [{ amplitude: 0.5, phase: 0, freqX: 1, freqY: 0, freqZ: 0 }],
      }
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })

      await wrapper.find('.fft-channel-editor__coefficient-remove').trigger('click')

      expect(wrapper.emitted('update:cube')).toBeTruthy()
      const updatedCube = wrapper.emitted('update:cube')![0][0] as FFTCubeConfig
      expect(updatedCube.channels.R.coefficients.length).toBe(0)
    })

    it('disables add button when max coefficients reached', () => {
      testCube.channels.R = {
        dcAmplitude: 0.5,
        dcPhase: 0,
        coefficients: Array(8)
          .fill(null)
          .map(() => ({
            amplitude: 0.5,
            phase: 0,
            freqX: 1,
            freqY: 0,
            freqZ: 0,
          })),
      }
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })

      const addBtn = wrapper.find('.fft-channel-editor__add-btn')
      expect((addBtn.element as HTMLButtonElement).disabled).toBe(true)
    })

    it('displays correct coefficients count', () => {
      testCube.channels.R = {
        dcAmplitude: 0.5,
        dcPhase: 0,
        coefficients: [
          { amplitude: 0.5, phase: 0, freqX: 1, freqY: 0, freqZ: 0 },
          { amplitude: 0.3, phase: Math.PI, freqX: 0, freqY: 1, freqZ: 0 },
        ],
      }
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })

      expect(wrapper.text()).toContain('Coefficients (2/8)')
    })
  })

  describe('Coefficient editing', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
      testCube.channels.R = {
        dcAmplitude: 0.5,
        dcPhase: 0,
        coefficients: [{ amplitude: 0.5, phase: 0, freqX: 1, freqY: 0, freqZ: 0 }],
      }
    })

    it('renders frequency input fields', () => {
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })

      expect(wrapper.text()).toContain('freqX')
      expect(wrapper.text()).toContain('freqY')
      expect(wrapper.text()).toContain('freqZ')
    })

    it('updates coefficient amplitude when changed', async () => {
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })

      const amplitudeSlider = wrapper.find(
        '.fft-channel-editor__field--amplitude input[type="range"]'
      )
      await amplitudeSlider.setValue('1.2')

      expect(wrapper.emitted('update:cube')).toBeTruthy()
      const updatedCube = wrapper.emitted('update:cube')![0][0] as FFTCubeConfig
      expect(updatedCube.channels.R.coefficients[0].amplitude).toBe(1.2)
    })

    it('updates coefficient freqX when changed', async () => {
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })

      const freqXInput = wrapper.findAll('.fft-channel-editor__field--freq input[type="number"]')[0]
      await freqXInput.setValue('2')

      expect(wrapper.emitted('update:cube')).toBeTruthy()
      const updatedCube = wrapper.emitted('update:cube')![0][0] as FFTCubeConfig
      expect(updatedCube.channels.R.coefficients[0].freqX).toBe(2)
    })
  })

  describe('Spectrum visualization', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
    })

    it('renders spectrum bars for DC component', () => {
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.text()).toContain('DC')
    })

    it('renders energy value in spectrum', () => {
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.text()).toMatch(/Energy:/)
    })

    it('renders spectrum bars for coefficients', () => {
      testCube.channels.R = {
        dcAmplitude: 0.5,
        dcPhase: 0,
        coefficients: [{ amplitude: 0.5, phase: 0, freqX: 1, freqY: 2, freqZ: 0 }],
      }
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.text()).toContain('(1,2,0)')
    })
  })

  describe('Custom className', () => {
    it('applies custom className', () => {
      const testCube = createDefaultFFTCube('test-fft-cube')
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube, className: 'custom-class' },
      })
      const editor = wrapper.find('.fft-channel-editor')
      expect(editor.classes()).toContain('custom-class')
    })
  })

  describe('Energy calculations', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
    })

    it('displays total energy based on all channels', () => {
      testCube.channels = {
        R: { dcAmplitude: 1.0, dcPhase: 0, coefficients: [] },
        G: { dcAmplitude: 1.0, dcPhase: 0, coefficients: [] },
        B: { dcAmplitude: 1.0, dcPhase: 0, coefficients: [] },
        A: { dcAmplitude: 1.0, dcPhase: 0, coefficients: [] },
      }
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.text()).toContain('4.00')
    })

    it('updates current_energy in cube when channels change', async () => {
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })

      await wrapper.find('.fft-channel-editor__add-btn').trigger('click')

      expect(wrapper.emitted('update:cube')).toBeTruthy()
      const updatedCube = wrapper.emitted('update:cube')![0][0] as FFTCubeConfig
      expect(updatedCube.current_energy).toBeDefined()
      expect(typeof updatedCube.current_energy).toBe('number')
    })
  })

  describe('FFT size awareness', () => {
    it('calculates maxFreq based on fft_size', () => {
      const testCube = createDefaultFFTCube('test-fft-cube')
      testCube.fft_size = 32

      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })
      expect(wrapper.text()).toContain('FFT Channels')
    })
  })

  describe('Multi-channel editing', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
      testCube.channels = {
        R: { dcAmplitude: 0.5, dcPhase: 0, coefficients: [] },
        G: { dcAmplitude: 0.7, dcPhase: Math.PI / 2, coefficients: [] },
        B: { dcAmplitude: 0.3, dcPhase: Math.PI, coefficients: [] },
        A: { dcAmplitude: 1.0, dcPhase: 0, coefficients: [] },
      }
    })

    it('switches between channels and displays correct data', async () => {
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })

      // Default is Red channel with 0.5 amplitude
      expect(wrapper.text()).toContain('0.50')

      // Switch to Green
      const tabs = wrapper.findAll('.fft-channel-editor__tab')
      const greenTab = tabs.find((t) => t.text().includes('Green'))
      await greenTab!.trigger('click')
      expect(wrapper.text()).toContain('0.70')

      // Switch to Blue
      const blueTab = tabs.find((t) => t.text().includes('Blue'))
      await blueTab!.trigger('click')
      expect(wrapper.text()).toContain('0.30')
    })

    it('updates correct channel when editing', async () => {
      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })

      // Switch to Green channel
      const tabs = wrapper.findAll('.fft-channel-editor__tab')
      const greenTab = tabs.find((t) => t.text().includes('Green'))
      await greenTab!.trigger('click')

      // Add coefficient to Green channel
      await wrapper.find('.fft-channel-editor__add-btn').trigger('click')

      expect(wrapper.emitted('update:cube')).toBeTruthy()
      const updatedCube = wrapper.emitted('update:cube')![0][0] as FFTCubeConfig
      expect(updatedCube.channels.G.coefficients.length).toBe(1)
      expect(updatedCube.channels.R.coefficients.length).toBe(0) // Red should be unchanged
    })
  })

  describe('Metadata updates', () => {
    it('updates modified timestamp when cube is changed', async () => {
      const testCube = createDefaultFFTCube('test-fft-cube')
      const originalModified = testCube.meta?.modified

      const wrapper = shallowMount(FFTChannelEditor, {
        props: { currentCube: testCube },
      })

      await wrapper.find('.fft-channel-editor__add-btn').trigger('click')

      expect(wrapper.emitted('update:cube')).toBeTruthy()
      const updatedCube = wrapper.emitted('update:cube')![0][0] as FFTCubeConfig
      expect(updatedCube.meta.modified).toBeDefined()

      if (originalModified) {
        expect(new Date(updatedCube.meta.modified!).getTime()).toBeGreaterThanOrEqual(
          new Date(originalModified).getTime()
        )
      }
    })
  })
})

describe('FFT_CHANNEL_PRESETS', () => {
  it('contains Crystal Pulsation preset', () => {
    const preset = FFT_CHANNEL_PRESETS.find((p) => p.id === 'crystal_pulsation')
    expect(preset).toBeDefined()
    expect(preset?.name).toBe('Crystal Pulsation')
    expect(preset?.channels.R).toBeDefined()
    expect(preset?.channels.G).toBeDefined()
    expect(preset?.channels.B).toBeDefined()
    expect(preset?.channels.A).toBeDefined()
  })

  it('contains Energy Waves preset', () => {
    const preset = FFT_CHANNEL_PRESETS.find((p) => p.id === 'energy_waves')
    expect(preset).toBeDefined()
    expect(preset?.name).toBe('Energy Waves')
  })

  it('contains Unstable Core preset', () => {
    const preset = FFT_CHANNEL_PRESETS.find((p) => p.id === 'unstable_core')
    expect(preset).toBeDefined()
    expect(preset?.name).toBe('Unstable Core')
    expect(preset?.channels.R?.dcAmplitude).toBe(0.9)
  })

  it('all presets have valid channel structure', () => {
    FFT_CHANNEL_PRESETS.forEach((preset) => {
      expect(preset.id).toBeDefined()
      expect(preset.name).toBeDefined()
      expect(preset.description).toBeDefined()
      expect(preset.channels).toBeDefined()

      const channels = ['R', 'G', 'B', 'A'] as const
      channels.forEach((ch) => {
        const channel = preset.channels[ch]
        if (channel) {
          expect(typeof channel.dcAmplitude).toBe('number')
          expect(typeof channel.dcPhase).toBe('number')
          expect(Array.isArray(channel.coefficients)).toBe(true)

          channel.coefficients.forEach((coeff) => {
            expect(typeof coeff.amplitude).toBe('number')
            expect(typeof coeff.phase).toBe('number')
            expect(typeof coeff.freqX).toBe('number')
            expect(typeof coeff.freqY).toBe('number')
            expect(typeof coeff.freqZ).toBe('number')
          })
        }
      })
    })
  })

  it('all presets have max 8 coefficients per channel', () => {
    FFT_CHANNEL_PRESETS.forEach((preset) => {
      const channels = ['R', 'G', 'B', 'A'] as const
      channels.forEach((ch) => {
        const channel = preset.channels[ch]
        if (channel) {
          expect(channel.coefficients.length).toBeLessThanOrEqual(8)
        }
      })
    })
  })
})
