<!--
  App.vue — Root component for isocubic
  Adaptive layout with desktop (windowed), tablet, and mobile support

  Phase 11, TASK 68: Windowed desktop layout with command bar
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDeviceType } from './composables/useDeviceType'
import { useCubeEditor } from './composables/useCubeEditor'
import { useDevModeKeyboard, useHoveredComponentId } from './lib/devmode'
import { useAuthStore } from './lib/auth'
import { useWindowManager } from './composables/useWindowManager'
import type { WindowDefinition } from './composables/useWindowManager'
import { windowLayoutManager } from './lib/window-layout-manager'
import { commandMacros } from './lib/command-macros'
import { commandPlugins } from './lib/command-plugins'
import Gallery from './components/Gallery.vue'
import { GALLERY_META } from './components/Gallery.vue'
import ExportPanel from './components/ExportPanel.vue'
import { EXPORT_PANEL_META } from './components/ExportPanel.vue'
import CubePreview from './components/CubePreview.vue'
import { CUBE_PREVIEW_META } from './components/CubePreview.vue'
import UnifiedEditor from './components/UnifiedEditor.vue'
import { UNIFIED_EDITOR_META } from './components/UnifiedEditor.vue'
import ActionHistory from './components/ActionHistory.vue'
import PromptGenerator from './components/PromptGenerator.vue'
import { PROMPT_GENERATOR_META } from './components/PromptGenerator.vue'
import CommunityGallery from './components/CommunityGallery.vue'
import { COMMUNITY_GALLERY_META } from './components/CommunityGallery.vue'
import SharePanel from './components/SharePanel.vue'
import { SHARE_PANEL_META } from './components/SharePanel.vue'
import NotificationPanel from './components/NotificationPanel.vue'
import { NOTIFICATION_PANEL_META } from './components/NotificationPanel.vue'
import GodModeWindow from './components/GodModeWindow.vue'
import ComponentInfo from './components/ComponentInfo.vue'
import DevModeIndicator from './components/DevModeIndicator.vue'
import DraggableWindow from './components/DraggableWindow.vue'
import CommandBar from './components/CommandBar.vue'
import type { CommandItem } from './components/CommandBar.vue'
import WindowTaskbar from './components/WindowTaskbar.vue'
import './App.css'

// Device type detection
const { isTablet, isDesktop } = useDeviceType()

// Cube editor state
const { currentCube, updateCube, selectCube, loadCube } = useCubeEditor()

// DevMode keyboard shortcut (Ctrl+Shift+D)
useDevModeKeyboard()

// Track which component the mouse is hovering over for GodModeWindow
const hoveredComponentId = useHoveredComponentId()

// Auth store initialization
const authStore = useAuthStore()
onMounted(() => {
  authStore.initialize()
})

// --- Window Manager (All devices) ---
const windowDefinitions: WindowDefinition[] = [
  {
    id: 'gallery',
    title: 'Gallery',
    icon: '\uD83C\uDFA8',
    defaultX: 20,
    defaultY: 100,
    defaultWidth: 380,
    defaultHeight: 500,
    minWidth: 280,
    minHeight: 300,
  },
  {
    id: 'preview',
    title: 'Preview',
    icon: '\uD83D\uDC41',
    defaultX: 420,
    defaultY: 100,
    defaultWidth: 500,
    defaultHeight: 400,
    minWidth: 300,
    minHeight: 250,
  },
  {
    id: 'editor',
    title: 'Unified Editor',
    icon: '\u270F\uFE0F',
    defaultX: 420,
    defaultY: 520,
    defaultWidth: 500,
    defaultHeight: 350,
    minWidth: 350,
    minHeight: 250,
  },
  {
    id: 'prompt',
    title: 'Generate by Description',
    icon: '\uD83E\uDD16',
    defaultX: 940,
    defaultY: 100,
    defaultWidth: 400,
    defaultHeight: 300,
    minWidth: 300,
    minHeight: 200,
  },
  {
    id: 'export',
    title: 'Export / Import',
    icon: '\uD83D\uDCE6',
    defaultX: 940,
    defaultY: 420,
    defaultWidth: 400,
    defaultHeight: 280,
    minWidth: 280,
    minHeight: 200,
  },
  {
    id: 'history',
    title: 'Action History',
    icon: '\uD83D\uDCCB',
    defaultX: 940,
    defaultY: 720,
    defaultWidth: 400,
    defaultHeight: 250,
    minWidth: 250,
    minHeight: 180,
  },
  {
    id: 'community',
    title: 'Community Gallery',
    icon: '\uD83C\uDF10',
    defaultX: 1360,
    defaultY: 100,
    defaultWidth: 420,
    defaultHeight: 600,
    minWidth: 350,
    minHeight: 400,
  },
  {
    id: 'share',
    title: 'Share Panel',
    icon: '\uD83D\uDD17',
    defaultX: 1360,
    defaultY: 720,
    defaultWidth: 420,
    defaultHeight: 250,
    minWidth: 300,
    minHeight: 200,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    icon: '\uD83D\uDD14',
    defaultX: 20,
    defaultY: 620,
    defaultWidth: 380,
    defaultHeight: 350,
    minWidth: 280,
    minHeight: 250,
  },
]

