import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// 服务器端用（页面、路由处理器里），按当前登录用户的身份访问数据库
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // 在服务器组件里不能写 cookie，交给 middleware 刷新即可
          }
        },
      },
    }
  )
}
