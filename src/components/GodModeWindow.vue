<!--
  GodModeWindow Component (Vue 3 SFC)

  Unified floating window for Developer Mode features in GOD MODE.
  Provides a tabbed interface combining DevModeQueryPanel, ComponentContextPanel,
  and ExtendedSearchPanel in a single draggable, resizable window.

  TASK 54: Unified DevMode Window (Phase 9 - GOD MODE)

  Features:
  - Drag-and-drop window movement
  - Resizable edges and corners
  - Tab system for DevMode panels
  - Position and size persistence in localStorage
  - Keyboard shortcuts (Ctrl+Shift+G to toggle)
  - Pin/Minimize/Close buttons
  - Vue Teleport for z-index management

  Migrated from GodModeWindow.tsx to Vue 3.0 SFC
-->
<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, type CSSProperties } from 'vue'
import { useIsDevModeEnabled } from '../lib/devmode'
import {
  type GodModeTab,
  type GodModeConfig,
  type GodModeWindowState,
  type WindowPosition,
  type DragState,
  type ResizeState,
  GOD_MODE_TABS,
  DEFAULT_GOD_MODE_CONFIG,
  DEFAULT_WINDOW_STATE,
  loadGodModeState,
  saveGodModeState,
  constrainPosition,
  constrainSize,
  matchesShortcut,
} from '../types/god-mode'
import type { QueryLanguage } from '../types/ai-query'

// Lazy-loaded panel components for code splitting
import DevModeQueryPanel from './DevModeQueryPanel.vue'
import ComponentContextPanel from './ComponentContextPanel.vue'
import ExtendedSearchPanel from './ExtendedSearchPanel.vue'
import ConversationPanel from './ConversationPanel.vue'
import IssueDraftPanel from './IssueDraftPanel.vue'

// ============================================================================
// Types
// ============================================================================

// (All types imported from ../types/god-mode)

// ============================================================================
// Props & Emits
// ============================================================================

const props = withDefaults(
  defineProps<{
    /** Configuration options */
    config?: GodModeConfig
    /** Currently selected component ID (for context panel) */
    selectedComponentId?: string | null
    /** Custom styles for the window container */
    style?: CSSProperties
    /** Custom class name */
    className?: string
  }>(),
  {
    config: undefined,
    selectedComponentId: null,
    style: undefined,
    className: '',
  }
)

const emit = defineEmits<{
  (e: 'open'): void
  (e: 'close'): void
  (e: 'tabChange', tab: GodModeTab): void
  (e: 'componentSelect', componentId: string): void
}>()

// ============================================================================
// State
// ============================================================================

const isDevModeEnabled = useIsDevModeEnabled()

// Merged config
const config = computed<GodModeConfig>(() => ({
  ...DEFAULT_GOD_MODE_CONFIG,
  ...props.config,
  shortcuts: {
    ...DEFAULT_GOD_MODE_CONFIG.shortcuts,
    ...props.config?.shortcuts,
  },
}))

// Window state
const windowState = ref<GodModeWindowState>(
  config.value.persistState ? loadGodModeState() : DEFAULT_WINDOW_STATE
)

// Drag state
const dragState = ref<DragState>({
  isDragging: false,
  startX: 0,
  startY: 0,
  startWindowX: 0,
  startWindowY: 0,
})

// Resize state
const resizeState = ref<ResizeState>({
  isResizing: false,
  edge: null,
  startX: 0,
  startY: 0,
  startWidth: 0,
  startHeight: 0,
  startWindowX: 0,
  startWindowY: 0,
})

// Hover states for buttons
const hoveredButton = ref<string | null>(null)
const hoveredTab = ref<GodModeTab | null>(null)

// Template refs
const containerRef = ref<HTMLDivElement | null>(null)

// Detect language
const language = computed<QueryLanguage>(() => config.value.preferredLanguage || 'ru')

