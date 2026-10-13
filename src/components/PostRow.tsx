import Link from 'next/link'
import { getCategory, cityName } from '@/lib/categories'
import { formatPrice, timeAgo } from '@/lib/format'
import { isPinned } from '@/lib/pin'
import type { PostListItem } from '@/lib/types'

// 列表里的一条：左图右文，没有图就用分类字当缩略图
export default function PostRow({ post }: { post: PostListItem }) {
  const cat = getCategory(post.category)
  const thumb = post.images?.[0]?.thumb
  const done = post.status === 'done'

  return (
    <Link
      href={`/post/${post.id}`}
      className="flex gap-3 border-b border-line bg-white px-4 py-3 last:border-b-0 hover:bg-[#fafafa]"
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-paper">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" loading="lazy" className={`h-full w-full object-cover ${done ? 'opacity-50' : ''}`} />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center text-3xl font-bold text-white"
            style={{ background: cat?.color ?? '#8a93a0', opacity: done ? 0.5 : 0.92 }}
            aria-hidden
          >
            {cat?.glyph ?? '帖'}
          </span>
        )}
        {done && (
          <span className="stamp-done absolute inset-x-2 top-6 py-0.5 text-xs">已完成</span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className={`line-clamp-2 text-[15px] font-medium leading-snug ${done ? 'text-mute' : 'text-ink'}`}>
          {isPinned(post.pinned_until) && <span className="mr-1 rounded bg-seal px-1 py-px align-[1px] text-[11px] text-white">置顶</span>}
          {post.title}
        </h3>
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <p className="flex min-w-0 gap-2 truncate text-xs text-mute">
            <span>{post.subcategory}</span>
            {post.city && <span>{cityName(post.city)}</span>}
            <span>{timeAgo(post.bumped_at)}</span>
            {post.comment_count > 0 && <span>{post.comment_count} 评论</span>}
          </p>
          {post.price && (
            <span className="shrink-0 text-[15px] font-semibold text-price">{formatPrice(post.price)}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
