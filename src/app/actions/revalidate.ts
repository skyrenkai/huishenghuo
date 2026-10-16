'use server'

import { revalidateTag } from 'next/cache'
import { getCurrentUser } from '@/lib/session'

// 发布、修改、审核、置顶、隐藏、删除、改广告之后调用：让首页和列表马上显示最新内容，
// 不用等缓存自动过期（最多 60 秒）。只有登录用户能触发。
export async function refreshPublicCache() {
  const user = await getCurrentUser()
  if (!user) return
  revalidateTag('posts')
  revalidateTag('banners')
}
