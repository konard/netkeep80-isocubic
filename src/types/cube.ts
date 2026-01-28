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

/** Boundary mode for cube edge stitching */
export type BoundaryMode = 'none' | 'smooth' | 'hard'

/** FFT size options (8x8x8, 16x16x16, or 32x32x32) */
export type FFTSize = 8 | 16 | 32

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
 * Extended physical properties for magical/energy cubes
 * Includes additional properties for energy physics simulation
 */
export interface FFTCubePhysics extends CubePhysics {
  /** Rate of coherence loss over time (0 = no loss, higher = faster decay) */
  coherence_loss?: number
  /** Energy threshold at which the cube fractures/breaks */
  fracture_threshold?: number
}

/**
 * Single FFT coefficient representing one frequency component
 */
export interface FFTCoefficient {
  /** Amplitude of the wave component (magnitude) */
  amplitude: number
  /** Phase offset in radians [0, 2π] */
  phase: number
  /** Frequency index along X axis (integer) */
  freqX: number
  /** Frequency index along Y axis (integer) */
  freqY: number
  /** Frequency index along Z axis (integer) */
  freqZ: number
}

/**
 * FFT Channel data for one color channel (R, G, B, or A)
 * Contains DC component and array of frequency coefficients
 */
export interface FFTChannel {
  /** DC (zero frequency) amplitude - the average value of the channel */
  dcAmplitude: number
  /** DC phase offset in radians */
  dcPhase: number
  /** Array of FFT coefficients (max 8 for shader compatibility) */
  coefficients: FFTCoefficient[]
}

/**
 * FFT Channels structure containing all color channels
 */
export interface FFTChannels {
  /** Red channel FFT data */
  R?: FFTChannel
  /** Green channel FFT data */
  G?: FFTChannel
  /** Blue channel FFT data */
  B?: FFTChannel
  /** Alpha channel FFT data */
  A?: FFTChannel
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
 * Boundary stitching settings for seamless cube connections
 * Used when rendering multiple cubes in a grid to ensure smooth transitions
 */
export interface CubeBoundary {
  /** Mode for boundary interpolation: none (no blending), smooth (interpolated), hard (sharp edges) */
  mode?: BoundaryMode
  /** Coefficient of influence from neighboring cubes (0-1), affects gradient and color blending */
  neighbor_influence?: number
}

/**
 * FFT-based magical cube configuration
 * Extends SpectralCube with FFT coefficients for energy visualization
 */
export interface FFTCubeConfig {
  /** Unique identifier for the cube configuration */
  id: string
  /** Text prompt used to generate this cube configuration */
  prompt?: string
  /** Whether this is a magical/energy cube */
  is_magical: boolean
  /** Size of FFT grid (8, 16, or 32) */
  fft_size: FFTSize
  /** Maximum energy capacity for the cube (used for normalization) */
  energy_capacity: number
  /** Current energy level stored in the cube */
  current_energy?: number
  /** FFT channels for RGBA color components */
  channels: FFTChannels
  /** Extended physics properties for energy interactions */
  physics?: FFTCubePhysics
  /** Metadata and tags for organization */
  meta?: CubeMeta
  /** Boundary stitching settings */
  boundary?: CubeBoundary
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
  /** Boundary stitching settings for seamless cube grid connections */
  boundary?: CubeBoundary
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
  boundary: {
    mode: 'smooth' as BoundaryMode,
    neighbor_influence: 0.5,
  },
} as const

/**
 * Default values for FFT cube properties
 */
export const FFT_CUBE_DEFAULTS = {
  fft_size: 8 as FFTSize,
  energy_capacity: 100.0,
  physics: {
    material: 'crystal' as MaterialType,
    density: 3.0,
    break_pattern: 'shatter' as BreakPattern,
    coherence_loss: 0.01,
    fracture_threshold: 80.0,
  },
  boundary: {
    mode: 'smooth' as BoundaryMode,
    neighbor_influence: 0.5,
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
    boundary: {
      mode: CUBE_DEFAULTS.boundary.mode,
      neighbor_influence: CUBE_DEFAULTS.boundary.neighbor_influence,
    },
    meta: {
      created: new Date().toISOString(),
    },
  }
}

/**
 * Creates a default FFT channel with basic DC component
 */
export function createDefaultFFTChannel(dcAmplitude: number = 0.5): FFTChannel {
  return {
    dcAmplitude,
    dcPhase: 0,
    coefficients: [],
  }
}

/**
 * Creates a new FFTCubeConfig with default values
 * @param id - Unique identifier for the cube
 * @param baseColor - Base RGB color as [R, G, B] values from 0 to 1
 */
export function createDefaultFFTCube(
  id: string,
  baseColor: Color3 = [0.5, 0.3, 0.8]
): FFTCubeConfig {
  return {
    id,
    is_magical: true,
    fft_size: FFT_CUBE_DEFAULTS.fft_size,
    energy_capacity: FFT_CUBE_DEFAULTS.energy_capacity,
    current_energy: 0,
    channels: {
      R: createDefaultFFTChannel(baseColor[0]),
      G: createDefaultFFTChannel(baseColor[1]),
      B: createDefaultFFTChannel(baseColor[2]),
      A: createDefaultFFTChannel(1.0),
    },
    physics: {
      material: FFT_CUBE_DEFAULTS.physics.material,
      density: FFT_CUBE_DEFAULTS.physics.density,
      break_pattern: FFT_CUBE_DEFAULTS.physics.break_pattern,
      coherence_loss: FFT_CUBE_DEFAULTS.physics.coherence_loss,
      fracture_threshold: FFT_CUBE_DEFAULTS.physics.fracture_threshold,
    },
    boundary: {
      mode: FFT_CUBE_DEFAULTS.boundary.mode,
      neighbor_influence: FFT_CUBE_DEFAULTS.boundary.neighbor_influence,
    },
    meta: {
      created: new Date().toISOString(),
    },
  }
}
