'use client'

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react'

export interface Dims { x: number; y: number; z: number }
export interface ModelViewerHandle { activateAR: () => void }

type MVElement = HTMLElement & {
  getDimensions?: () => { x: number; y: number; z: number }
  activateAR?: () => void
}

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
        poster?: string
        style?: React.CSSProperties
      }
    }
  }
}

interface ModelViewerProps {
  glbUrl: string
  iosUrl?: string
  autoRotate?: boolean
  showDimensions?: boolean
  onDimensions?: (dims: Dims) => void
}

function toCm(v: number) { return (v * 100).toFixed(1) }

const ModelViewer = forwardRef<ModelViewerHandle, ModelViewerProps>(function ModelViewer(
  { glbUrl, iosUrl, autoRotate = true, showDimensions = false, onDimensions },
  ref,
) {
  const elRef = useRef<MVElement>(null)
  const [dims, setDims] = useState<Dims | null>(null)
  const [ready, setReady] = useState(false)

  // Load script and wait for custom element to register
  useEffect(() => {
    if (typeof customElements === 'undefined') return
    const load = () => customElements.whenDefined('model-viewer').then(() => setReady(true))
    if (customElements.get('model-viewer')) {
      setReady(true)
      return
    }
    if (!document.querySelector('script[data-mv]')) {
      const s = document.createElement('script')
      s.type = 'module'
      s.dataset.mv = '1'
      s.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js'
      document.head.appendChild(s)
    }
    load()
  }, [])

  // Fire onDimensions when model loads
  useEffect(() => {
    const el = elRef.current
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
  }, [onDimensions, ready])

  // Expose activateAR to parent via ref
  useImperativeHandle(ref, () => ({
    activateAR: () => elRef.current?.activateAR?.(),
  }))

  if (!ready) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-3xl animate-spin">⚙️</div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <model-viewer
        ref={elRef as React.RefObject<HTMLElement>}
        src={glbUrl}
        {...(iosUrl ? { 'ios-src': iosUrl, ar: '', 'ar-modes': 'quick-look scene-viewer webxr' } : {})}
        camera-controls=""
        {...(autoRotate ? { 'auto-rotate': '' } : {})}
        shadow-intensity="1"
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      />

      {showDimensions && dims && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-none">
          {([['W', dims.x], ['H', dims.y], ['D', dims.z]] as [string, number][]).map(([label, value]) => (
            <div
              key={label}
              className="bg-white/95 border border-orange-200 text-orange-600 font-bold text-xs px-3 py-1.5 rounded-full shadow"
            >
              {label} {toCm(value)} cm
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

export default ModelViewer
