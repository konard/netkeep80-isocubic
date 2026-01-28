/**
 * Parametric Cube Shader
 * GLSL shader for rendering parametric cubes with gradients and procedural noise
 *
 * This shader implements:
 * - Base color rendering
 * - Gradient effects along X, Y, Z axes and radial
 * - Perlin, Worley, and Crackle noise patterns
 * - Region-based noise masking
 */

// ============================================================
// VERTEX SHADER
// ============================================================
#ifdef VERTEX_SHADER

varying vec3 vPosition;      // Local position for gradient/noise calculation
varying vec3 vNormal;        // Normal vector for lighting
varying vec3 vWorldPosition; // World position for global noise continuity

void main() {
    // Pass local position for gradient/noise calculations
    vPosition = position;

    // Transform normal to world space
    vNormal = normalize(normalMatrix * normal);

    // Calculate world position for seamless noise between adjacent cubes
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;

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

// Base material uniforms
uniform vec3 uBaseColor;        // RGB [0,1]
uniform float uRoughness;       // [0,1] affects specular
uniform float uTransparency;    // [0,1] opacity

// Gradient uniforms (up to 4 gradients)
uniform int uGradientCount;
uniform int uGradientAxis[4];        // 0=x, 1=y, 2=z, 3=radial
uniform float uGradientFactor[4];    // Gradient strength
uniform vec3 uGradientColorShift[4]; // Color shift at gradient end

// Noise uniforms
uniform int uNoiseType;       // 0=none, 1=perlin, 2=worley, 3=crackle
uniform float uNoiseScale;    // Frequency
uniform int uNoiseOctaves;    // Detail layers
uniform float uNoisePersistence; // Amplitude decay
uniform float uNoiseMaskStart;   // Mask region start [0,1]
uniform float uNoiseMaskEnd;     // Mask region end [0,1]
uniform int uNoiseMaskAxis;      // 0=y(default), 1=x, 2=z

// Lighting uniforms
uniform vec3 uLightDirection;
uniform vec3 uLightColor;
uniform float uAmbientIntensity;

// ============================================================
// NOISE FUNCTIONS
// ============================================================

// Hash function for noise
vec3 hash3(vec3 p) {
    p = vec3(
        dot(p, vec3(127.1, 311.7, 74.7)),
        dot(p, vec3(269.5, 183.3, 246.1)),
        dot(p, vec3(113.5, 271.9, 124.6))
    );
    return fract(sin(p) * 43758.5453123);
}

float hash(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
}

// 3D Gradient noise (Perlin-like)
float gradientNoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);

    // Smooth interpolation curve
    vec3 u = f * f * (3.0 - 2.0 * f);

    // Sample 8 corners
    float n000 = dot(hash3(i + vec3(0.0, 0.0, 0.0)) * 2.0 - 1.0, f - vec3(0.0, 0.0, 0.0));
    float n100 = dot(hash3(i + vec3(1.0, 0.0, 0.0)) * 2.0 - 1.0, f - vec3(1.0, 0.0, 0.0));
    float n010 = dot(hash3(i + vec3(0.0, 1.0, 0.0)) * 2.0 - 1.0, f - vec3(0.0, 1.0, 0.0));
    float n110 = dot(hash3(i + vec3(1.0, 1.0, 0.0)) * 2.0 - 1.0, f - vec3(1.0, 1.0, 0.0));
    float n001 = dot(hash3(i + vec3(0.0, 0.0, 1.0)) * 2.0 - 1.0, f - vec3(0.0, 0.0, 1.0));
    float n101 = dot(hash3(i + vec3(1.0, 0.0, 1.0)) * 2.0 - 1.0, f - vec3(1.0, 0.0, 1.0));
    float n011 = dot(hash3(i + vec3(0.0, 1.0, 1.0)) * 2.0 - 1.0, f - vec3(0.0, 1.0, 1.0));
    float n111 = dot(hash3(i + vec3(1.0, 1.0, 1.0)) * 2.0 - 1.0, f - vec3(1.0, 1.0, 1.0));

    // Trilinear interpolation
    return mix(
        mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
        mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y),
        u.z
    );
}

// Fractal Brownian Motion (fBm) for Perlin noise
float fbm(vec3 p, int octaves, float persistence) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    float maxValue = 0.0;

    for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        value += amplitude * gradientNoise(p * frequency);
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= 2.0;
    }

    return value / maxValue;
}

