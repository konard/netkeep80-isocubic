/**
 * TinyLLM module for generating SpectralCube configurations from text prompts
 *
 * This module provides client-side cube generation capabilities using:
 * 1. Rule-based keyword matching for common material descriptions
 * 2. Preset templates for well-defined materials
 * 3. Random generation for fallback scenarios
 *
 * The implementation prioritizes browser compatibility and offline operation
 * while providing reasonable generation quality for common material types.
 */

import type {
  SpectralCube,
  Color3,
  ColorShift3,
  NoiseType,
  MaterialType,
  BreakPattern,
  GradientAxis,
  CubeGradient,
  CompositeDescription,
  BatchGenerationRequest,
  GenerationContext,
  ExtractedStyle,
  TrainingExample,
  FineTuningDataset,
  CubeGroupResult,
  CubeGroupType,
  NeighborDescription,
  NeighborRelation,
} from '../types/cube'
import { validateCube } from './validation'

/** Generation result with status information */
export interface GenerationResult {
  success: boolean
  cube: SpectralCube | null
  method: 'keyword' | 'template' | 'random' | 'hybrid'
  confidence: number
  warnings: string[]
}

/** Material keyword mappings for rule-based generation */
interface MaterialKeywords {
  color: Color3
  roughness: number
  transparency: number
  noiseType: NoiseType
  noiseScale: number
  material: MaterialType
  breakPattern: BreakPattern
  density: number
  tags: string[]
}

/** Keyword database for material recognition */
const MATERIAL_KEYWORDS: Record<string, Partial<MaterialKeywords>> = {
  // Stone variants
  stone: {
    color: [0.5, 0.48, 0.45],
    roughness: 0.8,
    noiseType: 'perlin',
    noiseScale: 8,
    material: 'stone',
    breakPattern: 'crumble',
    density: 2.5,
    tags: ['stone', 'natural'],
  },
  rock: {
    color: [0.45, 0.42, 0.4],
    roughness: 0.85,
    noiseType: 'perlin',
    noiseScale: 6,
    material: 'stone',
    breakPattern: 'crumble',
    density: 2.6,
    tags: ['rock', 'natural'],
  },
  granite: {
    color: [0.55, 0.52, 0.5],
    roughness: 0.6,
    noiseType: 'worley',
    noiseScale: 12,
    material: 'stone',
    breakPattern: 'shatter',
    density: 2.7,
    tags: ['granite', 'stone'],
  },
  marble: {
    color: [0.9, 0.88, 0.85],
    roughness: 0.2,
    noiseType: 'perlin',
    noiseScale: 4,
    material: 'stone',
    breakPattern: 'shatter',
    density: 2.7,
    tags: ['marble', 'stone', 'elegant'],
  },
  cobblestone: {
    color: [0.45, 0.43, 0.4],
    roughness: 0.9,
    noiseType: 'worley',
    noiseScale: 10,
    material: 'stone',
    breakPattern: 'crumble',
    density: 2.4,
    tags: ['cobblestone', 'stone', 'path'],
  },

  // Wood variants
  wood: {
    color: [0.55, 0.35, 0.2],
    roughness: 0.6,
    noiseType: 'perlin',
    noiseScale: 16,
    material: 'wood',
    breakPattern: 'splinter',
    density: 0.7,
    tags: ['wood', 'natural'],
  },
  oak: {
    color: [0.6, 0.4, 0.25],
    roughness: 0.55,
    noiseType: 'perlin',
    noiseScale: 20,
    material: 'wood',
    breakPattern: 'splinter',
    density: 0.75,
    tags: ['oak', 'wood'],
  },
  birch: {
    color: [0.85, 0.8, 0.7],
    roughness: 0.4,
    noiseType: 'perlin',
    noiseScale: 18,
    material: 'wood',
    breakPattern: 'splinter',
    density: 0.65,
    tags: ['birch', 'wood', 'light'],
  },
  bark: {
    color: [0.35, 0.25, 0.18],
    roughness: 0.95,
    noiseType: 'crackle',
    noiseScale: 6,
    material: 'wood',
    breakPattern: 'splinter',
    density: 0.5,
    tags: ['bark', 'wood', 'tree'],
  },

  // Metal variants
  metal: {
    color: [0.6, 0.6, 0.65],
    roughness: 0.3,
    noiseType: 'worley',
    noiseScale: 4,
    material: 'metal',
    breakPattern: 'shatter',
    density: 7.8,
    tags: ['metal', 'industrial'],
  },
  iron: {
    color: [0.5, 0.5, 0.52],
    roughness: 0.4,
    noiseType: 'perlin',
    noiseScale: 6,
    material: 'metal',
    breakPattern: 'shatter',
    density: 7.9,
    tags: ['iron', 'metal'],
  },
  steel: {
    color: [0.65, 0.68, 0.7],
    roughness: 0.15,
    noiseType: 'worley',
    noiseScale: 3,
    material: 'metal',
    breakPattern: 'shatter',
    density: 8.0,
    tags: ['steel', 'metal', 'modern'],
  },
  gold: {
    color: [0.95, 0.8, 0.3],
    roughness: 0.1,
    noiseType: 'perlin',
    noiseScale: 2,
    material: 'metal',
    breakPattern: 'shatter',
    density: 19.3,
    tags: ['gold', 'metal', 'precious'],
  },
  copper: {
    color: [0.85, 0.55, 0.35],
    roughness: 0.35,
    noiseType: 'worley',
    noiseScale: 5,
    material: 'metal',
    breakPattern: 'shatter',
    density: 8.9,
    tags: ['copper', 'metal'],
  },
  rust: {
    color: [0.6, 0.35, 0.2],
    roughness: 0.85,
    noiseType: 'worley',
    noiseScale: 8,
    material: 'metal',
    breakPattern: 'crumble',
    density: 5.2,
    tags: ['rust', 'metal', 'weathered'],
  },

  // Crystal/Glass variants
  crystal: {
    color: [0.8, 0.85, 0.95],
    roughness: 0.05,
    transparency: 0.4,
    noiseType: 'worley',
    noiseScale: 3,
    material: 'crystal',
    breakPattern: 'shatter',
    density: 3.2,
    tags: ['crystal', 'fantasy'],
  },
  glass: {
    color: [0.9, 0.92, 0.95],
    roughness: 0.02,
    transparency: 0.2,
    noiseType: 'perlin',
    noiseScale: 1,
    material: 'glass',
    breakPattern: 'shatter',
    density: 2.5,
    tags: ['glass', 'transparent'],
  },
  ice: {
    color: [0.85, 0.92, 0.98],
    roughness: 0.15,
    transparency: 0.5,
    noiseType: 'crackle',
    noiseScale: 4,
    material: 'crystal',
    breakPattern: 'shatter',
    density: 0.9,
    tags: ['ice', 'cold', 'frozen'],
  },
  gem: {
    color: [0.6, 0.2, 0.8],
    roughness: 0.05,
    transparency: 0.3,
    noiseType: 'worley',
    noiseScale: 2,
    material: 'crystal',
    breakPattern: 'shatter',
    density: 3.5,
    tags: ['gem', 'precious', 'fantasy'],
  },

  // Natural/Organic variants
  grass: {
    color: [0.3, 0.5, 0.2],
    roughness: 0.7,
    noiseType: 'perlin',
    noiseScale: 12,
    material: 'organic',
    breakPattern: 'crumble',
    density: 0.3,
    tags: ['grass', 'natural', 'green'],
  },
  moss: {
    color: [0.25, 0.4, 0.2],
    roughness: 0.9,
    noiseType: 'perlin',
    noiseScale: 10,
    material: 'organic',
    breakPattern: 'crumble',
    density: 0.2,
    tags: ['moss', 'natural', 'green'],
  },
  dirt: {
    color: [0.4, 0.3, 0.2],
    roughness: 0.95,
    noiseType: 'perlin',
    noiseScale: 8,
    material: 'organic',
    breakPattern: 'crumble',
    density: 1.5,
    tags: ['dirt', 'earth', 'natural'],
  },
  sand: {
    color: [0.85, 0.75, 0.55],
    roughness: 0.85,
    noiseType: 'perlin',
    noiseScale: 20,
    material: 'organic',
    breakPattern: 'crumble',
    density: 1.6,
    tags: ['sand', 'beach', 'desert'],
  },

  // Building materials
  brick: {
    color: [0.7, 0.35, 0.25],
    roughness: 0.75,
    noiseType: 'perlin',
    noiseScale: 6,
    material: 'stone',
    breakPattern: 'crumble',
    density: 1.9,
    tags: ['brick', 'building', 'red'],
  },
  concrete: {
    color: [0.6, 0.58, 0.55],
    roughness: 0.7,
    noiseType: 'perlin',
    noiseScale: 4,
    material: 'stone',
    breakPattern: 'crumble',
    density: 2.4,
    tags: ['concrete', 'building', 'modern'],
  },

  // Fantasy/Magic variants
  magic: {
    color: [0.6, 0.3, 0.9],
    roughness: 0.1,
    transparency: 0.4,
    noiseType: 'worley',
    noiseScale: 5,
    material: 'crystal',
    breakPattern: 'dissolve',
    density: 1.0,
    tags: ['magic', 'fantasy', 'glowing'],
  },
  lava: {
    color: [0.95, 0.4, 0.1],
    roughness: 0.6,
    noiseType: 'crackle',
    noiseScale: 6,
    material: 'liquid',
    breakPattern: 'melt',
    density: 3.1,
    tags: ['lava', 'hot', 'volcanic'],
  },
  water: {
    color: [0.3, 0.5, 0.8],
    roughness: 0.05,
    transparency: 0.3,
    noiseType: 'perlin',
    noiseScale: 8,
    material: 'liquid',
    breakPattern: 'dissolve',
    density: 1.0,
    tags: ['water', 'liquid', 'blue'],
  },
}

/** Color modifiers based on descriptive words */
const COLOR_MODIFIERS: Record<
  string,
  Partial<{ colorShift: ColorShift3; roughnessShift: number }>
