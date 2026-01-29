/**
 * Unit tests for stack-presets module
 * @vitest-environment jsdom
 *
 * ISSUE 30: Шаблоны стопок (Stack Presets)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { CubeStackConfig } from '../types/stack'
import {
  STACK_PRESETS,
  STACK_PRESET_CATEGORIES,
  getAllStackPresets,
  getPresetsByCategory,
  searchStackPresets,
  getPresetById,
  getUserStackPresets,
  saveStackAsPreset,
  deleteUserPreset,
  applyPreset,
  exportPresetAsJSON,
  importPresetFromJSON,
  type StackPresetCategory,
} from './stack-presets'
import { createCubeStack, createStackLayer } from '../types/stack'
import { createDefaultCube } from '../types/cube'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Helper to create test stack
function createTestStack(id: string = 'test_stack'): CubeStackConfig {
  const cube1 = createDefaultCube('test_cube_1')
  cube1.base.color = [0.5, 0.5, 0.5]

  const cube2 = createDefaultCube('test_cube_2')
  cube2.base.color = [0.7, 0.7, 0.7]

  const layer1 = createStackLayer('layer_1', cube1, 'bottom', 1.0)
  layer1.name = 'Bottom Layer'

  const layer2 = createStackLayer('layer_2', cube2, 'top', 1.0)
  layer2.name = 'Top Layer'

  return createCubeStack(id, [layer1, layer2], 'Test stack prompt')
}

describe('Stack Presets Module', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorageMock.clear()
  })

  describe('Built-in Presets', () => {
    it('should have at least 5 built-in presets', () => {
      expect(STACK_PRESETS.length).toBeGreaterThanOrEqual(5)
    })

    it('should have valid preset structure for all built-in presets', () => {
      for (const preset of STACK_PRESETS) {
        expect(preset.id).toBeDefined()
        expect(preset.name).toBeDefined()
        expect(preset.description).toBeDefined()
        expect(preset.tags).toBeInstanceOf(Array)
        expect(preset.category).toBeDefined()
        expect(preset.config).toBeDefined()
        expect(preset.config.layers).toBeInstanceOf(Array)
        expect(preset.config.layers.length).toBeGreaterThan(0)
      }
    })

    it('should have unique IDs for all built-in presets', () => {
      const ids = STACK_PRESETS.map((p) => p.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('should have Stone Wall preset', () => {
      const stoneWall = STACK_PRESETS.find((p) => p.id === 'stone_wall')
      expect(stoneWall).toBeDefined()
      expect(stoneWall?.name).toBe('Stone Wall')
      expect(stoneWall?.category).toBe('construction')
      expect(stoneWall?.config.layers.length).toBe(3)
    })

    it('should have Wood Tower preset', () => {
      const woodTower = STACK_PRESETS.find((p) => p.id === 'wood_tower')
      expect(woodTower).toBeDefined()
      expect(woodTower?.name).toBe('Wood Tower')
      expect(woodTower?.config.layers.length).toBe(4)
    })

    it('should have Layered Earth preset', () => {
      const layeredEarth = STACK_PRESETS.find((p) => p.id === 'layered_earth')
      expect(layeredEarth).toBeDefined()
      expect(layeredEarth?.category).toBe('terrain')
    })

    it('should have Magic Crystal Column preset', () => {
      const crystalColumn = STACK_PRESETS.find((p) => p.id === 'magic_crystal_column')
      expect(crystalColumn).toBeDefined()
      expect(crystalColumn?.category).toBe('magical')
    })

    it('should have Brick Chimney preset', () => {
      const brickChimney = STACK_PRESETS.find((p) => p.id === 'brick_chimney')
      expect(brickChimney).toBeDefined()
    })
  })

  describe('Preset Categories', () => {
    it('should have all required categories defined', () => {
      const expectedCategories: StackPresetCategory[] = [
        'natural',
        'construction',
        'magical',
        'terrain',
        'custom',
      ]

      for (const category of expectedCategories) {
        expect(STACK_PRESET_CATEGORIES[category]).toBeDefined()
        expect(STACK_PRESET_CATEGORIES[category].name).toBeDefined()
        expect(STACK_PRESET_CATEGORIES[category].description).toBeDefined()
      }
    })
  })

  describe('getAllStackPresets', () => {
    it('should return all built-in presets when no user presets exist', () => {
      const allPresets = getAllStackPresets()
      expect(allPresets.length).toBe(STACK_PRESETS.length)
    })

    it('should include user presets when they exist', () => {
      const testStack = createTestStack()
      saveStackAsPreset(testStack, 'User Stack', 'Test description')

      const allPresets = getAllStackPresets()
      expect(allPresets.length).toBe(STACK_PRESETS.length + 1)
    })
  })

  describe('getPresetsByCategory', () => {
    it('should filter presets by category', () => {
      const constructionPresets = getPresetsByCategory('construction')
      expect(constructionPresets.length).toBeGreaterThan(0)
      for (const preset of constructionPresets) {
        expect(preset.category).toBe('construction')
      }
    })

    it('should return empty array for category with no presets', () => {
      const customPresets = getPresetsByCategory('custom')
      expect(customPresets).toEqual([])
    })

    it('should include user presets in custom category', () => {
      const testStack = createTestStack()
      saveStackAsPreset(testStack, 'Custom Stack')

      const customPresets = getPresetsByCategory('custom')
      expect(customPresets.length).toBe(1)
      expect(customPresets[0].name).toBe('Custom Stack')
    })
  })

  describe('searchStackPresets', () => {
    it('should return all presets for empty query', () => {
      const results = searchStackPresets('')
      expect(results.length).toBe(STACK_PRESETS.length)
    })

    it('should search by name', () => {
      const results = searchStackPresets('stone')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((p) => p.name.toLowerCase().includes('stone'))).toBe(true)
    })

    it('should search by tags', () => {
      const results = searchStackPresets('medieval')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((p) => p.tags.includes('medieval'))).toBe(true)
    })

    it('should search by description', () => {
      const results = searchStackPresets('layers')
      expect(results.length).toBeGreaterThan(0)
    })

    it('should be case-insensitive', () => {
      const resultsLower = searchStackPresets('stone')
      const resultsUpper = searchStackPresets('STONE')
      expect(resultsLower.length).toBe(resultsUpper.length)
    })

    it('should return empty array for non-matching query', () => {
      const results = searchStackPresets('xyznonexistent123')
      expect(results).toEqual([])
    })
  })

  describe('getPresetById', () => {
    it('should find preset by ID', () => {
      const preset = getPresetById('stone_wall')
      expect(preset).toBeDefined()
      expect(preset?.id).toBe('stone_wall')
    })

    it('should return undefined for non-existent ID', () => {
      const preset = getPresetById('nonexistent_id')
      expect(preset).toBeUndefined()
    })

    it('should find user presets by ID', () => {
      const testStack = createTestStack()
      const savedPreset = saveStackAsPreset(testStack, 'Test Stack')

      const foundPreset = getPresetById(savedPreset.id)
      expect(foundPreset).toBeDefined()
      expect(foundPreset?.name).toBe('Test Stack')
    })
  })

  describe('User Preset Management', () => {
    describe('getUserStackPresets', () => {
      it('should return empty array when no user presets exist', () => {
        const userPresets = getUserStackPresets()
        expect(userPresets).toEqual([])
      })

      it('should return user presets from localStorage', () => {
        const testStack = createTestStack()
        saveStackAsPreset(testStack, 'Saved Stack')

        const userPresets = getUserStackPresets()
        expect(userPresets.length).toBe(1)
        expect(userPresets[0].isUserPreset).toBe(true)
      })
    })

    describe('saveStackAsPreset', () => {
      it('should save stack as user preset', () => {
        const testStack = createTestStack()
        const preset = saveStackAsPreset(testStack, 'My Stack', 'Description', ['tag1', 'tag2'])

        expect(preset.id).toBeDefined()
        expect(preset.name).toBe('My Stack')
        expect(preset.description).toBe('Description')
        expect(preset.tags).toEqual(['tag1', 'tag2'])
        expect(preset.category).toBe('custom')
        expect(preset.isUserPreset).toBe(true)
      })

      it('should persist preset to localStorage', () => {
        const testStack = createTestStack()
        saveStackAsPreset(testStack, 'Persisted Stack')

        expect(localStorageMock.setItem).toHaveBeenCalled()

        const userPresets = getUserStackPresets()
        expect(userPresets.length).toBe(1)
        expect(userPresets[0].name).toBe('Persisted Stack')
      })

      it('should generate unique IDs for presets', () => {
        const testStack = createTestStack()
        const preset1 = saveStackAsPreset(testStack, 'Stack 1')
        const preset2 = saveStackAsPreset(testStack, 'Stack 2')

        expect(preset1.id).not.toBe(preset2.id)
      })

      it('should extract preview color from first layer', () => {
        const testStack = createTestStack()
        testStack.layers[0].cubeConfig.base.color = [0.8, 0.2, 0.1]
        const preset = saveStackAsPreset(testStack, 'Colored Stack')

        expect(preset.previewColor).toEqual([0.8, 0.2, 0.1])
      })
    })

    describe('deleteUserPreset', () => {
      it('should delete user preset by ID', () => {
        const testStack = createTestStack()
        const preset = saveStackAsPreset(testStack, 'To Delete')

        const deleted = deleteUserPreset(preset.id)
        expect(deleted).toBe(true)

        const userPresets = getUserStackPresets()
        expect(userPresets).toEqual([])
      })

      it('should return false for non-existent preset', () => {
        const deleted = deleteUserPreset('nonexistent_id')
        expect(deleted).toBe(false)
      })

      it('should not affect built-in presets', () => {
        const deleted = deleteUserPreset('stone_wall')
        expect(deleted).toBe(false)

        const preset = getPresetById('stone_wall')
        expect(preset).toBeDefined()
      })
    })
  })

  describe('applyPreset', () => {
    it('should create a new config with unique ID', () => {
      const preset = STACK_PRESETS[0]
      const applied1 = applyPreset(preset)
      const applied2 = applyPreset(preset)

      expect(applied1.id).not.toBe(preset.config.id)
      expect(applied1.id).not.toBe(applied2.id)
    })

    it('should deep clone the config', () => {
      const preset = STACK_PRESETS[0]
      const applied = applyPreset(preset)

      // Modify the applied config
      applied.layers[0].name = 'Modified'

      // Original should be unchanged
      expect(preset.config.layers[0].name).not.toBe('Modified')
    })

    it('should update layer IDs', () => {
      const preset = STACK_PRESETS[0]
      const applied = applyPreset(preset)

      for (let i = 0; i < applied.layers.length; i++) {
        expect(applied.layers[i].id).toContain(applied.id)
        expect(applied.layers[i].id).toContain(`layer_${i}`)
      }
    })

    it('should update cube IDs', () => {
      const preset = STACK_PRESETS[0]
      const applied = applyPreset(preset)

      for (let i = 0; i < applied.layers.length; i++) {
        expect(applied.layers[i].cubeConfig.id).toContain(applied.id)
        expect(applied.layers[i].cubeConfig.id).toContain(`cube_${i}`)
      }
    })

    it('should set created and modified timestamps', () => {
      const preset = STACK_PRESETS[0]
      const applied = applyPreset(preset)

      expect(applied.meta?.created).toBeDefined()
      expect(applied.meta?.modified).toBeDefined()
    })

    it('should preserve preset name in meta', () => {
      const preset = STACK_PRESETS[0]
      const applied = applyPreset(preset)

      expect(applied.meta?.name).toBe(preset.name)
    })
  })

  describe('Export/Import', () => {
    describe('exportPresetAsJSON', () => {
      it('should export preset as valid JSON', () => {
        const preset = STACK_PRESETS[0]
        const json = exportPresetAsJSON(preset)

        expect(() => JSON.parse(json)).not.toThrow()
      })

      it('should include all preset properties', () => {
        const preset = STACK_PRESETS[0]
        const json = exportPresetAsJSON(preset)
        const parsed = JSON.parse(json)

        expect(parsed.id).toBe(preset.id)
        expect(parsed.name).toBe(preset.name)
        expect(parsed.description).toBe(preset.description)
        expect(parsed.tags).toEqual(preset.tags)
        expect(parsed.config).toBeDefined()
      })
    })

    describe('importPresetFromJSON', () => {
      it('should import valid preset JSON', () => {
        const preset = STACK_PRESETS[0]
        const json = exportPresetAsJSON(preset)
        const imported = importPresetFromJSON(json)

        expect(imported).not.toBeNull()
        expect(imported?.name).toBe(preset.name)
        expect(imported?.isUserPreset).toBe(true)
        expect(imported?.category).toBe('custom')
      })

      it('should generate new ID on import', () => {
        const preset = STACK_PRESETS[0]
        const json = exportPresetAsJSON(preset)
        const imported = importPresetFromJSON(json)

        expect(imported?.id).not.toBe(preset.id)
        expect(imported?.id).toContain('imported_')
      })

      it('should return null for invalid JSON', () => {
        const imported = importPresetFromJSON('not valid json')
        expect(imported).toBeNull()
      })

      it('should return null for JSON missing required fields', () => {
        const invalid = JSON.stringify({ name: 'Missing fields' })
        const imported = importPresetFromJSON(invalid)
        expect(imported).toBeNull()
      })

      it('should return null for JSON with empty layers', () => {
        const invalid = JSON.stringify({
          id: 'test',
          name: 'Test',
          config: { layers: null },
        })
        const imported = importPresetFromJSON(invalid)
        expect(imported).toBeNull()
      })
    })
  })

  describe('Preset Content Validation', () => {
    it('all presets should have valid layer configurations', () => {
      for (const preset of STACK_PRESETS) {
        for (const layer of preset.config.layers) {
          expect(layer.id).toBeDefined()
          expect(layer.cubeConfig).toBeDefined()
          expect(layer.cubeConfig.base).toBeDefined()
          expect(layer.cubeConfig.base.color).toHaveLength(3)

          // Validate color values are in range [0, 1]
          for (const c of layer.cubeConfig.base.color) {
            expect(c).toBeGreaterThanOrEqual(0)
            expect(c).toBeLessThanOrEqual(1)
          }
        }
      }
    })

    it('all presets should have positive total height', () => {
      for (const preset of STACK_PRESETS) {
        expect(preset.config.totalHeight).toBeGreaterThan(0)
      }
    })

    it('all presets should have correct layer positions', () => {
      for (const preset of STACK_PRESETS) {
        const layers = preset.config.layers
        if (layers.length === 1) {
          expect(layers[0].position).toBe('single')
        } else {
          expect(layers[0].position).toBe('bottom')
          expect(layers[layers.length - 1].position).toBe('top')
          for (let i = 1; i < layers.length - 1; i++) {
            expect(layers[i].position).toBe('middle')
          }
        }
      }
    })

    it('all non-top layers should have transitions defined', () => {
      for (const preset of STACK_PRESETS) {
        const layers = preset.config.layers
        for (let i = 0; i < layers.length - 1; i++) {
          expect(layers[i].transitionToNext).toBeDefined()
        }
        // Top layer should not have transition
        expect(layers[layers.length - 1].transitionToNext).toBeUndefined()
      }
    })
  })
})
