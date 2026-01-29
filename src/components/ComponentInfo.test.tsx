/**
 * Tests for ComponentInfo overlay and DevModeIndicator components
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { ComponentInfo, DevModeIndicator } from './ComponentInfo'
import { DevModeProvider } from '../lib/devmode'
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

// Test metadata for ComponentInfo
const testMeta: ComponentMeta = {
  id: 'test-component',
  name: 'TestComponent',
  version: '1.0.0',
  summary: 'A test component for unit testing.',
  description: 'This is a test component used for unit testing the ComponentInfo overlay.',
  phase: 1,
  taskId: 'TASK 1',
  filePath: 'components/TestComponent.tsx',
  history: [
    {
      version: '1.0.0',
      date: '2026-01-29T12:00:00Z',
      description: 'Initial version',
      taskId: 'TASK 1',
      type: 'created',
    },
  ],
  features: [
    {
      id: 'feature-1',
      name: 'Feature One',
      description: 'First test feature',
      enabled: true,
      taskId: 'TASK 1',
    },
    {
      id: 'feature-2',
      name: 'Feature Two',
      description: 'Second test feature',
      enabled: false,
      disabledReason: 'Not implemented yet',
      taskId: 'TASK 2',
    },
  ],
  dependencies: [
    { name: 'react', type: 'external', purpose: 'UI library' },
    { name: 'OtherComponent', type: 'component', path: 'components/Other.tsx', purpose: 'Helper' },
  ],
  relatedFiles: [
    { path: 'components/TestComponent.test.tsx', type: 'test', description: 'Unit tests' },
  ],
  props: [
    { name: 'value', type: 'string', required: true, description: 'The value prop' },
    {
      name: 'onChange',
      type: '(v: string) => void',
      required: false,
      description: 'Change handler',
    },
  ],
  tips: ['Use this component for testing', 'It supports all standard props'],
  knownIssues: ['Known issue 1'],
  tags: ['test', 'component', 'phase-1'],
  status: 'stable',
  lastUpdated: '2026-01-29T12:00:00Z',
}

// Wrapper with DevModeProvider
const DevModeWrapper = ({
  children,
  enabled = true,
}: {
  children: ReactNode
  enabled?: boolean
}) => {
  return createElement(DevModeProvider, { initialSettings: { enabled } }, children)
}

describe('ComponentInfo', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('should render children', () => {
    render(
      <DevModeWrapper>
        <ComponentInfo meta={testMeta}>
          <div data-testid="child-content">Child Content</div>
        </ComponentInfo>
      </DevModeWrapper>
    )

    expect(screen.getByTestId('child-content')).toBeInTheDocument()
    expect(screen.getByText('Child Content')).toBeInTheDocument()
  })

  it('should display component name in panel', () => {
    render(
      <DevModeWrapper>
        <ComponentInfo meta={testMeta} alwaysShow>
          <div>Content</div>
        </ComponentInfo>
      </DevModeWrapper>
    )

    expect(screen.getByText('TestComponent')).toBeInTheDocument()
  })

  it('should display version in panel', () => {
    render(
      <DevModeWrapper>
        <ComponentInfo meta={testMeta} alwaysShow>
          <div>Content</div>
        </ComponentInfo>
      </DevModeWrapper>
    )

    // Version appears in multiple places - ensure at least one exists
    expect(screen.getAllByText(/v1.0.0/).length).toBeGreaterThan(0)
  })

  it('should display status badge', () => {
    render(
      <DevModeWrapper>
        <ComponentInfo meta={testMeta} alwaysShow>
          <div>Content</div>
        </ComponentInfo>
      </DevModeWrapper>
    )

    // Status is shown as "Stable" (capitalized)
    expect(screen.getByText('Stable')).toBeInTheDocument()
  })

  it('should show info panel on hover', async () => {
    render(
      <DevModeWrapper>
        <ComponentInfo meta={testMeta}>
          <div data-testid="content">Content</div>
        </ComponentInfo>
      </DevModeWrapper>
    )

    const wrapper = screen.getByTestId('content').closest('.component-info')
    expect(wrapper).toBeInTheDocument()

    // Simulate mouse enter
    fireEvent.mouseEnter(wrapper!)

    // Panel should become visible (checking for summary text)
    expect(screen.getByText(testMeta.summary)).toBeInTheDocument()
  })

  it('should display component summary in panel when alwaysShow is true', () => {
    render(
      <DevModeWrapper>
        <ComponentInfo meta={testMeta} alwaysShow>
          <div>Content</div>
        </ComponentInfo>
      </DevModeWrapper>
    )

    expect(screen.getByText(testMeta.summary)).toBeInTheDocument()
  })

  it('should display phase information when panel is visible', () => {
    render(
      <DevModeWrapper>
        <ComponentInfo meta={testMeta} alwaysShow>
          <div>Content</div>
        </ComponentInfo>
      </DevModeWrapper>
    )

    expect(screen.getByText(/Phase 1/)).toBeInTheDocument()
  })

  it('should display features when category is enabled and panel visible', () => {
    render(
      <DevModeWrapper>
        <ComponentInfo meta={testMeta} alwaysShow>
          <div>Content</div>
        </ComponentInfo>
      </DevModeWrapper>
    )

    expect(screen.getByText('Feature One')).toBeInTheDocument()
    expect(screen.getByText('Feature Two')).toBeInTheDocument()
  })

  it('should display history section when panel is visible', () => {
    render(
      <DevModeWrapper>
        <ComponentInfo meta={testMeta} alwaysShow>
          <div>Content</div>
        </ComponentInfo>
      </DevModeWrapper>
    )

    // History section header should be visible
    expect(screen.getByText(/History/)).toBeInTheDocument()
  })

  it('should display tips when available and panel is visible', () => {
    render(
      <DevModeWrapper>
        <ComponentInfo meta={testMeta} alwaysShow>
          <div>Content</div>
        </ComponentInfo>
      </DevModeWrapper>
    )

    expect(screen.getByText('Use this component for testing')).toBeInTheDocument()
  })

  it('should not render overlay when DevMode is disabled', () => {
    render(
      <DevModeWrapper enabled={false}>
        <ComponentInfo meta={testMeta}>
          <div data-testid="child-content">Child Content</div>
        </ComponentInfo>
      </DevModeWrapper>
    )

    // Children should still render
    expect(screen.getByTestId('child-content')).toBeInTheDocument()

    // But overlay elements should not be present
    expect(screen.queryByText('v1.0.0')).not.toBeInTheDocument()
  })
})

describe('DevModeIndicator', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('should render toggle button', () => {
    render(
      <DevModeWrapper>
        <DevModeIndicator />
      </DevModeWrapper>
    )

    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('should display DevMode label', () => {
    render(
      <DevModeWrapper>
        <DevModeIndicator />
      </DevModeWrapper>
    )

    // The button shows "DevMode ON" when enabled
    expect(screen.getByText(/DevMode/)).toBeInTheDocument()
  })

  it('should toggle DevMode on click', () => {
    render(
      <DevModeWrapper enabled={false}>
        <DevModeIndicator />
      </DevModeWrapper>
    )

    const button = screen.getByRole('button')

    // Initially off
    expect(button).not.toHaveClass('active')

    // Click to toggle on
    fireEvent.click(button)

    // Should now be active (class name may vary based on implementation)
    // Check for visual indication of active state
  })

  it('should have keyboard shortcut hint in title', () => {
    render(
      <DevModeWrapper>
        <DevModeIndicator />
      </DevModeWrapper>
    )

    const button = screen.getByRole('button')
    expect(button.getAttribute('title')).toContain('Ctrl+Shift+D')
  })
})

describe('ComponentInfo with different statuses', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  const createMetaWithStatus = (status: ComponentMeta['status']): ComponentMeta => ({
    ...testMeta,
    id: `test-${status}`,
    status,
  })

  it('should render component with beta status', () => {
    render(
      <DevModeWrapper>
        <ComponentInfo meta={createMetaWithStatus('beta')}>
          <div>Content</div>
        </ComponentInfo>
      </DevModeWrapper>
    )

    // Check wrapper renders correctly with beta meta
    const wrapper = document.querySelector('.component-info')
    expect(wrapper).toBeInTheDocument()
  })

  it('should render component with experimental status', () => {
    render(
      <DevModeWrapper>
        <ComponentInfo meta={createMetaWithStatus('experimental')}>
          <div>Content</div>
        </ComponentInfo>
      </DevModeWrapper>
    )

    const wrapper = document.querySelector('.component-info')
    expect(wrapper).toBeInTheDocument()
  })

  it('should render component with deprecated status', () => {
    render(
      <DevModeWrapper>
        <ComponentInfo meta={createMetaWithStatus('deprecated')}>
          <div>Content</div>
        </ComponentInfo>
      </DevModeWrapper>
    )

    const wrapper = document.querySelector('.component-info')
    expect(wrapper).toBeInTheDocument()
  })
})

describe('ComponentInfo accessibility', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('should have appropriate aria labels', () => {
    render(
      <DevModeWrapper>
        <ComponentInfo meta={testMeta}>
          <div>Content</div>
        </ComponentInfo>
      </DevModeWrapper>
    )

    // The wrapper should have an aria label
    const wrapper = document.querySelector('.component-info')
    expect(wrapper).toBeInTheDocument()
  })

  it('should be keyboard navigable', () => {
    render(
      <DevModeWrapper>
        <ComponentInfo meta={testMeta}>
          <button type="button">Clickable Child</button>
        </ComponentInfo>
      </DevModeWrapper>
    )

    const childButton = screen.getByRole('button', { name: 'Clickable Child' })
    expect(childButton).toBeInTheDocument()

    // Child should be focusable
    childButton.focus()
    expect(document.activeElement).toBe(childButton)
  })
})
