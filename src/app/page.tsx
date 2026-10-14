import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/session'
import { getCategory, cityName } from '@/lib/categories'
import { displayViews, formatPrice, timeAgo } from '@/lib/format'
import type { Post, PostContact } from '@/lib/types'
import { Avatar } from '@/components/Header'
import Gallery from './Gallery'
import { sanitizeNewsHtml } from '@/lib/sanitize'
import ContactBox from './ContactBox'
import { maskEmail, maskPhone, maskWechat } from '@/lib/mask'
import Comments from './Comments'
import OwnerBar from './OwnerBar'
import ReportButton from './ReportButton'
import ViewPing from './ViewPing'
import WechatShareImage from '@/components/WechatShareImage'
import ShareButton from './ShareButton'

type Params = Promise<{ id: string }>

// 同一次请求里 generateMetadata 和页面共用一次查询
const getPost = cache(async (id: number): Promise<Post | null> => {
  if (!Number.isFinite(id)) return null
  const supabase = await createClient()
  const { data } = await supabase
    .from('posts')
    .select('*, author:profiles(name, avatar_url)')
    .eq('id', id)
    .maybeSingle()
  return (data as Post) ?? null
})

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const post = await getPost(Number((await params).id))
  if (!post) return { title: '信息不存在' }
  const desc = [formatPrice(post.price), cityName(post.city), post.body.slice(0, 80)].filter(Boolean).join(' ')
  const image = post.images?.[0]?.url
  return {
    title: post.title,
    description: desc,
    openGraph: {
      title: post.title,
      description: desc,
      type: 'article',
      // 有图用第一张图；没图用板块图标（微信分享卡片会显示这个）
      images: [{ url: image ?? (getCategory(post.category) ? `/og/${post.category}.png` : '/og.png') }],
    },
  }
}

export default async function PostPage({ params }: { params: Params }) {
  const post = await getPost(Number((await params).id))
  if (!post) notFound()

  const supabase = await createClient()
  const [user, { data: contact }] = await Promise.all([
    getCurrentUser(),
    supabase.from('post_contacts').select('*').eq('post_id', post.id).maybeSingle(),
  ])
  // 只把打码后的联系方式放进网页，完整的要点击后再取
  const c = contact as PostContact | null
  const masked = c
    ? {
        phone: c.phone ? maskPhone(c.phone) : undefined,
        wechat: c.wechat ? maskWechat(c.wechat) : undefined,
        email: c.email ? maskEmail(c.email) : undefined,
      }
    : null
  // 本地新闻的图文内容：服务器端过滤后再显示，防止有害代码
  const richHtml = getCategory(post.category)?.rich && post.body_html ? sanitizeNewsHtml(post.body_html) : ''
  const isOwner = user?.id === post.author_id
  const isAdmin = !!user?.profile?.is_admin
  const cat = getCategory(post.category)
  const extras = [...(cat?.fields ?? []), ...(cat?.contactFields ?? [])]
    .map((f) => ({ label: f.label, value: post.extra?.[f.key], suffix: f.suffix, wide: f.wide }))
    .filter((x) => x.value)

  return (
    <article className="md:px-4 md:pt-4">
      <ViewPing id={post.id} />
      <WechatShareImage src={post.images[0]?.url ?? (cat ? `/og/${post.category}.png` : '/og.png')} />

      {post.is_hidden && (
        <p className="bg-price/10 px-4 py-2 text-sm text-price">这条信息已被管理员隐藏，只有你和管理员能看到。</p>
      )}

      {/* 图文新闻的图片在文章里，不在顶部重复显示 */}
      {post.images.length > 0 && !richHtml && <Gallery images={post.images} />}

      <div className="relative bg-white px-4 py-4 md:rounded-b-xl md:border md:border-t-0 md:border-line">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Link href={`/c/${post.category}`} className="rounded px-1.5 py-0.5 text-white" style={{ background: cat?.color ?? '#8a93a0' }}>
            {cat?.name ?? '其他'}
          </Link>
          <Link href={`/c/${post.category}?sub=${encodeURIComponent(post.subcategory)}`} className="rounded bg-paper px-1.5 py-0.5 text-ink-soft">
            {post.subcategory}
          </Link>
          <span className="text-mute">{cityName(post.city)}</span>
        </div>

        <h1 className="mt-2 text-xl font-bold leading-snug">{post.title}</h1>

        {post.price && <p className="mt-2 text-2xl font-bold text-price">{formatPrice(post.price)}</p>}

        {post.status === 'done' && (
          <span className="stamp-done absolute right-6 top-6 px-3 py-1 text-lg">已完成</span>
        )}

        <p className="mt-2 text-xs text-mute">
          发布于 {timeAgo(post.created_at)}，{displayViews(post.view_count)} 次浏览
        </p>

        {extras.length > 0 && (
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-paper p-3 text-sm">
            {extras.map((x) => (
              <div key={x.label} className={`flex gap-2 ${x.wide ? 'col-span-2' : ''}`}>
                <dt className="shrink-0 text-mute">{x.label}</dt>
                <dd className="min-w-0 break-words">
                  {x.value}
                  {x.suffix && <span className="ml-0.5 text-mute">{x.suffix}</span>}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {richHtml ? (
          <div className="news-body mt-4 text-[16px] leading-8" dangerouslySetInnerHTML={{ __html: richHtml }} />
        ) : post.body && (
          <div className="mt-4 whitespace-pre-wrap break-words text-[15px] leading-7">{post.body}</div>
        )}

        {!getCategory(post.category)?.rich && <ContactBox postId={post.id} masked={masked} />}

        <div className="mt-5 flex items-center gap-3 border-t border-line pt-4">
          <Avatar name={post.author?.name ?? '用户'} url={post.author?.avatar_url ?? null} size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{post.author?.name ?? '用户'}</p>
            <p className="text-xs text-mute">发布者</p>
          </div>
          <ShareButton title={post.title} />
          {!isOwner && <ReportButton postId={post.id} loggedIn={!!user} />}
        </div>

        {(isOwner || isAdmin) && (
          <OwnerBar
            id={post.id}
            status={post.status}
            bumpedAt={post.bumped_at}
            isOwner={isOwner}
            isAdmin={isAdmin}
            isHidden={post.is_hidden}
            pinnedUntil={post.pinned_until}
          />
        )}

        <p className="mt-4 rounded-lg bg-paper px-3 py-2 text-xs leading-5 text-mute">
          交易时请当面验货，不要提前转账或支付定金。遇到可疑信息请点“举报”。
        </p>
      </div>

      <Comments postId={post.id} currentUserId={user?.id ?? null} isAdmin={isAdmin} />
    </article>
  )
}
