/**
 * WebGPU Compute Module for High-Performance GPU Computations
 *
 * Provides WebGPU compute shader implementations for:
 * - Perlin noise generation
 * - Worley noise generation
 * - FFT computations (alternative to WASM)
 *
 * Includes automatic fallback to WASM/JavaScript when WebGPU is not available.
 *
 * @module webgpu-compute
 */

import { FFT3D } from './fft-wasm'
import type { FFTResult, FFTSize } from './fft-wasm'

/**
 * WebGPU support status
 */
export interface WebGPUSupport {
  /** Whether WebGPU is supported in the browser */
  supported: boolean
  /** Error message if not supported */
  error?: string
  /** GPU adapter info if available */
  adapterInfo?: GPUAdapterInfo
}

/**
 * Noise generation parameters
 */
export interface NoiseParams {
  /** Type of noise to generate */
  type: 'perlin' | 'worley' | 'crackle'
  /** Size of the 3D noise texture (8, 16, or 32) */
  size: 8 | 16 | 32
  /** Noise scale/frequency */
  scale: number
  /** Number of octaves for fBm */
  octaves: number
  /** Amplitude persistence between octaves */
  persistence: number
  /** Seed for reproducible noise */
  seed?: number
}

/**
 * Noise generation result
 */
export interface NoiseResult {
  /** Generated noise data as 3D Float32Array */
  data: Float32Array
  /** Size of each dimension */
  size: number
  /** Total number of elements */
  totalSize: number
  /** Method used for computation */
  method: 'webgpu' | 'wasm' | 'javascript'
  /** Computation time in milliseconds */
  computeTime: number
}

/**
 * Benchmark result for performance comparison
 */
export interface BenchmarkResult {
  /** Method tested */
  method: 'webgpu' | 'wasm' | 'javascript'
  /** Whether the method is available */
  available: boolean
  /** Average computation time in milliseconds */
  avgTime: number
  /** Standard deviation of computation times */
  stdDev: number
  /** Number of iterations */
  iterations: number
  /** Operations per second */
  opsPerSecond: number
}

/**
 * Check if WebGPU is supported in the current environment
 */
export async function checkWebGPUSupport(): Promise<WebGPUSupport> {
  // Check if we're in a browser environment
  if (typeof navigator === 'undefined') {
    return {
      supported: false,
      error: 'Not in browser environment',
    }
  }

  // Check if WebGPU API is available
  if (!('gpu' in navigator)) {
    return {
      supported: false,
      error: 'WebGPU API not available in this browser',
    }
  }

  try {
    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) {
      return {
        supported: false,
        error: 'No GPU adapter found',
      }
    }

    // GPUAdapter.info is the modern API (adapter.requestAdapterInfo is deprecated)
    const adapterInfo = adapter.info

    return {
      supported: true,
      adapterInfo,
    }
  } catch (error) {
    return {
      supported: false,
      error: error instanceof Error ? error.message : 'Unknown error checking WebGPU support',
    }
  }
}

/**
 * WGSL Compute Shader for Perlin Noise Generation
 */
