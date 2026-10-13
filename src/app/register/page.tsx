'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { authErrorZh } from '@/lib/auth-errors'
import { safeNext } from '@/lib/safe-next'
import SocialLogin from '@/components/SocialLogin'

const inputCls =
  'h-11 w-full rounded-lg border border-line px-3 text-base outline-none focus:border-seal'

function RegisterForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = safeNext(params.get('next'))

  const [step, setStep] = useState<'form' | 'code'>('form')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)

  async function onRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('密码至少 8 位')
    if (password !== confirm) return setError('两次输入的密码不一致')

    setLoading(true)
    const supabase = createClient()
    const cleanEmail = email.trim().toLowerCase()
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        // 默认昵称用邮箱 @ 前面的部分，用户以后可以在"我的"里改
        data: { name: cleanEmail.split('@')[0] },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
    setLoading(false)

    if (error) return setError(authErrorZh(error.message))

    // 邮箱已被注册时，Supabase 为了防止被探测，不报错但 identities 为空
    if (data.user && data.user.identities?.length === 0) {
      return setError('这个邮箱已经注册过了，请直接登录')
    }

    // Supabase 关闭了邮箱验证时，注册后直接就是登录状态
    if (data.session) {
      router.replace(next)
      router.refresh()
      return
    }

    setStep('code')
    setNotice(`验证码已发送到 ${cleanEmail}，请查收（也看一下垃圾邮件）`)
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'email',
    })
    setLoading(false)
    if (error) return setError(authErrorZh(error.message))
    router.replace(next)
    router.refresh()
  }

  async function resend() {
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
    })
    if (error) setError(authErrorZh(error.message))
    else setNotice('验证码已重新发送')
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-line">
        <h1 className="text-center text-xl font-semibold text-ink">
          {step === 'form' ? '注册惠生活' : '验证邮箱'}
        </h1>

        {step === 'form' ? (
          <>
            <form onSubmit={onRegister} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm text-ink-soft" htmlFor="email">邮箱</label>
                <input id="email" type="email" autoComplete="email" inputMode="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm text-ink-soft" htmlFor="password">密码（至少 8 位）</label>
                <input id="password" type="password" autoComplete="new-password" required
                  value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm text-ink-soft" htmlFor="confirm">确认密码</label>
                <input id="confirm" type="password" autoComplete="new-password" required
                  value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} />
              </div>

              {error && <p className="text-sm text-seal">{error}</p>}

              <button type="submit" disabled={loading}
                className="h-11 w-full rounded-lg bg-seal text-base font-medium text-white active:bg-seal-dark disabled:opacity-60">
                {loading ? '提交中…' : '注册'}
              </button>
            </form>

            <SocialLogin next={next} />
          </>
        ) : (
          <form onSubmit={onVerify} className="mt-6 space-y-4">
            {notice && <p className="text-sm text-ink-soft">{notice}</p>}
            <input
              type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={8}
              required value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="邮件里的验证码"
              className={`${inputCls} text-center text-2xl tracking-[0.35em]`}
            />
            {error && <p className="text-sm text-seal">{error}</p>}
            <button type="submit" disabled={loading || code.length < 6}
              className="h-11 w-full rounded-lg bg-seal text-base font-medium text-white active:bg-seal-dark disabled:opacity-60">
              {loading ? '验证中…' : '完成注册'}
            </button>
            <div className="flex justify-between text-sm">
              <button type="button" onClick={() => { setStep('form'); setCode(''); setError('') }}
                className="text-mute">修改邮箱</button>
              <button type="button" onClick={resend} className="text-seal">重新发送</button>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-mute">
          已有账号？
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-seal">去登录</Link>
        </p>
        <p className="mt-3 text-center text-xs text-mute">
          注册即表示同意
          <Link href="/terms" className="mx-0.5 underline">服务条款</Link>和
          <Link href="/privacy" className="mx-0.5 underline">隐私政策</Link>
        </p>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}
