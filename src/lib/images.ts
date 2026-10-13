'use client'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { PostImage } from './types'

const BUCKET = 'post-images'

// 把手机照片压缩成 JPEG：大图最长边 1280px（约 150–300 KB），缩略图 400px（约 20–40 KB）
async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    // 旧浏览器不支持 createImageBitmap 时退回 <img>
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      return img
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

function toJpeg(src: ImageBitmap | HTMLImageElement, maxSide: number, quality: number): Promise<Blob> {
  const w = 'naturalWidth' in src ? src.naturalWidth : src.width
  const h = 'naturalHeight' in src ? src.naturalHeight : src.height
  const scale = Math.min(1, maxSide / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff' // 透明 PNG 转 JPEG 时用白底
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('图片处理失败'))), 'image/jpeg', quality)
  )
}

export async function compressImage(file: File): Promise<{ full: Blob; thumb: Blob }> {
  if (!file.type.startsWith('image/')) throw new Error('只能上传图片')
  const bmp = await loadBitmap(file)
  const full = await toJpeg(bmp, 1280, 0.8)
  const thumb = await toJpeg(bmp, 400, 0.7)
  if ('close' in bmp) bmp.close()
  return { full, thumb }
}

export async function uploadImage(supabase: SupabaseClient, userId: string, file: File): Promise<PostImage> {
  const { full, thumb } = await compressImage(file)
  const base = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const opts = { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false }

  const [a, b] = await Promise.all([
    supabase.storage.from(BUCKET).upload(`${base}.jpg`, full, opts),
    supabase.storage.from(BUCKET).upload(`${base}-t.jpg`, thumb, opts),
  ])
  if (a.error || b.error) throw new Error('图片上传失败，请重试')

  return {
    url: supabase.storage.from(BUCKET).getPublicUrl(`${base}.jpg`).data.publicUrl,
    thumb: supabase.storage.from(BUCKET).getPublicUrl(`${base}-t.jpg`).data.publicUrl,
  }
}

// 从公开链接反推出存储路径，删除帖子时一起删图片
function pathFromUrl(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`
  const i = url.indexOf(marker)
  return i >= 0 ? decodeURIComponent(url.slice(i + marker.length)) : null
}

export async function deleteImages(supabase: SupabaseClient, images: PostImage[]) {
  const paths = images.flatMap((im) => [pathFromUrl(im.url), pathFromUrl(im.thumb)]).filter(Boolean) as string[]
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths)
}
