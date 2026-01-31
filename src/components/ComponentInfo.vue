<script setup lang="ts">
/**
 * ComponentInfo Component (Vue 3 SFC)
 *
 * Renders component metadata as an overlay/tooltip in Developer Mode.
 * Wraps any component and displays its documentation when DevMode is enabled.
 *
 * TASK 40: Component Info Overlay (Phase 6 - Developer Experience)
 * TASK 66: Migrated from React TSX to Vue 3.0 SFC (Phase 10 - Vue.js 3.0 Migration)
 *
 * Features:
 * - Floating panel with component metadata
 * - Hover-triggered or always-visible modes
 * - Configurable position and verbosity
 * - Component outline highlighting
 * - Expandable sections for detailed info
 */

// --- Imports ---
import { ref, computed } from 'vue'
import type { CSSProperties } from 'vue'
import type {
  ComponentMeta,
  ComponentHistoryEntry,
  ComponentFeature,
} from '../types/component-meta'
import { useDevMode, useIsDevModeEnabled, useDevModeSettings } from '../lib/devmode'

// --- Props ---
interface ComponentInfoProps {
  /** Component metadata */
  meta: ComponentMeta
  /** Custom styles for the wrapper */
  style?: CSSProperties
  /** Custom class name for the wrapper */
  className?: string
  /** Position for the info panel */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'auto'
  /** Whether to always show the panel (vs hover) */
  alwaysShow?: boolean
}

const props = withDefaults(defineProps<ComponentInfoProps>(), {
  style: undefined,
  className: '',
  position: 'auto',
  alwaysShow: false,
})

// --- Module-level constants ---

/**
 * Status badge color mapping
 */
const STATUS_COLORS: Record<ComponentMeta['status'], string> = {
  stable: '#22c55e',
  beta: '#3b82f6',
  experimental: '#f59e0b',
  deprecated: '#ef4444',
}

/**
 * Status badge labels
 */
const STATUS_LABELS: Record<ComponentMeta['status'], string> = {
  stable: 'Stable',
  beta: 'Beta',
  experimental: 'Experimental',
  deprecated: 'Deprecated',
}

/**
 * History entry type icons
 */
const HISTORY_ICONS: Record<ComponentHistoryEntry['type'], string> = {
  created: '+',
  updated: '~',
  fixed: '*',
  deprecated: '!',
  removed: '-',
}

/**
 * Formats a date string for display
 */
function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate)
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return isoDate
  }
}

// --- Styles ---

const styles: Record<string, CSSProperties> = {
  wrapper: {
    position: 'relative',
    display: 'contents',
  },
  wrapperOutline: {
    position: 'relative',
    outline: '2px dashed rgba(59, 130, 246, 0.5)',
    outlineOffset: '2px',
    borderRadius: '4px',
  },
  panel: {
    position: 'absolute',
    zIndex: 9999,
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '12px',
    minWidth: '280px',
    maxWidth: '400px',
    maxHeight: '80vh',
    overflowY: 'auto',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '12px',
    color: '#e5e7eb',
    lineHeight: '1.5',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
    paddingBottom: '8px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff',
    margin: '0',
  },
  badge: {
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  summary: {
    marginBottom: '12px',
    color: '#9ca3af',
  },
  section: {
    marginBottom: '12px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    padding: '4px 0',
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    color: '#6b7280',
    letterSpacing: '0.5px',
  },
  sectionContent: {
    marginTop: '8px',
  },
  historyItem: {
    display: 'flex',
    gap: '8px',
    marginBottom: '6px',
    fontSize: '11px',
  },
  historyIcon: {
    width: '16px',
    height: '16px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: '#3b82f6',
    fontWeight: 'bold',
    flexShrink: '0',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
    fontSize: '11px',
  },
  featureEnabled: {
    color: '#22c55e',
  },
  featureDisabled: {
    color: '#6b7280',
  },
  dependencyItem: {
    marginBottom: '4px',
    fontSize: '11px',
  },
  dependencyType: {
    display: 'inline-block',
    padding: '1px 4px',
    borderRadius: '3px',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: '#3b82f6',
    fontSize: '9px',
    marginRight: '6px',
  },
  tip: {
    display: 'flex',
    gap: '6px',
    marginBottom: '4px',
    fontSize: '11px',
    color: '#9ca3af',
  },
  tipIcon: {
    color: '#f59e0b',
    flexShrink: '0',
  },
  meta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '12px',
    paddingTop: '8px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    fontSize: '10px',
    color: '#6b7280',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    marginTop: '8px',
  },
  tag: {
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: '#3b82f6',
    fontSize: '10px',
  },
  closeButton: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    width: '20px',
    height: '20px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#6b7280',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
  },
}