// Computed visibility
const isVisible = computed(() => isDevModeEnabled.value && windowState.value.state !== 'closed')
const isMinimized = computed(() => windowState.value.state === 'minimized')

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 10005,
  },
  container: {
    position: 'absolute',
    backgroundColor: 'rgba(18, 18, 28, 0.98)',
    border: '1px solid rgba(139, 92, 246, 0.4)',
    borderRadius: '12px',
    boxShadow: '0 12px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(139, 92, 246, 0.2)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '13px',
    color: '#e5e7eb',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    pointerEvents: 'auto',
  },
  containerPinned: {
    borderColor: 'rgba(234, 179, 8, 0.5)',
    boxShadow: '0 12px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(234, 179, 8, 0.3)',
  },
  containerMinimized: {
    height: '48px !important',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderBottom: '1px solid rgba(139, 92, 246, 0.25)',
    cursor: 'move',
    userSelect: 'none',
    flexShrink: 0,
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#c4b5fd',
  },
  headerIcon: {
    fontSize: '18px',
  },
  headerButtons: {
    display: 'flex',
    gap: '6px',
  },
  headerButton: {
    background: 'none',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '6px',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '4px 8px',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  headerButtonActive: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    borderColor: 'rgba(234, 179, 8, 0.4)',
    color: '#fcd34d',
  },
  headerButtonHover: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: 'rgba(139, 92, 246, 0.5)',
    color: '#c4b5fd',
  },
  tabBar: {
    display: 'flex',
    gap: '2px',
    padding: '8px 12px 0',
    backgroundColor: 'rgba(30, 30, 45, 0.5)',
    borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
    flexShrink: 0,
    overflowX: 'auto',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    backgroundColor: 'transparent',
    border: 'none',
    borderTopLeftRadius: '8px',
    borderTopRightRadius: '8px',
    color: '#9ca3af',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
  },
  tabActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    color: '#c4b5fd',
    borderBottom: '2px solid #8b5cf6',
    marginBottom: '-1px',
  },
  tabHover: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    color: '#d8b4fe',
  },
  tabIcon: {
    fontSize: '14px',
  },
  tabDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    position: 'relative',
  },
  panelWrapper: {
    position: 'absolute',
    inset: 0,
  },
  embeddedPanel: {
    position: 'relative',
    top: 'auto',
    left: 'auto',
    right: 'auto',
    bottom: 'auto',
    width: '100%',
    height: '100%',
    maxWidth: 'none',
    minWidth: 'auto',
    maxHeight: 'none',
    border: 'none',
    borderRadius: 0,
    boxShadow: 'none',
    backgroundColor: 'transparent',
    zIndex: 'auto',
  },
  resizeHandle: {
    position: 'absolute',
    zIndex: 10,
  },
  resizeN: {
    top: 0,
    left: '10px',
    right: '10px',
    height: '6px',
    cursor: 'ns-resize',
  },
  resizeS: {
    bottom: 0,
    left: '10px',
    right: '10px',
    height: '6px',
    cursor: 'ns-resize',
  },
  resizeE: {
    right: 0,
    top: '10px',
    bottom: '10px',
    width: '6px',
    cursor: 'ew-resize',
  },
  resizeW: {
    left: 0,
    top: '10px',
    bottom: '10px',
    width: '6px',
    cursor: 'ew-resize',
  },
  resizeNE: {
    top: 0,
    right: 0,
    width: '12px',
    height: '12px',
    cursor: 'nesw-resize',
  },
  resizeNW: {
    top: 0,
    left: 0,
    width: '12px',
    height: '12px',
    cursor: 'nwse-resize',
  },
  resizeSE: {
    bottom: 0,
    right: 0,
    width: '12px',
    height: '12px',
    cursor: 'nwse-resize',
  },
  resizeSW: {
    bottom: 0,
    left: 0,
    width: '12px',
    height: '12px',
    cursor: 'nesw-resize',
  },
  placeholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#6b7280',
    textAlign: 'center',
    padding: '24px',
  },
  shortcutHint: {
    position: 'absolute',
    bottom: '8px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '10px',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  kbd: {
    padding: '2px 6px',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '10px',
  },
}

// Computed container style
const containerStyle = computed<CSSProperties>(() => ({
  ...styles.container,
  ...(windowState.value.isPinned ? styles.containerPinned : {}),
  left: `${windowState.value.position.x}px`,
  top: `${windowState.value.position.y}px`,
  width: `${windowState.value.size.width}px`,
  height: isMinimized.value ? '48px' : `${windowState.value.size.height}px`,
  ...props.style,
}))

// ============================================================================
// Methods
// ============================================================================

/** Open the window */
function openWindow() {
  windowState.value = {
    ...windowState.value,
    state: 'open',
    lastOpened: new Date().toISOString(),
  }
  emit('open')
}
void openWindow // Marked as used for API completeness

/** Close the window */
function closeWindow() {
  windowState.value = {
    ...windowState.value,
    state: 'closed',
  }
  emit('close')
}

/** Toggle minimize */
function minimizeWindow() {
  windowState.value = {
    ...windowState.value,
    state: windowState.value.state === 'minimized' ? 'open' : 'minimized',
  }
}

