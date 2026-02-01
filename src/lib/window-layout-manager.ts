/**
 * Window Layout Manager
 * Provides automatic window layout functions (arrange, tile, cascade)
 * 
 * Phase 11, TASK 77: Extended command bar features
 */

import type { WindowState } from '../composables/useWindowManager'

export type LayoutType = 'arrange' | 'tile' | 'cascade' | 'stack'

export interface LayoutOptions {
  type: LayoutType
  spacing?: number
  padding?: number
  excludeMinimized?: boolean
}

export interface WindowLayout {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Calculate optimal layout for windows based on available screen space
 */
export class WindowLayoutManager {
  private screenWidth: number
  private screenHeight: number
  private taskbarHeight: number = 60 // Reserve space for taskbar
  private headerHeight: number = 80 // Reserve space for header

  constructor(screenWidth: number = window.innerWidth, screenHeight: number = window.innerHeight) {
    this.screenWidth = screenWidth
    this.screenHeight = screenHeight
  }

  /**
   * Update screen dimensions (call on window resize)
   */
  updateScreenDimensions(width: number, height: number): void {
    this.screenWidth = width
    this.screenHeight = height
  }

  /**
   * Get the usable area for window layout (excluding header and taskbar)
   */
  private getUsableArea(): { width: number; height: number; startX: number; startY: number } {
    return {
      width: this.screenWidth,
      height: this.screenHeight - this.headerHeight - this.taskbarHeight,
      startX: 0,
      startY: this.headerHeight
    }
  }

  /**
   * Arrange windows in a grid layout
   */
  arrangeLayout(windows: WindowState[], options: LayoutOptions = { type: 'arrange' }): Map<string, WindowLayout> {
    if (windows.length === 0) return new Map()

    const { width, height, startX, startY } = this.getUsableArea()
    const spacing = options.spacing ?? 20
    const padding = options.padding ?? 20
    const excludeMinimized = options.excludeMinimized ?? true

    const visibleWindows = excludeMinimized 
      ? windows.filter(w => !w.isMinimized && w.isOpen)
      : windows.filter(w => w.isOpen)

    if (visibleWindows.length === 0) return new Map()

    // Calculate grid dimensions
    const cols = Math.ceil(Math.sqrt(visibleWindows.length))
    const rows = Math.ceil(visibleWindows.length / cols)

    const cellWidth = (width - padding * 2 - spacing * (cols - 1)) / cols
    const cellHeight = (height - padding * 2 - spacing * (rows - 1)) / rows

    const layouts = new Map<string, WindowLayout>()

    visibleWindows.forEach((window, index) => {
      const col = index % cols
      const row = Math.floor(index / cols)

      layouts.set(window.id, {
        x: startX + padding + col * (cellWidth + spacing),
        y: startY + padding + row * (cellHeight + spacing),
        width: Math.max(cellWidth, window.minWidth || 200),
        height: Math.max(cellHeight, window.minHeight || 150)
      })
    })

    return layouts
  }

  /**
   * Tile windows horizontally or vertically
   */
  tileLayout(windows: WindowState[], options: LayoutOptions = { type: 'tile' }): Map<string, WindowLayout> {
    if (windows.length === 0) return new Map()

    const { width, height, startX, startY } = this.getUsableArea()
    const spacing = options.spacing ?? 0
    const excludeMinimized = options.excludeMinimized ?? true

    const visibleWindows = excludeMinimized 
      ? windows.filter(w => !w.isMinimized && w.isOpen)
      : windows.filter(w => w.isOpen)

    if (visibleWindows.length === 0) return new Map()

    const layouts = new Map<string, WindowLayout>()

    // Determine if we should tile horizontally or vertically based on aspect ratio
    const aspectRatio = width / height
    const tileHorizontally = aspectRatio > 1.5

    if (tileHorizontally) {
      const tileWidth = (width - spacing * (visibleWindows.length - 1)) / visibleWindows.length

      visibleWindows.forEach((window, index) => {
        layouts.set(window.id, {
          x: startX + index * (tileWidth + spacing),
          y: startY,
          width: Math.max(tileWidth, window.minWidth || 200),
          height: Math.max(height, window.minHeight || 150)
        })
      })
    } else {
      const tileHeight = (height - spacing * (visibleWindows.length - 1)) / visibleWindows.length

      visibleWindows.forEach((window, index) => {
        layouts.set(window.id, {
          x: startX,
          y: startY + index * (tileHeight + spacing),
          width: Math.max(width, window.minWidth || 200),
          height: Math.max(tileHeight, window.minHeight || 150)
        })
      })
    }

    return layouts
  }

