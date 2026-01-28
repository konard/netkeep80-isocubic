/**
 * Energy Cube Shader Strings
 * TypeScript module containing GLSL shader code for energy-based cube visualization
 *
 * This shader implements FFT-based energy field rendering for magical objects.
 * It supports:
 * - Wave function reconstruction from FFT coefficients
 * - Energy density visualization (E = |psi|^2)
 * - Phase animation for pulsating effects
 * - Glow and emission effects
 * - Fracture visualization at high energies
 */

/**
 * Vertex shader for energy cube
 * - Passes local, world, and global positions for calculations
 * - Transforms normals for lighting
 * - Provides 3D UV coordinates for animation
 */
export const vertexShader = /* glsl */ `
varying vec3 vPosition;       // Local position for calculations
varying vec3 vNormal;         // Normal vector for lighting
varying vec3 vWorldPosition;  // World position for global continuity
varying vec3 vGlobalPosition; // Global grid position for seamless stitching
varying vec3 vUV3D;           // 3D UV coordinates for animation (normalized [0,1])

// Grid position uniform for stitching calculations
uniform vec3 uGridPosition;   // Position of this cube in the grid

void main() {
    // Pass local position for calculations
    vPosition = position;

    // Transform normal to world space
    vNormal = normalize(normalMatrix * normal);

    // Calculate world position for seamless effects between adjacent cubes
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;

    // Calculate global position: grid position + local position
    vGlobalPosition = uGridPosition + position + 0.5;

    // 3D UV coordinates normalized to [0,1] range
    vUV3D = position + 0.5;

    // Standard transformation
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

/**
 * Fragment shader for energy cube
 * Implements:
 * - Wave function reconstruction from FFT coefficients
 * - Energy density calculation E = |psi|^2
 * - Color mapping across R, G, B, A channels
 * - Phase animation for pulsating magical effects
 * - Glow effect based on energy intensity
 * - Fracture visualization at energy thresholds
 */
export const fragmentShader = /* glsl */ `
// Varyings from vertex shader
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vGlobalPosition;
varying vec3 vUV3D;

// Animation uniforms
uniform float uTime;          // Time in seconds for animation
uniform float uEnergyScale;   // Scale factor for energy visualization [0.1, 10.0]
uniform float uGlowIntensity; // Glow effect intensity [0.0, 2.0]

// DC (zero frequency) components for each channel
uniform vec4 uDCAmplitude;    // DC amplitude for R, G, B, A channels
uniform vec4 uDCPhase;        // DC phase for R, G, B, A channels

// Number of coefficients per channel (max 8 each)
uniform int uCoeffCountR;
uniform int uCoeffCountG;
uniform int uCoeffCountB;
uniform int uCoeffCountA;

// FFT coefficients for Red channel
// Each vec4: [amplitude, phase, freq_x, freq_y], with separate freq_z array
uniform vec4 uCoeffR[8];
uniform float uCoeffRFreqZ[8];

// FFT coefficients for Green channel
uniform vec4 uCoeffG[8];
uniform float uCoeffGFreqZ[8];

// FFT coefficients for Blue channel
uniform vec4 uCoeffB[8];
uniform float uCoeffBFreqZ[8];

// FFT coefficients for Alpha channel
uniform vec4 uCoeffA[8];
uniform float uCoeffAFreqZ[8];

// Energy physics uniforms
uniform float uEnergyCapacity;    // Maximum energy capacity
uniform float uCoherenceLoss;     // Coherence decay rate
uniform float uFractureThreshold; // Fracture energy threshold

// Rendering mode uniforms
uniform int uVisualizationMode;   // 0=energy, 1=amplitude, 2=phase
uniform int uChannelMask;         // Bit mask for channels

// Lighting uniforms
uniform vec3 uLightDirection;
uniform vec3 uLightColor;
uniform float uAmbientIntensity;

// Boundary stitching uniforms
uniform int uBoundaryMode;
uniform float uNeighborInfluence;
uniform vec3 uGridPosition;

