/**
 * Command Plugins System
 * Allows extending the command bar with plugins from different modules
 * 
 * Phase 11, TASK 77: Extended command bar features
 */

import type { CommandItem } from '../components/CommandBar.vue'

export interface CommandPlugin {
  id: string
  name: string
  version: string
  description: string
  author?: string
  category: 'core' | 'extension' | 'experimental'
  commands: PluginCommand[]
  enabled: boolean
  dependencies?: string[]
  permissions?: string[]
}

export interface PluginCommand {
  id: string
  label: string
  icon: string
  description: string
  category: string
  handler: CommandHandler
  parameters?: PluginParameter[]
  keywords?: string[]
}

export interface PluginParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'select'
  description: string
  required?: boolean
  default?: any
  options?: { value: any; label: string }[] // For select type
}

export type CommandHandler = (params?: Record<string, any>) => Promise<void> | void

export interface PluginRegistry {
  plugins: Map<string, CommandPlugin>
  commands: Map<string, PluginCommand>
  hooks: Map<string, Function[]>
}

/**
 * Command Plugins Manager
 * Handles registration, execution, and management of command plugins
 */
export class CommandPlugins {
  private registry: PluginRegistry = {
    plugins: new Map(),
    commands: new Map(),
    hooks: new Map()
  }

  private executionHistory: Array<{
    commandId: string
    pluginId: string
    timestamp: number
    executionTime: number
    success: boolean
    error?: string
  }> = []

  /**
   * Register a new plugin
   */
  registerPlugin(plugin: CommandPlugin): void {
    // Check dependencies
    if (plugin.dependencies) {
      for (const dep of plugin.dependencies) {
        if (!this.registry.plugins.has(dep)) {
          throw new Error(`Plugin dependency not found: ${dep}`)
        }
      }
    }

    // Register plugin
    this.registry.plugins.set(plugin.id, plugin)

    // Register commands
    for (const command of plugin.commands) {
      const fullCommandId = `${plugin.id}:${command.id}`
      this.registry.commands.set(fullCommandId, command)
    }

    console.log(`Registered plugin: ${plugin.name} (${plugin.id})`)
  }

  /**
   * Unregister a plugin
   */
  unregisterPlugin(pluginId: string): boolean {
    const plugin = this.registry.plugins.get(pluginId)
    if (!plugin) {
      return false
    }

    // Remove commands
    for (const command of plugin.commands) {
      const fullCommandId = `${pluginId}:${command.id}`
      this.registry.commands.delete(fullCommandId)
    }

    // Remove plugin
    this.registry.plugins.delete(pluginId)

    console.log(`Unregistered plugin: ${plugin.name} (${pluginId})`)
    return true
  }

  /**
   * Enable/disable a plugin
   */
  setPluginEnabled(pluginId: string, enabled: boolean): boolean {
    const plugin = this.registry.plugins.get(pluginId)
    if (!plugin) {
      return false
    }

    plugin.enabled = enabled
    this.savePluginStates()

    console.log(`${enabled ? 'Enabled' : 'Disabled'} plugin: ${plugin.name}`)
    return true
  }

  /**
   * Execute a command from a plugin
   */
  async executeCommand(commandId: string, parameters?: Record<string, any>): Promise<void> {
    const [pluginId, cmdId] = commandId.includes(':') 
      ? commandId.split(':', 2)
      : ['core', commandId]

    const command = this.registry.commands.get(commandId)
    if (!command) {
      throw new Error(`Command not found: ${commandId}`)
    }

    const plugin = this.registry.plugins.get(pluginId)
    if (!plugin || !plugin.enabled) {
      throw new Error(`Plugin not found or disabled: ${pluginId}`)
    }

    const startTime = Date.now()

    try {
      // Execute before hooks
      await this.executeHooks('before:execute', { commandId, parameters, plugin })

      // Execute command
      await command.handler(parameters)

      // Execute after hooks
      await this.executeHooks('after:execute', { commandId, parameters, plugin, success: true })

      // Record execution
      this.executionHistory.push({
        commandId,
        pluginId,
        timestamp: Date.now(),
        executionTime: Date.now() - startTime,
        success: true
      })

      console.log(`Executed command: ${commandId} (${Date.now() - startTime}ms)`)
    } catch (error) {
      // Execute error hooks
      await this.executeHooks('error:execute', { commandId, parameters, plugin, error })

      // Record execution failure
      this.executionHistory.push({
        commandId,
        pluginId,
        timestamp: Date.now(),
        executionTime: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })

      console.error(`Command execution failed: ${commandId}`, error)
      throw error
    }
  }

