import { unstable_cache } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createPublicClient } from '@/lib/supabase/public'
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

// 列表缓存多久（秒）。发帖、审核、置顶等操作后会立刻刷新，不用等这么久
export const LIST_CACHE_SECONDS = 60

// 分类页、首页列表：所有访客看到的都一样，先查缓存，60 秒内不重复查数据库
// 查询出错时抛出异常，这样出错的结果不会被存进缓存
const cachedFeed = unstable_cache(
  async (q: FeedQuery) => {
    const r = await queryFeed(createPublicClient(), q)
    if (r.error) throw new Error(r.error)
    return r
  },
  ['feed-v1'],
  { revalidate: LIST_CACHE_SECONDS, tags: ['posts'] }
)

export async function fetchFeed(q: FeedQuery): Promise<FeedResult> {
  // 搜索结果五花八门，不缓存；其他列表走缓存
  if (q.q) return queryFeed(await createClient(), q)
  try {
    return await cachedFeed({ city: q.city ?? '', category: q.category ?? '', sub: q.sub ?? '', sort: q.sort ?? 'new', page: q.page ?? 1 })
  } catch (e) {
    return { posts: [], hasMore: false, error: e instanceof Error ? e.message : '加载失败' }
  }
}

async function queryFeed(supabase: SupabaseClient, q: FeedQuery): Promise<FeedResult> {
  const page = Math.max(1, q.page || 1)
  const from = (page - 1) * PAGE_SIZE
  const now = new Date().toISOString()

  // 同样的筛选条件（城市、分类、子类）
  const base = () => {
    let query = supabase.from('posts').select(POST_LIST_FIELDS).eq('is_hidden', false).eq('is_approved', true)
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
