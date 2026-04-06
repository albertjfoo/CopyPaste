'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import type { MeshyTaskStatus } from '@/lib/meshy'

type UIState = 'waiting' | 'done' | 'failed'

const FUN_MESSAGES = [
  'Waking up the 3D robots…',
  'Studying your object from every angle…',
  'Building tiny virtual bricks…',
  'Adding all the little details…',
  'Smoothing out the rough edges…',
  'Almost there! Polishing it up…',
]

export default function GeneratingPage() {
  const router = useRouter()
  const params = useParams()
  const taskId = params.taskId as string

  const [uiState, setUiState] = useState<UIState>('waiting')
  const [progress, setProgress] = useState(0)
  const [msgIdx, setMsgIdx] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [preceding, setPreceding] = useState<number | null>(null)

  // Cycle through fun messages every few seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIdx((i) => (i + 1) % FUN_MESSAGES.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  // Connect to SSE status stream
  useEffect(() => {
    if (!taskId) return
    const es = new EventSource(`/api/status/${taskId}`)

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as MeshyTaskStatus & { error?: string }

        if (typeof data.progress === 'number') setProgress(data.progress)
        if (typeof data.preceding_tasks === 'number') setPreceding(data.preceding_tasks)

        if (data.status === 'SUCCEEDED') {
          // Store model URLs for the result page
          sessionStorage.setItem('makeit_model_urls', JSON.stringify(data.model_urls ?? {}))
          sessionStorage.setItem('makeit_thumbnail', data.thumbnail_url ?? '')
          setProgress(100)
          setUiState('done')
          es.close()
          setTimeout(() => router.push('/result'), 800)
        } else if (data.status === 'FAILED' || data.status === 'EXPIRED') {
          setErrorMsg(data.task_error?.message ?? data.error ?? 'Generation failed. Please try again.')
          setUiState('failed')
          es.close()
        }
      } catch {
        // ignore parse errors from heartbeat comments
      }
    }

    es.onerror = () => {
      // SSE may close naturally after completion; only flag as error if not done
      setUiState((current) => {
        if (current === 'waiting') {
          setErrorMsg('Connection lost. Please check your internet and try again.')
          return 'failed'
        }
        return current
      })
      es.close()
    }

    return () => es.close()
  }, [taskId, router])

  if (uiState === 'failed') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-6 bg-orange-50">
        <div className="text-6xl">😔</div>
        <h2 className="text-2xl font-black text-gray-800 text-center">Something went wrong</h2>
        <p className="text-gray-600 text-center max-w-xs">{errorMsg}</p>
        <button
          onClick={() => router.push('/record')}
          className="bg-orange-500 text-white text-xl font-bold py-5 px-12 rounded-2xl shadow"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-orange-50 gap-8">
      {/* Big animated icon */}
      <div className="relative w-36 h-36 flex items-center justify-center">
        {/* Spinning ring */}
        <div className="absolute inset-0 rounded-full border-8 border-orange-200 border-t-orange-500 animate-spin" />
        <span className="text-5xl">🖨️</span>
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-gray-800">Making your 3D file…</h2>
        <p className="text-xl text-orange-500 font-medium min-h-[1.75rem] transition-all">
          {uiState === 'done' ? '✅ Done!' : FUN_MESSAGES[msgIdx]}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs space-y-2">
        <div className="bg-gray-200 rounded-full h-5 overflow-hidden">
          <div
            className="h-full bg-orange-500 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${Math.max(progress, uiState === 'done' ? 100 : 2)}%` }}
          />
        </div>
        <p className="text-center text-gray-500 text-sm">
          {uiState === 'done'
            ? 'Ready!'
            : progress > 0
            ? `${progress}% complete`
            : preceding != null && preceding > 0
            ? `${preceding} task${preceding === 1 ? '' : 's'} ahead of yours`
            : 'Starting up…'}
        </p>
      </div>

      <p className="text-gray-400 text-sm text-center max-w-xs">
        This usually takes 1–3 minutes. Keep this screen open!
      </p>
    </div>
  )
}
