import CategoryGrid from '@/components/CategoryGrid'
import BannerCarousel from '@/components/BannerCarousel'
import HomeSections from '@/components/home/HomeSections'
import WechatShareImage from '@/components/WechatShareImage'
import { getSelectedCity } from '@/lib/session'
import { getHomeData, SECTIONS, type HomeData } from '@/lib/home'

// 首页整页缓存 60 秒，访客直接从 CDN 拿；发帖、管理员操作后马上刷新
export const revalidate = 60

export default async function HomePage() {
  const city = await getSelectedCity()

  let data: HomeData
  try {
    data = await getHomeData(city ?? '')
  } catch (e) {
    console.error('home', e)
    // 运行中出错就抛出：CDN 会继续用上一份正常的首页，不会把空首页缓存下来
    if (process.env.NEXT_PHASE !== 'phase-production-build') throw e
    data = { banners: [], sections: SECTIONS.map((code) => ({ code, posts: [] })) }
  }

  return (
    <div className="md:px-4">
      <WechatShareImage src="/og.png" />
      <BannerCarousel banners={data.banners} />
      <CategoryGrid />
      <div className="mt-2 md:mt-4">
        <HomeSections sections={data.sections} />
      </div>
    </div>
  )
}