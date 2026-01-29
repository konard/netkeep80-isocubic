/**
 * Stack Presets Module
 * Provides preset configurations for cube stacks for quick start
 *
 * ISSUE 30: Шаблоны стопок (Stack Presets)
 *
 * Features:
 * - Pre-defined stack configurations for common use cases
 * - Search by name/tags
 * - Ability to save custom presets to localStorage
 */

import type { CubeStackConfig, StackTransition } from '../types/stack'
import type { SpectralCube, Color3, MaterialType, NoiseType } from '../types/cube'
import { createStackLayer, createCubeStack, DEFAULT_STACK_TRANSITION } from '../types/stack'

/**
 * Stack preset metadata interface
 */
export interface StackPreset {
  /** Unique identifier for the preset */
  id: string
  /** Display name */
  name: string
  /** Description of the preset */
  description: string
  /** Tags for search/filtering */
  tags: string[]
  /** Category for organization */
  category: StackPresetCategory
  /** The actual stack configuration */
  config: CubeStackConfig
  /** Whether this is a user-saved preset (vs built-in) */
  isUserPreset?: boolean
  /** Thumbnail color for quick visual preview (RGB) */
  previewColor?: Color3
}

/**
 * Categories for organizing presets
 */
export type StackPresetCategory = 'natural' | 'construction' | 'magical' | 'terrain' | 'custom'

/**
 * Category metadata for display
 */
export const STACK_PRESET_CATEGORIES: Record<
  StackPresetCategory,
  { name: string; description: string }
> = {
  natural: {
    name: 'Natural',
    description: 'Organic materials like wood, bark, earth',
  },
  construction: {
    name: 'Construction',
    description: 'Building materials like stone, brick, walls',
  },
  magical: {
    name: 'Magical',
    description: 'Fantasy elements with energy effects',
  },
  terrain: {
    name: 'Terrain',
    description: 'Ground, layers, geological formations',
  },
  custom: {
    name: 'Custom',
    description: 'User-saved custom presets',
  },
}

/**
 * Helper to create a SpectralCube configuration
 */
function createCube(
  id: string,
  color: Color3,
  material: MaterialType = 'stone',
  options: {
    roughness?: number
    noise?: {
      type?: NoiseType
      scale?: number
      octaves?: number
      persistence?: number
      mask?: string
    }
    gradients?: SpectralCube['gradients']
  } = {}
): SpectralCube {
  return {
    id,
    base: {
      color,
      roughness: options.roughness ?? 0.5,
      transparency: 1.0,
    },
    noise: options.noise
      ? {
          type: options.noise.type ?? 'perlin',
          scale: options.noise.scale ?? 8.0,
          octaves: options.noise.octaves ?? 4,
          persistence: options.noise.persistence ?? 0.5,
          mask: options.noise.mask,
        }
      : undefined,
    gradients: options.gradients,
    physics: {
      material,
      density:
        material === 'stone'
          ? 2.5
          : material === 'wood'
            ? 0.8
            : material === 'metal'
              ? 7.8
              : material === 'crystal'
                ? 2.2
                : 1.0,
      break_pattern:
        material === 'wood'
          ? 'splinter'
          : material === 'crystal'
            ? 'shatter'
            : material === 'glass'
              ? 'shatter'
              : 'crumble',
    },
  }
}

/**
 * Helper to create a transition with custom settings
 */
function createTransition(
  type: StackTransition['type'],
  blendHeight: number = 0.2,
  easing: StackTransition['easing'] = 'smooth'
): StackTransition {
  return {
    ...DEFAULT_STACK_TRANSITION,
    type,
    blendHeight,
    easing,
  }
}

// =============================================================================
// Built-in Stack Presets
// =============================================================================

/**
 * Stone Wall Preset
 * 3 layers of stone with subtle color variations
 */
