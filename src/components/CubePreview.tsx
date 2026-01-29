/**
 * CubePreview Component
 * React Three Fiber component for interactive 3D visualization of parametric cubes
 *
 * TASK 40: Added component metadata for Developer Mode support (Phase 6)
 *
 * Features:
 * - Interactive camera controls (orbit, zoom, pan)
 * - Configurable lighting system
 * - Grid for spatial orientation
 * - Responsive viewport handling
 * - Touch gesture support for mobile devices
 * - Developer Mode metadata for self-documentation
 */

import { Suspense, useRef, useState, useCallback, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Environment, ContactShadows } from '@react-three/drei'
import type { OrbitControls as OrbitControlsType } from 'three-stdlib'
import { ParametricCube } from './ParametricCube'
import type { SpectralCube } from '../types/cube'
import type { ComponentMeta } from '../types/component-meta'
import { registerComponentMeta } from '../types/component-meta'
import { ComponentInfo } from './ComponentInfo'
import { useIsDevModeEnabled } from '../lib/devmode'

/**
 * Component metadata for Developer Mode
 */
export const CUBE_PREVIEW_META: ComponentMeta = {
  id: 'cube-preview',
  name: 'CubePreview',
  version: '1.1.0',
  summary: 'Interactive 3D preview canvas for parametric cubes using React Three Fiber.',
  description:
    'CubePreview is the main 3D visualization component for isocubic. It renders parametric cubes ' +
    'using Three.js via React Three Fiber with interactive OrbitControls for camera manipulation. ' +
    'The component includes configurable lighting (ambient, directional, point), an optional grid floor ' +
    'for spatial orientation, contact shadows for depth perception, and environment reflections. ' +
    'It is fully responsive and supports touch gestures on mobile devices.',
  phase: 1,
  taskId: 'TASK 1',
  filePath: 'components/CubePreview.tsx',
  history: [
    {
      version: '1.0.0',
      date: '2026-01-28T12:00:00Z',
      description: 'Initial implementation with Three.js canvas and OrbitControls',
      taskId: 'TASK 1',
      type: 'created',
    },
    {
      version: '1.0.1',
      date: '2026-01-28T14:00:00Z',
      description: 'Added touch gesture support for mobile devices',
      taskId: 'TASK 1',
      type: 'updated',
    },
    {
      version: '1.1.0',
      date: '2026-01-29T21:00:00Z',
      description: 'Added Developer Mode metadata support for self-documentation',
      taskId: 'TASK 40',
      type: 'updated',
    },
  ],
  features: [
    {
      id: 'orbit-controls',
      name: 'Orbit Controls',
      description: 'Interactive camera controls with orbit, zoom, and pan capabilities',
      enabled: true,
      taskId: 'TASK 1',
    },
    {
      id: 'lighting-system',
      name: 'Configurable Lighting',
      description: 'Multi-light setup with ambient, directional, and point lights',
      enabled: true,
      taskId: 'TASK 1',
    },
    {
      id: 'grid-floor',
      name: 'Grid Floor',
      description: 'Optional infinite grid for spatial orientation',
      enabled: true,
      taskId: 'TASK 1',
    },
    {
      id: 'contact-shadows',
      name: 'Contact Shadows',
      description: 'Soft shadows beneath the cube for depth perception',
      enabled: true,
      taskId: 'TASK 1',
    },
    {
      id: 'responsive-viewport',
      name: 'Responsive Viewport',
      description: 'Automatically resizes with container using ResizeObserver',
      enabled: true,
      taskId: 'TASK 1',
    },
    {
      id: 'touch-support',
      name: 'Touch Gesture Support',
      description: 'Mobile-friendly touch gestures for rotation and zoom',
      enabled: true,
      taskId: 'TASK 1',
    },
  ],
  dependencies: [
    { name: '@react-three/fiber', type: 'external', purpose: 'React renderer for Three.js' },
    { name: '@react-three/drei', type: 'external', purpose: 'Useful helpers for R3F' },
    {
      name: 'ParametricCube',
      type: 'component',
      path: 'components/ParametricCube.tsx',
      purpose: 'Renders the parametric cube mesh',
    },
  ],
  relatedFiles: [
    {
      path: 'components/CubePreview.test.tsx',
      type: 'test',
      description: 'Unit tests for CubePreview',
    },
    {
      path: 'components/ParametricCube.tsx',
      type: 'component',
      description: 'The cube mesh component',
    },
    {
      path: 'shaders/parametric-cube.ts',
      type: 'util',
      description: 'GLSL shader for cube rendering',
    },
  ],
  props: [
    {
      name: 'config',
      type: 'SpectralCube | null',
      required: true,
      description: 'Cube configuration to display',
    },
    {
      name: 'showGrid',
      type: 'boolean',
      required: false,
      defaultValue: 'true',
      description: 'Whether to show the grid floor',
    },
    {
      name: 'animate',
      type: 'boolean',
      required: false,
      defaultValue: 'false',
      description: 'Enable rotation animation',
    },
    {
      name: 'rotationSpeed',
      type: 'number',
      required: false,
      defaultValue: '0.5',
      description: 'Animation speed in rad/s',
    },
    {
      name: 'showShadows',
      type: 'boolean',
      required: false,
      defaultValue: 'true',
      description: 'Show contact shadows',
    },
    {
      name: 'backgroundColor',
      type: 'string',
      required: false,
      defaultValue: '#1a1a1a',
      description: 'Background color',
    },
  ],
  tips: [
    'Use mouse drag to orbit, scroll to zoom, right-click drag to pan',
    'On touch devices: one finger to rotate, two fingers to zoom and pan',
    'Enable animate prop for a rotating showcase effect',
  ],
  tags: ['3d', 'preview', 'three.js', 'webgl', 'visualization', 'phase-1'],
  status: 'stable',
  lastUpdated: '2026-01-29T21:00:00Z',
}

