import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_HOSTS = ['assets.meshy.ai', 'cdn.meshy.ai', 'meshy.ai']

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')

  if (!url) return NextResponse.json({ error: 'Missing url param' }, { status: 400 })

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  const isAllowed = ALLOWED_HOSTS.some(
    (h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`),
  )
  if (!isAllowed) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 })
  }

  const upstream = await fetch(url)
  if (!upstream.ok) {
    return NextResponse.json({ error: 'Upstream fetch failed' }, { status: 502 })
  }

  // Ensure correct MIME types — iOS Quick Look requires the exact USDZ type
  let contentType = upstream.headers.get('Content-Type') ?? 'application/octet-stream'
  if (url.endsWith('.usdz')) contentType = 'model/vnd.usdz+zip'
  if (url.endsWith('.glb'))  contentType = 'model/gltf-binary'

  return new Response(upstream.body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
