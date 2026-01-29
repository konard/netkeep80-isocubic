/**
 * ComponentInfo Component
 *
 * Renders component metadata as an overlay/tooltip in Developer Mode.
 * Wraps any component and displays its documentation when DevMode is enabled.
 *
 * TASK 40: Component Info Overlay (Phase 6 - Developer Experience)
 *
 * Features:
 * - Floating panel with component metadata
 * - Hover-triggered or always-visible modes
 * - Configurable position and verbosity
 * - Component outline highlighting
 * - Expandable sections for detailed info
 */

import { useState, useRef, type ReactNode, type CSSProperties } from 'react'
import type {
  ComponentMeta,
  ComponentHistoryEntry,
  ComponentFeature,
} from '../types/component-meta'
import { useDevMode, useIsDevModeEnabled, useDevModeSettings } from '../lib/devmode'

/**
 * Props for ComponentInfo wrapper
 */
export interface ComponentInfoProps {
  /** Component metadata */
  meta: ComponentMeta
  /** Child component to wrap */
  children: ReactNode
  /** Custom styles for the wrapper */
  style?: CSSProperties
  /** Custom class name for the wrapper */
  className?: string
  /** Position for the info panel */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'auto'
  /** Whether to always show the panel (vs hover) */
  alwaysShow?: boolean
}

/**
 * Status badge color mapping
 */
const STATUS_COLORS: Record<ComponentMeta['status'], string> = {
  stable: '#22c55e',
  beta: '#3b82f6',
  experimental: '#f59e0b',
  deprecated: '#ef4444',
}

/**
 * Status badge labels
 */
const STATUS_LABELS: Record<ComponentMeta['status'], string> = {
  stable: 'Stable',
  beta: 'Beta',
  experimental: 'Experimental',
  deprecated: 'Deprecated',
}

/**
 * History entry type icons
 */
const HISTORY_ICONS: Record<ComponentHistoryEntry['type'], string> = {
  created: '+',
  updated: '~',
  fixed: '*',
  deprecated: '!',
  removed: '-',
}

/**
 * Formats a date string for display
 */
function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate)
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return isoDate
  }
}

/**
 * Styles for the component
 */
const styles: Record<string, CSSProperties> = {
  wrapper: {
    position: 'relative',
    display: 'contents',
  },
  wrapperOutline: {
    position: 'relative',
    outline: '2px dashed rgba(59, 130, 246, 0.5)',
    outlineOffset: '2px',
    borderRadius: '4px',
  },
  panel: {
    position: 'absolute',
    zIndex: 9999,
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '12px',
    minWidth: '280px',
    maxWidth: '400px',
    maxHeight: '80vh',
    overflowY: 'auto',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '12px',
    color: '#e5e7eb',
    lineHeight: '1.5',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
    paddingBottom: '8px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff',
    margin: 0,
  },
  badge: {
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
  },
  summary: {
    marginBottom: '12px',
    color: '#9ca3af',
  },
  section: {
    marginBottom: '12px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    padding: '4px 0',
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    color: '#6b7280',
    letterSpacing: '0.5px',
  },
  sectionContent: {
    marginTop: '8px',
  },
  historyItem: {
    display: 'flex',
    gap: '8px',
    marginBottom: '6px',
    fontSize: '11px',
  },
  historyIcon: {
    width: '16px',
    height: '16px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: '#3b82f6',
    fontWeight: 'bold',
    flexShrink: 0,
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
    fontSize: '11px',
  },
  featureEnabled: {
    color: '#22c55e',
  },
  featureDisabled: {
    color: '#6b7280',
  },
  dependencyItem: {
    marginBottom: '4px',
    fontSize: '11px',
  },
  dependencyType: {
    display: 'inline-block',
    padding: '1px 4px',
    borderRadius: '3px',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: '#3b82f6',
    fontSize: '9px',
    marginRight: '6px',
  },
  tip: {
    display: 'flex',
    gap: '6px',
    marginBottom: '4px',
    fontSize: '11px',
    color: '#9ca3af',
  },
  tipIcon: {
    color: '#f59e0b',
    flexShrink: 0,
  },
  meta: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
    marginTop: '12px',
    paddingTop: '8px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    fontSize: '10px',
    color: '#6b7280',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  tags: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '4px',
    marginTop: '8px',
  },
  tag: {
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: '#3b82f6',
    fontSize: '10px',
  },
  closeButton: {
    position: 'absolute' as const,
    top: '8px',
    right: '8px',
    width: '20px',
    height: '20px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#6b7280',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
  },
}

