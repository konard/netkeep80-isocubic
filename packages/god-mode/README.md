# @isocubic/god-mode

GOD MODE — unified floating DevMode window with AI conversation, GitHub issue generation, screen capture & annotations for React applications.

## Features

- **Floating DevMode Window** — draggable, resizable window with tabbed interface
- **AI Conversation Agent** — natural language dialog for discussing improvements
- **Issue Draft Generator** — automatic GitHub issue creation from conversations
- **Screen Capture & Annotation** — screenshot capture with drawing tools
- **GitHub Integration** — OAuth/PAT auth, issue creation, label management
- **Keyboard Shortcuts** — Ctrl+Shift+G to toggle, fully configurable
- **localStorage Persistence** — window state, conversations, drafts saved between sessions
- **Multi-language** — Russian and English UI support
- **Configurable** — storage key prefix, tabs, shortcuts, component registry

## Installation

```bash
npm install @isocubic/god-mode
```

## Quick Start

```tsx
import { GodModeProvider, useGodMode } from '@isocubic/god-mode'

function App() {
  return (
    <GodModeProvider
      config={{
        github: { owner: 'my-org', repo: 'my-repo' },
        preferredLanguage: 'en',
        storageKeyPrefix: 'my_app',
        tabs: ['conversation', 'issues'],
      }}
    >
      <MyApp />
    </GodModeProvider>
  )
}

function ToggleButton() {
  const { toggleWindow, isVisible } = useGodMode()
  return (
    <button onClick={toggleWindow}>
      {isVisible ? 'Close' : 'Open'} GOD MODE
    </button>
  )
}
```

## Configuration

### GodModeConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `github` | `{ owner, repo, defaultLabels? }` | — | GitHub repository for issue creation |
| `position` | `WindowPosition` | `{ x: 20, y: 80, anchor: 'top-right' }` | Initial window position |
| `size` | `Partial<WindowSize>` | `500x600` | Initial window size |
| `tabs` | `GodModeTab[]` | `['query', 'context', 'search']` | Visible tabs |
| `shortcuts` | `Partial<KeyboardShortcuts>` | `{ toggleWindow: 'Ctrl+Shift+G' }` | Keyboard shortcuts |
| `preferredLanguage` | `'ru' \| 'en'` | `'ru'` | UI language |
| `persistState` | `boolean` | `true` | Save state to localStorage |
| `storageKeyPrefix` | `string` | `'god_mode'` | localStorage key prefix |

### Component Registry

To connect your application's component metadata with GOD MODE:

```tsx
import type { ComponentRegistry } from '@isocubic/god-mode'

const myRegistry: ComponentRegistry = {
  getAllComponents: () => [
    { id: 'button', name: 'Button', description: 'Primary button component' },
    { id: 'modal', name: 'Modal', description: 'Modal dialog component' },
  ],
  searchComponents: (query) =>
    myComponents.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())),
}
```

## API Reference

### Components

- `GodModeProvider` — React Context Provider for state management
- `useGodMode()` — Hook to access GOD MODE state and actions

### Types

- `GodModeConfig` — Configuration options
- `GodModeWindowState` — Window state (position, size, tab, pin)
- `GodModeTab` — Tab identifiers: `'query' | 'context' | 'search' | 'conversation' | 'issues'`
- `ConversationMessage` — Chat message structure
- `ConversationSession` — Conversation session with history
- `IssueDraft` — GitHub issue draft structure
- `IssueTemplate` — Structured issue template
- `ComponentMeta` — Component metadata for AI context
- `ComponentRegistry` — Interface for providing component metadata

### Utility Functions

- `loadGodModeState(prefix?)` — Load window state from localStorage
- `saveGodModeState(state, prefix?)` — Save window state
- `createMessage(role, content, context?)` — Create conversation message
- `createSession(language?)` — Create new conversation session
- `createIssueDraft(overrides?)` — Create issue draft with defaults
- `validateIssueDraft(draft)` — Validate draft structure
- `matchesShortcut(event, shortcut)` — Check keyboard shortcut match
- `detectLanguage(text)` — Detect Russian/English text language

## License

Unlicense