// Register metadata in the global registry
registerComponentMeta(CUBE_PREVIEW_META)

/**
 * Props for the CubePreview component
 */
export interface CubePreviewProps {
  /** SpectralCube configuration to display */
  config: SpectralCube | null
  /** Whether to show the grid */
  showGrid?: boolean
  /** Whether to enable cube rotation animation */
  animate?: boolean
  /** Animation rotation speed (radians per second) */
  rotationSpeed?: number
  /** Whether to show contact shadows */
  showShadows?: boolean
  /** Background color (CSS color string) */
  backgroundColor?: string
  /** Additional class name for the container */
  className?: string
  /** Callback when controls change (camera moved) */
  onControlsChange?: () => void
}

/**
 * Lighting configuration props
 */
interface LightingProps {
  /** Ambient light intensity */
  ambientIntensity?: number
  /** Directional light intensity */
  directionalIntensity?: number
  /** Point light intensity (0 to disable) */
  pointIntensity?: number
}

/**
 * Scene lighting setup component
 */
function SceneLighting({
  ambientIntensity = 0.4,
  directionalIntensity = 0.8,
  pointIntensity = 0.3,
}: LightingProps) {
  return (
    <>
      {/* Ambient light for base illumination */}
      <ambientLight intensity={ambientIntensity} />

      {/* Main directional light (sun-like) */}
      <directionalLight
        position={[5, 8, 5]}
        intensity={directionalIntensity}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={20}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />

      {/* Secondary directional light for fill */}
      <directionalLight position={[-3, 4, -3]} intensity={directionalIntensity * 0.3} />

      {/* Optional point light for highlights */}
      {pointIntensity > 0 && (
        <pointLight position={[2, 3, 2]} intensity={pointIntensity} color="#fff5e0" />
      )}
    </>
  )
}

/**
 * Grid floor component for spatial orientation
 */
function GridFloor() {
  return (
    <Grid
      position={[0, -0.5, 0]}
      args={[10, 10]}
      cellSize={0.5}
      cellThickness={0.5}
      cellColor="#404040"
      sectionSize={2}
      sectionThickness={1}
      sectionColor="#606060"
      fadeDistance={10}
      fadeStrength={1}
      followCamera={false}
      infiniteGrid={true}
    />
  )
}

