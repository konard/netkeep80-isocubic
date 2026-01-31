/**
 * Unit tests for EnergyVisualizationEditor Vue component
 * Tests the Vue.js 3.0 migration of the EnergyVisualizationEditor component (TASK 63)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import EnergyVisualizationEditor from './EnergyVisualizationEditor.vue'
import {
  DEFAULT_EDITOR_SETTINGS,
  DEFAULT_VISUALIZATION_SETTINGS,
  DEFAULT_ANIMATION_SETTINGS,
  type EnergyVisualizationEditorSettings,
} from '../lib/energy-visualization-defaults'
import { ChannelMask } from '../shaders/energy-cube'

describe('EnergyVisualizationEditor Vue Component — Module Exports', () => {
  it('should export EnergyVisualizationEditor.vue as a valid Vue component', async () => {
    const module = await import('./EnergyVisualizationEditor.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })
})

describe('EnergyVisualizationEditor Vue Component — Default Settings', () => {
  it('should have valid default editor settings', () => {
    expect(DEFAULT_EDITOR_SETTINGS).toBeDefined()
    expect(DEFAULT_EDITOR_SETTINGS.visualization).toBeDefined()
    expect(DEFAULT_EDITOR_SETTINGS.animation).toBeDefined()
  })

  it('should have visualization mode in defaults', () => {
    const viz = DEFAULT_EDITOR_SETTINGS.visualization
    expect(viz.visualizationMode).toBeDefined()
  })

  it('should have animation settings in defaults', () => {
    const anim = DEFAULT_EDITOR_SETTINGS.animation
    expect(typeof anim.animate).toBe('boolean')
  })
})

describe('EnergyVisualizationEditor Vue Component', () => {
  let defaultSettings: EnergyVisualizationEditorSettings

  beforeEach(() => {
    defaultSettings = { ...DEFAULT_EDITOR_SETTINGS }
  })

  describe('Rendering', () => {
    it('renders the editor title', () => {
      const wrapper = shallowMount(EnergyVisualizationEditor, {
        props: { settings: defaultSettings },
      })
      expect(wrapper.text()).toContain('Energy Visualization')
    })

    it('renders visualization section', () => {
      const wrapper = shallowMount(EnergyVisualizationEditor, {
        props: { settings: defaultSettings },
      })
      expect(wrapper.text()).toContain('Visualization')
    })

    it('renders animation section', () => {
      const wrapper = shallowMount(EnergyVisualizationEditor, {
        props: { settings: defaultSettings },
      })
      expect(wrapper.text()).toContain('Animation')
    })

    it('renders preview info by default', () => {
      const wrapper = shallowMount(EnergyVisualizationEditor, {
        props: { settings: defaultSettings },
      })
      expect(wrapper.text()).toContain('Mode:')
      expect(wrapper.text()).toContain('Channels:')
      expect(wrapper.text()).toContain('Intensity:')
      expect(wrapper.text()).toContain('Animation:')
    })

    it('hides preview info when showPreviewInfo is false', () => {
      const wrapper = shallowMount(EnergyVisualizationEditor, {
        props: { settings: defaultSettings, showPreviewInfo: false },
      })
      expect(wrapper.text()).not.toContain('Mode:')
    })

    it('applies custom className', () => {
      const wrapper = shallowMount(EnergyVisualizationEditor, {
        props: { settings: defaultSettings, className: 'custom-class' },
      })
      const editor = wrapper.find('.energy-viz-editor')
      expect(editor.classes()).toContain('custom-class')
    })
  })

  describe('Preview info', () => {
    it('displays current visualization mode', () => {
      const wrapper = shallowMount(EnergyVisualizationEditor, {
        props: { settings: defaultSettings },
      })
      expect(wrapper.text()).toContain('Energy Density')
    })

    it('displays active channels', () => {
      const wrapper = shallowMount(EnergyVisualizationEditor, {
        props: { settings: defaultSettings },
      })
      expect(wrapper.text()).toContain('Red, Green, Blue, Alpha')
    })

    it('displays intensity settings', () => {
      const wrapper = shallowMount(EnergyVisualizationEditor, {
        props: { settings: defaultSettings },
      })
      expect(wrapper.text()).toContain('Scale: 1.0x, Glow: 0.5')
    })

    it('displays animation status when enabled', () => {
      const wrapper = shallowMount(EnergyVisualizationEditor, {
        props: { settings: defaultSettings },
      })
      expect(wrapper.text()).toContain('Speed: 1.0x')
    })

    it('displays "Disabled" when animation is off', () => {
      const settings: EnergyVisualizationEditorSettings = {
        ...defaultSettings,
        animation: {
          ...defaultSettings.animation,
          animate: false,
        },
      }
      const wrapper = shallowMount(EnergyVisualizationEditor, {
        props: { settings },
      })
      expect(wrapper.text()).toContain('Disabled')
    })
  })

  describe('Visualization section', () => {
    describe('Visualization Mode', () => {
      it('renders visualization mode dropdown', () => {
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings: defaultSettings },
        })
        expect(wrapper.find('#visualization-mode').exists()).toBe(true)
      })

      it('displays all visualization mode options', () => {
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings: defaultSettings },
        })
        const select = wrapper.find('#visualization-mode')
        expect(select.find('option[value="energy"]').exists()).toBe(true)
        expect(select.find('option[value="amplitude"]').exists()).toBe(true)
        expect(select.find('option[value="phase"]').exists()).toBe(true)
      })

      it('updates visualization mode when changed', async () => {
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings: defaultSettings },
        })

        await wrapper.find('#visualization-mode').setValue('amplitude')

        expect(wrapper.emitted('update:settings')).toBeTruthy()
        const newSettings = wrapper.emitted(
          'update:settings'
        )![0][0] as EnergyVisualizationEditorSettings
        expect(newSettings.visualization.visualizationMode).toBe('amplitude')
      })

      it('shows description for current mode', () => {
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings: defaultSettings },
        })
        expect(wrapper.text()).toContain('Shows E = |psi|^2')
      })
    })

    describe('Channel Mask', () => {
      it('renders channel mask checkboxes', () => {
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings: defaultSettings },
        })
        expect(wrapper.text()).toContain('Channel Mask')
        const checkboxes = wrapper.findAll(
          '.energy-viz-editor__channel-checkbox input[type="checkbox"]'
        )
        expect(checkboxes.length).toBeGreaterThanOrEqual(4)
      })

      it('shows all channels enabled by default (RGBA)', () => {
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings: defaultSettings },
        })
        const checkboxes = wrapper.findAll(
          '.energy-viz-editor__channel-checkbox input[type="checkbox"]'
        )
        checkboxes.forEach((cb) => {
          expect((cb.element as HTMLInputElement).checked).toBe(true)
        })
      })

      it('toggles red channel when clicked', async () => {
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings: defaultSettings },
        })

        const checkboxes = wrapper.findAll(
          '.energy-viz-editor__channel-checkbox input[type="checkbox"]'
        )
        // First checkbox is Red
        await checkboxes[0].trigger('change')

        expect(wrapper.emitted('update:settings')).toBeTruthy()
        const newSettings = wrapper.emitted(
          'update:settings'
        )![0][0] as EnergyVisualizationEditorSettings
        expect(newSettings.visualization.channelMask).toBe(ChannelMask.RGBA ^ ChannelMask.R)
      })

      it('displays correct channel indicator colors', () => {
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings: defaultSettings },
        })
        expect(wrapper.text()).toContain('Red')
        expect(wrapper.text()).toContain('Green')
        expect(wrapper.text()).toContain('Blue')
        expect(wrapper.text()).toContain('Alpha')
      })
    })

    describe('Energy Scale', () => {
      it('renders energy scale slider', () => {
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings: defaultSettings },
        })
        expect(wrapper.find('#energy-scale').exists()).toBe(true)
      })

      it('displays current energy scale value', () => {
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings: defaultSettings },
        })
        expect(wrapper.text()).toContain('1.00')
      })

      it('updates energy scale when slider is changed', async () => {
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings: defaultSettings },
        })

        await wrapper.find('#energy-scale').setValue('2.0')

        expect(wrapper.emitted('update:settings')).toBeTruthy()
        const newSettings = wrapper.emitted(
          'update:settings'
        )![0][0] as EnergyVisualizationEditorSettings
        expect(newSettings.visualization.energyScale).toBe(2.0)
      })

      it('has correct min and max values', () => {
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings: defaultSettings },
        })
        const slider = wrapper.find('#energy-scale')
        expect(slider.attributes('min')).toBe('0.1')
        expect(slider.attributes('max')).toBe('3.0')
      })
    })

    describe('Glow Intensity', () => {
      it('renders glow intensity slider', () => {
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings: defaultSettings },
        })
        expect(wrapper.find('#glow-intensity').exists()).toBe(true)
      })

      it('displays current glow intensity value', () => {
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings: defaultSettings },
        })
        expect(wrapper.text()).toContain('0.50')
      })

      it('updates glow intensity when slider is changed', async () => {
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings: defaultSettings },
        })

        await wrapper.find('#glow-intensity').setValue('1.5')

        expect(wrapper.emitted('update:settings')).toBeTruthy()
        const newSettings = wrapper.emitted(
          'update:settings'
        )![0][0] as EnergyVisualizationEditorSettings
        expect(newSettings.visualization.glowIntensity).toBe(1.5)
      })

      it('has correct min and max values', () => {
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings: defaultSettings },
        })
        const slider = wrapper.find('#glow-intensity')
        expect(slider.attributes('min')).toBe('0.0')
        expect(slider.attributes('max')).toBe('2.0')
      })
    })

    describe('Reset button', () => {
      it('renders reset button for visualization', () => {
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings: defaultSettings },
        })
        const resetButtons = wrapper.findAll('.energy-viz-editor__reset-btn')
        expect(resetButtons.length).toBeGreaterThanOrEqual(1)
      })

      it('resets visualization settings to defaults', async () => {
        const customSettings: EnergyVisualizationEditorSettings = {
          ...defaultSettings,
          visualization: {
            visualizationMode: 'phase',
            channelMask: ChannelMask.R,
            energyScale: 2.5,
            glowIntensity: 1.8,
          },
        }
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings: customSettings },
        })

        const resetButtons = wrapper.findAll('.energy-viz-editor__reset-btn')
        await resetButtons[0].trigger('click')

        expect(wrapper.emitted('update:settings')).toBeTruthy()
        const newSettings = wrapper.emitted(
          'update:settings'
        )![0][0] as EnergyVisualizationEditorSettings
        expect(newSettings.visualization).toEqual(DEFAULT_VISUALIZATION_SETTINGS)
      })
    })
  })

  describe('Animation section', () => {
    describe('Animate checkbox', () => {
      it('renders animate checkbox', () => {
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings: defaultSettings },
        })
        expect(wrapper.text()).toContain('Enable Animation')
      })

      it('is checked by default', () => {
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings: defaultSettings },
        })
        const animateCheckbox = wrapper.findAll('.energy-viz-editor__checkbox').find((cb) => {
          const label = cb.element.closest('label')
          return label?.textContent?.includes('Enable Animation')
        })
        expect((animateCheckbox!.element as HTMLInputElement).checked).toBe(true)
      })

      it('toggles animation when clicked', async () => {
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings: defaultSettings },
        })

        const animateCheckbox = wrapper.findAll('.energy-viz-editor__checkbox').find((cb) => {
          const label = cb.element.closest('label')
          return label?.textContent?.includes('Enable Animation')
        })
        await animateCheckbox!.setValue(false)

        expect(wrapper.emitted('update:settings')).toBeTruthy()
        const newSettings = wrapper.emitted(
          'update:settings'
        )![0][0] as EnergyVisualizationEditorSettings
        expect(newSettings.animation.animate).toBe(false)
      })
    })

    describe('Animation Speed', () => {
      it('renders animation speed slider', () => {
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings: defaultSettings },
        })
        expect(wrapper.find('#animation-speed').exists()).toBe(true)
      })

      it('displays current animation speed value', () => {
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings: defaultSettings },
        })
        expect(wrapper.text()).toContain('1.0x')
      })

      it('updates animation speed when slider is changed', async () => {
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings: defaultSettings },
        })

        await wrapper.find('#animation-speed').setValue('3.0')

        expect(wrapper.emitted('update:settings')).toBeTruthy()
        const newSettings = wrapper.emitted(
          'update:settings'
        )![0][0] as EnergyVisualizationEditorSettings
        expect(newSettings.animation.animationSpeed).toBe(3.0)
      })

      it('is disabled when animation is off', () => {
        const settings: EnergyVisualizationEditorSettings = {
          ...defaultSettings,
          animation: {
            ...defaultSettings.animation,
            animate: false,
          },
        }
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings },
        })
        const slider = wrapper.find('#animation-speed')
        expect((slider.element as HTMLInputElement).disabled).toBe(true)
      })

      it('has correct min and max values', () => {
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings: defaultSettings },
        })
        const slider = wrapper.find('#animation-speed')
        expect(slider.attributes('min')).toBe('0.1')
        expect(slider.attributes('max')).toBe('5.0')
      })
    })

    describe('Rotate checkbox', () => {
      it('renders rotate checkbox', () => {
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings: defaultSettings },
        })
        expect(wrapper.text()).toContain('Enable Rotation')
      })

      it('is unchecked by default', () => {
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings: defaultSettings },
        })
        const rotateCheckbox = wrapper.findAll('.energy-viz-editor__checkbox').find((cb) => {
          const label = cb.element.closest('label')
          return label?.textContent?.includes('Enable Rotation')
        })
        expect((rotateCheckbox!.element as HTMLInputElement).checked).toBe(false)
      })

      it('toggles rotation when clicked', async () => {
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings: defaultSettings },
        })

        const rotateCheckbox = wrapper.findAll('.energy-viz-editor__checkbox').find((cb) => {
          const label = cb.element.closest('label')
          return label?.textContent?.includes('Enable Rotation')
        })
        await rotateCheckbox!.setValue(true)

        expect(wrapper.emitted('update:settings')).toBeTruthy()
        const newSettings = wrapper.emitted(
          'update:settings'
        )![0][0] as EnergyVisualizationEditorSettings
        expect(newSettings.animation.rotate).toBe(true)
      })
    })

    describe('Rotation Speed', () => {
      it('renders rotation speed slider', () => {
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings: defaultSettings },
        })
        expect(wrapper.find('#rotation-speed').exists()).toBe(true)
      })

      it('displays current rotation speed value', () => {
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings: defaultSettings },
        })
        expect(wrapper.text()).toContain('0.50 rad/s')
      })

      it('updates rotation speed when slider is changed', async () => {
        const settings: EnergyVisualizationEditorSettings = {
          ...defaultSettings,
          animation: {
            ...defaultSettings.animation,
            rotate: true,
          },
        }
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings },
        })

        await wrapper.find('#rotation-speed').setValue('1.5')

        expect(wrapper.emitted('update:settings')).toBeTruthy()
        const newSettings = wrapper.emitted(
          'update:settings'
        )![0][0] as EnergyVisualizationEditorSettings
        expect(newSettings.animation.rotationSpeed).toBe(1.5)
      })

      it('is disabled when rotation is off', () => {
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings: defaultSettings },
        })
        const slider = wrapper.find('#rotation-speed')
        expect((slider.element as HTMLInputElement).disabled).toBe(true)
      })

      it('is enabled when rotation is on', () => {
        const settings: EnergyVisualizationEditorSettings = {
          ...defaultSettings,
          animation: {
            ...defaultSettings.animation,
            rotate: true,
          },
        }
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings },
        })
        const slider = wrapper.find('#rotation-speed')
        expect((slider.element as HTMLInputElement).disabled).toBe(false)
      })

      it('has correct min and max values', () => {
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings: defaultSettings },
        })
        const slider = wrapper.find('#rotation-speed')
        expect(slider.attributes('min')).toBe('0.0')
        expect(slider.attributes('max')).toBe('2.0')
      })
    })

    describe('Reset button', () => {
      it('resets animation settings to defaults', async () => {
        const customSettings: EnergyVisualizationEditorSettings = {
          ...defaultSettings,
          animation: {
            animate: false,
            animationSpeed: 4.0,
            rotate: true,
            rotationSpeed: 1.5,
          },
        }
        const wrapper = shallowMount(EnergyVisualizationEditor, {
          props: { settings: customSettings },
        })

        const resetButtons = wrapper.findAll('.energy-viz-editor__reset-btn')
        await resetButtons[1].trigger('click') // Second reset button is for animation

        expect(wrapper.emitted('update:settings')).toBeTruthy()
        const newSettings = wrapper.emitted(
          'update:settings'
        )![0][0] as EnergyVisualizationEditorSettings
        expect(newSettings.animation).toEqual(DEFAULT_ANIMATION_SETTINGS)
      })
    })
  })

  describe('Section collapsing', () => {
    it('both sections are expanded by default', () => {
      const wrapper = shallowMount(EnergyVisualizationEditor, {
        props: { settings: defaultSettings },
      })

      const sectionHeaders = wrapper.findAll('.energy-viz-editor__section-header')
      expect(sectionHeaders[0].attributes('aria-expanded')).toBe('true')
      expect(sectionHeaders[1].attributes('aria-expanded')).toBe('true')
    })

    it('collapses visualization section when header is clicked', async () => {
      const wrapper = shallowMount(EnergyVisualizationEditor, {
        props: { settings: defaultSettings },
      })

      const vizHeader = wrapper
        .findAll('.energy-viz-editor__section-header')
        .find((h) => h.text().includes('Visualization'))
      await vizHeader!.trigger('click')

      expect(vizHeader!.attributes('aria-expanded')).toBe('false')
    })

    it('collapses animation section when header is clicked', async () => {
      const wrapper = shallowMount(EnergyVisualizationEditor, {
        props: { settings: defaultSettings },
      })

      const animHeader = wrapper
        .findAll('.energy-viz-editor__section-header')
        .find((h) => h.text().includes('Animation'))
      await animHeader!.trigger('click')

      expect(animHeader!.attributes('aria-expanded')).toBe('false')
    })

    it('expands collapsed section when header is clicked again', async () => {
      const wrapper = shallowMount(EnergyVisualizationEditor, {
        props: { settings: defaultSettings },
      })

      const vizHeader = wrapper
        .findAll('.energy-viz-editor__section-header')
        .find((h) => h.text().includes('Visualization'))
      await vizHeader!.trigger('click') // Collapse
      await vizHeader!.trigger('click') // Expand

      expect(vizHeader!.attributes('aria-expanded')).toBe('true')
    })

    it('hides content when section is collapsed', async () => {
      const wrapper = shallowMount(EnergyVisualizationEditor, {
        props: { settings: defaultSettings },
      })

      const vizHeader = wrapper
        .findAll('.energy-viz-editor__section-header')
        .find((h) => h.text().includes('Visualization'))
      await vizHeader!.trigger('click')

      expect(wrapper.find('#visualization-mode').exists()).toBe(false)
    })
  })

  describe('Edge cases', () => {
    it('handles minimum channel mask (no channels)', () => {
      const settings: EnergyVisualizationEditorSettings = {
        ...defaultSettings,
        visualization: {
          ...defaultSettings.visualization,
          channelMask: 0,
        },
      }
      const wrapper = shallowMount(EnergyVisualizationEditor, {
        props: { settings },
      })
      expect(wrapper.text()).toContain('None')
    })

    it('handles single channel mask', () => {
      const settings: EnergyVisualizationEditorSettings = {
        ...defaultSettings,
        visualization: {
          ...defaultSettings.visualization,
          channelMask: ChannelMask.R,
        },
      }
      const wrapper = shallowMount(EnergyVisualizationEditor, {
        props: { settings },
      })
      // Preview info row should show only Red
      const previewRows = wrapper.findAll('.energy-viz-editor__preview-row')
      const channelRow = previewRows.find((r) => r.text().includes('Channels:'))
      expect(channelRow!.text()).toContain('Red')
    })
  })

  describe('Default values', () => {
    it('DEFAULT_VISUALIZATION_SETTINGS has correct values', () => {
      expect(DEFAULT_VISUALIZATION_SETTINGS.visualizationMode).toBe('energy')
      expect(DEFAULT_VISUALIZATION_SETTINGS.channelMask).toBe(ChannelMask.RGBA)
      expect(DEFAULT_VISUALIZATION_SETTINGS.energyScale).toBe(1.0)
      expect(DEFAULT_VISUALIZATION_SETTINGS.glowIntensity).toBe(0.5)
    })

    it('DEFAULT_ANIMATION_SETTINGS has correct values', () => {
      expect(DEFAULT_ANIMATION_SETTINGS.animate).toBe(true)
      expect(DEFAULT_ANIMATION_SETTINGS.animationSpeed).toBe(1.0)
      expect(DEFAULT_ANIMATION_SETTINGS.rotate).toBe(false)
      expect(DEFAULT_ANIMATION_SETTINGS.rotationSpeed).toBe(0.5)
    })

    it('DEFAULT_EDITOR_SETTINGS combines both defaults', () => {
      expect(DEFAULT_EDITOR_SETTINGS.visualization).toEqual(DEFAULT_VISUALIZATION_SETTINGS)
      expect(DEFAULT_EDITOR_SETTINGS.animation).toEqual(DEFAULT_ANIMATION_SETTINGS)
    })
  })
})
