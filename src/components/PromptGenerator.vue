<!--
  PromptGenerator Component
  Vue.js 3.0 SFC for generating cube configurations from text descriptions

  Migrated from React (PromptGenerator.tsx) to Vue.js SFC as part of Phase 10

  TASK 40: Added component metadata for Developer Mode support (Phase 6)

  Provides a user-friendly interface for:
  - Text input for custom prompts
  - Quick template selection for common materials
  - Random generation fallback
  - Real-time generation status feedback
  - Developer Mode metadata for self-documentation
-->
<script lang="ts">
import type { ComponentMeta } from '../types/component-meta'
import { registerComponentMeta } from '../types/component-meta'

/**
 * Component metadata for Developer Mode
 */
export const PROMPT_GENERATOR_META: ComponentMeta = {
  id: 'prompt-generator',
  name: 'PromptGenerator',
  version: '1.2.0',
  summary: 'AI-powered text-to-cube generation interface using TinyLLM.',
  description:
    'PromptGenerator provides an AI-powered interface for generating cube configurations from text descriptions. ' +
    'It uses TinyLLM (a lightweight language model) to interpret prompts and create corresponding cube parameters. ' +
    'The component supports multiple generation modes: single prompt, batch processing, group generation, ' +
    'composite descriptions, and contextual generation based on existing cubes. Features include template ' +
    'selection, random generation, theme application, and user feedback collection for model improvement.',
  phase: 5,
  taskId: 'TASK 32',
  filePath: 'components/PromptGenerator.tsx',
  history: [
    {
      version: '1.0.0',
      date: '2026-01-28T12:00:00Z',
      description: 'Initial implementation with template-based generation',
      taskId: 'TASK 1',
      type: 'created',
    },
    {
      version: '1.1.0',
      date: '2026-01-29T16:00:00Z',
      description: 'Added advanced modes: batch, group, composite, contextual generation',
      taskId: 'TASK 32',
      type: 'updated',
    },
    {
      version: '1.2.0',
      date: '2026-01-29T21:00:00Z',
      description: 'Added Developer Mode metadata support for self-documentation',
      taskId: 'TASK 40',
      type: 'updated',
    },
  ],
  features: [
    {
      id: 'prompt-generation',
      name: 'Text Prompt Generation',
      description: 'Generate cubes from free-form text descriptions',
      enabled: true,
      taskId: 'TASK 1',
    },
    {
      id: 'template-selection',
      name: 'Template Selection',
      description: 'Quick generation from predefined material templates',
      enabled: true,
      taskId: 'TASK 1',
    },
    {
      id: 'random-generation',
      name: 'Random Generation',
      description: 'Generate random cube configurations',
      enabled: true,
      taskId: 'TASK 1',
    },
    {
      id: 'batch-mode',
      name: 'Batch Generation',
      description: 'Generate multiple cubes from multiple prompts at once',
      enabled: true,
      taskId: 'TASK 32',
    },
    {
      id: 'group-mode',
      name: 'Group Generation',
      description: 'Generate cohesive groups of related cubes',
      enabled: true,
      taskId: 'TASK 32',
    },
    {
      id: 'contextual-mode',
      name: 'Contextual Generation',
      description: 'Generate cubes based on existing cube context',
      enabled: true,
      taskId: 'TASK 32',
    },
    {
      id: 'theme-application',
      name: 'Theme Application',
      description: 'Apply consistent themes across generation',
      enabled: true,
      taskId: 'TASK 32',
    },
    {
      id: 'feedback-collection',
      name: 'Feedback Collection',
      description: 'Collect user feedback for model improvement',
      enabled: true,
      taskId: 'TASK 32',
    },
  ],
  dependencies: [
    {
      name: 'tinyLLM',
      type: 'lib',
      path: 'lib/tinyLLM.ts',
      purpose: 'AI-powered text-to-cube generation',
    },
  ],
  relatedFiles: [
    {
      path: 'components/PromptGenerator.test.tsx',
      type: 'test',
      description: 'Unit tests for PromptGenerator',
    },
    { path: 'lib/tinyLLM.ts', type: 'util', description: 'TinyLLM model and generation logic' },
    { path: 'lib/tinyLLM.test.ts', type: 'test', description: 'TinyLLM unit tests' },
  ],
  props: [
    {
      name: 'onCubeGenerated',
      type: '(cube: SpectralCube) => void',
      required: false,
      description: 'Callback when single cube is generated',
    },
    {
      name: 'onCubesGenerated',
      type: '(cubes: SpectralCube[]) => void',
      required: false,
      description: 'Callback for batch/group generation',
    },
    {
      name: 'contextCubes',
      type: 'SpectralCube[]',
      required: false,
      description: 'Existing cubes for contextual mode',
    },
    {
      name: 'enableAdvanced',
      type: 'boolean',
      required: false,
      defaultValue: 'false',
      description: 'Enable advanced generation modes',
    },
  ],
  tips: [
    'Try descriptive prompts like "dark weathered stone with moss" for best results',
    'Use templates for quick generation of common materials',
    'Enable Advanced mode for batch, group, and contextual generation',
    'The AI supports both English and Russian prompts',
  ],
  knownIssues: [
    'TinyLLM is a simplified model; complex prompts may fall back to template matching',
  ],
  tags: ['ai', 'generation', 'tinyLLM', 'prompts', 'templates', 'phase-5'],
  status: 'stable',
  lastUpdated: '2026-01-29T21:00:00Z',
}

