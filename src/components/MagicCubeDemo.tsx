/**
 * MagicCubeDemo Component
 * Demonstration of magical cube interactions, energy transfer, and destruction effects
 *
 * This component showcases the FFT-based energy physics system by providing:
 * - Two interactive magical cubes with energy visualization
 * - Real-time energy transfer between cubes on click/touch
 * - Visual feedback for energy levels and fracture states
 * - Destruction effects when energy exceeds fracture threshold
 * - Chain reaction mechanics when cubes break
 *
 * @module MagicCubeDemo
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Html, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { EnergyCube } from './EnergyCube'
import {
  createMagicCrystalConfig,
  createUnstableCoreConfig,
  type EnergyCubeConfig,
} from '../shaders/energy-cube'
import {
  calculateTotalEnergy,
  applyEnergyTransfer,
  checkFracture,
  isNearFracture,
  applyCoherenceLoss,
  getNormalizedEnergy,
  type FractureCheckResult,
} from '../lib/energyPhysics'
import type { FFTCubeConfig, FFTChannel, FFTCoefficient } from '../types/cube'

/**
 * Converts EnergyCubeConfig to FFTCubeConfig for physics calculations
 */
function energyConfigToFFT(
  config: EnergyCubeConfig,
  id: string,
  currentEnergy?: number
): FFTCubeConfig {
  const convertChannel = (channel: EnergyCubeConfig['channelR']): FFTChannel | undefined => {
    if (!channel) return undefined
    return {
      dcAmplitude: channel.dcAmplitude,
      dcPhase: channel.dcPhase,
      coefficients: channel.coefficients.map(
        (c): FFTCoefficient => ({
          amplitude: c.amplitude,
          phase: c.phase,
          freqX: c.freqX,
          freqY: c.freqY,
          freqZ: c.freqZ,
        })
      ),
    }
  }

  const channels = {
    R: convertChannel(config.channelR),
    G: convertChannel(config.channelG),
    B: convertChannel(config.channelB),
    A: convertChannel(config.channelA),
  }

  // Calculate current energy from channels
  const calculatedEnergy =
    currentEnergy ??
    calculateTotalEnergy({
      id,
      is_magical: true,
      fft_size: 8,
      energy_capacity: config.energyCapacity ?? 100,
      channels,
    })

  return {
    id,
    is_magical: true,
    fft_size: 8,
    energy_capacity: config.energyCapacity ?? 100,
    current_energy: calculatedEnergy,
    channels,
    physics: {
      material: 'crystal',
      density: 3.0,
      break_pattern: 'shatter',
      coherence_loss: config.coherenceLoss ?? 0.01,
      fracture_threshold: config.fractureThreshold ?? 80,
    },
  }
}

/**
 * Converts FFTCubeConfig back to EnergyCubeConfig for rendering
 */
function fftToEnergyConfig(fft: FFTCubeConfig): EnergyCubeConfig {
  const convertChannel = (
    channel: FFTChannel | undefined
  ): EnergyCubeConfig['channelR'] | undefined => {
    if (!channel) return undefined
    return {
      dcAmplitude: channel.dcAmplitude,
      dcPhase: channel.dcPhase,
      coefficients: channel.coefficients.map((c) => ({
        amplitude: c.amplitude,
        phase: c.phase,
        freqX: c.freqX,
        freqY: c.freqY,
        freqZ: c.freqZ,
      })),
    }
  }

  return {
    channelR: convertChannel(fft.channels.R),
    channelG: convertChannel(fft.channels.G),
    channelB: convertChannel(fft.channels.B),
    channelA: convertChannel(fft.channels.A),
    energyCapacity: fft.energy_capacity,
    coherenceLoss: fft.physics?.coherence_loss ?? 0,
    fractureThreshold: fft.physics?.fracture_threshold ?? 0,
  }
}

/**
 * State for a magical cube in the demo
 */
interface MagicCubeState {
  id: string
  name: string
  fftConfig: FFTCubeConfig
  position: [number, number, number]
  fractured: boolean
  fractureTime?: number
  fragments: FragmentState[]
}

/**
 * State for a fragment after cube destruction
 */