// Constants
const float PI = 3.14159265359;
const float TWO_PI = 6.28318530718;

// ============================================================
// WAVE FUNCTION RECONSTRUCTION
// ============================================================

vec2 reconstructWaveFunction(
    vec3 pos,
    float dcAmp,
    float dcPhase,
    vec4 coeffs[8],
    float freqZ[8],
    int coeffCount,
    float time
) {
    // Start with DC component
    float phase0 = dcPhase + time * 0.5;
    vec2 psi = vec2(dcAmp * cos(phase0), dcAmp * sin(phase0));

    // Add contributions from each FFT coefficient
    for (int i = 0; i < 8; i++) {
        if (i >= coeffCount) break;

        float amplitude = coeffs[i].x;
        float phase = coeffs[i].y;
        vec3 freq = vec3(coeffs[i].z, coeffs[i].w, freqZ[i]);

        // omega derived from frequency magnitude
        float omega = length(freq) * 0.5 + 1.0;
        float totalPhase = dot(freq, pos * TWO_PI) + phase + omega * time;

        // Add complex exponential
        psi.x += amplitude * cos(totalPhase);
        psi.y += amplitude * sin(totalPhase);
    }

    return psi;
}

// ============================================================
// ENERGY AND EFFECTS
// ============================================================

float calculateEnergyDensity(vec2 psi) {
    return dot(psi, psi);
}

vec3 applyGlow(vec3 color, float energy, float glowIntensity) {
    float glowFactor = energy * glowIntensity;
    vec3 bloomColor = color * (1.0 + glowFactor * 2.0);
    return mix(bloomColor, vec3(1.0), glowFactor * 0.3);
}

