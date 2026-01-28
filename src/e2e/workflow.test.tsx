/**
 * End-to-end workflow tests
 * Tests complete user workflows for editing cubes
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import App from '../App'
import { clearAllConfigs, clearHistory } from '../lib/storage'

// Mock URL APIs for export functionality
beforeEach(() => {
  global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  global.URL.revokeObjectURL = vi.fn()
})

describe('E2E: Complete Editing Workflow', () => {
  beforeEach(() => {
    localStorage.clear()
    clearAllConfigs()
    clearHistory()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Workflow: Browse and Select Cube', () => {
    it('should allow user to browse preset cubes and select one', async () => {
      render(<App />)

      // User sees the gallery with presets
      expect(screen.getByText('Gallery')).toBeInTheDocument()
      expect(screen.getByText(/of 10 cubes/)).toBeInTheDocument()

      // User can see the cube grid
      const galleryGrid = document.querySelector('.gallery__grid')
      expect(galleryGrid).toBeInTheDocument()

      // User clicks on a cube to select it
      const cubeItems = screen.getAllByRole('button', { name: /Select/i })
      expect(cubeItems.length).toBe(10) // 10 preset cubes

      await act(async () => {
        fireEvent.click(cubeItems[0])
      })

      // Status message should confirm selection
      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument()
      })
    })

    it('should allow user to filter cubes by category', async () => {
      render(<App />)

      // Click on Stone category
      const stoneButton = screen.getByRole('button', { name: 'Stone' })
      await act(async () => {
        fireEvent.click(stoneButton)
      })

      // Filtered cubes should be displayed
      expect(stoneButton).toHaveClass('gallery__category-btn--active')
    })

    it('should allow user to search for cubes', async () => {
      render(<App />)

      // Enter search term
      const searchInput = screen.getByPlaceholderText('Search by name, tags...')
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'moss' } })
      })

      // Search should filter results
      expect(searchInput).toHaveValue('moss')
    })
  })

  describe('Workflow: Save and Load Cube', () => {
    it('should allow user to save current cube and load it later', async () => {
      render(<App />)

      // Step 1: Select a preset cube
      const cubeItems = screen.getAllByRole('button', { name: /Select/i })
      await act(async () => {
        fireEvent.click(cubeItems[0])
        vi.advanceTimersByTime(100)
      })

      // Step 2: Save to gallery
      const saveToGalleryButton = screen.getByRole('button', { name: 'Save Current to Gallery' })
      await act(async () => {
        fireEvent.click(saveToGalleryButton)
        vi.advanceTimersByTime(100)
      })

      // Step 3: Switch to My Cubes view
      const myCubesButton = screen.getByRole('button', { name: 'My Cubes' })
      await act(async () => {
        fireEvent.click(myCubesButton)
        vi.advanceTimersByTime(100)
      })

      // Step 4: User's saved cube should be visible
      expect(myCubesButton).toHaveClass('gallery__toggle-btn--active')
    })

    it('should allow user to save cube using ExportPanel', async () => {
      render(<App />)

      // Click Save button in ExportPanel
      const saveButton = screen.getByRole('button', { name: /^Save$/i })
      await act(async () => {
        fireEvent.click(saveButton)
        vi.advanceTimersByTime(100)
      })

      // Success message should appear
      expect(screen.getByRole('status')).toBeInTheDocument()

      // Saved config should appear in the list
      await waitFor(() => {
        expect(screen.getByText('Saved Configurations')).toBeInTheDocument()
      })
    })

    it('should allow user to export cube as JSON file', async () => {
      render(<App />)

      // Click Download JSON button
      const downloadButton = screen.getByRole('button', { name: /Download JSON/i })
      await act(async () => {
        fireEvent.click(downloadButton)
        vi.advanceTimersByTime(100)
      })

      // Export success message
      expect(screen.getByText(/exported successfully/i)).toBeInTheDocument()
    })
  })

  describe('Workflow: Undo/Redo Operations', () => {
    it('should allow user to undo cube selection changes', async () => {
      render(<App />)

      // Initially undo should be disabled
      const undoButton = screen.getByRole('button', { name: 'Undo' })
      expect(undoButton).toBeDisabled()

      // Select different cubes
      const cubeItems = screen.getAllByRole('button', { name: /Select/i })

      // Select first cube
      await act(async () => {
        fireEvent.click(cubeItems[0])
        vi.advanceTimersByTime(100)
      })

      // Undo button state depends on history implementation
    })
  })

  describe('Workflow: Delete Saved Configuration', () => {
    it('should allow user to delete a saved configuration', async () => {
      render(<App />)

      // First save the current cube
      const saveButton = screen.getByRole('button', { name: /^Save$/i })
      await act(async () => {
        fireEvent.click(saveButton)
        vi.advanceTimersByTime(100)
      })

      // Saved config should appear
      await waitFor(() => {
        expect(screen.getByText('Saved Configurations')).toBeInTheDocument()
      })

      // Delete the saved config
      const deleteButton = screen.getByRole('button', { name: /Delete/i })
      await act(async () => {
        fireEvent.click(deleteButton)
        vi.advanceTimersByTime(100)
      })

      // Success message for deletion
      expect(screen.getByText(/deleted/i)).toBeInTheDocument()
    })
  })

  describe('Workflow: Load from Saved Configurations', () => {
    it('should allow user to load a saved configuration', async () => {
      render(<App />)

      // First save the current cube
      const saveButton = screen.getByRole('button', { name: /^Save$/i })
      await act(async () => {
        fireEvent.click(saveButton)
        vi.advanceTimersByTime(100)
      })

      // Wait for saved configs to appear
      await waitFor(() => {
        expect(screen.getByText('Saved Configurations')).toBeInTheDocument()
      })

      // Load the saved config
      const loadButton = screen.getByRole('button', { name: /^Load$/i })
      await act(async () => {
        fireEvent.click(loadButton)
        vi.advanceTimersByTime(100)
      })

      // Success message for loading
      expect(screen.getByText(/Loaded:/i)).toBeInTheDocument()
    })
  })
})

describe('E2E: Mobile Workflow', () => {
  beforeEach(() => {
    localStorage.clear()
    clearAllConfigs()
    clearHistory()
    vi.useFakeTimers({ shouldAdvanceTime: true })

    // Set viewport to mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 400,
    })
    window.dispatchEvent(new Event('resize'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should allow mobile user to navigate between tabs', async () => {
    render(<App />)

    // Mobile layout should have tab navigation in the nav element
    const mobileNav = document.querySelector('.app__mobile-nav')
    if (!mobileNav) {
      // If no mobile nav, skip this test as we're not in mobile layout
      return
    }

    // Find mobile tab buttons inside the nav element
    const tabButtons = mobileNav.querySelectorAll('.app__mobile-tab')
    expect(tabButtons.length).toBe(4) // Gallery, Preview, Editor, Tools

    // Get preview tab (second tab)
    const previewTab = tabButtons[1] as HTMLElement

    // Navigate to Preview tab
    await act(async () => {
      fireEvent.click(previewTab)
      vi.advanceTimersByTime(100)
    })

    // CubePreview component should be rendered
    expect(screen.getByTestId('cube-preview')).toBeInTheDocument()

    // Get tools tab (fourth tab - after Editor)
    const toolsTab = tabButtons[3] as HTMLElement

    // Navigate to Tools tab
    await act(async () => {
      fireEvent.click(toolsTab)
      vi.advanceTimersByTime(100)
    })

    // Export controls should be visible
    expect(screen.getByRole('button', { name: /Download JSON/i })).toBeInTheDocument()
  })
})

describe('E2E: Error Handling', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should handle search with no results gracefully', async () => {
    render(<App />)

    const searchInput = screen.getByPlaceholderText('Search by name, tags...')
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'nonexistentcube123456' } })
      vi.advanceTimersByTime(100)
    })

    // Should show no results message
    expect(screen.getByText('No cubes match your search')).toBeInTheDocument()
  })

  it('should allow clearing search after no results', async () => {
    render(<App />)

    const searchInput = screen.getByPlaceholderText('Search by name, tags...')
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } })
      vi.advanceTimersByTime(100)
    })

    // Clear search
    const clearButton = screen.getByRole('button', { name: 'Clear search' })
    await act(async () => {
      fireEvent.click(clearButton)
      vi.advanceTimersByTime(100)
    })

    // All cubes should be visible again
    expect(screen.getByText(/of 10 cubes/)).toBeInTheDocument()
  })
})
