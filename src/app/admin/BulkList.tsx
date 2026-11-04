'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { deleteImages } from '@/lib/images'
import { refreshPublicCache } from '@/app/actions/revalidate'
import type { PostImage } from '@/lib/types'

// 管理员批量操作帖子：每行前面一个勾选框，可以一次删除或隐藏多条
export default function BulkList({ rows }: { rows: { id: number; content: React.ReactNode }[] }) {
  const router = useRouter()
  const [picked, setPicked] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const allPicked = rows.length > 0 && picked.size === rows.length
  const toggle = (id: number) =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  async function done(text: string) {
    await refreshPublicCache()
    setPicked(new Set())
    setBusy(false)
    setMsg(text)
    router.refresh()
  }

  async function removeAll() {
    const ids = [...picked]
    if (!ids.length) return
    if (!confirm(`确定删除选中的 ${ids.length} 条帖子吗？删除后无法恢复，帖子的图片和评论也会一起删除。`)) return
    setBusy(true)
    setMsg('')
    const supabase = createClient()
    // 先记下图片，帖子删掉后再把图片文件也删掉
    const { data } = await supabase.from('posts').select('images').in('id', ids)
    const { error } = await supabase.from('posts').delete().in('id', ids)
    if (error) {
      setBusy(false)
      setMsg('删除失败：' + error.message)
      return
    }
    const images = (data ?? []).flatMap((p) => (p.images ?? []) as PostImage[])
    if (images.length) await deleteImages(supabase, images)
    await done(`已删除 ${ids.length} 条`)
  }

  async function hideAll(hidden: boolean) {
    const ids = [...picked]
    if (!ids.length) return
    setBusy(true)
    setMsg('')
    const { error } = await createClient().from('posts').update({ is_hidden: hidden }).in('id', ids)
    if (error) {
      setBusy(false)
      setMsg('操作失败：' + error.message)
      return
    }
    await done(hidden ? `已隐藏 ${ids.length} 条` : `已恢复 ${ids.length} 条`)
  }

  const btn = 'rounded-full border px-3 py-1 text-sm disabled:opacity-40'

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-white px-4 py-2">
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            className="h-4 w-4 accent-seal"
            checked={allPicked}
            onChange={() => setPicked(allPicked ? new Set() : new Set(rows.map((r) => r.id)))}
          />
          全选
        </label>
        <span className="text-sm text-mute">已选 {picked.size} 条</span>
        <span className="ml-auto flex gap-2">
          <button type="button" disabled={busy || !picked.size} onClick={() => hideAll(true)} className={`${btn} border-line text-ink-soft`}>
            隐藏
          </button>
          <button type="button" disabled={busy || !picked.size} onClick={() => hideAll(false)} className={`${btn} border-line text-ink-soft`}>
            恢复显示
          </button>
          <button type="button" disabled={busy || !picked.size} onClick={removeAll} className={`${btn} border-price/40 text-price`}>
            {busy ? '处理中…' : `删除选中${picked.size ? ` (${picked.size})` : ''}`}
          </button>
        </span>
        {msg && <p className="w-full text-sm text-seal" role="status">{msg}</p>}
      </div>
      {rows.map((r) => (
        <div key={r.id} className="flex items-center border-b border-line last:border-b-0">
          <label className="flex self-stretch items-center pl-4 pr-1" aria-label="选择这条">
            <input type="checkbox" className="h-4 w-4 accent-seal" checked={picked.has(r.id)} onChange={() => toggle(r.id)} />
          </label>
          <div className="min-w-0 flex-1">{r.content}</div>
        </div>
      ))}
    </>
  )
}