const stoneWallPreset: StackPreset = {
  id: 'stone_wall',
  name: 'Stone Wall',
  description: 'Classic stone wall with 3 layers of varying stone types',
  tags: ['stone', 'wall', 'building', 'medieval', 'fortress'],
  category: 'construction',
  previewColor: [0.5, 0.48, 0.45],
  config: createCubeStack(
    'stone_wall',
    [
      {
        ...createStackLayer(
          'stone_wall_bottom',
          createCube('stone_bottom', [0.45, 0.43, 0.4], 'stone', {
            roughness: 0.9,
            noise: { type: 'perlin', scale: 6, octaves: 4, persistence: 0.6 },
          }),
          'bottom',
          1.0
        ),
        name: 'Foundation Stone',
        transitionToNext: createTransition('blend', 0.15, 'smooth'),
      },
      {
        ...createStackLayer(
          'stone_wall_middle',
          createCube('stone_middle', [0.52, 0.5, 0.47], 'stone', {
            roughness: 0.8,
            noise: { type: 'perlin', scale: 8, octaves: 3, persistence: 0.5 },
          }),
          'middle',
          1.0
        ),
        name: 'Wall Stone',
        transitionToNext: createTransition('blend', 0.15, 'smooth'),
      },
      {
        ...createStackLayer(
          'stone_wall_top',
          createCube('stone_top', [0.55, 0.53, 0.5], 'stone', {
            roughness: 0.75,
            noise: { type: 'perlin', scale: 10, octaves: 3, persistence: 0.45 },
          }),
          'top',
          1.0
        ),
        name: 'Cap Stone',
      },
    ],
    'Stone wall with foundation, main wall, and cap stones'
  ),
}

/**
 * Wood Tower Preset
 * 4 layers of wooden construction
 */
const woodTowerPreset: StackPreset = {
  id: 'wood_tower',
  name: 'Wood Tower',
  description: 'Wooden tower structure with 4 layers of oak wood',
  tags: ['wood', 'tower', 'building', 'oak', 'medieval', 'structure'],
  category: 'construction',
  previewColor: [0.55, 0.35, 0.2],
  config: createCubeStack(
    'wood_tower',
    [
      {
        ...createStackLayer(
          'wood_tower_base',
          createCube('wood_base', [0.45, 0.28, 0.15], 'wood', {
            roughness: 0.85,
            noise: { type: 'perlin', scale: 12, octaves: 5, persistence: 0.7 },
            gradients: [{ axis: 'y', factor: 0.1, color_shift: [-0.05, -0.03, -0.02] }],
          }),
          'bottom',
          1.2
        ),
        name: 'Base Logs',
        transitionToNext: createTransition('gradient', 0.1, 'ease-out'),
      },
      {
        ...createStackLayer(
          'wood_tower_lower',
          createCube('wood_lower', [0.52, 0.32, 0.18], 'wood', {
            roughness: 0.8,
            noise: { type: 'perlin', scale: 10, octaves: 4, persistence: 0.6 },
          }),
          'middle',
          1.0
        ),
        name: 'Lower Frame',
        transitionToNext: createTransition('gradient', 0.1, 'smooth'),
      },
      {
        ...createStackLayer(
          'wood_tower_upper',
          createCube('wood_upper', [0.58, 0.36, 0.2], 'wood', {
            roughness: 0.75,
            noise: { type: 'perlin', scale: 10, octaves: 4, persistence: 0.55 },
          }),
          'middle',
          1.0
        ),
        name: 'Upper Frame',
        transitionToNext: createTransition('gradient', 0.1, 'smooth'),
      },
      {
        ...createStackLayer(
          'wood_tower_top',
          createCube('wood_top', [0.62, 0.4, 0.22], 'wood', {
            roughness: 0.7,
            noise: { type: 'perlin', scale: 8, octaves: 3, persistence: 0.5 },
            gradients: [{ axis: 'y', factor: 0.15, color_shift: [0.05, 0.03, 0.01] }],
          }),
          'top',
          0.8
        ),
        name: 'Crown',
      },
    ],
    'Wooden tower with base logs, frame sections, and decorative crown'
  ),
}

/**
 * Layered Earth Preset
 * Geological layers: soil, rock, grass
 */
const layeredEarthPreset: StackPreset = {
  id: 'layered_earth',
  name: 'Layered Earth',
  description: 'Geological terrain layers: bedrock, soil, and grass top',
  tags: ['earth', 'terrain', 'grass', 'soil', 'rock', 'ground', 'nature'],
  category: 'terrain',
  previewColor: [0.35, 0.45, 0.25],
  config: createCubeStack(
    'layered_earth',
    [
      {
        ...createStackLayer(
          'earth_bedrock',
          createCube('bedrock', [0.35, 0.32, 0.3], 'stone', {
            roughness: 0.95,
            noise: { type: 'worley', scale: 4, octaves: 3, persistence: 0.7 },
          }),
          'bottom',
          1.0
        ),
        name: 'Bedrock',
        transitionToNext: createTransition('noise', 0.25, 'linear'),
      },
      {
        ...createStackLayer(
          'earth_soil',
          createCube('soil', [0.4, 0.28, 0.18], 'organic', {
            roughness: 0.85,
            noise: { type: 'perlin', scale: 6, octaves: 4, persistence: 0.6 },
          }),
          'middle',
          0.8
        ),
        name: 'Soil',
        transitionToNext: createTransition('noise', 0.2, 'ease-out'),
      },
      {
        ...createStackLayer(
          'earth_grass',
          createCube('grass', [0.3, 0.5, 0.2], 'organic', {
            roughness: 0.6,
            noise: { type: 'perlin', scale: 12, octaves: 3, persistence: 0.4 },
            gradients: [{ axis: 'y', factor: 0.2, color_shift: [0.05, 0.1, 0.0] }],
          }),
          'top',
          0.5
        ),
        name: 'Grass',
      },
    ],
    'Natural terrain with bedrock foundation, soil layer, and grass top'
  ),
}

