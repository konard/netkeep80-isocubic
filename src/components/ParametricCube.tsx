/**
 * ParametricCube Component
 * React Three Fiber component for rendering parametric cubes with GLSL shaders
 */

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { vertexShader, fragmentShader } from '../shaders/parametric-cube'
import { createUniforms } from '../lib/shader-utils'
import type { SpectralCube } from '../types/cube'
import type { LODLevel, LODLevelSettings } from '../types/lod'

/**
 * Props for the ParametricCube component
 */
export interface ParametricCubeProps {
  /** SpectralCube configuration to render */
  config: SpectralCube
  /** Position in 3D space [x, y, z] */
  position?: [number, number, number]
  /** Scale multiplier (uniform) or [x, y, z] scale (per-axis) */
  scale?: number | [number, number, number]
  /** Whether to animate rotation */
  animate?: boolean
  /** Rotation speed (radians per second) */
  rotationSpeed?: number
  /** Grid position for seamless stitching [x, y, z] - used when rendering cube grids */
  gridPosition?: [number, number, number]
  /** LOD level to apply (0 = full detail, 4 = lowest detail) */
  lodLevel?: LODLevel
  /** Custom LOD settings (overrides defaults if provided) */
  lodSettings?: LODLevelSettings
}

/**
 * ParametricCube - Renders a parametric cube using GLSL shaders
 *
 * Features:
 * - Real-time rendering of cube configurations
 * - Support for gradients, noise, and material properties
 * - Seamless noise at cube boundaries via world coordinates
 * - Optional animation
 * - Grid position support for seamless boundary stitching in CubeGrid
 * - LOD (Level of Detail) support for performance optimization
 */
export function ParametricCube({
  config,
  position = [0, 0, 0],
  scale = 1,
  animate = false,
  rotationSpeed = 0.5,
  gridPosition = [0, 0, 0],
  lodLevel,
  lodSettings,
}: ParametricCubeProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  // Create shader material with uniforms derived from config
  // The material is recreated when config, gridPosition, or LOD settings change
  const shaderMaterial = useMemo(() => {
    const uniforms = createUniforms(config, {
      gridPosition,
      lodLevel,
      lodSettings,
    })

    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: (config.base.transparency ?? 1) < 1,
      side: THREE.FrontSide,
    })
  }, [config, gridPosition, lodLevel, lodSettings])

  // Animation frame for rotation
  useFrame((_, delta) => {
    if (animate && meshRef.current) {
      meshRef.current.rotation.y += rotationSpeed * delta
    }
  })

  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      <boxGeometry args={[1, 1, 1]} />
      <primitive object={shaderMaterial} attach="material" />
    </mesh>
  )
}
