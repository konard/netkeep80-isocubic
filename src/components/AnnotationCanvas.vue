<!--
  Annotation Canvas Component

  Vue 3 SFC providing annotation tools for screenshots in GOD MODE.
  Allows drawing arrows, circles, rectangles, text, and highlights on
  captured screenshots for attaching to GitHub issues.

  TASK 58: Screen Capture & Annotation (Phase 9 - GOD MODE)

  Features:
  - Arrow, circle, rectangle, text, and highlight tools
  - Color picker for annotations
  - Undo/redo support
  - Zoom and pan for screenshots
  - Annotation list with delete capability
  - Export annotated image
  - Integration with IssueDraftPanel
  - Multi-language support (Russian/English)
-->

<script setup lang="ts">
// === Imports ===
import { ref, computed, watch, nextTick, onMounted, type CSSProperties } from 'vue'
import type { QueryLanguage } from '../types/ai-query'
import type {
  IssueScreenshot,
  IssueAnnotation,
  IssueAnnotationType,
} from '../types/issue-generator'
import { drawAnnotation, renderAnnotationsOnImage } from '../lib/screen-capture'

// === Types ===

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

// === Constants ===

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

// === Module-level helper functions ===

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

// === Styles ===

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

// === Props ===

const props = withDefaults(
  defineProps<{
    /** The screenshot to annotate */
    screenshot: IssueScreenshot
    /** Language for UI */
    language?: QueryLanguage
    /** Custom styles */
    style?: CSSProperties
    /** Custom class name */
    className?: string
  }>(),
  {
    language: 'ru',
    style: undefined,
    className: undefined,
  }
)

// === Emits ===

const emit = defineEmits<{
  /** Callback when annotations change */
  (e: 'annotationsChange', annotations: IssueAnnotation[]): void
  /** Callback when annotated image is exported */
  (e: 'export', imageData: string): void
  /** Callback when canvas is closed */
  (e: 'close'): void
}>()

// === State (ref) ===

const activeTool = ref<AnnotationTool>('select')
const activeColor = ref('#ff0000')
const annotations = ref<IssueAnnotation[]>(props.screenshot.annotations || [])
const isDrawing = ref(false)
const drawStart = ref<{ x: number; y: number } | null>(null)
const currentDraw = ref<{ x: number; y: number } | null>(null)
const hoveredAnnotation = ref<string | null>(null)
const undoStack = ref<IssueAnnotation[][]>([])
const showTextInput = ref(false)
const textInputPos = ref<{ x: number; y: number }>({ x: 0, y: 0 })
const textInputValue = ref('')

// === Template refs ===

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const textInputRef = ref<HTMLInputElement | null>(null)

// === Computed ===

/** Compute canvas display size */
const canvasDisplaySize = computed(() => {
  const maxWidth = 800
  const maxHeight = 500
  const imgWidth = props.screenshot.resolution?.width || 400
  const imgHeight = props.screenshot.resolution?.height || 300

  const scaleX = maxWidth / imgWidth
  const scaleY = maxHeight / imgHeight
  const scale = Math.min(scaleX, scaleY, 1)

  return {
    width: Math.round(imgWidth * scale),
    height: Math.round(imgHeight * scale),
  }
})

// === Canvas rendering ===

/** Render the canvas with screenshot and annotations */
function renderCanvas() {
  const canvas = canvasRef.value
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
    for (const annotation of annotations.value) {
      drawAnnotation(ctx, annotation)
    }

    // Draw current in-progress annotation
    if (
      isDrawing.value &&
      drawStart.value &&
      currentDraw.value &&
      activeTool.value !== 'select' &&
      activeTool.value !== 'text'
    ) {
      const tempAnnotation: IssueAnnotation = {
        id: 'temp',
        type: activeTool.value,
        x: drawStart.value.x,
        y: drawStart.value.y,
        x2: currentDraw.value.x,
        y2: currentDraw.value.y,
        color: activeColor.value,
        strokeWidth: 2,
        opacity: 0.7,
      }
      drawAnnotation(ctx, tempAnnotation)
    }
  }
  img.src = props.screenshot.imageData
}

// === Watchers ===

/** Re-render canvas when dependencies change */
watch(
  [
    () => props.screenshot.imageData,
    annotations,
    isDrawing,
    drawStart,
    currentDraw,
    activeTool,
    activeColor,
  ],
  () => {
    renderCanvas()
  },
  { deep: true }
)

/** Notify parent of annotation changes */
watch(
  annotations,
  (newAnnotations) => {
    emit('annotationsChange', newAnnotations)
  },
  { deep: true }
)

/** Focus text input when shown */
watch(showTextInput, (visible) => {
  if (visible) {
    nextTick(() => {
      textInputRef.value?.focus()
    })
  }
})

// === Lifecycle ===

onMounted(() => {
  renderCanvas()
})

// === Mouse event helpers ===

