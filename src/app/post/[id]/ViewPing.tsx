'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// 打开帖子时浏览数 +1（同一个浏览器标签里重复打开只算一次）
export default function ViewPing({ id }: { id: number }) {
  useEffect(() => {
    const key = `viewed:${id}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch {
      // 隐私模式下 sessionStorage 可能不可用，照常计数
    }
    createClient().rpc('increment_view', { pid: id }).then(() => {})
  }, [id])
  return null
}
