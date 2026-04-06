'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ExtractedFrame } from '@/lib/frameExtractor'
import Image from 'next/image'

export default function PreviewPage() {
  const router = useRouter()
  const [frames, setFrames]     = useState<ExtractedFrame[]>([])
  const [prompt, setPrompt]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    try {
      const rawCandidates = sessionStorage.getItem('makeit_candidates')
      const rawSelected   = sessionStorage.getItem('makeit_selected')
      if (!rawCandidates || !rawSelected) { router.replace('/record'); return }
      const candidates: ExtractedFrame[] = JSON.parse(rawCandidates)
      const selected: number[] = JSON.parse(rawSelected)
      setFrames(selected.map((i) => candidates[i]))
    } catch {
      router.replace('/record')
    }
  }, [router])

  const handleGenerate = async () => {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frames: frames.map((f) => f.dataUrl),
          prompt: prompt || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'API error')
      sessionStorage.setItem('makeit_prompt', prompt)
      sessionStorage.setItem('makeit_task_id', data.taskId)
      router.push(`/generating/${data.taskId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  if (frames.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-50">
        <div className="text-2xl text-gray-400 animate-pulse">Loading…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-orange-50 flex flex-col">
      <div className="bg-white shadow-sm p-4 flex items-center gap-3">
        <button onClick={() => router.push('/record')} className="text-orange-500 text-xl font-bold">
          ← Redo
        </button>
        <h1 className="text-2xl font-black text-gray-800 flex-1 text-center pr-10">
          Ready to go!
        </h1>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-5 max-w-lg mx-auto w-full">
        <div className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-xl bg-gray-100">
          <Image src={frames[0].dataUrl} alt="Preview" fill className="object-cover" unoptimized />
          <div className="absolute bottom-3 left-3 bg-black/50 text-white text-sm font-semibold px-3 py-1 rounded-full backdrop-blur">
            {frames.length} photos captured ✓
          </div>
        </div>

        {frames.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {frames.map((f, i) => (
              <div key={i} className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 border-orange-200">
                <Image src={f.dataUrl} alt={`Frame ${i + 1}`} fill className="object-cover" unoptimized />
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <p className="text-lg font-bold text-gray-700">
            What is it? <span className="font-normal text-gray-400">(optional)</span>
          </p>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. a coffee mug, a toy car…"
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-orange-400"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-center">
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={submitting}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 active:scale-95 transition-all text-white text-3xl font-black py-7 rounded-3xl shadow-xl"
        >
          {submitting ? '⏳ Starting…' : 'CopyPaste It! 🚀'}
        </button>

        <div className="h-4" />
      </div>
    </div>
  )
}
