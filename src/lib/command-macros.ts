/**
 * Command Macros System
 * Allows recording, saving, and executing sequences of commands
 * 
 * Phase 11, TASK 77: Extended command bar features
 */

import type { CommandItem } from '../components/CommandBar.vue'

export interface CommandMacro {
  id: string
  name: string
  description: string
  commands: MacroCommand[]
  category: 'user' | 'system'
  createdAt: string
  lastUsed?: string
  icon?: string
}

export interface MacroCommand {
  commandId: string
  parameters?: Record<string, any>
  delay?: number // Delay in milliseconds before executing this command
}

export interface MacroRecorder {
  isRecording: boolean
  startTime?: number
  commands: MacroCommand[]
}

/**
 * Command Macros Manager
 * Handles recording, saving, loading, and executing command macros
 */
export class CommandMacros {
  private static readonly STORAGE_KEY = 'isocubic-command-macros'
  private macros: Map<string, CommandMacro> = new Map()
  private recorder: MacroRecorder = {
    isRecording: false,
    commands: []
  }

  constructor() {
    this.loadMacros()
  }

  /**
   * Start recording a new macro
   */
  startRecording(macroName: string, description?: string): void {
    if (this.recorder.isRecording) {
      this.stopRecording()
    }

    this.recorder = {
      isRecording: true,
      startTime: Date.now(),
      commands: []
    }

    console.log(`Started recording macro: ${macroName}`)
  }

  /**
   * Stop recording and save the macro
   */
  stopRecording(macroName?: string, description?: string): CommandMacro | null {
    if (!this.recorder.isRecording) {
      return null
    }

    const macro: CommandMacro = {
      id: this.generateMacroId(macroName || 'Untitled'),
      name: macroName || 'Untitled Macro',
      description: description || `Recorded at ${new Date().toLocaleString()}`,
      commands: [...this.recorder.commands],
      category: 'user',
      createdAt: new Date().toISOString(),
      icon: '\u23fa\ufe0f' // Recording icon
    }

    this.recorder = {
      isRecording: false,
      commands: []
    }

    this.macros.set(macro.id, macro)
    this.saveMacros()

    console.log(`Stopped recording macro: ${macro.name}`)
    return macro
  }

  /**
   * Add a command to the current recording
   */
  recordCommand(commandId: string, parameters?: Record<string, any>, delay?: number): void {
    if (!this.recorder.isRecording) {
      return
    }

    // Calculate delay since last command or start
    const currentTime = Date.now()
    const calculatedDelay = delay ?? (this.recorder.commands.length > 0 
      ? currentTime - (this.recorder.startTime || currentTime)
      : 0)

    this.recorder.commands.push({
      commandId,
      parameters,
      delay: Math.min(calculatedDelay, 5000) // Cap delay at 5 seconds
    })

    console.log(`Recorded command: ${commandId}`)
  }

  /**
   * Execute a macro
   */
  async executeMacro(macroId: string, executeCallback: (commandId: string, parameters?: Record<string, any>) => void): Promise<void> {
    const macro = this.macros.get(macroId)
    if (!macro) {
      throw new Error(`Macro not found: ${macroId}`)
    }

    // Update last used timestamp
    macro.lastUsed = new Date().toISOString()
    this.saveMacros()

    console.log(`Executing macro: ${macro.name} (${macro.commands.length} commands)`)

    // Execute commands with delays
    for (const macroCmd of macro.commands) {
      if (macroCmd.delay && macroCmd.delay > 0) {
        await this.delay(macroCmd.delay)
      }
      
      executeCallback(macroCmd.commandId, macroCmd.parameters)
    }
  }

  /**
   * Delete a macro
   */
  deleteMacro(macroId: string): boolean {
    const deleted = this.macros.delete(macroId)
    if (deleted) {
      this.saveMacros()
      console.log(`Deleted macro: ${macroId}`)
    }
    return deleted
  }

  /**
   * Get all macros
   */
  getAllMacros(): CommandMacro[] {
    return Array.from(this.macros.values()).sort((a, b) => {
      // Sort by last used first, then by creation date
      if (a.lastUsed && b.lastUsed) {
        return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
      }
      if (a.lastUsed) return -1
      if (b.lastUsed) return 1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }

  /**
   * Get macro by ID
   */
  getMacro(macroId: string): CommandMacro | undefined {
    return this.macros.get(macroId)
  }

  /**
   * Convert macros to command items for command bar
   */
  getMacroCommands(): CommandItem[] {
    return this.getAllMacros().map(macro => ({
      id: `macro:${macro.id}`,
      label: `Run ${macro.name}`,
      icon: macro.icon || '\u26a1',
      description: macro.description,
      category: 'macro' as const
    }))
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.recorder.isRecording
  }

  /**
   * Get current recording state
   */
  getRecordingState(): MacroRecorder {
    return { ...this.recorder }
  }

  /**
   * Create built-in system macros
   */
  private createSystemMacros(): void {
    const systemMacros: CommandMacro[] = [
      {
        id: 'reset-all-layouts',
        name: 'Reset All Layouts',
        description: 'Reset all windows to their default positions',
        commands: [
          { commandId: 'action:reset-layout' }
        ],
        category: 'system',
        createdAt: new Date().toISOString(),
        icon: '\u21ba'
      },
      {
        id: 'open-all-windows',
        name: 'Open All Windows',
        description: 'Open all available windows',
        commands: [
          { commandId: 'window:gallery' },
          { commandId: 'window:preview' },
          { commandId: 'window:editor' },
          { commandId: 'window:prompt' },
          { commandId: 'window:export' },
          { commandId: 'window:history' },
          { commandId: 'window:community' },
          { commandId: 'window:share' },
          { commandId: 'window:notifications' }
        ],
        category: 'system',
        createdAt: new Date().toISOString(),
        icon: '\ud83d\udeaa'
      },
      {
        id: 'workspace-setup',
        name: 'Setup Workspace',
        description: 'Open essential windows for cube editing workflow',
        commands: [
          { commandId: 'window:gallery' },
          { commandId: 'window:preview', delay: 200 },
          { commandId: 'window:editor', delay: 400 }
        ],
        category: 'system',
        createdAt: new Date().toISOString(),
        icon: '\u2699\ufe0f'
      }
    ]

    systemMacros.forEach(macro => {
      this.macros.set(macro.id, macro)
    })
  }

  /**
   * Save macros to localStorage
   */
  private saveMacros(): void {
    try {
      const macrosData = Array.from(this.macros.entries())
      localStorage.setItem(CommandMacros.STORAGE_KEY, JSON.stringify(macrosData))
    } catch (error) {
      console.error('Failed to save macros:', error)
    }
  }

  /**
   * Load macros from localStorage
   */
  private loadMacros(): void {
    try {
      const saved = localStorage.getItem(CommandMacros.STORAGE_KEY)
      if (saved) {
        const macrosData: [string, CommandMacro][] = JSON.parse(saved)
        this.macros = new Map(macrosData)
      }
    } catch (error) {
      console.error('Failed to load macros:', error)
    }

    // Always ensure system macros exist
    this.createSystemMacros()
  }

  /**
   * Generate unique macro ID
   */
  private generateMacroId(name: string): string {
    const base = name.toLowerCase().replace(/[^a-z0-9]/g, '-')
    let id = base
    let counter = 1

    while (this.macros.has(id)) {
      id = `${base}-${counter}`
      counter++
    }

    return id
  }

  /**
   * Helper function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Global instance for use throughout the application
export const commandMacros = new CommandMacros()