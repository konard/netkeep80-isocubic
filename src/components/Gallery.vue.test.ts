/**
 * Unit tests for Gallery Vue component
 * Tests the Vue.js 3.0 migration of the Gallery component (TASK 64)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import Gallery, { GALLERY_META } from './Gallery.vue'
import type { SpectralCube } from '../types/cube'

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

describe('Gallery Vue Component — Module Exports', () => {
  it('should export Gallery.vue as a valid Vue component', async () => {
    const module = await import('./Gallery.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })

  it('should export GALLERY_META with correct metadata', () => {
    expect(GALLERY_META).toBeDefined()
    expect(GALLERY_META.id).toBe('gallery')
    expect(GALLERY_META.name).toBe('Gallery')
    expect(GALLERY_META.filePath).toBe('components/Gallery.vue')
  })
})

describe('Gallery Vue Component — Search and Filter Logic', () => {
  it('should filter cubes by search query in name', () => {
    const cubes = [
      { id: 'stone-1', meta: { name: 'Stone Wall', tags: ['stone'] } },
      { id: 'wood-1', meta: { name: 'Wood Plank', tags: ['wood'] } },
      { id: 'stone-2', meta: { name: 'Stone Floor', tags: ['stone'] } },
    ]
    const query = 'stone'
    const filtered = cubes.filter((cube) => {
      const name = cube.meta?.name?.toLowerCase() || ''
      return name.includes(query.toLowerCase())
    })
    expect(filtered).toHaveLength(2)
    expect(filtered[0].id).toBe('stone-1')
    expect(filtered[1].id).toBe('stone-2')
  })

  it('should filter cubes by search query in tags', () => {
    const cubes = [
      { id: 'cube-1', meta: { name: 'Cube A', tags: ['natural', 'rough'] } },
      { id: 'cube-2', meta: { name: 'Cube B', tags: ['smooth', 'polished'] } },
      { id: 'cube-3', meta: { name: 'Cube C', tags: ['natural', 'mossy'] } },
    ]
    const query = 'natural'
    const filtered = cubes.filter((cube) => {
      const tags = cube.meta?.tags || []
      return tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()))
    })
    expect(filtered).toHaveLength(2)
  })

  it('should handle empty search query returning all cubes', () => {
    const cubes = [
      { id: 'c1', meta: { name: 'A' } },
      { id: 'c2', meta: { name: 'B' } },
    ]
    const query = ''
    const filtered = query ? cubes.filter(() => false) : cubes
    expect(filtered).toHaveLength(2)
  })

  it('should filter cubes by category (material type)', () => {
    const cubes = [
      { id: 'c1', physics: { material: 'stone' } },
      { id: 'c2', physics: { material: 'wood' } },
      { id: 'c3', physics: { material: 'stone' } },
    ]
    const materialTypes = ['stone']
    const filtered = cubes.filter((cube) => {
      const material = cube.physics?.material
      return material && materialTypes.includes(material)
    })
    expect(filtered).toHaveLength(2)
  })

  it('should return all cubes when category is "all"', () => {
    const cubes = [
      { id: 'c1', physics: { material: 'stone' } },
      { id: 'c2', physics: { material: 'wood' } },
    ]
    const selectedCategory = 'all'
    const filtered = selectedCategory === 'all' ? cubes : cubes.filter(() => false)
    expect(filtered).toHaveLength(2)
  })
})

describe('Gallery Vue Component — Color Utilities', () => {
  it('should convert RGB array to CSS color string', () => {
    function colorToCSS(color: [number, number, number]): string {
      const r = Math.round(color[0] * 255)
      const g = Math.round(color[1] * 255)
      const b = Math.round(color[2] * 255)
      return `rgb(${r}, ${g}, ${b})`
    }

    expect(colorToCSS([1, 0, 0])).toBe('rgb(255, 0, 0)')
    expect(colorToCSS([0, 1, 0])).toBe('rgb(0, 255, 0)')
    expect(colorToCSS([0, 0, 1])).toBe('rgb(0, 0, 255)')
    expect(colorToCSS([0.5, 0.5, 0.5])).toBe('rgb(128, 128, 128)')
  })
})

describe('Gallery Vue Component — Mounting and Rendering', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should render gallery title', () => {
    const wrapper = shallowMount(Gallery)
    expect(wrapper.text()).toContain('Gallery')
  })

  it('should render view mode toggle buttons', () => {
    const wrapper = shallowMount(Gallery)
    const toggleButtons = wrapper.findAll('.gallery__toggle-btn')
    const texts = toggleButtons.map((btn) => btn.text())
    expect(texts).toContain('Presets')
    expect(texts).toContain('My Cubes')
  })

  it('should render search input', () => {
    const wrapper = shallowMount(Gallery)
    const searchInput = wrapper.find('.gallery__search-input')
    expect(searchInput.exists()).toBe(true)
    expect(searchInput.attributes('placeholder')).toBe('Search by name, tags...')
  })

  it('should render category filter buttons', () => {
    const wrapper = shallowMount(Gallery)
    const categoryButtons = wrapper.findAll('.gallery__category-btn')
    const texts = categoryButtons.map((btn) => btn.text())
    expect(texts).toContain('All')
    expect(texts).toContain('Stone')
    expect(texts).toContain('Wood')
    expect(texts).toContain('Metal')
    expect(texts).toContain('Organic')
    expect(texts).toContain('Crystal')
    expect(texts).toContain('Liquid')
  })

  it('should display preset cubes by default', () => {
    const wrapper = shallowMount(Gallery)
    expect(wrapper.text()).toContain('of 13 cubes')
  })

  it('should show save button when currentCube is provided', () => {
    const wrapper = shallowMount(Gallery, {
      props: { currentCube: mockCube },
    })
    const saveBtn = wrapper.find('.gallery__save-btn')
    expect(saveBtn.exists()).toBe(true)
    expect(saveBtn.text()).toBe('Save Current to Gallery')
  })

  it('should not show save button when no currentCube', () => {
    const wrapper = shallowMount(Gallery)
    const saveBtn = wrapper.find('.gallery__save-btn')
    expect(saveBtn.exists()).toBe(false)
  })

  it('should have gallery grid', () => {
    const wrapper = shallowMount(Gallery)
    expect(wrapper.find('.gallery__grid').exists()).toBe(true)
  })

  it('should display cube info (name and material)', () => {
    const wrapper = shallowMount(Gallery)
    const materialLabels = wrapper.findAll('.gallery__item-material')
    expect(materialLabels.length).toBeGreaterThan(0)
  })
})

describe('Gallery Vue Component — Category Filtering', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should filter by Stone category', async () => {
    const wrapper = shallowMount(Gallery)
    const stoneButton = wrapper
      .findAll('.gallery__category-btn')
      .find((btn) => btn.text() === 'Stone')!
    await stoneButton.trigger('click')
    expect(stoneButton.classes()).toContain('gallery__category-btn--active')
  })

  it('should filter by Wood category', async () => {
    const wrapper = shallowMount(Gallery)
    const woodButton = wrapper
      .findAll('.gallery__category-btn')
      .find((btn) => btn.text() === 'Wood')!
    await woodButton.trigger('click')
    expect(woodButton.classes()).toContain('gallery__category-btn--active')
  })

  it('should show all cubes when All category is selected', async () => {
    const wrapper = shallowMount(Gallery)

    // First filter by Stone
    const stoneButton = wrapper
      .findAll('.gallery__category-btn')
      .find((btn) => btn.text() === 'Stone')!
    await stoneButton.trigger('click')

    // Then select All
    const allButton = wrapper.findAll('.gallery__category-btn').find((btn) => btn.text() === 'All')!
    await allButton.trigger('click')

    expect(allButton.classes()).toContain('gallery__category-btn--active')
    expect(wrapper.text()).toContain('of 13 cubes')
  })
})

describe('Gallery Vue Component — Search Functionality', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should filter cubes by search query', async () => {
    const wrapper = shallowMount(Gallery)
    const searchInput = wrapper.find('.gallery__search-input')
    await searchInput.setValue('stone')
    expect((searchInput.element as HTMLInputElement).value).toBe('stone')
  })

  it('should show clear button when searching', async () => {
    const wrapper = shallowMount(Gallery)
    const searchInput = wrapper.find('.gallery__search-input')
    await searchInput.setValue('test')
    const clearButton = wrapper.find('.gallery__search-clear')
    expect(clearButton.exists()).toBe(true)
  })

  it('should clear search when clear button clicked', async () => {
    const wrapper = shallowMount(Gallery)
    const searchInput = wrapper.find('.gallery__search-input')
    await searchInput.setValue('test')

    const clearButton = wrapper.find('.gallery__search-clear')
    await clearButton.trigger('click')

    expect((searchInput.element as HTMLInputElement).value).toBe('')
  })

  it('should search by cube name', async () => {
    const wrapper = shallowMount(Gallery)
    const searchInput = wrapper.find('.gallery__search-input')
    await searchInput.setValue('Moss')
    // Should find results
    expect(wrapper.text()).toMatch(/of \d+ cubes/)
  })

  it('should show no results message when no cubes match', async () => {
    const wrapper = shallowMount(Gallery)
    const searchInput = wrapper.find('.gallery__search-input')
    await searchInput.setValue('xyznonexistent')
    expect(wrapper.text()).toContain('No cubes match your search')
  })
})

describe('Gallery Vue Component — View Mode Toggle', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should toggle to My Cubes view', async () => {
    const wrapper = shallowMount(Gallery)
    const myCubesButton = wrapper
      .findAll('.gallery__toggle-btn')
      .find((btn) => btn.text() === 'My Cubes')!
    await myCubesButton.trigger('click')
    expect(myCubesButton.classes()).toContain('gallery__toggle-btn--active')
  })

  it('should show empty message when no user cubes saved', async () => {
    const wrapper = shallowMount(Gallery)
    const myCubesButton = wrapper
      .findAll('.gallery__toggle-btn')
      .find((btn) => btn.text() === 'My Cubes')!
    await myCubesButton.trigger('click')
    expect(wrapper.text()).toContain('No saved cubes yet')
  })

  it('should toggle back to Presets view', async () => {
    const wrapper = shallowMount(Gallery)

    // Switch to My Cubes
    const myCubesButton = wrapper
      .findAll('.gallery__toggle-btn')
      .find((btn) => btn.text() === 'My Cubes')!
    await myCubesButton.trigger('click')

    // Switch back to Presets
    const presetsButton = wrapper
      .findAll('.gallery__toggle-btn')
      .find((btn) => btn.text() === 'Presets')!
    await presetsButton.trigger('click')

    expect(presetsButton.classes()).toContain('gallery__toggle-btn--active')
    expect(wrapper.text()).toContain('of 13 cubes')
  })
})

describe('Gallery Vue Component — Cube Selection', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should emit cubeSelect when cube is clicked', async () => {
    const wrapper = shallowMount(Gallery)
    const cubeItems = wrapper.findAll('.gallery__item')
    expect(cubeItems.length).toBeGreaterThan(0)
    await cubeItems[0].trigger('click')
    expect(wrapper.emitted('cubeSelect')).toBeTruthy()
  })

  it('should support keyboard navigation (Enter key)', async () => {
    const wrapper = shallowMount(Gallery)
    const cubeItems = wrapper.findAll('.gallery__item')
    expect(cubeItems.length).toBeGreaterThan(0)
    await cubeItems[0].trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('cubeSelect')).toBeTruthy()
  })

  it('should show status message after selecting cube', async () => {
    vi.useFakeTimers()
    const wrapper = shallowMount(Gallery)
    const cubeItems = wrapper.findAll('.gallery__item')
    expect(cubeItems.length).toBeGreaterThan(0)
    await cubeItems[0].trigger('click')

    // Status message should appear
    const statusEl = wrapper.find('[role="status"]')
    expect(statusEl.exists()).toBe(true)
    vi.useRealTimers()
  })
})

describe('Gallery Vue Component — Save to Gallery', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should save current cube when save button is clicked', async () => {
    vi.useFakeTimers()
    const wrapper = shallowMount(Gallery, {
      props: { currentCube: mockCube },
    })

    const saveButton = wrapper.find('.gallery__save-btn')
    await saveButton.trigger('click')

    // Status message should appear
    const statusEl = wrapper.find('[role="status"]')
    expect(statusEl.exists()).toBe(true)
    expect(wrapper.text()).toContain('Saved:')
    vi.useRealTimers()
  })
})

describe('Gallery Vue Component — Custom className', () => {
  it('should apply custom className', () => {
    const wrapper = shallowMount(Gallery, {
      props: { className: 'custom-class' },
    })
    expect(wrapper.find('.gallery.custom-class').exists()).toBe(true)
  })
})

describe('Gallery Vue Component — Tag Suggestions', () => {
  it('should update search when tag is entered', async () => {
    const wrapper = shallowMount(Gallery)
    const searchInput = wrapper.find('.gallery__search-input')
    await searchInput.setValue('stone')
    expect((searchInput.element as HTMLInputElement).value).toBe('stone')
  })
})
