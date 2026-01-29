/**
 * Tests for UnifiedEditor component
 * TASK 34: Unified Editor - E2E and unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UnifiedEditor } from './UnifiedEditor'
import type { SpectralCube, FFTCubeConfig } from '../types/cube'
import type { CubeStackConfig } from '../types/stack'
import type { LODConfig } from '../types/lod'
import { DEFAULT_LOD_CONFIG } from '../types/lod'
import { createDefaultCube, createDefaultFFTCube } from '../types/cube'
import { createCubeStack, createStackLayer } from '../types/stack'

// Mock the lazy-loaded components
vi.mock('./ParamEditor', () => ({
  ParamEditor: ({
    currentCube,
    onCubeUpdate,
  }: {
    currentCube: SpectralCube | null
    onCubeUpdate?: (cube: SpectralCube) => void
  }) => (
    <div data-testid="param-editor">
      <span>ParamEditor</span>
      {currentCube && <span data-testid="cube-id">{currentCube.id}</span>}
      <button
        data-testid="update-cube-btn"
        onClick={() => {
          if (currentCube) {
            onCubeUpdate?.({
              ...currentCube,
              meta: { ...currentCube.meta, name: 'Updated Cube' },
            })
          }
        }}
      >
        Update
      </button>
    </div>
  ),
}))

vi.mock('./FFTParamEditor', () => ({
  FFTParamEditor: ({
    currentCube,
    onCubeUpdate,
  }: {
    currentCube: FFTCubeConfig | null
    onCubeUpdate?: (cube: FFTCubeConfig) => void
  }) => (
    <div data-testid="fft-param-editor">
      <span>FFTParamEditor</span>
      {currentCube && <span data-testid="fft-cube-id">{currentCube.id}</span>}
      <button
        data-testid="update-fft-cube-btn"
        onClick={() => {
          if (currentCube) {
            onCubeUpdate?.({
              ...currentCube,
              meta: { ...currentCube.meta, name: 'Updated FFT Cube' },
            })
          }
        }}
      >
        Update FFT
      </button>
    </div>
  ),
}))

vi.mock('./StackEditor', () => ({
  StackEditor: ({
    currentStack,
    onStackUpdate,
  }: {
    currentStack: CubeStackConfig | null
    onStackUpdate?: (stack: CubeStackConfig) => void
  }) => (
    <div data-testid="stack-editor">
      <span>StackEditor</span>
      {currentStack && <span data-testid="stack-id">{currentStack.id}</span>}
      <button
        data-testid="update-stack-btn"
        onClick={() => {
          if (currentStack) {
            onStackUpdate?.({
              ...currentStack,
              meta: { ...currentStack.meta, name: 'Updated Stack' },
            })
          }
        }}
      >
        Update Stack
      </button>
    </div>
  ),
}))

vi.mock('./CollaborativeParamEditor', () => ({
  CollaborativeParamEditor: ({ currentCube }: { currentCube: SpectralCube | null }) => (
    <div data-testid="collaborative-editor">
      <span>CollaborativeParamEditor</span>
      {currentCube && <span data-testid="collab-cube-id">{currentCube.id}</span>}
    </div>
  ),
}))

vi.mock('./LODConfigEditor', () => ({
  LODConfigEditor: ({
    config,
    onConfigChange,
  }: {
    config?: LODConfig
    onConfigChange?: (cfg: LODConfig) => void
  }) => (
    <div data-testid="lod-config-editor">
      <span>LODConfigEditor</span>
      <button
        data-testid="update-lod-btn"
        onClick={() => config && onConfigChange?.({ ...config, enabled: !config.enabled })}
      >
        Update LOD
      </button>
    </div>
  ),
}))

vi.mock('./EnergyVisualizationEditor', () => ({
  EnergyVisualizationEditor: ({
    settings,
  }: {
    settings?: { visualization?: { visualizationMode?: string } }
  }) => (
    <div data-testid="energy-visualization-editor">
      <span>EnergyVisualizationEditor</span>
      {settings && (
        <span data-testid="visualization-mode">{settings.visualization?.visualizationMode}</span>
      )}
    </div>
  ),
}))

vi.mock('./FFTChannelEditor', () => ({
  FFTChannelEditor: ({ currentCube }: { currentCube: FFTCubeConfig | null }) => (
    <div data-testid="fft-channel-editor">
      <span>FFTChannelEditor</span>
      {currentCube && <span data-testid="channel-cube-id">{currentCube.id}</span>}
    </div>
  ),
}))

describe('UnifiedEditor', () => {
  let mockOnCubeUpdate: ReturnType<typeof vi.fn>
  let mockOnFFTCubeUpdate: ReturnType<typeof vi.fn>
  let mockOnStackUpdate: ReturnType<typeof vi.fn>
  let mockOnModeChange: ReturnType<typeof vi.fn>
  let mockOnLODConfigChange: ReturnType<typeof vi.fn>

  let testCube: SpectralCube
  let testFFTCube: FFTCubeConfig
  let testStack: CubeStackConfig

  beforeEach(() => {
    mockOnCubeUpdate = vi.fn()
    mockOnFFTCubeUpdate = vi.fn()
    mockOnStackUpdate = vi.fn()
    mockOnModeChange = vi.fn()
    mockOnLODConfigChange = vi.fn()

    testCube = createDefaultCube('test-cube')
    testCube.meta = { name: 'Test Cube', created: new Date().toISOString() }

    testFFTCube = createDefaultFFTCube('test-fft-cube')
    testFFTCube.meta = { name: 'Test FFT Cube', created: new Date().toISOString() }

    const layer1 = createStackLayer('layer-1', createDefaultCube('layer-1-cube'))
    const layer2 = createStackLayer('layer-2', createDefaultCube('layer-2-cube'))
    testStack = createCubeStack('test-stack', [layer1, layer2])
    testStack.meta = { name: 'Test Stack', created: new Date().toISOString() }

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the unified editor title', async () => {
      render(<UnifiedEditor />)
      expect(screen.getByText('Unified Editor')).toBeInTheDocument()
    })

    it('renders mode selector buttons', async () => {
      render(<UnifiedEditor />)
      expect(screen.getByRole('button', { name: /spectral/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /fft/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /stack/i })).toBeInTheDocument()
    })

    it('renders tab navigation', async () => {
      render(<UnifiedEditor currentCube={testCube} />)
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /general/i })).toBeInTheDocument()
      })
    })

    it('renders quick actions', async () => {
      render(<UnifiedEditor currentCube={testCube} />)
      await waitFor(() => {
        expect(screen.getByText('Quick Actions')).toBeInTheDocument()
      })
    })

    it('renders empty state when no content', async () => {
      render(<UnifiedEditor />)
      await waitFor(() => {
        expect(screen.getByText('No content selected')).toBeInTheDocument()
      })
    })
  })

  describe('Mode switching', () => {
    it('starts in spectral mode by default', () => {
      render(<UnifiedEditor currentCube={testCube} />)
      const spectralBtn = screen.getByRole('button', { name: /spectral/i })
      expect(spectralBtn).toHaveAttribute('aria-pressed', 'true')
    })

    it('can switch to FFT mode', async () => {
      render(
        <UnifiedEditor
          currentCube={testCube}
          currentFFTCube={testFFTCube}
          onModeChange={mockOnModeChange}
        />
      )

      const fftBtn = screen.getByRole('button', { name: /fft/i })
      fireEvent.click(fftBtn)

      expect(mockOnModeChange).toHaveBeenCalledWith('fft')
      expect(fftBtn).toHaveAttribute('aria-pressed', 'true')
    })

    it('can switch to Stack mode', async () => {
      render(
        <UnifiedEditor
          currentCube={testCube}
          currentStack={testStack}
          onModeChange={mockOnModeChange}
        />
      )

      const stackBtn = screen.getByRole('button', { name: /stack/i })
      fireEvent.click(stackBtn)

      expect(mockOnModeChange).toHaveBeenCalledWith('stack')
    })

    it('respects initialMode prop', () => {
      render(<UnifiedEditor initialMode="fft" currentFFTCube={testFFTCube} />)
      // Use exact text match to differentiate from "Update FFT" button in mock
      const fftBtn = screen.getByRole('button', { name: 'FFT' })
      expect(fftBtn).toHaveAttribute('aria-pressed', 'true')
    })
  })

  describe('Spectral mode', () => {
    it('shows ParamEditor for spectral cube', async () => {
      render(<UnifiedEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)

      await waitFor(() => {
        expect(screen.getByTestId('param-editor')).toBeInTheDocument()
      })
    })

    it('passes cube to ParamEditor', async () => {
      render(<UnifiedEditor currentCube={testCube} />)

      await waitFor(() => {
        expect(screen.getByTestId('cube-id')).toHaveTextContent('test-cube')
      })
    })

    it('calls onCubeUpdate when ParamEditor updates', async () => {
      render(<UnifiedEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)

      await waitFor(() => {
        expect(screen.getByTestId('update-cube-btn')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('update-cube-btn'))
      expect(mockOnCubeUpdate).toHaveBeenCalled()
    })
  })

  describe('FFT mode', () => {
    it('shows FFTParamEditor for FFT cube', async () => {
      render(
        <UnifiedEditor
          initialMode="fft"
          currentFFTCube={testFFTCube}
          onFFTCubeUpdate={mockOnFFTCubeUpdate}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('fft-param-editor')).toBeInTheDocument()
      })
    })

    it('shows Energy tab in FFT mode', async () => {
      render(<UnifiedEditor initialMode="fft" currentFFTCube={testFFTCube} />)

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /energy/i })).toBeInTheDocument()
      })
    })

    it('shows FFTChannelEditor in Energy tab', async () => {
      render(<UnifiedEditor initialMode="fft" currentFFTCube={testFFTCube} />)

      await waitFor(() => {
        const energyTab = screen.getByRole('tab', { name: /energy/i })
        fireEvent.click(energyTab)
      })

      await waitFor(() => {
        expect(screen.getByTestId('fft-channel-editor')).toBeInTheDocument()
      })
    })
  })

  describe('Stack mode', () => {
    it('shows StackEditor for stack', async () => {
      render(
        <UnifiedEditor
          initialMode="stack"
          currentStack={testStack}
          onStackUpdate={mockOnStackUpdate}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('stack-editor')).toBeInTheDocument()
      })
    })

    it('shows Layers tab in Stack mode', async () => {
      render(<UnifiedEditor initialMode="stack" currentStack={testStack} />)

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /layers/i })).toBeInTheDocument()
      })
    })

    it('hides Appearance and Energy tabs in Stack mode', async () => {
      render(<UnifiedEditor initialMode="stack" currentStack={testStack} />)

      await waitFor(() => {
        expect(screen.queryByRole('tab', { name: /appearance/i })).not.toBeInTheDocument()
        expect(screen.queryByRole('tab', { name: /energy/i })).not.toBeInTheDocument()
      })
    })
  })

  describe('Tab navigation', () => {
    it('switches between tabs', async () => {
      render(<UnifiedEditor currentCube={testCube} lodConfig={DEFAULT_LOD_CONFIG} />)

      await waitFor(() => {
        const lodTab = screen.getByRole('tab', { name: /lod/i })
        fireEvent.click(lodTab)
      })

      await waitFor(() => {
        expect(screen.getByTestId('lod-config-editor')).toBeInTheDocument()
      })
    })

    it('shows correct content for Appearance tab', async () => {
      render(<UnifiedEditor currentCube={testCube} />)

      await waitFor(() => {
        const appearanceTab = screen.getByRole('tab', { name: /appearance/i })
        fireEvent.click(appearanceTab)
      })

      await waitFor(() => {
        expect(screen.getByTestId('param-editor')).toBeInTheDocument()
      })
    })

    it('shows correct content for Physics tab', async () => {
      render(<UnifiedEditor currentCube={testCube} />)

      await waitFor(() => {
        const physicsTab = screen.getByRole('tab', { name: /physics/i })
        fireEvent.click(physicsTab)
      })

      await waitFor(() => {
        expect(screen.getByTestId('param-editor')).toBeInTheDocument()
      })
    })
  })

  describe('Collaboration', () => {
    it('hides collaboration tab by default', async () => {
      render(<UnifiedEditor currentCube={testCube} />)

      await waitFor(() => {
        expect(screen.queryByRole('tab', { name: /collab/i })).not.toBeInTheDocument()
      })
    })

    it('shows collaboration tab when enabled', async () => {
      render(<UnifiedEditor currentCube={testCube} collaborationEnabled={true} />)

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /collab/i })).toBeInTheDocument()
      })
    })

    it('shows CollaborativeParamEditor in collaboration tab', async () => {
      render(<UnifiedEditor currentCube={testCube} collaborationEnabled={true} />)

      await waitFor(() => {
        const collabTab = screen.getByRole('tab', { name: /collab/i })
        fireEvent.click(collabTab)
      })

      await waitFor(() => {
        expect(screen.getByTestId('collaborative-editor')).toBeInTheDocument()
      })
    })
  })

  describe('Quick Actions', () => {
    it('renders quick action buttons', async () => {
      render(<UnifiedEditor currentCube={testCube} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /duplicate/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /randomize/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
      })
    })

    it('resets cube when reset action is clicked', async () => {
      render(<UnifiedEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)

      await waitFor(() => {
        const resetBtn = screen.getByRole('button', { name: /reset/i })
        fireEvent.click(resetBtn)
      })

      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const updatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(updatedCube.id).toBe('test-cube')
    })

    it('duplicates cube when duplicate action is clicked', async () => {
      render(<UnifiedEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)

      await waitFor(() => {
        const duplicateBtn = screen.getByRole('button', { name: /duplicate/i })
        fireEvent.click(duplicateBtn)
      })

      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const duplicatedCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(duplicatedCube.id).toContain('test-cube_copy_')
      expect(duplicatedCube.meta?.name).toContain('(Copy)')
    })

    it('randomizes cube when randomize action is clicked', async () => {
      render(<UnifiedEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)

      await waitFor(() => {
        const randomizeBtn = screen.getByRole('button', { name: /randomize/i })
        fireEvent.click(randomizeBtn)
      })

      expect(mockOnCubeUpdate).toHaveBeenCalled()
      const randomCube = mockOnCubeUpdate.mock.calls[0][0]
      expect(randomCube.id).toContain('random_')
    })

    it('copies config to clipboard when copy action is clicked', async () => {
      render(<UnifiedEditor currentCube={testCube} />)

      await waitFor(() => {
        const copyBtn = screen.getByRole('button', { name: /copy/i })
        fireEvent.click(copyBtn)
      })

      expect(navigator.clipboard.writeText).toHaveBeenCalled()
    })

    it('disables actions when no content', async () => {
      render(<UnifiedEditor />)

      await waitFor(() => {
        const resetBtn = screen.getByRole('button', { name: /reset/i })
        expect(resetBtn).toBeDisabled()
      })
    })
  })

  describe('Mobile layout', () => {
    it('renders mobile layout when isMobile is true', async () => {
      render(<UnifiedEditor currentCube={testCube} isMobile={true} />)

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /select editor section/i })).toBeInTheDocument()
      })
    })

    it('uses select dropdown for tabs on mobile', async () => {
      render(<UnifiedEditor currentCube={testCube} isMobile={true} />)

      await waitFor(() => {
        const select = screen.getByRole('combobox')
        expect(select).toBeInTheDocument()
      })
    })

    it('switches tabs via select on mobile', async () => {
      render(
        <UnifiedEditor currentCube={testCube} isMobile={true} lodConfig={DEFAULT_LOD_CONFIG} />
      )

      await waitFor(() => {
        const select = screen.getByRole('combobox')
        fireEvent.change(select, { target: { value: 'lod' } })
      })

      await waitFor(() => {
        expect(screen.getByTestId('lod-config-editor')).toBeInTheDocument()
      })
    })

    it('collapses quick actions by default on mobile', async () => {
      render(<UnifiedEditor currentCube={testCube} isMobile={true} />)

      // On mobile, quick actions are collapsed by default
      const accordionHeader = screen.getByRole('button', { name: /quick actions/i })
      expect(accordionHeader).toHaveAttribute('aria-expanded', 'false')
    })

    it('expands quick actions when clicked on mobile', async () => {
      render(<UnifiedEditor currentCube={testCube} isMobile={true} />)

      const accordionHeader = screen.getByRole('button', { name: /quick actions/i })
      fireEvent.click(accordionHeader)

      expect(accordionHeader).toHaveAttribute('aria-expanded', 'true')
    })
  })

  describe('Keyboard shortcuts', () => {
    it('resets on Ctrl+R', async () => {
      render(<UnifiedEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)

      fireEvent.keyDown(window, { key: 'r', ctrlKey: true })

      await waitFor(() => {
        expect(mockOnCubeUpdate).toHaveBeenCalled()
      })
    })

    it('duplicates on Ctrl+D', async () => {
      render(<UnifiedEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)

      fireEvent.keyDown(window, { key: 'd', ctrlKey: true })

      await waitFor(() => {
        expect(mockOnCubeUpdate).toHaveBeenCalled()
        const cube = mockOnCubeUpdate.mock.calls[0][0]
        expect(cube.id).toContain('_copy_')
      })
    })

    it('randomizes on Ctrl+Shift+R', async () => {
      render(<UnifiedEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />)

      fireEvent.keyDown(window, { key: 'r', ctrlKey: true, shiftKey: true })

      await waitFor(() => {
        expect(mockOnCubeUpdate).toHaveBeenCalled()
        const cube = mockOnCubeUpdate.mock.calls[0][0]
        expect(cube.id).toContain('random_')
      })
    })

    it('copies on Ctrl+C when no text selected', async () => {
      // Mock getSelection to return empty
      const mockGetSelection = vi.spyOn(window, 'getSelection').mockReturnValue({
        toString: () => '',
      } as Selection)

      render(<UnifiedEditor currentCube={testCube} />)

      fireEvent.keyDown(window, { key: 'c', ctrlKey: true })

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled()
      })

      mockGetSelection.mockRestore()
    })
  })

  describe('LOD tab', () => {
    it('shows LODConfigEditor in LOD tab', async () => {
      render(
        <UnifiedEditor
          currentCube={testCube}
          lodConfig={DEFAULT_LOD_CONFIG}
          onLODConfigChange={mockOnLODConfigChange}
        />
      )

      await waitFor(() => {
        const lodTab = screen.getByRole('tab', { name: /lod/i })
        fireEvent.click(lodTab)
      })

      await waitFor(() => {
        expect(screen.getByTestId('lod-config-editor')).toBeInTheDocument()
      })
    })

    it('passes LOD config to LODConfigEditor', async () => {
      render(
        <UnifiedEditor
          currentCube={testCube}
          lodConfig={DEFAULT_LOD_CONFIG}
          onLODConfigChange={mockOnLODConfigChange}
        />
      )

      await waitFor(() => {
        const lodTab = screen.getByRole('tab', { name: /lod/i })
        fireEvent.click(lodTab)
      })

      await waitFor(() => {
        const updateLodBtn = screen.getByTestId('update-lod-btn')
        fireEvent.click(updateLodBtn)
      })

      expect(mockOnLODConfigChange).toHaveBeenCalledWith({
        ...DEFAULT_LOD_CONFIG,
        enabled: !DEFAULT_LOD_CONFIG.enabled,
      })
    })
  })

  describe('Accessibility', () => {
    it('has correct ARIA attributes for tabs', async () => {
      render(<UnifiedEditor currentCube={testCube} />)

      await waitFor(() => {
        const tablist = screen.getByRole('tablist')
        expect(tablist).toHaveAttribute('aria-label', 'Editor sections')
      })
    })

    it('has correct ARIA attributes for tab buttons', async () => {
      render(<UnifiedEditor currentCube={testCube} />)

      await waitFor(() => {
        const generalTab = screen.getByRole('tab', { name: /general/i })
        expect(generalTab).toHaveAttribute('aria-selected', 'true')
        expect(generalTab).toHaveAttribute('aria-controls', 'tabpanel-general')
      })
    })

    it('has correct ARIA attributes for tab panel', async () => {
      render(<UnifiedEditor currentCube={testCube} />)

      await waitFor(() => {
        const tabpanel = screen.getByRole('tabpanel')
        expect(tabpanel).toHaveAttribute('aria-labelledby', 'tab-general')
      })
    })

    it('has correct ARIA attributes for mode buttons', async () => {
      render(<UnifiedEditor currentCube={testCube} />)

      const spectralBtn = screen.getByRole('button', { name: /spectral/i })
      expect(spectralBtn).toHaveAttribute('aria-pressed', 'true')
    })
  })

  describe('State synchronization', () => {
    it('updates local state when currentCube prop changes', async () => {
      const { rerender } = render(
        <UnifiedEditor currentCube={testCube} onCubeUpdate={mockOnCubeUpdate} />
      )

      const newCube = createDefaultCube('new-cube')
      newCube.meta = { name: 'New Cube' }

      rerender(<UnifiedEditor currentCube={newCube} onCubeUpdate={mockOnCubeUpdate} />)

      await waitFor(() => {
        expect(screen.getByTestId('cube-id')).toHaveTextContent('new-cube')
      })
    })

    it('updates local state when currentFFTCube prop changes', async () => {
      const { rerender } = render(
        <UnifiedEditor
          initialMode="fft"
          currentFFTCube={testFFTCube}
          onFFTCubeUpdate={mockOnFFTCubeUpdate}
        />
      )

      const newFFTCube = createDefaultFFTCube('new-fft-cube')

      rerender(
        <UnifiedEditor
          initialMode="fft"
          currentFFTCube={newFFTCube}
          onFFTCubeUpdate={mockOnFFTCubeUpdate}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('fft-cube-id')).toHaveTextContent('new-fft-cube')
      })
    })
  })

  describe('CSS classes', () => {
    it('applies custom className', () => {
      const { container } = render(<UnifiedEditor className="custom-editor" />)
      expect(container.querySelector('.unified-editor')).toHaveClass('custom-editor')
    })

    it('applies mobile class when isMobile is true', () => {
      const { container } = render(<UnifiedEditor isMobile={true} />)
      expect(container.querySelector('.unified-editor')).toHaveClass('unified-editor--mobile')
    })

    it('applies desktop class when isMobile is false', () => {
      const { container } = render(<UnifiedEditor isMobile={false} />)
      expect(container.querySelector('.unified-editor')).toHaveClass('unified-editor--desktop')
    })
  })
})