/**
 * Magic Crystal Column Preset
 * FFT-style magical crystal stack
 */
const magicCrystalColumnPreset: StackPreset = {
  id: 'magic_crystal_column',
  name: 'Magic Crystal Column',
  description: 'Magical crystal pillar with energy gradient from base to tip',
  tags: ['crystal', 'magic', 'energy', 'fantasy', 'glowing', 'pillar'],
  category: 'magical',
  previewColor: [0.5, 0.3, 0.8],
  config: createCubeStack(
    'magic_crystal_column',
    [
      {
        ...createStackLayer(
          'crystal_base',
          createCube('crystal_base', [0.35, 0.2, 0.55], 'crystal', {
            roughness: 0.3,
            noise: { type: 'worley', scale: 4, octaves: 2, persistence: 0.3 },
            gradients: [{ axis: 'radial', factor: 0.15, color_shift: [0.1, 0.05, 0.15] }],
          }),
          'bottom',
          1.0
        ),
        name: 'Crystal Base',
        transitionToNext: createTransition('gradient', 0.3, 'ease-in'),
      },
      {
        ...createStackLayer(
          'crystal_core',
          createCube('crystal_core', [0.5, 0.3, 0.75], 'crystal', {
            roughness: 0.2,
            noise: { type: 'perlin', scale: 8, octaves: 3, persistence: 0.4 },
            gradients: [
              { axis: 'y', factor: 0.25, color_shift: [0.1, 0.08, 0.12] },
              { axis: 'radial', factor: 0.1, color_shift: [0.15, 0.1, 0.2] },
            ],
          }),
          'middle',
          1.2
        ),
        name: 'Energy Core',
        transitionToNext: createTransition('gradient', 0.35, 'smooth'),
      },
      {
        ...createStackLayer(
          'crystal_tip',
          createCube('crystal_tip', [0.7, 0.5, 0.95], 'crystal', {
            roughness: 0.15,
            noise: { type: 'perlin', scale: 12, octaves: 2, persistence: 0.25 },
            gradients: [{ axis: 'y', factor: 0.3, color_shift: [0.15, 0.2, 0.1] }],
          }),
          'top',
          0.8
        ),
        name: 'Crystal Tip',
      },
    ],
    'Magical crystal column with energy flow from dark base to bright tip'
  ),
}

/**
 * Brick Chimney Preset
 * Classic brick stack with gradient weathering
 */
const brickChimneyPreset: StackPreset = {
  id: 'brick_chimney',
  name: 'Brick Chimney',
  description: 'Traditional brick chimney with weathered gradient from base to top',
  tags: ['brick', 'chimney', 'building', 'industrial', 'weathered'],
  category: 'construction',
  previewColor: [0.65, 0.35, 0.25],
  config: createCubeStack(
    'brick_chimney',
    [
      {
        ...createStackLayer(
          'brick_foundation',
          createCube('brick_base', [0.55, 0.28, 0.2], 'stone', {
            roughness: 0.85,
            noise: { type: 'crackle', scale: 6, octaves: 3, persistence: 0.5 },
          }),
          'bottom',
          1.0
        ),
        name: 'Foundation',
        transitionToNext: createTransition('hard', 0.05, 'linear'),
      },
      {
        ...createStackLayer(
          'brick_main',
          createCube('brick_middle', [0.65, 0.35, 0.25], 'stone', {
            roughness: 0.75,
            noise: { type: 'crackle', scale: 8, octaves: 3, persistence: 0.45 },
            gradients: [{ axis: 'y', factor: 0.1, color_shift: [0.05, 0.02, 0.0] }],
          }),
          'middle',
          1.5
        ),
        name: 'Main Stack',
        transitionToNext: createTransition('blend', 0.1, 'smooth'),
      },
      {
        ...createStackLayer(
          'brick_top',
          createCube('brick_top', [0.7, 0.38, 0.28], 'stone', {
            roughness: 0.7,
            noise: { type: 'perlin', scale: 10, octaves: 2, persistence: 0.4 },
            gradients: [{ axis: 'y', factor: 0.15, color_shift: [0.08, 0.05, 0.03] }],
          }),
          'top',
          0.8
        ),
        name: 'Weathered Cap',
      },
    ],
    'Brick chimney with solid foundation, main stack, and weathered cap'
  ),
}

