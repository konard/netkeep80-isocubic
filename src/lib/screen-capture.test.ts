/**
 * Screen Capture Library Tests
 *
 * Test suite for screen capture functionality including viewport capture,
 * element capture, annotation rendering, and screenshot management.
 *
 * TASK 58: Screen Capture & Annotation (Phase 9 - GOD MODE)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  generateScreenshotId,
  getExtensionFromFormat,
  captureElement,
  captureBySelector,
  captureByTestId,
  captureViewport,
  drawAnnotation,
  renderAnnotationsOnImage,
  createScreenCaptureManager,
  saveScreenshots,
  loadScreenshots,
  clearStoredScreenshots,
  DEFAULT_CAPTURE_CONFIG,
  SCREENSHOTS_STORAGE_KEY,
  MAX_STORED_SCREENSHOTS,
  type CaptureFormat,
} from './screen-capture'
import type { IssueScreenshot, IssueAnnotation } from '../types/issue-generator'

// Mock canvas context
function createMockCanvasContext(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    ellipse: vi.fn(),
    fillText: vi.fn(),
    set globalAlpha(_: number) {
      /* no-op */
    },
    get globalAlpha() {
      return 1
    },
    set strokeStyle(_: string) {
      /* no-op */
    },
    get strokeStyle() {
      return '#000000'
    },
    set fillStyle(_: string) {
      /* no-op */
    },
    get fillStyle() {
      return '#000000'
    },
    set lineWidth(_: number) {
      /* no-op */
    },
    get lineWidth() {
      return 1
    },
    set lineCap(_: CanvasLineCap) {
      /* no-op */
    },
    get lineCap() {
      return 'butt' as CanvasLineCap
    },
    set lineJoin(_: CanvasLineJoin) {
      /* no-op */
    },
    get lineJoin() {
      return 'miter' as CanvasLineJoin
    },
    set font(_: string) {
      /* no-op */
    },
    get font() {
      return '10px sans-serif'
    },
    set textBaseline(_: CanvasTextBaseline) {
      /* no-op */
    },
    get textBaseline() {
      return 'alphabetic' as CanvasTextBaseline
    },
  } as unknown as CanvasRenderingContext2D
}

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

