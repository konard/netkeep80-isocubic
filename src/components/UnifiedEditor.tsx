/**
 * UnifiedEditor Component
 * Combines all editors into a single adaptive interface with tabs
 *
 * TASK 34: Unified Editor - Combines ParamEditor, FFTParamEditor, StackEditor,
 * CollaborativeParamEditor, LODConfigEditor, and EnergyVisualizationEditor
 *
 * Features:
 * - Tab-based navigation for organizing sections
 * - Mobile-optimized responsive design
 * - Quick Actions panel for common operations
 * - Editor mode switching (Spectral, FFT, Stack)
 * - Collaboration mode support
 * - Performance optimized with lazy loading
 */

import { useState, useCallback, useMemo, useEffect, lazy, Suspense } from 'react'
import type { SpectralCube, FFTCubeConfig } from '../types/cube'
import type { CubeStackConfig } from '../types/stack'
import type { LODConfig, LODStatistics } from '../types/lod'
import type { Participant, CollaborativeAction, ParticipantId } from '../types/collaboration'
import { createDefaultCube, createDefaultFFTCube } from '../types/cube'
import { createCubeStack } from '../types/stack'
import { CollaborationManager } from '../lib/collaboration'

// Lazy load heavy editor components for better performance
const ParamEditor = lazy(() => import('./ParamEditor').then((m) => ({ default: m.ParamEditor })))
const FFTParamEditor = lazy(() =>
  import('./FFTParamEditor').then((m) => ({ default: m.FFTParamEditor }))
)
const StackEditor = lazy(() => import('./StackEditor').then((m) => ({ default: m.StackEditor })))
const CollaborativeParamEditor = lazy(() =>
  import('./CollaborativeParamEditor').then((m) => ({ default: m.CollaborativeParamEditor }))
)
const LODConfigEditor = lazy(() =>
  import('./LODConfigEditor').then((m) => ({ default: m.LODConfigEditor }))
)
const EnergyVisualizationEditor = lazy(() =>
  import('./EnergyVisualizationEditor').then((m) => ({ default: m.EnergyVisualizationEditor }))
)
const FFTChannelEditor = lazy(() =>
  import('./FFTChannelEditor').then((m) => ({ default: m.FFTChannelEditor }))
)

/**
 * Editor mode determines which type of cube/object is being edited
 */
export type EditorMode = 'spectral' | 'fft' | 'stack'

/**
 * Tab identifiers for the unified editor
 */
export type EditorTab =
  | 'general'
  | 'appearance'
  | 'physics'
  | 'energy'
  | 'stack'
  | 'lod'
  | 'collaboration'

/**
 * Quick action types available in the editor
 */
export type QuickActionType =
  | 'reset'
  | 'duplicate'
  | 'randomize'
  | 'save_preset'
  | 'load_preset'
  | 'export_json'
  | 'copy_config'

/**
 * Quick action definition
 */
export interface QuickAction {
  /** Action type identifier */
  type: QuickActionType
  /** Display label */
  label: string
  /** Icon character or emoji */
  icon: string
  /** Description tooltip */
  description: string
  /** Whether action is available */
  enabled: boolean
  /** Keyboard shortcut (optional) */
  shortcut?: string
}

/**
 * Props for UnifiedEditor component
 */
export interface UnifiedEditorProps {
  /** Current spectral cube configuration (for spectral mode) */
  currentCube?: SpectralCube | null
  /** Current FFT cube configuration (for fft mode) */
  currentFFTCube?: FFTCubeConfig | null
  /** Current stack configuration (for stack mode) */
  currentStack?: CubeStackConfig | null
  /** Initial editor mode */
  initialMode?: EditorMode
  /** Callback when spectral cube is updated */
  onCubeUpdate?: (cube: SpectralCube) => void
  /** Callback when FFT cube is updated */
  onFFTCubeUpdate?: (cube: FFTCubeConfig) => void
  /** Callback when stack is updated */
  onStackUpdate?: (stack: CubeStackConfig) => void
  /** Callback when editor mode changes */
  onModeChange?: (mode: EditorMode) => void
  /** LOD configuration */
  lodConfig?: LODConfig
  /** Callback when LOD configuration changes */
  onLODConfigChange?: (config: LODConfig) => void
  /** LOD statistics for display */
  lodStatistics?: LODStatistics
  /** Enable collaboration mode */
  collaborationEnabled?: boolean
  /** Collaboration manager instance */
  collaborationManager?: CollaborationManager
  /** Participants in collaboration session */
  participants?: Map<ParticipantId, Participant>
  /** Local participant ID */
  localParticipantId?: ParticipantId
  /** Recent collaborative actions */
  collaborativeActions?: CollaborativeAction[]
  /** Callback when action is undone */
  onUndoAction?: (action: CollaborativeAction) => void
  /** Whether to show on mobile device */
  isMobile?: boolean
  /** Custom class name */
  className?: string
}