/**
 * Ice Formation Preset
 * Frozen ice layers with transparency effect
 */
const iceFormationPreset: StackPreset = {
  id: 'ice_formation',
  name: 'Ice Formation',
  description: 'Layered ice structure with varying clarity',
  tags: ['ice', 'frozen', 'water', 'winter', 'cold', 'transparent'],
  category: 'natural',
  previewColor: [0.75, 0.88, 0.95],
  config: createCubeStack(
    'ice_formation',
    [
      {
        ...createStackLayer(
          'ice_base',
          createCube('ice_bottom', [0.6, 0.75, 0.85], 'glass', {
            roughness: 0.4,
            noise: { type: 'worley', scale: 5, octaves: 3, persistence: 0.5 },
          }),
          'bottom',
          1.0
        ),
        name: 'Opaque Ice',
        transitionToNext: createTransition('gradient', 0.25, 'smooth'),
      },
      {
        ...createStackLayer(
          'ice_middle',
          createCube('ice_middle', [0.7, 0.85, 0.92], 'glass', {
            roughness: 0.25,
            noise: { type: 'perlin', scale: 8, octaves: 2, persistence: 0.35 },
          }),
          'middle',
          0.8
        ),
        name: 'Clear Ice',
        transitionToNext: createTransition('gradient', 0.2, 'ease-out'),
      },
      {
        ...createStackLayer(
          'ice_top',
          createCube('ice_top', [0.85, 0.93, 0.98], 'glass', {
            roughness: 0.15,
            noise: { type: 'perlin', scale: 12, octaves: 2, persistence: 0.2 },
            gradients: [{ axis: 'y', factor: 0.1, color_shift: [0.05, 0.03, 0.02] }],
          }),
          'top',
          0.6
        ),
        name: 'Frost Cap',
      },
    ],
    'Ice formation with opaque base transitioning to clear frost cap'
  ),
}

/**
 * Lava Rock Preset
 * Volcanic rock layers with heat gradient
 */
const lavaRockPreset: StackPreset = {
  id: 'lava_rock',
  name: 'Lava Rock',
  description: 'Volcanic rock with cooling gradient from molten base',
  tags: ['lava', 'volcanic', 'rock', 'hot', 'fire', 'magma'],
  category: 'terrain',
  previewColor: [0.8, 0.3, 0.1],
  config: createCubeStack(
    'lava_rock',
    [
      {
        ...createStackLayer(
          'lava_molten',
          createCube('molten', [0.95, 0.4, 0.1], 'liquid', {
            roughness: 0.3,
            noise: { type: 'worley', scale: 4, octaves: 4, persistence: 0.7 },
            gradients: [{ axis: 'radial', factor: 0.2, color_shift: [0.05, 0.1, 0.05] }],
          }),
          'bottom',
          0.7
        ),
        name: 'Molten Core',
        transitionToNext: createTransition('noise', 0.3, 'ease-in'),
      },
      {
        ...createStackLayer(
          'lava_hot',
          createCube('hot_rock', [0.7, 0.25, 0.08], 'stone', {
            roughness: 0.7,
            noise: { type: 'crackle', scale: 6, octaves: 4, persistence: 0.6 },
          }),
          'middle',
          1.0
        ),
        name: 'Hot Rock',
        transitionToNext: createTransition('noise', 0.25, 'smooth'),
      },
      {
        ...createStackLayer(
          'lava_cooled',
          createCube('cooled_rock', [0.3, 0.28, 0.25], 'stone', {
            roughness: 0.9,
            noise: { type: 'crackle', scale: 8, octaves: 3, persistence: 0.5 },
            gradients: [{ axis: 'y', factor: 0.1, color_shift: [-0.05, -0.03, -0.02] }],
          }),
          'top',
          1.0
        ),
        name: 'Cooled Crust',
      },
    ],
    'Volcanic rock with molten base cooling to hardened crust'
  ),
}

// =============================================================================
// Preset Collection
// =============================================================================

/**
 * All built-in stack presets
 */
export const STACK_PRESETS: StackPreset[] = [
  stoneWallPreset,
  woodTowerPreset,
  layeredEarthPreset,
  magicCrystalColumnPreset,
  brickChimneyPreset,
  iceFormationPreset,
  lavaRockPreset,
]

