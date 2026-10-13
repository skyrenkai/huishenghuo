'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const WECHAT_ENABLED = process.env.NEXT_PUBLIC_WECHAT_ENABLED === '1'

export default function SocialLogin({ next = '/' }: { next?: string }) {
  const [inWeChat, setInWeChat] = useState(false)
  const [loading, setLoading] = useState<'google' | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    setInWeChat(/MicroMessenger/i.test(navigator.userAgent))
  }, [])

  async function google() {
    setErr('')
    setLoading('google')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
    if (error) {
      setErr('Google 登录失败，请重试')
      setLoading(null)
    }
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 text-xs text-mute">
        <div className="h-px flex-1 bg-line" />
        其他登录方式
        <div className="h-px flex-1 bg-line" />
      </div>

      <div className="mt-4 space-y-3">
        {WECHAT_ENABLED && (
          <a
            href={`/auth/wechat/start?next=${encodeURIComponent(next)}`}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#07C160] text-sm font-medium text-white active:opacity-80"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
              <ellipse cx="9" cy="10" rx="7" ry="5.8" />
              <ellipse cx="16.5" cy="15" rx="5.5" ry="4.5" opacity="0.85" />
            </svg>
            微信登录
          </a>
        )}

        {inWeChat ? (
          // Google 禁止在微信等 App 内置浏览器里登录（会报 403 disallowed_useragent）
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700">
            微信内无法使用 Google 登录。请点右上角「···」选择「在浏览器中打开」后再用 Google 登录。
          </p>
        ) : (
          <button
            type="button"
            onClick={google}
            disabled={loading !== null}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-white text-sm font-medium text-ink active:bg-paper disabled:opacity-60"
          >
            <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.2z" />
              <path fill="#FBBC05" d="M10.6 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l8-6.1z" />
              <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.2-13.4-9.9l-8 6.1C6.6 42.6 14.6 48 24 48z" />
            </svg>
            {loading === 'google' ? '正在跳转…' : '使用 Google 登录'}
          </button>
        )}

        {err && <p className="text-center text-xs text-seal">{err}</p>}
      </div>
    </div>
  )
}
