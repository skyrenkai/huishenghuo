import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // 代码风格检查不阻止上线（类型检查仍然会做）
  eslint: { ignoreDuringBuilds: true },

  // 所有访问都把标题、描述、分享图（og:title / og:image）一次性放在网页 <head> 里，
  // 不使用"先发页面、后补分享信息"的流式方式。微信读取分享卡片时只看 <head>，
  // 不管它用什么方式访问都能读到。
  htmlLimitedBots: /.*/,
}

export default nextConfig
