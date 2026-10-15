import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/session'
import { timeAgo } from '@/lib/format'
import { getCategory, cityName } from '@/lib/categories'
import { AdminButton } from './AdminButton'
import BannerManager, { type AdminBanner } from './BannerManager'
import ViewStats from './ViewStats'
import { displayEmail } from '@/lib/wechat'
import PinControl from '@/components/PinControl'
import { formatDate, isPinned } from '@/lib/pin'

export const metadata: Metadata = { title: '管理后台' }

type SP = Promise<{ tab?: string; q?: string; days?: string }>

type ReportRow = {
  id: number
  reason: string
  created_at: string
  post: { id: number; title: string; is_hidden: boolean } | null
  reporter: { name: string } | null
}
type PostRowA = { id: number; author_id: string; title: string; category: string; city: string; is_hidden: boolean; is_approved: boolean; pinned_until: string | null; created_at: string; author: { name: string } | null }
type PendingRow = { id: number; author_id: string; title: string; category: string; subcategory: string; body: string; images: { thumb: string }[]; created_at: string; edited_at: string | null; author: { name: string } | null }

const TABS = ['pending', 'reports', 'posts', 'users', 'banners', 'stats']
type UserRow = { id: string; name: string; email: string | null; is_admin: boolean; is_banned: boolean; created_at: string; post_count: number }

