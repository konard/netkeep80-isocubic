/**
 * Screen Capture Library
 *
 * Provides functionality for capturing screenshots of the current viewport
 * or individual DOM elements, and converting them to base64 image data
 * for attachment to GitHub issues.
 *
 * TASK 58: Screen Capture & Annotation (Phase 9 - GOD MODE)
 *
 * Features:
 * - Viewport screenshot capture using html2canvas-like Canvas API approach
 * - Individual component/element capture
 * - Base64 image encoding for GitHub issue attachment
 * - Screenshot metadata (resolution, viewport, timestamp)
 * - Configurable capture options (format, quality, scale)
 */

import type { IssueScreenshot, IssueAnnotation } from '../types/issue-generator'

/**
 * Capture format options
 */
export type CaptureFormat = 'image/png' | 'image/jpeg' | 'image/webp'

/**
 * Screen capture configuration
 */
export interface ScreenCaptureConfig {
  /** Image format (default: 'image/png') */
  format?: CaptureFormat
  /** Image quality for jpeg/webp (0-1, default: 0.92) */
  quality?: number
  /** Scale factor for high-DPI captures (default: window.devicePixelRatio) */
  scale?: number
  /** Whether to include background (default: true) */
  includeBackground?: boolean
  /** Maximum width for captured image (default: unlimited) */
  maxWidth?: number
  /** Maximum height for captured image (default: unlimited) */
  maxHeight?: number
}

/**
 * Default capture configuration
 */
export const DEFAULT_CAPTURE_CONFIG: Required<ScreenCaptureConfig> = {
  format: 'image/png',
  quality: 0.92,
  scale: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
  includeBackground: true,
  maxWidth: 4096,
  maxHeight: 4096,
}

/**
 * Result of a screen capture operation
 */
export interface CaptureResult {
  /** Whether capture succeeded */
  success: boolean
  /** The captured screenshot (if success) */
  screenshot?: IssueScreenshot
  /** Error message (if failed) */
  error?: string
}

/**
 * Generates a unique screenshot ID
 */
