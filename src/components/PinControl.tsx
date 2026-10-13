'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PIN_OPTIONS, formatDate, isPinned, pinEndDate } from '@/lib/pin'

// 管理员设置置顶时长；到期自动取消
export default function PinControl({ postId, pinnedUntil }: { postId: number; pinnedUntil: string | null }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pinned = isPinned(pinnedUntil)

  async function save(until: Date | null) {
    setBusy(true)
    setError('')
    const { error } = await createClient()
      .from('posts')
      .update({ pinned_until: until ? until.toISOString() : null })
      .eq('id', postId)
    setBusy(false)
    if (error) return setError('失败：' + error.message)
    setOpen(false)
    router.refresh()
  }

  return (
    <span className="relative inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`rounded-full border px-3 py-1.5 text-sm disabled:opacity-50 ${
          pinned ? 'border-seal bg-seal-soft text-seal' : 'border-line bg-white text-ink'
        }`}
      >
        {pinned ? `置顶至 ${formatDate(pinnedUntil!)}` : '置顶'}
      </button>

      {open && (
        <span className="absolute left-0 top-full z-20 mt-2 flex w-56 flex-col gap-1 rounded-xl border border-line bg-white p-2 shadow-lg">
          <span className="px-2 py-1 text-xs text-mute">
            {pinned ? '重新设置置顶时长（从今天算起）' : '选择置顶时长，到期自动取消'}
          </span>
          {PIN_OPTIONS.map((opt) => {
            const end = pinEndDate(opt)
            return (
              <button
                key={opt.label}
                type="button"
                disabled={busy}
                onClick={() => save(end)}
                className="flex justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-paper"
              >
                <span>{opt.label}</span>
                <span className="text-mute">到 {formatDate(end.toISOString())}</span>
              </button>
            )
          })}
          {pinned && (
            <button
              type="button"
              disabled={busy}
              onClick={() => save(null)}
              className="rounded-lg px-2 py-1.5 text-left text-sm text-price hover:bg-paper"
            >
              取消置顶
            </button>
          )}
        </span>
      )}
      {error && <span className="text-xs text-price">{error}</span>}
    </span>
  )
}