> = {
  dark: { colorShift: [-0.2, -0.2, -0.2] },
  light: { colorShift: [0.2, 0.2, 0.2] },
  bright: { colorShift: [0.15, 0.15, 0.15], roughnessShift: -0.1 },
  pale: { colorShift: [0.1, 0.1, 0.12] },
  deep: { colorShift: [-0.1, -0.1, -0.05] },
  weathered: { roughnessShift: 0.2 },
  polished: { roughnessShift: -0.3 },
  rough: { roughnessShift: 0.25 },
  smooth: { roughnessShift: -0.2 },
  old: { roughnessShift: 0.15 },
  new: { roughnessShift: -0.1 },
  ancient: { roughnessShift: 0.2 },
  fresh: { roughnessShift: -0.15 },
  wet: { roughnessShift: -0.25 },
  dry: { roughnessShift: 0.1 },
  dusty: { roughnessShift: 0.2 },
  shiny: { roughnessShift: -0.35 },
  matte: { roughnessShift: 0.2 },
  glossy: { roughnessShift: -0.4 },
  // Color-specific modifiers
  red: { colorShift: [0.3, -0.1, -0.1] },
  blue: { colorShift: [-0.1, -0.05, 0.3] },
  green: { colorShift: [-0.1, 0.25, -0.1] },
  yellow: { colorShift: [0.25, 0.2, -0.15] },
  orange: { colorShift: [0.3, 0.1, -0.15] },
  purple: { colorShift: [0.15, -0.1, 0.25] },
  pink: { colorShift: [0.25, 0.05, 0.15] },
  white: { colorShift: [0.3, 0.3, 0.3] },
  black: { colorShift: [-0.35, -0.35, -0.35] },
  gray: { colorShift: [0, 0, 0] },
  grey: { colorShift: [0, 0, 0] },
  brown: { colorShift: [0.1, -0.05, -0.15] },
  cyan: { colorShift: [-0.1, 0.2, 0.25] },
  magenta: { colorShift: [0.2, -0.1, 0.2] },
}

/** Gradient patterns based on descriptions */
const GRADIENT_PATTERNS: Record<
  string,
  { axis: GradientAxis; factor: number; colorShift: ColorShift3 }[]
> = {
  top: [{ axis: 'y', factor: 0.3, colorShift: [0.1, 0.1, 0.1] }],
  bottom: [{ axis: 'y', factor: -0.3, colorShift: [-0.1, -0.1, -0.1] }],
  vertical: [{ axis: 'y', factor: 0.4, colorShift: [0.15, 0.1, 0.05] }],
  horizontal: [{ axis: 'x', factor: 0.3, colorShift: [0.1, 0.05, 0.1] }],
  radial: [{ axis: 'radial', factor: 0.25, colorShift: [-0.1, -0.1, 0.1] }],
  center: [{ axis: 'radial', factor: -0.3, colorShift: [0.1, 0.1, 0.15] }],
  edge: [{ axis: 'radial', factor: 0.35, colorShift: [-0.15, -0.1, -0.05] }],
  layered: [
    { axis: 'y', factor: 0.25, colorShift: [0.1, 0.05, 0] },
    { axis: 'x', factor: 0.15, colorShift: [0, 0.05, 0.1] },
  ],
}

/**
 * Generates a unique cube ID based on timestamp and random suffix
 */
function generateCubeId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 6)
  return `gen_${timestamp}_${random}`
}

/**
 * Clamps a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Applies color shift to a base color, clamping results to valid range
 */
function applyColorShift(base: Color3, shift: ColorShift3): Color3 {
  return [
    clamp(base[0] + shift[0], 0, 1),
    clamp(base[1] + shift[1], 0, 1),
    clamp(base[2] + shift[2], 0, 1),
  ]
}

/**
 * Tokenizes and normalizes a prompt for keyword matching
 */
function tokenizePrompt(prompt: string): string[] {
  return prompt
    .toLowerCase()
    .replace(/[^\wа-яёА-ЯЁ\s]/g, ' ') // Handle both English and Russian
    .split(/\s+/)
    .filter((word) => word.length > 1)
}

/**
 * Translates common Russian material words to English
 */
const RUSSIAN_TRANSLATIONS: Record<string, string> = {
  камень: 'stone',
  камня: 'stone',
  каменный: 'stone',
  каменная: 'stone',
  дерево: 'wood',
  деревянный: 'wood',
  деревянная: 'wood',
  металл: 'metal',
  металлический: 'metal',
  металлическая: 'metal',
  стекло: 'glass',
  стеклянный: 'glass',
  стеклянная: 'glass',
  кристалл: 'crystal',
  кристаллический: 'crystal',
  лёд: 'ice',
  лед: 'ice',
  ледяной: 'ice',
  ледяная: 'ice',
  трава: 'grass',
  травяной: 'grass',
  мох: 'moss',
  мшистый: 'moss',
  песок: 'sand',
  песчаный: 'sand',
  песчаная: 'sand',
  кирпич: 'brick',
  кирпичный: 'brick',
  кирпичная: 'brick',
  бетон: 'concrete',
  бетонный: 'concrete',
  гранит: 'granite',
  гранитный: 'granite',
  мрамор: 'marble',
  мраморный: 'marble',
  золото: 'gold',
  золотой: 'gold',
  золотая: 'gold',
  медь: 'copper',
  медный: 'copper',
  медная: 'copper',
  железо: 'iron',
  железный: 'iron',
  железная: 'iron',
  сталь: 'steel',
  стальной: 'steel',
  стальная: 'steel',
  ржавый: 'rust',
  ржавая: 'rust',
  ржавчина: 'rust',
  вода: 'water',
  водяной: 'water',
  водяная: 'water',
  лава: 'lava',
  лавовый: 'lava',
  магия: 'magic',
  магический: 'magic',
  магическая: 'magic',
  дуб: 'oak',
  дубовый: 'oak',
  береза: 'birch',
  берёза: 'birch',
  берёзовый: 'birch',
  кора: 'bark',
  грязь: 'dirt',
  земля: 'dirt',
  земляной: 'dirt',
  булыжник: 'cobblestone',
  // Color words
  темный: 'dark',
  тёмный: 'dark',
  темная: 'dark',
  тёмная: 'dark',
  светлый: 'light',
  светлая: 'light',
  яркий: 'bright',
  яркая: 'bright',
  красный: 'red',
  красная: 'red',
  синий: 'blue',
  синяя: 'blue',
  зеленый: 'green',
  зелёный: 'green',
  зеленая: 'green',
  зелёная: 'green',
  желтый: 'yellow',
  жёлтый: 'yellow',
  желтая: 'yellow',
  жёлтая: 'yellow',
  белый: 'white',
  белая: 'white',
  черный: 'black',
  чёрный: 'black',
  черная: 'black',
  чёрная: 'black',
  серый: 'gray',
  серая: 'gray',
  коричневый: 'brown',
  коричневая: 'brown',
  фиолетовый: 'purple',
  фиолетовая: 'purple',
  оранжевый: 'orange',
  оранжевая: 'orange',
  розовый: 'pink',
  розовая: 'pink',
  // Texture words
  полированный: 'polished',
  полированная: 'polished',
  шероховатый: 'rough',
  шероховатая: 'rough',
  гладкий: 'smooth',
  гладкая: 'smooth',
  блестящий: 'shiny',
  блестящая: 'shiny',
  матовый: 'matte',
  матовая: 'matte',
  старый: 'old',
  старая: 'old',
  новый: 'new',
  новая: 'new',
  древний: 'ancient',
  древняя: 'ancient',
  мокрый: 'wet',
  мокрая: 'wet',
  сухой: 'dry',
  сухая: 'dry',
  пыльный: 'dusty',
  пыльная: 'dusty',
  выветренный: 'weathered',
  выветренная: 'weathered',
  замерзший: 'frozen',
  замерзшая: 'frozen',
  замороженный: 'frozen',
  замороженная: 'frozen',
  светящийся: 'glowing',
  светящаяся: 'glowing',
}

/**
 * Translates tokens from Russian to English where possible
 */
function translateTokens(tokens: string[]): string[] {
  return tokens.map((token) => RUSSIAN_TRANSLATIONS[token] || token)
}

/**
 * Finds the best matching material from keywords
 */
function findMaterialMatch(tokens: string[]): {
  material: Partial<MaterialKeywords> | null
  score: number
} {
  let bestMatch: Partial<MaterialKeywords> | null = null
  let bestScore = 0

  for (const token of tokens) {
    if (MATERIAL_KEYWORDS[token]) {
      const score = token.length // Longer matches are more specific
      if (score > bestScore) {
        bestMatch = MATERIAL_KEYWORDS[token]
        bestScore = score
      }
    }
  }

  return { material: bestMatch, score: bestScore }
}

/**
 * Collects color and texture modifiers from tokens
 */
function collectModifiers(tokens: string[]): {
  colorShift: ColorShift3
  roughnessShift: number
  modifierCount: number
} {
  let colorShift: ColorShift3 = [0, 0, 0]
  let roughnessShift = 0
  let modifierCount = 0

  for (const token of tokens) {
    const modifier = COLOR_MODIFIERS[token]
    if (modifier) {
      modifierCount++
      if (modifier.colorShift) {
        colorShift = [
          colorShift[0] + modifier.colorShift[0],
          colorShift[1] + modifier.colorShift[1],
          colorShift[2] + modifier.colorShift[2],
        ]
      }
      if (modifier.roughnessShift !== undefined) {
        roughnessShift += modifier.roughnessShift
      }
    }
  }

  return { colorShift, roughnessShift, modifierCount }
}

/**
 * Collects gradient patterns from tokens
 */
function collectGradients(tokens: string[]): CubeGradient[] {
  const gradients: CubeGradient[] = []
  const usedAxes = new Set<GradientAxis>()

  for (const token of tokens) {
    const pattern = GRADIENT_PATTERNS[token]
    if (pattern) {
      for (const grad of pattern) {
        if (!usedAxes.has(grad.axis)) {
          // Convert colorShift to color_shift for CubeGradient type
          gradients.push({
            axis: grad.axis,
            factor: grad.factor,
            color_shift: grad.colorShift,
          })
          usedAxes.add(grad.axis)
        }
      }
    }
  }

  return gradients
}

/**
 * Generates random parameters for a cube
 */
