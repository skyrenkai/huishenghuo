import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/session'

// 粘贴公众号文章时，文章里的图片在微信服务器上，直接引用会显示"此图片来自微信公众平台"。
// 这里由服务器代为下载图片，交给浏览器压缩后再上传到我们自己的存储。登录且没被封号的用户才能用。
export const dynamic = 'force-dynamic'

const MAX_BYTES = 10 * 1024 * 1024

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 })
  if (user.profile?.is_banned) return NextResponse.json({ error: '账号已被限制' }, { status: 403 })

  const raw = request.nextUrl.searchParams.get('url') || ''
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return NextResponse.json({ error: '图片地址不正确' }, { status: 400 })
  }
  // 只允许普通的 http/https 网址，不允许直接写 IP 或本机地址
  const host = url.hostname
  if (!['http:', 'https:'].includes(url.protocol) || host === 'localhost' || /^[\d.]+$/.test(host) || host.includes(':')) {
    return NextResponse.json({ error: '不支持这个图片地址' }, { status: 400 })
  }

  try {
    const res = await fetch(url, {
      headers: {
        // 不带来源页面，微信图片服务器才会正常返回图片
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36',
        Accept: 'image/*',
      },
      referrerPolicy: 'no-referrer',
      redirect: 'follow',
      cache: 'no-store',
    })
    const type = res.headers.get('content-type') || ''
    if (!res.ok || !type.startsWith('image/')) {
      return NextResponse.json({ error: '图片下载失败' }, { status: 502 })
    }
    const buf = await res.arrayBuffer()
    if (buf.byteLength > MAX_BYTES) return NextResponse.json({ error: '图片太大' }, { status: 413 })
    return new NextResponse(buf, { headers: { 'Content-Type': type, 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: '图片下载失败' }, { status: 502 })
  }
}