const windowManager = useWindowManager(windowDefinitions)

/** Command items for the command bar */
const commandItems = computed<CommandItem[]>(() => {
  const items: CommandItem[] = []

  // Window toggle commands
  for (const def of windowDefinitions) {
    const win = windowManager.getWindow(def.id)
    const isOpen = win?.isOpen ?? false
    items.push({
      id: `window:${def.id}`,
      label: `${isOpen ? 'Focus' : 'Open'} ${def.title}`,
      icon: def.icon,
      description: isOpen ? `Bring ${def.title} to front` : `Open ${def.title} window`,
      category: 'window',
    })
  }

  // Window layout commands
  items.push({
    id: 'action:arrange-windows',
    label: 'Arrange Windows',
    icon: '\ud83d\udccb',
    description: 'Arrange all windows in a grid layout',
    category: 'action',
  })
  items.push({
    id: 'action:tile-windows',
    label: 'Tile Windows',
    icon: '\ud83d\udcd0',
    description: 'Tile windows horizontally or vertically',
    category: 'action',
  })
  items.push({
    id: 'action:cascade-windows',
    label: 'Cascade Windows',
    icon: '\ud83d\udc73',
    description: 'Cascade windows diagonally',
    category: 'action',
  })
  items.push({
    id: 'action:minimize-all',
    label: 'Minimize All',
    icon: '\ud83d\udced',
    description: 'Minimize all windows',
    category: 'action',
  })
  items.push({
    id: 'action:restore-all',
    label: 'Restore All',
    icon: '\ud83d\udd04',
    description: 'Restore all minimized windows',
    category: 'action',
  })

  // Action commands
  items.push({
    id: 'action:reset-layout',
    label: 'Reset Layout',
    icon: '\u21BA',
    description: 'Reset all windows to default positions',
    category: 'action',
  })

  // Add macro commands
  items.push(...commandMacros.getMacroCommands())

  // Add plugin commands
  items.push(...commandPlugins.getAllCommands())

  return items
})

