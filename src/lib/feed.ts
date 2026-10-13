import { createClient } from '@/lib/supabase/server'
import { POST_LIST_FIELDS, type PostListItem } from '@/lib/types'

export const PAGE_SIZE = 20

export type FeedQuery = {
  city?: string
  category?: string
  sub?: string
  sort?: 'new' | 'hot'
  q?: string
  page?: number
}

export async function fetchFeed(q: FeedQuery): Promise<{ posts: PostListItem[]; hasMore: boolean }> {
  const supabase = await createClient()
  const page = Math.max(1, q.page || 1)
  const from = (page - 1) * PAGE_SIZE

  let query = supabase.from('posts').select(POST_LIST_FIELDS).eq('is_hidden', false)

  if (q.city) query = query.eq('city', q.city)
  if (q.category) query = query.eq('category', q.category)
  if (q.sub) query = query.eq('subcategory', q.sub)
  if (q.q) {
    // 转义 % 和 _，避免用户输入被当成通配符
    // 逗号、括号、引号会破坏查询语法，换成空格
    const kw = q.q
      .trim()
      .slice(0, 40)
      .replace(/[,()"'*]/g, ' ')
      .replace(/[%_\\]/g, (m) => `\\${m}`)
    query = query.or(`title.ilike.%${kw}%,body.ilike.%${kw}%`)
  }

  if (q.sort === 'hot') {
    const since = new Date(Date.now() - 30 * 86400 * 1000).toISOString()
    query = query.gte('created_at', since).order('view_count', { ascending: false })
  } else {
    query = query.order('is_pinned', { ascending: false }).order('bumped_at', { ascending: false })
  }

  // 多取一条，用来判断还有没有下一页
  const { data, error } = await query.range(from, from + PAGE_SIZE)
  if (error) {
    console.error('fetchFeed', error.message)
    return { posts: [], hasMore: false }
  }
  const rows = (data ?? []) as PostListItem[]
  return { posts: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE }
}