  /**
   * Get all available commands as CommandItem[]
   */
  getAllCommands(): CommandItem[] {
    const commands: CommandItem[] = []

    for (const [pluginId, plugin] of this.registry.plugins) {
      if (!plugin.enabled) continue

      for (const command of plugin.commands) {
        const fullCommandId = `${pluginId}:${command.id}`
        commands.push({
          id: fullCommandId,
          label: command.label,
          icon: command.icon,
          description: command.description,
          category: command.category as any
        })
      }
    }

    return commands
  }

  /**
   * Get all registered plugins
   */
  getAllPlugins(): CommandPlugin[] {
    return Array.from(this.registry.plugins.values())
  }

  /**
   * Get enabled plugins
   */
  getEnabledPlugins(): CommandPlugin[] {
    return this.getAllPlugins().filter(plugin => plugin.enabled)
  }

  /**
   * Get plugin by ID
   */
  getPlugin(pluginId: string): CommandPlugin | undefined {
    return this.registry.plugins.get(pluginId)
  }

  /**
   * Get command by ID
   */
  getCommand(commandId: string): PluginCommand | undefined {
    return this.registry.commands.get(commandId)
  }

  /**
   * Register a hook
   */
  registerHook(hookName: string, callback: Function): void {
    if (!this.registry.hooks.has(hookName)) {
      this.registry.hooks.set(hookName, [])
    }
    this.registry.hooks.get(hookName)!.push(callback)
  }

  /**
   * Execute all hooks for a given event
   */
  private async executeHooks(hookName: string, data: any): Promise<void> {
    const hooks = this.registry.hooks.get(hookName) || []
    for (const hook of hooks) {
      try {
        await hook(data)
      } catch (error) {
        console.error(`Hook execution failed: ${hookName}`, error)
      }
    }
  }

  /**
   * Get execution history
   */
  getExecutionHistory(limit?: number): Array<{
    commandId: string
    pluginId: string
    timestamp: number
    executionTime: number
    success: boolean
    error?: string
  }> {
    const history = [...this.executionHistory].reverse()
    return limit ? history.slice(0, limit) : history
  }

  /**
   * Clear execution history
   */
  clearExecutionHistory(): void {
    this.executionHistory = []
  }

  /**
   * Save plugin enabled states to localStorage
   */
  private savePluginStates(): void {
    try {
      const states: Record<string, boolean> = {}
      for (const [pluginId, plugin] of this.registry.plugins) {
        states[pluginId] = plugin.enabled
      }
      localStorage.setItem('isocubic-plugin-states', JSON.stringify(states))
    } catch (error) {
      console.error('Failed to save plugin states:', error)
    }
  }

  /**
   * Load plugin enabled states from localStorage
   */
  loadPluginStates(): void {
    try {
      const saved = localStorage.getItem('isocubic-plugin-states')
      if (saved) {
        const states: Record<string, boolean> = JSON.parse(saved)
        for (const [pluginId, enabled] of Object.entries(states)) {
          const plugin = this.registry.plugins.get(pluginId)
          if (plugin) {
            plugin.enabled = enabled
          }
        }
      }
    } catch (error) {
      console.error('Failed to load plugin states:', error)
    }
  }
}

/**
 * Built-in core plugins
 */

