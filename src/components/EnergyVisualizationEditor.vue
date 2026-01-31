/** * EnergyVisualizationEditor component for editing energy visualization settings (Vue 3 SFC) * *
This component provides UI for editing EnergyCube visualization and animation parameters: * -
Visualization Settings: visualizationMode, channelMask, energyScale, glowIntensity * - Animation
Settings: animate, animationSpeed, rotate, rotationSpeed * - Real-time preview of effects * * ISSUE
28: Редактор визуализации энергии (Energy Visualization Editor) * ISSUE 135: Migration from React to
Vue 3.0 SFC */
<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChannelMask, type VisualizationMode } from '../shaders/energy-cube'
import {
  DEFAULT_VISUALIZATION_SETTINGS,
  DEFAULT_ANIMATION_SETTINGS,
  type VisualizationSettings,
  type AnimationSettings,
  type EnergyVisualizationEditorSettings,
} from '../lib/energy-visualization-defaults'

// Re-export types for backward compatibility
export type { VisualizationSettings, AnimationSettings, EnergyVisualizationEditorSettings }

/**
 * Props for EnergyVisualizationEditor component
 */
interface EnergyVisualizationEditorProps {
  /** Current visualization settings */
  settings: EnergyVisualizationEditorSettings
  /** Custom class name */
  className?: string
  /** Whether to show real-time preview info */
  showPreviewInfo?: boolean
}

const props = withDefaults(defineProps<EnergyVisualizationEditorProps>(), {
  className: '',
  showPreviewInfo: true,
})

const emit = defineEmits<{
  'update:settings': [settings: EnergyVisualizationEditorSettings]
}>()

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

// Expanded sections state
const expandedSections = ref<Set<string>>(new Set(['visualization', 'animation']))

// Toggle section expansion
function toggleSectionExpansion(section: string) {
  const next = new Set(expandedSections.value)
  if (next.has(section)) {
    next.delete(section)
  } else {
    next.add(section)
  }
  expandedSections.value = next
}

// Update visualization settings
function updateVisualization(updates: Partial<VisualizationSettings>) {
  emit('update:settings', {
    ...props.settings,
    visualization: {
      ...props.settings.visualization,
      ...updates,
    },
  })
}

// Update animation settings
function updateAnimation(updates: Partial<AnimationSettings>) {
  emit('update:settings', {
    ...props.settings,
    animation: {
      ...props.settings.animation,
      ...updates,
    },
  })
}

// Toggle channel in mask
function handleChannelToggle(channel: keyof typeof ChannelMask) {
  const newMask = toggleChannel(props.settings.visualization.channelMask, channel)
  updateVisualization({ channelMask: newMask })
}

// Reset to defaults
function handleResetVisualization() {
  updateVisualization(DEFAULT_VISUALIZATION_SETTINGS)
}

function handleResetAnimation() {
  updateAnimation(DEFAULT_ANIMATION_SETTINGS)
}

// Compute preview info
const previewInfo = computed(() => {
  const { visualization, animation } = props.settings
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
})

// Computed description for selected visualization mode
const selectedModeDescription = computed(() => {
  return VISUALIZATION_MODES.find((m) => m.value === props.settings.visualization.visualizationMode)
    ?.description
})
</script>

