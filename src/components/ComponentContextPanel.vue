/** * ComponentContextPanel Component * * AI-powered context assistant that provides information
about the selected component. * Displays AI-generated description, key features, related components,
and usage tips. * * TASK 51: Component Context Assistant (Phase 8 - AI + Metadata) * * Features: * -
Automatic context update on component selection * - AI-generated component description * - Key
features highlighting * - Related components suggestions * - Usage tips and patterns * -
Multi-language support (Russian/English) */

<script lang="ts">
import type { ComponentMeta } from '../types/component-meta'
import type { ComponentContextInfo, RelatedComponentInfo, QueryLanguage } from '../types/ai-query'
import {
  DEFAULT_CONTEXT_PANEL_SETTINGS,
  createDefaultContextInfo,
  detectQueryLanguage,
} from '../types/ai-query'
import {
  getComponentMeta,
  getAllComponentMeta,
  registerComponentMeta,
} from '../types/component-meta'

// ─── Relationship Labels ───────────────────────────────────────────────────────

/**
 * Relationship type labels
 */
const RELATIONSHIP_LABELS: Record<
  RelatedComponentInfo['relationship'],
  Record<QueryLanguage, string>
> = {
  dependency: { ru: 'Зависимость', en: 'Dependency' },
  dependent: { ru: 'Зависит от этого', en: 'Depends on this' },
  sibling: { ru: 'Тот же модуль', en: 'Same module' },
  similar: { ru: 'Похожий', en: 'Similar' },
  'works-with': { ru: 'Работает с', en: 'Works with' },
}

// ─── Status Colors ─────────────────────────────────────────────────────────────

/**
 * Status color mapping
 */
const statusColors: Record<ComponentMeta['status'], string> = {
  stable: '#22c55e',
  beta: '#f59e0b',
  experimental: '#3b82f6',
  deprecated: '#ef4444',
}

// ─── Utility Functions ─────────────────────────────────────────────────────────

/**
 * Generates context information for a component
 */
function generateContextInfo(
  componentId: string,
  language: QueryLanguage,
  allComponents: ComponentMeta[]
): ComponentContextInfo {
  const meta = getComponentMeta(componentId)

  if (!meta) {
    return createDefaultContextInfo(componentId, language)
  }

  // Generate AI-like description
  const description = generateDescription(meta, language)

  // Extract key features
  const keyFeatures = meta.features
    .filter((f) => f.enabled)
    .slice(0, 5)
    .map((f) => f.name)

  // Get usage tips
  const usageTips = meta.tips || []

  // Find related components
  const relatedComponents = findRelatedComponents(meta, allComponents, language)

  // Generate patterns based on component type and dependencies
  const patterns = generatePatterns(meta, language)

  // Calculate confidence based on metadata completeness
  const confidence = calculateConfidence(meta)

  return {
    componentId,
    description,
    keyFeatures,
    usageTips,
    relatedComponents,
    patterns,
    confidence,
    language,
    generatedAt: new Date().toISOString(),
  }
}

/**
 * Generates an AI-like description for a component
 */
function generateDescription(meta: ComponentMeta, language: QueryLanguage): string {
  if (language === 'ru') {
    const status =
      meta.status === 'stable'
        ? 'стабильный'
        : meta.status === 'beta'
          ? 'бета-версия'
          : meta.status === 'experimental'
            ? 'экспериментальный'
            : 'устаревший'

    return (
      `${meta.name} — ${status} компонент из фазы ${meta.phase}. ` +
      `${meta.description} ` +
      (meta.features.length > 0 ? `Компонент предоставляет ${meta.features.length} функций.` : '')
    )
  } else {
    const status =
      meta.status === 'stable'
        ? 'stable'
        : meta.status === 'beta'
          ? 'beta'
          : meta.status === 'experimental'
            ? 'experimental'
            : 'deprecated'

    return (
      `${meta.name} is a ${status} component from phase ${meta.phase}. ` +
      `${meta.description} ` +
      (meta.features.length > 0 ? `The component provides ${meta.features.length} features.` : '')
    )
  }
}

/**
 * Finds related components based on metadata
 */