function generateRandomParameters(): Partial<MaterialKeywords> {
  const noiseTypes: NoiseType[] = ['perlin', 'worley', 'crackle']
  const materialTypes: MaterialType[] = [
    'stone',
    'wood',
    'metal',
    'glass',
    'organic',
    'crystal',
    'liquid',
  ]
  const breakPatterns: BreakPattern[] = ['crumble', 'shatter', 'splinter', 'melt', 'dissolve']

  return {
    color: [
      Math.random() * 0.8 + 0.1,
      Math.random() * 0.8 + 0.1,
      Math.random() * 0.8 + 0.1,
    ] as Color3,
    roughness: Math.random() * 0.8 + 0.1,
    transparency: Math.random() > 0.7 ? Math.random() * 0.5 + 0.3 : 1.0,
    noiseType: noiseTypes[Math.floor(Math.random() * noiseTypes.length)],
    noiseScale: Math.random() * 15 + 2,
    material: materialTypes[Math.floor(Math.random() * materialTypes.length)],
    breakPattern: breakPatterns[Math.floor(Math.random() * breakPatterns.length)],
    density: Math.random() * 8 + 0.5,
    tags: ['generated', 'random'],
  }
}

/**
 * Main generation function - generates a SpectralCube from a text prompt
 *
 * @param prompt - Text description of the desired cube (supports English and Russian)
 * @returns GenerationResult with the generated cube and metadata
 */
export async function generateFromPrompt(prompt: string): Promise<GenerationResult> {
  const warnings: string[] = []
  let method: 'keyword' | 'template' | 'random' | 'hybrid' = 'keyword'
  let confidence = 0

  // Tokenize and translate prompt
  const rawTokens = tokenizePrompt(prompt)
  const tokens = translateTokens(rawTokens)

  // Find material match
  const { material: baseMaterial, score: materialScore } = findMaterialMatch(tokens)

  // Collect modifiers
  const { colorShift, roughnessShift, modifierCount } = collectModifiers(tokens)

  // Collect gradients
  const gradients = collectGradients(tokens)

  // Determine generation method and confidence
  let params: Partial<MaterialKeywords>

  if (baseMaterial && materialScore > 0) {
    params = { ...baseMaterial }
    confidence = Math.min(0.5 + materialScore * 0.1 + modifierCount * 0.05, 0.95)

    if (modifierCount > 0 || gradients.length > 0) {
      method = 'hybrid'
    }
  } else if (modifierCount > 0) {
    // No material but have modifiers - start with random and apply modifiers
    params = generateRandomParameters()
    method = 'hybrid'
    confidence = 0.3 + modifierCount * 0.1
    warnings.push('No specific material recognized, using random base with detected modifiers')
  } else {
    // Full random generation
    params = generateRandomParameters()
    method = 'random'
    confidence = 0.2
    warnings.push('No recognizable keywords found, using random generation')
  }

  // Apply color and roughness modifiers
  const baseColor = params.color || [0.5, 0.5, 0.5]
  const finalColor = applyColorShift(baseColor as Color3, colorShift)

  const baseRoughness = params.roughness ?? 0.5
  const finalRoughness = clamp(baseRoughness + roughnessShift, 0, 1)

  // Build the SpectralCube
  const cube: SpectralCube = {
    id: generateCubeId(),
    prompt: prompt,
    base: {
      color: finalColor,
      roughness: finalRoughness,
      transparency: params.transparency ?? 1.0,
    },
    gradients: gradients.length > 0 ? gradients : undefined,
    noise: {
      type: params.noiseType || 'perlin',
      scale: params.noiseScale || 8,
      octaves: 4,
      persistence: 0.5,
    },
    physics: {
      material: params.material || 'stone',
      density: params.density || 2.5,
      break_pattern: params.breakPattern || 'crumble',
    },
    meta: {
      name: prompt.slice(0, 50) + (prompt.length > 50 ? '...' : ''),
      tags: [...(params.tags || []), 'generated'],
      author: 'TinyLLM',
      created: new Date().toISOString(),
    },
  }

  // Validate the generated cube
  const validationResult = validateCube(cube)
  if (!validationResult.valid) {
    warnings.push(
      `Validation warnings: ${validationResult.errors.map((e) => e.message).join(', ')}`
    )
    confidence *= 0.8
  }

  return {
    success: true,
    cube,
    method,
    confidence,
    warnings,
  }
}

/**
 * Generates a cube from a preset template
 *
 * @param templateName - Name of the preset template
 * @returns GenerationResult with the template cube
 */
export async function generateFromTemplate(templateName: string): Promise<GenerationResult> {
  const normalizedName = templateName.toLowerCase().trim()
  const material = MATERIAL_KEYWORDS[normalizedName]

  if (!material) {
    return {
      success: false,
      cube: null,
      method: 'template',
      confidence: 0,
      warnings: [
        `Template "${templateName}" not found. Available: ${Object.keys(MATERIAL_KEYWORDS).join(', ')}`,
      ],
    }
  }

  const cube: SpectralCube = {
    id: generateCubeId(),
    prompt: `${templateName} (template)`,
    base: {
      color: material.color || [0.5, 0.5, 0.5],
      roughness: material.roughness ?? 0.5,
      transparency: material.transparency ?? 1.0,
    },
    noise: {
      type: material.noiseType || 'perlin',
      scale: material.noiseScale || 8,
      octaves: 4,
      persistence: 0.5,
    },
    physics: {
      material: material.material || 'stone',
      density: material.density || 2.5,
      break_pattern: material.breakPattern || 'crumble',
    },
    meta: {
      name: templateName.charAt(0).toUpperCase() + templateName.slice(1),
      tags: material.tags || [],
      author: 'TinyLLM',
      created: new Date().toISOString(),
    },
  }

  return {
    success: true,
    cube,
    method: 'template',
    confidence: 1.0,
    warnings: [],
  }
}

/**
 * Generates a completely random cube
 *
 * @returns GenerationResult with a random cube
 */
export async function generateRandom(): Promise<GenerationResult> {
  const params = generateRandomParameters()

  const cube: SpectralCube = {
    id: generateCubeId(),
    prompt: 'Random generation',
    base: {
      color: params.color as Color3,
      roughness: params.roughness ?? 0.5,
      transparency: params.transparency ?? 1.0,
    },
    noise: {
      type: params.noiseType || 'perlin',
      scale: params.noiseScale || 8,
      octaves: 4,
      persistence: 0.5,
    },
    physics: {
      material: params.material || 'stone',
      density: params.density || 2.5,
      break_pattern: params.breakPattern || 'crumble',
    },
    meta: {
      name: 'Random Cube',
      tags: ['generated', 'random'],
      author: 'TinyLLM',
      created: new Date().toISOString(),
    },
  }

  return {
    success: true,
    cube,
    method: 'random',
    confidence: 0.2,
    warnings: [],
  }
}

/**
 * Returns the list of available template names
 */
export function getAvailableTemplates(): string[] {
  return Object.keys(MATERIAL_KEYWORDS)
}

/**
 * Checks if TinyLLM is available and ready
 * In this implementation, it's always ready since we use rule-based generation
 */
export function isReady(): boolean {
  return true
}

/**
 * Initializes the TinyLLM module (no-op in this implementation)
 * Provided for API compatibility with potential future ML-based implementations
 */
export async function initialize(): Promise<void> {
  // No initialization needed for rule-based generation
  return Promise.resolve()
}

// ============================================================================
// Extended AI Functions (ISSUE 19)
// ============================================================================

/** Theme keyword mappings for thematic generation */
const THEME_KEYWORDS: Record<string, Partial<MaterialKeywords> & { colorShift?: ColorShift3 }> = {
  medieval: {
    roughness: 0.7,
    material: 'stone',
    tags: ['medieval', 'old', 'castle'],
  },
  fantasy: {
    transparency: 0.4,
    material: 'crystal',
    tags: ['fantasy', 'magic'],
  },
  modern: {
    roughness: 0.3,
    material: 'metal',
    tags: ['modern', 'sleek'],
  },
  natural: {
    roughness: 0.75,
    material: 'organic',
    tags: ['natural', 'organic'],
  },
  industrial: {
    roughness: 0.6,
    material: 'metal',
    tags: ['industrial', 'factory'],
  },
  ancient: {
    roughness: 0.85,
    material: 'stone',
    tags: ['ancient', 'weathered'],
    colorShift: [-0.1, -0.1, -0.05],
  },
  magical: {
    roughness: 0.15,
    transparency: 0.35,
    material: 'crystal',
    tags: ['magical', 'glowing'],
  },
  rustic: {
    roughness: 0.8,
    material: 'wood',
    tags: ['rustic', 'rural'],
  },
  // Russian theme keywords
  средневековый: {
    roughness: 0.7,
    material: 'stone',
    tags: ['medieval', 'old'],
  },
  фэнтези: {
    transparency: 0.4,
    material: 'crystal',
    tags: ['fantasy', 'magic'],
  },
  современный: {
    roughness: 0.3,
    material: 'metal',
    tags: ['modern', 'sleek'],
  },
}

/** Group type configurations for different construction types */
const GROUP_CONFIGS: Record<
  CubeGroupType,
  { dimensions: [number, number, number]; gradientDirection: GradientAxis }
> = {
  wall: { dimensions: [3, 3, 1], gradientDirection: 'y' },
  floor: { dimensions: [3, 3, 1], gradientDirection: 'radial' },
  column: { dimensions: [1, 3, 1], gradientDirection: 'y' },
  structure: { dimensions: [2, 2, 2], gradientDirection: 'radial' },
  terrain: { dimensions: [3, 3, 1], gradientDirection: 'y' },
}

/** Relation type color/property modifiers */
const RELATION_MODIFIERS: Record<NeighborRelation, { colorShift: ColorShift3; factor: number }> = {
  similar: { colorShift: [0.05, 0.05, 0.05], factor: 0.9 },
  contrast: { colorShift: [-0.3, -0.2, 0.3], factor: 0.5 },
  gradient: { colorShift: [0.15, 0.1, 0.05], factor: 0.75 },
  complement: { colorShift: [0.2, -0.15, 0.1], factor: 0.6 },
}

/**
 * In-memory fine-tuning dataset storage
 */
let fineTuningDataset: FineTuningDataset | null = null

