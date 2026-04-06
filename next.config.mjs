/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'assets.meshy.ai' },
      { protocol: 'https', hostname: 'cdn.meshy.ai' },
    ],
  },
}

export default nextConfig
