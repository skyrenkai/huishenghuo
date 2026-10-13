// 把 Supabase 的英文报错翻成中文
export function authErrorZh(message?: string): string {
  if (!message) return '出错了，请重试'
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return '邮箱或密码错误'
  if (m.includes('email not confirmed')) return '邮箱还没验证，请先输入邮件里的验证码'
  if (m.includes('user already registered') || m.includes('already been registered'))
    return '这个邮箱已经注册过了，请直接登录'
  if (m.includes('password should be at least')) return '密码至少 8 位'
  if (m.includes('weak password') || m.includes('password is known to be weak'))
    return '密码太简单，请换一个'
  if (m.includes('token has expired') || m.includes('otp_expired')) return '验证码已过期，请重新发送'
  if (m.includes('invalid') && m.includes('token')) return '验证码不正确'
  if (m.includes('rate limit') || m.includes('too many') || m.includes('security purposes'))
    return '操作太频繁，请稍等一分钟再试'
  if (m.includes('unable to validate email') || m.includes('invalid format'))
    return '邮箱格式不正确'
  return '出错了：' + message
}