/**
 * Extracts style characteristics from a set of cubes
 * Used for maintaining stylistic consistency in contextual generation
 *
 * @param cubes - Array of cubes to analyze
 * @returns ExtractedStyle object with averaged properties
 */
export function extractStyle(cubes: SpectralCube[]): ExtractedStyle {
  if (cubes.length === 0) {
    return {
      averageColor: [0.5, 0.5, 0.5],
      averageRoughness: 0.5,
      dominantMaterial: 'stone',
      dominantNoiseType: 'perlin',
      commonTags: [],
    }
  }

  // Calculate average color
  const colorSum: [number, number, number] = cubes.reduce<[number, number, number]>(
    (sum, cube) => {
      return [sum[0] + cube.base.color[0], sum[1] + cube.base.color[1], sum[2] + cube.base.color[2]]
    },
    [0, 0, 0]
  )
  const averageColor: Color3 = [
    colorSum[0] / cubes.length,
    colorSum[1] / cubes.length,
    colorSum[2] / cubes.length,
  ]

  // Calculate average roughness
  const roughnessSum = cubes.reduce((sum, cube) => sum + (cube.base.roughness ?? 0.5), 0)
  const averageRoughness = roughnessSum / cubes.length

  // Find dominant material
  const materialCounts: Record<string, number> = {}
  for (const cube of cubes) {
    const material = cube.physics?.material || 'stone'
    materialCounts[material] = (materialCounts[material] || 0) + 1
  }
  const dominantMaterial = (Object.entries(materialCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    'stone') as MaterialType

  // Find dominant noise type
  const noiseCounts: Record<string, number> = {}
  for (const cube of cubes) {
    const noiseType = cube.noise?.type || 'perlin'
    noiseCounts[noiseType] = (noiseCounts[noiseType] || 0) + 1
  }
  const dominantNoiseType = (Object.entries(noiseCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    'perlin') as NoiseType

  // Collect common tags
  const tagCounts: Record<string, number> = {}
  for (const cube of cubes) {
    for (const tag of cube.meta?.tags || []) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1
    }
  }
  const commonTags = Object.entries(tagCounts)
    .filter(([, count]) => count >= Math.ceil(cubes.length / 2))
    .map(([tag]) => tag)

  return {
    averageColor,
    averageRoughness,
    dominantMaterial,
    dominantNoiseType,
    commonTags,
  }
}

/**
 * Generates a cube with contextual awareness of surrounding cubes
 *
 * @param prompt - Text description for generation
 * @param context - Generation context with existing cubes and position
 * @returns GenerationResult with contextually-aware cube
 */
export async function generateContextual(
  prompt: string,
  context: GenerationContext
): Promise<GenerationResult> {
  const warnings: string[] = []

  // Extract style from context if not already provided
  let extractedStyle = context.extractedStyle
  if (!extractedStyle && context.existingCubes && context.existingCubes.size > 0) {
    extractedStyle = extractStyle(Array.from(context.existingCubes.values()))
  }
  if (!extractedStyle && context.neighborsInGrid && context.neighborsInGrid.length > 0) {
    extractedStyle = extractStyle(context.neighborsInGrid)
  }

  // Apply theme if specified
  let themeModifiers: Partial<MaterialKeywords> = {}
  if (context.theme) {
    const normalizedTheme = context.theme.toLowerCase()
    themeModifiers = THEME_KEYWORDS[normalizedTheme] || {}
    if (Object.keys(themeModifiers).length === 0) {
      warnings.push(`Theme "${context.theme}" not recognized, using default`)
    }
  }

  // Generate base cube from prompt
  const baseResult = await generateFromPrompt(prompt)
  if (!baseResult.success || !baseResult.cube) {
    return baseResult
  }

  // Apply extracted style for consistency
  let cube = baseResult.cube
  if (extractedStyle) {
    const styleInfluence = 0.4 // 40% influence from context
    const blendedColor = applyColorShift(cube.base.color, [
      (extractedStyle.averageColor[0] - cube.base.color[0]) * styleInfluence,
      (extractedStyle.averageColor[1] - cube.base.color[1]) * styleInfluence,
      (extractedStyle.averageColor[2] - cube.base.color[2]) * styleInfluence,
    ])
    cube = {
      ...cube,
      base: {
        ...cube.base,
        color: blendedColor,
        roughness: clamp(
          (cube.base.roughness ?? 0.5) * (1 - styleInfluence) +
            extractedStyle.averageRoughness * styleInfluence,
          0,
          1
        ),
      },
      meta: {
        ...cube.meta,
        tags: [...(cube.meta?.tags || []), ...extractedStyle.commonTags, 'contextual'],
      },
    }
    warnings.push('Applied contextual style from existing cubes')
  }

  // Apply theme modifiers
  if (Object.keys(themeModifiers).length > 0) {
    const themeShift = (themeModifiers as { colorShift?: ColorShift3 }).colorShift || [0, 0, 0]
    cube = {
      ...cube,
      base: {
        ...cube.base,
        color: applyColorShift(cube.base.color, themeShift),
        roughness: clamp(cube.base.roughness ?? 0.5, 0, 1),
        transparency: themeModifiers.transparency ?? cube.base.transparency,
      },
      physics: {
        ...cube.physics,
        material: themeModifiers.material || cube.physics?.material,
      },
      meta: {
        ...cube.meta,
        tags: [...(cube.meta?.tags || []), ...(themeModifiers.tags || [])],
      },
    }
  }

  // Calculate confidence boost for contextual generation
  const confidence = Math.min(baseResult.confidence + 0.1, 0.98)

  return {
    success: true,
    cube,
    method: 'hybrid',
    confidence,
    warnings: [...baseResult.warnings, ...warnings],
  }
}

/**
 * Generates cubes from a composite description
 * Supports primary cube with related neighbors
 *
 * @param description - Composite description with primary and neighbor definitions
 * @param context - Optional generation context
 * @returns CubeGroupResult with all generated cubes
 */
export async function generateFromComposite(
  description: CompositeDescription,
  context?: GenerationContext
): Promise<CubeGroupResult> {
  const warnings: string[] = []
  const cubes: SpectralCube[] = []
  const positions: [number, number, number][] = []

  // Apply theme to context if specified
  const effectiveContext: GenerationContext = {
    ...context,
    theme: description.theme || context?.theme,
  }

  // Generate primary cube - use contextual generation if we have theme or context
  const useContextual = effectiveContext.theme || context
  const primaryResult = useContextual
    ? await generateContextual(description.primary, effectiveContext)
    : await generateFromPrompt(description.primary)

  if (!primaryResult.success || !primaryResult.cube) {
    return {
      success: false,
      cubes: [],
      method: 'composite',
      confidence: 0,
      warnings: ['Failed to generate primary cube', ...primaryResult.warnings],
    }
  }

  cubes.push(primaryResult.cube)
  positions.push([0, 0, 0])
  warnings.push(...primaryResult.warnings)

  // Generate neighbor cubes
  if (description.neighbors && description.neighbors.length > 0) {
    for (const neighbor of description.neighbors) {
      const neighborCube = await generateNeighborCube(
        primaryResult.cube,
        neighbor,
        effectiveContext
      )
      if (neighborCube) {
        cubes.push(neighborCube)
        positions.push(getPositionFromDirection(neighbor.direction))
      } else {
        warnings.push(`Failed to generate neighbor in direction ${neighbor.direction}`)
      }
    }
  }

  // Generate variations if requested
  if (description.variations && description.variations > 1) {
    const variationPrompts = generateVariationPrompts(
      description.primary,
      description.variations - 1
    )
    for (const varPrompt of variationPrompts) {
      const varResult = context
        ? await generateContextual(varPrompt, {
            ...effectiveContext,
            extractedStyle: extractStyle(cubes),
          })
        : await generateFromPrompt(varPrompt)

      if (varResult.success && varResult.cube) {
        cubes.push(varResult.cube)
      }
    }
  }

  const avgConfidence = cubes.length > 0 ? primaryResult.confidence : 0

  return {
    success: cubes.length > 0,
    cubes,
    method: 'composite',
    confidence: avgConfidence,
    warnings,
    groupType: description.groupType,
    positions,
  }
}

/**
 * Generates a neighbor cube based on the primary cube and relation
 */
async function generateNeighborCube(
  primary: SpectralCube,
  neighbor: NeighborDescription,
  context?: GenerationContext
): Promise<SpectralCube | null> {
  const relationMod = RELATION_MODIFIERS[neighbor.relation]

  // Generate base neighbor cube
  const baseResult = context
    ? await generateContextual(neighbor.description, context)
    : await generateFromPrompt(neighbor.description)

  if (!baseResult.success || !baseResult.cube) {
    return null
  }

  // Apply relation-based modifications
  const neighborCube = baseResult.cube
  const primaryColor = primary.base.color

  // Blend color based on relation
  let finalColor: Color3
  switch (neighbor.relation) {
    case 'similar':
      finalColor = [
        clamp(neighborCube.base.color[0] * 0.3 + primaryColor[0] * 0.7, 0, 1),
        clamp(neighborCube.base.color[1] * 0.3 + primaryColor[1] * 0.7, 0, 1),
        clamp(neighborCube.base.color[2] * 0.3 + primaryColor[2] * 0.7, 0, 1),
      ]
      break
    case 'contrast':
      finalColor = [
        clamp(1 - primaryColor[0] * 0.5 + neighborCube.base.color[0] * 0.5, 0, 1),
        clamp(1 - primaryColor[1] * 0.5 + neighborCube.base.color[1] * 0.5, 0, 1),
        clamp(1 - primaryColor[2] * 0.5 + neighborCube.base.color[2] * 0.5, 0, 1),
      ]
      break
    case 'gradient':
      finalColor = applyColorShift(primaryColor, relationMod.colorShift)
      break
    case 'complement':
      finalColor = [
        clamp(primaryColor[0] + relationMod.colorShift[0], 0, 1),
        clamp(primaryColor[1] + relationMod.colorShift[1], 0, 1),
        clamp(primaryColor[2] + relationMod.colorShift[2], 0, 1),
      ]
      break
    default:
      finalColor = neighborCube.base.color
  }

  return {
    ...neighborCube,
    base: {
      ...neighborCube.base,
      color: finalColor,
    },
    meta: {
      ...neighborCube.meta,
      tags: [...(neighborCube.meta?.tags || []), 'neighbor', neighbor.relation],
    },
  }
}

/**
 * Gets grid position from direction
 */
function getPositionFromDirection(direction: string): [number, number, number] {
  switch (direction) {
    case 'x':
      return [1, 0, 0]
    case '-x':
      return [-1, 0, 0]
    case 'y':
      return [0, 1, 0]
    case '-y':
      return [0, -1, 0]
    case 'z':
      return [0, 0, 1]
    case '-z':
      return [0, 0, -1]
    default:
      return [0, 0, 0]
  }
}

/**
 * Generates variation prompts by adding modifiers to base prompt
 */
function generateVariationPrompts(basePrompt: string, count: number): string[] {
  const variationModifiers = [
    'slightly darker',
    'slightly lighter',
    'weathered',
    'fresh',
    'mossy',
    'dusty',
    'wet',
    'dry',
    'old',
    'new',
  ]

  const prompts: string[] = []
  for (let i = 0; i < count && i < variationModifiers.length; i++) {
    prompts.push(`${variationModifiers[i]} ${basePrompt}`)
  }
  return prompts
}

/**
 * Batch generation - generates multiple cubes from an array of prompts
 *
 * @param request - Batch generation request with prompts and options
 * @returns Array of GenerationResults
 */
export async function generateBatch(request: BatchGenerationRequest): Promise<GenerationResult[]> {
  const results: GenerationResult[] = []
  const generatedCubes: SpectralCube[] = []

  // Extract style from context cubes if provided
  let extractedStyle: ExtractedStyle | undefined
  if (request.contextCubes && request.contextCubes.length > 0) {
    extractedStyle = extractStyle(request.contextCubes)
  }

  for (let i = 0; i < request.prompts.length; i++) {
    let prompt = request.prompts[i]

    // Apply global style modifier if specified
    if (request.style) {
      prompt = `${request.style} ${prompt}`
    }

    // Build context based on grouping mode
    const context: GenerationContext = {
      theme: request.theme,
      extractedStyle,
    }

    // For related/themed grouping, include previously generated cubes
    if (
      (request.grouping === 'related' || request.grouping === 'themed') &&
      generatedCubes.length > 0
    ) {
      context.extractedStyle = extractStyle([...(request.contextCubes || []), ...generatedCubes])
    }

    // Generate with or without context
    const result =
      request.grouping === 'individual'
        ? await generateFromPrompt(prompt)
        : await generateContextual(prompt, context)

    results.push(result)
    if (result.success && result.cube) {
      generatedCubes.push(result.cube)
    }
  }

  return results
}

/**
 * Generates a group of cubes for a specific structure type
 *
 * @param groupType - Type of group (wall, floor, column, etc.)
 * @param description - Text description for the group
 * @param dimensions - Optional custom dimensions [width, height, depth]
 * @returns CubeGroupResult with positioned cubes
 */
export async function generateGroup(
  groupType: CubeGroupType,
  description: string,
  dimensions?: [number, number, number]
): Promise<CubeGroupResult> {
  const config = GROUP_CONFIGS[groupType]
  const [width, height, depth] = dimensions || config.dimensions
  const cubes: SpectralCube[] = []
  const positions: [number, number, number][] = []
  const warnings: string[] = []

  // Generate base cube
  const baseResult = await generateFromPrompt(description)
  if (!baseResult.success || !baseResult.cube) {
    return {
      success: false,
      cubes: [],
      method: 'group',
      confidence: 0,
      warnings: ['Failed to generate base cube for group'],
      groupType,
    }
  }

  const baseCube = baseResult.cube
  const extractedStyle = extractStyle([baseCube])

  // Generate cubes for all positions in the group
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      for (let z = 0; z < depth; z++) {
        // Calculate position-based variation
        const positionFactor = calculatePositionFactor(
          x,
          y,
          z,
          width,
          height,
          depth,
          config.gradientDirection
        )

        // Generate variation with position context
        const variationPrompt = `${description}`
        const result = await generateContextual(variationPrompt, {
          extractedStyle,
          gridPosition: [x, y, z],
        })

        if (result.success && result.cube) {
          // Apply position-based gradient
          const gradientShift: ColorShift3 = [
            positionFactor * 0.15,
            positionFactor * 0.1,
            positionFactor * 0.05,
          ]
          const modifiedCube: SpectralCube = {
            ...result.cube,
            base: {
              ...result.cube.base,
              color: applyColorShift(result.cube.base.color, gradientShift),
            },
            meta: {
              ...result.cube.meta,
              tags: [...(result.cube.meta?.tags || []), groupType, 'group'],
            },
          }
          cubes.push(modifiedCube)
          positions.push([x, y, z])
        } else {
          warnings.push(`Failed to generate cube at position [${x}, ${y}, ${z}]`)
        }
      }
    }
  }

  const avgConfidence =
    cubes.length > 0
      ? cubes.reduce((sum, _, idx) => sum + (idx === 0 ? baseResult.confidence : 0.8), 0) /
        cubes.length
      : 0

  return {
    success: cubes.length > 0,
    cubes,
    method: 'group',
    confidence: Math.min(avgConfidence, 0.95),
    warnings,
    groupType,
    positions,
  }
}

