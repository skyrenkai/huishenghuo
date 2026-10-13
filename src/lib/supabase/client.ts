import { createBrowserClient } from '@supabase/ssr'

// 浏览器端用（'use client' 组件里）
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
