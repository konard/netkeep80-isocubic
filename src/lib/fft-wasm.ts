/**
 * FFT WASM Module TypeScript Bindings
 *
 * Provides 3D FFT operations for energy visualization in magic objects.
 * Uses WebAssembly for high performance with JavaScript fallback.
 *
 * @module fft-wasm
 */

/**
 * FFT size options
 */
export type FFTSize = 8 | 16 | 32

/**
 * FFT configuration options
 */
export interface FFTConfig {
  /** Size of each dimension (8, 16, or 32) */
  size: FFTSize
}

/**
 * FFT result containing interleaved real/imaginary values
 */
export interface FFTResult {
  /** Real parts of the transform */
  real: Float32Array
  /** Imaginary parts of the transform */
  imag: Float32Array
  /** Total energy calculated via Parseval's theorem */
  energy: number
}

/**
 * Complex number representation
 */
export interface Complex {
  re: number
  im: number
}

/**
 * Check if WebAssembly is supported in the current environment
 */
export function isWasmSupported(): boolean {
  try {
    if (typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function') {
      const module = new WebAssembly.Module(
        Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00)
      )
      if (module instanceof WebAssembly.Module) {
        return new WebAssembly.Instance(module) instanceof WebAssembly.Instance
      }
    }
  } catch {
    // WebAssembly not supported
  }
  return false
}

/**
 * JavaScript fallback implementation of 1D FFT using Cooley-Tukey algorithm
 * This is used when WebAssembly is not available
 */
function fft1d(buffer: Complex[], inverse: boolean): void {
  const n = buffer.length
  if (n <= 1) return

  // Bit-reversal permutation
  let j = 0
  for (let i = 0; i < n - 1; i++) {
    if (i < j) {
      const temp = buffer[i]
      buffer[i] = buffer[j]
      buffer[j] = temp
    }
    let k = n >> 1
    while (k <= j) {
      j -= k
      k >>= 1
    }
    j += k
  }

  // Cooley-Tukey FFT
  for (let len = 2; len <= n; len *= 2) {
    const angle = ((2 * Math.PI) / len) * (inverse ? 1 : -1)
    const wlenRe = Math.cos(angle)
    const wlenIm = Math.sin(angle)

    for (let i = 0; i < n; i += len) {
      let wRe = 1
      let wIm = 0

      for (let jj = 0; jj < len / 2; jj++) {
        const u = buffer[i + jj]
        const v = buffer[i + jj + len / 2]

        // Complex multiplication: v * w
        const tRe = v.re * wRe - v.im * wIm
        const tIm = v.re * wIm + v.im * wRe

        buffer[i + jj] = {
          re: u.re + tRe,
          im: u.im + tIm,
        }
        buffer[i + jj + len / 2] = {
          re: u.re - tRe,
          im: u.im - tIm,
        }

        // Update w = w * wlen
        const newWRe = wRe * wlenRe - wIm * wlenIm
        wIm = wRe * wlenIm + wIm * wlenRe
        wRe = newWRe
      }
    }
  }
}

/**
 * JavaScript fallback implementation of 3D FFT
 */
function fft3dJS(
  inputReal: Float32Array,
  inputImag: Float32Array,
  size: number,
  inverse: boolean
): { real: Float32Array; imag: Float32Array } {
  const n = size
  const totalSize = n * n * n

  // Create complex buffer
  const buffer: Complex[] = new Array(totalSize)
  for (let i = 0; i < totalSize; i++) {
    buffer[i] = { re: inputReal[i], im: inputImag[i] }
  }

  // Transform along X-axis
  const rowBuffer: Complex[] = new Array(n)
  for (let z = 0; z < n; z++) {
    for (let y = 0; y < n; y++) {
      const start = z * n * n + y * n
      for (let x = 0; x < n; x++) {
        rowBuffer[x] = buffer[start + x]
      }
      fft1d(rowBuffer, inverse)
      for (let x = 0; x < n; x++) {
        buffer[start + x] = rowBuffer[x]
      }
    }
  }

  // Transform along Y-axis
  const colBuffer: Complex[] = new Array(n)
  for (let z = 0; z < n; z++) {
    for (let x = 0; x < n; x++) {
      for (let y = 0; y < n; y++) {
        colBuffer[y] = buffer[z * n * n + y * n + x]
      }
      fft1d(colBuffer, inverse)
      for (let y = 0; y < n; y++) {
        buffer[z * n * n + y * n + x] = colBuffer[y]
      }
    }
  }

  // Transform along Z-axis
  const depthBuffer: Complex[] = new Array(n)
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      for (let z = 0; z < n; z++) {
        depthBuffer[z] = buffer[z * n * n + y * n + x]
      }
      fft1d(depthBuffer, inverse)
      for (let z = 0; z < n; z++) {
        buffer[z * n * n + y * n + x] = depthBuffer[z]
      }
    }
  }

  // Normalize for inverse transform
  if (inverse) {
    const scale = 1 / totalSize
    for (let i = 0; i < totalSize; i++) {
      buffer[i].re *= scale
      buffer[i].im *= scale
    }
  }

  // Extract output
  const outputReal = new Float32Array(totalSize)
  const outputImag = new Float32Array(totalSize)
  for (let i = 0; i < totalSize; i++) {
    outputReal[i] = buffer[i].re
    outputImag[i] = buffer[i].im
  }

  return { real: outputReal, imag: outputImag }
}

