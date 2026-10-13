// 只允许站内跳转，防止 ?next=https://坏网站 这种开放重定向攻击
export function safeNext(value: string | null | undefined): string {
  if (!value) return '/'
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/'
  return value
}
