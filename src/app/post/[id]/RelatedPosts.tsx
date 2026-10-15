import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCategory } from '@/lib/categories'
import { POST_LIST_FIELDS, type PostListItem } from '@/lib/types'
import PostRow from '@/components/PostRow'

const COUNT = 8

// 帖子下面：同一板块的其他信息（正在置顶的排前面，再接最新的；不含当前这条和已隐藏的）
export default async function RelatedPosts({ postId, category, city }: { postId: number; category: string; city: string }) {
  const cat = getCategory(category)
  if (!cat) return null
  const supabase = await createClient()
  const now = new Date().toISOString()
  const base = () =>
    supabase.from('posts').select(POST_LIST_FIELDS).eq('is_hidden', false).eq('is_approved', true).eq('category', category).eq('city', city).neq('id', postId)

  const [pin, rest] = await Promise.all([
    base().gt('pinned_until', now).order('pinned_until', { ascending: false }).limit(COUNT),
    base().or(`pinned_until.is.null,pinned_until.lte.${now}`).order('bumped_at', { ascending: false }).limit(COUNT),
  ])
  const posts = [...((pin.data ?? []) as PostListItem[]), ...((rest.data ?? []) as PostListItem[])].slice(0, COUNT)
  if (posts.length === 0) return null

  return (
    <section className="mt-2 bg-white md:mt-4 md:overflow-hidden md:rounded-xl md:border md:border-line">
      <header className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ background: cat.color }} aria-hidden>
          {cat.glyph}
        </span>
        <h2 className="text-[17px] font-bold">更多{cat.name}</h2>
        <Link href={`/c/${category}`} className="ml-auto text-sm text-seal">
          查看全部 ›
        </Link>
      </header>
      {posts.map((p) => (
        <PostRow key={p.id} post={p} />
      ))}
      <Link href={`/c/${category}`} className="block border-t border-line py-3 text-center text-sm text-seal">
        查看全部{cat.name}信息
      </Link>
    </section>
  )
}
