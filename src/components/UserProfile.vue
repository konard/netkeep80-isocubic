<!--
  UserProfile component for displaying and editing user profile information
  Shows user avatar, name, email, and preferences.
  Also includes UserAvatar as a compact user display for header/navigation.

  TASK 65: Migration from React to Vue 3.0 SFC (Phase 10)
-->

<script lang="ts">
import { defineComponent, ref as vueRef, type PropType } from 'vue'
import { useAuth } from '../lib/auth'

// ============================================================================
// UserAvatar - Compact user display for header/navigation
// ============================================================================

/**
 * Compact user avatar with optional dropdown
 */
export const UserAvatar = defineComponent({
  name: 'UserAvatar',
  props: {
    /** Size in pixels */
    size: {
      type: Number as PropType<number>,
      default: 32,
    },
    /** Show dropdown menu on click */
    showMenu: {
      type: Boolean as PropType<boolean>,
      default: true,
    },
    /** Custom class name */
    className: {
      type: String as PropType<string>,
      default: '',
    },
  },
  setup(props) {
    const { state, signOut } = useAuth()
    const menuOpen = vueRef(false)

    async function handleSignOut() {
      await signOut()
      menuOpen.value = false
    }

    function toggleMenu() {
      if (props.showMenu) {
        menuOpen.value = !menuOpen.value
      }
    }

    return { state, menuOpen, handleSignOut, toggleMenu }
  },
  template: `
    <template v-if="!state.user" />
    <div v-else :class="['user-avatar', className]">
      <button
        type="button"
        class="user-avatar__button"
        @click="toggleMenu"
        :style="{
          width: size + 'px',
          height: size + 'px',
          fontSize: (size * 0.4) + 'px',
        }"
        :aria-label="'User menu for ' + state.user.displayName"
        :aria-expanded="menuOpen"
      >
        <img
          v-if="state.user.avatarUrl"
          :src="state.user.avatarUrl"
          :alt="state.user.displayName"
          class="user-avatar__img"
          :style="{
            width: size + 'px',
            height: size + 'px',
            fontSize: (size * 0.4) + 'px',
          }"
        />
        <span v-else class="user-avatar__initial">
          {{ state.user.displayName.charAt(0).toUpperCase() }}
        </span>
      </button>

      <div v-if="showMenu && menuOpen" class="user-avatar__menu">
        <div class="user-avatar__menu-header">
          <span class="user-avatar__menu-name">{{ state.user.displayName }}</span>
          <span class="user-avatar__menu-email">{{ state.user.email }}</span>
        </div>
        <div class="user-avatar__menu-divider" />
        <button type="button" class="user-avatar__menu-item" @click="handleSignOut">
          Sign Out
        </button>
      </div>
    </div>
  `,
})
</script>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useAuth as useAuthComposable } from '../lib/auth'
import type { UserPreferences } from '../types/auth'

// ============================================================================
// Props & Emits
// ============================================================================

interface UserProfileProps {
  /** Show edit mode by default */
  editMode?: boolean
  /** Custom class name */
  className?: string
}

const props = withDefaults(defineProps<UserProfileProps>(), {
  editMode: false,
  className: '',
})

const emit = defineEmits<{
  update: []
}>()

// ============================================================================
// State
// ============================================================================

const { state, signOut, updateProfile, updatePreferences } = useAuthComposable()
const user = state.user

const isEditing = ref(props.editMode)
const displayName = ref(user?.displayName || '')
const preferences = reactive<UserPreferences>(
  user?.preferences || {
    theme: 'system',
    language: 'en',
    showHints: true,
    autosave: true,
  }
)
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null)
const isLoading = ref(false)

// ============================================================================
// Methods
// ============================================================================

function showMessage(type: 'success' | 'error', text: string) {
  message.value = { type, text }
  setTimeout(() => {
    message.value = null
  }, 3000)
}

async function handleUpdateProfile(e: Event) {
  e.preventDefault()
  isLoading.value = true

  const result = await updateProfile({ displayName: displayName.value })

  if (result.success) {
    showMessage('success', 'Profile updated successfully')
    isEditing.value = false
    emit('update')
  } else {
    showMessage('error', result.error || 'Failed to update profile')
  }

  isLoading.value = false
}

async function handleUpdatePreferences(newPrefs: Partial<UserPreferences>) {
  Object.assign(preferences, newPrefs)

  const result = await updatePreferences(newPrefs)

  if (result.success) {
    showMessage('success', 'Preferences saved')
  } else {
    showMessage('error', result.error || 'Failed to save preferences')
  }
}

async function handleSignOut() {
  await signOut()
}

function cancelEdit() {
  displayName.value = user?.displayName || ''
  isEditing.value = false
}
</script>