// Worley (Cellular) noise
float worleyNoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);

    float minDist = 1.0;

    // Check 3x3x3 neighborhood
    for (int x = -1; x <= 1; x++) {
        for (int y = -1; y <= 1; y++) {
            for (int z = -1; z <= 1; z++) {
                vec3 neighbor = vec3(float(x), float(y), float(z));
                vec3 cellCenter = hash3(i + neighbor);
                vec3 diff = neighbor + cellCenter - f;
                float dist = length(diff);
                minDist = min(minDist, dist);
            }
        }
    }

    return minDist;
}

// Crackle noise (Worley F2 - F1)
float crackleNoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);

    float minDist1 = 1.0;
    float minDist2 = 1.0;

    // Check 3x3x3 neighborhood
    for (int x = -1; x <= 1; x++) {
        for (int y = -1; y <= 1; y++) {
            for (int z = -1; z <= 1; z++) {
                vec3 neighbor = vec3(float(x), float(y), float(z));
                vec3 cellCenter = hash3(i + neighbor);
                vec3 diff = neighbor + cellCenter - f;
                float dist = length(diff);

                if (dist < minDist1) {
                    minDist2 = minDist1;
                    minDist1 = dist;
                } else if (dist < minDist2) {
                    minDist2 = dist;
                }
            }
        }
    }

    return minDist2 - minDist1;
}

// Combined noise function based on type
float computeNoise(vec3 p, int noiseType, int octaves, float persistence) {
    if (noiseType == 1) {
        // Perlin noise with fBm
        return fbm(p, octaves, persistence) * 0.5 + 0.5; // Normalize to [0,1]
    } else if (noiseType == 2) {
        // Worley noise
        return worleyNoise(p);
    } else if (noiseType == 3) {
        // Crackle noise
        return crackleNoise(p);
    }
    return 0.0;
}

// ============================================================
// GRADIENT FUNCTIONS
// ============================================================

float getGradientFactor(vec3 pos, int axis) {
    // Normalize position to [0,1] range (assuming cube is -0.5 to 0.5)
    vec3 normalizedPos = pos + 0.5;

    if (axis == 0) {
        // X-axis gradient
        return normalizedPos.x;
    } else if (axis == 1) {
        // Y-axis gradient
        return normalizedPos.y;
    } else if (axis == 2) {
        // Z-axis gradient
        return normalizedPos.z;
    } else {
        // Radial gradient from center
        return length(pos) * 2.0; // Scale to roughly [0,1] for unit cube
    }
}

// ============================================================
// MAIN FRAGMENT SHADER
// ============================================================

void main() {
    // Start with base color
    vec3 color = uBaseColor;

    // Apply gradients
    for (int i = 0; i < 4; i++) {
        if (i >= uGradientCount) break;

        float gradientPos = getGradientFactor(vPosition, uGradientAxis[i]);
        float factor = gradientPos * uGradientFactor[i];
        color += uGradientColorShift[i] * factor;
    }

    // Apply noise
    if (uNoiseType > 0) {
        // Use world position for seamless noise across cube boundaries
        vec3 noisePos = vWorldPosition * uNoiseScale;
        float noiseValue = computeNoise(noisePos, uNoiseType, uNoiseOctaves, uNoisePersistence);

        // Apply mask based on local position
        float maskPos;
        if (uNoiseMaskAxis == 1) {
            maskPos = vPosition.x + 0.5; // Normalize to [0,1]
        } else if (uNoiseMaskAxis == 2) {
            maskPos = vPosition.z + 0.5;
        } else {
            maskPos = vPosition.y + 0.5; // Default Y axis
        }

        // Calculate mask factor
        float maskFactor = 1.0;
        if (uNoiseMaskStart < uNoiseMaskEnd) {
            maskFactor = smoothstep(uNoiseMaskStart, uNoiseMaskStart + 0.1, maskPos) *
                        (1.0 - smoothstep(uNoiseMaskEnd - 0.1, uNoiseMaskEnd, maskPos));
        }

        // Modulate color with noise
        float noiseInfluence = (noiseValue - 0.5) * 0.3 * maskFactor;
        color += vec3(noiseInfluence);
    }

    // Basic lighting calculation
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(uLightDirection);

    // Diffuse lighting
    float diffuse = max(dot(normal, lightDir), 0.0);

    // Ambient + diffuse
    float lighting = uAmbientIntensity + (1.0 - uAmbientIntensity) * diffuse;

    // Apply roughness to reduce specular (simplified)
    lighting = mix(lighting, diffuse * 0.8 + 0.2, uRoughness * 0.3);

    // Final color
    vec3 finalColor = color * lighting * uLightColor;

    // Clamp color values
    finalColor = clamp(finalColor, 0.0, 1.0);

    gl_FragColor = vec4(finalColor, uTransparency);
}

#endif
