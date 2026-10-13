'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/format'
import type { Comment } from '@/lib/types'
import { Avatar } from '@/components/Header'

type Props = { postId: number; currentUserId: string | null; isAdmin: boolean }

export default function Comments({ postId, currentUserId, isAdmin }: Props) {
  const path = usePathname()
  const [list, setList] = useState<Comment[] | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data } = await createClient()
      .from('comments')
      .select('id, post_id, author_id, body, created_at, author:profiles(name, avatar_url)')
      .eq('post_id', postId)
      .eq('is_hidden', false)
      .order('created_at', { ascending: true })
      .limit(200)
    setList((data as unknown as Comment[]) ?? [])
  }, [postId])

  useEffect(() => {
    load()
  }, [load])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const body = text.trim()
    if (!body || !currentUserId) return
    setSending(true)
    setError('')
    const { error } = await createClient().from('comments').insert({ post_id: postId, author_id: currentUserId, body })
    setSending(false)
    if (error) {
      setError(error.message.includes('太多') ? '今天评论太多了，明天再来' : '发送失败，请重试')
      return
    }
    setText('')
    load()
  }

  async function remove(id: number) {
    if (!confirm('删除这条评论？')) return
    await createClient().from('comments').delete().eq('id', id)
    load()
  }

  return (
    <section className="mt-2 bg-white px-4 py-4 md:mt-4 md:rounded-xl md:border md:border-line" aria-label="评论">
      <h2 className="font-semibold">
        评论 {list && list.length > 0 && <span className="text-mute">{list.length}</span>}
      </h2>

      {list === null ? (
        <div className="mt-3 h-12 animate-pulse rounded bg-paper" />
      ) : list.length === 0 ? (
        <p className="mt-3 text-sm text-mute">还没有评论，有问题可以在这里问发布者。</p>
      ) : (
        <ul className="mt-3 space-y-4">
          {list.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Avatar name={c.author?.name ?? '用户'} url={c.author?.avatar_url ?? null} size={30} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-mute">
                  <span className="font-medium text-ink-soft">{c.author?.name ?? '用户'}</span>
                  <span>{timeAgo(c.created_at)}</span>
                  {(c.author_id === currentUserId || isAdmin) && (
                    <button type="button" onClick={() => remove(c.id)} className="ml-auto text-mute hover:text-seal">
                      删除
                    </button>
                  )}
                </div>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-[15px]">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {currentUserId ? (
        <form onSubmit={send} className="mt-4 flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            rows={1}
            placeholder="写评论…"
            className="min-h-10 flex-1 resize-y rounded-lg bg-paper px-3 py-2 text-base outline-none focus:ring-1 focus:ring-seal"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="h-10 rounded-lg bg-seal px-4 text-sm font-medium text-white disabled:opacity-50"
          >
            {sending ? '发送中' : '发送'}
          </button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-mute">
          <Link href={`/login?next=${encodeURIComponent(path)}`} className="text-seal">
            登录
          </Link>
          后可以评论
        </p>
      )}
      {error && <p className="mt-2 text-sm text-seal">{error}</p>}
    </section>
  )
}
