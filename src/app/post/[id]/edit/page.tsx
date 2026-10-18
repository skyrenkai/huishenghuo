import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import PostForm from '@/components/PostForm'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/session'
import type { Post, PostContact } from '@/lib/types'

export const metadata: Metadata = { title: '编辑信息' }

type Params = Promise<{ id: string }>

export default async function EditPostPage({ params }: { params: Params }) {
  const id = Number((await params).id)
  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(`/post/${id}/edit`)}`)

  const supabase = await createClient()
  const [{ data: post }, { data: contact }] = await Promise.all([
    supabase.from('posts').select('*').eq('id', id).maybeSingle(),
    supabase.from('post_contacts').select('*').eq('post_id', id).maybeSingle(),
  ])
  if (!post) notFound()
  // 作者本人和管理员可以编辑
  if (post.author_id !== user.id && !user.profile?.is_admin) redirect(`/post/${id}`)

  return (
    <PostForm
      userId={user.id}
      isAdmin={!!user.profile?.is_admin}
      defaultCity={post.city}
      initial={post as Post}
      initialContact={contact as PostContact | null}
    />
  )
}
