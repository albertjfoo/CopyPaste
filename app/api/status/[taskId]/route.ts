import { NextRequest } from 'next/server'
import { getMeshyTaskStatus } from '@/lib/meshy'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { taskId: string } },
) {
  const { taskId } = params

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      // Heartbeat to prevent Railway / proxy timeouts (every 20 s)
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(': heartbeat\n\n'))
      }, 20_000)

      try {
        // Poll Meshy every 4 seconds until terminal state
        for (let attempts = 0; attempts < 150; attempts++) {
          const status = await getMeshyTaskStatus(taskId)
          send(status)

          if (status.status === 'SUCCEEDED' || status.status === 'FAILED' || status.status === 'EXPIRED') {
            break
          }

          // Wait 4 s before next poll
          await new Promise((r) => setTimeout(r, 4_000))
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Polling error'
        send({ status: 'FAILED', error: message, progress: 0 })
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
      'X-Accel-Buffering': 'no', // Disable Nginx buffering (Railway uses Nginx)
    },
  })
}
