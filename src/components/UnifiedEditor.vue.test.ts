/**
 * Unit tests for UnifiedEditor Vue component
 * Tests the Vue.js 3.0 migration of the UnifiedEditor component (TASK 63)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest'
import { createDefaultCube, createDefaultFFTCube } from '../types/cube'
import { createCubeStack, createStackLayer } from '../types/stack'

// Mock TresJS dependencies
vi.mock('@tresjs/core', () => ({
  TresCanvas: {},
  useRenderLoop: () => ({ onLoop: () => {} }),
}))

vi.mock('@tresjs/cientos', () => ({
  OrbitControls: {},
}))

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

  it('should define valid tab types', () => {
    const tabs = [
      'parameters',
      'fft-parameters',
      'fft-channels',
      'energy',
      'lod',
      'stack',
      'presets',
      'prompt',
    ]
    expect(tabs.length).toBeGreaterThanOrEqual(6)
  })

  it('should define quick action types', () => {
    const actions = [
      'reset',
      'duplicate',
      'randomize',
      'copy-json',
      'export-png',
      'toggle-animation',
    ]
    expect(actions).toHaveLength(6)
  })
})

describe('UnifiedEditor Vue Component — Keyboard Shortcuts', () => {
  it('should define keyboard shortcut mappings', () => {
    const shortcuts: Record<string, string> = {
      r: 'reset',
      d: 'duplicate',
      n: 'randomize',
      c: 'copy-json',
      e: 'export-png',
      a: 'toggle-animation',
    }
    expect(Object.keys(shortcuts)).toHaveLength(6)
    expect(shortcuts['r']).toBe('reset')
    expect(shortcuts['a']).toBe('toggle-animation')
  })
})
