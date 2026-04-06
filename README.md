[README.md](https://github.com/user-attachments/files/26494163/README.md)
# CopyPaste — AI-Powered 3D Printing for Everyone

> *My mom kept calling me to print things for her. I built this so she doesn't have to.*

**CopyPaste** is a mobile-first web app that lets non-technical users go from a broken household object to a 3D-printed copy delivered to their door — no CAD knowledge, no app install, no friction.

---

## The Problem

My mom is not technical. But she lives in a house full of things that break — cabinet hooks, oven knobs, little trophies she wants to make for her baking club. Every time something broke or she had an idea, she'd FaceTime me, describe it, I'd model it, iterate with her, print it, and ship it to her.

The process took days. It shouldn't.

## What We Did Instead

Whenever my mom needed something, she'd just FaceTime me — point the camera at the broken object, describe what she wanted, and we'd figure it out together over video. That handoff was natural and low friction for her. The problem was everything after: me modeling it, going back and forth on adjustments, printing it, and shipping it to her.

This app replaces me in that loop. She records a short video of the object the same way she'd show it to me over FaceTime, says what she wants, and the app handles the rest.

---

## The Solution

A dead-simple mobile web app with one job: turn a short video of an object into a physical 3D-printed copy, with as little friction as possible.

```
Record video → Auto-extract keyframes → Generate 3D model → Adjust → Place in AR → Order print
```

No account. No app download. Just a URL she can bookmark.

---

## Success Metrics

The goal isn't just "generates a 3D model" — it's whether my mom can actually get what she needs without calling me. Three metrics matter:

- **Success rate** — out of all the times she needs something printed, does she get it fulfilled end to end?
- **Speed** — how long from starting the app to having a physical object in her hands?
- **Quality** — does she actually use the printed object, or does it sit in a drawer?

---

## How It Works

### 1. Video Capture
The app uses the browser's `getUserMedia` API with `facingMode: environment` to access the rear camera directly in mobile Safari and Chrome — no app install required. Users can also upload a video from their camera roll.

### 2. Smart Keyframe Extraction
Rather than sending raw video to the API, the app extracts candidate frames every 0.5 seconds using a `<canvas>` element, then scores each frame for:
- **Sharpness** — using Laplacian variance to filter out motion blur
- **Angle diversity** — selecting frames spread across the video timeline to maximise geometric coverage

The best 3–4 frames are auto-selected silently, then a simple preview is shown so the user can confirm before anything is sent.

### 3. Multi-Image to 3D via Meshy API
Selected keyframes are sent as base64 data URIs to the [Meshy Multi-Image to 3D API](https://docs.meshy.ai/en/api/image-to-3d), along with an optional text description as `texture_prompt`. Using multiple angles gives the model significantly more geometric context than a single image.

Real-time progress is streamed back to the client via Server-Sent Events (SSE).

### 4. Auto Sizing
The model is generated with `auto_size: true`, which uses Meshy's AI vision to automatically estimate the real-world height of the object and resize the model accordingly — critical for functional 3D printing.

### 5. Adjust the Look
After generation, the user can describe changes in plain text ("make it look like wood", "make it shiny"). The app calls the Meshy Text-to-Texture API to re-apply a new surface texture to the existing geometry, then updates the 3D viewer in place. This loop can repeat as many times as needed.

### 6. AR Preview + Annotated Dimensions
Before ordering, the user can place the model in augmented reality:
- **iOS** — opens Apple Quick Look AR via USDZ, placing the model in the real world at true scale
- **Android** — opens Google Scene Viewer via the Scene Viewer intent URL

An engineering-style dimension overlay can be toggled on/off, drawing annotated dimension lines (W × H × D in cm) directly in the Three.js scene, connected to the model's bounding box with tick marks and labels. Rotation pauses automatically when dimensions are visible so they stay readable.

### 7. Material Selection
AI analyses the dominant colours in the captured frames to suggest a print material. The user can accept the suggestion or choose from:

| Material | Description | Price |
|---|---|---|
| PLA Plastic | Lightweight, strong, most common | $12.99 |
| Wood PLA | Real wood fibres, natural look and smell | $18.99 |
| Smooth Resin | Ultra-smooth, highest detail | $24.99 |
| Metal PLA | Looks and feels like brushed metal | $34.99 |
| Flexible TPU | Soft and squishy, great for grips | $19.99 |

Each material has a CSS gradient swatch that simulates the real surface. The 3D model viewer background tints to match the selected material.

### 8. Order Flow
A simple order summary shows the 3D model alongside the material swatch in a product card, with pricing, estimated delivery, and a shipping form. This is a proof-of-concept UI demonstrating the end-to-end flow — a real integration with a print-on-demand service (e.g. Shapeways) would replace the dummy checkout.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS |
| 3D Preview | Three.js + React Three Fiber |
| 3D Generation | Meshy Multi-Image to 3D API |
| Texture Adjustment | Meshy Text-to-Texture API |
| Auto Sizing | Meshy `auto_size: true` |
| AR (iOS) | USDZ + Apple Quick Look (`rel="ar"`) |
| AR (Android) | GLB + Google Scene Viewer intent |
| Dimension Annotations | Three.js `Line` + `drei` `Html` in 3D space |
| Video/Camera | MediaRecorder + getUserMedia |
| Frame Scoring | Laplacian variance (canvas) |
| Deployment | Railway |

---

## API Pipeline

```
[Mobile Browser]
      │
      ▼
getUserMedia (rear camera) or video upload
      │
      ▼
Canvas frame extraction + Laplacian blur scoring
Auto-select 3–4 sharpest, most angle-diverse frames
      │
      ▼
[Next.js API Route /api/generate]
      │
      ▼
Meshy Multi-Image to 3D
  - image_url + image_urls[]: base64 keyframes
  - texture_prompt: user description
  - auto_size: true
  - should_remesh: true
      │
      ▼
SSE progress stream → client (/api/status/[taskId])
      │
      ▼
[Optional: /api/retouch]
Meshy Text-to-Texture
  - model_url: existing GLB
  - style_prompt: user's adjustment text
  - SSE progress stream → client (/api/texture-status/[taskId])
      │
      ▼
[/api/proxy] — proxies Meshy CDN assets (CORS + correct MIME types)
      │
      ▼
Three.js GLB preview
  - Auto-rotate, OrbitControls
  - Optional dimension annotation lines in 3D space
  - AR launch (USDZ / Scene Viewer)
      │
      ▼
Material selection → Order summary → Shipping → Confirmation
```

---

## Getting Started

```bash
git clone https://github.com/albertjfoo/CopyPaste.git
cd CopyPaste
npm install
```

Create a `.env.local` file:
```
MESHY_API_KEY=your_meshy_api_key_here
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your phone or in a mobile-emulated browser.

---

## Design Principles

- **Lowest friction possible** — every design decision is evaluated against whether my mom could do it without help
- **Best context, least effort** — multi-image input maximises model quality without adding steps
- **Mobile-first, install-free** — works in Safari and Chrome on iOS and Android with no native app
- **Real scale** — `auto_size` ensures the printed object is the right size, not just a plausible shape

---

## What's Next

- [ ] Integrate a real print service API (e.g. Shapeways) for end-to-end fulfillment
- [ ] Manual resize override for cases where `auto_size` needs correction
- [ ] Support for video photogrammetry to improve mesh quality on complex objects
- [ ] Webhook-based status updates instead of SSE polling

---

## Author

**Albert Foo** — [github.com/albertjfoo](https://github.com/albertjfoo)

Built with the [Meshy API](https://meshy.ai) and a lot of love for my mom.
