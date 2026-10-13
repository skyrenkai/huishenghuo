import type { Metadata } from 'next'
import Feed from '@/components/Feed'
import { fetchFeed } from '@/lib/feed'
import { getSelectedCity } from '@/lib/session'
import { cityName } from '@/lib/categories'

export const metadata: Metadata = { title: '搜索' }

type SP = Promise<{ q?: string; page?: string }>

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const q = (sp.q || '').trim()
  const page = Number(sp.page) || 1
  const city = await getSelectedCity()
  const result = q ? await fetchFeed({ q, city, page }) : null

  return (
    <div className="md:px-4">
      <form action="/search" className="flex gap-2 bg-white px-4 py-3 md:mt-4 md:rounded-xl md:border md:border-line">
        <input
          name="q"
          defaultValue={q}
          autoFocus
          placeholder="搜索标题或内容，例如：Plano 单间"
          className="h-10 flex-1 rounded-lg bg-paper px-3 text-base outline-none"
        />
        <button className="rounded-lg bg-seal px-4 text-sm font-medium text-white">搜索</button>
      </form>

      {result && (
        <div className="mt-2 md:mt-4">
          <p className="px-4 pb-2 text-xs text-mute">
            在{city ? cityName(city) : '全部城市'}搜索“{q}”
          </p>
          <Feed
            posts={result.posts}
            hasMore={result.hasMore}
            error={result.error}
            page={page}
            pageHref={(p) => `/search?q=${encodeURIComponent(q)}&page=${p}`}
            emptyText="没有找到相关信息，换个关键词试试"
          />
        </div>
      )}
    </div>
  )
}