/**
 * Calculate total energy using Parseval's theorem: E = Σ|c|²
 */
export function calculateEnergy(real: Float32Array, imag: Float32Array): number {
  if (real.length !== imag.length) {
    throw new Error('Real and imaginary arrays must have same length')
  }

  let energy = 0
  for (let i = 0; i < real.length; i++) {
    energy += real[i] * real[i] + imag[i] * imag[i]
  }
  return energy
}

/**
 * Validate FFT size
 */
function validateSize(size: number): asserts size is FFTSize {
  if (size !== 8 && size !== 16 && size !== 32) {
    throw new Error(`Unsupported FFT size: ${size}. Supported sizes: 8, 16, 32`)
  }
}

/**
 * 3D FFT Transformer class
 *
 * Provides high-performance 3D FFT operations using WebAssembly when available,
 * with automatic fallback to JavaScript implementation.
 *
 * @example
 * ```typescript
 * const fft = new FFT3D(8);
 * await fft.initialize();
 *
 * const input = { real: new Float32Array(512), imag: new Float32Array(512) };
 * input.real[0] = 1.0;
 *
 * const result = await fft.forward(input.real, input.imag);
 * console.log('Energy:', result.energy);
 *
 * const recovered = await fft.inverse(result.real, result.imag);
 * ```
 */
export class FFT3D {
  private readonly size: FFTSize
  private readonly totalSize: number
  private wasmModule: unknown = null
  private wasmInstance: unknown = null
  private initialized = false
  private useWasm: boolean

  /**
   * Create a new 3D FFT transformer
   * @param size - Size of each dimension (8, 16, or 32)
   */
  constructor(size: FFTSize = 8) {
    validateSize(size)
    this.size = size
    this.totalSize = size * size * size
    this.useWasm = isWasmSupported()
  }

  /**
   * Get the size of each dimension
   */
  getSize(): FFTSize {
    return this.size
  }

  /**
   * Get the total number of elements
   */
  getTotalSize(): number {
    return this.totalSize
  }

  /**
   * Check if using WebAssembly implementation
   */
  isUsingWasm(): boolean {
    return this.useWasm && this.wasmModule !== null
  }

