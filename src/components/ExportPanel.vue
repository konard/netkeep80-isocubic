<!--
  ExportPanel component for managing cube configuration export/import (Vue 3 SFC)
  Provides UI for downloading, uploading, and managing saved cube configurations

  TASK 40: Added component metadata for Developer Mode support (Phase 6)
  TASK 64: Migration from React to Vue 3.0 SFC (Phase 10)

  Features:
  - Download cube configurations as JSON files
  - Upload and import existing configurations
  - Save configurations to browser localStorage
  - List and manage saved configurations
  - Undo/Redo support for editing history
-->
<script lang="ts">
import type { ComponentMeta } from '../types/component-meta'
import { registerComponentMeta } from '../types/component-meta'

/**
 * Component metadata for Developer Mode
 */
export const EXPORT_PANEL_META: ComponentMeta = {
  id: 'export-panel',
  name: 'ExportPanel',
  version: '1.2.0',
  summary: 'Export/Import and storage management panel for cube configurations.',
  description:
    'ExportPanel provides a comprehensive UI for managing cube configurations. It supports exporting ' +
    'cubes as JSON files for sharing or backup, importing previously saved configurations, and storing ' +
    'configurations locally in the browser using localStorage. The component also includes undo/redo ' +
    'functionality to navigate through editing history, and displays a list of all saved configurations ' +
    'with options to load or delete them.',
  phase: 4,
  taskId: 'TASK 40',
  filePath: 'components/ExportPanel.vue',
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
    {
      version: '1.2.0',
      date: '2026-01-31T00:00:00Z',
      description: 'Migrated from React to Vue 3.0 SFC',
      taskId: 'TASK 64',
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
      path: 'components/ExportPanel.vue.test.ts',
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
  lastUpdated: '2026-01-31T00:00:00Z',
}

// Register metadata in the global registry
registerComponentMeta(EXPORT_PANEL_META)
</script>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { SpectralCube } from '../types/cube'
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

/**
 * Props for ExportPanel component
 */
interface ExportPanelProps {
  /** Current cube configuration */
  currentCube: SpectralCube | null
  /** Custom class name */
  className?: string
}

const props = withDefaults(defineProps<ExportPanelProps>(), {
  className: '',
})

const emit = defineEmits<{
  cubeLoad: [cube: SpectralCube]
  cubeChange: [cube: SpectralCube]
}>()

// State
const savedConfigs = ref<StoredConfig[]>(getSavedCubesList())
const importError = ref<string | null>(null)
const importSuccess = ref<string | null>(null)
const undoAvailable = ref(canUndo())
const redoAvailable = ref(canRedo())

// Refresh saved configs
function refreshSavedConfigs() {
  savedConfigs.value = getSavedCubesList()
  undoAvailable.value = canUndo()
  redoAvailable.value = canRedo()
}

// Clear messages after timeout
let errorTimer: ReturnType<typeof setTimeout> | null = null
let successTimer: ReturnType<typeof setTimeout> | null = null

watch(importError, (msg) => {
  if (errorTimer) clearTimeout(errorTimer)
  if (msg) {
    errorTimer = setTimeout(() => {
      importError.value = null
    }, 5000)
  }
})

watch(importSuccess, (msg) => {
  if (successTimer) clearTimeout(successTimer)
  if (msg) {
    successTimer = setTimeout(() => {
      importSuccess.value = null
    }, 3000)
  }
})

// Handle export to JSON file
function handleExport() {
  if (!props.currentCube) return
  exportCubeToFile(props.currentCube)
  importSuccess.value = 'Configuration exported successfully'
}

// Handle save to LocalStorage
function handleSave() {
  if (!props.currentCube) return
  saveCubeToStorage(props.currentCube)
  refreshSavedConfigs()
  importSuccess.value = 'Configuration saved'
}

// Handle import from file
function handleImport() {
  importError.value = null
  triggerFileInput(async (file: File) => {
    const result: ImportResult = await importCubeFromFile(file)
    if (result.success && result.cube) {
      emit('cubeLoad', result.cube)
      importSuccess.value = `Imported: ${result.cube.meta?.name || result.cube.id}`
      refreshSavedConfigs()
    } else {
      importError.value = result.error || 'Failed to import'
    }
  })
}

// Handle loading saved config
function handleLoadSaved(id: string) {
  const cube = loadCubeFromStorage(id)
  if (cube) {
    emit('cubeLoad', cube)
    importSuccess.value = `Loaded: ${cube.meta?.name || cube.id}`
  }
}

// Handle deleting saved config
function handleDeleteSaved(id: string) {
  if (deleteCubeFromStorage(id)) {
    refreshSavedConfigs()
    importSuccess.value = 'Configuration deleted'
  }
}

// Handle undo
function handleUndo() {
  const previousCube = undo()
  if (previousCube) {
    emit('cubeChange', previousCube)
    refreshSavedConfigs()
  }
}

// Handle redo
function handleRedo() {
  const nextCube = redo()
  if (nextCube) {
    emit('cubeChange', nextCube)
    refreshSavedConfigs()
  }
}

// Format date for display
function formatDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleString()
  } catch {
    return isoDate
  }
}
</script>

