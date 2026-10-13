import type { Metadata, Viewport } from 'next'
import './globals.css'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import { getCurrentUser, getSelectedCity } from '@/lib/session'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: { default: '惠生活 · 德州华人同城信息', template: '%s - 惠生活' },
  description: '德州华人的同城信息平台：租房、招聘、二手、汽车、顺风车、本地服务，免费发布。',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#c8322a',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, city] = await Promise.all([getCurrentUser(), getSelectedCity()])
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">
        <Header
          city={city}
          user={user?.profile ? { name: user.profile.name, avatar_url: user.profile.avatar_url, is_admin: user.profile.is_admin } : null}
        />
        <main className="mx-auto max-w-3xl pb-24 md:pb-10">{children}</main>
        <BottomNav />
      </body>
    </html>
  )
}
