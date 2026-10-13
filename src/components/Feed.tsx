import Link from 'next/link'
import PostRow from './PostRow'
import type { PostListItem } from '@/lib/types'

type Props = {
  posts: PostListItem[]
  hasMore: boolean
  page: number
  // 生成某一页链接的函数（保留当前的筛选条件）
  pageHref: (page: number) => string
  emptyText?: string
  emptyAction?: { href: string; label: string }
}

export default function Feed({ posts, hasMore, page, pageHref, emptyText, emptyAction }: Props) {
  if (posts.length === 0) {
    return (
      <div className="bg-white px-6 py-16 text-center">
        <p className="text-ink-soft">{emptyText ?? '这里还没有信息'}</p>
        {emptyAction && (
          <Link href={emptyAction.href} className="mt-4 inline-block rounded-full bg-seal px-5 py-2 text-sm text-white">
            {emptyAction.label}
          </Link>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="overflow-hidden bg-white md:rounded-xl md:border md:border-line">
        {posts.map((p) => (
          <PostRow key={p.id} post={p} />
        ))}
      </div>
      {(page > 1 || hasMore) && (
        <div className="flex justify-center gap-3 py-5 text-sm">
          {page > 1 && (
            <Link href={pageHref(page - 1)} className="rounded-full border border-line bg-white px-4 py-1.5 text-ink-soft">
              上一页
            </Link>
          )}
          <span className="px-2 py-1.5 text-mute">第 {page} 页</span>
          {hasMore && (
            <Link href={pageHref(page + 1)} className="rounded-full border border-line bg-white px-4 py-1.5 text-ink-soft">
              下一页
            </Link>
          )}
        </div>
      )}
    </>
  )
}
