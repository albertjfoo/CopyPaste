'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const ModelViewer = dynamic(() => import('@/components/ModelViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="text-3xl animate-spin">⚙️</div>
    </div>
  ),
})

import type { Dims } from '@/components/ModelViewer'

function launchAR(glbUrl: string, usdzUrl: string) {
  const ua = navigator.userAgent

  // iOS / iPadOS → Quick Look (needs a USDZ or reality file)
  if (/iP(hone|ad|od)/.test(ua) && usdzUrl) {
    const a = document.createElement('a')
    a.setAttribute('rel', 'ar')
    a.href = usdzUrl
    // Quick Look requires an <img> child to trigger on tap
    const img = document.createElement('img')
    a.appendChild(img)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    return
  }

  // Android → Google Scene Viewer (opens GLB in native AR)
  if (/Android/.test(ua) && glbUrl) {
    const intentUrl =
      `intent://arvr.google.com/scene-viewer/1.0` +
      `?file=${encodeURIComponent(glbUrl)}` +
      `&mode=ar_preferred` +
      `#Intent;scheme=https;` +
      `package=com.google.android.googlequicksearchbox;` +
      `action=android.intent.action.VIEW;` +
      `S.browser_fallback_url=${encodeURIComponent('https://developers.google.com/ar')};end;`
    window.location.href = intentUrl
    return
  }

  // Desktop / unsupported — friendly message
  alert('AR is available on iPhone and Android phones. Open this page on your phone to try it!')
}

export default function ConfirmPage() {
  const router = useRouter()

  const [glbUrl, setGlbUrl]   = useState('')
  const [usdzUrl, setUsdzUrl] = useState('')
  const [rawGlb, setRawGlb]   = useState('')  // un-proxied, for AR (Scene Viewer needs a public URL)
  const [dims, setDims]       = useState<Dims | null>(null)
  const [showDims, setShowDims] = useState(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('makeit_model_urls')
      if (!raw) { router.replace('/'); return }
      const urls = JSON.parse(raw)
      if (urls.glb) {
        setRawGlb(urls.glb)
        setGlbUrl(`/api/proxy?url=${encodeURIComponent(urls.glb)}`)
      }
      if (urls.usdz) setUsdzUrl(`/api/proxy?url=${encodeURIComponent(urls.usdz)}`)
    } catch { router.replace('/') }
  }, [router])

  const handleDimensions = useCallback((d: Dims) => {
    setDims(d)
  }, [])

  const handleAR = () => launchAR(rawGlb, usdzUrl)

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
              glbUrl={glbUrl}
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
