/**
 * Unit tests for ExportPanel component
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ExportPanel } from './ExportPanel'
import type { SpectralCube } from '../types/cube'
import { saveCubeToStorage, pushToHistory, clearHistory } from '../lib/storage'

// Mock cube for testing
const mockCube: SpectralCube = {
  id: 'test_cube',
  prompt: 'Test cube',
  base: {
    color: [0.5, 0.5, 0.5],
    roughness: 0.5,
    transparency: 1.0,
  },
  gradients: [
    {
      axis: 'y',
      factor: 0.3,
      color_shift: [0.1, 0.2, 0.1],
    },
  ],
  physics: {
    material: 'stone',
    density: 2.5,
    break_pattern: 'crumble',
  },
  meta: {
    name: 'Test Cube',
    tags: ['test', 'sample'],
    author: 'test',
  },
}

describe('ExportPanel', () => {
  beforeEach(() => {
    localStorage.clear()
    clearHistory()
  })

  describe('Rendering', () => {
    it('should render undo/redo buttons', () => {
      render(<ExportPanel currentCube={null} />)
      expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Redo' })).toBeInTheDocument()
    })

    it('should render export/import buttons', () => {
      render(<ExportPanel currentCube={null} />)
      expect(screen.getByRole('button', { name: /Download JSON/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Upload JSON/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument()
    })

    it('should disable export buttons when no cube', () => {
      render(<ExportPanel currentCube={null} />)
      expect(screen.getByRole('button', { name: /Download JSON/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /Save/i })).toBeDisabled()
    })

    it('should enable export buttons when cube is provided', () => {
      render(<ExportPanel currentCube={mockCube} />)
      expect(screen.getByRole('button', { name: /Download JSON/i })).not.toBeDisabled()
      expect(screen.getByRole('button', { name: /Save/i })).not.toBeDisabled()
    })
  })

  describe('Undo/Redo', () => {
    it('should have disabled undo button initially', () => {
      render(<ExportPanel currentCube={mockCube} />)
      expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
    })

    it('should have disabled redo button initially', () => {
      render(<ExportPanel currentCube={mockCube} />)
      expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled()
    })

    it('should enable undo after history push', async () => {
      // Push some history first
      pushToHistory(mockCube)
      const modifiedCube = { ...mockCube, id: 'modified_cube' }
      pushToHistory(modifiedCube)

      const { rerender } = render(<ExportPanel currentCube={modifiedCube} />)

      // Force rerender to pick up new state
      rerender(<ExportPanel currentCube={modifiedCube} />)

      // Undo should now be available
      const undoButton = screen.getByRole('button', { name: 'Undo' })
      expect(undoButton).not.toBeDisabled()
    })

    it('should call onCubeChange when undo is clicked', async () => {
      // Setup history
      pushToHistory(mockCube)
      const modifiedCube: SpectralCube = { ...mockCube, id: 'modified_cube' }
      pushToHistory(modifiedCube)

      const onCubeChange = vi.fn()
      render(<ExportPanel currentCube={modifiedCube} onCubeChange={onCubeChange} />)

      const undoButton = screen.getByRole('button', { name: 'Undo' })

      await act(async () => {
        fireEvent.click(undoButton)
      })

      expect(onCubeChange).toHaveBeenCalledWith(mockCube)
    })
  })

  describe('Export Functionality', () => {
    it('should trigger export when Download JSON clicked', async () => {
      // Mock URL.createObjectURL and URL.revokeObjectURL
      const mockCreateObjectURL = vi.fn(() => 'blob:mock-url')
      const mockRevokeObjectURL = vi.fn()
      global.URL.createObjectURL = mockCreateObjectURL
      global.URL.revokeObjectURL = mockRevokeObjectURL

      render(<ExportPanel currentCube={mockCube} />)

      const downloadButton = screen.getByRole('button', { name: /Download JSON/i })
      await act(async () => {
        fireEvent.click(downloadButton)
      })

      // Should show success message
      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByText(/exported successfully/i)).toBeInTheDocument()
    })
  })

  describe('Save Functionality', () => {
    it('should save cube to localStorage when Save clicked', async () => {
      vi.useFakeTimers()
      render(<ExportPanel currentCube={mockCube} />)

      const saveButton = screen.getByRole('button', { name: /^Save$/i })
      await act(async () => {
        fireEvent.click(saveButton)
      })

      // Should show success message
      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByText('Configuration saved')).toBeInTheDocument()

      vi.useRealTimers()
    })

    it('should show saved configs in list after saving', async () => {
      render(<ExportPanel currentCube={mockCube} />)

      const saveButton = screen.getByRole('button', { name: /^Save$/i })
      await act(async () => {
        fireEvent.click(saveButton)
      })

      // Saved configs list should appear
      expect(screen.getByText('Saved Configurations')).toBeInTheDocument()
    })
  })

  describe('Saved Configs List', () => {
    beforeEach(() => {
      // Pre-save some configs
      saveCubeToStorage(mockCube)
    })

    it('should display saved configs', () => {
      render(<ExportPanel currentCube={null} />)
      expect(screen.getByText('Saved Configurations')).toBeInTheDocument()
      expect(screen.getByText('Test Cube')).toBeInTheDocument()
    })

    it('should have load button for each config', () => {
      render(<ExportPanel currentCube={null} />)
      const loadButtons = screen.getAllByRole('button', { name: /Load/i })
      expect(loadButtons.length).toBeGreaterThan(0)
    })

    it('should have delete button for each config', () => {
      render(<ExportPanel currentCube={null} />)
      const deleteButtons = screen.getAllByRole('button', { name: /Delete/i })
      expect(deleteButtons.length).toBeGreaterThan(0)
    })

    it('should call onCubeLoad when Load clicked', async () => {
      const onCubeLoad = vi.fn()
      render(<ExportPanel currentCube={null} onCubeLoad={onCubeLoad} />)

      const loadButtons = screen.getAllByRole('button', { name: /^Load$/i })
      await act(async () => {
        fireEvent.click(loadButtons[0])
      })

      expect(onCubeLoad).toHaveBeenCalledWith(expect.objectContaining({ id: 'test_cube' }))
    })

    it('should remove config when Delete clicked', async () => {
      vi.useFakeTimers()
      render(<ExportPanel currentCube={null} />)

      // Initially should show the config
      expect(screen.getByText('Test Cube')).toBeInTheDocument()

      const deleteButtons = screen.getAllByRole('button', { name: /^Delete$/i })
      await act(async () => {
        fireEvent.click(deleteButtons[0])
      })

      // Config should be removed
      expect(screen.queryByText('Test Cube')).not.toBeInTheDocument()

      vi.useRealTimers()
    })

    it('should show success message after loading', async () => {
      vi.useFakeTimers()
      const onCubeLoad = vi.fn()
      render(<ExportPanel currentCube={null} onCubeLoad={onCubeLoad} />)

      const loadButtons = screen.getAllByRole('button', { name: /^Load$/i })
      await act(async () => {
        fireEvent.click(loadButtons[0])
      })

      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByText(/Loaded:/)).toBeInTheDocument()

      vi.useRealTimers()
    })

    it('should show success message after deleting', async () => {
      vi.useFakeTimers()
      render(<ExportPanel currentCube={null} />)

      const deleteButton = screen.getByRole('button', { name: /Delete/i })
      await act(async () => {
        fireEvent.click(deleteButton)
      })

      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByText(/deleted/i)).toBeInTheDocument()

      vi.useRealTimers()
    })
  })

  describe('Status Messages', () => {
    it('should clear success message after timeout', async () => {
      vi.useFakeTimers()
      render(<ExportPanel currentCube={mockCube} />)

      const saveButton = screen.getByRole('button', { name: /Save/i })
      await act(async () => {
        fireEvent.click(saveButton)
      })

      // Message should be visible
      expect(screen.getByRole('status')).toBeInTheDocument()

      // Advance time
      await act(async () => {
        vi.advanceTimersByTime(4000)
      })

      // Message should be cleared
      expect(screen.queryByRole('status')).not.toBeInTheDocument()

      vi.useRealTimers()
    })
  })

  describe('Custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(<ExportPanel currentCube={null} className="custom-class" />)
      expect(container.querySelector('.export-panel.custom-class')).toBeInTheDocument()
    })
  })

  describe('Import Functionality', () => {
    it('should have Upload JSON button always enabled', () => {
      render(<ExportPanel currentCube={null} />)
      expect(screen.getByRole('button', { name: /Upload JSON/i })).not.toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper button titles', () => {
      render(<ExportPanel currentCube={mockCube} />)

      expect(screen.getByTitle('Undo (Ctrl+Z)')).toBeInTheDocument()
      expect(screen.getByTitle('Redo (Ctrl+Shift+Z)')).toBeInTheDocument()
      expect(screen.getByTitle('Download JSON file')).toBeInTheDocument()
      expect(screen.getByTitle('Upload JSON file')).toBeInTheDocument()
      expect(screen.getByTitle('Save to browser storage')).toBeInTheDocument()
    })

    it('should have aria-labels for undo/redo', () => {
      render(<ExportPanel currentCube={mockCube} />)

      expect(screen.getByRole('button', { name: 'Undo' })).toHaveAttribute('aria-label', 'Undo')
      expect(screen.getByRole('button', { name: 'Redo' })).toHaveAttribute('aria-label', 'Redo')
    })
  })
})
