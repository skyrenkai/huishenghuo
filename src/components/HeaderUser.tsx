'use client'

import Link from '@/components/Link'
import Avatar from '@/components/Avatar'
import { useViewer } from '@/lib/useViewer'

// 顶部右侧：登录了显示头像，没登录显示"登录"（在浏览器里判断，页面本身可以走缓存）
export default function HeaderUser() {
  const viewer = useViewer()
  if (viewer === undefined) return <span className="hidden h-8 w-8 md:block" aria-hidden />
  return viewer ? (
    <Link href="/me" className="hidden items-center gap-2 md:flex">
      <Avatar name={viewer.name} url={viewer.avatar_url} />
    </Link>
  ) : (
    <Link href="/login" className="hidden text-sm text-ink-soft md:block">
      登录
    </Link>
  )
}
