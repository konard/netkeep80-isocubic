/**
 * Common Types for GOD MODE Library
 *
 * Provides shared types used across all GOD MODE modules.
 * These types abstract away application-specific dependencies,
 * making the library reusable in any React project.
 */

/**
 * Supported UI languages
 */
export type QueryLanguage = 'ru' | 'en'

/**
 * Detects the language of a text string.
 * Uses simple heuristic based on Cyrillic character presence.
 */
export function detectLanguage(text: string): QueryLanguage {
  const cyrillicPattern = /[\u0400-\u04FF]/
  return cyrillicPattern.test(text) ? 'ru' : 'en'
}

/**
 * Component metadata interface for external integration.
 * Applications provide their own component metadata via this interface.
 */
export interface ComponentMeta {
  /** Unique component identifier */
  id: string
  /** Component display name */
  name: string
  /** Component description */
  description: string
  /** Component category or group */
  category?: string
  /** Component file path */
  path?: string
  /** Component tags for search */
  tags?: string[]
  /** Component version */
  version?: string
  /** Component status */
  status?: 'stable' | 'beta' | 'deprecated' | 'experimental'
}

/**
 * Component registry interface for providing component metadata
 * to the GOD MODE library from an external application.
 *
 * Applications implement this interface to connect their component
 * metadata system with GOD MODE's AI conversation and issue generation.
 */
export interface ComponentRegistry {
  /** Get all registered component metadata */
  getAllComponents(): ComponentMeta[]
  /** Search components by query string */
  searchComponents(query: string): ComponentMeta[]
}

/**
 * Default (empty) component registry for when no external registry is provided
 */
export const DEFAULT_COMPONENT_REGISTRY: ComponentRegistry = {
  getAllComponents: () => [],
  searchComponents: () => [],
}
