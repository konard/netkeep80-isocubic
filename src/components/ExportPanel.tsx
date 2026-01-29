/**
 * ExportPanel component for managing cube configuration export/import
 * Provides UI for downloading, uploading, and managing saved cube configurations
 *
 * TASK 40: Added component metadata for Developer Mode support (Phase 6)
 *
 * Features:
 * - Download cube configurations as JSON files
 * - Upload and import existing configurations
 * - Save configurations to browser localStorage
 * - List and manage saved configurations
 * - Undo/Redo support for editing history
 * - Developer Mode metadata for self-documentation
 */

import { useState, useCallback, useEffect } from 'react'
import type { SpectralCube } from '../types/cube'
import type { ComponentMeta } from '../types/component-meta'
import {
  exportCubeToFile,
  importCubeFromFile,
  saveCubeToStorage,
  getSavedCubesList,
  deleteCubeFromStorage,
  loadCubeFromStorage,
  triggerFileInput,
  undo,
  redo,
  canUndo,
  canRedo,
  type StoredConfig,
  type ImportResult,
} from '../lib/storage'
import { registerComponentMeta } from '../types/component-meta'
import { ComponentInfo } from './ComponentInfo'
import { useIsDevModeEnabled } from '../lib/devmode'

/**
 * Component metadata for Developer Mode
 */
export const EXPORT_PANEL_META: ComponentMeta = {
  id: 'export-panel',
  name: 'ExportPanel',
  version: '1.1.0',
  summary: 'Export/Import and storage management panel for cube configurations.',
  description:
    'ExportPanel provides a comprehensive UI for managing cube configurations. It supports exporting ' +
    'cubes as JSON files for sharing or backup, importing previously saved configurations, and storing ' +
    'configurations locally in the browser using localStorage. The component also includes undo/redo ' +
    'functionality to navigate through editing history, and displays a list of all saved configurations ' +
    'with options to load or delete them.',
  phase: 4,
  taskId: 'TASK 40',
  filePath: 'components/ExportPanel.tsx',
  history: [
    {
      version: '1.0.0',
      date: '2026-01-28T12:00:00Z',
      description: 'Initial implementation with export/import and localStorage support',
      taskId: 'TASK 4',
      type: 'created',
    },
    {
      version: '1.0.1',
      date: '2026-01-28T14:00:00Z',
      description: 'Added undo/redo history navigation',
      taskId: 'TASK 4',
      type: 'updated',
    },
    {
      version: '1.1.0',
      date: '2026-01-29T21:00:00Z',
      description: 'Added Developer Mode metadata support for self-documentation',
      taskId: 'TASK 40',
      type: 'updated',
    },
  ],
  features: [
    {
      id: 'json-export',
      name: 'JSON Export',
      description: 'Download cube configuration as a shareable JSON file',
      enabled: true,
      taskId: 'TASK 4',
    },
    {
      id: 'json-import',
      name: 'JSON Import',
      description: 'Upload and load cube configuration from JSON files',
      enabled: true,
      taskId: 'TASK 4',
    },
    {
      id: 'local-storage',
      name: 'Local Storage',
      description: 'Save configurations to browser localStorage for persistence',
      enabled: true,
      taskId: 'TASK 4',
    },
    {
      id: 'saved-configs-list',
      name: 'Saved Configurations List',
      description: 'View, load, and delete previously saved configurations',
      enabled: true,
      taskId: 'TASK 4',
    },
    {
      id: 'undo-redo',
      name: 'Undo/Redo History',
      description: 'Navigate through editing history with undo/redo controls',
      enabled: true,
      taskId: 'TASK 4',
    },
  ],
  dependencies: [
    {
      name: '../lib/storage',
      type: 'lib',
      purpose: 'Storage utilities for export/import and localStorage',
    },
  ],
  relatedFiles: [
    { path: 'lib/storage.ts', type: 'util', description: 'Storage utilities and functions' },
    {
      path: 'components/ExportPanel.test.tsx',
      type: 'test',
      description: 'Unit tests for ExportPanel',
    },
  ],
  props: [
    {
      name: 'currentCube',
      type: 'SpectralCube | null',
      required: true,
      description: 'Current cube configuration to export/save',
    },
    {
      name: 'onCubeLoad',
      type: '(cube: SpectralCube) => void',
      required: false,
      description: 'Callback when a cube is loaded/imported',
    },
    {
      name: 'onCubeChange',
      type: '(cube: SpectralCube) => void',
      required: false,
      description: 'Callback for undo/redo cube changes',
    },
    {
      name: 'className',
      type: 'string',
      required: false,
      defaultValue: "''",
      description: 'Additional CSS class name',
    },
  ],
  tips: [
    'Use Download JSON to share configurations with others',
    'Saved configurations persist in browser localStorage across sessions',
    'Keyboard shortcuts: Ctrl+Z for undo, Ctrl+Shift+Z for redo',
  ],
  knownIssues: ['localStorage has a size limit (~5MB); large galleries may exceed this'],
  tags: ['export', 'import', 'storage', 'persistence', 'phase-4'],
  status: 'stable',
  lastUpdated: '2026-01-29T21:00:00Z',
}

// Register metadata in the global registry
registerComponentMeta(EXPORT_PANEL_META)

/**
 * Props for ExportPanel component
 */
export interface ExportPanelProps {
  /** Current cube configuration */
  currentCube: SpectralCube | null
  /** Callback when a cube is loaded/imported */
  onCubeLoad?: (cube: SpectralCube) => void
  /** Callback when cube changes (for undo/redo) */
  onCubeChange?: (cube: SpectralCube) => void
  /** Custom class name */
  className?: string
}

/**
 * ExportPanel component
 * Provides export/import and saved configs management UI
 */
