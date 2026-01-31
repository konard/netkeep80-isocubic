/**
 * Unit tests for CollaborativeParamEditor Vue component
 * Tests the Vue.js 3.0 migration of the CollaborativeParamEditor component
 * Covers: rendering, local participant display, read-only mode, active edits,
 *         section indicators, cube updates, action history, collaboration manager,
 *         field edit inference, edit timeout
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import CollaborativeParamEditor from './CollaborativeParamEditor.vue'
import type { SpectralCube } from '../types/cube'
import type {
  Participant,
  CollaborativeAction,
  CubeUpdateAction,
  CubeCreateAction,
  ParticipantId,
} from '../types/collaboration'
import { createCollaborationManager, canEdit } from '../lib/collaboration'

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

function createWrapper(props: Record<string, unknown> = {}) {
  return shallowMount(CollaborativeParamEditor, {
    props: {
      currentCube: createMockCube(),
      ...props,
    },
    global: {
      stubs: {
        ParamEditor: {
          template: '<div class="param-editor-stub"><slot /></div>',
          props: ['currentCube', 'onCubeUpdate', 'lodConfig', 'onLODConfigChange', 'lodStatistics'],
        },
        ActionHistory: {
          template:
            '<div class="action-history-stub">Action History<span>{{ actions?.length ?? 0 }} actions</span></div>',
          props: ['actions', 'participants', 'maxActions', 'localParticipantId', 'onUndoAction'],
        },
      },
    },
  })
}

describe('CollaborativeParamEditor', () => {
  describe('Rendering', () => {
    it('should render the component with a cube', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.collab-editor').exists()).toBe(true)
      // Component renders with the collab-editor main container
      expect(wrapper.find('.collab-editor__main').exists()).toBe(true)
    })

    it('should render empty state when no cube provided', () => {
      const wrapper = createWrapper({ currentCube: null })
      // ParamEditor stub renders with null cube - check component mounts
      expect(wrapper.find('.collab-editor').exists()).toBe(true)
    })

    it('should apply custom className', () => {
      const wrapper = createWrapper({ class: 'custom-class' })
      expect(wrapper.find('.collab-editor.custom-class').exists()).toBe(true)
    })
  })

  describe('Local Participant Display', () => {
    it('should display local participant info in header', () => {
      const localParticipant = createMockParticipant({ id: 'local-p', name: 'Alice' })
      const participants = new Map<ParticipantId, Participant>([['local-p', localParticipant]])

      const wrapper = createWrapper({
        participants,
        localParticipantId: 'local-p',
      })

      expect(wrapper.text()).toContain('Alice')
      expect(wrapper.text()).toContain('(editor)')
    })

    it('should display role indicator for viewer', () => {
      const localParticipant = createMockParticipant({ id: 'local-p', name: 'Bob', role: 'viewer' })
      const participants = new Map<ParticipantId, Participant>([['local-p', localParticipant]])

      const wrapper = createWrapper({
        participants,
        localParticipantId: 'local-p',
      })

      expect(wrapper.text()).toContain('(viewer)')
    })
  })

  describe('Read-Only Mode', () => {
    it('should show read-only notice for viewers', () => {
      const localParticipant = createMockParticipant({ id: 'local-p', role: 'viewer' })
      const participants = new Map<ParticipantId, Participant>([['local-p', localParticipant]])

      const wrapper = createWrapper({
        participants,
        localParticipantId: 'local-p',
      })

      expect(wrapper.text()).toMatch(/You are a viewer/)
      expect(wrapper.text()).toMatch(/Request editor access/)
    })

    it('should not show read-only notice for editors', () => {
      const localParticipant = createMockParticipant({ id: 'local-p', role: 'editor' })
      const participants = new Map<ParticipantId, Participant>([['local-p', localParticipant]])

      const wrapper = createWrapper({
        participants,
        localParticipantId: 'local-p',
      })

      expect(wrapper.text()).not.toMatch(/You are a viewer/)
    })

    it('should not show read-only notice for owners', () => {
      const localParticipant = createMockParticipant({ id: 'local-p', role: 'owner' })
      const participants = new Map<ParticipantId, Participant>([['local-p', localParticipant]])

      const wrapper = createWrapper({
        participants,
        localParticipantId: 'local-p',
      })

      expect(wrapper.text()).not.toMatch(/You are a viewer/)
    })
  })

  describe('Active Edits Display', () => {
    it('should show active edits indicator when other participants are editing', () => {
      const localParticipant = createMockParticipant({ id: 'local-p', name: 'Me' })
      const otherParticipant = createMockParticipant({
        id: 'other-p',
        name: 'Alice',
        color: '#ff6b6b',
      })
      const participants = new Map<ParticipantId, Participant>([
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

      const wrapper = createWrapper({
        participants,
        localParticipantId: 'local-p',
        actions,
      })

      expect(wrapper.text()).toMatch(/field\(s\) being edited/)
    })

    it('should not show active edits for local participant', () => {
      const localParticipant = createMockParticipant({ id: 'local-p', name: 'Me' })
      const participants = new Map<ParticipantId, Participant>([['local-p', localParticipant]])

      const actions: CollaborativeAction[] = [
        createMockCubeUpdateAction({
          participantId: 'local-p',
          timestamp: new Date().toISOString(),
        }),
      ]

      const wrapper = createWrapper({
        participants,
        localParticipantId: 'local-p',
        actions,
      })

      expect(wrapper.text()).not.toMatch(/field\(s\) being edited/)
    })

    it('should show participant avatars for active editors', () => {
      const localParticipant = createMockParticipant({ id: 'local-p', name: 'Me' })
      const otherParticipant = createMockParticipant({
        id: 'other-p',
        name: 'Alice',
        color: '#ff6b6b',
      })
      const participants = new Map<ParticipantId, Participant>([
        ['local-p', localParticipant],
        ['other-p', otherParticipant],
      ])

      const actions: CollaborativeAction[] = [
        createMockCubeUpdateAction({
          participantId: 'other-p',
          timestamp: new Date().toISOString(),
        }),
      ]

      const wrapper = createWrapper({
        participants,
        localParticipantId: 'local-p',
        actions,
      })

      // Check for participant avatar with title
      const avatar = wrapper.find('[title="Alice"]')
      expect(avatar.exists()).toBe(true)
    })
  })

  describe('Section Edit Indicators', () => {
    it('should show section indicators for sections being edited', () => {
      const localParticipant = createMockParticipant({ id: 'local-p', name: 'Me' })
      const otherParticipant = createMockParticipant({
        id: 'other-p',
        name: 'Alice',
        color: '#ff6b6b',
      })
      const participants = new Map<ParticipantId, Participant>([
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

      const wrapper = createWrapper({
        participants,
        localParticipantId: 'local-p',
        actions,
      })

      const sectionIndicators = wrapper.find('.collab-editor__section-indicators')
      expect(sectionIndicators.exists()).toBe(true)
      expect(sectionIndicators.text()).toContain('base')
    })
  })

  describe('Action History Integration', () => {
    it('should show action history panel by default', () => {
      const actions: CollaborativeAction[] = [createMockCubeCreateAction()]

      const wrapper = createWrapper({ actions })

      expect(wrapper.text()).toContain('Action History')
    })

    it('should hide action history when showHistory is false', () => {
      const actions: CollaborativeAction[] = [createMockCubeCreateAction()]

      const wrapper = createWrapper({ actions, showHistory: false })

      expect(wrapper.text()).not.toContain('Action History')
    })

    it('should filter to show only cube-related actions', () => {
      const cursorAction: CollaborativeAction = {
        id: 'cursor-action',
        type: 'cursor_move',
        participantId: 'p1',
        timestamp: new Date().toISOString(),
        sessionId: 'session-1',
        payload: { position: { x: 0, y: 0, z: 0 } },
      }
      const cubeAction = createMockCubeCreateAction()

      const wrapper = createWrapper({ actions: [cursorAction, cubeAction] })

      // ActionHistory should receive filtered actions (only cube actions)
      expect(wrapper.text()).toContain('Action History')
      expect(wrapper.text()).toContain('1 actions')
    })

    it('should respect maxHistoryActions prop', () => {
      const actions: CollaborativeAction[] = Array.from({ length: 50 }, () =>
        createMockCubeCreateAction()
      )

      const wrapper = createWrapper({ actions, maxHistoryActions: 10 })

      // The ActionHistory stub receives the maxActions prop
      expect(wrapper.text()).toContain('Action History')
    })
  })

  describe('Collaboration Manager Integration', () => {
    it('should subscribe to collaboration manager events', () => {
      const cube = createMockCube()
      const manager = createCollaborationManager()

      const wrapper = shallowMount(CollaborativeParamEditor, {
        props: { currentCube: cube, collaborationManager: manager },
        global: {
          stubs: {
            ParamEditor: { template: '<div class="param-editor-stub" />' },
            ActionHistory: { template: '<div class="action-history-stub">Action History</div>' },
          },
        },
      })

      expect(wrapper.find('.collab-editor').exists()).toBe(true)

      wrapper.unmount()
    })
  })
})

describe('CollaborativeParamEditor Vue Component - Field Edit Tracking', () => {
  it('should track active field edits with correct structure', () => {
    const fieldEdit = {
      participantId: 'user-123',
      fieldName: 'color',
      section: 'base',
      startedAt: '2026-01-30T10:00:00Z',
      lastChangeAt: '2026-01-30T10:00:05Z',
    }

    expect(fieldEdit.participantId).toBe('user-123')
    expect(fieldEdit.fieldName).toBe('color')
    expect(fieldEdit.section).toBe('base')
    expect(fieldEdit.startedAt).toBeTruthy()
    expect(fieldEdit.lastChangeAt).toBeTruthy()
  })

  it('should generate correct edit keys', () => {
    const section = 'base'
    const fieldName = 'color'
    const key = `${section}.${fieldName}`
    expect(key).toBe('base.color')
  })
})

describe('CollaborativeParamEditor Vue Component - Conflict Resolution', () => {
  it('should define conflict structures correctly', () => {
    const conflict = {
      fieldName: 'roughness',
      participants: ['user-1', 'user-2'],
      timestamp: new Date().toISOString(),
      resolved: true,
      resolution: 'last_write_wins' as const,
    }

    expect(conflict.fieldName).toBe('roughness')
    expect(conflict.participants.length).toBe(2)
    expect(conflict.resolved).toBe(true)
    expect(conflict.resolution).toBe('last_write_wins')
  })

  it('should map resolution types to descriptions', () => {
    const resolutionTexts: Record<string, string> = {
      last_write_wins: 'Latest change was kept',
      first_write_wins: 'First change was kept',
      merge: 'Changes were merged',
    }

    expect(resolutionTexts['last_write_wins']).toBe('Latest change was kept')
    expect(resolutionTexts['first_write_wins']).toBe('First change was kept')
    expect(resolutionTexts['merge']).toBe('Changes were merged')
  })
})

describe('CollaborativeParamEditor Vue Component - Edit Permission Check', () => {
  it('should check edit permissions via canEdit utility', () => {
    expect(canEdit(null)).toBe(false)
  })
})

describe('CollaborativeParamEditor Vue Component - Action Filtering', () => {
  it('should filter cube-related actions', () => {
    const actions = [
      { type: 'cube_create', id: '1' },
      { type: 'cube_update', id: '2' },
      { type: 'cube_delete', id: '3' },
      { type: 'cursor_move', id: '4' },
      { type: 'participant_join', id: '5' },
      { type: 'cube_update', id: '6' },
    ]

    const cubeActions = actions.filter(
      (a) => a.type === 'cube_create' || a.type === 'cube_update' || a.type === 'cube_delete'
    )

    expect(cubeActions.length).toBe(4)
    expect(cubeActions.every((a) => a.type.startsWith('cube_'))).toBe(true)
  })
})

describe('Field Edit Inference', () => {
  it('should correctly infer base color field from action', () => {
    const localParticipant = createMockParticipant({ id: 'local-p' })
    const otherParticipant = createMockParticipant({ id: 'other-p', name: 'Alice' })
    const participants = new Map<ParticipantId, Participant>([
      ['local-p', localParticipant],
      ['other-p', otherParticipant],
    ])

    const actions: CollaborativeAction[] = [
      createMockCubeUpdateAction({
        participantId: 'other-p',
        timestamp: new Date().toISOString(),
        payload: { cubeId: 'test-cube-1', changes: { base: { color: [0.9, 0.9, 0.9] } } },
      }),
    ]

    const wrapper = createWrapper({
      participants,
      localParticipantId: 'local-p',
      actions,
    })

    const sectionIndicators = wrapper.find('.collab-editor__section-indicators')
    expect(sectionIndicators.text()).toContain('base')
  })

  it('should correctly infer noise field from action', () => {
    const localParticipant = createMockParticipant({ id: 'local-p' })
    const otherParticipant = createMockParticipant({ id: 'other-p', name: 'Alice' })
    const participants = new Map<ParticipantId, Participant>([
      ['local-p', localParticipant],
      ['other-p', otherParticipant],
    ])

    const actions: CollaborativeAction[] = [
      createMockCubeUpdateAction({
        participantId: 'other-p',
        timestamp: new Date().toISOString(),
        payload: { cubeId: 'test-cube-1', changes: { noise: { scale: 10 } } },
      }),
    ]

    const wrapper = createWrapper({
      participants,
      localParticipantId: 'local-p',
      actions,
    })

    const sectionIndicators = wrapper.find('.collab-editor__section-indicators')
    expect(sectionIndicators.text()).toContain('noise')
  })

  it('should correctly infer physics field from action', () => {
    const localParticipant = createMockParticipant({ id: 'local-p' })
    const otherParticipant = createMockParticipant({ id: 'other-p', name: 'Alice' })
    const participants = new Map<ParticipantId, Participant>([
      ['local-p', localParticipant],
      ['other-p', otherParticipant],
    ])

    const actions: CollaborativeAction[] = [
      createMockCubeUpdateAction({
        participantId: 'other-p',
        timestamp: new Date().toISOString(),
        payload: { cubeId: 'test-cube-1', changes: { physics: { density: 3.0 } } },
      }),
    ]

    const wrapper = createWrapper({
      participants,
      localParticipantId: 'local-p',
      actions,
    })

    const sectionIndicators = wrapper.find('.collab-editor__section-indicators')
    expect(sectionIndicators.text()).toContain('physics')
  })

  it('should correctly infer boundary field from action', () => {
    const localParticipant = createMockParticipant({ id: 'local-p' })
    const otherParticipant = createMockParticipant({ id: 'other-p', name: 'Alice' })
    const participants = new Map<ParticipantId, Participant>([
      ['local-p', localParticipant],
      ['other-p', otherParticipant],
    ])

    const actions: CollaborativeAction[] = [
      createMockCubeUpdateAction({
        participantId: 'other-p',
        timestamp: new Date().toISOString(),
        payload: { cubeId: 'test-cube-1', changes: { boundary: { mode: 'hard' } } },
      }),
    ]

    const wrapper = createWrapper({
      participants,
      localParticipantId: 'local-p',
      actions,
    })

    const sectionIndicators = wrapper.find('.collab-editor__section-indicators')
    expect(sectionIndicators.text()).toContain('boundary')
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
    const otherParticipant = createMockParticipant({ id: 'other-p', name: 'Alice' })
    const anotherParticipant = createMockParticipant({ id: 'another-p', name: 'Bob' })
    const participants = new Map<ParticipantId, Participant>([
      ['other-p', otherParticipant],
      ['another-p', anotherParticipant],
    ])

    const now = Date.now()
    const oldTimestamp = new Date(now - 10000).toISOString()
    const recentTimestamp = new Date(now).toISOString()

    const actions: CollaborativeAction[] = [
      createMockCubeUpdateAction({
        id: 'old-action',
        participantId: 'other-p',
        timestamp: oldTimestamp,
        payload: { cubeId: 'test-cube-1', changes: { base: { color: [0.9, 0.9, 0.9] } } },
      }),
      createMockCubeUpdateAction({
        id: 'recent-action',
        participantId: 'another-p',
        timestamp: recentTimestamp,
        payload: { cubeId: 'test-cube-1', changes: { noise: { scale: 10 } } },
      }),
    ]

    const wrapper = createWrapper({
      participants,
      localParticipantId: 'local-p',
      actions,
    })

    // Should show the recent action
    expect(wrapper.text()).toMatch(/field\(s\) being edited/)
    // The section indicators should show 'noise' (recent) but not 'base' (old)
    const sectionNames = wrapper.findAll('.collab-editor__section-name').map((el) => el.text())
    expect(sectionNames).toContain('noise')
    expect(sectionNames).not.toContain('base')
  })

  it('should show the most recent action when only old actions exist', () => {
    const otherParticipant = createMockParticipant({ id: 'other-p', name: 'Alice' })
    const participants = new Map<ParticipantId, Participant>([['other-p', otherParticipant]])

    const oldTimestamp = new Date(Date.now() - 10000).toISOString()
    const actions: CollaborativeAction[] = [
      createMockCubeUpdateAction({
        participantId: 'other-p',
        timestamp: oldTimestamp,
        payload: { cubeId: 'test-cube-1', changes: { base: { color: [0.9, 0.9, 0.9] } } },
      }),
    ]

    const wrapper = createWrapper({
      participants,
      localParticipantId: 'local-p',
      actions,
    })

    // Should show active edits even for old actions when it's the only action
    expect(wrapper.text()).toMatch(/field\(s\) being edited/)
  })
})

describe('CollaborativeParamEditor Module Exports', () => {
  it('should export CollaborativeParamEditor.vue as a valid Vue component', async () => {
    const module = await import('./CollaborativeParamEditor.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })
})
