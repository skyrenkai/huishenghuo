'use client'

import { useState } from 'react'

export default function ShareButton({ title }: { title: string }) {
  const [tip, setTip] = useState('')

  async function share() {
    const url = window.location.href
    if (/MicroMessenger/i.test(navigator.userAgent)) {
      setTip('点右上角「···」分享给朋友或朋友圈')
    } else if (navigator.share) {
      try {
        await navigator.share({ title, url })
      } catch {}
      return
    } else {
      try {
        await navigator.clipboard.writeText(url)
        setTip('链接已复制，可以粘贴到微信里发给朋友')
      } catch {
        setTip(url)
      }
    }
    setTimeout(() => setTip(''), 4000)
  }

  return (
    <div className="relative">
      <button type="button" onClick={share} className="rounded-full border border-line px-3 py-1 text-sm text-ink-soft">
        分享
      </button>
      {tip && (
        <span className="absolute bottom-full right-0 mb-2 w-56 rounded-lg bg-ink px-3 py-2 text-xs text-white" role="status">
          {tip}
        </span>
      )}
    </div>
  )
}
