/**
 * Tests for StackPresetPicker component
 * @vitest-environment jsdom
 *
 * ISSUE 30: Шаблоны стопок (Stack Presets)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { StackPresetPicker } from './StackPresetPicker'
import type { CubeStackConfig } from '../types/stack'
import { createCubeStack, createStackLayer } from '../types/stack'
import { createDefaultCube } from '../types/cube'
import { STACK_PRESETS, STACK_PRESET_CATEGORIES } from '../lib/stack-presets'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Helper to create a test stack
function createTestStack(id: string = 'test_stack'): CubeStackConfig {
  const cube1 = createDefaultCube('test_cube_1')
  cube1.base.color = [0.5, 0.5, 0.5]

  const cube2 = createDefaultCube('test_cube_2')
  cube2.base.color = [0.7, 0.7, 0.7]

  const layer1 = createStackLayer('layer_1', cube1, 'bottom', 1.0)
  layer1.name = 'Bottom Layer'

  const layer2 = createStackLayer('layer_2', cube2, 'top', 1.0)
  layer2.name = 'Top Layer'

  return createCubeStack(id, [layer1, layer2], 'Test stack prompt')
}

describe('StackPresetPicker', () => {
  let mockOnApplyPreset: ReturnType<typeof vi.fn>
  let mockOnClose: ReturnType<typeof vi.fn>

  beforeEach(() => {
    localStorageMock.clear()
    mockOnApplyPreset = vi.fn()
    mockOnClose = vi.fn()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorageMock.clear()
  })

  describe('Rendering', () => {
    it('renders the title', () => {
      render(<StackPresetPicker isOpen={true} />)
      expect(screen.getByText('Stack Presets')).toBeInTheDocument()
    })

    it('renders close button when onClose is provided', () => {
      render(<StackPresetPicker isOpen={true} onClose={mockOnClose} />)
      const closeButton = screen.getByRole('button', { name: /close/i })
      expect(closeButton).toBeInTheDocument()
    })

    it('does not render when isOpen is false', () => {
      render(<StackPresetPicker isOpen={false} />)
      expect(screen.queryByText('Stack Presets')).not.toBeInTheDocument()
    })

    it('renders search input', () => {
      render(<StackPresetPicker isOpen={true} />)
      expect(screen.getByPlaceholderText(/search presets/i)).toBeInTheDocument()
    })

    it('renders category filter buttons', () => {
      render(<StackPresetPicker isOpen={true} />)
      expect(screen.getByText(/All/)).toBeInTheDocument()

      // Check that category buttons exist by finding buttons with category names
      const categoryButtons = document.querySelectorAll('.stack-preset-picker__category')
      expect(categoryButtons.length).toBeGreaterThan(1) // At least "All" + some categories

      for (const category of Object.values(STACK_PRESET_CATEGORIES)) {
        // Use a more specific selector to find the button (not the description)
        const button = Array.from(categoryButtons).find((btn) =>
          btn.textContent?.includes(category.name)
        )
        expect(button).toBeInTheDocument()
      }
    })

    it('renders all built-in presets', () => {
      render(<StackPresetPicker isOpen={true} />)

      for (const preset of STACK_PRESETS) {
        expect(screen.getByText(preset.name)).toBeInTheDocument()
      }
    })

    it('renders apply button', () => {
      render(<StackPresetPicker isOpen={true} />)
      expect(screen.getByText('Apply Preset')).toBeInTheDocument()
    })
  })

  describe('Category Filtering', () => {
    it('shows all presets by default', () => {
      render(<StackPresetPicker isOpen={true} />)

      for (const preset of STACK_PRESETS) {
        expect(screen.getByText(preset.name)).toBeInTheDocument()
      }
    })

    it('filters presets by category when category is selected', () => {
      render(<StackPresetPicker isOpen={true} />)

      // Click on construction category
      const constructionButton = screen.getByText(/Construction/)
      fireEvent.click(constructionButton)

      // Should show construction presets
      const constructionPresets = STACK_PRESETS.filter((p) => p.category === 'construction')
      for (const preset of constructionPresets) {
        expect(screen.getByText(preset.name)).toBeInTheDocument()
      }

      // Should not show other category presets
      const otherPresets = STACK_PRESETS.filter((p) => p.category !== 'construction')
      for (const preset of otherPresets) {
        expect(screen.queryByText(preset.name)).not.toBeInTheDocument()
      }
    })

    it('returns to all presets when All is clicked', () => {
      render(<StackPresetPicker isOpen={true} />)

      // First filter by category
      fireEvent.click(screen.getByText(/Construction/))

      // Then click All
      fireEvent.click(screen.getByText(/All/))

      // All presets should be visible again
      for (const preset of STACK_PRESETS) {
        expect(screen.getByText(preset.name)).toBeInTheDocument()
      }
    })
  })

  describe('Search', () => {
    it('filters presets by search query', () => {
      render(<StackPresetPicker isOpen={true} />)

      const searchInput = screen.getByPlaceholderText(/search presets/i)
      fireEvent.change(searchInput, { target: { value: 'stone' } })

      // Should show stone-related presets
      expect(screen.getByText('Stone Wall')).toBeInTheDocument()

      // Should not show unrelated presets
      expect(screen.queryByText('Wood Tower')).not.toBeInTheDocument()
    })

    it('shows empty state when no presets match', () => {
      render(<StackPresetPicker isOpen={true} />)

      const searchInput = screen.getByPlaceholderText(/search presets/i)
      fireEvent.change(searchInput, { target: { value: 'xyznonexistent123' } })

      expect(screen.getByText('No presets found')).toBeInTheDocument()
    })

    it('shows clear button when search has text', () => {
      render(<StackPresetPicker isOpen={true} />)

      const searchInput = screen.getByPlaceholderText(/search presets/i)
      fireEvent.change(searchInput, { target: { value: 'stone' } })

      expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument()
    })

    it('clears search when clear button is clicked', () => {
      render(<StackPresetPicker isOpen={true} />)

      const searchInput = screen.getByPlaceholderText(/search presets/i)
      fireEvent.change(searchInput, { target: { value: 'stone' } })

      const clearButton = screen.getByRole('button', { name: /clear search/i })
      fireEvent.click(clearButton)

      expect((searchInput as HTMLInputElement).value).toBe('')
      // All presets should be visible again
      for (const preset of STACK_PRESETS) {
        expect(screen.getByText(preset.name)).toBeInTheDocument()
      }
    })
  })

  describe('Preset Selection', () => {
    it('selects preset on click', () => {
      render(<StackPresetPicker isOpen={true} />)

      const presetCard = screen.getByText('Stone Wall').closest('[role="button"]')
      expect(presetCard).toBeInTheDocument()

      fireEvent.click(presetCard!)

      expect(presetCard).toHaveAttribute('aria-selected', 'true')
    })

    it('shows preset details when selected', () => {
      render(<StackPresetPicker isOpen={true} />)

      const presetCard = screen.getByText('Stone Wall').closest('[role="button"]')
      fireEvent.click(presetCard!)

      // Details section should show preset info
      const details = document.querySelector('.stack-preset-picker__details')
      expect(details).toBeInTheDocument()
      expect(within(details as HTMLElement).getByText('Stone Wall')).toBeInTheDocument()
    })

    it('deselects when category changes', () => {
      render(<StackPresetPicker isOpen={true} />)

      // Select a preset
      const presetCard = screen.getByText('Stone Wall').closest('[role="button"]')
      fireEvent.click(presetCard!)

      // Change category by clicking the Magical category button (not the description text)
      const categoryButtons = document.querySelectorAll('.stack-preset-picker__category')
      const magicalButton = Array.from(categoryButtons).find((btn) =>
        btn.textContent?.includes('Magical')
      )
      fireEvent.click(magicalButton!)

      // Details should not be visible (no selection)
      expect(document.querySelector('.stack-preset-picker__details')).not.toBeInTheDocument()
    })
  })

  describe('Applying Presets', () => {
    it('apply button is disabled when no preset is selected', () => {
      render(<StackPresetPicker isOpen={true} onApplyPreset={mockOnApplyPreset} />)

      const applyButton = screen.getByText('Apply Preset')
      expect(applyButton).toBeDisabled()
    })

    it('apply button is enabled when preset is selected', () => {
      render(<StackPresetPicker isOpen={true} onApplyPreset={mockOnApplyPreset} />)

      // Select preset
      const presetCard = screen.getByText('Stone Wall').closest('[role="button"]')
      fireEvent.click(presetCard!)

      const applyButton = screen.getByText('Apply Preset')
      expect(applyButton).not.toBeDisabled()
    })

    it('calls onApplyPreset when apply button is clicked', () => {
      render(
        <StackPresetPicker isOpen={true} onApplyPreset={mockOnApplyPreset} onClose={mockOnClose} />
      )

      // Select preset
      const presetCard = screen.getByText('Stone Wall').closest('[role="button"]')
      fireEvent.click(presetCard!)

      // Click apply
      fireEvent.click(screen.getByText('Apply Preset'))

      expect(mockOnApplyPreset).toHaveBeenCalledTimes(1)
      const appliedConfig = mockOnApplyPreset.mock.calls[0][0] as CubeStackConfig
      expect(appliedConfig.layers.length).toBeGreaterThan(0)
    })

    it('closes picker after applying preset', () => {
      render(
        <StackPresetPicker isOpen={true} onApplyPreset={mockOnApplyPreset} onClose={mockOnClose} />
      )

      // Select and apply preset
      const presetCard = screen.getByText('Stone Wall').closest('[role="button"]')
      fireEvent.click(presetCard!)
      fireEvent.click(screen.getByText('Apply Preset'))

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('applies preset on double-click', () => {
      render(
        <StackPresetPicker isOpen={true} onApplyPreset={mockOnApplyPreset} onClose={mockOnClose} />
      )

      const presetCard = screen.getByText('Stone Wall').closest('[role="button"]')
      fireEvent.doubleClick(presetCard!)

      expect(mockOnApplyPreset).toHaveBeenCalledTimes(1)
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Saving Presets', () => {
    it('shows save button when currentStack is provided', () => {
      const testStack = createTestStack()
      render(<StackPresetPicker isOpen={true} currentStack={testStack} />)

      expect(screen.getByText('Save Current as Preset')).toBeInTheDocument()
    })

    it('does not show save button when no currentStack', () => {
      render(<StackPresetPicker isOpen={true} currentStack={null} />)

      expect(screen.queryByText('Save Current as Preset')).not.toBeInTheDocument()
    })

    it('opens save dialog when save button is clicked', () => {
      const testStack = createTestStack()
      render(<StackPresetPicker isOpen={true} currentStack={testStack} />)

      fireEvent.click(screen.getByText('Save Current as Preset'))

      expect(screen.getByText('Save as Preset')).toBeInTheDocument()
      expect(screen.getByLabelText(/Name/)).toBeInTheDocument()
    })

    it('closes save dialog when cancel is clicked', () => {
      const testStack = createTestStack()
      render(<StackPresetPicker isOpen={true} currentStack={testStack} />)

      fireEvent.click(screen.getByText('Save Current as Preset'))
      fireEvent.click(screen.getByText('Cancel'))

      expect(screen.queryByLabelText(/Name/)).not.toBeInTheDocument()
    })

    it('saves preset when form is submitted', () => {
      const testStack = createTestStack()
      render(<StackPresetPicker isOpen={true} currentStack={testStack} />)

      // Open dialog
      fireEvent.click(screen.getByText('Save Current as Preset'))

      // Fill form
      fireEvent.change(screen.getByLabelText(/Name/), { target: { value: 'My Custom Stack' } })
      fireEvent.change(screen.getByLabelText(/Description/), {
        target: { value: 'A custom description' },
      })
      fireEvent.change(screen.getByLabelText(/Tags/), { target: { value: 'custom, test' } })

      // Submit
      fireEvent.click(screen.getByText('Save Preset'))

      // Dialog should close
      expect(screen.queryByLabelText(/Name/)).not.toBeInTheDocument()

      // Preset should appear in list
      expect(screen.getByText('My Custom Stack')).toBeInTheDocument()
    })

    it('save button is disabled when name is empty', () => {
      const testStack = createTestStack()
      render(<StackPresetPicker isOpen={true} currentStack={testStack} />)

      fireEvent.click(screen.getByText('Save Current as Preset'))

      const saveButton = screen.getByRole('button', { name: 'Save Preset' })
      expect(saveButton).toBeDisabled()
    })
  })

  describe('Deleting User Presets', () => {
    it('shows delete button on user presets', () => {
      // First save a user preset
      const testStack = createTestStack()
      render(<StackPresetPicker isOpen={true} currentStack={testStack} />)

      fireEvent.click(screen.getByText('Save Current as Preset'))
      fireEvent.change(screen.getByLabelText(/Name/), { target: { value: 'Deletable Stack' } })
      fireEvent.click(screen.getByRole('button', { name: 'Save Preset' }))

      // Find the user preset card and check for delete button
      const presetCard = screen.getByText('Deletable Stack').closest('.stack-preset-picker__preset')
      expect(
        within(presetCard as HTMLElement).getByRole('button', { name: /delete/i })
      ).toBeInTheDocument()
    })

    it('does not show delete button on built-in presets', () => {
      render(<StackPresetPicker isOpen={true} />)

      const presetCard = screen.getByText('Stone Wall').closest('.stack-preset-picker__preset')
      expect(
        within(presetCard as HTMLElement).queryByRole('button', { name: /delete/i })
      ).not.toBeInTheDocument()
    })

    it('deletes user preset when delete button is clicked', () => {
      // First save a user preset
      const testStack = createTestStack()
      render(<StackPresetPicker isOpen={true} currentStack={testStack} />)

      fireEvent.click(screen.getByText('Save Current as Preset'))
      fireEvent.change(screen.getByLabelText(/Name/), { target: { value: 'To Be Deleted' } })
      fireEvent.click(screen.getByRole('button', { name: 'Save Preset' }))

      // Verify it's there
      expect(screen.getByText('To Be Deleted')).toBeInTheDocument()

      // Delete it
      const presetCard = screen.getByText('To Be Deleted').closest('.stack-preset-picker__preset')
      const deleteButton = within(presetCard as HTMLElement).getByRole('button', {
        name: /delete/i,
      })
      fireEvent.click(deleteButton)

      // Should be gone
      expect(screen.queryByText('To Be Deleted')).not.toBeInTheDocument()
    })
  })

  describe('Close Button', () => {
    it('calls onClose when close button is clicked', () => {
      render(<StackPresetPicker isOpen={true} onClose={mockOnClose} />)

      const closeButton = screen.getByRole('button', { name: /close/i })
      fireEvent.click(closeButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Accessibility', () => {
    it('preset cards are keyboard accessible', () => {
      render(<StackPresetPicker isOpen={true} />)

      const presetCard = screen.getByText('Stone Wall').closest('[role="button"]')
      expect(presetCard).toHaveAttribute('tabIndex', '0')
    })

    it('preset cards respond to Enter key', () => {
      render(<StackPresetPicker isOpen={true} />)

      const presetCard = screen.getByText('Stone Wall').closest('[role="button"]')
      fireEvent.keyDown(presetCard!, { key: 'Enter' })

      expect(presetCard).toHaveAttribute('aria-selected', 'true')
    })
  })
})
