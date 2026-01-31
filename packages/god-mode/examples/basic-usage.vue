<!--
  Basic Usage Example for @isocubic/god-mode

  Demonstrates how to integrate GOD MODE into a Vue.js 3.0 application.

  TASK 66: Migrate GOD MODE to Vue.js 3.0 (Phase 10)
-->

<script setup lang="ts">
import { computed } from 'vue'
import { provideGodMode } from '../src'
import type { ComponentRegistry, GodModeConfig } from '../src'

// ============================================================================
// Component Registry (optional)
// ============================================================================

const myComponentRegistry: ComponentRegistry = {
  getAllComponents: () => [
    {
      id: 'header',
      name: 'Header',
      description: 'Application header with navigation',
      category: 'layout',
      tags: ['navigation', 'header'],
    },
    {
      id: 'sidebar',
      name: 'Sidebar',
      description: 'Side navigation panel',
      category: 'layout',
      tags: ['navigation', 'sidebar'],
    },
    {
      id: 'user-profile',
      name: 'UserProfile',
      description: 'User profile card with avatar',
      category: 'user',
      tags: ['user', 'profile', 'avatar'],
    },
  ],
  searchComponents: (query: string) => {
    const all = myComponentRegistry.getAllComponents()
    const lower = query.toLowerCase()
    return all.filter(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        c.description.toLowerCase().includes(lower) ||
        c.tags?.some((t) => t.includes(lower))
    )
  },
}

// Suppress unused variable warning for example registry
void myComponentRegistry

// ============================================================================
// GOD MODE Configuration
// ============================================================================

const godModeConfig: GodModeConfig = {
  github: {
    owner: 'my-org',
    repo: 'my-app',
    defaultLabels: ['from-god-mode'],
  },
  preferredLanguage: 'en',
  tabs: ['conversation', 'issues', 'search'],
  storageKeyPrefix: 'my_app_god_mode',
  persistState: true,
  shortcuts: {
    toggleWindow: 'Ctrl+Shift+G',
  },
}

// ============================================================================
// Provide GOD MODE context
// ============================================================================

const godMode = provideGodMode(godModeConfig)

// ============================================================================
// Toggle Button State
// ============================================================================

const isVisible = computed(() => godMode.isVisible)
const isPinned = computed(() => godMode.windowState.isPinned)

function handleToggle() {
  godMode.toggleWindow()
}

const toggleButtonStyle = computed(() => ({
  position: 'fixed' as const,
  bottom: '20px',
  right: '20px',
  padding: '12px 20px',
  backgroundColor: isVisible.value ? '#8b5cf6' : '#1f2937',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  zIndex: 10000,
  fontSize: '14px',
  fontWeight: 600,
}))
</script>

<template>
  <div style="padding: 20px">
    <h1>My Application</h1>
    <p>Press Ctrl+Shift+G or click the button to open GOD MODE.</p>

    <!-- Your application content -->
    <main>
      <p>Application content goes here...</p>
    </main>

    <!-- GOD MODE toggle button -->
    <button :style="toggleButtonStyle" @click="handleToggle">
      {{ isVisible ? 'Close' : 'Open' }} GOD MODE
      {{ isPinned ? ' (Pinned)' : '' }}
    </button>
  </div>
</template>