export function ExportPanel({
  currentCube,
  onCubeLoad,
  onCubeChange,
  className = '',
}: ExportPanelProps) {
  // Use lazy initialization for initial state from localStorage
  const [savedConfigs, setSavedConfigs] = useState<StoredConfig[]>(() => getSavedCubesList())
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const [undoAvailable, setUndoAvailable] = useState(() => canUndo())
  const [redoAvailable, setRedoAvailable] = useState(() => canRedo())

  // Check if DevMode is enabled for ComponentInfo wrapper
  const isDevModeEnabled = useIsDevModeEnabled()

  // Refresh saved configs
  const refreshSavedConfigs = useCallback(() => {
    setSavedConfigs(getSavedCubesList())
    setUndoAvailable(canUndo())
    setRedoAvailable(canRedo())
  }, [])

  // Clear messages after timeout
  useEffect(() => {
    if (importError) {
      const timer = setTimeout(() => setImportError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [importError])

  useEffect(() => {
    if (importSuccess) {
      const timer = setTimeout(() => setImportSuccess(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [importSuccess])

  // Handle export to JSON file
  const handleExport = useCallback(() => {
    if (!currentCube) return
    exportCubeToFile(currentCube)
    setImportSuccess('Configuration exported successfully')
  }, [currentCube])

  // Handle save to LocalStorage
  const handleSave = useCallback(() => {
    if (!currentCube) return
    saveCubeToStorage(currentCube)
    refreshSavedConfigs()
    setImportSuccess('Configuration saved')
  }, [currentCube, refreshSavedConfigs])

  // Handle import from file
  const handleImport = useCallback(() => {
    setImportError(null)
    triggerFileInput(async (file: File) => {
      const result: ImportResult = await importCubeFromFile(file)
      if (result.success && result.cube) {
        onCubeLoad?.(result.cube)
        setImportSuccess(`Imported: ${result.cube.meta?.name || result.cube.id}`)
        refreshSavedConfigs()
      } else {
        setImportError(result.error || 'Failed to import')
      }
    })
  }, [onCubeLoad, refreshSavedConfigs])

  // Handle loading saved config
  const handleLoadSaved = useCallback(
    (id: string) => {
      const cube = loadCubeFromStorage(id)
      if (cube) {
        onCubeLoad?.(cube)
        setImportSuccess(`Loaded: ${cube.meta?.name || cube.id}`)
      }
    },
    [onCubeLoad]
  )

  // Handle deleting saved config
  const handleDeleteSaved = useCallback(
    (id: string) => {
      if (deleteCubeFromStorage(id)) {
        refreshSavedConfigs()
        setImportSuccess('Configuration deleted')
      }
    },
    [refreshSavedConfigs]
  )

  // Handle undo
  const handleUndo = useCallback(() => {
    const previousCube = undo()
    if (previousCube) {
      onCubeChange?.(previousCube)
      refreshSavedConfigs()
    }
  }, [onCubeChange, refreshSavedConfigs])

  // Handle redo
  const handleRedo = useCallback(() => {
    const nextCube = redo()
    if (nextCube) {
      onCubeChange?.(nextCube)
      refreshSavedConfigs()
    }
  }, [onCubeChange, refreshSavedConfigs])

  // Format date for display
  const formatDate = (isoDate: string): string => {
    try {
      return new Date(isoDate).toLocaleString()
    } catch {
      return isoDate
    }
  }

  const panelContent = (
    <div className={`export-panel ${className}`}>
      {/* Undo/Redo controls */}
      <div className="export-panel__history">
        <button
          type="button"
          onClick={handleUndo}
          disabled={!undoAvailable}
          className="export-panel__button export-panel__button--history"
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={handleRedo}
          disabled={!redoAvailable}
          className="export-panel__button export-panel__button--history"
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
        >
          Redo
        </button>
      </div>

      {/* Export/Import actions */}
      <div className="export-panel__actions">
        <button
          type="button"
          onClick={handleExport}
          disabled={!currentCube}
          className="export-panel__button export-panel__button--primary"
          title="Download JSON file"
        >
          Download JSON
        </button>
        <button
          type="button"
          onClick={handleImport}
          className="export-panel__button export-panel__button--secondary"
          title="Upload JSON file"
        >
          Upload JSON
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!currentCube}
          className="export-panel__button export-panel__button--save"
          title="Save to browser storage"
        >
          Save
        </button>
      </div>

      {/* Status messages */}
      {importError && (
        <div className="export-panel__message export-panel__message--error" role="alert">
          {importError}
        </div>
      )}
      {importSuccess && (
        <div className="export-panel__message export-panel__message--success" role="status">
          {importSuccess}
        </div>
      )}

      {/* Saved configs list */}
      {savedConfigs.length > 0 && (
        <div className="export-panel__saved">
          <h3 className="export-panel__saved-title">Saved Configurations</h3>
          <ul className="export-panel__saved-list">
            {savedConfigs.map((config) => (
              <li key={config.cube.id} className="export-panel__saved-item">
                <div className="export-panel__saved-info">
                  <span className="export-panel__saved-name">
                    {config.cube.meta?.name || config.cube.id}
                  </span>
                  <span className="export-panel__saved-date">{formatDate(config.savedAt)}</span>
                </div>
                <div className="export-panel__saved-actions">
                  <button
                    type="button"
                    onClick={() => handleLoadSaved(config.cube.id)}
                    className="export-panel__button export-panel__button--small"
                    title="Load this configuration"
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSaved(config.cube.id)}
                    className="export-panel__button export-panel__button--small export-panel__button--danger"
                    title="Delete this configuration"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )

  return isDevModeEnabled ? (
    <ComponentInfo meta={EXPORT_PANEL_META}>{panelContent}</ComponentInfo>
  ) : (
    panelContent
  )
}

export default ExportPanel
