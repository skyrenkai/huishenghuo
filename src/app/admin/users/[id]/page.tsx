import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/session'
import { timeAgo } from '@/lib/format'
import { displayEmail } from '@/lib/wechat'
import { POST_LIST_FIELDS, type PostListItem } from '@/lib/types'
import { Avatar } from '@/components/Header'
import PostRow from '@/components/PostRow'
import { AdminButton } from '../../AdminButton'

export const metadata: Metadata = { title: '用户详情' }

type Params = Promise<{ id: string }>
type SP = Promise<{ tab?: string }>

type UserDetail = {
  id: string
  name: string
  avatar_url: string | null
  email: string | null
  provider: string
  is_admin: boolean
  is_banned: boolean
  created_at: string
  last_sign_in_at: string | null
}

const PROVIDER_NAME: Record<string, string> = { email: '邮箱', google: 'Google' }

export default async function AdminUserPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const me = await getCurrentUser()
  if (!me) redirect('/login?next=/admin')
  if (!me.profile?.is_admin) redirect('/')

  const { id } = await params
  const tab = (await searchParams).tab
  const supabase = await createClient()

  const { data: u } = await supabase.rpc('admin_user', { uid: id }).maybeSingle()
  if (!u) notFound()
  const user = u as UserDetail

  // 管理员能看到所有帖子，包括已隐藏的
  const { data } = await supabase
    .from('posts')
    .select(`${POST_LIST_FIELDS}, is_hidden`)
    .eq('author_id', id)
    .order('created_at', { ascending: false })
    .limit(200)
  const all = (data ?? []) as (PostListItem & { is_hidden: boolean })[]

  const counts = {
    all: all.length,
    active: all.filter((p) => p.status === 'active' && !p.is_hidden).length,
    done: all.filter((p) => p.status === 'done').length,
    hidden: all.filter((p) => p.is_hidden).length,
  }
  const posts =
    tab === 'hidden' ? all.filter((p) => p.is_hidden) : tab === 'done' ? all.filter((p) => p.status === 'done') : all

  const isWechat = !displayEmail(user.email) && !!user.email

  return (
    <div className="space-y-2 md:space-y-4 md:px-4 md:pt-4">
      <Link href="/admin?tab=users" className="block px-4 pt-3 text-sm text-mute md:px-0 md:pt-0">
        ‹ 返回用户列表
      </Link>

      <section className="bg-white px-4 py-5 md:rounded-xl md:border md:border-line">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} url={user.avatar_url} size={56} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold">
              {user.name}
              {user.is_admin && <span className="ml-2 rounded bg-ink px-1.5 align-middle text-xs text-white">管理员</span>}
              {user.is_banned && <span className="ml-2 rounded bg-price/10 px-1.5 align-middle text-xs text-price">已封号</span>}
            </h1>
            <p className="truncate text-sm text-ink-soft">{isWechat ? '微信用户' : user.email}</p>
          </div>
          {!user.is_admin && (
            <AdminButton rpc={{ fn: 'admin_set_banned', args: { uid: user.id, banned: !user.is_banned } }} danger={!user.is_banned}>
              {user.is_banned ? '解封' : '封号'}
            </AdminButton>
          )}
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-paper p-3 text-sm">
          <Info label="登录方式">{isWechat ? '微信' : PROVIDER_NAME[user.provider] ?? user.provider}</Info>
          <Info label="注册时间">{timeAgo(user.created_at)}</Info>
          <Info label="最近登录">{user.last_sign_in_at ? timeAgo(user.last_sign_in_at) : '—'}</Info>
          <Info label="发帖总数">{counts.all} 条</Info>
        </dl>
      </section>

      <section className="bg-white md:overflow-hidden md:rounded-xl md:border md:border-line">
        <div className="flex gap-5 border-b border-line px-4">
          <Tab href={`/admin/users/${id}`} active={!tab || (tab !== 'done' && tab !== 'hidden')}>全部 {counts.all}</Tab>
          <Tab href={`/admin/users/${id}?tab=done`} active={tab === 'done'}>已完成 {counts.done}</Tab>
          <Tab href={`/admin/users/${id}?tab=hidden`} active={tab === 'hidden'}>已隐藏 {counts.hidden}</Tab>
        </div>
        {posts.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-mute">没有帖子</p>
        ) : (
          posts.map((p) => (
            <PostRow key={p.id} post={p} hidden={p.is_hidden} />
          ))
        )}
        {posts.length > 0 && (
          <p className="border-t border-line px-4 py-2 text-xs text-mute">点开帖子可以隐藏、置顶或删除</p>
        )}
      </section>
    </div>
  )
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-mute">{label}</dt>
      <dd className="min-w-0 truncate">{children}</dd>
    </div>
  )
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={`relative py-3 text-[15px] ${active ? 'font-semibold' : 'text-mute'}`}>
      {children}
      {active && <span className="absolute inset-x-1 bottom-0 h-[3px] rounded-full bg-seal" />}
    </Link>
  )
}
