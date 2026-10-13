'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { authErrorZh } from '@/lib/auth-errors'

const inputCls =
  'h-11 w-full rounded-lg border border-line px-3 text-base outline-none focus:border-seal'

// 找回密码：输入邮箱 → 收到验证码 → 输入验证码和新密码
// 已登录的用户打开这个页面，可以直接修改密码
function ResetForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [step, setStep] = useState<'loading' | 'email' | 'code' | 'set'>('loading')
  const [email, setEmail] = useState(params.get('email') || '')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setStep(data.user ? 'set' : 'email'))
  }, [])

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault()
    setError('')
    const clean = email.trim().toLowerCase()
    if (!clean) return setError('请填写注册时用的邮箱')
    setLoading(true)
    const { error } = await createClient().auth.resetPasswordForEmail(clean)
    setLoading(false)
    if (error) return setError(authErrorZh(error.message))
    setStep('code')
    setNotice(`验证码已发送到 ${clean}，请查收（也看一下垃圾邮件）`)
  }

  function checkPassword(): boolean {
    if (password.length < 8) {
      setError('密码至少 8 位')
      return false
    }
    if (password !== confirm) {
      setError('两次输入的密码不一致')
      return false
    }
    return true
  }

  async function verifyAndSet(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!checkPassword()) return
    setLoading(true)
    const supabase = createClient()
    const { error: vErr } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'recovery',
    })
    if (vErr) {
      setLoading(false)
      return setError(authErrorZh(vErr.message))
    }
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) return setError(authErrorZh(error.message))
    router.replace('/me')
    router.refresh()
  }

  async function setOnly(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!checkPassword()) return
    setLoading(true)
    const { error } = await createClient().auth.updateUser({ password })
    setLoading(false)
    if (error) return setError(authErrorZh(error.message))
    router.replace('/me')
    router.refresh()
  }

  const passwordFields = (
    <>
      <input type="password" autoComplete="new-password" placeholder="新密码（至少 8 位）" required
        value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} aria-label="新密码" />
      <input type="password" autoComplete="new-password" placeholder="再输入一次新密码" required
        value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} aria-label="确认新密码" />
    </>
  )

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-line">
        <h1 className="text-center text-xl font-semibold text-ink">{step === 'set' ? '修改密码' : '找回密码'}</h1>

        {step === 'loading' && <div className="mt-6 h-24 animate-pulse rounded-lg bg-paper" />}

        {step === 'email' && (
          <form onSubmit={sendCode} className="mt-6 space-y-4">
            <p className="text-sm text-ink-soft">输入注册时用的邮箱，我们会发一个验证码给你。</p>
            <input type="email" inputMode="email" autoComplete="email" required placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} aria-label="邮箱" />
            {error && <p className="text-sm text-price">{error}</p>}
            <button type="submit" disabled={loading}
              className="h-11 w-full rounded-lg bg-seal text-base font-medium text-white disabled:opacity-60">
              {loading ? '发送中…' : '发送验证码'}
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={verifyAndSet} className="mt-6 space-y-4">
            {notice && <p className="text-sm text-ink-soft">{notice}</p>}
            <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={8} required
              placeholder="邮件里的验证码" value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className={`${inputCls} text-center text-2xl tracking-[0.35em]`} aria-label="验证码" />
            {passwordFields}
            {error && <p className="text-sm text-price">{error}</p>}
            <button type="submit" disabled={loading || code.length < 6}
              className="h-11 w-full rounded-lg bg-seal text-base font-medium text-white disabled:opacity-60">
              {loading ? '保存中…' : '设置新密码'}
            </button>
            <div className="flex justify-between text-sm">
              <button type="button" onClick={() => { setStep('email'); setCode(''); setError('') }} className="text-mute">
                修改邮箱
              </button>
              <button type="button" onClick={() => sendCode()} className="text-seal">重新发送</button>
            </div>
          </form>
        )}

        {step === 'set' && (
          <form onSubmit={setOnly} className="mt-6 space-y-4">
            {passwordFields}
            {error && <p className="text-sm text-price">{error}</p>}
            <button type="submit" disabled={loading}
              className="h-11 w-full rounded-lg bg-seal text-base font-medium text-white disabled:opacity-60">
              {loading ? '保存中…' : '保存新密码'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-mute">
          <Link href="/login" className="text-seal">返回登录</Link>
        </p>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  )
}
