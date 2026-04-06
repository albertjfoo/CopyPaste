export interface ExtractedFrame {
  dataUrl: string   // JPEG base64 data URL
  timestamp: number // seconds into the video
  sharpness: number // higher = sharper
}

/** Compute Laplacian variance of a grayscale image — proxy for sharpness. */
function laplacianVariance(imageData: ImageData): number {
  const { width, height, data } = imageData
  let sum = 0
  let sumSq = 0
  let n = 0

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      // Grayscale via luminosity weights for 8 neighbours + center
      const idx = (y * width + x) * 4
      const gray = (r: number, g: number, b: number) =>
        0.299 * r + 0.587 * g + 0.114 * b

      const c = gray(data[idx], data[idx + 1], data[idx + 2])

      const tl = gray(data[((y - 1) * width + (x - 1)) * 4], data[((y - 1) * width + (x - 1)) * 4 + 1], data[((y - 1) * width + (x - 1)) * 4 + 2])
      const t  = gray(data[((y - 1) * width + x) * 4],       data[((y - 1) * width + x) * 4 + 1],       data[((y - 1) * width + x) * 4 + 2])
      const tr = gray(data[((y - 1) * width + (x + 1)) * 4], data[((y - 1) * width + (x + 1)) * 4 + 1], data[((y - 1) * width + (x + 1)) * 4 + 2])
      const l  = gray(data[(y * width + (x - 1)) * 4],        data[(y * width + (x - 1)) * 4 + 1],        data[(y * width + (x - 1)) * 4 + 2])
      const r2 = gray(data[(y * width + (x + 1)) * 4],        data[(y * width + (x + 1)) * 4 + 1],        data[(y * width + (x + 1)) * 4 + 2])
      const bl = gray(data[((y + 1) * width + (x - 1)) * 4], data[((y + 1) * width + (x - 1)) * 4 + 1], data[((y + 1) * width + (x - 1)) * 4 + 2])
      const b  = gray(data[((y + 1) * width + x) * 4],       data[((y + 1) * width + x) * 4 + 1],       data[((y + 1) * width + x) * 4 + 2])
      const br = gray(data[((y + 1) * width + (x + 1)) * 4], data[((y + 1) * width + (x + 1)) * 4 + 1], data[((y + 1) * width + (x + 1)) * 4 + 2])

      // Laplacian kernel: 8*center - 8 neighbors
      const lap = 8 * c - tl - t - tr - l - r2 - bl - b - br
      sum += lap
      sumSq += lap * lap
      n++
    }
  }

  if (n === 0) return 0
  const mean = sum / n
  return sumSq / n - mean * mean
}

/** Seek a video element to `time` seconds and wait for the seeked event. */
function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - time) < 0.01) {
      resolve()
      return
    }
    const handler = () => resolve()
    video.addEventListener('seeked', handler, { once: true })
    video.currentTime = time
  })
}

/**
 * Extract candidate frames from a video blob at regular intervals.
 * Frames are scored for sharpness using Laplacian variance.
 *
 * @param videoBlob  The recorded/uploaded video
 * @param maxFrames  Maximum number of candidate frames to extract (default 30)
 * @param outputSize Maximum dimension of the output JPEG (default 512)
 * @param onProgress Called with 0–1 progress during extraction
 */
export async function extractFrames(
  videoBlob: Blob,
  maxFrames = 30,
  outputSize = 512,
  onProgress?: (p: number) => void,
): Promise<ExtractedFrame[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'metadata'

    const url = URL.createObjectURL(videoBlob)
    video.src = url

    video.addEventListener('error', () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not load video for frame extraction'))
    })

    video.addEventListener('loadedmetadata', async () => {
      try {
        let duration = video.duration

        // MediaRecorder-produced files often have duration=Infinity because
        // the container header is never finalised. Fix: seek to a huge value
        // which forces the browser to discover the real end time.
        if (!isFinite(duration) || duration <= 0) {
          await new Promise<void>((res) => {
            video.addEventListener('seeked', () => res(), { once: true })
            video.currentTime = 1e10 // seek way past the end
          })
          duration = video.duration
        }

        if (!isFinite(duration) || duration <= 0) {
          throw new Error('Could not determine video length. Please try recording again.')
        }

        // Determine sample interval so we get at most maxFrames frames
        const interval = Math.max(0.5, duration / maxFrames)
        const timestamps: number[] = []
        for (let t = 0; t < duration - 0.1; t += interval) {
          timestamps.push(Math.min(t, duration - 0.05))
        }

        // Set up canvas scaled to outputSize
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        const scale = Math.min(outputSize / video.videoWidth, outputSize / video.videoHeight, 1)
        canvas.width  = Math.round(video.videoWidth  * scale)
        canvas.height = Math.round(video.videoHeight * scale)

        const frames: ExtractedFrame[] = []

        for (let i = 0; i < timestamps.length; i++) {
          await seekTo(video, timestamps[i])
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const sharpness = laplacianVariance(imageData)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
          frames.push({ dataUrl, timestamp: timestamps[i], sharpness })
          onProgress?.((i + 1) / timestamps.length)
        }

        URL.revokeObjectURL(url)
        resolve(frames)
      } catch (err) {
        URL.revokeObjectURL(url)
        reject(err)
      }
    })

    // Trigger load
    video.load()
  })
}

/**
 * From a pool of candidate frames, pick `count` frames that are:
 *  1. Sharp (high Laplacian variance)
 *  2. Spread across the video's duration (angle diversity proxy)
 *
 * Strategy: divide the timeline into `count` equal segments and pick
 * the sharpest frame from each segment.
 */
export function selectBestFrames(frames: ExtractedFrame[], count = 4): number[] {
  if (frames.length === 0) return []
  if (frames.length <= count) return frames.map((_, i) => i)

  const segmentSize = frames.length / count
  const selected: number[] = []

  for (let s = 0; s < count; s++) {
    const start = Math.floor(s * segmentSize)
    const end   = Math.min(Math.ceil((s + 1) * segmentSize), frames.length)
    let bestIdx = start
    for (let i = start + 1; i < end; i++) {
      if (frames[i].sharpness > frames[bestIdx].sharpness) bestIdx = i
    }
    selected.push(bestIdx)
  }

  return selected
}
