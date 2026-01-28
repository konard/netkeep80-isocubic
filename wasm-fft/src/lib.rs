//! # FFT WASM Module
//!
//! High-performance 3D FFT computations for WebAssembly.
//! This module provides forward and inverse 3D Fast Fourier Transform operations
//! optimized for browser execution.
//!
//! ## Supported Sizes
//! - 8x8x8 (512 complex values)
//! - 16x16x16 (4096 complex values)
//! - 32x32x32 (32768 complex values)

use wasm_bindgen::prelude::*;
use rustfft::{FftPlanner, Fft};
use num_complex::Complex;
use std::sync::Arc;

/// Initialize panic hook for better error messages in development
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// FFT Plan Cache
/// Caches FFT plans for reuse, improving performance for repeated transforms
#[wasm_bindgen]
pub struct FFTPlanCache {
    size_8: Option<(Arc<dyn Fft<f32>>, Arc<dyn Fft<f32>>)>,
    size_16: Option<(Arc<dyn Fft<f32>>, Arc<dyn Fft<f32>>)>,
    size_32: Option<(Arc<dyn Fft<f32>>, Arc<dyn Fft<f32>>)>,
    planner: FftPlanner<f32>,
}

#[wasm_bindgen]
impl FFTPlanCache {
    /// Create a new FFT plan cache
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        FFTPlanCache {
            size_8: None,
            size_16: None,
            size_32: None,
            planner: FftPlanner::new(),
        }
    }

    /// Get or create forward/inverse FFT plans for a given size
    fn get_plans(&mut self, size: usize) -> Result<(Arc<dyn Fft<f32>>, Arc<dyn Fft<f32>>), JsValue> {
        match size {
            8 => {
                if self.size_8.is_none() {
                    let fwd = self.planner.plan_fft_forward(8);
                    let inv = self.planner.plan_fft_inverse(8);
                    self.size_8 = Some((fwd, inv));
                }
                Ok(self.size_8.as_ref().unwrap().clone())
            }
            16 => {
                if self.size_16.is_none() {
                    let fwd = self.planner.plan_fft_forward(16);
                    let inv = self.planner.plan_fft_inverse(16);
                    self.size_16 = Some((fwd, inv));
                }
                Ok(self.size_16.as_ref().unwrap().clone())
            }
            32 => {
                if self.size_32.is_none() {
                    let fwd = self.planner.plan_fft_forward(32);
                    let inv = self.planner.plan_fft_inverse(32);
                    self.size_32 = Some((fwd, inv));
                }
                Ok(self.size_32.as_ref().unwrap().clone())
            }
            _ => Err(JsValue::from_str(&format!(
                "Unsupported FFT size: {}. Supported sizes: 8, 16, 32",
                size
            ))),
        }
    }
}

impl Default for FFTPlanCache {
    fn default() -> Self {
        Self::new()
    }
}

/// 3D FFT Transformer
/// Performs forward and inverse 3D FFT transformations
#[wasm_bindgen]
pub struct FFT3D {
    size: usize,
    total_size: usize,
    plan_cache: FFTPlanCache,
}

#[wasm_bindgen]
impl FFT3D {
    /// Create a new 3D FFT transformer
    ///
    /// # Arguments
    /// * `size` - Size of each dimension (8, 16, or 32)
    ///
    /// # Returns
    /// * `Result<FFT3D, JsValue>` - The transformer or an error
    #[wasm_bindgen(constructor)]
    pub fn new(size: usize) -> Result<FFT3D, JsValue> {
        if size != 8 && size != 16 && size != 32 {
            return Err(JsValue::from_str(&format!(
                "Unsupported FFT size: {}. Supported sizes: 8, 16, 32",
                size
            )));
        }

        Ok(FFT3D {
            size,
            total_size: size * size * size,
            plan_cache: FFTPlanCache::new(),
        })
    }

    /// Get the size of each dimension
    #[wasm_bindgen(getter)]
    pub fn size(&self) -> usize {
        self.size
    }

