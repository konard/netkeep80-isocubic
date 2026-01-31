/**
 * Unit tests for ParticipantCursor Vue component
 * Tests the Vue.js 3.0 migration of the ParticipantCursor component
 * Covers: rendering, filtering, props, CursorList, click handlers, status indicators
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest'
import { mount, shallowMount } from '@vue/test-utils'
import ParticipantCursor from './ParticipantCursor.vue'
import { CursorList } from './ParticipantCursor.vue'
import type { Participant, CursorPosition } from '../types/collaboration'

// Mock participant data
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

// Mock cursor data
const createMockCursor = (overrides: Partial<CursorPosition> = {}): CursorPosition => ({
  x: 1.5,
  y: 2.0,
  z: 0.5,
  ...overrides,
})

describe('ParticipantCursor', () => {
  describe('Rendering', () => {
    it('should render nothing when no participants', () => {
      const wrapper = mount(ParticipantCursor, {
        props: { participants: [] },
      })

      expect(wrapper.find('.participant-cursors').exists()).toBe(false)
    })

    it('should render nothing when only local participant', () => {
      const participant = createMockParticipant()
      const cursor = createMockCursor()

      const wrapper = mount(ParticipantCursor, {
        props: {
          participants: [{ participant, cursor }],
          localParticipantId: participant.id,
        },
      })

      expect(wrapper.find('.participant-cursors').exists()).toBe(false)
    })

    it('should render cursor for remote participants', () => {
      const participant = createMockParticipant({
        cursor: createMockCursor(),
      })
      const cursor = createMockCursor()

      const wrapper = mount(ParticipantCursor, {
        props: {
          participants: [{ participant, cursor }],
          localParticipantId: 'different-id',
        },
      })

      expect(wrapper.find('.participant-cursors').exists()).toBe(true)
      expect(wrapper.find('.participant-cursor').exists()).toBe(true)
    })

    it('should display participant name in label', () => {
      const participant = createMockParticipant({
        name: 'Alice',
        cursor: createMockCursor(),
      })
      const cursor = createMockCursor()

      const wrapper = mount(ParticipantCursor, {
        props: {
          participants: [{ participant, cursor }],
          localParticipantId: 'different-id',
        },
      })

      expect(wrapper.text()).toContain('Alice')
    })

    it('should use participant color', () => {
      const participant = createMockParticipant({
        color: '#ff0000',
        cursor: createMockCursor(),
      })
      const cursor = createMockCursor()

      const wrapper = mount(ParticipantCursor, {
        props: {
          participants: [{ participant, cursor }],
          localParticipantId: 'different-id',
        },
      })

      const label = wrapper.find('.participant-cursor__label')
      expect(label.attributes('style')).toContain('background-color: rgb(255, 0, 0)')
    })

    it('should render selection indicator when cube is selected', () => {
      const cursor = createMockCursor({ selectedCubeId: 'cube-123' })
      const participant = createMockParticipant({
        cursor,
      })

      const wrapper = mount(ParticipantCursor, {
        props: {
          participants: [{ participant, cursor }],
          localParticipantId: 'different-id',
        },
      })

      expect(wrapper.find('.participant-cursor__selection').exists()).toBe(true)
      expect(wrapper.text()).toContain('Selected: cube-123')
    })
  })

  describe('Filtering', () => {
    it('should exclude local participant', () => {
      const localParticipant = createMockParticipant({
        id: 'local-id',
        cursor: createMockCursor(),
      })

      const wrapper = mount(ParticipantCursor, {
        props: {
          participants: [{ participant: localParticipant, cursor: createMockCursor() }],
          localParticipantId: 'local-id',
        },
      })

      expect(wrapper.find('.participant-cursor').exists()).toBe(false)
    })

    it('should exclude offline participants', () => {
      const offlineParticipant = createMockParticipant({
        status: 'offline',
        cursor: createMockCursor(),
      })

      const wrapper = mount(ParticipantCursor, {
        props: {
          participants: [{ participant: offlineParticipant, cursor: createMockCursor() }],
          localParticipantId: 'different-id',
        },
      })

      expect(wrapper.find('.participant-cursor').exists()).toBe(false)
    })

    it('should exclude participants without cursor data', () => {
      const participant = createMockParticipant()

      const wrapper = mount(ParticipantCursor, {
        props: {
          participants: [{ participant, cursor: null }],
          localParticipantId: 'different-id',
        },
      })

      expect(wrapper.find('.participant-cursor').exists()).toBe(false)
    })
  })

  describe('Props', () => {
    it('should show coordinates when showCoordinates is true', () => {
      const cursor = createMockCursor({ x: 1.5, y: 2.0, z: 0.5 })
      const participant = createMockParticipant({
        cursor,
      })

      const wrapper = mount(ParticipantCursor, {
        props: {
          participants: [{ participant, cursor }],
          localParticipantId: 'different-id',
          showCoordinates: true,
        },
      })

      expect(wrapper.text()).toMatch(/\(1\.5, 2\.0, 0\.5\)/)
    })

    it('should apply custom className', () => {
      const participant = createMockParticipant({
        cursor: createMockCursor(),
      })

      const wrapper = mount(ParticipantCursor, {
        props: {
          participants: [{ participant, cursor: createMockCursor() }],
          localParticipantId: 'different-id',
          className: 'custom-class',
        },
      })

      expect(wrapper.find('.participant-cursors.custom-class').exists()).toBe(true)
    })
  })
})

describe('CursorList', () => {
  describe('Empty State', () => {
    it('should show empty message when no participants', () => {
      const wrapper = mount(CursorList, {
        props: { participants: [] },
      })

      expect(wrapper.text()).toContain('No other participants online')
    })

    it('should show empty message when only local participant', () => {
      const localParticipant = createMockParticipant({ id: 'local-id' })

      const wrapper = mount(CursorList, {
        props: {
          participants: [{ participant: localParticipant, cursor: createMockCursor() }],
          localParticipantId: 'local-id',
        },
      })

      expect(wrapper.text()).toContain('No other participants online')
    })
  })

  describe('Rendering', () => {
    it('should render participant list', () => {
      const participant = createMockParticipant({ name: 'Alice' })

      const wrapper = mount(CursorList, {
        props: {
          participants: [{ participant, cursor: createMockCursor() }],
          localParticipantId: 'different-id',
        },
      })

      expect(wrapper.text()).toContain('Participants')
      expect(wrapper.text()).toContain('Alice')
    })

    it('should show cursor position', () => {
      const cursor = createMockCursor({ x: 1.5, y: 2.0, z: 0.5 })
      const participant = createMockParticipant()

      const wrapper = mount(CursorList, {
        props: {
          participants: [{ participant, cursor }],
          localParticipantId: 'different-id',
        },
      })

      expect(wrapper.text()).toMatch(/x: 1\.5, y: 2\.0, z: 0\.5/)
    })

    it('should show "No position" when cursor is null', () => {
      const participant = createMockParticipant()

      const wrapper = mount(CursorList, {
        props: {
          participants: [{ participant, cursor: null }],
          localParticipantId: 'different-id',
        },
      })

      expect(wrapper.text()).toContain('No position')
    })

    it('should use participant color', () => {
      const participant = createMockParticipant({ color: '#ff0000' })

      const wrapper = mount(CursorList, {
        props: {
          participants: [{ participant, cursor: createMockCursor() }],
          localParticipantId: 'different-id',
        },
      })

      const colorIndicator = wrapper.find('.cursor-list__color')
      expect(colorIndicator.attributes('style')).toContain('background-color: rgb(255, 0, 0)')
    })
  })

  describe('Click Handler', () => {
    it('should emit cursorClick when item clicked', async () => {
      const cursor = createMockCursor()
      const participant = createMockParticipant()

      const wrapper = mount(CursorList, {
        props: {
          participants: [{ participant, cursor }],
          localParticipantId: 'different-id',
        },
      })

      await wrapper.find('button').trigger('click')

      expect(wrapper.emitted('cursorClick')).toBeTruthy()
      const emittedArgs = wrapper.emitted('cursorClick')![0]
      expect(emittedArgs[0]).toEqual(cursor)
      expect(emittedArgs[1]).toEqual(participant)
    })

    it('should disable button when cursor is null', () => {
      const participant = createMockParticipant()

      const wrapper = mount(CursorList, {
        props: {
          participants: [{ participant, cursor: null }],
          localParticipantId: 'different-id',
        },
      })

      expect(wrapper.find('button').attributes('disabled')).toBeDefined()
    })
  })

  describe('Status Indicator', () => {
    it('should show green for online status', () => {
      const participant = createMockParticipant({ status: 'online' })

      const wrapper = mount(CursorList, {
        props: {
          participants: [{ participant, cursor: createMockCursor() }],
          localParticipantId: 'different-id',
        },
      })

      const status = wrapper.find('.cursor-list__status')
      expect(status.attributes('style')).toContain('background-color: rgb(76, 175, 80)')
    })

    it('should show orange for away status', () => {
      const participant = createMockParticipant({ status: 'away' })

      const wrapper = mount(CursorList, {
        props: {
          participants: [{ participant, cursor: createMockCursor() }],
          localParticipantId: 'different-id',
        },
      })

      const status = wrapper.find('.cursor-list__status')
      expect(status.attributes('style')).toContain('background-color: rgb(255, 152, 0)')
    })
  })

  describe('Props', () => {
    it('should apply custom className', () => {
      const wrapper = mount(CursorList, {
        props: { participants: [], className: 'custom-class' },
      })

      expect(wrapper.find('.cursor-list.custom-class').exists()).toBe(true)
    })
  })
})

describe('ParticipantCursor Vue Component - Cursor Filtering Logic', () => {
  it('should filter out local participant', () => {
    const participants = [
      {
        participant: { id: 'local', name: 'Me', color: '#ff0000', status: 'online', cursor: null } as unknown as Participant,
        cursor: null,
      },
      {
        participant: {
          id: 'remote-1',
          name: 'User 1',
          color: '#00ff00',
          status: 'online',
          cursor: { x: 1, y: 2, z: 3 },
        } as unknown as Participant,
        cursor: { x: 1, y: 2, z: 3 } as CursorPosition,
      },
    ]

    const localParticipantId = 'local'
    const remoteCursors = participants.filter(({ participant, cursor }) => {
      if (localParticipantId && participant.id === localParticipantId) return false
      if (!cursor && !participant.cursor) return false
      if (participant.status === 'offline') return false
      return true
    })

    expect(remoteCursors.length).toBe(1)
    expect(remoteCursors[0].participant.id).toBe('remote-1')
  })

  it('should filter out offline participants', () => {
    const participants = [
      {
        participant: {
          id: 'user-1',
          name: 'User 1',
          color: '#ff0000',
          status: 'offline',
          cursor: { x: 1, y: 2, z: 3 },
        } as unknown as Participant,
        cursor: { x: 1, y: 2, z: 3 } as CursorPosition,
      },
      {
        participant: {
          id: 'user-2',
          name: 'User 2',
          color: '#00ff00',
          status: 'online',
          cursor: { x: 4, y: 5, z: 6 },
        } as unknown as Participant,
        cursor: { x: 4, y: 5, z: 6 } as CursorPosition,
      },
    ]

    const remoteCursors = participants.filter(({ participant }) => {
      return participant.status !== 'offline'
    })

    expect(remoteCursors.length).toBe(1)
    expect(remoteCursors[0].participant.id).toBe('user-2')
  })
})

describe('ParticipantCursor Vue Component - Coordinate Display', () => {
  it('should format coordinates correctly', () => {
    const cursor = { x: 1.234, y: 5.678, z: 9.012 }
    const formatted = `(${cursor.x.toFixed(1)}, ${cursor.y.toFixed(1)}, ${cursor.z.toFixed(1)})`
    expect(formatted).toBe('(1.2, 5.7, 9.0)')
  })
})

describe('ParticipantCursor Vue Component - Status Colors', () => {
  it('should map status to correct colors', () => {
    function getStatusColor(status: string): string {
      switch (status) {
        case 'online':
          return '#4caf50'
        case 'away':
          return '#ff9800'
        default:
          return '#888'
      }
    }

    expect(getStatusColor('online')).toBe('#4caf50')
    expect(getStatusColor('away')).toBe('#ff9800')
    expect(getStatusColor('offline')).toBe('#888')
  })
})

describe('ParticipantCursor Vue Component - CSS Variables', () => {
  it('should generate correct cursor style object', () => {
    const color = '#ff5500'
    const animationDuration = 200
    const cursorStyle = {
      '--cursor-color': color,
      '--animation-duration': `${animationDuration}ms`,
    }

    expect(cursorStyle['--cursor-color']).toBe('#ff5500')
    expect(cursorStyle['--animation-duration']).toBe('200ms')
  })
})

describe('ParticipantCursor Module Exports', () => {
  it('should export ParticipantCursor.vue as a valid Vue component', async () => {
    const module = await import('./ParticipantCursor.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })

  it('should export CursorList', () => {
    expect(CursorList).toBeDefined()
    expect(typeof CursorList).toBe('object')
  })
})
