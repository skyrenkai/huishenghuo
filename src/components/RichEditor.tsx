'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uploadImage } from '@/lib/images'
import type { PostImage } from '@/lib/types'

type Props = {
  userId: string
  initialHtml: string
  // html：编辑器内容；images：编辑器里已经转存到本站的图片（第一张会作为封面）
  onChange: (html: string, text: string, images: PostImage[]) => void
  // 图片还在转存时为 true，表单据此禁止提交
  onBusy: (busy: boolean) => void
}

const OUR_STORAGE = '/storage/v1/object/public/post-images/'

// 图文编辑器：可以直接从公众号文章复制粘贴，保留排版；文章里的图片会自动转存到本站
export default function RichEditor({ userId, initialHtml, onChange, onBusy }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const thumbs = useRef(new Map<string, string>()) // 大图地址 → 缩略图地址
  const [pending, setPending] = useState(0)
  const [failed, setFailed] = useState(0)

  useEffect(() => {
    onBusy(pending > 0)
  }, [pending, onBusy])

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = initialHtml
    // 只在第一次加载时设置内容，之后由用户编辑
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function emit() {
    const el = ref.current
    if (!el) return
    const images: PostImage[] = Array.from(el.querySelectorAll('img'))
      .map((img) => img.getAttribute('src') || '')
      .filter((src) => src.includes(OUR_STORAGE))
      .map((url) => ({ url, thumb: thumbs.current.get(url) ?? url }))
    onChange(el.innerHTML, el.innerText.trim(), images)
  }

  // 把编辑器里还不在本站的图片（微信图片、截图粘贴的图片）下载下来，压缩后上传到本站
  // 清理粘贴进来的内容：去掉脚本、点击事件、会"飘"出编辑框的样式（发布后服务器还会再过滤一次）
  function cleanPasted(el: HTMLElement) {
    el.querySelectorAll('script, style, iframe, object, embed, form, input, button, link, meta, video, audio, mpvoice, mpprofile').forEach((n) => n.remove())
    el.querySelectorAll<HTMLElement>('*').forEach((n) => {
      for (const attr of Array.from(n.attributes)) {
        if (attr.name.startsWith('on') || attr.name === 'class' || attr.name === 'id') n.removeAttribute(attr.name)
      }
      for (const prop of ['position', 'z-index', 'top', 'left', 'right', 'bottom', 'transform', 'float']) {
        n.style.removeProperty(prop)
      }
    })
  }

  async function importImages() {
    const el = ref.current
    if (!el) return
    cleanPasted(el)
    const imgs = Array.from(el.querySelectorAll('img')).filter((img) => {
      // 公众号文章的图片是"懒加载"的：没滚动到的图片，真正的地址在 data-src 里，src 只是占位图
      const lazy = img.getAttribute('data-src') || ''
      const cur = img.getAttribute('src') || ''
      if (/^https?:/.test(lazy) && (!cur || cur.startsWith('data:image/svg') || cur.startsWith('data:image/gif'))) {
        img.setAttribute('src', lazy)
      }
      const src = img.getAttribute('src') || ''
      return src && !src.includes(OUR_STORAGE) && !img.dataset.importing
    })
    if (imgs.length === 0) return emit()

    const supabase = createClient()
    setPending((n) => n + imgs.length)
    await Promise.all(
      imgs.map(async (img) => {
        img.dataset.importing = '1'
        img.style.opacity = '0.4'
        const src = img.getAttribute('src')!
        try {
          const res = src.startsWith('data:') || src.startsWith('blob:')
            ? await fetch(src)
            : await fetch(`/api/fetch-image?url=${encodeURIComponent(src)}`)
          if (!res.ok) throw new Error()
          const blob = await res.blob()
          const file = new File([blob], 'image', { type: blob.type || 'image/jpeg' })
          const uploaded = await uploadImage(supabase, userId, file)
          thumbs.current.set(uploaded.url, uploaded.thumb)
          img.setAttribute('src', uploaded.url)
          img.removeAttribute('data-src')
          img.removeAttribute('srcset')
          img.style.opacity = ''
        } catch {
          img.style.opacity = ''
          img.style.outline = '3px solid #d1432b'
          img.setAttribute('alt', '这张图片转存失败，请删除后用"插入图片"重新上传')
          setFailed((n) => n + 1)
        } finally {
          delete img.dataset.importing
          setPending((n) => n - 1)
        }
      })
    )
    emit()
  }

  async function insertFiles(files: FileList | null) {
    if (!files?.length) return
    const supabase = createClient()
    ref.current?.focus()
    setPending((n) => n + files.length)
    for (const f of Array.from(files)) {
      try {
        const up = await uploadImage(supabase, userId, f)
        thumbs.current.set(up.url, up.thumb)
        document.execCommand('insertHTML', false, `<p><img src="${up.url}" alt=""></p>`)
      } catch {
        setFailed((n) => n + 1)
      } finally {
        setPending((n) => n - 1)
      }
    }
    if (fileRef.current) fileRef.current.value = ''
    emit()
  }

  function cmd(name: string, value?: string) {
    ref.current?.focus()
    document.execCommand(name, false, value)
    emit()
  }

  const btn = 'rounded-md px-2.5 py-1 text-sm text-ink-soft hover:bg-paper'

  return (
    <div className="rounded-lg border border-line focus-within:border-seal">
      <div className="flex flex-wrap items-center gap-1 border-b border-line bg-[#fafafa] px-2 py-1.5">
        <button type="button" className={`${btn} font-bold`} onMouseDown={(e) => e.preventDefault()} onClick={() => cmd('bold')}>粗体</button>
        <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={() => cmd('formatBlock', 'h3')}>小标题</button>
        <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={() => cmd('formatBlock', 'p')}>正文</button>
        <button type="button" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={() => cmd('removeFormat')}>清除格式</button>
        <button type="button" className={`${btn} text-seal`} onClick={() => fileRef.current?.click()}>插入图片</button>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => insertFiles(e.target.files)} />
      </div>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onPaste={() => setTimeout(importImages, 50)}
        onDrop={() => setTimeout(importImages, 50)}
        className="news-body min-h-72 px-3 py-3 text-[15px] leading-7 outline-none"
        data-placeholder="从公众号文章全选复制（Ctrl+A、Ctrl+C），在这里粘贴（Ctrl+V），文字格式和图片都会保留"
      />

      {(pending > 0 || failed > 0) && (
        <p className="border-t border-line px-3 py-2 text-xs" role="status">
          {pending > 0 && <span className="text-seal">正在转存图片，还剩 {pending} 张，请稍等…</span>}
          {pending === 0 && failed > 0 && (
            <span className="text-price">有 {failed} 张图片转存失败（红框标出），请删除后用“插入图片”重新上传</span>
          )}
        </p>
      )}
    </div>
  )
}