/**
 * Position styles for the panel
 */
const positionStyles: Record<string, CSSProperties> = {
  'top-left': { top: '100%', left: 0, marginTop: '8px' },
  'top-right': { top: '100%', right: 0, marginTop: '8px' },
  'bottom-left': { bottom: '100%', left: 0, marginBottom: '8px' },
  'bottom-right': { bottom: '100%', right: 0, marginBottom: '8px' },
}

/**
 * Collapsible section component
 */
function CollapsibleSection({
  title,
  children,
  defaultExpanded = true,
}: {
  title: string
  children: ReactNode
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader} onClick={() => setExpanded(!expanded)}>
        <span style={styles.sectionTitle}>{title}</span>
        <span>{expanded ? '▼' : '▶'}</span>
      </div>
      {expanded && <div style={styles.sectionContent}>{children}</div>}
    </div>
  )
}

/**
 * Info panel content component
 */
function InfoPanel({
  meta,
  onClose,
  position,
}: {
  meta: ComponentMeta
  onClose?: () => void
  position: string
}) {
  const { settings } = useDevMode()
  const { categories, verbosity } = settings

  const panelStyle: CSSProperties = {
    ...styles.panel,
    ...positionStyles[position],
  }

  return (
    <div style={panelStyle} role="tooltip" aria-label={`Component info: ${meta.name}`}>
      {onClose && (
        <button
          type="button"
          style={styles.closeButton}
          onClick={onClose}
          aria-label="Close info panel"
        >
          ×
        </button>
      )}

      {/* Header */}
      <div style={styles.header}>
        <h4 style={styles.title}>{meta.name}</h4>
        <span
          style={{
            ...styles.badge,
            backgroundColor: `${STATUS_COLORS[meta.status]}20`,
            color: STATUS_COLORS[meta.status],
          }}
        >
          {STATUS_LABELS[meta.status]}
        </span>
      </div>

      {/* Summary - always shown */}
      {categories.basic && <p style={styles.summary}>{meta.summary}</p>}

      {/* Description - verbose only */}
      {verbosity === 'verbose' && categories.basic && (
        <p style={{ ...styles.summary, fontSize: '11px' }}>{meta.description}</p>
      )}

      {/* History */}
      {categories.history && meta.history.length > 0 && (
        <CollapsibleSection
          title={`History (${meta.history.length})`}
          defaultExpanded={verbosity !== 'minimal'}
        >
          {meta.history.slice(0, verbosity === 'verbose' ? undefined : 3).map((entry, i) => (
            <div key={i} style={styles.historyItem}>
              <span style={styles.historyIcon}>{HISTORY_ICONS[entry.type]}</span>
              <div>
                <strong>v{entry.version}</strong> — {entry.description}
                {entry.taskId && (
                  <span style={{ color: '#3b82f6', marginLeft: '4px' }}>({entry.taskId})</span>
                )}
                <div style={{ fontSize: '10px', color: '#6b7280' }}>{formatDate(entry.date)}</div>
              </div>
            </div>
          ))}
        </CollapsibleSection>
      )}

      {/* Features */}
      {categories.features && meta.features.length > 0 && (
        <CollapsibleSection
          title={`Features (${meta.features.length})`}
          defaultExpanded={verbosity !== 'minimal'}
        >
          {meta.features.map((feature: ComponentFeature) => (
            <div
              key={feature.id}
              style={{
                ...styles.featureItem,
                ...(feature.enabled ? styles.featureEnabled : styles.featureDisabled),
              }}
            >
              <span>{feature.enabled ? '✓' : '○'}</span>
              <span>
                {feature.name}
                {feature.taskId && (
                  <span style={{ color: '#6b7280', marginLeft: '4px' }}>({feature.taskId})</span>
                )}
              </span>
            </div>
          ))}
        </CollapsibleSection>
      )}

      {/* Dependencies - normal and verbose only */}
      {categories.dependencies && verbosity !== 'minimal' && meta.dependencies.length > 0 && (
        <CollapsibleSection title={`Dependencies (${meta.dependencies.length})`}>
          {meta.dependencies.map((dep, i) => (
            <div key={i} style={styles.dependencyItem}>
              <span style={styles.dependencyType}>{dep.type}</span>
              <strong>{dep.name}</strong>
              {verbosity === 'verbose' && <span> — {dep.purpose}</span>}
            </div>
          ))}
        </CollapsibleSection>
      )}

      {/* Related Files - verbose only */}
      {categories.relatedFiles && verbosity === 'verbose' && meta.relatedFiles.length > 0 && (
        <CollapsibleSection title={`Related Files (${meta.relatedFiles.length})`}>
          {meta.relatedFiles.map((file, i) => (
            <div key={i} style={styles.dependencyItem}>
              <span style={styles.dependencyType}>{file.type}</span>
              <code>{file.path}</code>
            </div>
          ))}
        </CollapsibleSection>
      )}

      {/* Tips */}
      {categories.tips && meta.tips && meta.tips.length > 0 && (
        <CollapsibleSection title="Tips" defaultExpanded={verbosity !== 'minimal'}>
          {meta.tips.map((tip, i) => (
            <div key={i} style={styles.tip}>
              <span style={styles.tipIcon}>💡</span>
              <span>{tip}</span>
            </div>
          ))}
        </CollapsibleSection>
      )}

      {/* Known Issues */}
      {categories.tips && meta.knownIssues && meta.knownIssues.length > 0 && (
        <CollapsibleSection title="Known Issues">
          {meta.knownIssues.map((issue, i) => (
            <div key={i} style={styles.tip}>
              <span style={{ ...styles.tipIcon, color: '#ef4444' }}>⚠</span>
              <span>{issue}</span>
            </div>
          ))}
        </CollapsibleSection>
      )}

      {/* Tags */}
      {meta.tags.length > 0 && (
        <div style={styles.tags}>
          {meta.tags.map((tag) => (
            <span key={tag} style={styles.tag}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Meta info footer */}
      <div style={styles.meta}>
        <span style={styles.metaItem}>
          <strong>v{meta.version}</strong>
        </span>
        <span style={styles.metaItem}>Phase {meta.phase}</span>
        {meta.taskId && (
          <span style={styles.metaItem}>
            <span style={{ color: '#3b82f6' }}>{meta.taskId}</span>
          </span>
        )}
        <span style={styles.metaItem}>📁 {meta.filePath}</span>
      </div>
    </div>
  )
}

/**
 * ComponentInfo wrapper component
 *
 * Wraps a component and displays its metadata when Developer Mode is enabled.
 */
export function ComponentInfo({
  meta,
  children,
  style,
  className = '',
  position = 'auto',
  alwaysShow = false,
}: ComponentInfoProps) {
  const isDevMode = useIsDevModeEnabled()
  const settings = useDevModeSettings()
  const [isHovered, setIsHovered] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  // For 'auto' position, use the default from settings
  // Dynamic position calculation would require effects that trigger cascading renders
  const actualPosition = position === 'auto' ? settings.panelPosition : position

  // Don't render anything special if DevMode is disabled
  if (!isDevMode) {
    return <>{children}</>
  }

  const showPanel = alwaysShow || (settings.showHoverInfo && (isHovered || isPinned))
  const showOutline = settings.showOutline

  const wrapperStyle: CSSProperties = {
    ...(showOutline ? styles.wrapperOutline : styles.wrapper),
    ...style,
  }

  return (
    <div
      ref={wrapperRef}
      style={wrapperStyle}
      className={`component-info ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        // Pin/unpin on Ctrl+Click
        if (e.ctrlKey || e.metaKey) {
          e.stopPropagation()
          setIsPinned(!isPinned)
        }
      }}
    >
      {children}
      {showPanel && (
        <InfoPanel
          meta={meta}
          position={actualPosition}
          onClose={isPinned ? () => setIsPinned(false) : undefined}
        />
      )}
    </div>
  )
}

/**
 * DevMode indicator/toggle button component
 */
export function DevModeIndicator() {
  const { isEnabled, toggleDevMode } = useDevMode()

  return (
    <button
      type="button"
      onClick={toggleDevMode}
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: 10000,
        padding: '8px 16px',
        borderRadius: '20px',
        border: 'none',
        backgroundColor: isEnabled ? 'rgba(59, 130, 246, 0.9)' : 'rgba(75, 85, 99, 0.9)',
        color: '#fff',
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
        transition: 'background-color 0.2s',
      }}
      aria-label={isEnabled ? 'Disable Developer Mode' : 'Enable Developer Mode'}
      title="Toggle Developer Mode (Ctrl+Shift+D)"
    >
      <span>{isEnabled ? '🔧' : '👁️'}</span>
      <span>DevMode {isEnabled ? 'ON' : 'OFF'}</span>
    </button>
  )
}

/**
 * DevMode settings panel component
 */
export function DevModeSettingsPanel() {
  const { settings, updateSettings, updateCategory, resetSettings, isEnabled } = useDevMode()
  const [isOpen, setIsOpen] = useState(false)

  if (!isEnabled) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 10000,
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '8px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: 'rgba(30, 30, 30, 0.95)',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '16px',
        }}
        aria-label="DevMode Settings"
        title="DevMode Settings"
      >
        ⚙️
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            backgroundColor: 'rgba(30, 30, 30, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '16px',
            minWidth: '250px',
            color: '#fff',
            fontSize: '12px',
          }}
        >
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>DevMode Settings</h4>

          {/* Verbosity */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: '#9ca3af' }}>
              Verbosity
            </label>
            <select
              value={settings.verbosity}
              onChange={(e) =>
                updateSettings({
                  verbosity: e.target.value as typeof settings.verbosity,
                })
              }
              style={{
                width: '100%',
                padding: '6px',
                borderRadius: '4px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                color: '#fff',
              }}
            >
              <option value="minimal">Minimal</option>
              <option value="normal">Normal</option>
              <option value="verbose">Verbose</option>
            </select>
          </div>

          {/* Toggle options */}
          <div style={{ marginBottom: '12px' }}>
            <label
              style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}
            >
              <input
                type="checkbox"
                checked={settings.showOutline}
                onChange={(e) => updateSettings({ showOutline: e.target.checked })}
              />
              Show component outline
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={settings.showHoverInfo}
                onChange={(e) => updateSettings({ showHoverInfo: e.target.checked })}
              />
              Show info on hover
            </label>
          </div>

          {/* Categories */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#9ca3af' }}>
              Show categories
            </label>
            {(Object.keys(settings.categories) as Array<keyof typeof settings.categories>).map(
              (cat) => (
                <label
                  key={cat}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}
                >
                  <input
                    type="checkbox"
                    checked={settings.categories[cat]}
                    onChange={(e) => updateCategory(cat, e.target.checked)}
                  />
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </label>
              )
            )}
          </div>

          {/* Reset button */}
          <button
            type="button"
            onClick={resetSettings}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backgroundColor: 'transparent',
              color: '#9ca3af',
              cursor: 'pointer',
            }}
          >
            Reset to defaults
          </button>
        </div>
      )}
    </div>
  )
}

export default ComponentInfo
