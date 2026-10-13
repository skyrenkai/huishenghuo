import type { NextRequest } from 'next/server'

// 回调地址用的网站根地址。
// 线上在 Vercel 设置 NEXT_PUBLIC_SITE_URL=https://huishenghuo.vercel.app（以后换成 https://huishenghuo.com）
export function siteUrl(request: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  return request.nextUrl.origin
}
