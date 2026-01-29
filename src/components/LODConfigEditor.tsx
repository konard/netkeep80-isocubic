/**
 * LOD Configuration Editor Component
 * Provides detailed UI for editing LOD system settings
 *
 * ISSUE 31: Настройки LOD в редакторе (LOD Settings Editor)
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import type {
  LODConfig,
  LODLevel,
  LODLevelSettings,
  LODThreshold,
  LODStatistics,
} from '../types/lod'
import { DEFAULT_LOD_CONFIG, DEFAULT_LOD_SETTINGS } from '../types/lod'

/**
 * Quick profile presets for LOD configuration
 */
export type LODProfile = 'performance' | 'balanced' | 'quality'

/**
 * Props for LODConfigEditor component
 */
export interface LODConfigEditorProps {
  /** Current LOD configuration */
  config?: LODConfig
  /** Callback when configuration changes */
  onConfigChange?: (config: LODConfig) => void
  /** Current LOD statistics (optional, for display) */
  statistics?: LODStatistics
  /** Custom class name */
  className?: string
  /** Whether to show advanced settings */
  showAdvanced?: boolean
}

/**
 * Descriptions for LOD profiles
 */
const PROFILE_DESCRIPTIONS: Record<LODProfile, string> = {
  performance: 'Aggressive LOD switching for better FPS on low-end devices',
  balanced: 'Balanced settings for most devices',
  quality: 'Higher detail at distance, may impact performance',
}

/**
 * Level descriptions for UI display
 */
const LOD_LEVEL_DESCRIPTIONS: Record<LODLevel, string> = {
  0: 'Full Detail (closest)',
  1: 'High Detail',
  2: 'Medium Detail',
  3: 'Low Detail',
  4: 'Minimal Detail (farthest)',
}

/**
 * Creates a profile-based LOD configuration
 */
function createProfileConfig(profile: LODProfile): LODConfig {
  const baseConfig = { ...DEFAULT_LOD_CONFIG }

  switch (profile) {
    case 'performance':
      // More aggressive LOD - shorter distances to higher LOD
      return {
        ...baseConfig,
        thresholds: [
          { level: 0, minDistance: 0, maxDistance: 3 },
          { level: 1, minDistance: 3, maxDistance: 8 },
          { level: 2, minDistance: 8, maxDistance: 15 },
          { level: 3, minDistance: 15, maxDistance: 25 },
          { level: 4, minDistance: 25, maxDistance: Infinity },
        ],
        levelSettings: {
          ...DEFAULT_LOD_SETTINGS,
          0: { ...DEFAULT_LOD_SETTINGS[0], noiseOctaves: 3 },
          1: { ...DEFAULT_LOD_SETTINGS[1], noiseOctaves: 2 },
          2: { ...DEFAULT_LOD_SETTINGS[2], noiseOctaves: 1, maxGradients: 2 },
          3: { ...DEFAULT_LOD_SETTINGS[3], noiseOctaves: 0, enableNoise: false },
          4: { ...DEFAULT_LOD_SETTINGS[4] },
        },
        screenSizeThreshold: 75,
        transitionDuration: 0.2,
      }

    case 'quality':
      // Less aggressive LOD - longer distances to maintain quality
      return {
        ...baseConfig,
        thresholds: [
          { level: 0, minDistance: 0, maxDistance: 10 },
          { level: 1, minDistance: 10, maxDistance: 25 },
          { level: 2, minDistance: 25, maxDistance: 50 },
          { level: 3, minDistance: 50, maxDistance: 80 },
          { level: 4, minDistance: 80, maxDistance: Infinity },
        ],
        levelSettings: {
          ...DEFAULT_LOD_SETTINGS,
          0: { ...DEFAULT_LOD_SETTINGS[0], noiseOctaves: 6 },
          1: { ...DEFAULT_LOD_SETTINGS[1], noiseOctaves: 4 },
          2: { ...DEFAULT_LOD_SETTINGS[2], noiseOctaves: 3 },
          3: { ...DEFAULT_LOD_SETTINGS[3], noiseOctaves: 2, enableBoundaryStitching: true },
          4: { ...DEFAULT_LOD_SETTINGS[4], noiseOctaves: 1, enableNoise: true },
        },
        screenSizeThreshold: 30,
        transitionDuration: 0.5,
      }

    case 'balanced':
    default:
      return baseConfig
  }
}

/**
 * Detects which profile matches the current configuration
 */
function detectProfile(config: LODConfig): LODProfile | null {
  // Simple check based on first threshold maxDistance
  const firstMaxDist = config.thresholds[0]?.maxDistance ?? 5

  // Performance profile uses 3m as first threshold
  if (firstMaxDist <= 3) return 'performance'
  // Quality profile uses 10m as first threshold
  if (firstMaxDist >= 10) return 'quality'
  // Balanced profile uses 5m as first threshold (DEFAULT_LOD_CONFIG default)
  if (firstMaxDist === 5) return 'balanced'

  return null // Custom configuration
}