/**
 * Calculates position-based factor for gradient effects in groups
 */
function calculatePositionFactor(
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  depth: number,
  direction: GradientAxis
): number {
  switch (direction) {
    case 'y':
      return height > 1 ? y / (height - 1) : 0
    case 'x':
      return width > 1 ? x / (width - 1) : 0
    case 'z':
      return depth > 1 ? z / (depth - 1) : 0
    case 'radial': {
      const cx = (width - 1) / 2
      const cy = (height - 1) / 2
      const cz = (depth - 1) / 2
      const maxDist = Math.sqrt(cx * cx + cy * cy + cz * cz) || 1
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2)
      return dist / maxDist
    }
    default:
      return 0
  }
}

// ============================================================================
// Fine-tuning Functions
// ============================================================================

/**
 * Adds a training example to the fine-tuning dataset
 *
 * @param example - Training example with prompt and expected cube
 */
export function addTrainingExample(example: TrainingExample): void {
  if (!fineTuningDataset) {
    fineTuningDataset = {
      id: `dataset_${Date.now().toString(36)}`,
      name: 'User Training Data',
      examples: [],
      version: '1.0.0',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    }
  }

  fineTuningDataset.examples.push(example)
  fineTuningDataset.modified = new Date().toISOString()
}

/**
 * Gets the current fine-tuning dataset
 */
export function getFineTuningDataset(): FineTuningDataset | null {
  return fineTuningDataset
}

/**
 * Loads a fine-tuning dataset
 *
 * @param dataset - Dataset to load
 */
export function loadFineTuningDataset(dataset: FineTuningDataset): void {
  fineTuningDataset = dataset
}

/**
 * Clears the fine-tuning dataset
 */
export function clearFineTuningDataset(): void {
  fineTuningDataset = null
}

/**
 * Exports the fine-tuning dataset as JSON
 */
export function exportFineTuningDataset(): string | null {
  if (!fineTuningDataset) return null
  return JSON.stringify(fineTuningDataset, null, 2)
}

/**
 * Generates a cube using fine-tuning examples for improved matching
 * Falls back to standard generation if no relevant examples found
 *
 * @param prompt - Text prompt for generation
 * @returns GenerationResult with potentially improved matching
 */
export async function generateWithFineTuning(prompt: string): Promise<GenerationResult> {
  if (!fineTuningDataset || fineTuningDataset.examples.length === 0) {
    // Fall back to standard generation
    return generateFromPrompt(prompt)
  }

  // Find similar examples
  const tokens = translateTokens(tokenizePrompt(prompt))
  let bestMatch: TrainingExample | null = null
  let bestScore = 0

  for (const example of fineTuningDataset.examples) {
    const exampleTokens = translateTokens(tokenizePrompt(example.prompt))
    const score = calculateSimilarity(tokens, exampleTokens)

    // Weight by rating if available
    const weightedScore = score * (example.rating ?? 0.7)

    if (weightedScore > bestScore) {
      bestScore = weightedScore
      bestMatch = example
    }
  }

  // If we have a good match, use it as a template
  if (bestMatch && bestScore > 0.5) {
    const cube = {
      ...bestMatch.cube,
      id: generateCubeId(),
      prompt: prompt,
      meta: {
        ...bestMatch.cube.meta,
        author: 'TinyLLM-FineTuned',
        created: new Date().toISOString(),
        tags: [...(bestMatch.cube.meta?.tags || []), 'fine-tuned'],
      },
    }

    return {
      success: true,
      cube,
      method: 'template',
      confidence: Math.min(0.7 + bestScore * 0.3, 0.98),
      warnings: [
        `Matched fine-tuning example: "${bestMatch.prompt}" (score: ${bestScore.toFixed(2)})`,
      ],
    }
  }

  // Fall back to standard generation
  return generateFromPrompt(prompt)
}

/**
 * Calculates similarity between two token arrays
 */
function calculateSimilarity(tokens1: string[], tokens2: string[]): number {
  if (tokens1.length === 0 || tokens2.length === 0) return 0

  const set1 = new Set(tokens1)
  const set2 = new Set(tokens2)

  let intersection = 0
  for (const token of set1) {
    if (set2.has(token)) intersection++
  }

  // Jaccard similarity
  const union = set1.size + set2.size - intersection
  return union > 0 ? intersection / union : 0
}

/**
 * Records user feedback for a generation to improve future results
 *
 * @param prompt - Original prompt
 * @param cube - Generated cube
 * @param rating - User rating (0-1)
 */
export function recordFeedback(prompt: string, cube: SpectralCube, rating: number): void {
  addTrainingExample({
    prompt,
    cube,
    rating: clamp(rating, 0, 1),
    created: new Date().toISOString(),
  })
}

/**
 * Gets available theme names (excluding Russian translations)
 */
export function getAvailableThemes(): string[] {
  // Filter out Russian keywords (those with Cyrillic characters)
  return Object.keys(THEME_KEYWORDS).filter(
    (key) => !/[а-яёА-ЯЁ]/.test(key) // Filter out Russian themes by checking for Cyrillic
  )
}

