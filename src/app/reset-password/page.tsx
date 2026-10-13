'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { authErrorZh } from '@/lib/auth-errors'

// 用户点了重置密码邮件里的链接 → /auth/callback 已经让他登录 → 跳到这里设新密码
export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('密码至少 8 位')
    if (password !== confirm) return setError('两次输入的密码不一致')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) return setError(authErrorZh(error.message))
    router.replace('/')
    router.refresh()
  }

  const inputCls =
    'h-11 w-full rounded-lg border border-line px-3 text-base outline-none focus:border-seal'

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-10">
      <form onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-line">
        <h1 className="text-center text-xl font-semibold text-ink">设置新密码</h1>
        <input type="password" autoComplete="new-password" placeholder="新密码（至少 8 位）" required
          value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
        <input type="password" autoComplete="new-password" placeholder="再输入一次" required
          value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} />
        {error && <p className="text-sm text-price">{error}</p>}
        <button type="submit" disabled={loading}
          className="h-11 w-full rounded-lg bg-seal text-base font-medium text-white disabled:opacity-60">
          {loading ? '保存中…' : '保存新密码'}
        </button>
      </form>
    </div>
  )
}