interface FragmentState {
  id: string
  position: THREE.Vector3
  velocity: THREE.Vector3
  rotation: THREE.Euler
  rotationSpeed: THREE.Vector3
  scale: number
  color: [number, number, number]
  lifetime: number
  maxLifetime: number
}

/**
 * Energy transfer beam visualization
 */
interface EnergyBeamState {
  id: string
  from: THREE.Vector3
  to: THREE.Vector3
  amount: number
  startTime: number
  duration: number
}

/**
 * Props for the EnergyBeam component
 */
interface EnergyBeamProps {
  beam: EnergyBeamState
}

/**
 * EnergyBeam - Visualizes energy transfer between cubes
 * Uses useFrame to get current time, avoiding ref access during render
 */
function EnergyBeam({ beam }: EnergyBeamProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [isVisible, setIsVisible] = useState(true)

  useFrame((state) => {
    if (!meshRef.current) return

    const currentTime = state.clock.elapsedTime
    const progress = Math.min(1, (currentTime - beam.startTime) / beam.duration)

    if (progress >= 1) {
      setIsVisible(false)
      return
    }

    const opacity = progress < 0.5 ? progress * 2 : (1 - progress) * 2
    const midpoint = new THREE.Vector3().lerpVectors(beam.from, beam.to, progress)

    meshRef.current.position.copy(midpoint)
    const material = meshRef.current.material as THREE.MeshBasicMaterial
    material.opacity = opacity
  })

  if (!isVisible) return null

  return (
    <mesh ref={meshRef} position={beam.from}>
      <sphereGeometry args={[0.08, 8, 8]} />
      <meshBasicMaterial color="#00ffff" transparent opacity={1} />
    </mesh>
  )
}

/**
 * Props for Fragment component
 */
interface FragmentProps {
  fragment: FragmentState
  onExpired: () => void
}

/**
 * Fragment - A piece of a destroyed cube
 * Uses local refs to track mutable physics state without modifying props
 */
function Fragment({ fragment, onExpired }: FragmentProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const hasExpired = useRef(false)
  // Local mutable state for physics simulation
  const lifetimeRef = useRef(fragment.lifetime)
  const positionRef = useRef(fragment.position.clone())
  const velocityRef = useRef(fragment.velocity.clone())

  useFrame((_, delta) => {
    if (!meshRef.current) return

    lifetimeRef.current -= delta
    if (lifetimeRef.current <= 0 && !hasExpired.current) {
      hasExpired.current = true
      onExpired()
      return
    }

    // Apply physics using local refs
    velocityRef.current.y -= 2.5 * delta // gravity
    positionRef.current.add(velocityRef.current.clone().multiplyScalar(delta))

    // Apply rotation
    meshRef.current.rotation.x += fragment.rotationSpeed.x * delta
    meshRef.current.rotation.y += fragment.rotationSpeed.y * delta
    meshRef.current.rotation.z += fragment.rotationSpeed.z * delta

    meshRef.current.position.copy(positionRef.current)

    // Fade out
    const material = meshRef.current.material as THREE.MeshStandardMaterial
    material.opacity = Math.max(0, lifetimeRef.current / fragment.maxLifetime)
  })

  return (
    <mesh ref={meshRef} position={fragment.position}>
      <boxGeometry args={[fragment.scale, fragment.scale, fragment.scale]} />
      <meshStandardMaterial
        color={`rgb(${Math.round(fragment.color[0] * 255)}, ${Math.round(fragment.color[1] * 255)}, ${Math.round(fragment.color[2] * 255)})`}
        transparent
        opacity={1}
        emissive={`rgb(${Math.round(fragment.color[0] * 128)}, ${Math.round(fragment.color[1] * 128)}, ${Math.round(fragment.color[2] * 128)})`}
        emissiveIntensity={0.5}
      />
    </mesh>
  )
}

/**
 * Props for InteractiveCube component
 */
interface InteractiveCubeProps {
  state: MagicCubeState
  onTransferEnergy: (cubeId: string) => void
  isSelected: boolean
  fractureResult: FractureCheckResult
  nearFracture: boolean
}