export default async function AdminPage({ searchParams }: { searchParams: SP }) {
  const me = await getCurrentUser()
  if (!me) redirect('/login?next=/admin')
  if (!me.profile?.is_admin) redirect('/')

  const sp = await searchParams
  const tab = TABS.includes(sp.tab || '') ? sp.tab! : 'pending'
  const days = [7, 30, 90].includes(Number(sp.days)) ? Number(sp.days) : 30
  const q = (sp.q || '').trim()
  const supabase = await createClient()

  const [{ count: userCount }, { count: postCount }, { count: reportCount }, { count: pendingCount }] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('posts').select('id', { count: 'exact', head: true }),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('is_approved', false).eq('is_hidden', false),
  ])

  let reports: ReportRow[] = []
  let posts: PostRowA[] = []
  let users: UserRow[] = []
  let banners: AdminBanner[] = []
  let pending: PendingRow[] = []

  if (tab === 'pending') {
    // 等待审核的帖子：先发的排前面
    const { data } = await supabase
      .from('posts')
      .select('id, author_id, title, category, subcategory, body, images, created_at, edited_at, author:profiles(name)')
      .eq('is_approved', false)
      .eq('is_hidden', false)
      .order('created_at', { ascending: true })
      .limit(100)
    pending = (data ?? []) as unknown as PendingRow[]
  } else if (tab === 'reports') {
    const { data } = await supabase
      .from('reports')
      .select('id, reason, created_at, post:posts(id, title, is_hidden), reporter:profiles(name)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(100)
    reports = (data ?? []) as unknown as ReportRow[]
  } else if (tab === 'posts') {
    let query = supabase
      .from('posts')
      .select('id, author_id, title, category, city, is_hidden, is_approved, pinned_until, created_at, author:profiles(name)')
      .order('created_at', { ascending: false })
      .limit(100)
    if (q) query = query.ilike('title', `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`)
    const { data } = await query
    posts = (data ?? []) as unknown as PostRowA[]
  } else if (tab === 'banners') {
    const { data } = await supabase
      .from('banners')
      .select('id, image_url, link_url, title, sort, is_active, ends_at')
      .order('sort', { ascending: true })
      .order('id', { ascending: true })
    banners = (data ?? []) as AdminBanner[]
  } else if (tab === 'users') {
    // 管理员身份和封号状态是保密字段，只能通过 admin_users() 读
    const { data } = await supabase.rpc('admin_users', { q: q.replace(/[%_\\]/g, (m) => `\\${m}`) })
    users = (data ?? []) as UserRow[]
  }

  return (
    <div className="space-y-2 md:space-y-4 md:px-4 md:pt-4">
      <section className="bg-white px-4 py-4 md:rounded-xl md:border md:border-line">
        <h1 className="text-lg font-bold">管理后台</h1>
        <dl className="mt-3 grid grid-cols-4 text-center">
          <Stat label="用户" value={userCount ?? 0} />
          <Stat label="帖子" value={postCount ?? 0} />
          <Stat label="待审核" value={pendingCount ?? 0} highlight={(pendingCount ?? 0) > 0} />
          <Stat label="待处理举报" value={reportCount ?? 0} highlight={(reportCount ?? 0) > 0} />
        </dl>
      </section>

      <section className="bg-white md:overflow-hidden md:rounded-xl md:border md:border-line">
        <div className="flex gap-5 overflow-x-auto border-b border-line px-4">
          <Tab href="/admin" active={tab === 'pending'}>
            待审核{(pendingCount ?? 0) > 0 && <span className="ml-1 rounded-full bg-price px-1.5 text-[11px] text-white">{pendingCount}</span>}
          </Tab>
          <Tab href="/admin?tab=reports" active={tab === 'reports'}>举报</Tab>
          <Tab href="/admin?tab=posts" active={tab === 'posts'}>帖子</Tab>
          <Tab href="/admin?tab=users" active={tab === 'users'}>用户</Tab>
          <Tab href="/admin?tab=banners" active={tab === 'banners'}>广告</Tab>
          <Tab href="/admin?tab=stats" active={tab === 'stats'}>数据</Tab>
        </div>

        {tab === 'banners' && <BannerManager userId={me.id} banners={banners} />}
        {tab === 'stats' && <ViewStats days={days} />}

        {(tab === 'posts' || tab === 'users') && (
          <form className="flex gap-2 border-b border-line px-4 py-2">
            <input type="hidden" name="tab" value={tab} />
            <input name="q" defaultValue={q} placeholder={tab === 'posts' ? '搜索标题' : '搜索昵称或邮箱'} className="h-9 flex-1 rounded-lg bg-paper px-3 text-base outline-none" />
            <button className="rounded-lg bg-ink px-3 text-sm text-white">搜索</button>
          </form>
        )}

        {tab === 'pending' &&
          (pending.length === 0 ? (
            <Empty>没有等待审核的信息</Empty>
          ) : (
            pending.map((p) => (
              <div key={p.id} className="flex gap-3 border-b border-line px-4 py-3 last:border-b-0">
                {p.images?.[0]?.thumb && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.images[0].thumb} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <Link href={`/post/${p.id}`} className="block font-medium hover:text-seal">
                    {p.edited_at && <span className="mr-1 rounded bg-paper px-1 text-[11px] text-ink-soft">修改后重审</span>}
                    {p.title}
                  </Link>
                  <p className="mt-0.5 line-clamp-2 text-sm text-ink-soft">{p.body}</p>
                  <p className="mt-0.5 text-xs text-mute">
                    {getCategory(p.category)?.name} · {p.subcategory}，<Link href={`/admin/users/${p.author_id}`} className="text-seal">{p.author?.name ?? '用户'}</Link>，{timeAgo(p.edited_at ?? p.created_at)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <AdminButton table="posts" id={p.id} fields={{ is_approved: true }}>
                      通过
                    </AdminButton>
                    <AdminButton table="posts" id={p.id} fields={{ is_hidden: true }} danger>
                      不通过（隐藏）
                    </AdminButton>
                  </div>
                </div>
              </div>
            ))
          ))}

        {tab === 'reports' &&
          (reports.length === 0 ? (
            <Empty>没有待处理的举报</Empty>
          ) : (
            reports.map((r) => (
              <div key={r.id} className="border-b border-line px-4 py-3 last:border-b-0">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    {r.post ? (
                      <Link href={`/post/${r.post.id}`} className="font-medium hover:text-seal">
                        {r.post.title}
                      </Link>
                    ) : (
                      <span className="text-mute">帖子已删除</span>
                    )}
                    <p className="mt-0.5 text-sm text-price">{r.reason}</p>
                    <p className="text-xs text-mute">
                      {r.reporter?.name ?? '用户'} 举报于 {timeAgo(r.created_at)}
                      {r.post?.is_hidden && '，帖子已隐藏'}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {r.post && !r.post.is_hidden && (
                    <AdminButton table="posts" id={r.post.id} fields={{ is_hidden: true }} also={{ table: 'reports', id: r.id, fields: { status: 'resolved' } }} danger>
                      隐藏帖子并处理
                    </AdminButton>
                  )}
                  <AdminButton table="reports" id={r.id} fields={{ status: 'resolved' }}>
                    忽略（无问题）
                  </AdminButton>
                </div>
              </div>
            ))
          ))}

        {tab === 'posts' &&
          (posts.length === 0 ? (
            <Empty>没有帖子</Empty>
          ) : (
            posts.map((p) => (
              <div key={p.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <Link href={`/post/${p.id}`} className={`block truncate ${p.is_hidden ? 'text-mute line-through' : 'font-medium'}`}>
                    {!p.is_approved && !p.is_hidden && <span className="mr-1 text-[#b36b00]">[待审核]</span>}
                    {isPinned(p.pinned_until) && <span className="mr-1 text-seal">[置顶至 {formatDate(p.pinned_until!)}]</span>}
                    {p.title}
                  </Link>
                  <p className="text-xs text-mute">
                    {getCategory(p.category)?.name}，{cityName(p.city)}，<Link href={`/admin/users/${p.author_id}`} className="text-seal">{p.author?.name ?? '用户'}</Link>，{timeAgo(p.created_at)}
                  </p>
                </div>
                <PinControl postId={p.id} pinnedUntil={p.pinned_until} />
                <AdminButton table="posts" id={p.id} fields={{ is_hidden: !p.is_hidden }} danger={!p.is_hidden}>
                  {p.is_hidden ? '恢复' : '隐藏'}
                </AdminButton>
              </div>
            ))
          ))}

        {tab === 'users' &&
          (users.length === 0 ? (
            <Empty>没有用户</Empty>
          ) : (
            users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
                <Link href={`/admin/users/${u.id}`} className="min-w-0 flex-1 hover:text-seal">
                  <p className="truncate font-medium">
                    {u.name}
                    {u.is_admin && <span className="ml-2 rounded bg-ink px-1 text-[11px] text-white">管理员</span>}
                    {u.is_banned && <span className="ml-2 rounded bg-price/10 px-1 text-[11px] text-price">已封</span>}
                  </p>
                  <p className="truncate text-xs text-mute">{displayEmail(u.email) || '微信登录'}</p>
                  <p className="text-xs text-mute">
                    注册于 {timeAgo(u.created_at)}，发帖 {u.post_count} 条
                  </p>
                </Link>
                {!u.is_admin && (
                  <AdminButton rpc={{ fn: 'admin_set_banned', args: { uid: u.id, banned: !u.is_banned } }} danger={!u.is_banned}>
                    {u.is_banned ? '解封' : '封号'}
                  </AdminButton>
                )}
              </div>
            ))
          ))}
      </section>
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div>
      <dd className={`text-2xl font-bold ${highlight ? 'text-seal' : ''}`}>{value}</dd>
      <dt className="text-xs text-mute">{label}</dt>
    </div>
  )
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={`relative shrink-0 whitespace-nowrap py-3 ${active ? 'font-semibold' : 'text-mute'}`}>
      {children}
      {active && <span className="absolute inset-x-1 bottom-0 h-[3px] rounded-full bg-seal" />}
    </Link>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-12 text-center text-sm text-mute">{children}</p>
}
