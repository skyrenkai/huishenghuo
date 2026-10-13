import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Vercel 每天自动调用一次（见 vercel.json），查一下数据库，防止 Supabase 免费版因为没人访问而暂停
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { count, error } = await supabase.from('posts').select('*', { count: 'exact', head: true })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, posts: count, at: new Date().toISOString() })
}