/**
 * Gets available group types
 */
export function getAvailableGroupTypes(): CubeGroupType[] {
  return Object.keys(GROUP_CONFIGS) as CubeGroupType[]
}

// ============================================================================
// TASK 53: TinyLLM + Metadata Integration (Phase 8 - AI + Metadata)
// ============================================================================

import type { AIQueryRequest, AIQueryResponse, QueryIntent, QueryLanguage } from '../types/ai-query'
import { detectQueryLanguage, classifyQueryIntent, createSuccessResponse } from '../types/ai-query'
import type { ComponentMeta } from '../types/component-meta'
import { getAllComponentMeta, searchComponentMeta } from '../types/component-meta'

/**
 * Configuration for metadata query processing
 */
export interface MetadataQueryConfig {
  /** Maximum results to return */
  maxResults: number
  /** Minimum relevance score threshold (0-1) */
  minRelevanceScore: number
  /** Enable caching */
  enableCache: boolean
  /** Cache TTL in milliseconds */
  cacheTTL: number
  /** Use TinyLLM enhancements for response generation */
  useLLMEnhancements: boolean
}

/**
 * Default metadata query configuration
 */
export const DEFAULT_METADATA_QUERY_CONFIG: MetadataQueryConfig = {
  maxResults: 10,
  minRelevanceScore: 0.1,
  enableCache: true,
  cacheTTL: 60000, // 1 minute
  useLLMEnhancements: true,
}

/**
 * Training example for metadata queries
 */
export interface MetadataQueryTrainingExample {
  /** Input query text */
  query: string
  /** Expected intent */
  intent: QueryIntent
  /** Expected component names in response */
  expectedComponents: string[]
  /** Response quality rating (0-1) */
  rating?: number
  /** ISO date when example was created */
  created: string
}

/**
 * Metadata query training dataset
 */
export interface MetadataQueryDataset {
  /** Dataset ID */
  id: string
  /** Dataset name */
  name: string
  /** Training examples */
  examples: MetadataQueryTrainingExample[]
  /** Dataset version */
  version: string
  /** ISO date when dataset was created */
  created: string
  /** ISO date when dataset was last modified */
  modified: string
}

/**
 * Cache entry for metadata queries
 */
interface MetadataQueryCacheEntry {
  response: AIQueryResponse
  timestamp: number
}

/**
 * Keyword patterns for enhanced intent detection
 */
const METADATA_INTENT_KEYWORDS: Record<QueryLanguage, Record<QueryIntent, string[]>> = {
  ru: {
    describe: ['что', 'какой', 'опиши', 'расскажи', 'объясни', 'информация', 'делает', 'для чего'],
    find: ['найди', 'покажи', 'где', 'поиск', 'искать', 'компоненты'],
    dependencies: ['зависимости', 'использует', 'требует', 'импорт', 'зависит'],
    history: ['история', 'изменения', 'обновления', 'версия', 'когда'],
    usage: ['использовать', 'применять', 'пример', 'синтаксис', 'как'],
    related: ['связанные', 'похожие', 'аналоги', 'альтернативы', 'подобные'],
    features: ['функции', 'возможности', 'фичи', 'умеет', 'может'],
    status: ['статус', 'состояние', 'стабильность', 'фаза', 'готов'],
    unknown: [],
  },
  en: {
    describe: ['what', 'describe', 'tell', 'explain', 'info', 'does', 'purpose'],
    find: ['find', 'show', 'where', 'search', 'locate', 'components'],
    dependencies: ['dependencies', 'uses', 'requires', 'imports', 'depends'],
    history: ['history', 'changes', 'updates', 'version', 'when'],
    usage: ['use', 'apply', 'example', 'syntax', 'how'],
    related: ['related', 'similar', 'alternatives', 'like', 'analogous'],
    features: ['features', 'capabilities', 'functions', 'can', 'able'],
    status: ['status', 'state', 'stability', 'phase', 'ready'],
    unknown: [],
  },
}

/**
 * Russian to English translation map for component-related terms
 */
const COMPONENT_TERM_TRANSLATIONS: Record<string, string> = {
  // Component types
  компонент: 'component',
  компоненты: 'components',
  модуль: 'module',
  панель: 'panel',
  редактор: 'editor',
  превью: 'preview',
  галерея: 'gallery',
  генератор: 'generator',
  // Features
  куб: 'cube',
  кубик: 'cube',
  шейдер: 'shader',
  визуализация: 'visualization',
  экспорт: 'export',
  импорт: 'import',
  // Status
  стабильный: 'stable',
  бета: 'beta',
  экспериментальный: 'experimental',
  устаревший: 'deprecated',
  // Phase
  фаза: 'phase',
  этап: 'phase',
}

/**
 * Stopwords to filter from queries
 */
const QUERY_STOPWORDS: Set<string> = new Set([
  'the',
  'a',
  'an',
  'is',
  'are',
  'was',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'must',
  'to',
  'of',
  'in',
  'for',
  'on',
  'with',
  'at',
  'by',
  'from',
  'and',
  'or',
  'but',
  'not',
  'this',
  'that',
  'it',
  'me',
  'you',
  'и',
  'в',
  'во',
  'не',
  'что',
  'он',
  'на',
  'я',
  'с',
  'со',
  'как',
  'а',
  'то',
  'все',
  'она',
  'так',
  'его',
  'но',
  'да',
  'ты',
  'к',
  'у',
  'же',
  'вы',
  'за',
  'бы',
  'по',
  'только',
  'её',
  'мне',
])

// In-memory training dataset for metadata queries
let metadataQueryDataset: MetadataQueryDataset | null = null

// In-memory cache for metadata queries
const metadataQueryCache: Map<string, MetadataQueryCacheEntry> = new Map()

// Current configuration
let metadataQueryConfig: MetadataQueryConfig = { ...DEFAULT_METADATA_QUERY_CONFIG }

/**
 * Sets the metadata query configuration
 */
export function setMetadataQueryConfig(config: Partial<MetadataQueryConfig>): void {
  metadataQueryConfig = { ...metadataQueryConfig, ...config }
}

/**
 * Gets the current metadata query configuration
 */
export function getMetadataQueryConfig(): MetadataQueryConfig {
  return { ...metadataQueryConfig }
}

/**
 * Tokenizes a query for processing
 */
function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\wа-яёА-ЯЁ\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter((token) => token.length > 1)
    .filter((token) => !QUERY_STOPWORDS.has(token))
}

/**
 * Translates query tokens from Russian to English
 */
function translateQueryTokens(tokens: string[]): string[] {
  return tokens.map((token) => {
    // First check component-specific translations
    if (COMPONENT_TERM_TRANSLATIONS[token]) {
      return COMPONENT_TERM_TRANSLATIONS[token]
    }
    // Then check the general Russian translations from cube generation
    return RUSSIAN_TRANSLATIONS[token] || token
  })
}

/**
 * Extracts component name from query using pattern matching
 */
function extractComponentNameFromQuery(query: string): string | null {
  // Look for PascalCase component names
  const pascalCaseMatch = query.match(
    /([A-Z][a-zA-Z]*(?:Editor|Panel|Preview|Gallery|Generator|Cube|Stack|Grid)?)/g
  )
  if (pascalCaseMatch && pascalCaseMatch.length > 0) {
    // Return the longest match (more specific)
    return pascalCaseMatch.sort((a, b) => b.length - a.length)[0]
  }
  return null
}

/**
 * Extracts phase number from query
 */
function extractPhaseFromQuery(query: string): number | null {
  const match = query.match(/(?:phase|фаз[аеуыо]?)\s*(\d+)/i)
  if (match) {
    return parseInt(match[1], 10)
  }
  return null
}

/**
 * Extracts status filter from query
 */
function extractStatusFromQuery(query: string): ComponentMeta['status'] | null {
  const queryLower = query.toLowerCase()

  const statusPatterns: Record<ComponentMeta['status'], string[]> = {
    stable: ['stable', 'стабильн'],
    beta: ['beta', 'бета'],
    experimental: ['experimental', 'эксперимент'],
    deprecated: ['deprecated', 'устарев'],
  }

  for (const [status, patterns] of Object.entries(statusPatterns)) {
    for (const pattern of patterns) {
      if (queryLower.includes(pattern)) {
        return status as ComponentMeta['status']
      }
    }
  }

  return null
}

/**
 * Calculates relevance score between query tokens and component
 */
function calculateRelevanceScore(
  queryTokens: string[],
  component: ComponentMeta
): { score: number; matchedFields: string[] } {
  if (queryTokens.length === 0) {
    return { score: 0, matchedFields: [] }
  }

  let score = 0
  const matchedFields: string[] = []

  // Name matching (highest weight: 0.4)
  const nameLower = component.name.toLowerCase()
  const nameTokens = tokenizeQuery(component.name)
  let nameScore = 0
  for (const token of queryTokens) {
    if (nameLower.includes(token) || nameTokens.some((t) => t.includes(token))) {
      nameScore += 1 / queryTokens.length
    }
  }
  if (nameScore > 0) {
    score += nameScore * 0.4
    matchedFields.push('name')
  }

  // Summary matching (weight: 0.3)
  const summaryLower = component.summary.toLowerCase()
  const summaryTokens = tokenizeQuery(component.summary)
  let summaryScore = 0
  for (const token of queryTokens) {
    if (summaryLower.includes(token) || summaryTokens.some((t) => t.includes(token))) {
      summaryScore += 1 / queryTokens.length
    }
  }
  if (summaryScore > 0) {
    score += summaryScore * 0.3
    matchedFields.push('summary')
  }

  // Description matching (weight: 0.2)
  const descLower = component.description.toLowerCase()
  const descTokens = tokenizeQuery(component.description)
  let descScore = 0
  for (const token of queryTokens) {
    if (descLower.includes(token) || descTokens.some((t) => t.includes(token))) {
      descScore += 1 / queryTokens.length
    }
  }
  if (descScore > 0) {
    score += descScore * 0.2
    matchedFields.push('description')
  }

  // Tag matching (weight: 0.1)
  const tagLower = component.tags.map((t) => t.toLowerCase())
  let tagScore = 0
  for (const token of queryTokens) {
    if (tagLower.some((t) => t.includes(token))) {
      tagScore += 1 / queryTokens.length
    }
  }
  if (tagScore > 0) {
    score += tagScore * 0.1
    matchedFields.push('tags')
  }

  return { score: Math.min(1.0, score), matchedFields }
}

