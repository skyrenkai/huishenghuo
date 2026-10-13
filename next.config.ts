import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // 代码风格检查不阻止上线（类型检查仍然会做）
  eslint: { ignoreDuringBuilds: true },
}

export default nextConfig
