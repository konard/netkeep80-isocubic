/**
 * EnergyVisualizationEditor component for editing energy visualization settings
 *
 * This component provides UI for editing EnergyCube visualization and animation parameters:
 * - Visualization Settings: visualizationMode, channelMask, energyScale, glowIntensity
 * - Animation Settings: animate, animationSpeed, rotate, rotationSpeed
 * - Real-time preview of effects
 *
 * ISSUE 28: Редактор визуализации энергии (Energy Visualization Editor)
 */

import { useState, useCallback, useMemo } from 'react'
import { ChannelMask, type VisualizationMode } from '../shaders/energy-cube'
import {
  DEFAULT_VISUALIZATION_SETTINGS,
  DEFAULT_ANIMATION_SETTINGS,
  DEFAULT_EDITOR_SETTINGS,
  type VisualizationSettings,
  type AnimationSettings,
  type EnergyVisualizationEditorSettings,
} from '../lib/energy-visualization-defaults'

// Re-export types and defaults for backward compatibility
export type { VisualizationSettings, AnimationSettings, EnergyVisualizationEditorSettings }
export { DEFAULT_VISUALIZATION_SETTINGS, DEFAULT_ANIMATION_SETTINGS, DEFAULT_EDITOR_SETTINGS }

/**
 * Props for EnergyVisualizationEditor component
 */
export interface EnergyVisualizationEditorProps {
  /** Current visualization settings */
  settings: EnergyVisualizationEditorSettings
  /** Callback when settings are updated */
  onSettingsChange?: (settings: EnergyVisualizationEditorSettings) => void
  /** Custom class name */
  className?: string
  /** Whether to show real-time preview info */
  showPreviewInfo?: boolean
}

/** Visualization mode options */
const VISUALIZATION_MODES: { value: VisualizationMode; label: string; description: string }[] = [
  {
    value: 'energy',
    label: 'Energy Density',
    description: 'Shows E = |psi|^2, visualizing energy distribution',
  },
  {
    value: 'amplitude',
    label: 'Amplitude',
    description: 'Shows sqrt(E), providing softer gradient visualization',
  },
  {
    value: 'phase',
    label: 'Phase',
    description: 'Shows wave phase angles, creates rainbow-like patterns',
  },
]

/** Channel options for the mask */
const CHANNEL_OPTIONS: { key: keyof typeof ChannelMask; label: string; color: string }[] = [
  { key: 'R', label: 'Red', color: '#dc3545' },
  { key: 'G', label: 'Green', color: '#28a745' },
  { key: 'B', label: 'Blue', color: '#007bff' },
  { key: 'A', label: 'Alpha', color: '#6c757d' },
]

/**
 * Check if a channel is enabled in the mask
 */
function isChannelEnabled(mask: number, channel: keyof typeof ChannelMask): boolean {
  return (mask & ChannelMask[channel]) !== 0
}

/**
 * Toggle a channel in the mask
 */
function toggleChannel(mask: number, channel: keyof typeof ChannelMask): number {
  return mask ^ ChannelMask[channel]
}

/**
 * Get description of active channels
 */
function getChannelDescription(mask: number): string {
  const channels: string[] = []
  if (mask & ChannelMask.R) channels.push('Red')
  if (mask & ChannelMask.G) channels.push('Green')
  if (mask & ChannelMask.B) channels.push('Blue')
  if (mask & ChannelMask.A) channels.push('Alpha')
  return channels.length > 0 ? channels.join(', ') : 'None'
}

/**
 * EnergyVisualizationEditor component
 * Provides comprehensive UI for editing energy cube visualization and animation settings
 */