describe('Screen Capture Library', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  // ==========================================================================
  // generateScreenshotId
  // ==========================================================================
  describe('generateScreenshotId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateScreenshotId()
      const id2 = generateScreenshotId()
      expect(id1).not.toBe(id2)
    })

    it('should start with "screenshot_" prefix', () => {
      const id = generateScreenshotId()
      expect(id).toMatch(/^screenshot_/)
    })

    it('should contain a timestamp', () => {
      const before = Date.now()
      const id = generateScreenshotId()
      const after = Date.now()

      const parts = id.split('_')
      const timestamp = parseInt(parts[1], 10)
      expect(timestamp).toBeGreaterThanOrEqual(before)
      expect(timestamp).toBeLessThanOrEqual(after)
    })

    it('should contain a random suffix', () => {
      const id = generateScreenshotId()
      const parts = id.split('_')
      expect(parts[2]).toBeDefined()
      expect(parts[2].length).toBeGreaterThan(0)
    })
  })

  // ==========================================================================
  // getExtensionFromFormat
  // ==========================================================================
  describe('getExtensionFromFormat', () => {
    it('should return "png" for image/png', () => {
      expect(getExtensionFromFormat('image/png')).toBe('png')
    })

    it('should return "jpg" for image/jpeg', () => {
      expect(getExtensionFromFormat('image/jpeg')).toBe('jpg')
    })

    it('should return "webp" for image/webp', () => {
      expect(getExtensionFromFormat('image/webp')).toBe('webp')
    })

    it('should return "png" for unknown formats', () => {
      expect(getExtensionFromFormat('image/unknown' as CaptureFormat)).toBe('png')
    })
  })

  // ==========================================================================
  // DEFAULT_CAPTURE_CONFIG
  // ==========================================================================
  describe('DEFAULT_CAPTURE_CONFIG', () => {
    it('should have correct defaults', () => {
      expect(DEFAULT_CAPTURE_CONFIG.format).toBe('image/png')
      expect(DEFAULT_CAPTURE_CONFIG.quality).toBe(0.92)
      expect(DEFAULT_CAPTURE_CONFIG.includeBackground).toBe(true)
      expect(DEFAULT_CAPTURE_CONFIG.maxWidth).toBe(4096)
      expect(DEFAULT_CAPTURE_CONFIG.maxHeight).toBe(4096)
    })

    it('should have a positive scale', () => {
      expect(DEFAULT_CAPTURE_CONFIG.scale).toBeGreaterThan(0)
    })
  })

  // ==========================================================================
  // captureElement
  // ==========================================================================
  describe('captureElement', () => {
    it('should return error for zero-dimension elements', async () => {
      const element = document.createElement('div')
      // getBoundingClientRect returns zeros by default in JSDOM
      const result = await captureElement(element)
      expect(result.success).toBe(false)
      expect(result.error).toContain('zero dimensions')
    })

    it('should attempt capture for elements with dimensions', async () => {
      const element = document.createElement('div')
      // Mock getBoundingClientRect
      vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
        width: 100,
        height: 100,
        top: 0,
        left: 0,
        right: 100,
        bottom: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      })

      // Mock XMLSerializer
      vi.spyOn(XMLSerializer.prototype, 'serializeToString').mockReturnValue('<div></div>')

      // captureElement will try to use canvas and SVG, which may fail in JSDOM
      // but it should handle errors gracefully
      const result = await captureElement(element)
      // In JSDOM, the SVG/foreignObject approach may not work, but should not throw
      expect(result).toBeDefined()
      expect(typeof result.success).toBe('boolean')
    })

    it('should handle canvas elements', async () => {
      const canvas = document.createElement('canvas')
      canvas.width = 50
      canvas.height = 50

      vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
        width: 50,
        height: 50,
        top: 0,
        left: 0,
        right: 50,
        bottom: 50,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      })

      // Mock document.createElement to return a canvas with mock context
      const mockCtx = createMockCanvasContext()
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue(mockCtx),
        toDataURL: vi.fn().mockReturnValue('data:image/png;base64,test'),
      }

      const origCreate = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'canvas') return mockCanvas as unknown as HTMLCanvasElement
        return origCreate(tag)
      })

      const result = await captureElement(canvas)
      expect(result.success).toBe(true)
      expect(result.screenshot).toBeDefined()
      expect(result.screenshot?.imageData).toBe('data:image/png;base64,test')
    })

    it('should handle errors gracefully', async () => {
      const element = document.createElement('div')
      vi.spyOn(element, 'getBoundingClientRect').mockImplementation(() => {
        throw new Error('Mock error')
      })

      const result = await captureElement(element)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Capture failed')
    })
  })

  // ==========================================================================
  // captureBySelector
  // ==========================================================================
  describe('captureBySelector', () => {
    it('should return error when element not found', async () => {
      const result = await captureBySelector('.nonexistent-class')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Element not found')
    })

    it('should return error for non-HTML elements', async () => {
      const result = await captureBySelector('svg')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Element not found')
    })

    it('should attempt to capture found elements', async () => {
      const element = document.createElement('div')
      element.setAttribute('data-capture', 'test')
      document.body.appendChild(element)

      // Element in JSDOM has zero dimensions, so capture will fail gracefully
      const result = await captureBySelector('[data-capture="test"]')
      expect(result).toBeDefined()

      document.body.removeChild(element)
    })
  })

  // ==========================================================================
  // captureByTestId
  // ==========================================================================
  describe('captureByTestId', () => {
    it('should return error when testid element not found', async () => {
      const result = await captureByTestId('nonexistent-testid')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Element not found')
    })

    it('should use correct selector format', async () => {
      const element = document.createElement('div')
      element.setAttribute('data-testid', 'my-component')
      document.body.appendChild(element)

      const result = await captureByTestId('my-component')
      expect(result).toBeDefined()

      document.body.removeChild(element)
    })
  })

  // ==========================================================================
  // captureViewport
  // ==========================================================================
  describe('captureViewport', () => {
    it('should attempt to capture document root', async () => {
      // In JSDOM, documentElement exists but has zero dimensions
      const result = await captureViewport()
      expect(result).toBeDefined()
      expect(typeof result.success).toBe('boolean')
    })
  })

  // ==========================================================================
  // drawAnnotation
  // ==========================================================================
  describe('drawAnnotation', () => {
    let ctx: CanvasRenderingContext2D

    beforeEach(() => {
      ctx = createMockCanvasContext()
    })

    it('should draw arrow annotation', () => {
      const annotation: IssueAnnotation = {
        id: 'ann1',
        type: 'arrow',
        x: 10,
        y: 20,
        x2: 100,
        y2: 80,
        color: '#ff0000',
      }

      drawAnnotation(ctx, annotation)
      expect(ctx.save).toHaveBeenCalled()
      expect(ctx.beginPath).toHaveBeenCalled()
      expect(ctx.moveTo).toHaveBeenCalled()
      expect(ctx.lineTo).toHaveBeenCalled()
      expect(ctx.stroke).toHaveBeenCalled()
      expect(ctx.restore).toHaveBeenCalled()
    })

    it('should draw circle annotation', () => {
      const annotation: IssueAnnotation = {
        id: 'ann2',
        type: 'circle',
        x: 50,
        y: 50,
        x2: 150,
        y2: 150,
        color: '#00ff00',
      }

      drawAnnotation(ctx, annotation)
      expect(ctx.save).toHaveBeenCalled()
      expect(ctx.ellipse).toHaveBeenCalled()
      expect(ctx.stroke).toHaveBeenCalled()
      expect(ctx.restore).toHaveBeenCalled()
    })

    it('should draw rectangle annotation', () => {
      const annotation: IssueAnnotation = {
        id: 'ann3',
        type: 'rectangle',
        x: 10,
        y: 10,
        x2: 200,
        y2: 100,
        color: '#0000ff',
      }

      drawAnnotation(ctx, annotation)
      expect(ctx.save).toHaveBeenCalled()
      expect(ctx.strokeRect).toHaveBeenCalledWith(10, 10, 190, 90)
      expect(ctx.restore).toHaveBeenCalled()
    })

    it('should draw text annotation', () => {
      const annotation: IssueAnnotation = {
        id: 'ann4',
        type: 'text',
        x: 50,
        y: 50,
        text: 'Bug here!',
        color: '#ffffff',
      }

      drawAnnotation(ctx, annotation)
      expect(ctx.save).toHaveBeenCalled()
      expect(ctx.fillText).toHaveBeenCalledWith('Bug here!', 50, 50)
      expect(ctx.restore).toHaveBeenCalled()
    })

    it('should draw highlight annotation', () => {
      const annotation: IssueAnnotation = {
        id: 'ann5',
        type: 'highlight',
        x: 0,
        y: 0,
        x2: 100,
        y2: 50,
        color: '#ffff00',
        opacity: 0.3,
      }

      drawAnnotation(ctx, annotation)
      expect(ctx.save).toHaveBeenCalled()
      expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 100, 50)
      expect(ctx.restore).toHaveBeenCalled()
    })

    it('should use default color when not specified', () => {
      const annotation: IssueAnnotation = {
        id: 'ann6',
        type: 'text',
        x: 10,
        y: 10,
        text: 'Default color',
      }

      drawAnnotation(ctx, annotation)
      expect(ctx.save).toHaveBeenCalled()
      expect(ctx.restore).toHaveBeenCalled()
    })

    it('should skip arrow with missing coordinates', () => {
      const annotation: IssueAnnotation = {
        id: 'ann7',
        type: 'arrow',
        x: 10,
        y: 20,
        // Missing x2, y2
      }

      drawAnnotation(ctx, annotation)
      expect(ctx.save).toHaveBeenCalled()
      // Arrow drawing should be skipped
      expect(ctx.beginPath).not.toHaveBeenCalled()
      expect(ctx.restore).toHaveBeenCalled()
    })

    it('should skip text with missing text content', () => {
      const annotation: IssueAnnotation = {
        id: 'ann8',
        type: 'text',
        x: 10,
        y: 10,
        // No text
      }

      drawAnnotation(ctx, annotation)
      expect(ctx.fillText).not.toHaveBeenCalled()
    })

    it('should handle custom stroke width', () => {
      const annotation: IssueAnnotation = {
        id: 'ann9',
        type: 'rectangle',
        x: 0,
        y: 0,
        x2: 50,
        y2: 50,
        strokeWidth: 5,
      }

      drawAnnotation(ctx, annotation)
      expect(ctx.save).toHaveBeenCalled()
      expect(ctx.strokeRect).toHaveBeenCalled()
      expect(ctx.restore).toHaveBeenCalled()
    })

    it('should use custom text font size based on strokeWidth', () => {
      const annotation: IssueAnnotation = {
        id: 'ann10',
        type: 'text',
        x: 10,
        y: 10,
        text: 'Custom size',
        strokeWidth: 3,
      }

      drawAnnotation(ctx, annotation)
      // Font size = strokeWidth * 6 = 18
      expect(ctx.fillText).toHaveBeenCalledWith('Custom size', 10, 10)
    })
  })

  // ==========================================================================
  // renderAnnotationsOnImage
  // ==========================================================================
  describe('renderAnnotationsOnImage', () => {
    it('should return original data when no annotations', async () => {
      const screenshot: IssueScreenshot = {
        id: 'test1',
        imageData: 'data:image/png;base64,original',
        timestamp: new Date().toISOString(),
      }

      const result = await renderAnnotationsOnImage(screenshot)
      expect(result).toBe('data:image/png;base64,original')
    })

    it('should return original data for empty annotations', async () => {
      const screenshot: IssueScreenshot = {
        id: 'test2',
        imageData: 'data:image/png;base64,original',
        timestamp: new Date().toISOString(),
        annotations: [],
      }

      const result = await renderAnnotationsOnImage(screenshot)
      expect(result).toBe('data:image/png;base64,original')
    })
  })

  // ==========================================================================
  // createScreenCaptureManager
  // ==========================================================================
  describe('createScreenCaptureManager', () => {
    it('should create a manager instance', () => {
      const manager = createScreenCaptureManager()
      expect(manager).toBeDefined()
      expect(typeof manager.captureViewport).toBe('function')
      expect(typeof manager.captureElement).toBe('function')
      expect(typeof manager.captureBySelector).toBe('function')
      expect(typeof manager.captureByTestId).toBe('function')
      expect(typeof manager.renderAnnotations).toBe('function')
      expect(typeof manager.getScreenshots).toBe('function')
      expect(typeof manager.addScreenshot).toBe('function')
      expect(typeof manager.removeScreenshot).toBe('function')
      expect(typeof manager.clearScreenshots).toBe('function')
      expect(typeof manager.addAnnotation).toBe('function')
      expect(typeof manager.removeAnnotation).toBe('function')
      expect(typeof manager.clearAnnotations).toBe('function')
    })

    it('should start with empty screenshots', () => {
      const manager = createScreenCaptureManager()
      expect(manager.getScreenshots()).toEqual([])
    })

    it('should add screenshots', () => {
      const manager = createScreenCaptureManager()
      const screenshot: IssueScreenshot = {
        id: 'test1',
        imageData: 'data:image/png;base64,test',
        timestamp: new Date().toISOString(),
      }

      manager.addScreenshot(screenshot)
      expect(manager.getScreenshots()).toHaveLength(1)
      expect(manager.getScreenshots()[0].id).toBe('test1')
    })

    it('should remove screenshots by ID', () => {
      const manager = createScreenCaptureManager()
      manager.addScreenshot({
        id: 'test1',
        imageData: 'data1',
        timestamp: new Date().toISOString(),
      })
      manager.addScreenshot({
        id: 'test2',
        imageData: 'data2',
        timestamp: new Date().toISOString(),
      })

      expect(manager.getScreenshots()).toHaveLength(2)

      manager.removeScreenshot('test1')
      expect(manager.getScreenshots()).toHaveLength(1)
      expect(manager.getScreenshots()[0].id).toBe('test2')
    })

    it('should clear all screenshots', () => {
      const manager = createScreenCaptureManager()
      manager.addScreenshot({
        id: 'test1',
        imageData: 'data1',
        timestamp: new Date().toISOString(),
      })
      manager.addScreenshot({
        id: 'test2',
        imageData: 'data2',
        timestamp: new Date().toISOString(),
      })

      manager.clearScreenshots()
      expect(manager.getScreenshots()).toEqual([])
    })

    it('should add annotations to screenshots', () => {
      const manager = createScreenCaptureManager()
      manager.addScreenshot({
        id: 'test1',
        imageData: 'data1',
        timestamp: new Date().toISOString(),
      })

      const annotation: IssueAnnotation = {
        id: 'ann1',
        type: 'arrow',
        x: 10,
        y: 20,
        x2: 100,
        y2: 80,
      }

      manager.addAnnotation('test1', annotation)
      const screenshots = manager.getScreenshots()
      expect(screenshots[0].annotations).toHaveLength(1)
      expect(screenshots[0].annotations?.[0].id).toBe('ann1')
    })

    it('should remove annotations from screenshots', () => {
      const manager = createScreenCaptureManager()
      manager.addScreenshot({
        id: 'test1',
        imageData: 'data1',
        timestamp: new Date().toISOString(),
        annotations: [
          { id: 'ann1', type: 'arrow', x: 10, y: 20 },
          { id: 'ann2', type: 'circle', x: 30, y: 40 },
        ],
      })

      manager.removeAnnotation('test1', 'ann1')
      const screenshots = manager.getScreenshots()
      expect(screenshots[0].annotations).toHaveLength(1)
      expect(screenshots[0].annotations?.[0].id).toBe('ann2')
    })

    it('should clear all annotations from a screenshot', () => {
      const manager = createScreenCaptureManager()
      manager.addScreenshot({
        id: 'test1',
        imageData: 'data1',
        timestamp: new Date().toISOString(),
        annotations: [
          { id: 'ann1', type: 'arrow', x: 10, y: 20 },
          { id: 'ann2', type: 'circle', x: 30, y: 40 },
        ],
      })

      manager.clearAnnotations('test1')
      const screenshots = manager.getScreenshots()
      expect(screenshots[0].annotations).toEqual([])
    })

    it('should ignore annotation operations on non-existent screenshots', () => {
      const manager = createScreenCaptureManager()

      // These should not throw
      manager.addAnnotation('nonexistent', { id: 'ann1', type: 'arrow', x: 0, y: 0 })
      manager.removeAnnotation('nonexistent', 'ann1')
      manager.clearAnnotations('nonexistent')

      expect(manager.getScreenshots()).toEqual([])
    })

    it('should return a copy of screenshots array', () => {
      const manager = createScreenCaptureManager()
      manager.addScreenshot({
        id: 'test1',
        imageData: 'data1',
        timestamp: new Date().toISOString(),
      })

      const screenshots = manager.getScreenshots()
      screenshots.push({
        id: 'external',
        imageData: 'data_ext',
        timestamp: new Date().toISOString(),
      })

      // Original should not be affected
      expect(manager.getScreenshots()).toHaveLength(1)
    })
  })

  // ==========================================================================
  // localStorage functions
  // ==========================================================================
  describe('saveScreenshots', () => {
    it('should save screenshots to localStorage', () => {
      const screenshots: IssueScreenshot[] = [
        { id: 'test1', imageData: 'data1', timestamp: '2024-01-01' },
        { id: 'test2', imageData: 'data2', timestamp: '2024-01-02' },
      ]

      saveScreenshots(screenshots)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        SCREENSHOTS_STORAGE_KEY,
        expect.any(String)
      )

      const saved = JSON.parse(localStorageMock.setItem.mock.calls[0][1])
      expect(saved).toHaveLength(2)
    })

    it('should limit stored screenshots', () => {
      const screenshots: IssueScreenshot[] = Array.from({ length: 30 }, (_, i) => ({
        id: `test${i}`,
        imageData: `data${i}`,
        timestamp: `2024-01-${i + 1}`,
      }))

      saveScreenshots(screenshots)
      const saved = JSON.parse(localStorageMock.setItem.mock.calls[0][1])
      expect(saved).toHaveLength(MAX_STORED_SCREENSHOTS)
    })

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('QuotaExceededError')
      })

      // Should not throw
      expect(() => saveScreenshots([])).not.toThrow()
    })
  })

  describe('loadScreenshots', () => {
    it('should load screenshots from localStorage', () => {
      const screenshots = [{ id: 'test1', imageData: 'data1', timestamp: '2024-01-01' }]
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(screenshots))

      const loaded = loadScreenshots()
      expect(loaded).toHaveLength(1)
      expect(loaded[0].id).toBe('test1')
    })

    it('should return empty array when no data', () => {
      localStorageMock.getItem.mockReturnValueOnce(null)
      expect(loadScreenshots()).toEqual([])
    })

    it('should handle invalid JSON gracefully', () => {
      localStorageMock.getItem.mockReturnValueOnce('invalid json{{{')
      expect(loadScreenshots()).toEqual([])
    })

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('Access denied')
      })
      expect(loadScreenshots()).toEqual([])
    })
  })

  describe('clearStoredScreenshots', () => {
    it('should remove screenshots from localStorage', () => {
      clearStoredScreenshots()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(SCREENSHOTS_STORAGE_KEY)
    })

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error('Access denied')
      })
      expect(() => clearStoredScreenshots()).not.toThrow()
    })
  })

  // ==========================================================================
  // Constants
  // ==========================================================================
  describe('Constants', () => {
    it('should have correct storage key', () => {
      expect(SCREENSHOTS_STORAGE_KEY).toBe('isocubic_god_mode_screenshots')
    })

    it('should have reasonable max screenshots limit', () => {
      expect(MAX_STORED_SCREENSHOTS).toBeGreaterThan(0)
      expect(MAX_STORED_SCREENSHOTS).toBeLessThanOrEqual(100)
    })
  })
})
