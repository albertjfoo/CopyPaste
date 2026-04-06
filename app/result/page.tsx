'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { MeshyTextureStatus } from '@/lib/meshy'

const ModelViewer = dynamic(() => import('@/components/ModelViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="text-center text-gray-500">
        <div className="text-4xl mb-2 animate-spin">⚙️</div>
        <p>Loading 3D model…</p>
      </div>
    </div>
  ),
})

interface ModelUrls { glb?: string; stl?: string; fbx?: string; obj?: string }

type EditState = 'idle' | 'input' | 'retexturing' | 'done'

const FUN_RETEXTURE = [
  'Repainting your model…',
  'Applying new textures…',
  'Almost done…',
]

export default function ResultPage() {
  const router = useRouter()

  const [modelUrls, setModelUrls]   = useState<ModelUrls | null>(null)
  const [glbUrl, setGlbUrl]         = useState('')           // proxied URL for viewer
  const [editState, setEditState]   = useState<EditState>('idle')
  const [editText, setEditText]     = useState('')
  const [editProgress, setEditProgress] = useState(0)
  const [editMsg, setEditMsg]       = useState('')
  const [editError, setEditError]   = useState('')
  const [listening, setListening]   = useState(false)
  const msgIdx = useRef(0)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('makeit_model_urls')
      if (!raw) { router.replace('/'); return }
      const urls: ModelUrls = JSON.parse(raw)
      setModelUrls(urls)
      if (urls.glb) setGlbUrl(`/api/proxy?url=${encodeURIComponent(urls.glb)}`)
    } catch {
      router.replace('/')
    }
  }, [router])

  // Cycle fun messages during retexturing
  useEffect(() => {
    if (editState !== 'retexturing') return
    const interval = setInterval(() => {
      msgIdx.current = (msgIdx.current + 1) % FUN_RETEXTURE.length
      setEditMsg(FUN_RETEXTURE[msgIdx.current])
    }, 3500)
    setEditMsg(FUN_RETEXTURE[0])
    return () => clearInterval(interval)
  }, [editState])

  const startListening = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const r = new SR()
    r.continuous = false
    r.interimResults = false
    r.lang = 'en-US'
    r.onresult = (e: SpeechRecognitionEvent) => setEditText(e.results[0][0].transcript)
    r.onend = () => setListening(false)
    r.onerror = () => setListening(false)
    recognitionRef.current = r
    r.start()
    setListening(true)
  }

  const submitEdit = async () => {
    if (!editText.trim() || !modelUrls) return
    setEditError('')
    setEditState('retexturing')
    setEditProgress(0)

    // Use OBJ if available (better for text-to-texture), else GLB
    const modelUrl = modelUrls.obj ?? modelUrls.glb ?? ''
    const objectPrompt = sessionStorage.getItem('makeit_prompt') ?? '3D object'

    try {
      const res = await fetch('/api/retouch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelUrl, objectPrompt, editPrompt: editText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'API error')

      // Poll via SSE
      const es = new EventSource(`/api/texture-status/${data.taskId}`)
      es.onmessage = (e) => {
        try {
          const status = JSON.parse(e.data) as MeshyTextureStatus & { error?: string }
          if (typeof status.progress === 'number') setEditProgress(status.progress)

          if (status.status === 'SUCCEEDED' && status.model_urls?.glb) {
            const newGlb = status.model_urls.glb
            // Update stored URLs and viewer
            const updated = { ...modelUrls, ...status.model_urls }
            sessionStorage.setItem('makeit_model_urls', JSON.stringify(updated))
            setModelUrls(updated)
            setGlbUrl(`/api/proxy?url=${encodeURIComponent(newGlb)}`)
            setEditState('done')
            setEditText('')
            es.close()
          } else if (status.status === 'FAILED' || status.status === 'EXPIRED') {
            setEditError(status.task_error?.message ?? status.error ?? 'Retexturing failed')
            setEditState('input')
            es.close()
          }
        } catch { /* ignore heartbeat */ }
      }
      es.onerror = () => {
        setEditError('Connection lost. Please try again.')
        setEditState('input')
        es.close()
      }
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Something went wrong')
      setEditState('input')
    }
  }

  if (!modelUrls) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-50">
        <div className="text-2xl text-gray-400 animate-pulse">Loading…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-orange-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm p-4 text-center">
        <h1 className="text-3xl font-black text-gray-800">Your 3D Model! 🎉</h1>
        <p className="text-gray-400 text-sm mt-1">Drag to spin it around</p>
      </div>

      {/* 3D Viewer */}
      <div className="mx-4 mt-4 rounded-3xl overflow-hidden shadow-xl bg-gradient-to-br from-gray-100 to-gray-200" style={{ height: '50vh' }}>
        {glbUrl ? (
          <ModelViewer glbUrl={glbUrl} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl">
            Preview not available
          </div>
        )}
      </div>

      {/* ── Bottom panel ── */}
      <div className="p-4 space-y-3 max-w-lg mx-auto w-full">

        {/* Retexturing progress overlay */}
        {editState === 'retexturing' && (
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3 text-center">
            <div className="text-4xl animate-bounce">🎨</div>
            <p className="text-lg font-bold text-gray-700">{editMsg}</p>
            <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.max(editProgress, 3)}%` }}
              />
            </div>
            <p className="text-sm text-gray-400">{editProgress}%</p>
          </div>
        )}

        {/* Done retexturing — show again options */}
        {editState === 'done' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <p className="text-green-700 font-semibold">Updated! How does it look?</p>
          </div>
        )}

        {/* Edit error */}
        {editError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-3 text-sm text-center">
            {editError}
          </div>
        )}

        {/* Edit input panel */}
        {editState === 'input' && (
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <p className="text-lg font-bold text-gray-700">What should I change?</p>
            <p className="text-sm text-gray-400">
              Try: "make it look like wood", "make it shiny", "make it blue"
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="Describe the change…"
                className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-orange-400"
                autoFocus
              />
              <button
                onClick={startListening}
                className={`px-4 py-3 rounded-xl text-2xl border-2 ${
                  listening ? 'bg-red-100 border-red-400 animate-pulse' : 'bg-gray-100 border-gray-200'
                }`}
                aria-label="Speak"
              >
                🎤
              </button>
            </div>
            {listening && <p className="text-sm text-red-500 animate-pulse">Listening…</p>}
            <div className="flex gap-2">
              <button
                onClick={() => { setEditState('idle'); setEditText('') }}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-lg"
              >
                Cancel
              </button>
              <button
                onClick={submitEdit}
                disabled={!editText.trim()}
                className="flex-1 py-3 rounded-xl bg-orange-500 disabled:bg-orange-300 text-white font-bold text-lg"
              >
                Apply
              </button>
            </div>
          </div>
        )}

        {/* Main action buttons */}
        {editState !== 'retexturing' && editState !== 'input' && (
          <>
            <button
              onClick={() => router.push('/confirm')}
              className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 transition-all text-white text-3xl font-black py-6 rounded-3xl shadow-xl"
            >
              Looks great! →
            </button>
            <button
              onClick={() => setEditState('input')}
              className="w-full bg-white border-2 border-gray-200 hover:border-orange-300 active:scale-95 transition-all text-gray-600 text-xl font-bold py-4 rounded-2xl shadow-sm"
            >
              🎨 Adjust the look
            </button>
            <button
              onClick={() => router.push('/record')}
              className="w-full text-gray-400 text-base py-3"
            >
              Start over
            </button>
          </>
        )}
      </div>

      <div className="h-6" />
    </div>
  )
}