function findRelatedComponents(
  meta: ComponentMeta,
  allComponents: ComponentMeta[],
  language: QueryLanguage
): RelatedComponentInfo[] {
  const related: RelatedComponentInfo[] = []

  // Add direct dependencies
  for (const dep of meta.dependencies) {
    if (dep.type === 'component') {
      const depMeta = allComponents.find(
        (c) => c.name === dep.name || c.filePath.includes(dep.name)
      )
      if (depMeta && depMeta.id !== meta.id) {
        related.push({
          id: depMeta.id,
          name: depMeta.name,
          relationship: 'dependency',
          reason:
            language === 'ru' ? `Используется для: ${dep.purpose}` : `Used for: ${dep.purpose}`,
        })
      }
    }
  }

  // Find components that depend on this one
  for (const comp of allComponents) {
    if (comp.id === meta.id) continue

    const isDependent = comp.dependencies.some(
      (d) => d.type === 'component' && (d.name === meta.name || d.path?.includes(meta.filePath))
    )

    if (isDependent) {
      related.push({
        id: comp.id,
        name: comp.name,
        relationship: 'dependent',
        reason: language === 'ru' ? `Зависит от ${meta.name}` : `Depends on ${meta.name}`,
      })
    }
  }

  // Find similar components (same phase, similar tags)
  for (const comp of allComponents) {
    if (comp.id === meta.id) continue
    if (related.some((r) => r.id === comp.id)) continue

    const sharedTags = meta.tags.filter((t) => comp.tags.includes(t))
    const isSamePhase = comp.phase === meta.phase

    if (sharedTags.length >= 2 || (isSamePhase && sharedTags.length >= 1)) {
      const relationship: RelatedComponentInfo['relationship'] =
        isSamePhase && sharedTags.length >= 2
          ? 'sibling'
          : sharedTags.length >= 2
            ? 'similar'
            : 'works-with'

      related.push({
        id: comp.id,
        name: comp.name,
        relationship,
        reason:
          language === 'ru'
            ? `Общие теги: ${sharedTags.join(', ')}`
            : `Shared tags: ${sharedTags.join(', ')}`,
      })
    }
  }

  return related.slice(0, 5)
}

/**
 * Generates usage patterns based on component metadata
 */
function generatePatterns(meta: ComponentMeta, language: QueryLanguage): string[] {
  const patterns: string[] = []

  if (language === 'ru') {
    // Import pattern
    patterns.push(
      `import { ${meta.name} } from './${meta.filePath.replace('components/', '').replace('.tsx', '')}'`
    )

    // Basic usage
    if (meta.props && meta.props.length > 0) {
      const requiredProps = meta.props.filter((p) => p.required)
      if (requiredProps.length > 0) {
        const propsStr = requiredProps.map((p) => `${p.name}={...}`).join(' ')
        patterns.push(`<${meta.name} ${propsStr} />`)
      } else {
        patterns.push(`<${meta.name} />`)
      }
    }

    // DevMode pattern if relevant
    if (meta.phase >= 6 || meta.tags.includes('devmode')) {
      patterns.push(`// В DevMode панель обновляется автоматически при изменении контекста`)
    }
  } else {
    // Import pattern
    patterns.push(
      `import { ${meta.name} } from './${meta.filePath.replace('components/', '').replace('.tsx', '')}'`
    )

    // Basic usage
    if (meta.props && meta.props.length > 0) {
      const requiredProps = meta.props.filter((p) => p.required)
      if (requiredProps.length > 0) {
        const propsStr = requiredProps.map((p) => `${p.name}={...}`).join(' ')
        patterns.push(`<${meta.name} ${propsStr} />`)
      } else {
        patterns.push(`<${meta.name} />`)
      }
    }

    // DevMode pattern if relevant
    if (meta.phase >= 6 || meta.tags.includes('devmode')) {
      patterns.push(`// In DevMode, the panel auto-updates on context changes`)
    }
  }

  return patterns
}

/**
 * Calculates confidence score based on metadata completeness
 */
function calculateConfidence(meta: ComponentMeta): number {
  let score = 0.5 // Base score

  // Description quality
  if (meta.description.length > 100) score += 0.1
  if (meta.summary.length > 20) score += 0.05

  // Features documented
  if (meta.features.length > 0) score += 0.1
  if (meta.features.length >= 3) score += 0.05

  // Dependencies documented
  if (meta.dependencies.length > 0) score += 0.05

  // Tips available
  if (meta.tips && meta.tips.length > 0) score += 0.1

  // Props documented
  if (meta.props && meta.props.length > 0) score += 0.05

  return Math.min(score, 1)
}