/** Toggle window open/closed */
function toggleWindow() {
  if (windowState.value.state === 'closed') {
    emit('open')
    windowState.value = {
      ...windowState.value,
      state: 'open',
      lastOpened: new Date().toISOString(),
    }
  } else {
    emit('close')
    windowState.value = {
      ...windowState.value,
      state: 'closed',
    }
  }
}

/** Toggle pin state */
function togglePin() {
  windowState.value = {
    ...windowState.value,
    isPinned: !windowState.value.isPinned,
  }
}

/** Set active tab */
function setActiveTab(tab: GodModeTab) {
  windowState.value = {
    ...windowState.value,
    activeTab: tab,
  }
  emit('tabChange', tab)
}

/** Handle component selection from context panel */
function handleComponentSelect(componentId: string) {
  emit('componentSelect', componentId)
}

/** Handle drag start */
function handleDragStart(e: MouseEvent) {
  if (e.button !== 0) return // Only left click
  e.preventDefault()

  dragState.value = {
    isDragging: true,
    startX: e.clientX,
    startY: e.clientY,
    startWindowX: windowState.value.position.x,
    startWindowY: windowState.value.position.y,
  }
}

/** Handle resize start for a given edge */
function handleResizeStart(edge: ResizeState['edge']) {
  return (e: MouseEvent) => {
    if (e.button !== 0) return // Only left click
    e.preventDefault()
    e.stopPropagation()

    resizeState.value = {
      isResizing: true,
      edge,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: windowState.value.size.width,
      startHeight: windowState.value.size.height,
      startWindowX: windowState.value.position.x,
      startWindowY: windowState.value.position.y,
    }
  }
}

/** Get tab style based on state */
function getTabStyle(tabId: GodModeTab, isAvailable: boolean): CSSProperties {
  const isActive = windowState.value.activeTab === tabId
  const isHovered = hoveredTab.value === tabId
  const isDisabled = !isAvailable

  return {
    ...styles.tab,
    ...(isActive ? styles.tabActive : {}),
    ...(isHovered && !isActive && !isDisabled ? styles.tabHover : {}),
    ...(isDisabled ? styles.tabDisabled : {}),
  }
}

/** Get pin button style */
function getPinButtonStyle(): CSSProperties {
  return {
    ...styles.headerButton,
    ...(windowState.value.isPinned ? styles.headerButtonActive : {}),
    ...(hoveredButton.value === 'pin' && !windowState.value.isPinned
      ? styles.headerButtonHover
      : {}),
  }
}

/** Get minimize button style */
function getMinimizeButtonStyle(): CSSProperties {
  return {
    ...styles.headerButton,
    ...(hoveredButton.value === 'minimize' ? styles.headerButtonHover : {}),
  }
}

/** Get close button style */
function getCloseButtonStyle(): CSSProperties {
  return {
    ...styles.headerButton,
    ...(hoveredButton.value === 'close' ? { ...styles.headerButtonHover, color: '#ef4444' } : {}),
  }
}

/** Handle draft events from IssueDraftPanel */
function handleDraftCreated(draft: unknown) {
  console.log('Draft created:', draft)
}

function handleDraftUpdated(draft: unknown) {
  console.log('Draft updated:', draft)
}

function handleDraftReady(draft: unknown) {
  console.log('Draft ready for publishing:', draft)
}

function handleIssuePublished(result: unknown) {
  console.log('Issue published:', result)
}

// ============================================================================
// Watchers & Lifecycle
// ============================================================================

// Persist state when it changes
watch(
  windowState,
  (newState) => {
    if (config.value.persistState) {
      saveGodModeState(newState)
    }
  },
  { deep: true }
)

// Drag move handler
function onDragMouseMove(e: MouseEvent) {
  if (!dragState.value.isDragging) return

  const deltaX = e.clientX - dragState.value.startX
  const deltaY = e.clientY - dragState.value.startY

  const newPosition: WindowPosition = constrainPosition(
    {
      x: dragState.value.startWindowX + deltaX,
      y: dragState.value.startWindowY + deltaY,
    },
    windowState.value.size,
    window.innerWidth,
    window.innerHeight
  )

  windowState.value = {
    ...windowState.value,
    position: newPosition,
  }
}

function onDragMouseUp() {
  dragState.value = { ...dragState.value, isDragging: false }
}