    /// Get the total number of elements
    #[wasm_bindgen(getter)]
    pub fn total_size(&self) -> usize {
        self.total_size
    }

    /// Perform forward 3D FFT (space -> frequency)
    ///
    /// # Arguments
    /// * `input_real` - Real parts of input (length must be size^3)
    /// * `input_imag` - Imaginary parts of input (length must be size^3)
    ///
    /// # Returns
    /// * `Float32Array` - Interleaved real/imag output (length = 2 * size^3)
    #[wasm_bindgen]
    pub fn forward(&mut self, input_real: &[f32], input_imag: &[f32]) -> Result<Vec<f32>, JsValue> {
        self.validate_input(input_real, input_imag)?;

        // Create complex buffer
        let mut buffer: Vec<Complex<f32>> = input_real
            .iter()
            .zip(input_imag.iter())
            .map(|(&re, &im)| Complex::new(re, im))
            .collect();

        // Perform 3D FFT
        self.fft_3d(&mut buffer, true)?;

        // Convert to interleaved output
        let output: Vec<f32> = buffer
            .iter()
            .flat_map(|c| [c.re, c.im])
            .collect();

        Ok(output)
    }

    /// Perform inverse 3D FFT (frequency -> space)
    ///
    /// # Arguments
    /// * `input_real` - Real parts of frequency coefficients (length must be size^3)
    /// * `input_imag` - Imaginary parts of frequency coefficients (length must be size^3)
    ///
    /// # Returns
    /// * `Float32Array` - Interleaved real/imag output (length = 2 * size^3)
    #[wasm_bindgen]
    pub fn inverse(&mut self, input_real: &[f32], input_imag: &[f32]) -> Result<Vec<f32>, JsValue> {
        self.validate_input(input_real, input_imag)?;

        // Create complex buffer
        let mut buffer: Vec<Complex<f32>> = input_real
            .iter()
            .zip(input_imag.iter())
            .map(|(&re, &im)| Complex::new(re, im))
            .collect();

        // Perform inverse 3D FFT
        self.fft_3d(&mut buffer, false)?;

        // Normalize by total size (standard IFFT normalization)
        let scale = 1.0 / (self.total_size as f32);
        for c in &mut buffer {
            c.re *= scale;
            c.im *= scale;
        }

        // Convert to interleaved output
        let output: Vec<f32> = buffer
            .iter()
            .flat_map(|c| [c.re, c.im])
            .collect();

        Ok(output)
    }

    /// Validate input arrays
    fn validate_input(&self, input_real: &[f32], input_imag: &[f32]) -> Result<(), JsValue> {
        if input_real.len() != self.total_size {
            return Err(JsValue::from_str(&format!(
                "Invalid input length: expected {}, got {} (real)",
                self.total_size,
                input_real.len()
            )));
        }
        if input_imag.len() != self.total_size {
            return Err(JsValue::from_str(&format!(
                "Invalid input length: expected {}, got {} (imag)",
                self.total_size,
                input_imag.len()
            )));
        }
        Ok(())
    }

    /// Perform 3D FFT by applying 1D FFT along each axis
    fn fft_3d(&mut self, buffer: &mut [Complex<f32>], forward: bool) -> Result<(), JsValue> {
        let (fft_forward, fft_inverse) = self.plan_cache.get_plans(self.size)?;
        let fft = if forward { &fft_forward } else { &fft_inverse };

        let n = self.size;

        // Allocate scratch buffer once
        let mut scratch = vec![Complex::new(0.0f32, 0.0f32); n];

        // Transform along X-axis
        for z in 0..n {
            for y in 0..n {
                let start = z * n * n + y * n;
                fft.process_with_scratch(&mut buffer[start..start + n], &mut scratch);
            }
        }

        // Transform along Y-axis
        for z in 0..n {
            for x in 0..n {
                // Gather Y-slice
                let mut slice: Vec<Complex<f32>> = (0..n)
                    .map(|y| buffer[z * n * n + y * n + x])
                    .collect();

                fft.process_with_scratch(&mut slice, &mut scratch);

                // Scatter back
                for y in 0..n {
                    buffer[z * n * n + y * n + x] = slice[y];
                }
            }
        }

        // Transform along Z-axis
        for y in 0..n {
            for x in 0..n {
                // Gather Z-slice
                let mut slice: Vec<Complex<f32>> = (0..n)
                    .map(|z| buffer[z * n * n + y * n + x])
                    .collect();

                fft.process_with_scratch(&mut slice, &mut scratch);

                // Scatter back
                for z in 0..n {
                    buffer[z * n * n + y * n + x] = slice[z];
                }
            }
        }

        Ok(())
    }
}

