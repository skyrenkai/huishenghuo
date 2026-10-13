import Link from 'next/link'
import { CATEGORIES } from '@/lib/categories'

// 首页分类入口：每个分类一个汉字图标
export default function CategoryGrid() {
  return (
    <nav aria-label="分类" className="grid grid-cols-5 gap-y-4 bg-white px-2 py-4 md:mt-4 md:rounded-xl md:border md:border-line md:grid-cols-6">
      {CATEGORIES.map((c) => (
        <Link key={c.code} href={`/c/${c.code}`} className="flex flex-col items-center gap-1.5">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-[14px] text-xl font-bold text-white"
            style={{ background: c.color }}
            aria-hidden
          >
            {c.glyph}
          </span>
          <span className="text-xs text-ink-soft">{c.name}</span>
        </Link>
      ))}
    </nav>
  )
}
