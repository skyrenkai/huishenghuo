import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCategory } from '@/lib/categories'

// 管理后台"数据"页：浏览量统计（只在管理员页面里渲染，数据库函数也会再检查一次管理员身份）

export type Stats = {
  daily: { day: string; views: number }[]
  top_posts: { id: number; title: string; category: string; views: number; total: number }[]
  by_category: { category: string; views: number }[]
  today: number
  yesterday: number
  last7: number
  last30: number
  all_time: number
  new_posts: number
  new_users: number
}

const RANGES = [7, 30, 90]

export default async function ViewStats({ days }: { days: number }) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_view_stats', { days })

  if (error || !data) {
    return (
      <div className="px-4 py-10 text-center text-sm">
        <p className="font-medium text-price">统计数据加载失败</p>
        <p className="mt-2 text-xs text-mute">
          {error?.message.includes('admin_view_stats') ? '请先在 Supabase 执行 supabase/8-view-stats.sql' : error?.message}
        </p>
      </div>
    )
  }
  return <StatsView s={data as Stats} days={days} />
}

// 纯展示部分（单独拿出来，方便测试）
export function StatsView({ s, days }: { s: Stats; days: number }) {
  const total = s.daily.reduce((a, d) => a + d.views, 0)
  const max = Math.max(1, ...s.daily.map((d) => d.views))
  const catMax = Math.max(1, ...s.by_category.map((c) => c.views))

  return (
    <div className="space-y-6 px-4 py-4">
      {/* 关键数字 */}
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label="今天浏览" value={s.today} sub={`昨天 ${s.yesterday}`} />
        <Tile label="近 7 天" value={s.last7} />
        <Tile label="近 30 天" value={s.last30} />
        <Tile label="全部浏览" value={s.all_time} sub="开始统计前的也算在内" />
      </dl>

      {/* 每日浏览量 */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">每日浏览量</h3>
          <div className="flex gap-1 rounded-lg bg-paper p-0.5 text-sm">
            {RANGES.map((r) => (
              <Link
                key={r}
                href={`/admin?tab=stats&days=${r}`}
                className={`rounded-md px-3 py-1 ${r === days ? 'bg-white font-medium text-ink shadow-sm' : 'text-mute'}`}
              >
                近 {r} 天
              </Link>
            ))}
          </div>
        </div>
        <p className="mt-1 text-xs text-mute">
          共 {total} 次，日均 {Math.round(total / s.daily.length)} 次；同期新帖子 {s.new_posts} 条、新用户 {s.new_users} 人
        </p>

        <div className="mt-3 flex h-40 items-end gap-[2px] border-b border-line" role="img" aria-label={`近 ${days} 天每日浏览量`}>
          {s.daily.map((d) => (
            <div key={d.day} className="group relative flex h-full flex-1 items-end">
              <div
                className="w-full rounded-t-[4px] bg-seal group-hover:bg-seal-dark"
                style={{ height: `${(d.views / max) * 100}%`, minHeight: d.views > 0 ? 2 : 0 }}
              />
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink px-2 py-1 text-xs text-white group-hover:block">
                {d.day.slice(5)}：{d.views} 次
              </span>
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-mute">
          <span>{s.daily[0]?.day.slice(5)}</span>
          <span>{s.daily[s.daily.length - 1]?.day.slice(5)}</span>
        </div>
      </section>

      {/* 各板块 */}
      <section>
        <h3 className="font-semibold">各板块浏览量</h3>
        {s.by_category.length === 0 ? (
          <p className="mt-2 text-sm text-mute">这段时间还没有浏览数据</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {s.by_category.map((c) => (
              <li key={c.category} className="grid grid-cols-[5rem_1fr_3rem] items-center gap-2 text-sm">
                <span className="truncate text-ink-soft">{getCategory(c.category)?.name ?? c.category}</span>
                <span className="h-3 rounded-r-[4px] bg-seal/80" style={{ width: `${(c.views / catMax) * 100}%`, minWidth: 2 }} />
                <span className="text-right tabular-nums">{c.views}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 热门帖子 */}
      <section>
        <h3 className="font-semibold">浏览最多的帖子</h3>
        {s.top_posts.length === 0 ? (
          <p className="mt-2 text-sm text-mute">这段时间还没有浏览数据</p>
        ) : (
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-mute">
                <th className="py-2 font-normal">帖子</th>
                <th className="w-16 py-2 text-right font-normal">期间</th>
                <th className="w-16 py-2 text-right font-normal">累计</th>
              </tr>
            </thead>
            <tbody>
              {s.top_posts.map((p, i) => (
                <tr key={p.id} className="border-b border-line last:border-b-0">
                  <td className="py-2 pr-2">
                    <span className="mr-2 text-mute tabular-nums">{i + 1}</span>
                    <Link href={`/post/${p.id}`} className="hover:text-seal">
                      {p.title}
                    </Link>
                    <span className="ml-2 text-xs text-mute">{getCategory(p.category)?.name}</span>
                  </td>
                  <td className="py-2 text-right font-medium tabular-nums">{p.views}</td>
                  <td className="py-2 text-right text-mute tabular-nums">{p.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <p className="text-xs leading-5 text-mute">
        说明：同一台设备 24 小时内重复打开同一条帖子只算 1 次；搜索引擎等机器访问不计入。每日统计从执行 8-view-stats.sql 之后开始累计。
      </p>
    </div>
  )
}

function Tile({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-lg bg-paper px-3 py-2.5">
      <dt className="text-xs text-mute">{label}</dt>
      <dd className="text-2xl font-bold tabular-nums">{value.toLocaleString('en-US')}</dd>
      {sub && <dd className="text-[11px] text-mute">{sub}</dd>}
    </div>
  )
}
