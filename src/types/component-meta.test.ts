/**
 * Tests for ComponentMeta types and utilities
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createDefaultMeta,
  validateComponentMeta,
  createMetaTooltip,
  registerComponentMeta,
  getComponentMeta,
  getAllComponentMeta,
  searchComponentMeta,
  getComponentsByPhase,
  getComponentsByStatus,
  componentMetaRegistry,
  type ComponentMeta,
} from './component-meta'

describe('createDefaultMeta', () => {
  it('should create default metadata with required fields', () => {
    const meta = createDefaultMeta('test-id', 'TestComponent', 'components/Test.tsx')

    expect(meta.id).toBe('test-id')
    expect(meta.name).toBe('TestComponent')
    expect(meta.filePath).toBe('components/Test.tsx')
    expect(meta.version).toBe('1.0.0')
    expect(meta.phase).toBe(1)
    expect(meta.status).toBe('stable')
  })

  it('should create with default summary and description', () => {
    const meta = createDefaultMeta('test-id', 'TestComponent', 'components/Test.tsx')

    expect(meta.summary).toBe('TestComponent component')
    expect(meta.description).toBe('TestComponent is a React component.')
  })

  it('should include initial history entry', () => {
    const meta = createDefaultMeta('test-id', 'TestComponent', 'components/Test.tsx')

    expect(meta.history).toHaveLength(1)
    expect(meta.history[0].version).toBe('1.0.0')
    expect(meta.history[0].type).toBe('created')
    expect(meta.history[0].description).toBe('Initial version')
  })

  it('should create empty arrays for optional collections', () => {
    const meta = createDefaultMeta('test-id', 'TestComponent', 'components/Test.tsx')

    expect(meta.features).toEqual([])
    expect(meta.dependencies).toEqual([])
    expect(meta.relatedFiles).toEqual([])
    expect(meta.tags).toEqual([])
  })

  it('should merge options with defaults', () => {
    const meta = createDefaultMeta('test-id', 'TestComponent', 'components/Test.tsx', {
      version: '2.0.0',
      phase: 3,
      status: 'beta',
      summary: 'Custom summary',
    })

    expect(meta.version).toBe('2.0.0')
    expect(meta.phase).toBe(3)
    expect(meta.status).toBe('beta')
    expect(meta.summary).toBe('Custom summary')
    // Other defaults should remain
    expect(meta.id).toBe('test-id')
    expect(meta.name).toBe('TestComponent')
  })
})

describe('validateComponentMeta', () => {
  const validMeta: ComponentMeta = {
    id: 'valid-id',
    name: 'ValidComponent',
    version: '1.0.0',
    summary: 'A valid component',
    description: 'This is a valid component for testing.',
    phase: 1,
    filePath: 'components/Valid.tsx',
    history: [],
    features: [],
    dependencies: [],
    relatedFiles: [],
    tags: [],
    status: 'stable',
    lastUpdated: '2026-01-29T12:00:00Z',
  }

  it('should return true for valid metadata', () => {
    expect(validateComponentMeta(validMeta)).toBe(true)
  })

  it('should return false for missing id', () => {
    const invalid = { ...validMeta, id: undefined }
    expect(validateComponentMeta(invalid)).toBe(false)
  })

  it('should return false for missing name', () => {
    const invalid = { ...validMeta, name: undefined }
    expect(validateComponentMeta(invalid)).toBe(false)
  })

  it('should return false for missing version', () => {
    const invalid = { ...validMeta, version: undefined }
    expect(validateComponentMeta(invalid)).toBe(false)
  })

  it('should return false for missing arrays', () => {
    const invalid = { ...validMeta, history: undefined }
    expect(validateComponentMeta(invalid)).toBe(false)
  })

  it('should return false for invalid phase', () => {
    const invalid = { ...validMeta, phase: undefined }
    expect(validateComponentMeta(invalid)).toBe(false)
  })
})

describe('createMetaTooltip', () => {
  const meta: ComponentMeta = {
    id: 'test',
    name: 'TestComponent',
    version: '1.2.3',
    summary: 'A test summary',
    description: 'Full description here',
    phase: 2,
    filePath: 'test.tsx',
    history: [],
    features: [],
    dependencies: [],
    relatedFiles: [],
    tags: [],
    status: 'beta',
    lastUpdated: '2026-01-29T12:00:00Z',
  }

  it('should extract tooltip fields from full metadata', () => {
    const tooltip = createMetaTooltip(meta)

    expect(tooltip.name).toBe('TestComponent')
    expect(tooltip.summary).toBe('A test summary')
    expect(tooltip.version).toBe('1.2.3')
    expect(tooltip.status).toBe('beta')
    expect(tooltip.phase).toBe(2)
  })

  it('should not include full description', () => {
    const tooltip = createMetaTooltip(meta)

    // Tooltip should not have description (only summary)
    expect((tooltip as Record<string, unknown>).description).toBeUndefined()
  })
})

describe('Component registry', () => {
  beforeEach(() => {
    // Clear registry before each test
    componentMetaRegistry.clear()
  })

  it('should register component metadata', () => {
    const meta = createDefaultMeta('reg-test', 'RegTest', 'test.tsx')
    registerComponentMeta(meta)

    expect(componentMetaRegistry.has('reg-test')).toBe(true)
  })

  it('should retrieve registered metadata by ID', () => {
    const meta = createDefaultMeta('get-test', 'GetTest', 'test.tsx')
    registerComponentMeta(meta)

    const retrieved = getComponentMeta('get-test')
    expect(retrieved).toBeDefined()
    expect(retrieved?.name).toBe('GetTest')
  })

  it('should return undefined for unregistered ID', () => {
    const retrieved = getComponentMeta('nonexistent')
    expect(retrieved).toBeUndefined()
  })

  it('should return all registered metadata', () => {
    registerComponentMeta(createDefaultMeta('all-1', 'Comp1', 'a.tsx'))
    registerComponentMeta(createDefaultMeta('all-2', 'Comp2', 'b.tsx'))
    registerComponentMeta(createDefaultMeta('all-3', 'Comp3', 'c.tsx'))

    const all = getAllComponentMeta()
    expect(all).toHaveLength(3)
    expect(all.map((m) => m.id)).toContain('all-1')
    expect(all.map((m) => m.id)).toContain('all-2')
    expect(all.map((m) => m.id)).toContain('all-3')
  })
})

describe('searchComponentMeta', () => {
  beforeEach(() => {
    componentMetaRegistry.clear()

    registerComponentMeta({
      ...createDefaultMeta('search-1', 'ButtonComponent', 'Button.tsx'),
      summary: 'A clickable button',
      tags: ['ui', 'input', 'phase-1'],
    })

    registerComponentMeta({
      ...createDefaultMeta('search-2', 'InputField', 'Input.tsx'),
      summary: 'Text input field',
      description: 'A field for text entry',
      tags: ['form', 'input', 'phase-2'],
    })

    registerComponentMeta({
      ...createDefaultMeta('search-3', 'Card', 'Card.tsx'),
      summary: 'Display card',
      tags: ['layout', 'container'],
    })
  })

  it('should find components by name', () => {
    const results = searchComponentMeta('button')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('search-1')
  })

  it('should find components by summary', () => {
    const results = searchComponentMeta('clickable')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('search-1')
  })

  it('should find components by description', () => {
    const results = searchComponentMeta('text entry')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('search-2')
  })

  it('should find components by tags', () => {
    const results = searchComponentMeta('input')
    expect(results).toHaveLength(2)
  })

  it('should be case-insensitive', () => {
    const results = searchComponentMeta('BUTTON')
    expect(results).toHaveLength(1)
  })

  it('should return empty array for no matches', () => {
    const results = searchComponentMeta('nonexistent')
    expect(results).toHaveLength(0)
  })
})

describe('getComponentsByPhase', () => {
  beforeEach(() => {
    componentMetaRegistry.clear()

    registerComponentMeta({
      ...createDefaultMeta('phase-1a', 'Comp1A', 'a.tsx'),
      phase: 1,
    })
    registerComponentMeta({
      ...createDefaultMeta('phase-1b', 'Comp1B', 'b.tsx'),
      phase: 1,
    })
    registerComponentMeta({
      ...createDefaultMeta('phase-2a', 'Comp2A', 'c.tsx'),
      phase: 2,
    })
    registerComponentMeta({
      ...createDefaultMeta('phase-3a', 'Comp3A', 'd.tsx'),
      phase: 3,
    })
  })

  it('should return all components from a specific phase', () => {
    const phase1 = getComponentsByPhase(1)
    expect(phase1).toHaveLength(2)
    expect(phase1.map((m) => m.id)).toContain('phase-1a')
    expect(phase1.map((m) => m.id)).toContain('phase-1b')
  })

  it('should return single component from phase 2', () => {
    const phase2 = getComponentsByPhase(2)
    expect(phase2).toHaveLength(1)
    expect(phase2[0].id).toBe('phase-2a')
  })

  it('should return empty array for phase with no components', () => {
    const phase99 = getComponentsByPhase(99)
    expect(phase99).toHaveLength(0)
  })
})

describe('getComponentsByStatus', () => {
  beforeEach(() => {
    componentMetaRegistry.clear()

    registerComponentMeta({
      ...createDefaultMeta('stable-1', 'Stable1', 'a.tsx'),
      status: 'stable',
    })
    registerComponentMeta({
      ...createDefaultMeta('stable-2', 'Stable2', 'b.tsx'),
      status: 'stable',
    })
    registerComponentMeta({
      ...createDefaultMeta('beta-1', 'Beta1', 'c.tsx'),
      status: 'beta',
    })
    registerComponentMeta({
      ...createDefaultMeta('deprecated-1', 'Deprecated1', 'd.tsx'),
      status: 'deprecated',
    })
  })

  it('should return all stable components', () => {
    const stable = getComponentsByStatus('stable')
    expect(stable).toHaveLength(2)
  })

  it('should return beta components', () => {
    const beta = getComponentsByStatus('beta')
    expect(beta).toHaveLength(1)
    expect(beta[0].id).toBe('beta-1')
  })

  it('should return deprecated components', () => {
    const deprecated = getComponentsByStatus('deprecated')
    expect(deprecated).toHaveLength(1)
    expect(deprecated[0].id).toBe('deprecated-1')
  })

  it('should return empty array for status with no components', () => {
    const experimental = getComponentsByStatus('experimental')
    expect(experimental).toHaveLength(0)
  })
})
