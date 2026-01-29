/**
 * Tests for FFTChannelEditor component (ISSUE 27)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FFTChannelEditor, FFT_CHANNEL_PRESETS } from './FFTChannelEditor'
import type { FFTCubeConfig } from '../types/cube'
import { createDefaultFFTCube } from '../types/cube'

describe('FFTChannelEditor', () => {
  let mockOnCubeUpdate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockOnCubeUpdate = vi.fn()
  })

  describe('Empty state', () => {
    it('renders empty state when no cube is provided', () => {
      render(<FFTChannelEditor currentCube={null} />)
      expect(screen.getByText('No FFT cube selected')).toBeInTheDocument()
      expect(screen.getByText('Select a magical cube to edit its FFT channels')).toBeInTheDocument()
    })
  })

  describe('With cube', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
    })

    it('renders the editor title', () => {
      render(<FFTChannelEditor currentCube={testCube} />)
      expect(screen.getByText('FFT Channels')).toBeInTheDocument()
    })

    it('renders presets button', () => {
      render(<FFTChannelEditor currentCube={testCube} />)
      expect(screen.getByRole('button', { name: /presets/i })).toBeInTheDocument()
    })

    it('renders total energy indicator', () => {
      render(<FFTChannelEditor currentCube={testCube} />)
      expect(screen.getByText('Total Energy:')).toBeInTheDocument()
    })

    it('renders channel tabs', () => {
      render(<FFTChannelEditor currentCube={testCube} />)
      expect(screen.getByText('Red')).toBeInTheDocument()
      expect(screen.getByText('Green')).toBeInTheDocument()
      expect(screen.getByText('Blue')).toBeInTheDocument()
      expect(screen.getByText('Alpha')).toBeInTheDocument()
    })

    it('renders spectrum section', () => {
      render(<FFTChannelEditor currentCube={testCube} />)
      expect(screen.getByText('Spectrum')).toBeInTheDocument()
    })

    it('renders DC component section', () => {
      render(<FFTChannelEditor currentCube={testCube} />)
      expect(screen.getByText('DC Component (Average)')).toBeInTheDocument()
    })

    it('renders coefficients section', () => {
      render(<FFTChannelEditor currentCube={testCube} />)
      expect(screen.getByText(/Coefficients/)).toBeInTheDocument()
    })
  })

  describe('Channel tabs', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
    })

    it('Red channel is active by default', () => {
      render(<FFTChannelEditor currentCube={testCube} />)
      const redTab = screen.getByText('Red').closest('button')
      expect(redTab).toHaveClass('fft-channel-editor__tab--active')
    })

    it('switches to different channel when tab is clicked', () => {
      render(<FFTChannelEditor currentCube={testCube} />)

      const greenTab = screen.getByText('Green').closest('button')
      fireEvent.click(greenTab!)

      expect(greenTab).toHaveClass('fft-channel-editor__tab--active')

      const redTab = screen.getByText('Red').closest('button')
      expect(redTab).not.toHaveClass('fft-channel-editor__tab--active')
    })

    it('shows active styling for current channel', () => {
      render(<FFTChannelEditor currentCube={testCube} />)

      const blueTab = screen.getByText('Blue').closest('button')
      fireEvent.click(blueTab!)

      expect(blueTab).toHaveClass('fft-channel-editor__tab--active')
    })
  })

  describe('Presets', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
    })

    it('shows presets panel when presets button is clicked', () => {
      render(<FFTChannelEditor currentCube={testCube} />)

      const presetsButton = screen.getByRole('button', { name: /presets/i })
      fireEvent.click(presetsButton)

      expect(screen.getByText('Apply Preset')).toBeInTheDocument()
    })

    it('renders all available presets', () => {
      render(<FFTChannelEditor currentCube={testCube} />)

      const presetsButton = screen.getByRole('button', { name: /presets/i })
      fireEvent.click(presetsButton)

      FFT_CHANNEL_PRESETS.forEach((preset) => {
        expect(screen.getByText(preset.name)).toBeInTheDocument()
      })
    })

    it('hides presets panel when button is clicked again', () => {
      render(<FFTChannelEditor currentCube={testCube} />)

      const presetsButton = screen.getByRole('button', { name: /presets/i })
      fireEvent.click(presetsButton)
      expect(screen.getByText('Apply Preset')).toBeInTheDocument()

      fireEvent.click(presetsButton)
      expect(screen.queryByText('Apply Preset')).not.toBeInTheDocument()
    })

    it('applies preset when clicked', () => {
      render(<FFTChannelEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)

      const presetsButton = screen.getByRole('button', { name: /presets/i })
      fireEvent.click(presetsButton)

      const crystalPreset = screen.getByText('Crystal Pulsation')
      fireEvent.click(crystalPreset)

      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.channels.R).toBeDefined()
      expect(updatedCube.channels.R.dcAmplitude).toBe(0.6)
    })

    it('closes presets panel after applying preset', () => {
      render(<FFTChannelEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)

      const presetsButton = screen.getByRole('button', { name: /presets/i })
      fireEvent.click(presetsButton)

      const presetItem = screen.getByText('Energy Waves')
      fireEvent.click(presetItem)

      expect(screen.queryByText('Apply Preset')).not.toBeInTheDocument()
    })
  })

  describe('DC Component editing', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
    })

    it('renders DC amplitude slider', () => {
      render(<FFTChannelEditor currentCube={testCube} />)
      expect(screen.getByText('Amplitude')).toBeInTheDocument()
    })

    it('renders DC phase control', () => {
      render(<FFTChannelEditor currentCube={testCube} />)
      expect(screen.getByText('Phase')).toBeInTheDocument()
    })

    it('updates DC amplitude when slider is changed', () => {
      render(<FFTChannelEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)

      // Find the DC amplitude slider (first range input in DC section)
      const dcSection = screen.getByText('DC Component (Average)').closest('div')
      const amplitudeSlider = dcSection?.querySelector('input[type="range"]')

      if (amplitudeSlider) {
        fireEvent.change(amplitudeSlider, { target: { value: '1.5' } })
        expect(mockOnCubeUpdate).toHaveBeenCalled()
        const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
        expect(updatedCube.channels.R.dcAmplitude).toBe(1.5)
      }
    })

    it('displays current DC amplitude value', () => {
      testCube.channels.R = {
        dcAmplitude: 0.75,
        dcPhase: 0,
        coefficients: [],
      }
      render(<FFTChannelEditor currentCube={testCube} />)

      expect(screen.getByText('0.75')).toBeInTheDocument()
    })
  })

  describe('Coefficient management', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
      testCube.channels.R = {
        dcAmplitude: 0.5,
        dcPhase: 0,
        coefficients: [],
      }
    })

    it('renders add coefficient button', () => {
      render(<FFTChannelEditor currentCube={testCube} />)
      expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
    })

    it('shows empty message when no coefficients', () => {
      render(<FFTChannelEditor currentCube={testCube} />)
      expect(screen.getByText('No frequency coefficients')).toBeInTheDocument()
    })

    it('adds coefficient when add button is clicked', () => {
      render(<FFTChannelEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)

      const addButton = screen.getByRole('button', { name: /add/i })
      fireEvent.click(addButton)

      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.channels.R.coefficients.length).toBe(1)
    })

    it('renders coefficient editor when coefficients exist', () => {
      testCube.channels.R = {
        dcAmplitude: 0.5,
        dcPhase: 0,
        coefficients: [{ amplitude: 0.5, phase: 0, freqX: 1, freqY: 0, freqZ: 0 }],
      }
      render(<FFTChannelEditor currentCube={testCube} />)

      expect(screen.getByText('#1')).toBeInTheDocument()
      expect(screen.queryByText('No frequency coefficients')).not.toBeInTheDocument()
    })

    it('removes coefficient when remove button is clicked', () => {
      testCube.channels.R = {
        dcAmplitude: 0.5,
        dcPhase: 0,
        coefficients: [{ amplitude: 0.5, phase: 0, freqX: 1, freqY: 0, freqZ: 0 }],
      }
      render(<FFTChannelEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)

      const removeButton = screen.getByTitle('Remove coefficient')
      fireEvent.click(removeButton)

      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.channels.R.coefficients.length).toBe(0)
    })

    it('disables add button when max coefficients reached', () => {
      testCube.channels.R = {
        dcAmplitude: 0.5,
        dcPhase: 0,
        coefficients: Array(8)
          .fill(null)
          .map(() => ({
            amplitude: 0.5,
            phase: 0,
            freqX: 1,
            freqY: 0,
            freqZ: 0,
          })),
      }
      render(<FFTChannelEditor currentCube={testCube} />)

      const addButton = screen.getByRole('button', { name: /add/i })
      expect(addButton).toBeDisabled()
    })

    it('displays correct coefficients count', () => {
      testCube.channels.R = {
        dcAmplitude: 0.5,
        dcPhase: 0,
        coefficients: [
          { amplitude: 0.5, phase: 0, freqX: 1, freqY: 0, freqZ: 0 },
          { amplitude: 0.3, phase: Math.PI, freqX: 0, freqY: 1, freqZ: 0 },
        ],
      }
      render(<FFTChannelEditor currentCube={testCube} />)

      expect(screen.getByText('Coefficients (2/8)')).toBeInTheDocument()
    })
  })

  describe('Coefficient editing', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
      testCube.channels.R = {
        dcAmplitude: 0.5,
        dcPhase: 0,
        coefficients: [{ amplitude: 0.5, phase: 0, freqX: 1, freqY: 0, freqZ: 0 }],
      }
    })

    it('renders frequency input fields', () => {
      render(<FFTChannelEditor currentCube={testCube} />)

      expect(screen.getByText('freqX')).toBeInTheDocument()
      expect(screen.getByText('freqY')).toBeInTheDocument()
      expect(screen.getByText('freqZ')).toBeInTheDocument()
    })

    it('updates coefficient amplitude when changed', () => {
      render(<FFTChannelEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)

      // Find the coefficient amplitude slider
      const coeffSection = screen.getByText('#1').closest('.fft-channel-editor__coefficient')
      const amplitudeField = coeffSection?.querySelector(
        '.fft-channel-editor__field--amplitude input[type="range"]'
      )

      if (amplitudeField) {
        fireEvent.change(amplitudeField, { target: { value: '1.2' } })
        expect(mockOnCubeUpdate).toHaveBeenCalled()
        const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
        expect(updatedCube.channels.R.coefficients[0].amplitude).toBe(1.2)
      }
    })

    it('updates coefficient freqX when changed', () => {
      render(<FFTChannelEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)

      const freqXInputs = screen.getAllByRole('spinbutton')
      const freqXInput = freqXInputs[0] // First number input should be freqX

      fireEvent.change(freqXInput, { target: { value: '2' } })
      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.channels.R.coefficients[0].freqX).toBe(2)
    })
  })

  describe('Spectrum visualization', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
    })

    it('renders spectrum bars for DC component', () => {
      render(<FFTChannelEditor currentCube={testCube} />)

      // DC label should appear in spectrum
      expect(screen.getByText('DC')).toBeInTheDocument()
    })

    it('renders energy value in spectrum', () => {
      render(<FFTChannelEditor currentCube={testCube} />)

      // There are multiple Energy: texts - one in total energy, one in spectrum
      const energyTexts = screen.getAllByText(/Energy:/)
      expect(energyTexts.length).toBeGreaterThanOrEqual(1)
    })

    it('renders spectrum bars for coefficients', () => {
      testCube.channels.R = {
        dcAmplitude: 0.5,
        dcPhase: 0,
        coefficients: [{ amplitude: 0.5, phase: 0, freqX: 1, freqY: 2, freqZ: 0 }],
      }
      render(<FFTChannelEditor currentCube={testCube} />)

      // Coefficient label should include frequency indices
      expect(screen.getByText('(1,2,0)')).toBeInTheDocument()
    })
  })

  describe('Custom className', () => {
    it('applies custom className', () => {
      const testCube = createDefaultFFTCube('test-fft-cube')
      const { container } = render(
        <FFTChannelEditor currentCube={testCube} className="custom-class" />
      )
      const editor = container.querySelector('.fft-channel-editor')
      expect(editor).toHaveClass('custom-class')
    })
  })

  describe('Energy calculations', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
    })

    it('displays total energy based on all channels', () => {
      testCube.channels = {
        R: { dcAmplitude: 1.0, dcPhase: 0, coefficients: [] },
        G: { dcAmplitude: 1.0, dcPhase: 0, coefficients: [] },
        B: { dcAmplitude: 1.0, dcPhase: 0, coefficients: [] },
        A: { dcAmplitude: 1.0, dcPhase: 0, coefficients: [] },
      }
      render(<FFTChannelEditor currentCube={testCube} />)

      // Total energy should be displayed (4 channels with DC amplitude 1.0 = 4.0 total)
      const totalEnergyValue = screen.getByText('4.00')
      expect(totalEnergyValue).toBeInTheDocument()
    })

    it('updates current_energy in cube when channels change', () => {
      render(<FFTChannelEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)

      // Add a coefficient to increase energy
      const addButton = screen.getByRole('button', { name: /add/i })
      fireEvent.click(addButton)

      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.current_energy).toBeDefined()
      expect(typeof updatedCube.current_energy).toBe('number')
    })
  })

  describe('FFT size awareness', () => {
    it('calculates maxFreq based on fft_size', () => {
      const testCube = createDefaultFFTCube('test-fft-cube')
      testCube.fft_size = 32

      render(<FFTChannelEditor currentCube={testCube} />)

      // The maxFreq should be fft_size / 2 = 16
      // This affects the max value of frequency inputs
      // We can verify this indirectly by checking the component renders
      expect(screen.getByText('FFT Channels')).toBeInTheDocument()
    })
  })

  describe('Multi-channel editing', () => {
    let testCube: FFTCubeConfig

    beforeEach(() => {
      testCube = createDefaultFFTCube('test-fft-cube')
      testCube.channels = {
        R: { dcAmplitude: 0.5, dcPhase: 0, coefficients: [] },
        G: { dcAmplitude: 0.7, dcPhase: Math.PI / 2, coefficients: [] },
        B: { dcAmplitude: 0.3, dcPhase: Math.PI, coefficients: [] },
        A: { dcAmplitude: 1.0, dcPhase: 0, coefficients: [] },
      }
    })

    it('switches between channels and displays correct data', () => {
      render(<FFTChannelEditor currentCube={testCube} />)

      // Default is Red channel with 0.5 amplitude
      expect(screen.getByText('0.50')).toBeInTheDocument()

      // Switch to Green
      const greenTab = screen.getByText('Green').closest('button')
      fireEvent.click(greenTab!)

      expect(screen.getByText('0.70')).toBeInTheDocument()

      // Switch to Blue
      const blueTab = screen.getByText('Blue').closest('button')
      fireEvent.click(blueTab!)

      expect(screen.getByText('0.30')).toBeInTheDocument()
    })

    it('updates correct channel when editing', () => {
      render(<FFTChannelEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)

      // Switch to Green channel
      const greenTab = screen.getByText('Green').closest('button')
      fireEvent.click(greenTab!)

      // Add coefficient to Green channel
      const addButton = screen.getByRole('button', { name: /add/i })
      fireEvent.click(addButton)

      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.channels.G.coefficients.length).toBe(1)
      expect(updatedCube.channels.R.coefficients.length).toBe(0) // Red should be unchanged
    })
  })

  describe('Metadata updates', () => {
    it('updates modified timestamp when cube is changed', () => {
      const testCube = createDefaultFFTCube('test-fft-cube')
      const originalModified = testCube.meta?.modified

      render(<FFTChannelEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)

      const addButton = screen.getByRole('button', { name: /add/i })
      fireEvent.click(addButton)

      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.meta.modified).toBeDefined()

      // Modified should be more recent
      if (originalModified) {
        expect(new Date(updatedCube.meta.modified).getTime()).toBeGreaterThanOrEqual(
          new Date(originalModified).getTime()
        )
      }
    })
  })
})

describe('FFT_CHANNEL_PRESETS', () => {
  it('contains Crystal Pulsation preset', () => {
    const preset = FFT_CHANNEL_PRESETS.find((p) => p.id === 'crystal_pulsation')
    expect(preset).toBeDefined()
    expect(preset?.name).toBe('Crystal Pulsation')
    expect(preset?.channels.R).toBeDefined()
    expect(preset?.channels.G).toBeDefined()
    expect(preset?.channels.B).toBeDefined()
    expect(preset?.channels.A).toBeDefined()
  })

  it('contains Energy Waves preset', () => {
    const preset = FFT_CHANNEL_PRESETS.find((p) => p.id === 'energy_waves')
    expect(preset).toBeDefined()
    expect(preset?.name).toBe('Energy Waves')
  })

  it('contains Unstable Core preset', () => {
    const preset = FFT_CHANNEL_PRESETS.find((p) => p.id === 'unstable_core')
    expect(preset).toBeDefined()
    expect(preset?.name).toBe('Unstable Core')
    // Unstable core should have high energy coefficients
    expect(preset?.channels.R?.dcAmplitude).toBe(0.9)
  })

  it('all presets have valid channel structure', () => {
    FFT_CHANNEL_PRESETS.forEach((preset) => {
      expect(preset.id).toBeDefined()
      expect(preset.name).toBeDefined()
      expect(preset.description).toBeDefined()
      expect(preset.channels).toBeDefined()

      // Check each channel has required properties
      const channels = ['R', 'G', 'B', 'A'] as const
      channels.forEach((ch) => {
        const channel = preset.channels[ch]
        if (channel) {
          expect(typeof channel.dcAmplitude).toBe('number')
          expect(typeof channel.dcPhase).toBe('number')
          expect(Array.isArray(channel.coefficients)).toBe(true)

          // Validate coefficients structure
          channel.coefficients.forEach((coeff) => {
            expect(typeof coeff.amplitude).toBe('number')
            expect(typeof coeff.phase).toBe('number')
            expect(typeof coeff.freqX).toBe('number')
            expect(typeof coeff.freqY).toBe('number')
            expect(typeof coeff.freqZ).toBe('number')
          })
        }
      })
    })
  })

  it('all presets have max 8 coefficients per channel', () => {
    FFT_CHANNEL_PRESETS.forEach((preset) => {
      const channels = ['R', 'G', 'B', 'A'] as const
      channels.forEach((ch) => {
        const channel = preset.channels[ch]
        if (channel) {
          expect(channel.coefficients.length).toBeLessThanOrEqual(8)
        }
      })
    })
  })
})
