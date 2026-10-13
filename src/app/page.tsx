import Link from 'next/link'
import CategoryGrid from '@/components/CategoryGrid'
import BannerCarousel, { type Banner } from '@/components/BannerCarousel'
import { createClient } from '@/lib/supabase/server'
import Feed from '@/components/Feed'
import WechatShareImage from '@/components/WechatShareImage'
import { fetchFeed } from '@/lib/feed'
import { getSelectedCity } from '@/lib/session'
import { cityName } from '@/lib/categories'

type SP = Promise<{ sort?: string; page?: string }>

export default async function HomePage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const city = await getSelectedCity()
  const sort = sp.sort === 'hot' ? 'hot' : 'new'
  const page = Number(sp.page) || 1
  const supabase = await createClient()
  const [{ posts, hasMore, error }, { data: bannerRows }] = await Promise.all([
    fetchFeed({ city, sort, page }),
    // 广告位：只取正在显示、没到期的（数据库规则也会过滤）
    supabase
      .from('banners')
      .select('id, image_url, link_url, title')
      .eq('is_active', true)
      .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
      .order('sort', { ascending: true })
      .order('id', { ascending: true })
      .limit(10),
  ])
  const banners = page === 1 && sort === 'new' ? ((bannerRows ?? []) as Banner[]) : []

  const href = (s: string, p = 1) => {
    const q = new URLSearchParams()
    if (s === 'hot') q.set('sort', 'hot')
    if (p > 1) q.set('page', String(p))
    const str = q.toString()
    return str ? `/?${str}` : '/'
  }

  return (
    <div className="md:px-4">
      <WechatShareImage src="/og.png" />
      <BannerCarousel banners={banners} />
      <CategoryGrid />

      <div className="mt-2 flex items-center gap-5 border-b border-line bg-white px-4 md:mt-4 md:rounded-t-xl md:border md:border-b-0">
        <Tab href={href('new')} active={sort === 'new'}>最新发布</Tab>
        <Tab href={href('hot')} active={sort === 'hot'}>本月热门</Tab>
        <span className="ml-auto text-xs text-mute">{city ? cityName(city) : '全部城市'}</span>
      </div>

      <Feed
        posts={posts}
        hasMore={hasMore}
        page={page}
        error={error}
        pageHref={(p) => href(sort, p)}
        emptyText={city ? `${cityName(city)}还没有人发布信息，来发第一条吧` : '还没有人发布信息，来发第一条吧'}
        emptyAction={{ href: '/post/new', label: '发布信息' }}
      />
    </div>
  )
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`relative py-3 text-[15px] ${active ? 'font-semibold text-ink' : 'text-mute'}`}
      aria-current={active ? 'page' : undefined}
    >
      {children}
      {active && <span className="absolute inset-x-1 bottom-0 h-[3px] rounded-full bg-seal" />}
    </Link>
  )
}