<template>
  <div :class="`energy-viz-editor ${props.className}`">
    <div class="energy-viz-editor__header">
      <h3 class="energy-viz-editor__title">Energy Visualization</h3>
    </div>

    <!-- Preview Info -->
    <div v-if="props.showPreviewInfo" class="energy-viz-editor__preview-info">
      <div class="energy-viz-editor__preview-row">
        <span class="energy-viz-editor__preview-label">Mode:</span>
        <span class="energy-viz-editor__preview-value">{{ previewInfo.mode }}</span>
      </div>
      <div class="energy-viz-editor__preview-row">
        <span class="energy-viz-editor__preview-label">Channels:</span>
        <span class="energy-viz-editor__preview-value">{{ previewInfo.channels }}</span>
      </div>
      <div class="energy-viz-editor__preview-row">
        <span class="energy-viz-editor__preview-label">Intensity:</span>
        <span class="energy-viz-editor__preview-value">{{ previewInfo.intensity }}</span>
      </div>
      <div class="energy-viz-editor__preview-row">
        <span class="energy-viz-editor__preview-label">Animation:</span>
        <span class="energy-viz-editor__preview-value">{{ previewInfo.animation }}</span>
      </div>
    </div>

    <!-- Visualization Section -->
    <section class="energy-viz-editor__section">
      <button
        type="button"
        :class="`energy-viz-editor__section-header ${expandedSections.has('visualization') ? 'energy-viz-editor__section-header--expanded' : ''}`"
        :aria-expanded="expandedSections.has('visualization')"
        @click="toggleSectionExpansion('visualization')"
      >
        <span>Visualization</span>
        <span class="energy-viz-editor__chevron">
          {{ expandedSections.has('visualization') ? '\u25BC' : '\u25B6' }}
        </span>
      </button>

      <div v-if="expandedSections.has('visualization')" class="energy-viz-editor__section-content">
        <div class="energy-viz-editor__section-actions">
          <button
            type="button"
            class="energy-viz-editor__reset-btn"
            title="Reset visualization settings to defaults"
            @click="handleResetVisualization"
          >
            Reset
          </button>
        </div>

        <!-- Visualization Mode Dropdown -->
        <div class="energy-viz-editor__field">
          <label for="visualization-mode" class="energy-viz-editor__label">
            Visualization Mode
          </label>
          <select
            id="visualization-mode"
            class="energy-viz-editor__select"
            :value="props.settings.visualization.visualizationMode"
            @change="
              updateVisualization({
                visualizationMode: ($event.target as HTMLSelectElement).value as VisualizationMode,
              })
            "
          >
            <option v-for="mode in VISUALIZATION_MODES" :key="mode.value" :value="mode.value">
              {{ mode.label }}
            </option>
          </select>
          <p class="energy-viz-editor__description">
            {{ selectedModeDescription }}
          </p>
        </div>

        <!-- Channel Mask Checkboxes -->
        <div class="energy-viz-editor__field">
          <label class="energy-viz-editor__label">Channel Mask</label>
          <div class="energy-viz-editor__channel-group">
            <label
              v-for="channel in CHANNEL_OPTIONS"
              :key="channel.key"
              class="energy-viz-editor__channel-checkbox"
              :style="{ '--channel-color': channel.color } as any"
            >
              <input
                type="checkbox"
                :checked="isChannelEnabled(props.settings.visualization.channelMask, channel.key)"
                @change="handleChannelToggle(channel.key)"
              />
              <span
                class="energy-viz-editor__channel-indicator"
                :style="{ backgroundColor: channel.color }"
              />
              <span class="energy-viz-editor__channel-label">{{ channel.label }}</span>
            </label>
          </div>
          <p class="energy-viz-editor__description">
            Select which color channels to include in the visualization.
          </p>
        </div>

        <!-- Energy Scale Slider -->
        <div class="energy-viz-editor__field">
          <label for="energy-scale" class="energy-viz-editor__label">
            Energy Scale
            <span class="energy-viz-editor__value">
              {{ props.settings.visualization.energyScale.toFixed(2) }}
            </span>
          </label>
          <input
            id="energy-scale"
            type="range"
            class="energy-viz-editor__slider"
            min="0.1"
            max="3.0"
            step="0.1"
            :value="props.settings.visualization.energyScale"
            @input="
              updateVisualization({
                energyScale: parseFloat(($event.target as HTMLInputElement).value),
              })
            "
          />
          <div class="energy-viz-editor__slider-labels">
            <span>Dim</span>
            <span>Bright</span>
          </div>
          <p class="energy-viz-editor__description">
            Scale factor for energy visualization intensity. Higher values make energy more visible.
          </p>
        </div>

        <!-- Glow Intensity Slider -->
        <div class="energy-viz-editor__field">
          <label for="glow-intensity" class="energy-viz-editor__label">
            Glow Intensity
            <span class="energy-viz-editor__value">
              {{ props.settings.visualization.glowIntensity.toFixed(2) }}
            </span>
          </label>
          <input
            id="glow-intensity"
            type="range"
            class="energy-viz-editor__slider"
            min="0.0"
            max="2.0"
            step="0.1"
            :value="props.settings.visualization.glowIntensity"
            @input="
              updateVisualization({
                glowIntensity: parseFloat(($event.target as HTMLInputElement).value),
              })
            "
          />
          <div class="energy-viz-editor__slider-labels">
            <span>No glow</span>
            <span>Intense</span>
          </div>
          <p class="energy-viz-editor__description">
            Controls the bloom/glow effect around high-energy areas.
          </p>
        </div>
      </div>
    </section>

    <!-- Animation Section -->
    <section class="energy-viz-editor__section">
      <button
        type="button"
        :class="`energy-viz-editor__section-header ${expandedSections.has('animation') ? 'energy-viz-editor__section-header--expanded' : ''}`"
        :aria-expanded="expandedSections.has('animation')"
        @click="toggleSectionExpansion('animation')"
      >
        <span>Animation</span>
        <span class="energy-viz-editor__chevron">
          {{ expandedSections.has('animation') ? '\u25BC' : '\u25B6' }}
        </span>
      </button>

      <div v-if="expandedSections.has('animation')" class="energy-viz-editor__section-content">
        <div class="energy-viz-editor__section-actions">
          <button
            type="button"
            class="energy-viz-editor__reset-btn"
            title="Reset animation settings to defaults"
            @click="handleResetAnimation"
          >
            Reset
          </button>
        </div>

        <!-- Animate Checkbox -->
        <div class="energy-viz-editor__field">
          <label class="energy-viz-editor__checkbox-label">
            <input
              type="checkbox"
              class="energy-viz-editor__checkbox"
              :checked="props.settings.animation.animate"
              @change="updateAnimation({ animate: ($event.target as HTMLInputElement).checked })"
            />
            <span>Enable Animation</span>
          </label>
          <p class="energy-viz-editor__description">Enable energy pulsation animation over time.</p>
        </div>

        <!-- Animation Speed Slider -->
        <div
          :class="`energy-viz-editor__field ${!props.settings.animation.animate ? 'energy-viz-editor__field--disabled' : ''}`"
        >
          <label for="animation-speed" class="energy-viz-editor__label">
            Animation Speed
            <span class="energy-viz-editor__value">
              {{ props.settings.animation.animationSpeed.toFixed(1) }}x
            </span>
          </label>
          <input
            id="animation-speed"
            type="range"
            class="energy-viz-editor__slider"
            min="0.1"
            max="5.0"
            step="0.1"
            :value="props.settings.animation.animationSpeed"
            :disabled="!props.settings.animation.animate"
            @input="
              updateAnimation({
                animationSpeed: parseFloat(($event.target as HTMLInputElement).value),
              })
            "
          />
          <div class="energy-viz-editor__slider-labels">
            <span>Slow</span>
            <span>Fast</span>
          </div>
          <p class="energy-viz-editor__description">
            Speed multiplier for the pulsation animation.
          </p>
        </div>

        <!-- Rotate Checkbox -->
        <div class="energy-viz-editor__field">
          <label class="energy-viz-editor__checkbox-label">
            <input
              type="checkbox"
              class="energy-viz-editor__checkbox"
              :checked="props.settings.animation.rotate"
              @change="updateAnimation({ rotate: ($event.target as HTMLInputElement).checked })"
            />
            <span>Enable Rotation</span>
          </label>
          <p class="energy-viz-editor__description">
            Rotate the cube continuously during animation.
          </p>
        </div>

        <!-- Rotation Speed Slider -->
        <div
          :class="`energy-viz-editor__field ${!props.settings.animation.rotate ? 'energy-viz-editor__field--disabled' : ''}`"
        >
          <label for="rotation-speed" class="energy-viz-editor__label">
            Rotation Speed
            <span class="energy-viz-editor__value">
              {{ props.settings.animation.rotationSpeed.toFixed(2) }} rad/s
            </span>
          </label>
          <input
            id="rotation-speed"
            type="range"
            class="energy-viz-editor__slider"
            min="0.0"
            max="2.0"
            step="0.05"
            :value="props.settings.animation.rotationSpeed"
            :disabled="!props.settings.animation.rotate"
            @input="
              updateAnimation({
                rotationSpeed: parseFloat(($event.target as HTMLInputElement).value),
              })
            "
          />
          <div class="energy-viz-editor__slider-labels">
            <span>Stop</span>
            <span>Fast</span>
          </div>
          <p class="energy-viz-editor__description">Rotation speed in radians per second.</p>
        </div>
      </div>
    </section>
  </div>
</template>
