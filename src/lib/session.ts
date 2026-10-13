import { cache } from 'react'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { CITIES, SINGLE_CITY } from '@/lib/categories'
import type { Profile } from '@/lib/types'

// 当前登录用户和资料（没登录返回 null）
// 是否管理员、是否封号只能通过 my_profile() 读自己的，别人查不到
// 用 cache 包起来：同一次页面请求里布局和页面都调用时，只查一次
export const getCurrentUser = cache(
  async (): Promise<{ id: string; email: string | null; profile: Profile | null } | null> => {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    const claims = data?.claims
    if (!claims?.sub) return null
    const { data: profile } = await supabase.rpc('my_profile').maybeSingle()
    return {
      id: claims.sub,
      email: (claims.email as string | undefined) ?? null,
      profile: (profile as Profile) ?? null,
    }
  }
)

// 用户选的城市存在 cookie 里；'' 表示全部城市
export async function getSelectedCity(): Promise<string> {
  if (SINGLE_CITY) return SINGLE_CITY
  const c = (await cookies()).get('city')?.value || ''
  return CITIES.some((x) => x.code === c) ? c : ''
}
