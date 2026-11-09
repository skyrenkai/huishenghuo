import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { Post, PostContact } from '@/lib/types'
import PostView from '../PostView'

type Params = Promise<{ id: string }>

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: '信息', robots: { index: false, follow: false } }

// 待审核、已隐藏的信息：按登录身份查询，只有作者和管理员能看到（数据库权限规则保证）
export default async function PrivatePostPage({ params }: { params: Params }) {
  const id = Number((await params).id)
  if (!Number.isFinite(id)) notFound()
  const supabase = await createClient()
  const [postRes, contactRes] = await Promise.all([
    supabase.from('posts').select('*, author:profiles(name, avatar_url)').eq('id', id).maybeSingle(),
    supabase.from('post_contacts').select('*').eq('post_id', id).maybeSingle(),
  ])
  if (!postRes.data) notFound()
  const post = postRes.data as Post
  return <PostView bundle={{ post, contact: (contactRes.data as PostContact) ?? null }} />
}
