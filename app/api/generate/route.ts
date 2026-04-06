import { NextRequest, NextResponse } from 'next/server'
import { createMeshyTask } from '@/lib/meshy'

export async function POST(req: NextRequest) {
  try {
    const { frames, prompt } = await req.json() as {
      frames: string[]
      prompt?: string
    }

    if (!Array.isArray(frames) || frames.length === 0) {
      return NextResponse.json({ error: 'frames array is required' }, { status: 400 })
    }

    // Validate that each frame looks like a base64 data URL
    for (const f of frames) {
      if (typeof f !== 'string' || !f.startsWith('data:image/')) {
        return NextResponse.json({ error: 'Invalid frame format' }, { status: 400 })
      }
    }

    const taskId = await createMeshyTask(frames, prompt)
    return NextResponse.json({ taskId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/generate]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
