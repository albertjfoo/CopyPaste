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

interface Material {
  id: string
  name: string
  tagline: string
  emoji: string
  price: number
  colors: string[]
  // CSS gradient that simulates the material surface
  swatch: string
  swatchText: string
}

const MATERIALS: Material[] = [
  {
    id: 'pla',
    name: 'PLA Plastic',
    tagline: 'Lightweight & strong. Great for most objects.',
    emoji: '🟧',
    price: 12.99,
    colors: ['White', 'Black', 'Gray', 'Blue', 'Red', 'Orange'],
    swatch: 'linear-gradient(135deg, #f8f9fa 0%, #dee2e6 60%, #adb5bd 100%)',
    swatchText: '#495057',
  },
  {
    id: 'wood',
    name: 'Wood PLA',
    tagline: 'Real wood fibres. Feels and smells like wood!',
    emoji: '🪵',
    price: 18.99,
    colors: ['Light Oak', 'Walnut', 'Bamboo', 'Ebony'],
    swatch: 'repeating-linear-gradient(100deg, #8B5E3C 0px, #7A5230 4px, #6B4423 8px, #8B5E3C 12px)',
    swatchText: '#fff',
  },
  {
    id: 'resin',
    name: 'Smooth Resin',
    tagline: 'Ultra-smooth, professional finish. Highest detail.',
    emoji: '💎',
    price: 24.99,
    colors: ['Pearl White', 'Obsidian Black', 'Clear', 'Rose Gold'],
    swatch: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 50%, #c3e0fc 100%)',
    swatchText: '#2d3748',
  },
  {
    id: 'metal',
    name: 'Metal PLA',
    tagline: 'Looks and feels like brushed metal.',
    emoji: '🔩',
    price: 34.99,
    colors: ['Silver', 'Bronze', 'Copper', 'Gold'],
    swatch: 'linear-gradient(135deg, #C0C0C0 0%, #e8e8e8 30%, #9e9e9e 60%, #d4d4d4 100%)',
    swatchText: '#333',
  },
  {
    id: 'flex',
    name: 'Flexible TPU',
    tagline: 'Soft and squishy. Great for grips and cases.',
    emoji: '🫧',
    price: 19.99,
    colors: ['Translucent', 'Black', 'White', 'Sky Blue'],
    swatch: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    swatchText: '#2d3748',
  },
]

/** Analyze dominant hue from a frame dataUrl → suggest a material ID */
function detectMaterial(dataUrl: string): string {
  try {
    const img = new window.Image()
    img.src = dataUrl
    const canvas = document.createElement('canvas')
    canvas.width = 20; canvas.height = 20
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, 20, 20)
    const d = ctx.getImageData(0, 0, 20, 20).data
    let r = 0, g = 0, b = 0
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2] }
    const n = d.length / 4; r /= n; g /= n; b /= n
    const brightness = (r + g + b) / 3
    const sat = Math.max(r, g, b) - Math.min(r, g, b)
    if (brightness > 180 && sat < 25) return 'resin'
    if (brightness < 70) return 'resin'
    if (sat < 35 && brightness > 90) return 'metal'
    if (r > g + 20 && r > b + 20 && g > 70) return 'wood'
    return 'pla'
  } catch { return 'pla' }
}

export default function MaterialPage() {
  const router = useRouter()
  const [glbUrl, setGlbUrl]       = useState('')
  const [suggested, setSuggested] = useState('pla')
  const [selected, setSelected]   = useState('pla')
  const [selectedColor, setSelectedColor] = useState('White')
  const [detected, setDetected]   = useState(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('makeit_model_urls')
      if (!raw) { router.replace('/'); return }
      const urls = JSON.parse(raw)
      if (urls.glb) setGlbUrl(`/api/proxy?url=${encodeURIComponent(urls.glb)}`)

      const rawCandidates = sessionStorage.getItem('makeit_candidates')
      const rawSel = sessionStorage.getItem('makeit_selected')
      if (rawCandidates && rawSel) {
        const candidates = JSON.parse(rawCandidates)
        const indices: number[] = JSON.parse(rawSel)
        const frame = candidates[indices[Math.floor(indices.length / 2)]]
        if (frame?.dataUrl) {
          setTimeout(() => {
            const mat = detectMaterial(frame.dataUrl)
            setSuggested(mat)
            setSelected(mat)
            setDetected(true)
          }, 400)
        }
      }
    } catch { router.replace('/') }
  }, [router])

  // Keep color in sync when material changes
  useEffect(() => {
    const mat = MATERIALS.find(m => m.id === selected)
    if (mat) setSelectedColor(mat.colors[0])
  }, [selected])

  const currentMaterial = MATERIALS.find(m => m.id === selected)!

  const handleContinue = () => {
    sessionStorage.setItem('makeit_material', JSON.stringify({
      id: selected,
      name: currentMaterial.name,
      color: selectedColor,
      price: currentMaterial.price,
    }))
    router.push('/order')
  }

  const handleDimensions = useCallback(() => {}, []) // unused on this page

  return (
    <div className="min-h-screen bg-orange-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm p-4 flex items-center">
        <button onClick={() => router.push('/confirm')} className="text-orange-500 text-xl font-bold w-10">←</button>
        <h1 className="text-2xl font-black text-gray-800 flex-1 text-center">Pick a Material</h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto w-full p-4 space-y-4">

          {/* 3D Model viewer */}
          <div
            className="w-full rounded-3xl overflow-hidden shadow-xl"
            style={{
              height: 'min(45vw, 240px)',
              background: currentMaterial.swatch,
              transition: 'background 0.4s ease',
            }}
          >
            {glbUrl && <ModelViewer glbUrl={glbUrl} onDimensions={handleDimensions} />}
          </div>

          {/* AI detection badge */}
          {detected && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 flex items-center gap-3">
              <span className="text-xl">🤖</span>
              <p className="text-blue-700 text-sm">
                Based on your photos, AI suggests <strong>{MATERIALS.find(m => m.id === suggested)?.name}</strong>
              </p>
            </div>
          )}

          {/* Material grid */}
          <div className="space-y-2">
            {MATERIALS.map((mat) => (
              <button
                key={mat.id}
                onClick={() => setSelected(mat.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left ${
                  selected === mat.id
                    ? 'border-orange-500 bg-orange-50 shadow-md'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {/* Material swatch */}
                <div
                  className="flex-shrink-0 w-14 h-14 rounded-xl shadow-inner border border-black/10"
                  style={{ background: mat.swatch }}
                  aria-hidden
                />
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-800">{mat.name}</span>
                    {mat.id === suggested && (
                      <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                        AI pick ✨
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">{mat.tagline}</p>
                </div>
                {/* Price */}
                <span className="flex-shrink-0 text-orange-600 font-black text-lg">${mat.price}</span>
              </button>
            ))}
          </div>

          {/* Color picker */}
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <p className="font-bold text-gray-700 text-lg">Color</p>
            <div className="flex flex-wrap gap-2">
              {currentMaterial.colors.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`px-4 py-2 rounded-full border-2 text-sm font-semibold transition-all ${
                    selectedColor === color
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 text-gray-600 bg-white'
                  }`}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>

          {/* Continue */}
          <button
            onClick={handleContinue}
            className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 transition-all text-white text-3xl font-black py-6 rounded-3xl shadow-xl"
          >
            Looks good! →
          </button>

          <div className="h-6" />
        </div>
      </div>
    </div>
  )
}