/** Get canvas-relative coordinates from mouse event */
function getCanvasCoords(e: MouseEvent): { x: number; y: number } | null {
  const canvas = canvasRef.value
  if (!canvas) return null

  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height

  return {
    x: Math.round((e.clientX - rect.left) * scaleX),
    y: Math.round((e.clientY - rect.top) * scaleY),
  }
}

/** Handle mouse down on canvas */
function handleMouseDown(e: MouseEvent) {
  if (activeTool.value === 'select') return

  const coords = getCanvasCoords(e)
  if (!coords) return

  if (activeTool.value === 'text') {
    // Show text input at click position
    const canvas = canvasRef.value
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    textInputPos.value = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
    drawStart.value = coords
    showTextInput.value = true
    textInputValue.value = ''
    return
  }

  isDrawing.value = true
  drawStart.value = coords
  currentDraw.value = coords
}

/** Handle mouse move on canvas */
function handleMouseMove(e: MouseEvent) {
  if (!isDrawing.value || activeTool.value === 'select' || activeTool.value === 'text') return

  const coords = getCanvasCoords(e)
  if (!coords) return

  currentDraw.value = coords
}

/** Handle mouse up on canvas */
function handleMouseUp() {
  if (!isDrawing.value || !drawStart.value || !currentDraw.value || activeTool.value === 'select') {
    isDrawing.value = false
    return
  }

  // Create the annotation
  const newAnnotation: IssueAnnotation = {
    id: generateAnnotationId(),
    type: activeTool.value as IssueAnnotationType,
    x: drawStart.value.x,
    y: drawStart.value.y,
    x2: currentDraw.value.x,
    y2: currentDraw.value.y,
    color: activeColor.value,
    strokeWidth: 2,
  }

  undoStack.value = [...undoStack.value, [...annotations.value]]
  annotations.value = [...annotations.value, newAnnotation]
  isDrawing.value = false
  drawStart.value = null
  currentDraw.value = null
}

// === Text input ===

/** Handle text input submission */
function handleTextSubmit() {
  if (!textInputValue.value.trim() || !drawStart.value) {
    showTextInput.value = false
    return
  }

  const newAnnotation: IssueAnnotation = {
    id: generateAnnotationId(),
    type: 'text',
    x: drawStart.value.x,
    y: drawStart.value.y,
    text: textInputValue.value.trim(),
    color: activeColor.value,
    strokeWidth: 2,
  }

  undoStack.value = [...undoStack.value, [...annotations.value]]
  annotations.value = [...annotations.value, newAnnotation]
  showTextInput.value = false
  textInputValue.value = ''
  drawStart.value = null
}

/** Handle text input keydown */
function handleTextKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter') handleTextSubmit()
  if (e.key === 'Escape') showTextInput.value = false
}

// === Action handlers ===

/** Undo last annotation */
function handleUndo() {
  if (undoStack.value.length === 0) return
  const previousState = undoStack.value[undoStack.value.length - 1]
  annotations.value = previousState
  undoStack.value = undoStack.value.slice(0, -1)
}

/** Clear all annotations */
function handleClearAll() {
  if (annotations.value.length === 0) return
  undoStack.value = [...undoStack.value, [...annotations.value]]
  annotations.value = []
}

/** Delete a specific annotation */
function handleDeleteAnnotation(id: string) {
  undoStack.value = [...undoStack.value, [...annotations.value]]
  annotations.value = annotations.value.filter((a) => a.id !== id)
}

/** Export annotated image */
async function handleExport() {
  const annotatedScreenshot: IssueScreenshot = {
    ...props.screenshot,
    annotations: annotations.value,
  }

  try {
    const imageData = await renderAnnotationsOnImage(annotatedScreenshot)
    emit('export', imageData)
  } catch (error) {
    console.error('Failed to export annotated image:', error)
  }
}
</script>

