/**
 * Default settings for EnergyVisualizationEditor
 *
 * These defaults are extracted to a separate file to comply with
 * react-refresh/only-export-components rule which requires component
 * files to only export components.
 *
 * ISSUE 28: Редактор визуализации энергии (Energy Visualization Editor)
 */

import { ChannelMask, type VisualizationMode } from '../shaders/energy-cube'

/**
 * Settings for visualization mode and channel display
 */
export interface VisualizationSettings {
  /** Current visualization mode */
  visualizationMode: VisualizationMode
  /** Bitmask for active channels (use ChannelMask constants) */
  channelMask: number
  /** Scale factor for energy display (0.1 - 3.0) */
  energyScale: number
  /** Glow effect intensity (0.0 - 2.0) */
  glowIntensity: number
}

/**
 * Settings for animation behavior
 */
export interface AnimationSettings {
  /** Whether animation is enabled */
  animate: boolean
  /** Animation speed multiplier (0.1 - 5.0) */
  animationSpeed: number
  /** Whether cube rotation is enabled */
  rotate: boolean
  /** Rotation speed multiplier (0.0 - 2.0) */
  rotationSpeed: number
}

/**
 * Combined settings for the energy visualization editor
 */
export interface EnergyVisualizationEditorSettings {
  /** Visualization settings */
  visualization: VisualizationSettings
  /** Animation settings */
  animation: AnimationSettings
}

/**
 * Default visualization settings
 */
export const DEFAULT_VISUALIZATION_SETTINGS: VisualizationSettings = {
  visualizationMode: 'energy',
  channelMask: ChannelMask.RGBA,
  energyScale: 1.0,
  glowIntensity: 0.5,
}

/**
 * Default animation settings
 */
export const DEFAULT_ANIMATION_SETTINGS: AnimationSettings = {
  animate: true,
  animationSpeed: 1.0,
  rotate: false,
  rotationSpeed: 0.5,
}

/**
 * Default combined editor settings
 */
export const DEFAULT_EDITOR_SETTINGS: EnergyVisualizationEditorSettings = {
  visualization: { ...DEFAULT_VISUALIZATION_SETTINGS },
  animation: { ...DEFAULT_ANIMATION_SETTINGS },
}