// Register metadata in the global registry
registerComponentMeta(PROMPT_GENERATOR_META)
</script>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SpectralCube, CompositeDescription, BatchGenerationRequest } from '../types/cube'
import {
  generateFromTemplate,
  generateRandom,
  getAvailableTemplates,
  getAvailableThemes,
  getAvailableGroupTypes,
  isReady,
  generateFromComposite,
  generateBatch,
  generateGroup,
  generateWithFineTuning,
  generateContextual,
  extractStyle,
  recordFeedback,
  type GenerationResult,
} from '../lib/tinyLLM'
// TODO: ComponentInfo is still a TSX component.
// Once TASK 66 migrates ComponentInfo to Vue, import and use it for DevMode wrapping.
// import ComponentInfo from './ComponentInfo.vue'
import { useIsDevModeEnabled } from '../lib/devmode'

/** Generation status states */
type GenerationStatus = 'idle' | 'generating' | 'success' | 'error'

/** Generation modes */
type GenerationMode = 'single' | 'batch' | 'group' | 'composite' | 'contextual'

/** Preset template categories for organized display */
const TEMPLATE_CATEGORIES: Record<string, string[]> = {
  Natural: ['stone', 'rock', 'grass', 'moss', 'dirt', 'sand'],
  Wood: ['wood', 'oak', 'birch', 'bark'],
  Stone: ['granite', 'marble', 'cobblestone', 'brick', 'concrete'],
  Metal: ['metal', 'iron', 'steel', 'gold', 'copper', 'rust'],
  Crystal: ['crystal', 'glass', 'ice', 'gem'],
  Fantasy: ['magic', 'lava', 'water'],
}

/** Example prompts for user guidance */
const EXAMPLE_PROMPTS = [
  'dark weathered stone with moss',
  'polished gold with scratches',
  'ancient rusted iron',
  'bright crystal glowing purple',
  'smooth wet marble',
  'каменная кладка с мхом',
  'ржавый металл',
  'магический кристалл',
]

/**
 * Props for PromptGenerator component
 */
interface PromptGeneratorProps {
  /** Existing cubes for contextual generation */
  contextCubes?: SpectralCube[]
  /** Whether to enable advanced features (batch, group, fine-tuning) */
  enableAdvanced?: boolean
  /** Custom class name */
  className?: string
}

const props = withDefaults(defineProps<PromptGeneratorProps>(), {
  contextCubes: undefined,
  enableAdvanced: false,
  className: '',
})

const emit = defineEmits<{
  cubeGenerated: [cube: SpectralCube]
  cubesGenerated: [cubes: SpectralCube[]]
}>()

// Input state
const prompt = ref('')
const status = ref<GenerationStatus>('idle')
const result = ref<GenerationResult | null>(null)
const error = ref<string | null>(null)
const showTemplates = ref(false)
const selectedCategory = ref<string | null>(null)
const llmReady = isReady()

