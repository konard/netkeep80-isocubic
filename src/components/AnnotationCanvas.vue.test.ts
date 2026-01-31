/**
 * Comprehensive unit tests for AnnotationCanvas Vue component
 * Migrated from AnnotationCanvas.test.tsx (React) + existing Vue tests
 * TASK 66: Vue.js 3.0 Migration
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { nextTick } from 'vue'
import AnnotationCanvas from './AnnotationCanvas.vue'
import type { IssueScreenshot } from '../types/issue-generator'

// Mock the screen-capture module
vi.mock('../lib/screen-capture', () => ({
  drawAnnotation: vi.fn(),
  renderAnnotationsOnImage: vi.fn().mockResolvedValue('data:image/png;base64,annotated'),
}))

// Mock Image constructor
vi.stubGlobal(
  'Image',
  vi.fn().mockImplementation(() => ({
    onload: null as (() => void) | null,
    onerror: null as (() => void) | null,
    src: '',
    width: 400,
    height: 300,
    crossOrigin: '',
  }))
)

// Mock canvas context
const mockCtx = {
  drawImage: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  ellipse: vi.fn(),
  fillText: vi.fn(),
  globalAlpha: 1,
  strokeStyle: '#000',
  fillStyle: '#000',
  lineWidth: 1,
  lineCap: 'butt',
  lineJoin: 'miter',
  font: '10px sans-serif',
  textBaseline: 'alphabetic',
}
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx)

describe('AnnotationCanvas Vue Component', () => {
  const baseScreenshot: IssueScreenshot = {
    id: 'screenshot-1',
    imageData:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    timestamp: new Date().toISOString(),
    resolution: { width: 400, height: 300 },
    viewport: { width: 1920, height: 1080 },
    annotations: [],
  }

  const screenshotWithAnnotations: IssueScreenshot = {
    ...baseScreenshot,
    annotations: [
      { id: 'ann-1', type: 'arrow', x: 10, y: 20, x2: 100, y2: 80, color: '#ff0000' },
      { id: 'ann-2', type: 'text', x: 50, y: 50, text: 'Bug here', color: '#00ff00' },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  function mountCanvas(props: Record<string, unknown> = {}) {
    return shallowMount(AnnotationCanvas, {
      props: {
        screenshot: baseScreenshot,
        language: 'ru' as const,
        ...props,
      },
    })
  }

  // ========================================================================
  // Module Exports (from original Vue test)
  // ========================================================================
  describe('Module Exports', () => {
    it('should export AnnotationCanvas.vue as a valid Vue component', async () => {
      const module = await import('./AnnotationCanvas.vue')
      expect(module.default).toBeDefined()
      expect(typeof module.default).toBe('object')
    })
  })

  // ========================================================================
  // Drawing Tool Types (from original Vue test)
  // ========================================================================
  describe('Drawing Tool Types', () => {
    it('should define all valid drawing tools', () => {
      const tools = ['arrow', 'circle', 'rectangle', 'text', 'highlight']
      expect(tools.length).toBe(5)
      expect(tools).toContain('arrow')
      expect(tools).toContain('circle')
      expect(tools).toContain('rectangle')
      expect(tools).toContain('text')
      expect(tools).toContain('highlight')
    })
  })

  // ========================================================================
  // Color Presets (from original Vue test)
  // ========================================================================
  describe('Color Presets', () => {
    it('should define color presets as valid hex values', () => {
      const colorPresets = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#ffffff']
      const hexPattern = /^#[0-9a-fA-F]{6}$/
      colorPresets.forEach((color) => {
        expect(color).toMatch(hexPattern)
      })
      expect(colorPresets.length).toBeGreaterThanOrEqual(3)
    })
  })

  // ========================================================================
  // Annotation Data Structure (from original Vue test)
  // ========================================================================
  describe('Annotation Data Structure', () => {
    it('should have correct annotation structure', () => {
      const annotation = {
        id: 'ann-001',
        tool: 'arrow' as const,
        color: '#ff0000',
        startX: 0,
        startY: 0,
        endX: 100,
        endY: 100,
        text: '',
      }
      expect(annotation.id).toBeDefined()
      expect(annotation.tool).toBe('arrow')
      expect(typeof annotation.color).toBe('string')
    })

    it('should support text annotations with content', () => {
      const textAnnotation = {
        id: 'ann-002',
        tool: 'text' as const,
        color: '#000000',
        startX: 50,
        startY: 50,
        endX: 50,
        endY: 50,
        text: 'Bug is here',
      }
      expect(textAnnotation.tool).toBe('text')
      expect(textAnnotation.text).toBe('Bug is here')
    })
  })

  // ========================================================================
  // Initial Rendering (from React test)
  // ========================================================================
  describe('Initial Rendering', () => {
    it('should render the annotation canvas', () => {
      const wrapper = mountCanvas()
      expect(wrapper.find('[data-testid="annotation-canvas"]').exists()).toBe(true)
    })

    it('should render the toolbar', () => {
      const wrapper = mountCanvas()
      expect(wrapper.find('[data-testid="annotation-toolbar"]').exists()).toBe(true)
    })

    it('should render all tool buttons', () => {
      const wrapper = mountCanvas()
      expect(wrapper.find('[data-testid="annotation-tool-select"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="annotation-tool-arrow"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="annotation-tool-circle"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="annotation-tool-rectangle"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="annotation-tool-text"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="annotation-tool-highlight"]').exists()).toBe(true)
    })

    it('should render the canvas area', () => {
      const wrapper = mountCanvas()
      expect(wrapper.find('[data-testid="annotation-canvas-area"]').exists()).toBe(true)
    })

    it('should render the canvas element', () => {
      const wrapper = mountCanvas()
      expect(wrapper.find('[data-testid="annotation-canvas-element"]').exists()).toBe(true)
    })

    it('should render the status bar', () => {
      const wrapper = mountCanvas()
      expect(wrapper.find('[data-testid="annotation-status"]').exists()).toBe(true)
    })

    it('should show resolution in status bar', () => {
      const wrapper = mountCanvas()
      expect(wrapper.text()).toContain('400\u00d7300')
    })

    it('should render action buttons', () => {
      const wrapper = mountCanvas()
      expect(wrapper.find('[data-testid="annotation-undo"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="annotation-clear"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="annotation-export"]').exists()).toBe(true)
    })

    it('should render close button', () => {
      const wrapper = mountCanvas()
      expect(wrapper.find('[data-testid="annotation-close"]').exists()).toBe(true)
    })
  })

  // ========================================================================
  // Language Support (from React test)
  // ========================================================================
  describe('Language Support', () => {
    it('should render in Russian by default', () => {
      const wrapper = mountCanvas()
      expect(wrapper.text()).toContain('\u21A9 \u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C')
      expect(wrapper.text()).toContain(
        '\uD83D\uDDD1 \u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C'
      )
      expect(wrapper.text()).toContain(
        '\uD83D\uDCBE \u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C'
      )
    })

    it('should render in English when language is en', () => {
      const wrapper = mountCanvas({ language: 'en' })
      expect(wrapper.text()).toContain('\u21A9 Undo')
      expect(wrapper.text()).toContain('\uD83D\uDDD1 Clear')
      expect(wrapper.text()).toContain('\uD83D\uDCBE Save')
    })

    it('should show tool name in Russian in status bar', () => {
      const wrapper = mountCanvas()
      expect(wrapper.text()).toContain(
        '\u0418\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442: \u0412\u044B\u0431\u043E\u0440'
      )
    })

    it('should show tool name in English in status bar', () => {
      const wrapper = mountCanvas({ language: 'en' })
      expect(wrapper.text()).toContain('Tool: Select')
    })
  })

  // ========================================================================
  // Tool Selection (from React test)
  // ========================================================================
  describe('Tool Selection', () => {
    it('should start with select tool active', () => {
      const wrapper = mountCanvas()
      expect(wrapper.text()).toContain(
        '\u0418\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442: \u0412\u044B\u0431\u043E\u0440'
      )
    })

    it('should switch to arrow tool on click', async () => {
      const wrapper = mountCanvas()
      await wrapper.find('[data-testid="annotation-tool-arrow"]').trigger('click')
      await nextTick()
      expect(wrapper.text()).toContain(
        '\u0418\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442: \u0421\u0442\u0440\u0435\u043B\u043A\u0430'
      )
    })

    it('should switch to circle tool on click', async () => {
      const wrapper = mountCanvas()
      await wrapper.find('[data-testid="annotation-tool-circle"]').trigger('click')
      await nextTick()
      expect(wrapper.text()).toContain(
        '\u0418\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442: \u041A\u0440\u0443\u0433'
      )
    })

    it('should switch to rectangle tool on click', async () => {
      const wrapper = mountCanvas()
      await wrapper.find('[data-testid="annotation-tool-rectangle"]').trigger('click')
      await nextTick()
      expect(wrapper.text()).toContain(
        '\u0418\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442: \u041F\u0440\u044F\u043C\u043E\u0443\u0433\u043E\u043B\u044C\u043D\u0438\u043A'
      )
    })

    it('should switch to text tool on click', async () => {
      const wrapper = mountCanvas()
      await wrapper.find('[data-testid="annotation-tool-text"]').trigger('click')
      await nextTick()
      expect(wrapper.text()).toContain(
        '\u0418\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442: \u0422\u0435\u043A\u0441\u0442'
      )
    })

    it('should switch to highlight tool on click', async () => {
      const wrapper = mountCanvas()
      await wrapper.find('[data-testid="annotation-tool-highlight"]').trigger('click')
      await nextTick()
      expect(wrapper.text()).toContain(
        '\u0418\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442: \u0412\u044B\u0434\u0435\u043B\u0435\u043D\u0438\u0435'
      )
    })
  })

  // ========================================================================
  // Annotation List (from React test)
  // ========================================================================
  describe('Annotation List', () => {
    it('should not render annotation list when no annotations', () => {
      const wrapper = mountCanvas({ screenshot: baseScreenshot })
      expect(wrapper.find('[data-testid="annotation-list"]').exists()).toBe(false)
    })

    it('should render annotation list when annotations exist', () => {
      const wrapper = mountCanvas({ screenshot: screenshotWithAnnotations })
      expect(wrapper.find('[data-testid="annotation-list"]').exists()).toBe(true)
    })

    it('should show annotation count in Russian', () => {
      const wrapper = mountCanvas({ screenshot: screenshotWithAnnotations })
      expect(wrapper.text()).toContain('\u0410\u043D\u043D\u043E\u0442\u0430\u0446\u0438\u0438 (2)')
    })

    it('should show annotation count in English', () => {
      const wrapper = mountCanvas({ screenshot: screenshotWithAnnotations, language: 'en' })
      expect(wrapper.text()).toContain('Annotations (2)')
    })

    it('should show delete buttons for each annotation', () => {
      const wrapper = mountCanvas({ screenshot: screenshotWithAnnotations })
      expect(wrapper.find('[data-testid="annotation-delete-ann-1"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="annotation-delete-ann-2"]').exists()).toBe(true)
    })

    it('should show text content for text annotations', () => {
      const wrapper = mountCanvas({ screenshot: screenshotWithAnnotations })
      expect(wrapper.text()).toContain('"Bug here"')
    })
  })

  // ========================================================================
  // Action Buttons (from React test)
  // ========================================================================
  describe('Action Buttons', () => {
    it('should disable undo when no undo history', () => {
      const wrapper = mountCanvas()
      const undoBtn = wrapper.find('[data-testid="annotation-undo"]')
      expect(undoBtn.attributes('disabled')).toBeDefined()
    })

    it('should disable clear when no annotations', () => {
      const wrapper = mountCanvas()
      const clearBtn = wrapper.find('[data-testid="annotation-clear"]')
      expect(clearBtn.attributes('disabled')).toBeDefined()
    })

    it('should enable clear when annotations exist', () => {
      const wrapper = mountCanvas({ screenshot: screenshotWithAnnotations })
      const clearBtn = wrapper.find('[data-testid="annotation-clear"]')
      expect(clearBtn.attributes('disabled')).toBeUndefined()
    })

    it('should emit close when close button is clicked', async () => {
      const wrapper = mountCanvas()
      await wrapper.find('[data-testid="annotation-close"]').trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  // ========================================================================
  // Color Selection (from React test)
  // ========================================================================
  describe('Color Selection', () => {
    it('should render color swatches', () => {
      const wrapper = mountCanvas()
      expect(wrapper.find('[data-testid="annotation-color-#ff0000"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="annotation-color-#00ff00"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="annotation-color-#0000ff"]').exists()).toBe(true)
    })
  })
})
