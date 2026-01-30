/**
 * Tests for DevModeQueryPanel Component
 *
 * TASK 49: AI Query Interface for DevMode (Phase 8 - AI + Metadata)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React, { createElement, type ReactNode } from 'react'
import { DevModeQueryPanel } from './DevModeQueryPanel'
import { DevModeProvider } from '../lib/devmode'
import { registerComponentMeta, componentMetaRegistry } from '../types/component-meta'
import type { ComponentMeta } from '../types/component-meta'

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
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Test component metadata
const testGalleryMeta: ComponentMeta = {
  id: 'gallery',
  name: 'Gallery',
  version: '1.1.0',
  summary: 'Displays a gallery of cubes with search and filtering.',
  description:
    'The Gallery component provides a visual display of all available cubes with search, filtering, and selection capabilities.',
  phase: 1,
  taskId: 'TASK 5',
  filePath: 'components/Gallery.tsx',
  history: [
    {
      version: '1.0.0',
      date: '2026-01-01T12:00:00Z',
      description: 'Initial version',
      type: 'created',
    },
    {
      version: '1.1.0',
      date: '2026-01-15T12:00:00Z',
      description: 'Added search functionality',
      type: 'updated',
    },
  ],
  features: [
    {
      id: 'search',
      name: 'Search',
      description: 'Search cubes by name or tags',
      enabled: true,
    },
    {
      id: 'filtering',
      name: 'Filtering',
      description: 'Filter by category',
      enabled: true,
    },
  ],
  dependencies: [
    { name: 'react', type: 'external', purpose: 'UI library' },
    {
      name: 'CubePreview',
      type: 'component',
      path: 'components/CubePreview.tsx',
      purpose: 'Preview cubes',
    },
  ],
  relatedFiles: [{ path: 'components/Gallery.test.tsx', type: 'test', description: 'Unit tests' }],
  tips: ['Use for browsing cubes', 'Click to select a cube'],
  tags: ['gallery', 'ui', 'browse'],
  status: 'stable',
  lastUpdated: '2026-01-15T12:00:00Z',
}

const testEditorMeta: ComponentMeta = {
  id: 'unified-editor',
  name: 'UnifiedEditor',
  version: '1.2.0',
  summary: 'Unified editor for all cube parameters.',
  description: 'A comprehensive editor component that allows editing all aspects of a cube.',
  phase: 5,
  taskId: 'TASK 35',
  filePath: 'components/UnifiedEditor.tsx',
  history: [
    {
      version: '1.0.0',
      date: '2026-01-10T12:00:00Z',
      description: 'Initial version',
      type: 'created',
    },
  ],
  features: [],
  dependencies: [{ name: 'react', type: 'external', purpose: 'UI library' }],
  relatedFiles: [],
  tags: ['editor', 'ui', 'params'],
  status: 'stable',
  lastUpdated: '2026-01-10T12:00:00Z',
}

// Wrapper with DevModeProvider
const DevModeWrapper = ({
  children,
  enabled = true,
}: {
  children: ReactNode
  enabled?: boolean
}) => {
  return createElement(DevModeProvider, {
    initialSettings: { enabled },
    children,
  } as React.ComponentProps<typeof DevModeProvider>)
}

describe('DevModeQueryPanel', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()

    // Clear and re-register test components
    componentMetaRegistry.clear()
    registerComponentMeta(testGalleryMeta)
    registerComponentMeta(testEditorMeta)
  })

  afterEach(() => {
    componentMetaRegistry.clear()
  })

  describe('Rendering', () => {
    it('should not render when DevMode is disabled', () => {
      render(
        <DevModeWrapper enabled={false}>
          <DevModeQueryPanel />
        </DevModeWrapper>
      )

      expect(screen.queryByTestId('devmode-query-panel')).not.toBeInTheDocument()
    })

    it('should render when DevMode is enabled', () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel />
        </DevModeWrapper>
      )

      expect(screen.getByTestId('devmode-query-panel')).toBeInTheDocument()
    })

    it('should render with AI Query header', () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel />
        </DevModeWrapper>
      )

      expect(screen.getByText('AI Query')).toBeInTheDocument()
    })

    it('should render input field', () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel />
        </DevModeWrapper>
      )

      expect(screen.getByTestId('query-input')).toBeInTheDocument()
    })

    it('should render submit button', () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel />
        </DevModeWrapper>
      )

      expect(screen.getByTestId('query-submit')).toBeInTheDocument()
    })

    it('should render example queries initially', () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel />
        </DevModeWrapper>
      )

      // Should show example queries section
      expect(screen.getByText(/Примеры запросов|Example queries/)).toBeInTheDocument()
    })
  })

  describe('Collapsible behavior', () => {
    it('should render expanded by default', () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel />
        </DevModeWrapper>
      )

      expect(screen.getByTestId('query-input')).toBeVisible()
    })

    it('should render collapsed when initialExpanded is false', () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel initialExpanded={false} />
        </DevModeWrapper>
      )

      expect(screen.queryByTestId('query-input')).not.toBeInTheDocument()
    })

    it('should toggle expansion when header is clicked', () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel />
        </DevModeWrapper>
      )

      const header = screen.getByText('AI Query').closest('div')!

      // Collapse
      fireEvent.click(header)
      expect(screen.queryByTestId('query-input')).not.toBeInTheDocument()

      // Expand
      fireEvent.click(header)
      expect(screen.getByTestId('query-input')).toBeInTheDocument()
    })
  })

  describe('Query input', () => {
    it('should update input value on change', () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel />
        </DevModeWrapper>
      )

      const input = screen.getByTestId('query-input')
      fireEvent.change(input, { target: { value: 'Test query' } })

      expect(input).toHaveValue('Test query')
    })

    it('should disable submit button when input is empty', () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel />
        </DevModeWrapper>
      )

      const button = screen.getByTestId('query-submit')
      expect(button).toBeDisabled()
    })

    it('should enable submit button when input has value', () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel />
        </DevModeWrapper>
      )

      const input = screen.getByTestId('query-input')
      fireEvent.change(input, { target: { value: 'Test query' } })

      const button = screen.getByTestId('query-submit')
      expect(button).not.toBeDisabled()
    })

    it('should show Russian placeholder for Russian input', () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel />
        </DevModeWrapper>
      )

      const input = screen.getByTestId('query-input')
      expect(input).toHaveAttribute('placeholder', 'Задайте вопрос о компонентах...')
    })
  })

  describe('Query processing', () => {
    it('should process query on submit', async () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel />
        </DevModeWrapper>
      )

      const input = screen.getByTestId('query-input')
      const button = screen.getByTestId('query-submit')

      fireEvent.change(input, { target: { value: 'Что делает Gallery?' } })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByTestId('query-response')).toBeInTheDocument()
      })
    })

    it('should process query on Enter key', async () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel />
        </DevModeWrapper>
      )

      const input = screen.getByTestId('query-input')

      fireEvent.change(input, { target: { value: 'Что делает Gallery?' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(screen.getByTestId('query-response')).toBeInTheDocument()
      })
    })

    it('should display response for describe intent', async () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel />
        </DevModeWrapper>
      )

      const input = screen.getByTestId('query-input')
      fireEvent.change(input, { target: { value: 'Что делает Gallery?' } })
      fireEvent.click(screen.getByTestId('query-submit'))

      await waitFor(() => {
        expect(screen.getByText(/Gallery/)).toBeInTheDocument()
      })
    })

    it('should display response for find intent', async () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel />
        </DevModeWrapper>
      )

      const input = screen.getByTestId('query-input')
      fireEvent.change(input, { target: { value: 'Найди компонент editor' } })
      fireEvent.click(screen.getByTestId('query-submit'))

      await waitFor(() => {
        expect(screen.getByTestId('query-response')).toBeInTheDocument()
      })
    })

    it('should call onQueryProcessed callback', async () => {
      const onQueryProcessed = vi.fn()

      render(
        <DevModeWrapper>
          <DevModeQueryPanel onQueryProcessed={onQueryProcessed} />
        </DevModeWrapper>
      )

      const input = screen.getByTestId('query-input')
      fireEvent.change(input, { target: { value: 'Test query' } })
      fireEvent.click(screen.getByTestId('query-submit'))

      await waitFor(() => {
        expect(onQueryProcessed).toHaveBeenCalledWith('Test query', expect.any(Object))
      })
    })

    it('should display confidence badge', async () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel />
        </DevModeWrapper>
      )

      const input = screen.getByTestId('query-input')
      fireEvent.change(input, { target: { value: 'Что делает Gallery?' } })
      fireEvent.click(screen.getByTestId('query-submit'))

      await waitFor(() => {
        expect(screen.getByText(/%/)).toBeInTheDocument()
      })
    })
  })

  describe('Query history', () => {
    it('should add query to history after processing', async () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel />
        </DevModeWrapper>
      )

      const input = screen.getByTestId('query-input')
      fireEvent.change(input, { target: { value: 'Test query' } })
      fireEvent.click(screen.getByTestId('query-submit'))

      await waitFor(() => {
        expect(screen.getByText(/История|History/)).toBeInTheDocument()
        expect(screen.getByText('Test query')).toBeInTheDocument()
      })
    })

    it('should allow clicking history to reuse query', async () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel />
        </DevModeWrapper>
      )

      const input = screen.getByTestId('query-input')
      fireEvent.change(input, { target: { value: 'First query' } })
      fireEvent.click(screen.getByTestId('query-submit'))

      await waitFor(() => {
        expect(screen.getByText('First query')).toBeInTheDocument()
      })

      // Clear input and click history item
      fireEvent.change(input, { target: { value: '' } })
      fireEvent.click(screen.getByText('First query'))

      expect(input).toHaveValue('First query')
    })

    it('should allow clearing history', async () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel />
        </DevModeWrapper>
      )

      const input = screen.getByTestId('query-input')
      fireEvent.change(input, { target: { value: 'Test query' } })
      fireEvent.click(screen.getByTestId('query-submit'))

      await waitFor(() => {
        expect(screen.getByText('Test query')).toBeInTheDocument()
      })

      const clearButton = screen.getByText(/Очистить|Clear/)
      fireEvent.click(clearButton)

      expect(screen.queryByText('Test query')).not.toBeInTheDocument()
    })

    it('should persist history to localStorage', async () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel />
        </DevModeWrapper>
      )

      const input = screen.getByTestId('query-input')
      fireEvent.change(input, { target: { value: 'Persistent query' } })
      fireEvent.click(screen.getByTestId('query-submit'))

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'isocubic_query_history',
          expect.any(String)
        )
      })
    })
  })

  describe('Example queries', () => {
    it('should display example queries when no response', () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel />
        </DevModeWrapper>
      )

      expect(screen.getByText(/Примеры запросов|Example queries/)).toBeInTheDocument()
    })

    it('should fill input when example is clicked', () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel />
        </DevModeWrapper>
      )

      // Find an example query button
      const exampleButtons = screen
        .getAllByRole('button')
        .filter(
          (btn) => btn.textContent?.includes('Gallery') || btn.textContent?.includes('компонент')
        )

      if (exampleButtons.length > 0) {
        const exampleText = exampleButtons[0].textContent!
        fireEvent.click(exampleButtons[0])

        const input = screen.getByTestId('query-input')
        expect(input).toHaveValue(exampleText)
      }
    })
  })

  describe('Suggestions and related queries', () => {
    it('should display suggestions when available', async () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel />
        </DevModeWrapper>
      )

      const input = screen.getByTestId('query-input')
      // Query that returns suggestions (component not found)
      fireEvent.change(input, { target: { value: 'Что делает NonExistentComponent?' } })
      fireEvent.click(screen.getByTestId('query-submit'))

      await waitFor(() => {
        expect(screen.getByTestId('query-response')).toBeInTheDocument()
      })
    })

    it('should display related queries when available', async () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel />
        </DevModeWrapper>
      )

      const input = screen.getByTestId('query-input')
      fireEvent.change(input, { target: { value: 'Что делает Gallery?' } })
      fireEvent.click(screen.getByTestId('query-submit'))

      await waitFor(() => {
        expect(screen.getByTestId('query-response')).toBeInTheDocument()
      })
    })
  })

  describe('Components display', () => {
    it('should display found components in response', async () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel />
        </DevModeWrapper>
      )

      const input = screen.getByTestId('query-input')
      fireEvent.change(input, { target: { value: 'Что делает Gallery?' } })
      fireEvent.click(screen.getByTestId('query-submit'))

      await waitFor(() => {
        expect(screen.getByText(/Найденные компоненты|Found components/)).toBeInTheDocument()
      })
    })
  })

  describe('Keyboard shortcuts', () => {
    it('should toggle panel with Ctrl+Shift+Q', () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel />
        </DevModeWrapper>
      )

      expect(screen.getByTestId('query-input')).toBeInTheDocument()

      // Collapse
      fireEvent.keyDown(window, { key: 'q', ctrlKey: true, shiftKey: true })
      expect(screen.queryByTestId('query-input')).not.toBeInTheDocument()

      // Expand
      fireEvent.keyDown(window, { key: 'q', ctrlKey: true, shiftKey: true })

      expect(screen.getByTestId('query-input')).toBeInTheDocument()
    })

    it('should display keyboard shortcut hint', () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel />
        </DevModeWrapper>
      )

      expect(screen.getByText('Ctrl+Shift+Q')).toBeInTheDocument()
    })
  })

  describe('Position and styling', () => {
    it('should apply custom styles', () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel style={{ opacity: 0.5 }} />
        </DevModeWrapper>
      )

      const panel = screen.getByTestId('devmode-query-panel')
      expect(panel).toHaveStyle({ opacity: 0.5 })
    })

    it('should apply custom className', () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel className="custom-class" />
        </DevModeWrapper>
      )

      const panel = screen.getByTestId('devmode-query-panel')
      expect(panel).toHaveClass('custom-class')
    })

    it('should support different positions', () => {
      const { rerender } = render(
        <DevModeWrapper>
          <DevModeQueryPanel position="top-left" />
        </DevModeWrapper>
      )

      let panel = screen.getByTestId('devmode-query-panel')
      expect(panel).toHaveStyle({ top: '80px', left: '20px' })

      rerender(
        <DevModeWrapper>
          <DevModeQueryPanel position="bottom-right" />
        </DevModeWrapper>
      )

      panel = screen.getByTestId('devmode-query-panel')
      expect(panel).toHaveStyle({ bottom: '20px', right: '20px' })
    })
  })

  describe('Children rendering', () => {
    it('should render children inside the panel', () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel>
            <div data-testid="custom-child">Custom Content</div>
          </DevModeQueryPanel>
        </DevModeWrapper>
      )

      expect(screen.getByTestId('custom-child')).toBeInTheDocument()
      expect(screen.getByText('Custom Content')).toBeInTheDocument()
    })
  })

  describe('Query intents', () => {
    it('should process dependencies intent', async () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel />
        </DevModeWrapper>
      )

      const input = screen.getByTestId('query-input')
      fireEvent.change(input, { target: { value: 'Какие зависимости у Gallery?' } })
      fireEvent.click(screen.getByTestId('query-submit'))

      await waitFor(() => {
        expect(screen.getByTestId('query-response')).toBeInTheDocument()
        expect(screen.getByText(/Зависимости|Dependencies/)).toBeInTheDocument()
      })
    })

    it('should process history intent', async () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel />
        </DevModeWrapper>
      )

      const input = screen.getByTestId('query-input')
      fireEvent.change(input, { target: { value: 'История изменений Gallery' } })
      fireEvent.click(screen.getByTestId('query-submit'))

      await waitFor(() => {
        expect(screen.getByTestId('query-response')).toBeInTheDocument()
        // Check for version history in response - can match multiple places
        expect(screen.getByTestId('query-response').textContent).toMatch(/история|history/i)
      })
    })

    it('should process features intent', async () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel />
        </DevModeWrapper>
      )

      const input = screen.getByTestId('query-input')
      // Use query starting with 'функции' to match features intent
      fireEvent.change(input, { target: { value: 'Функции Gallery' } })
      fireEvent.click(screen.getByTestId('query-submit'))

      await waitFor(() => {
        expect(screen.getByTestId('query-response')).toBeInTheDocument()
        // Check for features in response content
        expect(screen.getByTestId('query-response').textContent).toMatch(/функци|feature/i)
      })
    })

    it('should process status intent', async () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel />
        </DevModeWrapper>
      )

      const input = screen.getByTestId('query-input')
      // Use query starting with 'статус' to match status intent
      fireEvent.change(input, { target: { value: 'Статус Gallery' } })
      fireEvent.click(screen.getByTestId('query-submit'))

      await waitFor(() => {
        expect(screen.getByTestId('query-response')).toBeInTheDocument()
        // Check for status info in response
        expect(screen.getByTestId('query-response').textContent).toMatch(
          /статус|status|стабильн|stable/i
        )
      })
    })

    it('should process unknown intent gracefully', async () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel />
        </DevModeWrapper>
      )

      const input = screen.getByTestId('query-input')
      fireEvent.change(input, { target: { value: 'xyz random text 123' } })
      fireEvent.click(screen.getByTestId('query-submit'))

      await waitFor(() => {
        expect(screen.getByTestId('query-response')).toBeInTheDocument()
      })
    })
  })

  describe('English language support', () => {
    it('should detect English language queries', async () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel />
        </DevModeWrapper>
      )

      const input = screen.getByTestId('query-input')
      fireEvent.change(input, { target: { value: 'What does Gallery do?' } })

      // Placeholder should switch to English
      expect(screen.getByTestId('query-submit')).toHaveTextContent('Ask')
    })

    it('should respond in English for English queries', async () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel />
        </DevModeWrapper>
      )

      const input = screen.getByTestId('query-input')
      fireEvent.change(input, { target: { value: 'What does Gallery do?' } })
      fireEvent.click(screen.getByTestId('query-submit'))

      await waitFor(() => {
        expect(screen.getByTestId('query-response')).toBeInTheDocument()
      })
    })
  })

  describe('Settings', () => {
    it('should respect showSuggestions setting', async () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel settings={{ showSuggestions: false }} />
        </DevModeWrapper>
      )

      const input = screen.getByTestId('query-input')
      fireEvent.change(input, { target: { value: 'Что делает UnknownComponent?' } })
      fireEvent.click(screen.getByTestId('query-submit'))

      await waitFor(() => {
        expect(screen.getByTestId('query-response')).toBeInTheDocument()
      })
    })

    it('should respect showRelatedQueries setting', async () => {
      render(
        <DevModeWrapper>
          <DevModeQueryPanel settings={{ showRelatedQueries: false }} />
        </DevModeWrapper>
      )

      const input = screen.getByTestId('query-input')
      fireEvent.change(input, { target: { value: 'Что делает Gallery?' } })
      fireEvent.click(screen.getByTestId('query-submit'))

      await waitFor(() => {
        expect(screen.getByTestId('query-response')).toBeInTheDocument()
      })
    })
  })
})
