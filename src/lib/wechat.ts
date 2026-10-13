// 微信用户没有邮箱，Supabase 又必须有邮箱，所以给每个微信用户生成一个内部邮箱。
// 这个邮箱不会收信，只是账号标识。页面上显示邮箱时，用 displayEmail() 把它隐藏掉。
export const WECHAT_EMAIL_DOMAIN = 'wechat.huishenghuo.com'

export function displayEmail(email?: string | null): string {
  if (!email || email.endsWith(`@${WECHAT_EMAIL_DOMAIN}`)) return ''
  return email
}
