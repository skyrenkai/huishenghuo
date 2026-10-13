import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // 代码风格检查不阻止上线（类型检查仍然会做）
  eslint: { ignoreDuringBuilds: true },

  // 微信（包括朋友圈）和各类分享抓取工具：把标题、描述、分享图一次性放在网页 <head> 里，
  // 不使用"先发页面、后补分享信息"的流式方式，否则朋友圈读不到分享图。
  // 普通浏览器不受影响，页面切换仍然很快。
  htmlLimitedBots:
    /MicroMessenger|WeChat|Weixin|WindowsWechat|QQ\/|bot|crawler|spider|facebookexternalhit|Facebot|Twitterbot|Slackbot|WhatsApp|TelegramBot|Discordbot|LinkedInBot|Line\/|Google|Bing|Baidu|Yandex|DuckDuck|Applebot|Pinterest|redditbot|Embedly|Quora/i,
}

export default nextConfig
