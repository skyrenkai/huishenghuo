import NextLink from 'next/link'
import type { ComponentProps } from 'react'

// 全站统一用这个 Link：默认不预加载。
// Next.js 默认会把屏幕上看得到的每个链接都提前向服务器请求一次，
// 首页链接很多，会白白消耗 Vercel 的服务器运算额度。点了再加载，速度差别很小。
export default function Link({ prefetch = false, ...props }: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={prefetch} {...props} />
}
