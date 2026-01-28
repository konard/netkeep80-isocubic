/**
 * EnergyCube Component
 * React Three Fiber component for rendering energy-based cubes with FFT visualization
 *
 * This component visualizes magical/energy objects using FFT-based wave function
 * reconstruction. It supports:
 * - Real-time animation of energy pulsation
 * - Multiple visualization modes (energy density, amplitude, phase)
 * - Glow and emission effects
 * - Fracture visualization at high energies
 */

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  vertexShader,
  fragmentShader,
  createEnergyUniforms,
  type EnergyCubeConfig,
  type VisualizationMode,
  ChannelMask,
} from '../shaders/energy-cube'

/**
 * Props for the EnergyCube component
 */
export interface EnergyCubeProps {
  /** Energy cube configuration with FFT coefficients */
  config: EnergyCubeConfig
  /** Position in 3D space [x, y, z] */
  position?: [number, number, number]
  /** Scale multiplier */
  scale?: number
  /** Whether to animate the energy pulsation */
  animate?: boolean
  /** Animation speed multiplier (default 1.0) */
  animationSpeed?: number
  /** Whether to also rotate the cube during animation */
  rotate?: boolean
  /** Rotation speed (radians per second) */
  rotationSpeed?: number
  /** Grid position for seamless stitching [x, y, z] */
  gridPosition?: [number, number, number]
  /** Visualization mode: 'energy', 'amplitude', or 'phase' */
  visualizationMode?: VisualizationMode
  /** Channel mask (use ChannelMask.R, ChannelMask.RGB, etc.) */
  channelMask?: number
  /** Energy scale factor for visualization intensity */
  energyScale?: number
  /** Glow intensity [0.0, 2.0] */
  glowIntensity?: number
}

/**
 * EnergyCube - Renders an energy-based cube using FFT wave function visualization
 *
 * Features:
 * - Real-time wave function reconstruction from FFT coefficients
 * - Energy density visualization (E = |psi|^2)
 * - Animated pulsation with time-based phase evolution
 * - Glow effects based on energy intensity
 * - Fracture visualization when energy exceeds thresholds
 * - Seamless boundary stitching for cube grids
 *
 * @example
 * ```tsx
 * import { EnergyCube } from './components/EnergyCube'
 * import { createMagicCrystalConfig } from '../shaders/energy-cube'
 *
 * function Scene() {
 *   const config = createMagicCrystalConfig()
 *   return (
 *     <EnergyCube
 *       config={config}
 *       animate={true}
 *       glowIntensity={1.0}
 *     />
 *   )
 * }
 * ```
 */
export function EnergyCube({
  config,
  position = [0, 0, 0],
  scale = 1,
  animate = true,
  animationSpeed = 1.0,
  rotate = false,
  rotationSpeed = 0.5,
  gridPosition = [0, 0, 0],
  visualizationMode = 'energy',
  channelMask = ChannelMask.RGBA,
  energyScale = 1.0,
  glowIntensity = 0.5,
}: EnergyCubeProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial | null>(null)

  // Create shader material with uniforms derived from config
  // The material is recreated when config or options change
  const shaderMaterial = useMemo(() => {
    const initialUniforms = createEnergyUniforms(config, {
      gridPosition,
      time: 0,
      visualizationMode,
      channelMask,
      energyScale,
      glowIntensity,
    })

    // Convert plain uniforms to THREE.IUniform format
    const threeUniforms: Record<string, THREE.IUniform> = {}
    for (const [key, uniform] of Object.entries(initialUniforms)) {
      if (
        key === 'uDCAmplitude' ||
        key === 'uDCPhase' ||
        key === 'uLightDirection' ||
        key === 'uLightColor' ||
        key === 'uGridPosition'
      ) {
        // Convert arrays to Vector4/Vector3
        const arr = uniform.value as number[]
        if (arr.length === 4) {
          threeUniforms[key] = { value: new THREE.Vector4(arr[0], arr[1], arr[2], arr[3]) }
        } else {
          threeUniforms[key] = { value: new THREE.Vector3(arr[0], arr[1], arr[2]) }
        }
      } else if (key.startsWith('uCoeff') && key.endsWith('FreqZ')) {
        // Keep frequency arrays as-is
        threeUniforms[key] = uniform
      } else if (key.startsWith('uCoeff') && !key.includes('Count')) {
        // Convert coefficient arrays to Vector4 arrays
        const coeffArr = uniform.value as number[][]
        threeUniforms[key] = {
          value: coeffArr.map((c) => new THREE.Vector4(c[0], c[1], c[2], c[3])),
        }
      } else {
        threeUniforms[key] = uniform
      }
    }

    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: threeUniforms,
      transparent: true,
      side: THREE.FrontSide,
      depthWrite: true,
      blending: THREE.NormalBlending,
    })
  }, [config, gridPosition, visualizationMode, channelMask, energyScale, glowIntensity])

  // Store material in ref after creation for animation access
  useEffect(() => {
    materialRef.current = shaderMaterial
  }, [shaderMaterial])

  // Animation frame for time updates and rotation
  useFrame((_, delta) => {
    // Update time uniform for animation
    if (animate && materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta * animationSpeed
    }

    // Optional rotation
    if (rotate && meshRef.current) {
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
