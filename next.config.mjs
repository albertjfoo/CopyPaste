/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'assets.meshy.ai' },
      { protocol: 'https', hostname: 'cdn.meshy.ai' },
    ],
  },
}

export default nextConfig