// Window Management Plugin
export const windowManagementPlugin: CommandPlugin = {
  id: 'windows',
  name: 'Window Management',
  version: '1.0.0',
  description: 'Core window management commands',
  category: 'core',
  commands: [
    {
      id: 'arrange',
      label: 'Arrange Windows',
      icon: '\ud83d\udccb',
      description: 'Arrange all windows in a grid layout',
      category: 'window',
      handler: async () => {
        // This would be connected to the window manager
        console.log('Arranging windows...')
      }
    },
    {
      id: 'tile',
      label: 'Tile Windows',
      icon: '\ud83d\udcd0',
      description: 'Tile windows horizontally or vertically',
      category: 'window',
      handler: async () => {
        console.log('Tiling windows...')
      }
    },
    {
      id: 'cascade',
      label: 'Cascade Windows',
      icon: '\ud83d\udc73',
      description: 'Cascade windows diagonally',
      category: 'window',
      handler: async () => {
        console.log('Cascading windows...')
      }
    },
    {
      id: 'minimize-all',
      label: 'Minimize All',
      icon: '\ud83d\udced',
      description: 'Minimize all windows',
      category: 'window',
      handler: async () => {
        console.log('Minimizing all windows...')
      }
    },
    {
      id: 'restore-all',
      label: 'Restore All',
      icon: '\ud83d\udd04',
      description: 'Restore all minimized windows',
      category: 'window',
      handler: async () => {
        console.log('Restoring all windows...')
      }
    }
  ],
  enabled: true
}

// Cube Management Plugin
export const cubeManagementPlugin: CommandPlugin = {
  id: 'cubes',
  name: 'Cube Management',
  version: '1.0.0',
  description: 'Core cube manipulation commands',
  category: 'core',
  commands: [
    {
      id: 'create',
      label: 'Create Cube',
      icon: '\u2795',
      description: 'Create a new cube with optional description',
      category: 'cube',
      handler: async (params) => {
        const description = params?.description || 'Random cube'
        console.log(`Creating cube: ${description}`)
      },
      parameters: [
        {
          name: 'description',
          type: 'string',
          description: 'Description of the cube to create',
          required: false
        }
      ]
    },
    {
      id: 'randomize',
      label: 'Randomize Cube',
      icon: '\ud83c\udfb2',
      description: 'Generate random cube parameters',
      category: 'cube',
      handler: async () => {
        console.log('Randomizing cube...')
      }
    },
    {
      id: 'save',
      label: 'Save Cube',
      icon: '\ud83d\udcbe',
      description: 'Save current cube with name',
      category: 'cube',
      handler: async (params) => {
        const name = params?.name || 'Untitled'
        console.log(`Saving cube as: ${name}`)
      },
      parameters: [
        {
          name: 'name',
          type: 'string',
          description: 'Name to save the cube as',
          required: false
        }
      ]
    }
  ],
  enabled: true
}

// Export/Import Plugin
export const exportImportPlugin: CommandPlugin = {
  id: 'export-import',
  name: 'Export & Import',
  version: '1.0.0',
  description: 'Export and import functionality',
  category: 'core',
  commands: [
    {
      id: 'export-json',
      label: 'Export as JSON',
      icon: '\ud83d\udcc4',
      description: 'Export current cube as JSON file',
      category: 'export',
      handler: async () => {
        console.log('Exporting as JSON...')
      }
    },
    {
      id: 'export-glb',
      label: 'Export as GLB',
      icon: '\ud83c\udfa8',
      description: 'Export current cube as GLB 3D model',
      category: 'export',
      handler: async () => {
        console.log('Exporting as GLB...')
      }
    },
    {
      id: 'export-png',
      label: 'Export as PNG',
      icon: '\ud83d\uddbc\ufe0f',
      description: 'Export current cube as PNG image',
      category: 'export',
      handler: async () => {
        console.log('Exporting as PNG...')
      }
    },
    {
      id: 'import',
      label: 'Import File',
      icon: '\ud83d\udcc1',
      description: 'Import cube configuration from file',
      category: 'import',
      handler: async () => {
        console.log('Importing file...')
      }
    }
  ],
  enabled: true
}

// Global instance for use throughout the application
export const commandPlugins = new CommandPlugins()

// Register built-in plugins
commandPlugins.registerPlugin(windowManagementPlugin)
commandPlugins.registerPlugin(cubeManagementPlugin)
commandPlugins.registerPlugin(exportImportPlugin)

// Load plugin states
commandPlugins.loadPluginStates()