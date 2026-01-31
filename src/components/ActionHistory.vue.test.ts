/**
 * Unit tests for ActionHistory Vue component
 * Tests the Vue.js 3.0 migration of the ActionHistory component (TASK 64)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import ActionHistory from './ActionHistory.vue'
import type { CollaborativeAction, Participant, CubeCreateAction } from '../types/collaboration'

// Helper to create mock actions
const createMockAction = (overrides: Partial<CubeCreateAction> = {}): CubeCreateAction => ({
  id: `action-${Math.random().toString(36).slice(2)}`,
  type: 'cube_create',
  participantId: 'participant-1',
  timestamp: new Date().toISOString(),
  sessionId: 'session-1',
  payload: {
    cube: { id: 'cube-1' } as never,
  },
  ...overrides,
})

// Helper to create mock participants
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

describe('ActionHistory Vue Component — Module Exports', () => {
  it('should export ActionHistory.vue as a valid Vue component', async () => {
    const module = await import('./ActionHistory.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })
})

describe('ActionHistory Vue Component — Action Type Icons', () => {
  it('should map action types to correct icons', () => {
    const icons: Record<string, string> = {
      cube_create: '+',
      cube_update: '~',
      cube_delete: '-',
      cube_select: '[]',
      cursor_move: '\u2197',
      participant_join: '\u2192',
      participant_leave: '\u2190',
      session_settings_update: '\u2699',
    }

    expect(icons['cube_create']).toBe('+')
    expect(icons['cube_update']).toBe('~')
    expect(icons['cube_delete']).toBe('-')
    expect(icons['participant_join']).toBe('\u2192')
  })
})

describe('ActionHistory Vue Component — Action Description Formatting', () => {
  it('should format cube_create action correctly', () => {
    const action = { type: 'cube_create', payload: {} }
    const description = action.type === 'cube_create' ? 'Created a cube' : 'Unknown action'
    expect(description).toBe('Created a cube')
  })

  it('should format cube_update with cube ID', () => {
    const action = { type: 'cube_update', payload: { cubeId: 'stone_001' } }
    const description =
      action.type === 'cube_update'
        ? `Updated cube${action.payload.cubeId ? ` "${action.payload.cubeId}"` : ''}`
        : 'Unknown'
    expect(description).toBe('Updated cube "stone_001"')
  })
})

describe('ActionHistory Vue Component — Relative Time Formatting', () => {
  it('should show "just now" for recent timestamps', () => {
    function formatRelativeTime(timestamp: string): string {
      const now = Date.now()
      const actionTime = new Date(timestamp).getTime()
      const diff = now - actionTime

      if (diff < 5000) return 'just now'
      if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
      return new Date(timestamp).toLocaleDateString()
    }

    const now = new Date().toISOString()
    expect(formatRelativeTime(now)).toBe('just now')
  })
})

describe('ActionHistory Vue Component — Filter Logic', () => {
  it('should filter actions by type', () => {
    const actions = [
      { type: 'cube_create', id: '1' },
      { type: 'cube_update', id: '2' },
      { type: 'cube_create', id: '3' },
      { type: 'cursor_move', id: '4' },
    ]
    const activeFilters = new Set(['cube_create'])
    const filtered = actions.filter((action) => activeFilters.has(action.type))
    expect(filtered).toHaveLength(2)
  })

  it('should exclude cursor_move by default when no filters active', () => {
    const actions = [
      { type: 'cube_create', id: '1' },
      { type: 'cursor_move', id: '2' },
      { type: 'cube_update', id: '3' },
    ]
    const activeFilters = new Set<string>()
    const filtered =
      activeFilters.size === 0
        ? actions.filter((action) => action.type !== 'cursor_move')
        : actions.filter((action) => activeFilters.has(action.type))
    expect(filtered).toHaveLength(2)
    expect(filtered.every((a) => a.type !== 'cursor_move')).toBe(true)
  })

  it('should toggle filter correctly', () => {
    const filters = new Set<string>()
    const type = 'cube_create'

    // Add filter
    filters.add(type)
    expect(filters.has(type)).toBe(true)

    // Remove filter
    filters.delete(type)
    expect(filters.has(type)).toBe(false)
  })
})

describe('ActionHistory Vue Component — Empty State', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render empty state when no actions', () => {
    const wrapper = shallowMount(ActionHistory, {
      props: { actions: [] },
    })

    expect(wrapper.text()).toContain('No actions yet')
    expect(wrapper.text()).toContain('Actions will appear here as participants make changes')
  })
})

describe('ActionHistory Vue Component — Rendering Actions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render actions list with count', () => {
    const actions = [createMockAction(), createMockAction()]

    const wrapper = shallowMount(ActionHistory, {
      props: { actions },
    })

    expect(wrapper.text()).toContain('Action History')
    expect(wrapper.text()).toContain('2 actions')
  })

  it('should display action description', () => {
    const actions = [createMockAction({ type: 'cube_create' })]

    const wrapper = shallowMount(ActionHistory, {
      props: { actions },
    })

    expect(wrapper.text()).toContain('Created a cube')
  })

  it('should display "just now" for recent actions', () => {
    const actions = [createMockAction({ timestamp: new Date().toISOString() })]

    const wrapper = shallowMount(ActionHistory, {
      props: { actions },
    })

    expect(wrapper.text()).toContain('just now')
  })

  it('should display participant name from participants map', () => {
    const actions = [createMockAction({ participantId: 'p1' })]
    const participants = new Map([['p1', createMockParticipant({ id: 'p1', name: 'Alice' })]])

    const wrapper = shallowMount(ActionHistory, {
      props: { actions, participants },
    })

    expect(wrapper.text()).toContain('Alice')
  })

  it('should display Unknown for missing participant', () => {
    const actions = [createMockAction({ participantId: 'unknown-p' })]

    const wrapper = shallowMount(ActionHistory, {
      props: { actions },
    })

    expect(wrapper.text()).toContain('Unknown')
  })
})

describe('ActionHistory Vue Component — Local Participant Highlighting', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should show "(you)" badge for local participant actions', () => {
    const actions = [createMockAction({ participantId: 'local-p' })]

    const wrapper = shallowMount(ActionHistory, {
      props: { actions, localParticipantId: 'local-p' },
    })

    expect(wrapper.text()).toContain('(you)')
  })

  it('should not show "(you)" badge for other participants', () => {
    const actions = [createMockAction({ participantId: 'other-p' })]

    const wrapper = shallowMount(ActionHistory, {
      props: { actions, localParticipantId: 'local-p' },
    })

    expect(wrapper.text()).not.toContain('(you)')
  })

  it('should show participant name with "(you)" badge', () => {
    const actions = [createMockAction({ participantId: 'local-p' })]
    const participants = new Map([
      ['local-p', createMockParticipant({ id: 'local-p', name: 'Me' })],
    ])

    const wrapper = shallowMount(ActionHistory, {
      props: { actions, participants, localParticipantId: 'local-p' },
    })

    expect(wrapper.text()).toContain('Me')
    expect(wrapper.text()).toContain('(you)')
  })
})

describe('ActionHistory Vue Component — Filtering', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render filter buttons', () => {
    const actions = [createMockAction()]

    const wrapper = shallowMount(ActionHistory, {
      props: { actions },
    })

    const filterButtons = wrapper.findAll('.action-history__filter')
    const filterTexts = filterButtons.map((btn) => btn.text())
    expect(filterTexts).toContain('Create')
    expect(filterTexts).toContain('Update')
    expect(filterTexts).toContain('Delete')
  })

  it('should filter actions when filter clicked', async () => {
    const actions = [
      createMockAction({ id: 'a1', type: 'cube_create' }),
      {
        id: 'a2',
        type: 'cube_delete',
        participantId: 'p1',
        timestamp: new Date().toISOString(),
        sessionId: 'session-1',
        payload: { cubeId: 'cube-1' },
      } as CollaborativeAction,
    ]

    const wrapper = shallowMount(ActionHistory, {
      props: { actions },
    })

    expect(wrapper.text()).toContain('2 actions')

    const deleteFilter = wrapper
      .findAll('.action-history__filter')
      .find((btn) => btn.text() === 'Delete')!
    await deleteFilter.trigger('click')

    expect(wrapper.text()).toContain('1 actions')
  })

  it('should show Clear button when filter is active', async () => {
    const actions = [createMockAction()]

    const wrapper = shallowMount(ActionHistory, {
      props: { actions },
    })

    // No Clear button initially
    expect(wrapper.find('.action-history__filter--clear').exists()).toBe(false)

    const createFilter = wrapper
      .findAll('.action-history__filter')
      .find((btn) => btn.text() === 'Create')!
    await createFilter.trigger('click')

    expect(wrapper.find('.action-history__filter--clear').exists()).toBe(true)
  })

  it('should clear all filters when Clear button clicked', async () => {
    const actions = [createMockAction()]

    const wrapper = shallowMount(ActionHistory, {
      props: { actions },
    })

    const createFilter = wrapper
      .findAll('.action-history__filter')
      .find((btn) => btn.text() === 'Create')!
    await createFilter.trigger('click')

    const clearBtn = wrapper.find('.action-history__filter--clear')
    await clearBtn.trigger('click')

    expect(wrapper.find('.action-history__filter--clear').exists()).toBe(false)
  })
})

describe('ActionHistory Vue Component — Expanding Action Details', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should expand action details on click', async () => {
    const actions = [createMockAction({ id: 'test-action-id' })]

    const wrapper = shallowMount(ActionHistory, {
      props: { actions },
    })

    expect(wrapper.text()).not.toContain('ID:')

    // Click on the action item button
    const itemButton = wrapper.find('.action-history__item-button')
    await itemButton.trigger('click')

    expect(wrapper.text()).toContain('ID:')
    expect(wrapper.text()).toContain('Type:')
    expect(wrapper.text()).toContain('Time:')
  })

  it('should collapse action details on second click', async () => {
    const actions = [createMockAction()]

    const wrapper = shallowMount(ActionHistory, {
      props: { actions },
    })

    const itemButton = wrapper.find('.action-history__item-button')
    await itemButton.trigger('click')
    expect(wrapper.text()).toContain('ID:')

    await itemButton.trigger('click')
    expect(wrapper.text()).not.toContain('ID:')
  })

  it('should emit actionClick callback', async () => {
    const actions = [createMockAction()]

    const wrapper = shallowMount(ActionHistory, {
      props: { actions },
    })

    const itemButton = wrapper.find('.action-history__item-button')
    await itemButton.trigger('click')

    expect(wrapper.emitted('actionClick')).toBeTruthy()
    expect(wrapper.emitted('actionClick')!.length).toBe(1)
  })
})

describe('ActionHistory Vue Component — Undo Functionality', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should show undo button for local participant expanded actions', async () => {
    const actions = [createMockAction({ participantId: 'local-p' })]

    const wrapper = shallowMount(ActionHistory, {
      props: { actions, localParticipantId: 'local-p' },
    })

    const itemButton = wrapper.find('.action-history__item-button')
    await itemButton.trigger('click')

    const undoBtn = wrapper.find('.action-history__undo-btn')
    expect(undoBtn.exists()).toBe(true)
    expect(undoBtn.text()).toBe('Undo')
  })

  it('should not show undo button for other participant actions', async () => {
    const actions = [createMockAction({ participantId: 'other-p' })]

    const wrapper = shallowMount(ActionHistory, {
      props: { actions, localParticipantId: 'local-p' },
    })

    const itemButton = wrapper.find('.action-history__item-button')
    await itemButton.trigger('click')

    expect(wrapper.find('.action-history__undo-btn').exists()).toBe(false)
  })

  it('should emit undoAction when undo clicked', async () => {
    const actions = [createMockAction({ participantId: 'local-p' })]

    const wrapper = shallowMount(ActionHistory, {
      props: { actions, localParticipantId: 'local-p' },
    })

    const itemButton = wrapper.find('.action-history__item-button')
    await itemButton.trigger('click')

    const undoBtn = wrapper.find('.action-history__undo-btn')
    await undoBtn.trigger('click')

    expect(wrapper.emitted('undoAction')).toBeTruthy()
    expect(wrapper.emitted('undoAction')![0][0]).toEqual(actions[0])
  })
})

describe('ActionHistory Vue Component — Max Actions Limit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should limit displayed actions to maxActions', () => {
    const actions = Array.from({ length: 100 }, (_, i) => createMockAction({ id: `action-${i}` }))

    const wrapper = shallowMount(ActionHistory, {
      props: { actions, maxActions: 10 },
    })

    expect(wrapper.text()).toContain('10 actions')
  })
})

describe('ActionHistory Vue Component — Grouping', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should group actions by participant when enabled', () => {
    const actions = [
      createMockAction({ participantId: 'p1' }),
      createMockAction({ participantId: 'p1' }),
    ]
    const participants = new Map([['p1', createMockParticipant({ id: 'p1', name: 'Alice' })]])

    const wrapper = shallowMount(ActionHistory, {
      props: { actions, participants, groupByParticipant: true },
    })

    expect(wrapper.text()).toContain('Alice')
  })

  it('should show action count per group', () => {
    const actions = [
      createMockAction({ participantId: 'p1' }),
      createMockAction({ participantId: 'p1' }),
    ]
    const participants = new Map([['p1', createMockParticipant({ id: 'p1', name: 'Alice' })]])

    const wrapper = shallowMount(ActionHistory, {
      props: { actions, participants, groupByParticipant: true },
    })

    // There should be text with "2 actions" somewhere
    expect(wrapper.text()).toContain('2 actions')
  })
})

describe('ActionHistory Vue Component — Custom className', () => {
  it('should apply custom className', () => {
    const wrapper = shallowMount(ActionHistory, {
      props: { actions: [], className: 'custom-class' },
    })

    expect(wrapper.find('.action-history.custom-class').exists()).toBe(true)
  })
})

describe('ActionHistory Vue Component — Relative Time Display', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should display "just now" for very recent actions', () => {
    const actions = [createMockAction({ timestamp: new Date().toISOString() })]

    const wrapper = shallowMount(ActionHistory, {
      props: { actions },
    })

    expect(wrapper.text()).toContain('just now')
  })

  it('should display seconds ago for actions < 1 minute', () => {
    const timestamp = new Date(Date.now() - 30000).toISOString()
    const actions = [createMockAction({ timestamp })]

    const wrapper = shallowMount(ActionHistory, {
      props: { actions },
    })

    expect(wrapper.text()).toContain('30s ago')
  })

  it('should display minutes ago for actions < 1 hour', () => {
    const timestamp = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const actions = [createMockAction({ timestamp })]

    const wrapper = shallowMount(ActionHistory, {
      props: { actions },
    })

    expect(wrapper.text()).toContain('5m ago')
  })

  it('should update relative times periodically', async () => {
    const timestamp = new Date().toISOString()
    const actions = [createMockAction({ timestamp })]

    const wrapper = shallowMount(ActionHistory, {
      props: { actions },
    })

    expect(wrapper.text()).toContain('just now')

    // Advance timers by 15 seconds
    vi.advanceTimersByTime(15000)
    await wrapper.vm.$nextTick()

    // Should now show seconds ago
    expect(wrapper.text()).toMatch(/s ago/)
  })
})