/**
 * InteractiveCube - A magical cube that can be clicked to transfer energy
 */
function InteractiveCube({
  state,
  onTransferEnergy,
  isSelected,
  fractureResult,
  nearFracture,
}: InteractiveCubeProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)

  // Pulse effect when near fracture
  useFrame((frameState) => {
    if (!groupRef.current || state.fractured) return

    if (nearFracture) {
      const pulse = Math.sin(frameState.clock.elapsedTime * 10) * 0.05
      groupRef.current.scale.setScalar(1 + pulse)
    } else {
      groupRef.current.scale.setScalar(1)
    }
  })

  if (state.fractured) {
    return null // Cube is destroyed, fragments are rendered separately
  }

  const normalizedEnergy = getNormalizedEnergy(state.fftConfig)
  const energyPercent = Math.round(normalizedEnergy * 100)
  const energyConfig = fftToEnergyConfig(state.fftConfig)

  // Calculate glow based on energy and fracture state
  const glowIntensity = nearFracture ? 1.5 : 0.5 + normalizedEnergy * 0.5

  return (
    <group ref={groupRef} position={state.position}>
      {/* Clickable hitbox */}
      <mesh
        onClick={() => onTransferEnergy(state.id)}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[1.2, 1.2, 1.2]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Energy cube visualization */}
      <EnergyCube
        config={energyConfig}
        animate={true}
        animationSpeed={nearFracture ? 2.0 : 1.0}
        glowIntensity={glowIntensity}
        energyScale={1.5}
      />

      {/* Selection indicator */}
      {isSelected && (
        <mesh>
          <boxGeometry args={[1.15, 1.15, 1.15]} />
          <meshBasicMaterial color="#00ff00" transparent opacity={0.2} wireframe />
        </mesh>
      )}

      {/* Hover indicator */}
      {hovered && !isSelected && (
        <mesh>
          <boxGeometry args={[1.12, 1.12, 1.12]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.15} wireframe />
        </mesh>
      )}

      {/* Info label */}
      <Html position={[0, 0.9, 0]} center>
        <div
          style={{
            background: nearFracture
              ? 'rgba(255, 100, 50, 0.9)'
              : isSelected
                ? 'rgba(0, 200, 100, 0.9)'
                : 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            whiteSpace: 'nowrap',
            fontFamily: 'monospace',
            userSelect: 'none',
          }}
        >
          <div style={{ fontWeight: 'bold' }}>{state.name}</div>
          <div>
            Energy: {energyPercent}% {nearFracture && '⚠️'}
          </div>
          {fractureResult.fractured && <div style={{ color: '#ff4444' }}>FRACTURED!</div>}
        </div>
      </Html>
    </group>
  )
}

/**
 * Props for DemoScene component
 */
interface DemoSceneProps {
  cubes: MagicCubeState[]
  selectedCubeId: string | null
  onTransferEnergy: (cubeId: string) => void
  beams: EnergyBeamState[]
  onFragmentExpired: (fragmentId: string) => void
}

/**
 * DemoScene - The 3D scene containing all magical cubes and effects
 */
function DemoScene({
  cubes,
  selectedCubeId,
  onTransferEnergy,
  beams,
  onFragmentExpired,
}: DemoSceneProps) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[4, 3, 4]} fov={50} />
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={3}
        maxDistance={15}
      />

      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} castShadow />
      <pointLight position={[-3, 3, -3]} intensity={0.4} color="#6666ff" />

      {/* Environment for reflections */}
      <Environment preset="city" />

      {/* Grid helper */}
      <gridHelper args={[10, 20, 0x444444, 0x333333]} />

      {/* Cubes */}
      {cubes.map((cube) => {
        const fractureResult = checkFracture(cube.fftConfig)
        const nearFractureState = isNearFracture(cube.fftConfig, 0.7)

        return (
          <InteractiveCube
            key={cube.id}
            state={cube}
            onTransferEnergy={onTransferEnergy}
            isSelected={selectedCubeId === cube.id}
            fractureResult={fractureResult}
            nearFracture={nearFractureState}
          />
        )
      })}

      {/* Fragments from destroyed cubes */}
      {cubes.flatMap((cube) =>
        cube.fragments.map((fragment) => (
          <Fragment
            key={fragment.id}
            fragment={fragment}
            onExpired={() => onFragmentExpired(fragment.id)}
          />
        ))
      )}

      {/* Energy transfer beams - each beam handles its own timing */}
      {beams.map((beam) => (
        <EnergyBeam key={beam.id} beam={beam} />
      ))}
    </>
  )
}