// ─── Component Metadata ────────────────────────────────────────────────────────

/**
 * Component metadata for Developer Mode
 */
const COMPONENT_CONTEXT_PANEL_META: ComponentMeta = {
  id: 'component-context-panel',
  name: 'ComponentContextPanel',
  version: '1.0.0',
  summary: 'AI-powered context assistant for component information in DevMode.',
  description:
    'ComponentContextPanel provides contextual AI-generated information about ' +
    'the currently selected component. It displays descriptions, key features, ' +
    'related components, usage tips, and patterns. The component integrates with ' +
    'the Developer Mode system and component metadata registry.',
  phase: 8,
  taskId: 'TASK 51',
  filePath: 'components/ComponentContextPanel.vue',
  history: [
    {
      version: '1.0.0',
      date: new Date().toISOString(),
      description: 'Initial implementation with context generation and related components',
      taskId: 'TASK 51',
      type: 'created',
    },
  ],
  features: [
    {
      id: 'context-generation',
      name: 'Context Generation',
      description: 'AI-generated contextual information about components',
      enabled: true,
      taskId: 'TASK 51',
    },
    {
      id: 'related-components',
      name: 'Related Components',
      description: 'Suggestions for related and compatible components',
      enabled: true,
      taskId: 'TASK 51',
    },
    {
      id: 'usage-tips',
      name: 'Usage Tips',
      description: 'Context-aware usage tips and best practices',
      enabled: true,
      taskId: 'TASK 51',
    },
    {
      id: 'auto-update',
      name: 'Auto Update',
      description: 'Automatic context refresh on component selection',
      enabled: true,
      taskId: 'TASK 51',
    },
    {
      id: 'multi-language',
      name: 'Multi-language Support',
      description: 'Support for Russian and English languages',
      enabled: true,
      taskId: 'TASK 51',
    },
  ],
  dependencies: [
    { name: 'devmode', type: 'context', path: 'lib/devmode.tsx', purpose: 'DevMode context' },
    {
      name: 'component-meta',
      type: 'lib',
      path: 'types/component-meta.ts',
      purpose: 'Component metadata',
    },
    { name: 'ai-query', type: 'lib', path: 'types/ai-query.ts', purpose: 'Context types' },
  ],
  relatedFiles: [
    {
      path: 'components/ComponentContextPanel.test.tsx',
      type: 'test',
      description: 'Unit tests',
    },
    { path: 'types/ai-query.ts', type: 'type', description: 'Type definitions' },
    { path: 'lib/devmode.tsx', type: 'util', description: 'DevMode context' },
  ],
  props: [
    {
      name: 'componentId',
      type: 'string | null',
      required: false,
      description: 'ID of the component to show context for',
    },
    {
      name: 'onRelatedComponentSelect',
      type: '(componentId: string) => void',
      required: false,
      description: 'Callback when a related component is selected',
    },
    { name: 'position', type: 'string', required: false, description: 'Panel position' },
    {
      name: 'settings',
      type: 'Partial<ContextPanelSettings>',
      required: false,
      description: 'Settings overrides',
    },
  ],
  tips: [
    'Pass a componentId to display context for a specific component',
    'Use onRelatedComponentSelect to enable navigation between components',
    'Configure settings to customize what information is displayed',
    'The panel auto-updates when componentId changes',
  ],
  tags: ['context', 'assistant', 'devmode', 'ai', 'metadata', 'phase-8'],
  status: 'stable',
  lastUpdated: new Date().toISOString(),
}

// Register metadata in the global registry
registerComponentMeta(COMPONENT_CONTEXT_PANEL_META)

// ─── Exports ───────────────────────────────────────────────────────────────────

export {
  generateContextInfo,
  generateDescription,
  findRelatedComponents,
  generatePatterns,
  calculateConfidence,
  COMPONENT_CONTEXT_PANEL_META,
  RELATIONSHIP_LABELS,
  statusColors,
}
</script>

<script setup lang="ts">
// ─── Imports ───────────────────────────────────────────────────────────────────

import { ref, computed } from 'vue'
import { useIsDevModeEnabled } from '../lib/devmode'
import type { ContextPanelSettings } from '../types/ai-query'
import type { CSSProperties } from 'vue'