/**
 * Loading fallback component
 */
function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#666" wireframe />
    </mesh>
  )
}

/**
 * Inner scene component containing 3D elements
 */
function CubeScene({
  config,
  showGrid,
  animate,
  rotationSpeed,
  showShadows,
  onControlsChange,
}: Omit<CubePreviewProps, 'backgroundColor' | 'className'>) {
  const controlsRef = useRef<OrbitControlsType>(null)

  return (
    <>
      {/* Lighting */}
      <SceneLighting />

      {/* Environment for reflections (subtle) */}
      <Environment preset="city" />

      {/* Camera controls */}
      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={1}
        maxDistance={10}
        minPolarAngle={0}
        maxPolarAngle={Math.PI * 0.85}
        dampingFactor={0.05}
        enableDamping={true}
        onChange={onControlsChange}
        // Touch-friendly settings
        touches={{
          ONE: 1, // ROTATE
          TWO: 2, // DOLLY_PAN
        }}
      />

      {/* Grid for orientation */}
      {showGrid && <GridFloor />}

      {/* Contact shadows */}
      {showShadows && (
        <ContactShadows position={[0, -0.499, 0]} opacity={0.4} scale={5} blur={2} far={2} />
      )}

      {/* Parametric cube */}
      <Suspense fallback={<LoadingFallback />}>
        {config && (
          <ParametricCube
            config={config}
            position={[0, 0, 0]}
            animate={animate}
            rotationSpeed={rotationSpeed}
          />
        )}
      </Suspense>
    </>
  )
}

/**
 * CubePreview - Interactive 3D preview component for parametric cubes
 *
 * Provides an interactive Three.js canvas with:
 * - OrbitControls for camera manipulation
 * - Configurable lighting system
 * - Optional grid for spatial orientation
 * - Responsive resizing
 * - Touch gesture support
 *
 * @example
 * ```tsx
 * <CubePreview
 *   config={cubeConfig}
 *   showGrid={true}
 *   animate={false}
 *   showShadows={true}
 * />
 * ```
 */
export function CubePreview({
  config,
  showGrid = true,
  animate = false,
  rotationSpeed = 0.5,
  showShadows = true,
  backgroundColor = '#1a1a1a',
  className = '',
  onControlsChange,
}: CubePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  // Handle container resize
  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect()
      setDimensions({ width, height })
    }
  }, [])

  // Setup resize observer
  useEffect(() => {
    updateDimensions()

    const resizeObserver = new ResizeObserver(updateDimensions)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [updateDimensions])

  // Check if DevMode is enabled for ComponentInfo wrapper
  const isDevModeEnabled = useIsDevModeEnabled()

  const previewContent = (
    <div
      ref={containerRef}
      className={`cube-preview ${className}`}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '200px',
        background: backgroundColor,
        borderRadius: '8px',
        overflow: 'hidden',
        touchAction: 'none', // Prevent browser handling of touch events
      }}
      data-testid="cube-preview"
    >
      {dimensions.width > 0 && dimensions.height > 0 && (
        <Canvas
          camera={{
            position: [2, 2, 2],
            fov: 50,
            near: 0.1,
            far: 100,
          }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
          }}
          dpr={[1, 2]} // Responsive pixel ratio
          style={{ width: '100%', height: '100%' }}
        >
          <color attach="background" args={[backgroundColor]} />
          <CubeScene
            config={config}
            showGrid={showGrid}
            animate={animate}
            rotationSpeed={rotationSpeed}
            showShadows={showShadows}
            onControlsChange={onControlsChange}
          />
        </Canvas>
      )}

      {/* Placeholder when no config */}
      {!config && (
        <div
          className="cube-preview__placeholder"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666',
            fontSize: '0.875rem',
          }}
        >
          <p>Select a cube to preview</p>
        </div>
      )}
    </div>
  )

  return isDevModeEnabled ? (
    <ComponentInfo meta={CUBE_PREVIEW_META}>{previewContent}</ComponentInfo>
  ) : (
    previewContent
  )
}

export default CubePreview