// Resize move handler
function onResizeMouseMove(e: MouseEvent) {
  const currentEdge = resizeState.value.edge
  if (!resizeState.value.isResizing || !currentEdge) return

  const deltaX = e.clientX - resizeState.value.startX
  const deltaY = e.clientY - resizeState.value.startY

  let newWidth = resizeState.value.startWidth
  let newHeight = resizeState.value.startHeight
  let newX = resizeState.value.startWindowX
  let newY = resizeState.value.startWindowY

  // Handle horizontal resize
  if (currentEdge.includes('e')) {
    newWidth = resizeState.value.startWidth + deltaX
  } else if (currentEdge.includes('w')) {
    newWidth = resizeState.value.startWidth - deltaX
    newX = resizeState.value.startWindowX + deltaX
  }

  // Handle vertical resize
  if (currentEdge.includes('s')) {
    newHeight = resizeState.value.startHeight + deltaY
  } else if (currentEdge.includes('n')) {
    newHeight = resizeState.value.startHeight - deltaY
    newY = resizeState.value.startWindowY + deltaY
  }

  const constrainedSize = constrainSize({
    ...windowState.value.size,
    width: newWidth,
    height: newHeight,
  })

  // Adjust position if resizing from left or top
  if (currentEdge.includes('w') && constrainedSize.width !== newWidth) {
    newX = resizeState.value.startWindowX + (resizeState.value.startWidth - constrainedSize.width)
  }
  if (currentEdge.includes('n') && constrainedSize.height !== newHeight) {
    newY = resizeState.value.startWindowY + (resizeState.value.startHeight - constrainedSize.height)
  }

  const constrainedPosition = constrainPosition(
    { x: newX, y: newY },
    constrainedSize,
    window.innerWidth,
    window.innerHeight
  )

  windowState.value = {
    ...windowState.value,
    size: constrainedSize,
    position: constrainedPosition,
  }
}

function onResizeMouseUp() {
  resizeState.value = { ...resizeState.value, isResizing: false, edge: null }
}

// Combined mouse move/up handler
function onMouseMove(e: MouseEvent) {
  if (dragState.value.isDragging) {
    onDragMouseMove(e)
  }
  if (resizeState.value.isResizing) {
    onResizeMouseMove(e)
  }
}

function onMouseUp() {
  if (dragState.value.isDragging) {
    onDragMouseUp()
  }
  if (resizeState.value.isResizing) {
    onResizeMouseUp()
  }
}

