/**
 * PromptGenerator component for generating cube configurations from text descriptions
 *
 * Provides a user-friendly interface for:
 * - Text input for custom prompts
 * - Quick template selection for common materials
 * - Random generation fallback
 * - Real-time generation status feedback
 */

import { useState, useCallback } from 'react'
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

/**
 * Props for PromptGenerator component
 */
export interface PromptGeneratorProps {
  /** Callback when a cube is generated */
  onCubeGenerated?: (cube: SpectralCube) => void
  /** Callback when multiple cubes are generated (batch/group mode) */
  onCubesGenerated?: (cubes: SpectralCube[]) => void
  /** Existing cubes for contextual generation */
  contextCubes?: SpectralCube[]
  /** Whether to enable advanced features (batch, group, fine-tuning) */
  enableAdvanced?: boolean
  /** Custom class name */
  className?: string
}

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
 * PromptGenerator component
 * Provides UI for generating cube configurations from text prompts
 */
export function PromptGenerator({
  onCubeGenerated,
  onCubesGenerated,
  contextCubes,
  enableAdvanced = false,
  className = '',
}: PromptGeneratorProps) {
  // Input state
  const [prompt, setPrompt] = useState('')
  const [status, setStatus] = useState<GenerationStatus>('idle')
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  // Initialize llmReady with the actual value immediately
  const [llmReady] = useState(() => isReady())

  // Advanced mode state
  const [mode, setMode] = useState<GenerationMode>('single')
  const [selectedTheme, setSelectedTheme] = useState<string>('')
  const [selectedGroupType, setSelectedGroupType] = useState<string>('')
  const [batchPrompts, setBatchPrompts] = useState<string>('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [lastGeneratedCube, setLastGeneratedCube] = useState<SpectralCube | null>(null)
  const [feedbackRating, setFeedbackRating] = useState<number>(0)
  const [useContextCubes, setUseContextCubes] = useState<boolean>(true)
  const [showContextInfo, setShowContextInfo] = useState<boolean>(false)

  // Handle prompt generation (supports multiple modes)
  const handleGenerate = useCallback(async () => {
    setStatus('generating')
    setError(null)
    setResult(null)

    try {
      switch (mode) {
        case 'single': {
          if (!prompt.trim()) {
            setError('Please enter a description')
            setStatus('idle')
            return
          }

          // Use fine-tuning if available, otherwise standard generation
          const generationResult = await generateWithFineTuning(prompt.trim())

          if (generationResult.success && generationResult.cube) {
            setResult(generationResult)
            setStatus('success')
            setLastGeneratedCube(generationResult.cube)
            onCubeGenerated?.(generationResult.cube)
          } else {
            setError('Generation failed. Try a different description.')
            setStatus('error')
          }
          break
        }

        case 'batch': {
          if (!batchPrompts.trim()) {
            setError('Please enter prompts (one per line)')
            setStatus('idle')
            return
          }

          const prompts = batchPrompts.split('\n').filter((p) => p.trim())
          if (prompts.length === 0) {
            setError('No valid prompts found')
            setStatus('idle')
            return
          }

          const request: BatchGenerationRequest = {
            prompts,
            style: selectedTheme || undefined,
            contextCubes: contextCubes,
            grouping: selectedTheme ? 'themed' : 'related',
            theme: selectedTheme || undefined,
          }

          const results = await generateBatch(request)
          const successfulCubes = results.filter((r) => r.success && r.cube).map((r) => r.cube!)

          if (successfulCubes.length > 0) {
            setResult(results[0])
            setStatus('success')
            onCubesGenerated?.(successfulCubes)
            if (successfulCubes[0]) {
              setLastGeneratedCube(successfulCubes[0])
              onCubeGenerated?.(successfulCubes[0])
            }
          } else {
            setError('Batch generation failed. Try different prompts.')
            setStatus('error')
          }
          break
        }

        case 'group': {
          if (!prompt.trim() || !selectedGroupType) {
            setError('Please enter a description and select a group type')
            setStatus('idle')
            return
          }

          const groupResult = await generateGroup(
            selectedGroupType as 'wall' | 'floor' | 'column' | 'structure' | 'terrain',
            prompt.trim()
          )

          if (groupResult.success && groupResult.cubes.length > 0) {
            setResult({
              success: true,
              cube: groupResult.cubes[0],
              method: 'hybrid',
              confidence: groupResult.confidence,
              warnings: groupResult.warnings,
            })
            setStatus('success')
            onCubesGenerated?.(groupResult.cubes)
            if (groupResult.cubes[0]) {
              setLastGeneratedCube(groupResult.cubes[0])
              onCubeGenerated?.(groupResult.cubes[0])
            }
          } else {
            setError('Group generation failed. Try a different description.')
            setStatus('error')
          }
          break
        }

        case 'composite': {
          if (!prompt.trim()) {
            setError('Please enter a primary description')
            setStatus('idle')
            return
          }

          const description: CompositeDescription = {
            primary: prompt.trim(),
            theme: selectedTheme || undefined,
            variations: 3,
          }

          const compositeResult = await generateFromComposite(description)

          if (compositeResult.success && compositeResult.cubes.length > 0) {
            setResult({
              success: true,
              cube: compositeResult.cubes[0],
              method: 'hybrid',
              confidence: compositeResult.confidence,
              warnings: compositeResult.warnings,
            })
            setStatus('success')
            onCubesGenerated?.(compositeResult.cubes)
            if (compositeResult.cubes[0]) {
              setLastGeneratedCube(compositeResult.cubes[0])
              onCubeGenerated?.(compositeResult.cubes[0])
            }
          } else {
            setError('Composite generation failed. Try a different description.')
            setStatus('error')
          }
          break
        }

        case 'contextual': {
          if (!prompt.trim()) {
            setError('Please enter a description')
            setStatus('idle')
            return
          }

          if (!contextCubes || contextCubes.length === 0) {
            setError('No context cubes available. Add cubes to the grid first.')
            setStatus('error')
            return
          }

          const context = {
            existingCubes: new Map(contextCubes.map((c, i) => [`ctx_${i}`, c])),
            theme: selectedTheme || undefined,
            extractedStyle: extractStyle(contextCubes),
          }

          const contextualResult = await generateContextual(prompt.trim(), context)

          if (contextualResult.success && contextualResult.cube) {
            setResult({
              ...contextualResult,
              warnings: [
                ...contextualResult.warnings,
                `Generated with context from ${contextCubes.length} existing cube(s)`,
              ],
            })
            setStatus('success')
            setLastGeneratedCube(contextualResult.cube)
            onCubeGenerated?.(contextualResult.cube)
          } else {
            setError('Contextual generation failed. Try a different description.')
            setStatus('error')
          }
          break
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setStatus('error')
    }
  }, [
    prompt,
    mode,
    batchPrompts,
    selectedTheme,
    selectedGroupType,
    contextCubes,
    onCubeGenerated,
    onCubesGenerated,
  ])

  // Handle template selection
  const handleTemplateSelect = useCallback(
    async (templateName: string) => {
      setStatus('generating')
      setError(null)
      setResult(null)
      setPrompt(templateName)

      try {
        const generationResult = await generateFromTemplate(templateName)

        if (generationResult.success && generationResult.cube) {
          setResult(generationResult)
          setStatus('success')
          onCubeGenerated?.(generationResult.cube)
        } else {
          setError(generationResult.warnings.join(', ') || 'Template not found')
          setStatus('error')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
        setStatus('error')
      }

      setShowTemplates(false)
    },
    [onCubeGenerated]
  )

  // Handle random generation
  const handleRandom = useCallback(async () => {
    setStatus('generating')
    setError(null)
    setResult(null)
    setPrompt('')

    try {
      const generationResult = await generateRandom()

      if (generationResult.success && generationResult.cube) {
        setResult(generationResult)
        setStatus('success')
        onCubeGenerated?.(generationResult.cube)
      } else {
        setError('Random generation failed')
        setStatus('error')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setStatus('error')
    }
  }, [onCubeGenerated])

  // Handle example prompt click
  const handleExampleClick = useCallback((example: string) => {
    setPrompt(example)
    setError(null)
    setResult(null)
    setStatus('idle')
  }, [])

  // Handle Enter key press
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleGenerate()
      }
    },
    [handleGenerate]
  )

  // Format confidence as percentage
  const formatConfidence = (confidence: number): string => {
    return `${Math.round(confidence * 100)}%`
  }

  // Get method display name
  const getMethodName = (method: string): string => {
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

  // Handle feedback submission for fine-tuning
  const handleFeedback = useCallback(() => {
    if (lastGeneratedCube && prompt && feedbackRating > 0) {
      recordFeedback(prompt, lastGeneratedCube, feedbackRating / 5) // Convert 1-5 to 0-1
      setFeedbackRating(0)
    }
  }, [lastGeneratedCube, prompt, feedbackRating])

  const availableTemplates = getAvailableTemplates()
  const availableThemes = getAvailableThemes()
  const availableGroupTypes = getAvailableGroupTypes()

  return (
    <div className={`prompt-generator ${className}`}>
      <div className="prompt-generator__header">
        <h2 className="prompt-generator__title">Generate by Description</h2>
        <div className="prompt-generator__status-indicator">
          <span
            className={`prompt-generator__status-dot ${llmReady ? 'prompt-generator__status-dot--ready' : 'prompt-generator__status-dot--loading'}`}
          />
          <span className="prompt-generator__status-text">{llmReady ? 'Ready' : 'Loading...'}</span>
        </div>
      </div>

      {/* Prompt input */}
      <div className="prompt-generator__input-section">
        <label htmlFor="prompt-input" className="prompt-generator__label">
          Describe your cube
        </label>
        <div className="prompt-generator__input-wrapper">
          <input
            id="prompt-input"
            type="text"
            className="prompt-generator__input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., dark stone with moss..."
            disabled={status === 'generating'}
          />
          <button
            type="button"
            className="prompt-generator__generate-btn"
            onClick={handleGenerate}
            disabled={status === 'generating' || !prompt.trim()}
            aria-label="Generate cube"
          >
            {status === 'generating' ? (
              <span className="prompt-generator__spinner" />
            ) : (
              <span className="prompt-generator__generate-icon">✨</span>
            )}
          </button>
        </div>
      </div>

      {/* Example prompts */}
      <div className="prompt-generator__examples">
        <span className="prompt-generator__examples-label">Try:</span>
        <div className="prompt-generator__examples-list">
          {EXAMPLE_PROMPTS.slice(0, 4).map((example) => (
            <button
              key={example}
              type="button"
              className="prompt-generator__example-btn"
              onClick={() => handleExampleClick(example)}
            >
              {example.length > 25 ? example.slice(0, 25) + '...' : example}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="prompt-generator__actions">
        <button
          type="button"
          className="prompt-generator__action-btn prompt-generator__action-btn--template"
          onClick={() => setShowTemplates(!showTemplates)}
        >
          {showTemplates ? '× Close' : '📋 Templates'}
        </button>
        <button
          type="button"
          className="prompt-generator__action-btn prompt-generator__action-btn--random"
          onClick={handleRandom}
          disabled={status === 'generating'}
        >
          🎲 Random
        </button>
        {enableAdvanced && (
          <button
            type="button"
            className="prompt-generator__action-btn prompt-generator__action-btn--advanced"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? '× Close' : '⚙️ Advanced'}
          </button>
        )}
      </div>

      {/* Advanced mode panel */}
      {enableAdvanced && showAdvanced && (
        <div className="prompt-generator__advanced">
          <div className="prompt-generator__advanced-section">
            <label className="prompt-generator__label">Generation Mode</label>
            <div className="prompt-generator__mode-buttons">
              <button
                type="button"
                className={`prompt-generator__mode-btn ${mode === 'single' ? 'prompt-generator__mode-btn--active' : ''}`}
                onClick={() => setMode('single')}
              >
                Single
              </button>
              <button
                type="button"
                className={`prompt-generator__mode-btn ${mode === 'batch' ? 'prompt-generator__mode-btn--active' : ''}`}
                onClick={() => setMode('batch')}
              >
                Batch
              </button>
              <button
                type="button"
                className={`prompt-generator__mode-btn ${mode === 'group' ? 'prompt-generator__mode-btn--active' : ''}`}
                onClick={() => setMode('group')}
              >
                Group
              </button>
              <button
                type="button"
                className={`prompt-generator__mode-btn ${mode === 'composite' ? 'prompt-generator__mode-btn--active' : ''}`}
                onClick={() => setMode('composite')}
              >
                Composite
              </button>
              <button
                type="button"
                className={`prompt-generator__mode-btn ${mode === 'contextual' ? 'prompt-generator__mode-btn--active' : ''}`}
                onClick={() => setMode('contextual')}
                disabled={!contextCubes || contextCubes.length === 0}
                title={
                  !contextCubes || contextCubes.length === 0
                    ? 'Add cubes to use contextual mode'
                    : 'Generate based on existing cubes'
                }
              >
                Contextual
              </button>
            </div>
          </div>

          {/* Theme selector */}
          <div className="prompt-generator__advanced-section">
            <label htmlFor="theme-select" className="prompt-generator__label">
              Theme (optional)
            </label>
            <select
              id="theme-select"
              className="prompt-generator__select"
              value={selectedTheme}
              onChange={(e) => setSelectedTheme(e.target.value)}
            >
              <option value="">No theme</option>
              {availableThemes.map((theme) => (
                <option key={theme} value={theme}>
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Group type selector (only for group mode) */}
          {mode === 'group' && (
            <div className="prompt-generator__advanced-section">
              <label htmlFor="group-type-select" className="prompt-generator__label">
                Group Type
              </label>
              <select
                id="group-type-select"
                className="prompt-generator__select"
                value={selectedGroupType}
                onChange={(e) => setSelectedGroupType(e.target.value)}
              >
                <option value="">Select type...</option>
                {availableGroupTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Batch prompts textarea (only for batch mode) */}
          {mode === 'batch' && (
            <div className="prompt-generator__advanced-section">
              <label htmlFor="batch-prompts" className="prompt-generator__label">
                Batch Prompts (one per line)
              </label>
              <textarea
                id="batch-prompts"
                className="prompt-generator__textarea"
                value={batchPrompts}
                onChange={(e) => setBatchPrompts(e.target.value)}
                placeholder="stone&#10;brick&#10;wood&#10;..."
                rows={4}
              />
            </div>
          )}

          {/* Contextual mode info (ISSUE 32: AI integration) */}
          {mode === 'contextual' && contextCubes && contextCubes.length > 0 && (
            <div className="prompt-generator__advanced-section">
              <div className="prompt-generator__context-header">
                <label className="prompt-generator__label">Context Cubes</label>
                <button
                  type="button"
                  className="prompt-generator__context-toggle"
                  onClick={() => setShowContextInfo(!showContextInfo)}
                  aria-expanded={showContextInfo}
                >
                  {showContextInfo ? 'Hide' : 'Show'} ({contextCubes.length})
                </button>
              </div>
              {showContextInfo && (
                <div className="prompt-generator__context-info">
                  <p className="prompt-generator__context-description">
                    New cube will be generated based on the style of these existing cubes:
                  </p>
                  <ul className="prompt-generator__context-list">
                    {contextCubes.slice(0, 5).map((cube, idx) => (
                      <li key={cube.id || idx} className="prompt-generator__context-item">
                        <span
                          className="prompt-generator__context-swatch"
                          style={{
                            backgroundColor: `rgb(${Math.round(cube.base.color[0] * 255)}, ${Math.round(cube.base.color[1] * 255)}, ${Math.round(cube.base.color[2] * 255)})`,
                          }}
                        />
                        <span className="prompt-generator__context-name">
                          {cube.meta?.name || cube.id || `Cube ${idx + 1}`}
                        </span>
                        <span className="prompt-generator__context-material">
                          {cube.physics?.material || 'Unknown'}
                        </span>
                      </li>
                    ))}
                    {contextCubes.length > 5 && (
                      <li className="prompt-generator__context-item prompt-generator__context-item--more">
                        +{contextCubes.length - 5} more...
                      </li>
                    )}
                  </ul>
                  {(() => {
                    const style = extractStyle(contextCubes)
                    return (
                      <div className="prompt-generator__extracted-style">
                        <p>
                          <strong>Extracted Style:</strong>
                        </p>
                        <p>Dominant material: {style.dominantMaterial}</p>
                        <p>Dominant noise: {style.dominantNoiseType}</p>
                        {style.commonTags.length > 0 && (
                          <p>Common tags: {style.commonTags.slice(0, 5).join(', ')}</p>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )}
              <label className="prompt-generator__checkbox-label">
                <input
                  type="checkbox"
                  checked={useContextCubes}
                  onChange={(e) => setUseContextCubes(e.target.checked)}
                />
                Use context for style blending
              </label>
            </div>
          )}

          {/* Feedback section for fine-tuning */}
          {lastGeneratedCube && (
            <div className="prompt-generator__advanced-section">
              <label className="prompt-generator__label">
                Rate this result (improves future generations)
              </label>
              <div className="prompt-generator__feedback">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    className={`prompt-generator__feedback-btn ${feedbackRating >= rating ? 'prompt-generator__feedback-btn--active' : ''}`}
                    onClick={() => setFeedbackRating(rating)}
                    aria-label={`Rate ${rating} stars`}
                  >
                    {feedbackRating >= rating ? '★' : '☆'}
                  </button>
                ))}
                <button
                  type="button"
                  className="prompt-generator__feedback-submit"
                  onClick={handleFeedback}
                  disabled={feedbackRating === 0}
                >
                  Submit
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Template selector */}
      {showTemplates && (
        <div className="prompt-generator__templates">
          <div className="prompt-generator__template-categories">
            {Object.keys(TEMPLATE_CATEGORIES).map((category) => (
              <button
                key={category}
                type="button"
                className={`prompt-generator__category-btn ${selectedCategory === category ? 'prompt-generator__category-btn--active' : ''}`}
                onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="prompt-generator__template-list">
            {(selectedCategory
              ? TEMPLATE_CATEGORIES[selectedCategory]
              : availableTemplates.slice(0, 12)
            ).map((template) => (
              <button
                key={template}
                type="button"
                className="prompt-generator__template-btn"
                onClick={() => handleTemplateSelect(template)}
              >
                {template.charAt(0).toUpperCase() + template.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="prompt-generator__message prompt-generator__message--error" role="alert">
          {error}
        </div>
      )}

      {/* Success result */}
      {status === 'success' && result && (
        <div className="prompt-generator__result">
          <div className="prompt-generator__result-header">
            <span className="prompt-generator__result-icon">✓</span>
            <span className="prompt-generator__result-title">Generated!</span>
          </div>
          <div className="prompt-generator__result-details">
            <div className="prompt-generator__result-row">
              <span className="prompt-generator__result-label">Method:</span>
              <span className="prompt-generator__result-value">{getMethodName(result.method)}</span>
            </div>
            <div className="prompt-generator__result-row">
              <span className="prompt-generator__result-label">Confidence:</span>
              <span className="prompt-generator__result-value">
                <span
                  className={`prompt-generator__confidence-bar ${
                    result.confidence >= 0.7
                      ? 'prompt-generator__confidence-bar--high'
                      : result.confidence >= 0.4
                        ? 'prompt-generator__confidence-bar--medium'
                        : 'prompt-generator__confidence-bar--low'
                  }`}
                  style={{ width: `${result.confidence * 100}%` }}
                />
                {formatConfidence(result.confidence)}
              </span>
            </div>
            {result.warnings.length > 0 && (
              <div className="prompt-generator__result-warnings">
                {result.warnings.map((warning, i) => (
                  <span key={i} className="prompt-generator__warning">
                    ⚠️ {warning}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {status === 'generating' && (
        <div className="prompt-generator__loading" aria-live="polite">
          <div className="prompt-generator__loading-spinner" />
          <span className="prompt-generator__loading-text">Generating...</span>
        </div>
      )}
    </div>
  )
}

export default PromptGenerator
