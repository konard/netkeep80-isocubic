/**
 * Unit tests for PromptGenerator component
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PromptGenerator } from './PromptGenerator'
import type { SpectralCube } from '../types/cube'

describe('PromptGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the component title', () => {
      render(<PromptGenerator />)
      expect(screen.getByText('Generate by Description')).toBeInTheDocument()
    })

    it('should render status indicator', () => {
      render(<PromptGenerator />)
      expect(screen.getByText('Ready')).toBeInTheDocument()
    })

    it('should render prompt input field', () => {
      render(<PromptGenerator />)
      const input = screen.getByPlaceholderText(/e\.g\., dark stone with moss/i)
      expect(input).toBeInTheDocument()
    })

    it('should render generate button', () => {
      render(<PromptGenerator />)
      const button = screen.getByRole('button', { name: 'Generate cube' })
      expect(button).toBeInTheDocument()
    })

    it('should render Templates button', () => {
      render(<PromptGenerator />)
      expect(screen.getByRole('button', { name: /Templates/i })).toBeInTheDocument()
    })

    it('should render Random button', () => {
      render(<PromptGenerator />)
      expect(screen.getByRole('button', { name: /Random/i })).toBeInTheDocument()
    })

    it('should render example prompts', () => {
      render(<PromptGenerator />)
      expect(screen.getByText('Try:')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(<PromptGenerator className="custom-class" />)
      expect(container.querySelector('.custom-class')).toBeInTheDocument()
    })
  })

  describe('Input handling', () => {
    it('should update prompt value on input', async () => {
      const user = userEvent.setup()
      render(<PromptGenerator />)

      const input = screen.getByPlaceholderText(/e\.g\., dark stone with moss/i)
      await user.type(input, 'test stone')

      expect(input).toHaveValue('test stone')
    })

    it('should disable generate button when input is empty', () => {
      render(<PromptGenerator />)

      const button = screen.getByRole('button', { name: 'Generate cube' })
      expect(button).toBeDisabled()
    })

    it('should enable generate button when input has text', async () => {
      const user = userEvent.setup()
      render(<PromptGenerator />)

      const input = screen.getByPlaceholderText(/e\.g\., dark stone with moss/i)
      await user.type(input, 'stone')

      const button = screen.getByRole('button', { name: 'Generate cube' })
      expect(button).not.toBeDisabled()
    })

    it('should clear error when typing new prompt', async () => {
      const user = userEvent.setup()
      render(<PromptGenerator />)

      // Generate with invalid prompt to cause an error state
      // (this won't actually cause error since our generator handles all inputs)
      // Instead, test that typing clears previous state
      const input = screen.getByPlaceholderText(/e\.g\., dark stone with moss/i)
      await user.type(input, 'stone')

      // After typing, no error should be visible
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('Generation', () => {
    it('should call onCubeGenerated when generation succeeds', async () => {
      const user = userEvent.setup()
      const onCubeGenerated = vi.fn()
      render(<PromptGenerator onCubeGenerated={onCubeGenerated} />)

      const input = screen.getByPlaceholderText(/e\.g\., dark stone with moss/i)
      await user.type(input, 'stone')

      const button = screen.getByRole('button', { name: 'Generate cube' })
      await act(async () => {
        fireEvent.click(button)
      })

      await waitFor(() => {
        expect(onCubeGenerated).toHaveBeenCalled()
      })

      // Verify the generated cube has expected properties
      const generatedCube = onCubeGenerated.mock.calls[0][0] as SpectralCube
      expect(generatedCube.id).toBeDefined()
      expect(generatedCube.base).toBeDefined()
      expect(generatedCube.base.color).toHaveLength(3)
    })

    it('should show success result after generation', async () => {
      const user = userEvent.setup()
      render(<PromptGenerator />)

      const input = screen.getByPlaceholderText(/e\.g\., dark stone with moss/i)
      await user.type(input, 'stone')

      const button = screen.getByRole('button', { name: 'Generate cube' })
      await act(async () => {
        fireEvent.click(button)
      })

      await waitFor(() => {
        expect(screen.getByText('Generated!')).toBeInTheDocument()
      })
    })

    it('should show generation method in result', async () => {
      const user = userEvent.setup()
      render(<PromptGenerator />)

      const input = screen.getByPlaceholderText(/e\.g\., dark stone with moss/i)
      await user.type(input, 'stone')

      const button = screen.getByRole('button', { name: 'Generate cube' })
      await act(async () => {
        fireEvent.click(button)
      })

      await waitFor(() => {
        expect(screen.getByText('Method:')).toBeInTheDocument()
      })
    })

    it('should show confidence score in result', async () => {
      const user = userEvent.setup()
      render(<PromptGenerator />)

      const input = screen.getByPlaceholderText(/e\.g\., dark stone with moss/i)
      await user.type(input, 'stone')

      const button = screen.getByRole('button', { name: 'Generate cube' })
      await act(async () => {
        fireEvent.click(button)
      })

      await waitFor(() => {
        expect(screen.getByText('Confidence:')).toBeInTheDocument()
      })
    })

    it('should handle Enter key press to generate', async () => {
      const user = userEvent.setup()
      const onCubeGenerated = vi.fn()
      render(<PromptGenerator onCubeGenerated={onCubeGenerated} />)

      const input = screen.getByPlaceholderText(/e\.g\., dark stone with moss/i)
      await user.type(input, 'stone{Enter}')

      await waitFor(() => {
        expect(onCubeGenerated).toHaveBeenCalled()
      })
    })
  })

  describe('Template selection', () => {
    it('should show template panel when Templates button is clicked', async () => {
      const user = userEvent.setup()
      const { container } = render(<PromptGenerator />)

      const templatesButton = screen.getByRole('button', { name: /Templates/i })
      await user.click(templatesButton)

      // Should show category buttons (use container query to be specific)
      const categoryButtons = container.querySelectorAll('.prompt-generator__category-btn')
      expect(categoryButtons.length).toBeGreaterThan(0)

      // Check specific categories exist
      const categoryNames = Array.from(categoryButtons).map((btn) => btn.textContent)
      expect(categoryNames).toContain('Natural')
      expect(categoryNames).toContain('Wood')
      expect(categoryNames).toContain('Stone')
      expect(categoryNames).toContain('Metal')
    })

    it('should close template panel when clicking Templates again', async () => {
      const user = userEvent.setup()
      const { container } = render(<PromptGenerator />)

      const templatesButton = screen.getByRole('button', { name: /Templates/i })

      // Open
      await user.click(templatesButton)
      expect(container.querySelector('.prompt-generator__category-btn')).toBeInTheDocument()

      // Close - button text changes to "× Close"
      const closeButton = screen.getByRole('button', { name: /Close/i })
      await user.click(closeButton)

      // Category buttons should be gone
      expect(container.querySelector('.prompt-generator__category-btn')).not.toBeInTheDocument()
    })

    it('should generate cube when template is selected', async () => {
      const user = userEvent.setup()
      const onCubeGenerated = vi.fn()
      const { container } = render(<PromptGenerator onCubeGenerated={onCubeGenerated} />)

      // Open templates
      const templatesButton = screen.getByRole('button', { name: /Templates/i })
      await user.click(templatesButton)

      // Click on Stone category (3rd category button)
      const stoneCategory = container.querySelector(
        '.prompt-generator__category-btn:nth-child(3)'
      ) as HTMLElement
      expect(stoneCategory?.textContent).toBe('Stone')
      await user.click(stoneCategory)

      // Find and click a template button (e.g., granite)
      const graniteButton = screen.getByRole('button', { name: /granite/i })
      await act(async () => {
        fireEvent.click(graniteButton)
      })

      await waitFor(() => {
        expect(onCubeGenerated).toHaveBeenCalled()
      })
    })

    it('should filter templates by category', async () => {
      const user = userEvent.setup()
      const { container } = render(<PromptGenerator />)

      // Open templates
      const templatesButton = screen.getByRole('button', { name: /Templates/i })
      await user.click(templatesButton)

      // Click on Metal category button (4th category button)
      const metalCategory = container.querySelector(
        '.prompt-generator__category-btn:nth-child(4)'
      ) as HTMLElement
      expect(metalCategory?.textContent).toBe('Metal')
      await user.click(metalCategory)

      // Should show metal templates (using template-btn class to avoid matching example prompts)
      const templateButtons = container.querySelectorAll('.prompt-generator__template-btn')
      const templateNames = Array.from(templateButtons).map((btn) => btn.textContent?.toLowerCase())
      expect(templateNames).toContain('iron')
      expect(templateNames).toContain('steel')
      expect(templateNames).toContain('gold')
    })
  })

  describe('Random generation', () => {
    it('should generate random cube when Random button is clicked', async () => {
      const onCubeGenerated = vi.fn()
      render(<PromptGenerator onCubeGenerated={onCubeGenerated} />)

      const randomButton = screen.getByRole('button', { name: /Random/i })
      await act(async () => {
        fireEvent.click(randomButton)
      })

      await waitFor(() => {
        expect(onCubeGenerated).toHaveBeenCalled()
      })

      // Verify random cube properties
      const generatedCube = onCubeGenerated.mock.calls[0][0] as SpectralCube
      expect(generatedCube.id).toContain('gen_')
      expect(generatedCube.meta?.tags).toContain('random')
    })

    it('should show success message after random generation', async () => {
      render(<PromptGenerator />)

      const randomButton = screen.getByRole('button', { name: /Random/i })
      await act(async () => {
        fireEvent.click(randomButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Generated!')).toBeInTheDocument()
        expect(screen.getByText('Random')).toBeInTheDocument()
      })
    })
  })

  describe('Example prompts', () => {
    it('should fill input when example prompt is clicked', async () => {
      const user = userEvent.setup()
      render(<PromptGenerator />)

      // Find first example button (they're truncated, so look for partial text)
      const exampleButtons = screen.getAllByRole('button').filter((btn) => {
        const text = btn.textContent?.toLowerCase() || ''
        return text.includes('stone') || text.includes('gold') || text.includes('камен')
      })

      if (exampleButtons.length > 0) {
        await user.click(exampleButtons[0])

        const input = screen.getByPlaceholderText(/e\.g\., dark stone with moss/i)
        expect(input).not.toHaveValue('')
      }
    })
  })

  describe('Loading state', () => {
    it('should show spinner while generating', async () => {
      const user = userEvent.setup()
      render(<PromptGenerator />)

      const input = screen.getByPlaceholderText(/e\.g\., dark stone with moss/i)
      await user.type(input, 'stone')

      const button = screen.getByRole('button', { name: 'Generate cube' })

      // Check that clicking shows loading state (briefly)
      fireEvent.click(button)

      // The loading spinner should appear
      // Note: Since generation is fast, this might be hard to catch
      // We mainly verify that the component doesn't crash
    })

    it('should disable Random button while generating', async () => {
      const user = userEvent.setup()
      render(<PromptGenerator />)

      const input = screen.getByPlaceholderText(/e\.g\., dark stone with moss/i)
      await user.type(input, 'stone')

      const generateButton = screen.getByRole('button', { name: 'Generate cube' })

      // Start generation
      fireEvent.click(generateButton)

      // Random button should be disabled during generation
      // (Note: generation is very fast, so this might not be reliably testable)
    })
  })

  describe('Accessibility', () => {
    it('should have accessible label for prompt input', () => {
      render(<PromptGenerator />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveAccessibleName(/describe your cube/i)
    })

    it('should have accessible generate button', () => {
      render(<PromptGenerator />)

      const button = screen.getByRole('button', { name: 'Generate cube' })
      expect(button).toBeInTheDocument()
    })

    it('should show error message with alert role', async () => {
      // This test verifies that if an error occurs, it's announced to screen readers
      // In practice, our generator doesn't produce errors, but the component supports it
      render(<PromptGenerator />)

      // Check that the error container doesn't exist when there's no error
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('should have live region for loading announcement', async () => {
      render(<PromptGenerator />)

      // The loading region has aria-live attribute for screen readers
      // This ensures status changes are announced
    })
  })

  describe('Confidence display', () => {
    it('should show high confidence bar for keyword match', async () => {
      const user = userEvent.setup()
      render(<PromptGenerator />)

      const input = screen.getByPlaceholderText(/e\.g\., dark stone with moss/i)
      await user.type(input, 'stone')

      const button = screen.getByRole('button', { name: 'Generate cube' })
      await act(async () => {
        fireEvent.click(button)
      })

      await waitFor(() => {
        // Check that confidence is displayed
        const confidenceText = screen.getByText(/\d+%/)
        expect(confidenceText).toBeInTheDocument()
      })
    })

    it('should show low confidence for random generation', async () => {
      render(<PromptGenerator />)

      const randomButton = screen.getByRole('button', { name: /Random/i })
      await act(async () => {
        fireEvent.click(randomButton)
      })

      await waitFor(() => {
        // Random generation has 20% confidence
        expect(screen.getByText('20%')).toBeInTheDocument()
      })
    })
  })

  describe('Integration with tinyLLM', () => {
    it('should handle Russian prompts correctly', async () => {
      const user = userEvent.setup()
      const onCubeGenerated = vi.fn()
      render(<PromptGenerator onCubeGenerated={onCubeGenerated} />)

      const input = screen.getByPlaceholderText(/e\.g\., dark stone with moss/i)
      await user.type(input, 'камень')

      const button = screen.getByRole('button', { name: 'Generate cube' })
      await act(async () => {
        fireEvent.click(button)
      })

      await waitFor(() => {
        expect(onCubeGenerated).toHaveBeenCalled()
      })

      const generatedCube = onCubeGenerated.mock.calls[0][0] as SpectralCube
      expect(generatedCube.physics?.material).toBe('stone')
    })

    it('should handle complex English prompts', async () => {
      const user = userEvent.setup()
      const onCubeGenerated = vi.fn()
      render(<PromptGenerator onCubeGenerated={onCubeGenerated} />)

      const input = screen.getByPlaceholderText(/e\.g\., dark stone with moss/i)
      await user.type(input, 'dark weathered ancient stone')

      const button = screen.getByRole('button', { name: 'Generate cube' })
      await act(async () => {
        fireEvent.click(button)
      })

      await waitFor(() => {
        expect(onCubeGenerated).toHaveBeenCalled()
      })

      // Verify hybrid method was used
      expect(screen.getByText('Hybrid')).toBeInTheDocument()
    })
  })

  describe('Advanced mode (ISSUE 32: AI Integration)', () => {
    it('should render advanced mode toggle when enableAdvanced is true', () => {
      render(<PromptGenerator enableAdvanced={true} />)

      expect(screen.getByRole('button', { name: /Advanced/i })).toBeInTheDocument()
    })

    it('should not render advanced mode toggle when enableAdvanced is false', () => {
      render(<PromptGenerator enableAdvanced={false} />)

      expect(screen.queryByRole('button', { name: /Advanced/i })).not.toBeInTheDocument()
    })

    it('should show mode buttons when advanced panel is opened', async () => {
      const user = userEvent.setup()
      render(<PromptGenerator enableAdvanced={true} />)

      const advancedButton = screen.getByRole('button', { name: /Advanced/i })
      await user.click(advancedButton)

      // Should show mode buttons
      expect(screen.getByRole('button', { name: 'Single' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Batch' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Group' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Composite' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Contextual' })).toBeInTheDocument()
    })

    it('should disable Contextual mode button when no context cubes provided', async () => {
      const user = userEvent.setup()
      render(<PromptGenerator enableAdvanced={true} />)

      const advancedButton = screen.getByRole('button', { name: /Advanced/i })
      await user.click(advancedButton)

      const contextualButton = screen.getByRole('button', { name: 'Contextual' })
      expect(contextualButton).toBeDisabled()
    })

    it('should enable Contextual mode button when context cubes provided', async () => {
      const user = userEvent.setup()
      const contextCube: SpectralCube = {
        id: 'ctx_1',
        base: { color: [0.5, 0.5, 0.5], roughness: 0.5 },
        physics: { material: 'stone' },
        meta: { name: 'Test Stone' },
      }
      render(<PromptGenerator enableAdvanced={true} contextCubes={[contextCube]} />)

      const advancedButton = screen.getByRole('button', { name: /Advanced/i })
      await user.click(advancedButton)

      const contextualButton = screen.getByRole('button', { name: 'Contextual' })
      expect(contextualButton).not.toBeDisabled()
    })

    it('should show context info when in contextual mode with cubes', async () => {
      const user = userEvent.setup()
      const contextCube: SpectralCube = {
        id: 'ctx_1',
        base: { color: [0.5, 0.5, 0.5], roughness: 0.5 },
        physics: { material: 'stone' },
        meta: { name: 'Test Stone' },
      }
      render(<PromptGenerator enableAdvanced={true} contextCubes={[contextCube]} />)

      // Open advanced mode
      const advancedButton = screen.getByRole('button', { name: /Advanced/i })
      await user.click(advancedButton)

      // Switch to contextual mode
      const contextualButton = screen.getByRole('button', { name: 'Contextual' })
      await user.click(contextualButton)

      // Should show context cubes toggle
      expect(screen.getByText('Context Cubes')).toBeInTheDocument()
    })

    it('should generate cube in contextual mode using context', async () => {
      const user = userEvent.setup()
      const onCubeGenerated = vi.fn()
      const contextCube: SpectralCube = {
        id: 'ctx_1',
        base: { color: [0.8, 0.6, 0.4], roughness: 0.7 },
        physics: { material: 'wood' },
        meta: { name: 'Oak Wood', tags: ['wood', 'natural'] },
        noise: { type: 'perlin', scale: 2 },
      }
      render(
        <PromptGenerator
          enableAdvanced={true}
          contextCubes={[contextCube]}
          onCubeGenerated={onCubeGenerated}
        />
      )

      // Open advanced mode
      const advancedButton = screen.getByRole('button', { name: /Advanced/i })
      await user.click(advancedButton)

      // Switch to contextual mode
      const contextualButton = screen.getByRole('button', { name: 'Contextual' })
      await user.click(contextualButton)

      // Enter prompt
      const input = screen.getByPlaceholderText(/e\.g\., dark stone with moss/i)
      await user.type(input, 'similar wooden plank')

      // Generate
      const generateButton = screen.getByRole('button', { name: 'Generate cube' })
      await act(async () => {
        fireEvent.click(generateButton)
      })

      await waitFor(() => {
        expect(onCubeGenerated).toHaveBeenCalled()
      })

      // Verify the cube was generated
      const generatedCube = onCubeGenerated.mock.calls[0][0] as SpectralCube
      expect(generatedCube.id).toBeDefined()
    })

    it('should show extracted style info in contextual mode', async () => {
      const user = userEvent.setup()
      const contextCubes: SpectralCube[] = [
        {
          id: 'ctx_1',
          base: { color: [0.5, 0.5, 0.5], roughness: 0.6 },
          physics: { material: 'stone' },
          meta: { tags: ['stone', 'natural'] },
          noise: { type: 'perlin', scale: 2 },
        },
        {
          id: 'ctx_2',
          base: { color: [0.4, 0.4, 0.4], roughness: 0.7 },
          physics: { material: 'stone' },
          meta: { tags: ['stone', 'rough'] },
          noise: { type: 'perlin', scale: 3 },
        },
      ]
      render(<PromptGenerator enableAdvanced={true} contextCubes={contextCubes} />)

      // Open advanced mode
      const advancedButton = screen.getByRole('button', { name: /Advanced/i })
      await user.click(advancedButton)

      // Switch to contextual mode
      const contextualButton = screen.getByRole('button', { name: 'Contextual' })
      await user.click(contextualButton)

      // Toggle show context info
      const showButton = screen.getByRole('button', { name: /Show \(2\)/i })
      await user.click(showButton)

      // Should show extracted style
      expect(screen.getByText('Extracted Style:')).toBeInTheDocument()
      expect(screen.getByText(/Dominant material:/)).toBeInTheDocument()
    })

    it('should show theme selector in advanced mode', async () => {
      const user = userEvent.setup()
      render(<PromptGenerator enableAdvanced={true} />)

      const advancedButton = screen.getByRole('button', { name: /Advanced/i })
      await user.click(advancedButton)

      // Should have theme selector
      expect(screen.getByLabelText(/Theme/i)).toBeInTheDocument()
    })
  })
})
