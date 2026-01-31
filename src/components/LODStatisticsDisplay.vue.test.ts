/**
 * Unit tests for LODStatisticsDisplay Vue component
 * Tests the Vue.js 3.0 migration of the LODStatistics component (TASK 62)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LODStatisticsDisplay from './LODStatisticsDisplay.vue'
import type { LODStatistics } from '../types/lod'

// Mock statistics data
const mockStats: LODStatistics = {
  totalCubes: 27,
  cubesPerLevel: { 0: 9, 1: 6, 2: 5, 3: 4, 4: 3 },
  averageLODLevel: 1.5,
  performanceSavings: 35.2,
  transitioningCubes: 2,
}

describe('LODStatisticsDisplay Vue Component', () => {
  it('should render total cubes count', () => {
    const wrapper = mount(LODStatisticsDisplay, {
      props: { stats: mockStats },
    })
    expect(wrapper.text()).toContain('Total Cubes: 27')
  })

  it('should render average LOD level', () => {
    const wrapper = mount(LODStatisticsDisplay, {
      props: { stats: mockStats },
    })
    expect(wrapper.text()).toContain('Avg LOD Level: 1.50')
  })

  it('should render performance savings', () => {
    const wrapper = mount(LODStatisticsDisplay, {
      props: { stats: mockStats },
    })
    expect(wrapper.text()).toContain('Performance Savings: 35.2%')
  })

  it('should render cubes per level', () => {
    const wrapper = mount(LODStatisticsDisplay, {
      props: { stats: mockStats },
    })
    expect(wrapper.text()).toContain('LOD 0: 9 cubes')
    expect(wrapper.text()).toContain('LOD 1: 6 cubes')
    expect(wrapper.text()).toContain('LOD 2: 5 cubes')
    expect(wrapper.text()).toContain('LOD 3: 4 cubes')
    expect(wrapper.text()).toContain('LOD 4: 3 cubes')
  })

  it('should render transitioning cubes when > 0', () => {
    const wrapper = mount(LODStatisticsDisplay, {
      props: { stats: mockStats },
    })
    expect(wrapper.text()).toContain('Transitioning: 2')
  })

  it('should not render transitioning cubes when 0', () => {
    const statsNoTransition: LODStatistics = {
      ...mockStats,
      transitioningCubes: 0,
    }
    const wrapper = mount(LODStatisticsDisplay, {
      props: { stats: statsNoTransition },
    })
    expect(wrapper.text()).not.toContain('Transitioning')
  })

  it('should apply correct inline styles', () => {
    const wrapper = mount(LODStatisticsDisplay, {
      props: { stats: mockStats },
    })
    const rootDiv = wrapper.find('div')
    expect(rootDiv.attributes('style')).toContain('position: absolute')
    expect(rootDiv.attributes('style')).toContain('font-family: monospace')
  })
})

describe('LODStatisticsDisplay Vue Component — Module Exports', () => {
  it('should export as a valid Vue component', async () => {
    const module = await import('./LODStatisticsDisplay.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })
})
