/**
 * Tests for EnergyVisualizationEditor component (ISSUE 28)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  EnergyVisualizationEditor,
  DEFAULT_EDITOR_SETTINGS,
  DEFAULT_VISUALIZATION_SETTINGS,
  DEFAULT_ANIMATION_SETTINGS,
  type EnergyVisualizationEditorSettings,
} from './EnergyVisualizationEditor'
import { ChannelMask } from '../shaders/energy-cube'

describe('EnergyVisualizationEditor', () => {
  let mockOnSettingsChange: ReturnType<typeof vi.fn>
  let defaultSettings: EnergyVisualizationEditorSettings

  beforeEach(() => {
    mockOnSettingsChange = vi.fn()
    defaultSettings = { ...DEFAULT_EDITOR_SETTINGS }
  })

  describe('Rendering', () => {
    it('renders the editor title', () => {
      render(<EnergyVisualizationEditor settings={defaultSettings} />)
      expect(screen.getByText('Energy Visualization')).toBeInTheDocument()
    })

    it('renders visualization section', () => {
      render(<EnergyVisualizationEditor settings={defaultSettings} />)
      expect(screen.getByText('Visualization')).toBeInTheDocument()
    })

    it('renders animation section', () => {
      render(<EnergyVisualizationEditor settings={defaultSettings} />)
      expect(screen.getByText('Animation')).toBeInTheDocument()
    })

    it('renders preview info by default', () => {
      render(<EnergyVisualizationEditor settings={defaultSettings} />)
      expect(screen.getByText('Mode:')).toBeInTheDocument()
      expect(screen.getByText('Channels:')).toBeInTheDocument()
      expect(screen.getByText('Intensity:')).toBeInTheDocument()
      expect(screen.getByText('Animation:')).toBeInTheDocument()
    })

    it('hides preview info when showPreviewInfo is false', () => {
      render(<EnergyVisualizationEditor settings={defaultSettings} showPreviewInfo={false} />)
      expect(screen.queryByText('Mode:')).not.toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(
        <EnergyVisualizationEditor settings={defaultSettings} className="custom-class" />
      )
      const editor = container.querySelector('.energy-viz-editor')
      expect(editor).toHaveClass('custom-class')
    })
  })

  describe('Preview info', () => {
    it('displays current visualization mode', () => {
      render(<EnergyVisualizationEditor settings={defaultSettings} />)
      // Check for mode in preview info row (use within container to avoid matching dropdown options)
      const previewInfoRows = document.querySelectorAll('.energy-viz-editor__preview-row')
      const modeRow = Array.from(previewInfoRows).find((row) => row.textContent?.includes('Mode:'))
      expect(modeRow).toBeInTheDocument()
      expect(modeRow?.textContent).toContain('Energy Density')
    })

    it('displays active channels', () => {
      render(<EnergyVisualizationEditor settings={defaultSettings} />)
      expect(screen.getByText('Red, Green, Blue, Alpha')).toBeInTheDocument()
    })

    it('displays intensity settings', () => {
      render(<EnergyVisualizationEditor settings={defaultSettings} />)
      expect(screen.getByText(/Scale: 1.0x, Glow: 0.5/)).toBeInTheDocument()
    })

    it('displays animation status when enabled', () => {
      render(<EnergyVisualizationEditor settings={defaultSettings} />)
      expect(screen.getByText(/Speed: 1.0x/)).toBeInTheDocument()
    })

    it('displays "Disabled" when animation is off', () => {
      const settings: EnergyVisualizationEditorSettings = {
        ...defaultSettings,
        animation: {
          ...defaultSettings.animation,
          animate: false,
        },
      }
      render(<EnergyVisualizationEditor settings={settings} />)
      expect(screen.getByText('Disabled')).toBeInTheDocument()
    })
  })

  describe('Visualization section', () => {
    describe('Visualization Mode', () => {
      it('renders visualization mode dropdown', () => {
        render(
          <EnergyVisualizationEditor
            settings={defaultSettings}
            onSettingsChange={mockOnSettingsChange}
          />
        )
        expect(screen.getByLabelText('Visualization Mode')).toBeInTheDocument()
      })

      it('displays all visualization mode options', () => {
        render(
          <EnergyVisualizationEditor
            settings={defaultSettings}
            onSettingsChange={mockOnSettingsChange}
          />
        )
        const select = screen.getByLabelText('Visualization Mode')
        expect(select.querySelector('option[value="energy"]')).toBeInTheDocument()
        expect(select.querySelector('option[value="amplitude"]')).toBeInTheDocument()
        expect(select.querySelector('option[value="phase"]')).toBeInTheDocument()
      })

      it('updates visualization mode when changed', () => {
        render(
          <EnergyVisualizationEditor
            settings={defaultSettings}
            onSettingsChange={mockOnSettingsChange}
          />
        )

        const select = screen.getByLabelText('Visualization Mode')
        fireEvent.change(select, { target: { value: 'amplitude' } })

        expect(mockOnSettingsChange).toHaveBeenCalled()
        const newSettings = mockOnSettingsChange.mock.calls[0][0]
        expect(newSettings.visualization.visualizationMode).toBe('amplitude')
      })

      it('shows description for current mode', () => {
        render(<EnergyVisualizationEditor settings={defaultSettings} />)
        expect(screen.getByText(/Shows E = \|psi\|\^2/)).toBeInTheDocument()
      })
    })

    describe('Channel Mask', () => {
      it('renders channel mask checkboxes', () => {
        render(
          <EnergyVisualizationEditor
            settings={defaultSettings}
            onSettingsChange={mockOnSettingsChange}
          />
        )
        expect(screen.getByText('Channel Mask')).toBeInTheDocument()

        // Find checkboxes within the channel group
        const checkboxes = screen.getAllByRole('checkbox')
        expect(checkboxes.length).toBeGreaterThanOrEqual(4)
      })

      it('shows all channels enabled by default (RGBA)', () => {
        render(<EnergyVisualizationEditor settings={defaultSettings} />)
        const channelGroup = screen.getByText('Channel Mask').parentElement
        const checkboxes = channelGroup?.querySelectorAll('input[type="checkbox"]')
        checkboxes?.forEach((cb) => {
          expect(cb).toBeChecked()
        })
      })

      it('toggles red channel when clicked', () => {
        render(
          <EnergyVisualizationEditor
            settings={defaultSettings}
            onSettingsChange={mockOnSettingsChange}
          />
        )

        const redCheckbox = screen.getByText('Red').previousElementSibling?.previousElementSibling
        if (redCheckbox) {
          fireEvent.click(redCheckbox)

          expect(mockOnSettingsChange).toHaveBeenCalled()
          const newSettings = mockOnSettingsChange.mock.calls[0][0]
          // Should toggle from RGBA (15) to GBA (14)
          expect(newSettings.visualization.channelMask).toBe(ChannelMask.RGBA ^ ChannelMask.R)
        }
      })

      it('displays correct channel indicator colors', () => {
        render(<EnergyVisualizationEditor settings={defaultSettings} />)

        // Each channel should have its indicator
        const redLabel = screen.getByText('Red')
        const greenLabel = screen.getByText('Green')
        const blueLabel = screen.getByText('Blue')
        const alphaLabel = screen.getByText('Alpha')

        expect(redLabel).toBeInTheDocument()
        expect(greenLabel).toBeInTheDocument()
        expect(blueLabel).toBeInTheDocument()
        expect(alphaLabel).toBeInTheDocument()
      })
    })

    describe('Energy Scale', () => {
      it('renders energy scale slider', () => {
        render(
          <EnergyVisualizationEditor
            settings={defaultSettings}
            onSettingsChange={mockOnSettingsChange}
          />
        )
        expect(screen.getByLabelText(/Energy Scale/)).toBeInTheDocument()
      })

      it('displays current energy scale value', () => {
        render(<EnergyVisualizationEditor settings={defaultSettings} />)
        expect(screen.getByText('1.00')).toBeInTheDocument()
      })

      it('updates energy scale when slider is changed', () => {
        render(
          <EnergyVisualizationEditor
            settings={defaultSettings}
            onSettingsChange={mockOnSettingsChange}
          />
        )

        const slider = screen.getByLabelText(/Energy Scale/)
        fireEvent.change(slider, { target: { value: '2.0' } })

        expect(mockOnSettingsChange).toHaveBeenCalled()
        const newSettings = mockOnSettingsChange.mock.calls[0][0]
        expect(newSettings.visualization.energyScale).toBe(2.0)
      })

      it('has correct min and max values', () => {
        render(<EnergyVisualizationEditor settings={defaultSettings} />)
        const slider = screen.getByLabelText(/Energy Scale/)
        expect(slider).toHaveAttribute('min', '0.1')
        expect(slider).toHaveAttribute('max', '3.0')
      })
    })

    describe('Glow Intensity', () => {
      it('renders glow intensity slider', () => {
        render(
          <EnergyVisualizationEditor
            settings={defaultSettings}
            onSettingsChange={mockOnSettingsChange}
          />
        )
        expect(screen.getByLabelText(/Glow Intensity/)).toBeInTheDocument()
      })

      it('displays current glow intensity value', () => {
        render(<EnergyVisualizationEditor settings={defaultSettings} />)
        expect(screen.getByText('0.50')).toBeInTheDocument()
      })

      it('updates glow intensity when slider is changed', () => {
        render(
          <EnergyVisualizationEditor
            settings={defaultSettings}
            onSettingsChange={mockOnSettingsChange}
          />
        )

        const slider = screen.getByLabelText(/Glow Intensity/)
        fireEvent.change(slider, { target: { value: '1.5' } })

        expect(mockOnSettingsChange).toHaveBeenCalled()
        const newSettings = mockOnSettingsChange.mock.calls[0][0]
        expect(newSettings.visualization.glowIntensity).toBe(1.5)
      })

      it('has correct min and max values', () => {
        render(<EnergyVisualizationEditor settings={defaultSettings} />)
        const slider = screen.getByLabelText(/Glow Intensity/)
        expect(slider).toHaveAttribute('min', '0.0')
        expect(slider).toHaveAttribute('max', '2.0')
      })
    })

    describe('Reset button', () => {
      it('renders reset button for visualization', () => {
        render(
          <EnergyVisualizationEditor
            settings={defaultSettings}
            onSettingsChange={mockOnSettingsChange}
          />
        )
        const resetButtons = screen.getAllByRole('button', { name: /reset/i })
        expect(resetButtons.length).toBeGreaterThanOrEqual(1)
      })

      it('resets visualization settings to defaults', () => {
        const customSettings: EnergyVisualizationEditorSettings = {
          ...defaultSettings,
          visualization: {
            visualizationMode: 'phase',
            channelMask: ChannelMask.R,
            energyScale: 2.5,
            glowIntensity: 1.8,
          },
        }
        render(
          <EnergyVisualizationEditor
            settings={customSettings}
            onSettingsChange={mockOnSettingsChange}
          />
        )

        const resetButtons = screen.getAllByRole('button', { name: /reset/i })
        fireEvent.click(resetButtons[0])

        expect(mockOnSettingsChange).toHaveBeenCalled()
        const newSettings = mockOnSettingsChange.mock.calls[0][0]
        expect(newSettings.visualization).toEqual(DEFAULT_VISUALIZATION_SETTINGS)
      })
    })
  })

  describe('Animation section', () => {
    describe('Animate checkbox', () => {
      it('renders animate checkbox', () => {
        render(
          <EnergyVisualizationEditor
            settings={defaultSettings}
            onSettingsChange={mockOnSettingsChange}
          />
        )
        expect(screen.getByText('Enable Animation')).toBeInTheDocument()
      })

      it('is checked by default', () => {
        render(<EnergyVisualizationEditor settings={defaultSettings} />)
        const animateCheckbox = screen.getByText('Enable Animation')
          .previousElementSibling as HTMLInputElement
        expect(animateCheckbox).toBeChecked()
      })

      it('toggles animation when clicked', () => {
        render(
          <EnergyVisualizationEditor
            settings={defaultSettings}
            onSettingsChange={mockOnSettingsChange}
          />
        )

        const animateCheckbox = screen.getByText('Enable Animation')
          .previousElementSibling as HTMLInputElement
        fireEvent.click(animateCheckbox)

        expect(mockOnSettingsChange).toHaveBeenCalled()
        const newSettings = mockOnSettingsChange.mock.calls[0][0]
        expect(newSettings.animation.animate).toBe(false)
      })
    })

    describe('Animation Speed', () => {
      it('renders animation speed slider', () => {
        render(
          <EnergyVisualizationEditor
            settings={defaultSettings}
            onSettingsChange={mockOnSettingsChange}
          />
        )
        expect(screen.getByLabelText(/Animation Speed/)).toBeInTheDocument()
      })

      it('displays current animation speed value', () => {
        render(<EnergyVisualizationEditor settings={defaultSettings} />)
        expect(screen.getByText('1.0x')).toBeInTheDocument()
      })

      it('updates animation speed when slider is changed', () => {
        render(
          <EnergyVisualizationEditor
            settings={defaultSettings}
            onSettingsChange={mockOnSettingsChange}
          />
        )

        const slider = screen.getByLabelText(/Animation Speed/)
        fireEvent.change(slider, { target: { value: '3.0' } })

        expect(mockOnSettingsChange).toHaveBeenCalled()
        const newSettings = mockOnSettingsChange.mock.calls[0][0]
        expect(newSettings.animation.animationSpeed).toBe(3.0)
      })

      it('is disabled when animation is off', () => {
        const settings: EnergyVisualizationEditorSettings = {
          ...defaultSettings,
          animation: {
            ...defaultSettings.animation,
            animate: false,
          },
        }
        render(<EnergyVisualizationEditor settings={settings} />)

        const slider = screen.getByLabelText(/Animation Speed/)
        expect(slider).toBeDisabled()
      })

      it('has correct min and max values', () => {
        render(<EnergyVisualizationEditor settings={defaultSettings} />)
        const slider = screen.getByLabelText(/Animation Speed/)
        expect(slider).toHaveAttribute('min', '0.1')
        expect(slider).toHaveAttribute('max', '5.0')
      })
    })

    describe('Rotate checkbox', () => {
      it('renders rotate checkbox', () => {
        render(
          <EnergyVisualizationEditor
            settings={defaultSettings}
            onSettingsChange={mockOnSettingsChange}
          />
        )
        expect(screen.getByText('Enable Rotation')).toBeInTheDocument()
      })

      it('is unchecked by default', () => {
        render(<EnergyVisualizationEditor settings={defaultSettings} />)
        const rotateCheckbox = screen.getByText('Enable Rotation')
          .previousElementSibling as HTMLInputElement
        expect(rotateCheckbox).not.toBeChecked()
      })

      it('toggles rotation when clicked', () => {
        render(
          <EnergyVisualizationEditor
            settings={defaultSettings}
            onSettingsChange={mockOnSettingsChange}
          />
        )

        const rotateCheckbox = screen.getByText('Enable Rotation')
          .previousElementSibling as HTMLInputElement
        fireEvent.click(rotateCheckbox)

        expect(mockOnSettingsChange).toHaveBeenCalled()
        const newSettings = mockOnSettingsChange.mock.calls[0][0]
        expect(newSettings.animation.rotate).toBe(true)
      })
    })

    describe('Rotation Speed', () => {
      it('renders rotation speed slider', () => {
        render(
          <EnergyVisualizationEditor
            settings={defaultSettings}
            onSettingsChange={mockOnSettingsChange}
          />
        )
        expect(screen.getByLabelText(/Rotation Speed/)).toBeInTheDocument()
      })

      it('displays current rotation speed value', () => {
        render(<EnergyVisualizationEditor settings={defaultSettings} />)
        expect(screen.getByText('0.50 rad/s')).toBeInTheDocument()
      })

      it('updates rotation speed when slider is changed', () => {
        render(
          <EnergyVisualizationEditor
            settings={defaultSettings}
            onSettingsChange={mockOnSettingsChange}
          />
        )

        const slider = screen.getByLabelText(/Rotation Speed/)
        fireEvent.change(slider, { target: { value: '1.5' } })

        expect(mockOnSettingsChange).toHaveBeenCalled()
        const newSettings = mockOnSettingsChange.mock.calls[0][0]
        expect(newSettings.animation.rotationSpeed).toBe(1.5)
      })

      it('is disabled when rotation is off', () => {
        render(<EnergyVisualizationEditor settings={defaultSettings} />)
        const slider = screen.getByLabelText(/Rotation Speed/)
        expect(slider).toBeDisabled()
      })

      it('is enabled when rotation is on', () => {
        const settings: EnergyVisualizationEditorSettings = {
          ...defaultSettings,
          animation: {
            ...defaultSettings.animation,
            rotate: true,
          },
        }
        render(<EnergyVisualizationEditor settings={settings} />)

        const slider = screen.getByLabelText(/Rotation Speed/)
        expect(slider).not.toBeDisabled()
      })

      it('has correct min and max values', () => {
        render(<EnergyVisualizationEditor settings={defaultSettings} />)
        const slider = screen.getByLabelText(/Rotation Speed/)
        expect(slider).toHaveAttribute('min', '0.0')
        expect(slider).toHaveAttribute('max', '2.0')
      })
    })

    describe('Reset button', () => {
      it('resets animation settings to defaults', () => {
        const customSettings: EnergyVisualizationEditorSettings = {
          ...defaultSettings,
          animation: {
            animate: false,
            animationSpeed: 4.0,
            rotate: true,
            rotationSpeed: 1.5,
          },
        }
        render(
          <EnergyVisualizationEditor
            settings={customSettings}
            onSettingsChange={mockOnSettingsChange}
          />
        )

        const resetButtons = screen.getAllByRole('button', { name: /reset/i })
        fireEvent.click(resetButtons[1]) // Second reset button is for animation

        expect(mockOnSettingsChange).toHaveBeenCalled()
        const newSettings = mockOnSettingsChange.mock.calls[0][0]
        expect(newSettings.animation).toEqual(DEFAULT_ANIMATION_SETTINGS)
      })
    })
  })

  describe('Section collapsing', () => {
    it('both sections are expanded by default', () => {
      render(<EnergyVisualizationEditor settings={defaultSettings} />)

      const vizSection = screen.getByText('Visualization').closest('button')
      const animSection = screen.getByText('Animation').closest('button')

      expect(vizSection).toHaveAttribute('aria-expanded', 'true')
      expect(animSection).toHaveAttribute('aria-expanded', 'true')
    })

    it('collapses visualization section when header is clicked', () => {
      render(<EnergyVisualizationEditor settings={defaultSettings} />)

      const vizHeader = screen.getByText('Visualization').closest('button')
      fireEvent.click(vizHeader!)

      expect(vizHeader).toHaveAttribute('aria-expanded', 'false')
    })

    it('collapses animation section when header is clicked', () => {
      render(<EnergyVisualizationEditor settings={defaultSettings} />)

      const animHeader = screen.getByText('Animation').closest('button')
      fireEvent.click(animHeader!)

      expect(animHeader).toHaveAttribute('aria-expanded', 'false')
    })

    it('expands collapsed section when header is clicked again', () => {
      render(<EnergyVisualizationEditor settings={defaultSettings} />)

      const vizHeader = screen.getByText('Visualization').closest('button')
      fireEvent.click(vizHeader!) // Collapse
      fireEvent.click(vizHeader!) // Expand

      expect(vizHeader).toHaveAttribute('aria-expanded', 'true')
    })

    it('hides content when section is collapsed', () => {
      render(<EnergyVisualizationEditor settings={defaultSettings} />)

      const vizHeader = screen.getByText('Visualization').closest('button')
      fireEvent.click(vizHeader!)

      expect(screen.queryByLabelText('Visualization Mode')).not.toBeInTheDocument()
    })
  })

  describe('Edge cases', () => {
    it('handles undefined onSettingsChange gracefully', () => {
      render(<EnergyVisualizationEditor settings={defaultSettings} />)

      // Should not throw when interacting without callback
      const slider = screen.getByLabelText(/Energy Scale/)
      expect(() => {
        fireEvent.change(slider, { target: { value: '2.0' } })
      }).not.toThrow()
    })

    it('handles minimum channel mask (no channels)', () => {
      const settings: EnergyVisualizationEditorSettings = {
        ...defaultSettings,
        visualization: {
          ...defaultSettings.visualization,
          channelMask: 0,
        },
      }
      render(<EnergyVisualizationEditor settings={settings} />)
      expect(screen.getByText('None')).toBeInTheDocument()
    })

    it('handles single channel mask', () => {
      const settings: EnergyVisualizationEditorSettings = {
        ...defaultSettings,
        visualization: {
          ...defaultSettings.visualization,
          channelMask: ChannelMask.R,
        },
      }
      render(<EnergyVisualizationEditor settings={settings} />)
      // Check for channel in preview info row (use within container to avoid matching checkbox labels)
      const previewInfoRows = document.querySelectorAll('.energy-viz-editor__preview-row')
      const channelRow = Array.from(previewInfoRows).find((row) =>
        row.textContent?.includes('Channels:')
      )
      expect(channelRow).toBeInTheDocument()
      expect(channelRow?.textContent).toContain('Red')
    })
  })

  describe('Default values', () => {
    it('DEFAULT_VISUALIZATION_SETTINGS has correct values', () => {
      expect(DEFAULT_VISUALIZATION_SETTINGS.visualizationMode).toBe('energy')
      expect(DEFAULT_VISUALIZATION_SETTINGS.channelMask).toBe(ChannelMask.RGBA)
      expect(DEFAULT_VISUALIZATION_SETTINGS.energyScale).toBe(1.0)
      expect(DEFAULT_VISUALIZATION_SETTINGS.glowIntensity).toBe(0.5)
    })

    it('DEFAULT_ANIMATION_SETTINGS has correct values', () => {
      expect(DEFAULT_ANIMATION_SETTINGS.animate).toBe(true)
      expect(DEFAULT_ANIMATION_SETTINGS.animationSpeed).toBe(1.0)
      expect(DEFAULT_ANIMATION_SETTINGS.rotate).toBe(false)
      expect(DEFAULT_ANIMATION_SETTINGS.rotationSpeed).toBe(0.5)
    })

    it('DEFAULT_EDITOR_SETTINGS combines both defaults', () => {
      expect(DEFAULT_EDITOR_SETTINGS.visualization).toEqual(DEFAULT_VISUALIZATION_SETTINGS)
      expect(DEFAULT_EDITOR_SETTINGS.animation).toEqual(DEFAULT_ANIMATION_SETTINGS)
    })
  })
})