const perlinNoiseShader = /* wgsl */ `
// Output buffer for noise values
@group(0) @binding(0) var<storage, read_write> output: array<f32>;

// Uniform parameters
struct Params {
  size: u32,
  scale: f32,
  octaves: u32,
  persistence: f32,
  seed: f32,
}
@group(0) @binding(1) var<uniform> params: Params;

// Hash function for noise generation
fn hash3(p: vec3<f32>) -> vec3<f32> {
  var q = vec3<f32>(
    dot(p, vec3<f32>(127.1, 311.7, 74.7)),
    dot(p, vec3<f32>(269.5, 183.3, 246.1)),
    dot(p, vec3<f32>(113.5, 271.9, 124.6))
  );
  return fract(sin(q + params.seed) * 43758.5453123);
}

// Smoothstep interpolation
fn smootherstep(t: f32) -> f32 {
  return t * t * (3.0 - 2.0 * t);
}

// 3D Gradient noise (Perlin-like)
fn gradientNoise(p: vec3<f32>) -> f32 {
  let i = floor(p);
  let f = fract(p);

  // Smooth interpolation
  let u = vec3<f32>(
    smootherstep(f.x),
    smootherstep(f.y),
    smootherstep(f.z)
  );

  // Sample 8 corners
  let n000 = dot(hash3(i + vec3<f32>(0.0, 0.0, 0.0)) * 2.0 - 1.0, f - vec3<f32>(0.0, 0.0, 0.0));
  let n100 = dot(hash3(i + vec3<f32>(1.0, 0.0, 0.0)) * 2.0 - 1.0, f - vec3<f32>(1.0, 0.0, 0.0));
  let n010 = dot(hash3(i + vec3<f32>(0.0, 1.0, 0.0)) * 2.0 - 1.0, f - vec3<f32>(0.0, 1.0, 0.0));
  let n110 = dot(hash3(i + vec3<f32>(1.0, 1.0, 0.0)) * 2.0 - 1.0, f - vec3<f32>(1.0, 1.0, 0.0));
  let n001 = dot(hash3(i + vec3<f32>(0.0, 0.0, 1.0)) * 2.0 - 1.0, f - vec3<f32>(0.0, 0.0, 1.0));
  let n101 = dot(hash3(i + vec3<f32>(1.0, 0.0, 1.0)) * 2.0 - 1.0, f - vec3<f32>(1.0, 0.0, 1.0));
  let n011 = dot(hash3(i + vec3<f32>(0.0, 1.0, 1.0)) * 2.0 - 1.0, f - vec3<f32>(0.0, 1.0, 1.0));
  let n111 = dot(hash3(i + vec3<f32>(1.0, 1.0, 1.0)) * 2.0 - 1.0, f - vec3<f32>(1.0, 1.0, 1.0));

  // Trilinear interpolation
  let nx00 = mix(n000, n100, u.x);
  let nx10 = mix(n010, n110, u.x);
  let nx01 = mix(n001, n101, u.x);
  let nx11 = mix(n011, n111, u.x);
  let nxy0 = mix(nx00, nx10, u.y);
  let nxy1 = mix(nx01, nx11, u.y);
  return mix(nxy0, nxy1, u.z);
}

// Fractal Brownian Motion
fn fbm(p: vec3<f32>) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var frequency = 1.0;
  var maxValue = 0.0;

  for (var i = 0u; i < params.octaves; i++) {
    value += amplitude * gradientNoise(p * frequency);
    maxValue += amplitude;
    amplitude *= params.persistence;
    frequency *= 2.0;
  }

  return value / maxValue;
}

@compute @workgroup_size(8, 8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let size = params.size;

  // Check bounds
  if (global_id.x >= size || global_id.y >= size || global_id.z >= size) {
    return;
  }

  // Calculate linear index
  let index = global_id.z * size * size + global_id.y * size + global_id.x;

  // Calculate position in noise space
  // Add 0.5 offset to sample at cell centers rather than corners
  let pos = (vec3<f32>(f32(global_id.x), f32(global_id.y), f32(global_id.z)) + 0.5) * params.scale / f32(size);

  // Compute noise value and normalize to [0, 1]
  let noise = fbm(pos) * 0.5 + 0.5;

  output[index] = noise;
}
`

/**
 * WGSL Compute Shader for Worley (Cellular) Noise Generation
 */
