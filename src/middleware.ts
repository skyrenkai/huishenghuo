import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// 每次请求时刷新登录状态，避免用户莫名其妙被登出
export async function middleware(request: NextRequest) {
  // 没登录的访客（包括各种爬虫，占了绝大多数）没有登录 cookie，什么都不用做，直接放行。
  // 这样能省下大量 Vercel 服务器运算额度。
  if (!request.cookies.getAll().some((c) => c.name.startsWith('sb-'))) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getClaims 在本地校验登录令牌，过期时自动刷新，比 getUser 少一次网络请求
  await supabase.auth.getClaims()
  return response
}

export const config = {
  matcher: [
    // 静态文件、图片、定时任务不需要
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|promo/|api/keepalive|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)',
  ],
}
