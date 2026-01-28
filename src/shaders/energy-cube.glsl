/**
 * Energy Cube Shader
 * GLSL shader for rendering energy-based cubes with FFT coefficient visualization
 *
 * This shader implements:
 * - Wave function reconstruction from FFT coefficients: psi = A * e^(i*phi)
 * - Energy density calculation: E = |psi|^2
 * - Color mapping based on energy channels (R, G, B, A)
 * - Phase animation for pulsating magical effects
 * - Glow effect based on energy intensity
 * - Seamless boundary stitching for cube grids
 *
 * Mathematical Foundation:
 * - Wave function: psi_c(x,y,z) = sum(A_k * e^(i * (k.r + phi_k + omega*t)))
 * - Energy density: E_c = |psi_c|^2 = (Re(psi))^2 + (Im(psi))^2
 * - Parseval's theorem ensures energy conservation
 */

// ============================================================
// VERTEX SHADER
// ============================================================
#ifdef VERTEX_SHADER

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
    // This provides continuous coordinates across cube boundaries
    vGlobalPosition = uGridPosition + position + 0.5; // Shift to [0,1] per cube

    // 3D UV coordinates normalized to [0,1] range for animation calculations
    vUV3D = position + 0.5;

    // Standard transformation
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

#endif

// ============================================================
// FRAGMENT SHADER
// ============================================================
#ifdef FRAGMENT_SHADER

// Varyings from vertex shader
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vGlobalPosition;
varying vec3 vUV3D;

// ============================================================
// ANIMATION UNIFORMS
// ============================================================
uniform float uTime;          // Time in seconds for animation
uniform float uEnergyScale;   // Scale factor for energy visualization [0.1, 10.0]
uniform float uGlowIntensity; // Glow effect intensity [0.0, 2.0]

// ============================================================
// FFT COEFFICIENT UNIFORMS
// Each channel (R, G, B, A) has up to 8 FFT coefficients
// Coefficients are stored as: [amplitude, phase, freq_x, freq_y, freq_z, ...]
// ============================================================

// DC (zero frequency) components for each channel
uniform vec4 uDCAmplitude;    // DC amplitude for R, G, B, A channels
uniform vec4 uDCPhase;        // DC phase for R, G, B, A channels

// Number of coefficients per channel (max 8 each)
uniform int uCoeffCountR;
uniform int uCoeffCountG;
uniform int uCoeffCountB;
uniform int uCoeffCountA;

// FFT coefficients for Red channel
// Each coefficient: [amplitude, phase, freq_x, freq_y, freq_z] packed into vec4 + float
uniform vec4 uCoeffR[8];      // amplitude, phase, freq_x, freq_y
uniform float uCoeffRFreqZ[8]; // freq_z for R channel

// FFT coefficients for Green channel
uniform vec4 uCoeffG[8];
uniform float uCoeffGFreqZ[8];

// FFT coefficients for Blue channel
uniform vec4 uCoeffB[8];
uniform float uCoeffBFreqZ[8];

// FFT coefficients for Alpha channel
uniform vec4 uCoeffA[8];
uniform float uCoeffAFreqZ[8];

// ============================================================
// ENERGY PHYSICS UNIFORMS
// ============================================================
uniform float uEnergyCapacity;    // Maximum energy capacity for normalization
uniform float uCoherenceLoss;     // Rate of coherence decay (for animation damping)
uniform float uFractureThreshold; // Energy threshold for fracture visualization

// ============================================================
// RENDERING MODE UNIFORMS
// ============================================================
uniform int uVisualizationMode;   // 0=energy density, 1=wave amplitude, 2=phase
uniform int uChannelMask;         // Bit mask: 1=R, 2=G, 4=B, 8=A (15=all)

// ============================================================
// LIGHTING UNIFORMS
// ============================================================
uniform vec3 uLightDirection;
uniform vec3 uLightColor;
uniform float uAmbientIntensity;

// ============================================================
// BOUNDARY STITCHING UNIFORMS
// ============================================================
uniform int uBoundaryMode;           // 0=none, 1=smooth, 2=hard
uniform float uNeighborInfluence;    // [0,1] blend factor
uniform vec3 uGridPosition;

