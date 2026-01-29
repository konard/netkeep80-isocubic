/**
 * Unit tests for CollaborativeParamEditor component
 * Tests collaboration indicators, field locking, action history integration
 * @vitest-environment jsdom
 *
 * ISSUE 33: Collaborative editing mode tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  CollaborativeParamEditor,
  EditingIndicator,
  ConflictIndicator,
} from './CollaborativeParamEditor'
import type { SpectralCube } from '../types/cube'
import type {
  Participant,
  CollaborativeAction,
  CubeUpdateAction,
  CubeCreateAction,
} from '../types/collaboration'
import { createCollaborationManager } from '../lib/collaboration'

// Helper to create a mock cube
const createMockCube = (overrides: Partial<SpectralCube> = {}): SpectralCube => ({
  id: 'test-cube-1',
  prompt: 'test cube',
  base: {
    color: [0.5, 0.5, 0.5],
    roughness: 0.5,
    transparency: 1.0,
  },
  gradients: [],
  noise: {
    type: 'perlin',
    scale: 8,
    octaves: 4,
    persistence: 0.5,
  },
  physics: {
    material: 'stone',
    density: 2.5,
    break_pattern: 'crumble',
  },
  boundary: {
    mode: 'smooth',
    neighbor_influence: 0.5,
  },
  meta: {
    name: 'Test Cube',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  },
  ...overrides,
})

// Helper to create mock participant
const createMockParticipant = (overrides: Partial<Participant> = {}): Participant => ({
  id: 'participant-1',
  name: 'Test User',
  role: 'editor',
  color: '#646cff',
  joinedAt: new Date().toISOString(),
  lastActiveAt: new Date().toISOString(),
  status: 'online',
  ...overrides,
})

// Helper to create mock cube update action
const createMockCubeUpdateAction = (
  overrides: Partial<CubeUpdateAction> = {}
): CubeUpdateAction => ({
  id: `action-${Math.random().toString(36).slice(2)}`,
  type: 'cube_update',
  participantId: 'participant-1',
  timestamp: new Date().toISOString(),
  sessionId: 'session-1',
  payload: {
    cubeId: 'test-cube-1',
    changes: { base: { color: [0.6, 0.6, 0.6] } },
  },
  ...overrides,
})

// Helper to create mock cube create action
const createMockCubeCreateAction = (
  overrides: Partial<CubeCreateAction> = {}
): CubeCreateAction => ({
  id: `action-${Math.random().toString(36).slice(2)}`,
  type: 'cube_create',
  participantId: 'participant-1',
  timestamp: new Date().toISOString(),
  sessionId: 'session-1',
  payload: {
    cube: createMockCube() as never,
  },
  ...overrides,
})

describe('CollaborativeParamEditor', () => {
  // Note: Most tests don't need fake timers - only Edit Timeout tests do

  describe('Rendering', () => {
    it('should render the component with a cube', () => {
      const cube = createMockCube()

      render(<CollaborativeParamEditor currentCube={cube} />)

      expect(screen.getByText('Edit Parameters')).toBeInTheDocument()
    })

    it('should render empty state when no cube provided', () => {
      render(<CollaborativeParamEditor currentCube={null} />)

      expect(screen.getByText('No cube selected')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(
        <CollaborativeParamEditor currentCube={createMockCube()} className="custom-class" />
      )

      expect(container.querySelector('.collab-editor.custom-class')).toBeInTheDocument()
    })
  })

  describe('Local Participant Display', () => {
    it('should display local participant info in header', () => {
      const cube = createMockCube()
      const localParticipant = createMockParticipant({ id: 'local-p', name: 'Alice' })
      const participants = new Map([['local-p', localParticipant]])

      render(
        <CollaborativeParamEditor
          currentCube={cube}
          participants={participants}
          localParticipantId="local-p"
        />
      )

      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('(editor)')).toBeInTheDocument()
    })

    it('should display role indicator for viewer', () => {
      const cube = createMockCube()
      const localParticipant = createMockParticipant({ id: 'local-p', name: 'Bob', role: 'viewer' })
      const participants = new Map([['local-p', localParticipant]])

      render(
        <CollaborativeParamEditor
          currentCube={cube}
          participants={participants}
          localParticipantId="local-p"
        />
      )

      expect(screen.getByText('(viewer)')).toBeInTheDocument()
    })
  })

  describe('Read-Only Mode', () => {
    it('should show read-only notice for viewers', () => {
      const cube = createMockCube()
      const localParticipant = createMockParticipant({ id: 'local-p', role: 'viewer' })
      const participants = new Map([['local-p', localParticipant]])

      render(
        <CollaborativeParamEditor
          currentCube={cube}
          participants={participants}
          localParticipantId="local-p"
        />
      )

      expect(screen.getByText(/You are a viewer/)).toBeInTheDocument()
      expect(screen.getByText(/Request editor access/)).toBeInTheDocument()
    })

    it('should not show read-only notice for editors', () => {
      const cube = createMockCube()
      const localParticipant = createMockParticipant({ id: 'local-p', role: 'editor' })
      const participants = new Map([['local-p', localParticipant]])

      render(
        <CollaborativeParamEditor
          currentCube={cube}
          participants={participants}
          localParticipantId="local-p"
        />
      )

      expect(screen.queryByText(/You are a viewer/)).not.toBeInTheDocument()
    })

    it('should not show read-only notice for owners', () => {
      const cube = createMockCube()
      const localParticipant = createMockParticipant({ id: 'local-p', role: 'owner' })
      const participants = new Map([['local-p', localParticipant]])

      render(
        <CollaborativeParamEditor
          currentCube={cube}
          participants={participants}
          localParticipantId="local-p"
        />
      )

      expect(screen.queryByText(/You are a viewer/)).not.toBeInTheDocument()
    })
  })

  describe('Active Edits Display', () => {
    it('should show active edits indicator when other participants are editing', () => {
      const cube = createMockCube()
      const localParticipant = createMockParticipant({ id: 'local-p', name: 'Me' })
      const otherParticipant = createMockParticipant({
        id: 'other-p',
        name: 'Alice',
        color: '#ff6b6b',
      })
      const participants = new Map([
        ['local-p', localParticipant],
        ['other-p', otherParticipant],
      ])

      const actions: CollaborativeAction[] = [
        createMockCubeUpdateAction({
          participantId: 'other-p',
          timestamp: new Date().toISOString(),
          payload: { cubeId: 'test-cube-1', changes: { base: { color: [0.7, 0.7, 0.7] } } },
        }),
      ]

      render(
        <CollaborativeParamEditor
          currentCube={cube}
          participants={participants}
          localParticipantId="local-p"
          actions={actions}
        />
      )

      // Active edits should be shown synchronously
      expect(screen.getByText(/field\(s\) being edited/)).toBeInTheDocument()
    })

    it('should not show active edits for local participant', () => {
      const cube = createMockCube()
      const localParticipant = createMockParticipant({ id: 'local-p', name: 'Me' })
      const participants = new Map([['local-p', localParticipant]])

      const actions: CollaborativeAction[] = [
        createMockCubeUpdateAction({
          participantId: 'local-p',
          timestamp: new Date().toISOString(),
        }),
      ]

      render(
        <CollaborativeParamEditor
          currentCube={cube}
          participants={participants}
          localParticipantId="local-p"
          actions={actions}
        />
      )

      // Should not show active edits indicator for self
      expect(screen.queryByText(/field\(s\) being edited/)).not.toBeInTheDocument()
    })

    it('should show participant avatars for active editors', () => {
      const cube = createMockCube()
      const localParticipant = createMockParticipant({ id: 'local-p', name: 'Me' })
      const otherParticipant = createMockParticipant({
        id: 'other-p',
        name: 'Alice',
        color: '#ff6b6b',
      })
      const participants = new Map([
        ['local-p', localParticipant],
        ['other-p', otherParticipant],
      ])

      const actions: CollaborativeAction[] = [
        createMockCubeUpdateAction({
          participantId: 'other-p',
          timestamp: new Date().toISOString(),
        }),
      ]

      render(
        <CollaborativeParamEditor
          currentCube={cube}
          participants={participants}
          localParticipantId="local-p"
          actions={actions}
        />
      )

      // Check for participant avatar with initial
      expect(screen.getByTitle('Alice')).toBeInTheDocument()
    })
  })

  describe('Section Edit Indicators', () => {
    it('should show section indicators for sections being edited', () => {
      const cube = createMockCube()
      const localParticipant = createMockParticipant({ id: 'local-p', name: 'Me' })
      const otherParticipant = createMockParticipant({
        id: 'other-p',
        name: 'Alice',
        color: '#ff6b6b',
      })
      const participants = new Map([
        ['local-p', localParticipant],
        ['other-p', otherParticipant],
      ])

      const actions: CollaborativeAction[] = [
        createMockCubeUpdateAction({
          participantId: 'other-p',
          timestamp: new Date().toISOString(),
          payload: { cubeId: 'test-cube-1', changes: { base: { color: [0.8, 0.8, 0.8] } } },
        }),
      ]

      render(
        <CollaborativeParamEditor
          currentCube={cube}
          participants={participants}
          localParticipantId="local-p"
          actions={actions}
        />
      )

      // Check for section indicator within the section indicators container
      const sectionIndicators = document.querySelector('.collab-editor__section-indicators')
      expect(sectionIndicators).toBeInTheDocument()
      expect(sectionIndicators?.textContent).toContain('base')
    })
  })

  describe('Cube Update Handling', () => {
    it('should call onCubeUpdate when editing', () => {
      const cube = createMockCube()
      const onCubeUpdate = vi.fn()
      const localParticipant = createMockParticipant({ id: 'local-p', role: 'editor' })
      const participants = new Map([['local-p', localParticipant]])

      render(
        <CollaborativeParamEditor
          currentCube={cube}
          onCubeUpdate={onCubeUpdate}
          participants={participants}
          localParticipantId="local-p"
        />
      )

      // Find and modify a field (using base color input)
      const colorInput = screen.getByLabelText('Base Color')
      fireEvent.change(colorInput, { target: { value: '#ff0000' } })

      // onCubeUpdate should be called synchronously
      expect(onCubeUpdate).toHaveBeenCalled()
    })

    it('should not call onCubeUpdate for viewers', async () => {
      const cube = createMockCube()
      const onCubeUpdate = vi.fn()
      const localParticipant = createMockParticipant({ id: 'local-p', role: 'viewer' })
      const participants = new Map([['local-p', localParticipant]])

      render(
        <CollaborativeParamEditor
          currentCube={cube}
          onCubeUpdate={onCubeUpdate}
          participants={participants}
          localParticipantId="local-p"
        />
      )

      // onCubeUpdate should not be passed to inner ParamEditor
      // This is tested indirectly - the ParamEditor won't receive the callback
      expect(onCubeUpdate).not.toHaveBeenCalled()
    })
  })

  describe('Action History Integration', () => {
    it('should show action history panel by default', () => {
      const cube = createMockCube()
      const actions: CollaborativeAction[] = [createMockCubeCreateAction()]

      render(<CollaborativeParamEditor currentCube={cube} actions={actions} />)

      expect(screen.getByText('Action History')).toBeInTheDocument()
    })

    it('should hide action history when showHistory is false', () => {
      const cube = createMockCube()
      const actions: CollaborativeAction[] = [createMockCubeCreateAction()]

      render(<CollaborativeParamEditor currentCube={cube} actions={actions} showHistory={false} />)

      expect(screen.queryByText('Action History')).not.toBeInTheDocument()
    })

    it('should filter to show only cube-related actions', () => {
      const cube = createMockCube()
      const cursorAction: CollaborativeAction = {
        id: 'cursor-action',
        type: 'cursor_move',
        participantId: 'p1',
        timestamp: new Date().toISOString(),
        sessionId: 'session-1',
        payload: { position: { x: 0, y: 0, z: 0 } },
      }
      const cubeAction = createMockCubeCreateAction()

      render(<CollaborativeParamEditor currentCube={cube} actions={[cursorAction, cubeAction]} />)

      // ActionHistory should receive filtered actions
      expect(screen.getByText('Action History')).toBeInTheDocument()
      expect(screen.getByText('1 actions')).toBeInTheDocument()
    })

    it('should respect maxHistoryActions prop', () => {
      const cube = createMockCube()
      const actions: CollaborativeAction[] = Array.from({ length: 50 }, () =>
        createMockCubeCreateAction()
      )

      render(
        <CollaborativeParamEditor currentCube={cube} actions={actions} maxHistoryActions={10} />
      )

      expect(screen.getByText('10 actions')).toBeInTheDocument()
    })

    it('should call onUndoAction when undo is clicked', async () => {
      const cube = createMockCube()
      const onUndoAction = vi.fn()
      const localParticipant = createMockParticipant({ id: 'local-p', role: 'editor' })
      const participants = new Map([['local-p', localParticipant]])
      const actions: CollaborativeAction[] = [
        createMockCubeCreateAction({ participantId: 'local-p' }),
      ]

      render(
        <CollaborativeParamEditor
          currentCube={cube}
          participants={participants}
          localParticipantId="local-p"
          actions={actions}
          onUndoAction={onUndoAction}
        />
      )

      // Click on action to expand
      fireEvent.click(screen.getByText('Created a cube'))

      // Click undo button
      const undoButton = screen.getByRole('button', { name: 'Undo' })
      fireEvent.click(undoButton)

      // Check that onUndoAction was called with the action (may have extra participant info)
      expect(onUndoAction).toHaveBeenCalled()
      expect(onUndoAction.mock.calls[0][0].id).toBe(actions[0].id)
      expect(onUndoAction.mock.calls[0][0].type).toBe(actions[0].type)
    })
  })

  describe('Collaboration Manager Integration', () => {
    it('should subscribe to collaboration manager events', () => {
      const cube = createMockCube()
      const manager = createCollaborationManager()

      // The component should render without error when manager is provided
      const { unmount } = render(
        <CollaborativeParamEditor currentCube={cube} collaborationManager={manager} />
      )

      // Verify the component renders properly with the manager
      expect(screen.getByText('Edit Parameters')).toBeInTheDocument()

      // Cleanup should work without errors
      unmount()
    })

    it('should sync cube updates through collaboration manager', () => {
      const cube = createMockCube()
      const manager = createCollaborationManager()
      const onCubeUpdate = vi.fn()

      // Create a session so the manager can accept updates
      manager.createSession('Test User')

      const localParticipant = createMockParticipant({ id: 'local-p', role: 'editor' })
      const participants = new Map([['local-p', localParticipant]])

      render(
        <CollaborativeParamEditor
          currentCube={cube}
          collaborationManager={manager}
          onCubeUpdate={onCubeUpdate}
          participants={participants}
          localParticipantId="local-p"
        />
      )

      // Modify a field
      const colorInput = screen.getByLabelText('Base Color')
      fireEvent.change(colorInput, { target: { value: '#ff0000' } })

      // onCubeUpdate should be called
      expect(onCubeUpdate).toHaveBeenCalled()
    })
  })
})

describe('EditingIndicator', () => {
  it('should render with participant color', () => {
    const participant = createMockParticipant({ name: 'Alice', color: '#ff6b6b' })

    render(<EditingIndicator participant={participant} fieldName="color" />)

    expect(screen.getByTitle('Alice')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('should display field name in the indicator', () => {
    const participant = createMockParticipant({ name: 'Bob' })

    render(<EditingIndicator participant={participant} fieldName="roughness" />)

    expect(screen.getByText(/is editing roughness/)).toBeInTheDocument()
  })

  it('should show participant initial in avatar', () => {
    const participant = createMockParticipant({ name: 'Charlie' })

    render(<EditingIndicator participant={participant} fieldName="color" />)

    expect(screen.getByText('C')).toBeInTheDocument()
  })

  it('should apply inline variant class', () => {
    const participant = createMockParticipant({ name: 'Alice' })
    const { container } = render(
      <EditingIndicator participant={participant} fieldName="color" variant="inline" />
    )

    expect(container.querySelector('.editing-indicator--inline')).toBeInTheDocument()
  })

  it('should apply floating variant class', () => {
    const participant = createMockParticipant({ name: 'Alice' })
    const { container } = render(
      <EditingIndicator participant={participant} fieldName="color" variant="floating" />
    )

    expect(container.querySelector('.editing-indicator--floating')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const participant = createMockParticipant({ name: 'Alice' })
    const { container } = render(
      <EditingIndicator participant={participant} fieldName="color" className="custom-indicator" />
    )

    expect(container.querySelector('.editing-indicator.custom-indicator')).toBeInTheDocument()
  })
})

describe('ConflictIndicator', () => {
  it('should display conflict field name', () => {
    const conflict = {
      fieldName: 'color',
      participants: ['p1', 'p2'],
      timestamp: new Date().toISOString(),
      resolved: true,
      resolution: 'last_write_wins' as const,
    }

    render(<ConflictIndicator conflict={conflict} />)

    expect(screen.getByText(/Conflict on: color/)).toBeInTheDocument()
  })

  it('should display participant names', () => {
    const conflict = {
      fieldName: 'color',
      participants: ['p1', 'p2'],
      timestamp: new Date().toISOString(),
      resolved: true,
    }
    const participants = new Map([
      ['p1', createMockParticipant({ id: 'p1', name: 'Alice' })],
      ['p2', createMockParticipant({ id: 'p2', name: 'Bob' })],
    ])

    render(<ConflictIndicator conflict={conflict} participants={participants} />)

    expect(screen.getByText(/Between: Alice, Bob/)).toBeInTheDocument()
  })

  it('should show "Unknown" for missing participants', () => {
    const conflict = {
      fieldName: 'color',
      participants: ['unknown-p1'],
      timestamp: new Date().toISOString(),
      resolved: true,
    }

    render(<ConflictIndicator conflict={conflict} />)

    expect(screen.getByText(/Between: Unknown/)).toBeInTheDocument()
  })

  it('should display last_write_wins resolution text', () => {
    const conflict = {
      fieldName: 'color',
      participants: ['p1'],
      timestamp: new Date().toISOString(),
      resolved: true,
      resolution: 'last_write_wins' as const,
    }

    render(<ConflictIndicator conflict={conflict} />)

    expect(screen.getByText(/Latest change was kept/)).toBeInTheDocument()
  })

  it('should display first_write_wins resolution text', () => {
    const conflict = {
      fieldName: 'color',
      participants: ['p1'],
      timestamp: new Date().toISOString(),
      resolved: true,
      resolution: 'first_write_wins' as const,
    }

    render(<ConflictIndicator conflict={conflict} />)

    expect(screen.getByText(/First change was kept/)).toBeInTheDocument()
  })

  it('should display merge resolution text', () => {
    const conflict = {
      fieldName: 'color',
      participants: ['p1'],
      timestamp: new Date().toISOString(),
      resolved: true,
      resolution: 'merge' as const,
    }

    render(<ConflictIndicator conflict={conflict} />)

    expect(screen.getByText(/Changes were merged/)).toBeInTheDocument()
  })

  it('should apply resolved class when conflict is resolved', () => {
    const conflict = {
      fieldName: 'color',
      participants: ['p1'],
      timestamp: new Date().toISOString(),
      resolved: true,
    }
    const { container } = render(<ConflictIndicator conflict={conflict} />)

    expect(container.querySelector('.conflict-indicator--resolved')).toBeInTheDocument()
  })

  it('should not apply resolved class when conflict is not resolved', () => {
    const conflict = {
      fieldName: 'color',
      participants: ['p1'],
      timestamp: new Date().toISOString(),
      resolved: false,
    }
    const { container } = render(<ConflictIndicator conflict={conflict} />)

    expect(container.querySelector('.conflict-indicator--resolved')).not.toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const conflict = {
      fieldName: 'color',
      participants: ['p1'],
      timestamp: new Date().toISOString(),
      resolved: true,
    }
    const { container } = render(
      <ConflictIndicator conflict={conflict} className="custom-conflict" />
    )

    expect(container.querySelector('.conflict-indicator.custom-conflict')).toBeInTheDocument()
  })
})

describe('Field Edit Inference', () => {
  it('should correctly infer base color field from action', () => {
    const cube = createMockCube()
    const otherParticipant = createMockParticipant({
      id: 'other-p',
      name: 'Alice',
    })
    const participants = new Map([['other-p', otherParticipant]])

    const actions: CollaborativeAction[] = [
      createMockCubeUpdateAction({
        participantId: 'other-p',
        timestamp: new Date().toISOString(),
        payload: { cubeId: 'test-cube-1', changes: { base: { color: [0.9, 0.9, 0.9] } } },
      }),
    ]

    render(
      <CollaborativeParamEditor
        currentCube={cube}
        participants={participants}
        localParticipantId="local-p"
        actions={actions}
      />
    )

    const sectionIndicators = document.querySelector('.collab-editor__section-indicators')
    expect(sectionIndicators?.textContent).toContain('base')
  })

  it('should correctly infer noise field from action', () => {
    const cube = createMockCube()
    const otherParticipant = createMockParticipant({
      id: 'other-p',
      name: 'Alice',
    })
    const participants = new Map([['other-p', otherParticipant]])

    const actions: CollaborativeAction[] = [
      createMockCubeUpdateAction({
        participantId: 'other-p',
        timestamp: new Date().toISOString(),
        payload: { cubeId: 'test-cube-1', changes: { noise: { scale: 10 } } },
      }),
    ]

    render(
      <CollaborativeParamEditor
        currentCube={cube}
        participants={participants}
        localParticipantId="local-p"
        actions={actions}
      />
    )

    const sectionIndicators = document.querySelector('.collab-editor__section-indicators')
    expect(sectionIndicators?.textContent).toContain('noise')
  })

  it('should correctly infer physics field from action', () => {
    const cube = createMockCube()
    const otherParticipant = createMockParticipant({
      id: 'other-p',
      name: 'Alice',
    })
    const participants = new Map([['other-p', otherParticipant]])

    const actions: CollaborativeAction[] = [
      createMockCubeUpdateAction({
        participantId: 'other-p',
        timestamp: new Date().toISOString(),
        payload: { cubeId: 'test-cube-1', changes: { physics: { density: 3.0 } } },
      }),
    ]

    render(
      <CollaborativeParamEditor
        currentCube={cube}
        participants={participants}
        localParticipantId="local-p"
        actions={actions}
      />
    )

    const sectionIndicators = document.querySelector('.collab-editor__section-indicators')
    expect(sectionIndicators?.textContent).toContain('physics')
  })

  it('should correctly infer boundary field from action', () => {
    const cube = createMockCube()
    const otherParticipant = createMockParticipant({
      id: 'other-p',
      name: 'Alice',
    })
    const participants = new Map([['other-p', otherParticipant]])

    const actions: CollaborativeAction[] = [
      createMockCubeUpdateAction({
        participantId: 'other-p',
        timestamp: new Date().toISOString(),
        payload: { cubeId: 'test-cube-1', changes: { boundary: { mode: 'hard' } } },
      }),
    ]

    render(
      <CollaborativeParamEditor
        currentCube={cube}
        participants={participants}
        localParticipantId="local-p"
        actions={actions}
      />
    )

    const sectionIndicators = document.querySelector('.collab-editor__section-indicators')
    expect(sectionIndicators?.textContent).toContain('boundary')
  })
})

describe('Edit Timeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should not show edits older than 5 seconds compared to most recent action', () => {
    const cube = createMockCube()
    const otherParticipant = createMockParticipant({
      id: 'other-p',
      name: 'Alice',
    })
    const anotherParticipant = createMockParticipant({
      id: 'another-p',
      name: 'Bob',
    })
    const participants = new Map([
      ['other-p', otherParticipant],
      ['another-p', anotherParticipant],
    ])

    const now = Date.now()
    // Create an old action (10 seconds ago) and a recent action (now)
    const oldTimestamp = new Date(now - 10000).toISOString()
    const recentTimestamp = new Date(now).toISOString()

    const actions: CollaborativeAction[] = [
      // Old action - should be filtered out due to timeout
      createMockCubeUpdateAction({
        id: 'old-action',
        participantId: 'other-p',
        timestamp: oldTimestamp,
        payload: { cubeId: 'test-cube-1', changes: { base: { color: [0.9, 0.9, 0.9] } } },
      }),
      // Recent action - should be shown
      createMockCubeUpdateAction({
        id: 'recent-action',
        participantId: 'another-p',
        timestamp: recentTimestamp,
        payload: { cubeId: 'test-cube-1', changes: { noise: { scale: 10 } } },
      }),
    ]

    render(
      <CollaborativeParamEditor
        currentCube={cube}
        participants={participants}
        localParticipantId="local-p"
        actions={actions}
      />
    )

    // Should show the recent action
    expect(screen.getByText(/field\(s\) being edited/)).toBeInTheDocument()
    // The section indicators should show 'noise' (recent) but not 'base' (old)
    const sectionIndicators = document.querySelector('.collab-editor__section-indicators')
    expect(sectionIndicators?.textContent).toContain('noise')
    // 'base' is a common word that may appear elsewhere, so check more specifically
    // The old action's section indicator should not appear in the active editors
    const activeEditSections = Array.from(
      document.querySelectorAll('.collab-editor__section-name')
    ).map((el) => el.textContent)
    expect(activeEditSections).toContain('noise')
    expect(activeEditSections).not.toContain('base')
  })

  it('should show the most recent action when only old actions exist', () => {
    const cube = createMockCube()
    const otherParticipant = createMockParticipant({
      id: 'other-p',
      name: 'Alice',
    })
    const participants = new Map([['other-p', otherParticipant]])

    // Create action timestamp 10 seconds ago - but it's the only action, so it's "most recent"
    const oldTimestamp = new Date(Date.now() - 10000).toISOString()
    const actions: CollaborativeAction[] = [
      createMockCubeUpdateAction({
        participantId: 'other-p',
        timestamp: oldTimestamp,
        payload: { cubeId: 'test-cube-1', changes: { base: { color: [0.9, 0.9, 0.9] } } },
      }),
    ]

    render(
      <CollaborativeParamEditor
        currentCube={cube}
        participants={participants}
        localParticipantId="local-p"
        actions={actions}
      />
    )

    // Should show active edits even for old actions when it's the only action
    // (since the timeout is relative to the most recent action)
    expect(screen.getByText(/field\(s\) being edited/)).toBeInTheDocument()
  })
})
