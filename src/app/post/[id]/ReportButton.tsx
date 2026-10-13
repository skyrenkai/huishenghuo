'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const REASONS = ['疑似诈骗', '虚假信息', '广告刷屏', '违法或色情内容', '已失效', '其他']

export default function ReportButton({ postId, loggedIn }: { postId: number; loggedIn: boolean }) {
  const router = useRouter()
  const path = usePathname()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  async function submit() {
    setState('sending')
    const supabase = createClient()
    const { data: u } = await supabase.auth.getUser()
    const { error } = await supabase.from('reports').insert({
      post_id: postId,
      reporter_id: u.user!.id,
      reason: [reason, detail.trim()].filter(Boolean).join('：').slice(0, 200),
    })
    // 重复举报（唯一约束）也当作成功
    setState(!error || error.code === '23505' ? 'done' : 'error')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => (loggedIn ? setOpen(true) : router.push(`/login?next=${encodeURIComponent(path)}`))}
        className="rounded-full border border-line px-3 py-1 text-sm text-mute"
      >
        举报
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-label="举报这条信息"
            className="safe-bottom w-full max-w-md rounded-t-2xl bg-white p-5 md:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {state === 'done' ? (
              <div className="py-6 text-center">
                <p className="font-medium">已收到举报</p>
                <p className="mt-1 text-sm text-mute">管理员会尽快处理。</p>
                <button type="button" onClick={() => setOpen(false)} className="mt-5 rounded-full bg-ink px-6 py-2 text-sm text-white">
                  关闭
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold">举报这条信息</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      className={`rounded-full px-3 py-1.5 text-sm ${reason === r ? 'bg-seal text-white' : 'bg-paper text-ink-soft'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <textarea
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  maxLength={150}
                  rows={3}
                  placeholder="补充说明（可不填）"
                  className="mt-3 w-full rounded-lg border border-line p-3 text-base outline-none focus:border-seal"
                />
                {state === 'error' && <p className="mt-2 text-sm text-price">提交失败，请重试</p>}
                <div className="mt-4 flex gap-3">
                  <button type="button" onClick={() => setOpen(false)} className="h-11 flex-1 rounded-lg bg-paper text-ink-soft">
                    取消
                  </button>
                  <button
                    type="button"
                    disabled={!reason || state === 'sending'}
                    onClick={submit}
                    className="h-11 flex-1 rounded-lg bg-seal font-medium text-white disabled:opacity-50"
                  >
                    {state === 'sending' ? '提交中…' : '提交举报'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
