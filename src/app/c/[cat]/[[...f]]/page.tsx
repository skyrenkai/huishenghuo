import Link from '@/components/Link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Feed from '@/components/Feed'
import WechatShareImage from '@/components/WechatShareImage'
import OldLinkRedirect from './OldLinkRedirect'
import { fetchFeed } from '@/lib/feed'
import { getSelectedCity } from '@/lib/session'
import { getCategory, cityName, catHref } from '@/lib/categories'

type Params = Promise<{ cat: string; f?: string[] }>

// 板块页整页缓存：每种"小分类 / 排序 / 页码"组合第一次有人打开时生成，
// 之后 60 秒内访客直接从 CDN 拿；发帖、审核、置顶后马上刷新。
export const revalidate = 60
export function generateStaticParams() {
  return []
}

const dec = (x: string) => {
  try {
    return decodeURIComponent(x)
  } catch {
    return x
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { cat } = await params
  const c = getCategory(cat)
  return {
    title: c ? c.name : '分类',
    openGraph: c ? { title: `${c.name} - 惠生活`, images: [{ url: `/og/${c.code}.png`, width: 1200, height: 630 }] } : undefined,
  }
}

export default async function CategoryPage({ params }: { params: Params }) {
  const { cat, f = [] } = await params
  const category = getCategory(cat)
  if (!category) notFound()

  // 路径：/c/板块/[小分类或 all]/[new|hot]/[页码]
  if (f.length > 3) notFound()
  const rawSub = f[0] ? dec(f[0]) : ''
  const sub = rawSub === 'all' ? '' : rawSub
  if (sub && !category.subs.includes(sub)) notFound()
  if (f[1] && f[1] !== 'new' && f[1] !== 'hot') notFound()
  const sort: 'new' | 'hot' = f[1] === 'hot' ? 'hot' : 'new'
  const page = f[2] ? Number(f[2]) : 1
  if (!Number.isInteger(page) || page < 1 || page > 500) notFound()

  const city = await getSelectedCity()
  const { posts, hasMore, error } = await fetchFeed({ city, category: cat, sub, sort, page })
  // 运行中查询出错就抛出：CDN 会继续用上一份正常的页面，不会把空列表缓存下来
  if (error && process.env.NEXT_PHASE !== 'phase-production-build') throw new Error(error)

  const href = (o: { sub?: string; sort?: 'new' | 'hot'; page?: number }) =>
    catHref(cat, { sub: o.sub ?? sub, sort: o.sort ?? sort, page: o.page ?? page })

  return (
    <div className="md:px-4">
      <WechatShareImage src={`/og/${category.code}.png`} />
      {f.length === 0 && <OldLinkRedirect cat={cat} />}
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
