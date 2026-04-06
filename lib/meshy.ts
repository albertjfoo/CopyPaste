const MESHY_BASE = 'https://api.meshy.ai/openapi/v1'

export interface MeshyTaskStatus {
  id: string
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED'
  progress: number          // 0–100
  model_urls?: {
    glb?: string
    fbx?: string
    obj?: string
    stl?: string
    usdz?: string
  }
  thumbnail_url?: string
  task_error?: { message: string }
  preceding_tasks?: number
}

/**
 * Submit a multi-image-to-3D task to Meshy.
 *
 * The first frame is used as `image_url` (required).
 * Additional frames are sent as `image_urls` for multi-view generation
 * (supported in Meshy image-to-3d v2+).
 */
export async function createMeshyTask(
  frames: string[],         // base64 data URLs, 1–4 images
  texturePrompt?: string,
): Promise<string> {
  const apiKey = process.env.MESHY_API_KEY
  if (!apiKey) throw new Error('MESHY_API_KEY is not set')
  if (frames.length === 0) throw new Error('At least one frame is required')

  const body: Record<string, unknown> = {
    image_url: frames[0],
    enable_pbr: false,       // faster; enable for richer textures if needed
    should_remesh: true,
    target_polycount: 30000,
    auto_size: true,         // AI estimates real-world height and resizes model accordingly
  }

  // Multi-image support (Meshy API v2 image-to-3d)
  if (frames.length > 1) {
    body.image_urls = frames
  }

  if (texturePrompt?.trim()) {
    body.texture_prompt = texturePrompt.trim()
  }

  const res = await fetch(`${MESHY_BASE}/image-to-3d`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Meshy API error ${res.status}: ${text}`)
  }

  const data = await res.json()
  // Meshy returns { result: "task_id" }
  const taskId = data.result ?? data.id
  if (!taskId) throw new Error('Meshy did not return a task ID')
  return taskId as string
}

/** Fetch the current status of a Meshy image-to-3D task. */
export async function getMeshyTaskStatus(taskId: string): Promise<MeshyTaskStatus> {
  const apiKey = process.env.MESHY_API_KEY
  if (!apiKey) throw new Error('MESHY_API_KEY is not set')

  const res = await fetch(`${MESHY_BASE}/image-to-3d/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Meshy status error ${res.status}: ${text}`)
  }

  return res.json()
}

// ── Text-to-Texture ────────────────────────────────────────────────────────────

export interface MeshyTextureStatus {
  id: string
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED'
  progress: number
  model_urls?: { glb?: string; fbx?: string; obj?: string; mtl?: string }
  task_error?: { message: string }
}

/**
 * Apply a new texture to an existing 3D model using a text description.
 * Uses Meshy's text-to-texture endpoint.
 *
 * @param modelUrl     Public URL of the source GLB or OBJ model
 * @param objectPrompt What the object is ("a ceramic mug")
 * @param stylePrompt  How to restyle it ("make it look like dark wood")
 */
export async function createTextureTask(
  modelUrl: string,
  objectPrompt: string,
  stylePrompt: string,
): Promise<string> {
  const apiKey = process.env.MESHY_API_KEY
  if (!apiKey) throw new Error('MESHY_API_KEY is not set')

  const res = await fetch(`${MESHY_BASE}/text-to-texture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model_url: modelUrl,
      object_prompt: objectPrompt || 'a 3D object',
      style_prompt: stylePrompt,
      art_style: 'realistic',
      negative_prompt: 'ugly, blurry, low quality',
      resolution: '1024',
      enable_original_uv: false,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Meshy texture API error ${res.status}: ${text}`)
  }

  const data = await res.json()
  const taskId = data.result ?? data.id
  if (!taskId) throw new Error('Meshy did not return a texture task ID')
  return taskId as string
}

/** Fetch the current status of a Meshy text-to-texture task. */
export async function getTextureTaskStatus(taskId: string): Promise<MeshyTextureStatus> {
  const apiKey = process.env.MESHY_API_KEY
  if (!apiKey) throw new Error('MESHY_API_KEY is not set')

  const res = await fetch(`${MESHY_BASE}/text-to-texture/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Meshy texture status error ${res.status}: ${text}`)
  }

  return res.json()
}