// Advanced mode state
const mode = ref<GenerationMode>('single')
const selectedTheme = ref<string>('')
const selectedGroupType = ref<string>('')
const batchPrompts = ref<string>('')
const showAdvanced = ref(false)
const lastGeneratedCube = ref<SpectralCube | null>(null)
const feedbackRating = ref<number>(0)
const useContextCubes = ref<boolean>(true)
const showContextInfo = ref<boolean>(false)

// Check if DevMode is enabled
// TODO: Use for ComponentInfo wrapper once migrated to Vue (TASK 66)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _isDevModeEnabled = useIsDevModeEnabled()

// Computed
const availableTemplates = getAvailableTemplates()
const availableThemes = getAvailableThemes()
const availableGroupTypes = getAvailableGroupTypes()

const displayedTemplates = computed(() => {
  if (selectedCategory.value) {
    return TEMPLATE_CATEGORIES[selectedCategory.value] ?? []
  }
  return availableTemplates.slice(0, 12)
})

const extractedStyle = computed(() => {
  if (props.contextCubes && props.contextCubes.length > 0) {
    return extractStyle(props.contextCubes)
  }
  return null
})

// Format confidence as percentage
function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`
}

// Get method display name
function getMethodName(method: string): string {
  switch (method) {
    case 'keyword':
      return 'Keyword Match'
    case 'template':
      return 'Template'
    case 'random':
      return 'Random'
    case 'hybrid':
      return 'Hybrid'
    case 'composite':
      return 'Composite'
    case 'batch':
      return 'Batch'
    case 'group':
      return 'Group'
    case 'contextual':
      return 'Contextual'
    default:
      return method
  }
}

// Handle prompt generation (supports multiple modes)
async function handleGenerate() {
  status.value = 'generating'
  error.value = null
  result.value = null

  try {
    switch (mode.value) {
      case 'single': {
        if (!prompt.value.trim()) {
          error.value = 'Please enter a description'
          status.value = 'idle'
          return
        }

        const generationResult = await generateWithFineTuning(prompt.value.trim())

        if (generationResult.success && generationResult.cube) {
          result.value = generationResult
          status.value = 'success'
          lastGeneratedCube.value = generationResult.cube
          emit('cubeGenerated', generationResult.cube)
        } else {
          error.value = 'Generation failed. Try a different description.'
          status.value = 'error'
        }
        break
      }

      case 'batch': {
        if (!batchPrompts.value.trim()) {
          error.value = 'Please enter prompts (one per line)'
          status.value = 'idle'
          return
        }

        const prompts = batchPrompts.value.split('\n').filter((p) => p.trim())
        if (prompts.length === 0) {
          error.value = 'No valid prompts found'
          status.value = 'idle'
          return
        }

        const request: BatchGenerationRequest = {
          prompts,
          style: selectedTheme.value || undefined,
          contextCubes: props.contextCubes,
          grouping: selectedTheme.value ? 'themed' : 'related',
          theme: selectedTheme.value || undefined,
        }

        const results = await generateBatch(request)
        const successfulCubes = results.filter((r) => r.success && r.cube).map((r) => r.cube!)

        if (successfulCubes.length > 0) {
          result.value = results[0]
          status.value = 'success'
          emit('cubesGenerated', successfulCubes)
          if (successfulCubes[0]) {
            lastGeneratedCube.value = successfulCubes[0]
            emit('cubeGenerated', successfulCubes[0])
          }
        } else {
          error.value = 'Batch generation failed. Try different prompts.'
          status.value = 'error'
        }
        break
      }

      case 'group': {
        if (!prompt.value.trim() || !selectedGroupType.value) {
          error.value = 'Please enter a description and select a group type'
          status.value = 'idle'
          return
        }

        const groupResult = await generateGroup(
          selectedGroupType.value as 'wall' | 'floor' | 'column' | 'structure' | 'terrain',
          prompt.value.trim()
        )

        if (groupResult.success && groupResult.cubes.length > 0) {
          result.value = {
            success: true,
            cube: groupResult.cubes[0],
            method: 'hybrid',
            confidence: groupResult.confidence,
            warnings: groupResult.warnings,
          }
          status.value = 'success'
          emit('cubesGenerated', groupResult.cubes)
          if (groupResult.cubes[0]) {
            lastGeneratedCube.value = groupResult.cubes[0]
            emit('cubeGenerated', groupResult.cubes[0])
          }
        } else {
          error.value = 'Group generation failed. Try a different description.'
          status.value = 'error'
        }
        break
      }

      case 'composite': {
        if (!prompt.value.trim()) {
          error.value = 'Please enter a primary description'
          status.value = 'idle'
          return
        }

        const description: CompositeDescription = {
          primary: prompt.value.trim(),
          theme: selectedTheme.value || undefined,
          variations: 3,
        }

        const compositeResult = await generateFromComposite(description)

        if (compositeResult.success && compositeResult.cubes.length > 0) {
          result.value = {
            success: true,
            cube: compositeResult.cubes[0],
            method: 'hybrid',
            confidence: compositeResult.confidence,
            warnings: compositeResult.warnings,
          }
          status.value = 'success'
          emit('cubesGenerated', compositeResult.cubes)
          if (compositeResult.cubes[0]) {
            lastGeneratedCube.value = compositeResult.cubes[0]
            emit('cubeGenerated', compositeResult.cubes[0])
          }
        } else {
          error.value = 'Composite generation failed. Try a different description.'
          status.value = 'error'
        }
        break
      }

      case 'contextual': {
        if (!prompt.value.trim()) {
          error.value = 'Please enter a description'
          status.value = 'idle'
          return
        }

        if (!props.contextCubes || props.contextCubes.length === 0) {
          error.value = 'No context cubes available. Add cubes to the grid first.'
          status.value = 'error'
          return
        }

        const context = {
          existingCubes: new Map(props.contextCubes.map((c, i) => [`ctx_${i}`, c])),
          theme: selectedTheme.value || undefined,
          extractedStyle: extractStyle(props.contextCubes),
        }

        const contextualResult = await generateContextual(prompt.value.trim(), context)

        if (contextualResult.success && contextualResult.cube) {
          result.value = {
            ...contextualResult,
            warnings: [
              ...contextualResult.warnings,
              `Generated with context from ${props.contextCubes.length} existing cube(s)`,
            ],
          }
          status.value = 'success'
          lastGeneratedCube.value = contextualResult.cube
          emit('cubeGenerated', contextualResult.cube)
        } else {
          error.value = 'Contextual generation failed. Try a different description.'
          status.value = 'error'
        }
        break
      }
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error occurred'
    status.value = 'error'
  }
}

// Handle template selection
async function handleTemplateSelect(templateName: string) {
  status.value = 'generating'
  error.value = null
  result.value = null
  prompt.value = templateName

  try {
    const generationResult = await generateFromTemplate(templateName)

    if (generationResult.success && generationResult.cube) {
      result.value = generationResult
      status.value = 'success'
      emit('cubeGenerated', generationResult.cube)
    } else {
      error.value = generationResult.warnings.join(', ') || 'Template not found'
      status.value = 'error'
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error occurred'
    status.value = 'error'
  }

  showTemplates.value = false
}

// Handle random generation
async function handleRandom() {
  status.value = 'generating'
  error.value = null
  result.value = null
  prompt.value = ''

  try {
    const generationResult = await generateRandom()

    if (generationResult.success && generationResult.cube) {
      result.value = generationResult
      status.value = 'success'
      emit('cubeGenerated', generationResult.cube)
    } else {
      error.value = 'Random generation failed'
      status.value = 'error'
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error occurred'
    status.value = 'error'
  }
}

// Handle example prompt click
function handleExampleClick(example: string) {
  prompt.value = example
  error.value = null
  result.value = null
  status.value = 'idle'
}

// Handle Enter key press
function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleGenerate()
  }
}

// Handle feedback submission for fine-tuning
function handleFeedback() {
  if (lastGeneratedCube.value && prompt.value && feedbackRating.value > 0) {
    recordFeedback(prompt.value, lastGeneratedCube.value, feedbackRating.value / 5) // Convert 1-5 to 0-1
    feedbackRating.value = 0
  }
}

// Helper to get cube background color style
function getCubeSwatchColor(cube: SpectralCube): string {
  return `rgb(${Math.round(cube.base.color[0] * 255)}, ${Math.round(cube.base.color[1] * 255)}, ${Math.round(cube.base.color[2] * 255)})`
}
</script>

<template>
  <!-- TODO: Wrap with ComponentInfo once migrated to Vue (TASK 66) -->
  <div :class="['prompt-generator', props.className]">
    <div class="prompt-generator__header">
      <h2 class="prompt-generator__title">Generate by Description</h2>
      <div class="prompt-generator__status-indicator">
        <span
          :class="[
            'prompt-generator__status-dot',
            llmReady
              ? 'prompt-generator__status-dot--ready'
              : 'prompt-generator__status-dot--loading',
          ]"
        />
        <span class="prompt-generator__status-text">{{ llmReady ? 'Ready' : 'Loading...' }}</span>
      </div>
    </div>

    <!-- Prompt input -->
    <div class="prompt-generator__input-section">
      <label for="prompt-input" class="prompt-generator__label"> Describe your cube </label>
      <div class="prompt-generator__input-wrapper">
        <input
          id="prompt-input"
          v-model="prompt"
          type="text"
          class="prompt-generator__input"
          placeholder="e.g., dark stone with moss..."
          :disabled="status === 'generating'"
          @keydown="handleKeyDown"
        />
        <button
          type="button"
          class="prompt-generator__generate-btn"
          :disabled="status === 'generating' || !prompt.trim()"
          aria-label="Generate cube"
          @click="handleGenerate"
        >
          <span v-if="status === 'generating'" class="prompt-generator__spinner" />
          <span v-else class="prompt-generator__generate-icon">&#x2728;</span>
        </button>
      </div>
    </div>

    <!-- Example prompts -->
    <div class="prompt-generator__examples">
      <span class="prompt-generator__examples-label">Try:</span>
      <div class="prompt-generator__examples-list">
        <button
          v-for="example in EXAMPLE_PROMPTS.slice(0, 4)"
          :key="example"
          type="button"
          class="prompt-generator__example-btn"
          @click="handleExampleClick(example)"
        >
          {{ example.length > 25 ? example.slice(0, 25) + '...' : example }}
        </button>
      </div>
    </div>

    <!-- Action buttons -->
    <div class="prompt-generator__actions">
      <button
        type="button"
        class="prompt-generator__action-btn prompt-generator__action-btn--template"
        @click="showTemplates = !showTemplates"
      >
        {{ showTemplates ? '\u00d7 Close' : '\ud83d\udccb Templates' }}
      </button>
      <button
        type="button"
        class="prompt-generator__action-btn prompt-generator__action-btn--random"
        :disabled="status === 'generating'"
        @click="handleRandom"
      >
        &#x1f3b2; Random
      </button>
      <button
        v-if="props.enableAdvanced"
        type="button"
        class="prompt-generator__action-btn prompt-generator__action-btn--advanced"
        @click="showAdvanced = !showAdvanced"
      >
        {{ showAdvanced ? '\u00d7 Close' : '\u2699\ufe0f Advanced' }}
      </button>
    </div>

    <!-- Advanced mode panel -->
    <div v-if="props.enableAdvanced && showAdvanced" class="prompt-generator__advanced">
      <div class="prompt-generator__advanced-section">
        <label class="prompt-generator__label">Generation Mode</label>
        <div class="prompt-generator__mode-buttons">
          <button
            type="button"
            :class="[
              'prompt-generator__mode-btn',
              mode === 'single' ? 'prompt-generator__mode-btn--active' : '',
            ]"
            @click="mode = 'single'"
          >
            Single
          </button>
          <button
            type="button"
            :class="[
              'prompt-generator__mode-btn',
              mode === 'batch' ? 'prompt-generator__mode-btn--active' : '',
            ]"
            @click="mode = 'batch'"
          >
            Batch
          </button>
          <button
            type="button"
            :class="[
              'prompt-generator__mode-btn',
              mode === 'group' ? 'prompt-generator__mode-btn--active' : '',
            ]"
            @click="mode = 'group'"
          >
            Group
          </button>
          <button
            type="button"
            :class="[
              'prompt-generator__mode-btn',
              mode === 'composite' ? 'prompt-generator__mode-btn--active' : '',
            ]"
            @click="mode = 'composite'"
          >
            Composite
          </button>
          <button
            type="button"
            :class="[
              'prompt-generator__mode-btn',
              mode === 'contextual' ? 'prompt-generator__mode-btn--active' : '',
            ]"
            :disabled="!props.contextCubes || props.contextCubes.length === 0"
            :title="
              !props.contextCubes || props.contextCubes.length === 0
                ? 'Add cubes to use contextual mode'
                : 'Generate based on existing cubes'
            "
            @click="mode = 'contextual'"
          >
            Contextual
          </button>
        </div>
      </div>

      <!-- Theme selector -->
      <div class="prompt-generator__advanced-section">
        <label for="theme-select" class="prompt-generator__label"> Theme (optional) </label>
        <select id="theme-select" v-model="selectedTheme" class="prompt-generator__select">
          <option value="">No theme</option>
          <option v-for="theme in availableThemes" :key="theme" :value="theme">
            {{ theme.charAt(0).toUpperCase() + theme.slice(1) }}
          </option>
        </select>
      </div>

      <!-- Group type selector (only for group mode) -->
      <div v-if="mode === 'group'" class="prompt-generator__advanced-section">
        <label for="group-type-select" class="prompt-generator__label"> Group Type </label>
        <select id="group-type-select" v-model="selectedGroupType" class="prompt-generator__select">
          <option value="">Select type...</option>
          <option v-for="type in availableGroupTypes" :key="type" :value="type">
            {{ type.charAt(0).toUpperCase() + type.slice(1) }}
          </option>
        </select>
      </div>

      <!-- Batch prompts textarea (only for batch mode) -->
      <div v-if="mode === 'batch'" class="prompt-generator__advanced-section">
        <label for="batch-prompts" class="prompt-generator__label">
          Batch Prompts (one per line)
        </label>
        <textarea
          id="batch-prompts"
          v-model="batchPrompts"
          class="prompt-generator__textarea"
          placeholder="stone&#10;brick&#10;wood&#10;..."
          :rows="4"
        />
      </div>

      <!-- Contextual mode info (ISSUE 32: AI integration) -->
      <div
        v-if="mode === 'contextual' && props.contextCubes && props.contextCubes.length > 0"
        class="prompt-generator__advanced-section"
      >
        <div class="prompt-generator__context-header">
          <label class="prompt-generator__label">Context Cubes</label>
          <button
            type="button"
            class="prompt-generator__context-toggle"
            :aria-expanded="showContextInfo"
            @click="showContextInfo = !showContextInfo"
          >
            {{ showContextInfo ? 'Hide' : 'Show' }} ({{ props.contextCubes.length }})
          </button>
        </div>
        <div v-if="showContextInfo" class="prompt-generator__context-info">
          <p class="prompt-generator__context-description">
            New cube will be generated based on the style of these existing cubes:
          </p>
          <ul class="prompt-generator__context-list">
            <li
              v-for="(cube, idx) in props.contextCubes.slice(0, 5)"
              :key="cube.id || idx"
              class="prompt-generator__context-item"
            >
              <span
                class="prompt-generator__context-swatch"
                :style="{ backgroundColor: getCubeSwatchColor(cube) }"
              />
              <span class="prompt-generator__context-name">
                {{ cube.meta?.name || cube.id || `Cube ${idx + 1}` }}
              </span>
              <span class="prompt-generator__context-material">
                {{ cube.physics?.material || 'Unknown' }}
              </span>
            </li>
            <li
              v-if="props.contextCubes.length > 5"
              class="prompt-generator__context-item prompt-generator__context-item--more"
            >
              +{{ props.contextCubes.length - 5 }} more...
            </li>
          </ul>
          <div v-if="extractedStyle" class="prompt-generator__extracted-style">
            <p><strong>Extracted Style:</strong></p>
            <p>Dominant material: {{ extractedStyle.dominantMaterial }}</p>
            <p>Dominant noise: {{ extractedStyle.dominantNoiseType }}</p>
            <p v-if="extractedStyle.commonTags.length > 0">
              Common tags: {{ extractedStyle.commonTags.slice(0, 5).join(', ') }}
            </p>
          </div>
        </div>
        <label class="prompt-generator__checkbox-label">
          <input v-model="useContextCubes" type="checkbox" />
          Use context for style blending
        </label>
      </div>

      <!-- Feedback section for fine-tuning -->
      <div v-if="lastGeneratedCube" class="prompt-generator__advanced-section">
        <label class="prompt-generator__label">
          Rate this result (improves future generations)
        </label>
        <div class="prompt-generator__feedback">
          <button
            v-for="rating in [1, 2, 3, 4, 5]"
            :key="rating"
            type="button"
            :class="[
              'prompt-generator__feedback-btn',
              feedbackRating >= rating ? 'prompt-generator__feedback-btn--active' : '',
            ]"
            :aria-label="`Rate ${rating} stars`"
            @click="feedbackRating = rating"
          >
            {{ feedbackRating >= rating ? '\u2605' : '\u2606' }}
          </button>
          <button
            type="button"
            class="prompt-generator__feedback-submit"
            :disabled="feedbackRating === 0"
            @click="handleFeedback"
          >
            Submit
          </button>
        </div>
      </div>
    </div>

    <!-- Template selector -->
    <div v-if="showTemplates" class="prompt-generator__templates">
      <div class="prompt-generator__template-categories">
        <button
          v-for="category in Object.keys(TEMPLATE_CATEGORIES)"
          :key="category"
          type="button"
          :class="[
            'prompt-generator__category-btn',
            selectedCategory === category ? 'prompt-generator__category-btn--active' : '',
          ]"
          @click="selectedCategory = selectedCategory === category ? null : category"
        >
          {{ category }}
        </button>
      </div>

      <div class="prompt-generator__template-list">
        <button
          v-for="template in displayedTemplates"
          :key="template"
          type="button"
          class="prompt-generator__template-btn"
          @click="handleTemplateSelect(template)"
        >
          {{ template.charAt(0).toUpperCase() + template.slice(1) }}
        </button>
      </div>
    </div>

    <!-- Error message -->
    <div
      v-if="error"
      class="prompt-generator__message prompt-generator__message--error"
      role="alert"
    >
      {{ error }}
    </div>

    <!-- Success result -->
    <div v-if="status === 'success' && result" class="prompt-generator__result">
      <div class="prompt-generator__result-header">
        <span class="prompt-generator__result-icon">&#x2713;</span>
        <span class="prompt-generator__result-title">Generated!</span>
      </div>
      <div class="prompt-generator__result-details">
        <div class="prompt-generator__result-row">
          <span class="prompt-generator__result-label">Method:</span>
          <span class="prompt-generator__result-value">{{ getMethodName(result.method) }}</span>
        </div>
        <div class="prompt-generator__result-row">
          <span class="prompt-generator__result-label">Confidence:</span>
          <span class="prompt-generator__result-value">
            <span
              :class="[
                'prompt-generator__confidence-bar',
                result.confidence >= 0.7
                  ? 'prompt-generator__confidence-bar--high'
                  : result.confidence >= 0.4
                    ? 'prompt-generator__confidence-bar--medium'
                    : 'prompt-generator__confidence-bar--low',
              ]"
              :style="{ width: `${result.confidence * 100}%` }"
            />
            {{ formatConfidence(result.confidence) }}
          </span>
        </div>
        <div v-if="result.warnings.length > 0" class="prompt-generator__result-warnings">
          <span v-for="(warning, i) in result.warnings" :key="i" class="prompt-generator__warning">
            &#x26a0;&#xfe0f; {{ warning }}
          </span>
        </div>
      </div>
    </div>

    <!-- Loading overlay -->
    <div v-if="status === 'generating'" class="prompt-generator__loading" aria-live="polite">
      <div class="prompt-generator__loading-spinner" />
      <span class="prompt-generator__loading-text">Generating...</span>
    </div>
  </div>
</template>
