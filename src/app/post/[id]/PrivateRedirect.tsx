'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 公开页查不到这条信息时，转到按登录身份查询的页面（作者、管理员能看到待审核和已隐藏的信息）
export default function PrivateRedirect({ id }: { id: number }) {
  const router = useRouter()
  useEffect(() => {
    router.replace(Number.isFinite(id) ? `/post/${id}/private` : '/404')
  }, [id, router])
  return <p className="px-4 py-16 text-center text-sm text-mute">加载中…</p>
}
