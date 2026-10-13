'use client'

import { useState } from 'react'
import type { PostImage } from '@/lib/types'

export default function Gallery({ images }: { images: PostImage[] }) {
  const [index, setIndex] = useState(0)
  const [zoom, setZoom] = useState<number | null>(null)

  return (
    <>
      <div className="relative bg-ink md:overflow-hidden md:rounded-t-xl">
        <div
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
          <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2 py-0.5 text-xs text-white">
            {index + 1} / {images.length}
          </span>
        )}
      </div>

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
