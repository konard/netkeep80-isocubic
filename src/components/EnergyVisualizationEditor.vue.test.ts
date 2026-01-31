/**
 * Unit tests for EnergyVisualizationEditor Vue component
 * Tests the Vue.js 3.0 migration of the EnergyVisualizationEditor component (TASK 63)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { DEFAULT_EDITOR_SETTINGS } from '../lib/energy-visualization-defaults'

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
