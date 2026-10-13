import { NextResponse, type NextRequest } from 'next/server'
import { createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { safeNext } from '@/lib/safe-next'
import { siteUrl } from '@/lib/site-url'
import { WECHAT_EMAIL_DOMAIN } from '@/lib/wechat'

type TokenResp = {
  access_token?: string
  openid?: string
  unionid?: string
  errcode?: number
  errmsg?: string
}
type UserInfo = { nickname?: string; headimgurl?: string; unionid?: string; errcode?: number }

export async function GET(request: NextRequest) {
  const base = siteUrl(request)
  const fail = (msg: string) => {
    const res = NextResponse.redirect(`${base}/login?error=${encodeURIComponent(msg)}`)
    res.cookies.delete({ name: 'wx_oauth', path: '/auth/wechat' })
    return res
  }

  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  if (!code) return fail('你取消了微信登录')

  // 1. 校验 state
  let saved: { state: string; mode: 'mp' | 'open'; next: string }
  try {
    saved = JSON.parse(request.cookies.get('wx_oauth')?.value || '')
  } catch {
    return fail('登录已过期，请重新点击微信登录')
  }
  if (!state || state !== saved.state) return fail('登录校验失败，请重试')

  const appId = saved.mode === 'mp' ? process.env.WECHAT_MP_APPID : process.env.WECHAT_OPEN_APPID
  const secret = saved.mode === 'mp' ? process.env.WECHAT_MP_SECRET : process.env.WECHAT_OPEN_SECRET
  if (!appId || !secret) return fail('微信登录配置不完整')

  // 2. 用 code 换 access_token 和 openid
  const tokenRes = await fetch(
    `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${secret}&code=${encodeURIComponent(code)}&grant_type=authorization_code`,
    { cache: 'no-store' }
  )
  const token = (await tokenRes.json()) as TokenResp
  if (!token.access_token || !token.openid) {
    console.error('wechat token error', token.errcode, token.errmsg)
    return fail('微信授权失败，请重试')
  }

  // 3. 取昵称和头像
  const infoRes = await fetch(
    `https://api.weixin.qq.com/sns/userinfo?access_token=${token.access_token}&openid=${token.openid}&lang=zh_CN`,
    { cache: 'no-store' }
  )
  const info = (await infoRes.json()) as UserInfo
  const nickname = (!info.errcode && info.nickname) || '微信用户'
  const avatar = (!info.errcode && info.headimgurl) || null

  // unionid：同一个开放平台下，公众号和网站应用是同一个人 → 同一个账号
  // 没有 unionid 时退回到 openid（只在当前这一个应用里唯一）
  const unionid = token.unionid || info.unionid
  const wechatId = unionid ? `u:${unionid}` : `${saved.mode}:${token.openid}`

  const admin = createAdminClient()

  // 4. 找已有账号，没有就新建
  const { data: existing } = await admin
    .from('wechat_identities')
    .select('user_id')
    .eq('wechat_id', wechatId)
    .maybeSingle()

  let email: string
  if (existing) {
    const { data, error } = await admin.auth.admin.getUserById(existing.user_id)
    if (error || !data.user?.email) return fail('账号读取失败')
    email = data.user.email
  } else {
    const hash = createHash('sha256').update(wechatId).digest('hex').slice(0, 24)
    email = `wx_${hash}@${WECHAT_EMAIL_DOMAIN}`
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { name: nickname, avatar_url: avatar, provider: 'wechat' },
    })
    if (error || !data.user) {
      console.error('wechat createUser error', error)
      return fail('创建账号失败')
    }
    // 记录微信和账号的对应关系；资料表由触发器自动建好（昵称、头像来自 user_metadata）
    const { error: idErr } = await admin
      .from('wechat_identities')
      .insert({ wechat_id: wechatId, user_id: data.user.id })
    if (idErr) {
      console.error('wechat identity insert error', idErr)
      return fail('创建账号失败')
    }
  }

  // 5. 生成一次性登录令牌（不会发邮件），立刻在服务器端兑换成登录会话
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (linkErr || !link.properties?.hashed_token) return fail('登录失败')

  const supabase = await createClient()
  const { error: otpErr } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: link.properties.hashed_token,
  })
  if (otpErr) return fail('登录失败')

  const res = NextResponse.redirect(`${base}${safeNext(saved.next)}`)
  res.cookies.delete({ name: 'wx_oauth', path: '/auth/wechat' })
  return res
}
