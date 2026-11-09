import type { MetadataRoute } from 'next'

// 搜索引擎（Google、Bing 等）照常收录；
// 拦住只抓内容、不带来访客的 AI 爬虫和大量抓取的爬虫，节省服务器运算额度。
const BLOCKED_BOTS = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'CCBot',
  'Bytespider',
  'PerplexityBot',
  'Amazonbot',
  'meta-externalagent',
  'FacebookBot',
  'Google-Extended',
  'Applebot-Extended',
  'cohere-ai',
  'Diffbot',
  'ImagesiftBot',
  'Omgilibot',
  'PetalBot',
  'AhrefsBot',
  'SemrushBot',
  'MJ12bot',
  'DotBot',
  'DataForSeoBot',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: BLOCKED_BOTS, disallow: '/' },
      {
        userAgent: '*',
        allow: '/',
        // 后台、个人页、搜索结果、登录注册页没必要被抓取
        disallow: ['/admin', '/me', '/search', '/api/', '/login', '/register', '/reset-password', '/auth/', '/post/new', '/post/*/private', '/promo/'],
      },
    ],
  }
}