export function generateScreenshotId(): string {
  return `screenshot_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Gets the file extension from a MIME type
 */
export function getExtensionFromFormat(format: CaptureFormat): string {
  switch (format) {
    case 'image/png':
      return 'png'
    case 'image/jpeg':
      return 'jpg'
    case 'image/webp':
      return 'webp'
    default:
      return 'png'
  }
}

/**
 * Clamps a dimension to maximum bounds
 */
function clampDimension(value: number, max: number): number {
  return Math.min(Math.max(value, 1), max)
}

/**
 * Captures a screenshot of a DOM element using Canvas API.
 *
 * This uses a simplified rendering approach:
 * - For canvas elements: directly copies canvas content
 * - For other elements: renders element bounds to a new canvas using
 *   drawWindow-like approach or foreignObject SVG fallback
 *
 * @param element - The DOM element to capture
 * @param config - Capture configuration
 * @returns Promise<CaptureResult> with screenshot data
 */
export async function captureElement(
  element: HTMLElement,
  config: Partial<ScreenCaptureConfig> = {}
): Promise<CaptureResult> {
  const mergedConfig = { ...DEFAULT_CAPTURE_CONFIG, ...config }

  try {
    const rect = element.getBoundingClientRect()

    if (rect.width === 0 || rect.height === 0) {
      return {
        success: false,
        error: 'Element has zero dimensions',
      }
    }

    const captureWidth = clampDimension(
      Math.round(rect.width * mergedConfig.scale),
      mergedConfig.maxWidth
    )
    const captureHeight = clampDimension(
      Math.round(rect.height * mergedConfig.scale),
      mergedConfig.maxHeight
    )

    // Check if element is a canvas — direct copy
    if (element instanceof HTMLCanvasElement) {
      return captureCanvasElement(element, mergedConfig, captureWidth, captureHeight)
    }

    // Use foreignObject SVG approach for general DOM elements
    return await captureDomElement(element, mergedConfig, rect, captureWidth, captureHeight)
  } catch (error) {
    return {
      success: false,
      error: `Capture failed: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Captures a canvas element directly
 */
function captureCanvasElement(
  canvas: HTMLCanvasElement,
  config: Required<ScreenCaptureConfig>,
  width: number,
  height: number
): CaptureResult {
  try {
    const outputCanvas = document.createElement('canvas')
    outputCanvas.width = width
    outputCanvas.height = height
    const ctx = outputCanvas.getContext('2d')

    if (!ctx) {
      return { success: false, error: 'Failed to get canvas context' }
    }

    ctx.drawImage(canvas, 0, 0, width, height)

    const imageData = outputCanvas.toDataURL(config.format, config.quality)

    return {
      success: true,
      screenshot: createScreenshotMetadata(imageData, config, width, height),
    }
  } catch (error) {
    return {
      success: false,
      error: `Canvas capture failed: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Captures a DOM element using SVG foreignObject approach
 */
async function captureDomElement(
  element: HTMLElement,
  config: Required<ScreenCaptureConfig>,
  rect: DOMRect,
  width: number,
  height: number
): Promise<CaptureResult> {
  try {
    // Serialize the element to XML for SVG foreignObject
    const serializer = new XMLSerializer()
    const clone = element.cloneNode(true) as HTMLElement

    // Apply computed styles to clone for accurate rendering
    applyComputedStyles(element, clone)

    const xhtml = serializer.serializeToString(clone)

    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml">${xhtml}</div>
        </foreignObject>
      </svg>
    `.trim()

    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    try {
      const img = await loadImage(url)

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        return { success: false, error: 'Failed to get canvas context' }
      }

      if (config.includeBackground) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
      }

      ctx.drawImage(img, 0, 0, width, height)

      const imageData = canvas.toDataURL(config.format, config.quality)

      return {
        success: true,
        screenshot: createScreenshotMetadata(imageData, config, width, height),
      }
    } finally {
      URL.revokeObjectURL(url)
    }
  } catch (error) {
    return {
      success: false,
      error: `DOM capture failed: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Loads an image from a URL
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = url
  })
}

/**
 * Applies computed styles from source element to target element
 */
function applyComputedStyles(source: HTMLElement, target: HTMLElement): void {
  try {
    const computed = window.getComputedStyle(source)
    const importantStyles = [
      'font-family',
      'font-size',
      'color',
      'background-color',
      'background',
      'border',
      'padding',
      'margin',
      'display',
      'flex-direction',
      'align-items',
      'justify-content',
      'gap',
      'width',
      'height',
      'overflow',
      'position',
    ]

    for (const prop of importantStyles) {
      const value = computed.getPropertyValue(prop)
      if (value) {
        target.style.setProperty(prop, value)
      }
    }
  } catch {
    // Ignore style application errors (e.g., in test environments)
  }
}

/**
 * Creates screenshot metadata object
 */
function createScreenshotMetadata(
  imageData: string,
  config: Required<ScreenCaptureConfig>,
  width: number,
  height: number
): IssueScreenshot {
  const ext = getExtensionFromFormat(config.format)

  return {
    id: generateScreenshotId(),
    imageData,
    filename: `screenshot_${Date.now()}.${ext}`,
    mimeType: config.format,
    timestamp: new Date().toISOString(),
    resolution: { width, height },
    viewport:
      typeof window !== 'undefined'
        ? { width: window.innerWidth, height: window.innerHeight }
        : { width: 0, height: 0 },
    annotations: [],
  }
}

/**
 * Captures the full viewport as a screenshot.
 *
 * Falls back to capturing document.documentElement if available.
 *
 * @param config - Capture configuration
 * @returns Promise<CaptureResult>
 */
export async function captureViewport(
  config: Partial<ScreenCaptureConfig> = {}
): Promise<CaptureResult> {
  const rootElement = document.documentElement
  if (!rootElement) {
    return {
      success: false,
      error: 'No root element available for viewport capture',
    }
  }

  return captureElement(rootElement, config)
}

/**
 * Captures a specific component by its CSS selector.
 *
 * @param selector - CSS selector to find the element
 * @param config - Capture configuration
 * @returns Promise<CaptureResult>
 */
export async function captureBySelector(
  selector: string,
  config: Partial<ScreenCaptureConfig> = {}
): Promise<CaptureResult> {
  const element = document.querySelector(selector)

  if (!element || !(element instanceof HTMLElement)) {
    return {
      success: false,
      error: `Element not found for selector: ${selector}`,
    }
  }

  const result = await captureElement(element, config)

  if (result.success && result.screenshot) {
    result.screenshot.componentId = selector
  }

  return result
}

/**
 * Captures a component by its data-testid attribute.
 *
 * @param testId - The data-testid value
 * @param config - Capture configuration
 * @returns Promise<CaptureResult>
 */
export async function captureByTestId(
  testId: string,
  config: Partial<ScreenCaptureConfig> = {}
): Promise<CaptureResult> {
  return captureBySelector(`[data-testid="${testId}"]`, config)
}

/**
 * Renders annotations onto an image canvas.
 *
 * Takes a screenshot with existing image data and draws annotations
 * on top of it, returning the composited image.
 *
 * @param screenshot - The screenshot with imageData and annotations
 * @returns Promise<string> - Base64 image data with annotations rendered
 */
export async function renderAnnotationsOnImage(screenshot: IssueScreenshot): Promise<string> {
  if (!screenshot.annotations || screenshot.annotations.length === 0) {
    return screenshot.imageData
  }

  const img = await loadImage(screenshot.imageData)
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return screenshot.imageData
  }

  // Draw the base image
  ctx.drawImage(img, 0, 0)

  // Draw annotations
  for (const annotation of screenshot.annotations) {
    drawAnnotation(ctx, annotation)
  }

  return canvas.toDataURL(screenshot.mimeType || 'image/png')
}

/**
 * Draws a single annotation on a canvas context
 */
export function drawAnnotation(ctx: CanvasRenderingContext2D, annotation: IssueAnnotation): void {
  const color = annotation.color || '#ff0000'
  const strokeWidth = annotation.strokeWidth || 2
  const opacity = annotation.opacity ?? 1

  ctx.save()
  ctx.globalAlpha = opacity
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = strokeWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  switch (annotation.type) {
    case 'arrow':
      drawArrow(ctx, annotation)
      break
    case 'circle':
      drawCircle(ctx, annotation)
      break
    case 'rectangle':
      drawRectangle(ctx, annotation)
      break
    case 'text':
      drawText(ctx, annotation)
      break
    case 'highlight':
      drawHighlight(ctx, annotation)
      break
  }

  ctx.restore()
}

/**
 * Draws an arrow annotation
 */
function drawArrow(ctx: CanvasRenderingContext2D, annotation: IssueAnnotation): void {
  const { x, y, x2, y2 } = annotation
  if (x2 === undefined || y2 === undefined) return

  const headLength = 12
  const angle = Math.atan2(y2 - y, x2 - x)

  // Draw line
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x2, y2)
  ctx.stroke()

  // Draw arrowhead
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(
    x2 - headLength * Math.cos(angle - Math.PI / 6),
    y2 - headLength * Math.sin(angle - Math.PI / 6)
  )
  ctx.moveTo(x2, y2)
  ctx.lineTo(
    x2 - headLength * Math.cos(angle + Math.PI / 6),
    y2 - headLength * Math.sin(angle + Math.PI / 6)
  )
  ctx.stroke()
}

/**
 * Draws a circle annotation
 */
function drawCircle(ctx: CanvasRenderingContext2D, annotation: IssueAnnotation): void {
  const { x, y, x2, y2 } = annotation
  if (x2 === undefined || y2 === undefined) return

  const rx = Math.abs(x2 - x) / 2
  const ry = Math.abs(y2 - y) / 2
  const cx = Math.min(x, x2) + rx
  const cy = Math.min(y, y2) + ry

  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  ctx.stroke()
}

/**
 * Draws a rectangle annotation
 */
function drawRectangle(ctx: CanvasRenderingContext2D, annotation: IssueAnnotation): void {
  const { x, y, x2, y2 } = annotation
  if (x2 === undefined || y2 === undefined) return

  const rectX = Math.min(x, x2)
  const rectY = Math.min(y, y2)
  const width = Math.abs(x2 - x)
  const height = Math.abs(y2 - y)

  ctx.strokeRect(rectX, rectY, width, height)
}

/**
 * Draws a text annotation
 */
function drawText(ctx: CanvasRenderingContext2D, annotation: IssueAnnotation): void {
  if (!annotation.text) return

  const fontSize = annotation.strokeWidth ? annotation.strokeWidth * 6 : 14
  ctx.font = `${fontSize}px system-ui, -apple-system, sans-serif`
  ctx.textBaseline = 'top'
  ctx.fillText(annotation.text, annotation.x, annotation.y)
}

/**
 * Draws a highlight annotation (semi-transparent rectangle)
 */
function drawHighlight(ctx: CanvasRenderingContext2D, annotation: IssueAnnotation): void {
  const { x, y, x2, y2 } = annotation
  if (x2 === undefined || y2 === undefined) return

  const rectX = Math.min(x, x2)
  const rectY = Math.min(y, y2)
  const width = Math.abs(x2 - x)
  const height = Math.abs(y2 - y)

  ctx.globalAlpha = annotation.opacity ?? 0.3
  ctx.fillRect(rectX, rectY, width, height)
}

/**
 * Creates a ScreenCaptureManager for managing multiple captures and annotations
 */
export interface ScreenCaptureManager {
  /** Capture the viewport */
  captureViewport: (config?: Partial<ScreenCaptureConfig>) => Promise<CaptureResult>
  /** Capture a specific element */
  captureElement: (
    element: HTMLElement,
    config?: Partial<ScreenCaptureConfig>
  ) => Promise<CaptureResult>
  /** Capture by CSS selector */
  captureBySelector: (
    selector: string,
    config?: Partial<ScreenCaptureConfig>
  ) => Promise<CaptureResult>
  /** Capture by data-testid */
  captureByTestId: (testId: string, config?: Partial<ScreenCaptureConfig>) => Promise<CaptureResult>
  /** Render annotations onto a screenshot */
  renderAnnotations: (screenshot: IssueScreenshot) => Promise<string>
  /** Get all captured screenshots */
  getScreenshots: () => IssueScreenshot[]
  /** Add a screenshot to the collection */
  addScreenshot: (screenshot: IssueScreenshot) => void
  /** Remove a screenshot by ID */
  removeScreenshot: (id: string) => void
  /** Clear all screenshots */
  clearScreenshots: () => void
  /** Add an annotation to a screenshot */
  addAnnotation: (screenshotId: string, annotation: IssueAnnotation) => void
  /** Remove an annotation from a screenshot */
  removeAnnotation: (screenshotId: string, annotationId: string) => void
  /** Clear all annotations from a screenshot */
  clearAnnotations: (screenshotId: string) => void
}

/**
 * Creates a ScreenCaptureManager instance
 */
export function createScreenCaptureManager(): ScreenCaptureManager {
  let screenshots: IssueScreenshot[] = []

  return {
    captureViewport: async (config) => {
      const result = await captureViewport(config)
      if (result.success && result.screenshot) {
        screenshots.push(result.screenshot)
      }
      return result
    },

    captureElement: async (element, config) => {
      const result = await captureElement(element, config)
      if (result.success && result.screenshot) {
        screenshots.push(result.screenshot)
      }
      return result
    },

    captureBySelector: async (selector, config) => {
      const result = await captureBySelector(selector, config)
      if (result.success && result.screenshot) {
        screenshots.push(result.screenshot)
      }
      return result
    },

    captureByTestId: async (testId, config) => {
      const result = await captureByTestId(testId, config)
      if (result.success && result.screenshot) {
        screenshots.push(result.screenshot)
      }
      return result
    },

    renderAnnotations: (screenshot) => renderAnnotationsOnImage(screenshot),

    getScreenshots: () => [...screenshots],

    addScreenshot: (screenshot) => {
      screenshots.push(screenshot)
    },

    removeScreenshot: (id) => {
      screenshots = screenshots.filter((s) => s.id !== id)
    },

    clearScreenshots: () => {
      screenshots = []
    },

    addAnnotation: (screenshotId, annotation) => {
      const screenshot = screenshots.find((s) => s.id === screenshotId)
      if (screenshot) {
        if (!screenshot.annotations) {
          screenshot.annotations = []
        }
        screenshot.annotations.push(annotation)
      }
    },

    removeAnnotation: (screenshotId, annotationId) => {
      const screenshot = screenshots.find((s) => s.id === screenshotId)
      if (screenshot?.annotations) {
        screenshot.annotations = screenshot.annotations.filter((a) => a.id !== annotationId)
      }
    },

    clearAnnotations: (screenshotId) => {
      const screenshot = screenshots.find((s) => s.id === screenshotId)
      if (screenshot) {
        screenshot.annotations = []
      }
    },
  }
}

/**
 * LocalStorage key for saved screenshots
 */
export const SCREENSHOTS_STORAGE_KEY = 'isocubic_god_mode_screenshots'

/**
 * Maximum number of stored screenshots
 */
export const MAX_STORED_SCREENSHOTS = 20

/**
 * Saves screenshots to localStorage
 */
export function saveScreenshots(screenshots: IssueScreenshot[]): void {
  try {
    // Limit the number of stored screenshots
    const limited = screenshots.slice(-MAX_STORED_SCREENSHOTS)
    localStorage.setItem(SCREENSHOTS_STORAGE_KEY, JSON.stringify(limited))
  } catch (e) {
    console.warn('Failed to save screenshots:', e)
  }
}

/**
 * Loads screenshots from localStorage
 */
export function loadScreenshots(): IssueScreenshot[] {
  try {
    const stored = localStorage.getItem(SCREENSHOTS_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.warn('Failed to load screenshots:', e)
  }
  return []
}

/**
 * Clears screenshots from localStorage
 */
export function clearStoredScreenshots(): void {
  try {
    localStorage.removeItem(SCREENSHOTS_STORAGE_KEY)
  } catch (e) {
    console.warn('Failed to clear screenshots:', e)
  }
}