/// Calculate total energy using Parseval's theorem
/// E = sum(|coefficient|^2)
///
/// # Arguments
/// * `coefficients_real` - Real parts of FFT coefficients
/// * `coefficients_imag` - Imaginary parts of FFT coefficients
///
/// # Returns
/// * `f32` - Total energy
#[wasm_bindgen]
pub fn calculate_energy(coefficients_real: &[f32], coefficients_imag: &[f32]) -> Result<f32, JsValue> {
    if coefficients_real.len() != coefficients_imag.len() {
        return Err(JsValue::from_str("Real and imaginary arrays must have same length"));
    }

    let energy: f32 = coefficients_real
        .iter()
        .zip(coefficients_imag.iter())
        .map(|(&re, &im)| re * re + im * im)
        .sum();

    Ok(energy)
}

/// Get version information
#[wasm_bindgen]
pub fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fft_creation() {
        let fft = FFT3D::new(8);
        assert!(fft.is_ok());

        let fft = fft.unwrap();
        assert_eq!(fft.size(), 8);
        assert_eq!(fft.total_size(), 512);
    }

    #[test]
    fn test_fft_invalid_size() {
        let fft = FFT3D::new(5);
        assert!(fft.is_err());
    }

    #[test]
    fn test_forward_inverse_roundtrip() {
        let mut fft = FFT3D::new(8).unwrap();
        let size = 512;

        // Create test data (real impulse at origin)
        let mut input_real = vec![0.0f32; size];
        let input_imag = vec![0.0f32; size];
        input_real[0] = 1.0;

        // Forward transform
        let forward = fft.forward(&input_real, &input_imag).unwrap();

        // Extract real and imaginary parts
        let fwd_real: Vec<f32> = forward.iter().step_by(2).copied().collect();
        let fwd_imag: Vec<f32> = forward.iter().skip(1).step_by(2).copied().collect();

        // Inverse transform
        let inverse = fft.inverse(&fwd_real, &fwd_imag).unwrap();

        // Extract result
        let inv_real: Vec<f32> = inverse.iter().step_by(2).copied().collect();

        // Check roundtrip (should recover original impulse)
        assert!((inv_real[0] - 1.0).abs() < 1e-5, "Expected ~1.0, got {}", inv_real[0]);

        // Other values should be near zero
        for i in 1..size {
            assert!(inv_real[i].abs() < 1e-5, "Expected ~0.0 at {}, got {}", i, inv_real[i]);
        }
    }

    #[test]
    fn test_energy_calculation() {
        let real = vec![1.0, 2.0, 3.0];
        let imag = vec![0.0, 0.0, 0.0];

        let energy = calculate_energy(&real, &imag).unwrap();
        // 1^2 + 2^2 + 3^2 = 1 + 4 + 9 = 14
        assert!((energy - 14.0).abs() < 1e-5);
    }

    #[test]
    fn test_energy_with_complex() {
        let real = vec![3.0, 0.0];
        let imag = vec![4.0, 5.0];

        let energy = calculate_energy(&real, &imag).unwrap();
        // 3^2 + 4^2 + 0^2 + 5^2 = 9 + 16 + 0 + 25 = 50
        assert!((energy - 50.0).abs() < 1e-5);
    }
}
