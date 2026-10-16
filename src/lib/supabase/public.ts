import { createClient } from '@supabase/supabase-js'

// 不带登录信息的数据库连接：只能读到所有人都能看的内容。
// 专门给"缓存"用——缓存里的内容对所有访客都一样，不能混进某个用户自己的数据。
export function createPublicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