/**
 * LODConfigEditor component
 * Provides comprehensive UI for editing LOD system configuration
 */
export function LODConfigEditor({
  config = DEFAULT_LOD_CONFIG,
  onConfigChange,
  statistics,
  className = '',
  showAdvanced = false,
}: LODConfigEditorProps) {
  // Local state for editing
  const [localConfig, setLocalConfig] = useState<LODConfig>(config)
  const [expandedLevels, setExpandedLevels] = useState<Set<LODLevel>>(new Set())
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(showAdvanced)

  // Sync local state with prop
  useEffect(() => {
    setLocalConfig(config)
  }, [config])

  // Detect current profile
  const currentProfile = useMemo(() => detectProfile(localConfig), [localConfig])

  // Update configuration
  const updateConfig = useCallback(
    (updates: Partial<LODConfig>) => {
      const newConfig = { ...localConfig, ...updates }
      setLocalConfig(newConfig)
      onConfigChange?.(newConfig)
    },
    [localConfig, onConfigChange]
  )

  // Handle profile change
  const handleProfileChange = useCallback(
    (profile: LODProfile) => {
      const newConfig = createProfileConfig(profile)
      newConfig.enabled = localConfig.enabled // Preserve enabled state
      setLocalConfig(newConfig)
      onConfigChange?.(newConfig)
    },
    [localConfig.enabled, onConfigChange]
  )

  // Update threshold for a specific level
  const updateThreshold = useCallback(
    (level: LODLevel, updates: Partial<LODThreshold>) => {
      const newThresholds = localConfig.thresholds.map((t) =>
        t.level === level ? { ...t, ...updates } : t
      )
      updateConfig({ thresholds: newThresholds })
    },
    [localConfig.thresholds, updateConfig]
  )

  // Update settings for a specific level
  const updateLevelSettings = useCallback(
    (level: LODLevel, updates: Partial<LODLevelSettings>) => {
      const newSettings = {
        ...localConfig.levelSettings,
        [level]: { ...localConfig.levelSettings[level], ...updates },
      }
      updateConfig({ levelSettings: newSettings })
    },
    [localConfig.levelSettings, updateConfig]
  )

  // Toggle level expansion
  const toggleLevel = useCallback((level: LODLevel) => {
    setExpandedLevels((prev) => {
      const next = new Set(prev)
      if (next.has(level)) {
        next.delete(level)
      } else {
        next.add(level)
      }
      return next
    })
  }, [])

  // Reset to defaults
  const handleReset = useCallback(() => {
    const newConfig = { ...DEFAULT_LOD_CONFIG }
    setLocalConfig(newConfig)
    onConfigChange?.(newConfig)
  }, [onConfigChange])

  return (
    <div className={`lod-config-editor ${className}`}>
      {/* Enable/Disable Toggle */}
      <div className="lod-config-editor__field">
        <label className="lod-config-editor__checkbox-label">
          <input
            type="checkbox"
            className="lod-config-editor__checkbox"
            checked={localConfig.enabled}
            onChange={(e) => updateConfig({ enabled: e.target.checked })}
          />
          <span>Enable LOD System</span>
        </label>
        <p className="lod-config-editor__hint">
          Automatically reduces detail for distant objects to improve performance.
        </p>
      </div>

      {/* Profile Quick Selection */}
      <div className="lod-config-editor__field">
        <label htmlFor="lod-profile" className="lod-config-editor__label">
          Profile
        </label>
        <select
          id="lod-profile"
          className="lod-config-editor__select"
          value={currentProfile || 'custom'}
          onChange={(e) => {
            const value = e.target.value
            if (value !== 'custom') {
              handleProfileChange(value as LODProfile)
            }
          }}
          disabled={!localConfig.enabled}
        >
          <option value="performance">Performance</option>
          <option value="balanced">Balanced (Recommended)</option>
          <option value="quality">Quality</option>
          {currentProfile === null && <option value="custom">Custom</option>}
        </select>
        <p className="lod-config-editor__description">
          {currentProfile ? PROFILE_DESCRIPTIONS[currentProfile] : 'Custom LOD settings'}
        </p>
      </div>

      {/* Statistics Display */}
      {statistics && (
        <div className="lod-config-editor__stats">
          <div className="lod-config-editor__stats-header">Live Statistics</div>
          <div className="lod-config-editor__stats-grid">
            <div className="lod-config-editor__stat-item">
              <span className="lod-config-editor__stat-label">Total Cubes</span>
              <span className="lod-config-editor__stat-value">{statistics.totalCubes}</span>
            </div>
            <div className="lod-config-editor__stat-item">
              <span className="lod-config-editor__stat-label">Avg LOD</span>
              <span className="lod-config-editor__stat-value">
                {statistics.averageLODLevel.toFixed(1)}
              </span>
            </div>
            <div className="lod-config-editor__stat-item">
              <span className="lod-config-editor__stat-label">Savings</span>
              <span className="lod-config-editor__stat-value">
                {statistics.performanceSavings.toFixed(0)}%
              </span>
            </div>
            <div className="lod-config-editor__stat-item">
              <span className="lod-config-editor__stat-label">Transitioning</span>
              <span className="lod-config-editor__stat-value">{statistics.transitioningCubes}</span>
            </div>
          </div>
          {/* Distribution bar */}
          <div className="lod-config-editor__distribution">
            <div className="lod-config-editor__distribution-label">Level Distribution</div>
            <div className="lod-config-editor__distribution-bar">
              {([0, 1, 2, 3, 4] as LODLevel[]).map((level) => {
                const count = statistics.cubesPerLevel[level]
                const percentage =
                  statistics.totalCubes > 0 ? (count / statistics.totalCubes) * 100 : 0
                return (
                  <div
                    key={level}
                    className={`lod-config-editor__distribution-segment lod-config-editor__distribution-segment--level-${level}`}
                    style={{ width: `${percentage}%` }}
                    title={`LOD ${level}: ${count} cubes (${percentage.toFixed(1)}%)`}
                  />
                )
              })}
            </div>
            <div className="lod-config-editor__distribution-legend">
              {([0, 1, 2, 3, 4] as LODLevel[]).map((level) => (
                <span
                  key={level}
                  className={`lod-config-editor__legend-item lod-config-editor__legend-item--level-${level}`}
                >
                  L{level}: {statistics.cubesPerLevel[level]}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Advanced Settings Toggle */}
      <button
        type="button"
        className="lod-config-editor__advanced-toggle"
        onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
        disabled={!localConfig.enabled}
        aria-expanded={isAdvancedOpen}
      >
        <span>Advanced Settings</span>
        <span className="lod-config-editor__chevron">{isAdvancedOpen ? '▼' : '▶'}</span>
      </button>

      {/* Advanced Settings Content */}
      {isAdvancedOpen && localConfig.enabled && (
        <div className="lod-config-editor__advanced">
          {/* Transition Duration */}
          <div className="lod-config-editor__field">
            <label htmlFor="lod-transition" className="lod-config-editor__label">
              Transition Duration
              <span className="lod-config-editor__value">
                {localConfig.transitionDuration.toFixed(2)}s
              </span>
            </label>
            <input
              id="lod-transition"
              type="range"
              className="lod-config-editor__slider"
              min="0"
              max="1"
              step="0.05"
              value={localConfig.transitionDuration}
              onChange={(e) => updateConfig({ transitionDuration: parseFloat(e.target.value) })}
            />
            <div className="lod-config-editor__slider-labels">
              <span>Instant</span>
              <span>Smooth</span>
            </div>
          </div>

          {/* Screen Size Threshold */}
          <div className="lod-config-editor__field">
            <label htmlFor="lod-screen-threshold" className="lod-config-editor__label">
              Screen Size Threshold
              <span className="lod-config-editor__value">{localConfig.screenSizeThreshold}px</span>
            </label>
            <input
              id="lod-screen-threshold"
              type="range"
              className="lod-config-editor__slider"
              min="20"
              max="150"
              step="5"
              value={localConfig.screenSizeThreshold}
              onChange={(e) => updateConfig({ screenSizeThreshold: parseInt(e.target.value, 10) })}
            />
            <p className="lod-config-editor__hint">
              Objects smaller than this threshold (in pixels) switch to lower LOD faster.
            </p>
          </div>

          {/* Per-Level Settings */}
          <div className="lod-config-editor__levels">
            <div className="lod-config-editor__levels-header">Per-Level Settings</div>

            {([0, 1, 2, 3, 4] as LODLevel[]).map((level) => {
              const threshold = localConfig.thresholds.find((t) => t.level === level)
              const settings = localConfig.levelSettings[level]
              const isExpanded = expandedLevels.has(level)

              return (
                <div key={level} className="lod-config-editor__level">
                  <button
                    type="button"
                    className={`lod-config-editor__level-header ${isExpanded ? 'lod-config-editor__level-header--expanded' : ''}`}
                    onClick={() => toggleLevel(level)}
                    aria-expanded={isExpanded}
                  >
                    <span className="lod-config-editor__level-title">
                      LOD {level}: {LOD_LEVEL_DESCRIPTIONS[level]}
                    </span>
                    <span className="lod-config-editor__level-summary">
                      {threshold?.minDistance ?? 0}-
                      {threshold?.maxDistance === Infinity ? '∞' : (threshold?.maxDistance ?? 0)}m
                    </span>
                    <span className="lod-config-editor__chevron">{isExpanded ? '▼' : '▶'}</span>
                  </button>

                  {isExpanded && (
                    <div className="lod-config-editor__level-content">
                      {/* Distance Thresholds */}
                      <div className="lod-config-editor__field-row">
                        <div className="lod-config-editor__field lod-config-editor__field--half">
                          <label className="lod-config-editor__label">Min Distance</label>
                          <input
                            type="number"
                            className="lod-config-editor__number-input"
                            min="0"
                            max="100"
                            step="1"
                            value={threshold?.minDistance ?? 0}
                            onChange={(e) =>
                              updateThreshold(level, { minDistance: parseFloat(e.target.value) })
                            }
                          />
                        </div>
                        <div className="lod-config-editor__field lod-config-editor__field--half">
                          <label className="lod-config-editor__label">Max Distance</label>
                          <input
                            type="number"
                            className="lod-config-editor__number-input"
                            min="0"
                            max="1000"
                            step="1"
                            value={
                              threshold?.maxDistance === Infinity
                                ? 999
                                : (threshold?.maxDistance ?? 0)
                            }
                            onChange={(e) => {
                              const val = parseFloat(e.target.value)
                              updateThreshold(level, { maxDistance: val >= 999 ? Infinity : val })
                            }}
                          />
                        </div>
                      </div>

                      {/* Noise Octaves */}
                      <div className="lod-config-editor__field">
                        <label
                          htmlFor={`lod-noise-octaves-${level}`}
                          className="lod-config-editor__label"
                        >
                          Noise Octaves
                          <span className="lod-config-editor__value">{settings.noiseOctaves}</span>
                        </label>
                        <input
                          id={`lod-noise-octaves-${level}`}
                          type="range"
                          className="lod-config-editor__slider"
                          min="0"
                          max="8"
                          step="1"
                          value={settings.noiseOctaves}
                          onChange={(e) =>
                            updateLevelSettings(level, {
                              noiseOctaves: parseInt(e.target.value, 10),
                            })
                          }
                        />
                      </div>

                      {/* Max Gradients */}
                      <div className="lod-config-editor__field">
                        <label className="lod-config-editor__label">
                          Max Gradients
                          <span className="lod-config-editor__value">{settings.maxGradients}</span>
                        </label>
                        <input
                          type="range"
                          className="lod-config-editor__slider"
                          min="0"
                          max="4"
                          step="1"
                          value={settings.maxGradients}
                          onChange={(e) =>
                            updateLevelSettings(level, {
                              maxGradients: parseInt(e.target.value, 10),
                            })
                          }
                        />
                      </div>

                      {/* FFT Coefficients (for energy cubes) */}
                      <div className="lod-config-editor__field">
                        <label className="lod-config-editor__label">
                          FFT Coefficients
                          <span className="lod-config-editor__value">
                            {settings.fftCoefficients}
                          </span>
                        </label>
                        <input
                          type="range"
                          className="lod-config-editor__slider"
                          min="1"
                          max="16"
                          step="1"
                          value={settings.fftCoefficients}
                          onChange={(e) =>
                            updateLevelSettings(level, {
                              fftCoefficients: parseInt(e.target.value, 10),
                            })
                          }
                        />
                      </div>

                      {/* Enable Noise Checkbox */}
                      <div className="lod-config-editor__field">
                        <label className="lod-config-editor__checkbox-label">
                          <input
                            type="checkbox"
                            className="lod-config-editor__checkbox"
                            checked={settings.enableNoise}
                            onChange={(e) =>
                              updateLevelSettings(level, { enableNoise: e.target.checked })
                            }
                          />
                          <span>Enable Noise</span>
                        </label>
                      </div>

                      {/* Enable Boundary Stitching Checkbox */}
                      <div className="lod-config-editor__field">
                        <label className="lod-config-editor__checkbox-label">
                          <input
                            type="checkbox"
                            className="lod-config-editor__checkbox"
                            checked={settings.enableBoundaryStitching}
                            onChange={(e) =>
                              updateLevelSettings(level, {
                                enableBoundaryStitching: e.target.checked,
                              })
                            }
                          />
                          <span>Enable Boundary Stitching</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Reset Button */}
          <button type="button" className="lod-config-editor__reset-btn" onClick={handleReset}>
            Reset to Defaults
          </button>
        </div>
      )}
    </div>
  )
}

export default LODConfigEditor