  /**
   * Cascade windows diagonally
   */
  cascadeLayout(windows: WindowState[], options: LayoutOptions = { type: 'cascade' }): Map<string, WindowLayout> {
    if (windows.length === 0) return new Map()

    const { width, height, startX, startY } = this.getUsableArea()
    const spacing = options.spacing ?? 30
    const excludeMinimized = options.excludeMinimized ?? true

    const visibleWindows = excludeMinimized 
      ? windows.filter(w => !w.isMinimized && w.isOpen)
      : windows.filter(w => w.isOpen)

    if (visibleWindows.length === 0) return new Map()

    const layouts = new Map<string, WindowLayout>()
    const cascadeWidth = Math.min(width * 0.7, 800)
    const cascadeHeight = Math.min(height * 0.7, 600)

    visibleWindows.forEach((window, index) => {
      const offset = index * spacing

      layouts.set(window.id, {
        x: startX + Math.min(offset, width - cascadeWidth),
        y: startY + Math.min(offset, height - cascadeHeight),
        width: Math.max(cascadeWidth, window.minWidth || 200),
        height: Math.max(cascadeHeight, window.minHeight || 150)
      })
    })

    return layouts
  }

  /**
   * Stack windows on top of each other (aligned)
   */
  stackLayout(windows: WindowState[], options: LayoutOptions = { type: 'stack' }): Map<string, WindowLayout> {
    if (windows.length === 0) return new Map()

    const { width, height, startX, startY } = this.getUsableArea()
    const excludeMinimized = options.excludeMinimized ?? true

    const visibleWindows = excludeMinimized 
      ? windows.filter(w => !w.isMinimized && w.isOpen)
      : windows.filter(w => w.isOpen)

    if (visibleWindows.length === 0) return new Map()

    const layouts = new Map<string, WindowLayout>()

    // Use the largest dimensions among all windows
    const stackWidth = Math.max(...visibleWindows.map(w => w.defaultWidth || 400))
    const stackHeight = Math.max(...visibleWindows.map(w => w.defaultHeight || 300))

    // Center the stack
    const centerX = startX + (width - stackWidth) / 2
    const centerY = startY + (height - stackHeight) / 2

    visibleWindows.forEach((window) => {
      layouts.set(window.id, {
        x: centerX,
        y: centerY,
        width: Math.max(stackWidth, window.minWidth || 200),
        height: Math.max(stackHeight, window.minHeight || 150)
      })
    })

    return layouts
  }

  /**
   * Get optimal layout for given windows based on their count
   */
  getOptimalLayout(windows: WindowState[], options: LayoutOptions = { type: 'arrange' }): Map<string, WindowLayout> {
    const visibleWindows = windows.filter(w => w.isOpen && !w.isMinimized)

    if (visibleWindows.length <= 1) {
      return new Map()
    }

    switch (options.type) {
      case 'arrange':
        return this.arrangeLayout(windows, options)
      case 'tile':
        return this.tileLayout(windows, options)
      case 'cascade':
        return this.cascadeLayout(windows, options)
      case 'stack':
        return this.stackLayout(windows, options)
      default:
        return this.arrangeLayout(windows, options)
    }
  }

  /**
   * Reset specific window to its default position and size
   */
  resetWindowToDefaults(window: WindowState): WindowLayout {
    const { startX, startY } = this.getUsableArea()

    return {
      x: window.defaultX || startX + 20,
      y: window.defaultY || startY + 20,
      width: window.defaultWidth || 400,
      height: window.defaultHeight || 300
    }
  }
}

// Global instance for use throughout the application
export const windowLayoutManager = new WindowLayoutManager()

// Listen for window resize events
if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    windowLayoutManager.updateScreenDimensions(window.innerWidth, window.innerHeight)
  })
}