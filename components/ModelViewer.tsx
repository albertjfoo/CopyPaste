'use client'

import { useEffect, useRef, useState } from 'react'

export interface Dims { x: number; y: number; z: number }

// TypeScript declaration for the custom element
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string
        'ios-src'?: string
        ar?: string
        'ar-modes'?: string
        'camera-controls'?: string
        'auto-rotate'?: string
        'shadow-intensity'?: string
        style?: React.CSSProperties
      }
    }
  }
}

type ModelViewerElement = HTMLElement & {
  getDimensions?: () => { x: number; y: number; z: number }
}

interface ModelViewerProps {
  glbUrl: string
  autoRotate?: boolean
  showDimensions?: boolean
  onDimensions?: (dims: Dims) => void
}

function toCm(v: number) { return (v * 100).toFixed(1) }

export default function ModelViewer({
  glbUrl,
  autoRotate = true,
  showDimensions = false,
  onDimensions,
}: ModelViewerProps) {
  const ref = useRef<ModelViewerElement>(null)
  const [dims, setDims] = useState<Dims | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handler = () => {
      const d = el.getDimensions?.()
      if (d) {
        setDims(d)
        onDimensions?.(d)
      }
    }
    el.addEventListener('load', handler)
    return () => el.removeEventListener('load', handler)
  }, [onDimensions])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <model-viewer
        ref={ref as any}
        src={glbUrl}
        camera-controls=""
        {...(autoRotate ? { 'auto-rotate': '' } : {})}
        shadow-intensity="1"
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      />

      {/* Dimension overlay */}
      {showDimensions && dims && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-none">
          {[
            { label: 'W', value: toCm(dims.x) },
            { label: 'H', value: toCm(dims.y) },
            { label: 'D', value: toCm(dims.z) },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="bg-white/95 border border-orange-200 text-orange-600 font-bold text-xs px-3 py-1.5 rounded-full shadow"
            >
              {label} {value} cm
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
