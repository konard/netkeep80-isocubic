/**
 * CollaborativeParamEditor component for collaborative editing mode
 * Extends ParamEditor with real-time collaboration features:
 * - Shows who is editing which parameter
 * - Displays editing indicators with participant colors
 * - Handles conflict resolution visualization
 * - Integrates with ActionHistory for change tracking
 *
 * ISSUE 33: Collaborative editing mode for ParamEditor
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import type { SpectralCube } from '../types/cube'
import type { LODConfig, LODStatistics } from '../types/lod'
import type {
  Participant,
  CollaborativeAction,
  ParticipantId,
  CubeUpdateAction,
} from '../types/collaboration'
import { ParamEditor } from './ParamEditor'
import { ActionHistory } from './ActionHistory'
import { CollaborationManager, canEdit } from '../lib/collaboration'

/**
 * Field being edited by a participant
 */
export interface FieldEdit {
  /** ID of participant editing this field */
  participantId: ParticipantId
  /** Name of the field being edited */
  fieldName: string
  /** Section the field belongs to */
  section: string
  /** Timestamp when editing started */
  startedAt: string
  /** Last value change timestamp */
  lastChangeAt: string
}

/**
 * Conflict information for a field
 */
export interface FieldConflict {
  /** Name of the field with conflict */
  fieldName: string
  /** Participants involved in the conflict */
  participants: ParticipantId[]
  /** Timestamp of the conflict */
  timestamp: string
  /** Whether the conflict was resolved */
  resolved: boolean
  /** Resolution strategy used */
  resolution?: 'last_write_wins' | 'first_write_wins' | 'merge'
}

/**
 * Props for CollaborativeParamEditor component
 */
export interface CollaborativeParamEditorProps {
  /** Current cube configuration */
  currentCube: SpectralCube | null
  /** Callback when cube is updated */
  onCubeUpdate?: (cube: SpectralCube) => void
  /** Current LOD configuration */
  lodConfig?: LODConfig
  /** Callback when LOD configuration changes */
  onLODConfigChange?: (config: LODConfig) => void
  /** Current LOD statistics */
  lodStatistics?: LODStatistics
  /** Collaboration manager instance */
  collaborationManager?: CollaborationManager
  /** All participants in the session */
  participants?: Map<ParticipantId, Participant>
  /** Local participant ID */
  localParticipantId?: ParticipantId
  /** Recent actions for history display */
  actions?: CollaborativeAction[]
  /** Callback when action is undone */
  onUndoAction?: (action: CollaborativeAction) => void
  /** Whether to show action history panel */
  showHistory?: boolean
  /** Maximum actions to show in history */
  maxHistoryActions?: number
  /** Custom class name */
  className?: string
}

/**
 * Infers which field is being edited from a cube update action
 */
function inferEditedField(action: CubeUpdateAction): { fieldName: string; section: string } | null {
  const { changes } = action.payload

  if (changes.base) {
    if ('color' in changes.base) return { fieldName: 'color', section: 'base' }
    if ('roughness' in changes.base) return { fieldName: 'roughness', section: 'base' }
    if ('transparency' in changes.base) return { fieldName: 'transparency', section: 'base' }
  }

  if (changes.gradients) {
    return { fieldName: 'gradients', section: 'gradients' }
  }

  if (changes.noise) {
    if ('type' in changes.noise) return { fieldName: 'type', section: 'noise' }
    if ('scale' in changes.noise) return { fieldName: 'scale', section: 'noise' }
    if ('octaves' in changes.noise) return { fieldName: 'octaves', section: 'noise' }
    if ('persistence' in changes.noise) return { fieldName: 'persistence', section: 'noise' }
    if ('mask' in changes.noise) return { fieldName: 'mask', section: 'noise' }
    return { fieldName: 'noise', section: 'noise' }
  }

  if (changes.physics) {
    if ('material' in changes.physics) return { fieldName: 'material', section: 'physics' }
    if ('density' in changes.physics) return { fieldName: 'density', section: 'physics' }
    if ('break_pattern' in changes.physics)
      return { fieldName: 'break_pattern', section: 'physics' }
    return { fieldName: 'physics', section: 'physics' }
  }

  if (changes.boundary) {
    if ('mode' in changes.boundary) return { fieldName: 'mode', section: 'boundary' }
    if ('neighbor_influence' in changes.boundary)
      return { fieldName: 'neighbor_influence', section: 'boundary' }
    return { fieldName: 'boundary', section: 'boundary' }
  }

  if (changes.meta) {
    if ('name' in changes.meta) return { fieldName: 'name', section: 'meta' }
  }

  return null
}

