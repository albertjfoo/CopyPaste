'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const ModelViewer = dynamic(() => import('@/components/ModelViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="text-2xl animate-spin">⚙️</div>
    </div>
  ),
})

interface MaterialInfo {
  id: string
  name: string
  color: string
  price: number
}

type OrderStep = 'summary' | 'shipping' | 'placed'

const MATERIAL_SWATCHES: Record<string, string> = {
  pla:   'linear-gradient(135deg, #f8f9fa 0%, #dee2e6 60%, #adb5bd 100%)',
  wood:  'repeating-linear-gradient(100deg, #8B5E3C 0px, #7A5230 4px, #6B4423 8px, #8B5E3C 12px)',
  resin: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 50%, #c3e0fc 100%)',
  metal: 'linear-gradient(135deg, #C0C0C0 0%, #e8e8e8 30%, #9e9e9e 60%, #d4d4d4 100%)',
  flex:  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
}

const MATERIAL_EMOJIS: Record<string, string> = {
  pla: '🟧', wood: '🪵', resin: '💎', metal: '🔩', flex: '🫧',
}

export default function OrderPage() {
  const router = useRouter()
  const [material, setMaterial] = useState<MaterialInfo | null>(null)
  const [glbUrl, setGlbUrl]     = useState('')
  const [step, setStep]         = useState<OrderStep>('summary')
  const [name, setName]         = useState('')
  const [address, setAddress]   = useState('')
  const [orderNumber]           = useState(() => `MK-${Math.floor(10000 + Math.random() * 90000)}`)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('makeit_material')
      if (!raw) { router.replace('/'); return }
      setMaterial(JSON.parse(raw))

      const rawUrls = sessionStorage.getItem('makeit_model_urls')
      if (rawUrls) {
        const urls = JSON.parse(rawUrls)
        if (urls.glb) setGlbUrl(`/api/proxy?url=${encodeURIComponent(urls.glb)}`)
      }
    } catch { router.replace('/') }
  }, [router])

  const total = material ? (material.price + 4.99).toFixed(2) : '0.00'
  const swatch = material ? (MATERIAL_SWATCHES[material.id] ?? MATERIAL_SWATCHES.pla) : ''

  if (!material) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-50">
        <div className="text-2xl text-gray-400 animate-pulse">Loading…</div>
      </div>
    )
  }

  // ── Order placed ─────────────────────────────────────────────────────────────
  if (step === 'placed') {
    return (
      <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-8 gap-6 text-center">
        <div className="text-7xl animate-bounce">🎉</div>
        <h1 className="text-5xl font-black text-gray-800">Order placed!</h1>
        <p className="text-xl text-gray-600">Your {material.name} model is being printed!</p>

        <div className="bg-white rounded-3xl shadow-lg p-6 w-full max-w-sm space-y-3">
          <div className="flex justify-between text-gray-700">
            <span className="font-semibold">Order number</span>
            <span className="font-black text-orange-500">{orderNumber}</span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>Material</span>
            <span className="font-semibold">{material.name} — {material.color}</span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>Estimated delivery</span>
            <span className="font-semibold">5–7 business days</span>
          </div>
          <div className="border-t border-gray-100 pt-3 flex justify-between font-black text-lg">
            <span>Total charged</span>
            <span className="text-orange-600">${total}</span>
          </div>
        </div>

        <p className="text-gray-400 text-sm">A confirmation has been sent to your email.</p>
        <button
          onClick={() => { sessionStorage.clear(); router.push('/') }}
          className="bg-orange-500 text-white text-xl font-bold py-5 px-12 rounded-2xl shadow mt-2"
        >
          Make another one ✨
        </button>
      </div>
    )
  }

  // ── Shipping ─────────────────────────────────────────────────────────────────
  if (step === 'shipping') {
    return (
      <div className="min-h-screen bg-orange-50 flex flex-col">
        <div className="bg-white shadow-sm p-4 flex items-center">
          <button onClick={() => setStep('summary')} className="text-orange-500 text-xl font-bold w-10">←</button>
          <h1 className="text-2xl font-black text-gray-800 flex-1 text-center">Shipping</h1>
          <div className="w-10" />
        </div>

        <div className="flex-1 p-4 space-y-4 max-w-lg mx-auto w-full">
          <div>
            <label className="block text-gray-700 font-bold mb-1 text-lg">Your name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 text-xl focus:outline-none focus:border-orange-400"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-bold mb-1 text-lg">Delivery address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={'123 Main Street\nSpringfield, CA 90210'}
              rows={3}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 text-xl focus:outline-none focus:border-orange-400 resize-none"
            />
          </div>

          {/* Mini summary */}
          <div className="bg-white rounded-2xl shadow-sm p-4 flex justify-between items-center">
            <div>
              <p className="font-bold text-gray-800">{material.name}</p>
              <p className="text-gray-500">{material.color} · ${material.price}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Shipping</p>
              <p className="text-gray-700 font-semibold">$4.99</p>
            </div>
          </div>

          <div className="flex justify-between font-black text-xl px-1">
            <span>Total</span>
            <span className="text-orange-600">${total}</span>
          </div>

          <button
            onClick={() => setStep('placed')}
            disabled={!name.trim() || !address.trim()}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 active:scale-95 transition-all text-white text-3xl font-black py-6 rounded-3xl shadow-xl"
          >
            Place Order 🎉
          </button>
          <div className="h-4" />
        </div>
      </div>
    )
  }

  // ── Order summary ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-orange-50 flex flex-col">
      <div className="bg-white shadow-sm p-4 flex items-center">
        <button onClick={() => router.push('/material')} className="text-orange-500 text-xl font-bold w-10">←</button>
        <h1 className="text-2xl font-black text-gray-800 flex-1 text-center">Your Order</h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 p-4 space-y-4 max-w-lg mx-auto w-full">

        {/* Product card — 3D model + material side by side */}
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          <div className="flex" style={{ height: 200 }}>
            {/* 3D model — left 60% */}
            <div className="relative flex-1 bg-gradient-to-br from-gray-100 to-gray-200">
              {glbUrl && <ModelViewer glbUrl={glbUrl} autoRotate />}
              <div className="absolute bottom-2 left-3">
                <p className="font-black text-gray-800 text-base leading-tight">Your Custom Model</p>
                <p className="text-xs text-gray-500">3D Printed</p>
              </div>
            </div>

            {/* Material swatch — right 40% */}
            <div
              className="w-2/5 flex flex-col items-center justify-center gap-2 p-3 border-l border-gray-100"
              style={{ background: swatch }}
            >
              <span className="text-4xl">{MATERIAL_EMOJIS[material.id] ?? '🟧'}</span>
              <div className="text-center">
                <p className="font-black text-gray-800 text-sm leading-tight">{material.name}</p>
                <p className="text-xs text-gray-600">{material.color}</p>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="p-5 space-y-2 text-gray-700 border-t border-gray-100">
            <div className="flex justify-between">
              <span>Print + finish</span>
              <span className="font-semibold">${material.price}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span className="font-semibold">$4.99</span>
            </div>
            <div className="flex justify-between font-black text-lg border-t border-gray-100 pt-2">
              <span>Total</span>
              <span className="text-orange-600">${total}</span>
            </div>
          </div>
        </div>

        {/* Delivery */}
        <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4">
          <span className="text-3xl">📦</span>
          <div>
            <p className="font-bold text-gray-800">Estimated delivery</p>
            <p className="text-gray-500">5–7 business days</p>
          </div>
        </div>

        <button
          onClick={() => setStep('shipping')}
          className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 transition-all text-white text-3xl font-black py-6 rounded-3xl shadow-xl"
        >
          Continue to Shipping →
        </button>

        <button
          onClick={() => router.push('/material')}
          className="w-full text-gray-400 font-semibold text-lg py-3 text-center"
        >
          ← Change material
        </button>

        <div className="h-4" />
      </div>
    </div>
  )
}