/**
 * Position styles for the panel
 */
const positionStyles: Record<string, CSSProperties> = {
  'top-left': { top: '100%', left: '0', marginTop: '8px' },
  'top-right': { top: '100%', right: '0', marginTop: '8px' },
  'bottom-left': { bottom: '100%', left: '0', marginBottom: '8px' },
  'bottom-right': { bottom: '100%', right: '0', marginBottom: '8px' },
}

// --- State ---
const isDevMode = useIsDevModeEnabled()
const settings = useDevModeSettings()
const isHovered = ref(false)
const isPinned = ref(false)

// --- Collapsible section state ---
const collapsedSections = ref<Record<string, boolean>>({})

function isSectionExpanded(title: string, defaultExpanded: boolean): boolean {
  if (title in collapsedSections.value) {
    return collapsedSections.value[title]
  }
  return defaultExpanded
}

function toggleSection(title: string, defaultExpanded: boolean) {
  const current = isSectionExpanded(title, defaultExpanded)
  collapsedSections.value[title] = !current
}

// --- Computed ---

const actualPosition = computed(() =>
  props.position === 'auto' ? settings.panelPosition : props.position
)

const showPanel = computed(
  () => props.alwaysShow || (settings.showHoverInfo && (isHovered.value || isPinned.value))
)

const showOutline = computed(() => settings.showOutline)

const wrapperStyle = computed<CSSProperties>(() => ({
  ...(showOutline.value ? styles.wrapperOutline : styles.wrapper),
  ...props.style,
}))

const panelStyle = computed<CSSProperties>(() => ({
  ...styles.panel,
  ...positionStyles[actualPosition.value],
}))

const badgeStyle = computed<CSSProperties>(() => ({
  ...styles.badge,
  backgroundColor: `${STATUS_COLORS[props.meta.status]}20`,
  color: STATUS_COLORS[props.meta.status],
}))

// --- InfoPanel computed ---
const { settings: devModeSettings } = useDevMode()
const categories = computed(() => devModeSettings.categories)
const verbosity = computed(() => devModeSettings.verbosity)

const historyEntries = computed(() =>
  props.meta.history.slice(0, verbosity.value === 'verbose' ? undefined : 3)
)

// --- Event handlers ---

function handleWrapperClick(e: MouseEvent) {
  if (e.ctrlKey || e.metaKey) {
    e.stopPropagation()
    isPinned.value = !isPinned.value
  }
}

function closePanel() {
  isPinned.value = false
}
</script>