// Keyboard shortcut handler
function onKeyDown(e: KeyboardEvent) {
  const shortcut = config.value.shortcuts?.toggleWindow || 'Ctrl+Shift+G'
  if (matchesShortcut(e, shortcut)) {
    e.preventDefault()
    toggleWindow()
  }
  // Escape to minimize
  if (e.key === 'Escape' && windowState.value.state === 'open') {
    e.preventDefault()
    minimizeWindow()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="isVisible" :style="styles.overlay" data-testid="god-mode-overlay">
      <div
        ref="containerRef"
        :class="props.className"
        :style="containerStyle"
        data-testid="god-mode-window"
      >
        <!-- Header (drag handle) -->
        <div :style="styles.header" data-testid="god-mode-header" @mousedown="handleDragStart">
          <div :style="styles.headerTitle">
            <span :style="styles.headerIcon">&#9889;</span>
            <span>GOD MODE</span>
          </div>
          <div :style="styles.headerButtons">
            <!-- Pin button -->
            <button
              type="button"
              :style="getPinButtonStyle()"
              :title="
                language === 'ru' ? '\u0417\u0430\u043A\u0440\u0435\u043F\u0438\u0442\u044C' : 'Pin'
              "
              data-testid="god-mode-pin"
              @click="togglePin"
              @mouseenter="hoveredButton = 'pin'"
              @mouseleave="hoveredButton = null"
            >
              &#128204;
            </button>
            <!-- Minimize button -->
            <button
              type="button"
              :style="getMinimizeButtonStyle()"
              :title="
                language === 'ru'
                  ? isMinimized
                    ? '\u0420\u0430\u0437\u0432\u0435\u0440\u043D\u0443\u0442\u044C'
                    : '\u0421\u0432\u0435\u0440\u043D\u0443\u0442\u044C'
                  : isMinimized
                    ? 'Expand'
                    : 'Minimize'
              "
              data-testid="god-mode-minimize"
              @click="minimizeWindow"
              @mouseenter="hoveredButton = 'minimize'"
              @mouseleave="hoveredButton = null"
            >
              {{ isMinimized ? '\uD83D\uDD3C' : '\uD83D\uDD3D' }}
            </button>
            <!-- Close button -->
            <button
              type="button"
              :style="getCloseButtonStyle()"
              :title="language === 'ru' ? '\u0417\u0430\u043A\u0440\u044B\u0442\u044C' : 'Close'"
              data-testid="god-mode-close"
              @click="closeWindow"
              @mouseenter="hoveredButton = 'close'"
              @mouseleave="hoveredButton = null"
            >
              &#10005;
            </button>
          </div>
        </div>

        <!-- Tab bar (hidden when minimized) -->
        <div v-if="!isMinimized" :style="styles.tabBar" data-testid="god-mode-tabs">
          <button
            v-for="tab in GOD_MODE_TABS"
            :key="tab.id"
            type="button"
            :style="getTabStyle(tab.id, tab.available)"
            :disabled="!tab.available"
            :title="language === 'ru' ? tab.descriptionRu : tab.descriptionEn"
            :data-testid="`god-mode-tab-${tab.id}`"
            @click="tab.available && setActiveTab(tab.id)"
            @mouseenter="hoveredTab = tab.id"
            @mouseleave="hoveredTab = null"
          >
            <span :style="styles.tabIcon">{{ tab.icon }}</span>
            <span>{{ language === 'ru' ? tab.labelRu : tab.labelEn }}</span>
          </button>
        </div>

        <!-- Content area (hidden when minimized) -->
        <div v-if="!isMinimized" :style="styles.content" data-testid="god-mode-content">
          <div :style="styles.panelWrapper">
            <!-- Tab content -->
            <DevModeQueryPanel
              v-if="windowState.activeTab === 'query'"
              :initial-expanded="true"
              position="top-left"
              :style="styles.embeddedPanel"
            />

            <ComponentContextPanel
              v-if="windowState.activeTab === 'context'"
              :component-id="props.selectedComponentId"
              :on-related-component-select="handleComponentSelect"
              :initial-expanded="true"
              position="top-left"
              :style="styles.embeddedPanel"
            />

            <ExtendedSearchPanel
              v-if="windowState.activeTab === 'search'"
              :initial-expanded="true"
              position="top-left"
              :on-component-select="(comp: { id: string }) => handleComponentSelect(comp.id)"
              :style="styles.embeddedPanel"
            />

            <ConversationPanel
              v-if="windowState.activeTab === 'conversation'"
              :selected-component-id="props.selectedComponentId"
              :on-component-select="handleComponentSelect"
              :settings="{ preferredLanguage: language }"
              :style="styles.embeddedPanel"
            />

            <IssueDraftPanel
              v-if="windowState.activeTab === 'issues'"
              :conversation-messages="[]"
              :language="language"
              :show-advanced-options="true"
              :style="styles.embeddedPanel"
              :github-owner="config.github?.owner"
              :github-repo="config.github?.repo"
              @draft-created="handleDraftCreated"
              @draft-updated="handleDraftUpdated"
              @draft-ready="handleDraftReady"
              @issue-published="handleIssuePublished"
            />
          </div>

          <slot />

          <!-- Keyboard shortcut hint -->
          <div :style="styles.shortcutHint">
            <span :style="styles.kbd">{{ config.shortcuts?.toggleWindow || 'Ctrl+Shift+G' }}</span>
            <span>{{
              language === 'ru'
                ? '\u043E\u0442\u043A\u0440\u044B\u0442\u044C/\u0437\u0430\u043A\u0440\u044B\u0442\u044C'
                : 'toggle'
            }}</span>
          </div>
        </div>

        <!-- Resize handles (hidden when minimized) -->
        <template v-if="!isMinimized">
          <div
            :style="{ ...styles.resizeHandle, ...styles.resizeN }"
            @mousedown="handleResizeStart('n')($event)"
          />
          <div
            :style="{ ...styles.resizeHandle, ...styles.resizeS }"
            @mousedown="handleResizeStart('s')($event)"
          />
          <div
            :style="{ ...styles.resizeHandle, ...styles.resizeE }"
            @mousedown="handleResizeStart('e')($event)"
          />
          <div
            :style="{ ...styles.resizeHandle, ...styles.resizeW }"
            @mousedown="handleResizeStart('w')($event)"
          />
          <div
            :style="{ ...styles.resizeHandle, ...styles.resizeNE }"
            @mousedown="handleResizeStart('ne')($event)"
          />
          <div
            :style="{ ...styles.resizeHandle, ...styles.resizeNW }"
            @mousedown="handleResizeStart('nw')($event)"
          />
          <div
            :style="{ ...styles.resizeHandle, ...styles.resizeSE }"
            @mousedown="handleResizeStart('se')($event)"
          />
          <div
            :style="{ ...styles.resizeHandle, ...styles.resizeSW }"
            @mousedown="handleResizeStart('sw')($event)"
          />
        </template>
      </div>
    </div>
  </Teleport>
</template>
