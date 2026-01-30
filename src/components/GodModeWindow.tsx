/**
 * GodModeWindow Component
 *
 * Unified floating window for Developer Mode features in GOD MODE.
 * Provides a tabbed interface combining DevModeQueryPanel, ComponentContextPanel,
 * and ExtendedSearchPanel in a single draggable, resizable window.
 *
 * TASK 54: Unified DevMode Window (Phase 9 - GOD MODE)
 *
 * Features:
 * - Drag-and-drop window movement
 * - Resizable edges and corners
 * - Tab system for DevMode panels
 * - Position and size persistence in localStorage
 * - Keyboard shortcuts (Ctrl+Shift+G to toggle)
 * - Pin/Minimize/Close buttons
 * - React Portal for z-index management
 */

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
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
import { DevModeQueryPanel } from './DevModeQueryPanel'
import { ComponentContextPanel } from './ComponentContextPanel'
import { ExtendedSearchPanel } from './ExtendedSearchPanel'
import { ConversationPanel } from './ConversationPanel'

/**
 * Props for GodModeWindow
 */
export interface GodModeWindowProps {
  /** Configuration options */
  config?: GodModeConfig
  /** Currently selected component ID (for context panel) */
  selectedComponentId?: string | null
  /** Custom styles for the window container */
  style?: CSSProperties
  /** Custom class name */
  className?: string
  /** Callback when window is opened */
  onOpen?: () => void
  /** Callback when window is closed */
  onClose?: () => void
  /** Callback when tab changes */
  onTabChange?: (tab: GodModeTab) => void
  /** Callback when a related component is selected */
  onComponentSelect?: (componentId: string) => void
  /** Child components to render */
  children?: ReactNode
}

/**
 * Styles for the component
 */
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
  // Embedded panels have different styling - remove fixed positioning
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

/**
 * GodModeWindow Component
 */