const worleyNoiseShader = /* wgsl */ `
// Output buffer for noise values
@group(0) @binding(0) var<storage, read_write> output: array<f32>;

// Uniform parameters
struct Params {
  size: u32,
  scale: f32,
  octaves: u32,
  persistence: f32,
  seed: f32,
}
@group(0) @binding(1) var<uniform> params: Params;

// Hash function for cell centers
fn hash3(p: vec3<f32>) -> vec3<f32> {
  var q = vec3<f32>(
    dot(p, vec3<f32>(127.1, 311.7, 74.7)),
    dot(p, vec3<f32>(269.5, 183.3, 246.1)),
    dot(p, vec3<f32>(113.5, 271.9, 124.6))
  );
  return fract(sin(q + params.seed) * 43758.5453123);
}

// Worley noise - finds minimum distance to cell centers
fn worleyNoise(p: vec3<f32>) -> f32 {
  let i = floor(p);
  let f = fract(p);

  var minDist = 1.0;

  // Check 3x3x3 neighborhood
  for (var x = -1; x <= 1; x++) {
    for (var y = -1; y <= 1; y++) {
      for (var z = -1; z <= 1; z++) {
        let neighbor = vec3<f32>(f32(x), f32(y), f32(z));
        let cellCenter = hash3(i + neighbor);
        let diff = neighbor + cellCenter - f;
        let dist = length(diff);
        minDist = min(minDist, dist);
      }
    }
  }

  return minDist;
}

@compute @workgroup_size(8, 8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let size = params.size;

  // Check bounds
  if (global_id.x >= size || global_id.y >= size || global_id.z >= size) {
    return;
  }

  // Calculate linear index
  let index = global_id.z * size * size + global_id.y * size + global_id.x;

  // Calculate position in noise space
  // Add 0.5 offset to sample at cell centers rather than corners
  let pos = (vec3<f32>(f32(global_id.x), f32(global_id.y), f32(global_id.z)) + 0.5) * params.scale / f32(size);

  // Compute Worley noise
  let noise = worleyNoise(pos);

  output[index] = noise;
}
`

/**
 * WGSL Compute Shader for Crackle Noise (Worley F2-F1)
 */
const crackleNoiseShader = /* wgsl */ `
// Output buffer for noise values
@group(0) @binding(0) var<storage, read_write> output: array<f32>;

// Uniform parameters
struct Params {
  size: u32,
  scale: f32,
  octaves: u32,
  persistence: f32,
  seed: f32,
}
@group(0) @binding(1) var<uniform> params: Params;

// Hash function for cell centers
fn hash3(p: vec3<f32>) -> vec3<f32> {
  var q = vec3<f32>(
    dot(p, vec3<f32>(127.1, 311.7, 74.7)),
    dot(p, vec3<f32>(269.5, 183.3, 246.1)),
    dot(p, vec3<f32>(113.5, 271.9, 124.6))
  );
  return fract(sin(q + params.seed) * 43758.5453123);
}

// Crackle noise - F2 - F1 (edge detection)
fn crackleNoise(p: vec3<f32>) -> f32 {
  let i = floor(p);
  let f = fract(p);

  var minDist1 = 1.0;
  var minDist2 = 1.0;

  // Check 3x3x3 neighborhood
  for (var x = -1; x <= 1; x++) {
    for (var y = -1; y <= 1; y++) {
      for (var z = -1; z <= 1; z++) {
        let neighbor = vec3<f32>(f32(x), f32(y), f32(z));
        let cellCenter = hash3(i + neighbor);
        let diff = neighbor + cellCenter - f;
        let dist = length(diff);

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

@compute @workgroup_size(8, 8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let size = params.size;

  // Check bounds
  if (global_id.x >= size || global_id.y >= size || global_id.z >= size) {
    return;
  }

  // Calculate linear index
  let index = global_id.z * size * size + global_id.y * size + global_id.x;

  // Calculate position in noise space
  // Add 0.5 offset to sample at cell centers rather than corners
  let pos = (vec3<f32>(f32(global_id.x), f32(global_id.y), f32(global_id.z)) + 0.5) * params.scale / f32(size);

  // Compute crackle noise
  let noise = crackleNoise(pos);

  output[index] = noise;
}
`

/**
 * WGSL Compute Shader for 1D FFT (building block for 3D FFT)
 */
