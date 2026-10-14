import Link from 'next/link'
import { getCategory } from '@/lib/categories'
import { formatPrice, timeAgo } from '@/lib/format'
import type { PostListItem } from '@/lib/types'

// 首页分区：吃喝玩乐、本地新闻、招聘求职、房屋租售……每个板块一张卡片

export type SectionData = { code: string; posts: PostListItem[] }

export default function HomeSections({ sections }: { sections: SectionData[] }) {
  // 电脑上左右两列，每排两个板块：吃喝玩乐 | 本地新闻，招聘 | 房屋，二手 | 汽车……；手机上一个接一个
  return (
    <div className="grid gap-2 md:grid-cols-2 md:gap-4">
      {sections.map((s) =>
        s.code === 'fun' ? (
          <FunSection key={s.code} posts={s.posts} />
        ) : s.code === 'news' ? (
          <NewsSection key={s.code} posts={s.posts} />
        ) : (
          <ListSection key={s.code} code={s.code} posts={s.posts} />
        )
      )}
    </div>
  )
}

function Card({ code, children, chips = true }: { code: string; children: React.ReactNode; chips?: boolean }) {
  const cat = getCategory(code)
  if (!cat) return null
  return (
    <section className="flex flex-col bg-white md:rounded-xl md:border md:border-line">
      <header className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ background: cat.color }} aria-hidden>
          {cat.glyph}
        </span>
        <h2 className="text-[17px] font-bold">{cat.name}</h2>
        <Link href={`/c/${code}`} className="ml-auto flex items-center gap-0.5 text-sm text-seal">
          更多
          <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden><path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>
        </Link>
      </header>
      {chips && (
        <div className="flex flex-wrap gap-x-5 gap-y-2 px-4 pt-3 text-[15px]">
          {cat.subs.map((s) => (
            <Link key={s} href={`/c/${code}?sub=${encodeURIComponent(s)}`} className="text-ink-soft hover:text-seal">
              {s}
            </Link>
          ))}
        </div>
      )}
      {children}
    </section>
  )
}

// 吃喝玩乐：大图卡片，手机两列、电脑四列
function FunSection({ posts }: { posts: PostListItem[] }) {
  return (
    <Card code="fun">
      {posts.length === 0 ? (
        <Empty />
      ) : (
        <div className="grid grid-cols-2 gap-3 p-4">
          {posts.slice(0, 4).map((p) => (
            <Link key={p.id} href={`/post/${p.id}`} prefetch={false} className="group">
              <div className="aspect-[4/3] overflow-hidden rounded-lg bg-paper">
                {p.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.images[0].thumb} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                ) : (
                  <Glyph code="fun" />
                )}
              </div>
              <p className="mt-1.5 line-clamp-2 text-sm font-medium leading-snug group-hover:text-seal">{p.title}</p>
              <p className="mt-0.5 text-xs text-mute">{p.subcategory}</p>
            </Link>
          ))}
        </div>
      )}
    </Card>
  )
}

// 本地新闻：头条大图 + 文字列表
function NewsSection({ posts }: { posts: PostListItem[] }) {
  const [head, ...rest] = posts
  return (
    <Card code="news" chips={false}>
      {!head ? (
        <Empty />
      ) : (
        <div className="space-y-2 p-4">
          <Link href={`/post/${head.id}`} prefetch={false} className="group">
            <div className="aspect-[16/9] overflow-hidden rounded-lg bg-paper">
              {head.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={head.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <Glyph code="news" />
              )}
            </div>
            <p className="mt-2 line-clamp-2 text-[16px] font-semibold leading-snug group-hover:text-seal">{head.title}</p>
            <p className="mt-0.5 text-xs text-mute">{timeAgo(head.created_at)}</p>
          </Link>
          <ul className="divide-y divide-line">
            {rest.slice(0, 4).map((p) => (
              <li key={p.id}>
                <Link href={`/post/${p.id}`} prefetch={false} className="flex items-baseline gap-2 py-2.5 hover:text-seal">
                  <span className="h-1.5 w-1.5 shrink-0 translate-y-[-2px] rounded-full bg-seal" aria-hidden />
                  <span className="line-clamp-1 flex-1 text-[15px]">{p.title}</span>
                  <span className="shrink-0 text-xs text-mute">{timeAgo(p.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

// 招聘、房屋等：子类入口 + 最新几条
function ListSection({ code, posts }: { code: string; posts: PostListItem[] }) {
  return (
    <Card code={code}>
      {posts.length === 0 ? (
        <Empty />
      ) : (
        <ul className="mt-2 divide-y divide-line px-4 pb-1">
          {posts.slice(0, 5).map((p) => (
            <li key={p.id}>
              <Link href={`/post/${p.id}`} prefetch={false} className="flex items-center gap-2 py-2.5 hover:text-seal">
                <span className="shrink-0 rounded bg-paper px-1.5 py-0.5 text-[11px] text-ink-soft">{p.subcategory}</span>
                <span className="line-clamp-1 flex-1 text-[15px]">{p.title}</span>
                {p.price && <span className="shrink-0 text-sm font-semibold text-price">{formatPrice(p.price)}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function Glyph({ code }: { code: string }) {
  const c = getCategory(code)
  return (
    <span className="flex h-full w-full items-center justify-center text-4xl font-bold text-white" style={{ background: c?.color }} aria-hidden>
      {c?.glyph}
    </span>
  )
}

function Empty() {
  return <p className="px-4 py-6 text-sm text-mute">暂时还没有信息</p>
}
