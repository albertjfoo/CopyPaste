'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ExtractedFrame } from '@/lib/frameExtractor'
import Image from 'next/image'

export default function ReviewPage() {
  const router = useRouter()

  const [candidates, setCandidates] = useState<ExtractedFrame[]>([])
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])
  const [prompt, setPrompt] = useState('')
  const [swapTarget, setSwapTarget] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Load from sessionStorage
  useEffect(() => {
    try {
      const rawCandidates = sessionStorage.getItem('makeit_candidates')
      const rawSelected   = sessionStorage.getItem('makeit_selected')
      if (!rawCandidates || !rawSelected) {
        router.replace('/record')
        return
      }
      setCandidates(JSON.parse(rawCandidates))
      setSelectedIndices(JSON.parse(rawSelected))
    } catch {
      router.replace('/record')
    }
  }, [router])

  const swapFrame = (candidateIdx: number) => {
    if (swapTarget === null) return
    setSelectedIndices((prev) => {
      const next = [...prev]
      next[swapTarget] = candidateIdx
      return next
    })
    setSwapTarget(null)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const frames = selectedIndices.map((i) => candidates[i].dataUrl)
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frames, prompt: prompt || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'API error')
      sessionStorage.setItem('makeit_task_id', data.taskId)
      router.push(`/generating/${data.taskId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  if (candidates.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-50">
        <div className="text-2xl text-gray-500 animate-pulse">Loading…</div>
      </div>
    )
  }

  const selectedFrames = selectedIndices.map((i) => candidates[i])

  return (
    <div className="min-h-screen bg-orange-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-white shadow-sm">
        <button
          onClick={() => router.push('/record')}
          className="text-orange-500 text-xl font-bold"
        >
          ← Redo
        </button>
        <h1 className="text-2xl font-black text-gray-800 flex-1 text-center pr-10">
          Your Photos
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 max-w-lg mx-auto w-full">
        {/* Selected frames */}
        <div>
          <p className="text-gray-500 text-sm mb-3">
            I picked these {selectedFrames.length} photos. Tap <strong>Swap</strong> to change any of them.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {selectedFrames.map((frame, slotIdx) => (
              <div key={slotIdx} className="relative rounded-2xl overflow-hidden shadow-md bg-gray-100 aspect-square">
                <Image
                  src={frame.dataUrl}
                  alt={`Selected frame ${slotIdx + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <button
                  onClick={() => setSwapTarget(slotIdx)}
                  className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur"
                >
                  Swap
                </button>
                <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                  {slotIdx + 1}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Description input */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <label className="block text-lg font-bold text-gray-700">
            Describe it (optional)
          </label>
          <p className="text-sm text-gray-400">
            Tell us what it is or how you&apos;d like it to look
          </p>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. a red ceramic mug"
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-orange-400"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-center">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 active:scale-95 transition-all text-white text-3xl font-black py-6 rounded-3xl shadow-xl"
        >
          {submitting ? '⏳ Sending…' : 'Make It! 🚀'}
        </button>

        <div className="h-4" />
      </div>

      {/* Swap modal */}
      {swapTarget !== null && (
        <div className="fixed inset-0 bg-black/70 z-50 flex flex-col" onClick={() => setSwapTarget(null)}>
          <div
            className="mt-auto bg-white rounded-t-3xl max-h-[70vh] overflow-y-auto p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-gray-800">
                Pick a replacement
              </h2>
              <button onClick={() => setSwapTarget(null)} className="text-gray-400 text-2xl leading-none">×</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {candidates.map((frame, idx) => {
                const isCurrent = selectedIndices[swapTarget] === idx
                return (
                  <button
                    key={idx}
                    onClick={() => swapFrame(idx)}
                    className={`relative aspect-square rounded-xl overflow-hidden border-4 transition-all ${
                      isCurrent ? 'border-orange-500' : 'border-transparent'
                    }`}
                  >
                    <Image
                      src={frame.dataUrl}
                      alt={`Candidate frame at ${frame.timestamp.toFixed(1)}s`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    {isCurrent && (
                      <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
                        <span className="text-white text-2xl">✓</span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            <div className="h-4" />
          </div>
        </div>
      )}
    </div>
  )
}
