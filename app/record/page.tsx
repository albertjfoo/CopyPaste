'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { extractFrames, selectBestFrames } from '@/lib/frameExtractor'

type Stage = 'idle' | 'permission' | 'ready' | 'recording' | 'processing' | 'error'

export default function RecordPage() {
  const router = useRouter()
  const videoRef   = useRef<HTMLVideoElement>(null)
  const streamRef  = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef  = useRef<Blob[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [stage, setStage]       = useState<Stage>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [progress, setProgress] = useState(0) // 0-100 during processing
  const [elapsed, setElapsed]   = useState(0) // recording seconds
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  // Start camera preview
  const startCamera = useCallback(async () => {
    setStage('permission')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setStage('ready')
    } catch (err) {
      console.error(err)
      setErrorMsg(
        'Camera access was denied. Please allow camera access in your browser settings, then reload the page.',
      )
      setStage('error')
    }
  }, [])

  useEffect(() => {
    startCamera()
    return () => {
      stopStream()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [startCamera, stopStream])

  const startRecording = () => {
    if (!streamRef.current) return
    chunksRef.current = []

    // Pick best supported mime type
    const mimeTypes = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4', '']
    const mimeType = mimeTypes.find((t) => !t || MediaRecorder.isTypeSupported(t)) ?? ''

    const recorder = new MediaRecorder(
      streamRef.current,
      mimeType ? { mimeType } : undefined,
    )
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorderRef.current = recorder
    recorder.start(250) // collect in 250ms chunks

    setElapsed(0)
    setStage('recording')
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
  }

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    const recorder = recorderRef.current
    if (!recorder) return
    recorder.onstop = () => processVideo(new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' }))
    recorder.stop()
    stopStream()
    setStage('processing')
  }

  const processVideo = async (blob: Blob) => {
    setProgress(0)
    try {
      const candidates = await extractFrames(blob, 30, 512, (p) =>
        setProgress(Math.round(p * 90)),
      )
      if (candidates.length === 0) throw new Error('No frames could be extracted from the video.')
      const selectedIndices = selectBestFrames(candidates, 4)
      setProgress(100)
      // Persist to sessionStorage
      sessionStorage.setItem('makeit_candidates', JSON.stringify(candidates))
      sessionStorage.setItem('makeit_selected', JSON.stringify(selectedIndices))
      router.push('/preview')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Processing failed'
      setErrorMsg(msg)
      setStage('error')
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    stopStream()
    setStage('processing')
    setProgress(0)
    processVideo(file)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (stage === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-6 bg-orange-50">
        <div className="text-6xl">😕</div>
        <p className="text-xl text-center text-gray-700 max-w-xs">{errorMsg}</p>
        <button
          onClick={() => { setErrorMsg(''); startCamera() }}
          className="bg-orange-500 text-white text-xl font-bold py-4 px-10 rounded-2xl shadow"
        >
          Try Again
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-orange-600 text-lg underline"
        >
          Or upload a video instead
        </button>
        <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
      </div>
    )
  }

  if (stage === 'processing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-6 bg-orange-50">
        <div className="text-6xl animate-bounce">🔍</div>
        <p className="text-2xl font-bold text-gray-700">Picking the best photos…</p>
        <div className="w-64 bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className="h-full bg-orange-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-gray-500">{progress}%</p>
      </div>
    )
  }

  return (
    <div className="relative w-screen h-dvh bg-black overflow-hidden">
      {/* Live viewfinder */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        playsInline
        muted
      />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pt-safe">
        <button
          onClick={() => { stopStream(); router.push('/') }}
          className="bg-black/40 text-white text-lg font-bold py-2 px-4 rounded-full backdrop-blur"
        >
          ← Back
        </button>

        {stage === 'recording' && (
          <div className="bg-red-600 text-white font-bold px-4 py-2 rounded-full flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
            {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
          </div>
        )}
      </div>

      {/* Instructions */}
      {stage === 'ready' && (
        <div className="absolute top-24 left-0 right-0 flex justify-center px-6">
          <div className="bg-black/50 text-white text-center px-5 py-3 rounded-2xl backdrop-blur max-w-xs">
            <p className="text-lg font-semibold">Move slowly around the object</p>
            <p className="text-sm text-gray-300 mt-1">Film all sides — 10–30 seconds is perfect</p>
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-4 pb-8 pb-safe px-6">
        {stage === 'ready' && (
          <>
            {/* Record button */}
            <button
              onClick={startRecording}
              className="w-24 h-24 rounded-full bg-red-500 border-4 border-white shadow-2xl active:scale-90 transition-transform flex items-center justify-center"
              aria-label="Start recording"
            >
              <span className="w-8 h-8 rounded-full bg-white" />
            </button>
            {/* Upload option */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-black/40 text-white text-base font-medium py-3 px-8 rounded-full backdrop-blur"
            >
              📁 Upload a video instead
            </button>
          </>
        )}

        {stage === 'recording' && (
          <button
            onClick={stopRecording}
            className="w-24 h-24 rounded-full bg-red-600 border-4 border-white shadow-2xl active:scale-90 transition-transform flex items-center justify-center"
            aria-label="Stop recording"
          >
            <span className="w-8 h-8 rounded-lg bg-white" />
          </button>
        )}

        {(stage === 'idle' || stage === 'permission') && (
          <div className="text-white text-lg animate-pulse">Starting camera…</div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/*"
        className="hidden"
        onChange={handleFileUpload}
      />
    </div>
  )
}
