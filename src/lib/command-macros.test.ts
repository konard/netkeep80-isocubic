/**
 * Tests for Command Macros System
 * 
 * Phase 11, TASK 77: Extended command bar features
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CommandMacros } from './command-macros'

describe('CommandMacros', () => {
  let macros: CommandMacros

  beforeEach(() => {
    macros = new CommandMacros()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Recording macros', () => {
    it('should start recording', () => {
      macros.startRecording('Test Macro', 'A test macro')
      
      const state = macros.getRecordingState()
      expect(state.isRecording).toBe(true)
      expect(state.commands).toEqual([])
    })

    it('should record commands while recording', () => {
      macros.startRecording('Test Macro')
      
      macros.recordCommand('window:gallery')
      macros.recordCommand('window:preview', { someParam: 'value' })
      
      const state = macros.getRecordingState()
      expect(state.commands).toHaveLength(2)
      expect(state.commands[0].commandId).toBe('window:gallery')
      expect(state.commands[1].commandId).toBe('window:preview')
      expect(state.commands[1].parameters).toEqual({ someParam: 'value' })
    })

    it('should stop recording and save macro', () => {
      macros.startRecording('Test Macro', 'A test macro')
      macros.recordCommand('window:gallery')
      
      const macro = macros.stopRecording('Test Macro', 'A test macro')
      
      expect(macro).toBeTruthy()
      expect(macro!.name).toBe('Test Macro')
      expect(macro!.description).toBe('A test macro')
      expect(macro!.commands).toHaveLength(1)
      expect(macro!.commands[0].commandId).toBe('window:gallery')
      expect(macro!.category).toBe('user')
    })

    it('should not record commands when not recording', () => {
      macros.recordCommand('window:gallery')
      
      const state = macros.getRecordingState()
      expect(state.commands).toHaveLength(0)
    })

    it('should generate unique macro IDs', () => {
      macros.startRecording('Test Macro')
      macros.stopRecording()
      
      macros.startRecording('Test Macro')
      const macro2 = macros.stopRecording()
      
      expect(macro2!.id).not.toBe('test-macro')
      expect(macro2!.id).toBe('untitled-1')
    })
  })

  describe('Executing macros', () => {
    let executeCallback: ReturnType<typeof vi.fn>

    beforeEach(() => {
      executeCallback = vi.fn()
    })

    it('should execute macro commands in order', async () => {
      // Create a macro manually
      const testMacro = {
        id: 'test-macro',
        name: 'Test Macro',
        description: 'Test',
        commands: [
          { commandId: 'window:gallery' },
          { commandId: 'window:preview', delay: 50 },
          { commandId: 'window:editor', delay: 50 }
        ],
        category: 'user' as const,
        createdAt: new Date().toISOString(),
        icon: '🧪'
      }

      // Add macro to registry (private access)
      macros['macros'].set('test-macro', testMacro)

      await macros.executeMacro('test-macro', executeCallback)

      // Should execute all commands
      expect(executeCallback).toHaveBeenCalledTimes(3)
      expect(executeCallback).toHaveBeenCalledWith('window:gallery')
      expect(executeCallback).toHaveBeenCalledWith('window:preview')
      expect(executeCallback).toHaveBeenCalledWith('window:editor')
    })

    it('should handle delays between commands', async () => {
      const testMacro = {
        id: 'test-delay',
        name: 'Test Delay',
        description: 'Test',
        commands: [
          { commandId: 'cmd1', delay: 50 },
          { commandId: 'cmd2', delay: 50 }
        ],
        category: 'user' as const,
        createdAt: new Date().toISOString()
      }

      macros['macros'].set('test-delay', testMacro)

      const startTime = Date.now()
      await macros.executeMacro('test-delay', executeCallback)
      const endTime = Date.now()

      // Should take at least 100ms for delays
      expect(endTime - startTime).toBeGreaterThanOrEqual(100)
      expect(executeCallback).toHaveBeenCalledTimes(2)
    })

    it('should throw error for non-existent macro', async () => {
      await expect(macros.executeMacro('non-existent', executeCallback))
        .rejects.toThrow('Macro not found: non-existent')
    })

    it('should update last used timestamp', async () => {
      const testMacro = {
        id: 'test-macro',
        name: 'Test Macro',
        description: 'Test',
        commands: [{ commandId: 'window:gallery' }],
        category: 'user' as const,
        createdAt: new Date().toISOString()
      }

      macros['macros'].set('test-macro', testMacro)

      await macros.executeMacro('test-macro', executeCallback)

      const macro = macros.getMacro('test-macro')
      expect(macro!.lastUsed).toBeDefined()
    })
  })

  describe('Managing macros', () => {
    it('should get all macros sorted by last used', () => {
      const macro1 = {
        id: 'macro1',
        name: 'Macro 1',
        description: 'First',
        commands: [],
        category: 'user' as const,
        createdAt: new Date('2026-01-01').toISOString(),
        lastUsed: new Date('2026-01-02').toISOString()
      }

      const macro2 = {
        id: 'macro2',
        name: 'Macro 2',
        description: 'Second',
        commands: [],
        category: 'user' as const,
        createdAt: new Date('2026-01-01').toISOString(),
        lastUsed: new Date('2026-01-03').toISOString()
      }

      macros['macros'].set('macro1', macro1)
      macros['macros'].set('macro2', macro2)

      const allMacros = macros.getAllMacros()
      expect(allMacros[0].id).toBe('macro2') // More recently used
      expect(allMacros[1].id).toBe('macro1')
    })

    it('should delete macros', () => {
      macros['macros'].set('test-macro', {
        id: 'test-macro',
        name: 'Test',
        description: 'Test',
        commands: [],
        category: 'user' as const,
        createdAt: new Date().toISOString()
      })

      expect(macros.getMacro('test-macro')).toBeTruthy()

      const deleted = macros.deleteMacro('test-macro')
      expect(deleted).toBe(true)
      expect(macros.getMacro('test-macro')).toBeFalsy()
    })

    it('should return false when deleting non-existent macro', () => {
      const deleted = macros.deleteMacro('non-existent')
      expect(deleted).toBe(false)
    })
  })

  describe('Command integration', () => {
    it('should convert macros to command items', () => {
      const testMacro = {
        id: 'test-macro',
        name: 'Test Macro',
        description: 'A test macro',
        commands: [],
        category: 'user' as const,
        createdAt: new Date().toISOString(),
        icon: '🧪'
      }

      macros['macros'].set('test-macro', testMacro)

      const commands = macros.getMacroCommands()
      expect(commands.length).toBeGreaterThanOrEqual(1) // Plus system macros
      const userCommand = commands.find(c => c.id === 'macro:test-macro')
      expect(userCommand).toMatchObject({
        id: 'macro:test-macro',
        label: 'Run Test Macro',
        icon: '🧪',
        description: 'A test macro',
        category: 'macro'
      })
    })
  })

  describe('System macros', () => {
    it('should create built-in system macros', () => {
      const allMacros = macros.getAllMacros()
      
      // Should have system macros
      const resetMacro = allMacros.find(m => m.id === 'reset-all-layouts')
      expect(resetMacro).toBeTruthy()
      expect(resetMacro!.category).toBe('system')
      expect(resetMacro!.commands[0].commandId).toBe('action:reset-layout')

      const openAllMacro = allMacros.find(m => m.id === 'open-all-windows')
      expect(openAllMacro).toBeTruthy()
      expect(openAllMacro!.commands).toHaveLength(9) // All windows

      const workspaceMacro = allMacros.find(m => m.id === 'workspace-setup')
      expect(workspaceMacro).toBeTruthy()
      expect(workspaceMacro!.commands).toHaveLength(3) // Gallery, Preview, Editor
    })
  })

  describe('Recording state', () => {
    it('should return recording state correctly', () => {
      expect(macros.isRecording()).toBe(false)
      
      macros.startRecording('Test')
      expect(macros.isRecording()).toBe(true)
      
      macros.stopRecording()
      expect(macros.isRecording()).toBe(false)
    })
  })
})