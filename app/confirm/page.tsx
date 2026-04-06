'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { ModelViewerHandle, Dims } from '@/components/ModelViewer'

const ModelViewer = dynamic(() => import('@/components/ModelViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="text-3xl animate-spin">⚙️</div>
    </div>
  ),
})

export default function ConfirmPage() {
  const router = useRouter()

  const mvRef = useRef<ModelViewerHandle>(null)
  const [glbUrl, setGlbUrl]   = useState('')
  const [iosUrl, setIosUrl]   = useState('')
  const [dims, setDims]       = useState<Dims | null>(null)
  const [showDims, setShowDims] = useState(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('makeit_model_urls')
      if (!raw) { router.replace('/'); return }
      const urls = JSON.parse(raw)
      if (urls.glb) setGlbUrl(`/api/proxy?url=${encodeURIComponent(urls.glb)}`)
      if (urls.usdz) setIosUrl(`/api/proxy?url=${encodeURIComponent(urls.usdz)}`)
    } catch { router.replace('/') }
  }, [router])

  const handleDimensions = useCallback((d: Dims) => setDims(d), [])

  const handleAR = () => {
    if (mvRef.current) {
      mvRef.current.activateAR()
    } else {
      alert('AR is available on iPhone and Android. Open this page on your phone!')
    }
  }

  return (
    <div className="min-h-screen bg-orange-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm p-4 flex items-center">
        <button onClick={() => router.push('/result')} className="text-orange-500 text-xl font-bold w-10">←</button>
        <h1 className="text-2xl font-black text-gray-800 flex-1 text-center">Looking good!</h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full p-4 gap-4">

        {/* 3D Viewer — takes most of the screen */}
        <div className="relative rounded-3xl overflow-hidden shadow-xl bg-gradient-to-br from-gray-100 to-gray-200 flex-1" style={{ minHeight: '42vh' }}>
          {glbUrl && (
            <ModelViewer
              ref={mvRef}
              glbUrl={glbUrl}
              iosUrl={iosUrl}
              autoRotate
              showDimensions={showDims}
              onDimensions={handleDimensions}
            />
          )}

          {/* AR button — top right */}
          <button
            onClick={handleAR}
            className="absolute top-3 right-3 bg-black/60 backdrop-blur text-white text-sm font-bold px-4 py-2 rounded-full flex items-center gap-2 active:scale-95 transition-transform"
          >
            <span className="text-base">📱</span> View in AR
          </button>

          {/* Dimension toggle — top left, only once model is loaded */}
          {dims && (
            <button
              onClick={() => setShowDims(v => !v)}
              className={`absolute top-3 left-3 backdrop-blur text-sm font-bold px-4 py-2 rounded-full flex items-center gap-2 transition-all active:scale-95 ${
                showDims ? 'bg-orange-500 text-white' : 'bg-black/60 text-white'
              }`}
            >
              📐 {showDims ? 'Hide size' : 'Show size'}
            </button>
          )}
        </div>

        {/* AR hint */}
        <div className="bg-white rounded-2xl shadow-sm p-4 flex items-start gap-3">
          <span className="text-2xl mt-0.5">📱</span>
          <div>
            <p className="font-bold text-gray-800">Place it in your room first!</p>
            <p className="text-gray-500 text-sm">
              Tap <strong>View in AR</strong> to see exactly how big it is in real life before ordering.
            </p>
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={() => router.push('/material')}
          className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 transition-all text-white text-3xl font-black py-6 rounded-3xl shadow-xl"
        >
          Choose Material →
        </button>

        <button
          onClick={() => router.push('/result')}
          className="w-full text-orange-500 font-semibold text-lg py-3 text-center"
        >
          ← Tweak the model
        </button>

        <div className="h-2" />
      </div>
    </div>
  )
}
