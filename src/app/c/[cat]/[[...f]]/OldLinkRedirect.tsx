'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { catHref } from '@/lib/categories'

// 以前的板块页网址是 /c/house?sub=房屋出租&sort=hot&page=2 这种（微信里转发过的老链接），
// 在浏览器里转到新网址，不占用服务器
export default function OldLinkRedirect({ cat }: { cat: string }) {
  const router = useRouter()
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    if (!q.has('sub') && !q.has('sort') && !q.has('page')) return
    router.replace(
      catHref(cat, {
        sub: q.get('sub') || '',
        sort: q.get('sort') === 'hot' ? 'hot' : 'new',
        page: Number(q.get('page')) || 1,
      })
    )
  }, [cat, router])
  return null
}
