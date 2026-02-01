/**
 * Tests for Command Plugins System
 * 
 * Phase 11, TASK 77: Extended command bar features
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CommandPlugins, windowManagementPlugin, cubeManagementPlugin, exportImportPlugin } from './command-plugins'

describe('CommandPlugins', () => {
  let plugins: CommandPlugins

  beforeEach(() => {
    plugins = new CommandPlugins()
    // Re-register built-in plugins for each test
    plugins.registerPlugin(windowManagementPlugin)
    plugins.registerPlugin(cubeManagementPlugin)
    plugins.registerPlugin(exportImportPlugin)
  })

  describe('Plugin registration', () => {
    it('should register a plugin', () => {
      const testPlugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin',
        category: 'extension' as const,
        commands: [
          {
            id: 'test-cmd',
            label: 'Test Command',
            icon: '🧪',
            description: 'A test command',
            category: 'test',
            handler: vi.fn()
          }
        ],
        enabled: true
      }

      plugins.registerPlugin(testPlugin)

      const registeredPlugin = plugins.getPlugin('test-plugin')
      expect(registeredPlugin).toBeTruthy()
      expect(registeredPlugin!.name).toBe('Test Plugin')

      const command = plugins.getCommand('test-plugin:test-cmd')
      expect(command).toBeTruthy()
      expect(command!.label).toBe('Test Command')
    })

    it('should throw error for missing dependencies', () => {
      const pluginWithDep = {
        id: 'dependent-plugin',
        name: 'Dependent Plugin',
        version: '1.0.0',
        description: 'Plugin with dependency',
        category: 'extension' as const,
        commands: [],
        enabled: true,
        dependencies: ['non-existent-plugin']
      }

      expect(() => plugins.registerPlugin(pluginWithDep))
        .toThrow('Plugin dependency not found: non-existent-plugin')
    })
  })

  describe('Plugin unregistration', () => {
    it('should unregister a plugin', () => {
      const testPlugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'Test',
        category: 'extension' as const,
        commands: [
          {
            id: 'test-cmd',
            label: 'Test Command',
            icon: '🧪',
            description: 'Test',
            category: 'test',
            handler: vi.fn()
          }
        ],
        enabled: true
      }

      plugins.registerPlugin(testPlugin)
      expect(plugins.getPlugin('test-plugin')).toBeTruthy()

      const unregistered = plugins.unregisterPlugin('test-plugin')
      expect(unregistered).toBe(true)
      expect(plugins.getPlugin('test-plugin')).toBeFalsy()
      expect(plugins.getCommand('test-plugin:test-cmd')).toBeFalsy()
    })

    it('should return false for non-existent plugin', () => {
      const result = plugins.unregisterPlugin('non-existent')
      expect(result).toBe(false)
    })
  })

  describe('Plugin enable/disable', () => {
    it('should enable and disable plugins', () => {
      const testPlugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'Test',
        category: 'extension' as const,
        commands: [
          {
            id: 'test-cmd',
            label: 'Test Command',
            icon: '🧪',
            description: 'Test',
            category: 'test',
            handler: vi.fn()
          }
        ],
        enabled: true
      }

      plugins.registerPlugin(testPlugin)

      // Disable plugin
      const disabled = plugins.setPluginEnabled('test-plugin', false)
      expect(disabled).toBe(true)
      expect(plugins.getPlugin('test-plugin')!.enabled).toBe(false)

      // Re-enable plugin
      const enabled = plugins.setPluginEnabled('test-plugin', true)
      expect(enabled).toBe(true)
      expect(plugins.getPlugin('test-plugin')!.enabled).toBe(true)
    })

    it('should return false for non-existent plugin', () => {
      const result = plugins.setPluginEnabled('non-existent', false)
      expect(result).toBe(false)
    })
  })

  describe('Command execution', () => {
    it('should execute command from enabled plugin', async () => {
      const handler = vi.fn()
      const testPlugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'Test',
        category: 'extension' as const,
        commands: [
          {
            id: 'test-cmd',
            label: 'Test Command',
            icon: '🧪',
            description: 'Test',
            category: 'test',
            handler
          }
        ],
        enabled: true
      }

      plugins.registerPlugin(testPlugin)

      await plugins.executeCommand('test-plugin:test-cmd', { param1: 'value1' })

      expect(handler).toHaveBeenCalledWith({ param1: 'value1' })
    })

    it('should throw error for disabled plugin', async () => {
      const handler = vi.fn()
      const testPlugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'Test',
        category: 'extension' as const,
        commands: [
          {
            id: 'test-cmd',
            label: 'Test Command',
            icon: '🧪',
            description: 'Test',
            category: 'test',
            handler
          }
        ],
        enabled: false
      }

      plugins.registerPlugin(testPlugin)

      await expect(plugins.executeCommand('test-plugin:test-cmd'))
        .rejects.toThrow('Plugin not found or disabled: test-plugin')
    })

    it('should record execution history', async () => {
      const handler = vi.fn()
      const testPlugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'Test',
        category: 'extension' as const,
        commands: [
          {
            id: 'test-cmd',
            label: 'Test Command',
            icon: '🧪',
            description: 'Test',
            category: 'test',
            handler
          }
        ],
        enabled: true
      }

      plugins.registerPlugin(testPlugin)

      await plugins.executeCommand('test-plugin:test-cmd')

      const history = plugins.getExecutionHistory()
      expect(history).toHaveLength(1)
      expect(history[0]).toMatchObject({
        commandId: 'test-plugin:test-cmd',
        pluginId: 'test-plugin',
        success: true
      })
      expect(history[0].executionTime).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Command retrieval', () => {
    it('should get all commands from enabled plugins', () => {
      const testPlugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'Test',
        category: 'extension' as const,
        commands: [
          {
            id: 'cmd1',
            label: 'Command 1',
            icon: '🧪',
            description: 'First command',
            category: 'test',
            handler: vi.fn()
          },
          {
            id: 'cmd2',
            label: 'Command 2',
            icon: '🔬',
            description: 'Second command',
            category: 'test',
            handler: vi.fn()
          }
        ],
        enabled: true
      }

      const disabledPlugin = {
        id: 'disabled-plugin',
        name: 'Disabled Plugin',
        version: '1.0.0',
        description: 'Disabled',
        category: 'extension' as const,
        commands: [
          {
            id: 'cmd3',
            label: 'Command 3',
            icon: '❌',
            description: 'Disabled command',
            category: 'test',
            handler: vi.fn()
          }
        ],
        enabled: false
      }

      plugins.registerPlugin(testPlugin)
      plugins.registerPlugin(disabledPlugin)

      const commands = plugins.getAllCommands()
      
      // Should include commands from enabled plugin only
      expect(commands.some(c => c.id === 'test-plugin:cmd1')).toBe(true)
      expect(commands.some(c => c.id === 'test-plugin:cmd2')).toBe(true)
      expect(commands.some(c => c.id === 'disabled-plugin:cmd3')).toBe(false)
    })
  })

  describe('Built-in plugins', () => {
    it('should have window management plugin registered', () => {
      const plugin = plugins.getPlugin('windows')
      expect(plugin).toBeTruthy()
      expect(plugin!.name).toBe('Window Management')
      expect(plugin!.commands).toHaveLength(5)
    })

    it('should have cube management plugin registered', () => {
      const plugin = plugins.getPlugin('cubes')
      expect(plugin).toBeTruthy()
      expect(plugin!.name).toBe('Cube Management')
      expect(plugin!.commands).toHaveLength(3)
    })

    it('should have export/import plugin registered', () => {
      const plugin = plugins.getPlugin('export-import')
      expect(plugin).toBeTruthy()
      expect(plugin!.name).toBe('Export & Import')
      expect(plugin!.commands).toHaveLength(4)
    })
  })

  describe('Hooks system', () => {
    it('should register and execute hooks', async () => {
      const beforeHook = vi.fn()
      const afterHook = vi.fn()

      plugins.registerHook('before:execute', beforeHook)
      plugins.registerHook('after:execute', afterHook)

      const testPlugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'Test',
        category: 'extension' as const,
        commands: [
          {
            id: 'test-cmd',
            label: 'Test Command',
            icon: '🧪',
            description: 'Test',
            category: 'test',
            handler: vi.fn()
          }
        ],
        enabled: true
      }

      plugins.registerPlugin(testPlugin)
      await plugins.executeCommand('test-plugin:test-cmd')

      expect(beforeHook).toHaveBeenCalled()
      expect(afterHook).toHaveBeenCalled()
    })

    it('should handle hook errors gracefully', async () => {
      const errorHook = vi.fn(() => {
        throw new Error('Hook error')
      })

      plugins.registerHook('before:execute', errorHook)

      const testPlugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'Test',
        category: 'extension' as const,
        commands: [
          {
            id: 'test-cmd',
            label: 'Test Command',
            icon: '🧪',
            description: 'Test',
            category: 'test',
            handler: vi.fn()
          }
        ],
        enabled: true
      }

      plugins.registerPlugin(testPlugin)

      // Should not throw error
      await expect(plugins.executeCommand('test-plugin:test-cmd')).resolves.toBeUndefined()
    })
  })

  describe('Execution history management', () => {
    it('should clear execution history', async () => {
      const testPlugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'Test',
        category: 'extension' as const,
        commands: [
          {
            id: 'test-cmd',
            label: 'Test Command',
            icon: '🧪',
            description: 'Test',
            category: 'test',
            handler: vi.fn()
          }
        ],
        enabled: true
      }

      plugins.registerPlugin(testPlugin)

      // Execute some commands
      await plugins.executeCommand('test-plugin:test-cmd')
      await plugins.executeCommand('test-plugin:test-cmd')

      expect(plugins.getExecutionHistory()).toHaveLength(2)

      // Clear history
      plugins.clearExecutionHistory()
      expect(plugins.getExecutionHistory()).toHaveLength(0)
    })

    it('should limit execution history results', async () => {
      const testPlugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'Test',
        category: 'extension' as const,
        commands: [
          {
            id: 'test-cmd',
            label: 'Test Command',
            icon: '🧪',
            description: 'Test',
            category: 'test',
            handler: vi.fn()
          }
        ],
        enabled: true
      }

      plugins.registerPlugin(testPlugin)

      // Execute multiple commands
      await plugins.executeCommand('test-plugin:test-cmd')
      await plugins.executeCommand('test-plugin:test-cmd')
      await plugins.executeCommand('test-plugin:test-cmd')

      const allHistory = plugins.getExecutionHistory()
      expect(allHistory).toHaveLength(3)

      const limitedHistory = plugins.getExecutionHistory(2)
      expect(limitedHistory).toHaveLength(2)
    })
  })
})