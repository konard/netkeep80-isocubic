/**
 * FFTChannelEditor component for editing FFT coefficients by channel (R, G, B, A)
 *
 * This component provides advanced UI for editing FFT channel data including:
 * - Tabs for switching between R/G/B/A channels
 * - DC component editor (amplitude and phase with circular widget)
 * - Coefficient editor (up to 8 coefficients per channel)
 * - Spectrum visualization showing frequency components
 * - Presets for common FFT configurations
 *
 * ISSUE 27: Редактор FFT-каналов (FFT Channels Editor)
 */

import { useState, useCallback, useMemo } from 'react'
import type { FFTCubeConfig, FFTChannel, FFTChannels, FFTCoefficient } from '../types/cube'
import { createDefaultFFTChannel } from '../types/cube'
import { calculateChannelEnergy, calculateTotalEnergy } from '../lib/energyPhysics'
import { FFT_CHANNEL_PRESETS } from '../lib/fft-presets'
import type { FFTChannelPreset } from '../lib/fft-presets'

// Re-export presets for backward compatibility
export { FFT_CHANNEL_PRESETS }
export type { FFTChannelPreset }

/** Channel identifiers */
export type ChannelId = 'R' | 'G' | 'B' | 'A'

/** Available channels in order */
const CHANNELS: ChannelId[] = ['R', 'G', 'B', 'A']

/** Channel display names and colors */
const CHANNEL_INFO: Record<ChannelId, { name: string; color: string; bgColor: string }> = {
  R: { name: 'Red', color: '#dc3545', bgColor: 'rgba(220, 53, 69, 0.1)' },
  G: { name: 'Green', color: '#28a745', bgColor: 'rgba(40, 167, 69, 0.1)' },
  B: { name: 'Blue', color: '#007bff', bgColor: 'rgba(0, 123, 255, 0.1)' },
  A: { name: 'Alpha', color: '#6c757d', bgColor: 'rgba(108, 117, 125, 0.1)' },
}

/** Maximum coefficients per channel (shader limitation) */
const MAX_COEFFICIENTS = 8

/**
 * Props for FFTChannelEditor component
 */
export interface FFTChannelEditorProps {
  /** Current FFT cube configuration */
  currentCube: FFTCubeConfig | null
  /** Callback when cube is updated */
  onCubeUpdate?: (cube: FFTCubeConfig) => void
  /** Custom class name */
  className?: string
}

/**
 * Circular phase selector component
 */
function PhaseSelector({
  value,
  onChange,
  size = 60,
  color = '#007bff',
}: {
  value: number
  onChange: (value: number) => void
  size?: number
  color?: string
}) {
  const center = size / 2
  const radius = size / 2 - 4
  const handleRadius = 6

  // Convert phase to position on circle
  const handleX = center + radius * Math.cos(value - Math.PI / 2)
  const handleY = center + radius * Math.sin(value - Math.PI / 2)

  // Handle drag on the circle
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left - center
      const y = e.clientY - rect.top - center
      let angle = Math.atan2(y, x) + Math.PI / 2
      if (angle < 0) angle += 2 * Math.PI
      onChange(angle)
    },
    [center, onChange]
  )

  const [isDragging, setIsDragging] = useState(false)

  return (
    <svg
      width={size}
      height={size}
      className="fft-channel-editor__phase-selector"
      onMouseDown={() => setIsDragging(true)}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
      onMouseMove={isDragging ? handleMouseMove : undefined}
      style={{ cursor: 'pointer' }}
    >
      {/* Background circle */}
      <circle cx={center} cy={center} r={radius} fill="none" stroke="#ddd" strokeWidth="2" />
      {/* Phase arc */}
      <path
        d={`M ${center} ${center - radius} A ${radius} ${radius} 0 ${value > Math.PI ? 1 : 0} 1 ${handleX} ${handleY}`}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Handle */}
      <circle
        cx={handleX}
        cy={handleY}
        r={handleRadius}
        fill={color}
        stroke="white"
        strokeWidth="2"
      />
      {/* Center dot */}
      <circle cx={center} cy={center} r="3" fill="#666" />
    </svg>
  )
}

/**
 * Spectrum visualization component showing frequency components
 */