<template>
  <!-- Not authenticated -->
  <div v-if="!user" :class="['user-profile', 'user-profile--empty', props.className]">
    <p class="user-profile__message">Please sign in to view your profile.</p>
  </div>

  <!-- Authenticated -->
  <div v-else :class="['user-profile', props.className]">
    <!-- Profile header -->
    <div class="user-profile__header">
      <div class="user-profile__avatar">
        <img
          v-if="user.avatarUrl"
          :src="user.avatarUrl"
          :alt="user.displayName"
          class="user-profile__avatar-img"
        />
        <div v-else class="user-profile__avatar-placeholder">
          {{ user.displayName.charAt(0).toUpperCase() }}
        </div>
      </div>

      <div class="user-profile__info">
        <!-- Editing mode -->
        <form v-if="isEditing" class="user-profile__edit-form" @submit="handleUpdateProfile">
          <input
            v-model="displayName"
            type="text"
            class="user-profile__input"
            placeholder="Display name"
            :disabled="isLoading"
          />
          <div class="user-profile__edit-actions">
            <button
              type="submit"
              class="user-profile__button user-profile__button--primary"
              :disabled="isLoading"
            >
              {{ isLoading ? 'Saving...' : 'Save' }}
            </button>
            <button
              type="button"
              class="user-profile__button user-profile__button--secondary"
              :disabled="isLoading"
              @click="cancelEdit"
            >
              Cancel
            </button>
          </div>
        </form>

        <!-- Display mode -->
        <template v-else>
          <h2 class="user-profile__name">{{ user.displayName }}</h2>
          <p class="user-profile__email">{{ user.email }}</p>
          <button
            type="button"
            class="user-profile__button user-profile__button--link"
            @click="isEditing = true"
          >
            Edit Profile
          </button>
        </template>
      </div>
    </div>

    <!-- Status message -->
    <div
      v-if="message"
      :class="['user-profile__message', `user-profile__message--${message.type}`]"
      :role="message.type === 'error' ? 'alert' : 'status'"
    >
      {{ message.text }}
    </div>

    <!-- Account details -->
    <div class="user-profile__section">
      <h3 class="user-profile__section-title">Account</h3>
      <div class="user-profile__details">
        <div class="user-profile__detail">
          <span class="user-profile__detail-label">Role:</span>
          <span class="user-profile__detail-value">{{ user.role }}</span>
        </div>
        <div class="user-profile__detail">
          <span class="user-profile__detail-label">Member since:</span>
          <span class="user-profile__detail-value">
            {{ new Date(user.createdAt).toLocaleDateString() }}
          </span>
        </div>
        <div v-if="user.lastLoginAt" class="user-profile__detail">
          <span class="user-profile__detail-label">Last login:</span>
          <span class="user-profile__detail-value">
            {{ new Date(user.lastLoginAt).toLocaleString() }}
          </span>
        </div>
      </div>
    </div>

    <!-- Preferences section -->
    <div class="user-profile__section">
      <h3 class="user-profile__section-title">Preferences</h3>

      <div class="user-profile__preference">
        <label for="pref-theme" class="user-profile__pref-label">Theme</label>
        <select
          id="pref-theme"
          :value="preferences.theme"
          class="user-profile__select"
          @change="
            handleUpdatePreferences({
              theme: ($event.target as HTMLSelectElement).value as UserPreferences['theme'],
            })
          "
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>

      <div class="user-profile__preference">
        <label for="pref-language" class="user-profile__pref-label">Language</label>
        <select
          id="pref-language"
          :value="preferences.language"
          class="user-profile__select"
          @change="
            handleUpdatePreferences({
              language: ($event.target as HTMLSelectElement).value,
            })
          "
        >
          <option value="en">English</option>
          <option value="ru">Russian</option>
        </select>
      </div>

      <div class="user-profile__preference user-profile__preference--checkbox">
        <input
          id="pref-hints"
          type="checkbox"
          :checked="preferences.showHints"
          class="user-profile__checkbox"
          @change="
            handleUpdatePreferences({
              showHints: ($event.target as HTMLInputElement).checked,
            })
          "
        />
        <label for="pref-hints" class="user-profile__pref-label"> Show tooltips and hints </label>
      </div>

      <div class="user-profile__preference user-profile__preference--checkbox">
        <input
          id="pref-autosave"
          type="checkbox"
          :checked="preferences.autosave"
          class="user-profile__checkbox"
          @change="
            handleUpdatePreferences({
              autosave: ($event.target as HTMLInputElement).checked,
            })
          "
        />
        <label for="pref-autosave" class="user-profile__pref-label">
          Auto-save configurations
        </label>
      </div>
    </div>

    <!-- Sign out button -->
    <div class="user-profile__actions">
      <button
        type="button"
        class="user-profile__button user-profile__button--danger"
        @click="handleSignOut"
      >
        Sign Out
      </button>
    </div>
  </div>
</template>
