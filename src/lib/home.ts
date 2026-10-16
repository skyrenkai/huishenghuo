import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/public'
import { LIST_CACHE_SECONDS } from '@/lib/feed'
import { POST_LIST_FIELDS, type PostListItem } from '@/lib/types'
import type { Banner } from '@/components/BannerCarousel'

// 首页板块顺序（电脑上每排两个）：求职招聘|房屋租售，吃喝玩乐|本地新闻，本地服务|二手闲置，生意转让|优惠信息
// 其他板块（汽车、顺风车等）从上面的分类图标进入
export const SECTIONS = ['job', 'house', 'fun', 'news', 'service', 'used', 'biz', 'deal']
// 每个板块显示几条：求职招聘、房屋租售多显示一些，其他 5 条
const PER_SECTION = 5
const SECTION_COUNT: Record<string, number> = { job: 8, house: 8 }
const countOf = (code: string) => SECTION_COUNT[code] ?? PER_SECTION

export type HomeData = { banners: Banner[]; sections: { code: string; posts: PostListItem[] }[] }

// 首页所有数据一起缓存：60 秒内所有访客共用一份，不重复查数据库。
// 缓存过期后，先给访客看旧的，同时在后台更新；数据库临时连不上时也能继续显示旧内容。
export const getHomeData = unstable_cache(
  async (city: string): Promise<HomeData> => {
    const supabase = createPublicClient()
    const now = new Date().toISOString()
    const base = (code: string) => {
      let q = supabase.from('posts').select(POST_LIST_FIELDS).eq('is_hidden', false).eq('is_approved', true).eq('category', code)
      if (city) q = q.eq('city', city)
      return q
    }

    const [bannerRes, ...sectionRes] = await Promise.all([
      // 广告位：只取正在显示、没到期的
      supabase
        .from('banners')
        .select('id, image_url, link_url, title')
        .eq('is_active', true)
        .or(`ends_at.is.null,ends_at.gt.${now}`)
        .order('sort', { ascending: true })
        .order('id', { ascending: true })
        .limit(10),
      // 每个板块：正在置顶的排最前面（到期自动不算），再接最新的
      ...SECTIONS.flatMap((code) => [
        base(code).gt('pinned_until', now).order('pinned_until', { ascending: false }).limit(countOf(code)),
        base(code)
          .or(`pinned_until.is.null,pinned_until.lte.${now}`)
          .order('bumped_at', { ascending: false })
          .limit(countOf(code)),
      ]),
    ])

    // 有任何一个查询出错就不缓存这次结果
    const failed = [bannerRes, ...sectionRes].find((r) => r.error)
    if (failed?.error) throw new Error(failed.error.message)

    return {
      banners: (bannerRes.data ?? []) as Banner[],
      sections: SECTIONS.map((code, i) => {
        const pin = (sectionRes[i * 2].data ?? []) as PostListItem[]
        const rest = (sectionRes[i * 2 + 1].data ?? []) as PostListItem[]
        return { code, posts: [...pin, ...rest].slice(0, countOf(code)) }
      }),
    }
  },
  ['home-v1'],
  { revalidate: LIST_CACHE_SECONDS, tags: ['posts', 'banners'] }
)
