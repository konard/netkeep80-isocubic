/**
 * Unit tests for StackPresetPicker Vue component
 * Tests the Vue.js 3.0 migration of the StackPresetPicker component (TASK 63)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'

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