const fftComputeShader = /* wgsl */ `
// Input/output buffers for complex values (interleaved real/imag)
@group(0) @binding(0) var<storage, read_write> data: array<f32>;

// FFT parameters
struct FFTParams {
  size: u32,       // Size of FFT (power of 2)
  stage: u32,      // Current butterfly stage
  direction: f32,  // 1.0 for forward, -1.0 for inverse
  normalize: f32,  // Normalization factor (1/N for inverse)
}
@group(0) @binding(1) var<uniform> params: FFTParams;

const PI: f32 = 3.14159265359;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let n = params.size;
  let stage = params.stage;
  let idx = global_id.x;

  // Each thread handles one butterfly operation
  let butterfliesPerGroup = 1u << stage;
  let groupSize = butterfliesPerGroup * 2u;
  let groupId = idx / butterfliesPerGroup;
  let butterflyId = idx % butterfliesPerGroup;

  let topIdx = groupId * groupSize + butterflyId;
  let bottomIdx = topIdx + butterfliesPerGroup;

  if (bottomIdx >= n) {
    return;
  }

  // Calculate twiddle factor
  let k = f32(butterflyId) / f32(groupSize);
  let angle = -2.0 * PI * k * params.direction;
  let wRe = cos(angle);
  let wIm = sin(angle);

  // Read complex values (interleaved format: [re0, im0, re1, im1, ...])
  let topRe = data[topIdx * 2u];
  let topIm = data[topIdx * 2u + 1u];
  let bottomRe = data[bottomIdx * 2u];
  let bottomIm = data[bottomIdx * 2u + 1u];

  // Butterfly operation
  let tRe = bottomRe * wRe - bottomIm * wIm;
  let tIm = bottomRe * wIm + bottomIm * wRe;

  // Write results
  data[topIdx * 2u] = (topRe + tRe) * params.normalize;
  data[topIdx * 2u + 1u] = (topIm + tIm) * params.normalize;
  data[bottomIdx * 2u] = (topRe - tRe) * params.normalize;
  data[bottomIdx * 2u + 1u] = (topIm - tIm) * params.normalize;
}
`

/**
 * WebGPU Compute Engine for high-performance GPU computations
 *
 * Provides noise generation and FFT operations using WebGPU compute shaders
 * with automatic fallback to WASM/JavaScript implementations.
 */
export class WebGPUCompute {
  private adapter: GPUAdapter | null = null
  private device: GPUDevice | null = null
  private initialized = false
  private supported = false

  // Cached pipelines
  private perlinPipeline: GPUComputePipeline | null = null
  private worleyPipeline: GPUComputePipeline | null = null
  private cracklePipeline: GPUComputePipeline | null = null
  // Note: FFT currently uses optimized WASM/JS fallback from fft-wasm module
  // WebGPU FFT pipeline can be added in future if performance benefits are identified

  // Fallback FFT instance
  private fallbackFFT: FFT3D | null = null

  /**
   * Initialize the WebGPU compute engine
   *
   * @returns true if WebGPU is available and initialized, false otherwise
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return this.supported
    }

    this.initialized = true

    // Check WebGPU support
    const support = await checkWebGPUSupport()
    if (!support.supported) {
      this.supported = false
      return false
    }

    try {
      this.adapter = await navigator.gpu.requestAdapter()
      if (!this.adapter) {
        this.supported = false
        return false
      }

      this.device = await this.adapter.requestDevice()
      if (!this.device) {
        this.supported = false
        return false
      }

      // Create compute pipelines
      await this.createPipelines()

      this.supported = true
      return true
    } catch (error) {
      console.warn('WebGPU initialization failed:', error)
      this.supported = false
      return false
    }
  }

  /**
   * Create compute pipelines for all shaders
   */
  private async createPipelines(): Promise<void> {
    if (!this.device) return

    const createPipeline = (code: string): GPUComputePipeline => {
      const shaderModule = this.device!.createShaderModule({ code })
      return this.device!.createComputePipeline({
        layout: 'auto',
        compute: {
          module: shaderModule,
          entryPoint: 'main',
        },
      })
    }

    this.perlinPipeline = createPipeline(perlinNoiseShader)
    this.worleyPipeline = createPipeline(worleyNoiseShader)
    this.cracklePipeline = createPipeline(crackleNoiseShader)
    // FFT shader is prepared but not assigned to a pipeline
    // since FFT currently uses optimized WASM/JS fallback
    void fftComputeShader
  }

