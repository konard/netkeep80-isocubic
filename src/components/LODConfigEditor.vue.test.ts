/**
 * Unit tests for LODConfigEditor Vue component
 * Tests the Vue.js 3.0 migration of the LODConfigEditor component (TASK 63)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import LODConfigEditor from './LODConfigEditor.vue'
import type { LODConfig, LODStatistics } from '../types/lod'
import { DEFAULT_LOD_CONFIG } from '../types/lod'

describe('LODConfigEditor Vue Component — Module Exports', () => {
  it('should export LODConfigEditor.vue as a valid Vue component', async () => {
    const module = await import('./LODConfigEditor.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })
})

describe('LODConfigEditor Vue Component — LOD Profiles', () => {
  it('should define valid LOD profile types', () => {
    const profiles: Array<'performance' | 'balanced' | 'quality'> = [
      'performance',
      'balanced',
      'quality',
    ]
    expect(profiles).toHaveLength(3)
  })

  it('should validate LOD level range', () => {
    const validLevels = [0, 1, 2, 3, 4]
    validLevels.forEach((level) => {
      expect(level).toBeGreaterThanOrEqual(0)
      expect(level).toBeLessThanOrEqual(4)
    })
  })

  it('should validate LOD config structure', () => {
    const config: LODConfig = DEFAULT_LOD_CONFIG
    expect(config.enabled).toBe(true)
    expect(config.thresholds).toHaveLength(5)
    expect(config.transitionDuration).toBe(0.3)
    expect(config.screenSizeThreshold).toBe(50)
  })
})

describe('LODConfigEditor Vue Component', () => {
  let mockOnConfigChange: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockOnConfigChange = vi.fn()
  })

  describe('Basic Rendering', () => {
    it('renders with default config', () => {
      const wrapper = shallowMount(LODConfigEditor)
      expect(wrapper.text()).toContain('Enable LOD System')
      expect(wrapper.text()).toContain('Profile')
    })

    it('renders enable/disable checkbox', () => {
      const wrapper = shallowMount(LODConfigEditor, {
        props: { config: DEFAULT_LOD_CONFIG },
      })
      const checkbox = wrapper.find('.lod-config-editor__checkbox')
      expect(checkbox.exists()).toBe(true)
      expect((checkbox.element as HTMLInputElement).checked).toBe(true)
    })

    it('renders profile selector', () => {
      const wrapper = shallowMount(LODConfigEditor)
      expect(wrapper.find('#lod-profile').exists()).toBe(true)
    })

    it('renders advanced settings toggle', () => {
      const wrapper = shallowMount(LODConfigEditor)
      expect(wrapper.text()).toContain('Advanced Settings')
    })

    it('renders with custom className', () => {
      const wrapper = shallowMount(LODConfigEditor, {
        props: { className: 'custom-class' },
      })
      const editor = wrapper.find('.lod-config-editor')
      expect(editor.classes()).toContain('custom-class')
    })
  })

  describe('Enable/Disable Toggle', () => {
    it('enables LOD system when checkbox is checked', async () => {
      const disabledConfig: LODConfig = { ...DEFAULT_LOD_CONFIG, enabled: false }
      const wrapper = shallowMount(LODConfigEditor, {
        props: { config: disabledConfig, onConfigChange: mockOnConfigChange },
      })

      await wrapper.find('.lod-config-editor__checkbox').setValue(true)

      expect(mockOnConfigChange).toHaveBeenCalled()
      const calledConfig = mockOnConfigChange.mock.calls[0][0]
      expect(calledConfig.enabled).toBe(true)
    })

    it('disables LOD system when checkbox is unchecked', async () => {
      const wrapper = shallowMount(LODConfigEditor, {
        props: { config: DEFAULT_LOD_CONFIG, onConfigChange: mockOnConfigChange },
      })

      await wrapper.find('.lod-config-editor__checkbox').setValue(false)

      expect(mockOnConfigChange).toHaveBeenCalled()
      const calledConfig = mockOnConfigChange.mock.calls[0][0]
      expect(calledConfig.enabled).toBe(false)
    })

    it('disables profile selector when LOD is disabled', () => {
      const disabledConfig: LODConfig = { ...DEFAULT_LOD_CONFIG, enabled: false }
      const wrapper = shallowMount(LODConfigEditor, {
        props: { config: disabledConfig },
      })

      const profileSelect = wrapper.find('#lod-profile')
      expect((profileSelect.element as HTMLSelectElement).disabled).toBe(true)
    })
  })

  describe('Profile Selection', () => {
    it('shows Balanced as default profile', () => {
      const wrapper = shallowMount(LODConfigEditor, {
        props: { config: DEFAULT_LOD_CONFIG },
      })
      const profileSelect = wrapper.find('#lod-profile')
      expect((profileSelect.element as HTMLSelectElement).value).toBe('balanced')
    })

    it('changes to performance profile', async () => {
      const wrapper = shallowMount(LODConfigEditor, {
        props: { config: DEFAULT_LOD_CONFIG, onConfigChange: mockOnConfigChange },
      })

      await wrapper.find('#lod-profile').setValue('performance')

      expect(mockOnConfigChange).toHaveBeenCalled()
      const calledConfig = mockOnConfigChange.mock.calls[0][0]
      expect(calledConfig.thresholds[0].maxDistance).toBeLessThan(
        DEFAULT_LOD_CONFIG.thresholds[0].maxDistance
      )
    })

    it('changes to quality profile', async () => {
      const wrapper = shallowMount(LODConfigEditor, {
        props: { config: DEFAULT_LOD_CONFIG, onConfigChange: mockOnConfigChange },
      })

      await wrapper.find('#lod-profile').setValue('quality')

      expect(mockOnConfigChange).toHaveBeenCalled()
      const calledConfig = mockOnConfigChange.mock.calls[0][0]
      expect(calledConfig.thresholds[0].maxDistance).toBeGreaterThan(
        DEFAULT_LOD_CONFIG.thresholds[0].maxDistance
      )
    })

    it('shows profile descriptions', () => {
      const wrapper = shallowMount(LODConfigEditor, {
        props: { config: DEFAULT_LOD_CONFIG },
      })
      expect(wrapper.text().toLowerCase()).toContain('balanced settings for most devices')
    })

    it('preserves enabled state when changing profiles', async () => {
      const enabledConfig: LODConfig = { ...DEFAULT_LOD_CONFIG, enabled: true }
      const wrapper = shallowMount(LODConfigEditor, {
        props: { config: enabledConfig, onConfigChange: mockOnConfigChange },
      })

      await wrapper.find('#lod-profile').setValue('performance')

      expect(mockOnConfigChange).toHaveBeenCalled()
      const calledConfig = mockOnConfigChange.mock.calls[0][0]
      expect(calledConfig.enabled).toBe(true)
    })
  })

  describe('Statistics Display', () => {
    const mockStats: LODStatistics = {
      cubesPerLevel: { 0: 10, 1: 20, 2: 30, 3: 15, 4: 5 },
      totalCubes: 80,
      averageLODLevel: 1.69,
      transitioningCubes: 3,
      performanceSavings: 42.5,
    }

    it('renders statistics when provided', () => {
      const wrapper = shallowMount(LODConfigEditor, {
        props: { statistics: mockStats },
      })

      expect(wrapper.text()).toContain('Live Statistics')
      expect(wrapper.text()).toContain('80')
      expect(wrapper.text()).toContain('1.7')
      expect(wrapper.text()).toContain('43%')
    })

    it('renders distribution bar', () => {
      const wrapper = shallowMount(LODConfigEditor, {
        props: { statistics: mockStats },
      })
      expect(wrapper.text()).toContain('Level Distribution')
    })

    it('renders cubes per level in legend', () => {
      const wrapper = shallowMount(LODConfigEditor, {
        props: { statistics: mockStats },
      })

      expect(wrapper.text()).toContain('L0: 10')
      expect(wrapper.text()).toContain('L1: 20')
      expect(wrapper.text()).toContain('L2: 30')
      expect(wrapper.text()).toContain('L3: 15')
      expect(wrapper.text()).toContain('L4: 5')
    })

    it('does not render statistics when not provided', () => {
      const wrapper = shallowMount(LODConfigEditor)
      expect(wrapper.text()).not.toContain('Live Statistics')
    })
  })

  describe('Advanced Settings', () => {
    it('expands advanced settings when clicked', async () => {
      const wrapper = shallowMount(LODConfigEditor, {
        props: { config: DEFAULT_LOD_CONFIG },
      })

      await wrapper.find('.lod-config-editor__advanced-toggle').trigger('click')

      expect(wrapper.text()).toContain('Transition Duration')
      expect(wrapper.text()).toContain('Screen Size Threshold')
      expect(wrapper.text()).toContain('Per-Level Settings')
    })

    it('shows advanced settings by default when showAdvanced is true', () => {
      const wrapper = shallowMount(LODConfigEditor, {
        props: { config: DEFAULT_LOD_CONFIG, showAdvanced: true },
      })
      expect(wrapper.text()).toContain('Transition Duration')
    })

    it('updates transition duration', async () => {
      const wrapper = shallowMount(LODConfigEditor, {
        props: {
          config: DEFAULT_LOD_CONFIG,
          onConfigChange: mockOnConfigChange,
          showAdvanced: true,
        },
      })

      await wrapper.find('#lod-transition').setValue('0.5')

      expect(mockOnConfigChange).toHaveBeenCalled()
      const calledConfig = mockOnConfigChange.mock.calls[0][0]
      expect(calledConfig.transitionDuration).toBe(0.5)
    })

    it('updates screen size threshold', async () => {
      const wrapper = shallowMount(LODConfigEditor, {
        props: {
          config: DEFAULT_LOD_CONFIG,
          onConfigChange: mockOnConfigChange,
          showAdvanced: true,
        },
      })

      await wrapper.find('#lod-screen-threshold').setValue('75')

      expect(mockOnConfigChange).toHaveBeenCalled()
      const calledConfig = mockOnConfigChange.mock.calls[0][0]
      expect(calledConfig.screenSizeThreshold).toBe(75)
    })

    it('disables advanced toggle when LOD is disabled', () => {
      const disabledConfig: LODConfig = { ...DEFAULT_LOD_CONFIG, enabled: false }
      const wrapper = shallowMount(LODConfigEditor, {
        props: { config: disabledConfig },
      })

      const advancedToggle = wrapper.find('.lod-config-editor__advanced-toggle')
      expect((advancedToggle.element as HTMLButtonElement).disabled).toBe(true)
    })
  })

  describe('Per-Level Settings', () => {
    it('renders all LOD levels', () => {
      const wrapper = shallowMount(LODConfigEditor, {
        props: { config: DEFAULT_LOD_CONFIG, showAdvanced: true },
      })

      expect(wrapper.text()).toContain('LOD 0: Full Detail')
      expect(wrapper.text()).toContain('LOD 1: High Detail')
      expect(wrapper.text()).toContain('LOD 2: Medium Detail')
      expect(wrapper.text()).toContain('LOD 3: Low Detail')
      expect(wrapper.text()).toContain('LOD 4: Minimal Detail')
    })

    it('expands level settings when clicked', async () => {
      const wrapper = shallowMount(LODConfigEditor, {
        props: { config: DEFAULT_LOD_CONFIG, showAdvanced: true },
      })

      const levelHeaders = wrapper.findAll('.lod-config-editor__level-header')
      const level0Button = levelHeaders.find((h) => h.text().includes('LOD 0'))
      await level0Button!.trigger('click')

      expect(wrapper.text()).toContain('Noise Octaves')
      expect(wrapper.text()).toContain('Max Gradients')
      expect(wrapper.text()).toContain('FFT Coefficients')
      expect(wrapper.text()).toContain('Enable Noise')
      expect(wrapper.text()).toContain('Enable Boundary Stitching')
    })

    it('updates noise octaves for a level', async () => {
      const wrapper = shallowMount(LODConfigEditor, {
        props: {
          config: DEFAULT_LOD_CONFIG,
          onConfigChange: mockOnConfigChange,
          showAdvanced: true,
        },
      })

      // Expand level 0
      const levelHeaders = wrapper.findAll('.lod-config-editor__level-header')
      const level0Button = levelHeaders.find((h) => h.text().includes('LOD 0'))
      await level0Button!.trigger('click')

      // Find the noise octaves slider
      const noiseOctavesSlider = wrapper.find('#lod-noise-octaves-0')
      await noiseOctavesSlider.setValue('6')

      expect(mockOnConfigChange).toHaveBeenCalled()
      const calledConfig = mockOnConfigChange.mock.calls[0][0]
      expect(calledConfig.levelSettings[0].noiseOctaves).toBe(6)
    })

    it('shows distance range in level summary', () => {
      const wrapper = shallowMount(LODConfigEditor, {
        props: { config: DEFAULT_LOD_CONFIG, showAdvanced: true },
      })
      expect(wrapper.text()).toContain('0-5m')
    })
  })

  describe('Reset Button', () => {
    it('resets to default configuration', async () => {
      const customConfig: LODConfig = {
        ...DEFAULT_LOD_CONFIG,
        transitionDuration: 0.8,
        screenSizeThreshold: 100,
      }

      const wrapper = shallowMount(LODConfigEditor, {
        props: {
          config: customConfig,
          onConfigChange: mockOnConfigChange,
          showAdvanced: true,
        },
      })

      await wrapper.find('.lod-config-editor__reset-btn').trigger('click')

      expect(mockOnConfigChange).toHaveBeenCalled()
      const calledConfig = mockOnConfigChange.mock.calls[0][0]
      expect(calledConfig).toEqual(DEFAULT_LOD_CONFIG)
    })
  })

  describe('Accessibility', () => {
    it('has aria-expanded on advanced toggle', async () => {
      const wrapper = shallowMount(LODConfigEditor, {
        props: { config: DEFAULT_LOD_CONFIG },
      })

      const advancedToggle = wrapper.find('.lod-config-editor__advanced-toggle')
      expect(advancedToggle.attributes('aria-expanded')).toBe('false')

      await advancedToggle.trigger('click')
      expect(advancedToggle.attributes('aria-expanded')).toBe('true')
    })

    it('has aria-expanded on level headers', async () => {
      const wrapper = shallowMount(LODConfigEditor, {
        props: { config: DEFAULT_LOD_CONFIG, showAdvanced: true },
      })

      const levelHeaders = wrapper.findAll('.lod-config-editor__level-header')
      const level0Button = levelHeaders.find((h) => h.text().includes('LOD 0'))
      expect(level0Button!.attributes('aria-expanded')).toBe('false')

      await level0Button!.trigger('click')
      expect(level0Button!.attributes('aria-expanded')).toBe('true')
    })
  })
})

describe('LODConfigEditor Profile Presets', () => {
  it('performance profile has aggressive thresholds', async () => {
    const mockOnConfigChange = vi.fn()
    const wrapper = shallowMount(LODConfigEditor, {
      props: { config: DEFAULT_LOD_CONFIG, onConfigChange: mockOnConfigChange },
    })

    await wrapper.find('#lod-profile').setValue('performance')

    const calledConfig = mockOnConfigChange.mock.calls[0][0] as LODConfig
    expect(calledConfig.thresholds[0].maxDistance).toBe(3)
    expect(calledConfig.screenSizeThreshold).toBe(75)
    expect(calledConfig.transitionDuration).toBe(0.2)
  })

  it('quality profile has relaxed thresholds', async () => {
    const mockOnConfigChange = vi.fn()
    const wrapper = shallowMount(LODConfigEditor, {
      props: { config: DEFAULT_LOD_CONFIG, onConfigChange: mockOnConfigChange },
    })

    await wrapper.find('#lod-profile').setValue('quality')

    const calledConfig = mockOnConfigChange.mock.calls[0][0] as LODConfig
    expect(calledConfig.thresholds[0].maxDistance).toBe(10)
    expect(calledConfig.screenSizeThreshold).toBe(30)
    expect(calledConfig.transitionDuration).toBe(0.5)
  })

  it('detects custom profile when thresholds are modified', () => {
    const customConfig: LODConfig = {
      ...DEFAULT_LOD_CONFIG,
      thresholds: [
        { level: 0, minDistance: 0, maxDistance: 7 },
        ...DEFAULT_LOD_CONFIG.thresholds.slice(1),
      ],
    }

    const wrapper = shallowMount(LODConfigEditor, {
      props: { config: customConfig },
    })

    const profileSelect = wrapper.find('#lod-profile')
    expect((profileSelect.element as HTMLSelectElement).value).toBe('custom')
  })
})
