import type { Metadata } from 'next'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/public'
import { getCategory, cityName } from '@/lib/categories'
import { formatPrice } from '@/lib/format'
import type { Post, PostContact } from '@/lib/types'
import PostView, { type Bundle } from './PostView'
import PrivateRedirect from './PrivateRedirect'

type Params = Promise<{ id: string }>

// 帖子页整页缓存：第一次有人打开时生成，之后 60 秒内所有访客直接从 CDN 拿，
// 不用 Vercel 服务器现场生成；作者修改、管理员操作后会马上刷新。
export const revalidate = 60
export function generateStaticParams() {
  return []
}

// 只查公开的帖子（已审核、没隐藏）
const getPublicPost = unstable_cache(
  async (id: number): Promise<Bundle | null> => {
    const supabase = createPublicClient()
    const [postRes, contactRes] = await Promise.all([
      supabase.from('posts').select('*, author:profiles(name, avatar_url)').eq('id', id).maybeSingle(),
      supabase.from('post_contacts').select('*').eq('post_id', id).maybeSingle(),
    ])
    if (postRes.error) throw new Error(postRes.error.message)
    if (!postRes.data) return null
    return { post: postRes.data as Post, contact: (contactRes.data as PostContact) ?? null }
  },
  ['post-v1'],
  { revalidate: 60, tags: ['posts'] }
)

const getPost = cache(async (id: number) => (Number.isFinite(id) ? getPublicPost(id) : null))

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const post = (await getPost(Number((await params).id)))?.post
  if (!post) return { title: '信息', robots: { index: false } }
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
  const id = Number((await params).id)
  const bundle = await getPost(id)
  // 公开查不到：可能是待审核/已隐藏（只有作者和管理员能看），也可能已删除。
  // 交给不走缓存的页面按登录身份再查一次。
  if (!bundle) return <PrivateRedirect id={id} />
  return <PostView bundle={bundle} />
}
