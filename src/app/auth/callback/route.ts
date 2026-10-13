import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeNext } from '@/lib/safe-next'
import { siteUrl } from '@/lib/site-url'

// Google 登录、邮箱验证链接都会跳回这里。
// Supabase 带回一个 code，我们换成登录会话（写入 cookie），然后跳回原来的页面。
export async function GET(request: NextRequest) {
  const base = siteUrl(request)
  const code = request.nextUrl.searchParams.get('code')
  const next = safeNext(request.nextUrl.searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${base}${next}`)
    }
  }

  return NextResponse.redirect(`${base}/login?error=${encodeURIComponent('登录失败，请重试')}`)
}
