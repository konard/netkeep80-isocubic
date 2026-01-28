# isocubic API Documentation

This document provides API reference for the main components and modules in isocubic.

---

## Table of Contents

1. [Components](#components)
   - [Gallery](#gallery)
   - [ExportPanel](#exportpanel)
   - [App](#app)
2. [Types](#types)
   - [SpectralCube](#spectralcube)
3. [Library Modules](#library-modules)
   - [validation.ts](#validationts)
   - [storage.ts](#storagets)
   - [performance.ts](#performancets)

---

## Components

### Gallery

A component for displaying and selecting cube presets with filtering and search capabilities.

#### Import

```tsx
import { Gallery } from './components/Gallery'
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onCubeSelect` | `(cube: SpectralCube) => void` | `undefined` | Callback when a cube is selected from the gallery |
| `currentCube` | `SpectralCube \| null` | `undefined` | Current cube for saving to gallery |
| `className` | `string` | `''` | Custom CSS class name |

#### Features

- **View Modes**: Toggle between preset cubes and user-saved cubes
- **Category Filtering**: Filter by material type (Stone, Wood, Metal, Organic, Crystal, Liquid)
- **Search**: Search cubes by name, tags, or prompt
- **Tag Suggestions**: Shows matching tags while searching
- **Save to Gallery**: Save current cube to user's collection

#### Example

```tsx
function MyComponent() {
  const [currentCube, setCurrentCube] = useState<SpectralCube | null>(null)

  return (
    <Gallery
      onCubeSelect={(cube) => setCurrentCube(cube)}
      currentCube={currentCube}
      className="my-gallery"
    />
  )
}
```

---

### ExportPanel

A component for managing cube configuration export/import and undo/redo functionality.

#### Import

```tsx
import { ExportPanel } from './components/ExportPanel'
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `currentCube` | `SpectralCube \| null` | - | Current cube configuration |
| `onCubeLoad` | `(cube: SpectralCube) => void` | `undefined` | Callback when a cube is loaded/imported |
| `onCubeChange` | `(cube: SpectralCube) => void` | `undefined` | Callback when cube changes via undo/redo |
| `className` | `string` | `''` | Custom CSS class name |

#### Features

- **Export**: Download cube configuration as JSON file
- **Import**: Upload JSON file to load cube configuration
- **Save**: Save to browser localStorage
- **Saved Configs List**: View, load, and delete saved configurations
- **Undo/Redo**: Navigate through edit history

#### Example

```tsx
function MyComponent() {
  const [cube, setCube] = useState<SpectralCube | null>(null)

  return (
    <ExportPanel
      currentCube={cube}
      onCubeLoad={(loadedCube) => setCube(loadedCube)}
      onCubeChange={(changedCube) => setCube(changedCube)}
    />
  )
}
```

---

### App

The main application component with responsive layouts.

#### Layouts

| Device | Breakpoint | Layout |
|--------|------------|--------|
| Mobile | < 768px | Tab navigation with swipeable panels |
| Tablet | 768px - 1024px | Preview top, gallery and tools side by side |
| Desktop | > 1024px | Gallery left, preview and tools right |

---

## Types

### SpectralCube

The main type representing a parametric cube configuration.

#### Import

```tsx
import type { SpectralCube } from './types/cube'
import { createDefaultCube, CUBE_DEFAULTS } from './types/cube'
```

#### Structure

```typescript
interface SpectralCube {
  /** Unique identifier (pattern: ^[a-z0-9_]+$) */
  id: string

  /** Text prompt used for generation (optional) */
  prompt?: string

  /** Base material properties */
  base: {
    /** RGB color [0-1, 0-1, 0-1] */
    color: [number, number, number]
    /** Surface roughness [0-1] (default: 0.5) */
    roughness?: number
    /** Transparency [0-1] (default: 1.0, fully opaque) */
    transparency?: number
  }

  /** Array of gradient configurations (optional) */
  gradients?: Array<{
    /** Gradient axis: 'x' | 'y' | 'z' | 'radial' */
    axis: GradientAxis
    /** Gradient strength [0-1] */
    factor: number
    /** Color shift RGB [-1,1] */
    color_shift: [number, number, number]
  }>

  /** Noise configuration (optional) */
  noise?: {
    /** Noise type: 'perlin' | 'worley' | 'crackle' */
    type: NoiseType
    /** Noise scale (default: 1.0) */
    scale?: number
    /** Number of octaves (default: 1) */
    octaves?: number
    /** Octave persistence (default: 0.5) */
    persistence?: number
    /** Application mask (default: 'all') */
    mask?: string
  }

  /** Physical properties (optional) */
  physics?: {
    /** Material type */
    material?: MaterialType
    /** Density in g/cm³ (default: 1.0) */
    density?: number
    /** Break pattern */
    break_pattern?: BreakPattern
  }

  /** Metadata (optional) */
  meta?: {
    /** Display name */
    name?: string
    /** Tags for search */
    tags?: string[]
    /** Author name */
    author?: string
    /** Creation timestamp (ISO 8601) */
    created?: string
    /** Last modified timestamp (ISO 8601) */
    modified?: string
  }
}
```

#### Helper Functions

```typescript
/** Create a default cube with given ID */
function createDefaultCube(id: string): SpectralCube

/** Default values for optional properties */
const CUBE_DEFAULTS: {
  roughness: 0.5
  transparency: 1.0
  noiseScale: 1.0
  noiseOctaves: 1
  noisePersistence: 0.5
  noiseMask: 'all'
  density: 1.0
}
```

---

## Library Modules

### validation.ts

JSON Schema validation for SpectralCube configurations.

#### Import

```typescript
import {
  validateCube,
  validateAndParseCube,
  isValidCube,
  formatValidationErrors,
  type ValidationResult,
  type ValidationError
} from './lib/validation'
```

#### Functions

##### `validateCube(cube: unknown): ValidationResult`

Validates a cube configuration against the JSON schema.

```typescript
const result = validateCube({ id: 'test', base: { color: [0.5, 0.5, 0.5] } })
if (result.valid) {
  console.log('Valid cube!')
} else {
  console.error('Errors:', result.errors)
}
```

##### `validateAndParseCube(cube: unknown): SpectralCube`

Validates and returns a typed SpectralCube. Throws if invalid.

```typescript
try {
  const cube = validateAndParseCube(data)
  // cube is typed as SpectralCube
} catch (error) {
  console.error('Invalid configuration:', error.message)
}
```

##### `isValidCube(cube: unknown): cube is SpectralCube`

Type guard function.

```typescript
if (isValidCube(data)) {
  // data is now typed as SpectralCube
}
```

##### `formatValidationErrors(errors: ValidationError[]): string`

Formats validation errors for display.

---

### storage.ts

Storage management for cube configurations.

#### Import

```typescript
import {
  // LocalStorage functions
  saveCubeToStorage,
  loadCubeFromStorage,
  getAllConfigsFromStorage,
  getSavedCubesList,
  deleteCubeFromStorage,
  clearAllConfigs,

  // Current cube state
  saveCurrentCube,
  loadCurrentCube,
  clearCurrentCube,

  // File I/O
  exportCubeToFile,
  exportCubesToFile,
  importCubeFromFile,
  importCubesFromFile,
  triggerFileInput,

  // History (Undo/Redo)
  getHistoryState,
  pushToHistory,
  undo,
  redo,
  canUndo,
  canRedo,
  clearHistory,
  initializeHistory,

  // Autosave
  AutosaveManager,
  createAutosaveManager,

  // Types
  type StoredConfig,
  type HistoryState,
  type ImportResult,
  StorageError
} from './lib/storage'
```

#### LocalStorage Functions

```typescript
// Save cube to localStorage
saveCubeToStorage(cube: SpectralCube): void

// Load cube by ID
loadCubeFromStorage(id: string): SpectralCube | null

// Get all saved configs
getAllConfigsFromStorage(): Record<string, StoredConfig>

// Get list sorted by date
getSavedCubesList(): StoredConfig[]

// Delete cube
deleteCubeFromStorage(id: string): boolean

// Clear all
clearAllConfigs(): void
```

#### History Functions (Undo/Redo)

```typescript
// Push state to history
pushToHistory(cube: SpectralCube): void

// Undo - returns previous state or null
undo(): SpectralCube | null

// Redo - returns next state or null
redo(): SpectralCube | null

// Check availability
canUndo(): boolean
canRedo(): boolean
```

#### AutosaveManager

```typescript
const manager = new AutosaveManager(500) // 500ms debounce

// Schedule debounced save
manager.schedule(cube, true) // true = push to history

// Save immediately
manager.saveNow(cube, true)

// Cancel pending save
manager.cancel()
```

---

### performance.ts

Performance utilities for mobile optimization.

#### Import

```typescript
import {
  throttle,
  debounce,
  detectDeviceCapabilities,
  getRecommendedQuality,
  getRenderingSettings,
  FrameRateMonitor,
  lazyLoad,
  requestIdleCallback,
  cancelIdleCallback,
  type DeviceCapabilities,
  type QualityLevel,
  type RenderingSettings
} from './lib/performance'
```

#### Functions

##### `throttle<T>(func: T, limit: number): T`

Throttles function execution.

```typescript
const throttledUpdate = throttle(updateShader, 16) // ~60 FPS max
```

##### `debounce<T>(func: T, wait: number): T`

Debounces function execution.

```typescript
const debouncedSave = debounce(saveChanges, 500)
```

##### `detectDeviceCapabilities(): DeviceCapabilities`

Detects device capabilities for performance optimization.

```typescript
const caps = detectDeviceCapabilities()
console.log(caps.isLowEnd) // boolean
console.log(caps.recommendedResolution) // 0.5-1.0
```

##### `getRecommendedQuality(caps: DeviceCapabilities): QualityLevel`

Returns recommended quality level ('low' | 'medium' | 'high').

##### `getRenderingSettings(quality: QualityLevel): RenderingSettings`

Returns rendering settings for quality level.

```typescript
const settings = getRenderingSettings('medium')
// { resolutionScale: 0.75, noiseOctaves: 3, ... }
```

##### `FrameRateMonitor`

Monitors frame rate for adaptive quality.

```typescript
const monitor = new FrameRateMonitor(60) // 60 sample window

// In animation loop
monitor.recordFrame()

// Check performance
if (monitor.isBelowThreshold(30)) {
  // Reduce quality
}
```

---

## Testing

All components and modules are fully tested. Run tests with:

```bash
npm test
```

Current test coverage:
- **176 tests** passing
- Unit tests for types, validation, storage, performance
- Integration tests for Gallery, ExportPanel components
- E2E tests for complete editing workflows
