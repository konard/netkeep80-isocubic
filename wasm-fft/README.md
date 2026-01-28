# FFT WASM Module

High-performance 3D FFT computations for WebAssembly.

## Overview

This module provides forward and inverse 3D Fast Fourier Transform operations optimized for browser execution. It uses the `rustfft` library for efficient FFT computations and compiles to WebAssembly for use in the browser.

## Supported Sizes

- 8x8x8 (512 complex values) - recommended for mobile devices
- 16x16x16 (4096 complex values) - standard quality
- 32x32x32 (32768 complex values) - high quality

## Building

### Prerequisites

1. Install Rust: https://rustup.rs/
2. Install wasm-pack: `cargo install wasm-pack`

### Build Commands

```bash
# Build for bundler (webpack/vite)
wasm-pack build --target bundler --release

# Build for web (ESM)
wasm-pack build --target web --release

# Build for Node.js
wasm-pack build --target nodejs --release
```

### Output

The built files will be in the `pkg/` directory:
- `fft_wasm_bg.wasm` - The WebAssembly binary
- `fft_wasm.js` - JavaScript bindings
- `fft_wasm.d.ts` - TypeScript declarations

## Usage

```typescript
import init, { FFT3D, calculate_energy } from 'fft-wasm';

// Initialize the WASM module
await init();

// Create a 3D FFT transformer
const fft = new FFT3D(8); // 8x8x8 cube

// Prepare input data (512 real values + 512 imaginary values)
const inputReal = new Float32Array(512);
const inputImag = new Float32Array(512);

// Set some values...
inputReal[0] = 1.0;

// Forward transform (space -> frequency)
const result = fft.forward(inputReal, inputImag);

// Result is interleaved [re0, im0, re1, im1, ...]
const outputReal = result.filter((_, i) => i % 2 === 0);
const outputImag = result.filter((_, i) => i % 2 === 1);

// Calculate total energy
const energy = calculate_energy(outputReal, outputImag);

// Inverse transform (frequency -> space)
const recovered = fft.inverse(outputReal, outputImag);
```

## API Reference

### `FFT3D`

Main class for 3D FFT operations.

#### Constructor
```typescript
new FFT3D(size: number): FFT3D
```
- `size`: Dimension size (8, 16, or 32)

#### Properties
- `size: number` - Size of each dimension
- `total_size: number` - Total number of elements (size^3)

#### Methods

**`forward(inputReal: Float32Array, inputImag: Float32Array): Float32Array`**

Perform forward 3D FFT (space -> frequency).

- Returns interleaved real/imaginary values

**`inverse(inputReal: Float32Array, inputImag: Float32Array): Float32Array`**

Perform inverse 3D FFT (frequency -> space).

- Returns normalized, interleaved real/imaginary values

### `calculate_energy(real: Float32Array, imag: Float32Array): number`

Calculate total energy using Parseval's theorem: E = Σ|c|²

### `get_version(): string`

Get the version of the WASM module.

## Performance

Benchmark results on average desktop:
- 8x8x8 FFT: < 1ms
- 16x16x16 FFT: ~2-3ms
- 32x32x32 FFT: ~10-15ms

Compressed binary size: ~50KB (gzipped)

## Testing

```bash
# Run Rust unit tests
cargo test

# Run WASM tests in browser
wasm-pack test --headless --chrome
```

## License

MIT License
