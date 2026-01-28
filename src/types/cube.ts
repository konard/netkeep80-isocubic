/**
 * TypeScript types for SpectralCube configuration
 * These types are derived from cube-schema.json and should be kept in sync
 */

/** RGB color as normalized values [0, 1] */
export type Color3 = [number, number, number]

/** RGB color shift values [-1, 1] */
export type ColorShift3 = [number, number, number]

/** Gradient axis direction */
export type GradientAxis = 'x' | 'y' | 'z' | 'radial'

/** Procedural noise type */
export type NoiseType = 'perlin' | 'worley' | 'crackle'

/** Physical material type */
export type MaterialType = 'stone' | 'wood' | 'metal' | 'glass' | 'organic' | 'crystal' | 'liquid'

/** Material break pattern when destroyed */
export type BreakPattern = 'crumble' | 'shatter' | 'splinter' | 'melt' | 'dissolve'

/**
 * Base material properties
 */
export interface CubeBase {
  /** RGB color values normalized to [0, 1] */
  color: Color3
  /** Surface roughness (0 = smooth/glossy, 1 = rough/matte) */
  roughness?: number
  /** Opacity level (0 = fully transparent, 1 = fully opaque) */
  transparency?: number
}

/**
 * Gradient effect configuration
 */
export interface CubeGradient {
  /** Axis along which gradient is applied */
  axis: GradientAxis
  /** Strength of the gradient effect (0-1) */
  factor: number
  /** RGB color shift at the gradient end */
  color_shift: ColorShift3
}

/**
 * Procedural noise settings for surface texture
 */
export interface CubeNoise {
  /** Type of procedural noise */
  type?: NoiseType
  /** Scale/frequency of the noise pattern */
  scale?: number
  /** Number of noise octaves for detail layers */
  octaves?: number
  /** Amplitude decay between octaves */
  persistence?: number
  /** Region mask for noise application (e.g., "bottom_40%", "top_60%") */
  mask?: string
}

/**
 * Physical properties of the material
 */
export interface CubePhysics {
  /** Material type for physics simulation */
  material?: MaterialType
  /** Material density in g/cm3 */
  density?: number
  /** How the material breaks when destroyed */
  break_pattern?: BreakPattern
}

/**
 * Metadata and tags for organization
 */
export interface CubeMeta {
  /** Human-readable name for the cube */
  name?: string
  /** Searchable tags for categorization */
  tags?: string[]
  /** Creator of this configuration */
  author?: string
  /** Creation timestamp in ISO 8601 format */
  created?: string
  /** Last modification timestamp in ISO 8601 format */
  modified?: string
}

/**
 * Complete SpectralCube configuration
 * Defines all properties for a parametric cube in the isocubic editor
 */
export interface SpectralCube {
  /** Unique identifier for the cube configuration */
  id: string
  /** Text prompt used to generate this cube configuration */
  prompt?: string
  /** Base material properties */
  base: CubeBase
  /** Array of gradient effects applied to the cube */
  gradients?: CubeGradient[]
  /** Procedural noise settings for surface texture */
  noise?: CubeNoise
  /** Physical properties of the material */
  physics?: CubePhysics
  /** Metadata and tags for organization */
  meta?: CubeMeta
}

/**
 * Default values for optional cube properties
 */
export const CUBE_DEFAULTS = {
  base: {
    roughness: 0.5,
    transparency: 1.0,
  },
  noise: {
    type: 'perlin' as NoiseType,
    scale: 8.0,
    octaves: 4,
    persistence: 0.5,
  },
  physics: {
    material: 'stone' as MaterialType,
    density: 2.5,
    break_pattern: 'crumble' as BreakPattern,
  },
} as const

/**
 * Creates a new SpectralCube with default values
 */
export function createDefaultCube(id: string): SpectralCube {
  return {
    id,
    base: {
      color: [0.5, 0.5, 0.5],
      roughness: CUBE_DEFAULTS.base.roughness,
      transparency: CUBE_DEFAULTS.base.transparency,
    },
    gradients: [],
    noise: {
      type: CUBE_DEFAULTS.noise.type,
      scale: CUBE_DEFAULTS.noise.scale,
      octaves: CUBE_DEFAULTS.noise.octaves,
      persistence: CUBE_DEFAULTS.noise.persistence,
    },
    physics: {
      material: CUBE_DEFAULTS.physics.material,
      density: CUBE_DEFAULTS.physics.density,
      break_pattern: CUBE_DEFAULTS.physics.break_pattern,
    },
    meta: {
      created: new Date().toISOString(),
    },
  }
}
