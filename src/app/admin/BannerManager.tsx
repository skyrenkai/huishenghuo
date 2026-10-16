'use client'

import { refreshPublicCache } from '@/app/actions/revalidate'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadBanner } from '@/lib/images'

export type AdminBanner = {
  id: number
  image_url: string
  link_url: string | null
  title: string | null
  sort: number
  is_active: boolean
  ends_at: string | null
}

const inputCls = 'h-9 w-full rounded-lg border border-line px-2 text-sm outline-none focus:border-seal'

// 管理后台：首页广告图的添加、排序、上下架、删除
export default function BannerManager({ userId, banners }: { userId: string; banners: AdminBanner[] }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function add(files: FileList | null) {
    const f = files?.[0]
    if (!f) return
    setError('')
    setUploading(true)
    try {
      const supabase = createClient()
      const url = await uploadBanner(supabase, userId, f)
      const maxSort = banners.reduce((m, b) => Math.max(m, b.sort), 0)
      const { error } = await supabase.from('banners').insert({ image_url: url, sort: maxSort + 10 })
      if (error) throw new Error(error.message)
      refreshPublicCache().then(() => router.refresh())
    } catch (e) {
      setError(e instanceof Error ? e.message : '上传失败')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="px-4 py-4">
      <p className="text-sm text-ink-soft">
        首页顶部的滚动广告。建议图片比例 <b>3:1</b>（例如 1500×500），会自动压缩。可以设置点击后打开的链接和到期日期。
      </p>
      <button
        type="button"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
        className="mt-3 h-10 rounded-lg bg-seal px-4 text-sm font-medium text-white disabled:opacity-60"
      >
        {uploading ? '上传中…' : '+ 添加广告图'}
      </button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => add(e.target.files)} />
      {error && <p className="mt-2 text-sm text-price">{error}</p>}

      <div className="mt-4 space-y-4">
        {banners.length === 0 && <p className="py-8 text-center text-sm text-mute">还没有广告图</p>}
        {banners.map((b, i) => (
          <BannerRow key={b.id} banner={b} prev={banners[i - 1]} next={banners[i + 1]} />
        ))}
      </div>
    </div>
  )
}

function BannerRow({ banner, prev, next }: { banner: AdminBanner; prev?: AdminBanner; next?: AdminBanner }) {
  const router = useRouter()
  const [title, setTitle] = useState(banner.title ?? '')
  const [link, setLink] = useState(banner.link_url ?? '')
  const [ends, setEnds] = useState(banner.ends_at ? banner.ends_at.slice(0, 10) : '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const expired = !!banner.ends_at && new Date(banner.ends_at).getTime() < Date.now()

  async function update(fields: Partial<AdminBanner>, ok = '已保存') {
    setBusy(true)
    setMsg('')
    const { error } = await createClient().from('banners').update(fields).eq('id', banner.id)
    setBusy(false)
    setMsg(error ? '失败：' + error.message : ok)
    if (!error) refreshPublicCache().then(() => router.refresh())
  }

  async function swap(other?: AdminBanner) {
    if (!other) return
    setBusy(true)
    const supabase = createClient()
    await supabase.from('banners').update({ sort: other.sort }).eq('id', banner.id)
    await supabase.from('banners').update({ sort: banner.sort }).eq('id', other.id)
    setBusy(false)
    refreshPublicCache().then(() => router.refresh())
  }

  async function remove() {
    if (!confirm('删除这张广告图？')) return
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('banners').delete().eq('id', banner.id)
    const marker = '/object/public/post-images/'
    const i = banner.image_url.indexOf(marker)
    if (!error && i >= 0) {
      await supabase.storage.from('post-images').remove([decodeURIComponent(banner.image_url.slice(i + marker.length))])
    }
    setBusy(false)
    if (error) setMsg('删除失败：' + error.message)
    else refreshPublicCache().then(() => router.refresh())
  }

  function save() {
    const l = link.trim()
    if (l && !/^(https?:\/\/|\/)/.test(l)) return setMsg('链接要以 https:// 或 / 开头')
    update({
      title: title.trim() || null,
      link_url: l || null,
      ends_at: ends ? new Date(`${ends}T23:59:59`).toISOString() : null,
    })
  }

  const showing = banner.is_active && !expired

  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <div className="relative aspect-[3/1] bg-paper">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={banner.image_url} alt="" className={`h-full w-full object-cover ${showing ? '' : 'opacity-40'}`} />
        <span
          className={`absolute left-2 top-2 rounded px-1.5 py-0.5 text-xs text-white ${showing ? 'bg-jade' : 'bg-ink/70'}`}
        >
          {showing ? '显示中' : expired ? '已到期' : '已下架'}
        </span>
      </div>
      <div className="grid gap-2 p-3 sm:grid-cols-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="说明（可不填，例如：XX餐厅开业）" className={inputCls} aria-label="说明" />
        <input value={link} onChange={(e) => setLink(e.target.value)} maxLength={500} placeholder="点击后打开的链接（可不填）" className={inputCls} aria-label="链接" />
        <label className="flex items-center gap-2 text-sm text-mute">
          到期
          <input type="date" value={ends} onChange={(e) => setEnds(e.target.value)} className={inputCls} aria-label="到期日期" />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2">
        <button type="button" disabled={busy} onClick={save} className="rounded-full bg-seal px-3 py-1 text-sm text-white disabled:opacity-50">
          保存
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => update({ is_active: !banner.is_active }, banner.is_active ? '已下架' : '已上架')}
          className="rounded-full border border-line px-3 py-1 text-sm text-ink-soft disabled:opacity-50"
        >
          {banner.is_active ? '下架' : '上架'}
        </button>
        <button type="button" disabled={busy || !prev} onClick={() => swap(prev)} className="rounded-full border border-line px-3 py-1 text-sm text-ink-soft disabled:opacity-30">
          前移
        </button>
        <button type="button" disabled={busy || !next} onClick={() => swap(next)} className="rounded-full border border-line px-3 py-1 text-sm text-ink-soft disabled:opacity-30">
          后移
        </button>
        <button type="button" disabled={busy} onClick={remove} className="ml-auto rounded-full border border-price/40 px-3 py-1 text-sm text-price disabled:opacity-50">
          删除
        </button>
        {msg && <span className="w-full text-xs text-ink-soft" role="status">{msg}</span>}
      </div>
    </div>
  )
}