function SpectrumVisualization({
  channel,
  color,
}: {
  channel: FFTChannel | undefined
  color: string
}) {
  if (!channel) {
    return (
      <div className="fft-channel-editor__spectrum fft-channel-editor__spectrum--empty">
        <span>No data</span>
      </div>
    )
  }

  // Calculate total energy for normalization
  const channelEnergy = calculateChannelEnergy(channel)
  const maxAmplitude = Math.max(
    channel.dcAmplitude,
    ...channel.coefficients.map((c) => c.amplitude),
    0.1
  )

  // Create bars for DC and each coefficient
  const bars: { label: string; amplitude: number; color: string }[] = [
    { label: 'DC', amplitude: channel.dcAmplitude, color },
  ]

  channel.coefficients.forEach((coeff) => {
    const freqLabel = `(${coeff.freqX},${coeff.freqY},${coeff.freqZ})`
    bars.push({
      label: freqLabel,
      amplitude: coeff.amplitude,
      color,
    })
  })

  return (
    <div className="fft-channel-editor__spectrum">
      <div className="fft-channel-editor__spectrum-bars">
        {bars.map((bar, idx) => (
          <div key={idx} className="fft-channel-editor__spectrum-bar-container">
            <div
              className="fft-channel-editor__spectrum-bar"
              style={{
                height: `${(bar.amplitude / maxAmplitude) * 100}%`,
                backgroundColor: bar.color,
                opacity: 0.3 + 0.7 * (bar.amplitude / maxAmplitude),
              }}
              title={`${bar.label}: ${bar.amplitude.toFixed(3)}`}
            />
            <span className="fft-channel-editor__spectrum-label">{bar.label}</span>
          </div>
        ))}
      </div>
      <div className="fft-channel-editor__spectrum-energy">Energy: {channelEnergy.toFixed(2)}</div>
    </div>
  )
}

/**
 * Coefficient editor component for a single FFT coefficient
 */
