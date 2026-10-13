// 显示"3 分钟前""2 天前"
export function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} 天前`
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 价格：用户只填数字时自动加 $
export function formatPrice(price?: string | null): string {
  if (!price) return ''
  const p = price.trim()
  if (/^\d+(\.\d+)?$/.test(p)) return `$${Number(p).toLocaleString('en-US')}`
  return p
}
