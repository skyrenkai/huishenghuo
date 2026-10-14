import CategoryGrid from '@/components/CategoryGrid'
import BannerCarousel, { type Banner } from '@/components/BannerCarousel'
import HomeSections, { type SectionData } from '@/components/home/HomeSections'
import { createClient } from '@/lib/supabase/server'
import WechatShareImage from '@/components/WechatShareImage'
import { getSelectedCity } from '@/lib/session'
import { POST_LIST_FIELDS, type PostListItem } from '@/lib/types'

// 首页板块顺序（电脑上每排两个）：吃喝玩乐|本地新闻，求职招聘|房屋租售，本地服务|二手闲置，生意转让|优惠信息
// 其他板块（汽车、顺风车等）从上面的分类图标进入
const SECTIONS = ['fun', 'news', 'job', 'house', 'service', 'used', 'biz', 'deal']
const PER_SECTION = 5

export default async function HomePage() {
  const city = await getSelectedCity()
  const supabase = await createClient()

  const latest = (code: string) => {
    let q = supabase.from('posts').select(POST_LIST_FIELDS).eq('is_hidden', false).eq('category', code)
    if (city) q = q.eq('city', city)
    return q.order('bumped_at', { ascending: false }).limit(PER_SECTION)
  }

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
    const r = sectionRes[i]
    if (r.error) console.error('home section', code, r.error.message)
    return { code, posts: (r.data ?? []) as PostListItem[] }
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
