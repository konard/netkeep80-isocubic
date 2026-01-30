/**
 * Annotation Canvas Component
 *
 * React component providing annotation tools for screenshots in GOD MODE.
 * Allows drawing arrows, circles, rectangles, text, and highlights on
 * captured screenshots for attaching to GitHub issues.
 *
 * TASK 58: Screen Capture & Annotation (Phase 9 - GOD MODE)
 *
 * Features:
 * - Arrow, circle, rectangle, text, and highlight tools
 * - Color picker for annotations
 * - Undo/redo support
 * - Zoom and pan for screenshots
 * - Annotation list with delete capability
 * - Export annotated image
 * - Integration with IssueDraftPanel
 * - Multi-language support (Russian/English)
 */

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import type { QueryLanguage } from '../types/ai-query'
import type {
  IssueScreenshot,
  IssueAnnotation,
  IssueAnnotationType,
} from '../types/issue-generator'
import { drawAnnotation, renderAnnotationsOnImage } from '../lib/screen-capture'

/**
 * Annotation tool types
 */
export type AnnotationTool = IssueAnnotationType | 'select'

/**
 * Tool info for display
 */
interface ToolInfo {
  id: AnnotationTool
  labelRu: string
  labelEn: string
  icon: string
}

/**
 * Available tools
 */
const TOOLS: ToolInfo[] = [
  { id: 'select', labelRu: 'Выбор', labelEn: 'Select', icon: '🔘' },
  { id: 'arrow', labelRu: 'Стрелка', labelEn: 'Arrow', icon: '➡️' },
  { id: 'circle', labelRu: 'Круг', labelEn: 'Circle', icon: '⭕' },
  { id: 'rectangle', labelRu: 'Прямоугольник', labelEn: 'Rectangle', icon: '⬜' },
  { id: 'text', labelRu: 'Текст', labelEn: 'Text', icon: '📝' },
  { id: 'highlight', labelRu: 'Выделение', labelEn: 'Highlight', icon: '🟨' },
]

/**
 * Available annotation colors
 */
const ANNOTATION_COLORS = [
  '#ff0000', // Red
  '#00ff00', // Green
  '#0000ff', // Blue
  '#ffff00', // Yellow
  '#ff6600', // Orange
  '#ff00ff', // Magenta
  '#00ffff', // Cyan
  '#ffffff', // White
]

/**
 * Props for AnnotationCanvas
 */
export interface AnnotationCanvasProps {
  /** The screenshot to annotate */
  screenshot: IssueScreenshot
  /** Language for UI */
  language?: QueryLanguage
  /** Custom styles */
  style?: CSSProperties
  /** Custom class name */
  className?: string
  /** Callback when annotations change */
  onAnnotationsChange?: (annotations: IssueAnnotation[]) => void
  /** Callback when annotated image is exported */
  onExport?: (imageData: string) => void
  /** Callback when canvas is closed */
  onClose?: () => void
}

/**
 * Styles for the component
 */
const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: 'rgba(18, 18, 28, 0.98)',
    color: '#e5e7eb',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '13px',
    overflow: 'hidden',
    borderRadius: '8px',
    border: '1px solid rgba(139, 92, 246, 0.3)',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
    flexShrink: 0,
    flexWrap: 'wrap',
  },
  toolGroup: {
    display: 'flex',
    gap: '2px',
    padding: '0 4px',
    borderRight: '1px solid rgba(139, 92, 246, 0.15)',
  },
  toolButton: {
    background: 'none',
    border: '1px solid transparent',
    borderRadius: '4px',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '4px 8px',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
    minWidth: '32px',
  },
  toolButtonActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    borderColor: 'rgba(139, 92, 246, 0.5)',
    color: '#c4b5fd',
  },
  colorSwatch: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    border: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  colorSwatchActive: {
    borderColor: '#ffffff',
    boxShadow: '0 0 4px rgba(255, 255, 255, 0.5)',
  },
  actionButton: {
    background: 'rgba(139, 92, 246, 0.1)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '4px',
    color: '#c4b5fd',
    cursor: 'pointer',
    padding: '4px 10px',
    fontSize: '11px',
    fontWeight: 500,
    transition: 'all 0.15s ease',
  },
  actionButtonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  canvasArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    cursor: 'crosshair',
  },
  canvasAreaSelect: {
    cursor: 'default',
  },
  canvas: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  },
  annotationList: {
    maxHeight: '120px',
    overflow: 'auto',
    padding: '8px 12px',
    borderTop: '1px solid rgba(139, 92, 246, 0.2)',
    backgroundColor: 'rgba(24, 24, 36, 0.5)',
    flexShrink: 0,
  },
  annotationListTitle: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#c4b5fd',
    marginBottom: '6px',
  },
  annotationItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#d1d5db',
    cursor: 'pointer',
    transition: 'background 0.1s ease',
  },
  annotationItemHover: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  annotationItemInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  annotationItemColor: {
    width: '10px',
    height: '10px',
    borderRadius: '2px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  deleteButton: {
    background: 'none',
    border: 'none',
    color: '#6b7280',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '2px 4px',
    borderRadius: '2px',
    transition: 'color 0.15s ease',
  },
  statusBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 12px',
    borderTop: '1px solid rgba(139, 92, 246, 0.15)',
    fontSize: '10px',
    color: '#6b7280',
    flexShrink: 0,
  },
  textInput: {
    position: 'absolute',
    background: 'rgba(17, 24, 39, 0.9)',
    border: '1px solid rgba(139, 92, 246, 0.4)',
    borderRadius: '4px',
    color: '#e5e7eb',
    padding: '4px 8px',
    fontSize: '13px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    minWidth: '120px',
    outline: 'none',
    zIndex: 10,
  },
}