// ============================================================
// CONSTANTS
// ============================================================
const float PI = 3.14159265359;
const float TWO_PI = 6.28318530718;

// ============================================================
// WAVE FUNCTION RECONSTRUCTION
// Reconstructs the complex wave function psi from FFT coefficients
// psi = sum(A_k * e^(i * (k.r + phi_k + omega*t)))
// Returns vec2(Re(psi), Im(psi))
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
    float phase0 = dcPhase + time * 0.5; // Slow DC oscillation
    vec2 psi = vec2(dcAmp * cos(phase0), dcAmp * sin(phase0));

    // Add contributions from each FFT coefficient
    for (int i = 0; i < 8; i++) {
        if (i >= coeffCount) break;

        float amplitude = coeffs[i].x;
        float phase = coeffs[i].y;
        vec3 freq = vec3(coeffs[i].z, coeffs[i].w, freqZ[i]);

        // Calculate wave: k.r + phi + omega*t
        // omega is derived from frequency magnitude for dispersion effect
        float omega = length(freq) * 0.5 + 1.0; // Frequency-dependent angular velocity
        float totalPhase = dot(freq, pos * TWO_PI) + phase + omega * time;

        // Add complex exponential: A * e^(i*totalPhase)
        psi.x += amplitude * cos(totalPhase);
        psi.y += amplitude * sin(totalPhase);
    }

    return psi;
}

// ============================================================
// ENERGY DENSITY CALCULATION
// E = |psi|^2 = Re(psi)^2 + Im(psi)^2
// ============================================================

float calculateEnergyDensity(vec2 psi) {
    return dot(psi, psi); // |psi|^2 = Re^2 + Im^2
}

// ============================================================
// GLOW FUNCTION
// Creates a soft glow based on energy intensity
// ============================================================

vec3 applyGlow(vec3 color, float energy, float glowIntensity) {
    // Glow increases with energy, creating HDR-like effect
    float glowFactor = energy * glowIntensity;

    // Soft bloom effect - boost bright areas
    vec3 bloomColor = color * (1.0 + glowFactor * 2.0);

    // Add subtle color shift towards white at high energies
    vec3 glowColor = mix(bloomColor, vec3(1.0), glowFactor * 0.3);

    return glowColor;
}

// ============================================================
// FRACTURE VISUALIZATION
// Shows stress patterns when energy approaches fracture threshold
// ============================================================

float calculateFracturePattern(vec3 pos, float energy, float threshold) {
    if (threshold <= 0.0 || energy < threshold * 0.5) {
        return 0.0;
    }

    // Stress increases as energy approaches threshold
    float stress = (energy - threshold * 0.5) / (threshold * 0.5);
    stress = clamp(stress, 0.0, 1.0);

    // Create crack-like pattern using noise
    float crackNoise = fract(sin(dot(pos * 20.0, vec3(12.9898, 78.233, 45.164))) * 43758.5453);

    return stress * crackNoise;
}

// ============================================================
// COLOR MAPPING
// Maps energy values to colors based on channel mask
// ============================================================

vec4 mapEnergyToColor(
    float energyR, float energyG, float energyB, float energyA,
    int channelMask, float energyScale
) {
    vec4 color = vec4(0.0);

    // Scale energies for visualization
    float scaledR = energyR * energyScale;
    float scaledG = energyG * energyScale;
    float scaledB = energyB * energyScale;
    float scaledA = energyA * energyScale;

    // Apply channel mask
    if ((channelMask & 1) != 0) color.r = scaledR;
    if ((channelMask & 2) != 0) color.g = scaledG;
    if ((channelMask & 4) != 0) color.b = scaledB;
    if ((channelMask & 8) != 0) color.a = scaledA;

    // If no color channels active but alpha is, use grayscale
    if ((channelMask & 7) == 0 && (channelMask & 8) != 0) {
        color.rgb = vec3(scaledA);
    }

    return color;
}

// ============================================================
// MAIN FRAGMENT SHADER
// ============================================================