// ─── Props ─────────────────────────────────────────────────────────────────────

/**
 * Props for ComponentContextPanel
 */
interface ComponentContextPanelProps {
  /** ID of the component to show context for */
  componentId?: string | null
  /** Custom styles for the panel container */
  style?: CSSProperties
  /** Custom class name */
  className?: string
  /** Position of the panel */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  /** Settings overrides */
  settings?: Partial<ContextPanelSettings>
  /** Whether the panel is initially expanded */
  initialExpanded?: boolean
}

const props = withDefaults(defineProps<ComponentContextPanelProps>(), {
  componentId: null,
  style: undefined,
  className: undefined,
  position: 'top-left',
  settings: undefined,
  initialExpanded: true,
})

// ─── Emits ─────────────────────────────────────────────────────────────────────

const emit = defineEmits<{
  relatedComponentSelect: [componentId: string]
}>()

// ─── DevMode ───────────────────────────────────────────────────────────────────

const isDevModeEnabled = useIsDevModeEnabled()

// ─── State ─────────────────────────────────────────────────────────────────────

const isExpanded = ref(props.initialExpanded)
const hoveredRelated = ref<string | null>(null)

// ─── Computed ──────────────────────────────────────────────────────────────────

// Merged settings
const mergedSettings = computed<ContextPanelSettings>(() => ({
  ...DEFAULT_CONTEXT_PANEL_SETTINGS,
  ...props.settings,
}))

// Get all components for context generation
const allComponents = computed(() => getAllComponentMeta())

// Detect language from component metadata or use preferred
const language = computed(() => {
  if (props.componentId) {
    const meta = getComponentMeta(props.componentId)
    if (meta) {
      // Detect language from description
      return detectQueryLanguage(meta.description)
    }
  }
  return mergedSettings.value.preferredLanguage
})

// Generate context info when componentId changes
const contextInfo = computed(() => {
  if (!props.componentId || !mergedSettings.value.autoUpdate) {
    return null
  }
  return generateContextInfo(props.componentId, language.value, allComponents.value)
})

// Get component metadata for display
const componentMeta = computed(() => {
  return props.componentId ? getComponentMeta(props.componentId) : null
})

// Labels based on language
const labels = computed(() => ({
  title: language.value === 'ru' ? 'Контекст' : 'Context',
  noSelection:
    language.value === 'ru'
      ? 'Выберите компонент для отображения контекстной информации'
      : 'Select a component to display context information',
  description: language.value === 'ru' ? 'Описание' : 'Description',
  features: language.value === 'ru' ? 'Ключевые функции' : 'Key Features',
  tips: language.value === 'ru' ? 'Советы по использованию' : 'Usage Tips',
  related: language.value === 'ru' ? 'Связанные компоненты' : 'Related Components',
  patterns: language.value === 'ru' ? 'Паттерны использования' : 'Usage Patterns',
  confidence: language.value === 'ru' ? 'Уверенность' : 'Confidence',
  version: language.value === 'ru' ? 'Версия' : 'Version',
  phase: language.value === 'ru' ? 'Фаза' : 'Phase',
}))

// Container style
const containerStyle = computed(() => ({
  ...styles.container,
  ...(isExpanded.value ? styles.containerExpanded : styles.containerCollapsed),
  ...positionStyles[props.position],
  ...props.style,
}))

// ─── Methods ───────────────────────────────────────────────────────────────────

// Toggle panel
function handleToggle() {
  isExpanded.value = !isExpanded.value
}

// Handle related component click
function handleRelatedClick(relatedId: string) {
  emit('relatedComponentSelect', relatedId)
}

// Get status badge color
function getStatusBadgeStyle(status: ComponentMeta['status']): CSSProperties {
  return {
    ...styles.statusBadge,
    backgroundColor: `${statusColors[status]}20`,
    color: statusColors[status],
  }
}

// Get related item style with hover
function getRelatedItemStyle(relatedId: string): CSSProperties {
  return {
    ...styles.relatedItem,
    ...(hoveredRelated.value === relatedId ? styles.relatedItemHover : {}),
  }
}

// ─── Styles ────────────────────────────────────────────────────────────────────

/**
 * Styles for the component
 */