  /**
   * Initialize the FFT module
   *
   * Attempts to load the WebAssembly module. If loading fails or WASM is not
   * supported, falls back to JavaScript implementation automatically.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    if (this.useWasm) {
      try {
        // Dynamic import of WASM module
        // In a real build, this would import the compiled WASM
        // For now, we'll use the JS fallback
        // const wasmModule = await import('../../wasm-fft/pkg/fft_wasm');
        // await wasmModule.default();
        // this.wasmModule = wasmModule;
        // this.wasmInstance = new wasmModule.FFT3D(this.size);

        // Currently using JS fallback until WASM is compiled
        this.useWasm = false
      } catch {
        // Fallback to JavaScript implementation
        this.useWasm = false
        this.wasmModule = null
        this.wasmInstance = null
      }
    }

    this.initialized = true
  }

  /**
   * Perform forward 3D FFT (space -> frequency)
   *
   * @param inputReal - Real parts of input (length must be size³)
   * @param inputImag - Imaginary parts of input (length must be size³)
   * @returns FFT result with real, imaginary parts and total energy
   */
  async forward(inputReal: Float32Array, inputImag: Float32Array): Promise<FFTResult> {
    if (!this.initialized) {
      await this.initialize()
    }

    this.validateInput(inputReal, inputImag)

    if (this.useWasm && this.wasmInstance) {
      // Use WASM implementation
      const wasmFFT = this.wasmInstance as {
        forward: (r: Float32Array, i: Float32Array) => Float32Array
      }
      const result = wasmFFT.forward(inputReal, inputImag)

      // Extract interleaved result
      const real = new Float32Array(this.totalSize)
      const imag = new Float32Array(this.totalSize)
      for (let j = 0; j < this.totalSize; j++) {
        real[j] = result[j * 2]
        imag[j] = result[j * 2 + 1]
      }

      const energy = calculateEnergy(real, imag)
      return { real, imag, energy }
    }

    // JavaScript fallback
    const result = fft3dJS(inputReal, inputImag, this.size, false)
    const energy = calculateEnergy(result.real, result.imag)
    return { ...result, energy }
  }

  /**
   * Perform inverse 3D FFT (frequency -> space)
   *
   * @param inputReal - Real parts of frequency coefficients (length must be size³)
   * @param inputImag - Imaginary parts of frequency coefficients (length must be size³)
   * @returns IFFT result with real, imaginary parts and total energy
   */
  async inverse(inputReal: Float32Array, inputImag: Float32Array): Promise<FFTResult> {
    if (!this.initialized) {
      await this.initialize()
    }

    this.validateInput(inputReal, inputImag)

    if (this.useWasm && this.wasmInstance) {
      // Use WASM implementation
      const wasmFFT = this.wasmInstance as {
        inverse: (r: Float32Array, i: Float32Array) => Float32Array
      }
      const result = wasmFFT.inverse(inputReal, inputImag)

      // Extract interleaved result
      const real = new Float32Array(this.totalSize)
      const imag = new Float32Array(this.totalSize)
      for (let j = 0; j < this.totalSize; j++) {
        real[j] = result[j * 2]
        imag[j] = result[j * 2 + 1]
      }

      const energy = calculateEnergy(real, imag)
      return { real, imag, energy }
    }

    // JavaScript fallback
    const result = fft3dJS(inputReal, inputImag, this.size, true)
    const energy = calculateEnergy(result.real, result.imag)
    return { ...result, energy }
  }

  /**
   * Validate input arrays
   */
  private validateInput(inputReal: Float32Array, inputImag: Float32Array): void {
    if (inputReal.length !== this.totalSize) {
      throw new Error(
        `Invalid input length: expected ${this.totalSize}, got ${inputReal.length} (real)`
      )
    }
    if (inputImag.length !== this.totalSize) {
      throw new Error(
        `Invalid input length: expected ${this.totalSize}, got ${inputImag.length} (imag)`
      )
    }
  }
}

/**
 * Create an FFT transformer with the specified size
 *
 * @param config - FFT configuration options
 * @returns Initialized FFT3D instance
 */
export async function createFFT(config: FFTConfig): Promise<FFT3D> {
  const fft = new FFT3D(config.size)
  await fft.initialize()
  return fft
}

/**
 * Quick forward FFT computation
 *
 * @param inputReal - Real parts of input
 * @param inputImag - Imaginary parts of input
 * @param size - FFT size (must match input length = size³)
 * @returns FFT result
 */
export async function forwardFFT(
  inputReal: Float32Array,
  inputImag: Float32Array,
  size: FFTSize = 8
): Promise<FFTResult> {
  const fft = await createFFT({ size })
  return fft.forward(inputReal, inputImag)
}

/**
 * Quick inverse FFT computation
 *
 * @param inputReal - Real parts of frequency coefficients
 * @param inputImag - Imaginary parts of frequency coefficients
 * @param size - FFT size (must match input length = size³)
 * @returns IFFT result
 */
export async function inverseFFT(
  inputReal: Float32Array,
  inputImag: Float32Array,
  size: FFTSize = 8
): Promise<FFTResult> {
  const fft = await createFFT({ size })
  return fft.inverse(inputReal, inputImag)
}

/**
 * Get the version of the FFT module
 */
export function getFFTVersion(): string {
  return '0.1.0'
}
