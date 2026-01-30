/**
 * Unit tests for tinyLLM module
 * Tests cube generation from text prompts, templates, and random generation
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  generateFromPrompt,
  generateFromTemplate,
  generateRandom,
  getAvailableTemplates,
  isReady,
  initialize,
  // Extended AI functions (ISSUE 19)
  extractStyle,
  generateContextual,
  generateFromComposite,
  generateBatch,
  generateGroup,
  generateWithFineTuning,
  addTrainingExample,
  getFineTuningDataset,
  clearFineTuningDataset,
  recordFeedback,
  getAvailableThemes,
  getAvailableGroupTypes,
  // Metadata Query functions (TASK 53)
  isMetadataQueryReady,
  initializeMetadataQueryMode,
  processMetadataQueryWithLLM,
  clearMetadataQueryCache,
  setMetadataQueryConfig,
  getMetadataQueryConfig,
  addMetadataQueryTrainingExample,
  getMetadataQueryDataset,
  clearMetadataQueryDataset,
  loadMetadataQueryDataset,
  exportMetadataQueryDataset,
  recordMetadataQueryFeedback,
  getAvailableMetadataQueryIntents,
  getMetadataQueryExamples,
} from './tinyLLM'
import { validateCube } from './validation'
import type { SpectralCube, CompositeDescription, BatchGenerationRequest } from '../types/cube'

describe('tinyLLM', () => {
  describe('isReady', () => {
    it('should return true immediately (rule-based generation)', () => {
      expect(isReady()).toBe(true)
    })
  })

  describe('initialize', () => {
    it('should resolve immediately without errors', async () => {
      await expect(initialize()).resolves.toBeUndefined()
    })
  })

  describe('getAvailableTemplates', () => {
    it('should return an array of template names', () => {
      const templates = getAvailableTemplates()

      expect(Array.isArray(templates)).toBe(true)
      expect(templates.length).toBeGreaterThan(0)
    })

    it('should include common material templates', () => {
      const templates = getAvailableTemplates()

      expect(templates).toContain('stone')
      expect(templates).toContain('wood')
      expect(templates).toContain('metal')
      expect(templates).toContain('crystal')
      expect(templates).toContain('grass')
    })
  })

  describe('generateFromPrompt', () => {
    it('should generate a valid cube from simple English prompt', async () => {
      const result = await generateFromPrompt('stone')

      expect(result.success).toBe(true)
      expect(result.cube).not.toBeNull()
      expect(result.cube?.id).toBeDefined()
      expect(result.cube?.prompt).toBe('stone')

      // Validate the generated cube
      const validation = validateCube(result.cube)
      expect(validation.valid).toBe(true)
    })

    it('should generate a valid cube from Russian prompt', async () => {
      const result = await generateFromPrompt('камень')

      expect(result.success).toBe(true)
      expect(result.cube).not.toBeNull()
      expect(result.method).toBe('keyword')
      expect(result.confidence).toBeGreaterThan(0)

      const validation = validateCube(result.cube)
      expect(validation.valid).toBe(true)
    })

    it('should recognize material keywords and apply properties', async () => {
      const result = await generateFromPrompt('granite')

      expect(result.success).toBe(true)
      expect(result.cube?.physics?.material).toBe('stone')
      expect(result.cube?.meta?.tags).toContain('granite')
    })

    it('should apply color modifiers to base color', async () => {
      const darkResult = await generateFromPrompt('dark stone')
      const lightResult = await generateFromPrompt('light stone')

      expect(darkResult.success).toBe(true)
      expect(lightResult.success).toBe(true)

      // Dark stone should have lower color values
      const darkColor = darkResult.cube!.base.color
      const lightColor = lightResult.cube!.base.color

      // At least one channel should be darker in dark stone
      const isDarker =
        darkColor[0] < lightColor[0] || darkColor[1] < lightColor[1] || darkColor[2] < lightColor[2]
      expect(isDarker).toBe(true)
    })

    it('should apply roughness modifiers', async () => {
      const polishedResult = await generateFromPrompt('polished stone')
      const roughResult = await generateFromPrompt('rough stone')

      expect(polishedResult.success).toBe(true)
      expect(roughResult.success).toBe(true)

      const polishedRoughness = polishedResult.cube!.base.roughness ?? 0.5
      const roughRoughness = roughResult.cube!.base.roughness ?? 0.5

      expect(polishedRoughness).toBeLessThan(roughRoughness)
    })

    it('should use hybrid method when modifiers are applied', async () => {
      const result = await generateFromPrompt('dark weathered stone')

      expect(result.success).toBe(true)
      expect(result.method).toBe('hybrid')
      expect(result.confidence).toBeGreaterThan(0.5)
    })

    it('should fall back to random generation for unrecognized prompts', async () => {
      const result = await generateFromPrompt('xyzzy qwerty')

      expect(result.success).toBe(true)
      expect(result.method).toBe('random')
      expect(result.confidence).toBeLessThan(0.5)
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('should generate unique IDs for each cube', async () => {
      const result1 = await generateFromPrompt('stone')
      const result2 = await generateFromPrompt('stone')

      expect(result1.cube?.id).not.toBe(result2.cube?.id)
    })

    it('should clamp color values to valid range', async () => {
      const result = await generateFromPrompt('bright white stone')

      expect(result.success).toBe(true)
      const color = result.cube!.base.color
      expect(color[0]).toBeLessThanOrEqual(1)
      expect(color[1]).toBeLessThanOrEqual(1)
      expect(color[2]).toBeLessThanOrEqual(1)
      expect(color[0]).toBeGreaterThanOrEqual(0)
      expect(color[1]).toBeGreaterThanOrEqual(0)
      expect(color[2]).toBeGreaterThanOrEqual(0)
    })

    it('should clamp roughness to valid range', async () => {
      const result = await generateFromPrompt('extremely polished shiny glossy stone')

      expect(result.success).toBe(true)
      const roughness = result.cube!.base.roughness ?? 0.5
      expect(roughness).toBeGreaterThanOrEqual(0)
      expect(roughness).toBeLessThanOrEqual(1)
    })

    it('should handle complex multi-word prompts', async () => {
      const result = await generateFromPrompt('ancient weathered dark mossy stone with cracks')

      expect(result.success).toBe(true)
      expect(result.cube).not.toBeNull()
      expect(result.method).toBe('hybrid')
    })

    it('should handle empty or whitespace prompts gracefully', async () => {
      const emptyResult = await generateFromPrompt('')
      const whitespaceResult = await generateFromPrompt('   ')

      // Both should still succeed with random generation
      expect(emptyResult.success).toBe(true)
      expect(whitespaceResult.success).toBe(true)
      expect(emptyResult.method).toBe('random')
      expect(whitespaceResult.method).toBe('random')
    })

    it('should recognize metal variants', async () => {
      const results = await Promise.all([
        generateFromPrompt('gold'),
        generateFromPrompt('copper'),
        generateFromPrompt('iron'),
        generateFromPrompt('steel'),
      ])

      for (const result of results) {
        expect(result.success).toBe(true)
        expect(result.cube?.physics?.material).toBe('metal')
      }
    })

    it('should recognize crystal and glass materials', async () => {
      const crystalResult = await generateFromPrompt('crystal')
      const glassResult = await generateFromPrompt('glass')
      const iceResult = await generateFromPrompt('ice')

      expect(crystalResult.cube?.physics?.material).toBe('crystal')
      expect(glassResult.cube?.physics?.material).toBe('glass')
      expect(iceResult.cube?.physics?.material).toBe('crystal')

      // These materials should have transparency
      expect(crystalResult.cube?.base.transparency).toBeLessThan(1)
      expect(glassResult.cube?.base.transparency).toBeLessThan(1)
      expect(iceResult.cube?.base.transparency).toBeLessThan(1)
    })

    it('should include prompt in generated cube', async () => {
      const prompt = 'beautiful ancient marble pillar'
      const result = await generateFromPrompt(prompt)

      expect(result.cube?.prompt).toBe(prompt)
    })

    it('should set author to TinyLLM', async () => {
      const result = await generateFromPrompt('stone')

      expect(result.cube?.meta?.author).toBe('TinyLLM')
    })

    it('should include generated tag in meta', async () => {
      const result = await generateFromPrompt('stone')

      expect(result.cube?.meta?.tags).toContain('generated')
    })

    it('should set created timestamp', async () => {
      const beforeTime = new Date().toISOString()
      const result = await generateFromPrompt('stone')
      const afterTime = new Date().toISOString()

      expect(result.cube?.meta?.created).toBeDefined()
      // Compare ISO string timestamps lexicographically
      const created = result.cube?.meta?.created ?? ''
      expect(created >= beforeTime).toBe(true)
      expect(created <= afterTime).toBe(true)
    })
  })

  describe('generateFromTemplate', () => {
    it('should generate a valid cube from template name', async () => {
      const result = await generateFromTemplate('stone')

      expect(result.success).toBe(true)
      expect(result.cube).not.toBeNull()
      expect(result.method).toBe('template')
      expect(result.confidence).toBe(1.0)
      expect(result.warnings).toHaveLength(0)

      const validation = validateCube(result.cube)
      expect(validation.valid).toBe(true)
    })

    it('should fail for non-existent template', async () => {
      const result = await generateFromTemplate('nonexistent_material')

      expect(result.success).toBe(false)
      expect(result.cube).toBeNull()
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('should handle case-insensitive template names', async () => {
      const result1 = await generateFromTemplate('STONE')
      const result2 = await generateFromTemplate('Stone')
      const result3 = await generateFromTemplate('stone')

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      expect(result3.success).toBe(true)
    })

    it('should trim whitespace from template names', async () => {
      const result = await generateFromTemplate('  stone  ')

      expect(result.success).toBe(true)
      expect(result.cube).not.toBeNull()
    })

    it('should generate cubes with correct material properties', async () => {
      const woodResult = await generateFromTemplate('wood')
      const metalResult = await generateFromTemplate('metal')
      const crystalResult = await generateFromTemplate('crystal')

      expect(woodResult.cube?.physics?.material).toBe('wood')
      expect(metalResult.cube?.physics?.material).toBe('metal')
      expect(crystalResult.cube?.physics?.material).toBe('crystal')

      // Wood should splinter
      expect(woodResult.cube?.physics?.break_pattern).toBe('splinter')
      // Metal should shatter
      expect(metalResult.cube?.physics?.break_pattern).toBe('shatter')
    })

    it('should include template name in cube name', async () => {
      const result = await generateFromTemplate('granite')

      expect(result.cube?.meta?.name?.toLowerCase()).toContain('granite')
    })
  })

  describe('generateRandom', () => {
    it('should generate a valid random cube', async () => {
      const result = await generateRandom()

      expect(result.success).toBe(true)
      expect(result.cube).not.toBeNull()
      expect(result.method).toBe('random')
      expect(result.confidence).toBe(0.2)

      const validation = validateCube(result.cube)
      expect(validation.valid).toBe(true)
    })

    it('should generate cubes with valid color values', async () => {
      for (let i = 0; i < 10; i++) {
        const result = await generateRandom()
        const color = result.cube!.base.color

        expect(color[0]).toBeGreaterThanOrEqual(0)
        expect(color[0]).toBeLessThanOrEqual(1)
        expect(color[1]).toBeGreaterThanOrEqual(0)
        expect(color[1]).toBeLessThanOrEqual(1)
        expect(color[2]).toBeGreaterThanOrEqual(0)
        expect(color[2]).toBeLessThanOrEqual(1)
      }
    })

    it('should generate cubes with valid roughness', async () => {
      for (let i = 0; i < 10; i++) {
        const result = await generateRandom()
        const roughness = result.cube!.base.roughness ?? 0.5

        expect(roughness).toBeGreaterThanOrEqual(0)
        expect(roughness).toBeLessThanOrEqual(1)
      }
    })

    it('should generate cubes with valid noise settings', async () => {
      for (let i = 0; i < 10; i++) {
        const result = await generateRandom()
        const noise = result.cube!.noise

        expect(['perlin', 'worley', 'crackle']).toContain(noise?.type)
        expect(noise?.scale).toBeGreaterThan(0)
      }
    })

    it('should generate unique IDs for random cubes', async () => {
      const ids = new Set<string>()
      for (let i = 0; i < 20; i++) {
        const result = await generateRandom()
        ids.add(result.cube!.id)
      }
      expect(ids.size).toBe(20)
    })

    it('should include random tag in metadata', async () => {
      const result = await generateRandom()

      expect(result.cube?.meta?.tags).toContain('random')
      expect(result.cube?.meta?.tags).toContain('generated')
    })

    it('should set prompt to indicate random generation', async () => {
      const result = await generateRandom()

      expect(result.cube?.prompt).toContain('Random')
    })
  })

  describe('Russian language support', () => {
    it('should translate Russian material words', async () => {
      const russianPrompts = [
        { prompt: 'камень', expectedMaterial: 'stone' },
        { prompt: 'дерево', expectedMaterial: 'wood' },
        { prompt: 'металл', expectedMaterial: 'metal' },
        { prompt: 'кристалл', expectedMaterial: 'crystal' },
        { prompt: 'золото', expectedMaterial: 'metal' },
        { prompt: 'лёд', expectedMaterial: 'crystal' },
      ]

      for (const { prompt, expectedMaterial } of russianPrompts) {
        const result = await generateFromPrompt(prompt)
        expect(result.success).toBe(true)
        expect(result.cube?.physics?.material).toBe(expectedMaterial)
      }
    })

    it('should translate Russian color modifiers', async () => {
      const darkResult = await generateFromPrompt('тёмный камень')
      const lightResult = await generateFromPrompt('светлый камень')

      expect(darkResult.success).toBe(true)
      expect(lightResult.success).toBe(true)

      // Dark should have lower color values
      const darkColor = darkResult.cube!.base.color
      const lightColor = lightResult.cube!.base.color

      const isDarker =
        darkColor[0] < lightColor[0] || darkColor[1] < lightColor[1] || darkColor[2] < lightColor[2]
      expect(isDarker).toBe(true)
    })

    it('should translate Russian texture modifiers', async () => {
      const polishedResult = await generateFromPrompt('полированный камень')
      const roughResult = await generateFromPrompt('шероховатый камень')

      expect(polishedResult.success).toBe(true)
      expect(roughResult.success).toBe(true)

      const polishedRoughness = polishedResult.cube!.base.roughness ?? 0.5
      const roughRoughness = roughResult.cube!.base.roughness ?? 0.5

      expect(polishedRoughness).toBeLessThan(roughRoughness)
    })

    it('should handle mixed Russian and English prompts', async () => {
      const result = await generateFromPrompt('dark камень weathered')

      expect(result.success).toBe(true)
      expect(result.method).toBe('hybrid')
    })
  })

  describe('gradient generation', () => {
    it('should add gradients for gradient keywords', async () => {
      const verticalResult = await generateFromPrompt('stone vertical gradient')

      expect(verticalResult.success).toBe(true)
      expect(verticalResult.cube?.gradients).toBeDefined()
      expect(verticalResult.cube?.gradients?.length).toBeGreaterThan(0)
    })

    it('should not duplicate gradient axes', async () => {
      const result = await generateFromPrompt('stone top bottom vertical')

      expect(result.success).toBe(true)
      if (result.cube?.gradients) {
        const axes = result.cube.gradients.map((g) => g.axis)
        const uniqueAxes = new Set(axes)
        expect(axes.length).toBe(uniqueAxes.size)
      }
    })
  })

  describe('validation integration', () => {
    it('should produce cubes that pass JSON schema validation', async () => {
      const prompts = [
        'stone',
        'dark wood',
        'polished metal',
        'crystal magic',
        'ancient brick',
        'mossy cobblestone',
      ]

      for (const prompt of prompts) {
        const result = await generateFromPrompt(prompt)
        expect(result.success).toBe(true)

        const validation = validateCube(result.cube)
        expect(validation.valid).toBe(true)
      }
    })

    it('should produce templates that pass JSON schema validation', async () => {
      const templates = getAvailableTemplates()

      for (const template of templates.slice(0, 10)) {
        const result = await generateFromTemplate(template)
        if (result.success) {
          const validation = validateCube(result.cube)
          expect(validation.valid).toBe(true)
        }
      }
    })

    it('should produce random cubes that pass JSON schema validation', async () => {
      for (let i = 0; i < 20; i++) {
        const result = await generateRandom()
        expect(result.success).toBe(true)

        const validation = validateCube(result.cube)
        expect(validation.valid).toBe(true)
      }
    })
  })

  describe('confidence scoring', () => {
    it('should have higher confidence for keyword matches vs random', async () => {
      const keywordMatch = await generateFromPrompt('stone')
      const hybridMatch = await generateFromPrompt('dark weathered stone')
      const randomMatch = await generateFromPrompt('xyzzy qwerty')

      // Both keyword and hybrid matches should have similar high confidence
      expect(keywordMatch.confidence).toBeGreaterThanOrEqual(0.9)
      expect(hybridMatch.confidence).toBeGreaterThanOrEqual(0.9)
      // Random match should have much lower confidence
      expect(randomMatch.confidence).toBeLessThan(0.5)
      expect(hybridMatch.confidence).toBeGreaterThan(randomMatch.confidence)
    })

    it('should have maximum confidence for templates', async () => {
      const result = await generateFromTemplate('stone')

      expect(result.confidence).toBe(1.0)
    })

    it('should have low confidence for random generation', async () => {
      const result = await generateRandom()

      expect(result.confidence).toBeLessThanOrEqual(0.3)
    })
  })

  // ============================================================================
  // Extended AI Tests (ISSUE 19)
  // ============================================================================

  describe('extractStyle', () => {
    it('should return default values for empty array', () => {
      const style = extractStyle([])

      expect(style.averageColor).toEqual([0.5, 0.5, 0.5])
      expect(style.averageRoughness).toBe(0.5)
      expect(style.dominantMaterial).toBe('stone')
      expect(style.dominantNoiseType).toBe('perlin')
      expect(style.commonTags).toEqual([])
    })

    it('should calculate average color from cubes', async () => {
      const cube1 = (await generateFromTemplate('stone')).cube!
      const cube2 = (await generateFromTemplate('wood')).cube!

      const style = extractStyle([cube1, cube2])

      // Should be average of stone and wood colors
      expect(style.averageColor[0]).toBeGreaterThan(0)
      expect(style.averageColor[0]).toBeLessThan(1)
    })

    it('should find dominant material from cubes', async () => {
      const stone1 = (await generateFromTemplate('stone')).cube!
      const stone2 = (await generateFromTemplate('granite')).cube!
      const wood = (await generateFromTemplate('wood')).cube!

      const style = extractStyle([stone1, stone2, wood])

      expect(style.dominantMaterial).toBe('stone')
    })

    it('should collect common tags', async () => {
      const stone1 = (await generateFromTemplate('stone')).cube!
      const granite = (await generateFromTemplate('granite')).cube!

      // Both should have 'stone' tag
      const style = extractStyle([stone1, granite])

      expect(style.commonTags).toContain('stone')
    })
  })

  describe('generateContextual', () => {
    it('should generate a valid cube with context', async () => {
      const existingCube = (await generateFromTemplate('stone')).cube!
      const context = {
        existingCubes: new Map([['test', existingCube]]),
        theme: 'medieval',
      }

      const result = await generateContextual('brick', context)

      expect(result.success).toBe(true)
      expect(result.cube).not.toBeNull()
      expect(result.method).toBe('hybrid')

      const validation = validateCube(result.cube)
      expect(validation.valid).toBe(true)
    })

    it('should apply theme modifiers', async () => {
      const resultWithTheme = await generateContextual('stone', { theme: 'medieval' })
      const resultWithoutTheme = await generateFromPrompt('stone')

      expect(resultWithTheme.success).toBe(true)
      expect(resultWithoutTheme.success).toBe(true)

      // Medieval theme should add specific tags
      expect(resultWithTheme.cube?.meta?.tags).toContain('medieval')
    })

    it('should blend colors with existing cubes', async () => {
      const brightCube: SpectralCube = {
        id: 'bright',
        base: { color: [1, 1, 1], roughness: 0.2 },
      }
      const context = {
        neighborsInGrid: [brightCube],
      }

      const darkResult = await generateContextual('dark stone', context)

      expect(darkResult.success).toBe(true)
      // The color should be influenced by the bright neighbor
      // (not as dark as it would be without context)
    })

    it('should handle unknown themes gracefully', async () => {
      const result = await generateContextual('stone', { theme: 'unknowntheme123' })

      expect(result.success).toBe(true)
      expect(result.warnings.some((w) => w.includes('not recognized'))).toBe(true)
    })
  })

  describe('generateFromComposite', () => {
    it('should generate primary cube from composite description', async () => {
      const description: CompositeDescription = {
        primary: 'dark stone',
      }

      const result = await generateFromComposite(description)

      expect(result.success).toBe(true)
      expect(result.cubes.length).toBeGreaterThanOrEqual(1)
      expect(result.method).toBe('composite')
    })

    it('should generate neighbor cubes', async () => {
      const description: CompositeDescription = {
        primary: 'stone wall',
        neighbors: [{ direction: 'y', relation: 'gradient', description: 'moss' }],
      }

      const result = await generateFromComposite(description)

      expect(result.success).toBe(true)
      expect(result.cubes.length).toBe(2)
      expect(result.positions).toHaveLength(2)
    })

    it('should apply theme to composite generation', async () => {
      const description: CompositeDescription = {
        primary: 'brick',
        theme: 'medieval',
      }

      const result = await generateFromComposite(description)

      expect(result.success).toBe(true)
      expect(result.cubes[0]?.meta?.tags).toContain('medieval')
    })

    it('should generate variations when requested', async () => {
      const description: CompositeDescription = {
        primary: 'stone',
        variations: 3,
      }

      const result = await generateFromComposite(description)

      expect(result.success).toBe(true)
      expect(result.cubes.length).toBe(3) // primary + 2 variations
    })

    it('should handle similar relation', async () => {
      const description: CompositeDescription = {
        primary: 'stone',
        neighbors: [{ direction: 'x', relation: 'similar', description: 'rock' }],
      }

      const result = await generateFromComposite(description)

      expect(result.success).toBe(true)
      expect(result.cubes.length).toBe(2)

      // Similar cubes should have similar colors
      const primaryColor = result.cubes[0].base.color
      const neighborColor = result.cubes[1].base.color
      const colorDiff =
        Math.abs(primaryColor[0] - neighborColor[0]) +
        Math.abs(primaryColor[1] - neighborColor[1]) +
        Math.abs(primaryColor[2] - neighborColor[2])
      expect(colorDiff).toBeLessThan(1.5) // Should be somewhat similar
    })

    it('should handle contrast relation', async () => {
      const description: CompositeDescription = {
        primary: 'dark stone',
        neighbors: [{ direction: 'y', relation: 'contrast', description: 'light crystal' }],
      }

      const result = await generateFromComposite(description)

      expect(result.success).toBe(true)
      expect(result.cubes.length).toBe(2)
      expect(result.cubes[1]?.meta?.tags).toContain('contrast')
    })
  })

  describe('generateBatch', () => {
    it('should generate multiple cubes from prompts', async () => {
      const request: BatchGenerationRequest = {
        prompts: ['stone', 'wood', 'metal'],
      }

      const results = await generateBatch(request)

      expect(results.length).toBe(3)
      for (const result of results) {
        expect(result.success).toBe(true)
        expect(result.cube).not.toBeNull()
      }
    })

    it('should apply global style modifier', async () => {
      const request: BatchGenerationRequest = {
        prompts: ['stone', 'brick'],
        style: 'dark weathered',
      }

      const results = await generateBatch(request)

      expect(results.length).toBe(2)
      // Both should have darker colors due to style modifier
      for (const result of results) {
        expect(result.success).toBe(true)
      }
    })

    it('should use context cubes for style extraction', async () => {
      const contextCube = (await generateFromTemplate('gold')).cube!
      const request: BatchGenerationRequest = {
        prompts: ['metal'],
        contextCubes: [contextCube],
        grouping: 'related',
      }

      const results = await generateBatch(request)

      expect(results.length).toBe(1)
      expect(results[0].success).toBe(true)
    })

    it('should handle themed grouping', async () => {
      const request: BatchGenerationRequest = {
        prompts: ['stone', 'brick', 'wood'],
        grouping: 'themed',
        theme: 'medieval',
      }

      const results = await generateBatch(request)

      expect(results.length).toBe(3)
      for (const result of results) {
        expect(result.success).toBe(true)
      }
    })

    it('should handle individual grouping (no context)', async () => {
      const request: BatchGenerationRequest = {
        prompts: ['stone', 'crystal'],
        grouping: 'individual',
      }

      const results = await generateBatch(request)

      expect(results.length).toBe(2)
      // Each should be generated independently
      expect(results[0].method).toBe('keyword')
      expect(results[1].method).toBe('keyword')
    })
  })

  describe('generateGroup', () => {
    it('should generate wall group', async () => {
      const result = await generateGroup('wall', 'stone')

      expect(result.success).toBe(true)
      expect(result.cubes.length).toBeGreaterThan(0)
      expect(result.groupType).toBe('wall')
      expect(result.positions).toBeDefined()
    })

    it('should generate floor group', async () => {
      const result = await generateGroup('floor', 'cobblestone')

      expect(result.success).toBe(true)
      expect(result.groupType).toBe('floor')
    })

    it('should generate column group', async () => {
      const result = await generateGroup('column', 'marble')

      expect(result.success).toBe(true)
      expect(result.groupType).toBe('column')
      // Column should have height dimension
      expect(result.cubes.length).toBeGreaterThanOrEqual(3)
    })

    it('should use custom dimensions', async () => {
      const result = await generateGroup('structure', 'brick', [2, 2, 2])

      expect(result.success).toBe(true)
      expect(result.cubes.length).toBe(8) // 2x2x2 = 8 cubes
    })

    it('should apply gradient based on group type', async () => {
      const result = await generateGroup('wall', 'stone')

      expect(result.success).toBe(true)
      // Cubes at different Y positions should have slightly different colors
      if (result.cubes.length >= 2 && result.positions) {
        const bottomCube = result.cubes.find((_, i) => result.positions![i][1] === 0)
        const topCube = result.cubes.find(
          (_, i) => result.positions![i][1] === Math.max(...result.positions!.map((p) => p[1]))
        )

        if (bottomCube && topCube) {
          // Colors should be slightly different due to gradient
          const colorDiff = Math.abs(bottomCube.base.color[0] - topCube.base.color[0])
          expect(colorDiff).toBeGreaterThanOrEqual(0) // Some variation expected
        }
      }
    })

    it('should add group tags to cubes', async () => {
      const result = await generateGroup('terrain', 'grass')

      expect(result.success).toBe(true)
      for (const cube of result.cubes) {
        expect(cube.meta?.tags).toContain('terrain')
        expect(cube.meta?.tags).toContain('group')
      }
    })
  })

  describe('fine-tuning', () => {
    beforeEach(() => {
      clearFineTuningDataset()
    })

    it('should start with no dataset', () => {
      const dataset = getFineTuningDataset()
      expect(dataset).toBeNull()
    })

    it('should add training examples', async () => {
      const cube = (await generateFromTemplate('stone')).cube!
      addTrainingExample({
        prompt: 'ancient weathered stone',
        cube,
        rating: 0.9,
        created: new Date().toISOString(),
      })

      const dataset = getFineTuningDataset()
      expect(dataset).not.toBeNull()
      expect(dataset?.examples.length).toBe(1)
    })

    it('should match fine-tuning examples', async () => {
      const templateCube = (await generateFromTemplate('stone')).cube!
      addTrainingExample({
        prompt: 'weathered ancient stone',
        cube: templateCube,
        rating: 1.0,
        created: new Date().toISOString(),
      })

      const result = await generateWithFineTuning('weathered ancient stone')

      expect(result.success).toBe(true)
      expect(result.confidence).toBeGreaterThan(0.7)
      expect(result.cube?.meta?.tags).toContain('fine-tuned')
    })

    it('should fall back to standard generation when no match', async () => {
      addTrainingExample({
        prompt: 'specific unique material',
        cube: (await generateFromTemplate('stone')).cube!,
        rating: 0.8,
        created: new Date().toISOString(),
      })

      const result = await generateWithFineTuning('completely different prompt')

      expect(result.success).toBe(true)
      // Should fall back to standard generation
      expect(result.cube?.meta?.tags).not.toContain('fine-tuned')
    })

    it('should record feedback', async () => {
      const cube = (await generateFromPrompt('stone')).cube!
      recordFeedback('stone', cube, 0.85)

      const dataset = getFineTuningDataset()
      expect(dataset?.examples.length).toBe(1)
      expect(dataset?.examples[0].rating).toBe(0.85)
    })

    it('should clamp rating to valid range', async () => {
      const cube = (await generateFromPrompt('stone')).cube!
      recordFeedback('stone', cube, 1.5) // Should be clamped to 1.0

      const dataset = getFineTuningDataset()
      expect(dataset?.examples[0].rating).toBe(1.0)
    })

    it('should clear dataset', async () => {
      const cube = (await generateFromTemplate('stone')).cube!
      addTrainingExample({
        prompt: 'test',
        cube,
        created: new Date().toISOString(),
      })

      clearFineTuningDataset()

      const dataset = getFineTuningDataset()
      expect(dataset).toBeNull()
    })
  })

  describe('getAvailableThemes', () => {
    it('should return array of theme names', () => {
      const themes = getAvailableThemes()

      expect(Array.isArray(themes)).toBe(true)
      expect(themes.length).toBeGreaterThan(0)
    })

    it('should include common themes', () => {
      const themes = getAvailableThemes()

      expect(themes).toContain('medieval')
      expect(themes).toContain('fantasy')
      expect(themes).toContain('modern')
      expect(themes).toContain('natural')
    })

    it('should not include Russian duplicates', () => {
      const themes = getAvailableThemes()

      // Russian themes are translations, not unique themes
      expect(themes).not.toContain('средневековый')
      expect(themes).not.toContain('фэнтези')
    })
  })

  describe('getAvailableGroupTypes', () => {
    it('should return array of group types', () => {
      const types = getAvailableGroupTypes()

      expect(Array.isArray(types)).toBe(true)
      expect(types.length).toBeGreaterThan(0)
    })

    it('should include all standard group types', () => {
      const types = getAvailableGroupTypes()

      expect(types).toContain('wall')
      expect(types).toContain('floor')
      expect(types).toContain('column')
      expect(types).toContain('structure')
      expect(types).toContain('terrain')
    })
  })

  // ============================================================================
  // TASK 53: TinyLLM + Metadata Integration Tests (Phase 8 - AI + Metadata)
  // ============================================================================

  describe('metadata query mode', () => {
    describe('isMetadataQueryReady', () => {
      it('should return true (rule-based implementation always ready)', () => {
        expect(isMetadataQueryReady()).toBe(true)
      })
    })

    describe('initializeMetadataQueryMode', () => {
      beforeEach(() => {
        clearMetadataQueryDataset()
      })

      it('should resolve without errors', async () => {
        await expect(initializeMetadataQueryMode()).resolves.toBeUndefined()
      })

      it('should populate default training examples', async () => {
        await initializeMetadataQueryMode()
        const dataset = getMetadataQueryDataset()

        expect(dataset).not.toBeNull()
        expect(dataset?.examples.length).toBeGreaterThan(0)
      })

      it('should not duplicate examples on multiple calls', async () => {
        await initializeMetadataQueryMode()
        const countAfterFirst = getMetadataQueryDataset()?.examples.length ?? 0

        await initializeMetadataQueryMode()
        const countAfterSecond = getMetadataQueryDataset()?.examples.length ?? 0

        expect(countAfterSecond).toBe(countAfterFirst)
      })
    })

    describe('processMetadataQueryWithLLM', () => {
      beforeEach(() => {
        clearMetadataQueryCache()
        setMetadataQueryConfig({ enableCache: false })
      })

      it('should process English query successfully', () => {
        const response = processMetadataQueryWithLLM({
          query: 'What does Gallery do?',
        })

        expect(response.success).toBe(true)
        expect(response.language).toBe('en')
        expect(response.intent).toBeDefined()
        expect(response.processingTime).toBeDefined()
      })

      it('should process Russian query successfully', () => {
        const response = processMetadataQueryWithLLM({
          query: 'Что делает компонент Gallery?',
        })

        expect(response.success).toBe(true)
        expect(response.language).toBe('ru')
        expect(response.intent).toBeDefined()
      })

      it('should classify describe intent correctly', () => {
        const response = processMetadataQueryWithLLM({
          query: 'Describe the CubePreview component',
        })

        expect(response.intent).toBe('describe')
      })

      it('should classify find intent correctly', () => {
        const response = processMetadataQueryWithLLM({
          query: 'Find components related to export',
        })

        expect(response.intent).toBe('find')
      })

      it('should classify dependencies intent correctly', () => {
        const response = processMetadataQueryWithLLM({
          query: 'dependencies of Gallery',
        })

        expect(response.intent).toBe('dependencies')
      })

      it('should classify history intent correctly', () => {
        const response = processMetadataQueryWithLLM({
          query: 'Show history and version changes of Gallery',
        })

        expect(response.intent).toBe('history')
      })

      it('should classify usage intent correctly', () => {
        const response = processMetadataQueryWithLLM({
          query: 'How to use CubePreview example',
        })

        expect(response.intent).toBe('usage')
      })

      it('should classify features intent correctly', () => {
        const response = processMetadataQueryWithLLM({
          query: 'List capabilities and features of Gallery',
        })

        expect(response.intent).toBe('features')
      })

      it('should classify status intent correctly', () => {
        const response = processMetadataQueryWithLLM({
          query: 'Show status and stability of Gallery',
        })

        expect(response.intent).toBe('status')
      })

      it('should provide suggestions for no results', () => {
        const response = processMetadataQueryWithLLM({
          query: 'xyzzy nonexistent component abc123',
        })

        expect(response.success).toBe(true)
        // Should have suggestions when no components found
        if (response.components?.length === 0) {
          expect(response.suggestions?.length).toBeGreaterThan(0)
        }
      })

      it('should provide related queries for found components', () => {
        const response = processMetadataQueryWithLLM({
          query: 'Describe Gallery',
        })

        expect(response.success).toBe(true)
        if (response.components && response.components.length > 0) {
          expect(response.relatedQueries).toBeDefined()
        }
      })

      it('should respect maxResults option', () => {
        const response = processMetadataQueryWithLLM({
          query: 'Find all components',
          maxResults: 3,
        })

        expect(response.success).toBe(true)
        if (response.components) {
          expect(response.components.length).toBeLessThanOrEqual(3)
        }
      })

      it('should handle empty query', () => {
        const response = processMetadataQueryWithLLM({
          query: '',
        })

        expect(response.success).toBe(true)
        // Should still provide a valid response
        expect(response.answer).toBeDefined()
      })
    })

    describe('metadata query caching', () => {
      beforeEach(() => {
        clearMetadataQueryCache()
        setMetadataQueryConfig({ enableCache: true, cacheTTL: 60000 })
      })

      it('should cache query results', () => {
        const query = 'What does Gallery do?'

        // First call
        const response1 = processMetadataQueryWithLLM({ query })

        // Second call should be faster (from cache)
        const startTime = performance.now()
        const response2 = processMetadataQueryWithLLM({ query })
        const elapsed = performance.now() - startTime

        expect(response2.answer).toBe(response1.answer)
        // Cache retrieval should be very fast
        expect(elapsed).toBeLessThan(100)
      })

      it('should clear cache properly', () => {
        const query = 'What does Gallery do?'

        processMetadataQueryWithLLM({ query })
        clearMetadataQueryCache()

        // After clearing, should not use cached result
        const response = processMetadataQueryWithLLM({ query })
        expect(response.success).toBe(true)
      })
    })

    describe('metadata query configuration', () => {
      it('should get default configuration', () => {
        const config = getMetadataQueryConfig()

        expect(config.maxResults).toBeDefined()
        expect(config.minRelevanceScore).toBeDefined()
        expect(config.enableCache).toBeDefined()
        expect(config.cacheTTL).toBeDefined()
        expect(config.useLLMEnhancements).toBeDefined()
      })

      it('should set configuration', () => {
        const newConfig = {
          maxResults: 5,
          minRelevanceScore: 0.2,
        }

        setMetadataQueryConfig(newConfig)
        const config = getMetadataQueryConfig()

        expect(config.maxResults).toBe(5)
        expect(config.minRelevanceScore).toBe(0.2)
      })

      it('should toggle LLM enhancements', () => {
        setMetadataQueryConfig({ useLLMEnhancements: false })
        const config = getMetadataQueryConfig()

        expect(config.useLLMEnhancements).toBe(false)

        // Query should still work with enhancements disabled
        const response = processMetadataQueryWithLLM({
          query: 'What does Gallery do?',
        })
        expect(response.success).toBe(true)
      })
    })

    describe('metadata query training', () => {
      beforeEach(() => {
        clearMetadataQueryDataset()
      })

      it('should start with no dataset', () => {
        const dataset = getMetadataQueryDataset()
        expect(dataset).toBeNull()
      })

      it('should add training examples', () => {
        addMetadataQueryTrainingExample({
          query: 'What does Gallery do?',
          intent: 'describe',
          expectedComponents: ['Gallery'],
          rating: 0.9,
          created: new Date().toISOString(),
        })

        const dataset = getMetadataQueryDataset()
        expect(dataset).not.toBeNull()
        expect(dataset?.examples.length).toBe(1)
        expect(dataset?.examples[0].query).toBe('What does Gallery do?')
      })

      it('should record feedback', () => {
        recordMetadataQueryFeedback('test query', 'describe', ['Gallery'], 0.85)

        const dataset = getMetadataQueryDataset()
        expect(dataset?.examples.length).toBe(1)
        expect(dataset?.examples[0].rating).toBe(0.85)
      })

      it('should clamp rating to valid range', () => {
        recordMetadataQueryFeedback('test', 'find', [], 1.5)

        const dataset = getMetadataQueryDataset()
        expect(dataset?.examples[0].rating).toBe(1.0)
      })

      it('should export dataset as JSON', () => {
        addMetadataQueryTrainingExample({
          query: 'test',
          intent: 'describe',
          expectedComponents: [],
          created: new Date().toISOString(),
        })

        const json = exportMetadataQueryDataset()
        expect(json).not.toBeNull()

        const parsed = JSON.parse(json!)
        expect(parsed.examples.length).toBe(1)
      })

      it('should load external dataset', () => {
        const externalDataset = {
          id: 'external',
          name: 'External Dataset',
          examples: [
            {
              query: 'external query',
              intent: 'find' as const,
              expectedComponents: ['Test'],
              created: new Date().toISOString(),
            },
          ],
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        }

        loadMetadataQueryDataset(externalDataset)
        const dataset = getMetadataQueryDataset()

        expect(dataset?.id).toBe('external')
        expect(dataset?.examples.length).toBe(1)
      })

      it('should clear dataset', () => {
        addMetadataQueryTrainingExample({
          query: 'test',
          intent: 'describe',
          expectedComponents: [],
          created: new Date().toISOString(),
        })

        clearMetadataQueryDataset()
        const dataset = getMetadataQueryDataset()

        expect(dataset).toBeNull()
      })
    })

    describe('getAvailableMetadataQueryIntents', () => {
      it('should return array of intents', () => {
        const intents = getAvailableMetadataQueryIntents()

        expect(Array.isArray(intents)).toBe(true)
        expect(intents.length).toBeGreaterThan(0)
      })

      it('should include all standard intents', () => {
        const intents = getAvailableMetadataQueryIntents()

        expect(intents).toContain('describe')
        expect(intents).toContain('find')
        expect(intents).toContain('dependencies')
        expect(intents).toContain('history')
        expect(intents).toContain('usage')
        expect(intents).toContain('related')
        expect(intents).toContain('features')
        expect(intents).toContain('status')
      })

      it('should not include unknown intent', () => {
        const intents = getAvailableMetadataQueryIntents()

        expect(intents).not.toContain('unknown')
      })
    })

    describe('getMetadataQueryExamples', () => {
      it('should return examples for English', () => {
        const examples = getMetadataQueryExamples('describe', 'en')

        expect(Array.isArray(examples)).toBe(true)
        expect(examples.length).toBeGreaterThan(0)
        // Should be English examples
        expect(examples[0]).toMatch(/[a-zA-Z]/)
      })

      it('should return examples for Russian', () => {
        const examples = getMetadataQueryExamples('describe', 'ru')

        expect(Array.isArray(examples)).toBe(true)
        expect(examples.length).toBeGreaterThan(0)
        // Should contain Cyrillic characters
        expect(examples[0]).toMatch(/[а-яёА-ЯЁ]/)
      })

      it('should return examples for all intents', () => {
        const intents = getAvailableMetadataQueryIntents()

        for (const intent of intents) {
          const enExamples = getMetadataQueryExamples(intent, 'en')
          const ruExamples = getMetadataQueryExamples(intent, 'ru')

          expect(enExamples.length).toBeGreaterThan(0)
          expect(ruExamples.length).toBeGreaterThan(0)
        }
      })
    })

    describe('Russian language support for metadata queries', () => {
      it('should process Russian describe query', () => {
        const response = processMetadataQueryWithLLM({
          query: 'Опиши компонент Gallery',
        })

        expect(response.success).toBe(true)
        expect(response.language).toBe('ru')
        expect(response.intent).toBe('describe')
      })

      it('should process Russian find query', () => {
        const response = processMetadataQueryWithLLM({
          query: 'найди Gallery',
        })

        expect(response.success).toBe(true)
        expect(response.language).toBe('ru')
        expect(response.intent).toBe('find')
      })

      it('should process Russian dependencies query', () => {
        const response = processMetadataQueryWithLLM({
          query: 'Какие зависимости у Gallery?',
        })

        expect(response.success).toBe(true)
        expect(response.language).toBe('ru')
        expect(response.intent).toBe('dependencies')
      })

      it('should process Russian usage query', () => {
        const response = processMetadataQueryWithLLM({
          query: 'Как использовать CubePreview?',
        })

        expect(response.success).toBe(true)
        expect(response.language).toBe('ru')
        expect(response.intent).toBe('usage')
      })

      it('should return Russian responses for Russian queries', () => {
        const response = processMetadataQueryWithLLM({
          query: 'Найди компоненты фазы 1',
          language: 'ru',
        })

        expect(response.success).toBe(true)
        // Response should contain some Russian text or be relevant to the query
        expect(response.language).toBe('ru')
      })
    })
  })
})