const styles: Record<string, CSSProperties> = {
  container: {
    position: 'fixed',
    zIndex: 10000,
    backgroundColor: 'rgba(25, 25, 35, 0.98)',
    border: '1px solid rgba(100, 200, 100, 0.3)',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '13px',
    color: '#e5e7eb',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
    maxWidth: '400px',
    minWidth: '320px',
  },
  containerCollapsed: {
    maxHeight: '48px',
    overflow: 'hidden',
  },
  containerExpanded: {
    maxHeight: '70vh',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: 'rgba(60, 100, 60, 0.3)',
    borderBottom: '1px solid rgba(100, 200, 100, 0.2)',
    cursor: 'pointer',
    userSelect: 'none',
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#a5fcb4',
  },
  headerIcon: {
    fontSize: '16px',
  },
  headerToggle: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s',
  },
  content: {
    padding: '16px',
    maxHeight: 'calc(70vh - 48px)',
    overflowY: 'auto',
  },
  noSelection: {
    textAlign: 'center',
    color: '#6b7280',
    padding: '24px 16px',
  },
  section: {
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    color: '#6b7280',
    letterSpacing: '0.5px',
    marginBottom: '8px',
  },
  componentName: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#a5fcb4',
    marginBottom: '4px',
  },
  componentVersion: {
    fontSize: '11px',
    color: '#9ca3af',
    marginBottom: '8px',
  },
  description: {
    lineHeight: 1.6,
    color: '#d1d5db',
  },
  featureList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '4px',
  },
  featureChip: {
    padding: '4px 10px',
    backgroundColor: 'rgba(100, 200, 100, 0.15)',
    border: '1px solid rgba(100, 200, 100, 0.3)',
    borderRadius: '12px',
    fontSize: '11px',
    color: '#a5fcb4',
  },
  tipList: {
    marginTop: '4px',
  },
  tipItem: {
    display: 'flex',
    gap: '8px',
    marginBottom: '6px',
    fontSize: '12px',
    color: '#d1d5db',
    lineHeight: 1.5,
  },
  tipBullet: {
    color: '#a5fcb4',
    flexShrink: 0,
  },
  relatedList: {
    marginTop: '4px',
  },
  relatedItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: 'rgba(50, 70, 50, 0.3)',
    borderRadius: '6px',
    marginBottom: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    border: '1px solid rgba(100, 200, 100, 0.15)',
  },
  relatedItemHover: {
    backgroundColor: 'rgba(60, 80, 60, 0.5)',
  },
  relatedName: {
    fontWeight: 600,
    color: '#a5fcb4',
    marginBottom: '2px',
    fontSize: '12px',
  },
  relatedReason: {
    fontSize: '11px',
    color: '#9ca3af',
  },
  relatedBadge: {
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: 500,
    backgroundColor: 'rgba(100, 200, 100, 0.2)',
    color: '#a5fcb4',
  },
  patternList: {
    marginTop: '4px',
  },
  patternItem: {
    padding: '8px 12px',
    backgroundColor: 'rgba(40, 40, 60, 0.5)',
    borderRadius: '6px',
    marginBottom: '6px',
    fontSize: '12px',
    color: '#d1d5db',
    lineHeight: 1.5,
    borderLeft: '3px solid rgba(100, 200, 100, 0.5)',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: 500,
    marginLeft: '8px',
  },
  confidenceBar: {
    marginTop: '16px',
    paddingTop: '12px',
    borderTop: '1px solid rgba(100, 200, 100, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#6b7280',
  },
  confidenceValue: {
    fontWeight: 600,
  },
}

/**
 * Position styles for the panel
 */
const positionStyles: Record<string, CSSProperties> = {
  'top-left': { top: '80px', left: '20px' },
  'top-right': { top: '80px', right: '480px' },
  'bottom-left': { bottom: '20px', left: '20px' },
  'bottom-right': { bottom: '20px', right: '480px' },
}
</script>

