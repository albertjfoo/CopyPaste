import { NextRequest, NextResponse } from 'next/server'
import { createTextureTask } from '@/lib/meshy'

export async function POST(req: NextRequest) {
  try {
    const { modelUrl, objectPrompt, editPrompt } = await req.json() as {
      modelUrl: string
      objectPrompt?: string
      editPrompt: string
    }

    if (!modelUrl || !editPrompt) {
      return NextResponse.json({ error: 'modelUrl and editPrompt are required' }, { status: 400 })
    }

    const taskId = await createTextureTask(modelUrl, objectPrompt ?? '3D object', editPrompt)
    return NextResponse.json({ taskId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/retouch]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