<template>
  <div :class="['export-panel', className]">
    <!-- Undo/Redo controls -->
    <div class="export-panel__history">
      <button
        type="button"
        :disabled="!undoAvailable"
        class="export-panel__button export-panel__button--history"
        title="Undo (Ctrl+Z)"
        aria-label="Undo"
        @click="handleUndo"
      >
        Undo
      </button>
      <button
        type="button"
        :disabled="!redoAvailable"
        class="export-panel__button export-panel__button--history"
        title="Redo (Ctrl+Shift+Z)"
        aria-label="Redo"
        @click="handleRedo"
      >
        Redo
      </button>
    </div>

    <!-- Export/Import actions -->
    <div class="export-panel__actions">
      <button
        type="button"
        :disabled="!currentCube"
        class="export-panel__button export-panel__button--primary"
        title="Download JSON file"
        @click="handleExport"
      >
        Download JSON
      </button>
      <button
        type="button"
        class="export-panel__button export-panel__button--secondary"
        title="Upload JSON file"
        @click="handleImport"
      >
        Upload JSON
      </button>
      <button
        type="button"
        :disabled="!currentCube"
        class="export-panel__button export-panel__button--save"
        title="Save to browser storage"
        @click="handleSave"
      >
        Save
      </button>
    </div>

    <!-- Status messages -->
    <div v-if="importError" class="export-panel__message export-panel__message--error" role="alert">
      {{ importError }}
    </div>
    <div
      v-if="importSuccess"
      class="export-panel__message export-panel__message--success"
      role="status"
    >
      {{ importSuccess }}
    </div>

    <!-- Saved configs list -->
    <div v-if="savedConfigs.length > 0" class="export-panel__saved">
      <h3 class="export-panel__saved-title">Saved Configurations</h3>
      <ul class="export-panel__saved-list">
        <li v-for="config in savedConfigs" :key="config.cube.id" class="export-panel__saved-item">
          <div class="export-panel__saved-info">
            <span class="export-panel__saved-name">
              {{ config.cube.meta?.name || config.cube.id }}
            </span>
            <span class="export-panel__saved-date">{{ formatDate(config.savedAt) }}</span>
          </div>
          <div class="export-panel__saved-actions">
            <button
              type="button"
              class="export-panel__button export-panel__button--small"
              title="Load this configuration"
              @click="handleLoadSaved(config.cube.id)"
            >
              Load
            </button>
            <button
              type="button"
              class="export-panel__button export-panel__button--small export-panel__button--danger"
              title="Delete this configuration"
              @click="handleDeleteSaved(config.cube.id)"
            >
              Delete
            </button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
