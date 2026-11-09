'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// 当前浏览者（在浏览器里查，不经过 Vercel 服务器）
// undefined = 还在查；null = 没登录
export type Viewer = { id: string; name: string; avatar_url: string | null; is_admin: boolean; is_banned: boolean }

let pending: Promise<Viewer | null> | null = null
const listeners = new Set<(v: Viewer | null) => void>()
let subscribed = false

async function load(): Promise<Viewer | null> {
  const supabase = createClient()
  const { data } = await supabase.auth.getSession()
  const uid = data.session?.user.id
  if (!uid) return null
  const { data: p } = await supabase.rpc('my_profile').maybeSingle()
  const prof = p as Partial<Viewer> | null
  return {
    id: uid,
    name: prof?.name ?? '用户',
    avatar_url: prof?.avatar_url ?? null,
    is_admin: !!prof?.is_admin,
    is_banned: !!prof?.is_banned,
  }
}

function getViewer() {
  if (!pending) pending = load().catch(() => null)
  if (!subscribed) {
    subscribed = true
    createClient().auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        // 放到下一轮再查，避免在回调里调用 supabase 造成死锁
        setTimeout(() => {
          pending = load().catch(() => null)
          pending.then((v) => listeners.forEach((fn) => fn(v)))
        }, 0)
      }
    })
  }
  return pending
}

export function useViewer(): Viewer | null | undefined {
  const [viewer, setViewer] = useState<Viewer | null | undefined>(undefined)
  useEffect(() => {
    let alive = true
    getViewer().then((v) => alive && setViewer(v))
    const fn = (v: Viewer | null) => alive && setViewer(v)
    listeners.add(fn)
    return () => {
      alive = false
      listeners.delete(fn)
    }
  }, [])
  return viewer
}
