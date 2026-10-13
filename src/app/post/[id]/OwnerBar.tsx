'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { deleteImages } from '@/lib/images'
import type { PostImage } from '@/lib/types'

type Props = {
  id: number
  status: 'active' | 'done'
  bumpedAt: string
  isOwner: boolean
  isAdmin: boolean
  isHidden: boolean
  isPinned: boolean
}

// 作者和管理员看到的操作栏
export default function OwnerBar({ id, status, bumpedAt, isOwner, isAdmin, isHidden, isPinned }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const canBump = Date.now() - new Date(bumpedAt).getTime() > 24 * 3600 * 1000

  async function update(fields: Record<string, unknown>, okMsg: string) {
    setBusy(true)
    setMsg('')
    const { error } = await createClient().from('posts').update(fields).eq('id', id)
    setBusy(false)
    if (error) setMsg(error.message.includes('24') ? '24 小时内只能刷新一次' : '操作失败：' + error.message)
    else {
      setMsg(okMsg)
      router.refresh()
    }
  }

  async function remove() {
    if (!confirm('确定删除这条信息吗？删除后无法恢复。')) return
    setBusy(true)
    const supabase = createClient()
    const { data } = await supabase.from('posts').select('images').eq('id', id).maybeSingle()
    const { error } = await supabase.from('posts').delete().eq('id', id)
    if (error) {
      setBusy(false)
      setMsg('删除失败：' + error.message)
      return
    }
    if (data?.images) await deleteImages(supabase, data.images as PostImage[])
    router.replace(isOwner ? '/me' : '/')
    router.refresh()
  }

  const btn = 'rounded-full border px-3 py-1.5 text-sm disabled:opacity-50'

  return (
    <div className="mt-4 rounded-lg border border-line bg-paper p-3">
      <p className="mb-2 text-xs text-mute">{isOwner ? '这是你发布的信息' : '管理员操作'}</p>
      <div className="flex flex-wrap gap-2">
        {isOwner && (
          <>
            <Link href={`/post/${id}/edit`} className={`${btn} border-line bg-white text-ink`}>
              编辑
            </Link>
            <button
              type="button"
              disabled={busy}
              onClick={() => update({ status: status === 'done' ? 'active' : 'done' }, status === 'done' ? '已重新上架' : '已标记为完成')}
              className={`${btn} border-line bg-white text-ink`}
            >
              {status === 'done' ? '重新上架' : '标记已完成'}
            </button>
            <button
              type="button"
              disabled={busy || !canBump}
              onClick={() => update({ bumped_at: new Date().toISOString() }, '已刷新到最前面')}
              className={`${btn} border-line bg-white text-ink`}
              title={canBump ? '' : '每 24 小时可以刷新一次'}
            >
              {canBump ? '刷新到最前' : '24 小时后可刷新'}
            </button>
          </>
        )}
        {isAdmin && (
          <>
            <button type="button" disabled={busy} onClick={() => update({ is_pinned: !isPinned }, isPinned ? '已取消置顶' : '已置顶')} className={`${btn} border-line bg-white text-ink`}>
              {isPinned ? '取消置顶' : '置顶'}
            </button>
            <button type="button" disabled={busy} onClick={() => update({ is_hidden: !isHidden }, isHidden ? '已恢复显示' : '已隐藏')} className={`${btn} border-line bg-white text-ink`}>
              {isHidden ? '恢复显示' : '隐藏'}
            </button>
          </>
        )}
        <button type="button" disabled={busy} onClick={remove} className={`${btn} border-seal/40 bg-white text-seal`}>
          删除
        </button>
      </div>
      {msg && <p className="mt-2 text-sm text-ink-soft" role="status">{msg}</p>}
    </div>
  )
}
