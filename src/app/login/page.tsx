'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { authErrorZh } from '@/lib/auth-errors'
import { safeNext } from '@/lib/safe-next'
import SocialLogin from '@/components/SocialLogin'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = safeNext(params.get('next'))

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(params.get('error') || '')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setLoading(false)
    if (error) {
      setError(authErrorZh(error.message))
      return
    }
    router.replace(next)
    router.refresh()
  }

  // 忘记密码：去找回密码页，用邮件验证码重设（不用点邮件里的链接）
  function forgot() {
    const e = email.trim()
    router.push(`/reset-password${e ? `?email=${encodeURIComponent(e)}` : ''}`)
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-line">
        <h1 className="text-center text-xl font-semibold text-ink">登录惠生活</h1>
        <p className="mt-1 text-center text-sm text-mute">登录后可以发布信息、评论和收藏</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-ink-soft" htmlFor="email">邮箱</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-11 w-full rounded-lg border border-line px-3 text-base outline-none focus:border-seal"
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm text-ink-soft" htmlFor="password">密码</label>
              <button type="button" onClick={forgot} className="text-xs text-seal">
                忘记密码？
              </button>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full rounded-lg border border-line px-3 text-base outline-none focus:border-seal"
            />
          </div>

          {error && <p className="text-sm text-price">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-lg bg-seal text-base font-medium text-white active:bg-seal-dark disabled:opacity-60"
          >
            {loading ? '登录中…' : '登录'}
          </button>
        </form>

        <SocialLogin next={next} />

        <p className="mt-6 text-center text-sm text-mute">
          还没有账号？
          <Link href={`/register?next=${encodeURIComponent(next)}`} className="text-seal">
            免费注册
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
