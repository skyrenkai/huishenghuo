'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// 打开帖子时浏览数 +1：同一台设备同一条帖子 24 小时内只算一次（减少数据库写入）
// 搜索引擎、微信抓取等机器访问不计数
export default function ViewPing({ id }: { id: number }) {
  useEffect(() => {
    if (/bot|crawler|spider|preview|facebookexternalhit/i.test(navigator.userAgent)) return
    const key = `viewed:${id}`
    try {
      const last = Number(localStorage.getItem(key) || 0)
      if (Date.now() - last < 24 * 3600 * 1000) return
      localStorage.setItem(key, String(Date.now()))
    } catch {
      // 隐私模式下 localStorage 可能不可用，照常计数
    }
    createClient().rpc('increment_view', { pid: id }).then(() => {})
  }, [id])
  return null
}
