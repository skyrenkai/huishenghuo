import { createClient } from '@supabase/supabase-js'

// 只能在服务器端使用（API 路由里）。用 service_role key，绕过 RLS。
// 绝对不要在任何 'use client' 文件里 import 这个文件。
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
