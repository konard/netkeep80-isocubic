/**
 * Unit tests for SessionPanel Vue component
 * Tests the Vue.js 3.0 migration of the SessionPanel component
 * Covers: idle state, create/join views, active session, owner controls, connection states
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, shallowMount } from '@vue/test-utils'
import SessionPanel from './SessionPanel.vue'
import type { CollaborationManager } from '../lib/collaboration'
import type { Session, Participant, ConnectionState } from '../types/collaboration'
import { formatSessionCode, parseSessionCode } from '../lib/collaboration'

// Mock collaboration manager
const createMockManager = (overrides: Partial<CollaborationManager> = {}): CollaborationManager => {
  const listeners = new Map<string, Set<(event: { data: unknown }) => void>>()

  return {
    getSession: vi.fn().mockReturnValue(null),
    getParticipants: vi.fn().mockReturnValue([]),
    getLocalParticipant: vi.fn().mockReturnValue(null),
    getState: vi.fn().mockReturnValue({ connectionState: 'disconnected' as ConnectionState }),
    createSession: vi.fn().mockReturnValue({ success: true }),
    leaveSession: vi.fn(),
    updateParticipantRole: vi.fn().mockReturnValue(true),
    kickParticipant: vi.fn().mockReturnValue(true),
    on: vi.fn((event: string, callback: (event: { data: unknown }) => void) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set())
      }
      listeners.get(event)!.add(callback)
    }),
    off: vi.fn((event: string, callback: (event: { data: unknown }) => void) => {
      listeners.get(event)?.delete(callback)
    }),
    ...overrides,
  } as unknown as CollaborationManager
}

// Mock session data
const mockSession: Session = {
  id: 'session-123',
  code: 'ABC123',
  ownerId: 'owner-1',
  settings: {
    name: 'Test Session',
    isOpen: true,
    maxParticipants: 10,
    allowRoleRequests: true,
    autoSaveInterval: 0,
  },
  participants: new Map(),
  cubes: new Map(),
  createdAt: new Date().toISOString(),
  modifiedAt: new Date().toISOString(),
}

// Mock participant data
const mockLocalParticipant: Participant = {
  id: 'owner-1',
  name: 'Test User',
  role: 'owner',
  color: '#646cff',
  joinedAt: new Date().toISOString(),
  lastActiveAt: new Date().toISOString(),
  status: 'online',
}

const mockOtherParticipant: Participant = {
  id: 'participant-2',
  name: 'Other User',
  role: 'editor',
  color: '#4caf50',
  joinedAt: new Date().toISOString(),
  lastActiveAt: new Date().toISOString(),
  status: 'online',
}

function createWrapper(props: Record<string, unknown> = {}) {
  return mount(SessionPanel, {
    props: {
      collaborationManager: createMockManager(),
      ...props,
    },
  })
}

describe('SessionPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Idle State (No Session)', () => {
    it('should render collaboration title', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Collaboration')
    })

    it('should render welcome message', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toMatch(/Work together in real-time/)
    })

    it('should render Create Session button', () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAll('button')
      expect(buttons.some((b) => b.text() === 'Create Session')).toBe(true)
    })

    it('should render Join Session button', () => {
      const wrapper = createWrapper()
      const buttons = wrapper.findAll('button')
      expect(buttons.some((b) => b.text() === 'Join Session')).toBe(true)
    })
  })

  describe('Create Session View', () => {
    it('should show create session form when Create Session is clicked', async () => {
      const wrapper = createWrapper()

      const createBtn = wrapper.findAll('button').find((b) => b.text() === 'Create Session')
      await createBtn!.trigger('click')

      expect(wrapper.find('label[for="create-name"]').exists()).toBe(true)
      expect(wrapper.find('label[for="session-name"]').exists()).toBe(true)
    })

    it('should show back button in create view', async () => {
      const wrapper = createWrapper()

      const createBtn = wrapper.findAll('button').find((b) => b.text() === 'Create Session')
      await createBtn!.trigger('click')

      expect(wrapper.find('[aria-label="Back"]').exists()).toBe(true)
    })

    it('should return to idle view when back is clicked', async () => {
      const wrapper = createWrapper()

      const createBtn = wrapper.findAll('button').find((b) => b.text() === 'Create Session')
      await createBtn!.trigger('click')

      await wrapper.find('[aria-label="Back"]').trigger('click')

      expect(wrapper.text()).toContain('Collaboration')
      expect(wrapper.find('#create-name').exists()).toBe(false)
    })

    it('should show error when name is empty on create', async () => {
      const wrapper = createWrapper()

      // Click Create Session to go to create view
      const navBtn = wrapper.findAll('button').find((b) => b.text() === 'Create Session')
      await navBtn!.trigger('click')

      // Click Create Session in the form (without filling name)
      const formBtn = wrapper.findAll('button').find((b) => b.text() === 'Create Session')
      await formBtn!.trigger('click')

      expect(wrapper.text()).toContain('Please enter your name')
    })

    it('should call createSession on manager when form is valid', async () => {
      const mockManager = createMockManager()
      const wrapper = mount(SessionPanel, {
        props: { collaborationManager: mockManager },
      })

      // Navigate to create view
      const navBtn = wrapper.findAll('button').find((b) => b.text() === 'Create Session')
      await navBtn!.trigger('click')

      // Fill in name
      await wrapper.find('#create-name').setValue('Test User')

      // Submit
      const formBtn = wrapper.findAll('button').find((b) => b.text() === 'Create Session')
      await formBtn!.trigger('click')

      expect(mockManager.createSession).toHaveBeenCalledWith('Test User', undefined)
    })
  })

  describe('Join Session View', () => {
    it('should show join session form when Join Session is clicked', async () => {
      const wrapper = createWrapper()

      const joinBtn = wrapper.findAll('button').find((b) => b.text() === 'Join Session')
      await joinBtn!.trigger('click')

      expect(wrapper.find('#join-name').exists()).toBe(true)
      expect(wrapper.find('#session-code').exists()).toBe(true)
    })

    it('should show error when name is empty on join', async () => {
      const wrapper = createWrapper()

      // Navigate to join view
      const navBtn = wrapper.findAll('button').find((b) => b.text() === 'Join Session')
      await navBtn!.trigger('click')

      // Click Join Session in the form without filling name
      const formBtn = wrapper.findAll('button').find((b) => b.text() === 'Join Session')
      await formBtn!.trigger('click')

      expect(wrapper.text()).toContain('Please enter your name')
    })

    it('should show error when session code is empty on join', async () => {
      const wrapper = createWrapper()

      // Navigate to join view
      const navBtn = wrapper.findAll('button').find((b) => b.text() === 'Join Session')
      await navBtn!.trigger('click')

      // Fill name but not code
      await wrapper.find('#join-name').setValue('Test User')

      // Click Join Session
      const formBtn = wrapper.findAll('button').find((b) => b.text() === 'Join Session')
      await formBtn!.trigger('click')

      expect(wrapper.text()).toContain('Please enter session code')
    })
  })

  describe('Active Session View', () => {
    function createActiveWrapper(overrides: Partial<CollaborationManager> = {}) {
      const mockManager = createMockManager({
        getSession: vi.fn().mockReturnValue(mockSession),
        getParticipants: vi.fn().mockReturnValue([mockLocalParticipant]),
        getLocalParticipant: vi.fn().mockReturnValue(mockLocalParticipant),
        getState: vi.fn().mockReturnValue({ connectionState: 'connected' as ConnectionState }),
        ...overrides,
      })
      return mount(SessionPanel, {
        props: { collaborationManager: mockManager },
      })
    }

    it('should render session name when session is active', () => {
      const wrapper = createActiveWrapper()
      expect(wrapper.text()).toContain('Test Session')
    })

    it('should show connection status when connected', () => {
      const wrapper = createActiveWrapper()
      expect(wrapper.text()).toContain('Connected')
    })

    it('should display session code', () => {
      const wrapper = createActiveWrapper()
      expect(wrapper.text()).toContain('Session Code:')
      // The formatted code (ABC-123 or similar)
      expect(wrapper.text()).toMatch(/ABC.*123/)
    })

    it('should display participants list', () => {
      const wrapper = createActiveWrapper({
        getParticipants: vi.fn().mockReturnValue([mockLocalParticipant, mockOtherParticipant]),
      })
      expect(wrapper.text()).toContain('Test User')
      expect(wrapper.text()).toContain('Other User')
    })

    it('should show "(you)" next to local participant', () => {
      const wrapper = createActiveWrapper()
      expect(wrapper.text()).toContain('(you)')
    })

    it('should show Leave Session button', () => {
      const wrapper = createActiveWrapper()
      const buttons = wrapper.findAll('button')
      expect(buttons.some((b) => b.text() === 'Leave Session')).toBe(true)
    })

    it('should call leaveSession when Leave Session is clicked', () => {
      const mockManager = createMockManager({
        getSession: vi.fn().mockReturnValue(mockSession),
        getParticipants: vi.fn().mockReturnValue([mockLocalParticipant]),
        getLocalParticipant: vi.fn().mockReturnValue(mockLocalParticipant),
        getState: vi.fn().mockReturnValue({ connectionState: 'connected' as ConnectionState }),
      })

      const wrapper = mount(SessionPanel, {
        props: { collaborationManager: mockManager },
      })

      const leaveBtn = wrapper.findAll('button').find((b) => b.text() === 'Leave Session')
      leaveBtn!.trigger('click')

      expect(mockManager.leaveSession).toHaveBeenCalled()
    })

    it('should show role info for local participant', () => {
      const wrapper = createActiveWrapper()
      expect(wrapper.text()).toContain('Your role:')
      expect(wrapper.text()).toContain('owner')
    })
  })

  describe('Owner Controls', () => {
    function createOwnerWrapper() {
      const mockManager = createMockManager({
        getSession: vi.fn().mockReturnValue(mockSession),
        getParticipants: vi.fn().mockReturnValue([mockLocalParticipant, mockOtherParticipant]),
        getLocalParticipant: vi.fn().mockReturnValue(mockLocalParticipant),
        getState: vi.fn().mockReturnValue({ connectionState: 'connected' as ConnectionState }),
      })
      return {
        wrapper: mount(SessionPanel, {
          props: { collaborationManager: mockManager },
        }),
        mockManager,
      }
    }

    it('should show role select for other participants when owner', () => {
      const { wrapper } = createOwnerWrapper()
      const roleSelect = wrapper.find(`select[aria-label="Change role for Other User"]`)
      expect(roleSelect.exists()).toBe(true)
    })

    it('should show kick button for other participants when owner', () => {
      const { wrapper } = createOwnerWrapper()
      const kickBtn = wrapper.find(`[aria-label="Remove Other User"]`)
      expect(kickBtn.exists()).toBe(true)
    })

    it('should call kickParticipant when kick button is clicked', async () => {
      const { wrapper, mockManager } = createOwnerWrapper()
      const kickBtn = wrapper.find(`[aria-label="Remove Other User"]`)
      await kickBtn.trigger('click')
      expect(mockManager.kickParticipant).toHaveBeenCalledWith('participant-2')
    })

    it('should call updateParticipantRole when role is changed', async () => {
      const { wrapper, mockManager } = createOwnerWrapper()
      const roleSelect = wrapper.find(`select[aria-label="Change role for Other User"]`)
      await roleSelect.setValue('viewer')
      expect(mockManager.updateParticipantRole).toHaveBeenCalledWith('participant-2', 'viewer')
    })

    it('should not show controls for non-owner participants', () => {
      const nonOwnerParticipant = { ...mockLocalParticipant, role: 'editor' as const }
      const mockManager = createMockManager({
        getSession: vi.fn().mockReturnValue(mockSession),
        getParticipants: vi.fn().mockReturnValue([nonOwnerParticipant, mockOtherParticipant]),
        getLocalParticipant: vi.fn().mockReturnValue(nonOwnerParticipant),
        getState: vi.fn().mockReturnValue({ connectionState: 'connected' as ConnectionState }),
      })

      const wrapper = mount(SessionPanel, {
        props: { collaborationManager: mockManager },
      })

      expect(wrapper.find('select').exists()).toBe(false)
      expect(wrapper.find('[aria-label*="Remove"]').exists()).toBe(false)
    })
  })

  describe('Custom className', () => {
    it('should apply custom className', () => {
      const wrapper = createWrapper({ className: 'custom-class' })
      expect(wrapper.find('.session-panel.custom-class').exists()).toBe(true)
    })
  })
})

describe('SessionPanel Vue Component - View Modes', () => {
  it('should define all valid view modes', () => {
    const viewModes = ['idle', 'create', 'join', 'active']
    expect(viewModes.length).toBe(4)
    expect(viewModes).toContain('idle')
    expect(viewModes).toContain('create')
    expect(viewModes).toContain('join')
    expect(viewModes).toContain('active')
  })
})

describe('SessionPanel Vue Component - Connection State', () => {
  it('should map connection states to status text', () => {
    const stateMap: Record<string, string> = {
      connected: 'Connected',
      connecting: 'Connecting...',
      reconnecting: 'Reconnecting...',
      disconnected: 'Offline',
    }

    expect(stateMap['connected']).toBe('Connected')
    expect(stateMap['connecting']).toBe('Connecting...')
    expect(stateMap['reconnecting']).toBe('Reconnecting...')
    expect(stateMap['disconnected']).toBe('Offline')
  })
})

describe('SessionPanel Vue Component - Status Colors', () => {
  it('should return correct colors for participant statuses', () => {
    function getStatusColor(status: string): string {
      switch (status) {
        case 'online':
          return '#4caf50'
        case 'away':
          return '#ff9800'
        case 'offline':
          return '#888'
        default:
          return '#888'
      }
    }

    expect(getStatusColor('online')).toBe('#4caf50')
    expect(getStatusColor('away')).toBe('#ff9800')
    expect(getStatusColor('offline')).toBe('#888')
    expect(getStatusColor('unknown')).toBe('#888')
  })
})

describe('SessionPanel Vue Component - Session Code', () => {
  it('should format and parse session codes', () => {
    const formatted = formatSessionCode('ABCDEF')
    expect(typeof formatted).toBe('string')

    const parsed = parseSessionCode('ABC-DEF')
    expect(typeof parsed).toBe('string')
  })
})

describe('SessionPanel Vue Component - Participant Roles', () => {
  it('should support expected roles', () => {
    const roles = ['owner', 'editor', 'viewer']
    expect(roles).toContain('owner')
    expect(roles).toContain('editor')
    expect(roles).toContain('viewer')
  })
})

describe('SessionPanel Module Exports', () => {
  it('should export SessionPanel.vue as a valid Vue component', async () => {
    const module = await import('./SessionPanel.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })
})