/**
 * Creates an initial magic crystal cube state
 */
function createMagicCrystalState(
  id: string,
  name: string,
  position: [number, number, number]
): MagicCubeState {
  const energyConfig = createMagicCrystalConfig()
  const fftConfig = energyConfigToFFT(energyConfig, id)
  return {
    id,
    name,
    fftConfig,
    position,
    fractured: false,
    fragments: [],
  }
}

/**
 * Creates an initial unstable core cube state
 */
function createUnstableCoreState(
  id: string,
  name: string,
  position: [number, number, number]
): MagicCubeState {
  const energyConfig = createUnstableCoreConfig()
  const fftConfig = energyConfigToFFT(energyConfig, id)
  return {
    id,
    name,
    fftConfig,
    position,
    fractured: false,
    fragments: [],
  }
}

/**
 * Creates an energy shield cube state
 */
function createEnergyShieldState(
  id: string,
  name: string,
  position: [number, number, number]
): MagicCubeState {
  // Create a defensive-oriented cube with high capacity and threshold
  const baseConfig: EnergyCubeConfig = {
    channelR: {
      dcAmplitude: 0.2,
      dcPhase: 0,
      coefficients: [{ amplitude: 0.15, phase: 0, freqX: 1, freqY: 1, freqZ: 0 }],
    },
    channelG: {
      dcAmplitude: 0.7,
      dcPhase: Math.PI / 4,
      coefficients: [
        { amplitude: 0.3, phase: Math.PI / 2, freqX: 2, freqY: 0, freqZ: 1 },
        { amplitude: 0.2, phase: Math.PI, freqX: 0, freqY: 2, freqZ: 1 },
      ],
    },
    channelB: {
      dcAmplitude: 0.5,
      dcPhase: 0,
      coefficients: [{ amplitude: 0.25, phase: 0, freqX: 1, freqY: 0, freqZ: 2 }],
    },
    channelA: {
      dcAmplitude: 0.8,
      dcPhase: 0,
      coefficients: [],
    },
    energyCapacity: 300.0,
    coherenceLoss: 0.005, // Low decay
    fractureThreshold: 250.0, // High threshold
  }

  const fftConfig = energyConfigToFFT(baseConfig, id)
  return {
    id,
    name,
    fftConfig,
    position,
    fractured: false,
    fragments: [],
  }
}

/**
 * Generates fragment states for a destroyed cube
 */
function generateFragments(cube: MagicCubeState): FragmentState[] {
  const fragments: FragmentState[] = []
  const numFragments = 12 + Math.floor(Math.random() * 8)
  const basePosition = new THREE.Vector3(...cube.position)

  // Get color from the cube's channels
  const r = cube.fftConfig.channels.R?.dcAmplitude ?? 0.5
  const g = cube.fftConfig.channels.G?.dcAmplitude ?? 0.5
  const b = cube.fftConfig.channels.B?.dcAmplitude ?? 0.5

  for (let i = 0; i < numFragments; i++) {
    const position = basePosition
      .clone()
      .add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5
        )
      )

    const speed = 2 + Math.random() * 3
    const direction = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() * 0.5 + 0.3, // Bias upward
      Math.random() - 0.5
    ).normalize()

    fragments.push({
      id: `fragment-${cube.id}-${i}-${Date.now()}`,
      position,
      velocity: direction.multiplyScalar(speed),
      rotation: new THREE.Euler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      ),
      rotationSpeed: new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      ),
      scale: 0.05 + Math.random() * 0.15,
      color: [
        Math.min(1, r + Math.random() * 0.3),
        Math.min(1, g + Math.random() * 0.3),
        Math.min(1, b + Math.random() * 0.3),
      ],
      lifetime: 1.5 + Math.random() * 1.5,
      maxLifetime: 3,
    })
  }

  return fragments
}

