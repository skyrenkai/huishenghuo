'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// 手机底部导航：首页 / 发布 / 我的
export default function BottomNav() {
  const path = usePathname()
  if (path.startsWith('/post/new') || path.includes('/edit')) return null

  const item = (href: string, label: string, active: boolean, icon: React.ReactNode) => (
    <Link
      href={href}
      className={`flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] ${active ? 'text-seal' : 'text-mute'}`}
    >
      {icon}
      {label}
    </Link>
  )

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white md:hidden">
      <div className="mx-auto flex max-w-md items-end">
        {item(
          '/',
          '首页',
          path === '/' || path.startsWith('/c/'),
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
          </svg>
        )}
        <Link href="/post/new" className="flex flex-1 flex-col items-center pb-1.5 text-[11px] text-ink">
          <span className="seal -mt-4 h-12 w-12 rounded-2xl text-2xl shadow-md shadow-seal/30">+</span>
          <span className="mt-0.5">发布</span>
        </Link>
        {item(
          '/me',
          '我的',
          path.startsWith('/me'),
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
          </svg>
        )}
      </div>
    </nav>
  )
}