/**
 * Tab configuration with label and icon
 */
interface TabConfig {
  id: EditorTab
  label: string
  icon: string
  availableInModes: EditorMode[]
  description: string
}

/**
 * All available tabs configuration
 */
const TABS_CONFIG: TabConfig[] = [
  {
    id: 'general',
    label: 'General',
    icon: '📝',
    availableInModes: ['spectral', 'fft', 'stack'],
    description: 'Basic properties and metadata',
  },
  {
    id: 'appearance',
    label: 'Appearance',
    icon: '🎨',
    availableInModes: ['spectral', 'fft'],
    description: 'Colors, gradients, and visual effects',
  },
  {
    id: 'physics',
    label: 'Physics',
    icon: '⚙️',
    availableInModes: ['spectral', 'fft', 'stack'],
    description: 'Material and physical properties',
  },
  {
    id: 'energy',
    label: 'Energy',
    icon: '⚡',
    availableInModes: ['fft'],
    description: 'FFT channels and energy settings',
  },
  {
    id: 'stack',
    label: 'Layers',
    icon: '📚',
    availableInModes: ['stack'],
    description: 'Stack layers and transitions',
  },
  {
    id: 'lod',
    label: 'LOD',
    icon: '🔍',
    availableInModes: ['spectral', 'fft', 'stack'],
    description: 'Level of detail settings',
  },
  {
    id: 'collaboration',
    label: 'Collab',
    icon: '👥',
    availableInModes: ['spectral', 'fft'],
    description: 'Collaboration and history',
  },
]

/**
 * Loading fallback component
 */
function EditorLoading() {
  return (
    <div className="unified-editor__loading">
      <span className="unified-editor__loading-spinner" aria-hidden="true">
        ⏳
      </span>
      <span>Loading editor...</span>
    </div>
  )
}

/**
 * UnifiedEditor component
 * Combines all editors into a single adaptive interface
 */