/** Handle command bar execution */
async function onCommandExecute(commandId: string) {
  try {
    // Handle window commands
    if (commandId.startsWith('window:')) {
      const winId = commandId.slice('window:'.length)
      const win = windowManager.getWindow(winId)
      if (win?.isOpen) {
        windowManager.bringToFront(winId)
        if (win.isMinimized) windowManager.restoreWindow(winId)
      } else {
        windowManager.openWindow(winId)
      }
      return
    }

    // Handle macro commands
    if (commandId.startsWith('macro:')) {
      const macroId = commandId.slice('macro:'.length)
      await commandMacros.executeMacro(macroId, onCommandExecute)
      return
    }

    // Handle plugin commands
    if (commandId.includes(':') && !commandId.startsWith('window:') && !commandId.startsWith('action:')) {
      await commandPlugins.executeCommand(commandId)
      return
    }

    // Handle action commands
    switch (commandId) {
      case 'action:arrange-windows':
        const arrangeLayouts = windowLayoutManager.getOptimalLayout(
          Array.from(windowManager.allWindows.value.values()),
          { type: 'arrange' }
        )
        arrangeLayouts.forEach((layout, windowId) => {
          windowManager.moveWindow(windowId, layout.x, layout.y)
          windowManager.resizeWindow(windowId, layout.width, layout.height)
        })
        break

      case 'action:tile-windows':
        const tileLayouts = windowLayoutManager.getOptimalLayout(
          Array.from(windowManager.allWindows.value.values()),
          { type: 'tile' }
        )
        tileLayouts.forEach((layout, windowId) => {
          windowManager.moveWindow(windowId, layout.x, layout.y)
          windowManager.resizeWindow(windowId, layout.width, layout.height)
        })
        break

      case 'action:cascade-windows':
        const cascadeLayouts = windowLayoutManager.getOptimalLayout(
          Array.from(windowManager.allWindows.value.values()),
          { type: 'cascade' }
        )
        cascadeLayouts.forEach((layout, windowId) => {
          windowManager.moveWindow(windowId, layout.x, layout.y)
          windowManager.resizeWindow(windowId, layout.width, layout.height)
        })
        break

      case 'action:minimize-all':
        Array.from(windowManager.allWindows.value.values())
          .filter(w => w.isOpen && !w.isMinimized)
          .forEach(w => windowManager.minimizeWindow(w.id))
        break

      case 'action:restore-all':
        Array.from(windowManager.allWindows.value.values())
          .filter(w => w.isOpen && w.isMinimized)
          .forEach(w => windowManager.restoreWindow(w.id))
        break

      case 'action:reset-layout':
        windowManager.resetLayout()
        break

      default:
        console.warn(`Unknown command: ${commandId}`)
    }
  } catch (error) {
    console.error(`Command execution failed: ${commandId}`, error)
  }
}

// Mobile tab navigation
type MobileTab = 'gallery' | 'preview' | 'editor' | 'tools' | 'social'

const activeMobileTab = ref<MobileTab>('gallery')

const mobileTabs: { id: MobileTab; icon: string; label: string }[] = [
  { id: 'gallery', icon: '🎨', label: 'Gallery' },
  { id: 'preview', icon: '👁', label: 'Preview' },
  { id: 'editor', icon: '✏️', label: 'Editor' },
  { id: 'tools', icon: '🔧', label: 'Tools' },
  { id: 'social', icon: '🌐', label: 'Social' },
]

// Touch swipe navigation for mobile
const touchStartX = ref(0)
const touchEndX = ref(0)
const SWIPE_THRESHOLD = 50

function handleTouchStart(e: TouchEvent) {
  touchStartX.value = e.changedTouches[0].screenX
}

function handleTouchEnd(e: TouchEvent) {
  touchEndX.value = e.changedTouches[0].screenX
  handleSwipe()
}

function handleSwipe() {
  const diff = touchStartX.value - touchEndX.value
  if (Math.abs(diff) < SWIPE_THRESHOLD) return

  const tabIds = mobileTabs.map((t) => t.id)
  const currentIndex = tabIds.indexOf(activeMobileTab.value)

  if (diff > 0 && currentIndex < tabIds.length - 1) {
    // Swipe left → next tab
    activeMobileTab.value = tabIds[currentIndex + 1]
  } else if (diff < 0 && currentIndex > 0) {
    // Swipe right → previous tab
    activeMobileTab.value = tabIds[currentIndex - 1]
  }
}

