'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PostContact } from '@/lib/types'

export type MaskedContact = { phone?: string; wechat?: string; email?: string }

// 联系方式：先显示打码的号码，点"查看完整号码"后才去取完整的（不用登录）
// 完整号码不在网页源代码里，爬虫抓不到
export default function ContactBox({ postId, masked }: { postId: number; masked: MaskedContact | null }) {
  const [full, setFull] = useState<PostContact | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  if (!masked || (!masked.phone && !masked.wechat && !masked.email)) {
    return <p className="mt-5 rounded-lg bg-paper px-4 py-3 text-sm text-mute">发布者没有留联系方式，可以在下方评论留言。</p>
  }

  async function reveal() {
    setLoading(true)
    setError('')
    const { data, error } = await createClient().from('post_contacts').select('*').eq('post_id', postId).maybeSingle()
    setLoading(false)
    if (error || !data) return setError('获取失败，请刷新页面重试')
    setFull(data as PostContact)
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const rows = [
    masked.phone && { key: 'phone', label: '电话', masked: masked.phone, value: full?.phone },
    masked.wechat && { key: 'wechat', label: '微信', masked: masked.wechat, value: full?.wechat },
    masked.email && { key: 'email', label: '邮箱', masked: masked.email, value: full?.email },
  ].filter(Boolean) as { key: string; label: string; masked: string; value?: string | null }[]

  return (
    <div className="mt-5 rounded-lg border border-line">
      <div className="divide-y divide-line">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-3 px-4 py-2.5">
            <span className="w-8 shrink-0 text-sm text-mute">{r.label}</span>
            <span className={`min-w-0 flex-1 break-all font-semibold ${r.key === 'phone' ? 'text-price' : 'text-ink'}`}>
              {r.value ?? r.masked}
            </span>
            {r.value && r.key === 'phone' && (
              <a href={`tel:${r.value.replace(/[^\d+]/g, '')}`} className="shrink-0 rounded-full bg-jade px-3 py-1 text-sm text-white">
                拨打
              </a>
            )}
            {r.value && r.key === 'wechat' && (
              <button type="button" onClick={() => copy(r.value!)} className="shrink-0 rounded-full bg-jade px-3 py-1 text-sm text-white">
                {copied ? '已复制' : '复制'}
              </button>
            )}
            {r.value && r.key === 'email' && (
              <a href={`mailto:${r.value}`} className="shrink-0 rounded-full bg-jade px-3 py-1 text-sm text-white">
                发邮件
              </a>
            )}
          </div>
        ))}
      </div>

      {!full && (
        <div className="border-t border-line px-4 py-2.5">
          <button
            type="button"
            onClick={reveal}
            disabled={loading}
            className="h-10 w-full rounded-lg border border-price text-sm font-medium text-price active:bg-price/5 disabled:opacity-60"
          >
            {loading ? '正在获取…' : '点击查看完整联系方式'}
          </button>
          {error && <p className="mt-2 text-center text-xs text-price">{error}</p>}
        </div>
      )}
      {full && (
        <p className="border-t border-line px-4 py-2 text-xs text-mute">联系时请说明在“惠生活”上看到的信息</p>
      )}
    </div>
  )
}