/**
 * MagicCubeDemo Props
 */
export interface MagicCubeDemoProps {
  /** Optional CSS class name */
  className?: string
}

/**
 * MagicCubeDemo - Interactive demonstration of magical cube energy physics
 *
 * Features:
 * - Click a cube to select it as energy source
 * - Click another cube to transfer energy to it
 * - Watch for fracture warnings (orange indicator)
 * - Cubes explode into fragments when energy exceeds threshold
 * - Reset button to restart the demo
 *
 * @example
 * ```tsx
 * import { MagicCubeDemo } from './components/MagicCubeDemo'
 *
 * function App() {
 *   return <MagicCubeDemo />
 * }
 * ```
 */
export function MagicCubeDemo({ className = '' }: MagicCubeDemoProps) {
  // Initialize cube states
  const [cubes, setCubes] = useState<MagicCubeState[]>(() => [
    createMagicCrystalState('crystal-1', 'Magic Crystal', [-1.5, 0.5, 0]),
    createUnstableCoreState('core-1', 'Unstable Core', [1.5, 0.5, 0]),
    createEnergyShieldState('shield-1', 'Energy Shield', [0, 0.5, 2]),
  ])

  const [selectedCubeId, setSelectedCubeId] = useState<string | null>(null)
  const [beams, setBeams] = useState<EnergyBeamState[]>([])
  const [message, setMessage] = useState<string>('Click a cube to select it as energy source')
  const [autoDecay, setAutoDecay] = useState(false)
  // Track last decay time for delta calculation (initialized in effect)
  const lastDecayTime = useRef<number>(0)

  // Initialize ref in effect to avoid impure function call during render
  useEffect(() => {
    lastDecayTime.current = Date.now()
  }, [])

  // Helper function to check fractures and update cube state
  // Returns updated cubes with fractures applied and optional message
  const checkAndApplyFractures = useCallback(
    (cubeList: MagicCubeState[]): { cubes: MagicCubeState[]; message: string | null } => {
      let messageToSet: string | null = null

      const updatedCubes = cubeList.map((cube) => {
        if (cube.fractured) return cube

        const fractureResult = checkFracture(cube.fftConfig)
        if (fractureResult.fractured) {
          messageToSet = `${cube.name} has fractured! Energy overflow: ${fractureResult.excessEnergy.toFixed(1)}`
          return {
            ...cube,
            fractured: true,
            fractureTime: Date.now(),
            fragments: generateFragments(cube),
          }
        }
        return cube
      })

      return { cubes: updatedCubes, message: messageToSet }
    },
    []
  )

  // Auto-decay effect
  useEffect(() => {
    if (!autoDecay) return

    // Initialize timestamp when starting decay
    lastDecayTime.current = Date.now()

    const interval = setInterval(() => {
      const now = Date.now()
      const deltaTime = (now - lastDecayTime.current) / 1000
      lastDecayTime.current = now

      setCubes((prev) => {
        // Apply coherence loss
        const decayedCubes = prev.map((cube) => {
          if (cube.fractured) return cube
          const newFftConfig = applyCoherenceLoss(cube.fftConfig, deltaTime)
          return { ...cube, fftConfig: newFftConfig }
        })
        // Check for fractures after decay
        const { cubes: updatedCubes, message: fractureMessage } =
          checkAndApplyFractures(decayedCubes)
        if (fractureMessage) {
          setMessage(fractureMessage)
        }
        return updatedCubes
      })
    }, 100)

    return () => clearInterval(interval)
  }, [autoDecay, checkAndApplyFractures])

  // Handle energy transfer
  const handleTransferEnergy = useCallback(
    (cubeId: string) => {
      if (selectedCubeId === null) {
        // First click - select source cube
        const cube = cubes.find((c) => c.id === cubeId)
        if (cube && !cube.fractured) {
          setSelectedCubeId(cubeId)
          setMessage(`Selected ${cube.name}. Click another cube to transfer energy to it.`)
        }
      } else if (selectedCubeId === cubeId) {
        // Clicked same cube - deselect
        setSelectedCubeId(null)
        setMessage('Selection cleared. Click a cube to select it as energy source.')
      } else {
        // Second click - perform transfer
        const sourceCube = cubes.find((c) => c.id === selectedCubeId)
        const targetCube = cubes.find((c) => c.id === cubeId)

        if (sourceCube && targetCube && !sourceCube.fractured && !targetCube.fractured) {
          // Calculate transfer amount (20% of source energy)
          const sourceEnergy = sourceCube.fftConfig.current_energy ?? 0
          const transferAmount = sourceEnergy * 0.2

          if (transferAmount > 0.1) {
            const {
              source: newSource,
              target: newTarget,
              result,
            } = applyEnergyTransfer(sourceCube.fftConfig, targetCube.fftConfig, transferAmount, {
              efficiency: 0.9,
            })

            // Update cubes and check for fractures
            setCubes((prev) => {
              const updatedCubes = prev.map((cube) => {
                if (cube.id === selectedCubeId) {
                  return { ...cube, fftConfig: newSource }
                }
                if (cube.id === cubeId) {
                  return { ...cube, fftConfig: newTarget }
                }
                return cube
              })
              // Check for fractures after energy transfer
              const { cubes: fractureCheckedCubes, message: fractureMessage } =
                checkAndApplyFractures(updatedCubes)
              if (fractureMessage) {
                // Will be shown after transfer message
                setTimeout(() => setMessage(fractureMessage), 100)
              }
              return fractureCheckedCubes
            })

            // Create energy beam
            const sourcePos = new THREE.Vector3(...sourceCube.position)
            const targetPos = new THREE.Vector3(...targetCube.position)
            setBeams((prev) => [
              ...prev,
              {
                id: `beam-${Date.now()}`,
                from: sourcePos,
                to: targetPos,
                amount: result.transferredAmount,
                startTime: 0, // Will be set by the scene
                duration: 0.5,
              },
            ])

            // Clean up old beams
            setTimeout(() => {
              setBeams((prev) => prev.filter((b) => Date.now() - b.startTime * 1000 < 1000))
            }, 1000)

            setMessage(
              `Transferred ${result.transferredAmount.toFixed(1)} energy from ${sourceCube.name} to ${targetCube.name}!`
            )

            // Check if target is near fracture
            if (isNearFracture(newTarget, 0.7)) {
              setMessage(
                (prev) => prev + ` Warning: ${targetCube.name} is near fracture threshold!`
              )
            }
          } else {
            setMessage(`${sourceCube.name} has insufficient energy to transfer.`)
          }
        }

        setSelectedCubeId(null)
      }
    },
    [selectedCubeId, cubes, checkAndApplyFractures]
  )

  // Handle fragment expiration
  const handleFragmentExpired = useCallback((fragmentId: string) => {
    setCubes((prev) =>
      prev.map((cube) => ({
        ...cube,
        fragments: cube.fragments.filter((f) => f.id !== fragmentId),
      }))
    )
  }, [])

  // Reset demo
  const handleReset = useCallback(() => {
    setCubes([
      createMagicCrystalState('crystal-1', 'Magic Crystal', [-1.5, 0.5, 0]),
      createUnstableCoreState('core-1', 'Unstable Core', [1.5, 0.5, 0]),
      createEnergyShieldState('shield-1', 'Energy Shield', [0, 0.5, 2]),
    ])
    setSelectedCubeId(null)
    setBeams([])
    setMessage('Demo reset! Click a cube to select it as energy source.')
  }, [])

  // Add energy to selected cube
  const handleAddEnergy = useCallback(() => {
    if (!selectedCubeId) {
      setMessage('Select a cube first to add energy to it.')
      return
    }

    setCubes((prev) =>
      prev.map((cube) => {
        if (cube.id === selectedCubeId && !cube.fractured) {
          // Scale up all channel amplitudes to add energy
          const scaleFactor = 1.2
          const newChannels = { ...cube.fftConfig.channels }

          const scaleChannel = (channel: FFTChannel | undefined): FFTChannel | undefined => {
            if (!channel) return undefined
            return {
              dcAmplitude: channel.dcAmplitude * scaleFactor,
              dcPhase: channel.dcPhase,
              coefficients: channel.coefficients.map((c) => ({
                ...c,
                amplitude: c.amplitude * scaleFactor,
              })),
            }
          }

          newChannels.R = scaleChannel(newChannels.R)
          newChannels.G = scaleChannel(newChannels.G)
          newChannels.B = scaleChannel(newChannels.B)

          const newFftConfig = {
            ...cube.fftConfig,
            channels: newChannels,
            current_energy: calculateTotalEnergy({ ...cube.fftConfig, channels: newChannels }),
          }

          setMessage(
            `Added energy to ${cube.name}! Current: ${newFftConfig.current_energy?.toFixed(1)}`
          )
          return { ...cube, fftConfig: newFftConfig }
        }
        return cube
      })
    )
  }, [selectedCubeId])

  // Calculate stats for display
  const stats = useMemo(() => {
    const activeCubes = cubes.filter((c) => !c.fractured)
    const totalEnergy = activeCubes.reduce((sum, c) => sum + (c.fftConfig.current_energy ?? 0), 0)
    const fracturedCount = cubes.filter((c) => c.fractured).length
    return { activeCubes: activeCubes.length, totalEnergy, fracturedCount }
  }, [cubes])

  return (
    <div className={`magic-cube-demo ${className}`}>
      {/* Header */}
      <div className="magic-cube-demo__header">
        <h2 className="magic-cube-demo__title">Magic Cube Demo</h2>
        <p className="magic-cube-demo__subtitle">
          Interactive demonstration of energy physics and destruction effects
        </p>
      </div>

      {/* 3D Canvas */}
      <div className="magic-cube-demo__canvas">
        <Canvas shadows>
          <DemoScene
            cubes={cubes}
            selectedCubeId={selectedCubeId}
            onTransferEnergy={handleTransferEnergy}
            beams={beams}
            onFragmentExpired={handleFragmentExpired}
          />
        </Canvas>
      </div>

      {/* Controls */}
      <div className="magic-cube-demo__controls">
        <button
          type="button"
          className="magic-cube-demo__button magic-cube-demo__button--primary"
          onClick={handleAddEnergy}
        >
          Add Energy (+20%)
        </button>
        <button
          type="button"
          className={`magic-cube-demo__button ${autoDecay ? 'magic-cube-demo__button--active' : ''}`}
          onClick={() => setAutoDecay(!autoDecay)}
        >
          {autoDecay ? 'Disable Decay' : 'Enable Decay'}
        </button>
        <button
          type="button"
          className="magic-cube-demo__button magic-cube-demo__button--secondary"
          onClick={handleReset}
        >
          Reset Demo
        </button>
      </div>

      {/* Stats */}
      <div className="magic-cube-demo__stats">
        <div className="magic-cube-demo__stat">
          <span className="magic-cube-demo__stat-label">Active Cubes:</span>
          <span className="magic-cube-demo__stat-value">{stats.activeCubes}</span>
        </div>
        <div className="magic-cube-demo__stat">
          <span className="magic-cube-demo__stat-label">Total Energy:</span>
          <span className="magic-cube-demo__stat-value">{stats.totalEnergy.toFixed(1)}</span>
        </div>
        <div className="magic-cube-demo__stat">
          <span className="magic-cube-demo__stat-label">Fractured:</span>
          <span className="magic-cube-demo__stat-value">{stats.fracturedCount}</span>
        </div>
      </div>

      {/* Message */}
      <div className="magic-cube-demo__message">
        <p>{message}</p>
      </div>

      {/* Instructions */}
      <div className="magic-cube-demo__instructions">
        <h3>Instructions</h3>
        <ul>
          <li>Click a cube to select it as the energy source</li>
          <li>Click another cube to transfer 20% of the source's energy</li>
          <li>Use "Add Energy" to increase the selected cube's energy</li>
          <li>Enable "Decay" to see coherence loss over time</li>
          <li>Watch for orange warning when near fracture threshold</li>
          <li>Cubes explode into fragments when energy exceeds threshold!</li>
        </ul>
      </div>
    </div>
  )
}

export default MagicCubeDemo