function CoefficientEditor({
  coefficient,
  index,
  onChange,
  onRemove,
  maxFreq,
}: {
  coefficient: FFTCoefficient
  index: number
  onChange: (coeff: FFTCoefficient) => void
  onRemove: () => void
  maxFreq: number
}) {
  return (
    <div className="fft-channel-editor__coefficient">
      <div className="fft-channel-editor__coefficient-header">
        <span className="fft-channel-editor__coefficient-index">#{index + 1}</span>
        <button
          type="button"
          className="fft-channel-editor__coefficient-remove"
          onClick={onRemove}
          title="Remove coefficient"
        >
          &times;
        </button>
      </div>

      <div className="fft-channel-editor__coefficient-fields">
        {/* Amplitude */}
        <div className="fft-channel-editor__field fft-channel-editor__field--amplitude">
          <label>
            Amplitude
            <span className="fft-channel-editor__value">{coefficient.amplitude.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.01"
            value={coefficient.amplitude}
            onChange={(e) => onChange({ ...coefficient, amplitude: parseFloat(e.target.value) })}
          />
        </div>

        {/* Phase */}
        <div className="fft-channel-editor__field fft-channel-editor__field--phase">
          <label>
            Phase
            <span className="fft-channel-editor__value">
              {((coefficient.phase * 180) / Math.PI).toFixed(0)}&deg;
            </span>
          </label>
          <input
            type="range"
            min="0"
            max={2 * Math.PI}
            step="0.01"
            value={coefficient.phase}
            onChange={(e) => onChange({ ...coefficient, phase: parseFloat(e.target.value) })}
          />
        </div>

        {/* Frequency indices */}
        <div className="fft-channel-editor__freq-fields">
          <div className="fft-channel-editor__field fft-channel-editor__field--freq">
            <label>freqX</label>
            <input
              type="number"
              min="0"
              max={maxFreq}
              value={coefficient.freqX}
              onChange={(e) =>
                onChange({ ...coefficient, freqX: parseInt(e.target.value, 10) || 0 })
              }
            />
          </div>
          <div className="fft-channel-editor__field fft-channel-editor__field--freq">
            <label>freqY</label>
            <input
              type="number"
              min="0"
              max={maxFreq}
              value={coefficient.freqY}
              onChange={(e) =>
                onChange({ ...coefficient, freqY: parseInt(e.target.value, 10) || 0 })
              }
            />
          </div>
          <div className="fft-channel-editor__field fft-channel-editor__field--freq">
            <label>freqZ</label>
            <input
              type="number"
              min="0"
              max={maxFreq}
              value={coefficient.freqZ}
              onChange={(e) =>
                onChange({ ...coefficient, freqZ: parseInt(e.target.value, 10) || 0 })
              }
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * FFTChannelEditor component
 * Provides advanced UI for editing FFT coefficients per channel
 */
export function FFTChannelEditor({
  currentCube,
  onCubeUpdate,
  className = '',
}: FFTChannelEditorProps) {
  const [activeChannel, setActiveChannel] = useState<ChannelId>('R')
  const [showPresets, setShowPresets] = useState(false)

  // Get the current channel data
  const currentChannel = useMemo(() => {
    if (!currentCube) return undefined
    return currentCube.channels[activeChannel]
  }, [currentCube, activeChannel])

  // Calculate max frequency based on FFT size
  const maxFreq = useMemo(() => {
    return currentCube ? currentCube.fft_size / 2 : 4
  }, [currentCube])

  // Calculate total energy
  const totalEnergy = useMemo(() => {
    return currentCube ? calculateTotalEnergy(currentCube) : 0
  }, [currentCube])

  // Update a single channel
  const updateChannel = useCallback(
    (channelId: ChannelId, updates: Partial<FFTChannel>) => {
      if (!currentCube || !onCubeUpdate) return

      const existingChannel = currentCube.channels[channelId] || createDefaultFFTChannel()
      const updatedChannel: FFTChannel = {
        ...existingChannel,
        ...updates,
      }

      const updatedChannels: FFTChannels = {
        ...currentCube.channels,
        [channelId]: updatedChannel,
      }

      const updatedCube: FFTCubeConfig = {
        ...currentCube,
        channels: updatedChannels,
        meta: {
          ...currentCube.meta,
          modified: new Date().toISOString(),
        },
      }

      // Recalculate current energy
      updatedCube.current_energy = calculateTotalEnergy(updatedCube)

      onCubeUpdate(updatedCube)
    },
    [currentCube, onCubeUpdate]
  )

  // Update DC amplitude
  const updateDCAmplitude = useCallback(
    (value: number) => {
      updateChannel(activeChannel, { dcAmplitude: value })
    },
    [activeChannel, updateChannel]
  )

  // Update DC phase
  const updateDCPhase = useCallback(
    (value: number) => {
      updateChannel(activeChannel, { dcPhase: value })
    },
    [activeChannel, updateChannel]
  )

  // Update a coefficient
  const updateCoefficient = useCallback(
    (index: number, coeff: FFTCoefficient) => {
      if (!currentChannel) return
      const newCoefficients = [...currentChannel.coefficients]
      newCoefficients[index] = coeff
      updateChannel(activeChannel, { coefficients: newCoefficients })
    },
    [activeChannel, currentChannel, updateChannel]
  )

  // Add a new coefficient
  const addCoefficient = useCallback(() => {
    if (!currentChannel) return
    if (currentChannel.coefficients.length >= MAX_COEFFICIENTS) return

    const newCoefficients: FFTCoefficient[] = [
      ...currentChannel.coefficients,
      {
        amplitude: 0.5,
        phase: 0,
        freqX: 1,
        freqY: 0,
        freqZ: 0,
      },
    ]
    updateChannel(activeChannel, { coefficients: newCoefficients })
  }, [activeChannel, currentChannel, updateChannel])

  // Remove a coefficient
  const removeCoefficient = useCallback(
    (index: number) => {
      if (!currentChannel) return
      const newCoefficients = currentChannel.coefficients.filter((_, i) => i !== index)
      updateChannel(activeChannel, { coefficients: newCoefficients })
    },
    [activeChannel, currentChannel, updateChannel]
  )

  // Apply a preset
  const applyPreset = useCallback(
    (preset: FFTChannelPreset) => {
      if (!currentCube || !onCubeUpdate) return

      const updatedCube: FFTCubeConfig = {
        ...currentCube,
        channels: { ...preset.channels },
        meta: {
          ...currentCube.meta,
          modified: new Date().toISOString(),
        },
      }

      updatedCube.current_energy = calculateTotalEnergy(updatedCube)
      onCubeUpdate(updatedCube)
      setShowPresets(false)
    },
    [currentCube, onCubeUpdate]
  )

  // Empty state
  if (!currentCube) {
    return (
      <div className={`fft-channel-editor ${className}`}>
        <div className="fft-channel-editor__empty">
          <p>No FFT cube selected</p>
          <p>Select a magical cube to edit its FFT channels</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`fft-channel-editor ${className}`}>
      <div className="fft-channel-editor__header">
        <h3 className="fft-channel-editor__title">FFT Channels</h3>
        <button
          type="button"
          className="fft-channel-editor__presets-btn"
          onClick={() => setShowPresets(!showPresets)}
        >
          {showPresets ? 'Hide Presets' : 'Presets'}
        </button>
      </div>

      {/* Presets panel */}
      {showPresets && (
        <div className="fft-channel-editor__presets-panel">
          <h4>Apply Preset</h4>
          <div className="fft-channel-editor__presets-list">
            {FFT_CHANNEL_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="fft-channel-editor__preset-item"
                onClick={() => applyPreset(preset)}
              >
                <span className="fft-channel-editor__preset-name">{preset.name}</span>
                <span className="fft-channel-editor__preset-desc">{preset.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Total energy indicator */}
      <div className="fft-channel-editor__total-energy">
        <span>Total Energy:</span>
        <span className="fft-channel-editor__total-energy-value">{totalEnergy.toFixed(2)}</span>
      </div>

      {/* Channel tabs */}
      <div className="fft-channel-editor__tabs">
        {CHANNELS.map((channelId) => {
          const info = CHANNEL_INFO[channelId]
          const channelData = currentCube.channels[channelId]
          const hasData =
            channelData && (channelData.dcAmplitude > 0 || channelData.coefficients.length > 0)

          return (
            <button
              key={channelId}
              type="button"
              className={`fft-channel-editor__tab ${activeChannel === channelId ? 'fft-channel-editor__tab--active' : ''}`}
              onClick={() => setActiveChannel(channelId)}
              style={{
                borderColor: activeChannel === channelId ? info.color : 'transparent',
                backgroundColor: activeChannel === channelId ? info.bgColor : 'transparent',
              }}
            >
              <span
                className="fft-channel-editor__tab-dot"
                style={{ backgroundColor: info.color, opacity: hasData ? 1 : 0.3 }}
              />
              <span className="fft-channel-editor__tab-name">{info.name}</span>
            </button>
          )
        })}
      </div>

      {/* Channel content */}
      <div
        className="fft-channel-editor__content"
        style={{ backgroundColor: CHANNEL_INFO[activeChannel].bgColor }}
      >
        {/* Spectrum visualization */}
        <div className="fft-channel-editor__section">
          <h4 className="fft-channel-editor__section-title">Spectrum</h4>
          <SpectrumVisualization
            channel={currentChannel}
            color={CHANNEL_INFO[activeChannel].color}
          />
        </div>

        {/* DC Component */}
        <div className="fft-channel-editor__section">
          <h4 className="fft-channel-editor__section-title">DC Component (Average)</h4>
          <div className="fft-channel-editor__dc-editor">
            <div className="fft-channel-editor__dc-amplitude">
              <label>
                Amplitude
                <span className="fft-channel-editor__value">
                  {(currentChannel?.dcAmplitude ?? 0).toFixed(2)}
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.01"
                value={currentChannel?.dcAmplitude ?? 0}
                onChange={(e) => updateDCAmplitude(parseFloat(e.target.value))}
              />
            </div>
            <div className="fft-channel-editor__dc-phase">
              <label>
                Phase
                <span className="fft-channel-editor__value">
                  {(((currentChannel?.dcPhase ?? 0) * 180) / Math.PI).toFixed(0)}&deg;
                </span>
              </label>
              <PhaseSelector
                value={currentChannel?.dcPhase ?? 0}
                onChange={updateDCPhase}
                color={CHANNEL_INFO[activeChannel].color}
              />
            </div>
          </div>
        </div>

        {/* Coefficients */}
        <div className="fft-channel-editor__section">
          <div className="fft-channel-editor__coefficients-header">
            <h4 className="fft-channel-editor__section-title">
              Coefficients ({currentChannel?.coefficients.length ?? 0}/{MAX_COEFFICIENTS})
            </h4>
            <button
              type="button"
              className="fft-channel-editor__add-btn"
              onClick={addCoefficient}
              disabled={!currentChannel || currentChannel.coefficients.length >= MAX_COEFFICIENTS}
              title="Add coefficient"
            >
              + Add
            </button>
          </div>

          {currentChannel && currentChannel.coefficients.length > 0 ? (
            <div className="fft-channel-editor__coefficients-list">
              {currentChannel.coefficients.map((coeff, idx) => (
                <CoefficientEditor
                  key={idx}
                  coefficient={coeff}
                  index={idx}
                  onChange={(c) => updateCoefficient(idx, c)}
                  onRemove={() => removeCoefficient(idx)}
                  maxFreq={maxFreq}
                />
              ))}
            </div>
          ) : (
            <div className="fft-channel-editor__no-coefficients">
              <p>No frequency coefficients</p>
              <p>Add coefficients to create wave patterns</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FFTChannelEditor
