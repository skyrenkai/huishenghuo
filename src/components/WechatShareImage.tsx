// 微信朋友圈分享图：没有接入微信公众号 JS-SDK 时，朋友圈的链接缩略图是微信从网页里
// "找到的第一张足够大的图片"（至少 300×300），而不一定读取 og:image。
// 所以在页面最前面放一张隐藏的分享图，让微信先找到它。
// 顶部的小 logo 已换成 96px 的小图，不会被当成分享图。
export default function WechatShareImage({ src }: { src: string }) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')
  const abs = src.startsWith('http') ? src : `${base}${src}`
  return (
    // 不用 display:none（微信可能跳过完全隐藏的图片），而是放到屏幕外、透明，图片本身保持原尺寸
    <div
      aria-hidden
      style={{ position: 'absolute', left: -9999, top: 0, width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={abs} alt="" />
      <meta itemProp="image" content={abs} />
    </div>
  )
}