// Component metadata for DevMode
const APP_META = {
  id: 'app',
  name: 'App',
  version: '3.0.0',
  summary: 'Root application component with windowed desktop layout and command bar.',
  description:
    'App is the root component of isocubic. It provides a windowed desktop layout with draggable, ' +
    'resizable, collapsible windows and a TinyLLM command bar, plus adaptive tablet and mobile layouts. ' +
    'Integrates all subsystems (Gallery, Editor, Preview, Export, GOD MODE) and manages the global ' +
    'cube editing state through the useCubeEditor composable.',
  phase: 11,
  taskId: 'TASK 68',
  filePath: 'src/App.vue',
  history: [
    {
      version: '1.0.0',
      date: '2026-01-29T18:00:00Z',
      description: 'Initial Vue.js 3.0 stub during TASK 60',
      taskId: 'TASK 60',
      type: 'created' as const,
    },
    {
      version: '2.0.0',
      date: '2026-01-31T18:00:00Z',
      description: 'Full adaptive layout with all component integrations',
      taskId: 'TASK 67',
      type: 'updated' as const,
    },
    {
      version: '3.0.0',
      date: '2026-02-01T12:00:00Z',
      description: 'Windowed desktop layout with drag/resize/minimize/close and command bar',
      taskId: 'TASK 68',
      type: 'updated' as const,
    },
  ],
  features: [
    {
      id: 'adaptive-layout',
      name: 'Adaptive Layout',
      description: 'Desktop, tablet, and mobile layouts with automatic switching',
      enabled: true,
      taskId: 'TASK 67',
    },
    {
      id: 'mobile-swipe',
      name: 'Touch Swipe Navigation',
      description: 'Swipe between tabs on mobile devices',
      enabled: true,
      taskId: 'TASK 67',
    },
    {
      id: 'cube-state-management',
      name: 'Cube State Management',
      description: 'Centralized cube state with undo/redo and autosave',
      enabled: true,
      taskId: 'TASK 67',
    },
    {
      id: 'windowed-layout',
      name: 'Windowed Desktop Layout',
      description: 'Draggable, resizable windows with minimize/close/z-order on desktop',
      enabled: true,
      taskId: 'TASK 68',
    },
    {
      id: 'command-bar',
      name: 'Command Bar',
      description: 'TinyLLM command bar for searching and opening windows (Ctrl+K)',
      enabled: true,
      taskId: 'TASK 68',
    },
  ],
  dependencies: [
    {
      name: 'Gallery',
      type: 'component',
      path: 'components/Gallery.vue',
      purpose: 'Cube gallery with presets and user cubes',
    },
    {
      name: 'ExportPanel',
      type: 'component',
      path: 'components/ExportPanel.vue',
      purpose: 'Export/import and undo/redo controls',
    },
    {
      name: 'CubePreview',
      type: 'component',
      path: 'components/CubePreview.vue',
      purpose: '3D cube preview with TresJS',
    },
    {
      name: 'UnifiedEditor',
      type: 'component',
      path: 'components/UnifiedEditor.vue',
      purpose: 'Main tabbed parameter editor',
    },
    {
      name: 'PromptGenerator',
      type: 'component',
      path: 'components/PromptGenerator.vue',
      purpose: 'AI-based cube generation',
    },
    {
      name: 'GodModeWindow',
      type: 'component',
      path: 'components/GodModeWindow.vue',
      purpose: 'GOD MODE developer tools',
    },
    {
      name: 'useDeviceType',
      type: 'hook',
      path: 'composables/useDeviceType.ts',
      purpose: 'Reactive device type detection',
    },
    {
      name: 'useCubeEditor',
      type: 'hook',
      path: 'composables/useCubeEditor.ts',
      purpose: 'Centralized cube editing state',
    },
    {
      name: 'useWindowManager',
      type: 'hook',
      path: 'composables/useWindowManager.ts',
      purpose: 'Window state management for desktop layout',
    },
    {
      name: 'DraggableWindow',
      type: 'component',
      path: 'components/DraggableWindow.vue',
      purpose: 'Draggable/resizable window container',
    },
    {
      name: 'CommandBar',
      type: 'component',
      path: 'components/CommandBar.vue',
      purpose: 'TinyLLM command bar for search and actions',
    },
    {
      name: 'WindowTaskbar',
      type: 'component',
      path: 'components/WindowTaskbar.vue',
      purpose: 'Taskbar for minimized/closed windows',
    },
  ],
  relatedFiles: [
    { path: 'src/App.css', type: 'style', description: 'Styles for all layout variants' },
    {
      path: 'src/composables/useDeviceType.ts',
      type: 'util',
      description: 'Device type composable',
    },
    {
      path: 'src/composables/useCubeEditor.ts',
      type: 'util',
      description: 'Cube editor composable',
    },
  ],
  props: [],
  tags: ['app', 'layout', 'responsive', 'root'],
  status: 'stable' as const,
  lastUpdated: '2026-01-31T18:00:00Z',
}
</script>

