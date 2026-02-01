/**
 * Tests for Window Layout Manager
 * 
 * Phase 11, TASK 77: Extended command bar features
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { WindowLayoutManager } from './window-layout-manager'
import type { WindowState } from '../composables/useWindowManager'

describe('WindowLayoutManager', () => {
  let layoutManager: WindowLayoutManager
  let mockWindows: WindowState[]

  beforeEach(() => {
    layoutManager = new WindowLayoutManager(1200, 800)
    
    mockWindows = [
      {
        id: 'gallery',
        title: 'Gallery',
        icon: '🎨',
        x: 100,
        y: 100,
        width: 400,
        height: 500,
        defaultX: 20,
        defaultY: 100,
        defaultWidth: 380,
        defaultHeight: 500,
        minWidth: 280,
        minHeight: 300,
        zIndex: 1,
        isOpen: true,
        isMinimized: false
      },
      {
        id: 'preview',
        title: 'Preview',
        icon: '👁',
        x: 200,
        y: 200,
        width: 500,
        height: 400,
        defaultX: 420,
        defaultY: 100,
        defaultWidth: 500,
        defaultHeight: 400,
        minWidth: 300,
        minHeight: 250,
        zIndex: 2,
        isOpen: true,
        isMinimized: false
      },
      {
        id: 'editor',
        title: 'Editor',
        icon: '✏️',
        x: 300,
        y: 300,
        width: 450,
        height: 350,
        defaultX: 420,
        defaultY: 520,
        defaultWidth: 500,
        defaultHeight: 350,
        minWidth: 350,
        minHeight: 250,
        zIndex: 3,
        isOpen: true,
        isMinimized: false
      }
    ]
  })

  describe('Screen dimensions', () => {
    it('should initialize with given screen dimensions', () => {
      expect(layoutManager).toBeDefined()
      layoutManager.updateScreenDimensions(1920, 1080)
      // The layout manager should now use new dimensions for calculations
    })

    it('should get usable area excluding header and taskbar', () => {
      layoutManager.updateScreenDimensions(1200, 800)
      const usable = layoutManager['getUsableArea']()
      
      // Should account for header (80px) and taskbar (60px)
      expect(usable.width).toBe(1200)
      expect(usable.height).toBe(660) // 800 - 80 - 60
      expect(usable.startX).toBe(0)
      expect(usable.startY).toBe(80)
    })
  })

  describe('Arrange layout', () => {
    it('should arrange windows in a grid', () => {
      const layouts = layoutManager.arrangeLayout(mockWindows)
      
      expect(layouts.size).toBe(3)
      
      // Each window should have a layout
      mockWindows.forEach(window => {
        expect(layouts.has(window.id)).toBe(true)
        const layout = layouts.get(window.id)!
        expect(layout.x).toBeDefined()
        expect(layout.y).toBeDefined()
        expect(layout.width).toBeGreaterThanOrEqual(window.minWidth!)
        expect(layout.height).toBeGreaterThanOrEqual(window.minHeight!)
      })
    })

    it('should exclude minimized windows when requested', () => {
      const minimizedWindows = [
        { ...mockWindows[0], isMinimized: true },
        { ...mockWindows[1], isMinimized: false },
        { ...mockWindows[2], isMinimized: false }
      ]
      
      const layouts = layoutManager.arrangeLayout(minimizedWindows, { excludeMinimized: true })
      
      // Should only have layouts for non-minimized windows
      expect(layouts.size).toBe(2)
      expect(layouts.has('gallery')).toBe(false)
      expect(layouts.has('preview')).toBe(true)
      expect(layouts.has('editor')).toBe(true)
    })

    it('should handle empty window list', () => {
      const layouts = layoutManager.arrangeLayout([])
      expect(layouts.size).toBe(0)
    })
  })

  describe('Tile layout', () => {
    it('should tile windows horizontally on wide screens', () => {
      layoutManager.updateScreenDimensions(1920, 1080)
      const layouts = layoutManager.tileLayout(mockWindows)
      
      expect(layouts.size).toBe(3)
      
      // Windows should be arranged horizontally
      const positions = Array.from(layouts.values()).map(l => l.x).sort((a, b) => a - b)
      expect(positions[0]).toBeLessThan(positions[1])
      expect(positions[1]).toBeLessThan(positions[2])
    })

    it('should tile windows vertically on tall screens', () => {
      layoutManager.updateScreenDimensions(800, 1200)
      const layouts = layoutManager.tileLayout(mockWindows)
      
      expect(layouts.size).toBe(3)
      
      // Windows should be arranged vertically
      const positions = Array.from(layouts.values()).map(l => l.y).sort((a, b) => a - b)
      expect(positions[0]).toBeLessThan(positions[1])
      expect(positions[1]).toBeLessThan(positions[2])
    })
  })

  describe('Cascade layout', () => {
    it('should cascade windows diagonally', () => {
      const layouts = layoutManager.cascadeLayout(mockWindows)
      
      expect(layouts.size).toBe(3)
      
      // Each subsequent window should be offset
      const windowLayouts = mockWindows.map(w => layouts.get(w.id)!)
      for (let i = 1; i < windowLayouts.length; i++) {
        expect(windowLayouts[i].x).toBeGreaterThan(windowLayouts[i-1].x - 30) // Allow some overlap
        expect(windowLayouts[i].y).toBeGreaterThan(windowLayouts[i-1].y - 30)
      }
    })
  })

  describe('Stack layout', () => {
    it('should stack all windows at the same position', () => {
      const layouts = layoutManager.stackLayout(mockWindows)
      
      expect(layouts.size).toBe(3)
      
      // All windows should have the same position (centered)
      const positions = Array.from(layouts.values())
      const firstPos = positions[0]
      
      positions.forEach(pos => {
        expect(pos.x).toBe(firstPos.x)
        expect(pos.y).toBe(firstPos.y)
      })
    })

    it('should use largest dimensions among all windows', () => {
      const layouts = layoutManager.stackLayout(mockWindows)
      
      const stackedWidth = Math.max(...mockWindows.map(w => w.defaultWidth || 400))
      const stackedHeight = Math.max(...mockWindows.map(w => w.defaultHeight || 300))
      
      const layout = layouts.get('gallery')!
      expect(layout.width).toBeGreaterThanOrEqual(stackedWidth)
      expect(layout.height).toBeGreaterThanOrEqual(stackedHeight)
    })
  })

  describe('Optimal layout', () => {
    it('should return arrange layout by default', () => {
      const layouts = layoutManager.getOptimalLayout(mockWindows)
      const arrangeLayouts = layoutManager.arrangeLayout(mockWindows)
      
      expect(layouts.size).toBe(arrangeLayouts.size)
    })

    it('should return different layouts for different types', () => {
      const cascadeLayouts = layoutManager.getOptimalLayout(mockWindows, { type: 'cascade' })
      const stackLayouts = layoutManager.getOptimalLayout(mockWindows, { type: 'stack' })
      
      // Should be different layouts
      expect(cascadeLayouts.get('gallery')!.x).not.toBe(stackLayouts.get('gallery')!.x)
    })
  })

  describe('Reset window to defaults', () => {
    it('should reset window to its default position and size', () => {
      const window = mockWindows[0]
      const resetLayout = layoutManager.resetWindowToDefaults(window)
      
      expect(resetLayout.x).toBe(window.defaultX)
      expect(resetLayout.y).toBe(window.defaultY)
      expect(resetLayout.width).toBe(window.defaultWidth)
      expect(resetLayout.height).toBe(window.defaultHeight)
    })
  })
})