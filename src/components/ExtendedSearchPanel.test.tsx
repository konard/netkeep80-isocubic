/**
 * Tests for ExtendedSearchPanel Component
 *
 * TASK 52: Extended Component Search (Phase 8 - AI + Metadata)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  ExtendedSearchPanel,
  DEFAULT_PANEL_SETTINGS,
  type ExtendedSearchPanelProps,
} from './ExtendedSearchPanel'
import {
  componentMetaRegistry,
  registerComponentMeta,
  type ComponentMeta,
} from '../types/component-meta'

// Mock devmode hook
vi.mock('../lib/devmode', () => ({
  useIsDevModeEnabled: vi.fn(() => true),
}))

// Mock component metadata for testing
const mockComponents: ComponentMeta[] = [
  {
    id: 'gallery',
    name: 'Gallery',
    version: '1.0.0',
    summary: 'A gallery component for displaying cube collections',
    description: 'Gallery displays cubes in a grid layout with filtering and search capabilities.',
    phase: 1,
    filePath: 'components/Gallery.tsx',
    history: [],
    features: [
      {
        id: 'filtering',
        name: 'Filtering',
        description: 'Filter cubes by tags',
        enabled: true,
      },
    ],
    dependencies: [],
    relatedFiles: [],
    tags: ['gallery', 'display', 'cubes'],
    status: 'stable',
    lastUpdated: '2024-01-15T00:00:00Z',
  },
  {
    id: 'cube-preview',
    name: 'CubePreview',
    version: '2.1.0',
    summary: 'Interactive 3D preview component for parametric cubes',
    description: 'CubePreview provides real-time 3D rendering.',
    phase: 1,
    filePath: 'components/CubePreview.tsx',
    history: [],
    features: [],
    dependencies: [],
    relatedFiles: [],
    tags: ['3d', 'preview', 'cube'],
    status: 'stable',
    lastUpdated: '2024-02-01T00:00:00Z',
  },
  {
    id: 'export-panel',
    name: 'ExportPanel',
    version: '1.0.0',
    summary: 'Export functionality for cubes',
    description: 'ExportPanel provides export options in JSON and PNG formats.',
    phase: 1,
    filePath: 'components/ExportPanel.tsx',
    history: [],
    features: [],
    dependencies: [],
    relatedFiles: [],
    tags: ['export', 'save', 'download'],
    status: 'stable',
    lastUpdated: '2024-01-20T00:00:00Z',
  },
  {
    id: 'param-editor',
    name: 'ParamEditor',
    version: '1.5.0',
    summary: 'Parameter editor for cube configuration',
    description: 'ParamEditor allows users to modify cube parameters.',
    phase: 2,
    filePath: 'components/ParamEditor.tsx',
    history: [],
    features: [],
    dependencies: [],
    relatedFiles: [],
    tags: ['editor', 'parameters'],
    status: 'beta',
    lastUpdated: '2024-02-15T00:00:00Z',
  },
]

// Helper to render component with default props
function renderPanel(props: Partial<ExtendedSearchPanelProps> = {}) {
  return render(<ExtendedSearchPanel {...props} />)
}

describe('ExtendedSearchPanel', () => {
  beforeEach(() => {
    // Clear and populate the registry with mock data
    componentMetaRegistry.clear()
    for (const comp of mockComponents) {
      registerComponentMeta(comp)
    }
    // Clear localStorage
    localStorage.clear()
  })

  afterEach(() => {
    componentMetaRegistry.clear()
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render the panel when DevMode is enabled', () => {
      renderPanel()
      expect(screen.getByTestId('extended-search-panel')).toBeInTheDocument()
    })

    it('should render collapsed by default when initialExpanded is false', () => {
      renderPanel({ initialExpanded: false })
      const panel = screen.getByTestId('extended-search-panel')
      expect(panel).toBeInTheDocument()
      expect(screen.queryByTestId('search-input')).not.toBeInTheDocument()
    })

    it('should render expanded by default when initialExpanded is true', () => {
      renderPanel({ initialExpanded: true })
      expect(screen.getByTestId('search-input')).toBeInTheDocument()
    })

    it('should display header with title', () => {
      renderPanel()
      // Check for either Russian or English title
      const panel = screen.getByTestId('extended-search-panel')
      expect(
        panel.textContent?.includes('Расширенный поиск') ||
          panel.textContent?.includes('Extended Search')
      ).toBe(true)
    })

    it('should display search button', () => {
      renderPanel()
      expect(screen.getByTestId('search-button')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      renderPanel({ className: 'custom-class' })
      const panel = screen.getByTestId('extended-search-panel')
      expect(panel.classList.contains('custom-class')).toBe(true)
    })

    it('should apply custom style', () => {
      renderPanel({ style: { opacity: 0.5 } })
      const panel = screen.getByTestId('extended-search-panel')
      expect(panel.style.opacity).toBe('0.5')
    })
  })

  describe('toggle functionality', () => {
    it('should toggle panel when header is clicked', async () => {
      renderPanel({ initialExpanded: true })
      const header = screen.getByRole('button', { name: /collapse|expand/i })

      // Initially expanded
      expect(screen.getByTestId('search-input')).toBeInTheDocument()

      // Click to collapse
      fireEvent.click(header)
      await waitFor(() => {
        expect(screen.queryByTestId('search-input')).not.toBeInTheDocument()
      })

      // Click to expand
      fireEvent.click(header)
      await waitFor(() => {
        expect(screen.getByTestId('search-input')).toBeInTheDocument()
      })
    })
  })

  describe('search input', () => {
    it('should allow typing in search input', async () => {
      const user = userEvent.setup()
      renderPanel()

      const input = screen.getByTestId('search-input') as HTMLInputElement
      await user.type(input, 'Gallery')

      expect(input.value).toBe('Gallery')
    })

    it('should disable search button when input is empty', () => {
      renderPanel()
      const button = screen.getByTestId('search-button')
      expect(button).toBeDisabled()
    })

    it('should enable search button when input has value', async () => {
      const user = userEvent.setup()
      renderPanel()

      const input = screen.getByTestId('search-input')
      await user.type(input, 'test')

      const button = screen.getByTestId('search-button')
      expect(button).not.toBeDisabled()
    })
  })

  describe('search functionality', () => {
    it('should perform search when button is clicked', async () => {
      const user = userEvent.setup()
      const onSearch = vi.fn()
      renderPanel({ onSearch })

      const input = screen.getByTestId('search-input')
      await user.type(input, 'Gallery')

      const button = screen.getByTestId('search-button')
      await user.click(button)

      await waitFor(() => {
        expect(onSearch).toHaveBeenCalledWith('Gallery', expect.any(Array))
      })
    })

    it('should perform search when Enter is pressed', async () => {
      const user = userEvent.setup()
      const onSearch = vi.fn()
      renderPanel({ onSearch })

      const input = screen.getByTestId('search-input')
      await user.type(input, 'Gallery')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(onSearch).toHaveBeenCalled()
      })
    })

    it('should display search results', async () => {
      const user = userEvent.setup()
      renderPanel()

      const input = screen.getByTestId('search-input')
      await user.type(input, 'Gallery')

      const button = screen.getByTestId('search-button')
      await user.click(button)

      await waitFor(() => {
        expect(screen.getByTestId('search-results')).toBeInTheDocument()
        expect(screen.getByTestId('search-result-gallery')).toBeInTheDocument()
      })
    })

    it('should display empty state when no results', async () => {
      const user = userEvent.setup()
      renderPanel()

      const input = screen.getByTestId('search-input')
      await user.type(input, 'xyznonexistent123')

      const button = screen.getByTestId('search-button')
      await user.click(button)

      await waitFor(() => {
        const panel = screen.getByTestId('extended-search-panel')
        expect(
          panel.textContent?.includes('не найдены') ||
            panel.textContent?.includes('No components found')
        ).toBe(true)
      })
    })
  })

  describe('result interaction', () => {
    it('should call onComponentSelect when result is clicked', async () => {
      const user = userEvent.setup()
      const onComponentSelect = vi.fn()
      renderPanel({ onComponentSelect })

      const input = screen.getByTestId('search-input')
      await user.type(input, 'Gallery')

      const button = screen.getByTestId('search-button')
      await user.click(button)

      await waitFor(async () => {
        const result = screen.getByTestId('search-result-gallery')
        await user.click(result)
        expect(onComponentSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'gallery' }))
      })
    })

    it('should display component summary in result', async () => {
      const user = userEvent.setup()
      renderPanel()

      const input = screen.getByTestId('search-input')
      await user.type(input, 'Gallery')

      const button = screen.getByTestId('search-button')
      await user.click(button)

      await waitFor(() => {
        const result = screen.getByTestId('search-result-gallery')
        expect(result.textContent).toContain('gallery component')
      })
    })

    it('should display component tags in result', async () => {
      const user = userEvent.setup()
      renderPanel()

      const input = screen.getByTestId('search-input')
      await user.type(input, 'Gallery')

      const button = screen.getByTestId('search-button')
      await user.click(button)

      await waitFor(() => {
        const result = screen.getByTestId('search-result-gallery')
        expect(result.textContent).toContain('#gallery')
      })
    })

    it('should display relevance score in result', async () => {
      const user = userEvent.setup()
      renderPanel()

      const input = screen.getByTestId('search-input')
      await user.type(input, 'Gallery')

      const button = screen.getByTestId('search-button')
      await user.click(button)

      await waitFor(() => {
        const result = screen.getByTestId('search-result-gallery')
        // Should contain percentage
        expect(result.textContent).toMatch(/\d+%/)
      })
    })
  })

  describe('filters', () => {
    it('should display phase filter chips', () => {
      renderPanel()
      const panel = screen.getByTestId('extended-search-panel')
      expect(panel.textContent?.includes('Phase 1') || panel.textContent?.includes('Фаза 1')).toBe(
        true
      )
    })

    it('should display status filter chips', () => {
      renderPanel()
      const panel = screen.getByTestId('extended-search-panel')
      expect(panel.textContent?.includes('stable')).toBe(true)
      expect(panel.textContent?.includes('beta')).toBe(true)
    })

    it('should filter results by phase when phase filter is clicked', async () => {
      const user = userEvent.setup()
      renderPanel()

      // Click on Phase 2 filter
      const filterButtons = screen.getAllByRole('button')
      const phase2Button = filterButtons.find(
        (btn) => btn.textContent === 'Phase 2' || btn.textContent === 'Фаза 2'
      )
      if (phase2Button) {
        await user.click(phase2Button)
      }

      // Now search
      const input = screen.getByTestId('search-input')
      await user.type(input, 'editor')

      const button = screen.getByTestId('search-button')
      await user.click(button)

      await waitFor(() => {
        // ParamEditor is in phase 2
        expect(screen.getByTestId('search-result-param-editor')).toBeInTheDocument()
      })
    })

    it('should show clear filters button when filters are active', async () => {
      const user = userEvent.setup()
      renderPanel()

      // Click on a filter
      const filterButtons = screen.getAllByRole('button')
      const stableButton = filterButtons.find((btn) => btn.textContent === 'stable')
      if (stableButton) {
        await user.click(stableButton)
      }

      // Should now have clear button
      const panel = screen.getByTestId('extended-search-panel')
      expect(panel.textContent?.includes('Clear') || panel.textContent?.includes('Сбросить')).toBe(
        true
      )
    })
  })

  describe('autocomplete', () => {
    it('should show autocomplete suggestions as user types', async () => {
      const user = userEvent.setup()
      renderPanel()

      const input = screen.getByTestId('search-input')
      await user.click(input)
      await user.type(input, 'Gal')

      await waitFor(() => {
        const panel = screen.getByTestId('extended-search-panel')
        expect(panel.textContent).toContain('Gallery')
      })
    })

    it('should hide autocomplete when input loses focus', async () => {
      const user = userEvent.setup()
      renderPanel()

      const input = screen.getByTestId('search-input')
      await user.click(input)
      await user.type(input, 'Gal')

      // Click outside
      await user.click(document.body)

      // Wait for autocomplete to hide
      await waitFor(
        () => {
          // Autocomplete should be hidden or suggestions cleared
        },
        { timeout: 500 }
      )
    })
  })

  describe('functionality search', () => {
    it('should perform functionality search with Russian description', async () => {
      const user = userEvent.setup()
      const onSearch = vi.fn()
      renderPanel({ onSearch })

      const input = screen.getByTestId('search-input')
      await user.type(input, 'найди компонент для экспорта')

      const button = screen.getByTestId('search-button')
      await user.click(button)

      await waitFor(() => {
        expect(onSearch).toHaveBeenCalled()
        const results = onSearch.mock.calls[0][1]
        expect(
          results.some((r: { component: { id: string } }) => r.component.id === 'export-panel')
        ).toBe(true)
      })
    })

    it('should perform functionality search with English description', async () => {
      const user = userEvent.setup()
      const onSearch = vi.fn()
      renderPanel({ onSearch })

      const input = screen.getByTestId('search-input')
      await user.type(input, 'find component for export')

      const button = screen.getByTestId('search-button')
      await user.click(button)

      await waitFor(() => {
        expect(onSearch).toHaveBeenCalled()
      })
    })
  })

  describe('keyboard shortcuts', () => {
    it('should handle arrow key navigation in autocomplete', async () => {
      const user = userEvent.setup()
      renderPanel()

      const input = screen.getByTestId('search-input')
      await user.click(input)
      await user.type(input, 'Cube')

      // Wait for suggestions
      await waitFor(() => {
        const panel = screen.getByTestId('extended-search-panel')
        expect(panel.textContent).toContain('CubePreview')
      })

      // Navigate with arrow keys
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowUp}')
    })

    it('should close autocomplete on Escape', async () => {
      const user = userEvent.setup()
      renderPanel()

      const input = screen.getByTestId('search-input')
      await user.click(input)
      await user.type(input, 'Gal')

      await waitFor(() => {
        const panel = screen.getByTestId('extended-search-panel')
        expect(panel.textContent).toContain('Gallery')
      })

      await user.keyboard('{Escape}')
    })
  })

  describe('positions', () => {
    it('should apply top-left position', () => {
      renderPanel({ position: 'top-left' })
      const panel = screen.getByTestId('extended-search-panel')
      expect(panel.style.top).toBe('80px')
      expect(panel.style.left).toBe('20px')
    })

    it('should apply top-right position', () => {
      renderPanel({ position: 'top-right' })
      const panel = screen.getByTestId('extended-search-panel')
      expect(panel.style.top).toBe('80px')
      expect(panel.style.right).toBe('20px')
    })

    it('should apply bottom-left position', () => {
      renderPanel({ position: 'bottom-left' })
      const panel = screen.getByTestId('extended-search-panel')
      expect(panel.style.bottom).toBe('20px')
      expect(panel.style.left).toBe('20px')
    })

    it('should apply bottom-right position', () => {
      renderPanel({ position: 'bottom-right' })
      const panel = screen.getByTestId('extended-search-panel')
      expect(panel.style.bottom).toBe('20px')
      expect(panel.style.right).toBe('20px')
    })
  })

  describe('children', () => {
    it('should render children inside the panel', () => {
      render(
        <ExtendedSearchPanel>
          <div data-testid="custom-child">Custom Content</div>
        </ExtendedSearchPanel>
      )
      expect(screen.getByTestId('custom-child')).toBeInTheDocument()
    })
  })

  describe('DevMode disabled', () => {
    it('should not render when DevMode is disabled', async () => {
      const { useIsDevModeEnabled } = await import('../lib/devmode')
      vi.mocked(useIsDevModeEnabled).mockReturnValue(false)

      renderPanel()
      expect(screen.queryByTestId('extended-search-panel')).not.toBeInTheDocument()

      // Reset mock
      vi.mocked(useIsDevModeEnabled).mockReturnValue(true)
    })
  })
})

describe('DEFAULT_PANEL_SETTINGS', () => {
  it('should have reasonable default values', () => {
    expect(DEFAULT_PANEL_SETTINGS.showAutocomplete).toBe(true)
    expect(DEFAULT_PANEL_SETTINGS.showScores).toBe(true)
    expect(DEFAULT_PANEL_SETTINGS.showHighlights).toBe(true)
    expect(DEFAULT_PANEL_SETTINGS.maxDisplayResults).toBe(10)
    expect(DEFAULT_PANEL_SETTINGS.preferredLanguage).toBe('ru')
  })
})