export function UnifiedEditor({
  currentCube = null,
  currentFFTCube = null,
  currentStack = null,
  initialMode = 'spectral',
  onCubeUpdate,
  onFFTCubeUpdate,
  onStackUpdate,
  onModeChange,
  lodConfig,
  onLODConfigChange,
  lodStatistics,
  collaborationEnabled = false,
  collaborationManager,
  participants,
  localParticipantId,
  collaborativeActions,
  onUndoAction,
  isMobile = false,
  className = '',
}: UnifiedEditorProps) {
  // Editor state
  const [editorMode, setEditorMode] = useState<EditorMode>(initialMode)
  const [activeTab, setActiveTab] = useState<EditorTab>('general')
  const [showQuickActions, setShowQuickActions] = useState(!isMobile)

  // Local copies for editing
  const [localCube, setLocalCube] = useState<SpectralCube | null>(currentCube)
  const [localFFTCube, setLocalFFTCube] = useState<FFTCubeConfig | null>(currentFFTCube)
  const [localStack, setLocalStack] = useState<CubeStackConfig | null>(currentStack)

  // Sync local state with props
  useEffect(() => {
    setLocalCube(currentCube)
  }, [currentCube])

  useEffect(() => {
    setLocalFFTCube(currentFFTCube)
  }, [currentFFTCube])

  useEffect(() => {
    setLocalStack(currentStack)
  }, [currentStack])

  // Filter tabs based on current mode
  const availableTabs = useMemo(() => {
    let tabs = TABS_CONFIG.filter((tab) => tab.availableInModes.includes(editorMode))

    // Filter out collaboration tab if not enabled
    if (!collaborationEnabled) {
      tabs = tabs.filter((tab) => tab.id !== 'collaboration')
    }

    return tabs
  }, [editorMode, collaborationEnabled])

  // Ensure active tab is valid for current mode
  useEffect(() => {
    if (!availableTabs.find((tab) => tab.id === activeTab)) {
      setActiveTab(availableTabs[0]?.id || 'general')
    }
  }, [availableTabs, activeTab])

  // Handle mode change
  const handleModeChange = useCallback(
    (newMode: EditorMode) => {
      setEditorMode(newMode)
      onModeChange?.(newMode)
      // Reset to first available tab for new mode
      const firstTab = TABS_CONFIG.find((tab) => tab.availableInModes.includes(newMode))
      if (firstTab) {
        setActiveTab(firstTab.id)
      }
    },
    [onModeChange]
  )

  // Handle cube update
  const handleCubeUpdate = useCallback(
    (cube: SpectralCube) => {
      setLocalCube(cube)
      onCubeUpdate?.(cube)
    },
    [onCubeUpdate]
  )

  // Handle FFT cube update
  const handleFFTCubeUpdate = useCallback(
    (cube: FFTCubeConfig) => {
      setLocalFFTCube(cube)
      onFFTCubeUpdate?.(cube)
    },
    [onFFTCubeUpdate]
  )

  // Handle stack update
  const handleStackUpdate = useCallback(
    (stack: CubeStackConfig) => {
      setLocalStack(stack)
      onStackUpdate?.(stack)
    },
    [onStackUpdate]
  )

  // Quick actions
  const quickActions = useMemo<QuickAction[]>(() => {
    const hasContent =
      (editorMode === 'spectral' && localCube) ||
      (editorMode === 'fft' && localFFTCube) ||
      (editorMode === 'stack' && localStack)

    return [
      {
        type: 'reset',
        label: 'Reset',
        icon: '🔄',
        description: 'Reset to default values',
        enabled: hasContent,
        shortcut: 'Ctrl+R',
      },
      {
        type: 'duplicate',
        label: 'Duplicate',
        icon: '📋',
        description: 'Create a copy',
        enabled: hasContent,
        shortcut: 'Ctrl+D',
      },
      {
        type: 'randomize',
        label: 'Randomize',
        icon: '🎲',
        description: 'Generate random values',
        enabled: true,
        shortcut: 'Ctrl+Shift+R',
      },
      {
        type: 'copy_config',
        label: 'Copy',
        icon: '📄',
        description: 'Copy configuration to clipboard',
        enabled: hasContent,
        shortcut: 'Ctrl+C',
      },
      {
        type: 'export_json',
        label: 'Export',
        icon: '💾',
        description: 'Export as JSON file',
        enabled: hasContent,
        shortcut: 'Ctrl+S',
      },
    ]
  }, [editorMode, localCube, localFFTCube, localStack])

  // Execute quick action
  const executeQuickAction = useCallback(
    (actionType: QuickActionType) => {
      switch (actionType) {
        case 'reset': {
          if (editorMode === 'spectral') {
            const id = localCube?.id || `cube_${Date.now()}`
            const newCube = createDefaultCube(id)
            handleCubeUpdate(newCube)
          } else if (editorMode === 'fft') {
            const id = localFFTCube?.id || `fft_cube_${Date.now()}`
            const newCube = createDefaultFFTCube(id)
            handleFFTCubeUpdate(newCube)
          } else if (editorMode === 'stack') {
            const id = localStack?.id || `stack_${Date.now()}`
            const newStack = createCubeStack(id, [])
            handleStackUpdate(newStack)
          }
          break
        }
        case 'duplicate': {
          if (editorMode === 'spectral' && localCube) {
            const newCube: SpectralCube = {
              ...localCube,
              id: `${localCube.id}_copy_${Date.now()}`,
              meta: {
                ...localCube.meta,
                name: `${localCube.meta?.name || 'Cube'} (Copy)`,
                created: new Date().toISOString(),
              },
            }
            handleCubeUpdate(newCube)
          } else if (editorMode === 'fft' && localFFTCube) {
            const newCube: FFTCubeConfig = {
              ...localFFTCube,
              id: `${localFFTCube.id}_copy_${Date.now()}`,
              meta: {
                ...localFFTCube.meta,
                name: `${localFFTCube.meta?.name || 'FFT Cube'} (Copy)`,
                created: new Date().toISOString(),
              },
            }
            handleFFTCubeUpdate(newCube)
          } else if (editorMode === 'stack' && localStack) {
            const newStack: CubeStackConfig = {
              ...localStack,
              id: `${localStack.id}_copy_${Date.now()}`,
              meta: {
                ...localStack.meta,
                name: `${localStack.meta?.name || 'Stack'} (Copy)`,
                created: new Date().toISOString(),
              },
            }
            handleStackUpdate(newStack)
          }
          break
        }
        case 'randomize': {
          if (editorMode === 'spectral') {
            const randomCube = createDefaultCube(`random_${Date.now()}`)
            randomCube.base.color = [Math.random(), Math.random(), Math.random()]
            randomCube.base.roughness = Math.random()
            randomCube.meta = { name: 'Random Cube', created: new Date().toISOString() }
            handleCubeUpdate(randomCube)
          } else if (editorMode === 'fft') {
            const randomCube = createDefaultFFTCube(`random_fft_${Date.now()}`)
            randomCube.energy_capacity = 50 + Math.random() * 100
            randomCube.current_energy = Math.random() * randomCube.energy_capacity
            randomCube.meta = { name: 'Random FFT Cube', created: new Date().toISOString() }
            handleFFTCubeUpdate(randomCube)
          }
          break
        }
        case 'copy_config': {
          let configString = ''
          if (editorMode === 'spectral' && localCube) {
            configString = JSON.stringify(localCube, null, 2)
          } else if (editorMode === 'fft' && localFFTCube) {
            configString = JSON.stringify(localFFTCube, null, 2)
          } else if (editorMode === 'stack' && localStack) {
            configString = JSON.stringify(localStack, null, 2)
          }
          if (configString) {
            navigator.clipboard.writeText(configString).catch(console.error)
          }
          break
        }
        case 'export_json': {
          let config: object | null = null
          let fileName = 'config.json'
          if (editorMode === 'spectral' && localCube) {
            config = localCube
            fileName = `${localCube.id}.json`
          } else if (editorMode === 'fft' && localFFTCube) {
            config = localFFTCube
            fileName = `${localFFTCube.id}.json`
          } else if (editorMode === 'stack' && localStack) {
            config = localStack
            fileName = `${localStack.id}.json`
          }
          if (config) {
            const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = fileName
            a.click()
            URL.revokeObjectURL(url)
          }
          break
        }
      }
    },
    [
      editorMode,
      localCube,
      localFFTCube,
      localStack,
      handleCubeUpdate,
      handleFFTCubeUpdate,
      handleStackUpdate,
    ]
  )

  // Keyboard shortcuts for quick actions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'r':
            if (e.shiftKey) {
              e.preventDefault()
              executeQuickAction('randomize')
            } else {
              e.preventDefault()
              executeQuickAction('reset')
            }
            break
          case 'd':
            e.preventDefault()
            executeQuickAction('duplicate')
            break
          case 's':
            e.preventDefault()
            executeQuickAction('export_json')
            break
          case 'c':
            if (!window.getSelection()?.toString()) {
              e.preventDefault()
              executeQuickAction('copy_config')
            }
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [executeQuickAction])

  // Render content for current tab
  const renderTabContent = () => {
    return (
      <Suspense fallback={<EditorLoading />}>
        {activeTab === 'general' && renderGeneralTab()}
        {activeTab === 'appearance' && renderAppearanceTab()}
        {activeTab === 'physics' && renderPhysicsTab()}
        {activeTab === 'energy' && renderEnergyTab()}
        {activeTab === 'stack' && renderStackTab()}
        {activeTab === 'lod' && renderLODTab()}
        {activeTab === 'collaboration' && renderCollaborationTab()}
      </Suspense>
    )
  }

  // General tab content
  const renderGeneralTab = () => {
    if (editorMode === 'spectral' && localCube) {
      return (
        <div className="unified-editor__tab-content">
          <ParamEditor
            currentCube={localCube}
            onCubeUpdate={handleCubeUpdate}
            className="unified-editor__embedded-editor"
          />
        </div>
      )
    }

    if (editorMode === 'fft' && localFFTCube) {
      return (
        <div className="unified-editor__tab-content">
          <FFTParamEditor
            currentCube={localFFTCube}
            onCubeUpdate={handleFFTCubeUpdate}
            className="unified-editor__embedded-editor"
          />
        </div>
      )
    }

    if (editorMode === 'stack' && localStack) {
      return (
        <div className="unified-editor__tab-content">
          <StackEditor
            currentStack={localStack}
            onStackUpdate={handleStackUpdate}
            className="unified-editor__embedded-editor"
          />
        </div>
      )
    }

    return (
      <div className="unified-editor__empty">
        <p>No content selected</p>
        <p>Select a cube, FFT cube, or stack to edit</p>
      </div>
    )
  }

  // Appearance tab content
  const renderAppearanceTab = () => {
    if (editorMode === 'spectral' && localCube) {
      return (
        <div className="unified-editor__tab-content">
          <ParamEditor
            currentCube={localCube}
            onCubeUpdate={handleCubeUpdate}
            className="unified-editor__embedded-editor"
          />
        </div>
      )
    }

    if (editorMode === 'fft' && localFFTCube) {
      return (
        <div className="unified-editor__tab-content">
          <EnergyVisualizationEditor
            config={localFFTCube}
            onConfigChange={handleFFTCubeUpdate}
            className="unified-editor__embedded-editor"
          />
        </div>
      )
    }

    return null
  }

  // Physics tab content
  const renderPhysicsTab = () => {
    if (editorMode === 'spectral' && localCube) {
      return (
        <div className="unified-editor__tab-content">
          <ParamEditor
            currentCube={localCube}
            onCubeUpdate={handleCubeUpdate}
            className="unified-editor__embedded-editor"
          />
        </div>
      )
    }

    if (editorMode === 'fft' && localFFTCube) {
      return (
        <div className="unified-editor__tab-content">
          <FFTParamEditor
            currentCube={localFFTCube}
            onCubeUpdate={handleFFTCubeUpdate}
            className="unified-editor__embedded-editor"
          />
        </div>
      )
    }

    if (editorMode === 'stack' && localStack) {
      return (
        <div className="unified-editor__tab-content">
          <StackEditor
            currentStack={localStack}
            onStackUpdate={handleStackUpdate}
            className="unified-editor__embedded-editor"
          />
        </div>
      )
    }

    return null
  }

  // Energy tab content (FFT only)
  const renderEnergyTab = () => {
    if (editorMode !== 'fft' || !localFFTCube) {
      return null
    }

    return (
      <div className="unified-editor__tab-content">
        <FFTChannelEditor
          cube={localFFTCube}
          onCubeChange={handleFFTCubeUpdate}
          className="unified-editor__embedded-editor"
        />
        <EnergyVisualizationEditor
          config={localFFTCube}
          onConfigChange={handleFFTCubeUpdate}
          className="unified-editor__embedded-editor"
        />
      </div>
    )
  }

  // Stack tab content
  const renderStackTab = () => {
    if (editorMode !== 'stack' || !localStack) {
      return null
    }

    return (
      <div className="unified-editor__tab-content">
        <StackEditor
          currentStack={localStack}
          onStackUpdate={handleStackUpdate}
          className="unified-editor__embedded-editor"
        />
      </div>
    )
  }

  // LOD tab content
  const renderLODTab = () => {
    return (
      <div className="unified-editor__tab-content">
        <LODConfigEditor
          config={lodConfig}
          onConfigChange={onLODConfigChange}
          statistics={lodStatistics}
          showAdvanced={true}
          className="unified-editor__embedded-editor"
        />
      </div>
    )
  }

  // Collaboration tab content
  const renderCollaborationTab = () => {
    if (!collaborationEnabled) {
      return null
    }

    if (editorMode === 'spectral' && localCube) {
      return (
        <div className="unified-editor__tab-content">
          <CollaborativeParamEditor
            currentCube={localCube}
            onCubeUpdate={handleCubeUpdate}
            lodConfig={lodConfig}
            onLODConfigChange={onLODConfigChange}
            lodStatistics={lodStatistics}
            collaborationManager={collaborationManager}
            participants={participants}
            localParticipantId={localParticipantId}
            actions={collaborativeActions}
            onUndoAction={onUndoAction}
            showHistory={true}
            className="unified-editor__embedded-editor"
          />
        </div>
      )
    }

    return (
      <div className="unified-editor__collaboration-info">
        <h3>Collaboration</h3>
        <p>Collaborative editing is available in Spectral mode</p>
        <button
          type="button"
          className="unified-editor__mode-switch-btn"
          onClick={() => handleModeChange('spectral')}
        >
          Switch to Spectral Mode
        </button>
      </div>
    )
  }

  // Render mode selector
  const renderModeSelector = () => (
    <div className="unified-editor__mode-selector">
      <button
        type="button"
        className={`unified-editor__mode-btn ${editorMode === 'spectral' ? 'unified-editor__mode-btn--active' : ''}`}
        onClick={() => handleModeChange('spectral')}
        aria-pressed={editorMode === 'spectral'}
        title="Edit standard parametric cubes"
      >
        <span className="unified-editor__mode-icon" aria-hidden="true">
          🧊
        </span>
        <span className="unified-editor__mode-label">Spectral</span>
      </button>
      <button
        type="button"
        className={`unified-editor__mode-btn ${editorMode === 'fft' ? 'unified-editor__mode-btn--active' : ''}`}
        onClick={() => handleModeChange('fft')}
        aria-pressed={editorMode === 'fft'}
        title="Edit magical/energy cubes with FFT"
      >
        <span className="unified-editor__mode-icon" aria-hidden="true">
          ⚡
        </span>
        <span className="unified-editor__mode-label">FFT</span>
      </button>
      <button
        type="button"
        className={`unified-editor__mode-btn ${editorMode === 'stack' ? 'unified-editor__mode-btn--active' : ''}`}
        onClick={() => handleModeChange('stack')}
        aria-pressed={editorMode === 'stack'}
        title="Edit cube stacks (vertical layers)"
      >
        <span className="unified-editor__mode-icon" aria-hidden="true">
          📚
        </span>
        <span className="unified-editor__mode-label">Stack</span>
      </button>
    </div>
  )

  // Render tabs navigation
  const renderTabs = () => (
    <nav className="unified-editor__tabs" role="tablist" aria-label="Editor sections">
      {availableTabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          id={`tab-${tab.id}`}
          aria-selected={activeTab === tab.id}
          aria-controls={`tabpanel-${tab.id}`}
          className={`unified-editor__tab ${activeTab === tab.id ? 'unified-editor__tab--active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
          title={tab.description}
        >
          <span className="unified-editor__tab-icon" aria-hidden="true">
            {tab.icon}
          </span>
          <span className="unified-editor__tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  )

  // Render quick actions panel
  const renderQuickActions = () => (
    <div
      className={`unified-editor__quick-actions ${showQuickActions ? 'unified-editor__quick-actions--visible' : ''}`}
    >
      <div className="unified-editor__quick-actions-header">
        <h3 className="unified-editor__quick-actions-title">Quick Actions</h3>
        {isMobile && (
          <button
            type="button"
            className="unified-editor__quick-actions-toggle"
            onClick={() => setShowQuickActions(!showQuickActions)}
            aria-expanded={showQuickActions}
          >
            {showQuickActions ? '▼' : '▲'}
          </button>
        )}
      </div>
      <div className="unified-editor__quick-actions-list">
        {quickActions.map((action) => (
          <button
            key={action.type}
            type="button"
            className="unified-editor__quick-action-btn"
            onClick={() => executeQuickAction(action.type)}
            disabled={!action.enabled}
            title={`${action.description}${action.shortcut ? ` (${action.shortcut})` : ''}`}
          >
            <span className="unified-editor__quick-action-icon" aria-hidden="true">
              {action.icon}
            </span>
            <span className="unified-editor__quick-action-label">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  )

  // Mobile accordion layout
  if (isMobile) {
    return (
      <div className={`unified-editor unified-editor--mobile ${className}`}>
        <header className="unified-editor__header">
          <h2 className="unified-editor__title">Unified Editor</h2>
          {renderModeSelector()}
        </header>

        {/* Quick actions as collapsible */}
        <div className="unified-editor__mobile-quick-actions">
          <button
            type="button"
            className="unified-editor__accordion-header"
            onClick={() => setShowQuickActions(!showQuickActions)}
            aria-expanded={showQuickActions}
          >
            <span>Quick Actions</span>
            <span className="unified-editor__chevron">{showQuickActions ? '▼' : '▶'}</span>
          </button>
          {showQuickActions && renderQuickActions()}
        </div>

        {/* Tab selector for mobile */}
        <div className="unified-editor__mobile-tab-selector">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as EditorTab)}
            className="unified-editor__tab-select"
            aria-label="Select editor section"
          >
            {availableTabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.icon} {tab.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tab content */}
        <main
          className="unified-editor__content"
          role="tabpanel"
          id={`tabpanel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
        >
          {renderTabContent()}
        </main>
      </div>
    )
  }

  // Desktop/tablet layout
  return (
    <div className={`unified-editor unified-editor--desktop ${className}`}>
      <header className="unified-editor__header">
        <h2 className="unified-editor__title">Unified Editor</h2>
        {renderModeSelector()}
      </header>

      {/* Quick actions sidebar */}
      {renderQuickActions()}

      {/* Tab navigation */}
      {renderTabs()}

      {/* Tab content */}
      <main
        className="unified-editor__content"
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {renderTabContent()}
      </main>
    </div>
  )
}

export default UnifiedEditor
