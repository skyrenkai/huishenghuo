'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ProfileEditor({ userId, initialName }: { userId: string; initialName: string }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(initialName)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    const n = name.trim()
    if (!n) return setError('昵称不能为空')
    setSaving(true)
    const { error } = await createClient().from('profiles').update({ name: n }).eq('id', userId)
    setSaving(false)
    if (error) return setError('保存失败，请重试')
    setEditing(false)
    setError('')
    router.refresh()
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <h1 className="truncate text-lg font-bold">{initialName || '新用户'}</h1>
        <button type="button" onClick={() => setEditing(true)} className="shrink-0 text-xs text-seal">
          改昵称
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          autoFocus
          aria-label="昵称"
          className="h-9 min-w-0 flex-1 rounded-lg border border-line px-2 text-base outline-none focus:border-seal"
        />
        <button type="button" disabled={saving} onClick={save} className="rounded-lg bg-seal px-3 text-sm text-white disabled:opacity-60">
          保存
        </button>
        <button type="button" onClick={() => { setEditing(false); setName(initialName); setError('') }} className="text-sm text-mute">
          取消
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-seal">{error}</p>}
    </div>
  )
}
