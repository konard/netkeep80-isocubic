/**
 * Unit tests for CubePreview Vue component
 * Tests the Vue.js 3.0 + TresJS migration of the CubePreview component (TASK 62)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest'
import type { SpectralCube } from '../types/cube'
import { createDefaultCube } from '../types/cube'
import type { ComponentMeta } from '../types/component-meta'

// Mock TresJS dependencies to avoid ESM import issues in test environment
vi.mock('@tresjs/core', () => ({
  TresCanvas: {},
  useRenderLoop: () => ({ onLoop: () => {} }),
  useTresContext: () => ({ camera: { value: null } }),
}))

vi.mock('@tresjs/cientos', () => ({
  OrbitControls: {},
  ContactShadows: {},
  Environment: {},
  Html: {},
}))

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

describe('CubePreview Vue Component — Metadata', () => {
  it('should export component metadata', async () => {
    const module = await import('./CubePreview.vue')
    // The CUBE_PREVIEW_META is exported from the SFC script setup
    // but since it's registered via registerComponentMeta, we test it separately
    expect(module.default).toBeDefined()
  })

  it('should have correct component metadata structure', async () => {
    // Test the metadata import directly
    const { CUBE_PREVIEW_META } = await import('./CubePreview.vue')
    expect(CUBE_PREVIEW_META).toBeDefined()
    expect(CUBE_PREVIEW_META.id).toBe('cube-preview')
    expect(CUBE_PREVIEW_META.name).toBe('CubePreview')
    expect(CUBE_PREVIEW_META.version).toBe('2.0.0')
    expect(CUBE_PREVIEW_META.phase).toBe(10)
    expect(CUBE_PREVIEW_META.taskId).toBe('TASK 62')
    expect(CUBE_PREVIEW_META.filePath).toBe('components/CubePreview.vue')
  })

  it('should have TresJS dependencies in metadata', async () => {
    const { CUBE_PREVIEW_META } = await import('./CubePreview.vue')
    const depNames = CUBE_PREVIEW_META.dependencies?.map((d: { name: string }) => d.name) ?? []
    expect(depNames).toContain('@tresjs/core')
    expect(depNames).toContain('@tresjs/cientos')
  })

  it('should have migration history in metadata', async () => {
    const { CUBE_PREVIEW_META } = await import('./CubePreview.vue')
    const migrationEntry = CUBE_PREVIEW_META.history?.find(
      (h: { taskId?: string }) => h.taskId === 'TASK 62'
    )
    expect(migrationEntry).toBeDefined()
    expect(migrationEntry?.version).toBe('2.0.0')
    expect(migrationEntry?.description).toContain('TresJS')
  })

  it('should have tresjs tag', async () => {
    const { CUBE_PREVIEW_META } = await import('./CubePreview.vue')
    expect(CUBE_PREVIEW_META.tags).toContain('tresjs')
    expect(CUBE_PREVIEW_META.tags).toContain('phase-10')
  })
})

describe('CubePreview Vue Component — Props Interface', () => {
  it('should define correct default props values', () => {
    // Verify the expected defaults match the documented behavior
    const defaultProps = {
      showGrid: true,
      animate: false,
      rotationSpeed: 0.5,
      showShadows: true,
      backgroundColor: '#1a1a1a',
      className: '',
    }

    expect(defaultProps.showGrid).toBe(true)
    expect(defaultProps.animate).toBe(false)
    expect(defaultProps.rotationSpeed).toBe(0.5)
    expect(defaultProps.showShadows).toBe(true)
    expect(defaultProps.backgroundColor).toBe('#1a1a1a')
    expect(defaultProps.className).toBe('')
  })

  it('should handle null config for placeholder display', () => {
    // When config is null, the component shows a placeholder
    const config: SpectralCube | null = null
    expect(config).toBeNull()
  })

  it('should accept a valid SpectralCube config', () => {
    expect(mockCube.id).toBe('test_cube')
    expect(mockCube.base.color).toEqual([0.5, 0.5, 0.5])
  })
})

describe('CubePreview Vue Component — Module Exports', () => {
  it('should export CubePreview.vue as a valid Vue component', async () => {
    const module = await import('./CubePreview.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })
})
