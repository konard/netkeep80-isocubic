/**
 * Basic Usage Example for @isocubic/god-mode
 *
 * Demonstrates how to integrate GOD MODE into a React application.
 */

import { GodModeProvider, useGodMode } from '../src'
import type { ComponentRegistry, GodModeConfig } from '../src'

// 1. Define your component registry (optional)
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

// 2. Configure GOD MODE
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

// 3. GOD MODE Toggle Button component
function GodModeToggle() {
  const { toggleWindow, isVisible, windowState } = useGodMode()

  return (
    <button
      onClick={toggleWindow}
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        padding: '12px 20px',
        backgroundColor: isVisible ? '#8b5cf6' : '#1f2937',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        zIndex: 10000,
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      {isVisible ? 'Close' : 'Open'} GOD MODE
      {windowState.isPinned && ' (Pinned)'}
    </button>
  )
}

// 4. Wrap your app with GodModeProvider
export function App() {
  return (
    <GodModeProvider config={godModeConfig}>
      <div style={{ padding: 20 }}>
        <h1>My Application</h1>
        <p>Press Ctrl+Shift+G or click the button to open GOD MODE.</p>

        {/* Your application content */}
        <main>
          <p>Application content goes here...</p>
        </main>

        {/* GOD MODE toggle button */}
        <GodModeToggle />
      </div>
    </GodModeProvider>
  )
}

// Suppress unused variable warning for example registry
void myComponentRegistry
