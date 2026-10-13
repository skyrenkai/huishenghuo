'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES, CITIES, getCategory } from '@/lib/categories'
import { uploadImage, deleteImages } from '@/lib/images'
import RichEditor from './RichEditor'
import type { Post, PostContact, PostImage } from '@/lib/types'

const MAX_IMAGES = 9

type Props = {
  userId: string
  isAdmin: boolean
  defaultCity: string
  defaultCategory?: string
  initial?: Post
  initialContact?: PostContact | null
}

const inputCls =
  'h-11 w-full rounded-lg border border-line bg-white px-3 text-base outline-none focus:border-seal'

export default function PostForm({ userId, isAdmin, defaultCity, defaultCategory, initial, initialContact }: Props) {
  const router = useRouter()
  const editing = !!initial
  const fileRef = useRef<HTMLInputElement>(null)

  const [category, setCategory] = useState(initial?.category ?? (getCategory(defaultCategory) ? defaultCategory! : ''))
  const cat = getCategory(category)
  const [sub, setSub] = useState(initial?.subcategory ?? '')
  const [city, setCity] = useState(initial?.city ?? defaultCity)
  const [title, setTitle] = useState(initial?.title ?? '')
  const [price, setPrice] = useState(initial?.price ?? '')
  const [body, setBody] = useState(initial?.body ?? '')
  const [extra, setExtra] = useState<Record<string, string>>(initial?.extra ?? {})
  const [images, setImages] = useState<PostImage[]>(initial?.images ?? [])
  // 本地新闻用图文编辑器：内容是 HTML，图片在文章里，第一张做封面
  const [bodyHtml, setBodyHtml] = useState(initial?.body_html ?? '')
  const [richImages, setRichImages] = useState<PostImage[]>(initial?.images ?? [])
  const [richBusy, setRichBusy] = useState(false)
  const [uploading, setUploading] = useState(0)
  const [phone, setPhone] = useState(initialContact?.phone ?? '')
  const [wechat, setWechat] = useState(initialContact?.wechat ?? '')
  const [email, setEmail] = useState(initialContact?.email ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const categories = useMemo(() => CATEGORIES.filter((c) => !c.adminOnly || isAdmin), [isAdmin])

  // ---------- 第一步：选分类 ----------
  if (!cat) {
    return (
      <div className="bg-white px-4 py-5 md:mt-4 md:rounded-xl md:border md:border-line">
        <h1 className="text-lg font-bold">你要发布什么？</h1>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {categories.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => {
                setCategory(c.code)
                setSub('')
                setExtra({})
              }}
              className="flex items-center gap-3 rounded-xl border border-line p-3 text-left hover:border-seal"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white" style={{ background: c.color }} aria-hidden>
                {c.glyph}
              </span>
              <span>
                <span className="block font-medium">{c.name}</span>
                <span className="block text-xs text-mute">{c.subs.slice(0, 3).join('、')}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  async function onPickImages(files: FileList | null) {
    if (!files?.length) return
    setError('')
    const room = MAX_IMAGES - images.length - uploading
    const picked = Array.from(files).slice(0, Math.max(0, room))
    if (picked.length < files.length) setError(`最多 ${MAX_IMAGES} 张图片`)
    setUploading((n) => n + picked.length)
    const supabase = createClient()
    for (const f of picked) {
      try {
        const img = await uploadImage(supabase, userId, f)
        setImages((prev) => [...prev, img])
      } catch (e) {
        setError(e instanceof Error ? e.message : '图片上传失败')
      } finally {
        setUploading((n) => n - 1)
      }
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  function moveImage(i: number, dir: -1 | 1) {
    setImages((prev) => {
      const next = [...prev]
      const j = i + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!sub) return setError('请选择类型')
    if (!city) return setError('请选择城市')
    if (title.trim().length < 2) return setError('标题至少 2 个字')
    if (uploading > 0 || richBusy) return setError('图片还在上传，请稍等')
    const isNews = cat!.code === 'news'
    if (isNews && !body.trim() && !bodyHtml.trim()) return setError('请填写文章内容')
    const finalImages = isNews ? richImages.slice(0, 9) : images

    setSaving(true)
    const supabase = createClient()
    const cleanExtra = Object.fromEntries(
      Object.entries(extra)
        .map(([k, v]) => [k, String(v).trim()])
        .filter(([k, v]) => v && cat!.fields.some((f) => f.key === k))
    )
    const row = {
      city,
      category: cat!.code,
      subcategory: sub,
      title: title.trim(),
      body: body.trim().slice(0, 5000),
      body_html: isNews ? bodyHtml : null,
      price: cat!.priceLabel ? price.trim() || null : null,
      extra: cleanExtra,
      images: finalImages,
    }

    let postId = initial?.id
    if (editing) {
      const { error } = await supabase.from('posts').update(row).eq('id', postId!)
      if (error) return fail(error.message)
    } else {
      const { data, error } = await supabase
        .from('posts')
        .insert({ ...row, author_id: userId })
        .select('id')
        .single()
      if (error || !data) return fail(error?.message)
      postId = data.id
    }

    const contact = { phone: phone.trim() || null, wechat: wechat.trim() || null, email: email.trim() || null }
    const { error: cErr } = await supabase.from('post_contacts').upsert({ post_id: postId!, ...contact })
    if (cErr) console.error(cErr)

    // 编辑时删掉的图片，从存储里也删掉
    if (editing && initial) {
      const kept = new Set(finalImages.map((i) => i.url))
      const removed = initial.images.filter((i) => !kept.has(i.url))
      if (removed.length) await deleteImages(supabase, removed)
    }

    router.replace(`/post/${postId}`)
    router.refresh()
  }

  function fail(message?: string) {
    setSaving(false)
    if (message?.includes('太多')) setError('今天发布太多了，明天再来吧')
    else if (message?.includes('row-level security')) setError('你的账号暂时不能发布信息')
    else setError('保存失败：' + (message ?? '请重试'))
  }

  // ---------- 第二步：填写内容 ----------
  return (
    <form onSubmit={submit} className="space-y-2 md:mt-4 md:space-y-4">
      <section className="bg-white px-4 py-4 md:rounded-xl md:border md:border-line">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg text-base font-bold text-white" style={{ background: cat.color }} aria-hidden>
            {cat.glyph}
          </span>
          <h1 className="text-lg font-bold">
            {editing ? '编辑' : '发布'}
            {cat.name}
          </h1>
          {!editing && (
            <button type="button" onClick={() => setCategory('')} className="ml-auto text-sm text-mute">
              换分类
            </button>
          )}
        </div>

        <Label>类型</Label>
        <div className="flex flex-wrap gap-2">
          {cat.subs.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSub(s)}
              className={`rounded-full px-3 py-1.5 text-sm ${sub === s ? 'bg-seal text-white' : 'bg-paper text-ink-soft'}`}
              aria-pressed={sub === s}
            >
              {s}
            </button>
          ))}
        </div>

        <Label htmlFor="city">城市</Label>
        <select id="city" value={city} onChange={(e) => setCity(e.target.value)} className={inputCls}>
          <option value="">请选择</option>
          {CITIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>

        <Label htmlFor="title">标题</Label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={60}
          placeholder="一句话说清楚，例如：Plano 2 室 1 厅出租，近 Legacy West（城市选达拉斯）"
          className={inputCls}
        />

        {cat.priceLabel && (
          <>
            <Label htmlFor="price">{cat.priceLabel}</Label>
            <input
              id="price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              maxLength={40}
              placeholder="只填数字会自动加 $，也可以写“面议”“$1500/月”"
              className={inputCls}
            />
          </>
        )}
      </section>

      {cat.fields.length > 0 && (
        <section className="grid grid-cols-1 gap-x-4 bg-white px-4 pb-4 sm:grid-cols-2 md:rounded-xl md:border md:border-line">
          {cat.fields.map((f) => (
            <div key={f.key}>
              <Label htmlFor={`f-${f.key}`}>
                {f.label}
                {f.suffix && <span className="ml-1 text-mute">（{f.suffix}）</span>}
              </Label>
              {f.type === 'select' ? (
                <select
                  id={`f-${f.key}`}
                  value={extra[f.key] ?? ''}
                  onChange={(e) => setExtra({ ...extra, [f.key]: e.target.value })}
                  className={inputCls}
                >
                  <option value="">不填</option>
                  {f.options!.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input
                  id={`f-${f.key}`}
                  type={f.type === 'number' ? 'number' : 'text'}
                  inputMode={f.type === 'number' ? 'numeric' : undefined}
                  value={extra[f.key] ?? ''}
                  onChange={(e) => setExtra({ ...extra, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  maxLength={60}
                  className={inputCls}
                />
              )}
            </div>
          ))}
        </section>
      )}

      {cat.code === 'news' ? (
        <section className="bg-white px-4 pb-4 md:rounded-xl md:border md:border-line">
          <Label>文章内容</Label>
          <RichEditor
            userId={userId}
            initialHtml={bodyHtml || (body ? body.replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[m]!).replace(/\n/g, '<br>') : '')}
            onBusy={setRichBusy}
            onChange={(html, text, imgs) => {
              setBodyHtml(html)
              setBody(text)
              setRichImages(imgs)
            }}
          />
          <p className="mt-2 text-xs leading-5 text-mute">
            可以从公众号文章直接复制粘贴，图片会自动转存到本站。文章里的第一张图片会作为列表封面和分享图。
          </p>
        </section>
      ) : (
      <section className="bg-white px-4 pb-4 md:rounded-xl md:border md:border-line">
        <Label htmlFor="body">详细描述</Label>
        <textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={5000}
          rows={6}
          placeholder="写清楚情况、要求、注意事项，信息越完整越容易成交"
          className="w-full rounded-lg border border-line p-3 text-base leading-7 outline-none focus:border-seal"
        />
        <p className="mt-1 text-right text-xs text-mute">{body.length} / 5000</p>

        <Label>
          图片 <span className="text-mute">（最多 {MAX_IMAGES} 张，第一张是封面，会自动压缩）</span>
        </Label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {images.map((img, i) => (
            <div key={img.url} className="relative aspect-square overflow-hidden rounded-lg bg-paper">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.thumb} alt="" className="h-full w-full object-cover" />
              {i === 0 && <span className="absolute left-1 top-1 rounded bg-seal px-1 text-[10px] text-white">封面</span>}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/45 text-white">
                <button type="button" aria-label="往前移" disabled={i === 0} onClick={() => moveImage(i, -1)} className="px-2 py-0.5 disabled:opacity-30">‹</button>
                <button
                  type="button"
                  aria-label="删除这张"
                  onClick={() => setImages(images.filter((_, j) => j !== i))}
                  className="px-2 py-0.5 text-xs"
                >
                  删除
                </button>
                <button type="button" aria-label="往后移" disabled={i === images.length - 1} onClick={() => moveImage(i, 1)} className="px-2 py-0.5 disabled:opacity-30">›</button>
              </div>
            </div>
          ))}
          {Array.from({ length: uploading }).map((_, i) => (
            <div key={`up-${i}`} className="flex aspect-square animate-pulse items-center justify-center rounded-lg bg-paper text-xs text-mute">
              上传中
            </div>
          ))}
          {images.length + uploading < MAX_IMAGES && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-dashed border-line text-mute hover:border-seal hover:text-seal"
            >
              <span className="text-3xl leading-none">+</span>
              <span className="mt-1 text-xs">添加图片</span>
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => onPickImages(e.target.files)} />
      </section>
      )}

      {cat.code !== 'news' && (
      <section className="bg-white px-4 pb-4 md:rounded-xl md:border md:border-line">
        <Label>联系方式 <span className="text-mute">（所有人可见，至少留一种方便别人联系你）</span></Label>
        <div className="grid gap-2 sm:grid-cols-3">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} inputMode="tel" placeholder="电话" className={inputCls} aria-label="电话" />
          <input value={wechat} onChange={(e) => setWechat(e.target.value)} maxLength={40} placeholder="微信号" className={inputCls} aria-label="微信号" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} maxLength={80} type="email" placeholder="邮箱" className={inputCls} aria-label="邮箱" />
        </div>
      </section>
      )}

      <div className="safe-bottom sticky bottom-0 z-10 border-t border-line bg-white px-4 py-3 md:static md:rounded-xl md:border">
        {error && <p className="mb-2 text-sm text-price" role="alert">{error}</p>}
        <button
          type="submit"
          disabled={saving || uploading > 0 || richBusy}
          className="h-12 w-full rounded-xl bg-seal text-base font-semibold text-white hover:bg-seal-dark disabled:opacity-60"
        >
          {saving ? '正在保存…' : uploading > 0 || richBusy ? '图片上传中…' : editing ? '保存修改' : '发布'}
        </button>
      </div>
    </form>
  )
}

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 mt-4 block text-sm font-medium text-ink-soft">
      {children}
    </label>
  )
}
