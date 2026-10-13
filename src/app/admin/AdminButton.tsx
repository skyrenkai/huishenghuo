'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Change = { table: 'posts' | 'reports'; id: number | string; fields: Record<string, unknown> }
type Rpc = { fn: string; args: Record<string, unknown> }

type Props = {
  danger?: boolean
  children: React.ReactNode
} & (
  | (Change & { also?: Change; rpc?: undefined })
  | { rpc: Rpc; table?: undefined; id?: undefined; fields?: undefined; also?: undefined }
)

// 管理后台的按钮：改一条记录（可以顺带再改一条，比如隐藏帖子的同时把举报标为已处理），
// 或者调用一个数据库函数（比如封号）
export function AdminButton(props: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function run() {
    setBusy(true)
    setError('')
    const supabase = createClient()

    if (props.rpc) {
      const { error } = await supabase.rpc(props.rpc.fn, props.rpc.args)
      if (error) {
        setError('失败')
        setBusy(false)
        return
      }
    } else {
      const changes = [{ table: props.table, id: props.id, fields: props.fields }, props.also].filter(Boolean) as Change[]
      for (const c of changes) {
        const { error } = await supabase.from(c.table).update(c.fields).eq('id', c.id)
        if (error) {
          setError('失败')
          setBusy(false)
          return
        }
      }
    }
    setBusy(false)
    router.refresh()
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={run}
        className={`rounded-full border px-3 py-1 text-sm disabled:opacity-50 ${
          props.danger ? 'border-price/40 text-price' : 'border-line text-ink-soft'
        }`}
      >
        {busy ? '…' : props.children}
      </button>
      {error && <span className="text-xs text-price">{error}</span>}
    </span>
  )
}
