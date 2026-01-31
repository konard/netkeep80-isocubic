/**
 * Unit tests for ExportPanel Vue component
 * Tests the Vue.js 3.0 migration of the ExportPanel component (TASK 64)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import ExportPanel, { EXPORT_PANEL_META } from './ExportPanel.vue'
import type { SpectralCube } from '../types/cube'
import { saveCubeToStorage, pushToHistory, clearHistory } from '../lib/storage'

// Mock cube for testing
const mockCube: SpectralCube = {
  id: 'test_cube',
  prompt: 'Test cube',
  base: {
    color: [0.5, 0.5, 0.5],
    roughness: 0.5,
    transparency: 1.0,
  },
  gradients: [
    {
      axis: 'y',
      factor: 0.3,
      color_shift: [0.1, 0.2, 0.1],
    },
  ],
  physics: {
    material: 'stone',
    density: 2.5,
    break_pattern: 'crumble',
  },
  meta: {
    name: 'Test Cube',
    tags: ['test', 'sample'],
    author: 'test',
  },
}

describe('ExportPanel Vue Component — Module Exports', () => {
  it('should export ExportPanel.vue as a valid Vue component', async () => {
    const module = await import('./ExportPanel.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })

  it('should export EXPORT_PANEL_META with correct metadata', () => {
    expect(EXPORT_PANEL_META).toBeDefined()
    expect(EXPORT_PANEL_META.id).toBe('export-panel')
    expect(EXPORT_PANEL_META.name).toBe('ExportPanel')
    expect(EXPORT_PANEL_META.filePath).toBe('components/ExportPanel.vue')
  })

  it('should have all expected features in metadata', () => {
    const features = EXPORT_PANEL_META.features
    expect(features).toBeDefined()

    const featureIds = features!.map((f) => f.id)
    expect(featureIds).toContain('json-export')
    expect(featureIds).toContain('json-import')
    expect(featureIds).toContain('local-storage')
    expect(featureIds).toContain('saved-configs-list')
    expect(featureIds).toContain('undo-redo')
  })
})

describe('ExportPanel Vue Component — Date Formatting', () => {
  it('should format ISO date strings correctly', () => {
    function formatDate(isoDate: string): string {
      try {
        return new Date(isoDate).toLocaleString()
      } catch {
        return isoDate
      }
    }

    const date = '2026-01-30T12:00:00Z'
    const result = formatDate(date)
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })

  it('should handle invalid date gracefully', () => {
    function formatDate(isoDate: string): string {
      try {
        const d = new Date(isoDate)
        if (isNaN(d.getTime())) return isoDate
        return d.toLocaleString()
      } catch {
        return isoDate
      }
    }

    const invalidDate = 'not-a-date'
    const result = formatDate(invalidDate)
    expect(typeof result).toBe('string')
  })
})

describe('ExportPanel Vue Component — Rendering', () => {
  beforeEach(() => {
    localStorage.clear()
    clearHistory()
  })

  it('should render undo/redo buttons', () => {
    const wrapper = shallowMount(ExportPanel, {
      props: { currentCube: null },
    })
    const undoBtn = wrapper.find('[aria-label="Undo"]')
    const redoBtn = wrapper.find('[aria-label="Redo"]')
    expect(undoBtn.exists()).toBe(true)
    expect(redoBtn.exists()).toBe(true)
    expect(undoBtn.text()).toBe('Undo')
    expect(redoBtn.text()).toBe('Redo')
  })

  it('should render export/import buttons', () => {
    const wrapper = shallowMount(ExportPanel, {
      props: { currentCube: null },
    })
    expect(wrapper.text()).toContain('Download JSON')
    expect(wrapper.text()).toContain('Upload JSON')
    expect(wrapper.text()).toContain('Save')
  })

  it('should disable export buttons when no cube', () => {
    const wrapper = shallowMount(ExportPanel, {
      props: { currentCube: null },
    })
    const downloadBtn = wrapper.find('[title="Download JSON file"]')
    const saveBtn = wrapper.find('[title="Save to browser storage"]')
    expect(downloadBtn.attributes('disabled')).toBeDefined()
    expect(saveBtn.attributes('disabled')).toBeDefined()
  })

  it('should enable export buttons when cube is provided', () => {
    const wrapper = shallowMount(ExportPanel, {
      props: { currentCube: mockCube },
    })
    const downloadBtn = wrapper.find('[title="Download JSON file"]')
    const saveBtn = wrapper.find('[title="Save to browser storage"]')
    expect(downloadBtn.attributes('disabled')).toBeUndefined()
    expect(saveBtn.attributes('disabled')).toBeUndefined()
  })
})

describe('ExportPanel Vue Component — Undo/Redo', () => {
  beforeEach(() => {
    localStorage.clear()
    clearHistory()
  })

  it('should have disabled undo button initially', () => {
    const wrapper = shallowMount(ExportPanel, {
      props: { currentCube: mockCube },
    })
    const undoBtn = wrapper.find('[aria-label="Undo"]')
    expect(undoBtn.attributes('disabled')).toBeDefined()
  })

  it('should have disabled redo button initially', () => {
    const wrapper = shallowMount(ExportPanel, {
      props: { currentCube: mockCube },
    })
    const redoBtn = wrapper.find('[aria-label="Redo"]')
    expect(redoBtn.attributes('disabled')).toBeDefined()
  })

  it('should enable undo after history push', () => {
    pushToHistory(mockCube)
    const modifiedCube = { ...mockCube, id: 'modified_cube' }
    pushToHistory(modifiedCube)

    const wrapper = shallowMount(ExportPanel, {
      props: { currentCube: modifiedCube },
    })

    const undoBtn = wrapper.find('[aria-label="Undo"]')
    expect(undoBtn.attributes('disabled')).toBeUndefined()
  })

  it('should emit cubeChange when undo is clicked', async () => {
    pushToHistory(mockCube)
    const modifiedCube: SpectralCube = { ...mockCube, id: 'modified_cube' }
    pushToHistory(modifiedCube)

    const wrapper = shallowMount(ExportPanel, {
      props: { currentCube: modifiedCube },
    })

    const undoBtn = wrapper.find('[aria-label="Undo"]')
    await undoBtn.trigger('click')

    expect(wrapper.emitted('cubeChange')).toBeTruthy()
    expect(wrapper.emitted('cubeChange')![0][0]).toEqual(mockCube)
  })
})

describe('ExportPanel Vue Component — Export Functionality', () => {
  beforeEach(() => {
    localStorage.clear()
    clearHistory()
  })

  it('should trigger export when Download JSON clicked', async () => {
    const mockCreateObjectURL = vi.fn(() => 'blob:mock-url')
    const mockRevokeObjectURL = vi.fn()
    global.URL.createObjectURL = mockCreateObjectURL
    global.URL.revokeObjectURL = mockRevokeObjectURL

    const wrapper = shallowMount(ExportPanel, {
      props: { currentCube: mockCube },
    })

    const downloadBtn = wrapper.find('[title="Download JSON file"]')
    await downloadBtn.trigger('click')

    // Should show success message
    const statusEl = wrapper.find('[role="status"]')
    expect(statusEl.exists()).toBe(true)
    expect(wrapper.text()).toContain('exported successfully')
  })
})

describe('ExportPanel Vue Component — Save Functionality', () => {
  beforeEach(() => {
    localStorage.clear()
    clearHistory()
  })

  it('should save cube to localStorage when Save clicked', async () => {
    vi.useFakeTimers()
    const wrapper = shallowMount(ExportPanel, {
      props: { currentCube: mockCube },
    })

    const saveBtn = wrapper.find('[title="Save to browser storage"]')
    await saveBtn.trigger('click')

    // Should show success message
    const statusEl = wrapper.find('[role="status"]')
    expect(statusEl.exists()).toBe(true)
    expect(wrapper.text()).toContain('Configuration saved')

    vi.useRealTimers()
  })

  it('should show saved configs in list after saving', async () => {
    const wrapper = shallowMount(ExportPanel, {
      props: { currentCube: mockCube },
    })

    const saveBtn = wrapper.find('[title="Save to browser storage"]')
    await saveBtn.trigger('click')

    // Saved configs list should appear
    expect(wrapper.text()).toContain('Saved Configurations')
  })
})

describe('ExportPanel Vue Component — Saved Configs List', () => {
  beforeEach(() => {
    localStorage.clear()
    clearHistory()
    // Pre-save some configs
    saveCubeToStorage(mockCube)
  })

  it('should display saved configs', () => {
    const wrapper = shallowMount(ExportPanel, {
      props: { currentCube: null },
    })
    expect(wrapper.text()).toContain('Saved Configurations')
    expect(wrapper.text()).toContain('Test Cube')
  })

  it('should have load button for each config', () => {
    const wrapper = shallowMount(ExportPanel, {
      props: { currentCube: null },
    })
    const loadButtons = wrapper
      .findAll('.export-panel__saved-actions button')
      .filter((btn) => btn.text().includes('Load'))
    expect(loadButtons.length).toBeGreaterThan(0)
  })

  it('should have delete button for each config', () => {
    const wrapper = shallowMount(ExportPanel, {
      props: { currentCube: null },
    })
    const deleteButtons = wrapper
      .findAll('.export-panel__saved-actions button')
      .filter((btn) => btn.text().includes('Delete'))
    expect(deleteButtons.length).toBeGreaterThan(0)
  })

  it('should emit cubeLoad when Load clicked', async () => {
    const wrapper = shallowMount(ExportPanel, {
      props: { currentCube: null },
    })

    const loadButtons = wrapper
      .findAll('.export-panel__saved-actions button')
      .filter((btn) => btn.text() === 'Load')
    await loadButtons[0].trigger('click')

    expect(wrapper.emitted('cubeLoad')).toBeTruthy()
    const emittedCube = wrapper.emitted('cubeLoad')![0][0] as SpectralCube
    expect(emittedCube.id).toBe('test_cube')
  })

  it('should remove config when Delete clicked', async () => {
    vi.useFakeTimers()
    const wrapper = shallowMount(ExportPanel, {
      props: { currentCube: null },
    })

    // Initially should show the config
    expect(wrapper.text()).toContain('Test Cube')

    const deleteButtons = wrapper
      .findAll('.export-panel__saved-actions button')
      .filter((btn) => btn.text() === 'Delete')
    await deleteButtons[0].trigger('click')

    // Config should be removed
    expect(wrapper.text()).not.toContain('Test Cube')

    vi.useRealTimers()
  })

  it('should show success message after loading', async () => {
    vi.useFakeTimers()
    const wrapper = shallowMount(ExportPanel, {
      props: { currentCube: null },
    })

    const loadButtons = wrapper
      .findAll('.export-panel__saved-actions button')
      .filter((btn) => btn.text() === 'Load')
    await loadButtons[0].trigger('click')

    const statusEl = wrapper.find('[role="status"]')
    expect(statusEl.exists()).toBe(true)
    expect(wrapper.text()).toContain('Loaded:')

    vi.useRealTimers()
  })

  it('should show success message after deleting', async () => {
    vi.useFakeTimers()
    const wrapper = shallowMount(ExportPanel, {
      props: { currentCube: null },
    })

    const deleteButtons = wrapper
      .findAll('.export-panel__saved-actions button')
      .filter((btn) => btn.text() === 'Delete')
    await deleteButtons[0].trigger('click')

    const statusEl = wrapper.find('[role="status"]')
    expect(statusEl.exists()).toBe(true)
    expect(wrapper.text()).toContain('deleted')

    vi.useRealTimers()
  })
})

describe('ExportPanel Vue Component — Status Messages', () => {
  beforeEach(() => {
    localStorage.clear()
    clearHistory()
  })

  it('should clear success message after timeout', async () => {
    vi.useFakeTimers()
    const wrapper = shallowMount(ExportPanel, {
      props: { currentCube: mockCube },
    })

    const saveBtn = wrapper.find('[title="Save to browser storage"]')
    await saveBtn.trigger('click')

    // Message should be visible
    expect(wrapper.find('[role="status"]').exists()).toBe(true)

    // Advance time
    vi.advanceTimersByTime(4000)
    await wrapper.vm.$nextTick()

    // Message should be cleared
    expect(wrapper.find('[role="status"]').exists()).toBe(false)

    vi.useRealTimers()
  })
})

describe('ExportPanel Vue Component — Custom className', () => {
  it('should apply custom className', () => {
    const wrapper = shallowMount(ExportPanel, {
      props: { currentCube: null, className: 'custom-class' },
    })
    expect(wrapper.find('.export-panel.custom-class').exists()).toBe(true)
  })
})

describe('ExportPanel Vue Component — Import Functionality', () => {
  it('should have Upload JSON button always enabled', () => {
    const wrapper = shallowMount(ExportPanel, {
      props: { currentCube: null },
    })
    const uploadBtn = wrapper.find('[title="Upload JSON file"]')
    expect(uploadBtn.attributes('disabled')).toBeUndefined()
  })
})

describe('ExportPanel Vue Component — Accessibility', () => {
  it('should have proper button titles', () => {
    const wrapper = shallowMount(ExportPanel, {
      props: { currentCube: mockCube },
    })

    expect(wrapper.find('[title="Undo (Ctrl+Z)"]').exists()).toBe(true)
    expect(wrapper.find('[title="Redo (Ctrl+Shift+Z)"]').exists()).toBe(true)
    expect(wrapper.find('[title="Download JSON file"]').exists()).toBe(true)
    expect(wrapper.find('[title="Upload JSON file"]').exists()).toBe(true)
    expect(wrapper.find('[title="Save to browser storage"]').exists()).toBe(true)
  })

  it('should have aria-labels for undo/redo', () => {
    const wrapper = shallowMount(ExportPanel, {
      props: { currentCube: mockCube },
    })

    const undoBtn = wrapper.find('[aria-label="Undo"]')
    const redoBtn = wrapper.find('[aria-label="Redo"]')
    expect(undoBtn.attributes('aria-label')).toBe('Undo')
    expect(redoBtn.attributes('aria-label')).toBe('Redo')
  })
})
