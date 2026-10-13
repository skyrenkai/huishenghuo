'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type Banner = { id: number; image_url: string; link_url: string | null; title: string | null }

const INTERVAL = 4000

// 首页滚动广告：自动轮播，手机可左右滑动，电脑可点两边箭头
export default function BannerCarousel({ banners }: { banners: Banner[] }) {
  const track = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const paused = useRef(false)
  const count = banners.length

  const go = useCallback((i: number) => {
    const el = track.current
    if (!el) return
    const next = (i + count) % count
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
  }, [count])

  useEffect(() => {
    if (count < 2) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const t = setInterval(() => {
      if (!paused.current && document.visibilityState === 'visible') go(index + 1)
    }, INTERVAL)
    return () => clearInterval(t)
  }, [index, count, go])

  if (count === 0) return null

  return (
    <section
      aria-label="广告"
      className="relative overflow-hidden bg-white md:mt-4 md:rounded-xl md:border md:border-line"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      onTouchStart={() => (paused.current = true)}
      onTouchEnd={() => setTimeout(() => (paused.current = false), 3000)}
    >
      <div
        ref={track}
        className="flex snap-x snap-mandatory overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}
        onScroll={(e) => {
          const el = e.currentTarget
          const i = Math.round(el.scrollLeft / el.clientWidth)
          if (i !== index) setIndex(i)
        }}
      >
        {banners.map((b, i) => {
          const img = (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={b.image_url}
              alt={b.title ?? ''}
              className="h-full w-full object-cover"
              loading={i === 0 ? 'eager' : 'lazy'}
              draggable={false}
            />
          )
          return (
            <div key={b.id} className="aspect-[3/1] w-full shrink-0 snap-center">
              {b.link_url ? (
                <a
                  href={b.link_url}
                  target={b.link_url.startsWith('/') ? undefined : '_blank'}
                  rel={b.link_url.startsWith('/') ? undefined : 'noopener noreferrer'}
                  className="block h-full w-full"
                >
                  {img}
                </a>
              ) : (
                img
              )}
            </div>
          )
        })}
      </div>

      {count > 1 && (
        <>
          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                aria-label={`第 ${i + 1} 张`}
                onClick={() => go(i)}
                className={`h-1.5 rounded-full transition-all ${i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="上一张"
            onClick={() => go(index - 1)}
            className="absolute left-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-xl text-white hover:bg-black/50 md:flex"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="下一张"
            onClick={() => go(index + 1)}
            className="absolute right-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-xl text-white hover:bg-black/50 md:flex"
          >
            ›
          </button>
        </>
      )}
    </section>
  )
}
