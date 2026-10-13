// 联系方式打码：页面上先显示 205****666，点击后再去数据库取完整号码（防爬虫抓号）

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 7) return '*'.repeat(Math.max(digits.length, 4))
  const d = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
  return `${d.slice(0, 3)}****${d.slice(-3)}`
}

export function maskWechat(id: string): string {
  if (id.length <= 3) return `${id[0] ?? ''}***`
  return `${id.slice(0, 2)}***${id.slice(-2)}`
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split('@')
  if (!domain) return '***'
  return `${user.slice(0, 1)}***@${domain}`
}