<template>
  <!-- When DevMode is disabled, just render the slot -->
  <template v-if="!isDevMode">
    <slot />
  </template>

  <!-- When DevMode is enabled, render with wrapper -->
  <div
    v-else
    :style="wrapperStyle"
    :class="`component-info ${props.className}`"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @click="handleWrapperClick"
  >
    <slot />

    <!-- InfoPanel -->
    <div
      v-if="showPanel"
      :style="panelStyle"
      role="tooltip"
      :aria-label="`Component info: ${meta.name}`"
    >
      <!-- Close button (only when pinned) -->
      <button
        v-if="isPinned"
        type="button"
        :style="styles.closeButton"
        aria-label="Close info panel"
        @click="closePanel"
      >
        &times;
      </button>

      <!-- Header -->
      <div :style="styles.header">
        <h4 :style="styles.title">{{ meta.name }}</h4>
        <span :style="badgeStyle">
          {{ STATUS_LABELS[meta.status] }}
        </span>
      </div>

      <!-- Summary - always shown -->
      <p v-if="categories.basic" :style="styles.summary">{{ meta.summary }}</p>

      <!-- Description - verbose only -->
      <p
        v-if="verbosity === 'verbose' && categories.basic"
        :style="{ ...styles.summary, fontSize: '11px' }"
      >
        {{ meta.description }}
      </p>

      <!-- History -->
      <div v-if="categories.history && meta.history.length > 0" :style="styles.section">
        <div
          :style="styles.sectionHeader"
          @click="toggleSection(`History (${meta.history.length})`, verbosity !== 'minimal')"
        >
          <span :style="styles.sectionTitle">History ({{ meta.history.length }})</span>
          <span>{{
            isSectionExpanded(`History (${meta.history.length})`, verbosity !== 'minimal')
              ? '\u25BC'
              : '\u25B6'
          }}</span>
        </div>
        <div
          v-if="isSectionExpanded(`History (${meta.history.length})`, verbosity !== 'minimal')"
          :style="styles.sectionContent"
        >
          <div v-for="(entry, i) in historyEntries" :key="i" :style="styles.historyItem">
            <span :style="styles.historyIcon">{{ HISTORY_ICONS[entry.type] }}</span>
            <div>
              <strong>v{{ entry.version }}</strong> &mdash; {{ entry.description }}
              <span v-if="entry.taskId" :style="{ color: '#3b82f6', marginLeft: '4px' }"
                >({{ entry.taskId }})</span
              >
              <div :style="{ fontSize: '10px', color: '#6b7280' }">
                {{ formatDate(entry.date) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Features -->
      <div v-if="categories.features && meta.features.length > 0" :style="styles.section">
        <div
          :style="styles.sectionHeader"
          @click="toggleSection(`Features (${meta.features.length})`, verbosity !== 'minimal')"
        >
          <span :style="styles.sectionTitle">Features ({{ meta.features.length }})</span>
          <span>{{
            isSectionExpanded(`Features (${meta.features.length})`, verbosity !== 'minimal')
              ? '\u25BC'
              : '\u25B6'
          }}</span>
        </div>
        <div
          v-if="isSectionExpanded(`Features (${meta.features.length})`, verbosity !== 'minimal')"
          :style="styles.sectionContent"
        >
          <div
            v-for="feature in meta.features as ComponentFeature[]"
            :key="feature.id"
            :style="{
              ...styles.featureItem,
              ...(feature.enabled ? styles.featureEnabled : styles.featureDisabled),
            }"
          >
            <span>{{ feature.enabled ? '\u2713' : '\u25CB' }}</span>
            <span>
              {{ feature.name }}
              <span v-if="feature.taskId" :style="{ color: '#6b7280', marginLeft: '4px' }"
                >({{ feature.taskId }})</span
              >
            </span>
          </div>
        </div>
      </div>

      <!-- Dependencies - normal and verbose only -->
      <div
        v-if="categories.dependencies && verbosity !== 'minimal' && meta.dependencies.length > 0"
        :style="styles.section"
      >
        <div
          :style="styles.sectionHeader"
          @click="toggleSection(`Dependencies (${meta.dependencies.length})`, true)"
        >
          <span :style="styles.sectionTitle">Dependencies ({{ meta.dependencies.length }})</span>
          <span>{{
            isSectionExpanded(`Dependencies (${meta.dependencies.length})`, true)
              ? '\u25BC'
              : '\u25B6'
          }}</span>
        </div>
        <div
          v-if="isSectionExpanded(`Dependencies (${meta.dependencies.length})`, true)"
          :style="styles.sectionContent"
        >
          <div v-for="(dep, i) in meta.dependencies" :key="i" :style="styles.dependencyItem">
            <span :style="styles.dependencyType">{{ dep.type }}</span>
            <strong>{{ dep.name }}</strong>
            <span v-if="verbosity === 'verbose'"> &mdash; {{ dep.purpose }}</span>
          </div>
        </div>
      </div>

      <!-- Related Files - verbose only -->
      <div
        v-if="categories.relatedFiles && verbosity === 'verbose' && meta.relatedFiles.length > 0"
        :style="styles.section"
      >
        <div
          :style="styles.sectionHeader"
          @click="toggleSection(`Related Files (${meta.relatedFiles.length})`, true)"
        >
          <span :style="styles.sectionTitle">Related Files ({{ meta.relatedFiles.length }})</span>
          <span>{{
            isSectionExpanded(`Related Files (${meta.relatedFiles.length})`, true)
              ? '\u25BC'
              : '\u25B6'
          }}</span>
        </div>
        <div
          v-if="isSectionExpanded(`Related Files (${meta.relatedFiles.length})`, true)"
          :style="styles.sectionContent"
        >
          <div v-for="(file, i) in meta.relatedFiles" :key="i" :style="styles.dependencyItem">
            <span :style="styles.dependencyType">{{ file.type }}</span>
            <code>{{ file.path }}</code>
          </div>
        </div>
      </div>

      <!-- Tips -->
      <div v-if="categories.tips && meta.tips && meta.tips.length > 0" :style="styles.section">
        <div :style="styles.sectionHeader" @click="toggleSection('Tips', verbosity !== 'minimal')">
          <span :style="styles.sectionTitle">Tips</span>
          <span>{{
            isSectionExpanded('Tips', verbosity !== 'minimal') ? '\u25BC' : '\u25B6'
          }}</span>
        </div>
        <div
          v-if="isSectionExpanded('Tips', verbosity !== 'minimal')"
          :style="styles.sectionContent"
        >
          <div v-for="(tip, i) in meta.tips" :key="i" :style="styles.tip">
            <span :style="styles.tipIcon">&#x1F4A1;</span>
            <span>{{ tip }}</span>
          </div>
        </div>
      </div>

      <!-- Known Issues -->
      <div
        v-if="categories.tips && meta.knownIssues && meta.knownIssues.length > 0"
        :style="styles.section"
      >
        <div :style="styles.sectionHeader" @click="toggleSection('Known Issues', true)">
          <span :style="styles.sectionTitle">Known Issues</span>
          <span>{{ isSectionExpanded('Known Issues', true) ? '\u25BC' : '\u25B6' }}</span>
        </div>
        <div v-if="isSectionExpanded('Known Issues', true)" :style="styles.sectionContent">
          <div v-for="(issue, i) in meta.knownIssues" :key="i" :style="styles.tip">
            <span :style="{ ...styles.tipIcon, color: '#ef4444' }">&#x26A0;</span>
            <span>{{ issue }}</span>
          </div>
        </div>
      </div>

      <!-- Tags -->
      <div v-if="meta.tags.length > 0" :style="styles.tags">
        <span v-for="tag in meta.tags" :key="tag" :style="styles.tag">
          {{ tag }}
        </span>
      </div>

      <!-- Meta info footer -->
      <div :style="styles.meta">
        <span :style="styles.metaItem">
          <strong>v{{ meta.version }}</strong>
        </span>
        <span :style="styles.metaItem">Phase {{ meta.phase }}</span>
        <span v-if="meta.taskId" :style="styles.metaItem">
          <span :style="{ color: '#3b82f6' }">{{ meta.taskId }}</span>
        </span>
        <span :style="styles.metaItem">&#x1F4C1; {{ meta.filePath }}</span>
      </div>
    </div>
  </div>
</template>
