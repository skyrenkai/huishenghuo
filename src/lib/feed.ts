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

export type FeedResult = { posts: PostListItem[]; hasMore: boolean; error?: string }

export async function fetchFeed(q: FeedQuery): Promise<FeedResult> {
  const supabase = await createClient()
  const page = Math.max(1, q.page || 1)
  const from = (page - 1) * PAGE_SIZE
  const now = new Date().toISOString()

  // 同样的筛选条件（城市、分类、子类）
  const base = () => {
    let query = supabase.from('posts').select(POST_LIST_FIELDS).eq('is_hidden', false)
    if (q.city) query = query.eq('city', q.city)
    if (q.category) query = query.eq('category', q.category)
    if (q.sub) query = query.eq('subcategory', q.sub)
    return query
  }

  // ---------- 搜索 ----------
  if (q.q) {
    // 逗号、括号、引号会破坏查询语法，换成空格；转义 % 和 _
    const kw = q.q
      .trim()
      .slice(0, 40)
      .replace(/[,()"'*]/g, ' ')
      .replace(/[%_\\]/g, (m) => `\\${m}`)
    const { data, error } = await base()
      .or(`title.ilike.%${kw}%,body.ilike.%${kw}%`)
      .order('bumped_at', { ascending: false })
      .range(from, from + PAGE_SIZE)
    return done(data, error)
  }

  // ---------- 本月热门 ----------
  if (q.sort === 'hot') {
    const since = new Date(Date.now() - 30 * 86400 * 1000).toISOString()
    const { data, error } = await base()
      .gte('created_at', since)
      .order('view_count', { ascending: false })
      .range(from, from + PAGE_SIZE)
    return done(data, error)
  }

  // ---------- 最新：第 1 页最上面放正在置顶的帖子（到期的自动不算） ----------
  // 置顶和普通两次查询同时发出，不用排队等
  const [pinRes, restRes] = await Promise.all([
    page === 1
      ? base().gt('pinned_until', now).order('pinned_until', { ascending: false }).limit(10)
      : Promise.resolve({ data: [], error: null }),
    base()
      .or(`pinned_until.is.null,pinned_until.lte.${now}`)
      .order('bumped_at', { ascending: false })
      .range(from, from + PAGE_SIZE),
  ])
  if (pinRes.error) return done(null, pinRes.error)
  const pinned = (pinRes.data ?? []) as PostListItem[]
  const rest = done(restRes.data, restRes.error)
  return { ...rest, posts: [...pinned, ...rest.posts] }
}

// 多取一条，用来判断还有没有下一页
function done(data: unknown, error: { message: string } | null): FeedResult {
  if (error) {
    console.error('fetchFeed', error.message)
    return { posts: [], hasMore: false, error: error.message }
  }
  const rows = (data ?? []) as PostListItem[]
  return { posts: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE }
}
