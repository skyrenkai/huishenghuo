import CategoryGrid from '@/components/CategoryGrid'
import BannerCarousel, { type Banner } from '@/components/BannerCarousel'
import HomeSections, { type SectionData } from '@/components/home/HomeSections'
import { createClient } from '@/lib/supabase/server'
import WechatShareImage from '@/components/WechatShareImage'
import { getSelectedCity } from '@/lib/session'
import { POST_LIST_FIELDS, type PostListItem } from '@/lib/types'

// 首页板块顺序（电脑上每排两个）：求职招聘|房屋租售，吃喝玩乐|本地新闻，本地服务|二手闲置，生意转让|优惠信息
// 其他板块（汽车、顺风车等）从上面的分类图标进入
const SECTIONS = ['job', 'house', 'fun', 'news', 'service', 'used', 'biz', 'deal']
// 每个板块显示几条：求职招聘、房屋租售多显示一些，其他 5 条
const PER_SECTION = 5
const SECTION_COUNT: Record<string, number> = { job: 8, house: 8 }
const countOf = (code: string) => SECTION_COUNT[code] ?? PER_SECTION

export default async function HomePage() {
  const city = await getSelectedCity()
  const supabase = await createClient()

  const now = new Date().toISOString()
  const base = (code: string) => {
    let q = supabase.from('posts').select(POST_LIST_FIELDS).eq('is_hidden', false).eq('is_approved', true).eq('category', code)
    if (city) q = q.eq('city', city)
    return q
  }
  // 每个板块：正在置顶的排最前面（到期自动不算），再接最新的
  const latest = (code: string) =>
    Promise.all([
      base(code).gt('pinned_until', now).order('pinned_until', { ascending: false }).limit(countOf(code)),
      base(code)
        .or(`pinned_until.is.null,pinned_until.lte.${now}`)
        .order('bumped_at', { ascending: false })
        .limit(countOf(code)),
    ])

  const codes = SECTIONS
  // 所有板块同时查询，不用排队等
  const [bannerRes, ...sectionRes] = await Promise.all([
    // 广告位：只取正在显示、没到期的（数据库规则也会过滤）
    supabase
      .from('banners')
      .select('id, image_url, link_url, title')
      .eq('is_active', true)
      .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
      .order('sort', { ascending: true })
      .order('id', { ascending: true })
      .limit(10),
    ...codes.map(latest),
  ])

  const sections: SectionData[] = codes.map((code, i) => {
    const [pin, rest] = sectionRes[i] as Awaited<ReturnType<typeof latest>>
    if (pin.error || rest.error) console.error('home section', code, (pin.error ?? rest.error)?.message)
    const posts = [...((pin.data ?? []) as PostListItem[]), ...((rest.data ?? []) as PostListItem[])]
    return { code, posts: posts.slice(0, countOf(code)) }
  })

  return (
    <div className="md:px-4">
      <WechatShareImage src="/og.png" />
      <BannerCarousel banners={(bannerRes.data ?? []) as Banner[]} />
      <CategoryGrid />
      <div className="mt-2 md:mt-4">
        <HomeSections sections={sections} />
      </div>
    </div>
  )
}