export function GodModeWindow({
  config: customConfig,
  selectedComponentId,
  style,
  className,
  onOpen,
  onClose,
  onTabChange,
  onComponentSelect,
  children,
}: GodModeWindowProps) {
  const isDevModeEnabled = useIsDevModeEnabled()

  // Merged config
  const config: GodModeConfig = useMemo(
    () => ({
      ...DEFAULT_GOD_MODE_CONFIG,
      ...customConfig,
      shortcuts: {
        ...DEFAULT_GOD_MODE_CONFIG.shortcuts,
        ...customConfig?.shortcuts,
      },
    }),
    [customConfig]
  )

  // Window state
  const [windowState, setWindowState] = useState<GodModeWindowState>(() =>
    config.persistState ? loadGodModeState() : DEFAULT_WINDOW_STATE
  )

  // Drag state
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    startWindowX: 0,
    startWindowY: 0,
  })

  // Resize state
  const [resizeState, setResizeState] = useState<ResizeState>({
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
  const [hoveredButton, setHoveredButton] = useState<string | null>(null)
  const [hoveredTab, setHoveredTab] = useState<GodModeTab | null>(null)

  // Refs
  const containerRef = useRef<HTMLDivElement>(null)

  // Detect language
  const language: QueryLanguage = config.preferredLanguage || 'ru'

  // Window actions - defined before useEffect that uses them
  const _openWindow = useCallback(() => {
    setWindowState((prev) => ({
      ...prev,
      state: 'open',
      lastOpened: new Date().toISOString(),
    }))
    onOpen?.()
  }, [onOpen])
  void _openWindow // Marked as used for API completeness

  const closeWindow = useCallback(() => {
    setWindowState((prev) => ({
      ...prev,
      state: 'closed',
    }))
    onClose?.()
  }, [onClose])

  const minimizeWindow = useCallback(() => {
    setWindowState((prev) => ({
      ...prev,
      state: prev.state === 'minimized' ? 'open' : 'minimized',
    }))
  }, [])

  const toggleWindow = useCallback(() => {
    setWindowState((prev) => {
      if (prev.state === 'closed') {
        onOpen?.()
        return {
          ...prev,
          state: 'open',
          lastOpened: new Date().toISOString(),
        }
      } else {
        onClose?.()
        return {
          ...prev,
          state: 'closed',
        }
      }
    })
  }, [onOpen, onClose])

  const togglePin = useCallback(() => {
    setWindowState((prev) => ({
      ...prev,
      isPinned: !prev.isPinned,
    }))
  }, [])

  // Tab actions
  const setActiveTab = useCallback(
    (tab: GodModeTab) => {
      setWindowState((prev) => ({
        ...prev,
        activeTab: tab,
      }))
      onTabChange?.(tab)
    },
    [onTabChange]
  )

  // Persist state when it changes
  useEffect(() => {
    if (config.persistState) {
      saveGodModeState(windowState)
    }
  }, [windowState, config.persistState])

  // Keyboard shortcut: Ctrl+Shift+G to toggle window
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const shortcut = config.shortcuts?.toggleWindow || 'Ctrl+Shift+G'
      if (matchesShortcut(e, shortcut)) {
        e.preventDefault()
        toggleWindow()
      }
      // Escape to minimize
      if (e.key === 'Escape' && windowState.state === 'open') {
        e.preventDefault()
        minimizeWindow()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [windowState.state, config.shortcuts, toggleWindow, minimizeWindow])

  // Handle drag start
  const handleDragStart = useCallback(
    (e: ReactMouseEvent) => {
      if (e.button !== 0) return // Only left click
      e.preventDefault()

      setDragState({
        isDragging: true,
        startX: e.clientX,
        startY: e.clientY,
        startWindowX: windowState.position.x,
        startWindowY: windowState.position.y,
      })
    },
    [windowState.position]
  )

  // Handle drag move
  useEffect(() => {
    if (!dragState.isDragging) return

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      const deltaX = e.clientX - dragState.startX
      const deltaY = e.clientY - dragState.startY

      const newPosition: WindowPosition = constrainPosition(
        {
          x: dragState.startWindowX + deltaX,
          y: dragState.startWindowY + deltaY,
        },
        windowState.size,
        window.innerWidth,
        window.innerHeight
      )

      setWindowState((prev) => ({
        ...prev,
        position: newPosition,
      }))
    }

    const handleMouseUp = () => {
      setDragState((prev) => ({ ...prev, isDragging: false }))
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragState, windowState.size])

  // Handle resize start
  const handleResizeStart = useCallback(
    (edge: ResizeState['edge']) => (e: ReactMouseEvent) => {
      if (e.button !== 0) return // Only left click
      e.preventDefault()
      e.stopPropagation()

      setResizeState({
        isResizing: true,
        edge,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: windowState.size.width,
        startHeight: windowState.size.height,
        startWindowX: windowState.position.x,
        startWindowY: windowState.position.y,
      })
    },
    [windowState.size, windowState.position]
  )

  // Handle resize move
  useEffect(() => {
    const currentEdge = resizeState.edge
    if (!resizeState.isResizing || !currentEdge) return

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      const deltaX = e.clientX - resizeState.startX
      const deltaY = e.clientY - resizeState.startY

      let newWidth = resizeState.startWidth
      let newHeight = resizeState.startHeight
      let newX = resizeState.startWindowX
      let newY = resizeState.startWindowY

      // Handle horizontal resize
      if (currentEdge.includes('e')) {
        newWidth = resizeState.startWidth + deltaX
      } else if (currentEdge.includes('w')) {
        newWidth = resizeState.startWidth - deltaX
        newX = resizeState.startWindowX + deltaX
      }

      // Handle vertical resize
      if (currentEdge.includes('s')) {
        newHeight = resizeState.startHeight + deltaY
      } else if (currentEdge.includes('n')) {
        newHeight = resizeState.startHeight - deltaY
        newY = resizeState.startWindowY + deltaY
      }

      const constrainedSize = constrainSize({
        ...windowState.size,
        width: newWidth,
        height: newHeight,
      })

      // Adjust position if resizing from left or top
      if (currentEdge.includes('w') && constrainedSize.width !== newWidth) {
        newX = resizeState.startWindowX + (resizeState.startWidth - constrainedSize.width)
      }
      if (currentEdge.includes('n') && constrainedSize.height !== newHeight) {
        newY = resizeState.startWindowY + (resizeState.startHeight - constrainedSize.height)
      }

      const constrainedPosition = constrainPosition(
        { x: newX, y: newY },
        constrainedSize,
        window.innerWidth,
        window.innerHeight
      )

      setWindowState((prev) => ({
        ...prev,
        size: constrainedSize,
        position: constrainedPosition,
      }))
    }

    const handleMouseUp = () => {
      setResizeState((prev) => ({ ...prev, isResizing: false, edge: null }))
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizeState, windowState.size])

  // Handle component selection from context panel
  const handleComponentSelect = useCallback(
    (componentId: string) => {
      onComponentSelect?.(componentId)
    },
    [onComponentSelect]
  )

  // Render tab content
  const renderTabContent = useCallback(() => {
    const { activeTab, state } = windowState

    if (state === 'minimized') {
      return null
    }

    switch (activeTab) {
      case 'query':
        return (
          <DevModeQueryPanel
            initialExpanded={true}
            position="top-left"
            style={styles.embeddedPanel}
          />
        )

      case 'context':
        return (
          <ComponentContextPanel
            componentId={selectedComponentId}
            onRelatedComponentSelect={handleComponentSelect}
            initialExpanded={true}
            position="top-left"
            style={styles.embeddedPanel}
          />
        )

      case 'search':
        return (
          <ExtendedSearchPanel
            initialExpanded={true}
            position="top-left"
            onComponentSelect={(comp) => handleComponentSelect(comp.id)}
            style={styles.embeddedPanel}
          />
        )

      case 'conversation':
        return (
          <ConversationPanel
            selectedComponentId={selectedComponentId}
            onComponentSelect={handleComponentSelect}
            settings={{ preferredLanguage: language }}
            style={styles.embeddedPanel}
          />
        )

      case 'issues':
        return (
          <div style={styles.placeholder}>
            <div>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📝</div>
              <div style={{ marginBottom: '8px' }}>
                {language === 'ru' ? 'Черновики GitHub Issues' : 'GitHub Issue drafts'}
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                {language === 'ru' ? 'Будет реализовано в TASK 56' : 'Coming in TASK 56'}
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }, [windowState, selectedComponentId, handleComponentSelect, language])

  // Don't render if DevMode is not enabled or window is closed
  if (!isDevModeEnabled || windowState.state === 'closed') {
    return null
  }

  const isMinimized = windowState.state === 'minimized'

  // Compute final styles
  const containerStyle: CSSProperties = {
    ...styles.container,
    ...(windowState.isPinned ? styles.containerPinned : {}),
    left: windowState.position.x,
    top: windowState.position.y,
    width: windowState.size.width,
    height: isMinimized ? 48 : windowState.size.height,
    ...style,
  }

  // Render via portal for z-index management
  return createPortal(
    <div style={styles.overlay} data-testid="god-mode-overlay">
      <div
        ref={containerRef}
        className={className}
        style={containerStyle}
        data-testid="god-mode-window"
      >
        {/* Header (drag handle) */}
        <div style={styles.header} onMouseDown={handleDragStart} data-testid="god-mode-header">
          <div style={styles.headerTitle}>
            <span style={styles.headerIcon}>⚡</span>
            <span>GOD MODE</span>
          </div>
          <div style={styles.headerButtons}>
            {/* Pin button */}
            <button
              type="button"
              style={{
                ...styles.headerButton,
                ...(windowState.isPinned ? styles.headerButtonActive : {}),
                ...(hoveredButton === 'pin' && !windowState.isPinned
                  ? styles.headerButtonHover
                  : {}),
              }}
              onClick={togglePin}
              onMouseEnter={() => setHoveredButton('pin')}
              onMouseLeave={() => setHoveredButton(null)}
              title={language === 'ru' ? 'Закрепить' : 'Pin'}
              data-testid="god-mode-pin"
            >
              📌
            </button>
            {/* Minimize button */}
            <button
              type="button"
              style={{
                ...styles.headerButton,
                ...(hoveredButton === 'minimize' ? styles.headerButtonHover : {}),
              }}
              onClick={minimizeWindow}
              onMouseEnter={() => setHoveredButton('minimize')}
              onMouseLeave={() => setHoveredButton(null)}
              title={
                language === 'ru'
                  ? isMinimized
                    ? 'Развернуть'
                    : 'Свернуть'
                  : isMinimized
                    ? 'Expand'
                    : 'Minimize'
              }
              data-testid="god-mode-minimize"
            >
              {isMinimized ? '🔼' : '🔽'}
            </button>
            {/* Close button */}
            <button
              type="button"
              style={{
                ...styles.headerButton,
                ...(hoveredButton === 'close'
                  ? { ...styles.headerButtonHover, color: '#ef4444' }
                  : {}),
              }}
              onClick={closeWindow}
              onMouseEnter={() => setHoveredButton('close')}
              onMouseLeave={() => setHoveredButton(null)}
              title={language === 'ru' ? 'Закрыть' : 'Close'}
              data-testid="god-mode-close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab bar (hidden when minimized) */}
        {!isMinimized && (
          <div style={styles.tabBar} data-testid="god-mode-tabs">
            {GOD_MODE_TABS.map((tab) => {
              const isActive = windowState.activeTab === tab.id
              const isHovered = hoveredTab === tab.id
              const isDisabled = !tab.available

              return (
                <button
                  key={tab.id}
                  type="button"
                  style={{
                    ...styles.tab,
                    ...(isActive ? styles.tabActive : {}),
                    ...(isHovered && !isActive && !isDisabled ? styles.tabHover : {}),
                    ...(isDisabled ? styles.tabDisabled : {}),
                  }}
                  onClick={() => !isDisabled && setActiveTab(tab.id)}
                  onMouseEnter={() => setHoveredTab(tab.id)}
                  onMouseLeave={() => setHoveredTab(null)}
                  disabled={isDisabled}
                  title={language === 'ru' ? tab.descriptionRu : tab.descriptionEn}
                  data-testid={`god-mode-tab-${tab.id}`}
                >
                  <span style={styles.tabIcon}>{tab.icon}</span>
                  <span>{language === 'ru' ? tab.labelRu : tab.labelEn}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Content area (hidden when minimized) */}
        {!isMinimized && (
          <div style={styles.content} data-testid="god-mode-content">
            <div style={styles.panelWrapper}>{renderTabContent()}</div>
            {children}

            {/* Keyboard shortcut hint */}
            <div style={styles.shortcutHint}>
              <span style={styles.kbd}>{config.shortcuts?.toggleWindow || 'Ctrl+Shift+G'}</span>
              <span>{language === 'ru' ? 'открыть/закрыть' : 'toggle'}</span>
            </div>
          </div>
        )}

        {/* Resize handles (hidden when minimized) */}
        {!isMinimized && (
          <>
            <div
              style={{ ...styles.resizeHandle, ...styles.resizeN }}
              onMouseDown={handleResizeStart('n')}
            />
            <div
              style={{ ...styles.resizeHandle, ...styles.resizeS }}
              onMouseDown={handleResizeStart('s')}
            />
            <div
              style={{ ...styles.resizeHandle, ...styles.resizeE }}
              onMouseDown={handleResizeStart('e')}
            />
            <div
              style={{ ...styles.resizeHandle, ...styles.resizeW }}
              onMouseDown={handleResizeStart('w')}
            />
            <div
              style={{ ...styles.resizeHandle, ...styles.resizeNE }}
              onMouseDown={handleResizeStart('ne')}
            />
            <div
              style={{ ...styles.resizeHandle, ...styles.resizeNW }}
              onMouseDown={handleResizeStart('nw')}
            />
            <div
              style={{ ...styles.resizeHandle, ...styles.resizeSE }}
              onMouseDown={handleResizeStart('se')}
            />
            <div
              style={{ ...styles.resizeHandle, ...styles.resizeSW }}
              onMouseDown={handleResizeStart('sw')}
            />
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

export default GodModeWindow
