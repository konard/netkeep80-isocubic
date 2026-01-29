/**
 * Tests for StackEditor component
 *
 * ISSUE 29: Редактор стопок кубиков (Stack Editor)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { StackEditor } from './StackEditor'
import type { CubeStackConfig, StackLayer } from '../types/stack'
import { createCubeStack, createStackLayer } from '../types/stack'
import { createDefaultCube } from '../types/cube'

describe('StackEditor', () => {
  let mockOnStackUpdate: ReturnType<typeof vi.fn>
  let mockOnEditLayerCube: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockOnStackUpdate = vi.fn()
    mockOnEditLayerCube = vi.fn()
  })

  // Helper to create a test stack
  function createTestStack(numLayers: number = 2): CubeStackConfig {
    const layers: StackLayer[] = []
    for (let i = 0; i < numLayers; i++) {
      const cube = createDefaultCube(`test-cube-${i}`)
      cube.base.color = [0.5 + i * 0.1, 0.4, 0.3]
      const layer = createStackLayer(`layer-${i}`, cube)
      layer.name = `Test Layer ${i + 1}`
      layer.height = 1 + i * 0.5
      layers.push(layer)
    }
    const stack = createCubeStack('test-stack', layers, 'Test stack prompt')
    stack.meta = {
      name: 'Test Stack',
      created: new Date().toISOString(),
    }
    return stack
  }

  describe('Empty state', () => {
    it('renders empty state when no stack is provided', () => {
      render(<StackEditor currentStack={null} />)
      expect(screen.getByText('No stack selected')).toBeInTheDocument()
      expect(
        screen.getByText('Create a new stack or select one from the gallery')
      ).toBeInTheDocument()
    })

    it('renders create new stack button in empty state', () => {
      render(<StackEditor currentStack={null} onStackUpdate={mockOnStackUpdate} />)
      const createButton = screen.getByText('Create New Stack')
      expect(createButton).toBeInTheDocument()
    })

    it('creates a new stack when create button is clicked', () => {
      render(<StackEditor currentStack={null} onStackUpdate={mockOnStackUpdate} />)
      const createButton = screen.getByText('Create New Stack')
      fireEvent.click(createButton)

      expect(mockOnStackUpdate).toHaveBeenCalled()
      const newStack = mockOnStackUpdate.mock.calls[0][0] as CubeStackConfig
      expect(newStack.layers).toHaveLength(1)
      expect(newStack.layers[0].name).toBe('Layer 1')
    })
  })

  describe('With stack', () => {
    let testStack: CubeStackConfig

    beforeEach(() => {
      testStack = createTestStack(2)
    })

    it('renders the editor title', () => {
      render(<StackEditor currentStack={testStack} />)
      expect(screen.getByText('Stack Editor')).toBeInTheDocument()
    })

    it('renders the stack name input', () => {
      render(<StackEditor currentStack={testStack} />)
      const nameInput = screen.getByLabelText('Stack Name') as HTMLInputElement
      expect(nameInput).toBeInTheDocument()
      expect(nameInput.value).toBe('Test Stack')
    })

    it('renders reset button', () => {
      render(<StackEditor currentStack={testStack} />)
      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
    })

    it('renders section headers', () => {
      render(<StackEditor currentStack={testStack} />)
      // Use getAllByText since "Layers" appears in summary and section header
      const layersTexts = screen.getAllByText(/Layers/)
      expect(layersTexts.length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Stack Physics')).toBeInTheDocument()
    })

    it('renders stack summary with layer count and total height', () => {
      render(<StackEditor currentStack={testStack} />)
      expect(screen.getByText('Layers:')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('Total Height:')).toBeInTheDocument()
    })

    it('updates stack name when input is changed', () => {
      render(<StackEditor currentStack={testStack} onStackUpdate={mockOnStackUpdate} />)
      const nameInput = screen.getByLabelText('Stack Name') as HTMLInputElement
      fireEvent.change(nameInput, { target: { value: 'New Stack Name' } })

      expect(mockOnStackUpdate).toHaveBeenCalled()
      const updatedStack = mockOnStackUpdate.mock.calls[0][0] as CubeStackConfig
      expect(updatedStack.meta?.name).toBe('New Stack Name')
    })
  })

  describe('Layers section', () => {
    let testStack: CubeStackConfig

    beforeEach(() => {
      testStack = createTestStack(3)
    })

    it('renders layer count in section header', () => {
      render(<StackEditor currentStack={testStack} />)
      expect(screen.getByText('Layers (3)')).toBeInTheDocument()
    })

    it('renders add layer button', () => {
      render(<StackEditor currentStack={testStack} />)
      expect(screen.getByText('+ Add Layer')).toBeInTheDocument()
    })

    it('renders all layers', () => {
      render(<StackEditor currentStack={testStack} />)
      // Layers should show their names
      expect(screen.getByText('Test Layer 1')).toBeInTheDocument()
      expect(screen.getByText('Test Layer 2')).toBeInTheDocument()
      expect(screen.getByText('Test Layer 3')).toBeInTheDocument()
    })

    it('renders layer position indicators', () => {
      render(<StackEditor currentStack={testStack} />)
      expect(screen.getByText('(bottom)')).toBeInTheDocument()
      expect(screen.getByText('(middle)')).toBeInTheDocument()
      expect(screen.getByText('(top)')).toBeInTheDocument()
    })

    it('adds a new layer when add button is clicked', () => {
      render(<StackEditor currentStack={testStack} onStackUpdate={mockOnStackUpdate} />)
      const addButton = screen.getByText('+ Add Layer')
      fireEvent.click(addButton)

      expect(mockOnStackUpdate).toHaveBeenCalled()
      const updatedStack = mockOnStackUpdate.mock.calls[0][0] as CubeStackConfig
      expect(updatedStack.layers).toHaveLength(4)
    })

    it('removes a layer when remove button is clicked', () => {
      render(<StackEditor currentStack={testStack} onStackUpdate={mockOnStackUpdate} />)

      // Get the first remove button
      const removeButtons = screen.getAllByRole('button', { name: 'Remove layer' })
      fireEvent.click(removeButtons[0])

      expect(mockOnStackUpdate).toHaveBeenCalled()
      const updatedStack = mockOnStackUpdate.mock.calls[0][0] as CubeStackConfig
      expect(updatedStack.layers).toHaveLength(2)
    })

    it('does not allow removing the last layer', () => {
      const singleLayerStack = createTestStack(1)
      render(<StackEditor currentStack={singleLayerStack} />)

      const removeButton = screen.getByRole('button', { name: 'Remove layer' })
      expect(removeButton).toBeDisabled()
    })

    it('renders move up and move down buttons for layers', () => {
      render(<StackEditor currentStack={testStack} />)

      const moveUpButtons = screen.getAllByRole('button', { name: 'Move layer up' })
      const moveDownButtons = screen.getAllByRole('button', { name: 'Move layer down' })

      expect(moveUpButtons.length).toBe(3)
      expect(moveDownButtons.length).toBe(3)
    })

    it('disables move up button for top layer', () => {
      render(<StackEditor currentStack={testStack} />)

      // The top layer is first in reverse order (displayed list)
      const moveUpButtons = screen.getAllByRole('button', { name: 'Move layer up' })
      expect(moveUpButtons[0]).toBeDisabled() // Top layer can't move up
    })

    it('disables move down button for bottom layer', () => {
      render(<StackEditor currentStack={testStack} />)

      // The bottom layer is last in reverse order (displayed list)
      const moveDownButtons = screen.getAllByRole('button', { name: 'Move layer down' })
      expect(moveDownButtons[moveDownButtons.length - 1]).toBeDisabled() // Bottom layer can't move down
    })
  })

  describe('Layer expansion and editing', () => {
    let testStack: CubeStackConfig

    beforeEach(() => {
      testStack = createTestStack(2)
    })

    it('expands layer details when layer title is clicked', () => {
      render(<StackEditor currentStack={testStack} />)

      // Click on the first layer to expand it
      const layerTitle = screen.getByText('Test Layer 1')
      fireEvent.click(layerTitle)

      // Should now see height slider
      expect(screen.getByText('Height')).toBeInTheDocument()
      expect(screen.getByText('Edit Cube Parameters')).toBeInTheDocument()
    })

    it('shows layer name input when expanded', () => {
      render(<StackEditor currentStack={testStack} />)

      // Expand the first layer
      const layerTitle = screen.getByText('Test Layer 1')
      fireEvent.click(layerTitle)

      // Should see name input with label "Name" for layer
      const nameInputs = screen.getAllByRole('textbox')
      // One for stack name, one for layer name
      expect(nameInputs.length).toBeGreaterThanOrEqual(2)
    })

    it('updates layer name when input is changed', () => {
      render(<StackEditor currentStack={testStack} onStackUpdate={mockOnStackUpdate} />)

      // Expand the first layer
      const layerTitle = screen.getByText('Test Layer 1')
      fireEvent.click(layerTitle)

      // Find the layer name input (second textbox after stack name)
      const nameInputs = screen.getAllByRole('textbox')
      const layerNameInput = nameInputs[1] as HTMLInputElement
      fireEvent.change(layerNameInput, { target: { value: 'Renamed Layer' } })

      expect(mockOnStackUpdate).toHaveBeenCalled()
    })

    it('updates layer height when slider is changed', () => {
      render(<StackEditor currentStack={testStack} onStackUpdate={mockOnStackUpdate} />)

      // Expand the first layer
      const layerTitle = screen.getByText('Test Layer 1')
      fireEvent.click(layerTitle)

      // Find the height slider
      const heightSliders = screen.getAllByRole('slider')
      const heightSlider = heightSliders.find((s) => {
        const label = s.closest('.stack-editor__field')?.querySelector('.stack-editor__label')
        return label?.textContent?.includes('Height')
      })

      if (heightSlider) {
        fireEvent.change(heightSlider, { target: { value: '2.0' } })
        expect(mockOnStackUpdate).toHaveBeenCalled()
      }
    })

    it('calls onEditLayerCube when edit cube button is clicked', () => {
      render(
        <StackEditor
          currentStack={testStack}
          onStackUpdate={mockOnStackUpdate}
          onEditLayerCube={mockOnEditLayerCube}
        />
      )

      // Expand the first layer
      const layerTitle = screen.getByText('Test Layer 1')
      fireEvent.click(layerTitle)

      // Click edit cube button
      const editButton = screen.getByText('Edit Cube Parameters')
      fireEvent.click(editButton)

      expect(mockOnEditLayerCube).toHaveBeenCalled()
    })
  })

  describe('Transition settings', () => {
    let testStack: CubeStackConfig

    beforeEach(() => {
      testStack = createTestStack(3)
    })

    it('shows transition settings for non-top layers when expanded', () => {
      render(<StackEditor currentStack={testStack} />)

      // Expand the bottom layer (which should have transition to next)
      const layerTitle = screen.getByText('Test Layer 1')
      fireEvent.click(layerTitle)

      expect(screen.getByText('Transition to Next Layer')).toBeInTheDocument()
    })

    it('does not show transition settings for top layer', () => {
      render(<StackEditor currentStack={testStack} />)

      // Expand the top layer
      const layerTitle = screen.getByText('Test Layer 3')
      fireEvent.click(layerTitle)

      // Top layer should NOT have transition settings
      expect(screen.queryByText('Transition to Next Layer')).not.toBeInTheDocument()
    })

    it('renders transition type selector', () => {
      render(<StackEditor currentStack={testStack} />)

      // Expand a non-top layer
      const layerTitle = screen.getByText('Test Layer 1')
      fireEvent.click(layerTitle)

      // Should have type selector with options
      const typeSelects = screen.getAllByRole('combobox')
      const transitionTypeSelect = typeSelects.find((select) => {
        const options = within(select as HTMLElement).getAllByRole('option')
        return options.some((opt) => opt.textContent === 'Blend')
      })
      expect(transitionTypeSelect).toBeInTheDocument()
    })

    it('renders blend height slider', () => {
      render(<StackEditor currentStack={testStack} />)

      // Expand a non-top layer
      const layerTitle = screen.getByText('Test Layer 1')
      fireEvent.click(layerTitle)

      expect(screen.getByText('Blend Height')).toBeInTheDocument()
    })

    it('renders easing selector', () => {
      render(<StackEditor currentStack={testStack} />)

      // Expand a non-top layer
      const layerTitle = screen.getByText('Test Layer 1')
      fireEvent.click(layerTitle)

      // Check for easing options
      const selects = screen.getAllByRole('combobox')
      const easingSelect = selects.find((select) => {
        const options = within(select as HTMLElement).getAllByRole('option')
        return options.some((opt) => opt.textContent === 'Smooth')
      })
      expect(easingSelect).toBeInTheDocument()
    })

    it('renders blend noise checkbox', () => {
      render(<StackEditor currentStack={testStack} />)

      // Expand a non-top layer
      const layerTitle = screen.getByText('Test Layer 1')
      fireEvent.click(layerTitle)

      expect(screen.getByText('Blend Noise')).toBeInTheDocument()
    })

    it('renders blend gradients checkbox', () => {
      render(<StackEditor currentStack={testStack} />)

      // Expand a non-top layer
      const layerTitle = screen.getByText('Test Layer 1')
      fireEvent.click(layerTitle)

      expect(screen.getByText('Blend Gradients')).toBeInTheDocument()
    })

    it('updates transition type when changed', () => {
      render(<StackEditor currentStack={testStack} onStackUpdate={mockOnStackUpdate} />)

      // Expand a non-top layer
      const layerTitle = screen.getByText('Test Layer 1')
      fireEvent.click(layerTitle)

      // Find the transition type select
      const selects = screen.getAllByRole('combobox')
      const transitionTypeSelect = selects.find((select) => {
        const options = within(select as HTMLElement).getAllByRole('option')
        return options.some((opt) => opt.textContent === 'Blend')
      })

      if (transitionTypeSelect) {
        fireEvent.change(transitionTypeSelect, { target: { value: 'hard' } })
        expect(mockOnStackUpdate).toHaveBeenCalled()
      }
    })
  })

  describe('Stack Physics section', () => {
    let testStack: CubeStackConfig

    beforeEach(() => {
      testStack = createTestStack(2)
    })

    it('renders stability indicator', () => {
      render(<StackEditor currentStack={testStack} />)
      expect(screen.getByText('Stability:')).toBeInTheDocument()
    })

    it('renders total weight indicator', () => {
      render(<StackEditor currentStack={testStack} />)
      expect(screen.getByText('Total Weight:')).toBeInTheDocument()
    })

    it('renders structural integrity indicator', () => {
      render(<StackEditor currentStack={testStack} />)
      expect(screen.getByText('Structural Integrity')).toBeInTheDocument()
    })

    it('renders weight distribution slider', () => {
      render(<StackEditor currentStack={testStack} />)
      expect(screen.getByText('Weight Distribution')).toBeInTheDocument()
    })

    it('renders is stable checkbox', () => {
      render(<StackEditor currentStack={testStack} />)
      expect(screen.getByText('Mark as Stable')).toBeInTheDocument()
    })

    it('updates weight distribution when slider is changed', () => {
      render(<StackEditor currentStack={testStack} onStackUpdate={mockOnStackUpdate} />)

      // Find weight distribution slider
      const sliders = screen.getAllByRole('slider')
      const weightSlider = sliders.find((s) => {
        const label = s.closest('.stack-editor__field')?.querySelector('.stack-editor__label')
        return label?.textContent?.includes('Weight Distribution')
      })

      if (weightSlider) {
        fireEvent.change(weightSlider, { target: { value: '0.8' } })
        expect(mockOnStackUpdate).toHaveBeenCalled()
      }
    })

    it('updates stability when checkbox is changed', () => {
      render(<StackEditor currentStack={testStack} onStackUpdate={mockOnStackUpdate} />)

      const stableCheckbox = screen.getByRole('checkbox', { name: /Mark as Stable/i })
      fireEvent.click(stableCheckbox)

      expect(mockOnStackUpdate).toHaveBeenCalled()
    })

    it('shows stable status in green', () => {
      testStack.physics = {
        ...testStack.physics!,
        isStable: true,
        structuralIntegrity: 1.0,
      }
      render(<StackEditor currentStack={testStack} />)

      const statusElement = screen.getByText('Stable')
      expect(statusElement).toHaveStyle({ color: '#22c55e' })
    })

    it('shows warning status in orange for medium integrity', () => {
      testStack.physics = {
        ...testStack.physics!,
        isStable: true,
        structuralIntegrity: 0.5,
      }
      render(<StackEditor currentStack={testStack} />)

      const statusElement = screen.getByText('Warning')
      expect(statusElement).toHaveStyle({ color: '#f59e0b' })
    })

    it('shows unstable status in red for low integrity', () => {
      testStack.physics = {
        ...testStack.physics!,
        isStable: false,
        structuralIntegrity: 0.2,
      }
      render(<StackEditor currentStack={testStack} />)

      const statusElement = screen.getByText('Unstable')
      expect(statusElement).toHaveStyle({ color: '#ef4444' })
    })
  })

  describe('Section toggling', () => {
    let testStack: CubeStackConfig

    beforeEach(() => {
      testStack = createTestStack(2)
    })

    it('collapses layers section when header is clicked', () => {
      render(<StackEditor currentStack={testStack} />)

      // Initially expanded - should see add layer button
      expect(screen.getByText('+ Add Layer')).toBeInTheDocument()

      // Click to collapse - use exact text for section header (includes layer count)
      const layersHeader = screen.getByText(/Layers \(\d+\)/)
      fireEvent.click(layersHeader)

      // Should be collapsed - add layer button should be hidden
      expect(screen.queryByText('+ Add Layer')).not.toBeInTheDocument()
    })

    it('expands section when collapsed header is clicked', () => {
      render(<StackEditor currentStack={testStack} />)

      // Collapse first - use exact text for section header (includes layer count)
      const layersHeader = screen.getByText(/Layers \(\d+\)/)
      fireEvent.click(layersHeader)
      expect(screen.queryByText('+ Add Layer')).not.toBeInTheDocument()

      // Expand again
      fireEvent.click(layersHeader)
      expect(screen.getByText('+ Add Layer')).toBeInTheDocument()
    })
  })

  describe('Reset functionality', () => {
    let testStack: CubeStackConfig

    beforeEach(() => {
      testStack = createTestStack(3)
      testStack.meta = {
        name: 'Custom Stack',
      }
    })

    it('resets stack to default when reset button is clicked', () => {
      render(<StackEditor currentStack={testStack} onStackUpdate={mockOnStackUpdate} />)

      const resetButton = screen.getByRole('button', { name: /reset/i })
      fireEvent.click(resetButton)

      expect(mockOnStackUpdate).toHaveBeenCalled()
      const resetStack = mockOnStackUpdate.mock.calls[0][0] as CubeStackConfig
      expect(resetStack.layers).toHaveLength(1)
      expect(resetStack.layers[0].name).toBe('Layer 1')
    })
  })

  describe('Layer reordering', () => {
    let testStack: CubeStackConfig

    beforeEach(() => {
      testStack = createTestStack(3)
    })

    it('moves layer up when move up button is clicked', () => {
      render(<StackEditor currentStack={testStack} onStackUpdate={mockOnStackUpdate} />)

      // Find and click move up button for layer 2 (middle layer)
      // Layers are displayed in reverse order (top first), so middle layer would be index 1
      const moveUpButtons = screen.getAllByRole('button', { name: 'Move layer up' })
      // The second move up button (index 1) corresponds to the middle layer
      fireEvent.click(moveUpButtons[1])

      expect(mockOnStackUpdate).toHaveBeenCalled()
    })

    it('moves layer down when move down button is clicked', () => {
      render(<StackEditor currentStack={testStack} onStackUpdate={mockOnStackUpdate} />)

      // Find and click move down button for layer 2 (middle layer)
      const moveDownButtons = screen.getAllByRole('button', { name: 'Move layer down' })
      // The second move down button (index 1) corresponds to the middle layer
      fireEvent.click(moveDownButtons[1])

      expect(mockOnStackUpdate).toHaveBeenCalled()
    })

    it('updates layer positions after reorder', () => {
      render(<StackEditor currentStack={testStack} onStackUpdate={mockOnStackUpdate} />)

      // Move middle layer up
      const moveUpButtons = screen.getAllByRole('button', { name: 'Move layer up' })
      fireEvent.click(moveUpButtons[1])

      expect(mockOnStackUpdate).toHaveBeenCalled()
      const updatedStack = mockOnStackUpdate.mock.calls[0][0] as CubeStackConfig

      // After reorder, positions should be recalculated
      expect(updatedStack.layers[0].position).toBe('bottom')
      expect(updatedStack.layers[updatedStack.layers.length - 1].position).toBe('top')
    })
  })

  describe('Drag and drop', () => {
    let testStack: CubeStackConfig

    beforeEach(() => {
      testStack = createTestStack(3)
    })

    it('layers are draggable', () => {
      render(<StackEditor currentStack={testStack} />)

      const layers = screen.getAllByText(/Test Layer/)
      layers.forEach((layer) => {
        const layerElement = layer.closest('[draggable]')
        expect(layerElement).toHaveAttribute('draggable', 'true')
      })
    })

    it('renders drag handles', () => {
      render(<StackEditor currentStack={testStack} />)

      // Should have drag handles (we use ⋮⋮ as the visual indicator)
      const dragHandles = screen.getAllByTitle('Drag to reorder')
      expect(dragHandles.length).toBe(3) // One for each layer
    })
  })

  describe('Total height calculation', () => {
    it('calculates total height correctly', () => {
      const stack = createTestStack(3)
      stack.layers[0].height = 1.0
      stack.layers[1].height = 1.5
      stack.layers[2].height = 2.0
      // Total: 4.5

      // Recalculate stack
      const updatedStack = createCubeStack(stack.id, stack.layers, stack.prompt)

      expect(updatedStack.totalHeight).toBe(4.5)
    })

    it('updates total height when layer is added', () => {
      const mockUpdate = vi.fn()
      const stack = createTestStack(2)
      stack.totalHeight = 2.5 // Initial

      render(<StackEditor currentStack={stack} onStackUpdate={mockUpdate} />)

      const addButton = screen.getByText('+ Add Layer')
      fireEvent.click(addButton)

      expect(mockUpdate).toHaveBeenCalled()
      const updatedStack = mockUpdate.mock.calls[0][0] as CubeStackConfig
      // New layer has height 1 by default
      expect(updatedStack.totalHeight).toBeGreaterThan(stack.totalHeight)
    })
  })

  describe('Total weight calculation', () => {
    it('calculates total weight based on layer densities', () => {
      const stack = createTestStack(2)
      stack.layers[0].cubeConfig.physics = { ...stack.layers[0].cubeConfig.physics, density: 2.0 }
      stack.layers[1].cubeConfig.physics = { ...stack.layers[1].cubeConfig.physics, density: 3.0 }
      stack.layers[0].height = 1.0
      stack.layers[1].height = 1.0

      // Recalculate stack
      const updatedStack = createCubeStack(stack.id, stack.layers, stack.prompt)

      // Weight = density * height for each layer
      // Layer 0: 2.0 * 1.0 = 2.0
      // Layer 1: 3.0 * 1.0 = 3.0
      // Total: 5.0
      expect(updatedStack.physics?.totalWeight).toBe(5.0)
    })
  })

  describe('Accessibility', () => {
    let testStack: CubeStackConfig

    beforeEach(() => {
      testStack = createTestStack(2)
    })

    it('section headers have aria-expanded attribute', () => {
      render(<StackEditor currentStack={testStack} />)

      // The aria-expanded is on the button parent, not the span text
      const layersHeaderText = screen.getByText(/Layers \(\d+\)/)
      const layersHeader = layersHeaderText.closest('button')!
      expect(layersHeader).toHaveAttribute('aria-expanded', 'true')

      fireEvent.click(layersHeader)
      expect(layersHeader).toHaveAttribute('aria-expanded', 'false')
    })

    it('layer titles have aria-expanded attribute', () => {
      render(<StackEditor currentStack={testStack} />)

      // The aria-expanded is on the button parent, not the span text
      const layerTitleText = screen.getByText('Test Layer 1')
      const layerTitle = layerTitleText.closest('button')!
      expect(layerTitle).toHaveAttribute('aria-expanded', 'false')

      fireEvent.click(layerTitle)
      expect(layerTitle).toHaveAttribute('aria-expanded', 'true')
    })

    it('buttons have accessible labels', () => {
      render(<StackEditor currentStack={testStack} />)

      expect(screen.getAllByRole('button', { name: 'Move layer up' })).toHaveLength(2)
      expect(screen.getAllByRole('button', { name: 'Move layer down' })).toHaveLength(2)
      expect(screen.getAllByRole('button', { name: 'Remove layer' })).toHaveLength(2)
    })
  })

  describe('CSS classes for styling', () => {
    let testStack: CubeStackConfig

    beforeEach(() => {
      testStack = createTestStack(2)
    })

    it('applies custom className', () => {
      const { container } = render(
        <StackEditor currentStack={testStack} className="custom-class" />
      )

      const editor = container.querySelector('.stack-editor')
      expect(editor).toHaveClass('custom-class')
    })

    it('applies correct class to empty state', () => {
      const { container } = render(<StackEditor currentStack={null} />)

      expect(container.querySelector('.stack-editor__empty')).toBeInTheDocument()
    })
  })
})
