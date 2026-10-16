import CategoryGrid from '@/components/CategoryGrid'
import BannerCarousel from '@/components/BannerCarousel'
import HomeSections from '@/components/home/HomeSections'
import WechatShareImage from '@/components/WechatShareImage'
import { getSelectedCity } from '@/lib/session'
import { getHomeData, SECTIONS, type HomeData } from '@/lib/home'

export default async function HomePage() {
  const city = await getSelectedCity()

  let data: HomeData
  try {
    data = await getHomeData(city ?? '')
  } catch (e) {
    console.error('home', e)
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