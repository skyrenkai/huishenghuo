'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignOutButton() {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={async () => {
        await createClient().auth.signOut()
        router.replace('/')
        router.refresh()
      }}
      className="h-11 w-full rounded-xl border border-line bg-white text-ink-soft"
    >
      退出登录
    </button>
  )
}
