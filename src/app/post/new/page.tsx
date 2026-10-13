import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import PostForm from '@/components/PostForm'
import { getCurrentUser, getSelectedCity } from '@/lib/session'

export const metadata: Metadata = { title: '发布信息' }

type SP = Promise<{ cat?: string }>

export default async function NewPostPage({ searchParams }: { searchParams: SP }) {
  const { cat } = await searchParams
  const user = await getCurrentUser()
  if (!user) {
    const next = cat ? `/post/new?cat=${cat}` : '/post/new'
    redirect(`/login?next=${encodeURIComponent(next)}`)
  }
  if (user.profile?.is_banned) {
    return <p className="bg-white px-4 py-16 text-center text-ink-soft">你的账号已被限制发布信息。如有疑问请联系管理员。</p>
  }

  return (
    <PostForm
      userId={user.id}
      isAdmin={!!user.profile?.is_admin}
      defaultCity={await getSelectedCity()}
      defaultCategory={cat}
    />
  )
}
