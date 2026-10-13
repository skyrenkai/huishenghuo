'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CITIES, cityName } from '@/lib/categories'

export default function CityPicker({ current }: { current: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  function choose(code: string) {
    document.cookie = `city=${code}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    setOpen(false)
    router.refresh()
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1 rounded-full border border-line px-3 py-1 text-sm text-ink-soft"
      >
        {current ? cityName(current) : '全部城市'}
        <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-40 mt-2 w-64 rounded-xl border border-line bg-white p-3 shadow-lg">
            <p className="mb-2 text-xs text-mute">选择城市，只看这个城市的信息</p>
            <div className="grid grid-cols-2 gap-2">
              <CityChip active={!current} onClick={() => choose('')}>全部城市</CityChip>
              {CITIES.map((c) => (
                <CityChip key={c.code} active={current === c.code} onClick={() => choose(c.code)}>
                  {c.name.split(' ')[0]}
                </CityChip>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function CityChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2 py-1.5 text-sm ${
        active ? 'bg-seal text-white' : 'bg-paper text-ink-soft'
      }`}
    >
      {children}
    </button>
  )
}
