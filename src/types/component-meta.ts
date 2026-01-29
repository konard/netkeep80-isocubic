/**
 * Component Metadata Types
 *
 * This module defines the metadata system for self-documenting components.
 * Each component can provide structured information about its purpose,
 * history, and functionality that can be displayed in Developer Mode.
 *
 * TASK 40: Component Metadata System (Phase 6 - Developer Experience)
 * Part of the innovative architecture for AI-assisted development.
 */

/**
 * Semantic version following SemVer specification
 */
export type SemanticVersion = `${number}.${number}.${number}`

/**
 * History entry for tracking component development
 */
export interface ComponentHistoryEntry {
  /** Version when the change was made */
  version: SemanticVersion
  /** ISO date string when the change was made */
  date: string
  /** Description of the change */
  description: string
  /** Related task/issue identifier (e.g., "TASK 34") */
  taskId?: string
  /** Type of change */
  type: 'created' | 'updated' | 'fixed' | 'deprecated' | 'removed'
}

/**
 * Feature description for component capabilities
 */
export interface ComponentFeature {
  /** Feature identifier */
  id: string
  /** Human-readable name */
  name: string
  /** Detailed description */
  description: string
  /** Whether the feature is currently enabled */
  enabled: boolean
  /** If disabled, reason why */
  disabledReason?: string
  /** Related task/issue identifier */
  taskId?: string
}

/**
 * Dependency information
 */
export interface ComponentDependency {
  /** Name of the dependency (component or module) */
  name: string
  /** Type of dependency */
  type: 'component' | 'hook' | 'context' | 'lib' | 'external'
  /** Path to the dependency */
  path?: string
  /** Description of why this dependency is used */
  purpose: string
}

/**
 * Related file information
 */
export interface RelatedFile {
  /** Path to the file relative to src/ */
  path: string
  /** Type of the file */
  type: 'component' | 'test' | 'style' | 'type' | 'util' | 'config'
  /** Description of the file's purpose */
  description: string
}

/**
 * Prop documentation for component props
 */
export interface PropDocumentation {
  /** Prop name */
  name: string
  /** TypeScript type string */
  type: string
  /** Whether the prop is required */
  required: boolean
  /** Default value if any */
  defaultValue?: string
  /** Description of the prop */
  description: string
}

/**
 * Main component metadata interface
 * Contains all information about a component for Developer Mode display
 */
export interface ComponentMeta {
  /** Unique component identifier */
  id: string
  /** Human-readable component name */
  name: string
  /** Current version */
  version: SemanticVersion
  /** Short description (1-2 sentences) */
  summary: string
  /** Detailed description with full context */
  description: string
  /** Development phase this component belongs to */
  phase: number
  /** Task identifier that created/last updated this component */
  taskId?: string
  /** File path relative to src/ */
  filePath: string
  /** Development history entries */
  history: ComponentHistoryEntry[]
  /** Component features */
  features: ComponentFeature[]
  /** Dependencies used by this component */
  dependencies: ComponentDependency[]
  /** Related files (tests, styles, types) */
  relatedFiles: RelatedFile[]
  /** Component props documentation */
  props?: PropDocumentation[]
  /** Usage tips for developers */
  tips?: string[]
  /** Known issues or limitations */
  knownIssues?: string[]
  /** Tags for search and categorization */
  tags: string[]
  /** Component status */
  status: 'stable' | 'beta' | 'experimental' | 'deprecated'
  /** ISO date string when metadata was last updated */
  lastUpdated: string
}

/**
 * Lightweight metadata for display in tooltips
 */
export interface ComponentMetaTooltip {
  /** Component name */
  name: string
  /** Short summary */
  summary: string
  /** Version */
  version: SemanticVersion
  /** Status */
  status: ComponentMeta['status']
  /** Phase number */
  phase: number
}

/**
 * Creates a tooltip from full metadata
 */
export function createMetaTooltip(meta: ComponentMeta): ComponentMetaTooltip {
  return {
    name: meta.name,
    summary: meta.summary,
    version: meta.version,
    status: meta.status,
    phase: meta.phase,
  }
}

/**
 * Validates component metadata
 */
export function validateComponentMeta(meta: Partial<ComponentMeta>): meta is ComponentMeta {
  return Boolean(
    meta.id &&
    meta.name &&
    meta.version &&
    meta.summary &&
    meta.description &&
    typeof meta.phase === 'number' &&
    meta.filePath &&
    Array.isArray(meta.history) &&
    Array.isArray(meta.features) &&
    Array.isArray(meta.dependencies) &&
    Array.isArray(meta.relatedFiles) &&
    Array.isArray(meta.tags) &&
    meta.status &&
    meta.lastUpdated
  )
}

/**
 * Creates default component metadata
 */
export function createDefaultMeta(
  id: string,
  name: string,
  filePath: string,
  options?: Partial<ComponentMeta>
): ComponentMeta {
  const now = new Date().toISOString()
  return {
    id,
    name,
    version: '1.0.0',
    summary: `${name} component`,
    description: `${name} is a React component.`,
    phase: 1,
    filePath,
    history: [
      {
        version: '1.0.0',
        date: now,
        description: 'Initial version',
        type: 'created',
      },
    ],
    features: [],
    dependencies: [],
    relatedFiles: [],
    tags: [],
    status: 'stable',
    lastUpdated: now,
    ...options,
  }
}

/**
 * Registry of all component metadata
 * Components register their metadata here for discovery
 */
export const componentMetaRegistry = new Map<string, ComponentMeta>()

/**
 * Registers component metadata in the global registry
 */
export function registerComponentMeta(meta: ComponentMeta): void {
  componentMetaRegistry.set(meta.id, meta)
}

/**
 * Gets component metadata by ID
 */
export function getComponentMeta(id: string): ComponentMeta | undefined {
  return componentMetaRegistry.get(id)
}

/**
 * Gets all registered component metadata
 */
export function getAllComponentMeta(): ComponentMeta[] {
  return Array.from(componentMetaRegistry.values())
}

/**
 * Searches component metadata by tags, name, or description
 */
export function searchComponentMeta(query: string): ComponentMeta[] {
  const lowerQuery = query.toLowerCase()
  return getAllComponentMeta().filter(
    (meta) =>
      meta.name.toLowerCase().includes(lowerQuery) ||
      meta.summary.toLowerCase().includes(lowerQuery) ||
      meta.description.toLowerCase().includes(lowerQuery) ||
      meta.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  )
}

/**
 * Gets components by phase
 */
export function getComponentsByPhase(phase: number): ComponentMeta[] {
  return getAllComponentMeta().filter((meta) => meta.phase === phase)
}

/**
 * Gets components by status
 */
export function getComponentsByStatus(status: ComponentMeta['status']): ComponentMeta[] {
  return getAllComponentMeta().filter((meta) => meta.status === status)
}