export function EnergyVisualizationEditor({
  settings,
  onSettingsChange,
  className = '',
  showPreviewInfo = true,
}: EnergyVisualizationEditorProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['visualization', 'animation'])
  )

  // Toggle section expansion
  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }, [])

  // Update visualization settings
  const updateVisualization = useCallback(
    (updates: Partial<VisualizationSettings>) => {
      if (!onSettingsChange) return
      onSettingsChange({
        ...settings,
        visualization: {
          ...settings.visualization,
          ...updates,
        },
      })
    },
    [settings, onSettingsChange]
  )

  // Update animation settings
  const updateAnimation = useCallback(
    (updates: Partial<AnimationSettings>) => {
      if (!onSettingsChange) return
      onSettingsChange({
        ...settings,
        animation: {
          ...settings.animation,
          ...updates,
        },
      })
    },
    [settings, onSettingsChange]
  )

  // Toggle channel in mask
  const handleChannelToggle = useCallback(
    (channel: keyof typeof ChannelMask) => {
      const newMask = toggleChannel(settings.visualization.channelMask, channel)
      updateVisualization({ channelMask: newMask })
    },
    [settings.visualization.channelMask, updateVisualization]
  )

  // Reset to defaults
  const handleResetVisualization = useCallback(() => {
    updateVisualization(DEFAULT_VISUALIZATION_SETTINGS)
  }, [updateVisualization])

  const handleResetAnimation = useCallback(() => {
    updateAnimation(DEFAULT_ANIMATION_SETTINGS)
  }, [updateAnimation])

  // Compute preview info
  const previewInfo = useMemo(() => {
    const { visualization, animation } = settings
    const activeChannels = getChannelDescription(visualization.channelMask)
    const modeInfo = VISUALIZATION_MODES.find((m) => m.value === visualization.visualizationMode)

    return {
      mode: modeInfo?.label || 'Unknown',
      channels: activeChannels,
      intensity: `Scale: ${visualization.energyScale.toFixed(1)}x, Glow: ${visualization.glowIntensity.toFixed(1)}`,
      animation: animation.animate
        ? `Speed: ${animation.animationSpeed.toFixed(1)}x${animation.rotate ? `, Rotation: ${animation.rotationSpeed.toFixed(1)} rad/s` : ''}`
        : 'Disabled',
    }
  }, [settings])

  return (
    <div className={`energy-viz-editor ${className}`}>
      <div className="energy-viz-editor__header">
        <h3 className="energy-viz-editor__title">Energy Visualization</h3>
      </div>

      {/* Preview Info */}
      {showPreviewInfo && (
        <div className="energy-viz-editor__preview-info">
          <div className="energy-viz-editor__preview-row">
            <span className="energy-viz-editor__preview-label">Mode:</span>
            <span className="energy-viz-editor__preview-value">{previewInfo.mode}</span>
          </div>
          <div className="energy-viz-editor__preview-row">
            <span className="energy-viz-editor__preview-label">Channels:</span>
            <span className="energy-viz-editor__preview-value">{previewInfo.channels}</span>
          </div>
          <div className="energy-viz-editor__preview-row">
            <span className="energy-viz-editor__preview-label">Intensity:</span>
            <span className="energy-viz-editor__preview-value">{previewInfo.intensity}</span>
          </div>
          <div className="energy-viz-editor__preview-row">
            <span className="energy-viz-editor__preview-label">Animation:</span>
            <span className="energy-viz-editor__preview-value">{previewInfo.animation}</span>
          </div>
        </div>
      )}

      {/* Visualization Section */}
      <section className="energy-viz-editor__section">
        <button
          type="button"
          className={`energy-viz-editor__section-header ${expandedSections.has('visualization') ? 'energy-viz-editor__section-header--expanded' : ''}`}
          onClick={() => toggleSection('visualization')}
          aria-expanded={expandedSections.has('visualization')}
        >
          <span>Visualization</span>
          <span className="energy-viz-editor__chevron">
            {expandedSections.has('visualization') ? '▼' : '▶'}
          </span>
        </button>

        {expandedSections.has('visualization') && (
          <div className="energy-viz-editor__section-content">
            <div className="energy-viz-editor__section-actions">
              <button
                type="button"
                className="energy-viz-editor__reset-btn"
                onClick={handleResetVisualization}
                title="Reset visualization settings to defaults"
              >
                Reset
              </button>
            </div>

            {/* Visualization Mode Dropdown */}
            <div className="energy-viz-editor__field">
              <label htmlFor="visualization-mode" className="energy-viz-editor__label">
                Visualization Mode
              </label>
              <select
                id="visualization-mode"
                className="energy-viz-editor__select"
                value={settings.visualization.visualizationMode}
                onChange={(e) =>
                  updateVisualization({ visualizationMode: e.target.value as VisualizationMode })
                }
              >
                {VISUALIZATION_MODES.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
              <p className="energy-viz-editor__description">
                {
                  VISUALIZATION_MODES.find(
                    (m) => m.value === settings.visualization.visualizationMode
                  )?.description
                }
              </p>
            </div>

            {/* Channel Mask Checkboxes */}
            <div className="energy-viz-editor__field">
              <label className="energy-viz-editor__label">Channel Mask</label>
              <div className="energy-viz-editor__channel-group">
                {CHANNEL_OPTIONS.map((channel) => (
                  <label
                    key={channel.key}
                    className="energy-viz-editor__channel-checkbox"
                    style={
                      {
                        '--channel-color': channel.color,
                      } as React.CSSProperties
                    }
                  >
                    <input
                      type="checkbox"
                      checked={isChannelEnabled(settings.visualization.channelMask, channel.key)}
                      onChange={() => handleChannelToggle(channel.key)}
                    />
                    <span
                      className="energy-viz-editor__channel-indicator"
                      style={{ backgroundColor: channel.color }}
                    />
                    <span className="energy-viz-editor__channel-label">{channel.label}</span>
                  </label>
                ))}
              </div>
              <p className="energy-viz-editor__description">
                Select which color channels to include in the visualization.
              </p>
            </div>

            {/* Energy Scale Slider */}
            <div className="energy-viz-editor__field">
              <label htmlFor="energy-scale" className="energy-viz-editor__label">
                Energy Scale
                <span className="energy-viz-editor__value">
                  {settings.visualization.energyScale.toFixed(2)}
                </span>
              </label>
              <input
                id="energy-scale"
                type="range"
                className="energy-viz-editor__slider"
                min="0.1"
                max="3.0"
                step="0.1"
                value={settings.visualization.energyScale}
                onChange={(e) => updateVisualization({ energyScale: parseFloat(e.target.value) })}
              />
              <div className="energy-viz-editor__slider-labels">
                <span>Dim</span>
                <span>Bright</span>
              </div>
              <p className="energy-viz-editor__description">
                Scale factor for energy visualization intensity. Higher values make energy more
                visible.
              </p>
            </div>

            {/* Glow Intensity Slider */}
            <div className="energy-viz-editor__field">
              <label htmlFor="glow-intensity" className="energy-viz-editor__label">
                Glow Intensity
                <span className="energy-viz-editor__value">
                  {settings.visualization.glowIntensity.toFixed(2)}
                </span>
              </label>
              <input
                id="glow-intensity"
                type="range"
                className="energy-viz-editor__slider"
                min="0.0"
                max="2.0"
                step="0.1"
                value={settings.visualization.glowIntensity}
                onChange={(e) => updateVisualization({ glowIntensity: parseFloat(e.target.value) })}
              />
              <div className="energy-viz-editor__slider-labels">
                <span>No glow</span>
                <span>Intense</span>
              </div>
              <p className="energy-viz-editor__description">
                Controls the bloom/glow effect around high-energy areas.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Animation Section */}
      <section className="energy-viz-editor__section">
        <button
          type="button"
          className={`energy-viz-editor__section-header ${expandedSections.has('animation') ? 'energy-viz-editor__section-header--expanded' : ''}`}
          onClick={() => toggleSection('animation')}
          aria-expanded={expandedSections.has('animation')}
        >
          <span>Animation</span>
          <span className="energy-viz-editor__chevron">
            {expandedSections.has('animation') ? '▼' : '▶'}
          </span>
        </button>

        {expandedSections.has('animation') && (
          <div className="energy-viz-editor__section-content">
            <div className="energy-viz-editor__section-actions">
              <button
                type="button"
                className="energy-viz-editor__reset-btn"
                onClick={handleResetAnimation}
                title="Reset animation settings to defaults"
              >
                Reset
              </button>
            </div>

            {/* Animate Checkbox */}
            <div className="energy-viz-editor__field">
              <label className="energy-viz-editor__checkbox-label">
                <input
                  type="checkbox"
                  className="energy-viz-editor__checkbox"
                  checked={settings.animation.animate}
                  onChange={(e) => updateAnimation({ animate: e.target.checked })}
                />
                <span>Enable Animation</span>
              </label>
              <p className="energy-viz-editor__description">
                Enable energy pulsation animation over time.
              </p>
            </div>

            {/* Animation Speed Slider */}
            <div
              className={`energy-viz-editor__field ${!settings.animation.animate ? 'energy-viz-editor__field--disabled' : ''}`}
            >
              <label htmlFor="animation-speed" className="energy-viz-editor__label">
                Animation Speed
                <span className="energy-viz-editor__value">
                  {settings.animation.animationSpeed.toFixed(1)}x
                </span>
              </label>
              <input
                id="animation-speed"
                type="range"
                className="energy-viz-editor__slider"
                min="0.1"
                max="5.0"
                step="0.1"
                value={settings.animation.animationSpeed}
                onChange={(e) => updateAnimation({ animationSpeed: parseFloat(e.target.value) })}
                disabled={!settings.animation.animate}
              />
              <div className="energy-viz-editor__slider-labels">
                <span>Slow</span>
                <span>Fast</span>
              </div>
              <p className="energy-viz-editor__description">
                Speed multiplier for the pulsation animation.
              </p>
            </div>

            {/* Rotate Checkbox */}
            <div className="energy-viz-editor__field">
              <label className="energy-viz-editor__checkbox-label">
                <input
                  type="checkbox"
                  className="energy-viz-editor__checkbox"
                  checked={settings.animation.rotate}
                  onChange={(e) => updateAnimation({ rotate: e.target.checked })}
                />
                <span>Enable Rotation</span>
              </label>
              <p className="energy-viz-editor__description">
                Rotate the cube continuously during animation.
              </p>
            </div>

            {/* Rotation Speed Slider */}
            <div
              className={`energy-viz-editor__field ${!settings.animation.rotate ? 'energy-viz-editor__field--disabled' : ''}`}
            >
              <label htmlFor="rotation-speed" className="energy-viz-editor__label">
                Rotation Speed
                <span className="energy-viz-editor__value">
                  {settings.animation.rotationSpeed.toFixed(2)} rad/s
                </span>
              </label>
              <input
                id="rotation-speed"
                type="range"
                className="energy-viz-editor__slider"
                min="0.0"
                max="2.0"
                step="0.05"
                value={settings.animation.rotationSpeed}
                onChange={(e) => updateAnimation({ rotationSpeed: parseFloat(e.target.value) })}
                disabled={!settings.animation.rotate}
              />
              <div className="energy-viz-editor__slider-labels">
                <span>Stop</span>
                <span>Fast</span>
              </div>
              <p className="energy-viz-editor__description">
                Rotation speed in radians per second.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export default EnergyVisualizationEditor