/**
 * Searches components using TinyLLM-enhanced matching
 */
function searchComponentsWithLLM(
  query: string,
  maxResults: number = 10,
  minScore: number = 0.1
): Array<{ component: ComponentMeta; score: number; matchedFields: string[] }> {
  const results: Array<{ component: ComponentMeta; score: number; matchedFields: string[] }> = []
  const components = getAllComponentMeta()

  // Extract component name for exact matching
  const componentName = extractComponentNameFromQuery(query)
  if (componentName) {
    const exactMatches = searchComponentMeta(componentName)
    for (const component of exactMatches) {
      results.push({ component, score: 1.0, matchedFields: ['name'] })
    }
    if (results.length > 0) {
      return results.slice(0, maxResults)
    }
  }

  // Tokenize and translate query
  const rawTokens = tokenizeQuery(query)
  const tokens = translateQueryTokens(rawTokens)

  // Extract filters
  const phaseFilter = extractPhaseFromQuery(query)
  const statusFilter = extractStatusFromQuery(query)

  // Filter components by phase and status
  let candidateComponents = components
  if (phaseFilter !== null) {
    candidateComponents = candidateComponents.filter((c) => c.phase === phaseFilter)
  }
  if (statusFilter !== null) {
    candidateComponents = candidateComponents.filter((c) => c.status === statusFilter)
  }

  // Score each component
  for (const component of candidateComponents) {
    const { score, matchedFields } = calculateRelevanceScore(tokens, component)
    if (score >= minScore) {
      results.push({ component, score, matchedFields })
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score)

  return results.slice(0, maxResults)
}

/**
 * Enhances intent classification using TinyLLM keyword matching
 */
function enhanceIntentClassification(query: string, language: QueryLanguage): QueryIntent {
  const queryLower = query.toLowerCase()
  const keywords = METADATA_INTENT_KEYWORDS[language]

  // Score each intent based on keyword matches
  const intentScores: Record<QueryIntent, number> = {
    describe: 0,
    find: 0,
    dependencies: 0,
    history: 0,
    usage: 0,
    related: 0,
    features: 0,
    status: 0,
    unknown: 0,
  }

  for (const [intent, intentKeywords] of Object.entries(keywords)) {
    for (const keyword of intentKeywords) {
      if (queryLower.includes(keyword)) {
        intentScores[intent as QueryIntent] += 1
      }
    }
  }

  // Find the intent with highest score
  let maxScore = 0
  let bestIntent: QueryIntent = 'unknown'
  for (const [intent, score] of Object.entries(intentScores)) {
    if (score > maxScore) {
      maxScore = score
      bestIntent = intent as QueryIntent
    }
  }

  // If no clear winner, fall back to standard classification
  if (maxScore === 0) {
    return classifyQueryIntent(query, language)
  }

  return bestIntent
}

/**
 * Generates a natural language response using TinyLLM patterns
 */
function generateNLResponse(
  intent: QueryIntent,
  components: ComponentMeta[],
  language: QueryLanguage
): string {
  if (components.length === 0) {
    return language === 'ru'
      ? 'Компоненты не найдены. Попробуйте уточнить запрос или использовать другие ключевые слова.'
      : 'No components found. Try refining your query or using different keywords.'
  }

  const component = components[0]

  switch (intent) {
    case 'describe':
      return language === 'ru'
        ? `**${component.name}** (v${component.version}) — ${component.summary}\n\n${component.description}`
        : `**${component.name}** (v${component.version}) — ${component.summary}\n\n${component.description}`

    case 'find': {
      const names = components.map((c) => c.name).join(', ')
      return language === 'ru'
        ? `Найдено ${components.length} компонент(ов): ${names}`
        : `Found ${components.length} component(s): ${names}`
    }

    case 'dependencies': {
      if (component.dependencies.length === 0) {
        return language === 'ru'
          ? `Компонент ${component.name} не имеет зарегистрированных зависимостей.`
          : `Component ${component.name} has no registered dependencies.`
      }
      const deps = component.dependencies
        .map((d) => `- ${d.name} (${d.type}): ${d.purpose}`)
        .join('\n')
      return language === 'ru'
        ? `**Зависимости ${component.name}:**\n\n${deps}`
        : `**Dependencies of ${component.name}:**\n\n${deps}`
    }

    case 'history': {
      if (component.history.length === 0) {
        return language === 'ru'
          ? `История изменений ${component.name} недоступна.`
          : `Change history for ${component.name} is not available.`
      }
      const history = component.history
        .slice(0, 5)
        .map((h) => `- v${h.version} (${h.date.split('T')[0]}): ${h.description}`)
        .join('\n')
      return language === 'ru'
        ? `**История изменений ${component.name}:**\n\n${history}`
        : `**Change history of ${component.name}:**\n\n${history}`
    }

    case 'usage': {
      const tips = component.tips?.length
        ? component.tips.map((t) => `- ${t}`).join('\n')
        : language === 'ru'
          ? 'Нет доступных подсказок.'
          : 'No tips available.'
      return language === 'ru'
        ? `**Использование ${component.name}:**\n\n${tips}\n\nФайл: \`${component.filePath}\``
        : `**Usage of ${component.name}:**\n\n${tips}\n\nFile: \`${component.filePath}\``
    }

    case 'related': {
      const allComponents = getAllComponentMeta()
      const related = allComponents
        .filter(
          (c) =>
            c.id !== component.id &&
            (c.phase === component.phase || c.tags.some((t) => component.tags.includes(t)))
        )
        .slice(0, 5)

      if (related.length === 0) {
        return language === 'ru'
          ? `Связанные компоненты для ${component.name} не найдены.`
          : `No related components found for ${component.name}.`
      }
      const relatedNames = related.map((c) => c.name).join(', ')
      return language === 'ru'
        ? `**Связанные с ${component.name}:** ${relatedNames}`
        : `**Related to ${component.name}:** ${relatedNames}`
    }

    case 'features': {
      if (component.features.length === 0) {
        return language === 'ru'
          ? `Список функций ${component.name} не определён.`
          : `Feature list for ${component.name} is not defined.`
      }
      const features = component.features
        .map((f) => `- ${f.enabled ? '[+]' : '[-]'} ${f.name}: ${f.description}`)
        .join('\n')
      return language === 'ru'
        ? `**Функции ${component.name}:**\n\n${features}`
        : `**Features of ${component.name}:**\n\n${features}`
    }

    case 'status': {
      const statusLabels = {
        stable: language === 'ru' ? 'Стабильный' : 'Stable',
        beta: 'Beta',
        experimental: language === 'ru' ? 'Экспериментальный' : 'Experimental',
        deprecated: language === 'ru' ? 'Устаревший' : 'Deprecated',
      }
      let answer =
        language === 'ru'
          ? `**${component.name}**: ${statusLabels[component.status]} (v${component.version}, Фаза ${component.phase})`
          : `**${component.name}**: ${statusLabels[component.status]} (v${component.version}, Phase ${component.phase})`

      if (component.knownIssues && component.knownIssues.length > 0) {
        const issues = component.knownIssues.map((i) => `- ${i}`).join('\n')
        answer += `\n\n${language === 'ru' ? 'Известные проблемы' : 'Known issues'}:\n${issues}`
      }
      return answer
    }

    default:
      return language === 'ru'
        ? `Возможно, вы ищете: ${components.map((c) => c.name).join(', ')}`
        : `Perhaps you're looking for: ${components.map((c) => c.name).join(', ')}`
  }
}

/**
 * Generates a cache key for a metadata query
 */
function generateCacheKey(request: AIQueryRequest): string {
  return `${request.query.toLowerCase().trim()}|${request.context || ''}|${request.language || ''}`
}

/**
 * Clears the metadata query cache
 */
export function clearMetadataQueryCache(): void {
  metadataQueryCache.clear()
}

/**
 * Gets related queries based on component and current intent
 */
function getRelatedQueries(
  component: ComponentMeta,
  currentIntent: QueryIntent,
  language: QueryLanguage
): string[] {
  const queries: string[] = []

  if (currentIntent !== 'dependencies') {
    queries.push(
      language === 'ru'
        ? `Какие зависимости у ${component.name}?`
        : `What are the dependencies of ${component.name}?`
    )
  }

  if (currentIntent !== 'usage') {
    queries.push(
      language === 'ru' ? `Как использовать ${component.name}?` : `How to use ${component.name}?`
    )
  }

  if (currentIntent !== 'history') {
    queries.push(
      language === 'ru'
        ? `История изменений ${component.name}`
        : `Change history of ${component.name}`
    )
  }

  if (currentIntent !== 'features') {
    queries.push(
      language === 'ru'
        ? `Какие функции у ${component.name}?`
        : `What features does ${component.name} have?`
    )
  }

  return queries.slice(0, 3)
}

/**
 * Gets suggestions for the user
 */
function getSuggestions(language: QueryLanguage): string[] {
  const allComponents = getAllComponentMeta()
  const names = allComponents.slice(0, 5).map((c) => c.name)

  if (language === 'ru') {
    return [...names, 'Покажи все компоненты', 'Найди компоненты фазы 1']
  }

  return [...names, 'Show all components', 'Find phase 1 components']
}

/**
 * Processes a metadata query using TinyLLM-enhanced processing
 *
 * This function integrates TinyLLM with the component metadata registry to provide
 * intelligent responses to natural language queries about components.
 *
 * Features:
 * - Enhanced intent classification using TinyLLM keyword matching
 * - Semantic search with relevance scoring
 * - Caching for frequent queries
 * - Rule-based fallback when AI processing fails
 * - Multi-language support (Russian/English)
 *
 * @param request - The query request containing the natural language query
 * @returns AIQueryResponse with structured response and metadata
 */
export function processMetadataQueryWithLLM(request: AIQueryRequest): AIQueryResponse {
  const startTime = Date.now()
  const cacheKey = generateCacheKey(request)

  // Check cache
  if (metadataQueryConfig.enableCache) {
    const cached = metadataQueryCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < metadataQueryConfig.cacheTTL) {
      return {
        ...cached.response,
        processingTime: Date.now() - startTime,
      }
    }
  }

  try {
    // Detect language
    const language = request.language || detectQueryLanguage(request.query)

    // Enhanced intent classification using TinyLLM
    let intent: QueryIntent
    if (metadataQueryConfig.useLLMEnhancements) {
      intent = enhanceIntentClassification(request.query, language)
    } else {
      intent = request.intent || classifyQueryIntent(request.query, language)
    }

    // Search for components using TinyLLM-enhanced matching
    const searchResults = searchComponentsWithLLM(
      request.query,
      request.maxResults || metadataQueryConfig.maxResults,
      metadataQueryConfig.minRelevanceScore
    )

    // Extract components and calculate average confidence
    const components = searchResults.map((r) => r.component)
    const avgScore =
      searchResults.length > 0
        ? searchResults.reduce((sum, r) => sum + r.score, 0) / searchResults.length
        : 0

    // Generate natural language response
    const answer = generateNLResponse(intent, components, language)

    // Build response
    const response: AIQueryResponse = createSuccessResponse(
      answer,
      components,
      intent,
      language,
      avgScore,
      {
        relatedQueries:
          components.length > 0 ? getRelatedQueries(components[0], intent, language) : undefined,
        suggestions: components.length === 0 ? getSuggestions(language) : undefined,
        processingTime: Date.now() - startTime,
      }
    )

    // Cache the response
    if (metadataQueryConfig.enableCache) {
      metadataQueryCache.set(cacheKey, { response, timestamp: Date.now() })
    }

    return response
  } catch {
    // Rule-based fallback on error
    return ruleBasedMetadataQuery(request, Date.now() - startTime)
  }
}

