/**
 * Tests for LODConfigEditor component
 *
 * ISSUE 31: Настройки LOD в редакторе (LOD Settings Editor)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LODConfigEditor } from './LODConfigEditor'
import type { LODConfig, LODStatistics } from '../types/lod'
import { DEFAULT_LOD_CONFIG } from '../types/lod'

describe('LODConfigEditor', () => {
  const mockOnConfigChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders with default config', () => {
      render(<LODConfigEditor />)
      expect(screen.getByText('Enable LOD System')).toBeInTheDocument()
      expect(screen.getByText('Profile')).toBeInTheDocument()
    })

    it('renders enable/disable checkbox', () => {
      render(<LODConfigEditor config={DEFAULT_LOD_CONFIG} />)
      const checkbox = screen.getByRole('checkbox', { name: /enable lod system/i })
      expect(checkbox).toBeInTheDocument()
      expect(checkbox).toBeChecked()
    })

    it('renders profile selector', () => {
      render(<LODConfigEditor />)
      expect(screen.getByRole('combobox', { name: /profile/i })).toBeInTheDocument()
    })

    it('renders advanced settings toggle', () => {
      render(<LODConfigEditor />)
      expect(screen.getByText('Advanced Settings')).toBeInTheDocument()
    })

    it('renders with custom className', () => {
      const { container } = render(<LODConfigEditor className="custom-class" />)
      expect(container.firstChild).toHaveClass('lod-config-editor')
      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('Enable/Disable Toggle', () => {
    it('enables LOD system when checkbox is checked', () => {
      const disabledConfig: LODConfig = { ...DEFAULT_LOD_CONFIG, enabled: false }
      render(<LODConfigEditor config={disabledConfig} onConfigChange={mockOnConfigChange} />)

      const checkbox = screen.getByRole('checkbox', { name: /enable lod system/i })
      fireEvent.click(checkbox)

      expect(mockOnConfigChange).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }))
    })

    it('disables LOD system when checkbox is unchecked', () => {
      render(<LODConfigEditor config={DEFAULT_LOD_CONFIG} onConfigChange={mockOnConfigChange} />)

      const checkbox = screen.getByRole('checkbox', { name: /enable lod system/i })
      fireEvent.click(checkbox)

      expect(mockOnConfigChange).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }))
    })

    it('disables profile selector when LOD is disabled', () => {
      const disabledConfig: LODConfig = { ...DEFAULT_LOD_CONFIG, enabled: false }
      render(<LODConfigEditor config={disabledConfig} />)

      const profileSelect = screen.getByRole('combobox', { name: /profile/i })
      expect(profileSelect).toBeDisabled()
    })
  })

  describe('Profile Selection', () => {
    it('shows Balanced as default profile', () => {
      render(<LODConfigEditor config={DEFAULT_LOD_CONFIG} />)
      const profileSelect = screen.getByRole('combobox', { name: /profile/i })
      expect(profileSelect).toHaveValue('balanced')
    })

    it('changes to performance profile', () => {
      render(<LODConfigEditor config={DEFAULT_LOD_CONFIG} onConfigChange={mockOnConfigChange} />)

      const profileSelect = screen.getByRole('combobox', { name: /profile/i })
      fireEvent.change(profileSelect, { target: { value: 'performance' } })

      expect(mockOnConfigChange).toHaveBeenCalled()
      const calledConfig = mockOnConfigChange.mock.calls[0][0]
      // Performance profile has shorter distances
      expect(calledConfig.thresholds[0].maxDistance).toBeLessThan(
        DEFAULT_LOD_CONFIG.thresholds[0].maxDistance
      )
    })

    it('changes to quality profile', () => {
      render(<LODConfigEditor config={DEFAULT_LOD_CONFIG} onConfigChange={mockOnConfigChange} />)

      const profileSelect = screen.getByRole('combobox', { name: /profile/i })
      fireEvent.change(profileSelect, { target: { value: 'quality' } })

      expect(mockOnConfigChange).toHaveBeenCalled()
      const calledConfig = mockOnConfigChange.mock.calls[0][0]
      // Quality profile has longer distances
      expect(calledConfig.thresholds[0].maxDistance).toBeGreaterThan(
        DEFAULT_LOD_CONFIG.thresholds[0].maxDistance
      )
    })

    it('shows profile descriptions', () => {
      render(<LODConfigEditor config={DEFAULT_LOD_CONFIG} />)
      expect(screen.getByText(/balanced settings for most devices/i)).toBeInTheDocument()
    })

    it('preserves enabled state when changing profiles', () => {
      const enabledConfig: LODConfig = { ...DEFAULT_LOD_CONFIG, enabled: true }
      render(<LODConfigEditor config={enabledConfig} onConfigChange={mockOnConfigChange} />)

      const profileSelect = screen.getByRole('combobox', { name: /profile/i })
      fireEvent.change(profileSelect, { target: { value: 'performance' } })

      expect(mockOnConfigChange).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }))
    })
  })

  describe('Statistics Display', () => {
    const mockStats: LODStatistics = {
      cubesPerLevel: { 0: 10, 1: 20, 2: 30, 3: 15, 4: 5 },
      totalCubes: 80,
      averageLODLevel: 1.69,
      transitioningCubes: 3,
      performanceSavings: 42.5,
    }

    it('renders statistics when provided', () => {
      render(<LODConfigEditor statistics={mockStats} />)

      expect(screen.getByText('Live Statistics')).toBeInTheDocument()
      expect(screen.getByText('80')).toBeInTheDocument() // Total Cubes
      expect(screen.getByText('1.7')).toBeInTheDocument() // Avg LOD (rounded)
      expect(screen.getByText('43%')).toBeInTheDocument() // Performance Savings (rounded)
    })

    it('renders distribution bar', () => {
      render(<LODConfigEditor statistics={mockStats} />)
      expect(screen.getByText('Level Distribution')).toBeInTheDocument()
    })

    it('renders cubes per level in legend', () => {
      render(<LODConfigEditor statistics={mockStats} />)

      expect(screen.getByText('L0: 10')).toBeInTheDocument()
      expect(screen.getByText('L1: 20')).toBeInTheDocument()
      expect(screen.getByText('L2: 30')).toBeInTheDocument()
      expect(screen.getByText('L3: 15')).toBeInTheDocument()
      expect(screen.getByText('L4: 5')).toBeInTheDocument()
    })

    it('does not render statistics when not provided', () => {
      render(<LODConfigEditor />)
      expect(screen.queryByText('Live Statistics')).not.toBeInTheDocument()
    })
  })

  describe('Advanced Settings', () => {
    it('expands advanced settings when clicked', () => {
      render(<LODConfigEditor config={DEFAULT_LOD_CONFIG} />)

      const advancedToggle = screen.getByRole('button', { name: /advanced settings/i })
      fireEvent.click(advancedToggle)

      expect(screen.getByText('Transition Duration')).toBeInTheDocument()
      expect(screen.getByText('Screen Size Threshold')).toBeInTheDocument()
      expect(screen.getByText('Per-Level Settings')).toBeInTheDocument()
    })

    it('shows advanced settings by default when showAdvanced is true', () => {
      render(<LODConfigEditor config={DEFAULT_LOD_CONFIG} showAdvanced={true} />)
      expect(screen.getByText('Transition Duration')).toBeInTheDocument()
    })

    it('updates transition duration', () => {
      render(
        <LODConfigEditor
          config={DEFAULT_LOD_CONFIG}
          onConfigChange={mockOnConfigChange}
          showAdvanced={true}
        />
      )

      const slider = screen.getByRole('slider', { name: /transition duration/i })
      fireEvent.change(slider, { target: { value: '0.5' } })

      expect(mockOnConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({ transitionDuration: 0.5 })
      )
    })

    it('updates screen size threshold', () => {
      render(
        <LODConfigEditor
          config={DEFAULT_LOD_CONFIG}
          onConfigChange={mockOnConfigChange}
          showAdvanced={true}
        />
      )

      const slider = screen.getByRole('slider', { name: /screen size threshold/i })
      fireEvent.change(slider, { target: { value: '75' } })

      expect(mockOnConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({ screenSizeThreshold: 75 })
      )
    })

    it('disables advanced toggle when LOD is disabled', () => {
      const disabledConfig: LODConfig = { ...DEFAULT_LOD_CONFIG, enabled: false }
      render(<LODConfigEditor config={disabledConfig} />)

      const advancedToggle = screen.getByRole('button', { name: /advanced settings/i })
      expect(advancedToggle).toBeDisabled()
    })
  })

  describe('Per-Level Settings', () => {
    it('renders all LOD levels', () => {
      render(<LODConfigEditor config={DEFAULT_LOD_CONFIG} showAdvanced={true} />)

      expect(screen.getByText(/LOD 0: Full Detail/i)).toBeInTheDocument()
      expect(screen.getByText(/LOD 1: High Detail/i)).toBeInTheDocument()
      expect(screen.getByText(/LOD 2: Medium Detail/i)).toBeInTheDocument()
      expect(screen.getByText(/LOD 3: Low Detail/i)).toBeInTheDocument()
      expect(screen.getByText(/LOD 4: Minimal Detail/i)).toBeInTheDocument()
    })

    it('expands level settings when clicked', () => {
      render(<LODConfigEditor config={DEFAULT_LOD_CONFIG} showAdvanced={true} />)

      const level0Button = screen.getByRole('button', { name: /LOD 0: Full Detail/i })
      fireEvent.click(level0Button)

      expect(screen.getByText('Noise Octaves')).toBeInTheDocument()
      expect(screen.getByText('Max Gradients')).toBeInTheDocument()
      expect(screen.getByText('FFT Coefficients')).toBeInTheDocument()
      expect(screen.getByText('Enable Noise')).toBeInTheDocument()
      expect(screen.getByText('Enable Boundary Stitching')).toBeInTheDocument()
    })

    it('updates noise octaves for a level', () => {
      render(
        <LODConfigEditor
          config={DEFAULT_LOD_CONFIG}
          onConfigChange={mockOnConfigChange}
          showAdvanced={true}
        />
      )

      // Expand level 0
      const level0Button = screen.getByRole('button', { name: /LOD 0: Full Detail/i })
      fireEvent.click(level0Button)

      // Find and change the noise octaves slider
      const noiseOctavesSlider = screen.getByRole('slider', { name: /noise octaves/i })
      fireEvent.change(noiseOctavesSlider, { target: { value: '6' } })

      expect(mockOnConfigChange).toHaveBeenCalled()
      const calledConfig = mockOnConfigChange.mock.calls[0][0]
      expect(calledConfig.levelSettings[0].noiseOctaves).toBe(6)
    })

    it('toggles enable noise checkbox', () => {
      render(
        <LODConfigEditor
          config={DEFAULT_LOD_CONFIG}
          onConfigChange={mockOnConfigChange}
          showAdvanced={true}
        />
      )

      // Expand level 0
      const level0Button = screen.getByRole('button', { name: /LOD 0: Full Detail/i })
      fireEvent.click(level0Button)

      // Toggle enable noise
      const enableNoiseCheckbox = screen.getByRole('checkbox', { name: /enable noise/i })
      fireEvent.click(enableNoiseCheckbox)

      expect(mockOnConfigChange).toHaveBeenCalled()
      const calledConfig = mockOnConfigChange.mock.calls[0][0]
      expect(calledConfig.levelSettings[0].enableNoise).toBe(false)
    })

    it('shows distance range in level summary', () => {
      render(<LODConfigEditor config={DEFAULT_LOD_CONFIG} showAdvanced={true} />)
      // Check for distance summary (e.g., "0-5m")
      expect(screen.getByText('0-5m')).toBeInTheDocument()
    })
  })

  describe('Reset Button', () => {
    it('resets to default configuration', () => {
      const customConfig: LODConfig = {
        ...DEFAULT_LOD_CONFIG,
        transitionDuration: 0.8,
        screenSizeThreshold: 100,
      }

      render(
        <LODConfigEditor
          config={customConfig}
          onConfigChange={mockOnConfigChange}
          showAdvanced={true}
        />
      )

      const resetButton = screen.getByRole('button', { name: /reset to defaults/i })
      fireEvent.click(resetButton)

      expect(mockOnConfigChange).toHaveBeenCalledWith(DEFAULT_LOD_CONFIG)
    })
  })

  describe('Sync with Props', () => {
    it('updates local state when config prop changes', () => {
      const initialConfig: LODConfig = { ...DEFAULT_LOD_CONFIG, enabled: true }
      const { rerender } = render(<LODConfigEditor config={initialConfig} />)

      const checkbox = screen.getByRole('checkbox', { name: /enable lod system/i })
      expect(checkbox).toBeChecked()

      const updatedConfig: LODConfig = { ...DEFAULT_LOD_CONFIG, enabled: false }
      rerender(<LODConfigEditor config={updatedConfig} />)

      expect(checkbox).not.toBeChecked()
    })
  })

  describe('Accessibility', () => {
    it('has aria-expanded on advanced toggle', () => {
      render(<LODConfigEditor config={DEFAULT_LOD_CONFIG} />)

      const advancedToggle = screen.getByRole('button', { name: /advanced settings/i })
      expect(advancedToggle).toHaveAttribute('aria-expanded', 'false')

      fireEvent.click(advancedToggle)
      expect(advancedToggle).toHaveAttribute('aria-expanded', 'true')
    })

    it('has aria-expanded on level headers', () => {
      render(<LODConfigEditor config={DEFAULT_LOD_CONFIG} showAdvanced={true} />)

      const level0Button = screen.getByRole('button', { name: /LOD 0: Full Detail/i })
      expect(level0Button).toHaveAttribute('aria-expanded', 'false')

      fireEvent.click(level0Button)
      expect(level0Button).toHaveAttribute('aria-expanded', 'true')
    })

    it('has proper labels for form controls', () => {
      render(<LODConfigEditor config={DEFAULT_LOD_CONFIG} showAdvanced={true} />)

      // All sliders should have accessible labels
      expect(screen.getByRole('slider', { name: /transition duration/i })).toBeInTheDocument()
      expect(screen.getByRole('slider', { name: /screen size threshold/i })).toBeInTheDocument()
    })
  })
})

describe('LODConfigEditor Profile Presets', () => {
  it('performance profile has aggressive thresholds', () => {
    const mockOnConfigChange = vi.fn()
    render(<LODConfigEditor config={DEFAULT_LOD_CONFIG} onConfigChange={mockOnConfigChange} />)

    const profileSelect = screen.getByRole('combobox', { name: /profile/i })
    fireEvent.change(profileSelect, { target: { value: 'performance' } })

    const calledConfig = mockOnConfigChange.mock.calls[0][0] as LODConfig
    expect(calledConfig.thresholds[0].maxDistance).toBe(3)
    expect(calledConfig.screenSizeThreshold).toBe(75)
    expect(calledConfig.transitionDuration).toBe(0.2)
  })

  it('quality profile has relaxed thresholds', () => {
    const mockOnConfigChange = vi.fn()
    render(<LODConfigEditor config={DEFAULT_LOD_CONFIG} onConfigChange={mockOnConfigChange} />)

    const profileSelect = screen.getByRole('combobox', { name: /profile/i })
    fireEvent.change(profileSelect, { target: { value: 'quality' } })

    const calledConfig = mockOnConfigChange.mock.calls[0][0] as LODConfig
    expect(calledConfig.thresholds[0].maxDistance).toBe(10)
    expect(calledConfig.screenSizeThreshold).toBe(30)
    expect(calledConfig.transitionDuration).toBe(0.5)
  })

  it('detects custom profile when thresholds are modified', () => {
    const customConfig: LODConfig = {
      ...DEFAULT_LOD_CONFIG,
      thresholds: [
        { level: 0, minDistance: 0, maxDistance: 7 }, // Custom value
        ...DEFAULT_LOD_CONFIG.thresholds.slice(1),
      ],
    }

    render(<LODConfigEditor config={customConfig} />)

    const profileSelect = screen.getByRole('combobox', { name: /profile/i })
    expect(profileSelect).toHaveValue('custom')
  })
})