float calculateFracturePattern(vec3 pos, float energy, float threshold) {
    if (threshold <= 0.0 || energy < threshold * 0.5) {
        return 0.0;
    }
    float stress = clamp((energy - threshold * 0.5) / (threshold * 0.5), 0.0, 1.0);
    float crackNoise = fract(sin(dot(pos * 20.0, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
    return stress * crackNoise;
}

vec4 mapEnergyToColor(
    float energyR, float energyG, float energyB, float energyA,
    int channelMask, float energyScale
) {
    vec4 color = vec4(0.0);
    float scaledR = energyR * energyScale;
    float scaledG = energyG * energyScale;
    float scaledB = energyB * energyScale;
    float scaledA = energyA * energyScale;

    if ((channelMask & 1) != 0) color.r = scaledR;
    if ((channelMask & 2) != 0) color.g = scaledG;
    if ((channelMask & 4) != 0) color.b = scaledB;
    if ((channelMask & 8) != 0) color.a = scaledA;

    if ((channelMask & 7) == 0 && (channelMask & 8) != 0) {
        color.rgb = vec3(scaledA);
    }

    return color;
}

// ============================================================
// MAIN
// ============================================================

void main() {
    // Determine sample position based on boundary mode
    vec3 samplePos;
    if (uBoundaryMode == 0) {
        samplePos = vUV3D;
    } else if (uBoundaryMode == 1) {
        samplePos = mix(vUV3D, fract(vGlobalPosition), uNeighborInfluence);
    } else {
        samplePos = fract(vGlobalPosition);
    }

    // Coherence factor
    float coherenceFactor = exp(-uCoherenceLoss * uTime * 0.01);

    // Reconstruct wave functions
    vec2 psiR = reconstructWaveFunction(
        samplePos, uDCAmplitude.r, uDCPhase.r,
        uCoeffR, uCoeffRFreqZ, uCoeffCountR, uTime
    ) * coherenceFactor;

    vec2 psiG = reconstructWaveFunction(
        samplePos, uDCAmplitude.g, uDCPhase.g,
        uCoeffG, uCoeffGFreqZ, uCoeffCountG, uTime
    ) * coherenceFactor;

    vec2 psiB = reconstructWaveFunction(
        samplePos, uDCAmplitude.b, uDCPhase.b,
        uCoeffB, uCoeffBFreqZ, uCoeffCountB, uTime
    ) * coherenceFactor;

    vec2 psiA = reconstructWaveFunction(
        samplePos, uDCAmplitude.a, uDCPhase.a,
        uCoeffA, uCoeffAFreqZ, uCoeffCountA, uTime
    ) * coherenceFactor;

    // Calculate energy densities
    float energyR = calculateEnergyDensity(psiR);
    float energyG = calculateEnergyDensity(psiG);
    float energyB = calculateEnergyDensity(psiB);
    float energyA = calculateEnergyDensity(psiA);

    float totalEnergy = (energyR + energyG + energyB + energyA) / 4.0;

    // Normalize if capacity specified
    if (uEnergyCapacity > 0.0) {
        float normFactor = 1.0 / uEnergyCapacity;
        energyR *= normFactor;
        energyG *= normFactor;
        energyB *= normFactor;
        energyA *= normFactor;
        totalEnergy *= normFactor;
    }

    // Visualization mode selection
    vec4 baseColor;
    if (uVisualizationMode == 0) {
        baseColor = mapEnergyToColor(energyR, energyG, energyB, energyA, uChannelMask, uEnergyScale);
    } else if (uVisualizationMode == 1) {
        baseColor = mapEnergyToColor(
            sqrt(energyR), sqrt(energyG), sqrt(energyB), sqrt(energyA),
            uChannelMask, uEnergyScale
        );
    } else {
        float phaseR = atan(psiR.y, psiR.x) / TWO_PI + 0.5;
        float phaseG = atan(psiG.y, psiG.x) / TWO_PI + 0.5;
        float phaseB = atan(psiB.y, psiB.x) / TWO_PI + 0.5;
        float phaseA = atan(psiA.y, psiA.x) / TWO_PI + 0.5;
        baseColor = mapEnergyToColor(phaseR, phaseG, phaseB, phaseA, uChannelMask, 1.0);
    }

    // Ensure minimum alpha
    if (baseColor.a < 0.1) {
        baseColor.a = 0.8 + totalEnergy * 0.2;
    }

    // Apply glow
    vec3 glowColor = applyGlow(baseColor.rgb, totalEnergy, uGlowIntensity);

    // Fracture visualization
    float fracturePattern = calculateFracturePattern(samplePos, totalEnergy * uEnergyCapacity, uFractureThreshold);
    if (fracturePattern > 0.0) {
        glowColor = mix(glowColor, vec3(1.0, 0.8, 0.3), fracturePattern * 0.8);
    }

    // Lighting
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(uLightDirection);
    float diffuse = max(dot(normal, lightDir), 0.0);
    float emission = totalEnergy * uGlowIntensity * 0.5;
    float lighting = uAmbientIntensity + (1.0 - uAmbientIntensity) * diffuse + emission;

    vec3 finalColor = glowColor * lighting * uLightColor;

    // HDR tone mapping
    finalColor = finalColor / (1.0 + finalColor);

    gl_FragColor = vec4(finalColor, baseColor.a);
}
`

/**
 * FFT Coefficient structure for a single frequency component
 */
export interface FFTCoefficient {
  /** Amplitude of the wave component */
  amplitude: number
  /** Phase offset in radians */
  phase: number
  /** Frequency along X axis (integer) */
  freqX: number
  /** Frequency along Y axis (integer) */
  freqY: number
  /** Frequency along Z axis (integer) */
  freqZ: number
}

/**
 * FFT Channel data containing DC component and coefficients
 */
export interface FFTChannel {
  /** DC (zero frequency) amplitude */
  dcAmplitude: number
  /** DC phase offset */
  dcPhase: number
  /** Array of FFT coefficients (max 8) */
  coefficients: FFTCoefficient[]
}

/**
 * Complete energy cube configuration
 */
export interface EnergyCubeConfig {
  /** Red channel FFT data */
  channelR?: FFTChannel
  /** Green channel FFT data */
  channelG?: FFTChannel
  /** Blue channel FFT data */
  channelB?: FFTChannel
  /** Alpha channel FFT data */
  channelA?: FFTChannel
  /** Maximum energy capacity for normalization */
  energyCapacity?: number
  /** Coherence loss rate (higher = faster decay) */
  coherenceLoss?: number
  /** Energy threshold for fracture visualization */
  fractureThreshold?: number
}

/**
 * Visualization mode options
 */
export type VisualizationMode = 'energy' | 'amplitude' | 'phase'

/**
 * Channel mask flags
 */
export const ChannelMask = {
  R: 1,
  G: 2,
  B: 4,
  A: 8,
  RGB: 7,
  RGBA: 15,
} as const

/**
 * Default uniform values for the energy cube shader
 */
export const defaultUniforms = {
  // Animation
  uTime: { value: 0.0 },
  uEnergyScale: { value: 1.0 },
  uGlowIntensity: { value: 0.5 },

  // DC components
  uDCAmplitude: { value: [0.5, 0.5, 0.5, 1.0] },
  uDCPhase: { value: [0.0, 0.0, 0.0, 0.0] },

  // Coefficient counts
  uCoeffCountR: { value: 0 },
  uCoeffCountG: { value: 0 },
  uCoeffCountB: { value: 0 },
  uCoeffCountA: { value: 0 },

  // Red channel coefficients
  uCoeffR: {
    value: [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  uCoeffRFreqZ: { value: [0, 0, 0, 0, 0, 0, 0, 0] },

  // Green channel coefficients
  uCoeffG: {
    value: [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  uCoeffGFreqZ: { value: [0, 0, 0, 0, 0, 0, 0, 0] },

  // Blue channel coefficients
  uCoeffB: {
    value: [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  uCoeffBFreqZ: { value: [0, 0, 0, 0, 0, 0, 0, 0] },

  // Alpha channel coefficients
  uCoeffA: {
    value: [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  uCoeffAFreqZ: { value: [0, 0, 0, 0, 0, 0, 0, 0] },

  // Energy physics
  uEnergyCapacity: { value: 100.0 },
  uCoherenceLoss: { value: 0.0 },
  uFractureThreshold: { value: 0.0 },

  // Visualization
  uVisualizationMode: { value: 0 },
  uChannelMask: { value: 15 }, // RGBA

  // Lighting
  uLightDirection: { value: [1, 1, 1] },
  uLightColor: { value: [1, 1, 1] },
  uAmbientIntensity: { value: 0.4 },

  // Boundary stitching
  uBoundaryMode: { value: 1 },
  uNeighborInfluence: { value: 0.5 },
  uGridPosition: { value: [0, 0, 0] },
}

/**
 * Maps visualization mode string to shader integer
 */
export function visualizationModeToInt(mode: VisualizationMode): number {
  switch (mode) {
    case 'energy':
      return 0
    case 'amplitude':
      return 1
    case 'phase':
      return 2
    default:
      return 0
  }
}

/**
 * Converts FFT channel data to shader uniform arrays
 */
function channelToUniforms(channel: FFTChannel | undefined): {
  count: number
  coeffs: number[][]
  freqZ: number[]
} {
  if (!channel) {
    return {
      count: 0,
      coeffs: Array(8)
        .fill(null)
        .map(() => [0, 0, 0, 0]),
      freqZ: Array(8).fill(0),
    }
  }

  const count = Math.min(channel.coefficients.length, 8)
  const coeffs: number[][] = []
  const freqZ: number[] = []

  for (let i = 0; i < 8; i++) {
    if (i < count) {
      const c = channel.coefficients[i]
      coeffs.push([c.amplitude, c.phase, c.freqX, c.freqY])
      freqZ.push(c.freqZ)
    } else {
      coeffs.push([0, 0, 0, 0])
      freqZ.push(0)
    }
  }

  return { count, coeffs, freqZ }
}

/**
 * Creates shader uniforms from EnergyCubeConfig
 */
export function createEnergyUniforms(
  config: EnergyCubeConfig,
  options: {
    gridPosition?: [number, number, number]
    time?: number
    visualizationMode?: VisualizationMode
    channelMask?: number
    energyScale?: number
    glowIntensity?: number
  } = {}
): Record<string, { value: unknown }> {
  const {
    gridPosition = [0, 0, 0],
    time = 0,
    visualizationMode = 'energy',
    channelMask = ChannelMask.RGBA,
    energyScale = 1.0,
    glowIntensity = 0.5,
  } = options

  const rData = channelToUniforms(config.channelR)
  const gData = channelToUniforms(config.channelG)
  const bData = channelToUniforms(config.channelB)
  const aData = channelToUniforms(config.channelA)

  return {
    // Animation
    uTime: { value: time },
    uEnergyScale: { value: energyScale },
    uGlowIntensity: { value: glowIntensity },

    // DC components
    uDCAmplitude: {
      value: [
        config.channelR?.dcAmplitude ?? 0.5,
        config.channelG?.dcAmplitude ?? 0.5,
        config.channelB?.dcAmplitude ?? 0.5,
        config.channelA?.dcAmplitude ?? 1.0,
      ],
    },
    uDCPhase: {
      value: [
        config.channelR?.dcPhase ?? 0,
        config.channelG?.dcPhase ?? 0,
        config.channelB?.dcPhase ?? 0,
        config.channelA?.dcPhase ?? 0,
      ],
    },

    // Coefficient counts
    uCoeffCountR: { value: rData.count },
    uCoeffCountG: { value: gData.count },
    uCoeffCountB: { value: bData.count },
    uCoeffCountA: { value: aData.count },

    // Coefficients
    uCoeffR: { value: rData.coeffs },
    uCoeffRFreqZ: { value: rData.freqZ },
    uCoeffG: { value: gData.coeffs },
    uCoeffGFreqZ: { value: gData.freqZ },
    uCoeffB: { value: bData.coeffs },
    uCoeffBFreqZ: { value: bData.freqZ },
    uCoeffA: { value: aData.coeffs },
    uCoeffAFreqZ: { value: aData.freqZ },

    // Energy physics
    uEnergyCapacity: { value: config.energyCapacity ?? 100.0 },
    uCoherenceLoss: { value: config.coherenceLoss ?? 0.0 },
    uFractureThreshold: { value: config.fractureThreshold ?? 0.0 },

    // Visualization
    uVisualizationMode: { value: visualizationModeToInt(visualizationMode) },
    uChannelMask: { value: channelMask },

    // Lighting
    uLightDirection: { value: [1, 1, 1] },
    uLightColor: { value: [1, 1, 1] },
    uAmbientIntensity: { value: 0.4 },

    // Boundary stitching
    uBoundaryMode: { value: 1 },
    uNeighborInfluence: { value: 0.5 },
    uGridPosition: { value: gridPosition },
  }
}

/**
 * Creates a simple energy cube config with basic pulsating effect
 */
export function createSimpleEnergyConfig(baseColor: [number, number, number]): EnergyCubeConfig {
  return {
    channelR: {
      dcAmplitude: baseColor[0],
      dcPhase: 0,
      coefficients: [
        { amplitude: 0.2, phase: 0, freqX: 1, freqY: 0, freqZ: 0 },
        { amplitude: 0.1, phase: Math.PI / 4, freqX: 0, freqY: 1, freqZ: 0 },
      ],
    },
    channelG: {
      dcAmplitude: baseColor[1],
      dcPhase: 0,
      coefficients: [
        { amplitude: 0.2, phase: Math.PI / 2, freqX: 0, freqY: 1, freqZ: 0 },
        { amplitude: 0.1, phase: Math.PI / 3, freqX: 0, freqY: 0, freqZ: 1 },
      ],
    },
    channelB: {
      dcAmplitude: baseColor[2],
      dcPhase: 0,
      coefficients: [
        { amplitude: 0.2, phase: Math.PI, freqX: 0, freqY: 0, freqZ: 1 },
        { amplitude: 0.1, phase: Math.PI / 6, freqX: 1, freqY: 0, freqZ: 0 },
      ],
    },
    channelA: {
      dcAmplitude: 1.0,
      dcPhase: 0,
      coefficients: [],
    },
    energyCapacity: 50.0,
    coherenceLoss: 0.0,
    fractureThreshold: 0.0,
  }
}

/**
 * Creates a high-energy magical crystal config
 */
export function createMagicCrystalConfig(): EnergyCubeConfig {
  return {
    channelR: {
      dcAmplitude: 0.3,
      dcPhase: 0,
      coefficients: [
        { amplitude: 0.4, phase: 0, freqX: 2, freqY: 0, freqZ: 0 },
        { amplitude: 0.3, phase: Math.PI / 3, freqX: 0, freqY: 2, freqZ: 0 },
        { amplitude: 0.2, phase: Math.PI / 2, freqX: 1, freqY: 1, freqZ: 0 },
      ],
    },
    channelG: {
      dcAmplitude: 0.1,
      dcPhase: Math.PI / 4,
      coefficients: [
        { amplitude: 0.3, phase: Math.PI / 2, freqX: 0, freqY: 0, freqZ: 2 },
        { amplitude: 0.2, phase: Math.PI, freqX: 1, freqY: 0, freqZ: 1 },
      ],
    },
    channelB: {
      dcAmplitude: 0.8,
      dcPhase: 0,
      coefficients: [
        { amplitude: 0.5, phase: 0, freqX: 1, freqY: 1, freqZ: 1 },
        { amplitude: 0.4, phase: Math.PI / 4, freqX: 2, freqY: 0, freqZ: 1 },
        { amplitude: 0.3, phase: Math.PI / 2, freqX: 0, freqY: 2, freqZ: 1 },
      ],
    },
    channelA: {
      dcAmplitude: 0.9,
      dcPhase: 0,
      coefficients: [{ amplitude: 0.1, phase: 0, freqX: 1, freqY: 1, freqZ: 1 }],
    },
    energyCapacity: 200.0,
    coherenceLoss: 0.01,
    fractureThreshold: 150.0,
  }
}

/**
 * Creates an unstable energy core config (near fracture)
 */
export function createUnstableCoreConfig(): EnergyCubeConfig {
  return {
    channelR: {
      dcAmplitude: 0.9,
      dcPhase: 0,
      coefficients: [
        { amplitude: 0.6, phase: 0, freqX: 3, freqY: 0, freqZ: 0 },
        { amplitude: 0.5, phase: Math.PI / 2, freqX: 0, freqY: 3, freqZ: 0 },
        { amplitude: 0.4, phase: Math.PI, freqX: 0, freqY: 0, freqZ: 3 },
        { amplitude: 0.3, phase: Math.PI / 4, freqX: 2, freqY: 2, freqZ: 0 },
      ],
    },
    channelG: {
      dcAmplitude: 0.5,
      dcPhase: Math.PI / 3,
      coefficients: [
        { amplitude: 0.4, phase: 0, freqX: 2, freqY: 0, freqZ: 2 },
        { amplitude: 0.3, phase: Math.PI / 2, freqX: 0, freqY: 2, freqZ: 2 },
      ],
    },
    channelB: {
      dcAmplitude: 0.2,
      dcPhase: Math.PI / 6,
      coefficients: [{ amplitude: 0.2, phase: 0, freqX: 1, freqY: 1, freqZ: 1 }],
    },
    channelA: {
      dcAmplitude: 1.0,
      dcPhase: 0,
      coefficients: [],
    },
    energyCapacity: 100.0,
    coherenceLoss: 0.05,
    fractureThreshold: 80.0,
  }
}
