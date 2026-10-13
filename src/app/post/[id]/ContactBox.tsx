'use client'

import { useState } from 'react'
import type { PostContact } from '@/lib/types'

// 联系方式：所有人可见，不用登录就能拨打电话、复制微信
export default function ContactBox({ contact }: { contact: PostContact | null }) {
  const [copied, setCopied] = useState(false)

  const items = [
    contact?.phone && { label: '电话', value: contact.phone, href: `tel:${contact.phone.replace(/[^\d+]/g, '')}` },
    contact?.wechat && { label: '微信', value: contact.wechat, copy: true },
    contact?.email && { label: '邮箱', value: contact.email, href: `mailto:${contact.email}` },
  ].filter(Boolean) as { label: string; value: string; href?: string; copy?: boolean }[]

  if (items.length === 0) {
    return <p className="mt-5 rounded-lg bg-paper px-4 py-3 text-sm text-mute">发布者没有留联系方式，可以在下方评论留言。</p>
  }

  return (
    <div className="mt-5 divide-y divide-line rounded-lg border border-line">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-3 px-4 py-2.5">
          <span className="w-8 text-sm text-mute">{it.label}</span>
          <span className="min-w-0 flex-1 break-all font-medium">{it.value}</span>
          {it.href && (
            <a href={it.href} className="rounded-full bg-jade px-3 py-1 text-sm text-white">
              {it.label === '电话' ? '拨打' : '发邮件'}
            </a>
          )}
          {it.copy && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(it.value)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                } catch {}
              }}
              className="rounded-full bg-jade px-3 py-1 text-sm text-white"
            >
              {copied ? '已复制' : '复制'}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
