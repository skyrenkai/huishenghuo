import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/session'
import { displayEmail } from '@/lib/wechat'
import { POST_LIST_FIELDS, type PostListItem } from '@/lib/types'
import { Avatar } from '@/components/Header'
import PostRow from '@/components/PostRow'
import ProfileEditor from './ProfileEditor'
import SignOutButton from './SignOutButton'

export const metadata: Metadata = { title: '我的' }

type SP = Promise<{ tab?: string }>

export default async function MePage({ searchParams }: { searchParams: SP }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/me')
  const profile = user.profile
  const tab = (await searchParams).tab === 'done' ? 'done' : 'active'

  const supabase = await createClient()
  const { data } = await supabase
    .from('posts')
    .select(`${POST_LIST_FIELDS}, is_hidden`)
    .eq('author_id', user.id)
    .eq('status', tab)
    .order('created_at', { ascending: false })
    .limit(100)
  const posts = (data ?? []) as (PostListItem & { is_hidden: boolean })[]

  return (
    <div className="space-y-2 md:space-y-4 md:px-4 md:pt-4">
      <section className="flex items-center gap-4 bg-white px-4 py-5 md:rounded-xl md:border md:border-line">
        <Avatar name={profile?.name ?? '用户'} url={profile?.avatar_url ?? null} size={56} />
        <div className="min-w-0 flex-1">
          <ProfileEditor userId={user.id} initialName={profile?.name ?? ''} />
          <p className="truncate text-xs text-mute">{displayEmail(user.email) || '微信登录'}</p>
          {profile?.is_banned && <p className="mt-1 text-xs text-price">账号已被限制发布</p>}
        </div>
      </section>

      {profile?.is_admin && (
        <Link href="/admin" className="flex items-center justify-between bg-white px-4 py-3 md:rounded-xl md:border md:border-line">
          <span className="font-medium">管理后台</span>
          <span className="text-sm text-mute">处理举报、隐藏帖子、封号</span>
        </Link>
      )}

      <section className="bg-white md:overflow-hidden md:rounded-xl md:border md:border-line">
        <div className="flex items-center gap-5 border-b border-line px-4">
          <TabLink href="/me" active={tab === 'active'}>我发布的</TabLink>
          <TabLink href="/me?tab=done" active={tab === 'done'}>已完成</TabLink>
          <Link href="/post/new" className="ml-auto text-sm text-seal">发布新信息</Link>
        </div>
        {posts.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-mute">
            {tab === 'done' ? '还没有已完成的信息' : '你还没有发布过信息'}
          </p>
        ) : (
          posts.map((p) => (
            <div key={p.id} className="relative">
              {p.is_hidden && (
                <span className="absolute right-3 top-2 z-10 rounded bg-price/10 px-1.5 text-[11px] text-price">已被隐藏</span>
              )}
              <PostRow post={p} />
            </div>
          ))
        )}
        {posts.length > 0 && (
          <p className="border-t border-line px-4 py-2 text-xs text-mute">点开信息可以编辑、刷新、标记完成或删除</p>
        )}
      </section>

      <div className="px-4 py-2 md:px-0">
        <SignOutButton />
      </div>
      <p className="pb-4 text-center text-xs text-mute">
        <Link href="/terms" className="underline">服务条款</Link>
        <span className="mx-2">|</span>
        <Link href="/privacy" className="underline">隐私政策</Link>
        <span className="mx-2">|</span>
        <Link href="/reset-password" className="underline">修改密码</Link>
      </p>
    </div>
  )
}

function TabLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={`relative py-3 text-[15px] ${active ? 'font-semibold text-ink' : 'text-mute'}`}>
      {children}
      {active && <span className="absolute inset-x-1 bottom-0 h-[3px] rounded-full bg-seal" />}
    </Link>
  )
}