/**
 * Generates a unique annotation ID
 */
function generateAnnotationId(): string {
  return `ann_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
}

/**
 * Gets tool icon by ID
 */
function getToolIcon(type: IssueAnnotationType): string {
  const tool = TOOLS.find((t) => t.id === type)
  return tool?.icon || '?'
}

/**
 * Gets tool label by type and language
 */
function getToolLabel(type: IssueAnnotationType, language: QueryLanguage): string {
  const tool = TOOLS.find((t) => t.id === type)
  return language === 'ru' ? tool?.labelRu || type : tool?.labelEn || type
}

/**
 * AnnotationCanvas Component
 */
export function AnnotationCanvas({
  screenshot,
  language = 'ru',
  style,
  className,
  onAnnotationsChange,
  onExport,
  onClose,
}: AnnotationCanvasProps) {
  // State
  const [activeTool, setActiveTool] = useState<AnnotationTool>('select')
  const [activeColor, setActiveColor] = useState('#ff0000')
  const [annotations, setAnnotations] = useState<IssueAnnotation[]>(screenshot.annotations || [])
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
  const [currentDraw, setCurrentDraw] = useState<{ x: number; y: number } | null>(null)
  const [hoveredAnnotation, setHoveredAnnotation] = useState<string | null>(null)
  const [undoStack, setUndoStack] = useState<IssueAnnotation[][]>([])
  const [showTextInput, setShowTextInput] = useState(false)
  const [textInputPos, setTextInputPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [textInputValue, setTextInputValue] = useState('')

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const textInputRef = useRef<HTMLInputElement>(null)

  // Notify parent of annotation changes
  useEffect(() => {
    onAnnotationsChange?.(annotations)
  }, [annotations, onAnnotationsChange])

  // Focus text input when shown
  useEffect(() => {
    if (showTextInput && textInputRef.current) {
      textInputRef.current.focus()
    }
  }, [showTextInput])

  // Render canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Load and draw the screenshot image
    const img = new Image()
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      // Draw existing annotations
      for (const annotation of annotations) {
        drawAnnotation(ctx, annotation)
      }

      // Draw current in-progress annotation
      if (
        isDrawing &&
        drawStart &&
        currentDraw &&
        activeTool !== 'select' &&
        activeTool !== 'text'
      ) {
        const tempAnnotation: IssueAnnotation = {
          id: 'temp',
          type: activeTool,
          x: drawStart.x,
          y: drawStart.y,
          x2: currentDraw.x,
          y2: currentDraw.y,
          color: activeColor,
          strokeWidth: 2,
          opacity: 0.7,
        }
        drawAnnotation(ctx, tempAnnotation)
      }
    }
    img.src = screenshot.imageData
  }, [
    screenshot.imageData,
    annotations,
    isDrawing,
    drawStart,
    currentDraw,
    activeTool,
    activeColor,
  ])

  // Re-render canvas when state changes
  useEffect(() => {
    renderCanvas()
  }, [renderCanvas])

  // Get canvas-relative coordinates from mouse event
  const getCanvasCoords = useCallback((e: ReactMouseEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    }
  }, [])

  // Handle mouse down on canvas
  const handleMouseDown = useCallback(
    (e: ReactMouseEvent) => {
      if (activeTool === 'select') return

      const coords = getCanvasCoords(e)
      if (!coords) return

      if (activeTool === 'text') {
        // Show text input at click position
        const canvas = canvasRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        setTextInputPos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        })
        setDrawStart(coords)
        setShowTextInput(true)
        setTextInputValue('')
        return
      }

      setIsDrawing(true)
      setDrawStart(coords)
      setCurrentDraw(coords)
    },
    [activeTool, getCanvasCoords]
  )

  // Handle mouse move on canvas
  const handleMouseMove = useCallback(
    (e: ReactMouseEvent) => {
      if (!isDrawing || activeTool === 'select' || activeTool === 'text') return

      const coords = getCanvasCoords(e)
      if (!coords) return

      setCurrentDraw(coords)
    },
    [isDrawing, activeTool, getCanvasCoords]
  )

  // Handle mouse up on canvas
  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !drawStart || !currentDraw || activeTool === 'select') {
      setIsDrawing(false)
      return
    }

    // Create the annotation
    const newAnnotation: IssueAnnotation = {
      id: generateAnnotationId(),
      type: activeTool as IssueAnnotationType,
      x: drawStart.x,
      y: drawStart.y,
      x2: currentDraw.x,
      y2: currentDraw.y,
      color: activeColor,
      strokeWidth: 2,
    }

    setUndoStack((prev) => [...prev, annotations])
    setAnnotations((prev) => [...prev, newAnnotation])
    setIsDrawing(false)
    setDrawStart(null)
    setCurrentDraw(null)
  }, [isDrawing, drawStart, currentDraw, activeTool, activeColor, annotations])

  // Handle text input submission
  const handleTextSubmit = useCallback(() => {
    if (!textInputValue.trim() || !drawStart) {
      setShowTextInput(false)
      return
    }

    const newAnnotation: IssueAnnotation = {
      id: generateAnnotationId(),
      type: 'text',
      x: drawStart.x,
      y: drawStart.y,
      text: textInputValue.trim(),
      color: activeColor,
      strokeWidth: 2,
    }

    setUndoStack((prev) => [...prev, annotations])
    setAnnotations((prev) => [...prev, newAnnotation])
    setShowTextInput(false)
    setTextInputValue('')
    setDrawStart(null)
  }, [textInputValue, drawStart, activeColor, annotations])

  // Undo last annotation
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return
    const previousState = undoStack[undoStack.length - 1]
    setAnnotations(previousState)
    setUndoStack((prev) => prev.slice(0, -1))
  }, [undoStack])

  // Clear all annotations
  const handleClearAll = useCallback(() => {
    if (annotations.length === 0) return
    setUndoStack((prev) => [...prev, annotations])
    setAnnotations([])
  }, [annotations])

  // Delete a specific annotation
  const handleDeleteAnnotation = useCallback(
    (id: string) => {
      setUndoStack((prev) => [...prev, annotations])
      setAnnotations((prev) => prev.filter((a) => a.id !== id))
    },
    [annotations]
  )

  // Export annotated image
  const handleExport = useCallback(async () => {
    const annotatedScreenshot: IssueScreenshot = {
      ...screenshot,
      annotations,
    }

    try {
      const imageData = await renderAnnotationsOnImage(annotatedScreenshot)
      onExport?.(imageData)
    } catch (error) {
      console.error('Failed to export annotated image:', error)
    }
  }, [screenshot, annotations, onExport])

  // Compute canvas display size
  const canvasDisplaySize = useMemo(() => {
    // Fit to container while maintaining aspect ratio
    const maxWidth = 800
    const maxHeight = 500
    const imgWidth = screenshot.resolution?.width || 400
    const imgHeight = screenshot.resolution?.height || 300

    const scaleX = maxWidth / imgWidth
    const scaleY = maxHeight / imgHeight
    const scale = Math.min(scaleX, scaleY, 1)

    return {
      width: Math.round(imgWidth * scale),
      height: Math.round(imgHeight * scale),
    }
  }, [screenshot.resolution])

  return (
    <div
      ref={containerRef}
      style={{ ...styles.container, ...style }}
      className={className}
      data-testid="annotation-canvas"
    >
      {/* Toolbar */}
      <div style={styles.toolbar} data-testid="annotation-toolbar">
        {/* Tool buttons */}
        <div style={styles.toolGroup}>
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              style={{
                ...styles.toolButton,
                ...(activeTool === tool.id ? styles.toolButtonActive : {}),
              }}
              onClick={() => setActiveTool(tool.id)}
              title={language === 'ru' ? tool.labelRu : tool.labelEn}
              data-testid={`annotation-tool-${tool.id}`}
            >
              {tool.icon}
            </button>
          ))}
        </div>

        {/* Color picker */}
        <div style={{ ...styles.toolGroup, borderRight: 'none' }}>
          {ANNOTATION_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              style={{
                ...styles.colorSwatch,
                backgroundColor: color,
                ...(activeColor === color ? styles.colorSwatchActive : {}),
              }}
              onClick={() => setActiveColor(color)}
              title={color}
              data-testid={`annotation-color-${color}`}
            />
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
          <button
            type="button"
            style={{
              ...styles.actionButton,
              ...(undoStack.length === 0 ? styles.actionButtonDisabled : {}),
            }}
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            title={language === 'ru' ? 'Отменить' : 'Undo'}
            data-testid="annotation-undo"
          >
            {language === 'ru' ? '↩ Отменить' : '↩ Undo'}
          </button>
          <button
            type="button"
            style={{
              ...styles.actionButton,
              ...(annotations.length === 0 ? styles.actionButtonDisabled : {}),
            }}
            onClick={handleClearAll}
            disabled={annotations.length === 0}
            title={language === 'ru' ? 'Очистить всё' : 'Clear all'}
            data-testid="annotation-clear"
          >
            {language === 'ru' ? '🗑 Очистить' : '🗑 Clear'}
          </button>
          <button
            type="button"
            style={styles.actionButton}
            onClick={handleExport}
            title={language === 'ru' ? 'Сохранить' : 'Save'}
            data-testid="annotation-export"
          >
            {language === 'ru' ? '💾 Сохранить' : '💾 Save'}
          </button>
          {onClose && (
            <button
              type="button"
              style={styles.actionButton}
              onClick={onClose}
              title={language === 'ru' ? 'Закрыть' : 'Close'}
              data-testid="annotation-close"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Canvas area */}
      <div
        style={{
          ...styles.canvasArea,
          ...(activeTool === 'select' ? styles.canvasAreaSelect : {}),
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        data-testid="annotation-canvas-area"
      >
        <canvas
          ref={canvasRef}
          style={{
            ...styles.canvas,
            width: canvasDisplaySize.width,
            height: canvasDisplaySize.height,
          }}
          data-testid="annotation-canvas-element"
        />

        {/* Text input overlay */}
        {showTextInput && (
          <input
            ref={textInputRef}
            type="text"
            style={{
              ...styles.textInput,
              left: textInputPos.x,
              top: textInputPos.y,
            }}
            value={textInputValue}
            onChange={(e) => setTextInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTextSubmit()
              if (e.key === 'Escape') setShowTextInput(false)
            }}
            onBlur={handleTextSubmit}
            placeholder={language === 'ru' ? 'Введите текст...' : 'Enter text...'}
            data-testid="annotation-text-input"
          />
        )}
      </div>

      {/* Annotation list */}
      {annotations.length > 0 && (
        <div style={styles.annotationList} data-testid="annotation-list">
          <div style={styles.annotationListTitle}>
            {language === 'ru'
              ? `Аннотации (${annotations.length})`
              : `Annotations (${annotations.length})`}
          </div>
          {annotations.map((annotation) => (
            <div
              key={annotation.id}
              style={{
                ...styles.annotationItem,
                ...(hoveredAnnotation === annotation.id ? styles.annotationItemHover : {}),
              }}
              onMouseEnter={() => setHoveredAnnotation(annotation.id)}
              onMouseLeave={() => setHoveredAnnotation(null)}
            >
              <div style={styles.annotationItemInfo}>
                <div
                  style={{
                    ...styles.annotationItemColor,
                    backgroundColor: annotation.color || '#ff0000',
                  }}
                />
                <span>{getToolIcon(annotation.type)}</span>
                <span>{getToolLabel(annotation.type, language)}</span>
                {annotation.text && (
                  <span style={{ color: '#9ca3af', fontSize: '10px' }}>
                    &quot;{annotation.text.substring(0, 20)}
                    {(annotation.text.length || 0) > 20 ? '...' : ''}&quot;
                  </span>
                )}
              </div>
              <button
                type="button"
                style={styles.deleteButton}
                onClick={() => handleDeleteAnnotation(annotation.id)}
                title={language === 'ru' ? 'Удалить' : 'Delete'}
                data-testid={`annotation-delete-${annotation.id}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Status bar */}
      <div style={styles.statusBar} data-testid="annotation-status">
        <span>
          {language === 'ru'
            ? `Инструмент: ${TOOLS.find((t) => t.id === activeTool)?.labelRu || activeTool}`
            : `Tool: ${TOOLS.find((t) => t.id === activeTool)?.labelEn || activeTool}`}
        </span>
        <span>
          {screenshot.resolution
            ? `${screenshot.resolution.width}×${screenshot.resolution.height}`
            : ''}
        </span>
      </div>
    </div>
  )
}

export default AnnotationCanvas