/**
 * Rule-based fallback for metadata queries when LLM processing fails
 *
 * This provides a simpler, more reliable processing path that doesn't
 * depend on LLM enhancements but still provides useful results.
 *
 * @param request - The query request
 * @param elapsedTime - Time already elapsed in processing
 * @returns AIQueryResponse with fallback results
 */
function ruleBasedMetadataQuery(request: AIQueryRequest, elapsedTime: number): AIQueryResponse {
  const language = request.language || detectQueryLanguage(request.query)
  const intent = classifyQueryIntent(request.query, language)

  // Simple component search
  const componentName = extractComponentNameFromQuery(request.query)
  let components: ComponentMeta[] = []

  if (componentName) {
    components = searchComponentMeta(componentName)
  } else {
    // Search by raw query
    components = searchComponentMeta(request.query).slice(
      0,
      request.maxResults || metadataQueryConfig.maxResults
    )
  }

  // Generate basic response
  let answer: string
  if (components.length === 0) {
    answer =
      language === 'ru'
        ? 'Компоненты не найдены. Попробуйте уточнить запрос.'
        : 'No components found. Try refining your query.'
  } else if (components.length === 1) {
    const comp = components[0]
    answer = `**${comp.name}** (v${comp.version}) — ${comp.summary}`
  } else {
    const names = components.map((c) => c.name).join(', ')
    answer = language === 'ru' ? `Найдено: ${names}` : `Found: ${names}`
  }

  return createSuccessResponse(
    answer,
    components,
    intent,
    language,
    components.length > 0 ? 0.5 : 0.2,
    {
      processingTime: Date.now() - elapsedTime,
      suggestions: components.length === 0 ? getSuggestions(language) : undefined,
    }
  )
}

/**
 * Adds a training example to the metadata query dataset
 *
 * Training examples help improve future query processing by providing
 * examples of correct intent classification and expected results.
 *
 * @param example - The training example to add
 */
export function addMetadataQueryTrainingExample(example: MetadataQueryTrainingExample): void {
  if (!metadataQueryDataset) {
    metadataQueryDataset = {
      id: `metadata_dataset_${Date.now().toString(36)}`,
      name: 'Metadata Query Training Data',
      examples: [],
      version: '1.0.0',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    }
  }

  metadataQueryDataset.examples.push(example)
  metadataQueryDataset.modified = new Date().toISOString()
}

/**
 * Gets the current metadata query training dataset
 */
export function getMetadataQueryDataset(): MetadataQueryDataset | null {
  return metadataQueryDataset
}

/**
 * Loads a metadata query training dataset
 *
 * @param dataset - The dataset to load
 */
export function loadMetadataQueryDataset(dataset: MetadataQueryDataset): void {
  metadataQueryDataset = dataset
}

/**
 * Clears the metadata query training dataset
 */
export function clearMetadataQueryDataset(): void {
  metadataQueryDataset = null
}

/**
 * Exports the metadata query dataset as JSON
 */
export function exportMetadataQueryDataset(): string | null {
  if (!metadataQueryDataset) return null
  return JSON.stringify(metadataQueryDataset, null, 2)
}

/**
 * Records feedback for a metadata query to improve future processing
 *
 * @param query - The original query
 * @param intent - The detected intent
 * @param expectedComponents - Component names that were expected
 * @param rating - Quality rating (0-1)
 */
export function recordMetadataQueryFeedback(
  query: string,
  intent: QueryIntent,
  expectedComponents: string[],
  rating: number
): void {
  addMetadataQueryTrainingExample({
    query,
    intent,
    expectedComponents,
    rating: clamp(rating, 0, 1),
    created: new Date().toISOString(),
  })
}

/**
 * Checks if TinyLLM metadata query mode is ready
 */
export function isMetadataQueryReady(): boolean {
  return true // Rule-based implementation is always ready
}

/**
 * Initializes TinyLLM metadata query mode
 *
 * This loads any pre-defined training examples and prepares the system
 * for processing metadata queries.
 */
export async function initializeMetadataQueryMode(): Promise<void> {
  // Pre-load default training examples for common queries
  const defaultExamples: MetadataQueryTrainingExample[] = [
    {
      query: 'What does Gallery do?',
      intent: 'describe',
      expectedComponents: ['Gallery'],
      rating: 1.0,
      created: new Date().toISOString(),
    },
    {
      query: 'Что делает компонент Gallery?',
      intent: 'describe',
      expectedComponents: ['Gallery'],
      rating: 1.0,
      created: new Date().toISOString(),
    },
    {
      query: 'Find components for export',
      intent: 'find',
      expectedComponents: ['ExportPanel'],
      rating: 1.0,
      created: new Date().toISOString(),
    },
    {
      query: 'Найди компоненты для экспорта',
      intent: 'find',
      expectedComponents: ['ExportPanel'],
      rating: 1.0,
      created: new Date().toISOString(),
    },
    {
      query: 'Show dependencies of CubePreview',
      intent: 'dependencies',
      expectedComponents: ['CubePreview'],
      rating: 1.0,
      created: new Date().toISOString(),
    },
    {
      query: 'How to use PromptGenerator?',
      intent: 'usage',
      expectedComponents: ['PromptGenerator'],
      rating: 1.0,
      created: new Date().toISOString(),
    },
    {
      query: 'What is the status of phase 1 components?',
      intent: 'status',
      expectedComponents: [],
      rating: 1.0,
      created: new Date().toISOString(),
    },
  ]

  // Only load if dataset is empty
  if (!metadataQueryDataset || metadataQueryDataset.examples.length === 0) {
    for (const example of defaultExamples) {
      addMetadataQueryTrainingExample(example)
    }
  }

  return Promise.resolve()
}

/**
 * Gets all available metadata query intents
 */
export function getAvailableMetadataQueryIntents(): QueryIntent[] {
  return ['describe', 'find', 'dependencies', 'history', 'usage', 'related', 'features', 'status']
}

/**
 * Gets example queries for a specific intent
 *
 * @param intent - The intent to get examples for
 * @param language - The language for examples
 */
export function getMetadataQueryExamples(intent: QueryIntent, language: QueryLanguage): string[] {
  const examples: Record<QueryLanguage, Record<QueryIntent, string[]>> = {
    ru: {
      describe: [
        'Что делает компонент Gallery?',
        'Опиши CubePreview',
        'Для чего нужен ExportPanel?',
      ],
      find: [
        'Найди компоненты для 3D',
        'Покажи компоненты фазы 1',
        'Где находится функция экспорта?',
      ],
      dependencies: [
        'Какие зависимости у UnifiedEditor?',
        'Что использует CubePreview?',
        'От чего зависит Gallery?',
      ],
      history: [
        'История изменений PromptGenerator',
        'Когда был обновлён ExportPanel?',
        'Какая версия Gallery?',
      ],
      usage: [
        'Как использовать CubePreview?',
        'Пример использования Gallery',
        'Как применить ExportPanel?',
      ],
      related: [
        'Какие компоненты связаны с Gallery?',
        'Похожие на CubePreview',
        'Альтернативы ExportPanel',
      ],
      features: [
        'Какие функции у Gallery?',
        'Что умеет CubePreview?',
        'Возможности PromptGenerator',
      ],
      status: [
        'Статус компонента Gallery',
        'Какая фаза у CubePreview?',
        'Есть ли проблемы в ExportPanel?',
      ],
      unknown: ['Помощь', 'Что ты умеешь?', 'Справка'],
    },
    en: {
      describe: ['What does Gallery do?', 'Describe CubePreview', 'What is ExportPanel for?'],
      find: ['Find 3D components', 'Show phase 1 components', 'Where is the export function?'],
      dependencies: [
        'What are UnifiedEditor dependencies?',
        'What does CubePreview use?',
        'What does Gallery depend on?',
      ],
      history: [
        'PromptGenerator change history',
        'When was ExportPanel updated?',
        'What version is Gallery?',
      ],
      usage: ['How to use CubePreview?', 'Gallery usage example', 'How to apply ExportPanel?'],
      related: [
        'What components are related to Gallery?',
        'Similar to CubePreview',
        'ExportPanel alternatives',
      ],
      features: [
        'What features does Gallery have?',
        'What can CubePreview do?',
        'PromptGenerator capabilities',
      ],
      status: [
        'Gallery component status',
        'What phase is CubePreview?',
        'Are there issues in ExportPanel?',
      ],
      unknown: ['Help', 'What can you do?', 'Guide'],
    },
  }

  return examples[language][intent] || []
}
