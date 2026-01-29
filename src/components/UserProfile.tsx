/**
 * UserProfile component for displaying and editing user profile information
 * Shows user avatar, name, email, and preferences
 */

import { useState, useCallback, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import type { UserPreferences } from '../types/auth'

// ============================================================================
// Types
// ============================================================================

export interface UserProfileProps {
  /** Show edit mode by default */
  editMode?: boolean
  /** Callback when profile is updated */
  onUpdate?: () => void
  /** Custom class name */
  className?: string
}

// ============================================================================
// UserProfile Component
// ============================================================================

/**
 * UserProfile component for authenticated users
 * Displays user information and allows editing
 */
export function UserProfile({ editMode = false, onUpdate, className = '' }: UserProfileProps) {
  const { state, signOut, updateProfile, updatePreferences } = useAuth()
  const { user } = state

  const [isEditing, setIsEditing] = useState(editMode)
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [preferences, setPreferences] = useState<UserPreferences>(
    user?.preferences || {
      theme: 'system',
      language: 'en',
      showHints: true,
      autosave: true,
    }
  )
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Show message and auto-clear
  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }, [])

  // Handle profile update
  const handleUpdateProfile = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      setIsLoading(true)

      const result = await updateProfile({ displayName })

      if (result.success) {
        showMessage('success', 'Profile updated successfully')
        setIsEditing(false)
        onUpdate?.()
      } else {
        showMessage('error', result.error || 'Failed to update profile')
      }

      setIsLoading(false)
    },
    [displayName, updateProfile, showMessage, onUpdate]
  )

  // Handle preferences update
  const handleUpdatePreferences = useCallback(
    async (newPrefs: Partial<UserPreferences>) => {
      const updatedPrefs = { ...preferences, ...newPrefs }
      setPreferences(updatedPrefs)

      const result = await updatePreferences(newPrefs)

      if (result.success) {
        showMessage('success', 'Preferences saved')
      } else {
        showMessage('error', result.error || 'Failed to save preferences')
      }
    },
    [preferences, updatePreferences, showMessage]
  )

  // Handle sign out
  const handleSignOut = useCallback(async () => {
    await signOut()
  }, [signOut])

  // Not authenticated
  if (!user) {
    return (
      <div className={`user-profile user-profile--empty ${className}`}>
        <p className="user-profile__message">Please sign in to view your profile.</p>
      </div>
    )
  }

  return (
    <div className={`user-profile ${className}`}>
      {/* Profile header */}
      <div className="user-profile__header">
        <div className="user-profile__avatar">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.displayName} className="user-profile__avatar-img" />
          ) : (
            <div className="user-profile__avatar-placeholder">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="user-profile__info">
          {isEditing ? (
            <form onSubmit={handleUpdateProfile} className="user-profile__edit-form">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="user-profile__input"
                placeholder="Display name"
                disabled={isLoading}
              />
              <div className="user-profile__edit-actions">
                <button
                  type="submit"
                  className="user-profile__button user-profile__button--primary"
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  className="user-profile__button user-profile__button--secondary"
                  onClick={() => {
                    setDisplayName(user.displayName)
                    setIsEditing(false)
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <h2 className="user-profile__name">{user.displayName}</h2>
              <p className="user-profile__email">{user.email}</p>
              <button
                type="button"
                className="user-profile__button user-profile__button--link"
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status message */}
      {message && (
        <div
          className={`user-profile__message user-profile__message--${message.type}`}
          role={message.type === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </div>
      )}

      {/* Account details */}
      <div className="user-profile__section">
        <h3 className="user-profile__section-title">Account</h3>
        <div className="user-profile__details">
          <div className="user-profile__detail">
            <span className="user-profile__detail-label">Role:</span>
            <span className="user-profile__detail-value">{user.role}</span>
          </div>
          <div className="user-profile__detail">
            <span className="user-profile__detail-label">Member since:</span>
            <span className="user-profile__detail-value">
              {new Date(user.createdAt).toLocaleDateString()}
            </span>
          </div>
          {user.lastLoginAt && (
            <div className="user-profile__detail">
              <span className="user-profile__detail-label">Last login:</span>
              <span className="user-profile__detail-value">
                {new Date(user.lastLoginAt).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Preferences section */}
      <div className="user-profile__section">
        <h3 className="user-profile__section-title">Preferences</h3>

        <div className="user-profile__preference">
          <label htmlFor="pref-theme" className="user-profile__pref-label">
            Theme
          </label>
          <select
            id="pref-theme"
            value={preferences.theme}
            onChange={(e) =>
              handleUpdatePreferences({ theme: e.target.value as UserPreferences['theme'] })
            }
            className="user-profile__select"
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        <div className="user-profile__preference">
          <label htmlFor="pref-language" className="user-profile__pref-label">
            Language
          </label>
          <select
            id="pref-language"
            value={preferences.language}
            onChange={(e) => handleUpdatePreferences({ language: e.target.value })}
            className="user-profile__select"
          >
            <option value="en">English</option>
            <option value="ru">Russian</option>
          </select>
        </div>

        <div className="user-profile__preference user-profile__preference--checkbox">
          <input
            id="pref-hints"
            type="checkbox"
            checked={preferences.showHints}
            onChange={(e) => handleUpdatePreferences({ showHints: e.target.checked })}
            className="user-profile__checkbox"
          />
          <label htmlFor="pref-hints" className="user-profile__pref-label">
            Show tooltips and hints
          </label>
        </div>

        <div className="user-profile__preference user-profile__preference--checkbox">
          <input
            id="pref-autosave"
            type="checkbox"
            checked={preferences.autosave}
            onChange={(e) => handleUpdatePreferences({ autosave: e.target.checked })}
            className="user-profile__checkbox"
          />
          <label htmlFor="pref-autosave" className="user-profile__pref-label">
            Auto-save configurations
          </label>
        </div>
      </div>

      {/* Sign out button */}
      <div className="user-profile__actions">
        <button
          type="button"
          onClick={handleSignOut}
          className="user-profile__button user-profile__button--danger"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Compact user display for header/navigation
// ============================================================================

export interface UserAvatarProps {
  /** Size in pixels */
  size?: number
  /** Show dropdown menu on click */
  showMenu?: boolean
  /** Custom class name */
  className?: string
}

/**
 * Compact user avatar with optional dropdown
 */
export function UserAvatar({ size = 32, showMenu = true, className = '' }: UserAvatarProps) {
  const { state, signOut } = useAuth()
  const { user } = state
  const [menuOpen, setMenuOpen] = useState(false)

  const handleSignOut = useCallback(async () => {
    await signOut()
    setMenuOpen(false)
  }, [signOut])

  if (!user) {
    return null
  }

  const avatarStyle = {
    width: `${size}px`,
    height: `${size}px`,
    fontSize: `${size * 0.4}px`,
  }

  return (
    <div className={`user-avatar ${className}`}>
      <button
        type="button"
        className="user-avatar__button"
        onClick={() => showMenu && setMenuOpen(!menuOpen)}
        style={avatarStyle}
        aria-label={`User menu for ${user.displayName}`}
        aria-expanded={menuOpen}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.displayName}
            className="user-avatar__img"
            style={avatarStyle}
          />
        ) : (
          <span className="user-avatar__initial">{user.displayName.charAt(0).toUpperCase()}</span>
        )}
      </button>

      {showMenu && menuOpen && (
        <div className="user-avatar__menu">
          <div className="user-avatar__menu-header">
            <span className="user-avatar__menu-name">{user.displayName}</span>
            <span className="user-avatar__menu-email">{user.email}</span>
          </div>
          <div className="user-avatar__menu-divider" />
          <button type="button" className="user-avatar__menu-item" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}

export default UserProfile