// =============================================================================
// Preset Management Functions
// =============================================================================

/** Local storage key for user presets */
const USER_PRESETS_STORAGE_KEY = 'isocubic_user_stack_presets'

/**
 * Get all presets (built-in + user saved)
 */
export function getAllStackPresets(): StackPreset[] {
  const userPresets = getUserStackPresets()
  return [...STACK_PRESETS, ...userPresets]
}

/**
 * Get presets by category
 */
export function getPresetsByCategory(category: StackPresetCategory): StackPreset[] {
  return getAllStackPresets().filter((preset) => preset.category === category)
}

/**
 * Search presets by query string (matches name, description, tags)
 */
export function searchStackPresets(query: string): StackPreset[] {
  const normalizedQuery = query.toLowerCase().trim()
  if (!normalizedQuery) {
    return getAllStackPresets()
  }

  return getAllStackPresets().filter((preset) => {
    const searchText = [preset.name, preset.description, ...preset.tags].join(' ').toLowerCase()

    return searchText.includes(normalizedQuery)
  })
}

/**
 * Get a preset by ID
 */
export function getPresetById(id: string): StackPreset | undefined {
  return getAllStackPresets().find((preset) => preset.id === id)
}

/**
 * Get user-saved presets from localStorage
 */
export function getUserStackPresets(): StackPreset[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return []
  }

  try {
    const stored = localStorage.getItem(USER_PRESETS_STORAGE_KEY)
    if (!stored) return []

    const parsed = JSON.parse(stored) as StackPreset[]
    // Mark all as user presets
    return parsed.map((preset) => ({ ...preset, isUserPreset: true, category: 'custom' as const }))
  } catch {
    console.warn('Failed to load user stack presets from localStorage')
    return []
  }
}

/**
 * Save current stack as a user preset
 */
export function saveStackAsPreset(
  stack: CubeStackConfig,
  name: string,
  description: string = '',
  tags: string[] = []
): StackPreset {
  const preset: StackPreset = {
    id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    name,
    description,
    tags,
    category: 'custom',
    config: {
      ...stack,
      id: `preset_${stack.id}`,
    },
    isUserPreset: true,
    previewColor: stack.layers[0]?.cubeConfig.base.color ?? [0.5, 0.5, 0.5],
  }

  // Save to localStorage
  const userPresets = getUserStackPresets()
  userPresets.push(preset)

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(USER_PRESETS_STORAGE_KEY, JSON.stringify(userPresets))
    } catch {
      console.warn('Failed to save user stack preset to localStorage')
    }
  }

  return preset
}

/**
 * Delete a user preset by ID
 */
export function deleteUserPreset(presetId: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false
  }

  try {
    const userPresets = getUserStackPresets()
    const filteredPresets = userPresets.filter((p) => p.id !== presetId)

    if (filteredPresets.length === userPresets.length) {
      return false // Preset not found
    }

    localStorage.setItem(USER_PRESETS_STORAGE_KEY, JSON.stringify(filteredPresets))
    return true
  } catch {
    console.warn('Failed to delete user stack preset from localStorage')
    return false
  }
}

/**
 * Apply a preset - returns a new CubeStackConfig with a unique ID
 */
export function applyPreset(preset: StackPreset): CubeStackConfig {
  const newId = `stack_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

  // Deep clone the config and update IDs
  const newConfig: CubeStackConfig = {
    ...preset.config,
    id: newId,
    layers: preset.config.layers.map((layer, index) => ({
      ...layer,
      id: `${newId}_layer_${index}`,
      cubeConfig: {
        ...layer.cubeConfig,
        id: `${newId}_cube_${index}`,
      },
    })),
    meta: {
      ...preset.config.meta,
      name: preset.name,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
  }

  return newConfig
}

/**
 * Export preset as JSON string
 */
export function exportPresetAsJSON(preset: StackPreset): string {
  return JSON.stringify(preset, null, 2)
}

/**
 * Import preset from JSON string
 */
export function importPresetFromJSON(jsonString: string): StackPreset | null {
  try {
    const parsed = JSON.parse(jsonString) as StackPreset

    // Validate required fields
    if (!parsed.id || !parsed.name || !parsed.config || !parsed.config.layers) {
      console.warn('Invalid preset JSON: missing required fields')
      return null
    }

    // Generate new ID to avoid conflicts
    return {
      ...parsed,
      id: `imported_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      isUserPreset: true,
      category: 'custom',
    }
  } catch {
    console.warn('Failed to parse preset JSON')
    return null
  }
}