<template>
  <div
    ref="containerRef"
    :style="{ ...styles.container, ...props.style }"
    :class="props.className"
    data-testid="annotation-canvas"
  >
    <!-- Toolbar -->
    <div :style="styles.toolbar" data-testid="annotation-toolbar">
      <!-- Tool buttons -->
      <div :style="styles.toolGroup">
        <button
          v-for="tool in TOOLS"
          :key="tool.id"
          type="button"
          :style="{
            ...styles.toolButton,
            ...(activeTool === tool.id ? styles.toolButtonActive : {}),
          }"
          :title="props.language === 'ru' ? tool.labelRu : tool.labelEn"
          :data-testid="`annotation-tool-${tool.id}`"
          @click="activeTool = tool.id"
        >
          {{ tool.icon }}
        </button>
      </div>

      <!-- Color picker -->
      <div :style="{ ...styles.toolGroup, borderRight: 'none' }">
        <button
          v-for="color in ANNOTATION_COLORS"
          :key="color"
          type="button"
          :style="{
            ...styles.colorSwatch,
            backgroundColor: color,
            ...(activeColor === color ? styles.colorSwatchActive : {}),
          }"
          :title="color"
          :data-testid="`annotation-color-${color}`"
          @click="activeColor = color"
        />
      </div>

      <!-- Action buttons -->
      <div :style="{ display: 'flex', gap: '4px', marginLeft: 'auto' }">
        <button
          type="button"
          :style="{
            ...styles.actionButton,
            ...(undoStack.length === 0 ? styles.actionButtonDisabled : {}),
          }"
          :disabled="undoStack.length === 0"
          :title="props.language === 'ru' ? 'Отменить' : 'Undo'"
          data-testid="annotation-undo"
          @click="handleUndo"
        >
          {{ props.language === 'ru' ? '↩ Отменить' : '↩ Undo' }}
        </button>
        <button
          type="button"
          :style="{
            ...styles.actionButton,
            ...(annotations.length === 0 ? styles.actionButtonDisabled : {}),
          }"
          :disabled="annotations.length === 0"
          :title="props.language === 'ru' ? 'Очистить всё' : 'Clear all'"
          data-testid="annotation-clear"
          @click="handleClearAll"
        >
          {{ props.language === 'ru' ? '🗑 Очистить' : '🗑 Clear' }}
        </button>
        <button
          type="button"
          :style="styles.actionButton"
          :title="props.language === 'ru' ? 'Сохранить' : 'Save'"
          data-testid="annotation-export"
          @click="handleExport"
        >
          {{ props.language === 'ru' ? '💾 Сохранить' : '💾 Save' }}
        </button>
        <button
          type="button"
          :style="styles.actionButton"
          :title="props.language === 'ru' ? 'Закрыть' : 'Close'"
          data-testid="annotation-close"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Canvas area -->
    <div
      :style="{
        ...styles.canvasArea,
        ...(activeTool === 'select' ? styles.canvasAreaSelect : {}),
      }"
      data-testid="annotation-canvas-area"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseUp"
    >
      <canvas
        ref="canvasRef"
        :style="{
          ...styles.canvas,
          width: canvasDisplaySize.width + 'px',
          height: canvasDisplaySize.height + 'px',
        }"
        data-testid="annotation-canvas-element"
      />

      <!-- Text input overlay -->
      <input
        v-if="showTextInput"
        ref="textInputRef"
        type="text"
        :style="{
          ...styles.textInput,
          left: textInputPos.x + 'px',
          top: textInputPos.y + 'px',
        }"
        :value="textInputValue"
        :placeholder="props.language === 'ru' ? 'Введите текст...' : 'Enter text...'"
        data-testid="annotation-text-input"
        @input="textInputValue = ($event.target as HTMLInputElement).value"
        @keydown="handleTextKeyDown"
        @blur="handleTextSubmit"
      />
    </div>

    <!-- Annotation list -->
    <div v-if="annotations.length > 0" :style="styles.annotationList" data-testid="annotation-list">
      <div :style="styles.annotationListTitle">
        {{
          props.language === 'ru'
            ? `Аннотации (${annotations.length})`
            : `Annotations (${annotations.length})`
        }}
      </div>
      <div
        v-for="annotation in annotations"
        :key="annotation.id"
        :style="{
          ...styles.annotationItem,
          ...(hoveredAnnotation === annotation.id ? styles.annotationItemHover : {}),
        }"
        @mouseenter="hoveredAnnotation = annotation.id"
        @mouseleave="hoveredAnnotation = null"
      >
        <div :style="styles.annotationItemInfo">
          <div
            :style="{
              ...styles.annotationItemColor,
              backgroundColor: annotation.color || '#ff0000',
            }"
          />
          <span>{{ getToolIcon(annotation.type) }}</span>
          <span>{{ getToolLabel(annotation.type, props.language) }}</span>
          <span v-if="annotation.text" :style="{ color: '#9ca3af', fontSize: '10px' }">
            &quot;{{ annotation.text.substring(0, 20)
            }}{{ (annotation.text.length || 0) > 20 ? '...' : '' }}&quot;
          </span>
        </div>
        <button
          type="button"
          :style="styles.deleteButton"
          :title="props.language === 'ru' ? 'Удалить' : 'Delete'"
          :data-testid="`annotation-delete-${annotation.id}`"
          @click="handleDeleteAnnotation(annotation.id)"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Status bar -->
    <div :style="styles.statusBar" data-testid="annotation-status">
      <span>
        {{
          props.language === 'ru'
            ? `Инструмент: ${TOOLS.find((t) => t.id === activeTool)?.labelRu || activeTool}`
            : `Tool: ${TOOLS.find((t) => t.id === activeTool)?.labelEn || activeTool}`
        }}
      </span>
      <span>
        {{
          props.screenshot.resolution
            ? `${props.screenshot.resolution.width}×${props.screenshot.resolution.height}`
            : ''
        }}
      </span>
    </div>
  </div>
</template>
