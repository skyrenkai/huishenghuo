// 置顶：pinned_until 在未来 = 正在置顶；为空或已过期 = 不置顶（到期自动失效，不需要定时任务）

export const PIN_OPTIONS = [
  { label: '1 周', days: 7 },
  { label: '1 个月', months: 1 },
  { label: '2 个月', months: 2 },
  { label: '3 个月', months: 3 },
] as const

export function isPinned(pinnedUntil?: string | null): boolean {
  return !!pinnedUntil && new Date(pinnedUntil).getTime() > Date.now()
}

export function pinEndDate(opt: (typeof PIN_OPTIONS)[number], from = new Date()): Date {
  const d = new Date(from)
  if ('days' in opt) d.setDate(d.getDate() + opt.days)
  else d.setMonth(d.getMonth() + opt.months)
  return d
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
