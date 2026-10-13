import Link from 'next/link'
import CityPicker from './CityPicker'

type Props = {
  city: string
  user: { name: string; avatar_url: string | null; is_admin: boolean } | null
}

export default function Header({ city, user }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2" aria-label="惠生活首页">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={36} height={36} className="h-9 w-9" />
          <span className="text-lg font-bold tracking-wide">惠生活</span>
        </Link>

        <CityPicker current={city} />

        <div className="ml-auto flex items-center gap-2">
          <Link href="/search" aria-label="搜索" className="rounded-full p-2 text-ink-soft hover:bg-paper">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </Link>

          {/* 电脑上显示在顶部，手机上用底部导航 */}
          <Link
            href="/post/new"
            className="hidden rounded-full bg-seal px-4 py-1.5 text-sm font-medium text-white hover:bg-seal-dark md:block"
          >
            发布信息
          </Link>
          {user ? (
            <Link href="/me" className="hidden items-center gap-2 md:flex">
              <Avatar name={user.name} url={user.avatar_url} />
            </Link>
          ) : (
            <Link href="/login" className="hidden text-sm text-ink-soft md:block">
              登录
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

export function Avatar({ name, url, size = 32 }: { name: string; url: string | null; size?: number }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />
  }
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-seal-soft font-medium text-seal"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
      aria-hidden
    >
      {name.slice(0, 1)}
    </span>
  )
}
