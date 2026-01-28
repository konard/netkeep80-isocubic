/**
 * Unit tests for performance utilities
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  throttle,
  debounce,
  detectDeviceCapabilities,
  getRecommendedQuality,
  getRenderingSettings,
  FrameRateMonitor,
  lazyLoad,
  requestIdleCallback,
  cancelIdleCallback,
  type DeviceCapabilities,
} from './performance'

describe('Performance Utilities', () => {
  describe('throttle', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should execute function immediately on first call', () => {
      const fn = vi.fn()
      const throttled = throttle(fn, 100)

      throttled()
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should not execute function within throttle limit', () => {
      const fn = vi.fn()
      const throttled = throttle(fn, 100)

      throttled()
      throttled()
      throttled()

      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should execute again after throttle limit expires', () => {
      const fn = vi.fn()
      const throttled = throttle(fn, 100)

      throttled()
      expect(fn).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(100)
      throttled()
      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('should pass arguments to the throttled function', () => {
      const fn = vi.fn()
      const throttled = throttle(fn, 100)

      throttled('arg1', 'arg2')
      expect(fn).toHaveBeenCalledWith('arg1', 'arg2')
    })

    it('should preserve context when called', () => {
      const obj = {
        value: 42,
        fn: vi.fn(function (this: { value: number }) {
          return this.value
        }),
      }
      const throttled = throttle(obj.fn, 100)

      throttled.call(obj)
      expect(obj.fn).toHaveBeenCalled()
    })
  })

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should not execute immediately', () => {
      const fn = vi.fn()
      const debounced = debounce(fn, 100)

      debounced()
      expect(fn).not.toHaveBeenCalled()
    })

    it('should execute after wait period', () => {
      const fn = vi.fn()
      const debounced = debounce(fn, 100)

      debounced()
      vi.advanceTimersByTime(100)

      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should reset timer on subsequent calls', () => {
      const fn = vi.fn()
      const debounced = debounce(fn, 100)

      debounced()
      vi.advanceTimersByTime(50)
      debounced()
      vi.advanceTimersByTime(50)

      expect(fn).not.toHaveBeenCalled()

      vi.advanceTimersByTime(50)
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should pass arguments from last call', () => {
      const fn = vi.fn()
      const debounced = debounce(fn, 100)

      debounced('first')
      debounced('second')
      debounced('third')
      vi.advanceTimersByTime(100)

      expect(fn).toHaveBeenCalledWith('third')
    })
  })

  describe('detectDeviceCapabilities', () => {
    it('should return valid DeviceCapabilities object', () => {
      const capabilities = detectDeviceCapabilities()

      expect(capabilities).toHaveProperty('pixelRatio')
      expect(capabilities).toHaveProperty('hasTouch')
      expect(capabilities).toHaveProperty('prefersReducedMotion')
      expect(capabilities).toHaveProperty('hardwareConcurrency')
      expect(capabilities).toHaveProperty('deviceMemory')
      expect(capabilities).toHaveProperty('isLowEnd')
      expect(capabilities).toHaveProperty('recommendedResolution')
    })

    it('should have valid pixelRatio', () => {
      const capabilities = detectDeviceCapabilities()
      expect(capabilities.pixelRatio).toBeGreaterThan(0)
    })

    it('should have valid hardwareConcurrency', () => {
      const capabilities = detectDeviceCapabilities()
      expect(capabilities.hardwareConcurrency).toBeGreaterThanOrEqual(1)
    })

    it('should have valid recommendedResolution between 0 and 1', () => {
      const capabilities = detectDeviceCapabilities()
      expect(capabilities.recommendedResolution).toBeGreaterThanOrEqual(0.5)
      expect(capabilities.recommendedResolution).toBeLessThanOrEqual(1)
    })

    it('should have boolean hasTouch', () => {
      const capabilities = detectDeviceCapabilities()
      expect(typeof capabilities.hasTouch).toBe('boolean')
    })

    it('should have boolean isLowEnd', () => {
      const capabilities = detectDeviceCapabilities()
      expect(typeof capabilities.isLowEnd).toBe('boolean')
    })
  })

  describe('getRecommendedQuality', () => {
    it('should return low for low-end devices', () => {
      const capabilities: DeviceCapabilities = {
        pixelRatio: 1,
        hasTouch: true,
        prefersReducedMotion: false,
        hardwareConcurrency: 2,
        deviceMemory: 2,
        isLowEnd: true,
        recommendedResolution: 0.5,
      }

      expect(getRecommendedQuality(capabilities)).toBe('low')
    })

    it('should return low for devices with reduced motion preference', () => {
      const capabilities: DeviceCapabilities = {
        pixelRatio: 2,
        hasTouch: false,
        prefersReducedMotion: true,
        hardwareConcurrency: 8,
        deviceMemory: 8,
        isLowEnd: false,
        recommendedResolution: 1,
      }

      expect(getRecommendedQuality(capabilities)).toBe('low')
    })

    it('should return medium for touch devices that are not low-end', () => {
      const capabilities: DeviceCapabilities = {
        pixelRatio: 2,
        hasTouch: true,
        prefersReducedMotion: false,
        hardwareConcurrency: 4,
        deviceMemory: 4,
        isLowEnd: false,
        recommendedResolution: 0.75,
      }

      expect(getRecommendedQuality(capabilities)).toBe('medium')
    })

    it('should return high for high-end desktop devices', () => {
      const capabilities: DeviceCapabilities = {
        pixelRatio: 2,
        hasTouch: false,
        prefersReducedMotion: false,
        hardwareConcurrency: 8,
        deviceMemory: 16,
        isLowEnd: false,
        recommendedResolution: 1,
      }

      expect(getRecommendedQuality(capabilities)).toBe('high')
    })
  })

  describe('getRenderingSettings', () => {
    it('should return correct settings for low quality', () => {
      const settings = getRenderingSettings('low')

      expect(settings.resolutionScale).toBe(0.5)
      expect(settings.noiseOctaves).toBe(2)
      expect(settings.enableShadows).toBe(false)
      expect(settings.targetFPS).toBe(30)
      expect(settings.enableAntialias).toBe(false)
    })

    it('should return correct settings for medium quality', () => {
      const settings = getRenderingSettings('medium')

      expect(settings.resolutionScale).toBe(0.75)
      expect(settings.noiseOctaves).toBe(3)
      expect(settings.enableShadows).toBe(true)
      expect(settings.targetFPS).toBe(60)
      expect(settings.enableAntialias).toBe(false)
    })

    it('should return correct settings for high quality', () => {
      const settings = getRenderingSettings('high')

      expect(settings.resolutionScale).toBe(1.0)
      expect(settings.noiseOctaves).toBe(4)
      expect(settings.enableShadows).toBe(true)
      expect(settings.targetFPS).toBe(60)
      expect(settings.enableAntialias).toBe(true)
    })
  })

  describe('FrameRateMonitor', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return default 60 FPS when no frames recorded', () => {
      const monitor = new FrameRateMonitor()
      expect(monitor.getAverageFPS()).toBe(60)
    })

    it('should calculate correct average FPS', () => {
      const monitor = new FrameRateMonitor(10)

      // Simulate frames at 60 FPS (16.67ms per frame)
      for (let i = 0; i < 10; i++) {
        vi.setSystemTime(new Date(i * 16.67))
        monitor.recordFrame()
      }

      // FPS should be close to 60
      const fps = monitor.getAverageFPS()
      expect(fps).toBeGreaterThan(55)
      expect(fps).toBeLessThan(65)
    })

    it('should limit samples to sampleSize', () => {
      const monitor = new FrameRateMonitor(5)

      // Record more frames than sample size
      for (let i = 0; i < 20; i++) {
        vi.setSystemTime(new Date(i * 16.67))
        monitor.recordFrame()
      }

      // Should still work correctly (internal frames array limited)
      const fps = monitor.getAverageFPS()
      expect(fps).toBeGreaterThan(0)
    })

    it('should correctly detect below threshold FPS', () => {
      const monitor = new FrameRateMonitor(5)

      // Manually simulate slow frame times by mocking performance.now
      let mockTime = 0
      vi.spyOn(performance, 'now').mockImplementation(() => {
        const current = mockTime
        mockTime += 50 // 50ms per frame = 20 FPS
        return current
      })

      // Record multiple frames to build up the average
      for (let i = 0; i < 6; i++) {
        monitor.recordFrame()
      }

      // At 20 FPS, it should be below 30 FPS threshold
      expect(monitor.getAverageFPS()).toBeLessThan(30)
      expect(monitor.isBelowThreshold(30)).toBe(true)
      expect(monitor.isBelowThreshold(15)).toBe(false)

      vi.restoreAllMocks()
    })

    it('should reset properly', () => {
      const monitor = new FrameRateMonitor()

      // Record some frames
      vi.setSystemTime(new Date(0))
      monitor.recordFrame()
      vi.setSystemTime(new Date(16.67))
      monitor.recordFrame()

      // Reset
      monitor.reset()

      // Should return default FPS
      expect(monitor.getAverageFPS()).toBe(60)
    })
  })

  describe('lazyLoad', () => {
    it('should load module successfully', async () => {
      const mockModule = { default: { value: 'test' } }
      const importFn = vi.fn().mockResolvedValue(mockModule)

      const result = await lazyLoad(importFn)
      expect(result).toEqual({ value: 'test' })
    })

    it('should reject on timeout', async () => {
      vi.useFakeTimers()

      const importFn = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ default: 'test' }), 15000)
          })
      )

      const promise = lazyLoad(importFn, 5000)
      vi.advanceTimersByTime(5000)

      await expect(promise).rejects.toThrow('Module load timeout')

      vi.useRealTimers()
    })

    it('should reject on import error', async () => {
      const importFn = vi.fn().mockRejectedValue(new Error('Import failed'))

      await expect(lazyLoad(importFn)).rejects.toThrow('Import failed')
    })
  })

  describe('requestIdleCallback / cancelIdleCallback', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should call callback', () => {
      const callback = vi.fn()

      requestIdleCallback(callback)
      vi.advanceTimersByTime(10)

      expect(callback).toHaveBeenCalled()
    })

    it('should provide deadline object to callback', () => {
      const callback = vi.fn()

      requestIdleCallback(callback)
      vi.advanceTimersByTime(10)

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          didTimeout: expect.any(Boolean),
          timeRemaining: expect.any(Function),
        })
      )
    })

    it('should be cancellable', () => {
      const callback = vi.fn()

      const handle = requestIdleCallback(callback)
      cancelIdleCallback(handle)
      vi.advanceTimersByTime(100)

      expect(callback).not.toHaveBeenCalled()
    })

    it('timeRemaining should return a number', () => {
      let remainingTime: number = -1
      const callback = vi.fn((deadline) => {
        remainingTime = deadline.timeRemaining()
      })

      requestIdleCallback(callback)
      vi.advanceTimersByTime(10)

      expect(remainingTime).toBeGreaterThanOrEqual(0)
    })
  })
})
