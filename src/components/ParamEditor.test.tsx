/**
 * Tests for ParamEditor component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ParamEditor } from './ParamEditor'
import type { SpectralCube } from '../types/cube'
import { createDefaultCube } from '../types/cube'

describe('ParamEditor', () => {
  let mockOnCubeUpdate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockOnCubeUpdate = vi.fn()
  })

  describe('Empty state', () => {
    it('renders empty state when no cube is provided', () => {
      render(<ParamEditor currentCube={null} />)
      expect(screen.getByText('No cube selected')).toBeInTheDocument()
      expect(
        screen.getByText('Select a cube from the gallery or create a new one')
      ).toBeInTheDocument()
    })
  })

  describe('With cube', () => {
    let testCube: SpectralCube

    beforeEach(() => {
      testCube = createDefaultCube('test-cube')
      testCube.meta = {
        name: 'Test Cube',
        created: new Date().toISOString(),
      }
    })

    it('renders the editor title', () => {
      render(<ParamEditor currentCube={testCube} />)
      expect(screen.getByText('Edit Parameters')).toBeInTheDocument()
    })

    it('renders the cube name input', () => {
      render(<ParamEditor currentCube={testCube} />)
      const nameInput = screen.getByLabelText('Name') as HTMLInputElement
      expect(nameInput).toBeInTheDocument()
      expect(nameInput.value).toBe('Test Cube')
    })

    it('renders reset button', () => {
      render(<ParamEditor currentCube={testCube} />)
      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
    })

    it('renders section headers', () => {
      render(<ParamEditor currentCube={testCube} />)
      expect(screen.getByText('Base Properties')).toBeInTheDocument()
      expect(screen.getByText(/Gradients/)).toBeInTheDocument()
      expect(screen.getByText('Noise Settings')).toBeInTheDocument()
      expect(screen.getByText('Physics Properties')).toBeInTheDocument()
    })
  })

  describe('Base Properties section', () => {
    let testCube: SpectralCube

    beforeEach(() => {
      testCube = createDefaultCube('test-cube')
      testCube.base = {
        color: [0.5, 0.5, 0.5],
        roughness: 0.5,
        transparency: 1.0,
      }
    })

    it('renders base color picker', () => {
      render(<ParamEditor currentCube={testCube} />)
      expect(screen.getByLabelText('Base Color')).toBeInTheDocument()
    })

    it('renders roughness slider', () => {
      render(<ParamEditor currentCube={testCube} />)
      expect(screen.getByLabelText(/Roughness/)).toBeInTheDocument()
    })

    it('renders opacity slider', () => {
      render(<ParamEditor currentCube={testCube} />)
      expect(screen.getByLabelText(/Opacity/)).toBeInTheDocument()
    })

    it('calls onCubeUpdate when roughness is changed', () => {
      render(<ParamEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)
      const roughnessSlider = screen.getByLabelText(/Roughness/)
      fireEvent.change(roughnessSlider, { target: { value: '0.8' } })
      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.base.roughness).toBe(0.8)
    })

    it('calls onCubeUpdate when opacity is changed', () => {
      render(<ParamEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)
      const opacitySlider = screen.getByLabelText(/Opacity/)
      fireEvent.change(opacitySlider, { target: { value: '0.7' } })
      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.base.transparency).toBe(0.7)
    })
  })

  describe('Gradients section', () => {
    let testCube: SpectralCube

    beforeEach(() => {
      testCube = createDefaultCube('test-cube')
      testCube.gradients = []
    })

    it('renders add gradient button', () => {
      render(<ParamEditor currentCube={testCube} />)
      expect(screen.getByText('+ Add Gradient')).toBeInTheDocument()
    })

    it('adds a gradient when add button is clicked', () => {
      render(<ParamEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)
      const addButton = screen.getByText('+ Add Gradient')
      fireEvent.click(addButton)
      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.gradients).toHaveLength(1)
    })

    it('renders gradient controls when gradients exist', () => {
      testCube.gradients = [{ axis: 'y', factor: 0.5, color_shift: [0.2, 0.1, 0.0] }]
      render(<ParamEditor currentCube={testCube} />)
      expect(screen.getByText('Gradient 1')).toBeInTheDocument()
      // Check axis buttons
      expect(screen.getByRole('button', { name: 'X' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Y' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Z' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'RADIAL' })).toBeInTheDocument()
    })

    it('removes a gradient when remove button is clicked', () => {
      testCube.gradients = [{ axis: 'y', factor: 0.5, color_shift: [0.2, 0.1, 0.0] }]
      render(<ParamEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)
      const removeButton = screen.getByRole('button', { name: 'Remove gradient 1' })
      fireEvent.click(removeButton)
      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.gradients).toHaveLength(0)
    })

    it('updates gradient axis when axis button is clicked', () => {
      testCube.gradients = [{ axis: 'y', factor: 0.5, color_shift: [0.2, 0.1, 0.0] }]
      render(<ParamEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)
      const xButton = screen.getByRole('button', { name: 'X' })
      fireEvent.click(xButton)
      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.gradients[0].axis).toBe('x')
    })
  })

  describe('Noise section', () => {
    let testCube: SpectralCube

    beforeEach(() => {
      testCube = createDefaultCube('test-cube')
    })

    it('renders noise type selector', () => {
      render(<ParamEditor currentCube={testCube} />)
      const noiseTypeSelect = screen.getByLabelText('Type') as HTMLSelectElement
      expect(noiseTypeSelect).toBeInTheDocument()
    })

    it('renders noise scale slider', () => {
      render(<ParamEditor currentCube={testCube} />)
      expect(screen.getByLabelText(/Scale/)).toBeInTheDocument()
    })

    it('renders noise octaves slider', () => {
      render(<ParamEditor currentCube={testCube} />)
      expect(screen.getByLabelText(/Octaves/)).toBeInTheDocument()
    })

    it('renders noise persistence slider', () => {
      render(<ParamEditor currentCube={testCube} />)
      expect(screen.getByLabelText(/Persistence/)).toBeInTheDocument()
    })

    it('renders noise mask selector', () => {
      render(<ParamEditor currentCube={testCube} />)
      expect(screen.getByLabelText('Mask')).toBeInTheDocument()
    })

    it('calls onCubeUpdate when noise type is changed', () => {
      render(<ParamEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)
      const typeSelect = screen.getByLabelText('Type') as HTMLSelectElement
      fireEvent.change(typeSelect, { target: { value: 'worley' } })
      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.noise.type).toBe('worley')
    })
  })

  describe('Physics section', () => {
    let testCube: SpectralCube

    beforeEach(() => {
      testCube = createDefaultCube('test-cube')
    })

    it('renders material type selector', () => {
      render(<ParamEditor currentCube={testCube} />)
      const materialSelect = screen.getByLabelText('Material') as HTMLSelectElement
      expect(materialSelect).toBeInTheDocument()
    })

    it('renders density slider', () => {
      render(<ParamEditor currentCube={testCube} />)
      expect(screen.getByLabelText(/Density/)).toBeInTheDocument()
    })

    it('renders break pattern selector', () => {
      render(<ParamEditor currentCube={testCube} />)
      expect(screen.getByLabelText('Break Pattern')).toBeInTheDocument()
    })

    it('calls onCubeUpdate when material is changed', () => {
      render(<ParamEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)
      const materialSelect = screen.getByLabelText('Material') as HTMLSelectElement
      fireEvent.change(materialSelect, { target: { value: 'wood' } })
      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.physics.material).toBe('wood')
    })

    it('calls onCubeUpdate when density is changed', () => {
      render(<ParamEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)
      const densitySlider = screen.getByLabelText(/Density/)
      fireEvent.change(densitySlider, { target: { value: '5.0' } })
      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.physics.density).toBe(5.0)
    })
  })

  describe('Section toggling', () => {
    let testCube: SpectralCube

    beforeEach(() => {
      testCube = createDefaultCube('test-cube')
    })

    it('collapses section when header is clicked', () => {
      render(<ParamEditor currentCube={testCube} />)
      const baseHeader = screen.getByText('Base Properties')

      // Initially expanded
      expect(screen.getByLabelText('Base Color')).toBeInTheDocument()

      // Click to collapse
      fireEvent.click(baseHeader)

      // Should now be collapsed - color picker should not be visible
      expect(screen.queryByLabelText('Base Color')).not.toBeInTheDocument()
    })

    it('expands section when collapsed header is clicked', () => {
      render(<ParamEditor currentCube={testCube} />)
      const baseHeader = screen.getByText('Base Properties')

      // Collapse
      fireEvent.click(baseHeader)
      expect(screen.queryByLabelText('Base Color')).not.toBeInTheDocument()

      // Expand again
      fireEvent.click(baseHeader)
      expect(screen.getByLabelText('Base Color')).toBeInTheDocument()
    })
  })

  describe('Reset functionality', () => {
    let testCube: SpectralCube

    beforeEach(() => {
      testCube = createDefaultCube('test-cube')
      testCube.base = {
        color: [1, 0, 0], // Red color
        roughness: 0.9,
        transparency: 0.5,
      }
      testCube.gradients = [{ axis: 'y', factor: 0.5, color_shift: [0.2, 0.1, 0.0] }]
    })

    it('resets cube to default values when reset button is clicked', () => {
      render(<ParamEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)
      const resetButton = screen.getByRole('button', { name: /reset/i })
      fireEvent.click(resetButton)

      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const resetCube = mockOnCubeUpdate.mock.calls[0][0]

      // Check default values
      expect(resetCube.base.roughness).toBe(0.5)
      expect(resetCube.base.transparency).toBe(1.0)
      expect(resetCube.gradients).toEqual([])
    })
  })

  describe('Name editing', () => {
    let testCube: SpectralCube

    beforeEach(() => {
      testCube = createDefaultCube('test-cube')
      testCube.meta = { name: 'Original Name' }
    })

    it('updates cube name when input changes', () => {
      render(<ParamEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)
      const nameInput = screen.getByLabelText('Name') as HTMLInputElement
      fireEvent.change(nameInput, { target: { value: 'New Name' } })

      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.meta.name).toBe('New Name')
    })
  })

  describe('Custom className', () => {
    it('applies custom className', () => {
      const testCube = createDefaultCube('test-cube')
      const { container } = render(<ParamEditor currentCube={testCube} className="custom-class" />)
      const editor = container.querySelector('.param-editor')
      expect(editor).toHaveClass('custom-class')
    })
  })
})