<template>
  <!-- Desktop Layout (Windowed) -->
  <div v-if="isDesktop" class="app app--desktop app--windowed">
    <ComponentInfo :meta="APP_META">
      <!-- Header with command bar -->
      <header class="app__header app__header--windowed">
        <div class="app__header-left">
          <h1 class="app__title-compact">isocubic</h1>
        </div>
        <div class="app__header-center">
          <CommandBar :commands="commandItems" @execute="onCommandExecute" />
        </div>
        <div class="app__header-right">
          <span class="app__subtitle-compact">Web editor for parametric cubes</span>
        </div>
      </header>

      <!-- Windowed workspace -->
      <main class="app__workspace">
        <!-- Gallery window -->
        <DraggableWindow
          v-for="win in windowManager.visibleWindows.value"
          :key="win.id"
          :window-id="win.id"
          :title="win.title"
          :icon="win.icon"
          :x="win.x"
          :y="win.y"
          :width="win.width"
          :height="win.height"
          :min-width="win.minWidth"
          :min-height="win.minHeight"
          :z-index="win.zIndex"
          @move="windowManager.moveWindow"
          @resize="windowManager.resizeWindow"
          @minimize="windowManager.minimizeWindow"
          @close="windowManager.closeWindow"
          @focus="windowManager.bringToFront"
        >
          <template v-if="win.id === 'gallery'">
            <ComponentInfo :meta="GALLERY_META">
              <Gallery :current-cube="currentCube" @cube-select="selectCube" />
            </ComponentInfo>
          </template>

          <template v-else-if="win.id === 'preview'">
            <ComponentInfo :meta="CUBE_PREVIEW_META">
              <div class="app__3d-preview app__3d-preview--windowed">
                <CubePreview :config="currentCube" data-testid="cube-preview" />
              </div>
            </ComponentInfo>
          </template>

          <template v-else-if="win.id === 'editor'">
            <ComponentInfo :meta="UNIFIED_EDITOR_META">
              <UnifiedEditor :cube="currentCube" @update:cube="updateCube" />
            </ComponentInfo>
          </template>

          <template v-else-if="win.id === 'prompt'">
            <ComponentInfo :meta="PROMPT_GENERATOR_META">
              <PromptGenerator
                @cube-generated="selectCube"
                @cubes-generated="(cubes) => cubes.length > 0 && selectCube(cubes[0])"
              />
            </ComponentInfo>
          </template>

          <template v-else-if="win.id === 'export'">
            <ComponentInfo :meta="EXPORT_PANEL_META">
              <ExportPanel
                :current-cube="currentCube"
                @cube-load="loadCube"
                @cube-change="updateCube"
              />
            </ComponentInfo>
          </template>

          <template v-else-if="win.id === 'history'">
            <ActionHistory :actions="[]" />
          </template>

          <template v-else-if="win.id === 'community'">
            <ComponentInfo :meta="COMMUNITY_GALLERY_META">
              <CommunityGallery @cube-select="selectCube" />
            </ComponentInfo>
          </template>

          <template v-else-if="win.id === 'share'">
            <ComponentInfo :meta="SHARE_PANEL_META">
              <SharePanel :cube="currentCube" />
            </ComponentInfo>
          </template>

          <template v-else-if="win.id === 'notifications'">
            <ComponentInfo :meta="NOTIFICATION_PANEL_META">
              <NotificationPanel />
            </ComponentInfo>
          </template>
        </DraggableWindow>
      </main>

      <!-- Taskbar -->
      <WindowTaskbar
        :minimized-windows="windowManager.minimizedWindows.value"
        :closed-windows="windowManager.closedWindows.value"
        @restore="windowManager.restoreWindow"
        @open="windowManager.openWindow"
        @reset-layout="windowManager.resetLayout"
      />
    </ComponentInfo>

    <GodModeWindow :selected-component-id="hoveredComponentId" />
    <DevModeIndicator />
  </div>

  <!-- Tablet Layout (Windowed with touch optimization) -->
  <div v-else-if="isTablet" class="app app--tablet app--windowed">
    <ComponentInfo :meta="APP_META">
      <!-- Header with command bar -->
      <header class="app__header app__header--windowed">
        <div class="app__header-left">
          <h1 class="app__title-compact">isocubic</h1>
        </div>
        <div class="app__header-center">
          <CommandBar :commands="commandItems" @execute="onCommandExecute" />
        </div>
        <div class="app__header-right">
          <span class="app__subtitle-compact">Web editor for parametric cubes</span>
        </div>
      </header>

      <!-- Windowed workspace -->
      <main class="app__workspace app__workspace--tablet">
        <DraggableWindow
          v-for="win in windowManager.visibleWindows.value"
          :key="win.id"
          :window-id="win.id"
          :title="win.title"
          :icon="win.icon"
          :x="win.x"
          :y="win.y"
          :width="win.width"
          :height="win.height"
          :min-width="win.minWidth"
          :min-height="win.minHeight"
          :z-index="win.zIndex"
          @move="windowManager.moveWindow"
          @resize="windowManager.resizeWindow"
          @minimize="windowManager.minimizeWindow"
          @close="windowManager.closeWindow"
          @focus="windowManager.bringToFront"
        >
          <template v-if="win.id === 'gallery'">
            <ComponentInfo :meta="GALLERY_META">
              <Gallery :current-cube="currentCube" @cube-select="selectCube" />
            </ComponentInfo>
          </template>

          <template v-else-if="win.id === 'preview'">
            <ComponentInfo :meta="CUBE_PREVIEW_META">
              <div class="app__3d-preview app__3d-preview--windowed">
                <CubePreview :config="currentCube" data-testid="cube-preview" />
              </div>
            </ComponentInfo>
          </template>

          <template v-else-if="win.id === 'editor'">
            <ComponentInfo :meta="UNIFIED_EDITOR_META">
              <UnifiedEditor :cube="currentCube" @update:cube="updateCube" />
            </ComponentInfo>
          </template>

          <template v-else-if="win.id === 'prompt'">
            <ComponentInfo :meta="PROMPT_GENERATOR_META">
              <PromptGenerator
                @cube-generated="selectCube"
                @cubes-generated="(cubes) => cubes.length > 0 && selectCube(cubes[0])"
              />
            </ComponentInfo>
          </template>

          <template v-else-if="win.id === 'export'">
            <ComponentInfo :meta="EXPORT_PANEL_META">
              <ExportPanel
                :current-cube="currentCube"
                @cube-load="loadCube"
                @cube-change="updateCube"
              />
            </ComponentInfo>
          </template>

          <template v-else-if="win.id === 'history'">
            <ActionHistory :actions="[]" />
          </template>

          <template v-else-if="win.id === 'community'">
            <ComponentInfo :meta="COMMUNITY_GALLERY_META">
              <CommunityGallery @cube-select="selectCube" />
            </ComponentInfo>
          </template>

          <template v-else-if="win.id === 'share'">
            <ComponentInfo :meta="SHARE_PANEL_META">
              <SharePanel :cube="currentCube" />
            </ComponentInfo>
          </template>

          <template v-else-if="win.id === 'notifications'">
            <ComponentInfo :meta="NOTIFICATION_PANEL_META">
              <NotificationPanel />
            </ComponentInfo>
          </template>
        </DraggableWindow>
      </main>

      <!-- Taskbar -->
      <WindowTaskbar
        :minimized-windows="windowManager.minimizedWindows.value"
        :closed-windows="windowManager.closedWindows.value"
        @restore="windowManager.restoreWindow"
        @open="windowManager.openWindow"
        @reset-layout="windowManager.resetLayout"
      />
    </ComponentInfo>

    <GodModeWindow :selected-component-id="hoveredComponentId" />
    <DevModeIndicator />
  </div>

  <!-- Mobile Layout (Windowed with tab navigation) -->
  <div
    v-else
    class="app app--mobile app--windowed"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
  >
    <ComponentInfo :meta="APP_META">
      <header class="app__header app__header--mobile">
        <h1 class="app__title-compact">isocubic</h1>
        <!-- Command bar for mobile -->
        <div class="app__mobile-command-bar">
          <CommandBar :commands="commandItems" @execute="onCommandExecute" />
        </div>
      </header>

      <!-- Tab Navigation -->
      <nav class="app__mobile-nav">
        <button
          v-for="tab in mobileTabs"
          :key="tab.id"
          class="app__mobile-tab"
          :class="{ 'app__mobile-tab--active': activeMobileTab === tab.id }"
          :aria-label="tab.label"
          @click="activeMobileTab = tab.id"
        >
          <span class="app__mobile-tab-icon">{{ tab.icon }}</span>
          <span class="app__mobile-tab-label">{{ tab.label }}</span>
        </button>
      </nav>

      <!-- Mobile Content -->
      <div class="app__mobile-content">
        <!-- Gallery Tab -->
        <div v-if="activeMobileTab === 'gallery'" class="app__mobile-panel">
          <Gallery :current-cube="currentCube" @cube-select="selectCube" />
        </div>

        <!-- Preview Tab -->
        <div
          v-if="activeMobileTab === 'preview'"
          class="app__mobile-panel app__mobile-panel--preview"
        >
          <div class="app__current-cube app__current-cube--mobile">
            <div class="app__3d-preview app__3d-preview--mobile">
              <CubePreview :config="currentCube" data-testid="cube-preview" />
            </div>
            <div class="app__cube-info">
              <p>
                <strong>{{
                  currentCube?.meta?.name || currentCube?.id || 'No cube selected'
                }}</strong>
              </p>
              <p v-if="currentCube?.prompt">{{ currentCube.prompt }}</p>
            </div>
          </div>
        </div>

        <!-- Editor Tab -->
        <div v-if="activeMobileTab === 'editor'" class="app__mobile-panel">
          <UnifiedEditor :cube="currentCube" @update:cube="updateCube" />

          <PromptGenerator
            @cube-generated="selectCube"
            @cubes-generated="(cubes) => cubes.length > 0 && selectCube(cubes[0])"
          />
        </div>

        <!-- Tools Tab -->
        <div v-if="activeMobileTab === 'tools'" class="app__mobile-panel">
          <ComponentInfo :meta="EXPORT_PANEL_META">
            <ExportPanel
              :current-cube="currentCube"
              @cube-load="loadCube"
              @cube-change="updateCube"
            />
          </ComponentInfo>

          <ActionHistory :actions="[]" />
        </div>

        <!-- Social Tab -->
        <div v-if="activeMobileTab === 'social'" class="app__mobile-panel">
          <ComponentInfo :meta="COMMUNITY_GALLERY_META">
            <CommunityGallery @cube-select="selectCube" />
          </ComponentInfo>

          <ComponentInfo :meta="SHARE_PANEL_META">
            <SharePanel :cube="currentCube" />
          </ComponentInfo>

          <ComponentInfo :meta="NOTIFICATION_PANEL_META">
            <NotificationPanel />
          </ComponentInfo>
        </div>
      </div>

      <!-- Swipe Indicator -->
      <div class="app__swipe-indicator">
        <span>Swipe to navigate</span>
      </div>
    </ComponentInfo>

    <DevModeIndicator />
  </div>
</template>
