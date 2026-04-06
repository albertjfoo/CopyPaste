'use client'

import { Suspense, useRef, useEffect, useState, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, Html } from '@react-three/drei'
import * as THREE from 'three'

export interface Dims { x: number; y: number; z: number }

function toCm(v: number) { return (v * 10).toFixed(1) }

// ── Dimension line primitive ─────────────────────────────────────────────────

function DimLine({ points, color }: { points: [number, number, number][], color: string }) {
  const obj = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints(
      points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    )
    const mat = new THREE.LineBasicMaterial({ color, depthTest: false })
    const line = new THREE.Line(geom, mat)
    line.renderOrder = 999
    return line
  }, [points, color])

  return <primitive object={obj} />
}

// ── Engineering-style annotations around the bounding box ────────────────────

function DimensionAnnotations({ box }: { box: THREE.Box3 }) {
  const size = box.getSize(new THREE.Vector3())
  const { x: w, y: h, z: d } = size
  const { min, max } = box
  const pad  = Math.max(w, h, d) * 0.22
  const tick = pad * 0.3
  const c    = '#f97316' // orange

  // Pull dimension lines out to the front face (max.z) for visibility
  const fz = max.z

  const labelStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.95)',
    color: '#ea580c',
    fontWeight: 800,
    fontSize: 11,
    padding: '2px 7px',
    borderRadius: 6,
    boxShadow: '0 1px 6px rgba(0,0,0,0.18)',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    border: '1.5px solid #fed7aa',
    userSelect: 'none',
  }

  return (
    <>
      {/* ── Width (X) — below model ── */}
      {/* Main dimension line */}
      <DimLine points={[[min.x, min.y - pad, fz], [max.x, min.y - pad, fz]]} color={c} />
      {/* End ticks */}
      <DimLine points={[[min.x, min.y - pad - tick, fz], [min.x, min.y - pad + tick, fz]]} color={c} />
      <DimLine points={[[max.x, min.y - pad - tick, fz], [max.x, min.y - pad + tick, fz]]} color={c} />
      {/* Extension lines (dashed appearance via two short segments) */}
      <DimLine points={[[min.x, min.y, fz], [min.x, min.y - pad * 1.35, fz]]} color={c} />
      <DimLine points={[[max.x, min.y, fz], [max.x, min.y - pad * 1.35, fz]]} color={c} />
      {/* Label */}
      <Html center position={[(min.x + max.x) / 2, min.y - pad, fz]}>
        <div style={labelStyle}>W {toCm(w)} cm</div>
      </Html>

      {/* ── Height (Y) — left of model ── */}
      <DimLine points={[[min.x - pad, min.y, fz], [min.x - pad, max.y, fz]]} color={c} />
      <DimLine points={[[min.x - pad - tick, min.y, fz], [min.x - pad + tick, min.y, fz]]} color={c} />
      <DimLine points={[[min.x - pad - tick, max.y, fz], [min.x - pad + tick, max.y, fz]]} color={c} />
      <DimLine points={[[min.x, min.y, fz], [min.x - pad * 1.35, min.y, fz]]} color={c} />
      <DimLine points={[[min.x, max.y, fz], [min.x - pad * 1.35, max.y, fz]]} color={c} />
      <Html center position={[min.x - pad, (min.y + max.y) / 2, fz]}>
        <div style={labelStyle}>H {toCm(h)} cm</div>
      </Html>

      {/* ── Depth (Z) — bottom-right diagonal ── */}
      <DimLine points={[[max.x + pad * 0.6, min.y - pad, min.z], [max.x + pad * 0.6, min.y - pad, max.z]]} color={c} />
      <DimLine points={[[max.x + pad * 0.6 - tick, min.y - pad, min.z], [max.x + pad * 0.6 + tick, min.y - pad, min.z]]} color={c} />
      <DimLine points={[[max.x + pad * 0.6 - tick, min.y - pad, max.z], [max.x + pad * 0.6 + tick, min.y - pad, max.z]]} color={c} />
      <Html center position={[max.x + pad * 0.6, min.y - pad, (min.z + max.z) / 2]}>
        <div style={labelStyle}>D {toCm(d)} cm</div>
      </Html>

      {/* Corner guide lines connecting the model to the depth annotation */}
      <DimLine points={[[max.x, min.y - pad * 1.35, min.z], [max.x + pad * 0.75, min.y - pad, min.z]]} color={c} />
      <DimLine points={[[max.x, min.y - pad * 1.35, max.z], [max.x + pad * 0.75, min.y - pad, max.z]]} color={c} />
    </>
  )
}

// ── Loader fallback ──────────────────────────────────────────────────────────

function Loader() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#f97316" wireframe />
    </mesh>
  )
}

// ── Main model: handles centering, rotation, and dimensions ─────────────────

interface ModelProps {
  url: string
  autoRotate: boolean
  showDimensions: boolean
  onDimensions?: (dims: Dims) => void
}

function Model({ url, autoRotate, showDimensions, onDimensions }: ModelProps) {
  const { scene } = useGLTF(url)
  const rotRef = useRef<THREE.Group>(null)
  const [offset, setOffset] = useState(new THREE.Vector3())
  const [box, setBox]       = useState<THREE.Box3 | null>(null)

  useEffect(() => {
    const raw = new THREE.Box3().setFromObject(scene)
    const center = raw.getCenter(new THREE.Vector3())
    const size   = raw.getSize(new THREE.Vector3())
    setOffset(center.clone().negate())
    setBox(new THREE.Box3(
      new THREE.Vector3(-size.x / 2, -size.y / 2, -size.z / 2),
      new THREE.Vector3( size.x / 2,  size.y / 2,  size.z / 2),
    ))
    onDimensions?.({ x: size.x, y: size.y, z: size.z })
  }, [scene, onDimensions])

  // Pause rotation while dimensions are visible so lines stay readable
  useFrame((_, delta) => {
    if (autoRotate && !showDimensions && rotRef.current) {
      rotRef.current.rotation.y += delta * 0.4
    }
  })

  return (
    <group>
      {/* Model — translated to origin, then rotated inside inner group */}
      <group ref={rotRef}>
        <primitive object={scene} position={offset} />
      </group>
      {/* Annotations stay fixed in world space */}
      {showDimensions && box && <DimensionAnnotations box={box} />}
    </group>
  )
}

// ── Public component ─────────────────────────────────────────────────────────

interface ModelViewerProps {
  glbUrl: string
  autoRotate?: boolean
  showDimensions?: boolean
  onDimensions?: (dims: Dims) => void
}

export default function ModelViewer({
  glbUrl,
  autoRotate = true,
  showDimensions = false,
  onDimensions,
}: ModelViewerProps) {
  return (
    <Canvas
      style={{ width: '100%', height: '100%' }}
      camera={{ position: [0, 1.2, 3.5], fov: 42 }}
      gl={{ antialias: false, powerPreference: 'low-power' }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} />
      <directionalLight position={[-5, -5, -5]} intensity={0.3} />
      <Suspense fallback={<Loader />}>
        <Model
          url={glbUrl}
          autoRotate={autoRotate}
          showDimensions={showDimensions}
          onDimensions={onDimensions}
        />
      </Suspense>
      <OrbitControls enablePan={false} minDistance={0.5} maxDistance={12} />
    </Canvas>
  )
}