void main() {
    // Determine position based on boundary mode
    vec3 samplePos;
    if (uBoundaryMode == 0) {
        // No stitching - use local position
        samplePos = vUV3D;
    } else if (uBoundaryMode == 1) {
        // Smooth stitching - blend local and global
        samplePos = mix(vUV3D, fract(vGlobalPosition), uNeighborInfluence);
    } else {
        // Hard stitching - use global position for continuity
        samplePos = fract(vGlobalPosition);
    }

    // Apply time-based coherence loss (slight damping over time)
    float coherenceFactor = exp(-uCoherenceLoss * uTime * 0.01);

    // ============================================================
    // RECONSTRUCT WAVE FUNCTIONS FOR EACH CHANNEL
    // ============================================================

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

    // ============================================================
    // CALCULATE ENERGY DENSITIES
    // ============================================================

    float energyR = calculateEnergyDensity(psiR);
    float energyG = calculateEnergyDensity(psiG);
    float energyB = calculateEnergyDensity(psiB);
    float energyA = calculateEnergyDensity(psiA);

    // Total energy for effects
    float totalEnergy = (energyR + energyG + energyB + energyA) / 4.0;

    // Normalize if capacity is specified
    if (uEnergyCapacity > 0.0) {
        float normFactor = 1.0 / uEnergyCapacity;
        energyR *= normFactor;
        energyG *= normFactor;
        energyB *= normFactor;
        energyA *= normFactor;
        totalEnergy *= normFactor;
    }

    // ============================================================
    // VISUALIZATION MODE SELECTION
    // ============================================================

    vec4 baseColor;

    if (uVisualizationMode == 0) {
        // Energy density mode - show |psi|^2
        baseColor = mapEnergyToColor(energyR, energyG, energyB, energyA, uChannelMask, uEnergyScale);
    }
    else if (uVisualizationMode == 1) {
        // Wave amplitude mode - show |psi|
        baseColor = mapEnergyToColor(
            sqrt(energyR), sqrt(energyG), sqrt(energyB), sqrt(energyA),
            uChannelMask, uEnergyScale
        );
    }
    else {
        // Phase mode - show phase angle mapped to color
        float phaseR = atan(psiR.y, psiR.x) / TWO_PI + 0.5;
        float phaseG = atan(psiG.y, psiG.x) / TWO_PI + 0.5;
        float phaseB = atan(psiB.y, psiB.x) / TWO_PI + 0.5;
        float phaseA = atan(psiA.y, psiA.x) / TWO_PI + 0.5;
        baseColor = mapEnergyToColor(phaseR, phaseG, phaseB, phaseA, uChannelMask, 1.0);
    }

    // Ensure minimum alpha for visibility
    if (baseColor.a < 0.1) {
        baseColor.a = 0.8 + totalEnergy * 0.2;
    }

    // ============================================================
    // APPLY GLOW EFFECT
    // ============================================================

    vec3 glowColor = applyGlow(baseColor.rgb, totalEnergy, uGlowIntensity);

    // ============================================================
    // FRACTURE VISUALIZATION
    // ============================================================

    float fracturePattern = calculateFracturePattern(samplePos, totalEnergy * uEnergyCapacity, uFractureThreshold);
    if (fracturePattern > 0.0) {
        // Add bright crack lines
        glowColor = mix(glowColor, vec3(1.0, 0.8, 0.3), fracturePattern * 0.8);
    }

    // ============================================================
    // LIGHTING
    // ============================================================

    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(uLightDirection);

    // Diffuse lighting
    float diffuse = max(dot(normal, lightDir), 0.0);

    // Energy-based emission - magical objects emit light based on energy
    float emission = totalEnergy * uGlowIntensity * 0.5;

    // Combine ambient, diffuse, and emission
    float lighting = uAmbientIntensity + (1.0 - uAmbientIntensity) * diffuse + emission;

    // Final color with lighting
    vec3 finalColor = glowColor * lighting * uLightColor;

    // HDR tone mapping for high energy values
    finalColor = finalColor / (1.0 + finalColor);

    gl_FragColor = vec4(finalColor, baseColor.a);
}

#endif
