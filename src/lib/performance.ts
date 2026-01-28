/**
 * Performance utilities for mobile optimization
 * Provides hooks and utilities for performance monitoring and optimization
 */

/**
 * Throttle function execution
 * Useful for limiting expensive operations like shader updates
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false

  return function (this: unknown, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

/**
 * Debounce function execution
 * Useful for delaying expensive operations until user stops interacting
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return function (this: unknown, ...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => {
      func.apply(this, args)
    }, wait)
  }
}

/**
 * Device capability detection
 */
export interface DeviceCapabilities {
  /** Device pixel ratio (higher = more pixels) */
  pixelRatio: number
  /** Whether device has touch capability */
  hasTouch: boolean
  /** Whether device prefers reduced motion */
  prefersReducedMotion: boolean
  /** Number of CPU cores available */
  hardwareConcurrency: number
  /** Device memory in GB (if available) */
  deviceMemory: number | null
  /** Whether the device is considered low-end */
  isLowEnd: boolean
  /** Recommended shader resolution multiplier */
  recommendedResolution: number
}

/**
 * Detect device capabilities for performance optimization
 */
export function detectDeviceCapabilities(): DeviceCapabilities {
  const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1

  const hasTouch =
    typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

  const hardwareConcurrency =
    typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4

  // Device memory API (Chrome only)
  const deviceMemory =
    typeof navigator !== 'undefined' && 'deviceMemory' in navigator
      ? ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null)
      : null

  // Determine if device is low-end
  const isLowEnd =
    hardwareConcurrency <= 2 ||
    (deviceMemory !== null && deviceMemory <= 2) ||
    (hasTouch && pixelRatio < 2)

  // Calculate recommended resolution multiplier for shaders
  let recommendedResolution = 1
  if (isLowEnd) {
    recommendedResolution = 0.5
  } else if (hasTouch && pixelRatio > 2) {
    recommendedResolution = 0.75
  } else if (pixelRatio > 2) {
    recommendedResolution = Math.min(1, 2 / pixelRatio)
  }

  return {
    pixelRatio,
    hasTouch,
    prefersReducedMotion,
    hardwareConcurrency,
    deviceMemory,
    isLowEnd,
    recommendedResolution,
  }
}

/**
 * Performance quality levels for shader rendering
 */
export type QualityLevel = 'low' | 'medium' | 'high'

/**
 * Get recommended quality level based on device capabilities
 */
export function getRecommendedQuality(capabilities: DeviceCapabilities): QualityLevel {
  if (capabilities.isLowEnd || capabilities.prefersReducedMotion) {
    return 'low'
  }
  if (capabilities.hasTouch) {
    return 'medium'
  }
  return 'high'
}

/**
 * Performance settings for rendering
 */
export interface RenderingSettings {
  /** Resolution multiplier (0.5 - 1.0) */
  resolutionScale: number
  /** Number of noise octaves for shaders */
  noiseOctaves: number
  /** Whether to enable shadows */
  enableShadows: boolean
  /** Max FPS target */
  targetFPS: number
  /** Whether to enable anti-aliasing */
  enableAntialias: boolean
}

/**
 * Get rendering settings for a quality level
 */
export function getRenderingSettings(quality: QualityLevel): RenderingSettings {
  switch (quality) {
    case 'low':
      return {
        resolutionScale: 0.5,
        noiseOctaves: 2,
        enableShadows: false,
        targetFPS: 30,
        enableAntialias: false,
      }
    case 'medium':
      return {
        resolutionScale: 0.75,
        noiseOctaves: 3,
        enableShadows: true,
        targetFPS: 60,
        enableAntialias: false,
      }
    case 'high':
    default:
      return {
        resolutionScale: 1.0,
        noiseOctaves: 4,
        enableShadows: true,
        targetFPS: 60,
        enableAntialias: true,
      }
  }
}

/**
 * Frame rate monitor for adaptive quality
 */
export class FrameRateMonitor {
  private frames: number[] = []
  private lastFrameTime = 0
  private readonly sampleSize: number

  constructor(sampleSize = 60) {
    this.sampleSize = sampleSize
  }

  /**
   * Record a frame
   */
  recordFrame(): void {
    const now = performance.now()
    if (this.lastFrameTime > 0) {
      const frameTime = now - this.lastFrameTime
      this.frames.push(frameTime)
      if (this.frames.length > this.sampleSize) {
        this.frames.shift()
      }
    }
    this.lastFrameTime = now
  }

  /**
   * Get average FPS over sample window
   */
  getAverageFPS(): number {
    if (this.frames.length === 0) return 60
    const avgFrameTime = this.frames.reduce((a, b) => a + b, 0) / this.frames.length
    return 1000 / avgFrameTime
  }

  /**
   * Check if FPS is below threshold
   */
  isBelowThreshold(threshold = 30): boolean {
    return this.getAverageFPS() < threshold
  }

  /**
   * Reset the monitor
   */
  reset(): void {
    this.frames = []
    this.lastFrameTime = 0
  }
}

/**
 * Lazy loading utility for heavy modules like TinyLLM
 */
export async function lazyLoad<T>(
  importFn: () => Promise<{ default: T }>,
  timeout = 10000
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Module load timeout')), timeout)
  })

  const modulePromise = importFn().then((m) => m.default)

  return Promise.race([modulePromise, timeoutPromise])
}

/**
 * Request idle callback polyfill
 */
export function requestIdleCallback(
  callback: IdleRequestCallback,
  options?: IdleRequestOptions
): number {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options)
  }

  // Fallback to setTimeout (use global setTimeout to avoid TypeScript narrowing issues)
  return setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (Date.now() % 50)),
    })
  }, 1) as unknown as number
}

/**
 * Cancel idle callback polyfill
 */
export function cancelIdleCallback(handle: number): void {
  if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
    window.cancelIdleCallback(handle)
  } else {
    // Use global clearTimeout to avoid TypeScript narrowing issues
    clearTimeout(handle)
  }
}
