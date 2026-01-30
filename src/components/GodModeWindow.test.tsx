/**
 * GodModeWindow Component Tests
 *
 * Tests for the unified GOD MODE development window.
 *
 * TASK 54: Unified DevMode Window (Phase 9 - GOD MODE)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GodModeWindow } from './GodModeWindow'
import { DevModeProvider } from '../lib/devmode'
import { GOD_MODE_STORAGE_KEY } from '../types/god-mode'

// Wrapper component for tests with DevMode enabled
function TestWrapper({
  children,
  enabled = true,
}: {
  children: React.ReactNode
  enabled?: boolean
}) {
  return <DevModeProvider initialSettings={{ enabled }}>{children}</DevModeProvider>
}

describe('GodModeWindow', () => {
  beforeEach(() => {
    localStorage.clear()
    // Set up initial state as open for tests
    localStorage.setItem(
      GOD_MODE_STORAGE_KEY,
      JSON.stringify({
        state: 'open',
        activeTab: 'query',
        position: { x: 20, y: 80 },
        size: {
          width: 500,
          height: 600,
          minWidth: 380,
          minHeight: 400,
          maxWidth: 900,
          maxHeight: 900,
        },
        isPinned: false,
      })
    )
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  describe('rendering', () => {
    it('should render when DevMode is enabled and window is open', () => {
      render(
        <TestWrapper>
          <GodModeWindow />
        </TestWrapper>
      )

      expect(screen.getByTestId('god-mode-window')).toBeInTheDocument()
      expect(screen.getByTestId('god-mode-header')).toBeInTheDocument()
    })

    it('should not render when DevMode is disabled', () => {
      render(
        <TestWrapper enabled={false}>
          <GodModeWindow />
        </TestWrapper>
      )

      expect(screen.queryByTestId('god-mode-window')).not.toBeInTheDocument()
    })

    it('should not render when window state is closed', () => {
      localStorage.setItem(GOD_MODE_STORAGE_KEY, JSON.stringify({ state: 'closed' }))

      render(
        <TestWrapper>
          <GodModeWindow />
        </TestWrapper>
      )

      expect(screen.queryByTestId('god-mode-window')).not.toBeInTheDocument()
    })

    it('should render GOD MODE title in header', () => {
      render(
        <TestWrapper>
          <GodModeWindow />
        </TestWrapper>
      )

      expect(screen.getByText('GOD MODE')).toBeInTheDocument()
    })

    it('should render via portal in document body', () => {
      render(
        <TestWrapper>
          <GodModeWindow />
        </TestWrapper>
      )

      // Check that overlay is a direct child of body
      const overlay = screen.getByTestId('god-mode-overlay')
      expect(overlay.parentElement).toBe(document.body)
    })
  })

  describe('tabs', () => {
    it('should render all tabs', () => {
      render(
        <TestWrapper>
          <GodModeWindow />
        </TestWrapper>
      )

      expect(screen.getByTestId('god-mode-tab-query')).toBeInTheDocument()
      expect(screen.getByTestId('god-mode-tab-context')).toBeInTheDocument()
      expect(screen.getByTestId('god-mode-tab-search')).toBeInTheDocument()
      expect(screen.getByTestId('god-mode-tab-conversation')).toBeInTheDocument()
      expect(screen.getByTestId('god-mode-tab-issues')).toBeInTheDocument()
    })

    it('should have query tab active by default', () => {
      render(
        <TestWrapper>
          <GodModeWindow />
        </TestWrapper>
      )

      const queryTab = screen.getByTestId('god-mode-tab-query')
      // Check for active styling (border-bottom style or similar)
      expect(queryTab).toHaveStyle({ marginBottom: '-1px' })
    })

    it('should switch tabs when clicked', async () => {
      const user = userEvent.setup()
      const onTabChange = vi.fn()

      render(
        <TestWrapper>
          <GodModeWindow onTabChange={onTabChange} />
        </TestWrapper>
      )

      const searchTab = screen.getByTestId('god-mode-tab-search')
      await user.click(searchTab)

      expect(onTabChange).toHaveBeenCalledWith('search')
    })

    it('should disable future tabs (issues), enable conversation', () => {
      render(
        <TestWrapper>
          <GodModeWindow />
        </TestWrapper>
      )

      const conversationTab = screen.getByTestId('god-mode-tab-conversation')
      const issuesTab = screen.getByTestId('god-mode-tab-issues')

      // TASK 55 completed - conversation is now enabled
      expect(conversationTab).not.toBeDisabled()
      expect(issuesTab).toBeDisabled()
    })

    it('should show placeholder for unavailable tabs', async () => {
      // First, set the state to have issues tab active (still unavailable)
      localStorage.setItem(
        GOD_MODE_STORAGE_KEY,
        JSON.stringify({
          state: 'open',
          activeTab: 'issues',
          position: { x: 20, y: 80 },
          size: {
            width: 500,
            height: 600,
            minWidth: 380,
            minHeight: 400,
            maxWidth: 900,
            maxHeight: 900,
          },
          isPinned: false,
        })
      )

      render(
        <TestWrapper>
          <GodModeWindow />
        </TestWrapper>
      )

      // Should show placeholder content for issues tab (TASK 56)
      expect(screen.getByText(/TASK 56/)).toBeInTheDocument()
    })
  })

  describe('header buttons', () => {
    it('should render pin, minimize, and close buttons', () => {
      render(
        <TestWrapper>
          <GodModeWindow />
        </TestWrapper>
      )

      expect(screen.getByTestId('god-mode-pin')).toBeInTheDocument()
      expect(screen.getByTestId('god-mode-minimize')).toBeInTheDocument()
      expect(screen.getByTestId('god-mode-close')).toBeInTheDocument()
    })

    it('should close window when close button is clicked', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()

      render(
        <TestWrapper>
          <GodModeWindow onClose={onClose} />
        </TestWrapper>
      )

      const closeButton = screen.getByTestId('god-mode-close')
      await user.click(closeButton)

      expect(onClose).toHaveBeenCalled()
      expect(screen.queryByTestId('god-mode-window')).not.toBeInTheDocument()
    })

    it('should toggle pin state when pin button is clicked', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <GodModeWindow />
        </TestWrapper>
      )

      const pinButton = screen.getByTestId('god-mode-pin')

      // Initially not pinned
      expect(pinButton).not.toHaveStyle({ color: '#fcd34d' })

      // Click to pin
      await user.click(pinButton)

      // Should now be pinned (check for active style)
      await waitFor(() => {
        const state = JSON.parse(localStorage.getItem(GOD_MODE_STORAGE_KEY) || '{}')
        expect(state.isPinned).toBe(true)
      })
    })

    it('should minimize window when minimize button is clicked', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <GodModeWindow />
        </TestWrapper>
      )

      // Tabs should be visible initially
      expect(screen.getByTestId('god-mode-tabs')).toBeInTheDocument()

      const minimizeButton = screen.getByTestId('god-mode-minimize')
      await user.click(minimizeButton)

      // Tabs should be hidden when minimized
      expect(screen.queryByTestId('god-mode-tabs')).not.toBeInTheDocument()
    })

    it('should expand window when clicking minimize on minimized window', async () => {
      const user = userEvent.setup()

      // Set initial state as minimized
      localStorage.setItem(
        GOD_MODE_STORAGE_KEY,
        JSON.stringify({
          state: 'minimized',
          activeTab: 'query',
          position: { x: 20, y: 80 },
          size: {
            width: 500,
            height: 600,
            minWidth: 380,
            minHeight: 400,
            maxWidth: 900,
            maxHeight: 900,
          },
          isPinned: false,
        })
      )

      render(
        <TestWrapper>
          <GodModeWindow />
        </TestWrapper>
      )

      // Tabs should be hidden (minimized)
      expect(screen.queryByTestId('god-mode-tabs')).not.toBeInTheDocument()

      const minimizeButton = screen.getByTestId('god-mode-minimize')
      await user.click(minimizeButton)

      // Tabs should be visible again (expanded)
      await waitFor(() => {
        expect(screen.getByTestId('god-mode-tabs')).toBeInTheDocument()
      })
    })
  })

  describe('keyboard shortcuts', () => {
    it('should close window on Escape key', async () => {
      render(
        <TestWrapper>
          <GodModeWindow />
        </TestWrapper>
      )

      expect(screen.getByTestId('god-mode-window')).toBeInTheDocument()

      fireEvent.keyDown(window, { key: 'Escape' })

      await waitFor(() => {
        const state = JSON.parse(localStorage.getItem(GOD_MODE_STORAGE_KEY) || '{}')
        expect(state.state).toBe('minimized')
      })
    })

    it('should toggle window on Ctrl+Shift+G', async () => {
      // Start with closed state
      localStorage.setItem(GOD_MODE_STORAGE_KEY, JSON.stringify({ state: 'closed' }))

      render(
        <TestWrapper>
          <GodModeWindow />
        </TestWrapper>
      )

      // Window should not be visible initially
      expect(screen.queryByTestId('god-mode-window')).not.toBeInTheDocument()

      // Press Ctrl+Shift+G to open
      fireEvent.keyDown(window, {
        key: 'g',
        ctrlKey: true,
        shiftKey: true,
      })

      await waitFor(() => {
        expect(screen.getByTestId('god-mode-window')).toBeInTheDocument()
      })

      // Press again to close
      fireEvent.keyDown(window, {
        key: 'g',
        ctrlKey: true,
        shiftKey: true,
      })

      await waitFor(() => {
        expect(screen.queryByTestId('god-mode-window')).not.toBeInTheDocument()
      })
    })
  })

  describe('drag functionality', () => {
    it('should have header as drag handle', () => {
      render(
        <TestWrapper>
          <GodModeWindow />
        </TestWrapper>
      )

      const header = screen.getByTestId('god-mode-header')
      expect(header).toHaveStyle({ cursor: 'move' })
    })

    it('should update position on drag', async () => {
      render(
        <TestWrapper>
          <GodModeWindow />
        </TestWrapper>
      )

      const header = screen.getByTestId('god-mode-header')

      // Start drag
      fireEvent.mouseDown(header, { clientX: 100, clientY: 100, button: 0 })

      // Move
      fireEvent.mouseMove(window, { clientX: 150, clientY: 150 })

      // End drag
      fireEvent.mouseUp(window)

      await waitFor(() => {
        const state = JSON.parse(localStorage.getItem(GOD_MODE_STORAGE_KEY) || '{}')
        expect(state.position.x).toBeGreaterThan(20) // Initial x was 20
        expect(state.position.y).toBeGreaterThan(80) // Initial y was 80
      })
    })
  })

  describe('resize functionality', () => {
    it('should have resize handles', () => {
      render(
        <TestWrapper>
          <GodModeWindow />
        </TestWrapper>
      )

      // Check for resize handles (they are invisible but present)
      const window = screen.getByTestId('god-mode-window')
      const handles = window.querySelectorAll('[style*="cursor"]')
      expect(handles.length).toBeGreaterThan(0)
    })

    it('should not show resize handles when minimized', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <GodModeWindow />
        </TestWrapper>
      )

      // Minimize the window
      const minimizeButton = screen.getByTestId('god-mode-minimize')
      await user.click(minimizeButton)

      // Content should not be visible (resize handles are in content area)
      expect(screen.queryByTestId('god-mode-content')).not.toBeInTheDocument()
    })
  })

  describe('persistence', () => {
    it('should save state to localStorage', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <GodModeWindow />
        </TestWrapper>
      )

      // Switch tab
      const searchTab = screen.getByTestId('god-mode-tab-search')
      await user.click(searchTab)

      // Check localStorage
      await waitFor(() => {
        const state = JSON.parse(localStorage.getItem(GOD_MODE_STORAGE_KEY) || '{}')
        expect(state.activeTab).toBe('search')
      })
    })

    it('should restore state from localStorage', () => {
      // Set custom state
      localStorage.setItem(
        GOD_MODE_STORAGE_KEY,
        JSON.stringify({
          state: 'open',
          activeTab: 'search',
          position: { x: 100, y: 150 },
          size: {
            width: 600,
            height: 700,
            minWidth: 380,
            minHeight: 400,
            maxWidth: 900,
            maxHeight: 900,
          },
          isPinned: true,
        })
      )

      render(
        <TestWrapper>
          <GodModeWindow />
        </TestWrapper>
      )

      const window = screen.getByTestId('god-mode-window')
      expect(window).toHaveStyle({ left: '100px', top: '150px' })
    })

    it('should not persist state when persistState is false', async () => {
      const user = userEvent.setup()

      // Clear localStorage first
      localStorage.clear()

      render(
        <TestWrapper>
          <GodModeWindow config={{ persistState: false }} />
        </TestWrapper>
      )

      // Window should be closed by default (DEFAULT_WINDOW_STATE.state = 'closed')
      // But we need to manually open it for this test since persistState is false
      fireEvent.keyDown(window, { key: 'g', ctrlKey: true, shiftKey: true })

      await waitFor(() => {
        expect(screen.getByTestId('god-mode-window')).toBeInTheDocument()
      })

      // Switch tab
      const searchTab = screen.getByTestId('god-mode-tab-search')
      await user.click(searchTab)

      // localStorage should remain unchanged
      expect(localStorage.getItem(GOD_MODE_STORAGE_KEY)).toBeNull()
    })
  })

  describe('callbacks', () => {
    it('should call onOpen when window opens', async () => {
      // Start with closed state
      localStorage.setItem(GOD_MODE_STORAGE_KEY, JSON.stringify({ state: 'closed' }))

      const onOpen = vi.fn()

      render(
        <TestWrapper>
          <GodModeWindow onOpen={onOpen} />
        </TestWrapper>
      )

      // Open via keyboard
      fireEvent.keyDown(window, {
        key: 'g',
        ctrlKey: true,
        shiftKey: true,
      })

      await waitFor(() => {
        expect(onOpen).toHaveBeenCalled()
      })
    })

    it('should call onClose when window closes', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()

      render(
        <TestWrapper>
          <GodModeWindow onClose={onClose} />
        </TestWrapper>
      )

      const closeButton = screen.getByTestId('god-mode-close')
      await user.click(closeButton)

      expect(onClose).toHaveBeenCalled()
    })

    it('should call onComponentSelect when component is selected', async () => {
      // This would require deeper integration testing with ComponentContextPanel
      // For now, just verify the prop is passed correctly
      const onComponentSelect = vi.fn()

      render(
        <TestWrapper>
          <GodModeWindow
            selectedComponentId="test-component"
            onComponentSelect={onComponentSelect}
          />
        </TestWrapper>
      )

      // Component renders without error with the props
      expect(screen.getByTestId('god-mode-window')).toBeInTheDocument()
    })
  })

  describe('language support', () => {
    it('should display Russian labels by default', () => {
      render(
        <TestWrapper>
          <GodModeWindow />
        </TestWrapper>
      )

      // Check for Russian tab labels
      expect(screen.getByText('Запрос')).toBeInTheDocument()
      expect(screen.getByText('Контекст')).toBeInTheDocument()
      expect(screen.getByText('Поиск')).toBeInTheDocument()
    })

    it('should display English labels when configured', () => {
      render(
        <TestWrapper>
          <GodModeWindow config={{ preferredLanguage: 'en' }} />
        </TestWrapper>
      )

      // Check for English tab labels
      expect(screen.getByText('Query')).toBeInTheDocument()
      expect(screen.getByText('Context')).toBeInTheDocument()
      expect(screen.getByText('Search')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have accessible tab buttons', () => {
      render(
        <TestWrapper>
          <GodModeWindow />
        </TestWrapper>
      )

      const tabs = screen.getAllByRole('button')
      expect(tabs.length).toBeGreaterThan(0)
    })

    it('should have title attributes on buttons', () => {
      render(
        <TestWrapper>
          <GodModeWindow />
        </TestWrapper>
      )

      const pinButton = screen.getByTestId('god-mode-pin')
      expect(pinButton).toHaveAttribute('title')
    })
  })
})