<template>
  <div
    v-if="isDevModeEnabled"
    :class="className"
    :style="containerStyle"
    data-testid="component-context-panel"
  >
    <!-- Header -->
    <div :style="styles.header" role="button" tabindex="0" @click="handleToggle">
      <div :style="styles.headerTitle">
        <span :style="styles.headerIcon">&#x1F3AF;</span>
        <span>{{ labels.title }}</span>
        <span v-if="componentMeta" :style="{ fontWeight: 400, color: '#9ca3af', fontSize: '12px' }">
          &mdash; {{ componentMeta.name }}
        </span>
      </div>
      <button
        type="button"
        :style="styles.headerToggle"
        :aria-label="isExpanded ? 'Collapse' : 'Expand'"
      >
        {{ isExpanded ? '\u2212' : '+' }}
      </button>
    </div>

    <!-- Content -->
    <div v-if="isExpanded" :style="styles.content">
      <div v-if="!contextInfo || !componentMeta" :style="styles.noSelection">
        {{ labels.noSelection }}
      </div>
      <template v-else>
        <!-- Component Name and Version -->
        <div :style="styles.section">
          <div :style="styles.componentName">
            {{ componentMeta.name }}
            <span :style="getStatusBadgeStyle(componentMeta.status)">
              {{ componentMeta.status }}
            </span>
          </div>
          <div :style="styles.componentVersion">
            {{ labels.version }} {{ componentMeta.version }} &bull; {{ labels.phase }}
            {{ componentMeta.phase }}
          </div>
        </div>

        <!-- Description -->
        <div :style="styles.section">
          <div :style="styles.sectionTitle">{{ labels.description }}</div>
          <div :style="styles.description">{{ contextInfo.description }}</div>
        </div>

        <!-- Key Features -->
        <div v-if="contextInfo.keyFeatures.length > 0" :style="styles.section">
          <div :style="styles.sectionTitle">{{ labels.features }}</div>
          <div :style="styles.featureList">
            <span
              v-for="(feature, i) in contextInfo.keyFeatures"
              :key="i"
              :style="styles.featureChip"
            >
              {{ feature }}
            </span>
          </div>
        </div>

        <!-- Usage Tips -->
        <div
          v-if="mergedSettings.showTips && contextInfo.usageTips.length > 0"
          :style="styles.section"
        >
          <div :style="styles.sectionTitle">{{ labels.tips }}</div>
          <div :style="styles.tipList">
            <div v-for="(tip, i) in contextInfo.usageTips" :key="i" :style="styles.tipItem">
              <span :style="styles.tipBullet">&bull;</span>
              <span>{{ tip }}</span>
            </div>
          </div>
        </div>

        <!-- Related Components -->
        <div
          v-if="mergedSettings.showRelated && contextInfo.relatedComponents.length > 0"
          :style="styles.section"
        >
          <div :style="styles.sectionTitle">{{ labels.related }}</div>
          <div :style="styles.relatedList">
            <div
              v-for="related in contextInfo.relatedComponents.slice(
                0,
                mergedSettings.maxRelatedComponents
              )"
              :key="related.id"
              :style="getRelatedItemStyle(related.id)"
              role="button"
              tabindex="0"
              :data-testid="`related-component-${related.id}`"
              @click="handleRelatedClick(related.id)"
              @mouseenter="hoveredRelated = related.id"
              @mouseleave="hoveredRelated = null"
            >
              <div>
                <div :style="styles.relatedName">{{ related.name }}</div>
                <div :style="styles.relatedReason">{{ related.reason }}</div>
              </div>
              <span :style="styles.relatedBadge">
                {{ RELATIONSHIP_LABELS[related.relationship][language] }}
              </span>
            </div>
          </div>
        </div>

        <!-- Patterns -->
        <div
          v-if="mergedSettings.showPatterns && contextInfo.patterns.length > 0"
          :style="styles.section"
        >
          <div :style="styles.sectionTitle">{{ labels.patterns }}</div>
          <div :style="styles.patternList">
            <div v-for="(pattern, i) in contextInfo.patterns" :key="i" :style="styles.patternItem">
              <code :style="{ fontFamily: 'monospace', fontSize: '11px' }">{{ pattern }}</code>
            </div>
          </div>
        </div>

        <!-- Confidence -->
        <div :style="styles.confidenceBar">
          <span>{{ labels.confidence }}</span>
          <span
            :style="{
              ...styles.confidenceValue,
              color:
                contextInfo.confidence >= 0.8
                  ? '#22c55e'
                  : contextInfo.confidence >= 0.5
                    ? '#f59e0b'
                    : '#ef4444',
            }"
          >
            {{ Math.round(contextInfo.confidence * 100) }}%
          </span>
        </div>

        <!-- Custom children via slot -->
        <slot />
      </template>
    </div>
  </div>
</template>
