/**
 * AnnotationCanvas Component Tests
 *
 * Test suite for AnnotationCanvas React component.
 * Tests tool selection, annotation rendering, undo/redo, and UI interaction.
 *
 * TASK 58: Screen Capture & Annotation (Phase 9 - GOD MODE)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AnnotationCanvas } from './AnnotationCanvas'
import type { IssueScreenshot } from '../types/issue-generator'

// Mock the screen-capture module
vi.mock('../lib/screen-capture', () => ({
  drawAnnotation: vi.fn(),
  renderAnnotationsOnImage: vi.fn().mockResolvedValue('data:image/png;base64,annotated'),
}))

// Mock Image constructor for canvas rendering
const mockImage = {
  onload: null as (() => void) | null,
  onerror: null as (() => void) | null,
  src: '',
  width: 400,
  height: 300,
  crossOrigin: '',
}

vi.stubGlobal(
  'Image',
  vi.fn().mockImplementation(() => {
    return { ...mockImage }
  })
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

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx)

describe('AnnotationCanvas', () => {
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
      {
        id: 'ann-1',
        type: 'arrow',
        x: 10,
        y: 20,
        x2: 100,
        y2: 80,
        color: '#ff0000',
      },
      {
        id: 'ann-2',
        type: 'text',
        x: 50,
        y: 50,
        text: 'Bug here',
        color: '#00ff00',
      },
    ],
  }

  const defaultProps = {
    screenshot: baseScreenshot,
    language: 'ru' as const,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ==========================================================================
  // Initial Rendering
  // ==========================================================================
  describe('Initial Rendering', () => {
    it('should render the annotation canvas', () => {
      render(<AnnotationCanvas {...defaultProps} />)
      expect(screen.getByTestId('annotation-canvas')).toBeInTheDocument()
    })

    it('should render the toolbar', () => {
      render(<AnnotationCanvas {...defaultProps} />)
      expect(screen.getByTestId('annotation-toolbar')).toBeInTheDocument()
    })

    it('should render all tool buttons', () => {
      render(<AnnotationCanvas {...defaultProps} />)
      expect(screen.getByTestId('annotation-tool-select')).toBeInTheDocument()
      expect(screen.getByTestId('annotation-tool-arrow')).toBeInTheDocument()
      expect(screen.getByTestId('annotation-tool-circle')).toBeInTheDocument()
      expect(screen.getByTestId('annotation-tool-rectangle')).toBeInTheDocument()
      expect(screen.getByTestId('annotation-tool-text')).toBeInTheDocument()
      expect(screen.getByTestId('annotation-tool-highlight')).toBeInTheDocument()
    })

    it('should render the canvas area', () => {
      render(<AnnotationCanvas {...defaultProps} />)
      expect(screen.getByTestId('annotation-canvas-area')).toBeInTheDocument()
    })

    it('should render the canvas element', () => {
      render(<AnnotationCanvas {...defaultProps} />)
      expect(screen.getByTestId('annotation-canvas-element')).toBeInTheDocument()
    })

    it('should render the status bar', () => {
      render(<AnnotationCanvas {...defaultProps} />)
      expect(screen.getByTestId('annotation-status')).toBeInTheDocument()
    })

    it('should show resolution in status bar', () => {
      render(<AnnotationCanvas {...defaultProps} />)
      expect(screen.getByText('400×300')).toBeInTheDocument()
    })

    it('should render action buttons', () => {
      render(<AnnotationCanvas {...defaultProps} />)
      expect(screen.getByTestId('annotation-undo')).toBeInTheDocument()
      expect(screen.getByTestId('annotation-clear')).toBeInTheDocument()
      expect(screen.getByTestId('annotation-export')).toBeInTheDocument()
    })

    it('should render close button when onClose is provided', () => {
      render(<AnnotationCanvas {...defaultProps} onClose={() => {}} />)
      expect(screen.getByTestId('annotation-close')).toBeInTheDocument()
    })

    it('should not render close button when onClose is not provided', () => {
      render(<AnnotationCanvas {...defaultProps} />)
      expect(screen.queryByTestId('annotation-close')).not.toBeInTheDocument()
    })
  })

  // ==========================================================================
  // Language Support
  // ==========================================================================
  describe('Language Support', () => {
    it('should render in Russian by default', () => {
      render(<AnnotationCanvas {...defaultProps} />)
      expect(screen.getByText('↩ Отменить')).toBeInTheDocument()
      expect(screen.getByText('🗑 Очистить')).toBeInTheDocument()
      expect(screen.getByText('💾 Сохранить')).toBeInTheDocument()
    })

    it('should render in English when language is en', () => {
      render(<AnnotationCanvas {...defaultProps} language="en" />)
      expect(screen.getByText('↩ Undo')).toBeInTheDocument()
      expect(screen.getByText('🗑 Clear')).toBeInTheDocument()
      expect(screen.getByText('💾 Save')).toBeInTheDocument()
    })

    it('should show tool name in Russian in status bar', () => {
      render(<AnnotationCanvas {...defaultProps} />)
      expect(screen.getByText('Инструмент: Выбор')).toBeInTheDocument()
    })

    it('should show tool name in English in status bar', () => {
      render(<AnnotationCanvas {...defaultProps} language="en" />)
      expect(screen.getByText('Tool: Select')).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // Tool Selection
  // ==========================================================================
  describe('Tool Selection', () => {
    it('should start with select tool active', () => {
      render(<AnnotationCanvas {...defaultProps} />)
      // Select tool should be active (check via status bar)
      expect(screen.getByText('Инструмент: Выбор')).toBeInTheDocument()
    })

    it('should switch to arrow tool on click', () => {
      render(<AnnotationCanvas {...defaultProps} />)
      fireEvent.click(screen.getByTestId('annotation-tool-arrow'))
      expect(screen.getByText('Инструмент: Стрелка')).toBeInTheDocument()
    })

    it('should switch to circle tool on click', () => {
      render(<AnnotationCanvas {...defaultProps} />)
      fireEvent.click(screen.getByTestId('annotation-tool-circle'))
      expect(screen.getByText('Инструмент: Круг')).toBeInTheDocument()
    })

    it('should switch to rectangle tool on click', () => {
      render(<AnnotationCanvas {...defaultProps} />)
      fireEvent.click(screen.getByTestId('annotation-tool-rectangle'))
      expect(screen.getByText('Инструмент: Прямоугольник')).toBeInTheDocument()
    })

    it('should switch to text tool on click', () => {
      render(<AnnotationCanvas {...defaultProps} />)
      fireEvent.click(screen.getByTestId('annotation-tool-text'))
      expect(screen.getByText('Инструмент: Текст')).toBeInTheDocument()
    })

    it('should switch to highlight tool on click', () => {
      render(<AnnotationCanvas {...defaultProps} />)
      fireEvent.click(screen.getByTestId('annotation-tool-highlight'))
      expect(screen.getByText('Инструмент: Выделение')).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // Annotation List
  // ==========================================================================
  describe('Annotation List', () => {
    it('should not render annotation list when no annotations', () => {
      render(<AnnotationCanvas {...defaultProps} screenshot={baseScreenshot} />)
      expect(screen.queryByTestId('annotation-list')).not.toBeInTheDocument()
    })

    it('should render annotation list when annotations exist', () => {
      render(<AnnotationCanvas {...defaultProps} screenshot={screenshotWithAnnotations} />)
      expect(screen.getByTestId('annotation-list')).toBeInTheDocument()
    })

    it('should show annotation count in Russian', () => {
      render(<AnnotationCanvas {...defaultProps} screenshot={screenshotWithAnnotations} />)
      expect(screen.getByText('Аннотации (2)')).toBeInTheDocument()
    })

    it('should show annotation count in English', () => {
      render(
        <AnnotationCanvas {...defaultProps} language="en" screenshot={screenshotWithAnnotations} />
      )
      expect(screen.getByText('Annotations (2)')).toBeInTheDocument()
    })

    it('should show delete buttons for each annotation', () => {
      render(<AnnotationCanvas {...defaultProps} screenshot={screenshotWithAnnotations} />)
      expect(screen.getByTestId('annotation-delete-ann-1')).toBeInTheDocument()
      expect(screen.getByTestId('annotation-delete-ann-2')).toBeInTheDocument()
    })

    it('should remove annotation on delete click', () => {
      const onAnnotationsChange = vi.fn()
      render(
        <AnnotationCanvas
          {...defaultProps}
          screenshot={screenshotWithAnnotations}
          onAnnotationsChange={onAnnotationsChange}
        />
      )

      fireEvent.click(screen.getByTestId('annotation-delete-ann-1'))

      // Should have called with updated annotations (only ann-2 remains)
      const lastCall = onAnnotationsChange.mock.calls[onAnnotationsChange.mock.calls.length - 1]
      expect(lastCall[0]).toHaveLength(1)
      expect(lastCall[0][0].id).toBe('ann-2')
    })

    it('should show text content for text annotations', () => {
      render(<AnnotationCanvas {...defaultProps} screenshot={screenshotWithAnnotations} />)
      // The text annotation shows "Bug here" (truncated display)
      expect(screen.getByText('"Bug here"')).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // Action Buttons
  // ==========================================================================
  describe('Action Buttons', () => {
    it('should disable undo when no undo history', () => {
      render(<AnnotationCanvas {...defaultProps} />)
      const undoBtn = screen.getByTestId('annotation-undo')
      expect(undoBtn).toBeDisabled()
    })

    it('should disable clear when no annotations', () => {
      render(<AnnotationCanvas {...defaultProps} />)
      const clearBtn = screen.getByTestId('annotation-clear')
      expect(clearBtn).toBeDisabled()
    })

    it('should enable clear when annotations exist', () => {
      render(<AnnotationCanvas {...defaultProps} screenshot={screenshotWithAnnotations} />)
      const clearBtn = screen.getByTestId('annotation-clear')
      expect(clearBtn).not.toBeDisabled()
    })

    it('should clear all annotations on clear click', () => {
      const onAnnotationsChange = vi.fn()
      render(
        <AnnotationCanvas
          {...defaultProps}
          screenshot={screenshotWithAnnotations}
          onAnnotationsChange={onAnnotationsChange}
        />
      )

      fireEvent.click(screen.getByTestId('annotation-clear'))

      const lastCall = onAnnotationsChange.mock.calls[onAnnotationsChange.mock.calls.length - 1]
      expect(lastCall[0]).toHaveLength(0)
    })

    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn()
      render(<AnnotationCanvas {...defaultProps} onClose={onClose} />)

      fireEvent.click(screen.getByTestId('annotation-close'))
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should call onExport when save button is clicked', async () => {
      const onExport = vi.fn()
      render(<AnnotationCanvas {...defaultProps} onExport={onExport} />)

      fireEvent.click(screen.getByTestId('annotation-export'))

      // Wait for async export
      await vi.waitFor(() => {
        expect(onExport).toHaveBeenCalledWith('data:image/png;base64,annotated')
      })
    })
  })

  // ==========================================================================
  // Custom Styling
  // ==========================================================================
  describe('Custom Styling', () => {
    it('should apply custom styles', () => {
      const customStyle = { border: '2px solid red' }
      render(<AnnotationCanvas {...defaultProps} style={customStyle} />)

      const container = screen.getByTestId('annotation-canvas')
      expect(container.style.border).toBe('2px solid red')
    })

    it('should apply custom className', () => {
      render(<AnnotationCanvas {...defaultProps} className="custom-annotation" />)

      const container = screen.getByTestId('annotation-canvas')
      expect(container).toHaveClass('custom-annotation')
    })
  })

  // ==========================================================================
  // Color Selection
  // ==========================================================================
  describe('Color Selection', () => {
    it('should render color swatches', () => {
      render(<AnnotationCanvas {...defaultProps} />)
      expect(screen.getByTestId('annotation-color-#ff0000')).toBeInTheDocument()
      expect(screen.getByTestId('annotation-color-#00ff00')).toBeInTheDocument()
      expect(screen.getByTestId('annotation-color-#0000ff')).toBeInTheDocument()
    })
  })
})
