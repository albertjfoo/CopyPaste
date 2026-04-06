import { NextRequest } from 'next/server'
import { getTextureTaskStatus } from '@/lib/meshy'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(': heartbeat\n\n'))
      }, 20_000)

      try {
        for (let i = 0; i < 150; i++) {
          const status = await getTextureTaskStatus(taskId)
          send(status)
          if (status.status === 'SUCCEEDED' || status.status === 'FAILED' || status.status === 'EXPIRED') break
          await new Promise((r) => setTimeout(r, 4_000))
        }
      } catch (err) {
        send({ status: 'FAILED', error: err instanceof Error ? err.message : 'Polling error', progress: 0 })
      } finally {
        clearInterval(heartbeat)
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
