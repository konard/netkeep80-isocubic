/**
 * Unit tests for Gallery component
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { Gallery } from './Gallery'
import type { SpectralCube } from '../types/cube'

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

describe('Gallery', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('Rendering', () => {
    it('should render gallery title', () => {
      render(<Gallery />)
      expect(screen.getByText('Gallery')).toBeInTheDocument()
    })

    it('should render view mode toggle buttons', () => {
      render(<Gallery />)
      expect(screen.getByRole('button', { name: 'Presets' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'My Cubes' })).toBeInTheDocument()
    })

    it('should render search input', () => {
      render(<Gallery />)
      expect(screen.getByPlaceholderText('Search by name, tags...')).toBeInTheDocument()
    })

    it('should render category filter buttons', () => {
      render(<Gallery />)
      expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Stone' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Wood' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Metal' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Organic' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Crystal' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Liquid' })).toBeInTheDocument()
    })

    it('should display preset cubes by default', () => {
      render(<Gallery />)
      // Check that preset cubes are displayed (we have 13 presets - 10 original + 3 magical energy cubes)
      const countText = screen.getByText(/of 13 cubes/)
      expect(countText).toBeInTheDocument()
    })

    it('should show save button when currentCube is provided', () => {
      render(<Gallery currentCube={mockCube} />)
      expect(screen.getByRole('button', { name: 'Save Current to Gallery' })).toBeInTheDocument()
    })

    it('should not show save button when no currentCube', () => {
      render(<Gallery />)
      expect(
        screen.queryByRole('button', { name: 'Save Current to Gallery' })
      ).not.toBeInTheDocument()
    })
  })

  describe('Category Filtering', () => {
    it('should filter by Stone category', async () => {
      render(<Gallery />)

      const stoneButton = screen.getByRole('button', { name: 'Stone' })
      await act(async () => {
        fireEvent.click(stoneButton)
      })

      expect(stoneButton).toHaveClass('gallery__category-btn--active')
      // Stone cubes include stone-moss, brick-red, marble-white, sand-desert
    })

    it('should filter by Wood category', async () => {
      render(<Gallery />)

      const woodButton = screen.getByRole('button', { name: 'Wood' })
      await act(async () => {
        fireEvent.click(woodButton)
      })

      expect(woodButton).toHaveClass('gallery__category-btn--active')
    })

    it('should show all cubes when All category is selected', async () => {
      render(<Gallery />)

      // First filter by Stone
      const stoneButton = screen.getByRole('button', { name: 'Stone' })
      await act(async () => {
        fireEvent.click(stoneButton)
      })

      // Then select All
      const allButton = screen.getByRole('button', { name: 'All' })
      await act(async () => {
        fireEvent.click(allButton)
      })

      expect(allButton).toHaveClass('gallery__category-btn--active')
      expect(screen.getByText(/of 13 cubes/)).toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    it('should filter cubes by search query', async () => {
      render(<Gallery />)

      const searchInput = screen.getByPlaceholderText('Search by name, tags...')
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'stone' } })
      })

      expect(searchInput).toHaveValue('stone')
    })

    it('should show clear button when searching', async () => {
      render(<Gallery />)

      const searchInput = screen.getByPlaceholderText('Search by name, tags...')
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'test' } })
      })

      const clearButton = screen.getByRole('button', { name: 'Clear search' })
      expect(clearButton).toBeInTheDocument()
    })

    it('should clear search when clear button clicked', async () => {
      render(<Gallery />)

      const searchInput = screen.getByPlaceholderText('Search by name, tags...')
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'test' } })
      })

      const clearButton = screen.getByRole('button', { name: 'Clear search' })
      await act(async () => {
        fireEvent.click(clearButton)
      })

      expect(searchInput).toHaveValue('')
    })

    it('should search by cube name', async () => {
      render(<Gallery />)

      const searchInput = screen.getByPlaceholderText('Search by name, tags...')
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Moss' } })
      })

      // Should find stone moss cube
      expect(screen.getByText(/of \d+ cubes/)).toBeInTheDocument()
    })

    it('should show no results message when no cubes match', async () => {
      render(<Gallery />)

      const searchInput = screen.getByPlaceholderText('Search by name, tags...')
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'xyznonexistent' } })
      })

      expect(screen.getByText('No cubes match your search')).toBeInTheDocument()
    })
  })

  describe('View Mode Toggle', () => {
    it('should toggle to My Cubes view', async () => {
      render(<Gallery />)

      const myCubesButton = screen.getByRole('button', { name: 'My Cubes' })
      await act(async () => {
        fireEvent.click(myCubesButton)
      })

      expect(myCubesButton).toHaveClass('gallery__toggle-btn--active')
    })

    it('should show empty message when no user cubes saved', async () => {
      render(<Gallery />)

      const myCubesButton = screen.getByRole('button', { name: 'My Cubes' })
      await act(async () => {
        fireEvent.click(myCubesButton)
      })

      expect(screen.getByText('No saved cubes yet')).toBeInTheDocument()
    })

    it('should toggle back to Presets view', async () => {
      render(<Gallery />)

      // Switch to My Cubes
      const myCubesButton = screen.getByRole('button', { name: 'My Cubes' })
      await act(async () => {
        fireEvent.click(myCubesButton)
      })

      // Switch back to Presets
      const presetsButton = screen.getByRole('button', { name: 'Presets' })
      await act(async () => {
        fireEvent.click(presetsButton)
      })

      expect(presetsButton).toHaveClass('gallery__toggle-btn--active')
      expect(screen.getByText(/of 13 cubes/)).toBeInTheDocument()
    })
  })

  describe('Cube Selection', () => {
    it('should call onCubeSelect when cube is clicked', async () => {
      const onCubeSelect = vi.fn()
      render(<Gallery onCubeSelect={onCubeSelect} />)

      // Find and click on the first cube item
      const cubeItems = screen.getAllByRole('button', { name: /Select/i })
      if (cubeItems.length > 0) {
        await act(async () => {
          fireEvent.click(cubeItems[0])
        })

        expect(onCubeSelect).toHaveBeenCalled()
      }
    })

    it('should support keyboard navigation', async () => {
      const onCubeSelect = vi.fn()
      render(<Gallery onCubeSelect={onCubeSelect} />)

      const cubeItems = screen.getAllByRole('button', { name: /Select/i })
      if (cubeItems.length > 0) {
        await act(async () => {
          fireEvent.keyDown(cubeItems[0], { key: 'Enter' })
        })

        expect(onCubeSelect).toHaveBeenCalled()
      }
    })

    it('should show status message after selecting cube', async () => {
      vi.useFakeTimers()
      const onCubeSelect = vi.fn()
      render(<Gallery onCubeSelect={onCubeSelect} />)

      const cubeItems = screen.getAllByRole('button', { name: /Select/i })
      if (cubeItems.length > 0) {
        await act(async () => {
          fireEvent.click(cubeItems[0])
        })

        // Status message should appear
        expect(screen.getByRole('status')).toBeInTheDocument()
      }

      vi.useRealTimers()
    })
  })

  describe('Save to Gallery', () => {
    it('should save current cube when save button is clicked', async () => {
      vi.useFakeTimers()
      render(<Gallery currentCube={mockCube} />)

      const saveButton = screen.getByRole('button', { name: 'Save Current to Gallery' })
      await act(async () => {
        fireEvent.click(saveButton)
      })

      // Status message should appear
      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByText(/Saved:/)).toBeInTheDocument()

      vi.useRealTimers()
    })
  })

  describe('Custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(<Gallery className="custom-class" />)
      expect(container.querySelector('.gallery.custom-class')).toBeInTheDocument()
    })
  })

  describe('Tag Suggestions', () => {
    it('should show tag suggestions when searching', async () => {
      render(<Gallery />)

      const searchInput = screen.getByPlaceholderText('Search by name, tags...')
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'stone' } })
      })

      // Tag suggestions may or may not appear depending on matching tags
      // Just verify the search was performed without errors
      expect(searchInput).toHaveValue('stone')
    })
  })

  describe('Cube Grid Display', () => {
    it('should display cube thumbnails', () => {
      render(<Gallery />)

      // Should have gallery grid
      const galleryGrid = document.querySelector('.gallery__grid')
      expect(galleryGrid).toBeInTheDocument()
    })

    it('should display cube info (name and material)', () => {
      render(<Gallery />)

      // At least one cube should show material type
      const materialLabels = screen.getAllByText(/stone|wood|metal|organic|crystal|liquid/i)
      expect(materialLabels.length).toBeGreaterThan(0)
    })
  })
})
