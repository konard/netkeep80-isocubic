/**
 * Unit tests for UnifiedEditor Vue component
 * Tests the Vue.js 3.0 migration of the UnifiedEditor component (TASK 63)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, shallowMount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import UnifiedEditor from './UnifiedEditor.vue'
import type { SpectralCube, FFTCubeConfig } from '../types/cube'
import type { CubeStackConfig } from '../types/stack'
import { DEFAULT_LOD_CONFIG } from '../types/lod'
import { createDefaultCube, createDefaultFFTCube } from '../types/cube'
import { createCubeStack, createStackLayer } from '../types/stack'

// Mock child components as stubs - these will be provided via mount global.stubs
// to replace defineAsyncComponent loaded editors
const MockParamEditor = defineComponent({
  name: 'ParamEditor',
  props: ['currentCube', 'onCubeUpdate'],
  emits: ['update:cube'],
  setup(props) {
    return () =>
      h('div', { class: 'mock-param-editor', 'data-testid': 'param-editor' }, [
        h('span', 'ParamEditor'),
        props.currentCube ? h('span', { 'data-testid': 'cube-id' }, props.currentCube.id) : null,
        h(
          'button',
          {
            'data-testid': 'update-cube-btn',
            onClick: () => {
              if (props.currentCube && props.onCubeUpdate) {
                props.onCubeUpdate({
                  ...props.currentCube,
                  meta: { ...props.currentCube.meta, name: 'Updated Cube' },
                })
              }
            },
          },
          'Update'
        ),
      ])
  },
})

const MockFFTParamEditor = defineComponent({
  name: 'FFTParamEditor',
  props: ['currentCube', 'onCubeUpdate'],
  emits: ['update:cube'],
  setup(props) {
    return () =>
      h('div', { class: 'mock-fft-param-editor', 'data-testid': 'fft-param-editor' }, [
        h('span', 'FFTParamEditor'),
        props.currentCube
          ? h('span', { 'data-testid': 'fft-cube-id' }, props.currentCube.id)
          : null,
      ])
  },
})

const MockStackEditor = defineComponent({
  name: 'StackEditor',
  props: ['currentStack', 'onStackUpdate'],
  emits: ['update:stack'],
  setup(props) {
    return () =>
      h('div', { class: 'mock-stack-editor', 'data-testid': 'stack-editor' }, [
        h('span', 'StackEditor'),
        props.currentStack ? h('span', { 'data-testid': 'stack-id' }, props.currentStack.id) : null,
      ])
  },
})

const MockLODConfigEditor = defineComponent({
  name: 'LODConfigEditor',
  props: ['config', 'onConfigChange', 'statistics', 'showAdvanced'],
  emits: ['update:config'],
  setup(props) {
    return () =>
      h('div', { class: 'mock-lod-editor', 'data-testid': 'lod-config-editor' }, [
        h('span', 'LODConfigEditor'),
        h(
          'button',
          {
            'data-testid': 'update-lod-btn',
            onClick: () => {
              if (props.config && props.onConfigChange) {
                props.onConfigChange({ ...props.config, enabled: !props.config.enabled })
              }
            },
          },
          'Update LOD'
        ),
      ])
  },
})

const MockEnergyVisualizationEditor = defineComponent({
  name: 'EnergyVisualizationEditor',
  props: ['settings', 'onSettingsChange'],
  emits: ['update:settings'],
  setup() {
    return () =>
      h('div', { class: 'mock-energy-editor', 'data-testid': 'energy-visualization-editor' }, [
        h('span', 'EnergyVisualizationEditor'),
      ])
  },
})

const MockFFTChannelEditor = defineComponent({
  name: 'FFTChannelEditor',
  props: ['currentCube', 'onCubeUpdate'],
  emits: ['update:cube'],
  setup(props) {
    return () =>
      h('div', { class: 'mock-fft-channel-editor', 'data-testid': 'fft-channel-editor' }, [
        h('span', 'FFTChannelEditor'),
        props.currentCube
          ? h('span', { 'data-testid': 'channel-cube-id' }, props.currentCube.id)
          : null,
      ])
  },
})

describe('UnifiedEditor Vue Component — Module Exports', () => {
  it('should export UnifiedEditor.vue as a valid Vue component', async () => {
    const module = await import('./UnifiedEditor.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })

  it('should export component metadata', async () => {
    const module = await import('./UnifiedEditor.vue')
    expect(module.UNIFIED_EDITOR_META).toBeDefined()
    expect(module.UNIFIED_EDITOR_META.id).toBe('unified-editor')
    expect(module.UNIFIED_EDITOR_META.version).toBe('1.2.0')
  })
})

describe('UnifiedEditor Vue Component — Editor Modes', () => {
  it('should define valid editor modes', () => {
    const modes: Array<'spectral' | 'fft' | 'stack'> = ['spectral', 'fft', 'stack']
    expect(modes).toHaveLength(3)
  })

  it('should create default configurations for each mode', () => {
    const spectralCube = createDefaultCube('unified_spectral_001')
    expect(spectralCube).toBeDefined()
    expect(spectralCube.base).toBeDefined()

    const fftCube = createDefaultFFTCube('unified_fft_001')
    expect(fftCube).toBeDefined()
    expect(fftCube.channels).toBeDefined()

    const cube = createDefaultCube('unified_stack_cube_001')
    const layer = createStackLayer('unified_layer_001', cube)
    const stack = createCubeStack('unified_stack_001', [layer])
    expect(stack).toBeDefined()
    expect(stack.layers).toBeDefined()
  })
})

describe('UnifiedEditor Vue Component', () => {
  let mockOnCubeUpdate: ReturnType<typeof vi.fn>
  let mockOnFFTCubeUpdate: ReturnType<typeof vi.fn>
  let mockOnStackUpdate: ReturnType<typeof vi.fn>
  let mockOnModeChange: ReturnType<typeof vi.fn>
  let mockOnLODConfigChange: ReturnType<typeof vi.fn>

  let testCube: SpectralCube
  let testFFTCube: FFTCubeConfig
  let testStack: CubeStackConfig

  beforeEach(() => {
    mockOnCubeUpdate = vi.fn()
    mockOnFFTCubeUpdate = vi.fn()
    mockOnStackUpdate = vi.fn()
    mockOnModeChange = vi.fn()
    mockOnLODConfigChange = vi.fn()

    testCube = createDefaultCube('test-cube')
    testCube.meta = { name: 'Test Cube', created: new Date().toISOString() }

    testFFTCube = createDefaultFFTCube('test-fft-cube')
    testFFTCube.meta = { name: 'Test FFT Cube', created: new Date().toISOString() }

    const layer1 = createStackLayer('layer-1', createDefaultCube('layer-1-cube'))
    const layer2 = createStackLayer('layer-2', createDefaultCube('layer-2-cube'))
    testStack = createCubeStack('test-stack', [layer1, layer2])
    testStack.meta = { name: 'Test Stack', created: new Date().toISOString() }

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // Helper to mount with mock child components provided as stubs
  // This replaces defineAsyncComponent editors with our mock implementations
  function mountEditor(props: Record<string, unknown> = {}) {
    return mount(UnifiedEditor, {
      props,
      global: {
        stubs: {
          ParamEditor: MockParamEditor,
          FFTParamEditor: MockFFTParamEditor,
          StackEditor: MockStackEditor,
          LODConfigEditor: MockLODConfigEditor,
          EnergyVisualizationEditor: MockEnergyVisualizationEditor,
          FFTChannelEditor: MockFFTChannelEditor,
        },
      },
    })
  }

  // Shallow mount helper for tests that trigger reactive state changes via keyboard
  // shortcuts. Using shallowMount avoids infinite Vue patch cycles caused by
  // Suspense + deeply nested conditional rendering in the template.
  function shallowMountEditor(props: Record<string, unknown> = {}) {
    return shallowMount(UnifiedEditor, {
      props,
      global: {
        stubs: {
          ParamEditor: MockParamEditor,
          FFTParamEditor: MockFFTParamEditor,
          StackEditor: MockStackEditor,
          LODConfigEditor: MockLODConfigEditor,
          EnergyVisualizationEditor: MockEnergyVisualizationEditor,
          FFTChannelEditor: MockFFTChannelEditor,
          Suspense: true,
        },
      },
    })
  }

  describe('Rendering', () => {
    it('renders the unified editor title', async () => {
      const wrapper = mountEditor()
      await flushPromises()
      expect(wrapper.text()).toContain('Unified Editor')
    })

    it('renders mode selector buttons', async () => {
      const wrapper = mountEditor()
      await flushPromises()
      const modeButtons = wrapper.findAll('.unified-editor__mode-btn')
      expect(modeButtons.length).toBe(3)
      expect(wrapper.text()).toContain('Spectral')
      expect(wrapper.text()).toContain('FFT')
      expect(wrapper.text()).toContain('Stack')
    })

    it('renders tab navigation', async () => {
      const wrapper = mountEditor({ currentCube: testCube })
      await flushPromises()
      const tabs = wrapper.findAll('[role="tab"]')
      expect(tabs.length).toBeGreaterThan(0)
      // Should have General tab
      const generalTab = tabs.find((t) => t.text().includes('General'))
      expect(generalTab).toBeDefined()
    })

    it('renders quick actions', async () => {
      const wrapper = mountEditor({ currentCube: testCube })
      await flushPromises()
      expect(wrapper.text()).toContain('Quick Actions')
    })

    it('renders empty state when no content', async () => {
      const wrapper = mountEditor()
      await flushPromises()
      expect(wrapper.text()).toContain('No content selected')
    })
  })

  describe('Mode switching', () => {
    it('starts in spectral mode by default', async () => {
      const wrapper = mountEditor({ currentCube: testCube })
      await flushPromises()
      const spectralBtn = wrapper
        .findAll('.unified-editor__mode-btn')
        .find((btn) => btn.text().includes('Spectral'))
      expect(spectralBtn!.attributes('aria-pressed')).toBe('true')
    })

    it('can switch to FFT mode', async () => {
      const wrapper = mountEditor({
        currentCube: testCube,
        currentFFTCube: testFFTCube,
        onModeChange: mockOnModeChange,
      })
      await flushPromises()

      const fftBtn = wrapper
        .findAll('.unified-editor__mode-btn')
        .find((btn) => btn.text().includes('FFT'))
      await fftBtn!.trigger('click')

      expect(mockOnModeChange).toHaveBeenCalledWith('fft')
      expect(fftBtn!.attributes('aria-pressed')).toBe('true')
    })

    it('can switch to Stack mode', async () => {
      const wrapper = mountEditor({
        currentCube: testCube,
        currentStack: testStack,
        onModeChange: mockOnModeChange,
      })
      await flushPromises()

      const stackBtn = wrapper
        .findAll('.unified-editor__mode-btn')
        .find((btn) => btn.text().includes('Stack'))
      await stackBtn!.trigger('click')

      expect(mockOnModeChange).toHaveBeenCalledWith('stack')
    })

    it('respects initialMode prop', async () => {
      const wrapper = mountEditor({ initialMode: 'fft', currentFFTCube: testFFTCube })
      await flushPromises()

      const fftBtn = wrapper
        .findAll('.unified-editor__mode-btn')
        .find((btn) => btn.text().includes('FFT'))
      expect(fftBtn!.attributes('aria-pressed')).toBe('true')
    })
  })

  describe('Spectral mode', () => {
    it('shows ParamEditor for spectral cube', async () => {
      const wrapper = mountEditor({ currentCube: testCube, onCubeUpdate: mockOnCubeUpdate })
      await flushPromises()

      expect(wrapper.find('[data-testid="param-editor"]').exists()).toBe(true)
    })

    it('passes cube to ParamEditor', async () => {
      const wrapper = mountEditor({ currentCube: testCube })
      await flushPromises()

      expect(wrapper.find('[data-testid="cube-id"]').text()).toBe('test-cube')
    })

    it('calls onCubeUpdate when ParamEditor updates', async () => {
      const wrapper = mountEditor({ currentCube: testCube, onCubeUpdate: mockOnCubeUpdate })
      await flushPromises()

      await wrapper.find('[data-testid="update-cube-btn"]').trigger('click')
      expect(mockOnCubeUpdate).toHaveBeenCalled()
    })
  })

  describe('FFT mode', () => {
    it('shows FFTParamEditor for FFT cube', async () => {
      const wrapper = mountEditor({
        initialMode: 'fft',
        currentFFTCube: testFFTCube,
        onFFTCubeUpdate: mockOnFFTCubeUpdate,
      })
      await flushPromises()

      expect(wrapper.find('[data-testid="fft-param-editor"]').exists()).toBe(true)
    })

    it('shows Energy tab in FFT mode', async () => {
      const wrapper = mountEditor({ initialMode: 'fft', currentFFTCube: testFFTCube })
      await flushPromises()

      const energyTab = wrapper.findAll('[role="tab"]').find((t) => t.text().includes('Energy'))
      expect(energyTab).toBeDefined()
    })

    it('shows FFTChannelEditor in Energy tab', async () => {
      const wrapper = mountEditor({ initialMode: 'fft', currentFFTCube: testFFTCube })
      await flushPromises()

      const energyTab = wrapper.findAll('[role="tab"]').find((t) => t.text().includes('Energy'))
      await energyTab!.trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-testid="fft-channel-editor"]').exists()).toBe(true)
    })
  })

  describe('Stack mode', () => {
    it('shows StackEditor for stack', async () => {
      const wrapper = mountEditor({
        initialMode: 'stack',
        currentStack: testStack,
        onStackUpdate: mockOnStackUpdate,
      })
      await flushPromises()

      expect(wrapper.find('[data-testid="stack-editor"]').exists()).toBe(true)
    })

    it('shows Layers tab in Stack mode', async () => {
      const wrapper = mountEditor({ initialMode: 'stack', currentStack: testStack })
      await flushPromises()

      const layersTab = wrapper.findAll('[role="tab"]').find((t) => t.text().includes('Layers'))
      expect(layersTab).toBeDefined()
    })

    it('hides Appearance and Energy tabs in Stack mode', async () => {
      const wrapper = mountEditor({ initialMode: 'stack', currentStack: testStack })
      await flushPromises()

      const tabs = wrapper.findAll('[role="tab"]')
      const tabLabels = tabs.map((t) => t.text())
      expect(tabLabels.find((l) => l.includes('Appearance'))).toBeUndefined()
      expect(tabLabels.find((l) => l.includes('Energy'))).toBeUndefined()
    })
  })

  describe('Tab navigation', () => {
    it('switches between tabs', async () => {
      const wrapper = mountEditor({ currentCube: testCube, lodConfig: DEFAULT_LOD_CONFIG })
      await flushPromises()

      const lodTab = wrapper.findAll('[role="tab"]').find((t) => t.text().includes('LOD'))
      await lodTab!.trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-testid="lod-config-editor"]').exists()).toBe(true)
    })

    it('shows correct content for Appearance tab', async () => {
      const wrapper = mountEditor({ currentCube: testCube })
      await flushPromises()

      const appearanceTab = wrapper
        .findAll('[role="tab"]')
        .find((t) => t.text().includes('Appearance'))
      await appearanceTab!.trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-testid="param-editor"]').exists()).toBe(true)
    })

    it('shows correct content for Physics tab', async () => {
      const wrapper = mountEditor({ currentCube: testCube })
      await flushPromises()

      const physicsTab = wrapper.findAll('[role="tab"]').find((t) => t.text().includes('Physics'))
      await physicsTab!.trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-testid="param-editor"]').exists()).toBe(true)
    })
  })

  describe('Collaboration', () => {
    it('hides collaboration tab by default', async () => {
      const wrapper = mountEditor({ currentCube: testCube })
      await flushPromises()

      const collabTab = wrapper.findAll('[role="tab"]').find((t) => t.text().includes('Collab'))
      expect(collabTab).toBeUndefined()
    })

    it('shows collaboration tab when enabled', async () => {
      const wrapper = mountEditor({ currentCube: testCube, collaborationEnabled: true })
      await flushPromises()

      const collabTab = wrapper.findAll('[role="tab"]').find((t) => t.text().includes('Collab'))
      expect(collabTab).toBeDefined()
    })
  })

  describe('Quick Actions', () => {
    it('renders quick action buttons', async () => {
      const wrapper = mountEditor({ currentCube: testCube })
      await flushPromises()

      const actionButtons = wrapper.findAll('.unified-editor__quick-action-btn')
      expect(actionButtons.length).toBeGreaterThanOrEqual(5)
      const labelsText = actionButtons.map((btn) => btn.text())
      expect(labelsText.some((l) => l.includes('Reset'))).toBe(true)
      expect(labelsText.some((l) => l.includes('Duplicate'))).toBe(true)
      expect(labelsText.some((l) => l.includes('Randomize'))).toBe(true)
      expect(labelsText.some((l) => l.includes('Copy'))).toBe(true)
      expect(labelsText.some((l) => l.includes('Export'))).toBe(true)
    })

    it('resets cube when reset action is clicked', async () => {
      const wrapper = mountEditor({ currentCube: testCube, onCubeUpdate: mockOnCubeUpdate })
      await flushPromises()

      const resetBtn = wrapper
        .findAll('.unified-editor__quick-action-btn')
        .find((btn) => btn.text().includes('Reset'))
      await resetBtn!.trigger('click')

      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.id).toBe('test-cube')
    })

    it('duplicates cube when duplicate action is clicked', async () => {
      const wrapper = mountEditor({ currentCube: testCube, onCubeUpdate: mockOnCubeUpdate })
      await flushPromises()

      const duplicateBtn = wrapper
        .findAll('.unified-editor__quick-action-btn')
        .find((btn) => btn.text().includes('Duplicate'))
      await duplicateBtn!.trigger('click')

      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const duplicatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(duplicatedCube.id).toContain('test-cube_copy_')
      expect(duplicatedCube.meta?.name).toContain('(Copy)')
    })

    it('randomizes cube when randomize action is clicked', async () => {
      const wrapper = mountEditor({ currentCube: testCube, onCubeUpdate: mockOnCubeUpdate })
      await flushPromises()

      const randomizeBtn = wrapper
        .findAll('.unified-editor__quick-action-btn')
        .find((btn) => btn.text().includes('Randomize'))
      await randomizeBtn!.trigger('click')

      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const randomCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(randomCube.id).toContain('random_')
    })

    it('copies config to clipboard when copy action is clicked', async () => {
      const wrapper = mountEditor({ currentCube: testCube })
      await flushPromises()

      const copyBtn = wrapper
        .findAll('.unified-editor__quick-action-btn')
        .find((btn) => btn.text().includes('Copy'))
      await copyBtn!.trigger('click')

      expect(navigator.clipboard.writeText).toHaveBeenCalled()
    })

    it('disables actions when no content', async () => {
      const wrapper = mountEditor()
      await flushPromises()

      const resetBtn = wrapper
        .findAll('.unified-editor__quick-action-btn')
        .find((btn) => btn.text().includes('Reset'))
      expect((resetBtn!.element as HTMLButtonElement).disabled).toBe(true)
    })
  })

  describe('Mobile layout', () => {
    it('renders mobile layout when isMobile is true', async () => {
      const wrapper = mountEditor({ currentCube: testCube, isMobile: true })
      await flushPromises()

      expect(wrapper.find('.unified-editor--mobile').exists()).toBe(true)
      expect(wrapper.find('.unified-editor__tab-select').exists()).toBe(true)
    })

    it('uses select dropdown for tabs on mobile', async () => {
      const wrapper = mountEditor({ currentCube: testCube, isMobile: true })
      await flushPromises()

      const select = wrapper.find('.unified-editor__tab-select')
      expect(select.exists()).toBe(true)
      expect(select.attributes('aria-label')).toBe('Select editor section')
    })

    it('switches tabs via select on mobile', async () => {
      const wrapper = mountEditor({
        currentCube: testCube,
        isMobile: true,
        lodConfig: DEFAULT_LOD_CONFIG,
      })
      await flushPromises()

      await wrapper.find('.unified-editor__tab-select').setValue('lod')
      await flushPromises()

      expect(wrapper.find('[data-testid="lod-config-editor"]').exists()).toBe(true)
    })

    it('collapses quick actions by default on mobile', async () => {
      const wrapper = mountEditor({ currentCube: testCube, isMobile: true })
      await flushPromises()

      const accordionHeader = wrapper.find('.unified-editor__accordion-header')
      expect(accordionHeader.attributes('aria-expanded')).toBe('false')
    })

    it('expands quick actions when clicked on mobile', async () => {
      const wrapper = mountEditor({ currentCube: testCube, isMobile: true })
      await flushPromises()

      const accordionHeader = wrapper.find('.unified-editor__accordion-header')
      await accordionHeader.trigger('click')
      expect(accordionHeader.attributes('aria-expanded')).toBe('true')
    })
  })

  describe('Keyboard shortcuts', () => {
    it('resets on Ctrl+R', async () => {
      const wrapper = shallowMountEditor({
        currentCube: testCube,
        onCubeUpdate: mockOnCubeUpdate,
      })
      await flushPromises()

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', ctrlKey: true }))
      await flushPromises()

      expect(mockOnCubeUpdate).toHaveBeenCalled()
      wrapper.unmount()
    })

    it('duplicates on Ctrl+D', async () => {
      const wrapper = shallowMountEditor({
        currentCube: testCube,
        onCubeUpdate: mockOnCubeUpdate,
      })
      await flushPromises()

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', ctrlKey: true }))
      await flushPromises()

      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const cube = mockOnCubeUpdate.mock.calls[0][0]
      expect(cube.id).toContain('_copy_')
      wrapper.unmount()
    })

    it('randomizes on Ctrl+Shift+R', async () => {
      const wrapper = shallowMountEditor({
        currentCube: testCube,
        onCubeUpdate: mockOnCubeUpdate,
      })
      await flushPromises()

      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'r', ctrlKey: true, shiftKey: true })
      )
      await flushPromises()

      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const cube = mockOnCubeUpdate.mock.calls[0][0]
      expect(cube.id).toContain('random_')
      wrapper.unmount()
    })

    it('copies on Ctrl+C when no text selected', async () => {
      const mockGetSelection = vi.spyOn(window, 'getSelection').mockReturnValue({
        toString: () => '',
      } as Selection)

      const wrapper = shallowMountEditor({ currentCube: testCube })
      await flushPromises()

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true }))
      await flushPromises()

      expect(navigator.clipboard.writeText).toHaveBeenCalled()
      wrapper.unmount()
      mockGetSelection.mockRestore()
    })
  })

  describe('LOD tab', () => {
    it('shows LODConfigEditor in LOD tab', async () => {
      const wrapper = mountEditor({
        currentCube: testCube,
        lodConfig: DEFAULT_LOD_CONFIG,
        onLODConfigChange: mockOnLODConfigChange,
      })
      await flushPromises()

      const lodTab = wrapper.findAll('[role="tab"]').find((t) => t.text().includes('LOD'))
      await lodTab!.trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-testid="lod-config-editor"]').exists()).toBe(true)
    })

    it('passes LOD config to LODConfigEditor', async () => {
      const wrapper = mountEditor({
        currentCube: testCube,
        lodConfig: DEFAULT_LOD_CONFIG,
        onLODConfigChange: mockOnLODConfigChange,
      })
      await flushPromises()

      const lodTab = wrapper.findAll('[role="tab"]').find((t) => t.text().includes('LOD'))
      await lodTab!.trigger('click')
      await flushPromises()

      await wrapper.find('[data-testid="update-lod-btn"]').trigger('click')
      expect(mockOnLODConfigChange).toHaveBeenCalledWith({
        ...DEFAULT_LOD_CONFIG,
        enabled: !DEFAULT_LOD_CONFIG.enabled,
      })
    })
  })

  describe('Accessibility', () => {
    it('has correct ARIA attributes for tabs', async () => {
      const wrapper = mountEditor({ currentCube: testCube })
      await flushPromises()

      const tablist = wrapper.find('[role="tablist"]')
      expect(tablist.attributes('aria-label')).toBe('Editor sections')
    })

    it('has correct ARIA attributes for tab buttons', async () => {
      const wrapper = mountEditor({ currentCube: testCube })
      await flushPromises()

      const generalTab = wrapper.findAll('[role="tab"]').find((t) => t.text().includes('General'))
      expect(generalTab!.attributes('aria-selected')).toBe('true')
      expect(generalTab!.attributes('aria-controls')).toBe('tabpanel-general')
    })

    it('has correct ARIA attributes for tab panel', async () => {
      const wrapper = mountEditor({ currentCube: testCube })
      await flushPromises()

      const tabpanel = wrapper.find('[role="tabpanel"]')
      expect(tabpanel.attributes('aria-labelledby')).toBe('tab-general')
    })

    it('has correct ARIA attributes for mode buttons', async () => {
      const wrapper = mountEditor({ currentCube: testCube })
      await flushPromises()

      const spectralBtn = wrapper
        .findAll('.unified-editor__mode-btn')
        .find((btn) => btn.text().includes('Spectral'))
      expect(spectralBtn!.attributes('aria-pressed')).toBe('true')
    })
  })

  describe('CSS classes', () => {
    it('applies custom className', async () => {
      const wrapper = mountEditor({ className: 'custom-editor' })
      await flushPromises()

      expect(wrapper.find('.unified-editor').classes()).toContain('custom-editor')
    })

    it('applies mobile class when isMobile is true', async () => {
      const wrapper = mountEditor({ isMobile: true })
      await flushPromises()

      expect(wrapper.find('.unified-editor').classes()).toContain('unified-editor--mobile')
    })

    it('applies desktop class when isMobile is false', async () => {
      const wrapper = mountEditor({ isMobile: false })
      await flushPromises()

      expect(wrapper.find('.unified-editor').classes()).toContain('unified-editor--desktop')
    })
  })
})