  /**
   * Check if WebGPU is supported and initialized
   */
  isSupported(): boolean {
    return this.initialized && this.supported
  }

  /**
   * Generate 3D noise texture using WebGPU compute shaders
   *
   * @param params - Noise generation parameters
   * @returns Generated noise result
   */
  async computeNoise(params: NoiseParams): Promise<NoiseResult> {
    const startTime = performance.now()

    // Try WebGPU first
    if (this.isSupported()) {
      try {
        const result = await this.computeNoiseWebGPU(params)
        return {
          ...result,
          method: 'webgpu',
          computeTime: performance.now() - startTime,
        }
      } catch (error) {
        console.warn('WebGPU noise computation failed, falling back:', error)
      }
    }

    // Fall back to JavaScript
    const result = await this.computeNoiseJS(params)
    return {
      ...result,
      method: 'javascript',
      computeTime: performance.now() - startTime,
    }
  }

  /**
   * Generate noise using WebGPU compute shaders
   */
  private async computeNoiseWebGPU(
    params: NoiseParams
  ): Promise<Omit<NoiseResult, 'method' | 'computeTime'>> {
    if (!this.device) {
      throw new Error('WebGPU device not initialized')
    }

    const { type, size, scale, octaves, persistence, seed = 0 } = params
    const totalSize = size * size * size

    // Select pipeline based on noise type
    let pipeline: GPUComputePipeline | null = null
    switch (type) {
      case 'perlin':
        pipeline = this.perlinPipeline
        break
      case 'worley':
        pipeline = this.worleyPipeline
        break
      case 'crackle':
        pipeline = this.cracklePipeline
        break
    }

    if (!pipeline) {
      throw new Error(`No pipeline for noise type: ${type}`)
    }

    // Create output buffer
    const outputBuffer = this.device.createBuffer({
      size: totalSize * 4, // Float32
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    })

    // Create uniform buffer
    const uniformData = new ArrayBuffer(20)
    const uniformView = new DataView(uniformData)
    uniformView.setUint32(0, size, true)
    uniformView.setFloat32(4, scale, true)
    uniformView.setUint32(8, octaves, true)
    uniformView.setFloat32(12, persistence, true)
    uniformView.setFloat32(16, seed, true)

    const uniformBuffer = this.device.createBuffer({
      size: 20,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    this.device.queue.writeBuffer(uniformBuffer, 0, uniformData)

    // Create bind group
    const bindGroup = this.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: outputBuffer } },
        { binding: 1, resource: { buffer: uniformBuffer } },
      ],
    })

    // Create command encoder
    const commandEncoder = this.device.createCommandEncoder()
    const passEncoder = commandEncoder.beginComputePass()
    passEncoder.setPipeline(pipeline)
    passEncoder.setBindGroup(0, bindGroup)

    // Dispatch workgroups (8x8x8 workgroup size)
    const workgroups = Math.ceil(size / 8)
    passEncoder.dispatchWorkgroups(workgroups, workgroups, workgroups)
    passEncoder.end()

    // Create staging buffer for reading results
    const stagingBuffer = this.device.createBuffer({
      size: totalSize * 4,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    })
    commandEncoder.copyBufferToBuffer(outputBuffer, 0, stagingBuffer, 0, totalSize * 4)

    // Submit and wait
    this.device.queue.submit([commandEncoder.finish()])

    // Read results
    await stagingBuffer.mapAsync(GPUMapMode.READ)
    const resultData = new Float32Array(stagingBuffer.getMappedRange().slice(0))
    stagingBuffer.unmap()

    // Clean up buffers
    outputBuffer.destroy()
    uniformBuffer.destroy()
    stagingBuffer.destroy()

    return {
      data: resultData,
      size,
      totalSize,
    }
  }

  /**
   * Generate noise using JavaScript fallback
   */
  private async computeNoiseJS(
    params: NoiseParams
  ): Promise<Omit<NoiseResult, 'method' | 'computeTime'>> {
    const { type, size, scale, octaves, persistence, seed = 0 } = params
    const totalSize = size * size * size
    const data = new Float32Array(totalSize)

    // JavaScript noise implementation
    // Proper fract function (returns fractional part, always positive)
    const fract = (x: number): number => x - Math.floor(x)

    // Improved hash function that produces pseudo-random values for 3D coordinates
    const hash3 = (x: number, y: number, z: number): [number, number, number] => {
      // Use different prime multipliers to avoid patterns
      // Add offsets to handle zero coordinates better
      const px = (x + 0.5) * 127.1 + (y + 0.5) * 311.7 + (z + 0.5) * 74.7 + seed * 1.31
      const py = (x + 0.5) * 269.5 + (y + 0.5) * 183.3 + (z + 0.5) * 246.1 + seed * 2.47
      const pz = (x + 0.5) * 113.5 + (y + 0.5) * 271.9 + (z + 0.5) * 124.6 + seed * 3.83

      return [
        fract(Math.sin(px) * 43758.5453123),
        fract(Math.sin(py) * 43758.5453123),
        fract(Math.sin(pz) * 43758.5453123),
      ]
    }

    const smoothstep = (t: number): number => t * t * (3 - 2 * t)

    const lerp = (a: number, b: number, t: number): number => a + t * (b - a)

    const gradientNoise = (x: number, y: number, z: number): number => {
      const ix = Math.floor(x)
      const iy = Math.floor(y)
      const iz = Math.floor(z)
      const fx = x - ix
      const fy = y - iy
      const fz = z - iz

      const ux = smoothstep(fx)
      const uy = smoothstep(fy)
      const uz = smoothstep(fz)

      // Sample 8 corners and compute gradient dot products
      const n000 = (() => {
        const h = hash3(ix, iy, iz)
        const gx = h[0] * 2 - 1,
          gy = h[1] * 2 - 1,
          gz = h[2] * 2 - 1
        return gx * fx + gy * fy + gz * fz
      })()

      const n100 = (() => {
        const h = hash3(ix + 1, iy, iz)
        const gx = h[0] * 2 - 1,
          gy = h[1] * 2 - 1,
          gz = h[2] * 2 - 1
        return gx * (fx - 1) + gy * fy + gz * fz
      })()

      const n010 = (() => {
        const h = hash3(ix, iy + 1, iz)
        const gx = h[0] * 2 - 1,
          gy = h[1] * 2 - 1,
          gz = h[2] * 2 - 1
        return gx * fx + gy * (fy - 1) + gz * fz
      })()

      const n110 = (() => {
        const h = hash3(ix + 1, iy + 1, iz)
        const gx = h[0] * 2 - 1,
          gy = h[1] * 2 - 1,
          gz = h[2] * 2 - 1
        return gx * (fx - 1) + gy * (fy - 1) + gz * fz
      })()

      const n001 = (() => {
        const h = hash3(ix, iy, iz + 1)
        const gx = h[0] * 2 - 1,
          gy = h[1] * 2 - 1,
          gz = h[2] * 2 - 1
        return gx * fx + gy * fy + gz * (fz - 1)
      })()

      const n101 = (() => {
        const h = hash3(ix + 1, iy, iz + 1)
        const gx = h[0] * 2 - 1,
          gy = h[1] * 2 - 1,
          gz = h[2] * 2 - 1
        return gx * (fx - 1) + gy * fy + gz * (fz - 1)
      })()

      const n011 = (() => {
        const h = hash3(ix, iy + 1, iz + 1)
        const gx = h[0] * 2 - 1,
          gy = h[1] * 2 - 1,
          gz = h[2] * 2 - 1
        return gx * fx + gy * (fy - 1) + gz * (fz - 1)
      })()

      const n111 = (() => {
        const h = hash3(ix + 1, iy + 1, iz + 1)
        const gx = h[0] * 2 - 1,
          gy = h[1] * 2 - 1,
          gz = h[2] * 2 - 1
        return gx * (fx - 1) + gy * (fy - 1) + gz * (fz - 1)
      })()

      // Trilinear interpolation
      const nx00 = lerp(n000, n100, ux)
      const nx10 = lerp(n010, n110, ux)
      const nx01 = lerp(n001, n101, ux)
      const nx11 = lerp(n011, n111, ux)
      const nxy0 = lerp(nx00, nx10, uy)
      const nxy1 = lerp(nx01, nx11, uy)
      return lerp(nxy0, nxy1, uz)
    }

    const fbm = (x: number, y: number, z: number): number => {
      let value = 0
      let amplitude = 0.5
      let frequency = 1
      let maxValue = 0

      const effectiveOctaves = Math.max(1, octaves) // Ensure at least 1 octave

      for (let i = 0; i < effectiveOctaves; i++) {
        value += amplitude * gradientNoise(x * frequency, y * frequency, z * frequency)
        maxValue += amplitude
        amplitude *= persistence
        frequency *= 2
      }

      return maxValue > 0 ? value / maxValue : 0
    }

    const worleyNoise = (x: number, y: number, z: number): number => {
      const ix = Math.floor(x)
      const iy = Math.floor(y)
      const iz = Math.floor(z)
      const fx = x - ix
      const fy = y - iy
      const fz = z - iz

      let minDist = 1

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            const h = hash3(ix + dx, iy + dy, iz + dz)
            const diffX = dx + h[0] - fx
            const diffY = dy + h[1] - fy
            const diffZ = dz + h[2] - fz
            const dist = Math.sqrt(diffX * diffX + diffY * diffY + diffZ * diffZ)
            minDist = Math.min(minDist, dist)
          }
        }
      }

      return minDist
    }

    const crackleNoise = (x: number, y: number, z: number): number => {
      const ix = Math.floor(x)
      const iy = Math.floor(y)
      const iz = Math.floor(z)
      const fx = x - ix
      const fy = y - iy
      const fz = z - iz

      let minDist1 = 1
      let minDist2 = 1

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            const h = hash3(ix + dx, iy + dy, iz + dz)
            const diffX = dx + h[0] - fx
            const diffY = dy + h[1] - fy
            const diffZ = dz + h[2] - fz
            const dist = Math.sqrt(diffX * diffX + diffY * diffY + diffZ * diffZ)

            if (dist < minDist1) {
              minDist2 = minDist1
              minDist1 = dist
            } else if (dist < minDist2) {
              minDist2 = dist
            }
          }
        }
      }

      return minDist2 - minDist1
    }

    // Generate noise values
    // Add 0.5 offset to sample at cell centers rather than corners
    // This avoids the issue where integer coordinates produce zero noise
    for (let z = 0; z < size; z++) {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const index = z * size * size + y * size + x
          const px = ((x + 0.5) * scale) / size
          const py = ((y + 0.5) * scale) / size
          const pz = ((z + 0.5) * scale) / size

          let value: number
          switch (type) {
            case 'perlin':
              value = fbm(px, py, pz) * 0.5 + 0.5
              break
            case 'worley':
              value = worleyNoise(px, py, pz)
              break
            case 'crackle':
              value = crackleNoise(px, py, pz)
              break
            default:
              value = 0
          }

          data[index] = value
        }
      }
    }

    return {
      data,
      size,
      totalSize,
    }
  }

  /**
   * Perform 3D FFT using WebGPU compute shaders
   *
   * @param inputReal - Real parts of input
   * @param inputImag - Imaginary parts of input
   * @param size - FFT size (8, 16, or 32)
   * @returns FFT result
   */
  async computeFFT(
    inputReal: Float32Array,
    inputImag: Float32Array,
    size: FFTSize = 8
  ): Promise<FFTResult & { method: 'webgpu' | 'wasm' | 'javascript' }> {
    // For FFT, always use the existing WASM/JS implementation
    // WebGPU FFT is complex and the current WASM implementation is already optimized
    if (!this.fallbackFFT) {
      this.fallbackFFT = new FFT3D(size)
      await this.fallbackFFT.initialize()
    }

    const result = await this.fallbackFFT.forward(inputReal, inputImag)
    const method = this.fallbackFFT.isUsingWasm() ? 'wasm' : 'javascript'

    return {
      ...result,
      method,
    }
  }

  /**
   * Run performance benchmarks comparing WebGPU vs JavaScript
   *
   * @param params - Noise parameters for testing
   * @param iterations - Number of iterations for each method
   * @returns Benchmark results for each method
   */
  async runBenchmarks(
    params: NoiseParams = {
      type: 'perlin',
      size: 16,
      scale: 8,
      octaves: 4,
      persistence: 0.5,
    },
    iterations = 10
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = []

    // Ensure initialized
    await this.initialize()

    // Benchmark WebGPU
    if (this.isSupported()) {
      const times: number[] = []
      for (let i = 0; i < iterations; i++) {
        const start = performance.now()
        await this.computeNoiseWebGPU(params)
        times.push(performance.now() - start)
      }
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length
      const variance = times.reduce((sum, t) => sum + Math.pow(t - avgTime, 2), 0) / times.length
      results.push({
        method: 'webgpu',
        available: true,
        avgTime,
        stdDev: Math.sqrt(variance),
        iterations,
        opsPerSecond: 1000 / avgTime,
      })
    } else {
      results.push({
        method: 'webgpu',
        available: false,
        avgTime: 0,
        stdDev: 0,
        iterations: 0,
        opsPerSecond: 0,
      })
    }

    // Benchmark JavaScript
    {
      const times: number[] = []
      for (let i = 0; i < iterations; i++) {
        const start = performance.now()
        await this.computeNoiseJS(params)
        times.push(performance.now() - start)
      }
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length
      const variance = times.reduce((sum, t) => sum + Math.pow(t - avgTime, 2), 0) / times.length
      results.push({
        method: 'javascript',
        available: true,
        avgTime,
        stdDev: Math.sqrt(variance),
        iterations,
        opsPerSecond: 1000 / avgTime,
      })
    }

    return results
  }

  /**
   * Clean up WebGPU resources
   */
  destroy(): void {
    this.device?.destroy()
    this.device = null
    this.adapter = null
    this.perlinPipeline = null
    this.worleyPipeline = null
    this.cracklePipeline = null
    this.initialized = false
    this.supported = false
  }
}

/**
 * Singleton instance of WebGPUCompute
 */
let globalInstance: WebGPUCompute | null = null

/**
 * Get the global WebGPU compute instance
 *
 * @returns WebGPUCompute instance
 */
export function getWebGPUCompute(): WebGPUCompute {
  if (!globalInstance) {
    globalInstance = new WebGPUCompute()
  }
  return globalInstance
}

/**
 * Initialize and get the global WebGPU compute instance
 *
 * @returns Initialized WebGPUCompute instance
 */
export async function initWebGPUCompute(): Promise<WebGPUCompute> {
  const instance = getWebGPUCompute()
  await instance.initialize()
  return instance
}

/**
 * Get the preferred compute method based on available backends
 *
 * @returns The best available compute method
 */
export async function getPreferredComputeMethod(): Promise<'webgpu' | 'wasm' | 'javascript'> {
  const support = await checkWebGPUSupport()
  if (support.supported) {
    return 'webgpu'
  }

  // Check WASM support
  try {
    if (typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function') {
      return 'wasm'
    }
  } catch {
    // WASM not supported
  }

  return 'javascript'
}

/**
 * Get WebGPU module version
 */
export function getWebGPUComputeVersion(): string {
  return '0.1.0'
}