/**
 * CollaborativeParamEditor component
 * Wraps ParamEditor with collaboration indicators and history
 */
export function CollaborativeParamEditor({
  currentCube,
  onCubeUpdate,
  lodConfig,
  onLODConfigChange,
  lodStatistics,
  collaborationManager,
  participants,
  localParticipantId,
  actions = [],
  onUndoAction,
  showHistory = true,
  maxHistoryActions = 30,
  className = '',
}: CollaborativeParamEditorProps) {
  // Track recent conflicts
  const [conflicts, setConflicts] = useState<FieldConflict[]>([])

  // Whether the current user can edit
  const localParticipant = useMemo(() => {
    if (!participants || !localParticipantId) return null
    return participants.get(localParticipantId) ?? null
  }, [participants, localParticipantId])

  const isReadOnly = useMemo(() => !canEdit(localParticipant), [localParticipant])

  // Compute active edits from recent actions
  // Filter actions to only those within the edit timeout period
  const activeEdits = useMemo(() => {
    if (!actions.length) return new Map<string, FieldEdit>()

    const editTimeout = 5000 // Consider an edit active for 5 seconds

    const newActiveEdits = new Map<string, FieldEdit>()

    // Get the most recent timestamp from actions to use as reference
    // This makes the computation pure as it doesn't depend on current time
    const mostRecentAction = actions.reduce((latest, action) => {
      const actionTime = new Date(action.timestamp).getTime()
      const latestTime = new Date(latest.timestamp).getTime()
      return actionTime > latestTime ? action : latest
    }, actions[0])

    const referenceTime = new Date(mostRecentAction.timestamp).getTime()

    // Process recent update actions
    for (const action of actions) {
      if (action.type !== 'cube_update') continue
      if (action.participantId === localParticipantId) continue

      const actionTime = new Date(action.timestamp).getTime()
      // Only consider actions within editTimeout of the most recent action
      if (referenceTime - actionTime > editTimeout) continue

      const field = inferEditedField(action as CubeUpdateAction)
      if (!field) continue

      const key = `${field.section}.${field.fieldName}`
      const existing = newActiveEdits.get(key)

      if (!existing || new Date(existing.lastChangeAt).getTime() < actionTime) {
        newActiveEdits.set(key, {
          participantId: action.participantId,
          fieldName: field.fieldName,
          section: field.section,
          startedAt: existing?.startedAt ?? action.timestamp,
          lastChangeAt: action.timestamp,
        })
      }
    }

    return newActiveEdits
  }, [actions, localParticipantId])

  // Listen for conflict resolution events from manager
  useEffect(() => {
    if (!collaborationManager) return

    const handleConflict = (event: { data: unknown }) => {
      const data = event.data as {
        incoming: CollaborativeAction
        pending: CollaborativeAction
        resolved: CollaborativeAction
      }

      if (data.incoming.type !== 'cube_update') return

      const field = inferEditedField(data.incoming as CubeUpdateAction)
      if (!field) return

      const conflict: FieldConflict = {
        fieldName: field.fieldName,
        participants: [data.incoming.participantId, data.pending.participantId],
        timestamp: new Date().toISOString(),
        resolved: true,
        resolution: 'last_write_wins', // Default, could be from config
      }

      setConflicts((prev) => [...prev.slice(-9), conflict])

      // Auto-clear conflict after 3 seconds
      setTimeout(() => {
        setConflicts((prev) => prev.filter((c) => c.timestamp !== conflict.timestamp))
      }, 3000)
    }

    collaborationManager.on('conflict_resolved', handleConflict)
    return () => collaborationManager.off('conflict_resolved', handleConflict)
  }, [collaborationManager])

  // Handle cube update with collaboration tracking
  const handleCubeUpdate = useCallback(
    (cube: SpectralCube) => {
      onCubeUpdate?.(cube)

      // If we have a manager, sync the action
      if (collaborationManager && currentCube) {
        collaborationManager.updateCube(cube.id, cube)
      }
    },
    [onCubeUpdate, collaborationManager, currentCube]
  )

  // Get participant info for an edit
  const getParticipantForEdit = useCallback(
    (edit: FieldEdit): Participant | undefined => {
      return participants?.get(edit.participantId)
    },
    [participants]
  )

  // Render editing indicator for a field
  const renderEditIndicator = useCallback(
    (section: string, fieldName: string) => {
      const key = `${section}.${fieldName}`
      const edit = activeEdits.get(key)
      if (!edit) return null

      const participant = getParticipantForEdit(edit)
      if (!participant) return null

      return (
        <div
          className="collab-editor__edit-indicator"
          style={{ backgroundColor: participant.color }}
          title={`${participant.name} is editing this field`}
        >
          <span className="collab-editor__edit-indicator-name">{participant.name}</span>
          <span className="collab-editor__edit-indicator-icon">Editing...</span>
        </div>
      )
    },
    [activeEdits, getParticipantForEdit]
  )

  // Render conflict indicator
  const renderConflictBadge = useCallback(() => {
    if (conflicts.length === 0) return null

    return (
      <div className="collab-editor__conflict-badge" role="status" aria-live="polite">
        <span className="collab-editor__conflict-icon">!</span>
        <span className="collab-editor__conflict-count">
          {conflicts.length} conflict(s) resolved
        </span>
      </div>
    )
  }, [conflicts])

  // Filter cube-related actions for history
  const cubeActions = useMemo(() => {
    return actions.filter(
      (action) =>
        action.type === 'cube_create' ||
        action.type === 'cube_update' ||
        action.type === 'cube_delete'
    )
  }, [actions])

  // Get list of sections with active edits
  const sectionsWithEdits = useMemo(() => {
    const sections = new Set<string>()
    for (const edit of activeEdits.values()) {
      sections.add(edit.section)
    }
    return sections
  }, [activeEdits])

  return (
    <div className={`collab-editor ${className}`}>
      {/* Collaboration status header */}
      <div className="collab-editor__header">
        <div className="collab-editor__status">
          {localParticipant && (
            <>
              <span
                className="collab-editor__user-color"
                style={{ backgroundColor: localParticipant.color }}
              />
              <span className="collab-editor__user-name">{localParticipant.name}</span>
              <span className="collab-editor__user-role">({localParticipant.role})</span>
            </>
          )}
        </div>

        {/* Active editors indicator */}
        {activeEdits.size > 0 && (
          <div className="collab-editor__active-editors">
            <span className="collab-editor__active-count">
              {activeEdits.size} field(s) being edited
            </span>
            <div className="collab-editor__active-avatars">
              {Array.from(
                new Set(Array.from(activeEdits.values()).map((e) => e.participantId))
              ).map((pid) => {
                const p = participants?.get(pid)
                if (!p) return null
                return (
                  <span
                    key={pid}
                    className="collab-editor__avatar"
                    style={{ backgroundColor: p.color }}
                    title={p.name}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Conflict indicator */}
        {renderConflictBadge()}
      </div>

      {/* Read-only notice */}
      {isReadOnly && (
        <div className="collab-editor__readonly-notice" role="alert">
          <span className="collab-editor__readonly-icon">View</span>
          <span className="collab-editor__readonly-text">
            You are a viewer. Request editor access to make changes.
          </span>
        </div>
      )}

      {/* Section edit indicators */}
      {sectionsWithEdits.size > 0 && (
        <div className="collab-editor__section-indicators">
          {Array.from(sectionsWithEdits).map((section) => {
            const editsInSection = Array.from(activeEdits.values()).filter(
              (e) => e.section === section
            )
            const editParticipants = editsInSection
              .map((e) => participants?.get(e.participantId))
              .filter(Boolean) as Participant[]

            return (
              <div key={section} className="collab-editor__section-indicator">
                <span className="collab-editor__section-name">{section}</span>
                <div className="collab-editor__section-editors">
                  {editParticipants.map((p) => (
                    <span
                      key={p.id}
                      className="collab-editor__editor-chip"
                      style={{ backgroundColor: p.color }}
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Main editor */}
      <div className="collab-editor__main">
        <ParamEditor
          currentCube={currentCube}
          onCubeUpdate={isReadOnly ? undefined : handleCubeUpdate}
          lodConfig={lodConfig}
          onLODConfigChange={isReadOnly ? undefined : onLODConfigChange}
          lodStatistics={lodStatistics}
          className="collab-editor__param-editor"
        />

        {/* Field-level indicators overlay */}
        {activeEdits.size > 0 && (
          <div className="collab-editor__field-overlays">
            {Array.from(activeEdits.entries()).map(([key, edit]) => {
              const participant = getParticipantForEdit(edit)
              if (!participant) return null

              return (
                <div
                  key={key}
                  className="collab-editor__field-overlay"
                  data-section={edit.section}
                  data-field={edit.fieldName}
                  style={{ borderColor: participant.color }}
                >
                  {renderEditIndicator(edit.section, edit.fieldName)}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Action history panel */}
      {showHistory && (
        <div className="collab-editor__history">
          <ActionHistory
            actions={cubeActions}
            participants={participants}
            maxActions={maxHistoryActions}
            localParticipantId={localParticipantId}
            onUndoAction={isReadOnly ? undefined : onUndoAction}
            className="collab-editor__action-history"
          />
        </div>
      )}
    </div>
  )
}

/**
 * Props for the editing indicator component (for individual fields)
 */
export interface EditingIndicatorProps {
  /** Participant who is editing */
  participant: Participant
  /** Field being edited */
  fieldName: string
  /** Whether to show as inline or floating */
  variant?: 'inline' | 'floating'
  /** Custom class name */
  className?: string
}

/**
 * EditingIndicator component
 * Shows who is editing a specific field
 */
export function EditingIndicator({
  participant,
  fieldName,
  variant = 'inline',
  className = '',
}: EditingIndicatorProps) {
  return (
    <div className={`editing-indicator editing-indicator--${variant} ${className}`}>
      <span
        className="editing-indicator__avatar"
        style={{ backgroundColor: participant.color }}
        title={participant.name}
      >
        {participant.name.charAt(0).toUpperCase()}
      </span>
      <span className="editing-indicator__text">
        <span className="editing-indicator__name">{participant.name}</span>
        <span className="editing-indicator__action">is editing {fieldName}</span>
      </span>
    </div>
  )
}

/**
 * Props for the conflict resolution indicator
 */
export interface ConflictIndicatorProps {
  /** Conflict information */
  conflict: FieldConflict
  /** Participants map for resolving names */
  participants?: Map<ParticipantId, Participant>
  /** Custom class name */
  className?: string
}

/**
 * ConflictIndicator component
 * Shows conflict resolution information
 */
export function ConflictIndicator({
  conflict,
  participants,
  className = '',
}: ConflictIndicatorProps) {
  const participantNames = conflict.participants
    .map((pid) => participants?.get(pid)?.name ?? 'Unknown')
    .join(', ')

  const resolutionText = conflict.resolution
    ? {
        last_write_wins: 'Latest change was kept',
        first_write_wins: 'First change was kept',
        merge: 'Changes were merged',
      }[conflict.resolution]
    : 'Conflict resolved'

  return (
    <div
      className={`conflict-indicator ${conflict.resolved ? 'conflict-indicator--resolved' : ''} ${className}`}
    >
      <span className="conflict-indicator__icon">{conflict.resolved ? '~' : '!'}</span>
      <div className="conflict-indicator__details">
        <span className="conflict-indicator__field">Conflict on: {conflict.fieldName}</span>
        <span className="conflict-indicator__participants">Between: {participantNames}</span>
        <span className="conflict-indicator__resolution">{resolutionText}</span>
      </div>
    </div>
  )
}

export default CollaborativeParamEditor
