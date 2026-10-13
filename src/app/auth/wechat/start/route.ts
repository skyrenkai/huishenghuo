import { NextResponse, type NextRequest } from 'next/server'
import { randomBytes } from 'crypto'
import { safeNext } from '@/lib/safe-next'
import { siteUrl } from '@/lib/site-url'

// 发起微信登录。两种情况：
// 1. 在微信 App 里打开网页 → 用公众号（服务号）网页授权，用户点"允许"即可
// 2. 在电脑浏览器里打开 → 用开放平台"网站应用"，显示二维码，用手机微信扫码
export async function GET(request: NextRequest) {
  const base = siteUrl(request)
  const next = safeNext(request.nextUrl.searchParams.get('next'))
  const ua = request.headers.get('user-agent') || ''
  const inWeChat = /MicroMessenger/i.test(ua)

  const mpAppId = process.env.WECHAT_MP_APPID      // 公众号（服务号）
  const openAppId = process.env.WECHAT_OPEN_APPID  // 开放平台 网站应用

  const mode: 'mp' | 'open' | null =
    inWeChat && mpAppId ? 'mp' : openAppId ? 'open' : null

  if (!mode) {
    return NextResponse.redirect(
      `${base}/login?error=${encodeURIComponent('微信登录暂未开通，请使用邮箱或 Google 登录')}`
    )
  }

  // state 防止 CSRF：随机串存到 httpOnly cookie，回调时比对
  const state = randomBytes(16).toString('hex')
  const redirectUri = encodeURIComponent(`${base}/auth/wechat/callback`)

  const url =
    mode === 'mp'
      ? `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${mpAppId}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_userinfo&state=${state}#wechat_redirect`
      : `https://open.weixin.qq.com/connect/qrconnect?appid=${openAppId}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`

  const res = NextResponse.redirect(url)
  res.cookies.set('wx_oauth', JSON.stringify({ state, mode, next }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/auth/wechat',
    maxAge: 600,
  })
  return res
}
