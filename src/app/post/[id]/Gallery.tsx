'use client'

import { useRef, useState } from 'react'
import type { PostImage } from '@/lib/types'

export default function Gallery({ images }: { images: PostImage[] }) {
  const [index, setIndex] = useState(0)
  const [zoom, setZoom] = useState<number | null>(null)
  const track = useRef<HTMLDivElement>(null)

  // 跳到第 i 张（左右箭头、缩略图都用这个）
  const go = (i: number) => {
    const el = track.current
    if (!el) return
    const next = (i + images.length) % images.length
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <>
      <div className="relative bg-ink md:overflow-hidden md:rounded-t-xl">
        <div
          ref={track}
          className="flex snap-x snap-mandatory overflow-x-auto"
          style={{ scrollbarWidth: 'none' }}
          onScroll={(e) => {
            const el = e.currentTarget
            setIndex(Math.round(el.scrollLeft / el.clientWidth))
          }}
        >
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setZoom(i)}
              className="aspect-[4/3] w-full shrink-0 snap-center"
              aria-label={`查看第 ${i + 1} 张大图`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-full w-full object-contain" loading={i === 0 ? 'eager' : 'lazy'} />
            </button>
          ))}
        </div>
        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="上一张"
              onClick={() => go(index - 1)}
              className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-2xl text-white hover:bg-black/65"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="下一张"
              onClick={() => go(index + 1)}
              className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-2xl text-white hover:bg-black/65"
            >
              ›
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2 py-0.5 text-xs text-white">
              {index + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {/* 缩略图：一眼看到所有照片，点哪张看哪张 */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto bg-white px-4 pt-3 md:border-x md:border-line" style={{ scrollbarWidth: 'none' }}>
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => go(i)}
              aria-label={`第 ${i + 1} 张`}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 ${i === index ? 'border-seal' : 'border-transparent opacity-70 hover:opacity-100'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.thumb || img.url} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {zoom !== null && (
        <div
          role="dialog"
          aria-label="查看大图"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={() => setZoom(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[zoom].url} alt="" className="max-h-full max-w-full object-contain" />
          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="上一张"
                className="absolute left-0 top-1/2 -translate-y-1/2 p-4 text-3xl text-white/80"
                onClick={(e) => {
                  e.stopPropagation()
                  setZoom((zoom - 1 + images.length) % images.length)
                }}
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="下一张"
                className="absolute right-0 top-1/2 -translate-y-1/2 p-4 text-3xl text-white/80"
                onClick={(e) => {
                  e.stopPropagation()
                  setZoom((zoom + 1) % images.length)
                }}
              >
                ›
              </button>
            </>
          )}
          <span className="absolute top-4 text-sm text-white/70">点击任意处关闭</span>
        </div>
      )}
    </>
  )
}
