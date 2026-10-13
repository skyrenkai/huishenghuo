import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Feed from '@/components/Feed'
import WechatShareImage from '@/components/WechatShareImage'
import { fetchFeed } from '@/lib/feed'
import { getSelectedCity } from '@/lib/session'
import { getCategory, cityName } from '@/lib/categories'

type Params = Promise<{ cat: string }>
type SP = Promise<{ sub?: string; sort?: string; page?: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { cat } = await params
  const c = getCategory(cat)
  return {
    title: c ? c.name : '分类',
    openGraph: c ? { title: `${c.name} - 惠生活`, images: [{ url: `/og/${c.code}.png`, width: 1200, height: 630 }] } : undefined,
  }
}

export default async function CategoryPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { cat } = await params
  const category = getCategory(cat)
  if (!category) notFound()

  const sp = await searchParams
  const city = await getSelectedCity()
  const sub = category.subs.includes(sp.sub || '') ? sp.sub! : ''
  const sort = sp.sort === 'hot' ? 'hot' : 'new'
  const page = Number(sp.page) || 1
  const { posts, hasMore, error } = await fetchFeed({ city, category: cat, sub, sort, page })

  const href = (o: { sub?: string; sort?: string; page?: number }) => {
    const q = new URLSearchParams()
    const s = o.sub ?? sub
    const so = o.sort ?? sort
    if (s) q.set('sub', s)
    if (so === 'hot') q.set('sort', 'hot')
    if (o.page && o.page > 1) q.set('page', String(o.page))
    const str = q.toString()
    return `/c/${cat}${str ? `?${str}` : ''}`
  }

  return (
    <div className="md:px-4">
      <WechatShareImage src={`/og/${category.code}.png`} />
      <div className="bg-white px-4 pt-4 md:mt-4 md:rounded-t-xl md:border md:border-b-0 md:border-line">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold text-white"
            style={{ background: category.color }}
            aria-hidden
          >
            {category.glyph}
          </span>
          <div>
            <h1 className="text-lg font-bold">{category.name}</h1>
            <p className="text-xs text-mute">{city ? cityName(city) : '全部城市'}</p>
          </div>
          {!category.adminOnly && (
            <Link
              href={`/post/new?cat=${cat}`}
              className="ml-auto rounded-full border border-seal px-3 py-1 text-sm text-seal"
            >
              发布{category.name.slice(0, 2)}
            </Link>
          )}
        </div>

        {/* 子类筛选 */}
        <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-3">
          <Chip href={href({ sub: '', page: 1 })} active={!sub}>全部</Chip>
          {category.subs.map((s) => (
            <Chip key={s} href={href({ sub: s, page: 1 })} active={sub === s}>
              {s}
            </Chip>
          ))}
        </div>

        <div className="flex gap-4 border-t border-line py-2 text-sm">
          <Link href={href({ sort: 'new', page: 1 })} className={sort === 'new' ? 'font-semibold text-ink' : 'text-mute'}>
            最新
          </Link>
          <Link href={href({ sort: 'hot', page: 1 })} className={sort === 'hot' ? 'font-semibold text-ink' : 'text-mute'}>
            最热
          </Link>
        </div>
      </div>

      <Feed
        posts={posts}
        hasMore={hasMore}
        page={page}
        error={error}
        pageHref={(p) => href({ page: p })}
        emptyText={`${sub || category.name}暂时没有信息`}
        emptyAction={category.adminOnly ? undefined : { href: `/post/new?cat=${cat}`, label: '发布第一条' }}
      />
    </div>
  )
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-full px-3 py-1 text-sm ${active ? 'bg-ink text-white' : 'bg-paper text-ink-soft'}`}
    >
      {children}
    </Link>
  )
}
